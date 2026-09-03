import { Router } from "express";
import { createHash, randomBytes, scrypt, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { Pool, type PoolClient } from "pg";

const ADMIN_USERNAME = "admin";
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH;
const SESSION_COOKIE = "brawl_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;
const DISTRIBUTION_BINS = { stick: 22, reaction: 24, turn: 24 } as const;

type LoginAttempt = { count: number; resetAt: number };
const loginAttempts = new Map<string, LoginAttempt>();

const databaseUrl = process.env.DATABASE_URL;
const pool = databaseUrl ? new Pool({ connectionString: databaseUrl }) : null;

function tokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

const scryptAsync = promisify(scrypt);

async function verifyPassword(password: string, storedValue: string) {
  const [salt, expectedHex] = storedValue.split(":");
  if (!salt || !expectedHex) return false;
  const actual = await scryptAsync(password, salt, 64) as Buffer;
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

async function getSessionUser(cookieHeader: string | undefined) {
  if (!pool) return null;
  const token = readCookie(cookieHeader, SESSION_COOKIE);
  if (!token) return null;
  const result = await pool.query(
    `SELECT users.username, users.role
     FROM sessions JOIN users ON users.username = sessions.username
     WHERE sessions.token_hash = $1 AND sessions.expires_at > NOW()`,
    [tokenHash(token)],
  );
  return result.rows[0] ?? null;
}

function validBins(value: unknown, length: number) {
  return Array.isArray(value)
    && value.length === length
    && value.every((count) => Number.isInteger(count) && count >= 0 && count <= 100_000);
}

function addBins(target: number[], source: number[]) {
  source.forEach((count, index) => { target[index] += Number(count); });
}

function rebinReaction(target: number[], source: number[], sourceMax: number) {
  const sourceMin = 120;
  const targetMax = 2000;
  const sourceWidth = (sourceMax - sourceMin) / source.length;
  source.forEach((count, index) => {
    const center = sourceMin + (index + 0.5) * sourceWidth;
    const targetIndex = Math.max(0, Math.min(target.length - 1, Math.floor((center - sourceMin) / (targetMax - sourceMin) * target.length)));
    target[targetIndex] += Number(count);
  });
}

function normalizeConfiguration(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const source = value as Record<string, unknown>;
  const allowedKeys = ["trainingMode", "controlMode", "speedTier", "character", "bulletSpeed", "reactionTier", "reactionSeconds", "aimingRule", "totalDamage", "result", "survivalTime"];
  const result: Record<string, string | number> = {};
  for (const key of allowedKeys) {
    const field = source[key];
    if (typeof field === "string" && field.length <= 40) result[key] = field;
    else if (typeof field === "number" && Number.isFinite(field)) result[key] = field;
  }
  return result;
}

async function loadTrainingDataForUsername(username: string, historyOffset = 0, historyLimit = 20) {
  if (!pool) throw new Error("Database unavailable");
  const movementResult = await pool.query(
    `SELECT id, control_mode, stick_bins, stick_count, stick_sum,
            reaction_bins, reaction_count, reaction_sum, reaction_max,
            turn_bins, turn_count, turn_sum, configuration, uploaded_at
     FROM training_uploads WHERE username = $1
     ORDER BY uploaded_at DESC`,
    [username],
  );
  const makeMode = () => ({
    uploads: 0,
    stick: { bins: Array(DISTRIBUTION_BINS.stick).fill(0), count: 0, sum: 0 },
    reaction: { bins: Array(DISTRIBUTION_BINS.reaction).fill(0), count: 0, sum: 0 },
    turn: { bins: Array(DISTRIBUTION_BINS.turn).fill(0), count: 0, sum: 0 },
  });
  const modes: Record<"keyboard" | "joystick", ReturnType<typeof makeMode>> = {
    keyboard: makeMode(), joystick: makeMode(),
  };
  for (const row of movementResult.rows) {
    const mode = modes[row.control_mode as "keyboard" | "joystick"];
    mode.uploads += 1;
    addBins(mode.stick.bins, row.stick_bins);
    rebinReaction(mode.reaction.bins, row.reaction_bins, Number(row.reaction_max));
    addBins(mode.turn.bins, row.turn_bins);
    mode.stick.count += row.stick_count; mode.stick.sum += Number(row.stick_sum);
    mode.reaction.count += row.reaction_count; mode.reaction.sum += Number(row.reaction_sum);
    mode.turn.count += row.turn_count; mode.turn.sum += Number(row.turn_sum);
  }
  const aimingResult = await pool.query(
    `SELECT id, lead_bins, lead_count, lead_sum, lead_max, empty_ammo_seconds, total_seconds,
            configuration, uploaded_at
     FROM aiming_uploads WHERE username = $1
     ORDER BY uploaded_at DESC`,
    [username],
  );
  const aimingRows = aimingResult.rows;
  const aggregateMaxTenths = Math.max(1, ...aimingRows.map((row) => Math.round(Number(row.lead_max) * 10)));
  const aiming = {
    uploads: aimingRows.length,
    lead: { bins: Array(aggregateMaxTenths * 2 + 1).fill(0), count: 0, sum: 0, max: aggregateMaxTenths / 10 },
    emptyAmmoSeconds: 0,
    totalSeconds: 0,
  };
  for (const row of aimingRows) {
    const rowMaxTenths = Math.round(Number(row.lead_max) * 10);
    row.lead_bins.forEach((count: number, index: number) => {
      aiming.lead.bins[index - rowMaxTenths + aggregateMaxTenths] += Number(count);
    });
    aiming.lead.count += row.lead_count;
    aiming.lead.sum += Number(row.lead_sum);
    if (row.configuration?.speedTier === "high" || row.configuration?.character === "佩佩") {
      aiming.emptyAmmoSeconds += Number(row.empty_ammo_seconds);
      aiming.totalSeconds += Number(row.total_seconds);
    }
  }
  const movementHistory = movementResult.rows.map((row) => ({
    id: `movement:${row.id}`, kind: "movement", uploadedAt: row.uploaded_at,
    configuration: row.configuration, controlMode: row.control_mode,
    stick: { bins: row.stick_bins, count: row.stick_count, sum: Number(row.stick_sum), min: 0, max: 1.05 },
    reaction: { bins: row.reaction_bins, count: row.reaction_count, sum: Number(row.reaction_sum), min: 120, max: Number(row.reaction_max) },
    turn: { bins: row.turn_bins, count: row.turn_count, sum: Number(row.turn_sum), min: 80, max: 4200 },
  }));
  const aimingHistory = aimingRows.map((row) => ({
    id: `aiming:${row.id}`, kind: "aiming", uploadedAt: row.uploaded_at,
    configuration: row.configuration,
    lead: { bins: row.lead_bins, count: row.lead_count, sum: Number(row.lead_sum), min: -Number(row.lead_max), max: Number(row.lead_max) },
    emptyAmmoSeconds: Number(row.empty_ammo_seconds), totalSeconds: Number(row.total_seconds),
    supportsEmptyAmmoRatio: row.configuration?.speedTier === "high" || row.configuration?.character === "佩佩",
  }));
  const allHistory = [...movementHistory, ...aimingHistory]
    .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
  const history = allHistory.slice(historyOffset, historyOffset + historyLimit);
  return {
    modes,
    aiming,
    history,
    historyTotal: allHistory.length,
    historyHasMore: historyOffset + history.length < allHistory.length,
  };
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
    CREATE TABLE IF NOT EXISTS training_uploads (
      id BIGSERIAL PRIMARY KEY,
      username TEXT NOT NULL REFERENCES users(username) ON DELETE CASCADE,
      round_id TEXT NOT NULL,
      control_mode TEXT NOT NULL CHECK (control_mode IN ('keyboard', 'joystick')),
      stick_bins INTEGER[] NOT NULL,
      stick_count INTEGER NOT NULL,
      stick_sum DOUBLE PRECISION NOT NULL,
      reaction_bins INTEGER[] NOT NULL,
      reaction_count INTEGER NOT NULL,
      reaction_sum DOUBLE PRECISION NOT NULL,
      reaction_max DOUBLE PRECISION NOT NULL,
      turn_bins INTEGER[] NOT NULL,
      turn_count INTEGER NOT NULL,
      turn_sum DOUBLE PRECISION NOT NULL,
      configuration JSONB NOT NULL DEFAULT '{}'::jsonb,
      uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (username, round_id)
    );
    CREATE INDEX IF NOT EXISTS training_uploads_username_idx ON training_uploads(username);
    CREATE INDEX IF NOT EXISTS training_uploads_username_uploaded_at_idx
      ON training_uploads(username, uploaded_at DESC);
    CREATE TABLE IF NOT EXISTS aiming_uploads (
      id BIGSERIAL PRIMARY KEY,
      username TEXT NOT NULL REFERENCES users(username) ON DELETE CASCADE,
      round_id TEXT NOT NULL,
      lead_bins INTEGER[] NOT NULL,
      lead_count INTEGER NOT NULL,
      lead_sum DOUBLE PRECISION NOT NULL,
      lead_max DOUBLE PRECISION NOT NULL,
      empty_ammo_seconds DOUBLE PRECISION NOT NULL,
      total_seconds DOUBLE PRECISION NOT NULL,
      configuration JSONB NOT NULL DEFAULT '{}'::jsonb,
      uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (username, round_id)
    );
    CREATE INDEX IF NOT EXISTS aiming_uploads_username_idx ON aiming_uploads(username);
    CREATE INDEX IF NOT EXISTS aiming_uploads_username_uploaded_at_idx
      ON aiming_uploads(username, uploaded_at DESC);
    ALTER TABLE training_uploads ADD COLUMN IF NOT EXISTS configuration JSONB NOT NULL DEFAULT '{}'::jsonb;
    ALTER TABLE aiming_uploads ADD COLUMN IF NOT EXISTS configuration JSONB NOT NULL DEFAULT '{}'::jsonb;
  `);
  if (ADMIN_PASSWORD_HASH) {
    await pool.query(
      `INSERT INTO users (username, password_hash, role)
       VALUES ($1, $2, 'admin')
       ON CONFLICT (username) DO NOTHING`,
      [ADMIN_USERNAME, ADMIN_PASSWORD_HASH],
    );
  } else {
    console.warn("ADMIN_PASSWORD_HASH 未配置，不会自动创建管理员账号");
  }
  await pool.query("DELETE FROM sessions WHERE expires_at <= NOW()");
}

export function createAuthRouter(secureCookies: boolean) {
  const router = Router();

  router.get("/me", async (req, res) => {
    if (!pool) return res.status(503).json({ error: "账号服务暂不可用" });
    try {
      const user = await getSessionUser(req.headers.cookie);
      return res.json({ user });
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
      if (!user || !await verifyPassword(password, user.password_hash)) {
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

  router.post("/training-data", async (req, res) => {
    if (!pool) return res.status(503).json({ error: "账号服务暂不可用" });
    try {
      const user = await getSessionUser(req.headers.cookie);
      if (!user) return res.status(401).json({ error: "请先登录账号" });
      const { roundId, controlMode, stick, reaction, turn, configuration } = req.body ?? {};
      const validSummary = (value: any, binCount: number) => value
        && validBins(value.bins, binCount)
        && Number.isInteger(value.count) && value.count >= 0 && value.count <= 100_000
        && Number.isFinite(value.sum) && value.sum >= 0;
      if (
        typeof roundId !== "string" || roundId.length < 8 || roundId.length > 80
        || !["keyboard", "joystick"].includes(controlMode)
        || !validSummary(stick, DISTRIBUTION_BINS.stick)
        || !validSummary(reaction, DISTRIBUTION_BINS.reaction)
        || !validSummary(turn, DISTRIBUTION_BINS.turn)
        || !Number.isFinite(reaction.max) || reaction.max <= 120 || reaction.max > 2000
      ) {
        return res.status(400).json({ error: "训练数据格式无效" });
      }
      const binTotalsMatch = (summary: any) => summary.bins.reduce((sum: number, count: number) => sum + count, 0) === summary.count;
      if (!binTotalsMatch(stick) || !binTotalsMatch(reaction) || !binTotalsMatch(turn)) {
        return res.status(400).json({ error: "训练数据统计不一致" });
      }
      const result = await pool.query(
        `INSERT INTO training_uploads (
          username, round_id, control_mode,
          stick_bins, stick_count, stick_sum,
          reaction_bins, reaction_count, reaction_sum, reaction_max,
          turn_bins, turn_count, turn_sum, configuration
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
        ON CONFLICT (username, round_id) DO NOTHING
        RETURNING id`,
        [user.username, roundId, controlMode, stick.bins, stick.count, stick.sum,
          reaction.bins, reaction.count, reaction.sum, reaction.max,
          turn.bins, turn.count, turn.sum, normalizeConfiguration(configuration)],
      );
      if (result.rowCount === 0) return res.status(409).json({ error: "本局数据已经上传" });
      return res.json({ ok: true });
    } catch (error) {
      console.error("上传训练数据失败", error);
      return res.status(503).json({ error: "上传失败，请稍后重试" });
    }
  });

  router.post("/aiming-data", async (req, res) => {
    if (!pool) return res.status(503).json({ error: "账号服务暂不可用" });
    try {
      const user = await getSessionUser(req.headers.cookie);
      if (!user) return res.status(401).json({ error: "请先登录账号" });
      const { roundId, lead, emptyAmmoSeconds, totalSeconds, configuration } = req.body ?? {};
      const maxTenths = Number.isFinite(lead?.max) ? Math.round(lead.max * 10) : 0;
      if (
        typeof roundId !== "string" || roundId.length < 8 || roundId.length > 80
        || maxTenths < 1 || maxTenths > 900 || Math.abs(lead.max * 10 - maxTenths) > 0.001
        || !validBins(lead.bins, maxTenths * 2 + 1)
        || !Number.isInteger(lead.count) || lead.count < 0 || lead.count > 10_000
        || !Number.isFinite(lead.sum) || Math.abs(lead.sum) > lead.count * lead.max
        || lead.bins.reduce((sum: number, count: number) => sum + count, 0) !== lead.count
        || !Number.isFinite(totalSeconds) || totalSeconds < 0 || totalSeconds > 86_400
        || !Number.isFinite(emptyAmmoSeconds) || emptyAmmoSeconds < 0 || emptyAmmoSeconds > totalSeconds + 0.01
      ) {
        return res.status(400).json({ error: "射击统计数据格式无效" });
      }
      const result = await pool.query(
        `INSERT INTO aiming_uploads (
          username, round_id, lead_bins, lead_count, lead_sum, lead_max,
          empty_ammo_seconds, total_seconds, configuration
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
        ON CONFLICT (username, round_id) DO NOTHING RETURNING id`,
        [user.username, roundId, lead.bins, lead.count, lead.sum, lead.max, emptyAmmoSeconds, totalSeconds, normalizeConfiguration(configuration)],
      );
      if (result.rowCount === 0) return res.status(409).json({ error: "本局数据已经上传" });
      return res.json({ ok: true });
    } catch (error) {
      console.error("上传射击训练数据失败", error);
      return res.status(503).json({ error: "上传失败，请稍后重试" });
    }
  });

  router.get("/training-data", async (req, res) => {
    if (!pool) return res.status(503).json({ error: "账号服务暂不可用" });
    try {
      const user = await getSessionUser(req.headers.cookie);
      if (!user) return res.status(401).json({ error: "请先登录账号" });
      const requestedOffset = Number(req.query.historyOffset ?? 0);
      const requestedLimit = Number(req.query.historyLimit ?? 20);
      const historyOffset = Number.isInteger(requestedOffset) ? Math.max(0, requestedOffset) : 0;
      const historyLimit = Number.isInteger(requestedLimit)
        ? Math.max(1, Math.min(50, requestedLimit))
        : 20;
      const data = await loadTrainingDataForUsername(user.username, historyOffset, historyLimit);
      return res.json(data);
    } catch (error) {
      console.error("读取训练数据失败", error);
      return res.status(503).json({ error: "读取个人数据失败" });
    }
  });

  router.get("/admin/users", async (req, res) => {
    if (!pool) return res.status(503).json({ error: "账号服务暂不可用" });
    try {
      const admin = await getSessionUser(req.headers.cookie);
      if (!admin) return res.status(401).json({ error: "请先登录账号" });
      if (admin.role !== "admin") return res.status(403).json({ error: "仅管理员可访问" });
      const result = await pool.query(`
        SELECT users.username, users.role, users.created_at,
          COALESCE(movement.uploads, 0)::int AS movement_uploads,
          COALESCE(aiming.uploads, 0)::int AS aiming_uploads,
          GREATEST(movement.last_upload, aiming.last_upload) AS last_upload
        FROM users
        LEFT JOIN (
          SELECT username, COUNT(*) AS uploads, MAX(uploaded_at) AS last_upload
          FROM training_uploads GROUP BY username
        ) movement ON movement.username = users.username
        LEFT JOIN (
          SELECT username, COUNT(*) AS uploads, MAX(uploaded_at) AS last_upload
          FROM aiming_uploads GROUP BY username
        ) aiming ON aiming.username = users.username
        ORDER BY users.created_at ASC
      `);
      return res.json({ users: result.rows.map((row) => ({
        username: row.username,
        role: row.role,
        createdAt: row.created_at,
        movementUploads: row.movement_uploads,
        aimingUploads: row.aiming_uploads,
        lastUpload: row.last_upload,
      })) });
    } catch (error) {
      console.error("读取账号列表失败", error);
      return res.status(503).json({ error: "读取账号列表失败" });
    }
  });

  router.get("/admin/users/:username/training-data", async (req, res) => {
    if (!pool) return res.status(503).json({ error: "账号服务暂不可用" });
    try {
      const admin = await getSessionUser(req.headers.cookie);
      if (!admin) return res.status(401).json({ error: "请先登录账号" });
      if (admin.role !== "admin") return res.status(403).json({ error: "仅管理员可访问" });
      const username = req.params.username;
      const userResult = await pool.query("SELECT username, role, created_at FROM users WHERE username = $1", [username]);
      if (userResult.rowCount === 0) return res.status(404).json({ error: "账号不存在" });
      const data = await loadTrainingDataForUsername(username);
      return res.json({ user: userResult.rows[0], ...data });
    } catch (error) {
      console.error("读取账号训练数据失败", error);
      return res.status(503).json({ error: "读取账号训练数据失败" });
    }
  });

  router.delete("/training-data", async (req, res) => {
    if (!pool) return res.status(503).json({ error: "账号服务暂不可用" });
    let client: PoolClient | null = null;
    try {
      const user = await getSessionUser(req.headers.cookie);
      if (!user) return res.status(401).json({ error: "请先登录账号" });
      client = await pool.connect();
      await client.query("BEGIN");
      await client.query("DELETE FROM training_uploads WHERE username = $1", [user.username]);
      await client.query("DELETE FROM aiming_uploads WHERE username = $1", [user.username]);
      await client.query("COMMIT");
      return res.json({ ok: true });
    } catch (error) {
      await client?.query("ROLLBACK").catch(() => undefined);
      console.error("清空训练数据失败", error);
      return res.status(503).json({ error: "清空数据失败" });
    } finally {
      client?.release();
    }
  });

  router.delete("/training-data/:recordId", async (req, res) => {
    if (!pool) return res.status(503).json({ error: "账号服务暂不可用" });
    try {
      const user = await getSessionUser(req.headers.cookie);
      if (!user) return res.status(401).json({ error: "请先登录账号" });
      const match = /^(movement|aiming):(\d+)$/.exec(req.params.recordId);
      if (!match) return res.status(400).json({ error: "记录编号无效" });
      const table = match[1] === "movement" ? "training_uploads" : "aiming_uploads";
      const result = await pool.query(`DELETE FROM ${table} WHERE id = $1 AND username = $2`, [match[2], user.username]);
      if (result.rowCount === 0) return res.status(404).json({ error: "记录不存在" });
      return res.json({ ok: true });
    } catch (error) {
      console.error("删除训练记录失败", error);
      return res.status(503).json({ error: "删除记录失败" });
    }
  });

  return router;
}
