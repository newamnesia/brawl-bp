import type { CSSProperties, PointerEventHandler } from "react";
import { JOYSTICK_DEFINITIONS, joystickDiameter, type JoystickId, type JoystickLayout } from "../features/training/controlLayout";

export function AdjustableJoystick({ id, layout, viewport, selected, knob = { x: 0, y: 0 }, active, onPointerDown, onPointerMove, onPointerUp, onClick }: {
  id: JoystickId; layout: JoystickLayout; viewport: { width: number; height: number };
  selected?: boolean; knob?: { x: number; y: number }; active?: boolean;
  onPointerDown?: PointerEventHandler<HTMLDivElement>; onPointerMove?: PointerEventHandler<HTMLDivElement>;
  onPointerUp?: PointerEventHandler<HTMLDivElement>; onClick?: PointerEventHandler<HTMLDivElement>;
}) {
  const diameter = joystickDiameter(layout, viewport.width, viewport.height);
  const radius = diameter / 2;
  const knobSize = diameter * 0.4;
  const definition = JOYSTICK_DEFINITIONS[id];
  const style = {
    "--joystick-color": definition.color,
    left: layout.x * viewport.width - radius,
    top: layout.y * viewport.height - radius,
    width: diameter,
    height: diameter,
  } as CSSProperties;
  return <div className={`adjustable-joystick ${active ? "active" : ""} ${selected ? "selected" : ""}`} style={style}
    data-joystick-id={id} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp}
    onPointerCancel={onPointerUp} onClick={onClick} aria-label={definition.label}>
    <div className="adjustable-joystick-ring" />
    <div className="adjustable-joystick-knob" style={{ width: knobSize, height: knobSize, left: radius + knob.x - knobSize / 2, top: radius + knob.y - knobSize / 2 }} />
    {selected && <span className="adjustable-joystick-label">{definition.label}</span>}
  </div>;
}
