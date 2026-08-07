export type Rarity = "starting" | "rare" | "super_rare" | "epic" | "mythic" | "legendary" | "extraordinary";

export interface Hero {
  id: string;
  name: string;
  enName: string;
  emoji: string;
  rarity: Rarity;
  cdnId: number;
  /** 该角色在 borders 文件夹无图，需用 borderless 文件夹 */
  borderless?: boolean;
}

// CDN 头像 URL:
//   默认: https://raw.githubusercontent.com/Brawlify/CDN/master/brawlers/borders/{cdnId}.png
//   borderless: https://raw.githubusercontent.com/Brawlify/CDN/master/brawlers/borderless/{cdnId}.png
// cdnId 按官方顺序分配，跳过 33/88；56 和 89 的 borders 图缺失，用 borderless
export const HEROES: Hero[] = [
  // 初始
  { id: "shelly", name: "雪莉", enName: "Shelly", emoji: "🔫", rarity: "starting", cdnId: 16000000 },
  // 稀有
  { id: "nita", name: "妮塔", enName: "Nita", emoji: "🐻", rarity: "rare", cdnId: 16000008 },
  { id: "colt", name: "柯尔特", enName: "Colt", emoji: "🤠", rarity: "rare", cdnId: 16000001 },
  { id: "bull", name: "公牛", enName: "Bull", emoji: "🐂", rarity: "rare", cdnId: 16000002 },
  { id: "brock", name: "布洛克", enName: "Brock", emoji: "🚀", rarity: "rare", cdnId: 16000003 },
  { id: "el_primo", name: "艾尔普利莫", enName: "El Primo", emoji: "💪", rarity: "rare", cdnId: 16000010 },
  { id: "barley", name: "巴利", enName: "Barley", emoji: "🍺", rarity: "rare", cdnId: 16000006 },
  { id: "poco", name: "波克", enName: "Poco", emoji: "🎸", rarity: "rare", cdnId: 16000013 },
  { id: "rosa", name: "罗莎", enName: "Rosa", emoji: "🌹", rarity: "rare", cdnId: 16000024 },
  // 超稀有
  { id: "jessie", name: "杰西", enName: "Jessie", emoji: "🤖", rarity: "super_rare", cdnId: 16000007 },
  { id: "dynamike", name: "麦克", enName: "Dynamike", emoji: "💣", rarity: "super_rare", cdnId: 16000009 },
  { id: "tick", name: "迪克", enName: "Tick", emoji: "🧨", rarity: "super_rare", cdnId: 16000022 },
  { id: "8bit", name: "8比特", enName: "8-Bit", emoji: "👾", rarity: "super_rare", cdnId: 16000027 },
  { id: "rico", name: "瑞科", enName: "Rico", emoji: "🏐", rarity: "super_rare", cdnId: 16000004 },
  { id: "darryl", name: "达里尔", enName: "Darryl", emoji: "🛢️", rarity: "super_rare", cdnId: 16000018 },
  { id: "penny", name: "潘妮", enName: "Penny", emoji: "🪙", rarity: "super_rare", cdnId: 16000019 },
  { id: "carl", name: "卡尔", enName: "Carl", emoji: "⛏️", rarity: "super_rare", cdnId: 16000025 },
  { id: "jacky", name: "雅琪", enName: "Jacky", emoji: "🔨", rarity: "super_rare", cdnId: 16000034 },
  { id: "gus", name: "格斯", enName: "Gus", emoji: "👻", rarity: "super_rare", cdnId: 16000061 },
  // 史诗
  { id: "bo", name: "阿渤", enName: "Bo", emoji: "🏹", rarity: "epic", cdnId: 16000014 },
  { id: "emz", name: "艾魅", enName: "Emz", emoji: "💅", rarity: "epic", cdnId: 16000030 },
  { id: "stu", name: "斯图", enName: "Stu", emoji: "🏍️", rarity: "epic", cdnId: 16000045 },
  { id: "piper", name: "佩佩", enName: "Piper", emoji: "☂️", rarity: "epic", cdnId: 16000015 },
  { id: "pam", name: "帕姆", enName: "Pam", emoji: "🔧", rarity: "epic", cdnId: 16000016 },
  { id: "frank", name: "弗兰肯", enName: "Frank", emoji: "⚰️", rarity: "epic", cdnId: 16000020 },
  { id: "bibi", name: "比比", enName: "Bibi", emoji: "🥎", rarity: "epic", cdnId: 16000026 },
  { id: "bea", name: "贝亚", enName: "Bea", emoji: "🐝", rarity: "epic", cdnId: 16000029 },
  { id: "nani", name: "纳妮", enName: "Nani", emoji: "🤖", rarity: "epic", cdnId: 16000036 },
  { id: "edgar", name: "艾德加", enName: "Edgar", emoji: "🦇", rarity: "epic", cdnId: 16000043 },
  { id: "griff", name: "格里夫", enName: "Griff", emoji: "🎰", rarity: "epic", cdnId: 16000050 },
  { id: "grom", name: "格罗姆", enName: "Grom", emoji: "🧪", rarity: "epic", cdnId: 16000048 },
  { id: "bonnie", name: "邦妮", enName: "Bonnie", emoji: "🍭", rarity: "epic", cdnId: 16000058 },
  { id: "gale", name: "格尔", enName: "Gale", emoji: "🌪️", rarity: "epic", cdnId: 16000035 },
  { id: "colette", name: "柯莱特", enName: "Colette", emoji: "🚌", rarity: "epic", cdnId: 16000039 },
  { id: "belle", name: "贝尔", enName: "Belle", emoji: "🔔", rarity: "epic", cdnId: 16000046 },
  { id: "ash", name: "阿拾", enName: "Ash", emoji: "⚔️", rarity: "epic", cdnId: 16000051 },
  { id: "lola", name: "萝拉", enName: "Lola", emoji: "🎬", rarity: "epic", cdnId: 16000053 },
  { id: "sam", name: "山姆", enName: "Sam", emoji: "🎒", rarity: "epic", cdnId: 16000060 },
  { id: "mandy", name: "曼迪", enName: "Mandy", emoji: "🎯", rarity: "epic", cdnId: 16000065 },
  { id: "maisie", name: "麦茜", enName: "Maisie", emoji: "💢", rarity: "epic", cdnId: 16000068 },
  { id: "hank", name: "汉克", enName: "Hank", emoji: "🫧", rarity: "epic", cdnId: 16000069 },
  { id: "pearl", name: "珀尔", enName: "Pearl", emoji: "🤖", rarity: "epic", cdnId: 16000072 },
  { id: "larry_lawrie", name: "拉里和劳里", enName: "Larry & Lawrie", emoji: "🤖", rarity: "epic", cdnId: 16000077 },
  { id: "angelo", name: "安吉洛", enName: "Angelo", emoji: "🏹", rarity: "epic", cdnId: 16000079 },
  { id: "berry", name: "拜瑞", enName: "Berry", emoji: "🎻", rarity: "epic", cdnId: 16000082 },
  { id: "shade", name: "谢德", enName: "Shade", emoji: "🌑", rarity: "epic", cdnId: 16000086 },
  { id: "meeple", name: "谜宝", enName: "Meeple", emoji: "🎲", rarity: "epic", cdnId: 16000089, borderless: true },
  { id: "trunk", name: "桩", enName: "Trunk", emoji: "🪵", rarity: "epic", cdnId: 16000096 },
  { id: "bolt", name: "博尔特", enName: "Bolt", emoji: "⚡", rarity: "epic", cdnId: 16000106 },
  // 神话
  { id: "mortis", name: "莫提斯", enName: "Mortis", emoji: "🪦", rarity: "mythic", cdnId: 16000011 },
  { id: "tara", name: "塔拉", enName: "Tara", emoji: "🔮", rarity: "mythic", cdnId: 16000017 },
  { id: "gene", name: "吉恩", enName: "Gene", emoji: "🧞", rarity: "mythic", cdnId: 16000021 },
  { id: "max", name: "麦克斯", enName: "Max", emoji: "🏃", rarity: "mythic", cdnId: 16000032 },
  { id: "mr_p", name: "P先生", enName: "Mr. P", emoji: "🐧", rarity: "mythic", cdnId: 16000031 },
  { id: "sprout", name: "芽芽", enName: "Sprout", emoji: "🌱", rarity: "mythic", cdnId: 16000037 },
  { id: "byron", name: "拜伦", enName: "Byron", emoji: "💉", rarity: "mythic", cdnId: 16000042 },
  { id: "squeak", name: "斯奎克", enName: "Squeak", emoji: "🐭", rarity: "mythic", cdnId: 16000047 },
  { id: "lou", name: "小罗", enName: "Lou", emoji: "🍦", rarity: "mythic", cdnId: 16000041 },
  { id: "ruffs", name: "拉夫上校", enName: "Ruffs", emoji: "🎖️", rarity: "mythic", cdnId: 16000044 },
  { id: "buzz", name: "巴兹", enName: "Buzz", emoji: "🦺", rarity: "mythic", cdnId: 16000049 },
  { id: "fang", name: "阿方", enName: "Fang", emoji: "🦶", rarity: "mythic", cdnId: 16000054 },
  { id: "eve", name: "伊芙", enName: "Eve", emoji: "👽", rarity: "mythic", cdnId: 16000056, borderless: true },
  { id: "janet", name: "珍妮特", enName: "Janet", emoji: "🚀", rarity: "mythic", cdnId: 16000057 },
  { id: "otis", name: "奥蒂斯", enName: "Otis", emoji: "🦴", rarity: "mythic", cdnId: 16000059 },
  { id: "buster", name: "巴斯特", enName: "Buster", emoji: "🎬", rarity: "mythic", cdnId: 16000062 },
  { id: "gray", name: "格雷", enName: "Gray", emoji: "🎩", rarity: "mythic", cdnId: 16000064 },
  { id: "rt", name: "R-T", enName: "R-T", emoji: "📡", rarity: "mythic", cdnId: 16000066 },
  { id: "willow", name: "薇洛", enName: "Willow", emoji: "🎣", rarity: "mythic", cdnId: 16000067 },
  { id: "doug", name: "道格", enName: "Doug", emoji: "🌭", rarity: "mythic", cdnId: 16000071 },
  { id: "chuck", name: "查克", enName: "Chuck", emoji: "📦", rarity: "mythic", cdnId: 16000073 },
  { id: "charlie", name: "查理", enName: "Charlie", emoji: "🕷️", rarity: "mythic", cdnId: 16000074 },
  { id: "mico", name: "米科", enName: "Mico", emoji: "🐵", rarity: "mythic", cdnId: 16000075 },
  { id: "melodie", name: "麦乐迪", enName: "Melodie", emoji: "🎤", rarity: "mythic", cdnId: 16000078 },
  { id: "lily", name: "莉莉", enName: "Lily", emoji: "🌸", rarity: "mythic", cdnId: 16000081 },
  { id: "moe", name: "阿萌", enName: "Moe", emoji: "🐲", rarity: "mythic", cdnId: 16000084 },
  { id: "clancy", name: "克兰西", enName: "Clancy", emoji: "🖌️", rarity: "mythic", cdnId: 16000083 },
  { id: "juju", name: "珠珠", enName: "Juju", emoji: "🧿", rarity: "mythic", cdnId: 16000087 },
  { id: "ollie", name: "奥利", enName: "Ollie", emoji: "🛹", rarity: "mythic", cdnId: 16000090 },
  { id: "finx", name: "芬克斯", enName: "Finx", emoji: "🐬", rarity: "mythic", cdnId: 16000092 },
  { id: "lumi", name: "露米", enName: "Lumi", emoji: "❄️", rarity: "mythic", cdnId: 16000091 },
  { id: "jae_yong", name: "载勇", enName: "Jae-Yong", emoji: "🎸", rarity: "mythic", cdnId: 16000093 },
  { id: "alli", name: "鳄梨", enName: "Alli", emoji: "🐊", rarity: "mythic", cdnId: 16000095 },
  { id: "mina", name: "蜜娜", enName: "Mina", emoji: "🦗", rarity: "mythic", cdnId: 16000097 },
  { id: "ziggy", name: "兹奇", enName: "Ziggy", emoji: "🛸", rarity: "mythic", cdnId: 16000098 },
  { id: "gigi", name: "琪琪", enName: "Gigi", emoji: "🤖", rarity: "mythic", cdnId: 16000100 },
  { id: "glowy", name: "格鲁伊", enName: "Glowy", emoji: "💡", rarity: "mythic", cdnId: 16000101 },
  { id: "starr_nova", name: "丝塔诺娃", enName: "Starr Nova", emoji: "⭐", rarity: "mythic", cdnId: 16000105 },
  { id: "damian", name: "达米安", enName: "Damian", emoji: "🦹", rarity: "mythic", cdnId: 16000104 },
  { id: "najia", name: "娜吉亚", enName: "Najia", emoji: "🧵", rarity: "mythic", cdnId: 16000103 },
  // 传奇
  { id: "spike", name: "斯派克", enName: "Spike", emoji: "🌵", rarity: "legendary", cdnId: 16000005 },
  { id: "crow", name: "黑鸦", enName: "Crow", emoji: "🦅", rarity: "legendary", cdnId: 16000012 },
  { id: "leon", name: "里昂", enName: "Leon", emoji: "🦝", rarity: "legendary", cdnId: 16000023 },
  { id: "sandy", name: "沙迪", enName: "Sandy", emoji: "😴", rarity: "legendary", cdnId: 16000028 },
  { id: "amber", name: "琥珀", enName: "Amber", emoji: "🔥", rarity: "legendary", cdnId: 16000040 },
  { id: "meg", name: "梅格", enName: "Meg", emoji: "🤖", rarity: "legendary", cdnId: 16000052 },
  { id: "surge", name: "瑟奇", enName: "Surge", emoji: "⚡", rarity: "legendary", cdnId: 16000038 },
  { id: "chester", name: "切斯特", enName: "Chester", emoji: "🃏", rarity: "legendary", cdnId: 16000063 },
  { id: "cordelius", name: "科迪琉斯", enName: "Cordelius", emoji: "🍄", rarity: "legendary", cdnId: 16000070 },
  { id: "kit", name: "凯特", enName: "Kit", emoji: "🐱", rarity: "legendary", cdnId: 16000076 },
  { id: "draco", name: "德拉科", enName: "Draco", emoji: "🐲", rarity: "legendary", cdnId: 16000080 },
  { id: "kenji", name: "健次", enName: "Kenji", emoji: "🍣", rarity: "legendary", cdnId: 16000085 },
  { id: "pierce", name: "皮尔斯", enName: "Pierce", emoji: "🏹", rarity: "legendary", cdnId: 16000099 },
  // 超凡
  { id: "kaze", name: "风姬", enName: "Kaze", emoji: "🌬️", rarity: "extraordinary", cdnId: 16000094 },
  { id: "sirius", name: "西里乌斯", enName: "Sirius", emoji: "🌟", rarity: "extraordinary", cdnId: 16000102 },
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
  timedOutBy: PlayerRole | null;
}

/** 中文名（英文名）格式 */
export function heroDisplayName(hero: Hero): string {
  return `${hero.name}（${hero.enName}）`;
}

/** CDN 头像 URL */
export function heroImageUrl(hero: Hero): string {
  const folder = hero.borderless ? "borderless" : "borders";
  return `https://raw.githubusercontent.com/Brawlify/CDN/master/brawlers/${folder}/${hero.cdnId}.png`;
}
