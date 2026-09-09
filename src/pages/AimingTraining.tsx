import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AIM_REACTION_TIERS, SPEED_TIERS, type AimReactionTier, type AimingRule, type SpeedTier } from "../features/training/config";
import { BackButton, Choice, SpeedPicker, TrainingGuide } from "./MovementTraining";

export default function AimingTraining() {
  const navigate = useNavigate();
  const [rule, setRule] = useState<AimingRule>("infinite");
  const [speedTier, setSpeedTier] = useState<SpeedTier>("mid");
  const [reactionTier, setReactionTier] = useState<AimReactionTier>("diamond");

  const start = () => {
    navigate(`/offline-training/game?mode=joystick&speedTier=${speedTier}&trainingMode=aiming&aimingRule=${rule}&reactionTier=${reactionTier}`);
  };

  return (
    <div className="app-shell">
      <h1 className="page-title">离线瞄准训练</h1>
      <p className="page-subtitle">练习移动目标预判与攻击摇杆控制</p>
      <TrainingGuide />
      <div className="card">
        <div className="form-group"><label>训练规则</label><div className="toggle-group">
          <Choice active={rule === "infinite"} onClick={() => setRule("infinite")} title="无限训练" detail="目标无血量限制，累计造成的总伤害" />
          <Choice active={rule === "challenge"} onClick={() => setRule("challenge")} title="挑战模式" detail="击败 6000 生命的移动目标" />
        </div></div>
        <SpeedPicker value={speedTier} onChange={setSpeedTier} />
        <div className="form-group"><label>人机反应速度</label><div className="toggle-group">
          {(Object.keys(AIM_REACTION_TIERS) as AimReactionTier[]).map((tier) => {
            const config = AIM_REACTION_TIERS[tier];
            const detail = config.dodgesProjectiles
              ? `${SPEED_TIERS[speedTier].label} · ${Math.round(config.seconds[speedTier] * 1000)} ms`
              : `${SPEED_TIERS[speedTier].label} · 不躲避子弹`;
            return <Choice key={tier} active={reactionTier === tier} onClick={() => setReactionTier(tier)} title={config.label} detail={detail} />;
          })}
        </div></div>
        <div className="tutorial-box" style={{ marginTop: "1rem" }}>拖动右下角攻击摇杆瞄准，松手发射；人机会按照所选等级尝试躲避。</div>
        <button className="btn-primary" onClick={start} style={{ marginTop: "1rem" }}>开始训练</button>
        <button className="btn-secondary" onClick={() => navigate("/control-layout/aiming")} style={{ marginTop: "0.5rem", width: "100%" }}>调整键位布置</button>
        <BackButton />
      </div>
    </div>
  );
}
