import { useState } from "react";
import { Capacitor } from '@capacitor/core';
import { useNavigate } from "react-router-dom";
import { SPEED_TIERS, type SpeedTier } from "../features/training/config";

type ControlMode = "joystick" | "keyboard";
type MovementRule = "practice" | "survival";

export default function MovementTraining() {
  const navigate = useNavigate();
  const [controlMode, setControlMode] = useState<ControlMode | null>(Capacitor.isNativePlatform() ? 'joystick' : null);
  const [speedTier, setSpeedTier] = useState<SpeedTier>("mid");
  const [rule, setRule] = useState<MovementRule>("practice");

  const start = () => {
    if (!controlMode) return;
    const speed = SPEED_TIERS[speedTier].value;
    navigate(`/offline-training/game?mode=${controlMode}&speedTier=${speedTier}&bulletSpeed=${speed.toFixed(2)}&trainingMode=${rule}`);
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
          {!Capacitor.isNativePlatform() && <Choice active={controlMode === "keyboard"} onClick={() => setControlMode("keyboard")} title="⌨️ 键盘 WASD" detail="W 上 / A 左 / S 下 / D 右，适合桌面设备" align="left" />}
        </div>
        <button className="btn-primary" disabled={!controlMode} onClick={start} style={{ marginTop: "1rem" }}>开始训练</button>
        <BackButton />
      </div>
      <MapGuide />
    </div>
  );
}

export function TrainingGuide() {
  return <div className="tutorial-box"><p className="tutorial-intro">使用教程</p><ul className="tutorial-list"><li>手机建议使用<strong>横屏</strong>，可获得更完整的训练视野。</li><li>{Capacitor.isNativePlatform() ? "进入训练后自动横屏，按系统返回键暂停。" : <>进入训练后可点击<strong>“全屏”</strong>开启沉浸式训练。</>}</li><li>具体速度、伤害和反应数值沿用原训练设置。</li></ul></div>;
}

export function SpeedPicker({ value, onChange }: { value: SpeedTier; onChange: (tier: SpeedTier) => void }) {
  return <div className="form-group"><label>子弹速度档</label><div className="toggle-group">{(Object.keys(SPEED_TIERS) as SpeedTier[]).map((tier) => <Choice key={tier} active={value === tier} onClick={() => onChange(tier)} title={SPEED_TIERS[tier].label} />)}</div></div>;
}

export function Choice({ active, onClick, title, detail, align = "center" }: { active: boolean; onClick: () => void; title: string; detail?: string; align?: "left" | "center" }) {
  return <button type="button" className={active ? "active" : ""} onClick={onClick} style={{ flex: 1, padding: "0.85rem 0.5rem", textAlign: align }}><div style={{ fontWeight: 800 }}>{title}</div>{detail && <div style={{ marginTop: "0.2rem", fontSize: "0.78rem", color: "var(--muted)", fontWeight: 400 }}>{detail}</div>}</button>;
}

export function BackButton() {
  const navigate = useNavigate();
  return <button className="btn-secondary" style={{ marginTop: "0.5rem", width: "100%" }} onClick={() => navigate("/")}>返回主页</button>;
}

function MapGuide() {
  return <div className="tutorial-box"><p className="tutorial-intro">地图说明</p><ul className="tutorial-list"><li>地图尺寸：<strong>21 × 33</strong> 单位</li><li>玩家体积：半径 <strong>0.5</strong> 单位圆形</li><li>移动速度：最高 <strong>3 单位/秒</strong>，加速时间 <strong>0.1 秒</strong></li><li>视野横向至少 <strong>31.2</strong> 格、玩家正上方至少 <strong>9.8</strong> 格，地图居中显示</li></ul></div>;
}
