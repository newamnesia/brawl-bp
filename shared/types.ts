export type Rarity = "starting" | "rare" | "super_rare" | "epic" | "mythic" | "legendary" | "extraordinary";

export interface Hero {
  id: string;
  name: string;
  emoji: string;
  rarity: Rarity;
}

export const HEROES: Hero[] = [
  // 初始
  { id: "shelly", name: "雪莉", emoji: "🔫", rarity: "starting" },
  // 稀有
  { id: "nita", name: "妮塔", emoji: "🐻", rarity: "rare" },
  { id: "colt", name: "柯尔特", emoji: "🤠", rarity: "rare" },
  { id: "bull", name: "公牛", emoji: "🐂", rarity: "rare" },
  { id: "brock", name: "布洛克", emoji: "🚀", rarity: "rare" },
  { id: "el_primo", name: "艾尔普利莫", emoji: "💪", rarity: "rare" },
  { id: "barley", name: "巴利", emoji: "🍺", rarity: "rare" },
  { id: "poco", name: "波克", emoji: "🎸", rarity: "rare" },
  { id: "rosa", name: "罗莎", emoji: "🌹", rarity: "rare" },
  // 超稀有
  { id: "jessie", name: "杰西", emoji: "🤖", rarity: "super_rare" },
  { id: "dynamike", name: "麦克", emoji: "💣", rarity: "super_rare" },
  { id: "tick", name: "迪克", emoji: "🧨", rarity: "super_rare" },
  { id: "8bit", name: "8比特", emoji: "👾", rarity: "super_rare" },
  { id: "rico", name: "瑞科", emoji: "🏐", rarity: "super_rare" },
  { id: "darryl", name: "达里尔", emoji: "🛢️", rarity: "super_rare" },
  { id: "penny", name: "潘妮", emoji: "🪙", rarity: "super_rare" },
  { id: "carl", name: "卡尔", emoji: "⛏️", rarity: "super_rare" },
  { id: "jacky", name: "雅琪", emoji: "🔨", rarity: "super_rare" },
  { id: "gus", name: "格斯", emoji: "👻", rarity: "super_rare" },
  // 史诗
  { id: "bo", name: "阿渤", emoji: "🏹", rarity: "epic" },
  { id: "emz", name: "艾魅", emoji: "💅", rarity: "epic" },
  { id: "stu", name: "斯图", emoji: "🏍️", rarity: "epic" },
  { id: "piper", name: "佩佩", emoji: "☂️", rarity: "epic" },
  { id: "pam", name: "帕姆", emoji: "🔧", rarity: "epic" },
  { id: "frank", name: "弗兰肯", emoji: "⚰️", rarity: "epic" },
  { id: "bibi", name: "比比", emoji: "🥎", rarity: "epic" },
  { id: "bea", name: "贝亚", emoji: "🐝", rarity: "epic" },
  { id: "nani", name: "纳妮", emoji: "🤖", rarity: "epic" },
  { id: "edgar", name: "埃德加", emoji: "🦇", rarity: "epic" },
  { id: "griff", name: "格里夫", emoji: "🎰", rarity: "epic" },
  { id: "grom", name: "格罗姆", emoji: "🧪", rarity: "epic" },
  { id: "bonnie", name: "邦妮", emoji: "🍭", rarity: "epic" },
  { id: "gale", name: "格尔", emoji: "🌪️", rarity: "epic" },
  { id: "colette", name: "柯莱特", emoji: "🚌", rarity: "epic" },
  { id: "belle", name: "贝尔", emoji: "🔔", rarity: "epic" },
  { id: "ash", name: "阿拾", emoji: "⚔️", rarity: "epic" },
  { id: "lola", name: "萝拉", emoji: "🎬", rarity: "epic" },
  { id: "sam", name: "山姆", emoji: "🎒", rarity: "epic" },
  { id: "mandy", name: "曼迪", emoji: "🎯", rarity: "epic" },
  { id: "maisie", name: "麦茜", emoji: "💢", rarity: "epic" },
  { id: "hank", name: "汉克", emoji: "🫧", rarity: "epic" },
  { id: "pearl", name: "珀尔", emoji: "🤖", rarity: "epic" },
  { id: "larry_lawrie", name: "拉里和劳里", emoji: "🤖", rarity: "epic" },
  { id: "angelo", name: "安吉洛", emoji: "🏹", rarity: "epic" },
  { id: "berry", name: "拜瑞", emoji: "🎻", rarity: "epic" },
  { id: "shade", name: "谢德", emoji: "🌑", rarity: "epic" },
  { id: "meeple", name: "谜宝", emoji: "🎲", rarity: "epic" },
  { id: "trunk", name: "桩", emoji: "🪵", rarity: "epic" },
  { id: "bolt", name: "博尔特", emoji: "⚡", rarity: "epic" },
  // 神话
  { id: "mortis", name: "莫提斯", emoji: "🪦", rarity: "mythic" },
  { id: "tara", name: "塔拉", emoji: "🔮", rarity: "mythic" },
  { id: "gene", name: "吉恩", emoji: "🧞", rarity: "mythic" },
  { id: "max", name: "麦克斯", emoji: "🏃", rarity: "mythic" },
  { id: "mr_p", name: "p先生", emoji: "🐧", rarity: "mythic" },
  { id: "sprout", name: "芽芽", emoji: "🌱", rarity: "mythic" },
  { id: "byron", name: "拜伦", emoji: "💉", rarity: "mythic" },
  { id: "squeak", name: "斯奎克", emoji: "🐭", rarity: "mythic" },
  { id: "lou", name: "小罗", emoji: "🍦", rarity: "mythic" },
  { id: "ruffs", name: "拉夫上校", emoji: "🎖️", rarity: "mythic" },
  { id: "buzz", name: "巴兹", emoji: "🦺", rarity: "mythic" },
  { id: "fang", name: "阿方", emoji: "🦶", rarity: "mythic" },
  { id: "eve", name: "伊芙", emoji: "👽", rarity: "mythic" },
  { id: "janet", name: "珍妮特", emoji: "🚀", rarity: "mythic" },
  { id: "otis", name: "奥蒂斯", emoji: "🦴", rarity: "mythic" },
  { id: "buster", name: "巴斯特", emoji: "🎬", rarity: "mythic" },
  { id: "gray", name: "格雷", emoji: "🎩", rarity: "mythic" },
  { id: "rt", name: "r-t", emoji: "📡", rarity: "mythic" },
  { id: "willow", name: "薇洛", emoji: "🎣", rarity: "mythic" },
  { id: "doug", name: "道格", emoji: "🌭", rarity: "mythic" },
  { id: "chuck", name: "查克", emoji: "📦", rarity: "mythic" },
  { id: "charlie", name: "查理", emoji: "🕷️", rarity: "mythic" },
  { id: "mico", name: "米科", emoji: "🐵", rarity: "mythic" },
  { id: "melodie", name: "麦乐迪", emoji: "🎤", rarity: "mythic" },
  { id: "lily", name: "莉莉", emoji: "🌸", rarity: "mythic" },
  { id: "moe", name: "阿萌", emoji: "🐲", rarity: "mythic" },
  { id: "clancy", name: "克兰西", emoji: "🖌️", rarity: "mythic" },
  { id: "juju", name: "珠珠", emoji: "🧿", rarity: "mythic" },
  { id: "ollie", name: "奥利", emoji: "🛹", rarity: "mythic" },
  { id: "finx", name: "芬克斯", emoji: "🐬", rarity: "mythic" },
  { id: "lumi", name: "露米", emoji: "❄️", rarity: "mythic" },
  { id: "jae_yong", name: "载勇", emoji: "🎸", rarity: "mythic" },
  { id: "alli", name: "鳄梨", emoji: "🐊", rarity: "mythic" },
  { id: "mina", name: "蜜娜", emoji: "🦗", rarity: "mythic" },
  { id: "ziggy", name: "兹奇", emoji: "🛸", rarity: "mythic" },
  { id: "gigi", name: "琪琪", emoji: "🤖", rarity: "mythic" },
  { id: "glowy", name: "格鲁伊", emoji: "💡", rarity: "mythic" },
  { id: "starr_nova", name: "丝塔诺娃", emoji: "⭐", rarity: "mythic" },
  { id: "damian", name: "达米安", emoji: "🦹", rarity: "mythic" },
  { id: "najia", name: "娜吉亚", emoji: "🧵", rarity: "mythic" },
  // 传奇
  { id: "spike", name: "斯派克", emoji: "🌵", rarity: "legendary" },
  { id: "crow", name: "黑鸦", emoji: "🦅", rarity: "legendary" },
  { id: "leon", name: "里昂", emoji: "🦝", rarity: "legendary" },
  { id: "sandy", name: "沙迪", emoji: "😴", rarity: "legendary" },
  { id: "amber", name: "琥珀", emoji: "🔥", rarity: "legendary" },
  { id: "meg", name: "梅格", emoji: "🤖", rarity: "legendary" },
  { id: "surge", name: "瑟奇", emoji: "⚡", rarity: "legendary" },
  { id: "chester", name: "切斯特", emoji: "🃏", rarity: "legendary" },
  { id: "cordelius", name: "科迪琉斯", emoji: "🍄", rarity: "legendary" },
  { id: "kit", name: "凯特", emoji: "🐱", rarity: "legendary" },
  { id: "draco", name: "德拉科", emoji: "🐲", rarity: "legendary" },
  { id: "kenji", name: "健次", emoji: "🍣", rarity: "legendary" },
  { id: "pierce", name: "皮尔斯", emoji: "🏹", rarity: "legendary" },
  // 超凡
  { id: "kaze", name: "风姬", emoji: "🌬️", rarity: "extraordinary" },
  { id: "sirius", name: "西里乌斯", emoji: "🌟", rarity: "extraordinary" },
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
