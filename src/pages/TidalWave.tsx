import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { useNavigate } from "react-router-dom";
import { AdjustableJoystick } from "../components/AdjustableJoystick";
import { completeTidalWave, columnCenter, lowerRowCenter, TIDAL_WAVE, TIDAL_WAVE_WORLD } from "../features/miniGames/tidalWave";
import { TILE_SIZE, tiles } from "../features/training/config";
import { loadControlLayout, joystickDiameter } from "../features/training/controlLayout";
import { advanceMovement, resolveSquareMovement } from "../features/training/movement";
import { drawTrainingUnitModel } from "../features/training/unitModel";
import { drawPierceAimCorridor, drawPierceShell, PIERCE_SHELL } from "../features/training/pierceCombat";

type Vec = { x: number; y: number };
type TargetKind = "player" | "vault";
type MiniBrock = { id: number; x: number; y: number; health: number; ammo: number; reload: number; state: "selecting" | "moving" | "aiming"; timer: number; target: TargetKind | null };
type Shot = { id: number; owner: "player" | "enemy"; x: number; y: number; vx: number; vy: number; traveled: number; maxDistance: number; damage: number; radius: number; target?: TargetKind; createsShell?: boolean };
type Blast = { x: number; y: number; radius: number; life: number };
type PierceShellPickup = { id: number; x: number; y: number; remainingSeconds: number };

const PLAYER_RADIUS = tiles(0.5);
const PLAYER_SPEED = 750;
const PLAYER_HEALTH = 6000;
const PLAYER_RANGE = tiles(10);
const PLAYER_BULLET_SPEED = 4000;
const PLAYER_BULLET_RADIUS = 100;
const PLAYER_DAMAGE = 1900;
const PLAYER_AMMO = 3;
const PLAYER_RELOAD = 3;
const ENEMY_RADIUS = tiles(0.5);
const VAULT_RADIUS = tiles(0.72);
const WALLS = new Set(Array.from({ length: TIDAL_WAVE.mapColumns }, (_, column) => `${column},${TIDAL_WAVE.wallRow}` as const));

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const distanceToSegment = (point: Vec, from: Vec, to: Vec) => {
  const dx = to.x - from.x, dy = to.y - from.y;
  const length2 = dx * dx + dy * dy;
  const t = length2 ? clamp(((point.x - from.x) * dx + (point.y - from.y) * dy) / length2, 0, 1) : 0;
  return Math.hypot(point.x - (from.x + dx * t), point.y - (from.y + dy * t));
};

export default function TidalWave() {
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const keysRef = useRef(new Set<string>());
  const movementRef = useRef<Vec>({ x: 0, y: 0 });
  const attackRef = useRef<Vec>({ x: 0, y: 0 });
  const movementElapsedRef = useRef(0);
  const playerVelocityRef = useRef<Vec>({ x: 0, y: 0 });
  const playerRef = useRef<{ x: number; y: number; health: number; ammo: number; reload: number; attackCooldown: number }>({ x: columnCenter(TIDAL_WAVE.playerSpawn.column), y: lowerRowCenter(TIDAL_WAVE.playerSpawn.rowFromBottom), health: PLAYER_HEALTH, ammo: PLAYER_AMMO, reload: PLAYER_RELOAD, attackCooldown: 0 });
  const vaultRef = useRef<{ x: number; y: number; health: number }>({ x: columnCenter(TIDAL_WAVE.vaultSpawn.column), y: lowerRowCenter(TIDAL_WAVE.vaultSpawn.rowFromBottom), health: TIDAL_WAVE.vaultHealth });
  const enemiesRef = useRef<MiniBrock[]>([]);
  const shotsRef = useRef<Shot[]>([]);
  const blastsRef = useRef<Blast[]>([]);
  const shellsRef = useRef<PierceShellPickup[]>([]);
  const elapsedRef = useRef(0);
  const spawnTimerRef = useRef(TIDAL_WAVE.spawnIntervalSeconds);
  const idsRef = useRef(1);
  const transformRef = useRef({ scale: 1, ox: 0, oy: 0 });
  const resultRef = useRef<"victory" | "defeat" | null>(null);
  const [result, setResult] = useState<"victory" | "defeat" | null>(null);
  const [countdown, setCountdown] = useState(3);
  const countdownRef = useRef(3);
  const [hud, setHud] = useState<{ time: number; vault: number; player: number; enemies: number }>({ time: 30, vault: TIDAL_WAVE.vaultHealth, player: PLAYER_HEALTH, enemies: 0 });
  const [viewport, setViewport] = useState({ width: innerWidth, height: innerHeight });
  const layoutRef = useRef(loadControlLayout());
  const [sticks, setSticks] = useState({ movement: { x: 0, y: 0, active: false }, attack: { x: 0, y: 0, active: false } });
  const pointerIds = useRef<{ movement: number | null; attack: number | null }>({ movement: null, attack: null });

  const finish = (next: "victory" | "defeat") => {
    if (resultRef.current) return;
    resultRef.current = next;
    if (next === "victory") completeTidalWave();
    setResult(next);
  };

  const firePlayer = (direction: Vec) => {
    if (resultRef.current || countdownRef.current > 0) return;
    const length = Math.hypot(direction.x, direction.y);
    const player = playerRef.current;
    if (length < 0.1 || player.ammo <= 0 || player.attackCooldown > 0) return;
    const lastShot = player.ammo === 1;
    player.ammo -= 1;
    player.attackCooldown = 0.65;
    if (player.ammo === 0) player.reload = PLAYER_RELOAD;
    shotsRef.current.push({ id: idsRef.current++, owner: "player", x: player.x, y: player.y, vx: direction.x / length * PLAYER_BULLET_SPEED, vy: direction.y / length * PLAYER_BULLET_SPEED, traveled: 0, maxDistance: PLAYER_RANGE, damage: lastShot ? 3000 : PLAYER_DAMAGE, radius: lastShot ? 110 : PLAYER_BULLET_RADIUS, createsShell: true });
  };

  const updateStick = (id: "movement" | "attack", event: ReactPointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const diameter = joystickDiameter(layoutRef.current.joysticks[id], viewport.width, viewport.height);
    const max = diameter * 0.3;
    const rawX = event.clientX - (rect.left + rect.width / 2), rawY = event.clientY - (rect.top + rect.height / 2);
    const length = Math.hypot(rawX, rawY);
    const ratio = length > max ? max / length : 1;
    const knob = { x: rawX * ratio, y: rawY * ratio, active: true };
    setSticks(value => ({ ...value, [id]: knob }));
    if (id === "movement") movementRef.current = { x: knob.x / max, y: knob.y / max };
    else attackRef.current = { x: knob.x, y: knob.y };
  };

  const stickDown = (id: "movement" | "attack") => (event: ReactPointerEvent<HTMLDivElement>) => {
    pointerIds.current[id] = event.pointerId;
    event.currentTarget.setPointerCapture(event.pointerId);
    updateStick(id, event);
  };
  const stickMove = (id: "movement" | "attack") => (event: ReactPointerEvent<HTMLDivElement>) => {
    if (pointerIds.current[id] === event.pointerId) updateStick(id, event);
  };
  const stickUp = (id: "movement" | "attack") => (event: ReactPointerEvent<HTMLDivElement>) => {
    if (pointerIds.current[id] !== event.pointerId) return;
    if (id === "attack") firePlayer(attackRef.current);
    else movementRef.current = { x: 0, y: 0 };
    if (id === "attack") attackRef.current = { x: 0, y: 0 };
    pointerIds.current[id] = null;
    setSticks(value => ({ ...value, [id]: { x: 0, y: 0, active: false } }));
  };

  const restart = () => location.reload();

  useEffect(() => {
    const resize = () => setViewport({ width: innerWidth, height: innerHeight });
    const down = (event: KeyboardEvent) => keysRef.current.add(event.key.toLowerCase());
    const up = (event: KeyboardEvent) => keysRef.current.delete(event.key.toLowerCase());
    addEventListener("resize", resize); addEventListener("keydown", down); addEventListener("keyup", up);
    return () => { removeEventListener("resize", resize); removeEventListener("keydown", down); removeEventListener("keyup", up); };
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setCountdown(value => {
      const next = Math.max(0, value - 1); countdownRef.current = next; return next;
    }), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let frame = 0, previous = performance.now(), hudTimer = 0;
    const lowerHeight = TIDAL_WAVE.lowerRows * TILE_SIZE;

    const spawnEnemy = () => {
      const column = Math.floor(Math.random() * TIDAL_WAVE.mapColumns);
      enemiesRef.current.push({ id: idsRef.current++, x: columnCenter(column), y: TIDAL_WAVE_WORLD.lowerTop + TILE_SIZE / 2, health: TIDAL_WAVE.miniBrock.health, ammo: TIDAL_WAVE.miniBrock.ammoCapacity, reload: TIDAL_WAVE.miniBrock.reloadSeconds, state: "selecting", timer: TIDAL_WAVE.miniBrock.selectSeconds, target: null });
    };

    const spawnPierceShell = () => {
      const origin = playerRef.current;
      for (let attempt = 0; attempt < 24; attempt++) {
        const angle = Math.random() * Math.PI * 2;
        const distance = PIERCE_SHELL.minDistance + Math.random() * (PIERCE_SHELL.maxDistance - PIERCE_SHELL.minDistance);
        const x = origin.x + Math.cos(angle) * distance, y = origin.y + Math.sin(angle) * distance;
        if (x < 80 || x > TIDAL_WAVE_WORLD.width - 80 || y < TIDAL_WAVE_WORLD.lowerTop + 80 || y > TIDAL_WAVE_WORLD.height - 80) continue;
        if (shellsRef.current.some(shell => Math.hypot(shell.x - x, shell.y - y) < 120)) continue;
        shellsRef.current.push({ id: idsRef.current++, x, y, remainingSeconds: PIERCE_SHELL.lifetimeSeconds });
        return;
      }
    };

    const explode = (shot: Shot, x: number, y: number) => {
      blastsRef.current.push({ x, y, radius: TIDAL_WAVE.miniBrock.explosionRadius, life: 0.32 });
      const player = playerRef.current, vault = vaultRef.current;
      if (Math.hypot(player.x - x, player.y - y) <= TIDAL_WAVE.miniBrock.explosionRadius + PLAYER_RADIUS) player.health = Math.max(0, player.health - shot.damage);
      if (Math.hypot(vault.x - x, vault.y - y) <= TIDAL_WAVE.miniBrock.explosionRadius + VAULT_RADIUS) vault.health = Math.max(0, vault.health - shot.damage);
    };

    const tick = (now: number) => {
      const dt = Math.min(0.035, (now - previous) / 1000); previous = now;
      const dpr = devicePixelRatio || 1;
      if (canvas.width !== innerWidth * dpr || canvas.height !== innerHeight * dpr) { canvas.width = innerWidth * dpr; canvas.height = innerHeight * dpr; canvas.style.width = `${innerWidth}px`; canvas.style.height = `${innerHeight}px`; }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const scale = Math.min(innerWidth / (TIDAL_WAVE_WORLD.width + 40), innerHeight / (lowerHeight + TILE_SIZE + 40));
      const ox = (innerWidth - TIDAL_WAVE_WORLD.width * scale) / 2;
      const oy = 20 - TIDAL_WAVE_WORLD.wallTop * scale;
      transformRef.current = { scale, ox, oy };
      const sx = (x: number) => ox + x * scale, sy = (y: number) => oy + y * scale;

      if (!resultRef.current && countdownRef.current === 0) {
        elapsedRef.current += dt;
        if (elapsedRef.current >= TIDAL_WAVE.durationSeconds) finish("victory");
        spawnTimerRef.current -= dt;
        while (spawnTimerRef.current <= 0) { spawnTimerRef.current += TIDAL_WAVE.spawnIntervalSeconds; spawnEnemy(); }

        const keys = keysRef.current;
        const keyboard = { x: (keys.has("d") || keys.has("arrowright") ? 1 : 0) - (keys.has("a") || keys.has("arrowleft") ? 1 : 0), y: (keys.has("s") || keys.has("arrowdown") ? 1 : 0) - (keys.has("w") || keys.has("arrowup") ? 1 : 0) };
        const input = Math.hypot(keyboard.x, keyboard.y) ? keyboard : movementRef.current;
        const length = Math.hypot(input.x, input.y);
        const move = advanceMovement(movementElapsedRef.current, dt, length > 0.06);
        movementElapsedRef.current = move.elapsed;
        const nx = length ? input.x / length : 0, ny = length ? input.y / length : 0;
        const inputAmount = Math.min(1, length);
        const resolved = resolveSquareMovement({ x: playerRef.current.x, y: playerRef.current.y, dx: nx * PLAYER_SPEED * move.distance * inputAmount, dy: ny * PLAYER_SPEED * move.distance * inputAmount, halfSize: PLAYER_RADIUS, mapWidth: TIDAL_WAVE_WORLD.width, mapHeight: TIDAL_WAVE_WORLD.height, tileSize: TILE_SIZE, walls: WALLS });
        playerVelocityRef.current = { x: resolved.dx / Math.max(dt, 0.001), y: resolved.dy / Math.max(dt, 0.001) };
        playerRef.current.x = resolved.x; playerRef.current.y = resolved.y;

        const player = playerRef.current;
        player.attackCooldown = Math.max(0, player.attackCooldown - dt);
        // 复用角色试用中的皮尔斯规则：有剩余弹药时不装填，清空后整匣恢复。
        if (player.ammo > 0) player.reload = PLAYER_RELOAD;
        else { player.reload -= dt; if (player.reload <= 0) { player.ammo = PLAYER_AMMO; player.reload = PLAYER_RELOAD; } }

        for (let i = shellsRef.current.length - 1; i >= 0; i--) {
          const shell = shellsRef.current[i];
          shell.remainingSeconds -= dt;
          if (shell.remainingSeconds <= 0) { shellsRef.current.splice(i, 1); continue; }
          if (Math.hypot(player.x - shell.x, player.y - shell.y) <= PIERCE_SHELL.pickupRadius) {
            shellsRef.current.splice(i, 1);
            if (player.ammo < PLAYER_AMMO) { player.ammo += 1; player.reload = PLAYER_RELOAD; }
            const nearest = enemiesRef.current.reduce<MiniBrock | null>((best, enemy) => !best || Math.hypot(enemy.x - player.x, enemy.y - player.y) < Math.hypot(best.x - player.x, best.y - player.y) ? enemy : best, null);
            if (nearest) {
              const dx = nearest.x - player.x, dy = nearest.y - player.y, distance = Math.hypot(dx, dy) || 1;
              shotsRef.current.push({ id: idsRef.current++, owner: "player", x: player.x, y: player.y, vx: dx / distance * PLAYER_BULLET_SPEED, vy: dy / distance * PLAYER_BULLET_SPEED, traveled: 0, maxDistance: PLAYER_RANGE, damage: 1200, radius: PLAYER_BULLET_RADIUS });
            }
          }
        }

        for (const enemy of enemiesRef.current) {
          if (enemy.ammo < TIDAL_WAVE.miniBrock.ammoCapacity) { enemy.reload -= dt; if (enemy.reload <= 0) { enemy.ammo += 1; enemy.reload += TIDAL_WAVE.miniBrock.reloadSeconds; } } else enemy.reload = TIDAL_WAVE.miniBrock.reloadSeconds;
          enemy.timer -= dt;
          if (enemy.state === "selecting" && enemy.timer <= 0) {
            const pd = Math.hypot(player.x - enemy.x, player.y - enemy.y), vd = Math.hypot(vaultRef.current.x - enemy.x, vaultRef.current.y - enemy.y);
            enemy.target = pd <= vd ? "player" : "vault"; enemy.state = "moving";
          }
          const target = enemy.target === "player" ? player : vaultRef.current;
          const dx = target.x - enemy.x, dy = target.y - enemy.y, distance = Math.hypot(dx, dy);
          if (enemy.state === "moving") {
            if (distance <= TIDAL_WAVE.miniBrock.range * 0.94 && enemy.ammo > 0) { enemy.state = "aiming"; enemy.timer = TIDAL_WAVE.miniBrock.aimSeconds; }
            else if (distance > 1) { const step = TIDAL_WAVE.miniBrock.moveSpeed * dt; enemy.x += dx / distance * Math.min(step, distance); enemy.y += dy / distance * Math.min(step, distance); enemy.x = clamp(enemy.x, ENEMY_RADIUS, TIDAL_WAVE_WORLD.width - ENEMY_RADIUS); enemy.y = clamp(enemy.y, TIDAL_WAVE_WORLD.lowerTop + ENEMY_RADIUS, TIDAL_WAVE_WORLD.height - ENEMY_RADIUS); }
          } else if (enemy.state === "aiming" && enemy.timer <= 0) {
            if (enemy.ammo <= 0) { enemy.state = "moving"; continue; }
            const flight = distance / TIDAL_WAVE.miniBrock.projectileSpeed;
            const lead = enemy.target === "player" ? playerVelocityRef.current : { x: 0, y: 0 };
            const aimX = clamp(target.x + lead.x * flight, 0, TIDAL_WAVE_WORLD.width), aimY = clamp(target.y + lead.y * flight, TIDAL_WAVE_WORLD.lowerTop, TIDAL_WAVE_WORLD.height);
            const ax = aimX - enemy.x, ay = aimY - enemy.y, al = Math.hypot(ax, ay) || 1;
            shotsRef.current.push({ id: idsRef.current++, owner: "enemy", x: enemy.x, y: enemy.y, vx: ax / al * TIDAL_WAVE.miniBrock.projectileSpeed, vy: ay / al * TIDAL_WAVE.miniBrock.projectileSpeed, traveled: 0, maxDistance: TIDAL_WAVE.miniBrock.range, damage: TIDAL_WAVE.miniBrock.damage, radius: 60, target: enemy.target ?? "vault" });
            enemy.ammo -= 1; enemy.state = "selecting"; enemy.timer = TIDAL_WAVE.miniBrock.selectSeconds; enemy.target = null;
          }
        }

        for (let i = shotsRef.current.length - 1; i >= 0; i--) {
          const shot = shotsRef.current[i], from = { x: shot.x, y: shot.y };
          const speed = Math.hypot(shot.vx, shot.vy), step = Math.min(speed * dt, shot.maxDistance - shot.traveled);
          shot.x += shot.vx / speed * step; shot.y += shot.vy / speed * step; shot.traveled += step;
          const to = { x: shot.x, y: shot.y };
          if (shot.owner === "player") {
            const hit = enemiesRef.current.find(enemy => distanceToSegment(enemy, from, to) <= ENEMY_RADIUS + shot.radius);
            if (hit) { hit.health -= shot.damage; if (shot.createsShell) spawnPierceShell(); shotsRef.current.splice(i, 1); continue; }
          } else {
            const target = shot.target === "player" ? player : vaultRef.current;
            const radius = shot.target === "player" ? PLAYER_RADIUS : VAULT_RADIUS;
            if (distanceToSegment(target, from, to) <= radius + shot.radius) { explode(shot, shot.x, shot.y); shotsRef.current.splice(i, 1); continue; }
          }
          if (shot.traveled >= shot.maxDistance - 0.1) { if (shot.owner === "enemy") explode(shot, shot.x, shot.y); shotsRef.current.splice(i, 1); }
        }
        enemiesRef.current = enemiesRef.current.filter(enemy => enemy.health > 0);
        blastsRef.current.forEach(blast => blast.life -= dt); blastsRef.current = blastsRef.current.filter(blast => blast.life > 0);
        if (player.health <= 0 || vaultRef.current.health <= 0) finish("defeat");
        hudTimer -= dt; if (hudTimer <= 0) { hudTimer = 0.1; setHud({ time: Math.max(0, TIDAL_WAVE.durationSeconds - elapsedRef.current), vault: vaultRef.current.health, player: player.health, enemies: enemiesRef.current.length }); }
      }

      ctx.fillStyle = "#50783b"; ctx.fillRect(0, 0, innerWidth, innerHeight);
      ctx.fillStyle = "#b88567"; ctx.fillRect(sx(0), sy(TIDAL_WAVE_WORLD.lowerTop), TIDAL_WAVE_WORLD.width * scale, lowerHeight * scale);
      ctx.strokeStyle = "rgba(90,50,45,.22)"; ctx.lineWidth = 1;
      for (let column = 0; column <= TIDAL_WAVE.mapColumns; column++) { ctx.beginPath(); ctx.moveTo(sx(column * TILE_SIZE), sy(TIDAL_WAVE_WORLD.lowerTop)); ctx.lineTo(sx(column * TILE_SIZE), sy(TIDAL_WAVE_WORLD.height)); ctx.stroke(); }
      for (let row = TIDAL_WAVE.wallRow + 1; row <= TIDAL_WAVE.mapRows; row++) { ctx.beginPath(); ctx.moveTo(sx(0), sy(row * TILE_SIZE)); ctx.lineTo(sx(TIDAL_WAVE_WORLD.width), sy(row * TILE_SIZE)); ctx.stroke(); }
      for (let column = 0; column < TIDAL_WAVE.mapColumns; column++) { const x = sx(column * TILE_SIZE), y = sy(TIDAL_WAVE.wallRow * TILE_SIZE); ctx.fillStyle = "#9e4747"; ctx.fillRect(x, y, TILE_SIZE * scale, TILE_SIZE * scale); ctx.strokeStyle = "#5d2830"; ctx.lineWidth = 3; ctx.strokeRect(x + 1, y + 1, TILE_SIZE * scale - 2, TILE_SIZE * scale - 2); }

      const vault = vaultRef.current;
      ctx.save(); ctx.translate(sx(vault.x), sy(vault.y)); const vr = VAULT_RADIUS * scale; ctx.fillStyle = "#4f8ec9"; ctx.strokeStyle = "#d7efff"; ctx.lineWidth = 4; ctx.fillRect(-vr, -vr * .78, vr * 2, vr * 1.56); ctx.strokeRect(-vr, -vr * .78, vr * 2, vr * 1.56); ctx.fillStyle = "#ffd45a"; ctx.beginPath(); ctx.arc(0, 0, vr * .3, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      drawTrainingUnitModel(ctx, { centerX: sx(vault.x), centerY: sy(vault.y), radiusX: vr, radiusY: vr, statusWidth: TILE_SIZE * scale, health: vault.health, maxHealth: TIDAL_WAVE.vaultHealth, team: "ally", relation: "ally", equipment: { gadgetReady: false, starPower: false } });

      for (const enemy of enemiesRef.current) {
        const ex = sx(enemy.x), ey = sy(enemy.y), er = ENEMY_RADIUS * scale;
        drawTrainingUnitModel(ctx, { centerX: ex, centerY: ey, radiusX: er, radiusY: er, statusWidth: TILE_SIZE * scale, health: enemy.health, maxHealth: TIDAL_WAVE.miniBrock.health, team: "enemy", relation: "enemy", equipment: { gadgetReady: false, starPower: false }, afterGroundRing: () => { ctx.fillStyle = enemy.state === "aiming" ? "#ffcc40" : "#e75a38"; ctx.beginPath(); ctx.arc(ex, ey, er * .72, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = "#241b24"; ctx.font = `900 ${Math.max(9, er * .45)}px Nunito`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("B", ex, ey); } });
        if (enemy.state === "aiming") { ctx.strokeStyle = "rgba(255,220,90,.75)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(ex, ey, er * 1.15, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - enemy.timer / TIDAL_WAVE.miniBrock.aimSeconds)); ctx.stroke(); }
      }
      for (const shot of shotsRef.current) { const x = sx(shot.x), y = sy(shot.y), angle = Math.atan2(shot.vy, shot.vx), length = (shot.owner === "player" ? 210 : 150) * scale, width = shot.radius * 2 * scale; ctx.save(); ctx.translate(x, y); ctx.rotate(angle); ctx.fillStyle = shot.owner === "player" ? "#79e8ff" : "#ff7c37"; ctx.beginPath(); ctx.moveTo(length / 2, 0); ctx.lineTo(-length / 2, -width / 2); ctx.lineTo(-length / 2, width / 2); ctx.closePath(); ctx.fill(); ctx.restore(); }
      for (const blast of blastsRef.current) { ctx.fillStyle = `rgba(255,110,35,${blast.life / .32 * .42})`; ctx.beginPath(); ctx.arc(sx(blast.x), sy(blast.y), blast.radius * scale * (1.25 - blast.life), 0, Math.PI * 2); ctx.fill(); }

      const player = playerRef.current, px = sx(player.x), py = sy(player.y), pr = PLAYER_RADIUS * scale;
      drawTrainingUnitModel(ctx, { centerX: px, centerY: py, radiusX: pr, radiusY: pr, statusWidth: TILE_SIZE * scale, health: player.health, maxHealth: PLAYER_HEALTH, team: "player", relation: "self", ammo: { current: player.ammo, capacity: PLAYER_AMMO, reloadProgress: player.ammo === 0 ? 1 - player.reload / PLAYER_RELOAD : 0, continuousReload: player.ammo === 0 }, afterGroundRing: () => { ctx.fillStyle = "#55d9ff"; ctx.beginPath(); ctx.arc(px, py, pr * .74, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = "#132b37"; ctx.font = `900 ${Math.max(10, pr * .42)}px Nunito`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("P", px, py); } });
      for (const shell of shellsRef.current) drawPierceShell(ctx, shell, scale, scale, { projectX: (x) => sx(x), projectY: sy });
      const activeAim = attackRef.current;
      if (Math.hypot(activeAim.x, activeAim.y) > 1) {
        drawPierceAimCorridor(ctx, player, Math.atan2(activeAim.y, activeAim.x), PLAYER_RANGE, PLAYER_BULLET_RADIUS, { projectX: (x) => sx(x), projectY: sy });
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  const canvasFire = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (event.pointerType === "touch") return;
    const { scale, ox, oy } = transformRef.current;
    firePlayer({ x: (event.clientX - ox) / scale - playerRef.current.x, y: (event.clientY - oy) / scale - playerRef.current.y });
  };

  return <main className="tidal-wave-game">
    <canvas ref={canvasRef} onPointerDown={canvasFire} />
    <div className="tidal-wave-hud"><strong>排山倒海</strong><span>剩余 {hud.time.toFixed(1)}s</span><span>金库 {Math.ceil(hud.vault)}</span><span>敌人 {hud.enemies}</span></div>
    {countdown > 0 && <div className="training-countdown"><span>{countdown}</span></div>}
    <button className="tidal-wave-exit" onClick={() => navigate("/mini-games")}>退出</button>
    <AdjustableJoystick id="movement" layout={layoutRef.current.joysticks.movement} viewport={viewport} knob={sticks.movement} active={sticks.movement.active} onPointerDown={stickDown("movement")} onPointerMove={stickMove("movement")} onPointerUp={stickUp("movement")} />
    <AdjustableJoystick id="attack" layout={layoutRef.current.joysticks.attack} viewport={viewport} knob={sticks.attack} active={sticks.attack.active} onPointerDown={stickDown("attack")} onPointerMove={stickMove("attack")} onPointerUp={stickUp("attack")} />
    {result && <div className="tidal-wave-result-backdrop"><section className="tidal-wave-result"><div className={`mini-game-result-star ${result === "victory" ? "lit" : ""}`}>★</div><h1>{result === "victory" ? "守卫成功" : "金库失守"}</h1><p>{result === "victory" ? "坚持 30 秒，排山倒海已获得一颗星！" : "保护金库并坚持到倒计时结束。"}</p><button className="btn-primary" onClick={restart}>再试一次</button><button className="btn-secondary" onClick={() => navigate("/mini-games")}>返回关卡</button></section></div>}
  </main>;
}
