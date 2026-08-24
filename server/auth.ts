import { Router } from "express";
import { createHash, randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { Pool } from "pg";

const ADMIN_USERNAME = "admin";
const ADMIN_PASSWORD_HASH = "e0d3f7142b97813d6ef45dba445dca25:f3250c4d6140749a0495fc9e4fc92245ec5dccd0095462f85e17cf6da1604acaeb696c1dfb86c49dbf8120f5804726a90a41dedcc292717e5f64ca06ac7d5154";
const SESSION_COOKIE = "brawl_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

type LoginAttempt = { count: number; resetAt: number };
const loginAttempts = new Map<string, LoginAttempt>();

const databaseUrl = process.env.DATABASE_URL;
const pool = databaseUrl ? new Pool({ connectionString: databaseUrl }) : null;

function tokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function verifyPassword(password: string, storedValue: string) {
  const [salt, expectedHex] = storedValue.split(":");
  if (!salt || !expectedHex) return false;
  const actual = scryptSync(password, salt, 64);
  const expected = Buffer.from(expectedHex, "hex");
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

function readCookie(cookieHeader: string | undefined, name: string) {
  if (!cookieHeader) return null;
  for (const pair of cookieHeader.split(";")) {
    const separator = pair.indexOf("=");
    if (separator < 0) continue;
    if (pair.slice(0, separator).trim() === name) {
      return decodeURIComponent(pair.slice(separator + 1).trim());
    }
  }
  return null;
}

function sessionCookie(token: string, secure: boolean, maxAge = SESSION_MAX_AGE_SECONDS) {
  return [
    `${SESSION_COOKIE}=${encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    secure ? "Secure" : "",
    `Max-Age=${maxAge}`,
  ].filter(Boolean).join("; ");
}

export async function initializeAuthDatabase() {
  if (!pool) {
    console.warn("DATABASE_URL 未配置，账号登录功能暂不可用");
    return;
  }
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      username TEXT PRIMARY KEY,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'player',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY,
      username TEXT NOT NULL REFERENCES users(username) ON DELETE CASCADE,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS sessions_expires_at_idx ON sessions(expires_at);
  `);
  await pool.query(
    `INSERT INTO users (username, password_hash, role)
     VALUES ($1, $2, 'admin')
     ON CONFLICT (username) DO NOTHING`,
    [ADMIN_USERNAME, ADMIN_PASSWORD_HASH],
  );
  await pool.query("DELETE FROM sessions WHERE expires_at <= NOW()");
}

export function createAuthRouter(secureCookies: boolean) {
  const router = Router();

  router.get("/me", async (req, res) => {
    if (!pool) return res.status(503).json({ error: "账号服务暂不可用" });
    const token = readCookie(req.headers.cookie, SESSION_COOKIE);
    if (!token) return res.json({ user: null });
    try {
      const result = await pool.query(
        `SELECT users.username, users.role
         FROM sessions JOIN users ON users.username = sessions.username
         WHERE sessions.token_hash = $1 AND sessions.expires_at > NOW()`,
        [tokenHash(token)],
      );
      return res.json({ user: result.rows[0] ?? null });
    } catch (error) {
      console.error("读取登录状态失败", error);
      return res.status(503).json({ error: "账号服务暂不可用" });
    }
  });

  router.post("/login", async (req, res) => {
    if (!pool) return res.status(503).json({ error: "账号服务暂不可用" });
    const clientKey = req.ip || "unknown";
    const now = Date.now();
    const attempt = loginAttempts.get(clientKey);
    if (attempt && attempt.resetAt > now && attempt.count >= 8) {
      return res.status(429).json({ error: "尝试次数过多，请稍后再试" });
    }
    const username = typeof req.body?.username === "string" ? req.body.username.trim() : "";
    const password = typeof req.body?.password === "string" ? req.body.password : "";
    if (!username || !password || username.length > 64 || password.length > 128) {
      return res.status(400).json({ error: "请输入账号和密码" });
    }
    try {
      const result = await pool.query(
        "SELECT username, password_hash, role FROM users WHERE username = $1",
        [username],
      );
      const user = result.rows[0];
      if (!user || !verifyPassword(password, user.password_hash)) {
        const current = attempt && attempt.resetAt > now ? attempt : { count: 0, resetAt: now + 15 * 60_000 };
        current.count += 1;
        loginAttempts.set(clientKey, current);
        return res.status(401).json({ error: "账号或密码错误" });
      }
      loginAttempts.delete(clientKey);
      const token = randomBytes(32).toString("base64url");
      await pool.query(
        `INSERT INTO sessions (token_hash, username, expires_at)
         VALUES ($1, $2, NOW() + INTERVAL '30 days')`,
        [tokenHash(token), user.username],
      );
      res.setHeader("Set-Cookie", sessionCookie(token, secureCookies));
      return res.json({ user: { username: user.username, role: user.role } });
    } catch (error) {
      console.error("登录失败", error);
      return res.status(503).json({ error: "账号服务暂不可用" });
    }
  });

  router.post("/logout", async (req, res) => {
    const token = readCookie(req.headers.cookie, SESSION_COOKIE);
    try {
      if (pool && token) await pool.query("DELETE FROM sessions WHERE token_hash = $1", [tokenHash(token)]);
    } catch (error) {
      console.error("退出登录时清理会话失败", error);
    }
    res.setHeader("Set-Cookie", sessionCookie("", secureCookies, 0));
    return res.json({ ok: true });
  });

  return router;
}
