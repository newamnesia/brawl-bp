import { drawMovementIndicator, drawSuperRing } from "../features/training/groundRing";
import { drawTrainingUnitModel } from "../features/training/unitModel";
import { FIRE_INTERVAL_MIN, FIRE_INTERVAL_MAX, BEA_FIRE_INTERVAL_MIN, BEA_FIRE_INTERVAL_MAX, canMovementShoot, movementShotDelay, movementTimingScale } from "../features/training/firing";
import { BEA_SUPER, beaSuperPosition, chargeBeaSuper, updateBeaSuperAim } from "../features/training/beaSuper";
import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AIM_REACTION_TIERS, CHARACTER_MOVE_SPEED, MAX_PROJECTILE_INTERVAL_SECONDS, SPEED_TIERS, TILE_SIZE, tiles, type AimReactionTier } from "../features/training/config";
import { advanceMovement, resetsMovementOnTurn, resolveSquareMovement, STARTUP_SECONDS, type WallCell } from "../features/training/movement";
import { AdjustableJoystick } from "../components/AdjustableJoystick";
import { clampJoystick, hyperButtonDiameter, joystickDiameter, loadControlLayout } from "../features/training/controlLayout";
import { TRIAL_BRAWLERS, type TrialBrawlerId } from "../features/training/characterTrial";
import { GENE, advanceGenePull, destroyWallsAlongGenePull, geneSplitAngles, geneSuperAngles } from "../features/training/geneCombat";
import { drawPierceShell, PIERCE_SHELL, PIERCE_SUPER } from "../features/training/pierceCombat";
import { battleCanvasDpr } from "../features/training/performance";

type ControlMode = "joystick" | "keyboard";
type TrainingMode = "practice" | "survival" | "aiming";
type AimingRule = "infinite" | "challenge";
type TrainingSnapshot = {
  stickMag: number[];
  reactionMs: number[];
  turnIntervalMs: number[];
  aimLeadDeg: number[];
  emptyAmmoRatio: number;
  damagePerSecond: number;
  totalDamage: number;
  hitRate: number;
  score: number;
  aiScore: number;
};

// 地图常量
const MAP_WIDTH = tiles(21);  // 6300 单位，21 列
const MAP_HEIGHT = tiles(33); // 9900 单位，33 行
const HORIZONTAL_VIEW_UNITS = tiles(31.2); // 横向基准视野；宽屏会为纵向视野继续缩小
const CAMERA_GROUND_ANGLE_DEG = 67;
const GROUND_DEPTH_PROJECTION = Math.sin((CAMERA_GROUND_ANGLE_DEG * Math.PI) / 180);
const MIN_UPWARD_VIEW_UNITS = tiles(9.8);
const MIN_VERTICAL_VIEW_UNITS = MIN_UPWARD_VIEW_UNITS * 2;
const PERSPECTIVE_WIDTH_STRENGTH = 0.16; // 上沿约窄 8%，下沿约宽 8%
const PLAYER_RADIUS = tiles(0.5); // 玩家半径 150 单位
const PLAYER_COLLISION_HALF_SIZE = tiles(0.5); // 隐形 300 × 300 正方形移动碰撞体
const WALL_TILES: ReadonlySet<WallCell> = new Set(); // 地图暂时为空；以后在此接入障碍格
const MOVE_SPEED = CHARACTER_MOVE_SPEED;

// 敌人 + 子弹常量
// 第10行（1-indexed）正中间方格：行9（0-indexed）中心 y=9.5；列10（0-indexed，21列正中）中心 x=10.5
const ENEMY_X = tiles(10.5);
const ENEMY_Y = tiles(9.5);
const ENEMY_RADIUS = tiles(0.5);
const AIMING_MIN_DISTANCE = tiles(6);
const AIMING_MAX_DISTANCE = tiles(9);
const AIMING_FRONT_ANGLE = -Math.PI / 2;
const AIMING_SECTOR_HALF_ANGLE = Math.PI / 4;
const AIMING_AI_TURN_RATE = 10;
const AIMING_HIT_RATE_WINDOW = 10;
const AIMING_INNER_STAR_HIT_RATE = 0.45;
const AIMING_RETREAT_HEALTH_RATIO = 0.25;
const AIMING_RETREAT_EXIT_HEALTH_RATIO = 0.55;
const AIMING_RETREAT_DISTANCE = tiles(8.7);
const AIMING_RETREAT_REGEN_DISTANCE = tiles(8.5);
const AIMING_RETREAT_REGEN_DELAY_SECONDS = 1.5;
const AIMING_RETREAT_REGEN_PER_SECOND = 800;
// 走位训练射击节奏见 firing.ts，普通射击保留两发弹药。
const BEA_SUPER_UNIT = TILE_SIZE;
const BULLET_MAX_DIST = tiles(10); // 子弹最远行进 3000 单位
const PLAYER_MAX_HEALTH = 6000;
const PRACTICE_PLAYER_MAX_HEALTH = 100000;
const AIMING_INFINITE_MAX_HEALTH = 100000;
const TRIAL_TARGET_MAX_HEALTH = 100000;
const TRIAL_TARGET_X = MAP_WIDTH / 2;
const TRIAL_TARGET_Y = MAP_HEIGHT / 2;
const MAX_SUPER_SPEED_BONUS = 300;
const MAX_SUPER_DURATION_SECONDS = 4;
const MAX_SUPER_RADIUS = 1200;
const ATTACK_AUTO_AIM_DEADZONE_RATIO = 0.24;
const BEA_NORMAL_DAMAGE = 1600;
const BEA_ENHANCED_DAMAGE = 4400;
const MAX_PROJECTILE_DAMAGE = 640;
const BYRON_TICK_DAMAGE = 760;
const BYRON_TICK_COUNT = 3;
const BYRON_TICK_INTERVAL_SECONDS = 1;
const BYRON_ATTACK_CHARGE_PER_TICK = 0.113;
const BYRON_SUPER_DAMAGE_AND_HEAL = 3000;
const BYRON_SUPER_CHARGE = 0.24;
const BYRON_SUPER_RANGE = 2200;
const BYRON_SUPER_SPEED = 2000;
const BYRON_SUPER_RADIUS = 800;
const PIERCE_NORMAL_DAMAGE = 1900;
const PIERCE_LAST_DAMAGE = 3000;
const PIERCE_SHELL_SHOT_DAMAGE = 1200;
const PIERCE_NORMAL_SUPER_CHARGE = 0.15425;
const PIERCE_LAST_SUPER_CHARGE = 0.24375;
const PIERCE_SHELL_SUPER_CHARGE = 0.09;
const BROCK_ATTACK_DAMAGE = 2320;
const BROCK_EXPLOSION_RADIUS = 450;
const BROCK_FIRE_RADIUS = 300;
const BROCK_FIRE_DAMAGE = 688;
const BROCK_FIRE_DURATION_SECONDS = 2.9;
const BROCK_FIRE_FIRST_TICK_SECONDS = 0.9;
const MAX_SPREAD_DEGREES = [0, -1.5, 1.5, -3] as const;
const MAX_AIM_EXTENTS_DEGREES = [-3, 1.8] as const;
const BEA_PROJECTILE_LENGTH_TO_WIDTH = 4 / 3; // 300 × 400；大招按自身宽度同比缩放
const PIPER_MIN_DAMAGE = 720;
const PIPER_MAX_DAMAGE = 3600;
const STAR_RADIUS = 50;
const STAR_SPAWN_MIN_DISTANCE = tiles(6);
const STAR_SPAWN_MAX_DISTANCE = tiles(9);
const STAR_SPAWN_MIN_SECONDS = 2;
const STAR_SPAWN_MAX_SECONDS = 3;
const STAR_LIFETIME_SECONDS = 15;
const STAR_MAX_ACTIVE = 4;
const BULLET_STYLES = {
  beaNormal: { color: "#ffd43b", lengthScale: 1.8 },
  beaEnhanced: { color: "#39cfff", lengthScale: 1.8 },
  beaSuper: { color: "#ffd43b", lengthScale: 1.8 },
  high: { color: "#ffd43b", lengthScale: 1.8 },
  max: { color: "#ffd43b", lengthScale: 1.8 },
  byron: { color: "#c94cff", lengthScale: 1.8 },
  byronSuper: { color: "#9b5cff", lengthScale: 1.25 },
  pierceNormal: { color: "#70e7ff", lengthScale: 1.65 },
  pierceLast: { color: "#ffe14d", lengthScale: 1.75 },
  pierceShell: { color: "#83f1ff", lengthScale: 1.45 },
  pierceSuper: { color: "#ffd94d", lengthScale: 1.7 },
  brock: { color: "#ff9f2f", lengthScale: 2.15 },
  geneDirect: { color: "#c78afa", lengthScale: 1.25 },
  geneSplit: { color: "#dfb5ff", lengthScale: 1.15 },
  geneSuper: { color: "#fae99a", lengthScale: 1.8 },
} as const;
const TAUNT_EMOTE_TEXTURE = "/assets/emotes/taunt-thumb-down.png";
const TAUNT_DURATION_MS = 3000;
const TAUNT_SPIN_DURATION_MS = 900;
const TAUNT_SPIN_MIN_RPS = 3;
const TAUNT_SPIN_MAX_RPS = 4;
const TAUNT_DODGES_MIN = 2;
const TAUNT_DODGES_MAX = 5;
const TAUNT_DELAY_MIN_MS = 500;
const TAUNT_DELAY_MAX_MS = 2000;

function randomTauntDodgeGoal(): number {
  return TAUNT_DODGES_MIN + Math.floor(Math.random() * (TAUNT_DODGES_MAX - TAUNT_DODGES_MIN + 1));
}

function randomTauntDelayMs(): number {
  return TAUNT_DELAY_MIN_MS + Math.random() * (TAUNT_DELAY_MAX_MS - TAUNT_DELAY_MIN_MS);
}

function projectileDamage(texture: keyof typeof BULLET_STYLES, traveled: number): number {
  if (texture === "beaSuper") return BEA_SUPER.damage;
  if (texture === "beaNormal") return BEA_NORMAL_DAMAGE;
  if (texture === "beaEnhanced") return BEA_ENHANCED_DAMAGE;
  if (texture === "max") return MAX_PROJECTILE_DAMAGE;
  if (texture === "pierceNormal") return PIERCE_NORMAL_DAMAGE;
  if (texture === "pierceLast") return PIERCE_LAST_DAMAGE;
  if (texture === "pierceShell") return PIERCE_SHELL_SHOT_DAMAGE;
  if (texture === "pierceSuper") return PIERCE_SUPER.damage;
  if (texture === "brock") return BROCK_ATTACK_DAMAGE;
  if (texture === "geneDirect") return GENE.directDamage;
  if (texture === "geneSplit") return GENE.splitDamage;
  if (texture === "geneSuper") return 0;
  return PIPER_MIN_DAMAGE
    + (PIPER_MAX_DAMAGE - PIPER_MIN_DAMAGE) * Math.min(1, traveled / BULLET_MAX_DIST);
}

type Bullet = {
  x: number;          // 子弹中心 x
  y: number;          // 子弹中心 y
  vx: number;         // 单位向量 x * speed
  vy: number;         // 单位向量 y * speed
  traveled: number;   // 已行进距离
  id: number;         // 唯一 ID，用于视野首次进入检测
  radius: number;
  texture: keyof typeof BULLET_STYLES;
  owner: "enemy" | "player";
  maxDistance: number;
  damageMultiplier?: number;
  geneHyperHand?: boolean;
  spawnDelay?: number;
  superTrajectory?: { originX: number; originY: number; angle: number; omega: number; elapsed: number };
  lobbedImpact?: { x: number; y: number; radius: number; damage: number; heal: number };
  homing?: { targetId: string; steerStrength: number; ignoreSeconds: number; remainingSeconds: number };
};

type ByronPoison = { ticksRemaining: number; timeToNextTick: number };
type CombatUnitClass = "hero" | "vault" | "summon" | "humanoidSummon";
type ImpactBurst = { x: number; y: number; radius: number; life: number; maxLife: number; kind?: "byron" | "brock" };
type PierceShell = { id: number; x: number; y: number; remainingSeconds: number };
type PierceSuperCast = {
  id: number;
  x: number;
  y: number;
  phase: "warning" | "locked";
  remainingSeconds: number;
  lockedTargetIds: string[];
};
type BrockFire = { x: number; y: number; remainingSeconds: number; timeToNextTick: number };

type TrainingStar = {
  id: number;
  x: number;
  y: number;
  radius: number;
  spawnDistance: number;
  heal: number;
  points: number;
  remainingSeconds: number;
};

type PlayerShotObservation = { at: number; angle: number };

function starReward(distance: number) {
  const closeness = Math.max(0, Math.min(1, (STAR_SPAWN_MAX_DISTANCE - distance)
    / (STAR_SPAWN_MAX_DISTANCE - STAR_SPAWN_MIN_DISTANCE)));
  return { heal: Math.round(1000 + 1000 * closeness), points: 1 + closeness };
}

function rayDistanceToPoint(originX: number, originY: number, angle: number, pointX: number, pointY: number, maxDistance = BULLET_MAX_DIST) {
  const dx = pointX - originX;
  const dy = pointY - originY;
  const along = Math.max(0, Math.min(maxDistance, dx * Math.cos(angle) + dy * Math.sin(angle)));
  return Math.hypot(pointX - (originX + Math.cos(angle) * along), pointY - (originY + Math.sin(angle) * along));
}

type HitParticle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
};

// ============== Profiler 常量 ==============
// 输入死区：向量模长小于此值视为无操作（用于统计静止倾向和变向循环）
const INPUT_DEADZONE_MAG = 0.05;
// 有效转向界定容错（度）：在稳定期内方向偏离初始方向的 <180° 夹角 ≤ 该值才算稳住
const TURN_TOLERANCE_DEG = 30;
// 有效转向界定稳定窗口（ms）：方向必须在容错内维持此时间才记为"有效转向完成"
const TURN_STABLE_MS = 300;
// 大转向阈值：夹角超过此值视为"大幅度转向"，触发闪避后虚脱期检测
const LARGE_TURN_DEG = 90;
// 骗招时间窗口（ms）：两次有效转向间隔在此窗口内且方向相反 → 一次骗招
const FAKEOUT_WINDOW_MS = 250;
// 骗招反向夹角阈值（度）：最小夹角超过此值视为方向相反
const FAKEOUT_REVERSE_DEG = 170;
// 高频方向事件：不要求摇杆回中，专门捕捉持续推杆状态下的快速切向。
const RAPID_TURN_MIN_DEG = 35;
const RAPID_TURN_MAX_GAP_MS = 260;
const RAPID_EVENT_MIN_GAP_MS = 40;
const JITTER_REVERSE_MAX_GAP_MS = 160;
const RAPID_ROLLING_WINDOW_MS = 1500;
// 虚脱期停滞阈值：虚脱期输入模长 < 该值视为"停滞/回中"
const FATIGUE_STALL_MAG = 0.15;
// 虚脱期最大观测时长（ms）：超过此时间未恢复则停止观测
const FATIGUE_MAX_WATCH_MS = 1500;
// 反应速度：最大有效反应时间（ms），超过则认为玩家无反应/无视，不计入
const REACTION_MAX_MS = 2000;
// 反应速度：触发"首次有效转向"的角度阈值（度）
const REACTION_TURN_DEG = 30;
// EMA 平滑系数（0~1），越大跟踪越快
const EMA_ALPHA_SLOW = 0.04;   // 慢指标：静止倾向、细腻度
const EMA_ALPHA_MED = 0.08;    // 中指标：变向频率、虚脱期
const EMA_ALPHA_FAST = 0.15;   // 快指标：反应速度、骗招
// 骗招统计窗口（秒）：频率以"每秒次数"为单位，用EMA近似

// 两方向夹角（度），取 <180° 的那个
function angleDeltaDeg(a1: number, a2: number): number {
  let d = (a2 - a1) * 180 / Math.PI;
  d = ((d + 180) % 360 + 360) % 360 - 180;
  return Math.abs(d);
}

function signedAngleDeltaDeg(a1: number, a2: number): number {
  let d = (a2 - a1) * 180 / Math.PI;
  d = ((d + 180) % 360 + 360) % 360 - 180;
  return d;
}

type EffectiveTurn = {
  angle: number;        // 稳定期的平均方向（弧度）
  timestamp: number;    // 完成时刻（performance.now ms）
  magAvg: number;       // 稳定期内平均模长
};

type PendingBulletReaction = {
  bulletId: number;
  enterVisionAt: number; // ms
  expiresAt: number;     // 子弹实际生命周期结束时刻，过后不能再产生反应样本
  baselineAngle: number | null; // 进入视野时的操作方向；null 表示当时静止
};

type Prof = {
  // —— 统计累加值 ——
  totalFrames: number;
  deadFrames: number;            // 死区内帧数
  stillnessRatio: number;        // 指标 3：[0,1] EMA
  // 操作细腻度子指标
  avgStickMagnitude: number;     // 指标 1a：[0,1] EMA
  // 180 度转向计时
  in180Turn: boolean;
  turn180Start: number;          // ms
  turn180StartAngle: number;     // 弧度
  avg180TurnTimeMs: number;      // 指标 1b：ms，初始默认 600ms
  // 变向循环检测：出死区→回死区 完整循环
  wasOutOfDeadzone: boolean;
  lastCycleEndAt: number;        // ms
  avgCycleIntervalMs: number;    // 指标 2：ms，EMA
  // 反应速度：子弹进入视野 → 首次有效转向
  pendingReactions: PendingBulletReaction[]; // 等待玩家第一次转向的子弹
  reactionFirstTurnSeen: Set<number>; // 已记过反应的 bulletId
  avgReactionTimeMs: number;     // 指标 4：ms，初始默认 400ms
  reactionSampleCount: number;
  // 虚脱期：大转向后的停滞期
  watchingFatigue: boolean;
  fatigueStartAt: number;        // ms
  fatigueLargeTurnAngle: number; // 弧度
  avgAfterDodgeFatigueMs: number; // 指标 5：ms，初始默认 300ms
  // 有效转向检测：稳定窗口
  stableCandidateStart: number;  // ms
  stableCandidateAngle: number;  // 弧度
  stableCandidateSinSum: number; // 用圆周均值，避免 -180°/180° 跨界失真
  stableCandidateCosSum: number;
  stableCandidateFrames: number;
  effectiveTurns: EffectiveTurn[]; // 环形缓冲（最多存 20 个）
  fakeoutsPerSec: number;        // 指标 6：每秒次数 EMA
  lastFakeoutAt: number;         // ms
  // 当前行为状态：用于区分“持续单向直行”和真正的主动走位。
  lastInputAngle: number | null;
  stableDirectionSince: number;  // 当前方向连续保持在容错范围内的起点
  recentTurnAt: number;          // 最近一次明显转向时刻
  recentTurnFromAngle: number | null; // 转向前的长期方向
  recentTurnFromStableMs: number; // 转向前方向持续时长
  returnFeintScore: number;      // 短暂变向后回原方向的近期倾向 [0,1]
  deadzoneSince: number;         // 连续静止的起点
  rapidAnchorAngle: number | null;
  lastRapidTurnAt: number;
  lastRapidTurnSign: -1 | 0 | 1;
  rapidTurnTimes: number[];      // 滚动窗口内的高频切向事件
  jitterTimes: number[];         // 滚动窗口内的快速反向抖动事件
  // —— 暂停面板分布曲线原始样本 ——
  samplesStickMag: number[];     // 数据1：摇杆归一化距离（0~1），排除松杆&死区
  samplesReactionMs: number[];   // 数据2：反应时间（ms），人类合理区间
  samplesTurnIntervalMs: number[]; // 数据3：变向循环间隔（ms）
};

function createProfiler(now: number): Prof {
  return {
    totalFrames: 0,
    deadFrames: 0,
    stillnessRatio: 0,
    avgStickMagnitude: 0.5,
    in180Turn: false,
    turn180Start: 0,
    turn180StartAngle: 0,
    avg180TurnTimeMs: 600,
    wasOutOfDeadzone: false,
    lastCycleEndAt: now,
    avgCycleIntervalMs: 2000,
    pendingReactions: [],
    reactionFirstTurnSeen: new Set(),
    avgReactionTimeMs: 400,
    reactionSampleCount: 0,
    watchingFatigue: false,
    fatigueStartAt: 0,
    fatigueLargeTurnAngle: 0,
    avgAfterDodgeFatigueMs: 300,
    stableCandidateStart: 0,
    stableCandidateAngle: 0,
    stableCandidateSinSum: 0,
    stableCandidateCosSum: 0,
    stableCandidateFrames: 0,
    effectiveTurns: [],
    fakeoutsPerSec: 0,
    lastFakeoutAt: 0,
    lastInputAngle: null,
    stableDirectionSince: now,
    recentTurnAt: 0,
    recentTurnFromAngle: null,
    recentTurnFromStableMs: 0,
    returnFeintScore: 0,
    deadzoneSince: now,
    rapidAnchorAngle: null,
    lastRapidTurnAt: 0,
    lastRapidTurnSign: 0,
    rapidTurnTimes: [],
    jitterTimes: [],
    samplesStickMag: [],
    samplesReactionMs: [],
    samplesTurnIntervalMs: [],
  };
}

function ema(prev: number, sample: number, alpha: number): number {
  return prev * (1 - alpha) + sample * alpha;
}

// 每帧调用：采样玩家输入画像
// rawMag: 真实归一化摇杆/按键幅度 0~1（1 = 满边界）；-1 表示当前不是摇杆模式/无物理触控幅度
// isPhysicallyEngaged: 玩家手指是否真正按在摇杆上（键盘模式下 = 有按键）
function profileStep(
  p: Prof,
  now: number,
  inputX: number,
  inputY: number,
  _dtMs: number,
  rawMag: number,
  isPhysicallyEngaged: boolean,
): void {
  const mag = Math.hypot(inputX, inputY);
  const inDead = mag < INPUT_DEADZONE_MAG;
  const angle = inDead ? 0 : Math.atan2(inputY, inputX);

  // 骗方向行为采用约 15 秒记忆衰减，近期重复使用时会快速提高权重。
  p.returnFeintScore *= Math.exp(-_dtMs / 15000);

  // 记录最近的连续行为，而不只依赖整局平均值。
  // 方向变化未超过容错量时，视为同一个“单向直行”区间。
  if (inDead) {
    if (p.lastInputAngle !== null) p.deadzoneSince = now;
    p.lastInputAngle = null;
  } else if (p.lastInputAngle === null) {
    p.lastInputAngle = angle;
    p.stableDirectionSince = now;
  } else if (angleDeltaDeg(p.lastInputAngle, angle) > TURN_TOLERANCE_DEG) {
    const previousAngle = p.lastInputAngle;
    const previousStableMs = Math.max(0, now - p.stableDirectionSince);
    // A→B 后在 850ms 内回到 A，视为一次“射前骗向后回原路”的候选模式。
    if (
      p.recentTurnFromAngle !== null &&
      now - p.recentTurnAt <= 850 &&
      angleDeltaDeg(p.recentTurnFromAngle, angle) <= TURN_TOLERANCE_DEG
    ) {
      p.returnFeintScore = Math.min(1, p.returnFeintScore + 0.32);
    }
    p.recentTurnAt = now;
    p.recentTurnFromAngle = previousAngle;
    p.recentTurnFromStableMs = previousStableMs;
    p.lastInputAngle = angle;
    p.stableDirectionSince = now;
  }

  // ===== 高频抖动 / 高频变向 =====
  // 以最近一次已确认的快速切向为锚点；35° 以下视为手指噪声，不产生事件。
  if (inDead) {
    p.rapidAnchorAngle = null;
    p.lastRapidTurnSign = 0;
  } else if (p.rapidAnchorAngle === null) {
    p.rapidAnchorAngle = angle;
  } else {
    const rapidDelta = signedAngleDeltaDeg(p.rapidAnchorAngle, angle);
    const sinceLastRapid = now - p.lastRapidTurnAt;
    if (Math.abs(rapidDelta) >= RAPID_TURN_MIN_DEG && sinceLastRapid >= RAPID_EVENT_MIN_GAP_MS) {
      const sign: -1 | 1 = rapidDelta > 0 ? 1 : -1;
      if (p.lastRapidTurnAt > 0 && sinceLastRapid <= RAPID_TURN_MAX_GAP_MS) {
        p.rapidTurnTimes.push(now);
        if (p.lastRapidTurnSign !== 0 && sign !== p.lastRapidTurnSign && sinceLastRapid <= JITTER_REVERSE_MAX_GAP_MS) {
          p.jitterTimes.push(now);
        }
      }
      p.rapidAnchorAngle = angle;
      p.lastRapidTurnAt = now;
      p.lastRapidTurnSign = sign;
    }
  }
  const rollingCutoff = now - RAPID_ROLLING_WINDOW_MS;
  while (p.rapidTurnTimes.length > 0 && p.rapidTurnTimes[0] < rollingCutoff) p.rapidTurnTimes.shift();
  while (p.jitterTimes.length > 0 && p.jitterTimes[0] < rollingCutoff) p.jitterTimes.shift();

  p.totalFrames++;
  if (inDead) p.deadFrames++;
  // EMA 静止倾向（每帧0/1）
  p.stillnessRatio = ema(p.stillnessRatio, inDead ? 1 : 0, EMA_ALPHA_SLOW);
  // EMA 摇杆幅度（细腻度1）
  p.avgStickMagnitude = ema(p.avgStickMagnitude, rawMag >= 0 ? rawMag : mag, EMA_ALPHA_SLOW);

  // ===== 数据1 摇杆距离分布：排除"松开"和"极小圆（死区）" =====
  if (rawMag >= 0 && isPhysicallyEngaged && mag >= INPUT_DEADZONE_MAG) {
    const distanceSample = rawMag;
    // 限制最大样本数，避免暴增内存
    if (p.samplesStickMag.length < 40000) p.samplesStickMag.push(distanceSample);
  }

  // ===== 变向频率（循环：出死区 → 回死区） =====
  const wasOut = p.wasOutOfDeadzone;
  if (!inDead) p.wasOutOfDeadzone = true;
  if (wasOut && inDead) {
    // 一次循环结束
    const cycle = Math.max(50, now - p.lastCycleEndAt);
    p.avgCycleIntervalMs = ema(p.avgCycleIntervalMs, cycle, EMA_ALPHA_MED);
    // ===== 数据3 变向间隔分布 =====
    // 合理区间 100ms ~ 30s，防止噪声
    if (cycle >= 100 && cycle <= 30000 && p.samplesTurnIntervalMs.length < 20000) {
      p.samplesTurnIntervalMs.push(cycle);
    }
    p.lastCycleEndAt = now;
    p.wasOutOfDeadzone = false;
  }

  // ===== 有效转向检测（含容错窗口稳定判定） =====
  let turnEventAngle: number | undefined;
  if (!inDead) {
    if (p.stableCandidateFrames === 0) {
      p.stableCandidateStart = now;
      p.stableCandidateAngle = angle;
      p.stableCandidateSinSum = Math.sin(angle);
      p.stableCandidateCosSum = Math.cos(angle);
      p.stableCandidateFrames = 1;
    } else {
      const delta = angleDeltaDeg(p.stableCandidateAngle, angle);
      if (delta <= TURN_TOLERANCE_DEG) {
        // 仍在容错内 → 稳定中
        p.stableCandidateSinSum += Math.sin(angle);
        p.stableCandidateCosSum += Math.cos(angle);
        p.stableCandidateFrames++;
        const elapsed = now - p.stableCandidateStart;
        if (elapsed >= TURN_STABLE_MS) {
          // 完成一次有效转向
          const avgAng = Math.atan2(p.stableCandidateSinSum, p.stableCandidateCosSum);
          const previousEffective = p.effectiveTurns[p.effectiveTurns.length - 1];
          // “有效转向”必须是新稳定方向相对上一个已确认方向确实发生了变化。
          // 持续沿同一方向推动摇杆不会每隔一个稳定窗口重复计数。
          if (!previousEffective || angleDeltaDeg(previousEffective.angle, avgAng) > TURN_TOLERANCE_DEG) {
            const t: EffectiveTurn = { angle: avgAng, timestamp: now, magAvg: rawMag >= 0 ? rawMag : mag };
            p.effectiveTurns.push(t);
            if (p.effectiveTurns.length > 20) p.effectiveTurns.shift();
            turnEventAngle = avgAng;
          }

          // 重置候选（但记录当前方向为起点，避免每帧都产生事件）
          p.stableCandidateStart = now;
          p.stableCandidateAngle = avgAng;
          p.stableCandidateSinSum = Math.sin(avgAng);
          p.stableCandidateCosSum = Math.cos(avgAng);
          p.stableCandidateFrames = 1;

          // 180 度转向耗时统计（基于有效转向对）
          const turns = p.effectiveTurns;
          if (turns.length >= 2) {
            const prev = turns[turns.length - 2];
            const d180 = angleDeltaDeg(prev.angle, avgAng);
            if (d180 >= 180 - TURN_TOLERANCE_DEG) {
              // 允许容错，180 ± TOLERANCE 都算180转向
              const dur = now - prev.timestamp;
              if (dur > 40 && dur < 4000) {
                p.avg180TurnTimeMs = ema(p.avg180TurnTimeMs, dur, EMA_ALPHA_MED);
              }
            }
          }
        }
      } else {
        // 超出容错 → 重置候选，当前帧作为新起点
        p.stableCandidateStart = now;
        p.stableCandidateAngle = angle;
        p.stableCandidateSinSum = Math.sin(angle);
        p.stableCandidateCosSum = Math.cos(angle);
        p.stableCandidateFrames = 1;
      }
    }
  } else {
    // 死区，重置候选
    p.stableCandidateFrames = 0;
  }

  // ===== 虚脱期：大转向 → 观测停滞期 =====
  if (turnEventAngle !== undefined) {
    profileEffectiveTurnForReaction(p, now, turnEventAngle);
  }

  if (turnEventAngle !== undefined && p.effectiveTurns.length >= 2) {
    const prevAng = p.effectiveTurns[p.effectiveTurns.length - 2].angle;
    const deltaBig = angleDeltaDeg(prevAng, turnEventAngle);
    if (deltaBig >= LARGE_TURN_DEG) {
      p.watchingFatigue = true;
      p.fatigueStartAt = now;
      p.fatigueLargeTurnAngle = turnEventAngle;
    }
  }
  if (p.watchingFatigue) {
    const elapsed = now - p.fatigueStartAt;
    const stalled = mag < FATIGUE_STALL_MAG;
    if (!stalled) {
      // 恢复输入 → 记录虚脱期 = elapsed
      p.avgAfterDodgeFatigueMs = ema(p.avgAfterDodgeFatigueMs, elapsed, EMA_ALPHA_MED);
      p.watchingFatigue = false;
    } else if (elapsed >= FATIGUE_MAX_WATCH_MS) {
      // 超时不恢复 → 记录最大值
      p.avgAfterDodgeFatigueMs = ema(p.avgAfterDodgeFatigueMs, FATIGUE_MAX_WATCH_MS, EMA_ALPHA_MED);
      p.watchingFatigue = false;
    }
  }

  // ===== 骗招倾向：时间窗口内两次反向有效转向 =====
  if (turnEventAngle !== undefined) {
    const turns = p.effectiveTurns;
    for (let i = turns.length - 2; i >= 0; i--) {
      const t0 = turns[i];
      const dtT = now - t0.timestamp;
      if (dtT > FAKEOUT_WINDOW_MS) break;
      if (angleDeltaDeg(t0.angle, turnEventAngle) >= FAKEOUT_REVERSE_DEG) {
        // 一次骗招：窗口内反向
        const secSinceLast = Math.max(0.01, (now - (p.lastFakeoutAt || (now - 1000))) / 1000);
        const instantFreq = 1 / secSinceLast;
        p.fakeoutsPerSec = ema(p.fakeoutsPerSec, instantFreq, EMA_ALPHA_FAST);
        p.lastFakeoutAt = now;
        break;
      }
    }
  }
}

// 通知 Profiler：某颗子弹刚进入玩家视野（用于反应速度统计）
function profileBulletEnterVision(
  p: Prof,
  now: number,
  bulletId: number,
  remainingLifeMs: number,
  baselineAngle: number | null,
) {
  if (p.reactionFirstTurnSeen.has(bulletId)) return;
  p.pendingReactions.push({
    bulletId,
    enterVisionAt: now,
    expiresAt: now + Math.min(REACTION_MAX_MS, Math.max(0, remainingLifeMs)),
    baselineAngle,
  });
}

// 子弹命中或飞出射程后，相关反应观测立即结束，不能被之后的转向“补记”。
function profileBulletRemoved(p: Prof, bulletId: number) {
  const index = p.pendingReactions.findIndex((reaction) => reaction.bulletId === bulletId);
  if (index >= 0) p.pendingReactions.splice(index, 1);
  p.reactionFirstTurnSeen.add(bulletId);
}

// 只有“新方向已在容错范围内稳定 TURN_STABLE_MS”的事件才能触发反应样本。
// 相邻帧角度变化不再参与反应速度判定。
function profileEffectiveTurnForReaction(p: Prof, now: number, stableAngle: number) {
  // 先清理已经失效的子弹记录。
  for (let i = p.pendingReactions.length - 1; i >= 0; i--) {
    const pr = p.pendingReactions[i];
    if (now > pr.expiresAt || now - pr.enterVisionAt > REACTION_MAX_MS) {
      p.reactionFirstTurnSeen.add(pr.bulletId);
      p.pendingReactions.splice(i, 1);
    }
  }

  // 使用最早进入视野、且确实相对其基准方向发生有效变化的子弹。
  const index = p.pendingReactions.findIndex((pr) =>
    pr.baselineAngle === null || angleDeltaDeg(pr.baselineAngle, stableAngle) >= REACTION_TURN_DEG,
  );
  if (index < 0) return;

  const pr = p.pendingReactions[index];
  const rt = now - pr.enterVisionAt;
  // 稳定窗口本身已排除瞬间噪声；保留最小人类反应阈值作为数据清洗。
  if (rt >= 120) {
    // 记录样本
    p.reactionSampleCount++;
    if (p.reactionSampleCount === 1) p.avgReactionTimeMs = rt;
    else p.avgReactionTimeMs = ema(p.avgReactionTimeMs, rt, EMA_ALPHA_FAST);
    // ===== 数据2 反应时间分布：人类合理区间 =====
    // 一般 150ms ~ 2000ms 是合理区间（极限运动员 120ms 起步，慢到 2.5s）
    if (rt >= 120 && rt <= REACTION_MAX_MS && p.samplesReactionMs.length < 5000) {
      p.samplesReactionMs.push(rt);
    }
  }
  p.reactionFirstTurnSeen.add(pr.bulletId);
  p.pendingReactions.splice(index, 1);
}

// 画像输出：6 个归一化/绝对值指标（用于 HUD 与预测）
type ProfileMetrics = {
  finesse: number;            // 1) [0,1] 操作细腻度
  avgStickMagnitude: number;  // 子指标1a
  avg180TurnTimeMs: number;   // 子指标1b
  directionChangeFreq: number; // 2) [/秒] 变向频率
  stillnessRatio: number;     // 3) [0,1] 静止倾向
  reactionTimeMs: number;     // 4) [ms] 极限反应速度
  afterDodgeFatigueMs: number; // 5) [ms] 闪避后虚脱期
  fakeoutsPerSec: number;     // 6) [/秒] 骗招倾向
  rapidTurnsPerSec: number;   // 高频变向（无需回中）
  jitterReversalsPerSec: number; // 高频正反抖动
};
function getMetrics(p: Prof): ProfileMetrics {
  const magNorm = Math.min(1, Math.max(0, p.avgStickMagnitude));
  // 180° 时间：<250ms 满分，>1500ms 0分
  const turn180Score = 1 - Math.min(1, Math.max(0, (p.avg180TurnTimeMs - 250) / 1250));
  const finesse = magNorm * 0.5 + Math.max(0, turn180Score) * 0.5;
  const dcf = p.avgCycleIntervalMs <= 0 ? 0 : 1000 / p.avgCycleIntervalMs;
  return {
    finesse: Math.min(1, Math.max(0, finesse)),
    avgStickMagnitude: magNorm,
    avg180TurnTimeMs: p.avg180TurnTimeMs,
    directionChangeFreq: dcf,
    stillnessRatio: Math.min(1, Math.max(0, p.stillnessRatio)),
    reactionTimeMs: p.avgReactionTimeMs,
    afterDodgeFatigueMs: p.avgAfterDodgeFatigueMs,
    fakeoutsPerSec: p.fakeoutsPerSec,
    rapidTurnsPerSec: p.rapidTurnTimes.length / (RAPID_ROLLING_WINDOW_MS / 1000),
    jitterReversalsPerSec: p.jitterTimes.length / (RAPID_ROLLING_WINDOW_MS / 1000),
  };
}

// ============== 预判角度函数 ==============
type AimPrediction = {
  aimX: number;
  aimY: number;
  aimAngle: number;
  predictedX: number;
  predictedY: number;
  tFlight: number;
};

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function smooth01(v: number): number {
  const x = clamp01(v);
  return x * x * (3 - 2 * x);
}

// 返回从 from 转到 to 的最短有符号角（弧度，范围 [-PI, PI]）。
function signedAngleDelta(from: number, to: number): number {
  return Math.atan2(Math.sin(to - from), Math.cos(to - from));
}

// 可复现的伪随机数：同一发子弹始终得到相同采样，不受渲染帧率影响。
function seededUnit(seed: number): number {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

function attackProjectileAngles(baseAngle: number, isMaxMode: boolean, seed: number): number[] {
  if (!isMaxMode) return [baseAngle];
  const sampledPositiveOffset = MAX_SPREAD_DEGREES[2] + seededUnit(seed + 71) * 0.3;
  return [MAX_SPREAD_DEGREES[0], MAX_SPREAD_DEGREES[1], sampledPositiveOffset, MAX_SPREAD_DEGREES[3]]
    .map((degrees) => baseAngle + degrees * Math.PI / 180);
}

// 截断双峰分布：峰位于 ±60% 合理偏转上限，中心和两端都不是高权重区。
function sampleBimodalLead(maxAngle: number, seed: number, positiveProbability: number): number {
  if (maxAngle <= 0) return 0;
  const side = seededUnit(seed) < clamp01(positiveProbability) ? 1 : -1;
  // 三个均匀变量之和近似钟形噪声，标准差约为 0.17；无需引入不可复现的 Math.random。
  const bell = (seededUnit(seed + 11) + seededUnit(seed + 23) + seededUnit(seed + 37) - 1.5) / 1.5;
  const magnitude = Math.max(0.18, Math.min(0.9, 0.6 + bell * 0.18));
  return side * magnitude * maxAngle;
}

// 基础拦截角 + 玩家画像修正。函数保持确定性，避免随机抖动让训练结果不可复现。
function predictAimAngle(args: {
  playerX: number;
  playerY: number;
  velX: number;     // 当前 x 速度分量（单位/秒，含方向和大小）
  velY: number;     // 当前 y 速度分量
  speed: number;    // 当前总速度（通常 = 角色配置移速，或更小如果在死区）
  enemyX: number;
  enemyY: number;
  bulletSpeed: number;
  maxDistance: number;
  targetMoveSpeed: number;
  shotId: number;
  now: number;
  p: Prof;
  metrics: ProfileMetrics;
}): AimPrediction {
  const { playerX, playerY, velX, velY, speed, enemyX, enemyY, bulletSpeed, maxDistance, targetMoveSpeed, shotId, now, p, metrics } = args;
  const maxFlightS = maxDistance / bulletSpeed;
  const directAngle = Math.atan2(playerY - enemyY, playerX - enemyX);
  let t = Math.min(maxFlightS, Math.hypot(playerX - enemyX, playerY - enemyY) / bulletSpeed);

  // 最近持续行为优先于整局均值：超过稳定窗口后逐渐拟合为标准匀速直线运动。
  // 约 1.5 秒无有效转向时达到完全拟合，避免刚按下方向键就产生过大的瞬时提前量。
  const stableTravelS = speed < tiles(INPUT_DEADZONE_MAG) ? 0 : Math.max(0, now - p.stableDirectionSince) / 1000;
  const straightLineFit = smooth01((stableTravelS - TURN_STABLE_MS / 1000) / 1.2);

  // 玩家若刚从一个长期稳定方向突然切走，开火瞬间方向可能只是诱导。
  // 结合其历史“切走后快速返回”倾向，在当前方向与转向前方向之间交替封锁；
  // 连发的相邻 shotId 会自然覆盖两个方向，避免固定骗向获得 100% 躲避。
  const recentTurnAgeMs = now - p.recentTurnAt;
  const transientWindow = 520;
  const hadStableRun = smooth01((p.recentTurnFromStableMs - 350) / 900);
  const transientTurn = p.recentTurnFromAngle !== null
    ? smooth01((transientWindow - recentTurnAgeMs) / transientWindow) * hadStableRun
    : 0;
  const returnFeintRisk = transientTurn * (0.45 + 0.55 * clamp01(p.returnFeintScore));
  const priorDirectionWeight = returnFeintRisk * (shotId % 2 === 0 ? 0.9 : 0.35);
  const priorVelX = p.recentTurnFromAngle === null ? velX : Math.cos(p.recentTurnFromAngle) * speed;
  const priorVelY = p.recentTurnFromAngle === null ? velY : Math.sin(p.recentTurnFromAngle) * speed;
  const predictedVelX = velX * (1 - priorDirectionWeight) + priorVelX * priorDirectionWeight;
  const predictedVelY = velY * (1 - priorDirectionWeight) + priorVelY * priorDirectionWeight;

  // 1) 细腻度越高，当前方向越值得信任；180° 转向越慢，也越不容易在弹道时间内摆脱。
  const precisionTrust = 0.25 + 0.75 * clamp01(metrics.finesse);
  const turnLock = clamp01(metrics.avg180TurnTimeMs / Math.max(250, t * 1000));
  // 2) 变向越频繁，当前方向随时间失效越快。
  const historicalPersistence = Math.exp(-Math.max(0, metrics.directionChangeFreq) * t * 0.8);
  const directionPersistence = historicalPersistence + (1 - historicalPersistence) * straightLineFit;
  // 3) 站桩倾向直接降低有效位移，但不能把正在移动的玩家瞬间视作静止。
  const activityTrust = 0.25 + 0.75 * (1 - clamp01(metrics.stillnessRatio));
  // 4) 子弹出现后、玩家作出有效转向前，当前运动方向仍然有效。
  const reactionS = Math.min(t, Math.max(0, metrics.reactionTimeMs) / 1000);
  const preReactionShare = t > 0 ? reactionS / t : 0;
  // 5) 已进入大转向后摇时，只保留少量惯性位移。
  let fatigueScale = 1;
  if (p.watchingFatigue) {
    const watchedMs = Math.max(0, now - p.fatigueStartAt);
    const remainingMs = Math.max(0, Math.min(FATIGUE_MAX_WATCH_MS - watchedMs, metrics.afterDodgeFatigueMs - watchedMs));
    fatigueScale = 1 - 0.85 * clamp01(remainingMs / Math.max(1, t * 1000));
  }
  // 6) 骗招不是稳定的反向运动；在期望值模型里应降低方向置信度，而不是随机反转瞄准。
  const fakeoutTrust = 1 - 0.7 * clamp01(metrics.fakeoutsPerSec / 2);
  // 高频切向会让当前方向迅速过期；快速正反翻转（抖动）的惩罚更强。
  const rapidTurnLevel = clamp01(metrics.rapidTurnsPerSec / 5);
  const jitterLevel = clamp01(metrics.jitterReversalsPerSec / 3);
  const highFrequencyTrust = 1 - 0.8 * Math.max(rapidTurnLevel * 0.75, jitterLevel);

  const postReactionTrust = precisionTrust * turnLock * directionPersistence * activityTrust * fakeoutTrust * highFrequencyTrust;
  const profileMotionGain = clamp01((preReactionShare + (1 - preReactionShare) * postReactionTrust) * fatigueScale);
  // 持续单向移动是强于历史画像的实时证据；最终收敛到完整的匀速拦截。
  const motionGain = profileMotionGain + (1 - profileMotionGain) * straightLineFit;

  // 迭代求解玩家预计位置与子弹飞行时间。
  let predX = playerX;
  let predY = playerY;
  for (let iter = 0; iter < 3; iter++) {
    const movingScale = speed < tiles(INPUT_DEADZONE_MAG) ? 0 : motionGain;
    predX = playerX + predictedVelX * movingScale * t;
    predY = playerY + predictedVelY * movingScale * t;
    predX = Math.max(PLAYER_RADIUS, Math.min(MAP_WIDTH - PLAYER_RADIUS, predX));
    predY = Math.max(PLAYER_RADIUS, Math.min(MAP_HEIGHT - PLAYER_RADIUS, predY));
    t = Math.min(maxFlightS, Math.hypot(predX - enemyX, predY - enemyY) / bulletSpeed);
  }

  const rawLeadAngle = Math.atan2(predY - enemyY, predX - enemyX);
  // 玩家速度 / 子弹速度决定运动学上的合理偏转上限。
  // 对匀速拦截，最大提前角为 asin(vPlayer / vBullet)；保留少量上限余量但不采样端点。
  const kinematicMaxLead = Math.asin(Math.min(0.98, targetMoveSpeed / bulletSpeed));
  const profileLeadTrust = clamp01(precisionTrust * directionPersistence * fakeoutTrust * highFrequencyTrust);
  const leadTrust = profileLeadTrust + (1 - profileLeadTrust) * straightLineFit;
  const maxLeadRad = kinematicMaxLead * (0.45 + 0.55 * leadTrust);
  const observedLead = Math.max(
    -maxLeadRad,
    Math.min(maxLeadRad, signedAngleDelta(directAngle, rawLeadAngle)),
  );

  // 双峰左右权重由当前可观测移动方向决定，但任何一侧都保留至少 20% 概率。
  const observedSign = observedLead === 0 ? 0 : Math.sign(observedLead);
  const positiveLobeProbability = 0.5 + observedSign * 0.3 * leadTrust;
  const bimodalLead = sampleBimodalLead(maxLeadRad, shotId, positiveLobeProbability);
  // 稳定直行时优先精确拦截；方向越不稳定，双峰走位先验参与越多。
  const bimodalWeight = 0.65 * (1 - straightLineFit) * (1 - 0.45 * leadTrust);
  const leadDelta = observedLead * (1 - bimodalWeight) + bimodalLead * bimodalWeight;
  const aimAngle = directAngle + leadDelta;
  const aimDist = Math.min(maxDistance, Math.hypot(predX - enemyX, predY - enemyY));
  return {
    aimX: enemyX + Math.cos(aimAngle) * aimDist,
    aimY: enemyY + Math.sin(aimAngle) * aimDist,
    aimAngle,
    predictedX: predX,
    predictedY: predY,
    tFlight: t,
  };
}

export default function OfflineTrainingGame({ trialHeroId }: { trialHeroId?: TrialBrawlerId } = {}) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isTrialMode = Boolean(trialHeroId);
  const mode: ControlMode = isTrialMode ? "joystick" : (searchParams.get("mode") as ControlMode) || "keyboard";
  const requestedSpeedTier = trialHeroId === "piper" ? "high" : trialHeroId === "max" ? "max" : trialHeroId === "bea" ? "mid" : searchParams.get("speedTier");
  const speedTier = requestedSpeedTier === "high" || requestedSpeedTier === "max" ? requestedSpeedTier : "mid";
  const requestedTrainingMode = searchParams.get("trainingMode");
  const trainingMode: TrainingMode = requestedTrainingMode === "survival"
    ? "survival"
    : requestedTrainingMode === "aiming" ? "aiming" : "practice";
  const isSurvivalMode = trainingMode === "survival";
  const isAimingMode = trainingMode === "aiming";
  const isPlayerAttackMode = isAimingMode || isTrialMode;
  const playerMaxHealth = trialHeroId ? TRIAL_BRAWLERS[trialHeroId].health : trainingMode === "practice" ? PRACTICE_PLAYER_MAX_HEALTH : PLAYER_MAX_HEALTH;
  const aimingRule: AimingRule = searchParams.get("aimingRule") === "infinite" ? "infinite" : "challenge";
  const isAimingInfinite = isAimingMode && aimingRule === "infinite";
  const aimingTargetMaxHealth = isTrialMode ? TRIAL_TARGET_MAX_HEALTH : isAimingInfinite ? AIMING_INFINITE_MAX_HEALTH : PLAYER_MAX_HEALTH;
  const requestedReactionTier = searchParams.get("reactionTier");
  const reactionTier: AimReactionTier = requestedReactionTier === "legendary" || requestedReactionTier === "master"
    ? requestedReactionTier
    : "diamond";
  const aimingReactionConfig = AIM_REACTION_TIERS[reactionTier];
  const aimingReactionSeconds = aimingReactionConfig.seconds[speedTier];
  const aimingDodgesProjectiles = aimingReactionConfig.dodgesProjectiles;

  // 统一读取角色配置，旧链接中的格/秒 bulletSpeed 参数不再覆盖新单位数值。
  const trialConfig = trialHeroId ? TRIAL_BRAWLERS[trialHeroId] : null;
  const projectileConfig = trialConfig ? {
    value: trialConfig.projectileSpeed,
    bulletWidth: trialConfig.projectileWidth,
    range: trialConfig.range,
    magazineCapacity: trialConfig.ammoCapacity,
    moveSpeed: trialConfig.moveSpeed,
    reloadSeconds: trialConfig.reloadSeconds,
    attackIntervalSeconds: trialConfig.attackIntervalSeconds,
  } : SPEED_TIERS[speedTier];
  const bulletSpeed = projectileConfig.value;
  const bulletRadius = projectileConfig.bulletWidth / 2;
  const projectileRange = projectileConfig.range;
  const isBeaMode = trialHeroId ? trialHeroId === "bea" : speedTier === "mid";
  const isMaxMode = trialHeroId ? trialHeroId === "max" : speedTier === "max";
  const isByronMode = trialHeroId === "byron";
  const isPierceMode = trialHeroId === "pierce";
  const isBrockMode = trialHeroId === "brock";
  const isGeneMode = trialHeroId === "gene";
  const magazineCapacity = projectileConfig.magazineCapacity;
  const controlledMoveSpeed = projectileConfig.moveSpeed;
  const magazineReloadSeconds = projectileConfig.reloadSeconds;
  const playerAttackIntervalSeconds = projectileConfig.attackIntervalSeconds;
  const usesRapidFireCadence = isBeaMode || isMaxMode;
  const fireIntervalMin = usesRapidFireCadence ? BEA_FIRE_INTERVAL_MIN : FIRE_INTERVAL_MIN;
  const fireIntervalMax = usesRapidFireCadence ? BEA_FIRE_INTERVAL_MAX : FIRE_INTERVAL_MAX;
  // 反应时间不可能超过子弹从出生到飞满射程的时间。
  const reactionWindowMaxMs = Math.min(REACTION_MAX_MS, (projectileRange / bulletSpeed) * 1000);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const controlLayoutRef = useRef(loadControlLayout());
  const [controlViewport, setControlViewport] = useState({ width: window.innerWidth, height: window.innerHeight });
  const playerMovementElapsedRef = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // 玩家位置（圆心，使用 ref 避免重渲染）
  const playerRef = useRef({
    x: MAP_WIDTH / 2,
    y: MAP_HEIGHT / 2,
  });
  const playerVelocityRef = useRef({ x: 0, y: 0 });

  // 输入状态
  const inputRef = useRef({
    x: 0, // -1 ~ 1（单位向量 x 分量）
    y: 0, // -1 ~ 1
  });

  // 摇杆状态
  const joystickRef = useRef({
    active: false,
    touchId: null as number | null,
    baseX: 0,
    baseY: 0,
    knobX: 0,
    knobY: 0,
    maxRadius: 60,
    rawMagnitude: 0, // 玩家真实按出的归一化距离（0~1），1=推到摇杆边界
  });
  const aimJoystickRef = useRef({
    active: false,
    touchId: null as number | null,
    baseX: 0,
    baseY: 0,
    knobX: 0,
    knobY: 0,
    maxRadius: 60,
    rawMagnitude: 0,
    exceededDeadzone: false,
  });
  const superJoystickRef = useRef({
    active: false,
    touchId: null as number | null,
    baseX: 0,
    baseY: 0,
    knobX: 0,
    knobY: 0,
    maxRadius: 60,
    rawMagnitude: 0,
    exceededDeadzone: false,
  });
  const aimingTargetRef = useRef({
    x: ENEMY_X,
    y: ENEMY_Y - tiles(9),
    angle: -Math.PI / 2,
    direction: 1 as 1 | -1,
    switchTimer: 0.7,
  });
  const aimingTargetAiRef = useRef({
    heading: 0,
    desiredHeading: 0,
    changeTimer: 0.7,
    dodgeLockTimer: 0,
    reactedBulletIds: new Set<number>(),
  });
  const aimingTargetHealthRef = useRef(PLAYER_MAX_HEALTH);
  const aimingTargetSecondsSinceDamageRef = useRef(0);
  const visibleWorldBoundsRef = useRef({ left: 0, right: MAP_WIDTH, top: 0, bottom: MAP_HEIGHT });

  // 仅在离散输入事件中刷新摇杆 UI；逐帧游戏状态全部保存在 ref 中。
  const [, forceUpdate] = useState(0);
  const [hitCount, setHitCount] = useState(0);
  const [totalDamage, setTotalDamage] = useState(0);
  const [score, setScore] = useState(0);
  const [aiScore, setAiScore] = useState(0);
  const [, setHealth] = useState(playerMaxHealth);
  const [, setSurvivalTime] = useState(0);
  const [roundResult, setRoundResult] = useState<"victory" | "defeat" | "ended" | null>(null);
  const [restartNonce, setRestartNonce] = useState(0);
  const [, setMagazineAmmo] = useState(magazineCapacity);
  const [, setMagazineReloadProgress] = useState(0);

  // 暂停状态
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(false);
  const [countdown, setCountdown] = useState<number | null>(3);
  const countdownActiveRef = useRef(true);

  useEffect(() => {
    const updateControlViewport = () => setControlViewport({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener("resize", updateControlViewport);
    return () => window.removeEventListener("resize", updateControlViewport);
  }, []);
  const [isFullscreen, setIsFullscreen] = useState(false);
  // 暂停时的三大样本快照（传给面板绘图）
  const [pauseSnapshot, setPauseSnapshot] = useState<TrainingSnapshot | null>(null);

  // 同步 paused state → ref（避免游戏循环读脏值）
  useEffect(() => {
    pausedRef.current = paused;
    if (paused && profilerRef.current) {
      // 浅拷贝引用快照（样本数组只追加，不突变，所以直接引用即可）
      const prof = profilerRef.current;
      setPauseSnapshot({
        stickMag: prof.samplesStickMag,
        reactionMs: prof.samplesReactionMs,
        turnIntervalMs: prof.samplesTurnIntervalMs,
        aimLeadDeg: aimingLeadAnglesRef.current,
        emptyAmmoRatio: aimingElapsedSecondsRef.current > 0
          ? aimingEmptyAmmoSecondsRef.current / aimingElapsedSecondsRef.current
          : 0,
        damagePerSecond: aimingElapsedSecondsRef.current > 0
          ? totalDamageRef.current / aimingElapsedSecondsRef.current
          : 0,
        totalDamage: totalDamageRef.current,
        hitRate: firedShotCountRef.current > 0
          ? hitCountRef.current / firedShotCountRef.current
          : 0,
        score: scoreRef.current,
        aiScore: aiScoreRef.current,
      });
    } else if (!paused) {
      setPauseSnapshot(null);
    }
  }, [paused]);

  const togglePause = () => {
    setPaused((v) => !v);
  };

  const endTraining = () => {
    pausedRef.current = true;
    setPaused(false);
    setRoundResult("ended");
  };

  useEffect(() => {
    const fullscreenDocument = document as Document & { webkitFullscreenElement?: Element | null };
    const syncFullscreenState = () => {
      setIsFullscreen(Boolean(document.fullscreenElement ?? fullscreenDocument.webkitFullscreenElement));
    };
    document.addEventListener("fullscreenchange", syncFullscreenState);
    document.addEventListener("webkitfullscreenchange", syncFullscreenState);
    syncFullscreenState();
    return () => {
      document.removeEventListener("fullscreenchange", syncFullscreenState);
      document.removeEventListener("webkitfullscreenchange", syncFullscreenState);
    };
  }, []);

  const toggleFullscreen = async () => {
    const target = containerRef.current as (HTMLDivElement & { webkitRequestFullscreen?: () => Promise<void> | void }) | null;
    const fullscreenDocument = document as Document & {
      webkitFullscreenElement?: Element | null;
      webkitExitFullscreen?: () => Promise<void> | void;
    };
    if (!target) return;
    try {
      if (document.fullscreenElement || fullscreenDocument.webkitFullscreenElement) {
        if (document.exitFullscreen) await document.exitFullscreen();
        else await fullscreenDocument.webkitExitFullscreen?.();
      } else if (target.requestFullscreen) {
        await target.requestFullscreen();
      } else {
        await target.webkitRequestFullscreen?.();
      }
    } catch {
      // 浏览器可能因系统策略拒绝全屏；保持当前界面，不中断训练。
    }
  };

  // 子弹 + 开火计时（用 ref 避免重渲染）
  const bulletsRef = useRef<Bullet[]>([]);
  const playerSuperChargeRef = useRef(0);
  const geneHyperChargeRef = useRef(0);
  const geneHyperRemainingRef = useRef(0);
  const playerAttackCooldownRef = useRef(0);
  const maxSuperRemainingRef = useRef(0);
  const pierceSuperCastsRef = useRef<PierceSuperCast[]>([]);
  const fireTimerRef = useRef(fireIntervalMin + Math.random() * (fireIntervalMax - fireIntervalMin));
  const magazineAmmoRef = useRef(magazineCapacity);
  const magazineReloadTimerRef = useRef(magazineReloadSeconds);
  const lastMagazineUiUpdateRef = useRef(0);
  const burstFollowupRef = useRef(false);
  const timingScaleRef = useRef(1);
  const beaEnhancedShotsRef = useRef(0);
  const hitCountRef = useRef(0); // 与 state 同步，供循环内读取/累加
  const firedShotCountRef = useRef(0);
  const totalDamageRef = useRef(0);
  const scoreRef = useRef(0);
  const aiScoreRef = useRef(0);
  const playerShotHistoryRef = useRef<PlayerShotObservation[]>([]);
  const bulletIdRef = useRef(1);
  const healthRef = useRef(playerMaxHealth);
  const secondsSinceDamageRef = useRef(0);
  const survivalTimeRef = useRef(0);
  const lastSurvivalUiUpdateRef = useRef(0);
  const playerDirectionRef = useRef(-Math.PI / 2);
  const playerMoveDirectionRef = useRef(-Math.PI / 2);
  const enemyDirectionRef = useRef(Math.PI / 2);
  const playerIsMovingRef = useRef(false);
  const enemyIsMovingRef = useRef(false);

  // Profiler（每局新建）
  const profilerRef = useRef<Prof | null>(null);
  const aimingLeadAnglesRef = useRef<number[]>([]);
  const aimingElapsedSecondsRef = useRef(0);
  const aimingEmptyAmmoSecondsRef = useRef(0);
  // 上一帧玩家方向（度），用于每帧方向变化阈值 → 反应速度触发

  // 键盘监听
  useEffect(() => {
    if (mode !== "keyboard") return;

    const keys = new Set<string>();

    const updateInput = () => {
      let x = 0;
      let y = 0;
      if (keys.has("w") || keys.has("arrowup")) y -= 1;
      if (keys.has("s") || keys.has("arrowdown")) y += 1;
      if (keys.has("a") || keys.has("arrowleft")) x -= 1;
      if (keys.has("d") || keys.has("arrowright")) x += 1;

      // 输入只提供方向；起步速度由主循环的归一化加速函数决定。
      if (x !== 0 || y !== 0) {
        const len = Math.sqrt(x * x + y * y);
        inputRef.current.x = x / len; // cos(angle)
        inputRef.current.y = y / len; // sin(angle)
      } else {
        inputRef.current.x = 0;
        inputRef.current.y = 0;
        playerMovementElapsedRef.current = 0;
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(k)) {
        e.preventDefault();
        keys.add(k);
        updateInput();
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      keys.delete(k);
      updateInput();
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [mode]);

  // 游戏主循环
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext("2d")!;
    let animationId: number;
    let lastTime = performance.now();
    const nowStart = lastTime;
    let countdownRemainingMs = 3000;
    let countdownShown = 3;
    countdownActiveRef.current = true;
    setCountdown(3);
    let superCharge = 0;
    const superAim = { elapsed: 0, stable: 0, angle: 0 };
    let superAiming = false;
    let superRingPhase = 0;
    // 倒计时期间视为人机已完成摇杆起步，正式开局第一帧即保持正常移速。
    let aiMovementElapsed = isAimingMode ? STARTUP_SECONDS : 0;
    let aiDodgeTurn: { start: number; delta: number; elapsed: number; duration: number } | null = null;
    let dodgesSinceTaunt = 0;
    let tauntDodgeGoal = randomTauntDodgeGoal();
    let tauntDelayRemainingMs: number | null = null;
    let tauntVisibleRemainingMs = 0;
    let tauntSpinRemainingMs = 0;
    let tauntSpinHeading = 0;
    let tauntSpinAngularSpeed = 0;
    const stars: TrainingStar[] = [];
    let nextStarId = 1;
    let starSpawnTimer = isTrialMode ? Number.POSITIVE_INFINITY : STAR_SPAWN_MIN_SECONDS + Math.random() * (STAR_SPAWN_MAX_SECONDS - STAR_SPAWN_MIN_SECONDS);
    let aiTargetStarId: number | null = null;
    let aiFeintCooldown = 0;
    let aiFeint: { starId: number; phase: "approach" | "break"; remaining: number; startedAt: number; breakHeading: number } | null = null;
    let aiRetreating = false;
    let aiRetreatOrbitDirection: 1 | -1 = Math.random() < 0.5 ? -1 : 1;
    let aiRetreatDirectionChangeTimer = 0.45 + Math.random() * 0.55;
    const aiRecentShotOutcomes: boolean[] = [];
    const recordAiShotOutcome = (hit: boolean) => {
      aiRecentShotOutcomes.push(hit);
      if (aiRecentShotOutcomes.length > AIMING_HIT_RATE_WINDOW) aiRecentShotOutcomes.shift();
    };
    playerMovementElapsedRef.current = 0;

    // 只在新方向指令出现时判断，不能用每帧平滑转向的小角度代替单次转向。
    const setAiDirection = (heading: number, preserveMomentum = false) => {
      const ai = aimingTargetAiRef.current;
      if (!preserveMomentum && resetsMovementOnTurn(ai.desiredHeading, heading)) aiMovementElapsed = 0;
      ai.desiredHeading = heading;
    };
    let superSlowRemainingMs = 0;

    // 初始化 Profiler
    profilerRef.current = createProfiler(nowStart);
    playerRef.current = isTrialMode
      ? { x: TRIAL_TARGET_X, y: TRIAL_TARGET_Y + tiles(7) }
      : isAimingMode
      ? { x: ENEMY_X, y: ENEMY_Y }
      : { x: MAP_WIDTH / 2, y: MAP_HEIGHT / 2 };
    aimingTargetRef.current = {
      x: isTrialMode ? TRIAL_TARGET_X : ENEMY_X,
      y: isTrialMode ? TRIAL_TARGET_Y : ENEMY_Y - tiles(9),
      angle: -Math.PI / 2,
      direction: 1,
      switchTimer: 0.7,
    };
    aimingTargetAiRef.current = {
      heading: 0,
      desiredHeading: 0,
      changeTimer: 0.7,
      dodgeLockTimer: 0,
      reactedBulletIds: new Set<number>(),
    };
    aimingTargetHealthRef.current = aimingTargetMaxHealth;
    aimingTargetSecondsSinceDamageRef.current = 0;
    playerVelocityRef.current = { x: 0, y: 0 };
    magazineAmmoRef.current = magazineCapacity;
    magazineReloadTimerRef.current = magazineReloadSeconds;
    timingScaleRef.current = 1;
    burstFollowupRef.current = false;
    beaEnhancedShotsRef.current = 0;
    playerSuperChargeRef.current = 0;
    geneHyperChargeRef.current = 0;
    geneHyperRemainingRef.current = 0;
    playerAttackCooldownRef.current = 0;
    maxSuperRemainingRef.current = 0;
    pierceSuperCastsRef.current = [];
    fireTimerRef.current = fireIntervalMin + Math.random() * (fireIntervalMax - fireIntervalMin);
    setMagazineAmmo(magazineCapacity);
    setMagazineReloadProgress(0);
    healthRef.current = playerMaxHealth;
    secondsSinceDamageRef.current = 0;
    survivalTimeRef.current = 0;
    hitCountRef.current = 0;
    firedShotCountRef.current = 0;
    totalDamageRef.current = 0;
    scoreRef.current = 0;
    aiScoreRef.current = 0;
    playerShotHistoryRef.current = [];
    setHealth(playerMaxHealth);
    setSurvivalTime(0);
    setHitCount(0);
    setTotalDamage(0);
    setScore(0);
    setAiScore(0);
    setRoundResult(null);
    aimingLeadAnglesRef.current = [];
    aimingElapsedSecondsRef.current = 0;
    aimingEmptyAmmoSecondsRef.current = 0;
    playerDirectionRef.current = -Math.PI / 2;
    playerMoveDirectionRef.current = -Math.PI / 2;
    enemyDirectionRef.current = Math.PI / 2;
    playerIsMovingRef.current = false;
    enemyIsMovingRef.current = false;

    const tauntEmoteImage = new Image();
    tauntEmoteImage.src = TAUNT_EMOTE_TEXTURE;
    const hitParticles: HitParticle[] = [];
    const hitParticlePool: HitParticle[] = [];
    let combatUiDirty = false;
    let combatUiRefreshRemaining = 0;
    const byronPoisons: ByronPoison[] = [];
    const impactBursts: ImpactBurst[] = [];
    const pierceShells: PierceShell[] = [];
    const brockFires: BrockFire[] = [];
    const wallTiles = new Set(WALL_TILES);
    let genePullActive = false;
    let genePullSpeed: number = GENE.pullSpeed;
    let genePullBreaksWalls = false;
    let nextPierceShellId = 1;
    const trainingTargetUnitClass: CombatUnitClass = "hero";

    // 统一枚举场上可被皮尔斯大招锁定的敌人；列表不设数量上限。
    const getPierceEnemyTargets = () => [{
      id: "trainingTarget",
      x: aimingTargetRef.current.x,
      y: aimingTargetRef.current.y,
      radius: ENEMY_RADIUS,
      alive: aimingTargetHealthRef.current > 0,
      unitClass: trainingTargetUnitClass,
    }];

    const spawnPierceShell = () => {
      const origin = playerRef.current;
      for (let attempt = 0; attempt < 24; attempt++) {
        const angle = Math.random() * Math.PI * 2;
        const distance = PIERCE_SHELL.minDistance
          + Math.random() * (PIERCE_SHELL.maxDistance - PIERCE_SHELL.minDistance);
        const x = origin.x + Math.cos(angle) * distance;
        const y = origin.y + Math.sin(angle) * distance;
        if (x < 80 || x > MAP_WIDTH - 80 || y < 80 || y > MAP_HEIGHT - 80) continue;
        if (pierceShells.some((shell) => Math.hypot(shell.x - x, shell.y - y) < 120)) continue;
        pierceShells.push({ id: nextPierceShellId++, x, y, remainingSeconds: PIERCE_SHELL.lifetimeSeconds });
        return;
      }
    };

    const firePierceShellShot = () => {
      const player = playerRef.current;
      const target = aimingTargetRef.current;
      const bounds = visibleWorldBoundsRef.current;
      const targetVisible = aimingTargetHealthRef.current > 0
        && target.x >= bounds.left && target.x <= bounds.right
        && target.y >= bounds.top && target.y <= bounds.bottom;
      // 蛋壳射击只要求目标处于玩家视野，不检查墙体；没有目标则沿当前移动方向射出。
      const angle = targetVisible
        ? Math.atan2(target.y - player.y, target.x - player.x)
        : playerMoveDirectionRef.current;
      bulletsRef.current.push({
        x: player.x, y: player.y,
        vx: Math.cos(angle) * 4000, vy: Math.sin(angle) * 4000,
        traveled: 0, id: bulletIdRef.current++, radius: 100,
        texture: "pierceShell", owner: "player", maxDistance: TRIAL_BRAWLERS.pierce.range,
      });
      firedShotCountRef.current += 1;
    };

    const spawnBrockImpact = (x: number, y: number) => {
      impactBursts.push({
        x, y, radius: BROCK_EXPLOSION_RADIUS,
        life: 0.3, maxLife: 0.3, kind: "brock",
      });
      brockFires.push({
        x, y,
        remainingSeconds: BROCK_FIRE_DURATION_SECONDS,
        timeToNextTick: BROCK_FIRE_FIRST_TICK_SECONDS,
      });
    };

    const spawnStar = () => {
      if (stars.length >= STAR_MAX_ACTIVE) return;
      const shooter = isAimingMode ? playerRef.current : { x: ENEMY_X, y: ENEMY_Y };
      for (let attempt = 0; attempt < 30; attempt++) {
        const radiusSquared = STAR_SPAWN_MIN_DISTANCE ** 2
          + Math.random() * (STAR_SPAWN_MAX_DISTANCE ** 2 - STAR_SPAWN_MIN_DISTANCE ** 2);
        const distance = Math.sqrt(radiusSquared);
        const angle = isAimingMode
          ? AIMING_FRONT_ANGLE + (Math.random() * 2 - 1) * AIMING_SECTOR_HALF_ANGLE
          : Math.random() * Math.PI * 2;
        const x = shooter.x + Math.cos(angle) * distance;
        const y = shooter.y + Math.sin(angle) * distance;
        if (x < STAR_RADIUS || x > MAP_WIDTH - STAR_RADIUS || y < STAR_RADIUS || y > MAP_HEIGHT - STAR_RADIUS) continue;
        const collector = isAimingMode ? aimingTargetRef.current : playerRef.current;
        if (Math.hypot(x - collector.x, y - collector.y) < PLAYER_RADIUS + STAR_RADIUS + tiles(0.35)) continue;
        if (stars.some((star) => Math.hypot(x - star.x, y - star.y) < STAR_RADIUS * 2 + tiles(0.35))) continue;
        const reward = starReward(distance);
        stars.push({ id: nextStarId++, x, y, radius: STAR_RADIUS, spawnDistance: distance, ...reward, remainingSeconds: STAR_LIFETIME_SECONDS });
        return;
      }
    };

    const getInterceptPressure = (star: TrainingStar, now: number) => {
      const shots = playerShotHistoryRef.current;
      const recent = shots.slice(-6);
      const interceptRate = recent.length > 0
        ? recent.filter((shot) => rayDistanceToPoint(playerRef.current.x, playerRef.current.y, shot.angle, star.x, star.y) <= tiles(0.75)).length / recent.length
        : 0;
      const intervals = recent.slice(1).map((shot, index) => shot.at - recent[index].at);
      const averageInterval = intervals.length > 0 ? intervals.reduce((sum, value) => sum + value, 0) / intervals.length : 1200;
      const sinceLastShot = recent.length > 0 ? now - recent[recent.length - 1].at : 3000;
      const cadencePressure = Math.exp(-sinceLastShot / Math.max(250, averageInterval));
      const ammoPressure = Math.max(0, Math.min(1, magazineAmmoRef.current / magazineCapacity));
      return Math.max(0, Math.min(1, ammoPressure * 0.45 + cadencePressure * 0.30 + interceptRate * 0.25));
    };

    const recordDodgedProjectile = () => {
      dodgesSinceTaunt += 1;
      if (dodgesSinceTaunt >= tauntDodgeGoal && tauntDelayRemainingMs === null && tauntVisibleRemainingMs <= 0) {
        tauntDelayRemainingMs = randomTauntDelayMs();
      }
    };

    const spawnHitParticles = (x: number, y: number) => {
      // 控制命中瞬间的对象分配峰值；短粒子复用比在 32 位浏览器中频繁 GC 更稳定。
      const count = 4 + Math.floor(Math.random() * 2);
      for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.45;
        const speed = tiles(2.2 + Math.random() * 2.4);
        const maxLife = 0.28 + Math.random() * 0.22;
        const particle = hitParticlePool.pop() ?? { x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 0, size: 0 };
        particle.x = x; particle.y = y;
        particle.vx = Math.cos(angle) * speed; particle.vy = Math.sin(angle) * speed;
        particle.life = maxLife; particle.maxLife = maxLife;
        particle.size = tiles(0.055 + Math.random() * 0.07);
        hitParticles.push(particle);
      }
    };

    const refreshCombatUi = () => {
      setHitCount(hitCountRef.current);
      setTotalDamage(Math.round(totalDamageRef.current));
      combatUiDirty = false;
      combatUiRefreshRemaining = 0.125;
    };

    const damageTrialTarget = (damage: number, chargeGain = 0) => {
      if (isTrialMode && playerSuperChargeRef.current < 1) {
        playerSuperChargeRef.current = Math.min(1, playerSuperChargeRef.current + chargeGain);
      }
      totalDamageRef.current += damage;
      combatUiDirty = true;
      aimingTargetHealthRef.current = Math.max(0, aimingTargetHealthRef.current - damage);
      aimingTargetSecondsSinceDamageRef.current = 0;
      if ((isTrialMode || (isAimingMode && !isAimingInfinite)) && aimingTargetHealthRef.current <= 0) {
        refreshCombatUi();
        pausedRef.current = true;
        setRoundResult("victory");
      }
    };

    // 缩放因子
    let scale = 1;
    let scaleY = GROUND_DEPTH_PROJECTION;
    let offsetX = 0;

    const resize = () => {
      const dpr = battleCanvasDpr(window.devicePixelRatio, window.matchMedia("(pointer: coarse)").matches);
      const cssWidth = container.clientWidth;
      const cssHeight = container.clientHeight;

      canvas.width = cssWidth * dpr;
      canvas.height = cssHeight * dpr;
      canvas.style.width = cssWidth + "px";
      canvas.style.height = cssHeight + "px";

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // 常规比例下横向展示 31.2 格。宽屏时进一步缩小，保证相机跟随玩家时
      // 玩家到屏幕上沿至少有 9.8 格视野（透视压缩后的屏幕高度也计入约束）。
      const horizontalScale = cssWidth / HORIZONTAL_VIEW_UNITS;
      const verticalScale = cssHeight / (MIN_VERTICAL_VIEW_UNITS * GROUND_DEPTH_PROJECTION);
      scale = Math.min(horizontalScale, verticalScale);
      scaleY = scale * GROUND_DEPTH_PROJECTION;
      offsetX = (cssWidth - MAP_WIDTH * scale) / 2;

    };

    resize();
    window.addEventListener("resize", resize);

    // 子弹 id → 是否已进入过视野（用于 bullet-enter-vision 事件）
    const bulletEnteredVision = new Set<number>();

    const gameLoop = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.05); // 限制最大步长
      lastTime = now;
      const dtMs = dt * 1000;

      if (!pausedRef.current && countdownRemainingMs > 0) {
        countdownRemainingMs = Math.max(0, countdownRemainingMs - dtMs);
        const nextShown = Math.ceil(countdownRemainingMs / 1000);
        if (nextShown !== countdownShown) {
          countdownShown = nextShown;
          setCountdown(nextShown > 0 ? nextShown : null);
        }
        if (countdownRemainingMs === 0) {
          countdownActiveRef.current = false;
          // 所有分析计时从正式开局时刻起算，不把倒计时算入反应或稳定移动时间。
          profilerRef.current = createProfiler(now);
        }
      }

      if (!pausedRef.current && !countdownActiveRef.current) {
        // —— 逻辑更新（暂停时跳过） ——
        starSpawnTimer -= dt;
        playerAttackCooldownRef.current = Math.max(0, playerAttackCooldownRef.current - dt);

        for (let i = byronPoisons.length - 1; i >= 0; i--) {
          const poison = byronPoisons[i];
          poison.timeToNextTick -= dt;
          while (poison.ticksRemaining > 0 && poison.timeToNextTick <= 0) {
            damageTrialTarget(BYRON_TICK_DAMAGE, BYRON_ATTACK_CHARGE_PER_TICK);
            spawnHitParticles(aimingTargetRef.current.x, aimingTargetRef.current.y);
            poison.ticksRemaining -= 1;
            poison.timeToNextTick += BYRON_TICK_INTERVAL_SECONDS;
          }
          if (poison.ticksRemaining <= 0) byronPoisons.splice(i, 1);
        }

        for (let i = impactBursts.length - 1; i >= 0; i--) {
          impactBursts[i].life -= dt;
          if (impactBursts[i].life <= 0) impactBursts.splice(i, 1);
        }
        aiFeintCooldown = Math.max(0, aiFeintCooldown - dt);
        for (let index = stars.length - 1; index >= 0; index--) {
          stars[index].remainingSeconds -= dt;
          if (stars[index].remainingSeconds <= 0) {
            const expiredStar = stars[index];
            if (aiTargetStarId === expiredStar.id) aiTargetStarId = null;
            if (aiFeint?.starId === expiredStar.id) aiFeint = null;
            if (isAimingMode) {
              aimingTargetHealthRef.current = Math.max(
                0,
                aimingTargetHealthRef.current - expiredStar.heal,
              );
              aimingTargetSecondsSinceDamageRef.current = 0;
              spawnHitParticles(aimingTargetRef.current.x, aimingTargetRef.current.y);
              if (!isAimingInfinite && aimingTargetHealthRef.current <= 0) {
                pausedRef.current = true;
                setRoundResult("victory");
              }
            }
            stars.splice(index, 1);
          }
        }
        if (starSpawnTimer <= 0) {
          spawnStar();
          starSpawnTimer = STAR_SPAWN_MIN_SECONDS + Math.random() * (STAR_SPAWN_MAX_SECONDS - STAR_SPAWN_MIN_SECONDS);
        }

        if (tauntVisibleRemainingMs > 0) {
          tauntVisibleRemainingMs = Math.max(0, tauntVisibleRemainingMs - dtMs);
          tauntSpinRemainingMs = Math.max(0, tauntSpinRemainingMs - dtMs);
        } else if (tauntDelayRemainingMs !== null) {
          tauntDelayRemainingMs -= dtMs;
          if (tauntDelayRemainingMs <= 0) {
            tauntDelayRemainingMs = null;
            tauntVisibleRemainingMs = TAUNT_DURATION_MS;
            tauntSpinRemainingMs = TAUNT_SPIN_DURATION_MS;
            const target = aimingTargetRef.current;
            const player = playerRef.current;
            const spinSign = Math.random() < 0.5 ? -1 : 1;
            const radialAngle = Math.atan2(target.y - player.y, target.x - player.x);
            tauntSpinHeading = radialAngle + spinSign * Math.PI / 2;
            tauntSpinAngularSpeed = spinSign * Math.PI * 2
              * (TAUNT_SPIN_MIN_RPS + Math.random() * (TAUNT_SPIN_MAX_RPS - TAUNT_SPIN_MIN_RPS));
            dodgesSinceTaunt = 0;
            tauntDodgeGoal = randomTauntDodgeGoal();
          }
        }

        // 更新玩家位置
        const input = inputRef.current;
        const player = playerRef.current;
        const prof = profilerRef.current!;

        const velocity = playerVelocityRef.current;
        maxSuperRemainingRef.current = Math.max(0, maxSuperRemainingRef.current - dt);
        if (geneHyperRemainingRef.current > 0) {
          geneHyperRemainingRef.current = Math.max(0, geneHyperRemainingRef.current - dt);
          if (geneHyperRemainingRef.current === 0) forceUpdate((value) => value + 1);
        }
        if (isBeaMode && !isAimingMode) {
          superSlowRemainingMs = Math.max(0, superSlowRemainingMs - dtMs);
        }
        const baseMovementSpeed = isBeaMode && !isAimingMode && !isTrialMode && superSlowRemainingMs > 0
          ? controlledMoveSpeed * BEA_SUPER.slowMultiplier
          : controlledMoveSpeed;
        const movementSpeed = baseMovementSpeed * (isGeneMode && geneHyperRemainingRef.current > 0 ? GENE.hyperSpeedMultiplier : 1)
          + (isTrialMode && isMaxMode && maxSuperRemainingRef.current > 0 ? MAX_SUPER_SPEED_BONUS : 0);
        const movement = advanceMovement(playerMovementElapsedRef.current, dt,
          !isAimingMode && Math.hypot(input.x, input.y) > 0);
        playerMovementElapsedRef.current = movement.elapsed;
        const resolvedPlayerMove = resolveSquareMovement({
          x: player.x,
          y: player.y,
          dx: input.x * movementSpeed * movement.distance,
          dy: input.y * movementSpeed * movement.distance,
          halfSize: PLAYER_COLLISION_HALF_SIZE,
          mapWidth: MAP_WIDTH,
          mapHeight: MAP_HEIGHT,
          tileSize: TILE_SIZE,
          walls: wallTiles,
        });
        player.x = resolvedPlayerMove.x;
        player.y = resolvedPlayerMove.y;
        velocity.x = resolvedPlayerMove.blockedX ? 0 : input.x * movementSpeed * movement.speed;
        velocity.y = resolvedPlayerMove.blockedY ? 0 : input.y * movementSpeed * movement.speed;
        let velX = velocity.x;
        let velY = velocity.y;
        let curSpeed = Math.hypot(velX, velY);
        playerIsMovingRef.current = Math.hypot(resolvedPlayerMove.dx, resolvedPlayerMove.dy) > 1e-7;
        if (!isAimingMode && playerIsMovingRef.current) {
          playerDirectionRef.current = Math.atan2(resolvedPlayerMove.dy, resolvedPlayerMove.dx);
          playerMoveDirectionRef.current = playerDirectionRef.current;
        }

        if (isAimingMode) {
          const target = aimingTargetRef.current;
          const ai = aimingTargetAiRef.current;
          ai.changeTimer -= dt;
          ai.dodgeLockTimer = Math.max(0, ai.dodgeLockTimer - dt);

          const radialX = target.x - player.x;
          const radialY = target.y - player.y;
          const radialDistance = Math.hypot(radialX, radialY) || AIMING_MIN_DISTANCE;
          const healthRatio = aimingTargetHealthRef.current / aimingTargetMaxHealth;
          if (isAimingInfinite) {
            aiRetreating = false;
          } else if (!aiRetreating && healthRatio <= AIMING_RETREAT_HEALTH_RATIO) {
            aiRetreating = true;
            aiTargetStarId = null;
            aiFeint = null;
            const radialAngle = Math.atan2(radialY, radialX);
            const positiveTangentMotion = Math.cos(ai.heading) * -Math.sin(radialAngle)
              + Math.sin(ai.heading) * Math.cos(radialAngle);
            if (Math.abs(positiveTangentMotion) > 0.1) {
              aiRetreatOrbitDirection = positiveTangentMotion > 0 ? 1 : -1;
            }
            aiRetreatDirectionChangeTimer = 0.45 + Math.random() * 0.55;
          } else if (aiRetreating && healthRatio >= AIMING_RETREAT_EXIT_HEALTH_RATIO) {
            aiRetreating = false;
          }
          if (
            aiRetreating
            && !isAimingInfinite
            && radialDistance >= AIMING_RETREAT_REGEN_DISTANCE
            && aimingTargetSecondsSinceDamageRef.current >= AIMING_RETREAT_REGEN_DELAY_SECONDS
          ) {
            aimingTargetHealthRef.current = Math.min(
              aimingTargetMaxHealth,
              aimingTargetHealthRef.current + AIMING_RETREAT_REGEN_PER_SECOND * dt,
            );
          }
          const recentHitRate = aiRecentShotOutcomes.length > 0
            ? aiRecentShotOutcomes.filter(Boolean).length / aiRecentShotOutcomes.length
            : 0;
          const innerStarPressure = aiRecentShotOutcomes.length >= 5
            ? Math.max(0, Math.min(1, (recentHitRate - AIMING_INNER_STAR_HIT_RATE) / 0.35))
            : 0;
          const minimumSafeStarDistance = tiles(7.1 + innerStarPressure * 0.7);
          const missingHealthRatio = isAimingInfinite
            ? 0
            : Math.max(0, (aimingTargetMaxHealth - aimingTargetHealthRef.current) / aimingTargetMaxHealth);
          const rankedStars = stars.filter((star) => {
            if (innerStarPressure <= 0) return true;
            return Math.hypot(star.x - player.x, star.y - player.y) >= minimumSafeStarDistance;
          }).map((star) => {
            const travelSeconds = Math.hypot(star.x - target.x, star.y - target.y) / MOVE_SPEED;
            const projectileDanger = bulletsRef.current.filter((bullet) => bullet.owner === "player" && (bullet.spawnDelay ?? 0) <= 0)
              .filter((bullet) => rayDistanceToPoint(bullet.x, bullet.y, Math.atan2(bullet.vy, bullet.vx), star.x, star.y, bullet.maxDistance) <= tiles(0.75)).length;
            const starDistanceFromShooter = Math.hypot(star.x - player.x, star.y - player.y);
            const boundaryPenalty = Math.max(0, (starDistanceFromShooter - tiles(9)) / tiles(1)) ** 2;
            return {
              star,
              utility: star.points * 2 + missingHealthRatio * star.heal / 1000
                - travelSeconds * 1.1 - projectileDanger * 2 - boundaryPenalty * 4,
            };
          }).sort((a, b) => b.utility - a.utility);
          if (aiRetreating) {
            aiTargetStarId = null;
          } else if (!rankedStars.some(({ star }) => star.id === aiTargetStarId)) {
            aiTargetStarId = rankedStars[0]?.star.id ?? null;
          }
          const selectedStar = aiRetreating ? null : stars.find((star) => star.id === aiTargetStarId) ?? null;

          if (aiFeint) {
            aiFeint.remaining -= dt;
            const feintStar = stars.find((star) => star.id === aiFeint?.starId);
            if (!feintStar) {
              aiFeint = null;
            } else if (aiFeint.phase === "approach") {
              const reactedShot = [...playerShotHistoryRef.current].reverse().find((shot) =>
                shot.at >= aiFeint!.startedAt
                && now - shot.at >= aimingReactionSeconds * 1000
                && rayDistanceToPoint(player.x, player.y, shot.angle, feintStar.x, feintStar.y) <= tiles(0.85));
              if (reactedShot) {
                const inwardHeading = Math.atan2(player.y - target.y, player.x - target.x);
                const left = reactedShot.angle + Math.PI / 2;
                const right = reactedShot.angle - Math.PI / 2;
                aiFeint.phase = "break";
                aiFeint.remaining = 0.35 + Math.random() * 0.2;
                aiFeint.breakHeading = Math.cos(left - inwardHeading) >= Math.cos(right - inwardHeading) ? left : right;
              } else if (aiFeint.remaining <= 0) {
                aiFeint = null;
                aiFeintCooldown = 0.8;
              }
            } else if (aiFeint.remaining <= 0) {
              aiFeint = null;
              aiFeintCooldown = 0.8;
            }
          }

          // 子弹飞行达到当前段位反应时间后，开始把模拟摇杆拖向弹道的垂直方向。
          const tauntSpinning = tauntSpinRemainingMs > 0;
          const threat = !tauntSpinning && aimingDodgesProjectiles
            ? bulletsRef.current
              .filter((bullet) => bullet.owner === "player" && (bullet.spawnDelay ?? 0) <= 0 && !ai.reactedBulletIds.has(bullet.id))
              .filter((bullet) => bullet.traveled / Math.max(0.01, Math.hypot(bullet.vx, bullet.vy)) >= aimingReactionSeconds)
              .sort((a, b) => Math.hypot(a.x - target.x, a.y - target.y) - Math.hypot(b.x - target.x, b.y - target.y))[0]
            : undefined;
          if (tauntSpinning) {
            // 嘲讽转圈直接连续改变移动方向；不经过普通转向加速，保持满速形成极小圆轨迹。
            aiDodgeTurn = null;
          } else if (threat) {
            const bulletHeading = Math.atan2(threat.vy, threat.vx);
            const projectileSpeed = Math.max(0.01, Math.hypot(threat.vx, threat.vy));
            const perpendicularX = -threat.vy / projectileSpeed;
            const perpendicularY = threat.vx / projectileSpeed;
            const signedLineOffset = (target.x - threat.x) * perpendicularX
              + (target.y - threat.y) * perpendicularY;
            const currentPerpendicularMotion = Math.cos(ai.heading) * perpendicularX
              + Math.sin(ai.heading) * perpendicularY;
            // 严格沿弹道法线躲避；优先远离弹道，正中弹道时延续当前垂直分量以避免无谓掉速。
            let evadeSign = Math.abs(signedLineOffset) > 0.001
              ? Math.sign(signedLineOffset)
              : Math.abs(currentPerpendicularMotion) > 0.05 ? Math.sign(currentPerpendicularMotion) : (Math.random() < 0.5 ? -1 : 1);
            if (radialDistance >= tiles(8.4)) {
              const inwardHeading = Math.atan2(player.y - target.y, player.x - target.x);
              const left = bulletHeading + Math.PI / 2;
              const right = bulletHeading - Math.PI / 2;
              evadeSign = Math.cos(left - inwardHeading) >= Math.cos(right - inwardHeading) ? 1 : -1;
            }
            const evadeHeading = bulletHeading + evadeSign * Math.PI / 2;
            setAiDirection(evadeHeading);
            const turnDelta = Math.atan2(Math.sin(evadeHeading - ai.heading), Math.cos(evadeHeading - ai.heading));
            const joystickRadius = aimJoystickRef.current.maxRadius * aimingReactionConfig.joystickRadiusRatio;
            const dragDistance = 2 * joystickRadius * Math.sin(Math.abs(turnDelta) / 2);
            aiDodgeTurn = {
              start: ai.heading,
              delta: turnDelta,
              elapsed: 0,
              duration: dragDistance / aimingReactionConfig.joystickDragSpeed
                + aimingReactionConfig.joystickDragExtraSeconds,
            };
            ai.dodgeLockTimer = Math.hypot(threat.x - target.x, threat.y - target.y) / projectileSpeed
              + (ENEMY_RADIUS + threat.radius) / projectileSpeed;
            ai.reactedBulletIds.add(threat.id);
          } else if (aiRetreating) {
            const radialAngle = Math.atan2(radialY, radialX);
            const sectorOffset = Math.atan2(
              Math.sin(radialAngle - AIMING_FRONT_ANGLE),
              Math.cos(radialAngle - AIMING_FRONT_ANGLE),
            );
            const orbitTurnMargin = 0.14;
            aiRetreatDirectionChangeTimer -= dt;
            if (sectorOffset >= AIMING_SECTOR_HALF_ANGLE - orbitTurnMargin) {
              aiRetreatOrbitDirection = -1;
              aiRetreatDirectionChangeTimer = 0.45 + Math.random() * 0.55;
            } else if (sectorOffset <= -AIMING_SECTOR_HALF_ANGLE + orbitTurnMargin) {
              aiRetreatOrbitDirection = 1;
              aiRetreatDirectionChangeTimer = 0.45 + Math.random() * 0.55;
            } else if (aiRetreatDirectionChangeTimer <= 0) {
              aiRetreatOrbitDirection = aiRetreatOrbitDirection === 1 ? -1 : 1;
              aiRetreatDirectionChangeTimer = 0.45 + Math.random() * 0.55;
            }
            const outwardX = radialX / radialDistance;
            const outwardY = radialY / radialDistance;
            const tangentX = -outwardY * aiRetreatOrbitDirection;
            const tangentY = outwardX * aiRetreatOrbitDirection;
            // 内圈撤退时以“向外 + 横移”合成斜线；接近外圈后逐渐转为沿边移动。
            const radialCorrection = Math.max(
              -0.85,
              Math.min(0.85, (AIMING_RETREAT_DISTANCE - radialDistance) / tiles(0.7)),
            );
            setAiDirection(Math.atan2(
              tangentY * 0.72 + outwardY * radialCorrection,
              tangentX * 0.72 + outwardX * radialCorrection,
            ), true);
          } else if (radialDistance >= tiles(8.85)) {
            setAiDirection(Math.atan2(player.y - target.y, player.x - target.x));
          } else if (aiFeint?.phase === "break") {
            setAiDirection(aiFeint.breakHeading);
          } else if (selectedStar && ai.changeTimer <= 0 && ai.dodgeLockTimer <= 0) {
            const maxFeintProbability = reactionTier === "master" ? 0.60 : reactionTier === "legendary" ? 0.35 : 0;
            if (!aiFeint && aiFeintCooldown <= 0 && Math.random() < maxFeintProbability * getInterceptPressure(selectedStar, now)) {
              aiFeint = { starId: selectedStar.id, phase: "approach", remaining: 0.35 + Math.random() * 0.25, startedAt: now, breakHeading: ai.heading };
            }
            setAiDirection(Math.atan2(selectedStar.y - target.y, selectedStar.x - target.x));
            ai.changeTimer = 0.10;
          } else if (!selectedStar && ai.changeTimer <= 0 && ai.dodgeLockTimer <= 0) {
            const centerX = player.x + Math.cos(AIMING_FRONT_ANGLE) * tiles(8);
            const centerY = player.y + Math.sin(AIMING_FRONT_ANGLE) * tiles(8);
            setAiDirection(Math.atan2(centerY - target.y, centerX - target.x) + (Math.random() - 0.5) * 1.2);
            ai.changeTimer = 0.3 + Math.random() * 0.7;
          }

          if (tauntSpinning) {
            tauntSpinHeading += tauntSpinAngularSpeed * dt;
            ai.heading = tauntSpinHeading;
            ai.desiredHeading = tauntSpinHeading;
            aiMovementElapsed = STARTUP_SECONDS;
          } else if (aiDodgeTurn) {
            aiDodgeTurn.elapsed = Math.min(aiDodgeTurn.duration, aiDodgeTurn.elapsed + dt);
            const progress = aiDodgeTurn.duration > 0 ? aiDodgeTurn.elapsed / aiDodgeTurn.duration : 1;
            ai.heading = aiDodgeTurn.start + aiDodgeTurn.delta * progress;
            if (progress >= 1) aiDodgeTurn = null;
          } else {
            // 常规随机走位继续模拟有限角速度；子弹躲避使用摇杆拖动距离模型。
            const headingDelta = Math.atan2(
              Math.sin(ai.desiredHeading - ai.heading),
              Math.cos(ai.desiredHeading - ai.heading),
            );
            const headingStep = Math.max(-AIMING_AI_TURN_RATE * dt, Math.min(AIMING_AI_TURN_RATE * dt, headingDelta));
            ai.heading += headingStep;
          }

          const aiMovement = advanceMovement(aiMovementElapsed, dt, true);
          aiMovementElapsed = aiMovement.elapsed;
          const targetBeforeMoveX = target.x;
          const targetBeforeMoveY = target.y;
          let aiMoveX = Math.cos(ai.heading);
          let aiMoveY = Math.sin(ai.heading);
          if (!tauntSpinning && radialDistance > tiles(8.4)) {
            const outwardX = radialX / radialDistance;
            const outwardY = radialY / radialDistance;
            const outwardAmount = Math.max(0, aiMoveX * outwardX + aiMoveY * outwardY);
            const boundaryStrength = Math.min(1, (radialDistance - tiles(8.4)) / tiles(0.45));
            const inwardBias = aiRetreating ? 0 : boundaryStrength * 0.35;
            aiMoveX -= outwardX * (outwardAmount * boundaryStrength + inwardBias);
            aiMoveY -= outwardY * (outwardAmount * boundaryStrength + inwardBias);
          }
          const resolvedAiMove = resolveSquareMovement({
            x: target.x,
            y: target.y,
            dx: aiMoveX * MOVE_SPEED * aiMovement.distance,
            dy: aiMoveY * MOVE_SPEED * aiMovement.distance,
            halfSize: PLAYER_COLLISION_HALF_SIZE,
            mapWidth: MAP_WIDTH,
            mapHeight: MAP_HEIGHT,
            tileSize: TILE_SIZE,
            walls: wallTiles,
          });
          let nextX = resolvedAiMove.x;
          let nextY = resolvedAiMove.y;
          const relativeX = nextX - player.x;
          const relativeY = nextY - player.y;
          const rawDistance = Math.hypot(relativeX, relativeY) || tiles(9);
          const rawAngle = Math.atan2(relativeY, relativeX);
          const sectorOffset = Math.max(
            -AIMING_SECTOR_HALF_ANGLE,
            Math.min(AIMING_SECTOR_HALF_ANGLE, Math.atan2(Math.sin(rawAngle - AIMING_FRONT_ANGLE), Math.cos(rawAngle - AIMING_FRONT_ANGLE))),
          );
          const constrainedDistance = Math.max(AIMING_MIN_DISTANCE, Math.min(AIMING_MAX_DISTANCE, rawDistance));
          const constrainedAngle = AIMING_FRONT_ANGLE + sectorOffset;
          nextX = player.x + Math.cos(constrainedAngle) * constrainedDistance;
          nextY = player.y + Math.sin(constrainedAngle) * constrainedDistance;
          const finalAiMove = resolveSquareMovement({
            x: targetBeforeMoveX,
            y: targetBeforeMoveY,
            dx: nextX - targetBeforeMoveX,
            dy: nextY - targetBeforeMoveY,
            halfSize: PLAYER_COLLISION_HALF_SIZE,
            mapWidth: MAP_WIDTH,
            mapHeight: MAP_HEIGHT,
            tileSize: TILE_SIZE,
            walls: wallTiles,
          });
          nextX = finalAiMove.x;
          nextY = finalAiMove.y;

          // 靠近扇区或距离边界时提前把目标方向拉回活动区中心，下一帧仍平滑转向。
          const touchedBoundary = Math.abs(sectorOffset) >= AIMING_SECTOR_HALF_ANGLE - 0.025
            || rawDistance <= AIMING_MIN_DISTANCE + tiles(0.04)
            || rawDistance >= AIMING_MAX_DISTANCE - tiles(0.04);
          if (touchedBoundary && !tauntSpinning && !aiRetreating && ai.dodgeLockTimer <= 0) {
            const centerX = player.x + Math.cos(AIMING_FRONT_ANGLE) * tiles(9);
            const centerY = player.y + Math.sin(AIMING_FRONT_ANGLE) * tiles(9);
            setAiDirection(Math.atan2(centerY - target.y, centerX - target.x) + (Math.random() - 0.5) * 0.35);
          }

          target.x = nextX;
          target.y = nextY;
          enemyIsMovingRef.current = Math.hypot(target.x - targetBeforeMoveX, target.y - targetBeforeMoveY) > 1e-7;
          if (enemyIsMovingRef.current) {
            enemyDirectionRef.current = Math.atan2(target.y - targetBeforeMoveY, target.x - targetBeforeMoveX);
          }
          target.angle = Math.atan2(target.y - player.y, target.x - player.x);
          target.direction = Math.sin(ai.heading - target.angle) >= 0 ? 1 : -1;
        }

        const starCollector = isAimingMode ? aimingTargetRef.current : player;
        const collectorRadius = isAimingMode ? ENEMY_RADIUS : PLAYER_RADIUS;
        for (let index = stars.length - 1; index >= 0; index--) {
          const star = stars[index];
          if (Math.hypot(star.x - starCollector.x, star.y - starCollector.y) > collectorRadius + star.radius) continue;
          if (isAimingMode) {
            if (!isAimingInfinite) {
              aimingTargetHealthRef.current = Math.min(
                aimingTargetMaxHealth,
                aimingTargetHealthRef.current + star.heal,
              );
            }
            aiScoreRef.current += star.points;
            setAiScore(Math.round(aiScoreRef.current * 10) / 10);
            if (!isAimingInfinite && aiScoreRef.current >= 15 && !pausedRef.current) {
              pausedRef.current = true;
              setRoundResult("defeat");
            }
          } else {
            healthRef.current = Math.min(playerMaxHealth, healthRef.current + star.heal);
            setHealth(Math.round(healthRef.current));
            scoreRef.current += star.points;
            setScore(Math.round(scoreRef.current * 10) / 10);
          }
          if (aiTargetStarId === star.id) aiTargetStarId = null;
          if (aiFeint?.starId === star.id) aiFeint = null;
          stars.splice(index, 1);
        }

        // === Profiler 采样：rawMag & engaged 按模式区分 ===
        let rawMag = -1;
        let engaged = false;
        if (mode === "joystick") {
          const js = joystickRef.current;
          engaged = js.active;
          rawMag = engaged ? js.rawMagnitude : -1;
        } else {
          // 键盘模式：没有物理触控距离，所以数据1不采样（rawMag=-1）；
          // engaged=是否按下至少一个方向键
          engaged = Math.hypot(input.x, input.y) >= INPUT_DEADZONE_MAG;
          rawMag = -1;
        }
        profileStep(prof, now, input.x, input.y, dtMs, rawMag, engaged);

        if (isSurvivalMode) {
          const rangeDx = player.x - ENEMY_X;
          const rangeDy = player.y - ENEMY_Y;
          const inAttackRange = rangeDx * rangeDx + rangeDy * rangeDy <= projectileRange * projectileRange;
          if (inAttackRange) survivalTimeRef.current += dt;
          else survivalTimeRef.current = 0;

          secondsSinceDamageRef.current += dt;
          if (now - lastSurvivalUiUpdateRef.current >= 50) {
            setHealth(Math.round(healthRef.current));
            setSurvivalTime(survivalTimeRef.current);
            lastSurvivalUiUpdateRef.current = now;
          }
        }

        if (isAimingMode) {
          aimingElapsedSecondsRef.current += dt;
          if (speedTier === "high" && magazineAmmoRef.current < 1) aimingEmptyAmmoSecondsRef.current += dt;
          aimingTargetSecondsSinceDamageRef.current += dt;
        }

        // 每 10 秒在已有耗时上乘 0.95；只影响回弹与开火节奏。
        const timingScale = movementTimingScale(isSurvivalMode, survivalTimeRef.current);
        if (timingScale !== timingScaleRef.current) {
          const ratio = timingScale / timingScaleRef.current;
          magazineReloadTimerRef.current *= ratio;
          fireTimerRef.current *= ratio;
          timingScaleRef.current = timingScale;
        }
        const currentReloadSeconds = magazineReloadSeconds * timingScale;
        const currentBulletSpeed = bulletSpeed;

        if (genePullActive) {
          const grabbed = aimingTargetRef.current;
          if (aimingTargetHealthRef.current <= 0) {
            genePullActive = false;
          } else {
            const next = advanceGenePull(grabbed, player, dt, PLAYER_RADIUS + ENEMY_RADIUS, genePullSpeed);
            if (genePullBreaksWalls) destroyWallsAlongGenePull(wallTiles, grabbed, next, TILE_SIZE, ENEMY_RADIUS);
            grabbed.x = next.x;
            grabbed.y = next.y;
            genePullActive = !next.finished;
          }
        }

        // 皮尔斯只有清空三发后才开始整匣装填；蛋壳可在装填期间直接补回一发。
        for (let i = pierceShells.length - 1; i >= 0; i--) {
          const shell = pierceShells[i];
          shell.remainingSeconds -= dt;
          if (shell.remainingSeconds <= 0) {
            pierceShells.splice(i, 1);
            continue;
          }
          if (isPierceMode && Math.hypot(player.x - shell.x, player.y - shell.y) <= PIERCE_SHELL.pickupRadius) {
            pierceShells.splice(i, 1);
            if (magazineAmmoRef.current < magazineCapacity) {
              magazineAmmoRef.current += 1;
              setMagazineAmmo(magazineAmmoRef.current);
              magazineReloadTimerRef.current = currentReloadSeconds;
              setMagazineReloadProgress(0);
            }
            firePierceShellShot();
          }
        }

        // ======== 弹匣恢复 + 随机开火（含最多一次双发追射） ========
        if (isPierceMode && magazineAmmoRef.current > 0) {
          magazineReloadTimerRef.current = currentReloadSeconds;
          setMagazineReloadProgress(0);
        } else if (magazineAmmoRef.current < magazineCapacity) {
          magazineReloadTimerRef.current -= dt;
          if (magazineReloadTimerRef.current <= 0) {
            magazineAmmoRef.current = isPierceMode ? magazineCapacity : magazineAmmoRef.current + 1;
            setMagazineAmmo(magazineAmmoRef.current);
            magazineReloadTimerRef.current = isPierceMode
              ? currentReloadSeconds
              : magazineReloadTimerRef.current + currentReloadSeconds;
            if (magazineAmmoRef.current >= magazineCapacity) setMagazineReloadProgress(0);
          }
          if (now - lastMagazineUiUpdateRef.current >= 33) {
            const reloadProgress = 1 - magazineReloadTimerRef.current / currentReloadSeconds;
            setMagazineReloadProgress(Math.max(0, Math.min(1, reloadProgress)));
            lastMagazineUiUpdateRef.current = now;
          }
        } else {
          magazineReloadTimerRef.current = currentReloadSeconds;
        }

        if (!isAimingMode && !isTrialMode) fireTimerRef.current -= dt;
        if (!isAimingMode && !isTrialMode && fireTimerRef.current <= 0) {
          const dx = player.x - ENEMY_X;
          const dy = player.y - ENEMY_Y;
          // 射程判定：用玩家当前位置
          if (canMovementShoot(usesRapidFireCadence, magazineAmmoRef.current, burstFollowupRef.current) && dx * dx + dy * dy <= projectileRange * projectileRange) {
            const shotId = bulletIdRef.current;
            const metrics = getMetrics(prof);
            const pred = predictAimAngle({
              playerX: player.x,
              playerY: player.y,
              velX,
              velY,
              speed: curSpeed,
              enemyX: ENEMY_X,
              enemyY: ENEMY_Y,
              bulletSpeed: currentBulletSpeed,
              maxDistance: projectileRange,
              targetMoveSpeed: controlledMoveSpeed,
              shotId,
              now,
              p: prof,
              metrics,
            });
            const isEnhancedBeaShot = isBeaMode && beaEnhancedShotsRef.current > 0;
            const projectileTexture: keyof typeof BULLET_STYLES = isBeaMode
              ? isEnhancedBeaShot ? "beaEnhanced" : "beaNormal"
              : isMaxMode ? "max" : isByronMode ? "byron" : "high";
            for (const [index, angle] of attackProjectileAngles(pred.aimAngle, isMaxMode, shotId).entries()) {
              bulletsRef.current.push({
                x: ENEMY_X,
                y: ENEMY_Y,
                vx: Math.cos(angle) * currentBulletSpeed,
                vy: Math.sin(angle) * currentBulletSpeed,
                traveled: 0,
                id: bulletIdRef.current++,
                radius: bulletRadius,
                texture: projectileTexture,
                owner: "enemy",
                maxDistance: projectileRange,
                spawnDelay: isMaxMode ? index * MAX_PROJECTILE_INTERVAL_SECONDS : 0,
              });
            }
            enemyDirectionRef.current = pred.aimAngle;
            if (isEnhancedBeaShot) beaEnhancedShotsRef.current -= 1;
            magazineAmmoRef.current -= 1;
            setMagazineAmmo(magazineAmmoRef.current);

            const nextShot = movementShotDelay(
              usesRapidFireCadence, magazineAmmoRef.current, magazineReloadTimerRef.current,
              currentReloadSeconds, 1 / timingScale, burstFollowupRef.current,
            );
            burstFollowupRef.current = nextShot.followup;
            fireTimerRef.current = nextShot.seconds;
          } else {
            // Keep a due shot pending while reloading or out of range, without adding a full interval.
            fireTimerRef.current = 0;
          }
        }

        // 满充保持蓝环；进入射程后以金环显示短暂的预判瞄准。
        if (superAim.elapsed === 0) superAim.angle = enemyDirectionRef.current;
        const superDecision = updateBeaSuperAim(superAim, dt,
          isBeaMode && !isAimingMode && !isTrialMode && superCharge >= 1,
          (player.x - ENEMY_X) / BEA_SUPER_UNIT, (player.y - ENEMY_Y) / BEA_SUPER_UNIT,
          playerVelocityRef.current.x / BEA_SUPER_UNIT, playerVelocityRef.current.y / BEA_SUPER_UNIT);
        superAiming = superDecision.aiming;
        superRingPhase = (superRingPhase + dt * (superAiming ? 2.4 : 1.8)) % (Math.PI * 2);
        if (superAiming) enemyDirectionRef.current = superAim.angle;
        if (superDecision.fire) {
          superCharge = 0;
          superAiming = false;
          superAim.elapsed = 0;
          superAim.stable = 0;
          const angle = superAim.angle;
          enemyDirectionRef.current = angle;
          for (const omega of BEA_SUPER.angularSpeeds) {
            bulletsRef.current.push({
              x: ENEMY_X, y: ENEMY_Y,
              vx: Math.cos(angle) * BEA_SUPER.speed * BEA_SUPER_UNIT,
              vy: Math.sin(angle) * BEA_SUPER.speed * BEA_SUPER_UNIT,
              traveled: 0, id: bulletIdRef.current++, radius: BEA_SUPER.radius * BEA_SUPER_UNIT,
              texture: "beaSuper", owner: "enemy",
              maxDistance: BEA_SUPER.range * BEA_SUPER_UNIT,
              superTrajectory: { originX: ENEMY_X, originY: ENEMY_Y, angle, omega, elapsed: 0 },
            });
          }
        }

        for (let i = pierceSuperCastsRef.current.length - 1; i >= 0; i--) {
          const cast = pierceSuperCastsRef.current[i];
          cast.remainingSeconds -= dt;
          if (cast.remainingSeconds > 0) continue;
          if (cast.phase === "warning") {
            cast.lockedTargetIds = getPierceEnemyTargets()
              .filter((target) => target.alive
                && Math.hypot(target.x - cast.x, target.y - cast.y) <= PIERCE_SUPER.radius + target.radius)
              .map((target) => target.id);
            cast.phase = "locked";
            cast.remainingSeconds = PIERCE_SUPER.lockSeconds;
            continue;
          }
          for (const targetId of cast.lockedTargetIds) {
            const target = getPierceEnemyTargets().find((candidate) => candidate.id === targetId);
            if (!target?.alive) continue;
            const source = playerRef.current;
            const angle = Math.atan2(target.y - source.y, target.x - source.x);
            bulletsRef.current.push({
              x: source.x, y: source.y,
              vx: Math.cos(angle) * PIERCE_SUPER.projectileSpeed,
              vy: Math.sin(angle) * PIERCE_SUPER.projectileSpeed,
              traveled: 0, id: bulletIdRef.current++, radius: PIERCE_SUPER.projectileRadius,
              texture: "pierceSuper", owner: "player", maxDistance: PIERCE_SUPER.range,
              homing: {
                targetId,
                steerStrength: PIERCE_SUPER.steerStrength,
                ignoreSeconds: PIERCE_SUPER.steerIgnoreSeconds,
                remainingSeconds: PIERCE_SUPER.steerSeconds,
              },
            });
            firedShotCountRef.current += 1;
          }
          pierceSuperCastsRef.current.splice(i, 1);
        }

        // ======== 更新子弹 + 碰撞检测 + 生命周期 + 视野事件 ========
        const bullets = bulletsRef.current;

        // 相机与视野范围（用于"子弹进入视野"判定）
        const cssW = container.clientWidth;
        const cssH = container.clientHeight;
        const mapPixelHeight = MAP_HEIGHT * scaleY;
        const playerCenterY = player.y * scaleY;
        let oY: number;
        if (mapPixelHeight <= cssH) {
          oY = (cssH - mapPixelHeight) / 2;
        } else {
          oY = cssH / 2 - playerCenterY;
          oY = Math.min(0, Math.max(cssH - mapPixelHeight, oY));
        }
        // 视野对应地图坐标系范围（含少量外延，避免边界闪烁）
        const viewMargin = tiles(1);
        const viewMapLeft = (-offsetX) / scale - viewMargin;
        const viewMapRight = (cssW - offsetX) / scale + viewMargin;
        const viewMapTop = (-oY) / scaleY - viewMargin;
        const viewMapBottom = (cssH - oY) / scaleY + viewMargin;
        visibleWorldBoundsRef.current = { left: viewMapLeft, right: viewMapRight, top: viewMapTop, bottom: viewMapBottom };

        for (let i = bullets.length - 1; i >= 0; i--) {
          const b = bullets[i];
          let movementTime = dt;
          if ((b.spawnDelay ?? 0) > 0) {
            const waitingTime = Math.min(b.spawnDelay ?? 0, movementTime);
            b.spawnDelay = Math.max(0, (b.spawnDelay ?? 0) - waitingTime);
            movementTime -= waitingTime;
            const source = b.owner === "player" ? player : { x: ENEMY_X, y: ENEMY_Y };
            b.x = source.x;
            b.y = source.y;
            if (movementTime <= 0) continue;
          }
          const previousX = b.x;
          const previousY = b.y;
          const maxDistance = b.maxDistance;
          if (b.homing) {
            const homing = b.homing;
            const ignoredTime = Math.min(homing.ignoreSeconds, movementTime);
            homing.ignoreSeconds -= ignoredTime;
            homing.remainingSeconds = Math.max(0, homing.remainingSeconds - movementTime);
            if (homing.ignoreSeconds <= 0 && homing.remainingSeconds > 0) {
              const target = getPierceEnemyTargets().find((candidate) => candidate.id === homing.targetId);
              if (!target?.alive) continue;
              const currentAngle = Math.atan2(b.vy, b.vx);
              const desiredAngle = Math.atan2(target.y - b.y, target.x - b.x);
              const angleDelta = Math.atan2(Math.sin(desiredAngle - currentAngle), Math.cos(desiredAngle - currentAngle));
              const turn = Math.max(-homing.steerStrength * movementTime, Math.min(homing.steerStrength * movementTime, angleDelta));
              const speed = Math.hypot(b.vx, b.vy);
              b.vx = Math.cos(currentAngle + turn) * speed;
              b.vy = Math.sin(currentAngle + turn) * speed;
            }
          }
          if (b.superTrajectory) {
            const trajectory = b.superTrajectory;
            trajectory.elapsed = Math.min(trajectory.elapsed + movementTime, BEA_SUPER.range / BEA_SUPER.speed);
            const local = beaSuperPosition(trajectory.elapsed, trajectory.omega);
            const cos = Math.cos(trajectory.angle), sin = Math.sin(trajectory.angle);
            b.x = trajectory.originX + (local.x * cos - local.y * sin) * BEA_SUPER_UNIT;
            b.y = trajectory.originY + (local.x * sin + local.y * cos) * BEA_SUPER_UNIT;
            b.vx = Math.cos(trajectory.angle + local.heading) * BEA_SUPER.speed * BEA_SUPER_UNIT;
            b.vy = Math.sin(trajectory.angle + local.heading) * BEA_SUPER.speed * BEA_SUPER_UNIT;
            b.traveled = Math.min(maxDistance, trajectory.elapsed * BEA_SUPER.speed * BEA_SUPER_UNIT);
          } else {
            const stepTime = Math.min(movementTime, Math.max(0, maxDistance - b.traveled) / Math.hypot(b.vx, b.vy));
            b.x += b.vx * stepTime;
            b.y += b.vy * stepTime;
            b.traveled = Math.min(maxDistance, b.traveled + Math.hypot(b.vx, b.vy) * stepTime);
          }

          if (b.lobbedImpact) {
            if (b.traveled < maxDistance) continue;
            const impact = b.lobbedImpact;
            impactBursts.push({ x: impact.x, y: impact.y, radius: impact.radius, life: 0.35, maxLife: 0.35 });
            if (Math.hypot(aimingTargetRef.current.x - impact.x, aimingTargetRef.current.y - impact.y) <= impact.radius + ENEMY_RADIUS) {
              hitCountRef.current += 1;
              combatUiDirty = true;
              damageTrialTarget(impact.damage, BYRON_SUPER_CHARGE);
              spawnHitParticles(aimingTargetRef.current.x, aimingTargetRef.current.y);
            }
            if (Math.hypot(player.x - impact.x, player.y - impact.y) <= impact.radius + PLAYER_RADIUS) {
              healthRef.current = Math.min(playerMaxHealth, healthRef.current + impact.heal);
              setHealth(Math.round(healthRef.current));
            }
            bullets.splice(i, 1);
            profileBulletRemoved(prof, b.id);
            aimingTargetAiRef.current.reactedBulletIds.delete(b.id);
            continue;
          }

          // 进入视野检测（第一次）
          if (!bulletEnteredVision.has(b.id)) {
            if (
              b.x >= viewMapLeft && b.x <= viewMapRight &&
              b.y >= viewMapTop && b.y <= viewMapBottom
            ) {
              bulletEnteredVision.add(b.id);
              const projectileSpeed = Math.hypot(b.vx, b.vy) || bulletSpeed;
              const remainingLifeMs = ((maxDistance - b.traveled) / projectileSpeed) * 1000;
              const baselineAngle = curSpeed >= tiles(INPUT_DEADZONE_MAG) ? Math.atan2(input.y, input.x) : null;
              profileBulletEnterVision(prof, now, b.id, remainingLifeMs, baselineAngle);
            }
          }

          // 追踪目标只控制转向；碰撞独立检查敌方单位，皮尔斯大招会被沿途先碰到的敌人挡下。
          const collisionTarget = b.owner === "player" ? aimingTargetRef.current : player;
          const segmentX = b.x - previousX;
          const segmentY = b.y - previousY;
          const segmentLength2 = segmentX * segmentX + segmentY * segmentY;
          const targetProjection = segmentLength2 > 0
            ? Math.max(0, Math.min(1, ((collisionTarget.x - previousX) * segmentX + (collisionTarget.y - previousY) * segmentY) / segmentLength2))
            : 0;
          const closestX = previousX + segmentX * targetProjection;
          const closestY = previousY + segmentY * targetProjection;
          const ddx = collisionTarget.x - closestX;
          const ddy = collisionTarget.y - closestY;
          const rSum = (b.owner === "player" ? ENEMY_RADIUS : PLAYER_RADIUS) + b.radius;
          const rSum2 = rSum * rSum;
          if (ddx * ddx + ddy * ddy <= rSum2) {
            bullets.splice(i, 1);
            profileBulletRemoved(prof, b.id);
            aimingTargetAiRef.current.reactedBulletIds.delete(b.id);
            if (b.owner === "player") {
              if (isAimingMode) recordAiShotOutcome(true);
              spawnHitParticles(collisionTarget.x, collisionTarget.y);
              hitCountRef.current += 1;
              combatUiDirty = true;
              if (b.texture === "beaNormal") {
                beaEnhancedShotsRef.current = 2;
              } else if (b.texture === "beaEnhanced") {
                beaEnhancedShotsRef.current = 0;
              }
              if (b.texture === "byron") {
                byronPoisons.push({ ticksRemaining: BYRON_TICK_COUNT, timeToNextTick: 0 });
              } else if (b.texture === "geneSuper") {
                genePullActive = true;
                genePullSpeed = b.geneHyperHand ? GENE.hyperPullSpeed : GENE.pullSpeed;
                genePullBreaksWalls = !b.geneHyperHand;
              } else {
                const damage = projectileDamage(b.texture, b.traveled) * (b.damageMultiplier ?? 1);
                const chargeGain = b.texture === "beaSuper"
                  ? 0.025
                  : b.texture === "max" ? 0.0735
                  : b.texture === "beaNormal" || b.texture === "beaEnhanced" ? 0.26
                  : b.texture === "pierceNormal" ? PIERCE_NORMAL_SUPER_CHARGE
                  : b.texture === "pierceLast" ? PIERCE_LAST_SUPER_CHARGE
                  : b.texture === "pierceShell" ? PIERCE_SHELL_SUPER_CHARGE
                  : b.texture === "pierceSuper" ? PIERCE_SUPER.chargePerHit
                  : b.texture === "geneDirect" ? GENE.directSuperCharge
                  : b.texture === "geneSplit" ? GENE.splitSuperCharge
                  : 0;
                damageTrialTarget(damage, chargeGain);
                if (isGeneMode && geneHyperRemainingRef.current <= 0 && geneHyperChargeRef.current < 1) {
                  const gain = b.texture === "geneDirect" ? GENE.hyperDirectCharge
                    : b.texture === "geneSplit" ? GENE.hyperSplitCharge : 0;
                  geneHyperChargeRef.current = Math.min(1, geneHyperChargeRef.current + gain);
                }
                if (trainingTargetUnitClass === "hero" && (
                  b.texture === "pierceNormal" || b.texture === "pierceLast" || b.texture === "pierceSuper"
                )) {
                  spawnPierceShell();
                }
                if (b.texture === "brock") spawnBrockImpact(closestX, closestY);
              }
              continue;
            }
            if (b.texture === "beaNormal") {
              beaEnhancedShotsRef.current = 2;
            } else if (b.texture === "beaEnhanced") {
              beaEnhancedShotsRef.current = 0;
            }
            if (b.texture === "beaSuper") {
              superSlowRemainingMs = BEA_SUPER.slowMs;
            }
            if (isBeaMode && !isAimingMode && (
              b.texture === "beaNormal" || b.texture === "beaEnhanced" || b.texture === "beaSuper"
            )) {
              superCharge = chargeBeaSuper(superCharge, b.texture);
            }
            spawnHitParticles(player.x, player.y);
            if (isSurvivalMode) {
              hitCountRef.current += 1;
              combatUiDirty = true;
            }
            if (!isAimingMode) {
              const damage = projectileDamage(b.texture, b.traveled);
              healthRef.current = Math.max(0, healthRef.current - damage * (isGeneMode && geneHyperRemainingRef.current > 0 ? 1 - GENE.hyperDamageReduction : 1));
              secondsSinceDamageRef.current = 0;
              setHealth(Math.round(healthRef.current));
              if (isSurvivalMode && healthRef.current <= 0) {
                pausedRef.current = true;
                setSurvivalTime(survivalTimeRef.current);
                setRoundResult("defeat");
              }
            }
          } else if (b.traveled >= maxDistance) {
            // 先检查最后一段轨迹的命中，再移除到达射程终点的子弹。
            if (b.owner === "player" && b.texture === "geneDirect") {
              const heading = Math.atan2(b.vy, b.vx);
              for (const angle of geneSplitAngles(heading)) {
                bullets.push({
                  x: b.x, y: b.y,
                  vx: Math.cos(angle) * bulletSpeed, vy: Math.sin(angle) * bulletSpeed,
                  traveled: GENE.directRange, id: bulletIdRef.current++, radius: GENE.splitWidth / 2,
                  texture: "geneSplit", owner: "player", maxDistance: GENE.totalRange,
                  damageMultiplier: b.damageMultiplier,
                });
              }
              firedShotCountRef.current += GENE.splitCount;
            }
            if (b.owner === "player" && b.texture === "brock") {
              spawnBrockImpact(b.x, b.y);
              const target = aimingTargetRef.current;
              if (aimingTargetHealthRef.current > 0
                && Math.hypot(target.x - b.x, target.y - b.y) <= BROCK_EXPLOSION_RADIUS + ENEMY_RADIUS) {
                hitCountRef.current += 1;
                combatUiDirty = true;
                damageTrialTarget(BROCK_ATTACK_DAMAGE);
                spawnHitParticles(target.x, target.y);
              }
            }
            if (isAimingMode && b.owner === "player") recordAiShotOutcome(false);
            if (
              isAimingMode &&
              b.owner === "player" &&
              aimingTargetAiRef.current.reactedBulletIds.has(b.id)
            ) {
              recordDodgedProjectile();
            }
            bullets.splice(i, 1);
            profileBulletRemoved(prof, b.id);
            aimingTargetAiRef.current.reactedBulletIds.delete(b.id);
          }
        }

        for (let i = brockFires.length - 1; i >= 0; i--) {
          const fire = brockFires[i];
          fire.remainingSeconds -= dt;
          fire.timeToNextTick -= dt;
          while (fire.timeToNextTick <= 0 && fire.remainingSeconds > 0) {
            fire.timeToNextTick += 1;
            const target = aimingTargetRef.current;
            if (aimingTargetHealthRef.current > 0
              && Math.hypot(target.x - fire.x, target.y - fire.y) <= BROCK_FIRE_RADIUS + ENEMY_RADIUS) {
              damageTrialTarget(BROCK_FIRE_DAMAGE);
              spawnHitParticles(target.x, target.y);
            }
          }
          if (fire.remainingSeconds <= 0) brockFires.splice(i, 1);
        }

        for (let i = hitParticles.length - 1; i >= 0; i--) {
          const particle = hitParticles[i];
          particle.life -= dt;
          if (particle.life <= 0) {
            hitParticlePool.push(...hitParticles.splice(i, 1));
            continue;
          }
          particle.x += particle.vx * dt;
          particle.y += particle.vy * dt;
          const drag = Math.exp(-5 * dt);
          particle.vx *= drag;
          particle.vy *= drag;
        }
        combatUiRefreshRemaining -= dt;
        if (combatUiDirty && combatUiRefreshRemaining <= 0) refreshCombatUi();
      }

      // ======== 渲染（暂停时也继续渲染，画面定格） ========
      const player = playerRef.current;
      const cssWidth = container.clientWidth;
      const cssHeight = container.clientHeight;
      // 相机跟随：让玩家始终处于屏幕竖直中线（无论暂停与否都重算）
      const mapPixelHeight = MAP_HEIGHT * scaleY;
      const playerCenterY = player.y * scaleY;
      let offsetY: number;
      if (mapPixelHeight <= cssHeight) {
        offsetY = (cssHeight - mapPixelHeight) / 2;
      } else {
        offsetY = cssHeight / 2 - playerCenterY;
        offsetY = Math.min(0, Math.max(cssHeight - mapPixelHeight, offsetY));
      }
      const widthFactorAt = (worldY: number) => 1 + (worldY / MAP_HEIGHT - 0.5) * PERSPECTIVE_WIDTH_STRENGTH;
      const projectX = (worldX: number, worldY: number) => cssWidth / 2 + (worldX - MAP_WIDTH / 2) * scale * widthFactorAt(worldY);
      const projectY = (worldY: number) => offsetY + worldY * scaleY;
      const topLeftX = projectX(0, 0);
      const topRightX = projectX(MAP_WIDTH, 0);
      const bottomLeftX = projectX(0, MAP_HEIGHT);
      const bottomRightX = projectX(MAP_WIDTH, MAP_HEIGHT);

      // 清屏
      ctx.fillStyle = "#0f1419";
      ctx.fillRect(0, 0, cssWidth, cssHeight);

      // 绘制地图区域背景
      ctx.fillStyle = "#162031";
      ctx.beginPath();
      ctx.moveTo(topLeftX, projectY(0));
      ctx.lineTo(topRightX, projectY(0));
      ctx.lineTo(bottomRightX, projectY(MAP_HEIGHT));
      ctx.lineTo(bottomLeftX, projectY(MAP_HEIGHT));
      ctx.closePath();
      ctx.fill();

      // 绘制网格
      ctx.strokeStyle = "#243044";
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let gx = 0; gx <= MAP_WIDTH; gx += tiles(5)) {
        ctx.moveTo(projectX(gx, 0), projectY(0));
        ctx.lineTo(projectX(gx, MAP_HEIGHT), projectY(MAP_HEIGHT));
      }
      for (let gy = 0; gy <= MAP_HEIGHT; gy += tiles(5)) {
        ctx.moveTo(projectX(0, gy), projectY(gy));
        ctx.lineTo(projectX(MAP_WIDTH, gy), projectY(gy));
      }
      ctx.stroke();

      // 细网格
      ctx.strokeStyle = "rgba(45, 63, 85, 0.4)";
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      for (let gx = 0; gx <= MAP_WIDTH; gx += TILE_SIZE) {
        ctx.moveTo(projectX(gx, 0), projectY(0));
        ctx.lineTo(projectX(gx, MAP_HEIGHT), projectY(MAP_HEIGHT));
      }
      for (let gy = 0; gy <= MAP_HEIGHT; gy += TILE_SIZE) {
        ctx.moveTo(projectX(0, gy), projectY(gy));
        ctx.lineTo(projectX(MAP_WIDTH, gy), projectY(gy));
      }
      ctx.stroke();

      // 地图边框
      ctx.strokeStyle = "#2d3f55";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(topLeftX, projectY(0));
      ctx.lineTo(topRightX, projectY(0));
      ctx.lineTo(bottomRightX, projectY(MAP_HEIGHT));
      ctx.lineTo(bottomLeftX, projectY(MAP_HEIGHT));
      ctx.closePath();
      ctx.stroke();

      for (const cast of pierceSuperCastsRef.current) {
        const locked = cast.phase === "locked";
        ctx.save();
        ctx.fillStyle = locked ? "rgba(255, 78, 92, 0.24)" : "rgba(255, 199, 69, 0.18)";
        ctx.strokeStyle = locked ? "rgba(255, 109, 120, 0.95)" : "rgba(255, 224, 132, 0.88)";
        ctx.lineWidth = Math.max(2, tiles(0.08) * scale);
        if (!locked) ctx.setLineDash([10, 7]);
        ctx.beginPath();
        ctx.ellipse(
          projectX(cast.x, cast.y), projectY(cast.y),
          PIERCE_SUPER.radius * scale * widthFactorAt(cast.y), PIERCE_SUPER.radius * scaleY,
          0, 0, Math.PI * 2,
        );
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }

      for (const shell of pierceShells) {
        drawPierceShell(ctx, shell, scale * widthFactorAt(shell.y), scaleY, { projectX, projectY });
      }

      const renderedEnemy = isPlayerAttackMode ? aimingTargetRef.current : { x: ENEMY_X, y: ENEMY_Y };
      // 两种训练都显示当前角色的实际攻击范围，不展示目标的移动轨迹。
      const enemyCenterPx = projectX(renderedEnemy.x, renderedEnemy.y);
      const enemyCenterPy = projectY(renderedEnemy.y);
      const enemyRadiusPx = ENEMY_RADIUS * scale * widthFactorAt(renderedEnemy.y);
      const enemyRadiusPy = ENEMY_RADIUS * scaleY;
      ctx.save();
      ctx.strokeStyle = "rgba(255, 82, 82, 0.25)";
      ctx.lineWidth = 1;
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      for (let i = 0; i <= 72; i++) {
        const angle = (i / 72) * Math.PI * 2;
        const circleCenterX = isPlayerAttackMode ? player.x : ENEMY_X;
        const circleCenterY = isPlayerAttackMode ? player.y : ENEMY_Y;
        const circleRadius = projectileRange;
        const worldX = circleCenterX + Math.cos(angle) * circleRadius;
        const worldY = circleCenterY + Math.sin(angle) * circleRadius;
        if (i === 0) ctx.moveTo(projectX(worldX, worldY), projectY(worldY));
        else ctx.lineTo(projectX(worldX, worldY), projectY(worldY));
      }
      ctx.closePath();
      ctx.stroke();
      ctx.restore();

      for (const star of stars) {
        const starX = projectX(star.x, star.y);
        const starY = projectY(star.y);
        const starRadiusPx = star.radius * scale * widthFactorAt(star.y);
        ctx.save();
        ctx.translate(starX, starY);
        ctx.fillStyle = "#ffd740";
        ctx.strokeStyle = "#fff3a0";
        ctx.lineWidth = Math.max(1, starRadiusPx * 0.12);
        ctx.shadowColor = "rgba(255, 215, 64, 0.9)";
        ctx.shadowBlur = starRadiusPx * 1.4;
        ctx.beginPath();
        for (let point = 0; point < 10; point++) {
          const angle = -Math.PI / 2 + point * Math.PI / 5;
          const radius = point % 2 === 0 ? starRadiusPx : starRadiusPx * 0.46;
          const x = Math.cos(angle) * radius;
          const y = Math.sin(angle) * radius;
          if (point === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }

      for (const fire of brockFires) {
        const fireX = projectX(fire.x, fire.y);
        const fireY = projectY(fire.y);
        const flicker = 0.9 + Math.sin(fire.remainingSeconds * 15) * 0.1;
        ctx.save();
        ctx.fillStyle = "rgba(255, 111, 25, 0.28)";
        ctx.strokeStyle = "rgba(255, 191, 66, 0.78)";
        ctx.lineWidth = Math.max(2, tiles(0.05) * scale);
        ctx.beginPath();
        ctx.ellipse(
          fireX, fireY,
          BROCK_FIRE_RADIUS * flicker * scale * widthFactorAt(fire.y),
          BROCK_FIRE_RADIUS * flicker * scaleY,
          0, 0, Math.PI * 2,
        );
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }

      for (const burst of impactBursts) {
        const progress = 1 - burst.life / burst.maxLife;
        const radius = burst.radius * (0.35 + progress * 0.65);
        const burstX = projectX(burst.x, burst.y);
        const burstY = projectY(burst.y);
        ctx.save();
        ctx.globalAlpha = Math.max(0, 1 - progress) * 0.55;
        ctx.fillStyle = burst.kind === "brock" ? "#ff7a24" : "#a54cff";
        ctx.strokeStyle = burst.kind === "brock" ? "#ffd56a" : "#e2b8ff";
        ctx.lineWidth = Math.max(2, tiles(0.08) * scale);
        ctx.beginPath();
        ctx.ellipse(
          burstX,
          burstY,
          radius * scale * widthFactorAt(burst.y),
          radius * scaleY,
          0,
          0,
          Math.PI * 2,
        );
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }

      // 地面阵营圈：中心透明，外缘浓色；物理半径不变。
      drawTrainingUnitModel(ctx, {
        centerX: enemyCenterPx,
        centerY: enemyCenterPy,
        radiusX: enemyRadiusPx,
        radiusY: enemyRadiusPy,
        statusWidth: TILE_SIZE * scale * widthFactorAt(renderedEnemy.y),
        health: isPlayerAttackMode ? aimingTargetHealthRef.current : PLAYER_MAX_HEALTH,
        maxHealth: isPlayerAttackMode ? aimingTargetMaxHealth : PLAYER_MAX_HEALTH,
        team: "enemy",
        relation: "enemy",
        afterGroundRing: isBeaMode && !isAimingMode && superCharge >= 1
          ? () => drawSuperRing(ctx, enemyCenterPx, enemyCenterPy, enemyRadiusPx, enemyRadiusPy, superRingPhase, superAiming)
          : undefined,
      });

      if (pierceSuperCastsRef.current.some((cast) => cast.phase === "locked" && cast.lockedTargetIds.includes("trainingTarget"))) {
        ctx.save();
        ctx.translate(enemyCenterPx, enemyCenterPy);
        ctx.strokeStyle = "#ffdd55";
        ctx.fillStyle = "rgba(255, 74, 86, 0.7)";
        ctx.lineWidth = Math.max(2, enemyRadiusPx * 0.12);
        ctx.beginPath();
        ctx.arc(0, 0, enemyRadiusPx * 0.48, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-enemyRadiusPx * 0.62, 0);
        ctx.lineTo(enemyRadiusPx * 0.62, 0);
        ctx.moveTo(0, -enemyRadiusPy * 0.62);
        ctx.lineTo(0, enemyRadiusPy * 0.62);
        ctx.stroke();
        ctx.restore();
      }

      // 绘制玩家（圆）
      const playerCenterPx = projectX(player.x, player.y);
      const playerCenterPy = projectY(player.y);
      const playerRadiusPx = PLAYER_RADIUS * scale * widthFactorAt(player.y);
      const playerRadiusPy = PLAYER_RADIUS * scaleY;

      const ammo = magazineAmmoRef.current;
      const reloadProgress = magazineCapacity > ammo
        ? Math.max(0, Math.min(1, 1 - magazineReloadTimerRef.current / Math.max(0.001, magazineReloadSeconds / timingScaleRef.current)))
        : 0;
      drawTrainingUnitModel(ctx, {
        centerX: playerCenterPx,
        centerY: playerCenterPy,
        radiusX: playerRadiusPx,
        radiusY: playerRadiusPy,
        statusWidth: TILE_SIZE * scale * widthFactorAt(player.y),
        health: healthRef.current,
        maxHealth: playerMaxHealth,
        team: "player",
        relation: "self",
        afterGroundRing: isTrialMode && playerSuperChargeRef.current >= 1
          ? () => drawSuperRing(ctx, playerCenterPx, playerCenterPy, playerRadiusPx, playerRadiusPy,
            superRingPhase, superJoystickRef.current.active)
          : undefined,
        ammo: isPlayerAttackMode ? {
          current: ammo,
          capacity: magazineCapacity,
          reloadProgress,
          continuousReload: isPierceMode && ammo === 0,
        } : undefined,
      });

      if (isPlayerAttackMode && aimJoystickRef.current.active) {
        const aim = aimJoystickRef.current;
        const aimLength = Math.hypot(aim.knobX, aim.knobY);
        const target = aimingTargetRef.current;
        const bounds = visibleWorldBoundsRef.current;
        const targetVisible = aimingTargetHealthRef.current > 0
          && target.x >= bounds.left && target.x <= bounds.right
          && target.y >= bounds.top && target.y <= bounds.bottom;
        const angle = aimLength > 8
          ? Math.atan2(aim.knobY, aim.knobX)
          : targetVisible
            ? Math.atan2(target.y - player.y, target.x - player.x)
            : playerMoveDirectionRef.current;
        let corners: { x: number; y: number }[];
        if (isGeneMode) {
          const splitX = player.x + Math.cos(angle) * GENE.directRange;
          const splitY = player.y + Math.sin(angle) * GENE.directRange;
          const [leftAngle, , , , , rightAngle] = geneSplitAngles(angle);
          const sideX = -Math.sin(angle) * bulletRadius;
          const sideY = Math.cos(angle) * bulletRadius;
          corners = [
            { x: player.x - sideX, y: player.y - sideY },
            { x: splitX - sideX, y: splitY - sideY },
            { x: splitX + Math.cos(leftAngle) * (GENE.totalRange - GENE.directRange), y: splitY + Math.sin(leftAngle) * (GENE.totalRange - GENE.directRange) },
            { x: splitX + Math.cos(rightAngle) * (GENE.totalRange - GENE.directRange), y: splitY + Math.sin(rightAngle) * (GENE.totalRange - GENE.directRange) },
            { x: splitX + sideX, y: splitY + sideY },
            { x: player.x + sideX, y: player.y + sideY },
          ];
        } else if (isMaxMode) {
          const upperAngle = angle + MAX_AIM_EXTENTS_DEGREES[0] * Math.PI / 180;
          const lowerAngle = angle + MAX_AIM_EXTENTS_DEGREES[1] * Math.PI / 180;
          corners = [
            {
              x: player.x + Math.sin(angle) * bulletRadius,
              y: player.y - Math.cos(angle) * bulletRadius,
            },
            {
              x: player.x + Math.cos(upperAngle) * projectileRange + Math.sin(upperAngle) * bulletRadius,
              y: player.y + Math.sin(upperAngle) * projectileRange - Math.cos(upperAngle) * bulletRadius,
            },
            {
              x: player.x + Math.cos(lowerAngle) * projectileRange - Math.sin(lowerAngle) * bulletRadius,
              y: player.y + Math.sin(lowerAngle) * projectileRange + Math.cos(lowerAngle) * bulletRadius,
            },
            {
              x: player.x - Math.sin(angle) * bulletRadius,
              y: player.y + Math.cos(angle) * bulletRadius,
            },
          ];
        } else {
          const directionX = Math.cos(angle);
          const directionY = Math.sin(angle);
          const perpendicularX = -directionY * bulletRadius;
          const perpendicularY = directionX * bulletRadius;
          const aimEndX = player.x + directionX * projectileRange;
          const aimEndY = player.y + directionY * projectileRange;
          corners = [
            { x: player.x + perpendicularX, y: player.y + perpendicularY },
            { x: aimEndX + perpendicularX, y: aimEndY + perpendicularY },
            { x: aimEndX - perpendicularX, y: aimEndY - perpendicularY },
            { x: player.x - perpendicularX, y: player.y - perpendicularY },
          ];
        }
        ctx.save();
        ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
        ctx.beginPath();
        corners.forEach((corner, index) => {
          const x = projectX(corner.x, corner.y);
          const y = projectY(corner.y);
          if (index === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        });
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }

      if (isTrialMode && superJoystickRef.current.active) {
        const stick = superJoystickRef.current;
        if (isGeneMode) {
          const target = aimingTargetRef.current;
          const angle = stick.exceededDeadzone
            ? Math.atan2(stick.knobY, stick.knobX)
            : Math.atan2(target.y - player.y, target.x - player.x);
          const hypercharged = geneHyperRemainingRef.current > 0;
          const range = hypercharged ? GENE.baseSuperRange : GENE.superRange;
          ctx.save();
          ctx.strokeStyle = "rgba(250, 233, 154, 0.8)";
          ctx.lineWidth = GENE.superWidth * scale * widthFactorAt(player.y);
          for (const handAngle of geneSuperAngles(angle, hypercharged)) {
            ctx.beginPath();
            ctx.moveTo(projectX(player.x, player.y), projectY(player.y));
            ctx.lineTo(projectX(player.x + Math.cos(handAngle) * range, player.y + Math.sin(handAngle) * range),
              projectY(player.y + Math.sin(handAngle) * range));
            ctx.stroke();
          }
          ctx.restore();
        } else if (trialHeroId === "max") {
          ctx.save();
          ctx.fillStyle = "rgba(255, 213, 79, 0.24)";
          ctx.strokeStyle = "rgba(255, 235, 120, 0.82)";
          ctx.lineWidth = Math.max(2, tiles(0.08) * scale);
          ctx.beginPath();
          ctx.ellipse(
            playerCenterPx,
            playerCenterPy,
            MAX_SUPER_RADIUS * scale * widthFactorAt(player.y),
            MAX_SUPER_RADIUS * scaleY,
            0,
            0,
            Math.PI * 2,
          );
          ctx.fill();
          ctx.stroke();
          ctx.restore();
        } else if (trialHeroId === "byron" || trialHeroId === "pierce") {
          const isPierceSuper = trialHeroId === "pierce";
          const castRange = isPierceSuper ? PIERCE_SUPER.range : BYRON_SUPER_RANGE;
          const castRadius = isPierceSuper ? PIERCE_SUPER.radius : BYRON_SUPER_RADIUS;
          const target = aimingTargetRef.current;
          const bounds = visibleWorldBoundsRef.current;
          const targetVisible = aimingTargetHealthRef.current > 0
            && target.x >= bounds.left && target.x <= bounds.right
            && target.y >= bounds.top && target.y <= bounds.bottom;
          const stickDistance = Math.hypot(stick.knobX, stick.knobY);
          const angle = stick.exceededDeadzone
            ? Math.atan2(stick.knobY, stick.knobX)
            : targetVisible
              ? Math.atan2(target.y - player.y, target.x - player.x)
              : playerMoveDirectionRef.current;
          const targetDistance = Math.hypot(target.x - player.x, target.y - player.y);
          const throwDistance = stick.exceededDeadzone && stickDistance > 0
            ? castRange * stick.rawMagnitude
            : targetVisible ? Math.min(castRange, targetDistance) : castRange;
          const centerX = Math.max(0, Math.min(MAP_WIDTH, player.x + Math.cos(angle) * throwDistance));
          const centerY = Math.max(0, Math.min(MAP_HEIGHT, player.y + Math.sin(angle) * throwDistance));
          ctx.save();
          ctx.fillStyle = isPierceSuper ? "rgba(255, 199, 69, 0.24)" : "rgba(170, 76, 255, 0.28)";
          ctx.strokeStyle = isPierceSuper ? "rgba(255, 231, 142, 0.92)" : "rgba(230, 195, 255, 0.9)";
          ctx.lineWidth = Math.max(2, tiles(0.08) * scale);
          ctx.beginPath();
          ctx.ellipse(
            projectX(centerX, centerY),
            projectY(centerY),
            castRadius * scale * widthFactorAt(centerY),
            castRadius * scaleY,
            0,
            0,
            Math.PI * 2,
          );
          ctx.fill();
          ctx.stroke();
          ctx.restore();
        }
      }

      // 贝亚普通弹、强化弹与大招均为菱形，长度按宽度的 4/3 同比缩放。
      for (const b of bulletsRef.current) {
        if ((b.spawnDelay ?? 0) > 0) continue;
        const bx = projectX(b.x, b.y);
        const by = projectY(b.y);
        const radiusX = b.radius * scale * widthFactorAt(b.y);
        const radiusY = b.radius * scaleY;
        const headingX = projectX(b.x + b.vx * 0.05, b.y + b.vy * 0.05);
        const headingY = projectY(b.y + b.vy * 0.05);
        const angle = Math.atan2(headingY - by, headingX - bx);
        const style = BULLET_STYLES[b.texture];
        const isBeaProjectile = b.texture === "beaNormal"
          || b.texture === "beaEnhanced"
          || b.texture === "beaSuper";
        if (isBeaProjectile) {
          const halfWidth = radiusX;
          const halfLength = b.radius * BEA_PROJECTILE_LENGTH_TO_WIDTH * scaleY;
          ctx.save();
          ctx.translate(bx, by);
          ctx.rotate(angle);
          ctx.fillStyle = style.color;
          ctx.beginPath();
          ctx.moveTo(-halfLength, 0);
          ctx.lineTo(0, -halfWidth);
          ctx.lineTo(halfLength, 0);
          ctx.lineTo(0, halfWidth);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
          continue;
        }
        const halfWidth = radiusX;
        const length = radiusY * 2 * style.lengthScale;
        const tailX = -length / 2;
        const capCenterX = length / 2 - halfWidth;
        ctx.save();
        ctx.translate(bx, by);
        ctx.rotate(angle);
        ctx.fillStyle = style.color;
        ctx.beginPath();
        ctx.moveTo(tailX, -halfWidth);
        ctx.lineTo(capCenterX, -halfWidth);
        ctx.arc(capCenterX, 0, halfWidth, -Math.PI / 2, Math.PI / 2);
        ctx.lineTo(tailX, halfWidth);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }

      // 受击粒子绘制在角色与子弹上层，短促向外迸射后渐隐。
      ctx.save();
      for (const particle of hitParticles) {
        const alpha = Math.max(0, particle.life / particle.maxLife);
        const px = projectX(particle.x, particle.y);
        const py = projectY(particle.y);
        const radiusX = particle.size * scale * widthFactorAt(particle.y) * (0.65 + alpha * 0.35);
        const radiusY = particle.size * scaleY * (0.65 + alpha * 0.35);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = alpha > 0.55 ? "#ff5252" : "#d32f2f";
        ctx.beginPath();
        ctx.ellipse(px, py, radiusX, radiusY, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      // 坐标信息
      ctx.fillStyle = "#8899aa";
      ctx.font = "12px 'Nunito', system-ui, sans-serif";
      ctx.fillText(
        `位置: (${player.x.toFixed(1)}, ${player.y.toFixed(1)})`,
        bottomLeftX + 8,
        projectY(MAP_HEIGHT) - 8,
      );

      // 移动方向圆点置于最终前景层；位置按移动摇杆推杆比例映射。
      const enemyDirection = enemyDirectionRef.current;
      if (isAimingMode && enemyIsMovingRef.current) {
        drawMovementIndicator(
          ctx, enemyCenterPx, enemyCenterPy, enemyRadiusPx, enemyRadiusPy,
          Math.cos(enemyDirection), Math.sin(enemyDirection), 1,
        );
      }
      const movementStick = joystickRef.current;
      const showPlayerIndicator = !isAimingMode && (mode === "joystick"
        ? movementStick.active
        : playerIsMovingRef.current);
      if (showPlayerIndicator) {
        const directionX = mode === "joystick" ? movementStick.knobX : playerVelocityRef.current.x;
        const directionY = mode === "joystick" ? movementStick.knobY : playerVelocityRef.current.y;
        const magnitude = mode === "joystick" ? movementStick.rawMagnitude : 1;
        drawMovementIndicator(
          ctx, playerCenterPx, playerCenterPy, playerRadiusPx, playerRadiusPy,
          directionX, directionY, magnitude,
        );
      }

      if (
        isAimingMode &&
        tauntVisibleRemainingMs > 0 &&
        tauntEmoteImage.complete &&
        tauntEmoteImage.naturalWidth > 0
      ) {
        const drawWidth = enemyRadiusPx * 3.5;
        const drawHeight = drawWidth * tauntEmoteImage.naturalHeight / tauntEmoteImage.naturalWidth;
        const drawX = enemyCenterPx + enemyRadiusPx * 0.35;
        const drawY = enemyCenterPy - drawHeight - enemyRadiusPy * 0.65;
        ctx.drawImage(tauntEmoteImage, drawX, drawY, drawWidth, drawHeight);
      }

      animationId = requestAnimationFrame(gameLoop);
    };

    animationId = requestAnimationFrame(gameLoop);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", resize);
      bulletEnteredVision.clear();
      bulletsRef.current = [];
      playerVelocityRef.current = { x: 0, y: 0 };
      bulletIdRef.current = 1;
      fireTimerRef.current = fireIntervalMin + Math.random() * (fireIntervalMax - fireIntervalMin);
      magazineAmmoRef.current = magazineCapacity;
      magazineReloadTimerRef.current = magazineReloadSeconds;
      timingScaleRef.current = 1;
      lastMagazineUiUpdateRef.current = 0;
      burstFollowupRef.current = false;
      beaEnhancedShotsRef.current = 0;
      playerSuperChargeRef.current = 0;
      geneHyperChargeRef.current = 0;
      geneHyperRemainingRef.current = 0;
      playerAttackCooldownRef.current = 0;
      maxSuperRemainingRef.current = 0;
      pierceSuperCastsRef.current = [];
      superJoystickRef.current.active = false;
      superJoystickRef.current.touchId = null;
      lastSurvivalUiUpdateRef.current = 0;
    };
  }, [mode, speedTier, bulletSpeed, projectileRange, magazineCapacity, magazineReloadSeconds, playerAttackIntervalSeconds, controlledMoveSpeed, isSurvivalMode, isAimingMode, isPlayerAttackMode, isTrialMode, isAimingInfinite, isByronMode, isPierceMode, isGeneMode, aimingReactionSeconds, aimingDodgesProjectiles, aimingReactionConfig, playerMaxHealth, aimingTargetMaxHealth, restartNonce]);

  // 摇杆触摸/鼠标处理
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (mode !== "joystick" || isAimingMode || pausedRef.current) return;
    const rect = containerRef.current?.getBoundingClientRect() ?? e.currentTarget.getBoundingClientRect();
    const localX = e.clientX - rect.left;
    if (localX >= rect.width / 2) return;
    e.preventDefault();
    const js = joystickRef.current;
    if (js.active) return;
    js.active = true;
    js.touchId = e.pointerId;
    js.baseX = localX;
    js.baseY = e.clientY - rect.top;
    js.knobX = 0;
    js.knobY = 0;
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
    js.rawMagnitude = 0;
    inputRef.current.x = 0;
    inputRef.current.y = 0;
    playerMovementElapsedRef.current = 0;
    forceUpdate((n) => n + 1);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (mode !== "joystick") return;
    const js = joystickRef.current;
    if (!js.active || js.touchId !== e.pointerId) return;
    e.preventDefault();
    const rect = containerRef.current?.getBoundingClientRect() ?? e.currentTarget.getBoundingClientRect();
    let dx = e.clientX - rect.left - js.baseX;
    let dy = e.clientY - rect.top - js.baseY;
    let dist = Math.sqrt(dx * dx + dy * dy);

    // 钳制到 maxRadius 内，并同步更新 dist，保证 dx/dist 为单位向量
    if (dist > js.maxRadius) {
      dx = (dx / dist) * js.maxRadius;
      dy = (dy / dist) * js.maxRadius;
      dist = js.maxRadius;
    }

    js.knobX = dx;
    js.knobY = dy;
    // 真实归一化幅度（0~1，1=摇杆边界），用于距离分布曲线采样
    js.rawMagnitude = dist / js.maxRadius;

    // 死区外仅取方向；实际速度由起步时间决定，与推杆幅度无关。
    const deadzone = 8; // 小死区防止误触
    if (dist <= deadzone) {
      playerMovementElapsedRef.current = 0;
      inputRef.current.x = 0;
      inputRef.current.y = 0;
    } else {
      inputRef.current.x = dx / dist; // cos(angle)
      inputRef.current.y = dy / dist; // sin(angle)
    }
    forceUpdate((n) => n + 1);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (mode !== "joystick") return;
    const js = joystickRef.current;
    if (js.touchId !== e.pointerId) return;
    e.preventDefault();
    js.active = false;
    playerMovementElapsedRef.current = 0;
    js.touchId = null;
    js.knobX = 0;
    js.knobY = 0;
    js.rawMagnitude = 0;
    inputRef.current.x = 0;
    inputRef.current.y = 0;
    forceUpdate((n) => n + 1);
  };

  const handleAimPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (mode !== "joystick" || !isPlayerAttackMode || pausedRef.current) return;
    const rect = containerRef.current?.getBoundingClientRect() ?? e.currentTarget.getBoundingClientRect();
    const localX = e.clientX - rect.left;
    if (localX < rect.width / 2) return;
    e.preventDefault();
    const aim = aimJoystickRef.current;
    if (aim.active) return;
    aim.active = true;
    aim.touchId = e.pointerId;
    aim.baseX = localX;
    aim.baseY = e.clientY - rect.top;
    aim.knobX = 0;
    aim.knobY = 0;
    aim.rawMagnitude = 0;
    aim.exceededDeadzone = false;
    e.currentTarget.setPointerCapture(e.pointerId);
    forceUpdate((n) => n + 1);
  };

  const handleAimPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const aim = aimJoystickRef.current;
    if (!isPlayerAttackMode || !aim.active || aim.touchId !== e.pointerId) return;
    e.preventDefault();
    const rect = containerRef.current?.getBoundingClientRect() ?? e.currentTarget.getBoundingClientRect();
    let dx = e.clientX - rect.left - aim.baseX;
    let dy = e.clientY - rect.top - aim.baseY;
    let distance = Math.hypot(dx, dy);
    if (distance > aim.maxRadius) {
      dx = (dx / distance) * aim.maxRadius;
      dy = (dy / distance) * aim.maxRadius;
      distance = aim.maxRadius;
    }
    aim.knobX = dx;
    aim.knobY = dy;
    aim.rawMagnitude = distance / aim.maxRadius;
    if (distance > aim.maxRadius * ATTACK_AUTO_AIM_DEADZONE_RATIO) aim.exceededDeadzone = true;
    if (distance > 8) playerDirectionRef.current = Math.atan2(dy, dx);
    forceUpdate((n) => n + 1);
  };

  const handleAimPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const aim = aimJoystickRef.current;
    if (!isPlayerAttackMode || aim.touchId !== e.pointerId) return;
    e.preventDefault();
    const directionLength = Math.hypot(aim.knobX, aim.knobY);
    const deadzone = aim.maxRadius * ATTACK_AUTO_AIM_DEADZONE_RATIO;
    const cancelled = e.type === "pointercancel" || (aim.exceededDeadzone && directionLength <= deadzone);
    const target = aimingTargetRef.current;
    const bounds = visibleWorldBoundsRef.current;
    const autoAimTargetVisible = aimingTargetHealthRef.current > 0
      && target.x >= bounds.left && target.x <= bounds.right
      && target.y >= bounds.top && target.y <= bounds.bottom;
    if (!cancelled && !pausedRef.current && !countdownActiveRef.current && magazineAmmoRef.current > 0 && playerAttackCooldownRef.current <= 0) {
      const player = playerRef.current;
      const shotAngle = aim.exceededDeadzone
        ? Math.atan2(aim.knobY, aim.knobX)
        : autoAimTargetVisible
          ? Math.atan2(target.y - player.y, target.x - player.x)
          : playerMoveDirectionRef.current;
      const directAngle = autoAimTargetVisible
        ? Math.atan2(target.y - player.y, target.x - player.x)
        : shotAngle;
      const leadDegrees = Math.atan2(Math.sin(shotAngle - directAngle), Math.cos(shotAngle - directAngle)) * 180 / Math.PI;
      const maxLeadDegrees = Math.asin(Math.min(0.999, MOVE_SPEED / bulletSpeed)) * 180 / Math.PI;
      if (isAimingMode && Math.abs(leadDegrees) <= maxLeadDegrees + 0.05 && aimingLeadAnglesRef.current.length < 10_000) {
        aimingLeadAnglesRef.current.push(Math.round(leadDegrees * 10) / 10);
      }
      const isEnhancedBeaShot = isBeaMode && beaEnhancedShotsRef.current > 0;
      const isPierceLastShot = isPierceMode && magazineAmmoRef.current === 1;
      const shotSeed = bulletIdRef.current;
      const projectileAngles = attackProjectileAngles(shotAngle, isMaxMode, shotSeed);
      const texture: keyof typeof BULLET_STYLES = isBeaMode
        ? (isEnhancedBeaShot ? "beaEnhanced" : "beaNormal")
        : isMaxMode ? "max"
        : isByronMode ? "byron"
        : isPierceMode ? (isPierceLastShot ? "pierceLast" : "pierceNormal")
        : isBrockMode ? "brock"
        : isGeneMode ? "geneDirect"
        : "high";
      for (const [index, angle] of projectileAngles.entries()) {
        bulletsRef.current.push({
          x: player.x,
          y: player.y,
          vx: Math.cos(angle) * bulletSpeed,
          vy: Math.sin(angle) * bulletSpeed,
          traveled: 0,
          id: bulletIdRef.current++,
          radius: isPierceLastShot ? 110 : bulletRadius,
          texture,
          owner: "player",
          maxDistance: isGeneMode ? GENE.directRange : projectileRange,
          damageMultiplier: isGeneMode && geneHyperRemainingRef.current > 0 ? GENE.hyperDamageMultiplier : 1,
          spawnDelay: isMaxMode ? index * MAX_PROJECTILE_INTERVAL_SECONDS : 0,
        });
      }
      firedShotCountRef.current += projectileAngles.length;
      playerShotHistoryRef.current.push({ at: performance.now(), angle: shotAngle });
      if (playerShotHistoryRef.current.length > 12) playerShotHistoryRef.current.shift();
      if (isEnhancedBeaShot) beaEnhancedShotsRef.current -= 1;
      magazineAmmoRef.current -= 1;
      setMagazineAmmo(magazineAmmoRef.current);
      playerAttackCooldownRef.current = playerAttackIntervalSeconds;
    }
    aim.active = false;
    aim.touchId = null;
    aim.knobX = 0;
    aim.knobY = 0;
    aim.rawMagnitude = 0;
    aim.exceededDeadzone = false;
    forceUpdate((n) => n + 1);
  };

  const handleSuperPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isTrialMode || trialHeroId === "piper" || trialHeroId === "brock" || pausedRef.current || playerSuperChargeRef.current < 1) return;
    e.preventDefault();
    e.stopPropagation();
    const stick = superJoystickRef.current;
    if (stick.active) return;
    stick.active = true;
    stick.touchId = e.pointerId;
    stick.baseX = e.clientX;
    stick.baseY = e.clientY;
    stick.knobX = 0;
    stick.knobY = 0;
    stick.rawMagnitude = 0;
    stick.exceededDeadzone = false;
    e.currentTarget.setPointerCapture(e.pointerId);
    forceUpdate((value) => value + 1);
  };

  const handleSuperPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const stick = superJoystickRef.current;
    if (!stick.active || stick.touchId !== e.pointerId) return;
    e.preventDefault();
    e.stopPropagation();
    let dx = e.clientX - stick.baseX;
    let dy = e.clientY - stick.baseY;
    let distance = Math.hypot(dx, dy);
    if (distance > stick.maxRadius) {
      dx = dx / distance * stick.maxRadius;
      dy = dy / distance * stick.maxRadius;
      distance = stick.maxRadius;
    }
    stick.knobX = dx;
    stick.knobY = dy;
    stick.rawMagnitude = distance / stick.maxRadius;
    if (distance > stick.maxRadius * ATTACK_AUTO_AIM_DEADZONE_RATIO) stick.exceededDeadzone = true;
    forceUpdate((value) => value + 1);
  };

  const handleSuperPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const stick = superJoystickRef.current;
    if (!stick.active || stick.touchId !== e.pointerId) return;
    e.preventDefault();
    e.stopPropagation();
    const distance = Math.hypot(stick.knobX, stick.knobY);
    const deadzone = stick.maxRadius * ATTACK_AUTO_AIM_DEADZONE_RATIO;
    const cancelled = e.type === "pointercancel" || (stick.exceededDeadzone && distance <= deadzone);
    const target = aimingTargetRef.current;
    const bounds = visibleWorldBoundsRef.current;
    const autoAimTargetVisible = aimingTargetHealthRef.current > 0
      && target.x >= bounds.left && target.x <= bounds.right
      && target.y >= bounds.top && target.y <= bounds.bottom;
    if (!cancelled && !pausedRef.current && !countdownActiveRef.current && playerSuperChargeRef.current >= 1) {
      const player = playerRef.current;
      const angle = stick.exceededDeadzone
        ? Math.atan2(stick.knobY, stick.knobX)
        : autoAimTargetVisible
          ? Math.atan2(target.y - player.y, target.x - player.x)
          : playerMoveDirectionRef.current;
      if (trialHeroId === "max") {
        maxSuperRemainingRef.current = MAX_SUPER_DURATION_SECONDS;
      } else if (trialHeroId === "bea") {
        for (const omega of BEA_SUPER.angularSpeeds) {
          bulletsRef.current.push({
            x: player.x,
            y: player.y,
            vx: Math.cos(angle) * BEA_SUPER.speed * BEA_SUPER_UNIT,
            vy: Math.sin(angle) * BEA_SUPER.speed * BEA_SUPER_UNIT,
            traveled: 0,
            id: bulletIdRef.current++,
            radius: BEA_SUPER.radius * BEA_SUPER_UNIT,
            texture: "beaSuper",
            owner: "player",
            maxDistance: BEA_SUPER.range * BEA_SUPER_UNIT,
            superTrajectory: { originX: player.x, originY: player.y, angle, omega, elapsed: 0 },
          });
        }
      } else if (trialHeroId === "byron") {
        const targetDistance = Math.hypot(target.x - player.x, target.y - player.y);
        const throwDistance = stick.exceededDeadzone
          ? BYRON_SUPER_RANGE * stick.rawMagnitude
          : autoAimTargetVisible ? Math.min(BYRON_SUPER_RANGE, targetDistance) : BYRON_SUPER_RANGE;
        const impactX = Math.max(0, Math.min(MAP_WIDTH, player.x + Math.cos(angle) * throwDistance));
        const impactY = Math.max(0, Math.min(MAP_HEIGHT, player.y + Math.sin(angle) * throwDistance));
        const actualDistance = Math.hypot(impactX - player.x, impactY - player.y);
        bulletsRef.current.push({
          x: player.x,
          y: player.y,
          vx: Math.cos(angle) * BYRON_SUPER_SPEED,
          vy: Math.sin(angle) * BYRON_SUPER_SPEED,
          traveled: 0,
          id: bulletIdRef.current++,
          radius: tiles(0.3),
          texture: "byronSuper",
          owner: "player",
          maxDistance: actualDistance,
          lobbedImpact: {
            x: impactX,
            y: impactY,
            radius: BYRON_SUPER_RADIUS,
            damage: BYRON_SUPER_DAMAGE_AND_HEAL,
            heal: BYRON_SUPER_DAMAGE_AND_HEAL,
          },
        });
      } else if (trialHeroId === "pierce") {
        const targetDistance = Math.hypot(target.x - player.x, target.y - player.y);
        const aimDistance = stick.exceededDeadzone
          ? PIERCE_SUPER.range * stick.rawMagnitude
          : autoAimTargetVisible ? Math.min(PIERCE_SUPER.range, targetDistance) : PIERCE_SUPER.range;
        pierceSuperCastsRef.current.push({
          id: bulletIdRef.current++,
          x: Math.max(0, Math.min(MAP_WIDTH, player.x + Math.cos(angle) * aimDistance)),
          y: Math.max(0, Math.min(MAP_HEIGHT, player.y + Math.sin(angle) * aimDistance)),
          phase: "warning",
          remainingSeconds: PIERCE_SUPER.warningSeconds,
          lockedTargetIds: [],
        });
      } else if (trialHeroId === "gene") {
        const hypercharged = geneHyperRemainingRef.current > 0;
        for (const handAngle of geneSuperAngles(angle, hypercharged)) {
          bulletsRef.current.push({
            x: player.x, y: player.y,
            vx: Math.cos(handAngle) * GENE.superSpeed,
            vy: Math.sin(handAngle) * GENE.superSpeed,
            traveled: 0, id: bulletIdRef.current++, radius: GENE.superWidth / 2,
            texture: "geneSuper", owner: "player",
            maxDistance: hypercharged ? GENE.baseSuperRange : GENE.superRange,
            geneHyperHand: hypercharged,
          });
        }
      }
      playerSuperChargeRef.current = 0;
    }
    stick.active = false;
    stick.touchId = null;
    stick.knobX = 0;
    stick.knobY = 0;
    stick.rawMagnitude = 0;
    stick.exceededDeadzone = false;
    forceUpdate((value) => value + 1);
  };

  const handleSuperControlPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (playerSuperChargeRef.current >= 1) handleSuperPointerDown(e);
    else handleAimPointerDown(e);
  };

  const handleSuperControlPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (superJoystickRef.current.touchId === e.pointerId) handleSuperPointerMove(e);
    else if (aimJoystickRef.current.touchId === e.pointerId) handleAimPointerMove(e);
  };

  const handleSuperControlPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (superJoystickRef.current.touchId === e.pointerId) handleSuperPointerUp(e);
    else if (aimJoystickRef.current.touchId === e.pointerId) handleAimPointerUp(e);
  };

  const isControlUiTarget = (target: EventTarget | null) => target instanceof Element
    && Boolean(target.closest("button, a, input, select, textarea, [role='button'], [data-joystick-id='super']"));

  const handleGamePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (mode !== "joystick" || isControlUiTarget(e.target)) return;
    const rect = containerRef.current?.getBoundingClientRect() ?? e.currentTarget.getBoundingClientRect();
    const isLeftHalf = e.clientX - rect.left < rect.width / 2;
    if (isLeftHalf) handlePointerDown(e);
    else handleAimPointerDown(e);
  };

  const handleGamePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (joystickRef.current.touchId === e.pointerId) handlePointerMove(e);
    if (aimJoystickRef.current.touchId === e.pointerId) handleAimPointerMove(e);
  };

  const handleGamePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (joystickRef.current.touchId === e.pointerId) handlePointerUp(e);
    if (aimJoystickRef.current.touchId === e.pointerId) handleAimPointerUp(e);
  };

  const js = joystickRef.current;
  const aimJs = aimJoystickRef.current;
  const movementLayout = clampJoystick(controlLayoutRef.current.joysticks.movement, controlViewport.width, controlViewport.height);
  const attackLayout = clampJoystick(controlLayoutRef.current.joysticks.attack, controlViewport.width, controlViewport.height);
  const superLayout = clampJoystick(controlLayoutRef.current.joysticks.super, controlViewport.width, controlViewport.height);
  const hyperLayout = clampJoystick(controlLayoutRef.current.joysticks.hyper, controlViewport.width, controlViewport.height, "hyper");
  const displayedMovementLayout = js.active
    ? { ...movementLayout, x: js.baseX / controlViewport.width, y: js.baseY / controlViewport.height }
    : movementLayout;
  const displayedAttackLayout = aimJs.active
    ? { ...attackLayout, x: aimJs.baseX / controlViewport.width, y: aimJs.baseY / controlViewport.height }
    : attackLayout;
  js.maxRadius = joystickDiameter(movementLayout, controlViewport.width, controlViewport.height) * 0.39;
  aimJs.maxRadius = joystickDiameter(attackLayout, controlViewport.width, controlViewport.height) * 0.39;
  superJoystickRef.current.maxRadius = joystickDiameter(superLayout, controlViewport.width, controlViewport.height) * 0.39;

  const endSnapshot: TrainingSnapshot = {
    stickMag: profilerRef.current?.samplesStickMag ?? [],
    reactionMs: profilerRef.current?.samplesReactionMs ?? [],
    turnIntervalMs: profilerRef.current?.samplesTurnIntervalMs ?? [],
    aimLeadDeg: aimingLeadAnglesRef.current,
    emptyAmmoRatio: aimingElapsedSecondsRef.current > 0
      ? aimingEmptyAmmoSecondsRef.current / aimingElapsedSecondsRef.current
      : 0,
    damagePerSecond: aimingElapsedSecondsRef.current > 0
      ? totalDamageRef.current / aimingElapsedSecondsRef.current
      : 0,
    totalDamage: totalDamageRef.current,
    hitRate: firedShotCountRef.current > 0
      ? hitCountRef.current / firedShotCountRef.current
      : 0,
    score: scoreRef.current,
    aiScore: aiScoreRef.current,
  };
  const aimingMaxLeadDeg = Math.floor(Math.asin(Math.min(0.999, MOVE_SPEED / bulletSpeed)) * 180 / Math.PI * 10) / 10;

  return (
    <div
      ref={containerRef}
      className="training-game"
      style={{
        position: "fixed",
        inset: 0,
        overflow: "hidden",
        touchAction: "none",
        userSelect: "none",
      }}
      onPointerDown={handleGamePointerDown}
      onPointerMove={handleGamePointerMove}
      onPointerUp={handleGamePointerUp}
      onPointerCancel={handleGamePointerUp}
    >
      <canvas ref={canvasRef} style={{ display: "block" }} />

      {countdown !== null && !roundResult && (
        <div className="training-countdown" role="status" aria-live="assertive" aria-label={`训练将在 ${countdown} 秒后开始`}>
          <span key={countdown}>{countdown}</span>
        </div>
      )}

      {!isAimingMode && !isTrialMode && (
        <div className="training-survival-status" aria-live="polite">
          <div className="training-survival-time">积分 {score.toFixed(1)}</div>
        </div>
      )}
      {isAimingMode && (
        <div className="training-survival-status" aria-live="polite">
          <div className="training-survival-time">人机积分 {aiScore.toFixed(1)}</div>
        </div>
      )}

      {/* 顶部信息栏 */}
      <div
        className="training-hud"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          padding: "0.75rem 1rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: "1rem",
          background: "transparent",
          pointerEvents: "none",
          zIndex: 2,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
            {/* 受击计数器（左上角） */}
            {isSurvivalMode && <div
              style={{
                background: "rgba(255, 82, 82, 0.15)",
                border: "1px solid rgba(255, 82, 82, 0.45)",
                color: "#ff8a80",
                fontWeight: 800,
                padding: "0.35rem 0.8rem",
                borderRadius: "999px",
                fontSize: "0.9rem",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              受击次数: {hitCount}
            </div>}
          </div>
        </div>

        <div className="training-hud-actions" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <div className="training-control-label" style={{ fontSize: "0.8rem", color: "#8899aa", whiteSpace: "nowrap" }}>
            操作方式: {isTrialMode ? "移动、普攻与大招摇杆" : isAimingMode ? "右侧攻击摇杆" : mode === "joystick" ? "触控摇杆" : "键盘 WASD"}
          </div>
          <button
            onClick={toggleFullscreen}
            title={isFullscreen ? "退出全屏" : "进入全屏并隐藏浏览器栏"}
            style={{
              background: isFullscreen ? "rgba(105, 240, 174, 0.16)" : "rgba(255, 255, 255, 0.08)",
              color: isFullscreen ? "#69f0ae" : "var(--text)",
              border: `1px solid ${isFullscreen ? "rgba(105, 240, 174, 0.55)" : "var(--border)"}`,
              padding: "0.4rem 0.8rem",
              borderRadius: "8px",
              fontWeight: 800,
              fontSize: "0.85rem",
              pointerEvents: "auto",
              whiteSpace: "nowrap",
            }}
          >
            {isFullscreen ? "▣ 退出全屏" : "⛶ 全屏"}
          </button>
          <button
            onClick={togglePause}
            style={{
              background: paused
                ? "linear-gradient(135deg, #66bb6a, #43a047)"
                : "rgba(79, 195, 247, 0.14)",
              color: paused ? "#ffffff" : "#4fc3f7",
              border: paused
                ? "1px solid rgba(102, 187, 106, 0.7)"
                : "1px solid rgba(79, 195, 247, 0.5)",
              padding: "0.4rem 0.9rem",
              borderRadius: "10px",
              fontWeight: 800,
              fontSize: "0.85rem",
              pointerEvents: "auto",
              boxShadow: paused ? "0 2px 10px rgba(67, 160, 71, 0.4)" : "none",
            }}
          >
            {paused ? "▶ 继续" : "⏸ 暂停"}
          </button>
          <button
            onClick={endTraining}
            style={{
              background: "rgba(255, 152, 0, 0.13)",
              color: "#ffcc80",
              border: "1px solid rgba(255, 152, 0, 0.45)",
              padding: "0.4rem 0.8rem",
              borderRadius: "8px",
              fontWeight: 800,
              fontSize: "0.85rem",
              pointerEvents: "auto",
              whiteSpace: "nowrap",
            }}
          >
            结束本局
          </button>
        </div>
      </div>

      {roundResult && (
        <div className="training-game-over">
          <div className="training-game-over-card training-game-over-card-wide">
            <div className={`training-game-over-title ${roundResult === "victory" ? "victory" : ""}`}>
              {roundResult === "victory"
                ? isTrialMode ? "目标已击破" : "预判命中，训练胜利！"
                : isAimingMode && roundResult === "defeat" ? "人机达到 15 分，挑战失败" : "本轮结束"}
            </div>
            <div className="training-game-over-time">
              {isTrialMode
                ? `累计造成 ${totalDamage} 点伤害 · 目标剩余 ${Math.round(aimingTargetHealthRef.current)} 生命`
                : isAimingInfinite
                ? `累计造成 ${totalDamage} 点伤害 · 人机积分 ${aiScore.toFixed(1)}`
                : roundResult === "victory"
                ? `成功击败移动目标 · 人机积分 ${aiScore.toFixed(1)}`
                : isAimingMode && roundResult === "defeat"
                ? `人机积分 ${aiScore.toFixed(1)} / 15`
                : isSurvivalMode ? `最终积分 ${score.toFixed(1)}` : `本局积分 ${score.toFixed(1)}`}
            </div>
            {!isTrialMode && <TrainingStatsGrid
              snapshot={endSnapshot}
              aiming={isAimingMode}
              mode={mode}
              reactionWindowMaxMs={reactionWindowMaxMs}
              aimingMaxLeadDeg={aimingMaxLeadDeg}
              showEmptyAmmoRatio={speedTier === "high"}
            />}
            <button
              className="btn-primary"
              onClick={() => {
                pausedRef.current = false;
                setPaused(false);
                setRestartNonce((value) => value + 1);
              }}
            >
              再来一次
            </button>
            <button className="btn-secondary" onClick={() => navigate(isTrialMode ? "/character-trial" : isAimingMode ? "/offline-aiming" : "/offline-training")}>返回设置</button>
          </div>
        </div>
      )}

      {/* 摇杆区 */}
      {mode === "joystick" && !isAimingMode && (
        <AdjustableJoystick
          id="movement"
          layout={displayedMovementLayout}
          viewport={controlViewport}
          selected={false}
          knob={{ x: js.knobX, y: js.knobY }}
          active={js.active}
        />
      )}

      {isPlayerAttackMode && (
        <AdjustableJoystick
          id="attack"
          layout={displayedAttackLayout}
          viewport={controlViewport}
          selected={false}
          knob={{ x: aimJs.knobX, y: aimJs.knobY }}
          active={aimJs.active}
        />
      )}

      {isTrialMode && trialHeroId !== "piper" && trialHeroId !== "brock" && (
        <AdjustableJoystick
          id="super"
          layout={superLayout}
          viewport={controlViewport}
          selected={false}
          knob={{ x: superJoystickRef.current.knobX, y: superJoystickRef.current.knobY }}
          active={superJoystickRef.current.active}
          charge={playerSuperChargeRef.current}
          onPointerDown={handleSuperControlPointerDown}
          onPointerMove={handleSuperControlPointerMove}
          onPointerUp={handleSuperControlPointerUp}
        />
      )}

      {isTrialMode && isGeneMode && (
        <button
          type="button"
          aria-label={geneHyperRemainingRef.current > 0 ? "超充生效中" : `基恩超充 ${Math.round(geneHyperChargeRef.current * 100)}%`}
          disabled={geneHyperChargeRef.current < 1 || geneHyperRemainingRef.current > 0 || paused}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={() => {
            if (pausedRef.current || geneHyperChargeRef.current < 1 || geneHyperRemainingRef.current > 0) return;
            geneHyperChargeRef.current = 0;
            geneHyperRemainingRef.current = GENE.hyperDurationSeconds;
            forceUpdate((value) => value + 1);
          }}
          style={{
            position: "absolute",
            left: hyperLayout.x * controlViewport.width,
            top: hyperLayout.y * controlViewport.height,
            transform: "translate(-50%, -50%)",
            zIndex: 6,
            width: hyperButtonDiameter(hyperLayout, controlViewport.width, controlViewport.height),
            height: hyperButtonDiameter(hyperLayout, controlViewport.width, controlViewport.height),
            borderRadius: "50%",
            border: "3px solid #2c194e",
            background: geneHyperRemainingRef.current > 0 ? "#9c4bff"
              : `conic-gradient(#ba65ff ${geneHyperChargeRef.current * 100}%, #332346 0)`,
            boxShadow: "0 2px 9px #21132caa",
            opacity: geneHyperChargeRef.current >= 1 || geneHyperRemainingRef.current > 0 ? 1 : 0.8,
            touchAction: "none",
          }}
        />
      )}

      {/* 键盘操作提示 */}
      {mode === "keyboard" && !isAimingMode && (
        <div
          className="training-pause-backdrop"
          style={{
            position: "absolute",
            bottom: "1.5rem",
            left: "50%",
            transform: "translateX(-50%)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "0.3rem",
            opacity: 0.6,
            pointerEvents: "none",
          }}
        >
          <div
            className="training-pause-card"
            style={{
              width: 48,
              height: 48,
              background: "var(--surface2)",
              border: "2px solid var(--border)",
              borderRadius: 10,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 800,
              fontSize: "1.1rem",
            }}
          >
            W
          </div>
          <div style={{ display: "flex", gap: "0.3rem" }}>
            {["A", "S", "D"].map((k) => (
              <div
                key={k}
                style={{
                  width: 48,
                  height: 48,
                  background: "var(--surface2)",
                  border: "2px solid var(--border)",
                  borderRadius: 10,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 800,
                  fontSize: "1.1rem",
                }}
              >
                {k}
              </div>
            ))}
          </div>
        </div>
      )}
      {/* 暂停面板：显示三张分布曲线 */}
      {paused && pauseSnapshot && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(10, 14, 20, 0.82)",
            backdropFilter: "blur(4px)",
            zIndex: 10,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
          }}
          onClick={(e) => {
            // 点击遮罩外部继续？保险起见只让按钮控制
            e.stopPropagation();
          }}
        >
          <div
            style={{
              width: "min(1080px, 100%)",
              maxHeight: "94%",
              overflowY: "auto",
              background: "#121a26",
              border: "1px solid rgba(79, 195, 247, 0.28)",
              borderRadius: 18,
              padding: "1.5rem 1.5rem 1.25rem",
              boxShadow: "0 16px 50px rgba(0,0,0,0.55)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <div>
                <div style={{ fontSize: "1.2rem", fontWeight: 900, color: "#ffffff" }}>{isTrialMode ? "角色试用已暂停" : "训练数据分布"}</div>
                <div style={{ fontSize: "0.8rem", color: "#8899aa", marginTop: 2 }}>
                  点击「继续」返回战斗
                </div>
              </div>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button
                  onClick={togglePause}
                  style={{
                    background: "linear-gradient(135deg, #66bb6a, #43a047)",
                    color: "#fff",
                    border: "none",
                    padding: "0.5rem 1.1rem",
                    borderRadius: 10,
                    fontWeight: 800,
                    fontSize: "0.9rem",
                    cursor: "pointer",
                    boxShadow: "0 3px 12px rgba(67, 160, 71, 0.45)",
                  }}
                >
                  ▶ 继续训练
                </button>
              </div>
            </div>

            {!isTrialMode && <TrainingStatsGrid
              snapshot={pauseSnapshot}
              aiming={isAimingMode}
              mode={mode}
              reactionWindowMaxMs={reactionWindowMaxMs}
              aimingMaxLeadDeg={aimingMaxLeadDeg}
              showEmptyAmmoRatio={speedTier === "high"}
            />}
          </div>
        </div>
      )}
    </div>
  );
}

// ======= 自绘分布图（Canvas 区间频率曲线） =======
function TrainingStatsGrid({ snapshot, aiming, mode, reactionWindowMaxMs, aimingMaxLeadDeg, showEmptyAmmoRatio }: {
  snapshot: TrainingSnapshot;
  aiming: boolean;
  mode: ControlMode;
  reactionWindowMaxMs: number;
  aimingMaxLeadDeg: number;
  showEmptyAmmoRatio: boolean;
}) {
  if (aiming) {
    return (
      <div className="training-chart-grid training-aiming-stats-grid">
        <DistChartCard
          title="数据1 · 预判偏角分布"
          subtitle={`出射方向相对目标直线方向；有效区间 ±${aimingMaxLeadDeg.toFixed(1)}°，最小单位 0.1°`}
          accent="#4fc3f7"
          samples={snapshot.aimLeadDeg}
          xLabel="预判偏角 (°)"
          xMin={-aimingMaxLeadDeg}
          xMax={aimingMaxLeadDeg}
          bins={Math.max(2, Math.ceil(aimingMaxLeadDeg * 20))}
          unitLabel="°"
          decimals={1}
        />
        <div className="training-ratio-card">
          <div className="training-ratio-title">数据2 · 人机积分</div>
          <div className="training-ratio-value">{snapshot.aiScore.toFixed(1)}</div>
          <div className="training-ratio-note">拾取星星获得；距离射击者越近，单颗积分越高</div>
        </div>
        <div className="training-ratio-card">
          <div className="training-ratio-title">数据3 · 总伤害</div>
          <div className="training-ratio-value">{Math.round(snapshot.totalDamage)}</div>
          <div className="training-ratio-note">仅在暂停或本局结束后的数据面板中展示</div>
        </div>
        <div className="training-ratio-card">
          <div className="training-ratio-title">数据4 · DPS</div>
          <div className="training-ratio-value">{snapshot.damagePerSecond.toFixed(1)}</div>
          <div className="training-ratio-note">累计造成伤害 ÷ 本局有效训练时间（暂停时间不计入）</div>
        </div>
        <div className="training-ratio-card">
          <div className="training-ratio-title">数据5 · 命中率</div>
          <div className="training-ratio-value">{(snapshot.hitRate * 100).toFixed(1)}%</div>
          <div className="training-ratio-track"><span style={{ width: `${Math.min(100, snapshot.hitRate * 100)}%` }} /></div>
          <div className="training-ratio-note">命中子弹数 ÷ 发射子弹数；仅在暂停或本局结束后展示</div>
        </div>
        {showEmptyAmmoRatio && (
          <div className="training-ratio-card">
            <div className="training-ratio-title">数据6 · 零子弹状态时长占比</div>
            <div className="training-ratio-value">{(snapshot.emptyAmmoRatio * 100).toFixed(1)}%</div>
            <div className="training-ratio-track"><span style={{ width: `${Math.min(100, snapshot.emptyAmmoRatio * 100)}%` }} /></div>
            <div className="training-ratio-note">仅佩佩：玩家持有子弹量小于 1 的时间 ÷ 本局有效训练时间</div>
          </div>
        )}
      </div>
    );
  }
  return (
    <div className="training-chart-grid">
      <div className="training-ratio-card">
        <div className="training-ratio-title">本局积分</div>
        <div className="training-ratio-value">{snapshot.score.toFixed(1)}</div>
        <div className="training-ratio-note">拾取星星获得；走位训练以积分作为最终成绩</div>
      </div>
      {mode === "joystick" && (
        <DistChartCard
          title="数据1 · 摇杆触控点分布"
          subtitle="1.0 = 摇杆边界；排除松开 & 极小死区"
          accent="#4fc3f7"
          samples={snapshot.stickMag}
          xLabel="摇杆到中心距离 (归一化)"
          xMin={0}
          xMax={1.05}
          bins={22}
          unitLabel=""
        />
      )}
      <DistChartCard
        title={`数据${mode === "joystick" ? 2 : 1} · 反应时间分布`}
        subtitle={`子弹进入视野 → 首次转向；当前档最大窗口 ${reactionWindowMaxMs.toFixed(0)} ms`}
        accent="#ffb74d"
        samples={snapshot.reactionMs}
        xLabel="反应时间 (ms)"
        xMin={120}
        xMax={reactionWindowMaxMs}
        bins={24}
        unitLabel=" ms"
      />
      <DistChartCard
        title={`数据${mode === "joystick" ? 3 : 2} · 变向时间分布`}
        subtitle="统计每两次转向间的时间间隔分布"
        accent="#ba68c8"
        samples={snapshot.turnIntervalMs}
        xLabel="时间间隔 (ms)"
        xMin={80}
        xMax={4200}
        bins={24}
        unitLabel=" ms"
      />
    </div>
  );
}

type DistChartCardProps = {
  title: string;
  subtitle?: string;
  accent: string;
  samples: number[];
  xLabel: string;
  xMin: number;
  xMax: number;
  bins: number;
  unitLabel?: string;
  decimals?: number;
};

function DistChartCard({
  title,
  subtitle,
  accent,
  samples,
  xLabel,
  xMin,
  xMax,
  bins,
  unitLabel = "",
  decimals = 0,
}: DistChartCardProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const cssW = canvas.clientWidth;
    const cssH = 220;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = cssW * dpr;
    canvas.height = cssH * dpr;
    canvas.style.height = cssH + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    drawDistributionChart(ctx, {
      width: cssW,
      height: cssH,
      samples,
      xMin,
      xMax,
      bins,
      accent,
      xLabel,
      unitLabel,
    });
  }, [samples, xMin, xMax, bins, accent, xLabel, unitLabel]);

  // 统计卡片与图形使用完全相同的有效区间，避免“图外样本”影响均值/中位数。
  const effectiveSamples = samples.filter((v) => Number.isFinite(v) && v >= xMin && v <= xMax);
  const n = effectiveSamples.length;
  const sorted = n > 0 ? [...effectiveSamples].sort((a, b) => a - b) : [];
  const mean = n > 0 ? effectiveSamples.reduce((a, b) => a + b, 0) / n : NaN;
  const p50 = n > 0 ? sorted[Math.floor(n * 0.5)] : NaN;

  return (
    <div
      style={{
        background: "rgba(22, 32, 49, 0.85)",
        border: "1px solid rgba(79, 195, 247, 0.18)",
        borderRadius: 14,
        padding: "1rem 1rem 1.1rem",
        display: "flex",
        flexDirection: "column",
        gap: "0.6rem",
      }}
    >
      <div>
        <div style={{ fontSize: "0.95rem", fontWeight: 800, color: "#eaf3fb" }}>{title}</div>
        {subtitle && <div style={{ fontSize: "0.72rem", color: "#8899aa", marginTop: 2 }}>{subtitle}</div>}
      </div>
      <canvas ref={canvasRef} style={{ width: "100%", display: "block" }} />
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", fontSize: "0.72rem", color: "#b0bec5" }}>
        <StatChip label="样本数" value={`${n}`} accent={accent} />
        {!isNaN(mean) && <StatChip label="均值" value={`${mean.toFixed(decimals)}${unitLabel}`} />}
        {!isNaN(p50) && <StatChip label="中位数" value={`${p50.toFixed(decimals)}${unitLabel}`} />}
      </div>
    </div>
  );
}

function StatChip({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.04)",
        border: `1px solid ${accent ? accent + "55" : "rgba(79,195,247,0.25)"}`,
        borderRadius: 8,
        padding: "0.2rem 0.55rem",
        display: "flex",
        gap: "0.3rem",
      }}
    >
      <span style={{ color: "#7d8fa2" }}>{label}</span>
      <span style={{ fontWeight: 800, color: "#ffffff", fontVariantNumeric: "tabular-nums" }}>{value}</span>
    </div>
  );
}

type DrawArgs = {
  width: number;
  height: number;
  samples: number[];
  xMin: number;
  xMax: number;
  bins: number;
  accent: string;
  xLabel: string;
  unitLabel: string;
};

function drawDistributionChart(ctx: CanvasRenderingContext2D, a: DrawArgs) {
  const { width, height, samples, xMin, xMax, bins, accent, xLabel, unitLabel } = a;

  // 布局
  const padL = 42, padR = 10, padT = 14, padB = 34;
  const plotW = width - padL - padR;
  const plotH = height - padT - padB;

  // 背景
  ctx.fillStyle = "rgba(15, 21, 30, 0.6)";
  roundRect(ctx, 0, 0, width, height, 8);
  ctx.fill();

  // 坐标映射
  const xToPx = (x: number) => padL + ((x - xMin) / (xMax - xMin)) * plotW;

  // ===== 1) 过滤有效样本 =====
  const eff: number[] = [];
  for (const v of samples) if (Number.isFinite(v) && v >= xMin && v <= xMax) eff.push(v);
  const n = eff.length;

  // ===== 2) 真实区间频率 =====
  // 连续值几乎不会精确重复，因此以等宽区间作为“值域单位”；每一点就是该区间
  // 样本数 / 当前图内有效样本总数，不做平滑、核估计或峰值归一化。
  const binWidth = (xMax - xMin) / bins;
  const frequencyPct = new Array<number>(bins).fill(0);
  if (n > 0) {
    for (const sample of eff) {
      const rawIndex = Math.floor((sample - xMin) / binWidth);
      const index = Math.max(0, Math.min(bins - 1, rawIndex));
      frequencyPct[index] += 100 / n;
    }
  }

  const frequencyMax = Math.max(0, ...frequencyPct);
  const niceSteps = [1, 2, 5, 10, 20, 25, 50, 100];
  const yMaxPct = niceSteps.find((step) => step >= frequencyMax * 1.12) ?? 100;
  const yScale = plotH / yMaxPct;

  // ===== 3) 网格与相对密度 Y 轴 =====
  ctx.save();
  ctx.strokeStyle = "rgba(255,255,255,0.05)";
  ctx.lineWidth = 1;
  // 0~当前真实峰值上界分成四个等距刻度。
  const yTickCount = 4;
  const yStep = yMaxPct / yTickCount;
  for (let i = 0; i <= yTickCount; i++) {
    const pctTick = yStep * i;
    const y = padT + plotH - pctTick * yScale;
    ctx.beginPath();
    ctx.moveTo(padL, y);
    ctx.lineTo(padL + plotW, y);
    ctx.stroke();
  }

  // X 轴
  ctx.strokeStyle = "rgba(255,255,255,0.12)";
  ctx.beginPath();
  ctx.moveTo(padL, padT + plotH);
  ctx.lineTo(padL + plotW, padT + plotH);
  ctx.stroke();

  // X 刻度
  ctx.fillStyle = "#7d8fa2";
  ctx.font = "10px 'Nunito', system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  const xTickCount = 4;
  for (let i = 0; i <= xTickCount; i++) {
    const x = xMin + ((xMax - xMin) * i) / xTickCount;
    const px = xToPx(x);
    ctx.fillText(formatTick(x, unitLabel), px, padT + plotH + 6);
  }
  // X 轴标签
  ctx.fillStyle = "#8899aa";
  ctx.font = "11px 'Nunito', system-ui, sans-serif";
  ctx.fillText(xLabel, padL + plotW / 2, padT + plotH + 20);

  // Y 轴刻度：每个值域区间的真实样本占比。
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  for (let i = 0; i <= yTickCount; i++) {
    const pctTick = yStep * i;
    const y = padT + plotH - pctTick * yScale;
    ctx.fillStyle = "#6e7e91";
    const txt =
      pctTick === 0
        ? "0%"
        : pctTick < 1
        ? `${pctTick.toFixed(1)}%`
        : `${pctTick.toFixed(0)}%`;
    ctx.fillText(txt, padL - 6, y);
  }
  // Y 轴标签明确说明折线点的统计含义。
  ctx.save();
  ctx.translate(10, padT + plotH / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillStyle = "#8899aa";
  ctx.font = "10px 'Nunito', system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("区间样本占比 (%)", 0, 0);
  ctx.restore();
  ctx.restore();

  // ===== 5) 真实频率折线 =====
  if (n >= 3) {
    ctx.save();
    // 填充
    ctx.beginPath();
    ctx.moveTo(padL, padT + plotH);
    for (let i = 0; i < bins; i++) {
      const xv = xMin + (i + 0.5) * binWidth;
      const px = xToPx(xv);
      const py = padT + plotH - frequencyPct[i] * yScale;
      ctx.lineTo(px, py);
    }
    ctx.lineTo(padL + plotW, padT + plotH);
    ctx.closePath();
    const gradFill = ctx.createLinearGradient(0, padT, 0, padT + plotH);
    gradFill.addColorStop(0, accent + "33");
    gradFill.addColorStop(1, accent + "00");
    ctx.fillStyle = gradFill;
    ctx.fill();

    // 曲线
    ctx.beginPath();
    for (let i = 0; i < bins; i++) {
      const xv = xMin + (i + 0.5) * binWidth;
      const px = xToPx(xv);
      const py = padT + plotH - frequencyPct[i] * yScale;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.strokeStyle = accent;
    ctx.lineWidth = 2;
    ctx.shadowColor = accent;
    ctx.shadowBlur = 6;
    ctx.stroke();
    ctx.restore();
  }

  // ===== 6) 样本不足提示 =====
  if (n === 0) {
    ctx.fillStyle = "#6e7e91";
    ctx.font = "12px 'Nunito', system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("暂无有效样本 · 训练一会儿再暂停查看", padL + plotW / 2, padT + plotH / 2);
  } else if (n < 15) {
    ctx.fillStyle = "#7d8fa2";
    ctx.font = "10px 'Nunito', system-ui, sans-serif";
    ctx.textAlign = "right";
    ctx.textBaseline = "top";
    ctx.fillText("(样本较少，拟合仅供参考)", padL + plotW - 4, padT + 4);
  }
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function formatTick(v: number, unitLabel: string): string {
  if (Math.abs(v) >= 100) return `${Math.round(v)}${unitLabel}`;
  if (Math.abs(v) >= 10) return `${v.toFixed(1)}${unitLabel}`;
  return `${v.toFixed(2)}${unitLabel}`;
}
