import { FormEvent, useEffect, useState } from "react";

type Account = { username: string; role: string };

export default function AccountMenu() {
  const [account, setAccount] = useState<Account | null>(null);
  const [open, setOpen] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then(async (response) => response.ok ? response.json() : { user: null })
      .then((data) => setAccount(data.user ?? null))
      .catch(() => setAccount(null));
  }, []);

  const login = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "登录失败");
      setAccount(data.user);
      setPassword("");
      setOpen(false);
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "登录失败");
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setAccount(null);
      setOpen(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="account-menu">
      <button className="account-trigger" onClick={() => setOpen(true)}>
        {account ? `已登录：${account.username}` : "账号登录"}
      </button>
      {open && (
        <div className="account-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setOpen(false)}>
          <section className="account-dialog" role="dialog" aria-modal="true" aria-labelledby="account-title">
            <button className="account-close" aria-label="关闭" onClick={() => setOpen(false)}>×</button>
            {account ? (
              <>
                <h2 id="account-title">账号信息</h2>
                <p className="account-current">当前账号：<strong>{account.username}</strong></p>
                <p className="account-role">身份：{account.role === "admin" ? "管理员" : "玩家"}</p>
                <button className="btn-secondary account-submit" disabled={loading} onClick={logout}>退出登录</button>
              </>
            ) : (
              <form onSubmit={login}>
                <h2 id="account-title">账号登录</h2>
                <p className="account-hint">登录后将在此设备保持登录状态。</p>
                <div className="form-group">
                  <label htmlFor="account-username">账号</label>
                  <input id="account-username" autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} />
                </div>
                <div className="form-group">
                  <label htmlFor="account-password">密码</label>
                  <input id="account-password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
                {error && <p className="error-msg">{error}</p>}
                <button className="btn-primary account-submit" disabled={loading || !username.trim() || !password} type="submit">
                  {loading ? "登录中…" : "登录"}
                </button>
              </form>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
