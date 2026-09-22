import type { CSSProperties, PointerEventHandler } from "react";
import { JOYSTICK_DEFINITIONS, hyperButtonDiameter, joystickDiameter, type JoystickId, type JoystickLayout } from "../features/training/controlLayout";

export function AdjustableJoystick({ id, layout, viewport, selected, knob = { x: 0, y: 0 }, active, charge, onPointerDown, onPointerMove, onPointerUp, onClick }: {
  id: JoystickId; layout: JoystickLayout; viewport: { width: number; height: number };
  selected?: boolean; knob?: { x: number; y: number }; active?: boolean;
  charge?: number;
  onPointerDown?: PointerEventHandler<HTMLDivElement>; onPointerMove?: PointerEventHandler<HTMLDivElement>;
  onPointerUp?: PointerEventHandler<HTMLDivElement>; onClick?: PointerEventHandler<HTMLDivElement>;
}) {
  if (id === "hyper") {
    const diameter = hyperButtonDiameter(layout, viewport.width, viewport.height);
    return <div data-joystick-id={id} aria-label="超充按键"
      onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp} onClick={onClick}
      style={{ position: "fixed", zIndex: 12, left: layout.x * viewport.width - diameter / 2,
        top: layout.y * viewport.height - diameter / 2, width: diameter, height: diameter,
        display: "grid", placeItems: "center", borderRadius: "50%", touchAction: "none",
        background: "linear-gradient(145deg,#bd79ff,#63319e)", color: "#fff", fontWeight: 900,
        fontSize: Math.max(11, diameter * 0.21), border: "3px solid #e2baff",
        outline: selected ? "3px solid #fff" : undefined, outlineOffset: 4,
        boxShadow: "0 4px 14px #17102599" }}>
      超充
      {selected && <span className="adjustable-joystick-label">超充按键</span>}
    </div>;
  }
  const diameter = joystickDiameter(layout, viewport.width, viewport.height);
  const radius = diameter / 2;
  const knobSize = diameter * 0.4;
  const definition = JOYSTICK_DEFINITIONS[id];
  const normalizedCharge = Math.max(0, Math.min(1, charge ?? 0));
  const showsSuperMeter = id === "super" && charge !== undefined;
  const style = {
    "--joystick-color": definition.color,
    left: layout.x * viewport.width - radius,
    top: layout.y * viewport.height - radius,
    width: diameter,
    height: diameter,
  } as CSSProperties;
  return <div className={`adjustable-joystick ${active ? "active" : ""} ${selected ? "selected" : ""} ${showsSuperMeter ? `super-meter ${normalizedCharge >= 1 ? "ready" : "charging"}` : ""}`} style={{
    ...style,
    "--super-charge-angle": `${normalizedCharge * 360}deg`,
  } as CSSProperties}
    data-joystick-id={id} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp}
    onPointerCancel={onPointerUp} onClick={onClick} aria-label={definition.label}>
    {showsSuperMeter && <div className="adjustable-super-charge-ring" />}
    <div className="adjustable-joystick-ring" />
    <div className="adjustable-joystick-knob" style={{ width: knobSize, height: knobSize, left: radius + knob.x - knobSize / 2, top: radius + knob.y - knobSize / 2 }}>
      {showsSuperMeter && <span className="adjustable-super-icon" aria-hidden="true">◆</span>}
    </div>
    {selected && <span className="adjustable-joystick-label">{definition.label}</span>}
  </div>;
}
