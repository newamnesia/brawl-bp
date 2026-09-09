import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AdjustableJoystick } from "../components/AdjustableJoystick";
import { advanceMovement } from "../features/training/movement";
import { CHARACTER_MOVE_SPEED } from "../features/training/config";
import { clampJoystick, joystickDiameter, loadControlLayout, resetControlLayout, saveControlLayout, type JoystickId } from "../features/training/controlLayout";

export default function ControlLayoutEditor() {
  const navigate = useNavigate();
  const { kind } = useParams();
  const joystickId: JoystickId = kind === "aiming" ? "attack" : "movement";
  const backPath = kind === "aiming" ? "/offline-aiming" : "/offline-training";
  const rootRef = useRef<HTMLDivElement>(null);
  const [viewport, setViewport] = useState({ width: innerWidth, height: innerHeight });
  const [layout, setLayout] = useState(loadControlLayout);
  const [editing, setEditing] = useState(false);
  const [selected, setSelected] = useState<JoystickId | null>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const [player, setPlayer] = useState({ x: 0.5, y: 0.5 });
  const dragRef = useRef<{ pointerId: number; offsetX: number; offsetY: number; moved: boolean } | null>(null);
  const movementElapsed = useRef(0);

  useEffect(() => {
    const resize = () => setViewport({ width: innerWidth, height: innerHeight });
    addEventListener("resize", resize);
    return () => removeEventListener("resize", resize);
  }, []);

  useEffect(() => {
    if (joystickId !== "movement" || (knob.x === 0 && knob.y === 0)) return;
    let frame = 0;
    let previous = performance.now();
    const animate = (now: number) => {
      const dt = Math.min((now - previous) / 1000, .05);
      previous = now;
      const length = Math.hypot(knob.x, knob.y);
      const step = advanceMovement(movementElapsed.current, dt, length > 8);
      movementElapsed.current = step.elapsed;
      if (length > 8) setPlayer(p => ({
        x: Math.min(.97, Math.max(.03, p.x + knob.x / length * CHARACTER_MOVE_SPEED * step.distance / 6000)),
        y: Math.min(.95, Math.max(.08, p.y + knob.y / length * CHARACTER_MOVE_SPEED * step.distance / 9000)),
      }));
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [joystickId, knob]);

  const updateJoystick = (id: JoystickId, next: typeof layout.joysticks.movement) => {
    const clamped = clampJoystick(next, viewport.width, viewport.height);
    setLayout(current => saveControlLayout({ ...current, joysticks: { ...current.joysticks, [id]: clamped } }));
  };

  const pointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    const item = layout.joysticks[joystickId];
    if (editing) {
      dragRef.current = { pointerId: event.pointerId, offsetX: event.clientX - item.x * viewport.width, offsetY: event.clientY - item.y * viewport.height, moved: false };
      setSelected(joystickId);
    } else {
      moveKnob(event);
    }
  };
  const pointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (editing) {
      const drag = dragRef.current;
      if (!drag || drag.pointerId !== event.pointerId) return;
      drag.moved = true;
      updateJoystick(joystickId, { ...layout.joysticks[joystickId], x: (event.clientX - drag.offsetX) / viewport.width, y: (event.clientY - drag.offsetY) / viewport.height });
    } else if (event.currentTarget.hasPointerCapture(event.pointerId)) moveKnob(event);
  };
  const moveKnob = (event: React.PointerEvent<HTMLDivElement>) => {
    const item = layout.joysticks[joystickId];
    const radius = joystickDiameter(item, viewport.width, viewport.height) / 2;
    let dx = event.clientX - item.x * viewport.width;
    let dy = event.clientY - item.y * viewport.height;
    const length = Math.hypot(dx, dy);
    const max = radius * 0.78;
    if (length > max) { dx = dx / length * max; dy = dy / length * max; }
    setKnob({ x: dx, y: dy });
  };
  const pointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    dragRef.current = null;
    if (!editing) { setKnob({ x: 0, y: 0 }); movementElapsed.current = 0; }
  };

  const item = layout.joysticks[joystickId];
  return <div ref={rootRef} className="layout-editor">
    <div className="layout-editor-map"><div className="layout-grid" /><div className="layout-player" style={{ left: `${player.x * 100}%`, top: `${player.y * 100}%` }} />
      {joystickId === "attack" && (knob.x !== 0 || knob.y !== 0) && <div className="layout-aim-line" style={{ left: "50%", top: "50%", width: Math.min(260, Math.hypot(knob.x, knob.y) * 3), transform: `rotate(${Math.atan2(knob.y, knob.x)}rad)` }} />}
    </div>
    <div className="layout-editor-top">
      <button onClick={() => { setEditing(v => !v); setSelected(null); setKnob({ x: 0, y: 0 }); }}>{editing ? "完成调整" : "调整按键"}</button>
    </div>
    <button className="layout-back" onClick={() => navigate(backPath)}>返回设置</button>
    {editing && selected && <div className="layout-size-control"><span>按键大小</span><input aria-label="按键大小" type="range" min="0.13" max="0.32" step="0.005" value={item.size} onChange={e => updateJoystick(selected, { ...item, size: Number(e.target.value) })} /><output>{Math.round(item.size * 100)}%</output></div>}
    <AdjustableJoystick id={joystickId} layout={item} viewport={viewport} selected={editing && selected === joystickId} knob={knob} active={!editing && (knob.x !== 0 || knob.y !== 0)} onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onClick={() => editing && setSelected(joystickId)} />
    {editing && <button className="layout-reset" onClick={() => { const next = resetControlLayout(); setLayout(next); setSelected(null); }}>恢复默认</button>}
    <div className="layout-editor-hint">{editing ? "按住并拖动摇杆改变位置；单点摇杆后通过顶部滑条改变大小" : joystickId === "movement" ? "空白地图操作预览" : "拖动攻击摇杆预览瞄准方向"}</div>
  </div>;
}
