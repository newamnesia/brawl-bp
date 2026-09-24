import type { WallCell } from "../training/movement";

/**
 * 摇滚贝尔的中央交战区域。坐标是「列,行」，从左上角的 0,0 开始。
 * 图片中的草丛、出生区和装饰物尚未转成碰撞数据。
 */
export const BELLES_ROCK_MAP = {
  id: "bs_15000368",
  name: "摇滚贝尔",
  columns: 21,
  rows: 33,
  imageUrl: "/brawlscout/map-img/belles-rock-15000368.webp",
  ordinaryWalls: [
    "0,12", "0,13", "1,13", "0,14", "1,14", "2,14",
    "20,12", "19,13", "20,13", "18,14", "19,14", "20,14",
    "12,12", "12,13", "13,13", "12,14", "13,14", "14,14",
    "0,18", "1,18", "2,18", "0,19", "1,19", "0,20",
    "18,18", "19,18", "20,18", "19,19", "20,19", "20,20",
    "6,18", "7,18", "8,18", "7,19", "8,19", "8,20",
  ] as const satisfies readonly WallCell[],
  steelWalls: [
    "8,12", "8,13", "6,14", "7,14", "8,14",
    "12,18", "13,18", "14,18", "12,19", "12,20",
  ] as const satisfies readonly WallCell[],
} as const;
