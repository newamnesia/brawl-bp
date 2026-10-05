import type { CSSProperties, PointerEventHandler } from "react";
import { JOYSTICK_DEFINITIONS, hyperButtonDiameter, joystickDiameter, type JoystickId, type JoystickLayout } from "../features/training/controlLayout";

export function AdjustableJoystick({ id, layout, viewport, selected, knob = { x: 0, y: 0 }, active, charge, onPointerDown, onPointerMove, onPointerUp, onClick }: {
  id: JoystickId; layout: JoystickLayout; viewport: { width: number; height: number };
  selected?: boolean; knob?: { x: number; y: number }; active?: boolean;
  charge?: number;
  onPointerDown?: PointerEventHandler<HTMLDivElement>; onPointerMove?: PointerEventHandler<HTMLDivElement>;
  onPointerUp?: PointerEventHandler<HTMLDivElement>; onClick?: PointerEventHandler<HTMLDivElement>;
}) {
  if (id === "hyper" || id === "gadget") {
    const diameter = hyperButtonDiameter(layout, viewport.width, viewport.height);
    const isGadget = id === "gadget";
    return <div data-joystick-id={id} aria-label={JOYSTICK_DEFINITIONS[id].label}
      onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp} onClick={onClick}
      style={{ position: "fixed", zIndex: 12, left: layout.x * viewport.width - diameter / 2,
        top: layout.y * viewport.height - diameter / 2, width: diameter, height: diameter,
        borderRadius: "50%", touchAction: "none", display: "grid", placeItems: "center",
        color: "#fff", fontSize: "1.25rem", fontWeight: 900,
        background: isGadget ? "linear-gradient(145deg,#63e58e,#247e44)" : "linear-gradient(145deg,#bd79ff,#63319e)",
        border: `3px solid ${isGadget ? "#baffc9" : "#e2baff"}`,
        outline: selected ? "3px solid #fff" : undefined, outlineOffset: 4,
        boxShadow: "0 4px 14px #17102599" }}>
      <span aria-hidden="true" style={{ pointerEvents: "none" }}>{isGadget ? "✦" : "◆"}</span>
      {selected && <span className="adjustable-joystick-label">{JOYSTICK_DEFINITIONS[id].label}</span>}
    </div>;
  }
  const diameter = joystickDiameter(layout, viewport.width, viewport.height);
  const radius = diameter / 2;
  const knobSize = diameter * 0.4;
  const definition = JOYSTICK_DEFINITIONS[id];
  const normalizedCharge = Math.max(0, Math.min(1, charge ?? 0));
  const showsSuperMeter = id === "super" && charge !== undefined;
  const interactive = Boolean(onPointerDown || onPointerMove || onPointerUp || onClick);
  const style = {
    "--joystick-color": definition.color,
    left: layout.x * viewport.width - radius,
    top: layout.y * viewport.height - radius,
    width: diameter,
    height: diameter,
    pointerEvents: interactive ? "auto" : "none",
  } as CSSProperties;
  return <div className={`adjustable-joystick ${active ? "active" : ""} ${selected ? "selected" : ""} ${showsSuperMeter ? `super-meter ${normalizedCharge >= 1 ? "ready" : "charging"}` : ""}`} style={{
    ...style,
    "--super-charge-angle": `${normalizedCharge * 360}deg`,
  } as CSSProperties}
    data-joystick-id={id} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp}
    onPointerCancel={onPointerUp} onClick={onClick} aria-label={definition.label}>
    {showsSuperMeter && <div className="adjustable-super-charge-ring" />}
    <div className="adjustable-joystick-ring" />
    <div className="adjustable-joystick-knob" style={{
      width: knobSize,
      height: knobSize,
      left: `calc(50% + ${knob.x}px)`,
      top: `calc(50% + ${knob.y}px)`,
      transform: "translate(-50%, -50%)",
    }}>
      {showsSuperMeter && <span className="adjustable-super-icon" aria-hidden="true">◆</span>}
    </div>
    {selected && <span className="adjustable-joystick-label">{definition.label}</span>}
  </div>;
}
