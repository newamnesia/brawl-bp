import { useNavigate } from "react-router-dom";
import { useState } from "react";

type ControlMode = "joystick" | "keyboard";
type SpeedTier = "mid" | "high";
type TrainingMode = "practice" | "survival";

const SPEED_TIERS: Record<SpeedTier, { label: string; value: number }> = {
  mid: { label: "贝亚", value: 14 },
  high: { label: "佩佩", value: 17.5 },
};

export default function OfflineTraining() {
  const navigate = useNavigate();
  const [selectedMode, setSelectedMode] = useState<ControlMode | null>(null);
  const [selectedSpeed, setSelectedSpeed] = useState<SpeedTier>("mid");
  const [trainingMode, setTrainingMode] = useState<TrainingMode>("practice");

  const handleStart = () => {
    if (!selectedMode) return;
    const speedVal = SPEED_TIERS[selectedSpeed].value;
    navigate(
      `/offline-training/game?mode=${selectedMode}&speedTier=${selectedSpeed}&bulletSpeed=${speedVal.toFixed(2)}&trainingMode=${trainingMode}`,
    );
  };

  return (
    <div className="app-shell">
      <h1 className="page-title">离线走位训练</h1>
      <p className="page-subtitle">选择操作方式开始训练</p>

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

        <button
          className="btn-primary"
          disabled={!selectedMode}
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
    </div>
  );
}
