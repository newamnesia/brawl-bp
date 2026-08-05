export interface Hero {
  id: string;
  name: string;
  emoji: string;
}

export const HEROES: Hero[] = [
  { id: "shelly", name: "雪莉", emoji: "🔫" },
  { id: "colt", name: "柯尔特", emoji: "🤠" },
  { id: "bull", name: "公牛", emoji: "🐂" },
  { id: "brock", name: "布洛克", emoji: "🚀" },
  { id: "primo", name: "艾莉", emoji: "💪" },
  { id: "barley", name: "巴利", emoji: "🍺" },
  { id: "pam", name: "帕姆", emoji: "🔧" },
  { id: "jessie", name: "杰西", emoji: "🤖" },
  { id: "nita", name: "妮塔", emoji: "🐻" },
  { id: "dynamike", name: "迪克", emoji: "💣" },
  { id: "poco", name: "波克", emoji: "🎸" },
  { id: "rico", name: "瑞科", emoji: "🏐" },
  { id: "darryl", name: "达里尔", emoji: "🛢️" },
  { id: "penny", name: "佩佩", emoji: "🪙" },
  { id: "carl", name: "卡尔", emoji: "⛏️" },
  { id: "jacky", name: "雅琪", emoji: "🔨" },
  { id: "bea", name: "比比", emoji: "🐝" },
  { id: "8bit", name: "八比特", emoji: "👾" },
  { id: "edgar", name: "艾德加", emoji: "🦇" },
  { id: "surge", name: "瑟奇", emoji: "⚡" },
  { id: "colette", name: "科莱特", emoji: "🎪" },
  { id: "amber", name: "阿姆", emoji: "🔥" },
  { id: "stu", name: "斯图", emoji: "🏍️" },
  { id: "belle", name: "贝尔", emoji: "🔔" },
  { id: "squeak", name: "史魁克", emoji: "🐭" },
  { id: "griff", name: "格里夫", emoji: "🎰" },
  { id: "byron", name: "拜伦", emoji: "💉" },
  { id: "rosa", name: "罗莎", emoji: "🌹" },
  { id: "frank", name: "弗兰肯", emoji: "⚰️" },
  { id: "tara", name: "塔拉", emoji: "🔮" },
];

export const HERO_MAP = Object.fromEntries(HEROES.map((h) => [h.id, h]));

export type Phase = "lobby" | "ban" | "ban_reveal" | "pick" | "complete";
export type PlayerRole = "host" | "guest";
export type TeamSide = "first" | "second";

/** 选秀顺序：先手1 → 后手2,3 → 先手4,5 → 后手6 */
export const PICK_TURNS: TeamSide[] = [
  "first",
  "second",
  "second",
  "first",
  "first",
  "second",
];

export const BAN_DURATION_MS = 30_000;
export const PICK_DURATION_MS = 30_000;
export const BAN_REVEAL_MS = 4_000;
export const BANS_PER_PLAYER = 3;
export const PICKS_PER_TEAM = 3;

export interface PlayerView {
  id: string;
  nickname: string;
  role: PlayerRole;
  ready: boolean;
}

export interface RoomState {
  code: string;
  phase: Phase;
  players: PlayerView[];
  hostId: string;
  firstPicker: PlayerRole | null;
  pickStep: number;
  phaseEndsAt: number | null;
  myBans: string[];
  opponentBanCount: number;
  hostBans: string[] | null;
  guestBans: string[] | null;
  firstPicks: string[];
  secondPicks: string[];
  activeTeam: TeamSide | null;
  myTeam: TeamSide | null;
  isMyTurn: boolean;
}
