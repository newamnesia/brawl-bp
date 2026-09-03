import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { summarizeAngleDistribution, summarizeDistribution } from "../features/training/statistics";

type ControlMode = "joystick" | "keyboard";
type TrainingMode = "practice" | "survival" | "aiming";
type AimReactionTier = "diamond" | "legendary" | "master";
type AimingRule = "infinite" | "challenge";
type TrainingSnapshot = {
  stickMag: number[];
  reactionMs: number[];
  turnIntervalMs: number[];
  aimLeadDeg: number[];
  emptyAmmoRatio: number;
  damagePerSecond: number;
};

// 地图常量
const MAP_WIDTH = 21;  // 列数（横向单位）
const MAP_HEIGHT = 33; // 行数（纵向单位）
const HORIZONTAL_VIEW_UNITS = 31.2; // 屏幕横向固定可见格数；地图在其中居中
const CAMERA_GROUND_ANGLE_DEG = 67;
const GROUND_DEPTH_PROJECTION = Math.sin((CAMERA_GROUND_ANGLE_DEG * Math.PI) / 180);
const PERSPECTIVE_WIDTH_STRENGTH = 0.16; // 上沿约窄 8%，下沿约宽 8%
const PLAYER_RADIUS = 0.5; // 玩家半径 0.5 单位
const MOVE_SPEED = 3;  // 移动速度 3 单位/秒
const MOVE_ACCELERATION_TIME = 0.1;
const MOVE_ACCELERATION = MOVE_SPEED / MOVE_ACCELERATION_TIME; // 30 单位/秒²

// 敌人 + 子弹常量
// 第10行（1-indexed）正中间方格：行9（0-indexed）中心 y=9.5；列10（0-indexed，21列正中）中心 x=10.5
const ENEMY_X = 10.5;
const ENEMY_Y = 9.5;
const ENEMY_RADIUS = 0.5;
const ENEMY_RANGE = 10;       // 射程半径
const AIMING_MIN_DISTANCE = 8;
const AIMING_MAX_DISTANCE = 10;
const AIMING_FRONT_ANGLE = -Math.PI / 2;
const AIMING_SECTOR_HALF_ANGLE = Math.PI / 4;
const AIMING_AI_TURN_RATE = 10;
const AIMING_REACTION_SECONDS: Record<AimReactionTier, number> = {
  diamond: 0.4,
  legendary: 0.28,
  master: 0.19,
};
const MAGAZINE_CAPACITY = 3;
const MAGAZINE_RELOAD_SECONDS = 1.5;
// 普通射击平均间隔 1.9s，慢于单发恢复时间 1.5s。
const FIRE_INTERVAL_MIN = 1.55;
const FIRE_INTERVAL_MAX = 2.25;
const BURST_INTERVAL_SECONDS = 0.4;
const BURST_PROBABILITY = 0.3;
const BEA_MAGAZINE_CAPACITY = 1;
const BEA_RELOAD_SECONDS = 1.0;
const BEA_FIRE_INTERVAL_MIN = 1.05;
const BEA_FIRE_INTERVAL_MAX = 1.35;
const BEA_HONEY_FIRST_TRIGGER_MS = 7000;
const BEA_HONEY_TRIGGER_INTERVAL_MS = 10000;
const BEA_HONEY_WAVE_DURATION_MS = 3000;
const BEA_HONEY_SLOW_MULTIPLIER = 0.7;
const BULLET_MAX_DIST = 10;   // 子弹最远行进 10 单位
const PLAYER_MAX_HEALTH = 6000;
const HEALTH_REGEN_DELAY_SECONDS = 3;
const HEALTH_REGEN_PER_SECOND = PLAYER_MAX_HEALTH * 0.2;
const BEA_NORMAL_DAMAGE = 1600;
const BEA_ENHANCED_DAMAGE = 4400;
const PIPER_MIN_DAMAGE = 720;
const PIPER_MAX_DAMAGE = 3600;
const DIFFICULTY_GROWTH_PER_SECOND = 0.005; // 每存活 1 秒提高 0.5%
const MAX_DIFFICULTY_MULTIPLIER = 2.5;
const BULLET_SPEED_BY_TIER: Record<string, number> = { mid: 14, high: 17.5 };
const BULLET_TEXTURES = {
  beaNormal: "/assets/projectiles/bea-normal-v4.png",
  beaEnhanced: "/assets/projectiles/bea-enhanced-v4.png",
  high: "/assets/projectiles/bullet-17-5-v4.png",
} as const;

function projectileDamage(texture: keyof typeof BULLET_TEXTURES, traveled: number): number {
  if (texture === "beaNormal") return BEA_NORMAL_DAMAGE;
  if (texture === "beaEnhanced") return BEA_ENHANCED_DAMAGE;
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
  texture: keyof typeof BULLET_TEXTURES;
  owner: "enemy" | "player";
};

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
  speed: number;    // 当前总速度（通常 = MOVE_SPEED，或更小如果在死区）
  enemyX: number;
  enemyY: number;
  bulletSpeed: number;
  shotId: number;
  now: number;
  p: Prof;
  metrics: ProfileMetrics;
}): AimPrediction {
  const { playerX, playerY, velX, velY, speed, enemyX, enemyY, bulletSpeed, shotId, now, p, metrics } = args;
  const maxFlightS = BULLET_MAX_DIST / bulletSpeed;
  const directAngle = Math.atan2(playerY - enemyY, playerX - enemyX);
  let t = Math.min(maxFlightS, Math.hypot(playerX - enemyX, playerY - enemyY) / bulletSpeed);

  // 最近持续行为优先于整局均值：超过稳定窗口后逐渐拟合为标准匀速直线运动。
  // 约 1.5 秒无有效转向时达到完全拟合，避免刚按下方向键就产生过大的瞬时提前量。
  const stableTravelS = speed < INPUT_DEADZONE_MAG ? 0 : Math.max(0, now - p.stableDirectionSince) / 1000;
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
    const movingScale = speed < INPUT_DEADZONE_MAG ? 0 : motionGain;
    predX = playerX + predictedVelX * movingScale * t;
    predY = playerY + predictedVelY * movingScale * t;
    predX = Math.max(PLAYER_RADIUS, Math.min(MAP_WIDTH - PLAYER_RADIUS, predX));
    predY = Math.max(PLAYER_RADIUS, Math.min(MAP_HEIGHT - PLAYER_RADIUS, predY));
    t = Math.min(maxFlightS, Math.hypot(predX - enemyX, predY - enemyY) / bulletSpeed);
  }

  const rawLeadAngle = Math.atan2(predY - enemyY, predX - enemyX);
  // 玩家速度 / 子弹速度决定运动学上的合理偏转上限。
  // 对匀速拦截，最大提前角为 asin(vPlayer / vBullet)；保留少量上限余量但不采样端点。
  const kinematicMaxLead = Math.asin(Math.min(0.98, MOVE_SPEED / bulletSpeed));
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
  const aimDist = Math.min(BULLET_MAX_DIST, Math.hypot(predX - enemyX, predY - enemyY));
  return {
    aimX: enemyX + Math.cos(aimAngle) * aimDist,
    aimY: enemyY + Math.sin(aimAngle) * aimDist,
    aimAngle,
    predictedX: predX,
    predictedY: predY,
    tFlight: t,
  };
}

export default function OfflineTrainingGame() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const mode = (searchParams.get("mode") as ControlMode) || "keyboard";
  const speedTier = searchParams.get("speedTier") || "mid";
  const requestedTrainingMode = searchParams.get("trainingMode");
  const trainingMode: TrainingMode = requestedTrainingMode === "survival"
    ? "survival"
    : requestedTrainingMode === "aiming" ? "aiming" : "practice";
  const isSurvivalMode = trainingMode === "survival";
  const isAimingMode = trainingMode === "aiming";
  const aimingRule: AimingRule = searchParams.get("aimingRule") === "infinite" ? "infinite" : "challenge";
  const isAimingInfinite = isAimingMode && aimingRule === "infinite";
  const requestedReactionTier = searchParams.get("reactionTier");
  const reactionTier: AimReactionTier = requestedReactionTier === "legendary" || requestedReactionTier === "master"
    ? requestedReactionTier
    : "diamond";
  const aimingReactionSeconds = AIMING_REACTION_SECONDS[reactionTier];

  // 从 URL 读取子弹速度（最小 0.01，非法时回退到当前档位，而不是固定低速）。
  const rawSpeed = parseFloat(searchParams.get("bulletSpeed") ?? "");
  const tierFallbackSpeed = BULLET_SPEED_BY_TIER[speedTier] ?? BULLET_SPEED_BY_TIER.mid;
  const bulletSpeed: number =
    Number.isFinite(rawSpeed) && rawSpeed >= 0.01 ? rawSpeed : tierFallbackSpeed;
  const isBeaMode = speedTier === "mid";
  const magazineCapacity = isBeaMode ? BEA_MAGAZINE_CAPACITY : MAGAZINE_CAPACITY;
  const magazineReloadSeconds = isBeaMode ? BEA_RELOAD_SECONDS : MAGAZINE_RELOAD_SECONDS;
  const fireIntervalMin = isBeaMode ? BEA_FIRE_INTERVAL_MIN : FIRE_INTERVAL_MIN;
  const fireIntervalMax = isBeaMode ? BEA_FIRE_INTERVAL_MAX : FIRE_INTERVAL_MAX;
  // 反应时间不可能超过子弹从出生到飞满射程的时间。
  const reactionWindowMaxMs = Math.min(REACTION_MAX_MS, (BULLET_MAX_DIST / bulletSpeed) * 1000);

  const canvasRef = useRef<HTMLCanvasElement>(null);
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
  });
  const aimingTargetRef = useRef({
    x: ENEMY_X,
    y: ENEMY_Y - 9,
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

  // 仅在离散输入事件中刷新摇杆 UI；逐帧游戏状态全部保存在 ref 中。
  const [, forceUpdate] = useState(0);
  const [hitCount, setHitCount] = useState(0);
  const [totalDamage, setTotalDamage] = useState(0);
  const [health, setHealth] = useState(PLAYER_MAX_HEALTH);
  const [survivalTime, setSurvivalTime] = useState(0);
  const [roundResult, setRoundResult] = useState<"victory" | "defeat" | "ended" | null>(null);
  const [uploadStatus, setUploadStatus] = useState<"idle" | "uploading" | "success" | "error">("idle");
  const [uploadMessage, setUploadMessage] = useState("");
  const roundIdRef = useRef(crypto.randomUUID());
  const [restartNonce, setRestartNonce] = useState(0);
  const [magazineAmmo, setMagazineAmmo] = useState(magazineCapacity);
  const [magazineReloadProgress, setMagazineReloadProgress] = useState(0);

  // 暂停状态
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(false);
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

  const uploadTrainingData = async () => {
    const profiler = profilerRef.current;
    if (!profiler || uploadStatus === "uploading" || uploadStatus === "success") return;
    setUploadStatus("uploading");
    setUploadMessage("");
    try {
      const aimingMaxLeadDeg = Math.asin(Math.min(0.999, MOVE_SPEED / bulletSpeed)) * 180 / Math.PI;
      const aimingLead = summarizeAngleDistribution(aimingLeadAnglesRef.current, aimingMaxLeadDeg);
      const response = await fetch(isAimingMode ? "/api/auth/aiming-data" : "/api/auth/training-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isAimingMode ? {
          roundId: roundIdRef.current,
          lead: aimingLead,
          emptyAmmoSeconds: speedTier === "high" ? aimingEmptyAmmoSecondsRef.current : 0,
          totalSeconds: speedTier === "high" ? aimingElapsedSecondsRef.current : 0,
          configuration: {
            trainingMode: "aiming",
            controlMode: "joystick",
            speedTier,
            character: speedTier === "high" ? "佩佩" : "贝亚",
            bulletSpeed,
            reactionTier,
            reactionSeconds: aimingReactionSeconds,
            aimingRule,
            totalDamage: totalDamageRef.current,
            result: roundResult ?? "ended",
          },
        } : {
          roundId: roundIdRef.current,
          controlMode: mode,
          stick: summarizeDistribution(mode === "joystick" ? profiler.samplesStickMag : [], 0, 1.05, 22),
          reaction: {
            ...summarizeDistribution(profiler.samplesReactionMs, 120, reactionWindowMaxMs, 24),
            max: reactionWindowMaxMs,
          },
          turn: summarizeDistribution(profiler.samplesTurnIntervalMs, 80, 4200, 24),
          configuration: {
            trainingMode,
            controlMode: mode,
            speedTier,
            character: speedTier === "high" ? "佩佩" : "贝亚",
            bulletSpeed,
            result: roundResult ?? "ended",
            survivalTime: isSurvivalMode ? survivalTimeRef.current : 0,
          },
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "上传失败");
      setUploadStatus("success");
      setUploadMessage("本局数据已上传到当前账号");
    } catch (error) {
      setUploadStatus("error");
      setUploadMessage(error instanceof Error ? error.message : "上传失败，请稍后重试");
    }
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
  const fireTimerRef = useRef(fireIntervalMin + Math.random() * (fireIntervalMax - fireIntervalMin));
  const magazineAmmoRef = useRef(magazineCapacity);
  const magazineReloadTimerRef = useRef(magazineReloadSeconds);
  const lastMagazineUiUpdateRef = useRef(0);
  const burstFollowupRef = useRef(false);
  const beaEnhancedShotsRef = useRef(0);
  const hitCountRef = useRef(0); // 与 state 同步，供循环内读取/累加
  const totalDamageRef = useRef(0);
  const bulletIdRef = useRef(1);
  const healthRef = useRef(PLAYER_MAX_HEALTH);
  const secondsSinceDamageRef = useRef(0);
  const survivalTimeRef = useRef(0);
  const lastSurvivalUiUpdateRef = useRef(0);
  const playerDirectionRef = useRef(-Math.PI / 2);
  const enemyDirectionRef = useRef(Math.PI / 2);

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

      // 按角度三角函数分解速度分量（cos/sin），总速度恒为 MOVE_SPEED
      if (x !== 0 || y !== 0) {
        const len = Math.sqrt(x * x + y * y);
        inputRef.current.x = x / len; // cos(angle)
        inputRef.current.y = y / len; // sin(angle)
      } else {
        inputRef.current.x = 0;
        inputRef.current.y = 0;
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
    let trainingElapsedMs = 0;
    let nextHoneyTriggerMs = BEA_HONEY_FIRST_TRIGGER_MS;
    let honeyWaveElapsedMs = 0;
    let honeyWaveRemainingMs = 0;
    let honeySlowRemainingMs = 0;

    // 初始化 Profiler
    profilerRef.current = createProfiler(nowStart);
    playerRef.current = isAimingMode
      ? { x: ENEMY_X, y: ENEMY_Y }
      : { x: MAP_WIDTH / 2, y: MAP_HEIGHT / 2 };
    aimingTargetRef.current = {
      x: ENEMY_X,
      y: ENEMY_Y - 9,
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
    aimingTargetHealthRef.current = PLAYER_MAX_HEALTH;
    aimingTargetSecondsSinceDamageRef.current = 0;
    playerVelocityRef.current = { x: 0, y: 0 };
    magazineAmmoRef.current = magazineCapacity;
    magazineReloadTimerRef.current = magazineReloadSeconds;
    burstFollowupRef.current = false;
    beaEnhancedShotsRef.current = 0;
    fireTimerRef.current = fireIntervalMin + Math.random() * (fireIntervalMax - fireIntervalMin);
    setMagazineAmmo(magazineCapacity);
    setMagazineReloadProgress(0);
    healthRef.current = PLAYER_MAX_HEALTH;
    secondsSinceDamageRef.current = 0;
    survivalTimeRef.current = 0;
    hitCountRef.current = 0;
    totalDamageRef.current = 0;
    setHealth(PLAYER_MAX_HEALTH);
    setSurvivalTime(0);
    setHitCount(0);
    setTotalDamage(0);
    setRoundResult(null);
    setUploadStatus("idle");
    setUploadMessage("");
    roundIdRef.current = crypto.randomUUID();
    aimingLeadAnglesRef.current = [];
    aimingElapsedSecondsRef.current = 0;
    aimingEmptyAmmoSecondsRef.current = 0;
    playerDirectionRef.current = -Math.PI / 2;
    enemyDirectionRef.current = Math.PI / 2;

    const projectileImages: Partial<Record<keyof typeof BULLET_TEXTURES, HTMLImageElement>> = {};
    if (isBeaMode) {
      projectileImages.beaNormal = new Image();
      projectileImages.beaEnhanced = new Image();
      projectileImages.beaNormal.src = BULLET_TEXTURES.beaNormal;
      projectileImages.beaEnhanced.src = BULLET_TEXTURES.beaEnhanced;
    } else {
      projectileImages.high = new Image();
      projectileImages.high.src = BULLET_TEXTURES.high;
    }
    const hitParticles: HitParticle[] = [];

    const spawnHitParticles = (x: number, y: number) => {
      const count = 7 + Math.floor(Math.random() * 4);
      for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.45;
        const speed = 2.2 + Math.random() * 2.4;
        const maxLife = 0.28 + Math.random() * 0.22;
        hitParticles.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: maxLife,
          maxLife,
          size: 0.055 + Math.random() * 0.07,
        });
      }
    };

    // 缩放因子
    let scale = 1;
    let scaleY = GROUND_DEPTH_PROJECTION;
    let offsetX = 0;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const cssWidth = container.clientWidth;
      const cssHeight = container.clientHeight;

      canvas.width = cssWidth * dpr;
      canvas.height = cssHeight * dpr;
      canvas.style.width = cssWidth + "px";
      canvas.style.height = cssHeight + "px";

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // 横向固定展示 31.2 格。21 格地图居中，两侧各留出 5.1 格背景视野；
      // 纵向沿用同一单位缩放比例，并继续由相机跟随玩家。
      scale = cssWidth / HORIZONTAL_VIEW_UNITS;
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

      if (!pausedRef.current) {
        // —— 逻辑更新（暂停时跳过） ——
        // 更新玩家位置
        const input = inputRef.current;
        const player = playerRef.current;
        const prof = profilerRef.current!;

        const velocity = playerVelocityRef.current;
        if (isBeaMode && !isAimingMode) {
          trainingElapsedMs += dtMs;
          if (honeyWaveRemainingMs > 0) {
            honeyWaveRemainingMs = Math.max(0, honeyWaveRemainingMs - dtMs);
            honeyWaveElapsedMs = Math.min(BEA_HONEY_WAVE_DURATION_MS, honeyWaveElapsedMs + dtMs);
          }
          if (trainingElapsedMs >= nextHoneyTriggerMs) {
            honeyWaveElapsedMs = 0;
            honeyWaveRemainingMs = BEA_HONEY_WAVE_DURATION_MS;
            nextHoneyTriggerMs += BEA_HONEY_TRIGGER_INTERVAL_MS;
            const honeyDx = player.x - ENEMY_X;
            const honeyDy = player.y - ENEMY_Y;
            if (honeyDx * honeyDx + honeyDy * honeyDy <= ENEMY_RANGE * ENEMY_RANGE) {
              honeySlowRemainingMs = BEA_HONEY_WAVE_DURATION_MS;
            }
          }
          honeySlowRemainingMs = Math.max(0, honeySlowRemainingMs - dtMs);
        }
        const movementSpeed = isBeaMode && !isAimingMode && honeySlowRemainingMs > 0
          ? MOVE_SPEED * BEA_HONEY_SLOW_MULTIPLIER
          : MOVE_SPEED;
        const targetVelX = isAimingMode ? 0 : input.x * movementSpeed;
        const targetVelY = isAimingMode ? 0 : input.y * movementSpeed;
        const deltaVelX = targetVelX - velocity.x;
        const deltaVelY = targetVelY - velocity.y;
        const deltaVel = Math.hypot(deltaVelX, deltaVelY);
        const maxVelocityChange = MOVE_ACCELERATION * dt;
        if (deltaVel <= maxVelocityChange || deltaVel === 0) {
          velocity.x = targetVelX;
          velocity.y = targetVelY;
        } else {
          velocity.x += (deltaVelX / deltaVel) * maxVelocityChange;
          velocity.y += (deltaVelY / deltaVel) * maxVelocityChange;
        }
        const velX = velocity.x;
        const velY = velocity.y;
        const curSpeed = Math.hypot(velX, velY);
        if (!isAimingMode && curSpeed > 0.05) playerDirectionRef.current = Math.atan2(velY, velX);

        player.x += velX * dt;
        player.y += velY * dt;

        // 边界限制（圆心需保证半径在内）
        const clampedX = Math.max(PLAYER_RADIUS, Math.min(MAP_WIDTH - PLAYER_RADIUS, player.x));
        const clampedY = Math.max(PLAYER_RADIUS, Math.min(MAP_HEIGHT - PLAYER_RADIUS, player.y));
        if (clampedX !== player.x) velocity.x = 0;
        if (clampedY !== player.y) velocity.y = 0;
        player.x = clampedX;
        player.y = clampedY;

        if (isAimingMode) {
          const target = aimingTargetRef.current;
          const ai = aimingTargetAiRef.current;
          ai.changeTimer -= dt;
          ai.dodgeLockTimer = Math.max(0, ai.dodgeLockTimer - dt);

          // 子弹飞行达到当前段位反应时间后，选择与弹道成 90°~150° 的随机躲避方向。
          const threat = bulletsRef.current
            .filter((bullet) => bullet.owner === "player" && !ai.reactedBulletIds.has(bullet.id))
            .filter((bullet) => bullet.traveled / Math.max(0.01, Math.hypot(bullet.vx, bullet.vy)) >= aimingReactionSeconds)
            .sort((a, b) => Math.hypot(a.x - target.x, a.y - target.y) - Math.hypot(b.x - target.x, b.y - target.y))[0];
          if (threat) {
            const bulletHeading = Math.atan2(threat.vy, threat.vx);
            const evadeOffset = (Math.PI / 2 + Math.random() * Math.PI / 3) * (Math.random() < 0.5 ? -1 : 1);
            ai.desiredHeading = bulletHeading + evadeOffset;
            ai.dodgeLockTimer = 0.28;
            ai.reactedBulletIds.add(threat.id);
          } else if (ai.changeTimer <= 0 && ai.dodgeLockTimer <= 0) {
            ai.desiredHeading = Math.random() * Math.PI * 2 - Math.PI;
            ai.changeTimer = 0.3 + Math.random() * 0.7;
          }

          // 模拟手指拖动摇杆：航向以有限角速度平滑转向，不瞬间跳变。
          const headingDelta = Math.atan2(
            Math.sin(ai.desiredHeading - ai.heading),
            Math.cos(ai.desiredHeading - ai.heading),
          );
          const headingStep = Math.max(-AIMING_AI_TURN_RATE * dt, Math.min(AIMING_AI_TURN_RATE * dt, headingDelta));
          ai.heading += headingStep;

          let nextX = target.x + Math.cos(ai.heading) * MOVE_SPEED * dt;
          let nextY = target.y + Math.sin(ai.heading) * MOVE_SPEED * dt;
          const relativeX = nextX - player.x;
          const relativeY = nextY - player.y;
          const rawDistance = Math.hypot(relativeX, relativeY) || 9;
          const rawAngle = Math.atan2(relativeY, relativeX);
          const sectorOffset = Math.max(
            -AIMING_SECTOR_HALF_ANGLE,
            Math.min(AIMING_SECTOR_HALF_ANGLE, Math.atan2(Math.sin(rawAngle - AIMING_FRONT_ANGLE), Math.cos(rawAngle - AIMING_FRONT_ANGLE))),
          );
          const constrainedDistance = Math.max(AIMING_MIN_DISTANCE, Math.min(AIMING_MAX_DISTANCE, rawDistance));
          const constrainedAngle = AIMING_FRONT_ANGLE + sectorOffset;
          nextX = player.x + Math.cos(constrainedAngle) * constrainedDistance;
          nextY = player.y + Math.sin(constrainedAngle) * constrainedDistance;
          nextX = Math.max(ENEMY_RADIUS, Math.min(MAP_WIDTH - ENEMY_RADIUS, nextX));
          nextY = Math.max(ENEMY_RADIUS, Math.min(MAP_HEIGHT - ENEMY_RADIUS, nextY));

          // 靠近扇区或距离边界时提前把目标方向拉回活动区中心，下一帧仍平滑转向。
          const touchedBoundary = Math.abs(sectorOffset) >= AIMING_SECTOR_HALF_ANGLE - 0.025
            || rawDistance <= AIMING_MIN_DISTANCE + 0.04
            || rawDistance >= AIMING_MAX_DISTANCE - 0.04;
          if (touchedBoundary && ai.dodgeLockTimer <= 0) {
            const centerX = player.x + Math.cos(AIMING_FRONT_ANGLE) * 9;
            const centerY = player.y + Math.sin(AIMING_FRONT_ANGLE) * 9;
            ai.desiredHeading = Math.atan2(centerY - target.y, centerX - target.x) + (Math.random() - 0.5) * 0.35;
          }

          target.x = nextX;
          target.y = nextY;
          target.angle = Math.atan2(target.y - player.y, target.x - player.x);
          target.direction = Math.sin(ai.heading - target.angle) >= 0 ? 1 : -1;
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
          const inAttackRange = rangeDx * rangeDx + rangeDy * rangeDy <= ENEMY_RANGE * ENEMY_RANGE;
          if (inAttackRange) survivalTimeRef.current += dt;
          else survivalTimeRef.current = 0;

          secondsSinceDamageRef.current += dt;
          if (secondsSinceDamageRef.current >= HEALTH_REGEN_DELAY_SECONDS && healthRef.current < PLAYER_MAX_HEALTH) {
            healthRef.current = Math.min(PLAYER_MAX_HEALTH, healthRef.current + HEALTH_REGEN_PER_SECOND * dt);
          }
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
          if (
            !isAimingInfinite
            &&
            aimingTargetSecondsSinceDamageRef.current >= HEALTH_REGEN_DELAY_SECONDS
            && aimingTargetHealthRef.current < PLAYER_MAX_HEALTH
          ) {
            aimingTargetHealthRef.current = Math.min(
              PLAYER_MAX_HEALTH,
              aimingTargetHealthRef.current + HEALTH_REGEN_PER_SECOND * dt,
            );
          }
        }

        const difficultyMultiplier = isSurvivalMode
          ? Math.min(MAX_DIFFICULTY_MULTIPLIER, 1 + survivalTimeRef.current * DIFFICULTY_GROWTH_PER_SECOND)
          : 1;
        const currentReloadSeconds = magazineReloadSeconds / difficultyMultiplier;
        const currentFireIntervalMin = fireIntervalMin / difficultyMultiplier;
        const currentFireIntervalMax = fireIntervalMax / difficultyMultiplier;
        const currentBulletSpeed = bulletSpeed * difficultyMultiplier;

        // ======== 弹匣恢复 + 随机开火（含最多一次双发追射） ========
        if (magazineAmmoRef.current < magazineCapacity) {
          magazineReloadTimerRef.current -= dt;
          if (magazineReloadTimerRef.current <= 0) {
            magazineAmmoRef.current += 1;
            setMagazineAmmo(magazineAmmoRef.current);
            magazineReloadTimerRef.current += currentReloadSeconds;
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

        if (!isAimingMode) fireTimerRef.current -= dt;
        if (!isAimingMode && fireTimerRef.current <= 0) {
          const dx = player.x - ENEMY_X;
          const dy = player.y - ENEMY_Y;
          // 射程判定：用玩家当前位置
          if (magazineAmmoRef.current > 0 && dx * dx + dy * dy <= ENEMY_RANGE * ENEMY_RANGE) {
            const ammoBeforeShot = magazineAmmoRef.current;
            const shotId = bulletIdRef.current++;
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
              shotId,
              now,
              p: prof,
              metrics,
            });
            const ax = pred.aimX - ENEMY_X;
            const ay = pred.aimY - ENEMY_Y;
            const da = Math.hypot(ax, ay) || 1;
            const isEnhancedBeaShot = isBeaMode && beaEnhancedShotsRef.current > 0;
            const projectileTexture: keyof typeof BULLET_TEXTURES = isBeaMode
              ? isEnhancedBeaShot ? "beaEnhanced" : "beaNormal"
              : "high";
            bulletsRef.current.push({
              x: ENEMY_X,
              y: ENEMY_Y,
              vx: (ax / da) * currentBulletSpeed,
              vy: (ay / da) * currentBulletSpeed,
              traveled: 0,
              id: shotId,
              radius: isBeaMode ? 0.325 : 0.25,
              texture: projectileTexture,
              owner: "enemy",
            });
            enemyDirectionRef.current = pred.aimAngle;
            if (isEnhancedBeaShot) beaEnhancedShotsRef.current -= 1;
            magazineAmmoRef.current -= 1;
            setMagazineAmmo(magazineAmmoRef.current);

            if (burstFollowupRef.current) {
              burstFollowupRef.current = false;
              fireTimerRef.current = currentFireIntervalMin + Math.random() * (currentFireIntervalMax - currentFireIntervalMin);
            } else if (!isBeaMode && ammoBeforeShot >= 2 && Math.random() < BURST_PROBABILITY) {
              burstFollowupRef.current = true;
              fireTimerRef.current = BURST_INTERVAL_SECONDS / difficultyMultiplier;
            } else {
              fireTimerRef.current = currentFireIntervalMin + Math.random() * (currentFireIntervalMax - currentFireIntervalMin);
            }
          } else {
            // 无弹或玩家不在射程时也重新抽取等待，避免补弹瞬间固定开火。
            burstFollowupRef.current = false;
            fireTimerRef.current = currentFireIntervalMin + Math.random() * (currentFireIntervalMax - currentFireIntervalMin);
          }
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
        const viewMargin = 1;
        const viewMapLeft = (-offsetX) / scale - viewMargin;
        const viewMapRight = (cssW - offsetX) / scale + viewMargin;
        const viewMapTop = (-oY) / scaleY - viewMargin;
        const viewMapBottom = (cssH - oY) / scaleY + viewMargin;

        for (let i = bullets.length - 1; i >= 0; i--) {
          const b = bullets[i];
          const previousX = b.x;
          const previousY = b.y;
          const stepX = b.vx * dt;
          const stepY = b.vy * dt;
          b.x += stepX;
          b.y += stepY;
          b.traveled += Math.sqrt(stepX * stepX + stepY * stepY);

          // 进入视野检测（第一次）
          if (!bulletEnteredVision.has(b.id)) {
            if (
              b.x >= viewMapLeft && b.x <= viewMapRight &&
              b.y >= viewMapTop && b.y <= viewMapBottom
            ) {
              bulletEnteredVision.add(b.id);
              const projectileSpeed = Math.hypot(b.vx, b.vy) || bulletSpeed;
              const remainingLifeMs = ((BULLET_MAX_DIST - b.traveled) / projectileSpeed) * 1000;
              const baselineAngle = curSpeed >= INPUT_DEADZONE_MAG ? Math.atan2(input.y, input.x) : null;
              profileBulletEnterVision(prof, now, b.id, remainingLifeMs, baselineAngle);
            }
          }

          // 超出最大飞行距离 → 消失
          if (b.traveled >= BULLET_MAX_DIST) {
            bullets.splice(i, 1);
            profileBulletRemoved(prof, b.id);
            continue;
          }

          // 子弹运动线段 vs 目标圆，避免高速子弹单帧穿透。
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
            if (b.owner === "player") {
              spawnHitParticles(collisionTarget.x, collisionTarget.y);
              hitCountRef.current += 1;
              setHitCount(hitCountRef.current);
              if (b.texture === "beaNormal") {
                beaEnhancedShotsRef.current = 2;
              } else if (b.texture === "beaEnhanced") {
                beaEnhancedShotsRef.current = 0;
              }
              const damage = projectileDamage(b.texture, b.traveled);
              totalDamageRef.current += damage;
              setTotalDamage(Math.round(totalDamageRef.current));
              if (!isAimingInfinite) {
                aimingTargetHealthRef.current = Math.max(0, aimingTargetHealthRef.current - damage);
                aimingTargetSecondsSinceDamageRef.current = 0;
                if (aimingTargetHealthRef.current <= 0) {
                  pausedRef.current = true;
                  setRoundResult("victory");
                }
              }
              continue;
            }
            if (b.texture === "beaNormal") {
              beaEnhancedShotsRef.current = 2;
            } else if (b.texture === "beaEnhanced") {
              beaEnhancedShotsRef.current = 0;
            }
            spawnHitParticles(player.x, player.y);
            hitCountRef.current += 1;
            setHitCount(hitCountRef.current);
            if (isSurvivalMode) {
              const damage = projectileDamage(b.texture, b.traveled);
              healthRef.current = Math.max(0, healthRef.current - damage);
              secondsSinceDamageRef.current = 0;
              setHealth(Math.round(healthRef.current));
              if (healthRef.current <= 0) {
                pausedRef.current = true;
                setSurvivalTime(survivalTimeRef.current);
                setRoundResult("defeat");
              }
            }
          }
        }

        for (let i = hitParticles.length - 1; i >= 0; i--) {
          const particle = hitParticles[i];
          particle.life -= dt;
          if (particle.life <= 0) {
            hitParticles.splice(i, 1);
            continue;
          }
          particle.x += particle.vx * dt;
          particle.y += particle.vy * dt;
          const drag = Math.exp(-5 * dt);
          particle.vx *= drag;
          particle.vy *= drag;
        }
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
      for (let gx = 0; gx <= MAP_WIDTH; gx += 5) {
        ctx.moveTo(projectX(gx, 0), projectY(0));
        ctx.lineTo(projectX(gx, MAP_HEIGHT), projectY(MAP_HEIGHT));
      }
      for (let gy = 0; gy <= MAP_HEIGHT; gy += 5) {
        ctx.moveTo(projectX(0, gy), projectY(gy));
        ctx.lineTo(projectX(MAP_WIDTH, gy), projectY(gy));
      }
      ctx.stroke();

      // 细网格
      ctx.strokeStyle = "rgba(45, 63, 85, 0.4)";
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      for (let gx = 0; gx <= MAP_WIDTH; gx++) {
        ctx.moveTo(projectX(gx, 0), projectY(0));
        ctx.lineTo(projectX(gx, MAP_HEIGHT), projectY(MAP_HEIGHT));
      }
      for (let gy = 0; gy <= MAP_HEIGHT; gy++) {
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

      const renderedEnemy = isAimingMode ? aimingTargetRef.current : { x: ENEMY_X, y: ENEMY_Y };
      // 两种训练都显示 10 格子弹攻击范围，不展示目标的移动轨迹。
      const enemyCenterPx = projectX(renderedEnemy.x, renderedEnemy.y);
      const enemyCenterPy = projectY(renderedEnemy.y);
      const enemyRadiusPx = ENEMY_RADIUS * scale * widthFactorAt(renderedEnemy.y);
      const enemyRadiusPy = ENEMY_RADIUS * scaleY;
      const drawDirectionArrow = (
        worldX: number,
        worldY: number,
        centerX: number,
        centerY: number,
        radiusX: number,
        radiusY: number,
        angle: number,
        color: string,
      ) => {
        const probeX = projectX(worldX + Math.cos(angle), worldY + Math.sin(angle));
        const probeY = projectY(worldY + Math.sin(angle));
        const screenDx = probeX - centerX;
        const screenDy = probeY - centerY;
        const screenLength = Math.hypot(screenDx, screenDy) || 1;
        const nx = screenDx / screenLength;
        const ny = screenDy / screenLength;
        const boundary = 1 / Math.sqrt((nx * nx) / (radiusX * radiusX) + (ny * ny) / (radiusY * radiusY));

        // 从移动方向上的外点向判定椭圆作两条切线，并数值求解使屏幕上的箭尖内角严格为 170°。
        const tangentGeometry = (distance: number) => {
          const px = nx * distance;
          const py = ny * distance;
          const qx = px / radiusX;
          const qy = py / radiusY;
          const qLengthSq = qx * qx + qy * qy;
          const root = Math.sqrt(Math.max(0, qLengthSq - 1));
          const baseX = qx / qLengthSq;
          const baseY = qy / qLengthSq;
          const offsetX = -qy * root / qLengthSq;
          const offsetY = qx * root / qLengthSq;
          const tangent1X = (baseX + offsetX) * radiusX;
          const tangent1Y = (baseY + offsetY) * radiusY;
          const tangent2X = (baseX - offsetX) * radiusX;
          const tangent2Y = (baseY - offsetY) * radiusY;
          const vector1X = tangent1X - px;
          const vector1Y = tangent1Y - py;
          const vector2X = tangent2X - px;
          const vector2Y = tangent2Y - py;
          const cosine = Math.max(-1, Math.min(1,
            (vector1X * vector2X + vector1Y * vector2Y)
            / (Math.hypot(vector1X, vector1Y) * Math.hypot(vector2X, vector2Y) || 1),
          ));
          return { px, py, tangent1X, tangent1Y, tangent2X, tangent2Y, angle: Math.acos(cosine) };
        };

        const targetAngle = 170 * Math.PI / 180;
        let nearDistance = boundary * (1 + 1e-7);
        let farDistance = boundary * 1024;
        for (let i = 0; i < 48; i++) {
          const middleDistance = (nearDistance + farDistance) / 2;
          if (tangentGeometry(middleDistance).angle > targetAngle) nearDistance = middleDistance;
          else farDistance = middleDistance;
        }
        const arrow = tangentGeometry((nearDistance + farDistance) / 2);
        const tipX = centerX + arrow.px;
        const tipY = centerY + arrow.py;
        const tangent1X = centerX + arrow.tangent1X;
        const tangent1Y = centerY + arrow.tangent1Y;
        const tangent2X = centerX + arrow.tangent2X;
        const tangent2Y = centerY + arrow.tangent2Y;

        ctx.save();
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = "source-over";
        ctx.strokeStyle = "rgba(5, 8, 12, 0.96)";
        ctx.lineWidth = 6;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.beginPath();
        ctx.moveTo(tangent1X, tangent1Y);
        ctx.lineTo(tipX, tipY);
        ctx.lineTo(tangent2X, tangent2Y);
        ctx.stroke();
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.restore();
      };
      ctx.save();
      ctx.strokeStyle = "rgba(255, 82, 82, 0.25)";
      ctx.lineWidth = 1;
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      for (let i = 0; i <= 72; i++) {
        const angle = (i / 72) * Math.PI * 2;
        const circleCenterX = isAimingMode ? player.x : ENEMY_X;
        const circleCenterY = isAimingMode ? player.y : ENEMY_Y;
        const circleRadius = isAimingMode ? BULLET_MAX_DIST : ENEMY_RANGE;
        const worldX = circleCenterX + Math.cos(angle) * circleRadius;
        const worldY = circleCenterY + Math.sin(angle) * circleRadius;
        if (i === 0) ctx.moveTo(projectX(worldX, worldY), projectY(worldY));
        else ctx.lineTo(projectX(worldX, worldY), projectY(worldY));
      }
      ctx.closePath();
      ctx.stroke();
      ctx.restore();

      // 绘制敌人（红色圆形）
      ctx.shadowColor = "#ff5252";
      ctx.shadowBlur = enemyRadiusPx * 0.8;
      ctx.fillStyle = "#ff5252";
      ctx.beginPath();
      ctx.ellipse(enemyCenterPx, enemyCenterPy, enemyRadiusPx, enemyRadiusPy, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = "#ff8a80";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(enemyCenterPx, enemyCenterPy, enemyRadiusPx, enemyRadiusPy, 0, 0, Math.PI * 2);
      ctx.stroke();

      if (isAimingMode && !isAimingInfinite) {
        const barWidth = Math.min(110, Math.max(48, scale * 2.2));
        const barHeight = 8;
        const barX = enemyCenterPx - barWidth / 2;
        const barY = projectY(renderedEnemy.y - 0.85) - barHeight;
        const healthRatio = Math.max(0, aimingTargetHealthRef.current / PLAYER_MAX_HEALTH);
        ctx.fillStyle = "rgba(8, 12, 18, 0.82)";
        ctx.fillRect(barX - 1, barY - 1, barWidth + 2, barHeight + 2);
        ctx.fillStyle = "#43a047";
        ctx.fillRect(barX, barY, barWidth * healthRatio, barHeight);
        ctx.strokeStyle = "rgba(255,255,255,0.72)";
        ctx.lineWidth = 1;
        ctx.strokeRect(barX, barY, barWidth, barHeight);
        ctx.fillStyle = "#ffffff";
        ctx.font = "700 10px 'Nunito', system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(`${Math.ceil(aimingTargetHealthRef.current)} / ${PLAYER_MAX_HEALTH}`, enemyCenterPx, barY - 4);
        ctx.textAlign = "start";
      }

      // 绘制玩家（圆）
      const playerCenterPx = projectX(player.x, player.y);
      const playerCenterPy = projectY(player.y);
      const playerRadiusPx = PLAYER_RADIUS * scale * widthFactorAt(player.y);
      const playerRadiusPy = PLAYER_RADIUS * scaleY;

      ctx.shadowColor = "#4fc3f7";
      ctx.shadowBlur = playerRadiusPx * 0.8;
      ctx.fillStyle = "#4fc3f7";
      ctx.beginPath();
      ctx.ellipse(playerCenterPx, playerCenterPy, playerRadiusPx, playerRadiusPy, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = "#81d4fa";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(playerCenterPx, playerCenterPy, playerRadiusPx, playerRadiusPy, 0, 0, Math.PI * 2);
      ctx.stroke();

      if (isAimingMode && aimJoystickRef.current.active) {
        const aim = aimJoystickRef.current;
        const aimLength = Math.hypot(aim.knobX, aim.knobY);
        if (aimLength > 8) {
          const aimEndX = player.x + (aim.knobX / aimLength) * BULLET_MAX_DIST;
          const aimEndY = player.y + (aim.knobY / aimLength) * BULLET_MAX_DIST;
          ctx.save();
          ctx.strokeStyle = "rgba(255, 213, 79, 0.72)";
          ctx.lineWidth = 2;
          ctx.setLineDash([7, 6]);
          ctx.beginPath();
          ctx.moveTo(playerCenterPx, playerCenterPy);
          ctx.lineTo(projectX(aimEndX, aimEndY), projectY(aimEndY));
          ctx.stroke();
          ctx.restore();
        }
      }

      // 绘制子弹贴图；贴图跟随弹道方向旋转，碰撞仍使用实例自身的物理半径。
      for (const b of bulletsRef.current) {
        const bx = projectX(b.x, b.y);
        const by = projectY(b.y);
        const radiusX = b.radius * scale * widthFactorAt(b.y);
        const radiusY = b.radius * scaleY;
        const image = projectileImages[b.texture];
        if (image?.complete && image.naturalWidth > 0) {
          const headingX = projectX(b.x + b.vx * 0.05, b.y + b.vy * 0.05);
          const headingY = projectY(b.y + b.vy * 0.05);
          const angle = Math.atan2(headingY - by, headingX - bx);
          // 素材包含透明发光留白，绘制范围放大到碰撞直径的 3 倍。
          const drawWidth = radiusX * 6;
          const drawHeight = radiusY * 6;
          ctx.save();
          ctx.translate(bx, by);
          ctx.rotate(angle + Math.PI / 2);
          ctx.drawImage(image, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
          ctx.restore();
        } else {
          ctx.fillStyle = b.texture === "high" ? "#70d7ff" : b.texture === "beaEnhanced" ? "#fff59d" : "#ffca28";
          ctx.beginPath();
          ctx.ellipse(bx, by, radiusX, radiusY, 0, 0, Math.PI * 2);
          ctx.fill();
        }
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
        ctx.shadowColor = "#ff1744";
        ctx.shadowBlur = radiusX * 1.5;
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

      // 贝亚蜂蜜海置于 Canvas 最顶层，覆盖地图、网格、角色、子弹及粒子。
      if (isBeaMode && !isAimingMode && honeyWaveRemainingMs > 0) {
        const waveProgress = honeyWaveElapsedMs / BEA_HONEY_WAVE_DURATION_MS;
        const fadeDurationMs = 300;
        const fadeIn = Math.min(1, honeyWaveElapsedMs / fadeDurationMs);
        const fadeOut = Math.min(1, honeyWaveRemainingMs / fadeDurationMs);
        const honeyLayerAlpha = Math.min(fadeIn, fadeOut);
        const traceHoneyCircle = (radius: number, wobble = 0) => {
          ctx.beginPath();
          for (let i = 0; i <= 96; i++) {
            const angle = i / 96 * Math.PI * 2;
            // 多组低频形变缓慢滑动，使圆环边缘像粘稠蜂蜜而非规则水波。
            const stickyOffset = wobble * (
              Math.sin(angle * 3 + waveProgress * Math.PI * 1.2) * 0.65 +
              Math.sin(angle * 7 - waveProgress * Math.PI * 0.7) * 0.35
            );
            const stickyRadius = radius * (1 + stickyOffset);
            const worldX = ENEMY_X + Math.cos(angle) * stickyRadius;
            const worldY = ENEMY_Y + Math.sin(angle) * stickyRadius;
            const px = projectX(worldX, worldY);
            const py = projectY(worldY);
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.closePath();
        };

        ctx.save();
        ctx.globalAlpha = honeyLayerAlpha;
        traceHoneyCircle(ENEMY_RANGE);
        const seaPulse = 0.16 + Math.sin(waveProgress * Math.PI * 3) * 0.025;
        ctx.fillStyle = `rgba(255, 179, 0, ${seaPulse})`;
        ctx.fill();
        ctx.shadowColor = "rgba(255, 193, 7, 0.9)";
        ctx.shadowBlur = 10;
        for (let ring = 0; ring < 4; ring++) {
          // 每次三秒动画只推进 0.75 轮，较上一版再次减半。
          const phase = (waveProgress * 0.75 + ring / 4) % 1;
          const viscousPhase = phase * phase * (3 - 2 * phase);
          const radius = ENEMY_RANGE * (0.08 + viscousPhase * 0.92);
          const wobble = 0.014 + (1 - phase) * 0.014;
          const fade = 1 - phase;

          // 后方宽阔、半透明的浪体，形成蜂蜜海浪的厚重拖尾。
          traceHoneyCircle(radius * 0.965, wobble * 1.15);
          ctx.strokeStyle = `rgba(245, 124, 0, ${0.16 * fade})`;
          ctx.lineWidth = 15 + fade * 8;
          ctx.stroke();

          // 琥珀色主浪脊。
          traceHoneyCircle(radius, wobble);
          ctx.strokeStyle = `rgba(255, 160, 0, ${0.34 * fade})`;
          ctx.lineWidth = 8 + fade * 5;
          ctx.stroke();

          // 浪峰内缘的浅金色高光。
          traceHoneyCircle(radius, wobble);
          ctx.strokeStyle = `rgba(255, 224, 130, ${0.62 * (1 - phase)})`;
          ctx.lineWidth = 2.2 + (1 - phase) * 2.8;
          ctx.stroke();

          // 浪峰前沿增加一条极细亮边，使传递方向更像海浪推进。
          traceHoneyCircle(radius * 1.012, wobble * 0.8);
          ctx.strokeStyle = `rgba(255, 248, 225, ${0.34 * fade})`;
          ctx.lineWidth = 1.2 + fade;
          ctx.stroke();
        }
        ctx.restore();
      }

      // 方向箭头统一置于所有 Canvas 内容的最终前景层，避免被子弹、粒子或蜂蜜海覆盖。
      const enemyDirection = isAimingMode
        ? aimingTargetAiRef.current.heading
        : enemyDirectionRef.current;
      drawDirectionArrow(
        renderedEnemy.x, renderedEnemy.y, enemyCenterPx, enemyCenterPy,
        enemyRadiusPx, enemyRadiusPy, enemyDirection,
        "#ff5252",
      );
      drawDirectionArrow(
        player.x, player.y, playerCenterPx, playerCenterPy,
        playerRadiusPx, playerRadiusPy, playerDirectionRef.current,
        "#4fc3f7",
      );

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
      lastMagazineUiUpdateRef.current = 0;
      burstFollowupRef.current = false;
      beaEnhancedShotsRef.current = 0;
      lastSurvivalUiUpdateRef.current = 0;
    };
  }, [mode, bulletSpeed, isSurvivalMode, isAimingMode, isAimingInfinite, aimingReactionSeconds, restartNonce]);

  // 摇杆触摸/鼠标处理
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (mode !== "joystick") return;
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const js = joystickRef.current;
    js.active = true;
    js.touchId = e.pointerId;
    js.baseX = e.clientX - rect.left;
    js.baseY = e.clientY - rect.top;
    js.knobX = 0;
    js.knobY = 0;
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
    forceUpdate((n) => n + 1);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (mode !== "joystick") return;
    const js = joystickRef.current;
    if (!js.active || js.touchId !== e.pointerId) return;
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
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

    // 更新输入：按角度分解速度分量（cos/sin），总速度恒为 MOVE_SPEED
    const deadzone = 8; // 小死区防止误触
    if (dist <= deadzone) {
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
    js.touchId = null;
    js.knobX = 0;
    js.knobY = 0;
    js.rawMagnitude = 0;
    inputRef.current.x = 0;
    inputRef.current.y = 0;
    forceUpdate((n) => n + 1);
  };

  const handleAimPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isAimingMode || pausedRef.current) return;
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const aim = aimJoystickRef.current;
    aim.active = true;
    aim.touchId = e.pointerId;
    aim.baseX = e.clientX - rect.left;
    aim.baseY = e.clientY - rect.top;
    aim.knobX = 0;
    aim.knobY = 0;
    aim.rawMagnitude = 0;
    e.currentTarget.setPointerCapture(e.pointerId);
    forceUpdate((n) => n + 1);
  };

  const handleAimPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const aim = aimJoystickRef.current;
    if (!isAimingMode || !aim.active || aim.touchId !== e.pointerId) return;
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
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
    if (distance > 8) playerDirectionRef.current = Math.atan2(dy, dx);
    forceUpdate((n) => n + 1);
  };

  const handleAimPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const aim = aimJoystickRef.current;
    if (!isAimingMode || aim.touchId !== e.pointerId) return;
    e.preventDefault();
    const directionLength = Math.hypot(aim.knobX, aim.knobY);
    if (!pausedRef.current && directionLength > 8 && magazineAmmoRef.current > 0) {
      const player = playerRef.current;
      const target = aimingTargetRef.current;
      const shotAngle = Math.atan2(aim.knobY, aim.knobX);
      const directAngle = Math.atan2(target.y - player.y, target.x - player.x);
      const leadDegrees = Math.atan2(Math.sin(shotAngle - directAngle), Math.cos(shotAngle - directAngle)) * 180 / Math.PI;
      const maxLeadDegrees = Math.asin(Math.min(0.999, MOVE_SPEED / bulletSpeed)) * 180 / Math.PI;
      if (Math.abs(leadDegrees) <= maxLeadDegrees + 0.05 && aimingLeadAnglesRef.current.length < 10_000) {
        aimingLeadAnglesRef.current.push(Math.round(leadDegrees * 10) / 10);
      }
      const isEnhancedBeaShot = isBeaMode && beaEnhancedShotsRef.current > 0;
      bulletsRef.current.push({
        x: player.x,
        y: player.y,
        vx: (aim.knobX / directionLength) * bulletSpeed,
        vy: (aim.knobY / directionLength) * bulletSpeed,
        traveled: 0,
        id: bulletIdRef.current++,
        radius: isBeaMode ? 0.325 : 0.25,
        texture: isBeaMode ? (isEnhancedBeaShot ? "beaEnhanced" : "beaNormal") : "high",
        owner: "player",
      });
      if (isEnhancedBeaShot) beaEnhancedShotsRef.current -= 1;
      magazineAmmoRef.current -= 1;
      setMagazineAmmo(magazineAmmoRef.current);
    }
    aim.active = false;
    aim.touchId = null;
    aim.knobX = 0;
    aim.knobY = 0;
    aim.rawMagnitude = 0;
    forceUpdate((n) => n + 1);
  };

  const js = joystickRef.current;
  const aimJs = aimJoystickRef.current;

  const speedTierLabel =
    speedTier === "high" ? "佩佩" : "贝亚";
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
    >
      <canvas ref={canvasRef} style={{ display: "block" }} />

      {isSurvivalMode && (
        <div className="training-survival-status" aria-live="polite">
          <div className="training-survival-time">{survivalTime.toFixed(1)}s</div>
          <>
            <div className="training-health-bar" aria-label={`生命值 ${health}/${PLAYER_MAX_HEALTH}`}>
              <span style={{ width: `${Math.max(0, health / PLAYER_MAX_HEALTH) * 100}%` }} />
            </div>
            <div className="training-health-text">{health} / {PLAYER_MAX_HEALTH}</div>
          </>
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
            <div style={{ fontWeight: 800, fontSize: "0.95rem", color: "#4fc3f7" }}>
              {isAimingMode ? "离线瞄准训练" : "离线走位训练"}
            </div>
            {/* 受击计数器（左上角） */}
            <div
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
              {isAimingMode ? "命中次数" : "受击次数"}: {hitCount}
            </div>
            {isAimingInfinite && (
              <div style={{ color: "#ffee58", fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>
                总伤害: {totalDamage}
              </div>
            )}
            <div
              style={{
                background: "rgba(255, 167, 38, 0.12)",
                border: "1px solid rgba(255, 167, 38, 0.4)",
                color: "#ffb74d",
                fontWeight: 700,
                padding: "0.3rem 0.75rem",
                borderRadius: "999px",
                fontSize: "0.82rem",
              }}
            >
              {isAimingMode ? "玩家角色" : "敌方角色"}: {speedTierLabel}
            </div>
            <div
              aria-label={`敌方弹匣 ${magazineAmmo}/${magazineCapacity}`}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.45rem",
                background: "rgba(239, 83, 80, 0.12)",
                border: "1px solid rgba(239, 83, 80, 0.42)",
                color: "#ffcdd2",
                fontWeight: 800,
                padding: "0.3rem 0.7rem",
                borderRadius: "999px",
                fontSize: "0.82rem",
              }}
            >
              <span>{isAimingMode ? "玩家弹匣" : "敌方弹匣"}</span>
              <span style={{ display: "flex", gap: "0.25rem" }}>
                {Array.from({ length: magazineCapacity }, (_, index) => (
                  <span
                    key={index}
                    style={{
                      display: "inline-block",
                      width: 7,
                      height: 15,
                      borderRadius: "4px 4px 2px 2px",
                      border: "1px solid rgba(255, 205, 210, 0.42)",
                      background: (() => {
                        const fill = index < magazineAmmo
                          ? 100
                          : index === magazineAmmo && magazineAmmo < magazineCapacity
                            ? magazineReloadProgress * 100
                            : 0;
                        return `linear-gradient(to top, #ff5252 0%, #ff5252 ${fill}%, rgba(255,255,255,0.12) ${fill}%, rgba(255,255,255,0.12) 100%)`;
                      })(),
                      boxShadow: index < magazineAmmo ? "0 0 6px rgba(255,82,82,0.75)" : "none",
                      transition: "background 40ms linear, box-shadow 120ms ease",
                      boxSizing: "border-box",
                    }}
                  />
                ))}
              </span>
              <span style={{ color: "#ef9a9a", fontVariantNumeric: "tabular-nums" }}>{magazineAmmo}/{magazineCapacity}</span>
            </div>
          </div>
        </div>

        <div className="training-hud-actions" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <div className="training-control-label" style={{ fontSize: "0.8rem", color: "#8899aa", whiteSpace: "nowrap" }}>
            操作方式: {isAimingMode ? "右侧攻击摇杆" : mode === "joystick" ? "触控摇杆" : "键盘 WASD"}
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
          <button
            onClick={() => navigate(isAimingMode ? "/offline-aiming" : "/offline-training")}
            style={{
              background: "var(--surface2)",
              color: "var(--text)",
              border: "1px solid var(--border)",
              padding: "0.4rem 0.8rem",
              borderRadius: "8px",
              fontWeight: 700,
              fontSize: "0.85rem",
              pointerEvents: "auto",
            }}
          >
            返回
          </button>
          <button
            onClick={() => navigate("/")}
            style={{
              background: "rgba(255, 255, 255, 0.08)",
              color: "var(--text)",
              border: "1px solid var(--border)",
              padding: "0.4rem 0.8rem",
              borderRadius: "8px",
              fontWeight: 700,
              fontSize: "0.85rem",
              pointerEvents: "auto",
              whiteSpace: "nowrap",
            }}
          >
            返回主菜单
          </button>
        </div>
      </div>

      {roundResult && (
        <div className="training-game-over">
          <div className="training-game-over-card training-game-over-card-wide">
            <div className={`training-game-over-title ${roundResult === "victory" ? "victory" : ""}`}>
              {roundResult === "victory" ? "预判命中，训练胜利！" : "本轮结束"}
            </div>
            <div className="training-game-over-time">
              {isAimingInfinite
                ? `累计造成 ${totalDamage} 点伤害`
                : roundResult === "victory"
                ? "成功击败移动目标"
                : isSurvivalMode ? `生存时间 ${survivalTime.toFixed(1)} 秒` : "训练已主动结束"}
            </div>
            <TrainingStatsGrid
              snapshot={endSnapshot}
              aiming={isAimingMode}
              mode={mode}
              reactionWindowMaxMs={reactionWindowMaxMs}
              aimingMaxLeadDeg={aimingMaxLeadDeg}
              showEmptyAmmoRatio={speedTier === "high"}
            />
            <button
              className="btn-secondary"
              disabled={uploadStatus === "uploading" || uploadStatus === "success"}
              onClick={uploadTrainingData}
            >
              {uploadStatus === "uploading"
                ? "上传中…"
                : uploadStatus === "success" ? "✓ 已上传本局数据" : "确认上传到当前账号"}
            </button>
            {uploadMessage && (
              <p className={`training-upload-message ${uploadStatus === "success" ? "success" : ""}`}>
                {uploadMessage}
              </p>
            )}
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
            <button className="btn-secondary" onClick={() => navigate(isAimingMode ? "/offline-aiming" : "/offline-training")}>返回设置</button>
          </div>
        </div>
      )}

      {/* 摇杆区 */}
      {mode === "joystick" && !isAimingMode && (
        <div
          className="training-joystick-zone"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          style={{
            position: "absolute",
            left: 0,
            bottom: 0,
            width: "50%",
            height: "45%",
            touchAction: "none",
          }}
        >
          <div
            style={{
              position: "absolute",
              left: js.active ? js.baseX - 70 : "clamp(1rem, 15%, 4rem)",
              top: js.active ? js.baseY - 70 : "auto",
              bottom: js.active ? "auto" : "clamp(1rem, 15%, 4rem)",
              width: 140,
              height: 140,
              borderRadius: "50%",
              background: "rgba(26, 35, 50, 0.75)",
              border: "3px solid rgba(79, 195, 247, 0.3)",
              backdropFilter: "blur(8px)",
              transition: js.active ? "none" : "left 0.2s, top 0.2s, bottom 0.2s",
              boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
            }}
          >
            <div
              style={{
                position: "absolute",
                left: 10,
                top: 10,
                width: 120,
                height: 120,
                borderRadius: "50%",
                border: "1px dashed rgba(79, 195, 247, 0.2)",
              }}
            />
            <div
              style={{
                position: "absolute",
                left: 70 + js.knobX - 28,
                top: 70 + js.knobY - 28,
                width: 56,
                height: 56,
                borderRadius: "50%",
                background: js.active
                  ? "linear-gradient(135deg, #4fc3f7, #29b6f6)"
                  : "linear-gradient(135deg, #2d3f55, #243044)",
                border: `3px solid ${js.active ? "#81d4fa" : "#3d5270"}`,
                boxShadow: js.active
                  ? "0 0 20px rgba(79, 195, 247, 0.5), inset 0 2px 4px rgba(255,255,255,0.2)"
                  : "inset 0 2px 4px rgba(255,255,255,0.05)",
                transition: js.active ? "none" : "all 0.15s",
              }}
            />
          </div>
        </div>
      )}

      {isAimingMode && (
        <div
          className="training-aim-joystick-zone"
          onPointerDown={handleAimPointerDown}
          onPointerMove={handleAimPointerMove}
          onPointerUp={handleAimPointerUp}
          onPointerCancel={handleAimPointerUp}
        >
          <div
            className="training-aim-joystick"
            style={{
              left: aimJs.active ? aimJs.baseX - 70 : "auto",
              right: aimJs.active ? "auto" : "clamp(1rem, 15%, 4rem)",
              top: aimJs.active ? aimJs.baseY - 70 : "auto",
              bottom: aimJs.active ? "auto" : "clamp(1rem, 15%, 4rem)",
            }}
          >
            <div className="training-aim-joystick-ring" />
            <div
              className="training-aim-joystick-knob"
              style={{
                left: 70 + aimJs.knobX - 28,
                top: 70 + aimJs.knobY - 28,
              }}
            />
          </div>
        </div>
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
                <div style={{ fontSize: "1.2rem", fontWeight: 900, color: "#ffffff" }}>训练数据分布</div>
                <div style={{ fontSize: "0.8rem", color: "#8899aa", marginTop: 2 }}>
                  点击「继续」可回到训练继续采样
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

            <TrainingStatsGrid
              snapshot={pauseSnapshot}
              aiming={isAimingMode}
              mode={mode}
              reactionWindowMaxMs={reactionWindowMaxMs}
              aimingMaxLeadDeg={aimingMaxLeadDeg}
              showEmptyAmmoRatio={speedTier === "high"}
            />
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
          <div className="training-ratio-title">数据2 · DPS</div>
          <div className="training-ratio-value">{snapshot.damagePerSecond.toFixed(1)}</div>
          <div className="training-ratio-note">累计造成伤害 ÷ 本局有效训练时间（暂停时间不计入）</div>
        </div>
        {showEmptyAmmoRatio && (
          <div className="training-ratio-card">
            <div className="training-ratio-title">数据3 · 零子弹状态时长占比</div>
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
