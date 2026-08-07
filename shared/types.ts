export type Rarity = "starting" | "rare" | "super_rare" | "epic" | "mythic" | "legendary" | "extraordinary";

export interface Hero {
  id: string;
  name: string;
  emoji: string;
  rarity: Rarity;
  cdnId: number;
}

// CDN 头像 URL: https://raw.githubusercontent.com/Brawlify/CDN/master/brawlers/borders/{cdnId}.png
// cdnId 按官方顺序分配，跳过 33/56/88（这三张图不存在）
export const HEROES: Hero[] = [
  // 初始
  { id: "shelly", name: "雪莉", emoji: "🔫", rarity: "starting", cdnId: 16000000 },
  // 稀有
  { id: "nita", name: "妮塔", emoji: "🐻", rarity: "rare", cdnId: 16000008 },
  { id: "colt", name: "柯尔特", emoji: "🤠", rarity: "rare", cdnId: 16000001 },
  { id: "bull", name: "公牛", emoji: "🐂", rarity: "rare", cdnId: 16000002 },
  { id: "brock", name: "布洛克", emoji: "🚀", rarity: "rare", cdnId: 16000003 },
  { id: "el_primo", name: "艾尔普利莫", emoji: "💪", rarity: "rare", cdnId: 16000010 },
  { id: "barley", name: "巴利", emoji: "🍺", rarity: "rare", cdnId: 16000006 },
  { id: "poco", name: "波克", emoji: "🎸", rarity: "rare", cdnId: 16000013 },
  { id: "rosa", name: "罗莎", emoji: "🌹", rarity: "rare", cdnId: 16000024 },
  // 超稀有
  { id: "jessie", name: "杰西", emoji: "🤖", rarity: "super_rare", cdnId: 16000007 },
  { id: "dynamike", name: "麦克", emoji: "💣", rarity: "super_rare", cdnId: 16000009 },
  { id: "tick", name: "迪克", emoji: "🧨", rarity: "super_rare", cdnId: 16000022 },
  { id: "8bit", name: "8比特", emoji: "👾", rarity: "super_rare", cdnId: 16000027 },
  { id: "rico", name: "瑞科", emoji: "🏐", rarity: "super_rare", cdnId: 16000004 },
  { id: "darryl", name: "达里尔", emoji: "🛢️", rarity: "super_rare", cdnId: 16000018 },
  { id: "penny", name: "潘妮", emoji: "🪙", rarity: "super_rare", cdnId: 16000019 },
  { id: "carl", name: "卡尔", emoji: "⛏️", rarity: "super_rare", cdnId: 16000025 },
  { id: "jacky", name: "雅琪", emoji: "🔨", rarity: "super_rare", cdnId: 16000034 },
  { id: "gus", name: "格斯", emoji: "👻", rarity: "super_rare", cdnId: 16000061 },
  // 史诗
  { id: "bo", name: "阿渤", emoji: "🏹", rarity: "epic", cdnId: 16000014 },
  { id: "emz", name: "艾魅", emoji: "💅", rarity: "epic", cdnId: 16000030 },
  { id: "stu", name: "斯图", emoji: "🏍️", rarity: "epic", cdnId: 16000045 },
  { id: "piper", name: "佩佩", emoji: "☂️", rarity: "epic", cdnId: 16000015 },
  { id: "pam", name: "帕姆", emoji: "🔧", rarity: "epic", cdnId: 16000016 },
  { id: "frank", name: "弗兰肯", emoji: "⚰️", rarity: "epic", cdnId: 16000020 },
  { id: "bibi", name: "比比", emoji: "🥎", rarity: "epic", cdnId: 16000026 },
  { id: "bea", name: "贝亚", emoji: "🐝", rarity: "epic", cdnId: 16000029 },
  { id: "nani", name: "纳妮", emoji: "🤖", rarity: "epic", cdnId: 16000036 },
  { id: "edgar", name: "埃德加", emoji: "🦇", rarity: "epic", cdnId: 16000043 },
  { id: "griff", name: "格里夫", emoji: "🎰", rarity: "epic", cdnId: 16000050 },
  { id: "grom", name: "格罗姆", emoji: "🧪", rarity: "epic", cdnId: 16000048 },
  { id: "bonnie", name: "邦妮", emoji: "🍭", rarity: "epic", cdnId: 16000058 },
  { id: "gale", name: "格尔", emoji: "🌪️", rarity: "epic", cdnId: 16000035 },
  { id: "colette", name: "柯莱特", emoji: "🚌", rarity: "epic", cdnId: 16000039 },
  { id: "belle", name: "贝尔", emoji: "🔔", rarity: "epic", cdnId: 16000046 },
  { id: "ash", name: "阿拾", emoji: "⚔️", rarity: "epic", cdnId: 16000051 },
  { id: "lola", name: "萝拉", emoji: "🎬", rarity: "epic", cdnId: 16000053 },
  { id: "sam", name: "山姆", emoji: "🎒", rarity: "epic", cdnId: 16000060 },
  { id: "mandy", name: "曼迪", emoji: "🎯", rarity: "epic", cdnId: 16000065 },
  { id: "maisie", name: "麦茜", emoji: "💢", rarity: "epic", cdnId: 16000068 },
  { id: "hank", name: "汉克", emoji: "🫧", rarity: "epic", cdnId: 16000069 },
  { id: "pearl", name: "珀尔", emoji: "🤖", rarity: "epic", cdnId: 16000072 },
  { id: "larry_lawrie", name: "拉里和劳里", emoji: "🤖", rarity: "epic", cdnId: 16000077 },
  { id: "angelo", name: "安吉洛", emoji: "🏹", rarity: "epic", cdnId: 16000079 },
  { id: "berry", name: "拜瑞", emoji: "🎻", rarity: "epic", cdnId: 16000082 },
  { id: "shade", name: "谢德", emoji: "🌑", rarity: "epic", cdnId: 16000086 },
  { id: "meeple", name: "谜宝", emoji: "🎲", rarity: "epic", cdnId: 16000090 },
  { id: "trunk", name: "桩", emoji: "🪵", rarity: "epic", cdnId: 16000097 },
  { id: "bolt", name: "博尔特", emoji: "⚡", rarity: "epic", cdnId: 16000107 },
  // 神话
  { id: "mortis", name: "莫提斯", emoji: "🪦", rarity: "mythic", cdnId: 16000011 },
  { id: "tara", name: "塔拉", emoji: "🔮", rarity: "mythic", cdnId: 16000017 },
  { id: "gene", name: "吉恩", emoji: "🧞", rarity: "mythic", cdnId: 16000021 },
  { id: "max", name: "麦克斯", emoji: "🏃", rarity: "mythic", cdnId: 16000032 },
  { id: "mr_p", name: "p先生", emoji: "🐧", rarity: "mythic", cdnId: 16000031 },
  { id: "sprout", name: "芽芽", emoji: "🌱", rarity: "mythic", cdnId: 16000037 },
  { id: "byron", name: "拜伦", emoji: "💉", rarity: "mythic", cdnId: 16000042 },
  { id: "squeak", name: "斯奎克", emoji: "🐭", rarity: "mythic", cdnId: 16000047 },
  { id: "lou", name: "小罗", emoji: "🍦", rarity: "mythic", cdnId: 16000041 },
  { id: "ruffs", name: "拉夫上校", emoji: "🎖️", rarity: "mythic", cdnId: 16000044 },
  { id: "buzz", name: "巴兹", emoji: "🦺", rarity: "mythic", cdnId: 16000049 },
  { id: "fang", name: "阿方", emoji: "🦶", rarity: "mythic", cdnId: 16000054 },
  { id: "eve", name: "伊芙", emoji: "👽", rarity: "mythic", cdnId: 16000055 },
  { id: "janet", name: "珍妮特", emoji: "🚀", rarity: "mythic", cdnId: 16000057 },
  { id: "otis", name: "奥蒂斯", emoji: "🦴", rarity: "mythic", cdnId: 16000059 },
  { id: "buster", name: "巴斯特", emoji: "🎬", rarity: "mythic", cdnId: 16000062 },
  { id: "gray", name: "格雷", emoji: "🎩", rarity: "mythic", cdnId: 16000064 },
  { id: "rt", name: "r-t", emoji: "📡", rarity: "mythic", cdnId: 16000066 },
  { id: "willow", name: "薇洛", emoji: "🎣", rarity: "mythic", cdnId: 16000067 },
  { id: "doug", name: "道格", emoji: "🌭", rarity: "mythic", cdnId: 16000071 },
  { id: "chuck", name: "查克", emoji: "📦", rarity: "mythic", cdnId: 16000073 },
  { id: "charlie", name: "查理", emoji: "🕷️", rarity: "mythic", cdnId: 16000074 },
  { id: "mico", name: "米科", emoji: "🐵", rarity: "mythic", cdnId: 16000075 },
  { id: "melodie", name: "麦乐迪", emoji: "🎤", rarity: "mythic", cdnId: 16000078 },
  { id: "lily", name: "莉莉", emoji: "🌸", rarity: "mythic", cdnId: 16000081 },
  { id: "moe", name: "阿萌", emoji: "🐲", rarity: "mythic", cdnId: 16000084 },
  { id: "clancy", name: "克兰西", emoji: "🖌️", rarity: "mythic", cdnId: 16000083 },
  { id: "juju", name: "珠珠", emoji: "🧿", rarity: "mythic", cdnId: 16000087 },
  { id: "ollie", name: "奥利", emoji: "🛹", rarity: "mythic", cdnId: 16000091 },
  { id: "finx", name: "芬克斯", emoji: "🐬", rarity: "mythic", cdnId: 16000093 },
  { id: "lumi", name: "露米", emoji: "❄️", rarity: "mythic", cdnId: 16000092 },
  { id: "jae_yong", name: "载勇", emoji: "🎸", rarity: "mythic", cdnId: 16000094 },
  { id: "alli", name: "鳄梨", emoji: "🐊", rarity: "mythic", cdnId: 16000096 },
  { id: "mina", name: "蜜娜", emoji: "🦗", rarity: "mythic", cdnId: 16000098 },
  { id: "ziggy", name: "兹奇", emoji: "🛸", rarity: "mythic", cdnId: 16000099 },
  { id: "gigi", name: "琪琪", emoji: "🤖", rarity: "mythic", cdnId: 16000101 },
  { id: "glowy", name: "格鲁伊", emoji: "💡", rarity: "mythic", cdnId: 16000102 },
  { id: "starr_nova", name: "丝塔诺娃", emoji: "⭐", rarity: "mythic", cdnId: 16000106 },
  { id: "damian", name: "达米安", emoji: "🦹", rarity: "mythic", cdnId: 16000105 },
  { id: "najia", name: "娜吉亚", emoji: "🧵", rarity: "mythic", cdnId: 16000104 },
  // 传奇
  { id: "spike", name: "斯派克", emoji: "🌵", rarity: "legendary", cdnId: 16000005 },
  { id: "crow", name: "黑鸦", emoji: "🦅", rarity: "legendary", cdnId: 16000012 },
  { id: "leon", name: "里昂", emoji: "🦝", rarity: "legendary", cdnId: 16000023 },
  { id: "sandy", name: "沙迪", emoji: "😴", rarity: "legendary", cdnId: 16000028 },
  { id: "amber", name: "琥珀", emoji: "🔥", rarity: "legendary", cdnId: 16000040 },
  { id: "meg", name: "梅格", emoji: "🤖", rarity: "legendary", cdnId: 16000052 },
  { id: "surge", name: "瑟奇", emoji: "⚡", rarity: "legendary", cdnId: 16000038 },
  { id: "chester", name: "切斯特", emoji: "🃏", rarity: "legendary", cdnId: 16000063 },
  { id: "cordelius", name: "科迪琉斯", emoji: "🍄", rarity: "legendary", cdnId: 16000070 },
  { id: "kit", name: "凯特", emoji: "🐱", rarity: "legendary", cdnId: 16000076 },
  { id: "draco", name: "德拉科", emoji: "🐲", rarity: "legendary", cdnId: 16000080 },
  { id: "kenji", name: "健次", emoji: "🍣", rarity: "legendary", cdnId: 16000085 },
  { id: "pierce", name: "皮尔斯", emoji: "🏹", rarity: "legendary", cdnId: 16000100 },
  // 超凡
  { id: "kaze", name: "风姬", emoji: "🌬️", rarity: "extraordinary", cdnId: 16000095 },
  { id: "sirius", name: "西里乌斯", emoji: "🌟", rarity: "extraordinary", cdnId: 16000103 },
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
