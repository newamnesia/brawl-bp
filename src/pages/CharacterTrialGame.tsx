import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AdjustableJoystick } from "../components/AdjustableJoystick";
import { TRIAL_BRAWLERS, isTrialBrawler } from "../features/training/characterTrial";
import { clampJoystickToSide, joystickDiameter, loadControlLayout, type JoystickId } from "../features/training/controlLayout";
import { advanceMovement } from "../features/training/movement";
import { MAX_PROJECTILE_INTERVAL_SECONDS } from "../features/training/config";
import { drawTrainingUnitModel } from "../features/training/unitModel";
import { BEA_SUPER, beaSuperPosition } from "../features/training/beaSuper";
import { drawSuperRing } from "../features/training/groundRing";

const MAP_WIDTH = 6300;
const MAP_HEIGHT = 4200;
const UNIT_RADIUS = 150;
const HORIZONTAL_VIEW_UNITS = 300 * 31.2;
const MIN_VERTICAL_VIEW_UNITS = 300 * 19.6;
const GROUND_DEPTH_PROJECTION = Math.sin(67 * Math.PI / 180);
const PERSPECTIVE_WIDTH_STRENGTH = 0.16;
const TARGET_MAX_HEALTH = 100000;
const TARGET = { x: MAP_WIDTH / 2, y: MAP_HEIGHT / 2 };
const ZERO_KNOBS: Record<JoystickId, { x: number; y: number }> = {
  movement: { x: 0, y: 0 },
  attack: { x: 0, y: 0 },
  super: { x: 0, y: 0 },
};
const AUTO_AIM_DEADZONE_RATIO = 0.24;
const MAX_SUPER_SPEED_BONUS = 300;
const MAX_SUPER_DURATION_SECONDS = 4;
const OBSTACLES: ReadonlyArray<{ x: number; y: number; width: number; height: number }> = [];

function segmentIntersectsObstacle(ax: number, ay: number, bx: number, by: number,
  obstacle: { x: number; y: number; width: number; height: number }) {
  let minimum = 0;
  let maximum = 1;
  const dx = bx - ax;
  const dy = by - ay;
  const checks: Array<[number, number]> = [
    [-dx, ax - obstacle.x],
    [dx, obstacle.x + obstacle.width - ax],
    [-dy, ay - obstacle.y],
    [dy, obstacle.y + obstacle.height - ay],
  ];
  for (const [p, q] of checks) {
    if (p === 0) {
      if (q < 0) return false;
      continue;
    }
    const ratio = q / p;
    if (p < 0) minimum = Math.max(minimum, ratio);
    else maximum = Math.min(maximum, ratio);
    if (minimum > maximum) return false;
  }
  return true;
}

type Projectile = {
  x: number; y: number; previousX: number; previousY: number;
  vx: number; vy: number; traveled: number; range: number;
  width: number; damage: number; color: "yellow" | "blue";
  owner: "piper" | "bea" | "max"; enhanced?: boolean;
  spawnDelay?: number;
  isSuper?: boolean;
  superTrajectory?: { originX: number; originY: number; angle: number; omega: number; elapsed: number };
};

type GameState = {
  playerX: number; playerY: number; targetHealth: number;
  ammo: number; reloadElapsed: number; movementElapsed: number;
  beaEnhanced: boolean; superCharge: number; maxSuperRemaining: number; projectiles: Projectile[];
};

type ActivePointer = { pointerId: number; startX: number; startY: number; exceededDeadzone: boolean };

function segmentDistanceSquared(px: number, py: number, ax: number, ay: number, bx: number, by: number) {
  const abx = bx - ax;
  const aby = by - ay;
  const lengthSquared = abx * abx + aby * aby;
  const ratio = lengthSquared === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * abx + (py - ay) * aby) / lengthSquared));
  const dx = px - (ax + abx * ratio);
  const dy = py - (ay + aby * ratio);
  return dx * dx + dy * dy;
}

function drawProjectile(ctx: CanvasRenderingContext2D, projectile: Projectile) {
  const angle = Math.atan2(projectile.vy, projectile.vx);
  const width = projectile.width;
  const length = Math.max(width * 1.45, 150);
  const bodyColor = projectile.color === "blue" ? "#35d7ff" : "#ffd13d";
  const edgeColor = projectile.color === "blue" ? "#d8fbff" : "#fff2a0";
  ctx.save();
  ctx.translate(projectile.x, projectile.y);
  ctx.rotate(angle);
  ctx.shadowColor = bodyColor;
  ctx.shadowBlur = width * 0.22;
  ctx.fillStyle = bodyColor;
  ctx.beginPath();
  ctx.roundRect(-length / 2, -width / 2, length * 0.72, width, width / 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(length * 0.22, -width / 2);
  ctx.arc(length * 0.22, 0, width / 2, -Math.PI / 2, Math.PI / 2);
  ctx.lineTo(-length * 0.12, width / 2);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = edgeColor;
  ctx.lineWidth = Math.max(10, width * 0.08);
  ctx.stroke();
  ctx.restore();
}

export default function CharacterTrialGame() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requested = searchParams.get("hero");
  const heroId = isTrialBrawler(requested) ? requested : "piper";
  const hero = TRIAL_BRAWLERS[heroId];
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [viewport, setViewport] = useState({ width: innerWidth, height: innerHeight });
  const [knobs, setKnobs] = useState(ZERO_KNOBS);
  const knobsRef = useRef(ZERO_KNOBS);
  const [hud, setHud] = useState({ health: TARGET_MAX_HEALTH, ammo: hero.ammoCapacity, reload: 0, enhanced: false, superCharge: 0, maxSuperRemaining: 0 });
  const inputRef = useRef<Record<JoystickId, { x: number; y: number }>>({ ...ZERO_KNOBS });
  const activePointersRef = useRef<Partial<Record<JoystickId, ActivePointer>>>({});
  const stateRef = useRef<GameState>({
    playerX: MAP_WIDTH / 2,
    playerY: MAP_HEIGHT * 0.81,
    targetHealth: TARGET_MAX_HEALTH,
    ammo: hero.ammoCapacity,
    reloadElapsed: 0,
    movementElapsed: 0,
    beaEnhanced: false,
    superCharge: 0,
    maxSuperRemaining: 0,
    projectiles: [],
  });

  useEffect(() => {
    const resize = () => setViewport({ width: innerWidth, height: innerHeight });
    addEventListener("resize", resize);
    return () => removeEventListener("resize", resize);
  }, []);

  useEffect(() => {
    stateRef.current = {
      playerX: MAP_WIDTH / 2,
      playerY: MAP_HEIGHT * 0.81,
      targetHealth: TARGET_MAX_HEALTH,
      ammo: hero.ammoCapacity,
      reloadElapsed: 0,
      movementElapsed: 0,
      beaEnhanced: false,
      superCharge: 0,
      maxSuperRemaining: 0,
      projectiles: [],
    };
    activePointersRef.current = {};
    inputRef.current = structuredClone(ZERO_KNOBS);
    knobsRef.current = structuredClone(ZERO_KNOBS);
    setKnobs(structuredClone(ZERO_KNOBS));
    setHud({ health: TARGET_MAX_HEALTH, ammo: hero.ammoCapacity, reload: 0, enhanced: false, superCharge: 0, maxSuperRemaining: 0 });
  }, [hero]);

  const layout = loadControlLayout();
  const displayedLayout = (id: JoystickId) => clampJoystickToSide(layout.joysticks[id], viewport.width, viewport.height, id);

  const setInput = (id: JoystickId, value: { x: number; y: number }) => {
    inputRef.current[id] = value;
    knobsRef.current = { ...knobsRef.current, [id]: value };
    setKnobs(knobsRef.current);
  };

  const maximumKnobOffset = (id: JoystickId) => {
    const item = displayedLayout(id);
    return joystickDiameter(item, viewport.width, viewport.height) / 2 * 0.78;
  };

  const moveKnob = (id: JoystickId, event: React.PointerEvent<HTMLElement>) => {
    const pointer = activePointersRef.current[id];
    if (!pointer || pointer.pointerId !== event.pointerId) return;
    let x = event.clientX - pointer.startX;
    let y = event.clientY - pointer.startY;
    const length = Math.hypot(x, y);
    const maximum = maximumKnobOffset(id);
    if (id !== "movement" && length > maximum * AUTO_AIM_DEADZONE_RATIO) pointer.exceededDeadzone = true;
    if (length > maximum) { x = x / length * maximum; y = y / length * maximum; }
    setInput(id, { x, y });
  };

  const pointerDown = (id: JoystickId, event: React.PointerEvent<HTMLElement>) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    activePointersRef.current[id] = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      exceededDeadzone: false,
    };
    setInput(id, { x: 0, y: 0 });
  };

  const pointerMove = (id: JoystickId, event: React.PointerEvent<HTMLElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) moveKnob(id, event);
  };

  const fire = (directionX: number, directionY: number) => {
    const state = stateRef.current;
    const length = Math.hypot(directionX, directionY);
    if (length < 8 || state.ammo <= 0) return;
    const baseAngle = Math.atan2(directionY, directionX);
    const angles = heroId === "max"
      ? [0, -1.5, 1.5 + Math.random() * 0.3, -3].map(degrees => baseAngle + degrees * Math.PI / 180)
      : [baseAngle];
    const enhanced = heroId === "bea" && state.beaEnhanced;
    state.ammo -= 1;
    if (enhanced) state.beaEnhanced = false;
    for (const [index, angle] of angles.entries()) {
      state.projectiles.push({
        x: state.playerX + Math.cos(angle) * UNIT_RADIUS,
        y: state.playerY + Math.sin(angle) * UNIT_RADIUS,
        previousX: state.playerX,
        previousY: state.playerY,
        vx: Math.cos(angle) * hero.projectileSpeed,
        vy: Math.sin(angle) * hero.projectileSpeed,
        traveled: 0,
        range: hero.range,
        width: hero.projectileWidth,
        damage: heroId === "piper" ? 720 : heroId === "bea" ? (enhanced ? 4400 : 1600) : 640,
        color: enhanced ? "blue" : "yellow",
        owner: heroId,
        enhanced,
        spawnDelay: heroId === "max" ? index * MAX_PROJECTILE_INTERVAL_SECONDS : 0,
      });
    }
  };

  const targetIsVisibleAndUnblocked = () => {
    const state = stateRef.current;
    if (state.targetHealth <= 0) return false;
    const scale = Math.min(
      viewport.width / HORIZONTAL_VIEW_UNITS,
      viewport.height / (MIN_VERTICAL_VIEW_UNITS * GROUND_DEPTH_PROJECTION),
    );
    const scaleY = scale * GROUND_DEPTH_PROJECTION;
    const screenX = (viewport.width - MAP_WIDTH * scale) / 2 + TARGET.x * scale;
    const screenY = (viewport.height - MAP_HEIGHT * scaleY) / 2 + TARGET.y * scaleY;
    const visible = screenX >= 0 && screenX <= viewport.width && screenY >= 0 && screenY <= viewport.height;
    return visible && !OBSTACLES.some(obstacle => segmentIntersectsObstacle(
      state.playerX, state.playerY, TARGET.x, TARGET.y, obstacle,
    ));
  };

  const autoAimDirection = () => {
    const state = stateRef.current;
    if (!targetIsVisibleAndUnblocked()) return null;
    return { x: TARGET.x - state.playerX, y: TARGET.y - state.playerY };
  };

  const releaseSuper = (directionX: number, directionY: number) => {
    const state = stateRef.current;
    if (state.superCharge < 1 || heroId === "piper") return;
    if (heroId === "max") {
      state.superCharge = 0;
      state.maxSuperRemaining = MAX_SUPER_DURATION_SECONDS;
      return;
    }
    const length = Math.hypot(directionX, directionY);
    if (length < 0.001) return;
    const angle = Math.atan2(directionY, directionX);
    for (const omega of BEA_SUPER.angularSpeeds) {
      state.projectiles.push({
        x: state.playerX,
        y: state.playerY,
        previousX: state.playerX,
        previousY: state.playerY,
        vx: Math.cos(angle) * BEA_SUPER.speed * 300,
        vy: Math.sin(angle) * BEA_SUPER.speed * 300,
        traveled: 0,
        range: BEA_SUPER.range * 300,
        width: BEA_SUPER.radius * 2 * 300,
        damage: BEA_SUPER.damage,
        color: "yellow",
        owner: "bea",
        isSuper: true,
        superTrajectory: { originX: state.playerX, originY: state.playerY, angle, omega, elapsed: 0 },
      });
    }
    state.superCharge = 0;
  };

  const pointerUp = (id: JoystickId, event: React.PointerEvent<HTMLElement>) => {
    const pointer = activePointersRef.current[id];
    if (!pointer || pointer.pointerId !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    const value = inputRef.current[id];
    const length = Math.hypot(value.x, value.y);
    const deadzone = maximumKnobOffset(id) * AUTO_AIM_DEADZONE_RATIO;
    const cancelled = event.type === "pointercancel" || (id !== "movement" && pointer.exceededDeadzone && length <= deadzone);
    if (!cancelled && id !== "movement") {
      const direction = pointer.exceededDeadzone ? value : autoAimDirection();
      if (direction) {
        if (id === "attack") fire(direction.x, direction.y);
        else releaseSuper(direction.x, direction.y);
      }
    } else if (id === "movement") stateRef.current.movementElapsed = 0;
    delete activePointersRef.current[id];
    setInput(id, { x: 0, y: 0 });
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    let frame = 0;
    let previous = performance.now();
    let hudElapsed = 0;

    const render = (now: number) => {
      const dt = Math.min((now - previous) / 1000, 0.05);
      previous = now;
      const state = stateRef.current;
      state.maxSuperRemaining = Math.max(0, state.maxSuperRemaining - dt);
      const movement = inputRef.current.movement;
      const movementLength = Math.hypot(movement.x, movement.y);
      const step = advanceMovement(state.movementElapsed, dt, movementLength > 8);
      state.movementElapsed = step.elapsed;
      if (movementLength > 8) {
        const movementItem = displayedLayout("movement");
        const maximumOffset = joystickDiameter(movementItem, viewport.width, viewport.height) / 2 * 0.78;
        const analogAmount = Math.min(1, movementLength / maximumOffset);
        const moveSpeed = hero.moveSpeed + (heroId === "max" && state.maxSuperRemaining > 0 ? MAX_SUPER_SPEED_BONUS : 0);
        const nextX = Math.max(UNIT_RADIUS, Math.min(MAP_WIDTH - UNIT_RADIUS, state.playerX + movement.x / movementLength * moveSpeed * step.distance * analogAmount));
        const nextY = Math.max(UNIT_RADIUS, Math.min(MAP_HEIGHT - UNIT_RADIUS, state.playerY + movement.y / movementLength * moveSpeed * step.distance * analogAmount));
        const targetDx = nextX - TARGET.x;
        const targetDy = nextY - TARGET.y;
        const targetDistance = Math.hypot(targetDx, targetDy);
        if (targetDistance < UNIT_RADIUS * 2) {
          state.playerX = TARGET.x + targetDx / Math.max(1, targetDistance) * UNIT_RADIUS * 2;
          state.playerY = TARGET.y + targetDy / Math.max(1, targetDistance) * UNIT_RADIUS * 2;
        } else {
          state.playerX = nextX;
          state.playerY = nextY;
        }
      }

      if (state.ammo < hero.ammoCapacity) {
        state.reloadElapsed += dt;
        while (state.reloadElapsed >= hero.reloadSeconds && state.ammo < hero.ammoCapacity) {
          state.reloadElapsed -= hero.reloadSeconds;
          state.ammo += 1;
        }
      } else state.reloadElapsed = 0;

      for (let index = state.projectiles.length - 1; index >= 0; index--) {
        const projectile = state.projectiles[index];
        let movementTime = dt;
        if ((projectile.spawnDelay ?? 0) > 0) {
          const waitingTime = Math.min(projectile.spawnDelay ?? 0, movementTime);
          projectile.spawnDelay = Math.max(0, (projectile.spawnDelay ?? 0) - waitingTime);
          movementTime -= waitingTime;
          projectile.x = state.playerX + Math.cos(Math.atan2(projectile.vy, projectile.vx)) * UNIT_RADIUS;
          projectile.y = state.playerY + Math.sin(Math.atan2(projectile.vy, projectile.vx)) * UNIT_RADIUS;
          projectile.previousX = projectile.x;
          projectile.previousY = projectile.y;
          if (movementTime <= 0) continue;
        }
        projectile.previousX = projectile.x;
        projectile.previousY = projectile.y;
        if (projectile.superTrajectory) {
          const trajectory = projectile.superTrajectory;
          trajectory.elapsed = Math.min(trajectory.elapsed + movementTime, BEA_SUPER.range / BEA_SUPER.speed);
          const local = beaSuperPosition(trajectory.elapsed, trajectory.omega);
          const cosine = Math.cos(trajectory.angle);
          const sine = Math.sin(trajectory.angle);
          projectile.x = trajectory.originX + (local.x * cosine - local.y * sine) * 300;
          projectile.y = trajectory.originY + (local.x * sine + local.y * cosine) * 300;
          projectile.vx = Math.cos(trajectory.angle + local.heading) * BEA_SUPER.speed * 300;
          projectile.vy = Math.sin(trajectory.angle + local.heading) * BEA_SUPER.speed * 300;
          projectile.traveled = trajectory.elapsed * BEA_SUPER.speed * 300;
        } else {
          const dx = projectile.vx * movementTime;
          const dy = projectile.vy * movementTime;
          projectile.x += dx;
          projectile.y += dy;
          projectile.traveled += Math.hypot(dx, dy);
        }
        const collisionRadius = UNIT_RADIUS + projectile.width / 2;
        const hit = segmentDistanceSquared(TARGET.x, TARGET.y, projectile.previousX, projectile.previousY, projectile.x, projectile.y) <= collisionRadius * collisionRadius;
        if (hit) {
          const distanceDamage = projectile.owner === "piper"
            ? 720 + 2880 * Math.min(1, projectile.traveled / projectile.range)
            : projectile.damage;
          state.targetHealth = Math.max(0, state.targetHealth - Math.round(distanceDamage));
          if (state.superCharge < 1) {
            const chargeGain = projectile.isSuper ? 0.175 / 7 : projectile.owner === "max" ? 0.0735 : projectile.owner === "bea" ? 0.26 : 0;
            state.superCharge = Math.min(1, state.superCharge + chargeGain);
          }
          if (projectile.owner === "bea" && !projectile.isSuper && !projectile.enhanced) state.beaEnhanced = true;
          state.projectiles.splice(index, 1);
        } else if (projectile.traveled >= projectile.range || projectile.x < 0 || projectile.x > MAP_WIDTH || projectile.y < 0 || projectile.y > MAP_HEIGHT) {
          state.projectiles.splice(index, 1);
        }
      }

      const dpr = Math.min(devicePixelRatio || 1, 2);
      if (canvas.width !== Math.round(viewport.width * dpr) || canvas.height !== Math.round(viewport.height * dpr)) {
        canvas.width = Math.round(viewport.width * dpr);
        canvas.height = Math.round(viewport.height * dpr);
      }
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      context.clearRect(0, 0, viewport.width, viewport.height);
      context.fillStyle = "#10161e";
      context.fillRect(0, 0, viewport.width, viewport.height);
      // 与走位/瞄准训练使用相同视野和地面纵深压缩，保证人物模型的屏幕尺寸一致。
      const scale = Math.min(
        viewport.width / HORIZONTAL_VIEW_UNITS,
        viewport.height / (MIN_VERTICAL_VIEW_UNITS * GROUND_DEPTH_PROJECTION),
      );
      const scaleY = scale * GROUND_DEPTH_PROJECTION;
      const offsetX = (viewport.width - MAP_WIDTH * scale) / 2;
      const offsetY = (viewport.height - MAP_HEIGHT * scaleY) / 2;
      context.save();
      context.translate(offsetX, offsetY);
      context.scale(scale, scaleY);
      context.fillStyle = "#31485a";
      context.fillRect(0, 0, MAP_WIDTH, MAP_HEIGHT);
      context.strokeStyle = "rgba(183,221,235,.09)";
      context.lineWidth = 8;
      for (let x = 0; x <= MAP_WIDTH; x += 300) { context.beginPath(); context.moveTo(x, 0); context.lineTo(x, MAP_HEIGHT); context.stroke(); }
      for (let y = 0; y <= MAP_HEIGHT; y += 300) { context.beginPath(); context.moveTo(0, y); context.lineTo(MAP_WIDTH, y); context.stroke(); }

      for (const id of (["attack", "super"] as const)) {
        const aim = inputRef.current[id];
        const aimLength = Math.hypot(aim.x, aim.y);
        if (aimLength <= 8 || (id === "super" && heroId === "piper")) continue;
        context.strokeStyle = id === "attack" ? "rgba(255,82,82,.45)" : "rgba(255,213,79,.55)";
        context.lineWidth = id === "attack" ? hero.projectileWidth : 90;
        context.lineCap = "round";
        context.beginPath();
        context.moveTo(state.playerX, state.playerY);
        const range = id === "attack" ? hero.range : heroId === "bea" ? BEA_SUPER.range * 300 : 1200;
        context.lineTo(state.playerX + aim.x / aimLength * range, state.playerY + aim.y / aimLength * range);
        context.stroke();
      }

      context.restore();

      const widthFactorAt = (worldY: number) => 1 + (worldY / MAP_HEIGHT - 0.5) * PERSPECTIVE_WIDTH_STRENGTH;
      const targetWidthFactor = widthFactorAt(TARGET.y);
      const playerWidthFactor = widthFactorAt(state.playerY);
      const modelRadiusY = UNIT_RADIUS * scaleY;
      const targetScreenX = offsetX + TARGET.x * scale;
      const targetScreenY = offsetY + TARGET.y * scaleY;
      const playerScreenX = offsetX + state.playerX * scale;
      const playerScreenY = offsetY + state.playerY * scaleY;
      drawTrainingUnitModel(context, {
        centerX: targetScreenX,
        centerY: targetScreenY,
        radiusX: UNIT_RADIUS * scale * targetWidthFactor,
        radiusY: modelRadiusY,
        statusWidth: 300 * scale * targetWidthFactor,
        health: state.targetHealth,
        maxHealth: TARGET_MAX_HEALTH,
        team: "enemy",
        relation: "enemy",
      });
      drawTrainingUnitModel(context, {
        centerX: playerScreenX,
        centerY: playerScreenY,
        radiusX: UNIT_RADIUS * scale * playerWidthFactor,
        radiusY: modelRadiusY,
        statusWidth: 300 * scale * playerWidthFactor,
        health: hero.health,
        maxHealth: hero.health,
        team: "player",
        relation: "self",
        afterGroundRing: state.superCharge >= 1
          ? () => drawSuperRing(context, playerScreenX, playerScreenY,
            UNIT_RADIUS * scale * playerWidthFactor, modelRadiusY,
            now / 1000 * 1.8, Math.hypot(inputRef.current.super.x, inputRef.current.super.y) > 8)
          : undefined,
        ammo: {
          current: state.ammo,
          capacity: hero.ammoCapacity,
          reloadProgress: state.ammo < hero.ammoCapacity ? state.reloadElapsed / hero.reloadSeconds : 0,
        },
      });

      context.save();
      context.translate(offsetX, offsetY);
      context.scale(scale, scaleY);
      for (const projectile of state.projectiles) {
        if ((projectile.spawnDelay ?? 0) <= 0) drawProjectile(context, projectile);
      }
      context.restore();

      hudElapsed += dt;
      if (hudElapsed >= 0.08) {
        hudElapsed = 0;
        setHud({
          health: state.targetHealth,
          ammo: state.ammo,
          reload: state.ammo < hero.ammoCapacity ? state.reloadElapsed / hero.reloadSeconds : 0,
          enhanced: state.beaEnhanced,
          superCharge: state.superCharge,
          maxSuperRemaining: state.maxSuperRemaining,
        });
      }
      frame = requestAnimationFrame(render);
    };
    frame = requestAnimationFrame(render);
    return () => cancelAnimationFrame(frame);
  }, [hero, heroId, viewport]);

  const resetTarget = () => {
    stateRef.current.targetHealth = TARGET_MAX_HEALTH;
    stateRef.current.projectiles = [];
    setHud(current => ({ ...current, health: TARGET_MAX_HEALTH }));
  };

  const activeJoystickForPointer = (pointerId: number) =>
    (["movement", "attack", "super"] as JoystickId[])
      .find(id => activePointersRef.current[id]?.pointerId === pointerId);

  const isControlTarget = (target: EventTarget | null) => target instanceof Element
    && Boolean(target.closest("button, a, input, select, textarea, [data-joystick-id]"));

  const handleGamePointerDown = (event: React.PointerEvent<HTMLElement>) => {
    if (isControlTarget(event.target)) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const id: JoystickId = event.clientX - rect.left < rect.width / 2 ? "movement" : "attack";
    pointerDown(id, event);
  };

  const handleGamePointerMove = (event: React.PointerEvent<HTMLElement>) => {
    const id = activeJoystickForPointer(event.pointerId);
    if (id) pointerMove(id, event);
  };

  const handleGamePointerUp = (event: React.PointerEvent<HTMLElement>) => {
    const id = activeJoystickForPointer(event.pointerId);
    if (id) pointerUp(id, event);
  };

  const visibleJoystickIds: JoystickId[] = heroId === "piper"
    ? ["movement", "attack"]
    : ["movement", "attack", "super"];

  return <main className="character-trial-game"
    onPointerDown={handleGamePointerDown}
    onPointerMove={handleGamePointerMove}
    onPointerUp={handleGamePointerUp}
    onPointerCancel={handleGamePointerUp}>
    <canvas ref={canvasRef} aria-label={`${hero.name}角色试用地图`} />
    <div className="character-trial-hud">
      <strong>{hero.name}</strong>
      <span>目标 {hud.health.toLocaleString()} / {TARGET_MAX_HEALTH.toLocaleString()}</span>
      <span>弹药 {hud.ammo}/{hero.ammoCapacity}{hud.ammo < hero.ammoCapacity ? ` · ${Math.round(hud.reload * 100)}%` : ""}</span>
      {heroId === "bea" && <span className={hud.enhanced ? "charged" : ""}>{hud.enhanced ? "强化弹已就绪" : "普通弹"}</span>}
      {heroId !== "piper" && <span className={hud.superCharge >= 1 ? "charged" : ""}>大招 {Math.round(hud.superCharge * 100)}%</span>}
      {heroId === "max" && hud.maxSuperRemaining > 0 && <span className="charged">加速 {hud.maxSuperRemaining.toFixed(1)} 秒</span>}
    </div>
    <div className="character-trial-actions">
      <button onClick={resetTarget}>重置目标</button>
      <button onClick={() => navigate("/character-trial")}>退出试用</button>
    </div>
    {visibleJoystickIds.map(id => {
      const item = displayedLayout(id);
      const knob = knobs[id];
      return <AdjustableJoystick key={id} id={id} layout={item} viewport={viewport} knob={knob}
        active={Boolean(activePointersRef.current[id])} onPointerDown={event => pointerDown(id, event)}
        onPointerMove={event => pointerMove(id, event)} onPointerUp={event => pointerUp(id, event)} />;
    })}
  </main>;
}
