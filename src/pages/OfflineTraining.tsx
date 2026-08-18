import { useNavigate } from "react-router-dom";
import { useState } from "react";

type ControlMode = "joystick" | "keyboard";
type SpeedTier = "low" | "mid" | "high";

const SPEED_TIERS: Record<SpeedTier, { label: string; value: number; hint: string }> = {
  low: { label: "低", value: 10.5, hint: "轻松练习用" },
  mid: { label: "中", value: 14, hint: "标准挑战" },
  high: { label: "高", value: 17.5, hint: "极限反应训练" },
};

export default function OfflineTraining() {
  const navigate = useNavigate();
  const [selectedMode, setSelectedMode] = useState<ControlMode | null>(null);
  const [selectedSpeed, setSelectedSpeed] = useState<SpeedTier>("mid");

  const handleStart = () => {
    if (!selectedMode) return;
    const speedVal = SPEED_TIERS[selectedSpeed].value;
    navigate(
      `/offline-training/game?mode=${selectedMode}&speedTier=${selectedSpeed}&bulletSpeed=${speedVal.toFixed(2)}`,
    );
  };

  return (
    <div className="app-shell">
      <h1 className="page-title">离线走位训练</h1>
      <p className="page-subtitle">选择操作方式开始训练</p>

      <div className="card">
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
                  <div
                    style={{
                      fontSize: "0.75rem",
                      color: selectedSpeed === tier ? "var(--text)" : "var(--muted)",
                      fontWeight: 400,
                    }}
                  >
                    {cfg.value.toFixed(2)} /s
                  </div>
                  <div
                    style={{
                      fontSize: "0.7rem",
                      color: "var(--muted)",
                      fontWeight: 400,
                      marginTop: "0.2rem",
                    }}
                  >
                    {cfg.hint}
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
          <li>移动速度：<strong>3 单位/秒</strong>（按角度三角函数分解分量）</li>
          <li>视野：横向固定 <strong>31.2</strong> 格，地图居中，以约 <strong>67°</strong> 地面夹角投影</li>
        </ul>
      </div>
    </div>
  );
}
