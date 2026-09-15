export type TrialBrawlerId = "piper" | "bea" | "max" | "byron" | "pierce" | "brock";

export type TrialBrawlerConfig = {
  id: TrialBrawlerId;
  name: string;
  nameEn: string;
  color: string;
  health: number;
  moveSpeed: number;
  ammoCapacity: number;
  reloadSeconds: number;
  attackIntervalSeconds: number;
  projectileSpeed: number;
  projectileWidth: number;
  range: number;
};

export const TRIAL_BRAWLERS: Record<TrialBrawlerId, TrialBrawlerConfig> = {
  piper: {
    id: "piper", name: "佩佩", nameEn: "PIPER", color: "#ffca65",
    health: 5600, moveSpeed: 750, ammoCapacity: 3, reloadSeconds: 2.3, attackIntervalSeconds: 0.65,
    projectileSpeed: 4000, projectileWidth: 200, range: 3000,
  },
  bea: {
    id: "bea", name: "贝亚", nameEn: "BEA", color: "#ffd633",
    health: 5600, moveSpeed: 750, ammoCapacity: 1, reloadSeconds: 0.9, attackIntervalSeconds: 0.2,
    projectileSpeed: 3255, projectileWidth: 300, range: 3000,
  },
  max: {
    id: "max", name: "麦克斯", nameEn: "MAX", color: "#ff4e54",
    health: 7000, moveSpeed: 855, ammoCapacity: 4, reloadSeconds: 1.3, attackIntervalSeconds: 0.5,
    projectileSpeed: 4000, projectileWidth: 100, range: 2500,
  },
  byron: {
    id: "byron", name: "拜伦", nameEn: "BYRON", color: "#b45cff",
    health: 5200, moveSpeed: 750, ammoCapacity: 3, reloadSeconds: 1.45, attackIntervalSeconds: 0.65,
    projectileSpeed: 4000, projectileWidth: 300, range: 3000,
  },
  pierce: {
    id: "pierce", name: "皮尔斯", nameEn: "PIERCE", color: "#55d9ff",
    health: 6000, moveSpeed: 750, ammoCapacity: 3, reloadSeconds: 3, attackIntervalSeconds: 0.65,
    projectileSpeed: 4000, projectileWidth: 200, range: 3000,
  },
  brock: {
    id: "brock", name: "布洛克", nameEn: "BROCK", color: "#ff7043",
    health: 6000, moveSpeed: 720, ammoCapacity: 3, reloadSeconds: 2.1, attackIntervalSeconds: 0.5,
    projectileSpeed: 2700, projectileWidth: 200, range: 2700,
  },
};

export function isTrialBrawler(value: string | null): value is TrialBrawlerId {
  return value === "piper" || value === "bea" || value === "max" || value === "byron" || value === "pierce" || value === "brock";
}
