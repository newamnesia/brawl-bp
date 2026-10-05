import type { MiniGameProgress } from "./tidalWave";

export type MiniGameLevel = {
  title: string;
  displayNumber?: number;
  description: string;
  completed: (progress: MiniGameProgress) => boolean;
};

export type MiniGameTheme = {
  id: string;
  title: string;
  heroId: string;
  emblem: string;
  description: string;
  levels: readonly MiniGameLevel[];
};

export const MINI_GAME_THEMES: readonly MiniGameTheme[] = [
  {
    id: "twist-fate",
    title: "扭转乾坤",
    heroId: "gene",
    emblem: "🪝",
    description: "操控基恩，在摇滚贝尔打破敌方阵型",
    levels: [
      {
        title: "第0关",
        displayNumber: 0,
        description: "摇滚贝尔 · 淘汰赛残局",
        completed: () => false,
      },
    ],
  },
  {
    id: "tidal-wave",
    title: "排山倒海",
    heroId: "pierce",
    emblem: "🌊",
    description: "守护金库，在敌潮中坚持 30 秒",
    levels: [
      {
        title: "守护金库",
        description: "守住金库，坚持 30 秒",
        completed: (progress) => progress.tidalWaveStars === 1,
      },
    ],
  },
];

export function miniGameLevelPath(themeId: string, levelIndex: number): string {
  return `/mini-games/${themeId}/${levelIndex + 1}`;
}
