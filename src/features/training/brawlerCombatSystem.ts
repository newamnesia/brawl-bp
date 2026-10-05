import { TRIAL_BRAWLERS, type TrialBrawlerConfig, type TrialBrawlerId } from "./characterTrial";
import { COLT, coltAttackDelay } from "./coltCombat";
import { MAX_PROJECTILE_INTERVAL_SECONDS } from "./config";
import { BEA_SUPER } from "./beaSuper";
import { BROCK } from "./brockCombat";
import { GENE } from "./geneCombat";
import { GRAY } from "./grayCombat";
import { MINA } from "./minaCombat";
import { OLLIE, ollieAttackAngles } from "./ollieCombat";
import { PEARL, pearlAttackAngles } from "./pearlCombat";
import { PIERCE_ATTACK, PIERCE_SUPER } from "./pierceCombat";
import { PIPER, piperDamageAtDistance } from "./piperCombat";
import { SPIKE } from "./spikeCombat";

export type BrawlerAttackProjectilePlan = {
  angle: number;
  spawnDelaySeconds: number;
};

export type BrawlerBasicAttackPlan = {
  brawler: TrialBrawlerConfig;
  projectiles: BrawlerAttackProjectilePlan[];
  volleyDurationSeconds: number;
};

export type BrawlerCombatRuntime = {
  brawlerId: TrialBrawlerId;
  health: number;
  maxHealth: number;
  ammo: number;
  reloadRemaining: number;
  attackCooldown: number;
};

export type CombatProjectile<TOwner extends string = "player" | "enemy"> = {
  id: number;
  owner: TOwner;
  x: number;
  y: number;
  vx: number;
  vy: number;
  traveled: number;
  maxDistance: number;
  radius: number;
  damage?: number;
  spawnDelay?: number;
};

export type CombatProjectileKind =
  | "piper" | "beaNormal" | "beaEnhanced" | "beaSuper" | "max" | "byron" | "byronSuper"
  | "pierceNormal" | "pierceLast" | "pierceShell" | "pierceSuper" | "brock"
  | "geneDirect" | "geneSplit" | "geneSuper" | "gray" | "grayCane"
  | "coltAttack" | "coltSuper" | "coltGadget"
  | "minaSandal" | "minaTambourine" | "minaWind" | "minaSuper"
  | "spikeBomb" | "spikeShard" | "spikeSuper" | "spikePlant"
  | "pearlCookie" | "pearlLoveCookie" | "ollieWave";

/** 所有页面共享的命中数值；页面只负责碰撞，不再保存角色伤害副本。 */
export const BRAWLER_COMBAT_RULES = {
  bea: { normalDamage: TRIAL_BRAWLERS.bea.baseAttackDamage, enhancedDamage: 4400 },
  byron: {
    tickDamage: 760,
    tickCount: 3,
    tickIntervalSeconds: 1,
    attackChargePerTick: 0.113,
    superDamageAndHeal: 3000,
    superCharge: 0.24,
    superRange: 2200,
    superSpeed: 2000,
    superRadius: 800,
  },
  brock: BROCK,
  max: { projectileDamage: TRIAL_BRAWLERS.max.baseAttackDamage },
  pierce: PIERCE_ATTACK,
  piper: PIPER,
} as const;

export function createBrawlerCombatRuntime(
  brawlerId: TrialBrawlerId,
  attackCooldown = 0,
): BrawlerCombatRuntime {
  const brawler = TRIAL_BRAWLERS[brawlerId];
  return {
    brawlerId,
    health: brawler.health,
    maxHealth: brawler.health,
    ammo: brawler.ammoCapacity,
    reloadRemaining: brawler.reloadSeconds,
    attackCooldown,
  };
}

/** 普通逐发装填；特殊整弹匣装填角色可保留自己的装填策略。 */
export function advanceBrawlerCombatTimers(runtime: BrawlerCombatRuntime, seconds: number): void {
  const brawler = TRIAL_BRAWLERS[runtime.brawlerId];
  runtime.attackCooldown = Math.max(0, runtime.attackCooldown - seconds);
  if (runtime.ammo < brawler.ammoCapacity) {
    runtime.reloadRemaining -= seconds;
    while (runtime.reloadRemaining <= 0 && runtime.ammo < brawler.ammoCapacity) {
      runtime.ammo += 1;
      runtime.reloadRemaining += brawler.reloadSeconds;
    }
  } else {
    runtime.reloadRemaining = brawler.reloadSeconds;
  }
}

export function combatProjectileDamage(
  kind: CombatProjectileKind,
  traveled: number,
  maximumRange: number,
): number {
  if (kind === "beaSuper") return BEA_SUPER.damage;
  if (kind === "beaNormal") return BRAWLER_COMBAT_RULES.bea.normalDamage;
  if (kind === "beaEnhanced") return BRAWLER_COMBAT_RULES.bea.enhancedDamage;
  if (kind === "max") return BRAWLER_COMBAT_RULES.max.projectileDamage;
  // Byron 的普攻伤害只由后续三次毒伤结算，命中帧本身不造成额外伤害。
  if (kind === "byron" || kind === "byronSuper" || kind === "geneSuper"
    || kind === "spikeSuper" || kind === "spikePlant") return 0;
  if (kind === "pierceNormal") return PIERCE_ATTACK.normalDamage;
  if (kind === "pierceLast") return PIERCE_ATTACK.lastAmmoDamage;
  if (kind === "pierceShell") return PIERCE_ATTACK.shellDamage;
  if (kind === "pierceSuper") return PIERCE_SUPER.damage;
  if (kind === "brock") return BRAWLER_COMBAT_RULES.brock.attackDamage;
  if (kind === "geneDirect") return GENE.directDamage;
  if (kind === "geneSplit") return GENE.splitDamage;
  if (kind === "gray" || kind === "grayCane") return GRAY.damage;
  if (kind === "coltAttack") return COLT.attackDamage;
  if (kind === "coltSuper") return COLT.superDamage;
  if (kind === "coltGadget") return COLT.speedloaderDamage;
  if (kind === "minaSandal") return MINA.attackDamage[0];
  if (kind === "minaTambourine") return MINA.attackDamage[1];
  if (kind === "minaWind") return MINA.attackDamage[2];
  if (kind === "minaSuper") return MINA.superDamage;
  if (kind === "spikeBomb" || kind === "spikeShard") return SPIKE.attackDamage;
  if (kind === "pearlCookie" || kind === "pearlLoveCookie") return PEARL.attackMinDamage;
  if (kind === "ollieWave") return OLLIE.attackDamage;
  return piperDamageAtDistance(traveled, maximumRange);
}

const MAX_SPREAD_DEGREES = [0, -1.5, 1.5, -3] as const;

function seededUnit(seed: number): number {
  const value = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return value - Math.floor(value);
}

function maxAttackAngles(baseAngle: number, seed: number) {
  const sampledPositiveOffset = MAX_SPREAD_DEGREES[2] + seededUnit(seed + 71) * 0.3;
  return [MAX_SPREAD_DEGREES[0], MAX_SPREAD_DEGREES[1], sampledPositiveOffset, MAX_SPREAD_DEGREES[3]]
    .map((degrees) => baseAngle + degrees * Math.PI / 180);
}

/**
 * 角色普攻的统一生成层。调用方只负责把计划转换为场上的弹丸；
 * 子弹数量、角度顺序和逐颗出膛时间只在这里定义。
 */
export function planBrawlerBasicAttack(options: {
  brawlerId: TrialBrawlerId;
  baseAngle: number;
  shotSeed: number;
  hypercharged?: boolean;
}): BrawlerBasicAttackPlan {
  const { brawlerId, baseAngle, shotSeed, hypercharged = false } = options;
  let angles: number[];
  let delayAt: (index: number) => number;

  if (brawlerId === "max") {
    angles = maxAttackAngles(baseAngle, shotSeed);
    delayAt = (index) => index * MAX_PROJECTILE_INTERVAL_SECONDS;
  } else if (brawlerId === "colt") {
    angles = Array.from({ length: COLT.attackBullets }, () => baseAngle);
    delayAt = (index) => coltAttackDelay(index, hypercharged);
  } else if (brawlerId === "pearl") {
    angles = pearlAttackAngles(baseAngle);
    delayAt = (index) => index * PEARL.attackBulletIntervalSeconds;
  } else if (brawlerId === "ollie") {
    angles = ollieAttackAngles(baseAngle);
    delayAt = () => 0;
  } else {
    angles = [baseAngle];
    delayAt = () => 0;
  }

  const projectiles = angles.map((angle, index) => ({
    angle,
    spawnDelaySeconds: delayAt(index),
  }));
  return {
    brawler: TRIAL_BRAWLERS[brawlerId],
    projectiles,
    volleyDurationSeconds: projectiles.reduce(
      (duration, projectile) => Math.max(duration, projectile.spawnDelaySeconds),
      0,
    ),
  };
}
