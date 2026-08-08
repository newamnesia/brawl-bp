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
  /** 暂时不可用（不在选角/禁用池中出现） */
  disabled?: boolean;
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
  // 新角色（暂不可用）
  { id: "nori", name: "阿宪", enName: "Nori", emoji: "🍡", rarity: "legendary", cdnId: 16000107, borderless: true, disabled: true },
  // 超凡
  { id: "kaze", name: "风姬", enName: "Kaze", emoji: "🌬️", rarity: "extraordinary", cdnId: 16000094 },
  { id: "sirius", name: "西里乌斯", enName: "Sirius", emoji: "🌟", rarity: "extraordinary", cdnId: 16000102 },
  // 新角色（暂不可用）
  { id: "windy", name: "温蒂", enName: "Windy", emoji: "🌪️", rarity: "mythic", cdnId: 16000108, borderless: true, disabled: true },
];

export const HERO_MAP = Object.fromEntries(HEROES.map((h) => [h.id, h]));

/** 不可用的角色 id 集合（不参与选角/禁用） */
export const DISABLED_HERO_IDS = new Set(
  HEROES.filter((h) => h.disabled).map((h) => h.id),
);

export type Phase = "lobby" | "ban" | "ban_reveal" | "pick" | "complete";
export type PlayerRole = "host" | "guest" | "spectator";
export type TeamSide = "first" | "second";

/** 换位申请（被申请人收到的视角） */
export interface SwapRequest {
  requestId: string;
  fromId: string;
  fromNickname: string;
}

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
  roomName: string;
  phase: Phase;
  players: PlayerView[];
  spectators: PlayerView[];
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
  isSpectator: boolean;
  timedOutBy: PlayerRole | null;
  /** 收到的换位申请（被申请人视角） */
  pendingSwapToMe: SwapRequest | null;
  /** 我发出的换位申请的目标 id（申请人视角），无则 null */
  mySwapRequestTo: string | null;
  /** 房间选定的游戏模式（双方需一致才生效） */
  gameMode: GameMode | null;
  /** 选手1（host）选择的地图 id */
  hostMapId: string | null;
  /** 选手2（guest）选择的地图 id */
  guestMapId: string | null;
  /** 最终确定的地图 id（双方选了同一张则为确定） */
  confirmedMapId: string | null;
}

/** 大厅列表项 */
export interface LobbyRoom {
  code: string;
  roomName: string;
  hostNickname: string;
  playerCount: number;
  spectatorCount: number;
  phase: Phase;
}

export type GameMode = "brawl_ball" | "gem_grab" | "hot_zone" | "bounty" | "knockout";

export interface BrawlMap {
  id: string;
  name: string;
  mode: GameMode;
  thumbnail: string;
}

export const GAME_MODES: { id: GameMode; name: string; icon: string }[] = [
  { id: "brawl_ball", name: "足球", icon: "/brawl-stars/res/img/modes/icon_brawl_ball.webp" },
  { id: "gem_grab", name: "宝石", icon: "/brawl-stars/res/img/modes/icon_gem_grab.webp" },
  { id: "hot_zone", name: "热区", icon: "/brawl-stars/res/img/modes/icon_hot_zone.webp" },
  { id: "bounty", name: "赏金", icon: "/brawl-stars/res/img/modes/icon_bounty.webp" },
  { id: "knockout", name: "淘汰", icon: "/brawl-stars/res/img/modes/icon_knockout.webp" },
];

export const MAPS_BASE_URL = "https://www.noff.gg";

export const MAPS: BrawlMap[] = [
  // ===== Brawl Ball (足球) =====
  { id: "back_pocket", name: "Back Pocket", mode: "brawl_ball", thumbnail: "/brawl-stars/res/img/maps/back_pocket_thumbnail.webp" },
  { id: "backyard_bowl", name: "Backyard Bowl", mode: "brawl_ball", thumbnail: "/brawl-stars/res/img/maps/backyard_bowl_thumbnail.webp" },
  { id: "beach_ball", name: "Beach Ball", mode: "brawl_ball", thumbnail: "/brawl-stars/res/img/maps/beach_ball_thumbnail.webp" },
  { id: "center_stage", name: "Center Stage", mode: "brawl_ball", thumbnail: "/brawl-stars/res/img/maps/center_stage_thumbnail.webp" },
  { id: "flute_chutes", name: "Flute Chutes", mode: "brawl_ball", thumbnail: "/brawl-stars/res/img/maps/flute_chutes_thumbnail.webp" },
  { id: "goalies", name: "Goalies", mode: "brawl_ball", thumbnail: "/brawl-stars/res/img/maps/goalies_thumbnail.webp" },
  { id: "goalkeepers_dream", name: "Goalkeepers Dream", mode: "brawl_ball", thumbnail: "/brawl-stars/res/img/maps/goalkeepers_dream_thumbnail.webp" },
  { id: "grab_the_moment", name: "Grab The Moment", mode: "brawl_ball", thumbnail: "/brawl-stars/res/img/maps/grab_the_moment_thumbnail.webp" },
  { id: "grass_knot", name: "Grass Knot", mode: "brawl_ball", thumbnail: "/brawl-stars/res/img/maps/grass_knot_thumbnail.webp" },
  { id: "match_1123581321", name: "Match 1123581321", mode: "brawl_ball", thumbnail: "/brawl-stars/res/img/maps/match_1123581321_thumbnail.webp" },
  { id: "no_good_deed", name: "No Good Deed", mode: "brawl_ball", thumbnail: "/brawl-stars/res/img/maps/no_good_deed_thumbnail.webp" },
  { id: "nutmeg", name: "Nutmeg", mode: "brawl_ball", thumbnail: "/brawl-stars/res/img/maps/nutmeg_thumbnail.webp" },
  { id: "offside_trap", name: "Offside Trap", mode: "brawl_ball", thumbnail: "/brawl-stars/res/img/maps/offside_trap_thumbnail.webp" },
  { id: "penalty_kick", name: "Penalty Kick", mode: "brawl_ball", thumbnail: "/brawl-stars/res/img/maps/penalty_kick_thumbnail.webp" },
  { id: "pinball_dreams", name: "Pinball Dreams", mode: "brawl_ball", thumbnail: "/brawl-stars/res/img/maps/pinball_dreams_thumbnail.webp" },
  { id: "pinhole_punt", name: "Pinhole Punt", mode: "brawl_ball", thumbnail: "/brawl-stars/res/img/maps/pinhole_punt_thumbnail.webp" },
  { id: "priceless_cactus", name: "Priceless Cactus", mode: "brawl_ball", thumbnail: "/brawl-stars/res/img/maps/priceless_cactus_thumbnail.webp" },
  { id: "retina", name: "Retina", mode: "brawl_ball", thumbnail: "/brawl-stars/res/img/maps/retina_thumbnail.webp" },
  { id: "rooftop_runners", name: "Rooftop Runners", mode: "brawl_ball", thumbnail: "/brawl-stars/res/img/maps/rooftop_runners_thumbnail.webp" },
  { id: "second_try", name: "Second Try", mode: "brawl_ball", thumbnail: "/brawl-stars/res/img/maps/second_try_thumbnail.webp" },
  { id: "sidetrack", name: "Sidetrack", mode: "brawl_ball", thumbnail: "/brawl-stars/res/img/maps/sidetrack_thumbnail.webp" },
  { id: "singed_earth", name: "Singed Earth", mode: "brawl_ball", thumbnail: "/brawl-stars/res/img/maps/singed_earth_thumbnail.webp" },
  { id: "sneaky_fields", name: "Sneaky Fields", mode: "brawl_ball", thumbnail: "/brawl-stars/res/img/maps/sneaky_fields_thumbnail.webp" },
  { id: "spider_crawler", name: "Spider Crawler", mode: "brawl_ball", thumbnail: "/brawl-stars/res/img/maps/spider_crawler_thumbnail.webp" },
  { id: "spiraling_out", name: "Spiraling Out", mode: "brawl_ball", thumbnail: "/brawl-stars/res/img/maps/spiraling_out_thumbnail.webp" },
  { id: "sunny_soccer", name: "Sunny Soccer", mode: "brawl_ball", thumbnail: "/brawl-stars/res/img/maps/sunny_soccer_thumbnail.webp" },
  { id: "super_beach", name: "Super Beach", mode: "brawl_ball", thumbnail: "/brawl-stars/res/img/maps/super_beach_thumbnail.webp" },
  { id: "trickey", name: "Trickey", mode: "brawl_ball", thumbnail: "/brawl-stars/res/img/maps/trickey_thumbnail.webp" },
  { id: "triple_dribble", name: "Triple Dribble", mode: "brawl_ball", thumbnail: "/brawl-stars/res/img/maps/triple_dribble_thumbnail.webp" },

  // ===== Gem Grab (宝石) =====
  { id: "acute_angle", name: "Acute Angle", mode: "gem_grab", thumbnail: "/brawl-stars/res/img/maps/acute_angle_thumbnail.webp" },
  { id: "afterparty", name: "Afterparty", mode: "gem_grab", thumbnail: "/brawl-stars/res/img/maps/afterparty_thumbnail.webp" },
  { id: "ahead_of_the_curve", name: "Ahead of the Curve", mode: "gem_grab", thumbnail: "/brawl-stars/res/img/maps/ahead_of_the_curve_thumbnail.webp" },
  { id: "atlas", name: "Atlas", mode: "gem_grab", thumbnail: "/brawl-stars/res/img/maps/atlas_thumbnail.webp" },
  { id: "bear_trap", name: "Bear Trap", mode: "gem_grab", thumbnail: "/brawl-stars/res/img/maps/bear_trap_thumbnail.webp" },
  { id: "crystal_arcade", name: "Crystal Arcade", mode: "gem_grab", thumbnail: "/brawl-stars/res/img/maps/crystal_arcade_thumbnail.webp" },
  { id: "deathcap_trap", name: "Deathcap Trap", mode: "gem_grab", thumbnail: "/brawl-stars/res/img/maps/deathcap_trap_thumbnail.webp" },
  { id: "double_swoosh", name: "Double Swoosh", mode: "gem_grab", thumbnail: "/brawl-stars/res/img/maps/double_swoosh_thumbnail.webp" },
  { id: "extreme_nonchalance", name: "Extreme Nonchalance", mode: "gem_grab", thumbnail: "/brawl-stars/res/img/maps/extreme_nonchalance_thumbnail.webp" },
  { id: "forest_clearing", name: "Forest Clearing", mode: "gem_grab", thumbnail: "/brawl-stars/res/img/maps/forest_clearing_thumbnail.webp" },
  { id: "fortress_fall", name: "Fortress Fall", mode: "gem_grab", thumbnail: "/brawl-stars/res/img/maps/fortress_fall_thumbnail.webp" },
  { id: "gem_fort", name: "Gem Fort", mode: "gem_grab", thumbnail: "/brawl-stars/res/img/maps/gem_fort_thumbnail.webp" },
  { id: "hard_rock_mine", name: "Hard Rock Mine", mode: "gem_grab", thumbnail: "/brawl-stars/res/img/maps/hard_rock_mine_thumbnail.webp" },
  { id: "last_stop", name: "Last Stop", mode: "gem_grab", thumbnail: "/brawl-stars/res/img/maps/last_stop_thumbnail.webp" },
  { id: "lilygear_lake", name: "Lilygear Lake", mode: "gem_grab", thumbnail: "/brawl-stars/res/img/maps/lilygear_lake_thumbnail.webp" },
  { id: "local_restaurants", name: "Local Restaurants", mode: "gem_grab", thumbnail: "/brawl-stars/res/img/maps/local_restaurants_thumbnail.webp" },
  { id: "minecart_madness", name: "Minecart Madness", mode: "gem_grab", thumbnail: "/brawl-stars/res/img/maps/minecart_madness_thumbnail.webp" },
  { id: "on_a_roll", name: "On A Roll", mode: "gem_grab", thumbnail: "/brawl-stars/res/img/maps/on_a_roll_thumbnail.webp" },
  { id: "open_space", name: "Open Space", mode: "gem_grab", thumbnail: "/brawl-stars/res/img/maps/open_space_thumbnail.webp" },
  { id: "picturesque", name: "Picturesque", mode: "gem_grab", thumbnail: "/brawl-stars/res/img/maps/picturesque_thumbnail.webp" },
  { id: "railroad_robbery", name: "Railroad Robbery", mode: "gem_grab", thumbnail: "/brawl-stars/res/img/maps/railroad_robbery_thumbnail.webp" },
  { id: "rustic_arcade", name: "Rustic Arcade", mode: "gem_grab", thumbnail: "/brawl-stars/res/img/maps/rustic_arcade_thumbnail.webp" },
  { id: "satomi_springs", name: "Satomi Springs", mode: "gem_grab", thumbnail: "/brawl-stars/res/img/maps/satomi_springs_thumbnail.webp" },
  { id: "snake_pit", name: "Snake Pit", mode: "gem_grab", thumbnail: "/brawl-stars/res/img/maps/snake_pit_thumbnail.webp" },
  { id: "sneaky_sneak", name: "Sneaky Sneak", mode: "gem_grab", thumbnail: "/brawl-stars/res/img/maps/sneaky_sneak_thumbnail.webp" },
  { id: "storage_sector", name: "Storage Sector", mode: "gem_grab", thumbnail: "/brawl-stars/res/img/maps/storage_sector_thumbnail.webp" },
  { id: "undermine", name: "Undermine", mode: "gem_grab", thumbnail: "/brawl-stars/res/img/maps/undermine_thumbnail.webp" },
  { id: "whisper_vale", name: "Whisper Vale", mode: "gem_grab", thumbnail: "/brawl-stars/res/img/maps/whisper_vale_thumbnail.webp" },

  // ===== Hot Zone (热区) =====
  { id: "abracadabra", name: "Abracadabra", mode: "hot_zone", thumbnail: "/brawl-stars/res/img/maps/abracadabra_thumbnail.webp" },
  { id: "back_shuffle", name: "Back Shuffle", mode: "hot_zone", thumbnail: "/brawl-stars/res/img/maps/back_shuffle_thumbnail.webp" },
  { id: "bejeweled", name: "Bejeweled", mode: "hot_zone", thumbnail: "/brawl-stars/res/img/maps/bejeweled_thumbnail.webp" },
  { id: "dueling_beetles", name: "Dueling Beetles", mode: "hot_zone", thumbnail: "/brawl-stars/res/img/maps/dueling_beetles_thumbnail.webp" },
  { id: "fishing_bed", name: "Fishing Bed", mode: "hot_zone", thumbnail: "/brawl-stars/res/img/maps/fishing_bed_thumbnail.webp" },
  { id: "golden_bay", name: "Golden Bay", mode: "hot_zone", thumbnail: "/brawl-stars/res/img/maps/golden_bay_thumbnail.webp" },
  { id: "hyacinth_house", name: "Hyacinth House", mode: "hot_zone", thumbnail: "/brawl-stars/res/img/maps/hyacinth_house_thumbnail.webp" },
  { id: "in_the_liminal", name: "In The Liminal", mode: "hot_zone", thumbnail: "/brawl-stars/res/img/maps/in_the_liminal_thumbnail.webp" },
  { id: "just_another_race_to_anywhere", name: "Just Another Race To Anywhere", mode: "hot_zone", thumbnail: "/brawl-stars/res/img/maps/just_another_race_to_anywhere_thumbnail.webp" },
  { id: "local_businesses", name: "Local Businesses", mode: "hot_zone", thumbnail: "/brawl-stars/res/img/maps/local_businesses_thumbnail.webp" },
  { id: "misty_meadows", name: "Misty Meadows", mode: "hot_zone", thumbnail: "/brawl-stars/res/img/maps/misty_meadows_thumbnail.webp" },
  { id: "open_business", name: "Open Business", mode: "hot_zone", thumbnail: "/brawl-stars/res/img/maps/open_business_thumbnail.webp" },
  { id: "open_zone", name: "Open Zone", mode: "hot_zone", thumbnail: "/brawl-stars/res/img/maps/open_zone_thumbnail.webp" },
  { id: "parallel_plays", name: "Parallel Plays", mode: "hot_zone", thumbnail: "/brawl-stars/res/img/maps/parallel_plays_thumbnail.webp" },
  { id: "playmaker", name: "Playmaker", mode: "hot_zone", thumbnail: "/brawl-stars/res/img/maps/playmaker_thumbnail.webp" },
  { id: "reflections", name: "Reflections", mode: "hot_zone", thumbnail: "/brawl-stars/res/img/maps/reflections_thumbnail.webp" },
  { id: "ring_of_fire", name: "Ring of Fire", mode: "hot_zone", thumbnail: "/brawl-stars/res/img/maps/ring_of_fire_thumbnail.webp" },
  { id: "the_seven_pillars_of_humanity", name: "The Seven Pillars Of Humanity", mode: "hot_zone", thumbnail: "/brawl-stars/res/img/maps/the_seven_pillars_of_humanity_thumbnail.webp" },
  { id: "ticket_to_die", name: "Ticket To Die", mode: "hot_zone", thumbnail: "/brawl-stars/res/img/maps/ticket_to_die_thumbnail.webp" },
  { id: "zone_splitting", name: "Zone Splitting", mode: "hot_zone", thumbnail: "/brawl-stars/res/img/maps/zone_splitting_thumbnail.webp" },

  // ===== Bounty (赏金) =====
  { id: "brace_for_impact", name: "Brace For Impact", mode: "bounty", thumbnail: "/brawl-stars/res/img/maps/brace_for_impact_thumbnail.webp" },
  { id: "canal_grande", name: "Canal Grande", mode: "bounty", thumbnail: "/brawl-stars/res/img/maps/canal_grande_thumbnail.webp" },
  { id: "choral_chambers", name: "Choral Chambers", mode: "bounty", thumbnail: "/brawl-stars/res/img/maps/choral_chambers_thumbnail.webp" },
  { id: "color_me_intrigued", name: "Color Me Intrigued", mode: "bounty", thumbnail: "/brawl-stars/res/img/maps/color_me_intrigued_thumbnail.webp" },
  { id: "crowd_strike", name: "Crowd Strike", mode: "bounty", thumbnail: "/brawl-stars/res/img/maps/crowd_strike_thumbnail.webp" },
  { id: "dont_turn_around", name: "Dont Turn Around", mode: "bounty", thumbnail: "/brawl-stars/res/img/maps/dont_turn_around_thumbnail.webp" },
  { id: "dry_season", name: "Dry Season", mode: "bounty", thumbnail: "/brawl-stars/res/img/maps/dry_season_thumbnail.webp" },
  { id: "flank_attack", name: "Flank Attack", mode: "bounty", thumbnail: "/brawl-stars/res/img/maps/flank_attack_thumbnail.webp" },
  { id: "hideout", name: "Hideout", mode: "bounty", thumbnail: "/brawl-stars/res/img/maps/hideout_thumbnail.webp" },
  { id: "hit_and_run", name: "Hit And Run", mode: "bounty", thumbnail: "/brawl-stars/res/img/maps/hit_and_run_thumbnail.webp" },
  { id: "iris_intervention", name: "Iris Intervention", mode: "bounty", thumbnail: "/brawl-stars/res/img/maps/iris_intervention_thumbnail.webp" },
  { id: "layer_cake", name: "Layer Cake", mode: "bounty", thumbnail: "/brawl-stars/res/img/maps/layer_cake_thumbnail.webp" },
  { id: "shooting_star", name: "Shooting Star", mode: "bounty", thumbnail: "/brawl-stars/res/img/maps/shooting_star_thumbnail.webp" },
  { id: "side_by_side", name: "Side By Side", mode: "bounty", thumbnail: "/brawl-stars/res/img/maps/side_by_side_thumbnail.webp" },
  { id: "snake_prairie", name: "Snake Prairie", mode: "bounty", thumbnail: "/brawl-stars/res/img/maps/snake_prairie_thumbnail.webp" },
  { id: "starrburst", name: "Starrburst", mode: "bounty", thumbnail: "/brawl-stars/res/img/maps/starrburst_thumbnail.webp" },
  { id: "wall_hugging", name: "Wall Hugging", mode: "bounty", thumbnail: "/brawl-stars/res/img/maps/wall_hugging_thumbnail.webp" },
  { id: "watermelons", name: "Watermelons", mode: "bounty", thumbnail: "/brawl-stars/res/img/maps/watermelons_thumbnail.webp" },

  // ===== Knockout (淘汰) =====
  { id: "a_ballad_about_minced_cutlets", name: "A Ballad About Minced Cutlets", mode: "knockout", thumbnail: "/brawl-stars/res/img/maps/a_ballad_about_minced_cutlets_thumbnail.webp" },
  { id: "belles_rock", name: "Belles Rock", mode: "knockout", thumbnail: "/brawl-stars/res/img/maps/belles_rock_thumbnail.webp" },
  { id: "between_the_rivers", name: "Between the Rivers", mode: "knockout", thumbnail: "/brawl-stars/res/img/maps/between_the_rivers_thumbnail.webp" },
  { id: "call_of_the_water", name: "Call Of The Water", mode: "knockout", thumbnail: "/brawl-stars/res/img/maps/call_of_the_water_thumbnail.webp" },
  { id: "chivalry", name: "Chivalry", mode: "knockout", thumbnail: "/brawl-stars/res/img/maps/chivalry_thumbnail.webp" },
  { id: "close_quarters", name: "Close Quarters", mode: "knockout", thumbnail: "/brawl-stars/res/img/maps/close_quarters_thumbnail.webp" },
  { id: "crab_claws", name: "Crab Claws", mode: "knockout", thumbnail: "/brawl-stars/res/img/maps/crab_claws_thumbnail.webp" },
  { id: "deep_end", name: "Deep End", mode: "knockout", thumbnail: "/brawl-stars/res/img/maps/deep_end_thumbnail.webp" },
  { id: "double_decker", name: "Double Decker", mode: "knockout", thumbnail: "/brawl-stars/res/img/maps/double_decker_thumbnail.webp" },
  { id: "dragon_jaws", name: "Dragon Jaws", mode: "knockout", thumbnail: "/brawl-stars/res/img/maps/dragon_jaws_thumbnail.webp" },
  { id: "flaring_phoenix", name: "Flaring Phoenix", mode: "knockout", thumbnail: "/brawl-stars/res/img/maps/flaring_phoenix_thumbnail.webp" },
  { id: "flowing_springs", name: "Flowing Springs", mode: "knockout", thumbnail: "/brawl-stars/res/img/maps/flowing_springs_thumbnail.webp" },
  { id: "four_levels", name: "Four Levels", mode: "knockout", thumbnail: "/brawl-stars/res/img/maps/four_levels_thumbnail.webp" },
  { id: "goldarm_gulch", name: "Goldarm Gulch", mode: "knockout", thumbnail: "/brawl-stars/res/img/maps/goldarm_gulch_thumbnail.webp" },
  { id: "h_for", name: "H For...", mode: "knockout", thumbnail: "/brawl-stars/res/img/maps/h_for..._thumbnail.webp" },
  { id: "hard_lane", name: "Hard Lane", mode: "knockout", thumbnail: "/brawl-stars/res/img/maps/hard_lane_thumbnail.webp" },
  { id: "healthy_middle_ground", name: "Healthy Middle Ground", mode: "knockout", thumbnail: "/brawl-stars/res/img/maps/healthy_middle_ground_thumbnail.webp" },
  { id: "island_hopping", name: "Island Hopping", mode: "knockout", thumbnail: "/brawl-stars/res/img/maps/island_hopping_thumbnail.webp" },
  { id: "konnakol", name: "Konnakol", mode: "knockout", thumbnail: "/brawl-stars/res/img/maps/konnakol_thumbnail.webp" },
  { id: "mossy_crossing", name: "Mossy Crossing", mode: "knockout", thumbnail: "/brawl-stars/res/img/maps/mossy_crossing_thumbnail.webp" },
  { id: "new_horizons", name: "New Horizons", mode: "knockout", thumbnail: "/brawl-stars/res/img/maps/new_horizons_thumbnail.webp" },
  { id: "new_perspective", name: "New Perspective", mode: "knockout", thumbnail: "/brawl-stars/res/img/maps/new_perspective_thumbnail.webp" },
  { id: "opening_move", name: "Opening Move", mode: "knockout", thumbnail: "/brawl-stars/res/img/maps/opening_move_thumbnail.webp" },
  { id: "out_in_the_open", name: "Out in the Open", mode: "knockout", thumbnail: "/brawl-stars/res/img/maps/out_in_the_open_thumbnail.webp" },
  { id: "party_for_you", name: "Party For You", mode: "knockout", thumbnail: "/brawl-stars/res/img/maps/party_for_you_thumbnail.webp" },
  { id: "pinned_down", name: "Pinned Down", mode: "knockout", thumbnail: "/brawl-stars/res/img/maps/pinned_down_thumbnail.webp" },
  { id: "streets_with_no_name", name: "Streets With No Name", mode: "knockout", thumbnail: "/brawl-stars/res/img/maps/streets_with_no_name_thumbnail.webp" },
  { id: "sunset_spar", name: "Sunset Spar", mode: "knockout", thumbnail: "/brawl-stars/res/img/maps/sunset_spar_thumbnail.webp" },
  { id: "think_ahead", name: "Think Ahead", mode: "knockout", thumbnail: "/brawl-stars/res/img/maps/think_ahead_thumbnail.webp" },
  { id: "twilight_passage", name: "Twilight Passage", mode: "knockout", thumbnail: "/brawl-stars/res/img/maps/twilight_passage_thumbnail.webp" },
];

export const MAP_MAP = Object.fromEntries(MAPS.map((m) => [m.id, m]));

/** 获取地图缩略图完整 URL */
export function mapThumbnailUrl(map: BrawlMap): string {
  return `${MAPS_BASE_URL}${map.thumbnail}`;
}

/** 获取模式图标完整 URL */
export function modeIconUrl(mode: Pick<{ id: GameMode; name: string; icon: string }, "icon">): string {
  return `${MAPS_BASE_URL}${mode.icon}`;
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
