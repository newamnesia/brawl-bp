export type TrialBrawlerId = "piper" | "bea" | "max" | "byron" | "pierce" | "brock" | "gene" | "gray" | "colt" | "mina";

export type TrialBrawlerConfig = {
  id: TrialBrawlerId;
  name: string;
  nameEn: string;
  color: string;
  health: number;
  moveSpeed: number;
  ammoCapacity: number;
  reloadSeconds: number;
  reloadDelaySeconds: number;
  attackIntervalSeconds: number;
  projectileSpeed: number;
  projectileWidth: number;
  range: number;
};

export const TRIAL_BRAWLERS: Record<TrialBrawlerId, TrialBrawlerConfig> = {
  piper: {
    id: "piper", name: "佩佩", nameEn: "PIPER", color: "#ffca65",
    health: 5600, moveSpeed: 750, ammoCapacity: 3, reloadSeconds: 2.3, reloadDelaySeconds: 0.65, attackIntervalSeconds: 0.65,
    projectileSpeed: 4000, projectileWidth: 200, range: 3000,
  },
  bea: {
    id: "bea", name: "贝亚", nameEn: "BEA", color: "#ffd633",
    health: 5600, moveSpeed: 750, ammoCapacity: 1, reloadSeconds: 0.9, reloadDelaySeconds: 0.2, attackIntervalSeconds: 0.2,
    projectileSpeed: 3255, projectileWidth: 300, range: 3000,
  },
  max: {
    id: "max", name: "麦克斯", nameEn: "MAX", color: "#ff4e54",
    health: 7000, moveSpeed: 855, ammoCapacity: 4, reloadSeconds: 1.3, reloadDelaySeconds: 0.5, attackIntervalSeconds: 0.5,
    projectileSpeed: 4000, projectileWidth: 100, range: 2500,
  },
  byron: {
    id: "byron", name: "拜伦", nameEn: "BYRON", color: "#b45cff",
    health: 5200, moveSpeed: 750, ammoCapacity: 3, reloadSeconds: 1.45, reloadDelaySeconds: 0.65, attackIntervalSeconds: 0.65,
    projectileSpeed: 4000, projectileWidth: 300, range: 3000,
  },
  pierce: {
    id: "pierce", name: "皮尔斯", nameEn: "PIERCE", color: "#55d9ff",
    health: 6000, moveSpeed: 750, ammoCapacity: 3, reloadSeconds: 3, reloadDelaySeconds: 0.65, attackIntervalSeconds: 0.65,
    projectileSpeed: 4000, projectileWidth: 200, range: 3000,
  },
  brock: {
    id: "brock", name: "布洛克", nameEn: "BROCK", color: "#ff7043",
    health: 6000, moveSpeed: 720, ammoCapacity: 3, reloadSeconds: 1.95, reloadDelaySeconds: 0.4, attackIntervalSeconds: 0.5,
    projectileSpeed: 2700, projectileWidth: 200, range: 2700,
  },
  gene: {
    id: "gene", name: "吉恩", nameEn: "GENE", color: "#b964dc",
    health: 7600, moveSpeed: 750, ammoCapacity: 3, reloadSeconds: 2, reloadDelaySeconds: 0.4, attackIntervalSeconds: 0.65,
    projectileSpeed: 3200, projectileWidth: 300, range: 3400,
  },
  gray: {
    id: "gray", name: "格雷", nameEn: "GRAY", color: "#9aa0a8",
    health: 6800, moveSpeed: 750, ammoCapacity: 3, reloadSeconds: 1.4, reloadDelaySeconds: 0.65, attackIntervalSeconds: 0.75,
    projectileSpeed: 3804, projectileWidth: 100, range: 2700,
  },
  colt: {
    id: "colt", name: "柯尔特", nameEn: "COLT", color: "#ef5350",
    health: 6200, moveSpeed: 813.6, ammoCapacity: 3, reloadSeconds: 1.3, reloadDelaySeconds: 0.55, attackIntervalSeconds: 0.55,
    projectileSpeed: 4000, projectileWidth: 200, range: 2700,
  },
  mina: {
    id: "mina", name: "蜜娜", nameEn: "MINA", color: "#62d69b",
    health: 7200, moveSpeed: 800, ammoCapacity: 3, reloadSeconds: 1.4, reloadDelaySeconds: 0.45, attackIntervalSeconds: 0.45,
    projectileSpeed: 3000, projectileWidth: 300, range: 2400,
  },
};

export function isTrialBrawler(value: string | null): value is TrialBrawlerId {
  return value === "piper" || value === "bea" || value === "max" || value === "byron" || value === "pierce" || value === "brock" || value === "gene" || value === "gray" || value === "colt" || value === "mina";
}
