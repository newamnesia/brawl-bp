import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AdjustableJoystick } from "../components/AdjustableJoystick";
import { advanceMovement } from "../features/training/movement";
import { CHARACTER_MOVE_SPEED } from "../features/training/config";
import {
  clampJoystick,
  clampJoystickToSide,
  joystickDiameter,
  loadControlLayout,
  resetControlLayout,
  saveControlLayout,
  type JoystickId,
} from "../features/training/controlLayout";

const ZERO_KNOBS: Record<JoystickId, { x: number; y: number }> = {
  movement: { x: 0, y: 0 },
  attack: { x: 0, y: 0 },
  super: { x: 0, y: 0 },
  hyper: { x: 0, y: 0 },
};

export default function ControlLayoutEditor() {
  const navigate = useNavigate();
  const { kind } = useParams();
  const isTrialLayout = kind === "trial";
  const singleJoystickId: JoystickId = kind === "aiming" ? "attack" : "movement";
  const visibleIds: JoystickId[] = isTrialLayout ? ["movement", "attack", "super", "hyper"] : [singleJoystickId];
  const backPath = isTrialLayout ? "/character-trial" : kind === "aiming" ? "/offline-aiming" : "/offline-training";
  const [viewport, setViewport] = useState({ width: innerWidth, height: innerHeight });
  const [layout, setLayout] = useState(loadControlLayout);
  const [editing, setEditing] = useState(false);
  const [selected, setSelected] = useState<JoystickId | null>(null);
  const [knobs, setKnobs] = useState(ZERO_KNOBS);
  const [player, setPlayer] = useState({ x: 0.5, y: 0.5 });
  const dragRef = useRef<{ id: JoystickId; pointerId: number; offsetX: number; offsetY: number } | null>(null);
  const movementElapsed = useRef(0);

  useEffect(() => {
    const resize = () => setViewport({ width: innerWidth, height: innerHeight });
    addEventListener("resize", resize);
    return () => removeEventListener("resize", resize);
  }, []);

  useEffect(() => {
    const knob = knobs.movement;
    if (!visibleIds.includes("movement") || (knob.x === 0 && knob.y === 0)) return;
    let frame = 0;
    let previous = performance.now();
    const animate = (now: number) => {
      const dt = Math.min((now - previous) / 1000, 0.05);
      previous = now;
      const length = Math.hypot(knob.x, knob.y);
      const step = advanceMovement(movementElapsed.current, dt, length > 8);
      movementElapsed.current = step.elapsed;
      if (length > 8) setPlayer(current => ({
        x: Math.min(0.97, Math.max(0.03, current.x + knob.x / length * CHARACTER_MOVE_SPEED * step.distance / 6000)),
        y: Math.min(0.95, Math.max(0.08, current.y + knob.y / length * CHARACTER_MOVE_SPEED * step.distance / 9000)),
      }));
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [knobs.movement, isTrialLayout, singleJoystickId]);

  const displayedItem = (id: JoystickId) => isTrialLayout
    ? clampJoystickToSide(layout.joysticks[id], viewport.width, viewport.height, id)
    : clampJoystick(layout.joysticks[id], viewport.width, viewport.height, id);

  const updateJoystick = (id: JoystickId, next: typeof layout.joysticks.movement) => {
    const clamped = isTrialLayout
      ? clampJoystickToSide(next, viewport.width, viewport.height, id)
      : clampJoystick(next, viewport.width, viewport.height, id);
    setLayout(current => saveControlLayout({ ...current, joysticks: { ...current.joysticks, [id]: clamped } }));
  };

  const moveKnob = (id: JoystickId, event: React.PointerEvent<HTMLDivElement>) => {
    const item = displayedItem(id);
    const radius = joystickDiameter(item, viewport.width, viewport.height) / 2;
    let dx = event.clientX - item.x * viewport.width;
    let dy = event.clientY - item.y * viewport.height;
    const length = Math.hypot(dx, dy);
    const maximum = radius * 0.78;
    if (length > maximum) { dx = dx / length * maximum; dy = dy / length * maximum; }
    setKnobs(current => ({ ...current, [id]: { x: dx, y: dy } }));
  };

  const pointerDown = (id: JoystickId, event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    const item = displayedItem(id);
    if (editing) {
      dragRef.current = {
        id,
        pointerId: event.pointerId,
        offsetX: event.clientX - item.x * viewport.width,
        offsetY: event.clientY - item.y * viewport.height,
      };
      setSelected(id);
    } else if (id !== "hyper") moveKnob(id, event);
  };

  const pointerMove = (id: JoystickId, event: React.PointerEvent<HTMLDivElement>) => {
    if (editing) {
      const drag = dragRef.current;
      if (!drag || drag.id !== id || drag.pointerId !== event.pointerId) return;
      updateJoystick(id, {
        ...layout.joysticks[id],
        x: (event.clientX - drag.offsetX) / viewport.width,
        y: (event.clientY - drag.offsetY) / viewport.height,
      });
    } else if (id !== "hyper" && event.currentTarget.hasPointerCapture(event.pointerId)) moveKnob(id, event);
  };

  const pointerUp = (id: JoystickId, event: React.PointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    dragRef.current = null;
    if (!editing) {
      setKnobs(current => ({ ...current, [id]: { x: 0, y: 0 } }));
      if (id === "movement") movementElapsed.current = 0;
    }
  };

  const selectedItem = selected ? displayedItem(selected) : null;
  const attackKnob = knobs.attack;
  return <div className={`layout-editor ${isTrialLayout ? "trial-layout-editor" : ""}`}>
    <div className="layout-editor-map">
      <div className="layout-grid" />
      {isTrialLayout && <div className="layout-half-divider" />}
      <div className="layout-player" style={{ left: `${player.x * 100}%`, top: `${player.y * 100}%` }} />
      {visibleIds.includes("attack") && (attackKnob.x !== 0 || attackKnob.y !== 0) && <div className="layout-aim-line" style={{
        left: `${player.x * 100}%`,
        top: `${player.y * 100}%`,
        width: Math.min(260, Math.hypot(attackKnob.x, attackKnob.y) * 3),
        transform: `rotate(${Math.atan2(attackKnob.y, attackKnob.x)}rad)`,
      }} />}
    </div>
    <div className="layout-editor-top"><button onClick={() => {
      setEditing(value => !value);
      setSelected(null);
      setKnobs(ZERO_KNOBS);
    }}>{editing ? "完成调整" : "调整按键"}</button></div>
    <button className="layout-back" onClick={() => navigate(backPath)}>返回设置</button>
    {editing && selected && selectedItem && <div className="layout-size-control">
      <span>{selected === "movement" ? "移动" : selected === "attack" ? "普攻" : selected === "super" ? "大招" : "超充"}按键大小</span>
      <input aria-label="按键大小" type="range" min={selected === "hyper" ? "0.07" : "0.13"}
        max={selected === "hyper" ? "0.13" : "0.32"} step="0.005" value={selectedItem.size}
        onChange={event => updateJoystick(selected, { ...selectedItem, size: Number(event.target.value) })} />
      <output>{Math.round(selectedItem.size * 100)}%</output>
    </div>}
    {visibleIds.map(id => {
      const item = displayedItem(id);
      const knob = knobs[id];
      return <AdjustableJoystick key={id} id={id} layout={item} viewport={viewport}
        selected={editing && selected === id} knob={knob} active={!editing && (knob.x !== 0 || knob.y !== 0)}
        onPointerDown={event => pointerDown(id, event)} onPointerMove={event => pointerMove(id, event)}
        onPointerUp={event => pointerUp(id, event)} onClick={() => editing && setSelected(id)} />;
    })}
    {editing && <button className="layout-reset" onClick={() => {
      const next = resetControlLayout();
      setLayout(next);
      setSelected(null);
    }}>恢复默认</button>}
    <div className="layout-editor-hint">{editing
      ? isTrialLayout ? "移动摇杆限于左半屏，普攻、大招摇杆及超充按键限于右半屏；选择控件可调整大小" : "按住并拖动摇杆改变位置；选择摇杆可调整大小"
      : isTrialLayout ? "蓝色移动、红色普攻、黄色大招、紫色超充" : singleJoystickId === "movement" ? "空白地图操作预览" : "拖动普攻摇杆预览瞄准方向"}</div>
  </div>;
}
