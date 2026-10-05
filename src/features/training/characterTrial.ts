import { HEROES, type Hero } from "../../../shared/types";

export const TRIAL_BRAWLER_IDS = [
  "piper", "bea", "max", "byron", "pierce", "brock", "gene",
  "gray", "colt", "mina", "spike", "pearl", "ollie",
] as const;

export type TrialBrawlerId = typeof TRIAL_BRAWLER_IDS[number];

export type TrialBrawlerConfig = {
  id: TrialBrawlerId;
  name: string;
  nameEn: string;
  color: string;
  health: number;
  /** 基础资料中的单发/单弹丸伤害；复杂攻击的总伤害仍由角色机制模块定义。 */
  baseAttackDamage: number;
  moveSpeed: number;
  ammoCapacity: number;
  reloadSeconds: number;
  reloadDelaySeconds: number;
  attackIntervalSeconds: number;
  projectileSpeed: number;
  projectileWidth: number;
  range: number;
};

type TrialSimulationOverrides = Pick<TrialBrawlerConfig,
  "color" | "reloadDelaySeconds" | "attackIntervalSeconds" | "projectileSpeed" | "projectileWidth">
  & { range?: number };

const WORLD_UNITS_PER_TILE = 300;

/**
 * 这里只保存训练模拟器独有的弹道和操作手感数据。
 * 血量、移速、弹药、装填、名称和普通射程统一来自 shared/types.ts 的 HEROES。
 */
const TRIAL_SIMULATION_OVERRIDES: Record<TrialBrawlerId, TrialSimulationOverrides> = {
  piper: { color: "#ffca65", reloadDelaySeconds: 0.65, attackIntervalSeconds: 0.65, projectileSpeed: 4000, projectileWidth: 200 },
  bea: { color: "#ffd633", reloadDelaySeconds: 0.2, attackIntervalSeconds: 0.2, projectileSpeed: 3255, projectileWidth: 300 },
  max: { color: "#ff4e54", reloadDelaySeconds: 0.5, attackIntervalSeconds: 0.5, projectileSpeed: 4000, projectileWidth: 100 },
  byron: { color: "#b45cff", reloadDelaySeconds: 0.65, attackIntervalSeconds: 0.65, projectileSpeed: 4000, projectileWidth: 300 },
  pierce: { color: "#55d9ff", reloadDelaySeconds: 0.65, attackIntervalSeconds: 0.65, projectileSpeed: 4000, projectileWidth: 200 },
  brock: { color: "#ff7043", reloadDelaySeconds: 0.4, attackIntervalSeconds: 0.5, projectileSpeed: 2700, projectileWidth: 200 },
  // Gene 的基础表射程只表示直射段；模拟器射程需要覆盖分裂后的总距离。
  gene: { color: "#b964dc", reloadDelaySeconds: 0.4, attackIntervalSeconds: 0.65, projectileSpeed: 3200, projectileWidth: 300, range: 3400 },
  gray: { color: "#9aa0a8", reloadDelaySeconds: 0.65, attackIntervalSeconds: 0.75, projectileSpeed: 3804, projectileWidth: 100 },
  colt: { color: "#ef5350", reloadDelaySeconds: 0.55, attackIntervalSeconds: 0.55, projectileSpeed: 4000, projectileWidth: 200 },
  mina: { color: "#62d69b", reloadDelaySeconds: 0.45, attackIntervalSeconds: 0.45, projectileSpeed: 3000, projectileWidth: 300 },
  spike: { color: "#78d33d", reloadDelaySeconds: 0.25, attackIntervalSeconds: 0.25, projectileSpeed: 2174, projectileWidth: 300 },
  pearl: { color: "#f29b55", reloadDelaySeconds: 0.7, attackIntervalSeconds: 0.7, projectileSpeed: 4000, projectileWidth: 200 },
  ollie: { color: "#6fd2cf", reloadDelaySeconds: 0.6, attackIntervalSeconds: 0.6, projectileSpeed: 3000, projectileWidth: 200 },
};

const HERO_BY_ID = new Map(HEROES.map(hero => [hero.id, hero]));

type CombatHero = Hero & {
  stats: NonNullable<Hero["stats"]> & { reloadMs: number; range: number };
};

function requireCombatHero(id: TrialBrawlerId): CombatHero {
  const hero = HERO_BY_ID.get(id);
  if (!hero?.stats || hero.stats.reloadMs === undefined || hero.stats.range === undefined) {
    throw new Error(`Missing base combat stats for trial brawler: ${id}`);
  }
  return hero as CombatHero;
}

function createTrialBrawler(id: TrialBrawlerId): TrialBrawlerConfig {
  const hero = requireCombatHero(id);
  const overrides = TRIAL_SIMULATION_OVERRIDES[id];
  return {
    id,
    name: hero.name,
    nameEn: hero.enName.toUpperCase(),
    health: hero.stats.health,
    baseAttackDamage: Number(hero.stats.attack),
    moveSpeed: hero.stats.moveSpeed,
    ammoCapacity: hero.stats.ammo,
    reloadSeconds: hero.stats.reloadMs / 1000,
    range: overrides.range
      ?? Math.round(hero.stats.range * WORLD_UNITS_PER_TILE / 100) * 100,
    ...overrides,
  };
}

export const TRIAL_BRAWLERS = Object.fromEntries(
  TRIAL_BRAWLER_IDS.map(id => [id, createTrialBrawler(id)]),
) as Record<TrialBrawlerId, TrialBrawlerConfig>;

export function isTrialBrawler(value: string | null): value is TrialBrawlerId {
  return value !== null && (TRIAL_BRAWLER_IDS as readonly string[]).includes(value);
}
