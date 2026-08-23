import { useNavigate } from "react-router-dom";
import { useState } from "react";

type ControlMode = "joystick" | "keyboard";
type SpeedTier = "mid" | "high";
type TrainingMode = "practice" | "survival" | "aiming";

const SPEED_TIERS: Record<SpeedTier, { label: string; value: number }> = {
  mid: { label: "贝亚", value: 14 },
  high: { label: "佩佩", value: 17.5 },
};

const UPDATE_NOTICES = [
  {
    date: "2026-08-23",
    title: "生存训练改为无限挑战",
    details: [
      "移除生存模式 60 秒训练上限，不再因达到固定时间而结束对局。",
      "随着生存时间增加，敌方子弹飞行速度、装弹速度和射击频率会持续提高。",
    ],
  },
] as const;

export default function OfflineTraining() {
  const navigate = useNavigate();
  const [selectedMode, setSelectedMode] = useState<ControlMode | null>(null);
  const [selectedSpeed, setSelectedSpeed] = useState<SpeedTier>("mid");
  const [trainingMode, setTrainingMode] = useState<TrainingMode>("practice");
  const [showUpdateNotices, setShowUpdateNotices] = useState(false);

  const handleStart = () => {
    if (!selectedMode && trainingMode !== "aiming") return;
    const speedVal = SPEED_TIERS[selectedSpeed].value;
    const controlMode = trainingMode === "aiming" ? "joystick" : selectedMode;
    navigate(
      `/offline-training/game?mode=${controlMode}&speedTier=${selectedSpeed}&bulletSpeed=${speedVal.toFixed(2)}&trainingMode=${trainingMode}`,
    );
  };

  return (
    <div className="app-shell">
      <div className="offline-training-heading">
        <h1 className="page-title">离线走位训练</h1>
        <p className="page-subtitle">选择操作方式开始训练</p>
        <button
          className="offline-training-updates-button"
          onClick={() => setShowUpdateNotices(true)}
          title="查看所有更新公告"
        >
          📢 更新公告
        </button>
      </div>

      <div className="tutorial-box">
        <p className="tutorial-intro">使用教程</p>
        <ul className="tutorial-list">
          <li>本网页支持手机<strong>横屏</strong>使用，横屏可获得更完整的训练视野。</li>
          <li>进入训练后，可点击界面中的<strong>“全屏”</strong>按钮开启沉浸式训练。</li>
          <li>如有建议或问题，欢迎添加<strong>主页展示的联系方式</strong>进行反馈。</li>
        </ul>
      </div>

      <div className="card">
        <div className="form-group">
          <label>训练规则</label>
          <div className="toggle-group">
            <button
              type="button"
              className={trainingMode === "practice" ? "active" : ""}
              onClick={() => setTrainingMode("practice")}
              style={{ flex: 1, padding: "0.85rem 0.5rem", textAlign: "center" }}
            >
              <div style={{ fontWeight: 800 }}>普通训练</div>
              <div style={{ marginTop: "0.2rem", fontSize: "0.78rem", color: "var(--muted)", fontWeight: 400 }}>无血量限制，无限练习</div>
            </button>
            <button
              type="button"
              className={trainingMode === "survival" ? "active" : ""}
              onClick={() => setTrainingMode("survival")}
              style={{ flex: 1, padding: "0.85rem 0.5rem", textAlign: "center" }}
            >
              <div style={{ fontWeight: 800 }}>生存模式</div>
              <div style={{ marginTop: "0.2rem", fontSize: "0.78rem", color: "var(--muted)", fontWeight: 400 }}>6000 生命，记录生存时间</div>
            </button>
            <button
              type="button"
              className={trainingMode === "aiming" ? "active" : ""}
              onClick={() => setTrainingMode("aiming")}
              style={{ flex: 1, padding: "0.85rem 0.5rem", textAlign: "center" }}
            >
              <div style={{ fontWeight: 800 }}>射击预判训练</div>
              <div style={{ marginTop: "0.2rem", fontSize: "0.78rem", color: "var(--muted)", fontWeight: 400 }}>固定位置，预判移动目标</div>
            </button>
          </div>
        </div>

        <div className="form-group">
          <label>子弹速度档</label>
          <div className="toggle-group">
            {(Object.keys(SPEED_TIERS) as SpeedTier[]).map((tier) => {
              const cfg = SPEED_TIERS[tier];
              return (
                <button
                  key={tier}
                  type="button"
                  className={selectedSpeed === tier ? "active" : ""}
                  onClick={() => setSelectedSpeed(tier)}
                  style={{ flex: 1, padding: "0.85rem 0.5rem", textAlign: "center" }}
                >
                  <div style={{ fontWeight: 800, fontSize: "1rem", marginBottom: "0.2rem" }}>
                    {cfg.label}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {trainingMode !== "aiming" && <>
        <div className="form-group">
          <label>选择操作方式</label>
        </div>

        <div className="toggle-group" style={{ flexDirection: "column" }}>
          <button
            className={selectedMode === "joystick" ? "active" : ""}
            onClick={() => setSelectedMode("joystick")}
            style={{ padding: "1rem", textAlign: "left" }}
          >
            <div style={{ fontWeight: 800, fontSize: "1.05rem", marginBottom: "0.25rem" }}>
              🕹️ 触控摇杆
            </div>
            <div style={{ fontSize: "0.85rem", color: "var(--muted)", fontWeight: 400 }}>
              自由拖动方向，适合触屏设备
            </div>
          </button>

          <button
            className={selectedMode === "keyboard" ? "active" : ""}
            onClick={() => setSelectedMode("keyboard")}
            style={{ padding: "1rem", textAlign: "left" }}
          >
            <div style={{ fontWeight: 800, fontSize: "1.05rem", marginBottom: "0.25rem" }}>
              ⌨️ 键盘 WASD
            </div>
            <div style={{ fontSize: "0.85rem", color: "var(--muted)", fontWeight: 400 }}>
              W 上 / A 左 / S 下 / D 右，适合桌面设备
            </div>
          </button>
        </div>
        </>}

        {trainingMode === "aiming" && (
          <div className="tutorial-box" style={{ marginTop: "1rem" }}>
            拖动右下角攻击摇杆瞄准，松手发射；击败 6000 生命的移动目标即可获胜。
          </div>
        )}

        <button
          className="btn-primary"
          disabled={!selectedMode && trainingMode !== "aiming"}
          onClick={handleStart}
          style={{ marginTop: "1rem" }}
        >
          开始训练
        </button>

        <button
          className="btn-secondary"
          style={{ marginTop: "0.5rem", width: "100%" }}
          onClick={() => navigate("/")}
        >
          返回主页
        </button>
      </div>

      <div className="tutorial-box">
        <p className="tutorial-intro">地图说明</p>
        <ul className="tutorial-list">
          <li>地图尺寸：<strong>21 × 33</strong> 单位（竖版，21列×33行）</li>
          <li>玩家体积：半径 <strong>0.5</strong> 单位圆形</li>
          <li>移动速度：最高 <strong>3 单位/秒</strong>，从静止匀加速 <strong>0.1 秒</strong>到最大速度</li>
          <li>视野：横向固定 <strong>31.2</strong> 格，地图居中，以约 <strong>67°</strong> 地面夹角呈现轻度上窄下宽透视</li>
        </ul>
      </div>

      {showUpdateNotices && (
        <div
          className="training-updates-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="updates-title"
          onClick={() => setShowUpdateNotices(false)}
        >
          <div className="training-updates-card" onClick={(event) => event.stopPropagation()}>
            <div className="training-updates-header">
              <h2 id="updates-title">更新公告</h2>
              <button onClick={() => setShowUpdateNotices(false)} aria-label="关闭更新公告">×</button>
            </div>
            <div className="training-updates-list">
              {UPDATE_NOTICES.map((notice) => (
                <article key={`${notice.date}-${notice.title}`} className="training-update-item">
                  <time>{notice.date}</time>
                  <h3>{notice.title}</h3>
                  <ul>
                    {notice.details.map((detail) => <li key={detail}>{detail}</li>)}
                  </ul>
                </article>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
