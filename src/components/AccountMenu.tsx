import { FormEvent, useEffect, useState } from "react";

type Account = { username: string; role: string };
type DistributionTotal = { bins: number[]; count: number; sum: number };
type ModeStats = {
  uploads: number;
  stick: DistributionTotal;
  reaction: DistributionTotal;
  turn: DistributionTotal;
};
type PersonalStats = { keyboard: ModeStats; joystick: ModeStats };

export default function AccountMenu() {
  const [account, setAccount] = useState<Account | null>(null);
  const [open, setOpen] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<PersonalStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsError, setStatsError] = useState("");

  useEffect(() => {
    fetch("/api/auth/me")
      .then(async (response) => response.ok ? response.json() : { user: null })
      .then((data) => setAccount(data.user ?? null))
      .catch(() => setAccount(null));
  }, []);

  useEffect(() => {
    if (!open || !account) return;
    setStatsLoading(true);
    setStatsError("");
    fetch("/api/auth/training-data")
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "读取个人数据失败");
        setStats(data.modes);
      })
      .catch((loadError) => setStatsError(loadError instanceof Error ? loadError.message : "读取个人数据失败"))
      .finally(() => setStatsLoading(false));
  }, [open, account]);

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
      setStats(null);
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
          <section className={`account-dialog ${account ? "account-dialog-profile" : ""}`} role="dialog" aria-modal="true" aria-labelledby="account-title">
            <button className="account-close" aria-label="关闭" onClick={() => setOpen(false)}>×</button>
            {account ? (
              <>
                <h2 id="account-title">个人数据</h2>
                <p className="account-current">当前账号：<strong>{account.username}</strong> · {account.role === "admin" ? "管理员" : "玩家"}</p>
                {statsLoading && <p className="account-role">正在读取累计数据…</p>}
                {statsError && <p className="error-msg">{statsError}</p>}
                {stats && (
                  <div className="account-stats-modes">
                    <ModeStatsCard title="键盘操纵" stats={stats.keyboard} controlMode="keyboard" />
                    <ModeStatsCard title="摇杆操纵" stats={stats.joystick} controlMode="joystick" />
                  </div>
                )}
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

function ModeStatsCard({ title, stats, controlMode }: { title: string; stats: ModeStats; controlMode: "keyboard" | "joystick" }) {
  return (
    <section className="account-stats-card">
      <div className="account-stats-heading">
        <h3>{title}</h3>
        <span>已上传 {stats.uploads} 局</span>
      </div>
      {stats.uploads === 0 ? (
        <p className="account-no-data">暂无已上传数据</p>
      ) : (
        <div className="account-distributions">
          <DistributionBars
            title={controlMode === "joystick" ? "摇杆触控点分布" : "方向键操作幅度分布"}
            data={stats.stick}
            rangeLabel="0–1.05"
            unit=""
            color="#4fc3f7"
          />
          <DistributionBars title="反应时间分布" data={stats.reaction} rangeLabel="120–2000 ms" unit=" ms" color="#ffb74d" />
          <DistributionBars title="变向时间分布" data={stats.turn} rangeLabel="80–4200 ms" unit=" ms" color="#ba68c8" />
        </div>
      )}
    </section>
  );
}

function DistributionBars({ title, data, rangeLabel, unit, color }: {
  title: string;
  data: DistributionTotal;
  rangeLabel: string;
  unit: string;
  color: string;
}) {
  const peak = Math.max(1, ...data.bins);
  const mean = data.count > 0 ? data.sum / data.count : 0;
  return (
    <div className="account-distribution">
      <div className="account-distribution-title">
        <strong>{title}</strong>
        <span>{rangeLabel}</span>
      </div>
      <div className="account-distribution-bars" aria-label={`${title}，共 ${data.count} 个样本`}>
        {data.bins.map((count, index) => (
          <i key={index} title={`${count} 个样本`} style={{ height: `${Math.max(count > 0 ? 5 : 1, count / peak * 100)}%`, background: color }} />
        ))}
      </div>
      <div className="account-distribution-meta">
        <span>样本数 {data.count}</span>
        {data.count > 0 && <span>均值 {mean.toFixed(unit ? 0 : 2)}{unit}</span>}
      </div>
    </div>
  );
}
