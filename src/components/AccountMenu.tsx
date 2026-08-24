import { FormEvent, useCallback, useEffect, useState } from "react";

type Account = { username: string; role: string };
type DistributionTotal = { bins: number[]; count: number; sum: number };
type ModeStats = {
  uploads: number;
  stick: DistributionTotal;
  reaction: DistributionTotal;
  turn: DistributionTotal;
};
type AimingStats = {
  uploads: number;
  lead: DistributionTotal & { max: number };
  emptyAmmoSeconds: number;
  totalSeconds: number;
};
type PersonalStats = { keyboard: ModeStats; joystick: ModeStats; aiming: AimingStats };
type RecordDistribution = DistributionTotal & { min: number; max: number };
type TrainingRecord = {
  id: string;
  kind: "movement" | "aiming";
  uploadedAt: string;
  configuration: Record<string, string | number>;
  controlMode?: "keyboard" | "joystick";
  stick?: RecordDistribution;
  reaction?: RecordDistribution;
  turn?: RecordDistribution;
  lead?: RecordDistribution;
  emptyAmmoSeconds?: number;
  totalSeconds?: number;
  supportsEmptyAmmoRatio?: boolean;
};
type AdminUser = {
  username: string;
  role: string;
  createdAt: string;
  movementUploads: number;
  aimingUploads: number;
  lastUpload: string | null;
};

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
  const [history, setHistory] = useState<TrainingRecord[]>([]);
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [adminOpen, setAdminOpen] = useState(false);
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [adminSelectedUser, setAdminSelectedUser] = useState<AdminUser | null>(null);
  const [adminStats, setAdminStats] = useState<PersonalStats | null>(null);
  const [adminHistory, setAdminHistory] = useState<TrainingRecord[]>([]);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminError, setAdminError] = useState("");

  useEffect(() => {
    fetch("/api/auth/me")
      .then(async (response) => response.ok ? response.json() : { user: null })
      .then((data) => setAccount(data.user ?? null))
      .catch(() => setAccount(null));
  }, []);

  const loadStats = useCallback(async () => {
    if (!account) return;
    setStatsLoading(true);
    setStatsError("");
    try {
      const response = await fetch("/api/auth/training-data");
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "读取个人数据失败");
      setStats({ ...data.modes, aiming: data.aiming });
      setHistory(data.history ?? []);
    } catch (loadError) {
      setStatsError(loadError instanceof Error ? loadError.message : "读取个人数据失败");
    } finally {
      setStatsLoading(false);
    }
  }, [account]);

  useEffect(() => {
    if (open && account) void loadStats();
  }, [open, account, loadStats]);

  const deleteRecord = async (record: TrainingRecord) => {
    if (!window.confirm("确定删除这条上传记录吗？删除后无法恢复。")) return;
    setStatsLoading(true);
    try {
      const response = await fetch(`/api/auth/training-data/${encodeURIComponent(record.id)}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "删除失败");
      setSelectedRecordId(null);
      await loadStats();
    } catch (deleteError) {
      setStatsError(deleteError instanceof Error ? deleteError.message : "删除失败");
      setStatsLoading(false);
    }
  };

  const clearAllData = async () => {
    if (!window.confirm("确定清空当前账号的所有训练数据吗？该操作无法恢复。")) return;
    setStatsLoading(true);
    try {
      const response = await fetch("/api/auth/training-data", { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "清空失败");
      setSelectedRecordId(null);
      await loadStats();
    } catch (clearError) {
      setStatsError(clearError instanceof Error ? clearError.message : "清空失败");
      setStatsLoading(false);
    }
  };

  const openAdminPanel = async () => {
    setAdminOpen(true);
    setAdminLoading(true);
    setAdminError("");
    try {
      const response = await fetch("/api/auth/admin/users");
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "读取账号列表失败");
      setAdminUsers(data.users ?? []);
    } catch (adminLoadError) {
      setAdminError(adminLoadError instanceof Error ? adminLoadError.message : "读取账号列表失败");
    } finally {
      setAdminLoading(false);
    }
  };

  const viewAdminUser = async (user: AdminUser) => {
    setAdminSelectedUser(user);
    setAdminStats(null);
    setAdminHistory([]);
    setAdminLoading(true);
    setAdminError("");
    try {
      const response = await fetch(`/api/auth/admin/users/${encodeURIComponent(user.username)}/training-data`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "读取账号数据失败");
      setAdminStats({ ...data.modes, aiming: data.aiming });
      setAdminHistory(data.history ?? []);
    } catch (adminLoadError) {
      setAdminError(adminLoadError instanceof Error ? adminLoadError.message : "读取账号数据失败");
    } finally {
      setAdminLoading(false);
    }
  };

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
      setHistory([]);
      setOpen(false);
      setAdminOpen(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="account-menu">
      <button className="account-trigger" onClick={() => setOpen(true)}>
        {account ? `已登录：${account.username}` : "账号登录"}
      </button>
      {account?.role === "admin" && (
        <button className="admin-sidebar-trigger" onClick={() => void openAdminPanel()}>管理员后台</button>
      )}
      {adminOpen && account?.role === "admin" && (
        <div className="admin-panel-backdrop">
          <section className="admin-panel" role="dialog" aria-modal="true" aria-label="管理员后台">
            <header className="admin-panel-header">
              <div><h2>管理员后台</h2><span>查看所有账号及训练数据</span></div>
              <button aria-label="关闭" onClick={() => setAdminOpen(false)}>×</button>
            </header>
            <div className="admin-panel-layout">
              <aside className="admin-user-list">
                <h3>账号列表（{adminUsers.length}）</h3>
                {adminUsers.map((user) => (
                  <button key={user.username} className={adminSelectedUser?.username === user.username ? "active" : ""} onClick={() => void viewAdminUser(user)}>
                    <strong>{user.username}</strong>
                    <span>{user.role === "admin" ? "管理员" : "玩家"} · 数据 {user.movementUploads + user.aimingUploads} 局</span>
                  </button>
                ))}
              </aside>
              <main className="admin-user-data">
                {adminLoading && <p className="account-role">正在读取数据…</p>}
                {adminError && <p className="error-msg">{adminError}</p>}
                {!adminSelectedUser && !adminLoading && <p className="account-no-data">请从左侧选择一个账号</p>}
                {adminSelectedUser && adminStats && (
                  <AdminUserData user={adminSelectedUser} stats={adminStats} history={adminHistory} />
                )}
              </main>
            </div>
          </section>
        </div>
      )}
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
                  <>
                    <div className="account-stats-modes">
                      <ModeStatsCard title="纯走位模式 · 键盘操纵" stats={stats.keyboard} controlMode="keyboard" />
                      <ModeStatsCard title="纯走位模式 · 摇杆操纵" stats={stats.joystick} controlMode="joystick" />
                      <AimingStatsCard stats={stats.aiming} />
                    </div>
                    <div className="account-history-header">
                      <div><h3>每次上传记录</h3><span>共 {history.length} 条</span></div>
                      <button className="account-danger-button" disabled={statsLoading || history.length === 0} onClick={clearAllData}>清空所有数据</button>
                    </div>
                    <div className="account-history-list">
                      {history.length === 0 && <p className="account-no-data">暂无上传记录</p>}
                      {history.map((record) => (
                        <TrainingHistoryItem
                          key={record.id}
                          record={record}
                          expanded={selectedRecordId === record.id}
                          onToggle={() => setSelectedRecordId((current) => current === record.id ? null : record.id)}
                          onDelete={() => void deleteRecord(record)}
                        />
                      ))}
                    </div>
                  </>
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

function AdminUserData({ user, stats, history }: { user: AdminUser; stats: PersonalStats; history: TrainingRecord[] }) {
  const [expandedRecord, setExpandedRecord] = useState<string | null>(null);
  return (
    <div className="admin-user-data-content">
      <div className="admin-user-summary">
        <div><h3>{user.username}</h3><span>{user.role === "admin" ? "管理员" : "玩家"}</span></div>
        <span>注册于 {new Date(user.createdAt).toLocaleString("zh-CN", { hour12: false })}</span>
      </div>
      <div className="account-stats-modes">
        <ModeStatsCard title="纯走位模式 · 键盘操纵" stats={stats.keyboard} controlMode="keyboard" />
        <ModeStatsCard title="纯走位模式 · 摇杆操纵" stats={stats.joystick} controlMode="joystick" />
        <AimingStatsCard stats={stats.aiming} />
      </div>
      <div className="account-history-header"><div><h3>上传记录</h3><span>共 {history.length} 条</span></div></div>
      <div className="account-history-list">
        {history.length === 0 && <p className="account-no-data">该账号暂无上传记录</p>}
        {history.map((record) => (
          <TrainingHistoryItem
            key={record.id}
            record={record}
            expanded={expandedRecord === record.id}
            onToggle={() => setExpandedRecord((current) => current === record.id ? null : record.id)}
          />
        ))}
      </div>
    </div>
  );
}

function TrainingHistoryItem({ record, expanded, onToggle, onDelete }: {
  record: TrainingRecord;
  expanded: boolean;
  onToggle: () => void;
  onDelete?: () => void;
}) {
  const config = record.configuration ?? {};
  const modeLabel = record.kind === "aiming"
    ? "射击预判训练"
    : config.trainingMode === "survival" ? "纯走位 · 生存模式" : "纯走位 · 普通训练";
  const controlLabel = record.kind === "aiming"
    ? "攻击摇杆"
    : (record.controlMode === "keyboard" ? "键盘" : "摇杆");
  const character = typeof config.character === "string" ? config.character : "角色未记录";
  const speedLabel = config.speedTier === "high" ? "高速档" : config.speedTier === "mid" ? "中速档" : "速度档未记录";
  const bulletSpeedLabel = typeof config.bulletSpeed === "number" ? `子弹 ${config.bulletSpeed} 格/秒` : "子弹速度未记录";
  const survivalLabel = typeof config.survivalTime === "number" && config.trainingMode === "survival"
    ? ` · 生存 ${config.survivalTime.toFixed(1)} 秒`
    : "";
  const uploadedAt = new Date(record.uploadedAt).toLocaleString("zh-CN", { hour12: false });
  return (
    <article className={`account-history-item ${expanded ? "expanded" : ""}`}>
      <div className="account-history-row" onClick={onToggle} role="button" tabIndex={0} onKeyDown={(event) => (event.key === "Enter" || event.key === " ") && onToggle()}>
        <time>{uploadedAt}</time>
        <div className="account-history-config">
          <strong>{modeLabel}</strong>
          <span>{controlLabel} · {character} · {speedLabel} · {bulletSpeedLabel}{survivalLabel}</span>
        </div>
        <button className="account-detail-button" onClick={(event) => { event.stopPropagation(); onToggle(); }}>{expanded ? "收起详情" : "查看详情"}</button>
        {onDelete && <button className="account-delete-button" onClick={(event) => { event.stopPropagation(); onDelete(); }}>删除</button>}
      </div>
      {expanded && <TrainingRecordDetails record={record} />}
    </article>
  );
}

function TrainingRecordDetails({ record }: { record: TrainingRecord }) {
  if (record.kind === "aiming" && record.lead) {
    const emptyRatio = (record.totalSeconds ?? 0) > 0 ? (record.emptyAmmoSeconds ?? 0) / (record.totalSeconds ?? 1) : 0;
    return (
      <div className="account-history-details account-aiming-distributions">
        <DistributionBars
          title="本局预判偏角分布"
          data={record.lead}
          rangeLabel={`±${record.lead.max.toFixed(1)}° · 0.1°/格`}
          unit="°"
          color="#4fc3f7"
          decimals={1}
        />
        {record.supportsEmptyAmmoRatio && (
          <div className="account-ratio-summary">
            <strong>本局零子弹状态时长占比</strong>
            <span>{(emptyRatio * 100).toFixed(1)}%</span>
            <small>零子弹 {(record.emptyAmmoSeconds ?? 0).toFixed(1)} 秒 / 训练 {(record.totalSeconds ?? 0).toFixed(1)} 秒</small>
          </div>
        )}
      </div>
    );
  }
  return (
    <div className="account-history-details account-record-distributions">
      {record.controlMode === "joystick" && record.stick && (
        <DistributionBars title="本局摇杆触控点分布" data={record.stick} rangeLabel="0–1.05" unit="" color="#4fc3f7" />
      )}
      {record.reaction && (
        <DistributionBars title="本局反应时间分布" data={record.reaction} rangeLabel={`${record.reaction.min}–${record.reaction.max.toFixed(0)} ms`} unit=" ms" color="#ffb74d" />
      )}
      {record.turn && (
        <DistributionBars title="本局变向时间分布" data={record.turn} rangeLabel="80–4200 ms" unit=" ms" color="#ba68c8" />
      )}
    </div>
  );
}

function AimingStatsCard({ stats }: { stats: AimingStats }) {
  const emptyRatio = stats.totalSeconds > 0 ? stats.emptyAmmoSeconds / stats.totalSeconds : 0;
  return (
    <section className="account-stats-card account-aiming-stats-card">
      <div className="account-stats-heading">
        <h3>射击预判训练</h3>
        <span>已上传 {stats.uploads} 局</span>
      </div>
      {stats.uploads === 0 ? (
        <p className="account-no-data">暂无已上传数据</p>
      ) : (
        <div className="account-distributions account-aiming-distributions">
          <DistributionBars
            title="预判偏角分布"
            data={stats.lead}
            rangeLabel={`±${stats.lead.max.toFixed(1)}° · 0.1°/格`}
            unit="°"
            color="#4fc3f7"
            decimals={1}
          />
          {stats.totalSeconds > 0 && (
            <div className="account-ratio-summary">
              <strong>佩佩 · 零子弹状态时长占比</strong>
              <span>{(emptyRatio * 100).toFixed(1)}%</span>
              <small>仅汇总佩佩记录</small>
            </div>
          )}
        </div>
      )}
    </section>
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
          {controlMode === "joystick" && (
            <DistributionBars
              title="摇杆触控点分布"
              data={stats.stick}
              rangeLabel="0–1.05"
              unit=""
              color="#4fc3f7"
            />
          )}
          <DistributionBars title="反应时间分布" data={stats.reaction} rangeLabel="120–2000 ms" unit=" ms" color="#ffb74d" />
          <DistributionBars title="变向时间分布" data={stats.turn} rangeLabel="80–4200 ms" unit=" ms" color="#ba68c8" />
        </div>
      )}
    </section>
  );
}

function DistributionBars({ title, data, rangeLabel, unit, color, decimals }: {
  title: string;
  data: DistributionTotal;
  rangeLabel: string;
  unit: string;
  color: string;
  decimals?: number;
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
        {data.count > 0 && <span>均值 {mean.toFixed(decimals ?? (unit ? 0 : 2))}{unit}</span>}
      </div>
    </div>
  );
}
