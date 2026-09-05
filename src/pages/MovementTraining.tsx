import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { SPEED_TIERS, type SpeedTier } from "../features/training/config";

type ControlMode = "joystick" | "keyboard";
type MovementRule = "practice" | "survival";

export default function MovementTraining() {
  const navigate = useNavigate();
  const [controlMode, setControlMode] = useState<ControlMode | null>(null);
  const [speedTier, setSpeedTier] = useState<SpeedTier>("mid");
  const [rule, setRule] = useState<MovementRule>("practice");

  const start = () => {
    if (!controlMode) return;
    navigate(`/offline-training/game?mode=${controlMode}&speedTier=${speedTier}&trainingMode=${rule}`);
  };

  return (
    <div className="app-shell">
      <h1 className="page-title">离线走位训练</h1>
      <p className="page-subtitle">选择训练规则与操作方式</p>
      <TrainingGuide />
      <div className="card">
        <div className="form-group">
          <label>训练规则</label>
          <div className="toggle-group">
            <Choice active={rule === "practice"} onClick={() => setRule("practice")} title="无限训练" detail="无血量限制，无限练习" />
            <Choice active={rule === "survival"} onClick={() => setRule("survival")} title="挑战模式" detail="6000 生命，记录坚持时间" />
          </div>
        </div>
        <SpeedPicker value={speedTier} onChange={setSpeedTier} />
        <div className="form-group"><label>选择操作方式</label></div>
        <div className="toggle-group" style={{ flexDirection: "column" }}>
          <Choice active={controlMode === "joystick"} onClick={() => setControlMode("joystick")} title="🕹️ 触控摇杆" detail="自由拖动方向，适合触屏设备" align="left" />
          <Choice active={controlMode === "keyboard"} onClick={() => setControlMode("keyboard")} title="⌨️ 键盘 WASD" detail="W 上 / A 左 / S 下 / D 右，适合桌面设备" align="left" />
        </div>
        <button className="btn-primary" disabled={!controlMode} onClick={start} style={{ marginTop: "1rem" }}>开始训练</button>
        <BackButton />
      </div>
      <MapGuide />
    </div>
  );
}

export function TrainingGuide() {
  return <div className="tutorial-box"><p className="tutorial-intro">使用教程</p><ul className="tutorial-list"><li>手机建议使用<strong>横屏</strong>，可获得更完整的训练视野。</li><li>进入训练后可点击<strong>“全屏”</strong>开启沉浸式训练。</li><li>具体速度、伤害和反应数值沿用原训练设置。</li></ul></div>;
}

export function SpeedPicker({ value, onChange }: { value: SpeedTier; onChange: (tier: SpeedTier) => void }) {
  return <div className="form-group"><label>角色参数（基础数值）</label><div className="toggle-group">{(Object.keys(SPEED_TIERS) as SpeedTier[]).map((tier) => <Choice key={tier} active={value === tier} onClick={() => onChange(tier)} title={SPEED_TIERS[tier].label} detail={`弹速 ${SPEED_TIERS[tier].value} 单位/秒 · 宽度 ${SPEED_TIERS[tier].bulletWidth} · 装填 ${SPEED_TIERS[tier].reloadSeconds} 秒/发`} />)}</div></div>;
}

export function Choice({ active, onClick, title, detail, align = "center" }: { active: boolean; onClick: () => void; title: string; detail?: string; align?: "left" | "center" }) {
  return <button type="button" className={active ? "active" : ""} onClick={onClick} style={{ flex: 1, padding: "0.85rem 0.5rem", textAlign: align }}><div style={{ fontWeight: 800 }}>{title}</div>{detail && <div style={{ marginTop: "0.2rem", fontSize: "0.78rem", color: "var(--muted)", fontWeight: 400 }}>{detail}</div>}</button>;
}

export function BackButton() {
  const navigate = useNavigate();
  return <button className="btn-secondary" style={{ marginTop: "0.5rem", width: "100%" }} onClick={() => navigate("/")}>返回主页</button>;
}

function MapGuide() {
  return <div className="tutorial-box"><p className="tutorial-intro">地图说明</p><ul className="tutorial-list"><li>每格 <strong>300 × 300</strong> 单位；地图 <strong>21 × 33</strong> 格（6300 × 9900 单位）</li><li>玩家体积：半径 <strong>150</strong> 单位圆形（0.5 格）</li><li>移动速度：最高 <strong>770 单位/秒</strong>；每次起步按 v = min(5t, 1) × 移速，在 <strong>0.2 秒</strong>内线性加速，摇杆回到中心死区立即静止并重置</li><li>人机单次方向指令变化超过 <strong>120°</strong> 时重新起步；其余转向不重置加速</li><li>子弹射程 <strong>3000</strong> 单位（10 格）；挑战模式保留随时间加速的难度规则</li><li>视野横向至少 <strong>31.2</strong> 格、玩家正上方至少 <strong>9.8</strong> 格，地图居中显示</li></ul></div>;
}
