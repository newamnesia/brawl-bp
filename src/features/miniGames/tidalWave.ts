import { TILE_SIZE, tiles } from "../training/config.ts";

export const TIDAL_WAVE = {
  id: "tidal-wave",
  title: "排山倒海",
  heroId: "pierce",
  durationSeconds: 30,
  mapColumns: 21,
  mapRows: 33,
  wallRow: 16,
  lowerRows: 16,
  playerSpawn: { column: 10, rowFromBottom: 1 },
  vaultSpawn: { column: 10, rowFromBottom: 3 },
  vaultHealth: 100_000,
  spawnIntervalSeconds: 0.5,
  miniBrock: {
    health: 3_000,
    moveSpeed: 720,
    range: tiles(9 * 0.6),
    explosionRadius: tiles(1.5 * 0.6),
    damage: Math.round(2320 * 0.6),
    projectileSpeed: 2700,
    reloadSeconds: 2.1,
    ammoCapacity: 3,
    selectSeconds: 0.5,
    aimSeconds: 1,
  },
} as const;

export const TIDAL_WAVE_WORLD = {
  width: TIDAL_WAVE.mapColumns * TILE_SIZE,
  height: TIDAL_WAVE.mapRows * TILE_SIZE,
  wallTop: TIDAL_WAVE.wallRow * TILE_SIZE,
  lowerTop: (TIDAL_WAVE.wallRow + 1) * TILE_SIZE,
} as const;

export function lowerRowCenter(rowFromBottom: number) {
  return (TIDAL_WAVE.mapRows - rowFromBottom - 0.5) * TILE_SIZE;
}

export function columnCenter(column: number) {
  return (column + 0.5) * TILE_SIZE;
}

export type MiniGameProgress = { tidalWaveStars: 0 | 1 };
const STORAGE_KEY = "brawl-bp:mini-games:v1";

export function loadMiniGameProgress(): MiniGameProgress {
  if (typeof window === "undefined") return { tidalWaveStars: 0 };
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null") as Partial<MiniGameProgress> | null;
    return { tidalWaveStars: parsed?.tidalWaveStars === 1 ? 1 : 0 };
  } catch {
    return { tidalWaveStars: 0 };
  }
}

export function completeTidalWave(): MiniGameProgress {
  const progress: MiniGameProgress = { ...loadMiniGameProgress(), tidalWaveStars: 1 };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // 无法持久化时不影响本局胜利结算。
  }
  return progress;
}
