export type Rarity = "starting" | "rare" | "super_rare" | "epic" | "mythic" | "legendary" | "extraordinary";

export type Tier = "S" | "A" | "B" | "C" | "D" | "F";

/**
 * Brawlytix 公开角色详情页中的 11 级 Base Stats，校验于 2026-09-11。
 * attack 严格采用网站的 Attack Damage 字段，是基础伤害值，不额外计算多弹丸、
 * 持续伤害、强化攻击或距离增伤；网站返回 0 时也保留原值。
 */
export interface StatBlock {
  health: number;
  /** Brawlytix 的 Attack Damage 字段 */
  attack: string;
  /** 装填速度（毫秒） */
  reloadMs?: number;
  /** 攻击距离（格） */
  range?: number;
  moveSpeed: number;
  /** 弹药数量 */
  ammo: number;
}

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
  /** 综合评级（S/A/B/C/D/F，按 Brawlytix 近七天传奇段位 Meta Score 粗略分档）；未评级则省略 */
  tier?: Tier;
  /** 单人预览中展示的擅长模式；未标记则保持为空 */
  specialtyModes?: SpecialtyMode[];
  /** 单人预览中展示的战斗特性标签；未标记则保持为空 */
  traitTags?: HeroTraitTag[];
  /** 11 级基础数值；尚未录入则为 undefined */
  stats?: StatBlock;
}

// CDN 头像 URL:
//   默认: https://raw.githubusercontent.com/Brawlify/CDN/master/brawlers/borders/{cdnId}.png
//   borderless: https://raw.githubusercontent.com/Brawlify/CDN/master/brawlers/borderless/{cdnId}.png
// cdnId 按官方顺序分配，跳过 33/88；56 和 89 的 borders 图缺失，用 borderless
export const HEROES: Hero[] = [
  // 初始
  { id: "shelly", name: "雪莉", enName: "Shelly", emoji: "🔫", rarity: "starting", cdnId: 16000000, traitTags: ["anti_tank", "range_close"], stats: { health: 7800, attack: "3000", reloadMs: 1500, range: 7.67, moveSpeed: 800, ammo: 3 }},
  // 稀有
  { id: "nita", name: "妮塔", enName: "Nita", emoji: "🐻", rarity: "rare", cdnId: 16000008, specialtyModes: ["heist"], traitTags: ["range_close_medium", "anti_tank", "summoned_unit"], stats: { health: 8400, attack: "1920", reloadMs: 1100, range: 6, moveSpeed: 750, ammo: 3 }},
  { id: "colt", name: "柯尔特", enName: "Colt", emoji: "🤠", rarity: "rare", cdnId: 16000001, specialtyModes: ["heist"], traitTags: ["wall_breaker", "burst_fire"], stats: { health: 6200, attack: "720", reloadMs: 1300, range: 9, moveSpeed: 750, ammo: 3 }},
  { id: "bull", name: "公牛", enName: "Bull", emoji: "🐂", rarity: "rare", cdnId: 16000002, specialtyModes: ["heist"], traitTags: ["range_close", "tank", "dash"], stats: { health: 10000, attack: "4400", reloadMs: 1600, range: 5.33, moveSpeed: 800, ammo: 3 }},
  { id: "brock", name: "布洛克", enName: "Brock", emoji: "🚀", rarity: "rare", cdnId: 16000003, traitTags: ["range_long", "wall_breaker", "lane_dominance", "single_shot"], stats: { health: 6000, attack: "2320", reloadMs: 1950, range: 9, moveSpeed: 750, ammo: 3 }},
  { id: "el_primo", name: "艾尔普利莫", enName: "El Primo", emoji: "💪", rarity: "rare", cdnId: 16000010, traitTags: ["range_close", "tank", "dash"], stats: { health: 13000, attack: "760", reloadMs: 800, range: 3, moveSpeed: 800, ammo: 3 }},
  { id: "barley", name: "巴利", enName: "Barley", emoji: "🍺", rarity: "rare", cdnId: 16000006, traitTags: ["thrower", "area_control", "wall_cover"], stats: { health: 5400, attack: "1600", reloadMs: 2000, range: 7.33, moveSpeed: 750, ammo: 3 }},
  { id: "poco", name: "波克", enName: "Poco", emoji: "🎸", rarity: "rare", cdnId: 16000013, traitTags: ["range_close_medium", "healing", "cleanse"], stats: { health: 8000, attack: "6080", reloadMs: 1600, range: 7, moveSpeed: 750, ammo: 3 }},
  { id: "rosa", name: "罗莎", enName: "Rosa", emoji: "🌹", rarity: "rare", cdnId: 16000024, traitTags: ["tank", "grass_cover"], stats: { health: 10800, attack: "3000", reloadMs: 1000, range: 3.67, moveSpeed: 800, ammo: 3 }},
  // 超稀有
  { id: "jessie", name: "杰西", enName: "Jessie", emoji: "🤖", rarity: "super_rare", cdnId: 16000007, traitTags: ["range_medium_long", "summoned_unit", "anti_multiple_summons"], stats: { health: 6600, attack: "2120", reloadMs: 1800, range: 9, moveSpeed: 750, ammo: 3 }},
  { id: "dynamike", name: "麦克", enName: "Dynamike", emoji: "💣", rarity: "super_rare", cdnId: 16000009, traitTags: ["thrower", "wall_cover"], stats: { health: 6000, attack: "3200", reloadMs: 1400, range: 7.33, moveSpeed: 800, ammo: 3 }},
  { id: "tick", name: "迪克", enName: "Tick", emoji: "🧨", rarity: "super_rare", cdnId: 16000022, traitTags: ["thrower", "wall_cover"], stats: { health: 4800, attack: "1360", reloadMs: 2400, range: 8.67, moveSpeed: 750, ammo: 3 }},
  { id: "8bit", name: "8比特", enName: "8-Bit", emoji: "👾", rarity: "super_rare", cdnId: 16000027, specialtyModes: ["heist"], traitTags: ["range_medium_long", "burst_fire"], stats: { health: 10400, attack: "680", reloadMs: 1350, range: 10, moveSpeed: 600, ammo: 3 }},
  { id: "rico", name: "瑞科", enName: "Rico", emoji: "🏐", rarity: "super_rare", cdnId: 16000004, traitTags: ["range_medium_long", "burst_fire", "wall_cover"], stats: { health: 6000, attack: "600", reloadMs: 1100, range: 9.67, moveSpeed: 750, ammo: 3 }},
  { id: "darryl", name: "达里尔", enName: "Darryl", emoji: "🛢️", rarity: "super_rare", cdnId: 16000018, traitTags: ["range_close", "tank", "dash"], stats: { health: 11000, attack: "2400", reloadMs: 1800, range: 6, moveSpeed: 800, ammo: 3 }},
  { id: "penny", name: "潘妮", enName: "Penny", emoji: "🪙", rarity: "super_rare", cdnId: 16000019, traitTags: ["anti_multiple_summons", "range_medium", "summoned_unit"], stats: { health: 7000, attack: "1960", reloadMs: 2000, range: 8.67, moveSpeed: 750, ammo: 3 }},
  { id: "carl", name: "卡尔", enName: "Carl", emoji: "⛏️", rarity: "super_rare", cdnId: 16000025, traitTags: ["range_close_medium", "dash"], stats: { health: 8400, attack: "1640", reloadMs: 2000, range: 8.33, moveSpeed: 750, ammo: 1 }},
  { id: "jacky", name: "雅琪", enName: "Jacky", emoji: "🔨", rarity: "super_rare", cdnId: 16000034, traitTags: ["tank"], stats: { health: 10400, attack: "2480", reloadMs: 1800, range: 3.33, moveSpeed: 800, ammo: 3 }},
  { id: "gus", name: "格斯", enName: "Gus", emoji: "👻", rarity: "super_rare", cdnId: 16000061, traitTags: ["shield_grant", "healing", "single_shot"], stats: { health: 6600, attack: "2160", reloadMs: 1500, range: 9.33, moveSpeed: 750, ammo: 3 }},
  // 史诗
  { id: "bo", name: "阿渤", enName: "Bo", emoji: "🏹", rarity: "epic", cdnId: 16000014, traitTags: ["range_medium_long", "area_control", "positive_buff"], stats: { health: 7600, attack: "1400", reloadMs: 1700, range: 8.67, moveSpeed: 750, ammo: 3 }},
  { id: "emz", name: "艾魅", enName: "Emz", emoji: "💅", rarity: "epic", cdnId: 16000030, traitTags: ["range_close_medium", "anti_tank"], stats: { health: 7800, attack: "5600", reloadMs: 2000, range: 6.67, moveSpeed: 750, ammo: 3 }},
  { id: "stu", name: "斯图", enName: "Stu", emoji: "🏍️", rarity: "epic", cdnId: 16000045, traitTags: ["dash", "range_close_medium"], stats: { health: 7000, attack: "1080", reloadMs: 1500, range: 7.67, moveSpeed: 750, ammo: 3 }},
  { id: "piper", name: "佩佩", enName: "Piper", emoji: "☂️", rarity: "epic", cdnId: 16000015, traitTags: ["range_long", "wall_breaker", "single_shot", "lane_dominance"], stats: { health: 5600, attack: "3600", reloadMs: 2300, range: 10, moveSpeed: 750, ammo: 3 }},
  { id: "pam", name: "帕姆", enName: "Pam", emoji: "🔧", rarity: "epic", cdnId: 16000016, traitTags: ["range_close_medium", "healing", "tank"], stats: { health: 10000, attack: "600", reloadMs: 1300, range: 9, moveSpeed: 750, ammo: 3 }},
  { id: "frank", name: "弗兰肯", enName: "Frank", emoji: "⚰️", rarity: "epic", cdnId: 16000020, traitTags: ["tank", "range_close_medium", "wall_breaker"], stats: { health: 13600, attack: "9280", reloadMs: 800, range: 6, moveSpeed: 800, ammo: 3 }},
  { id: "bibi", name: "比比", enName: "Bibi", emoji: "🥎", rarity: "epic", cdnId: 16000026, traitTags: ["range_close"], stats: { health: 10000, attack: "2800", reloadMs: 800, range: 3.67, moveSpeed: 855, ammo: 3 }},
  { id: "bea", name: "贝亚", enName: "Bea", emoji: "🐝", rarity: "epic", cdnId: 16000029, traitTags: ["single_shot", "range_medium_long", "anti_tank", "debuff"], stats: { health: 5600, attack: "1600", reloadMs: 900, range: 10, moveSpeed: 750, ammo: 1 }},
  { id: "nani", name: "纳妮", enName: "Nani", emoji: "🤖", rarity: "epic", cdnId: 16000036, traitTags: ["range_long", "lane_dominance", "ultra_range_execute", "anti_single_shot"], stats: { health: 5000, attack: "4800", reloadMs: 1800, range: 8.67, moveSpeed: 750, ammo: 3 }},
  { id: "edgar", name: "艾德加", enName: "Edgar", emoji: "🦇", rarity: "epic", cdnId: 16000043, traitTags: ["range_close", "dash"], stats: { health: 7400, attack: "1080", reloadMs: 700, range: 2, moveSpeed: 855, ammo: 3 }},
  { id: "griff", name: "格里夫", enName: "Griff", emoji: "🎰", rarity: "epic", cdnId: 16000050, traitTags: ["burst_fire", "range_close_medium", "wall_breaker"], stats: { health: 7400, attack: "1680", reloadMs: 1600, range: 8.33, moveSpeed: 750, ammo: 3 }},
  { id: "grom", name: "格罗姆", enName: "Grom", emoji: "🧪", rarity: "epic", cdnId: 16000048, traitTags: ["thrower", "wall_cover"], stats: { health: 6000, attack: "2080", reloadMs: 2000, range: 7.67, moveSpeed: 750, ammo: 3 }},
  { id: "bonnie", name: "邦妮", enName: "Bonnie", emoji: "🍭", rarity: "epic", cdnId: 16000058, traitTags: ["single_shot", "dash"], stats: { health: 10000, attack: "2440", reloadMs: 1000, range: 9, moveSpeed: 630, ammo: 1 }},
  { id: "gale", name: "格尔", enName: "Gale", emoji: "🌪️", rarity: "epic", cdnId: 16000035, traitTags: ["range_close_medium", "anti_tank", "debuff"], stats: { health: 8000, attack: "3600", reloadMs: 1200, range: 8.33, moveSpeed: 750, ammo: 3 }},
  { id: "colette", name: "柯莱特", enName: "Colette", emoji: "🚌", rarity: "epic", cdnId: 16000039, specialtyModes: ["heist"], traitTags: ["single_shot", "range_all", "anti_tank"], stats: { health: 7200, attack: "2200", reloadMs: 1600, range: 8.67, moveSpeed: 750, ammo: 3 }},
  { id: "belle", name: "贝尔", enName: "Belle", emoji: "🔔", rarity: "epic", cdnId: 16000046, traitTags: ["single_shot", "anti_grouped", "range_long", "debuff"], stats: { health: 5800, attack: "2080", reloadMs: 1400, range: 10, moveSpeed: 750, ammo: 3 }},
  { id: "ash", name: "阿拾", enName: "Ash", emoji: "⚔️", rarity: "epic", cdnId: 16000051, traitTags: ["tank", "multiple_summons"], stats: { health: 11800, attack: "1600", reloadMs: 1400, range: 4.67, moveSpeed: 750, ammo: 3 }},
  { id: "lola", name: "萝拉", enName: "Lola", emoji: "🎬", rarity: "epic", cdnId: 16000053, traitTags: ["range_medium_long", "burst_fire", "summoned_unit"], stats: { health: 8000, attack: "560", reloadMs: 1700, range: 9, moveSpeed: 750, ammo: 3 }},
  { id: "sam", name: "山姆", enName: "Sam", emoji: "🎒", rarity: "epic", cdnId: 16000060, traitTags: ["tank", "range_close"], stats: { health: 11400, attack: "1600", reloadMs: 1600, range: 3, moveSpeed: 800, ammo: 3 }},
  { id: "mandy", name: "曼迪", enName: "Mandy", emoji: "🎯", rarity: "epic", cdnId: 16000065, traitTags: ["range_long", "lane_dominance", "ultra_range_execute"], stats: { health: 6000, attack: "2800", reloadMs: 1500, range: 9, moveSpeed: 750, ammo: 3 }},
  { id: "maisie", name: "麦茜", enName: "Maisie", emoji: "💢", rarity: "epic", cdnId: 16000068, traitTags: ["single_shot", "range_medium_long", "anti_tank"], stats: { health: 8000, attack: "3000", reloadMs: 1500, range: 8.67, moveSpeed: 750, ammo: 3 }},
  { id: "hank", name: "汉克", enName: "Hank", emoji: "🫧", rarity: "epic", cdnId: 16000069, traitTags: ["wall_cover", "range_close_medium", "tank"], stats: { health: 11000, attack: "4200", reloadMs: 250, range: 3.33, moveSpeed: 750, ammo: 1 }},
  { id: "pearl", name: "珀尔", enName: "Pearl", emoji: "🤖", rarity: "epic", cdnId: 16000072, traitTags: ["burst_fire", "range_all", "tank"], stats: { health: 8600, attack: "560", reloadMs: 1500, range: 9, moveSpeed: 750, ammo: 3 }},
  { id: "larry_lawrie", name: "拉里和劳里", enName: "Larry & Lawrie", emoji: "🤖", rarity: "epic", cdnId: 16000077, traitTags: ["thrower", "summoned_unit"], stats: { health: 6000, attack: "1400", reloadMs: 2200, range: 7.33, moveSpeed: 800, ammo: 3 }},
  { id: "angelo", name: "安吉洛", enName: "Angelo", emoji: "🏹", rarity: "epic", cdnId: 16000079, traitTags: ["single_shot", "water_route"], stats: { health: 6200, attack: "4000", reloadMs: 100, range: 10, moveSpeed: 855, ammo: 1 }},
  { id: "berry", name: "拜瑞", enName: "Berry", emoji: "🎻", rarity: "epic", cdnId: 16000082, traitTags: ["thrower", "healing"], stats: { health: 5200, attack: "1320", reloadMs: 2400, range: 6.33, moveSpeed: 750, ammo: 3 }},
  { id: "shade", name: "谢德", enName: "Shade", emoji: "🌑", rarity: "epic", cdnId: 16000086, traitTags: ["range_close_medium", "wall_cover", "dash"], stats: { health: 7400, attack: "1600", reloadMs: 800, range: 3.67, moveSpeed: 855, ammo: 3 }},
  { id: "meeple", name: "谜宝", enName: "Meeple", emoji: "🎲", rarity: "epic", cdnId: 16000089, borderless: true, traitTags: ["wall_cover", "range_close_medium"], stats: { health: 6600, attack: "2520", reloadMs: 1700, range: 7.67, moveSpeed: 750, ammo: 3 }},
  { id: "trunk", name: "桩", enName: "Trunk", emoji: "🪵", rarity: "epic", cdnId: 16000096, traitTags: ["range_close", "tank", "dash"], stats: { health: 10400, attack: "2800", reloadMs: 1500, range: 3.33, moveSpeed: 800, ammo: 3 }},
  { id: "bolt", name: "博尔特", enName: "Bolt", emoji: "⚡", rarity: "epic", cdnId: 16000106, traitTags: ["range_close", "dash"], stats: { health: 10000, attack: "0", reloadMs: 2200, range: 0, moveSpeed: 545, ammo: 2 }},
  // 神话
  { id: "mortis", name: "莫提斯", enName: "Mortis", emoji: "🪦", rarity: "mythic", cdnId: 16000011, traitTags: ["dash", "range_close_medium"], stats: { health: 8000, attack: "2000", reloadMs: 2400, range: 2.67, moveSpeed: 855, ammo: 3 }},
  { id: "tara", name: "塔拉", enName: "Tara", emoji: "🔮", rarity: "mythic", cdnId: 16000017, traitTags: ["range_close_medium", "multiple_summons"], stats: { health: 6600, attack: "2880", reloadMs: 1800, range: 8, moveSpeed: 750, ammo: 3 }},
  { id: "gene", name: "吉恩", enName: "Gene", emoji: "🧞", rarity: "mythic", cdnId: 16000021, traitTags: ["range_medium_long", "team_engage", "healing"], stats: { health: 7600, attack: "2000", reloadMs: 2000, range: 5.67, moveSpeed: 750, ammo: 3 }},
  { id: "max", name: "麦克斯", enName: "Max", emoji: "🏃", rarity: "mythic", cdnId: 16000032, traitTags: ["range_close_medium", "dash", "positive_buff"], stats: { health: 7000, attack: "640", reloadMs: 1300, range: 8.33, moveSpeed: 855, ammo: 4 }},
  { id: "mr_p", name: "P先生", enName: "Mr. P", emoji: "🐧", rarity: "mythic", cdnId: 16000031, traitTags: ["summoned_unit", "range_medium_long"], stats: { health: 7400, attack: "1520", reloadMs: 1600, range: 7, moveSpeed: 750, ammo: 3 }},
  { id: "sprout", name: "芽芽", enName: "Sprout", emoji: "🌱", rarity: "mythic", cdnId: 16000037, traitTags: ["thrower", "wall_cover"], stats: { health: 6400, attack: "2200", reloadMs: 1500, range: 5, moveSpeed: 750, ammo: 3 }},
  { id: "byron", name: "拜伦", enName: "Byron", emoji: "💉", rarity: "mythic", cdnId: 16000042, traitTags: ["range_medium_long", "healing", "debuff"], stats: { health: 5200, attack: "0", reloadMs: 1450, range: 10, moveSpeed: 750, ammo: 3 }},
  { id: "squeak", name: "史奎克", enName: "Squeak", emoji: "🐭", rarity: "mythic", cdnId: 16000047, traitTags: ["range_medium", "area_control", "ultra_range_execute"], stats: { health: 7600, attack: "2320", reloadMs: 2100, range: 7.67, moveSpeed: 750, ammo: 3 }},
  { id: "lou", name: "小罗", enName: "Lou", emoji: "🍦", rarity: "mythic", cdnId: 16000041, specialtyModes: ["hot_zone"], traitTags: ["range_medium_long", "debuff"], stats: { health: 7000, attack: "880", reloadMs: 1100, range: 9.33, moveSpeed: 750, ammo: 3 }},
  { id: "ruffs", name: "拉夫上校", enName: "Ruffs", emoji: "🎖️", rarity: "mythic", cdnId: 16000044, traitTags: ["range_medium_long", "wall_cover", "positive_buff", "wall_breaker"], stats: { health: 6000, attack: "2400", reloadMs: 1400, range: 9, moveSpeed: 750, ammo: 3 }},
  { id: "buzz", name: "巴兹", enName: "Buzz", emoji: "🦺", rarity: "mythic", cdnId: 16000049, traitTags: ["range_close", "dash", "tank"], stats: { health: 10000, attack: "2520", reloadMs: 1000, range: 2.67, moveSpeed: 800, ammo: 3 }},
  { id: "fang", name: "阿方", enName: "Fang", emoji: "🦶", rarity: "mythic", cdnId: 16000054, traitTags: ["range_close", "tank", "dash"], stats: { health: 9600, attack: "2720", reloadMs: 1000, range: 2.67, moveSpeed: 800, ammo: 3 }},
  { id: "eve", name: "伊芙", enName: "Eve", emoji: "👽", rarity: "mythic", cdnId: 16000056, borderless: true, traitTags: ["multiple_summons", "range_medium_long", "water_route"], stats: { health: 6200, attack: "800", reloadMs: 1600, range: 9.33, moveSpeed: 750, ammo: 3 }},
  { id: "janet", name: "珍妮特", enName: "Janet", emoji: "🚀", rarity: "mythic", cdnId: 16000057, traitTags: ["range_medium_long", "strong_self_preservation"], stats: { health: 6800, attack: "8800", reloadMs: 1500, range: 4, moveSpeed: 750, ammo: 3 }},
  { id: "otis", name: "奥蒂斯", enName: "Otis", emoji: "🦴", rarity: "mythic", cdnId: 16000059, traitTags: ["debuff", "range_medium_long"], stats: { health: 7200, attack: "1000", reloadMs: 1500, range: 9, moveSpeed: 750, ammo: 3 }},
  { id: "buster", name: "巴斯特", enName: "Buster", emoji: "🎬", rarity: "mythic", cdnId: 16000062, traitTags: ["range_close", "tank", "grouped"], stats: { health: 10000, attack: "8280", reloadMs: 1800, range: 5.33, moveSpeed: 800, ammo: 3 }},
  { id: "gray", name: "格雷", enName: "Gray", emoji: "🎩", rarity: "mythic", cdnId: 16000064, traitTags: ["range_medium_long", "dash"], stats: { health: 6800, attack: "2560", reloadMs: 1400, range: 9, moveSpeed: 750, ammo: 3 }},
  { id: "rt", name: "R-T", enName: "R-T", emoji: "📡", rarity: "mythic", cdnId: 16000066, traitTags: ["range_close_long", "single_shot", "anti_dash"], stats: { health: 8200, attack: "1400", reloadMs: 1500, range: 10, moveSpeed: 750, ammo: 3 }},
  { id: "willow", name: "薇洛", enName: "Willow", emoji: "🎣", rarity: "mythic", cdnId: 16000067, specialtyModes: ["brawl_ball"], traitTags: ["thrower", "enemy_lockdown"], stats: { health: 6600, attack: "0", reloadMs: 2000, range: 7.33, moveSpeed: 750, ammo: 3 }},
  { id: "doug", name: "道格", enName: "Doug", emoji: "🌭", rarity: "mythic", cdnId: 16000071, traitTags: ["range_close", "tank", "healing", "team_engage", "grouped"], stats: { health: 10400, attack: "2400", reloadMs: 1500, range: 3.33, moveSpeed: 800, ammo: 3 }},
  { id: "chuck", name: "查克", enName: "Chuck", emoji: "📦", rarity: "mythic", cdnId: 16000073, traitTags: ["range_close_medium", "dash", "area_control"], stats: { health: 8800, attack: "1080", reloadMs: 2000, range: 6, moveSpeed: 800, ammo: 3 }},
  { id: "charlie", name: "查理", enName: "Charlie", emoji: "🕷️", rarity: "mythic", cdnId: 16000074, traitTags: ["single_shot", "range_all", "enemy_lockdown", "debuff", "multiple_summons"], stats: { health: 7400, attack: "1600", reloadMs: 2000, range: 9, moveSpeed: 750, ammo: 1 }},
  { id: "mico", name: "米科", enName: "Mico", emoji: "🐵", rarity: "mythic", cdnId: 16000075, specialtyModes: ["heist"], traitTags: ["dash", "range_close"], stats: { health: 7000, attack: "2280", reloadMs: 2400, range: 4, moveSpeed: 855, ammo: 3 }},
  { id: "melodie", name: "麦乐迪", enName: "Melodie", emoji: "🎤", rarity: "mythic", cdnId: 16000078, specialtyModes: ["heist"], traitTags: ["range_close_medium", "dash"], stats: { health: 8000, attack: "920", reloadMs: 1500, range: 8, moveSpeed: 750, ammo: 3 }},
  { id: "lily", name: "莉莉", enName: "Lily", emoji: "🌸", rarity: "mythic", cdnId: 16000081, traitTags: ["dash", "range_close"], stats: { health: 8400, attack: "2120", reloadMs: 800, range: 2, moveSpeed: 855, ammo: 2 }},
  { id: "moe", name: "阿萌", enName: "Moe", emoji: "🐲", rarity: "mythic", cdnId: 16000084, traitTags: ["range_close_medium", "dash", "team_engage"], stats: { health: 7200, attack: "1000", reloadMs: 1500, range: 5, moveSpeed: 800, ammo: 3 }},
  { id: "clancy", name: "克兰西", enName: "Clancy", emoji: "🖌️", rarity: "mythic", cdnId: 16000083, traitTags: ["range_close_medium", "anti_tank"], stats: { health: 7600, attack: "1400", reloadMs: 1800, range: 7.67, moveSpeed: 750, ammo: 3 }},
  { id: "juju", name: "珠珠", enName: "Juju", emoji: "🧿", rarity: "mythic", cdnId: 16000087, traitTags: ["thrower", "water_route", "grass_cover", "summoned_unit", "debuff"], stats: { health: 6200, attack: "2000", reloadMs: 1600, range: 6.33, moveSpeed: 750, ammo: 3 }},
  { id: "ollie", name: "奥利", enName: "Ollie", emoji: "🛹", rarity: "mythic", cdnId: 16000090, traitTags: ["range_close_medium", "team_engage", "tank", "dash"], stats: { health: 10800, attack: "3600", reloadMs: 1800, range: 6.33, moveSpeed: 800, ammo: 3 }},
  { id: "finx", name: "芬克斯", enName: "Finx", emoji: "🐬", rarity: "mythic", cdnId: 16000092, traitTags: ["range_close_medium", "area_control"], stats: { health: 7400, attack: "5400", reloadMs: 1300, range: 8.33, moveSpeed: 800, ammo: 3 }},
  { id: "lumi", name: "露米", enName: "Lumi", emoji: "❄️", rarity: "mythic", cdnId: 16000091, traitTags: ["range_close_medium", "debuff"], stats: { health: 7000, attack: "1200", reloadMs: 0, range: 8, moveSpeed: 750, ammo: 2 }},
  { id: "jae_yong", name: "载勇", enName: "Jae-Yong", emoji: "🎸", rarity: "mythic", cdnId: 16000093, traitTags: ["range_close_medium", "positive_buff", "healing"], stats: { health: 7400, attack: "1500", reloadMs: 1500, range: 8.33, moveSpeed: 800, ammo: 3 }},
  { id: "alli", name: "鳄梨", enName: "Alli", emoji: "🐊", rarity: "mythic", cdnId: 16000095, traitTags: ["range_close", "dash"], stats: { health: 7800, attack: "2600", reloadMs: 2100, range: 2.67, moveSpeed: 800, ammo: 3 }},
  { id: "mina", name: "蜜娜", enName: "Mina", emoji: "🦗", rarity: "mythic", cdnId: 16000097, traitTags: ["range_medium_long", "dash", "team_engage"], stats: { health: 7200, attack: "1600", reloadMs: 1400, range: 8, moveSpeed: 800, ammo: 3 }},
  { id: "ziggy", name: "兹奇", enName: "Ziggy", emoji: "🛸", rarity: "mythic", cdnId: 16000098, traitTags: ["thrower", "area_control"], stats: { health: 6400, attack: "1900", reloadMs: 1800, range: 7.33, moveSpeed: 800, ammo: 3 }},
  { id: "gigi", name: "琪琪", enName: "Gigi", emoji: "🤖", rarity: "mythic", cdnId: 16000100, traitTags: ["range_close", "dash", "anti_burst"], stats: { health: 8200, attack: "1200", reloadMs: 220, range: 3.33, moveSpeed: 855, ammo: 10 }},
  { id: "glowy", name: "格鲁伊", enName: "Glowy", emoji: "💡", rarity: "mythic", cdnId: 16000101, traitTags: ["range_close_medium", "healing"], stats: { health: 7800, attack: "560", reloadMs: 1700, range: 7.33, moveSpeed: 800, ammo: 3 }},
  { id: "starr_nova", name: "丝塔诺娃", enName: "Starr Nova", emoji: "⭐", rarity: "mythic", cdnId: 16000105, traitTags: ["range_close_medium", "dash"], stats: { health: 7400, attack: "960", reloadMs: 1600, range: 5.67, moveSpeed: 855, ammo: 3 }},
  { id: "damian", name: "达米安", enName: "Damian", emoji: "🦹", rarity: "mythic", cdnId: 16000104, traitTags: ["tank", "range_close", "dash"], stats: { health: 11200, attack: "1400", reloadMs: 1200, range: 2.67, moveSpeed: 800, ammo: 3 }},
  { id: "najia", name: "娜吉亚", enName: "Najia", emoji: "🧵", rarity: "mythic", cdnId: 16000103, traitTags: ["range_long", "multiple_summons", "lane_dominance"], stats: { health: 6800, attack: "600", reloadMs: 800, range: 6, moveSpeed: 800, ammo: 1 }},
  { id: "windy", name: "温蒂", enName: "Wendy", emoji: "🌪️", rarity: "mythic", cdnId: 16000108, borderless: true, traitTags: ["shield_grant", "range_close_medium"], stats: { health: 4000, attack: "2000", reloadMs: 1450, range: 8, moveSpeed: 800, ammo: 3 }},
  // 传奇
  { id: "spike", name: "斯派克", enName: "Spike", emoji: "🌵", rarity: "legendary", cdnId: 16000005 , traitTags: ["range_all", "summoned_unit", "debuff"], stats: { health: 6000, attack: "1080", reloadMs: 2000, range: 7.67, moveSpeed: 750, ammo: 3 }},
  { id: "crow", name: "黑鸦", enName: "Crow", emoji: "🦅", rarity: "legendary", cdnId: 16000012 , traitTags: ["range_all", "debuff", "anti_healing", "dash"], stats: { health: 5600, attack: "1920", reloadMs: 1600, range: 8.67, moveSpeed: 855, ammo: 3 }},
  { id: "leon", name: "里昂", enName: "Leon", emoji: "🦝", rarity: "legendary", cdnId: 16000023 , traitTags: ["dash", "range_all", "positive_buff"], stats: { health: 6600, attack: "960", reloadMs: 1900, range: 9.67, moveSpeed: 855, ammo: 3 }},
  { id: "sandy", name: "沙迪", enName: "Sandy", emoji: "😴", rarity: "legendary", cdnId: 16000028 , traitTags: ["positive_buff", "range_close_medium"], stats: { health: 8200, attack: "5400", reloadMs: 1800, range: 6, moveSpeed: 800, ammo: 3 }},
  { id: "amber", name: "琥珀", enName: "Amber", emoji: "🔥", rarity: "legendary", cdnId: 16000040, traitTags: ["range_all", "area_control", "debuff"], stats: { health: 6800, attack: "420", reloadMs: 230, range: 8.33, moveSpeed: 750, ammo: 40 }},
  { id: "meg", name: "梅格", enName: "Meg", emoji: "🤖", rarity: "legendary", cdnId: 16000052 , traitTags: ["tank", "range_close_medium", "anti_tank", "debuff"], stats: { health: 4800, attack: "600", reloadMs: 1300, range: 9, moveSpeed: 855, ammo: 3 }},
  { id: "surge", name: "瑟奇", enName: "Surge", emoji: "⚡", rarity: "legendary", cdnId: 16000038 , traitTags: ["range_all", "single_shot"], stats: { health: 6600, attack: "2360", reloadMs: 2000, range: 6.67, moveSpeed: 705, ammo: 3 }},
  { id: "chester", name: "切斯特", enName: "Chester", emoji: "🃏", rarity: "legendary", cdnId: 16000063 , traitTags: ["range_close_medium", "debuff", "team_engage"], stats: { health: 7600, attack: "5360", reloadMs: 1900, range: 8.33, moveSpeed: 800, ammo: 3 }},
  { id: "cordelius", name: "科迪琉斯", enName: "Cordelius", emoji: "🍄", rarity: "legendary", cdnId: 16000070 , traitTags: ["range_close_medium", "enemy_lockdown", "debuff"], stats: { health: 7000, attack: "1600", reloadMs: 1200, range: 5.33, moveSpeed: 855, ammo: 3 }},
  { id: "kit", name: "凯特", enName: "Kit", emoji: "🐱", rarity: "legendary", cdnId: 16000076 , traitTags: ["range_close", "dash", "healing", "thrower"], stats: { health: 6200, attack: "2000", reloadMs: 800, range: 3.67, moveSpeed: 855, ammo: 3 }},
  { id: "draco", name: "德拉科", enName: "Draco", emoji: "🐲", rarity: "legendary", cdnId: 16000080 , traitTags: ["tank", "range_close"], stats: { health: 11200, attack: "1400", reloadMs: 1000, range: 4, moveSpeed: 750, ammo: 3 }},
  { id: "kenji", name: "健次", enName: "Kenji", emoji: "🍣", rarity: "legendary", cdnId: 16000085 , traitTags: ["dash", "range_close"], stats: { health: 8000, attack: "1500", reloadMs: 1000, range: 2.67, moveSpeed: 855, ammo: 3 }},
  { id: "pierce", name: "皮尔斯", enName: "Pierce", emoji: "🏹", rarity: "legendary", cdnId: 16000099 , traitTags: ["range_medium_long", "single_shot"], stats: { health: 6000, attack: "1900", reloadMs: 0, range: 10, moveSpeed: 750, ammo: 3 }},
  { id: "nori", name: "阿宪", enName: "Nori", emoji: "🍡", rarity: "legendary", cdnId: 16000107, borderless: true, traitTags: ["range_close", "dash", "team_engage"], stats: { health: 7000, attack: "2000", reloadMs: 100, range: 3.67, moveSpeed: 855, ammo: 1 }},
  // 超凡
  { id: "kaze", name: "风姬", enName: "Kaze", emoji: "🌬️", rarity: "extraordinary", cdnId: 16000094, specialtyModes: ["heist"], traitTags: ["range_close_medium", "dash", "area_control"], stats: { health: 8200, attack: "1500", reloadMs: 1000, range: 2.67, moveSpeed: 855, ammo: 3 }},
  { id: "sirius", name: "西里乌斯", enName: "Sirius", emoji: "🌟", rarity: "extraordinary", cdnId: 16000102 , traitTags: ["thrower", "range_close_medium", "multiple_summons"], stats: { health: 6800, attack: "2400", reloadMs: 1600, range: 7.33, moveSpeed: 750, ammo: 3 }},
];

/**
 * 综合评级（S/A/B/C/D/F），按用户提供的最新强度表维护。
 */
export const HERO_TIERS: Record<string, Tier> = {
  // S
  el_primo: "S", gus: "S", shade: "S", windy: "S", max: "S", amber: "S", nori: "S",
  // A
  brock: "A", poco: "A", "8bit": "A", rico: "A", ash: "A", bo: "A",
  colette: "A", griff: "A", maisie: "A", edgar: "A", emz: "A", stu: "A",
  gene: "A", lumi: "A", starr_nova: "A", lou: "A", mortis: "A", otis: "A",
  byron: "A", surge: "A", meg: "A", pierce: "A", kenji: "A", sirius: "A", kaze: "A",
  mina: "A", moe: "A",
  // B
  colt: "B", nita: "B", jessie: "B", penny: "B", carl: "B", angelo: "B",
  belle: "B", berry: "B", bibi: "B", bonnie: "B", bolt: "B", piper: "B",
  meeple: "B", larry_lawrie: "B", janet: "B", pam: "B", pearl: "B", lola: "B", chuck: "B",
  charlie: "B", finx: "B", glowy: "B", buzz: "B", gray: "B", tara: "B",
  jae_yong: "B", najia: "B", ruffs: "B", cordelius: "B",
  crow: "B", sandy: "B", kit: "B", leon: "B", chester: "B",
  // C
  bull: "C", barley: "C", dynamike: "C", bea: "C", frank: "C", gale: "C",
  nani: "C", trunk: "C", mandy: "C", alli: "C", clancy: "C", eve: "C",
  damian: "C", gigi: "C", juju: "C", lily: "C", melodie: "C", mico: "C",
  ollie: "C", rt: "C", sprout: "C", squeak: "C", willow: "C", buster: "C",
  draco: "C", spike: "C",
  // D
  shelly: "D", tick: "D", sam: "D", hank: "D", fang: "D", ziggy: "D",
  // F
  rosa: "F", darryl: "F", jacky: "F", grom: "F", doug: "F", mr_p: "F",
};

/** 将评级写回 Hero；未评级角色保持 tier 为空 */
for (const h of HEROES) {
  if (!h.disabled && HERO_TIERS[h.id]) {
    h.tier = HERO_TIERS[h.id];
  }
}

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
export const MIN_TURN_DURATION_SECONDS = 5;
export const MAX_TURN_DURATION_SECONDS = 300;
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
  /** 双方同时禁用角色的总时限（秒） */
  banDurationSeconds: number;
  /** 每一手选择角色的时限（秒） */
  pickDurationSeconds: number;
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

export type GameMode = "brawl_ball" | "gem_grab" | "hot_zone" | "bounty" | "knockout" | "heist";
export type SpecialtyMode = GameMode;
export type HeroTraitTag = "anti_burst" | "anti_dash" | "anti_grouped" | "anti_healing" | "anti_multiple_summons" | "anti_single_shot" | "anti_tank" | "area_control" | "burst_fire" | "cleanse" | "dash" | "debuff" | "enemy_lockdown" | "grass_cover" | "grouped" | "healing" | "lane_dominance" | "multiple_summons" | "positive_buff" | "range_all" | "range_close" | "range_close_long" | "range_close_medium" | "range_medium" | "range_medium_long" | "range_long" | "shield_grant" | "single_shot" | "strong_self_preservation" | "summoned_unit" | "tank" | "team_engage" | "thrower" | "ultra_range_execute" | "wall_breaker" | "wall_cover" | "water_route";

/** 角色特性使用的六种模式；独立于当前有地图数据的 BP 模式。 */
export const SPECIALTY_MODES: { id: SpecialtyMode; name: string; icon: string }[] = [
  { id: "brawl_ball", name: "足球", icon: "/brawl-stars/res/img/modes/icon_brawl_ball.webp" },
  { id: "gem_grab", name: "宝石", icon: "/brawl-stars/res/img/modes/icon_gem_grab.webp" },
  { id: "heist", name: "金库", icon: "/brawl-stars/res/img/modes/icon_heist.webp" },
  { id: "hot_zone", name: "热区", icon: "/brawl-stars/res/img/modes/icon_hot_zone.webp" },
  { id: "bounty", name: "赏金", icon: "/brawl-stars/res/img/modes/icon_bounty.webp" },
  { id: "knockout", name: "淘汰", icon: "/brawl-stars/res/img/modes/icon_knockout.webp" },
  { id: "heist", name: "金库", icon: "/brawl-stars/res/img/modes/icon_heist.webp" },
];

/** 已审核通过的角色战斗特性标签。距离标签的三道弧分别独立表示近、中、长距离。 */
export const HERO_TRAIT_TAGS: { id: HeroTraitTag; name: string; icon: string }[] = [
  { id: "anti_burst", name: "克制多发射手", icon: "/assets/hero-tags/anti-burst.png" },
  { id: "anti_dash", name: "防御突进", icon: "/assets/hero-tags/anti-dash.png" },
  { id: "anti_grouped", name: "克制抱团", icon: "/assets/hero-tags/anti-multiple-summons.png" },
  { id: "anti_healing", name: "限制治疗", icon: "/assets/hero-tags/anti-healing.png" },
  { id: "anti_multiple_summons", name: "反制多重召唤物", icon: "/assets/hero-tags/anti-multiple-summons.png" },
  { id: "anti_single_shot", name: "克制单发射手", icon: "/assets/hero-tags/shield-grant.png" },
  { id: "anti_tank", name: "反制坦克", icon: "/assets/hero-tags/anti-tank.png" },
  { id: "area_control", name: "区域控制", icon: "/assets/hero-tags/area-control.png" },
  { id: "burst_fire", name: "多连发子弹", icon: "/assets/hero-tags/burst-fire.png" },
  { id: "cleanse", name: "解除 Debuff", icon: "/assets/hero-tags/cleanse.png" },
  { id: "dash", name: "突进", icon: "/assets/hero-tags/dash.png" },
  { id: "debuff", name: "施加负面效果", icon: "/assets/hero-tags/debuff.png" },
  { id: "enemy_lockdown", name: "限制敌人造成减员", icon: "/assets/hero-tags/enemy-lockdown.png" },
  { id: "grass_cover", name: "利用草丛", icon: "/assets/hero-tags/grass-cover.png" },
  { id: "grouped", name: "抱团", icon: "/assets/hero-tags/grouped.png" },
  { id: "healing", name: "治疗", icon: "/assets/hero-tags/healing.png" },
  { id: "lane_dominance", name: "强势对线", icon: "/assets/hero-tags/lane-dominance.png" },
  { id: "multiple_summons", name: "多重召唤物", icon: "/assets/hero-tags/multiple-summons.png" },
  { id: "positive_buff", name: "增益 Buff", icon: "/assets/hero-tags/positive-buff.png" },
  { id: "range_all", name: "近中远距离", icon: "/assets/hero-tags/range-all.png" },
  { id: "range_close", name: "近距离", icon: "/assets/hero-tags/range-close.png" },
  { id: "range_close_long", name: "近/远距离", icon: "/assets/hero-tags/range-close-long.png" },
  { id: "range_close_medium", name: "中近距离", icon: "/assets/hero-tags/range-close-medium.png" },
  { id: "range_medium", name: "中距离", icon: "/assets/hero-tags/range-medium.png" },
  { id: "range_medium_long", name: "中长距离", icon: "/assets/hero-tags/range-medium-long.png" },
  { id: "range_long", name: "长距离", icon: "/assets/hero-tags/range-long.png" },
  { id: "shield_grant", name: "提供护盾", icon: "/assets/hero-tags/shield-grant.png" },
  { id: "single_shot", name: "单发射手", icon: "/assets/hero-tags/single-shot.png" },
  { id: "strong_self_preservation", name: "强自保", icon: "/assets/hero-tags/strong-self-preservation.png" },
  { id: "summoned_unit", name: "召唤物", icon: "/assets/hero-tags/summoned-unit.png" },
  { id: "tank", name: "坦克", icon: "/assets/hero-tags/tank.png" },
  { id: "team_engage", name: "开团破阵", icon: "/assets/hero-tags/team-engage.png" },
  { id: "thrower", name: "投手", icon: "/assets/hero-tags/thrower.png" },
  { id: "ultra_range_execute", name: "超远距离斩杀", icon: "/assets/hero-tags/ultra-range-execute.png" },
  { id: "wall_breaker", name: "破墙", icon: "/assets/hero-tags/wall-breaker.png" },
  { id: "wall_cover", name: "利用墙体", icon: "/assets/hero-tags/wall-cover.png" },
  { id: "water_route", name: "走水路", icon: "/assets/hero-tags/water-route.png" },
];

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

export const MAPS: BrawlMap[] = [
  // ===== Brawl Ball (足球) =====
  { id: "bs_15000024", name: "Backyard Bowl", mode: "brawl_ball", thumbnail: "/brawlscout/map-img/backyard-bowl-15000024.webp" },
  { id: "bs_15000143", name: "Beach Ball", mode: "brawl_ball", thumbnail: "/brawlscout/map-img/beach-ball-15000143.webp" },
  { id: "bs_15001270", name: "Bustling Business", mode: "brawl_ball", thumbnail: "/brawlscout/map-img/bustling-business-15001270.webp" },
  { id: "bs_15000132", name: "Center Stage", mode: "brawl_ball", thumbnail: "/brawlscout/map-img/center-stage-15000132.webp" },
  { id: "bs_15001271", name: "Deadlock", mode: "brawl_ball", thumbnail: "/brawlscout/map-img/deadlock-15001271.webp" },
  { id: "bs_15001093", name: "Flute Chutes", mode: "brawl_ball", thumbnail: "/brawlscout/map-img/flute-chutes-15001093.webp" },
  { id: "bs_15001204", name: "Goalies", mode: "brawl_ball", thumbnail: "/brawlscout/map-img/goalies-15001204.webp" },
  { id: "bs_15001094", name: "Grab The Moment", mode: "brawl_ball", thumbnail: "/brawlscout/map-img/grab-the-moment-15001094.webp" },
  { id: "bs_15001020", name: "Grass Knot", mode: "brawl_ball", thumbnail: "/brawlscout/map-img/grass-knot-15001020.webp" },
  { id: "bs_15001054", name: "Match 1123581321", mode: "brawl_ball", thumbnail: "/brawlscout/map-img/match-1123581321-15001054.webp" },
  { id: "bs_15001205", name: "No Good Deed", mode: "brawl_ball", thumbnail: "/brawlscout/map-img/no-good-deed-15001205.webp" },
  { id: "bs_15001168", name: "Nutmeg", mode: "brawl_ball", thumbnail: "/brawlscout/map-img/nutmeg-15001168.webp" },
  { id: "bs_15000118", name: "Pinball Dreams", mode: "brawl_ball", thumbnail: "/brawlscout/map-img/pinball-dreams-15000118.webp" },
  { id: "bs_15000026", name: "Pinhole Punt", mode: "brawl_ball", thumbnail: "/brawlscout/map-img/pinhole-punt-15000026.webp" },
  { id: "bs_15000928", name: "Priceless Cactus", mode: "brawl_ball", thumbnail: "/brawlscout/map-img/priceless-cactus-15000928.webp" },
  { id: "bs_15000929", name: "Rooftop Runners", mode: "brawl_ball", thumbnail: "/brawlscout/map-img/rooftop-runners-15000929.webp" },
  { id: "bs_15001053", name: "Sidetrack", mode: "brawl_ball", thumbnail: "/brawlscout/map-img/sidetrack-15001053.webp" },
  { id: "bs_15001167", name: "Singed Earth", mode: "brawl_ball", thumbnail: "/brawlscout/map-img/singed-earth-15001167.webp" },
  { id: "bs_15000050", name: "Sneaky Fields", mode: "brawl_ball", thumbnail: "/brawlscout/map-img/sneaky-fields-15000050.webp" },
  { id: "bs_15001021", name: "Spiraling Out", mode: "brawl_ball", thumbnail: "/brawlscout/map-img/spiraling-out-15001021.webp" },
  { id: "bs_15000144", name: "Sunny Soccer", mode: "brawl_ball", thumbnail: "/brawlscout/map-img/sunny-soccer-15000144.webp" },
  { id: "bs_15000051", name: "Super Beach", mode: "brawl_ball", thumbnail: "/brawlscout/map-img/super-beach-15000051.webp" },
  { id: "bs_15000025", name: "Triple Dribble", mode: "brawl_ball", thumbnail: "/brawlscout/map-img/triple-dribble-15000025.webp" },

  // ===== Gem Grab (宝石) =====
  { id: "bs_15001090", name: "Afterparty", mode: "gem_grab", thumbnail: "/brawlscout/map-img/afterparty-15001090.webp" },
  { id: "bs_15001246", name: "Ancestral Roots", mode: "gem_grab", thumbnail: "/brawlscout/map-img/ancestral-roots-15001246.webp" },
  { id: "bs_15001089", name: "Atlas", mode: "gem_grab", thumbnail: "/brawlscout/map-img/atlas-15001089.webp" },
  { id: "bs_15001274", name: "Bottom Two", mode: "gem_grab", thumbnail: "/brawlscout/map-img/bottom-two-15001274.webp" },
  { id: "bs_15000008", name: "Crystal Arcade", mode: "gem_grab", thumbnail: "/brawlscout/map-img/crystal-arcade-15000008.webp" },
  { id: "bs_15000009", name: "Deathcap Trap", mode: "gem_grab", thumbnail: "/brawlscout/map-img/deathcap-trap-15000009.webp" },
  { id: "bs_15000115", name: "Double Swoosh", mode: "gem_grab", thumbnail: "/brawlscout/map-img/double-swoosh-15000115.webp" },
  { id: "bs_15001052", name: "Extreme Nonchalance", mode: "gem_grab", thumbnail: "/brawlscout/map-img/extreme-nonchalance-15001052.webp" },
  { id: "bs_15001172", name: "Fortress Fall", mode: "gem_grab", thumbnail: "/brawlscout/map-img/fortress-fall-15001172.webp" },
  { id: "bs_15000010", name: "Gem Fort", mode: "gem_grab", thumbnail: "/brawlscout/map-img/gem-fort-15000010.webp" },
  { id: "bs_15000007", name: "Hard Rock Mine", mode: "gem_grab", thumbnail: "/brawlscout/map-img/hard-rock-mine-15000007.webp" },
  { id: "bs_15001275", name: "Let Me Dance", mode: "gem_grab", thumbnail: "/brawlscout/map-img/let-me-dance-15001275.webp" },
  { id: "bs_15000931", name: "Lilygear Lake", mode: "gem_grab", thumbnail: "/brawlscout/map-img/lilygear-lake-15000931.webp" },
  { id: "bs_15000932", name: "Local Restaurants", mode: "gem_grab", thumbnail: "/brawlscout/map-img/local-restaurants-15000932.webp" },
  { id: "bs_15001026", name: "On A Roll", mode: "gem_grab", thumbnail: "/brawlscout/map-img/on-a-roll-15001026.webp" },
  { id: "bs_15000499", name: "Open Space", mode: "gem_grab", thumbnail: "/brawlscout/map-img/open-space-15000499.webp" },
  { id: "bs_15001208", name: "Picturesque", mode: "gem_grab", thumbnail: "/brawlscout/map-img/picturesque-15001208.webp" },
  { id: "bs_15001123", name: "Railroad Robbery", mode: "gem_grab", thumbnail: "/brawlscout/map-img/railroad-robbery-15001123.webp" },
  { id: "bs_15000343", name: "Rustic Arcade", mode: "gem_grab", thumbnail: "/brawlscout/map-img/rustic-arcade-15000343.webp" },
  { id: "bs_15001209", name: "Satomi Springs", mode: "gem_grab", thumbnail: "/brawlscout/map-img/satomi-springs-15001209.webp" },
  { id: "bs_15001171", name: "Snake Pit", mode: "gem_grab", thumbnail: "/brawlscout/map-img/snake-pit-15001171.webp" },
  { id: "bs_15001027", name: "Storage Sector", mode: "gem_grab", thumbnail: "/brawlscout/map-img/storage-sector-15001027.webp" },
  { id: "bs_15000011", name: "Undermine", mode: "gem_grab", thumbnail: "/brawlscout/map-img/undermine-15000011.webp" },
  { id: "bs_15001051", name: "Whisper Vale", mode: "gem_grab", thumbnail: "/brawlscout/map-img/whisper-vale-15001051.webp" },

  // ===== Hot Zone (热区) =====
  { id: "bs_15001022", name: "Abracadabra", mode: "hot_zone", thumbnail: "/brawlscout/map-img/abracadabra-15001022.webp" },
  { id: "bs_15001092", name: "Back Shuffle", mode: "hot_zone", thumbnail: "/brawlscout/map-img/back-shuffle-15001092.webp" },
  { id: "bs_15000306", name: "Dueling Beetles", mode: "hot_zone", thumbnail: "/brawlscout/map-img/dueling-beetles-15000306.webp" },
  { id: "bs_15000927", name: "Fishing Bed", mode: "hot_zone", thumbnail: "/brawlscout/map-img/fishing-bed-15000927.webp" },
  { id: "bs_15001202", name: "Golden Bay", mode: "hot_zone", thumbnail: "/brawlscout/map-img/golden-bay-15001202.webp" },
  { id: "bs_15001203", name: "Hyacinth House", mode: "hot_zone", thumbnail: "/brawlscout/map-img/hyacinth-house-15001203.webp" },
  { id: "bs_15001023", name: "In The Liminal", mode: "hot_zone", thumbnail: "/brawlscout/map-img/in-the-liminal-15001023.webp" },
  { id: "bs_15001091", name: "Just Another Race To Anywhere", mode: "hot_zone", thumbnail: "/brawlscout/map-img/just-another-race-to-anywhere-15001091.webp" },
  { id: "bs_15000292", name: "Open Business", mode: "hot_zone", thumbnail: "/brawlscout/map-img/open-business-15000292.webp" },
  { id: "bs_15000527", name: "Open Zone", mode: "hot_zone", thumbnail: "/brawlscout/map-img/open-zone-15000527.webp" },
  { id: "bs_15000293", name: "Parallel Plays", mode: "hot_zone", thumbnail: "/brawlscout/map-img/parallel-plays-15000293.webp" },
  { id: "bs_15001057", name: "Playmaker", mode: "hot_zone", thumbnail: "/brawlscout/map-img/playmaker-15001057.webp" },
  { id: "bs_15001268", name: "Reach For The Stars", mode: "hot_zone", thumbnail: "/brawlscout/map-img/reach-for-the-stars-15001268.webp" },
  { id: "bs_15000300", name: "Ring Of Fire", mode: "hot_zone", thumbnail: "/brawlscout/map-img/ring-of-fire-15000300.webp" },
  { id: "bs_15001165", name: "Tax Evasion", mode: "hot_zone", thumbnail: "/brawlscout/map-img/tax-evasion-15001165.webp" },
  { id: "bs_15001166", name: "The Seven Pillars Of Humanity", mode: "hot_zone", thumbnail: "/brawlscout/map-img/the-seven-pillars-of-humanity-15001166.webp" },
  { id: "bs_15001126", name: "Ticket To Die", mode: "hot_zone", thumbnail: "/brawlscout/map-img/ticket-to-die-15001126.webp" },
  { id: "bs_15001269", name: "Under Pressure", mode: "hot_zone", thumbnail: "/brawlscout/map-img/under-pressure-15001269.webp" },
  { id: "bs_15001125", name: "Zone Splitting", mode: "hot_zone", thumbnail: "/brawlscout/map-img/zone-splitting-15001125.webp" },

  // ===== Bounty (赏金) =====
  { id: "bs_15000935", name: "Brace For Impact", mode: "bounty", thumbnail: "/brawlscout/map-img/brace-for-impact-15000935.webp" },
  { id: "bs_15001176", name: "Choral Chambers", mode: "bounty", thumbnail: "/brawlscout/map-img/choral-chambers-15001176.webp" },
  { id: "bs_15000553", name: "Dont Turn Around", mode: "bounty", thumbnail: "/brawlscout/map-img/dont-turn-around-15000553.webp" },
  { id: "bs_15000083", name: "Dry Season", mode: "bounty", thumbnail: "/brawlscout/map-img/dry-season-15000083.webp" },
  { id: "bs_15000022", name: "Hideout", mode: "bounty", thumbnail: "/brawlscout/map-img/hideout-15000022.webp" },
  { id: "bs_15001220", name: "Hit And Run", mode: "bounty", thumbnail: "/brawlscout/map-img/hit-and-run-15001220.webp" },
  { id: "bs_15000082", name: "Layer Cake", mode: "bounty", thumbnail: "/brawlscout/map-img/layer-cake-15000082.webp" },
  { id: "bs_15000295", name: "No Excuses", mode: "bounty", thumbnail: "/brawlscout/map-img/no-excuses-15000295.webp" },
  { id: "bs_15000005", name: "Shooting Star", mode: "bounty", thumbnail: "/brawlscout/map-img/shooting-star-15000005.webp" },
  { id: "bs_15000554", name: "Side By Side", mode: "bounty", thumbnail: "/brawlscout/map-img/side-by-side-15000554.webp" },
  { id: "bs_15001067", name: "Starrburst", mode: "bounty", thumbnail: "/brawlscout/map-img/starrburst-15001067.webp" },
  { id: "bs_15001287", name: "Supercut", mode: "bounty", thumbnail: "/brawlscout/map-img/supercut-15001287.webp" },
  { id: "bs_15001288", name: "Tasty Berry", mode: "bounty", thumbnail: "/brawlscout/map-img/tasty-berry-15001288.webp" },
  { id: "bs_15001175", name: "Wall Hugging", mode: "bounty", thumbnail: "/brawlscout/map-img/wall-hugging-15001175.webp" },
  { id: "bs_15001219", name: "Watermelons", mode: "bounty", thumbnail: "/brawlscout/map-img/watermelons-15001219.webp" },

  // ===== Knockout (淘汰) =====
  { id: "bs_15001096", name: "A Ballad About Minced Cutlets", mode: "knockout", thumbnail: "/brawlscout/map-img/a-ballad-about-minced-cutlets-15001096.webp" },
  { id: "bs_15000368", name: "Belles Rock", mode: "knockout", thumbnail: "/brawlscout/map-img/belles-rock-15000368.webp" },
  { id: "bs_15001059", name: "Call Of The Water", mode: "knockout", thumbnail: "/brawlscout/map-img/call-of-the-water-15001059.webp" },
  { id: "bs_15001127", name: "Chivalry", mode: "knockout", thumbnail: "/brawlscout/map-img/chivalry-15001127.webp" },
  { id: "bs_15001211", name: "Crab Claws", mode: "knockout", thumbnail: "/brawlscout/map-img/crab-claws-15001211.webp" },
  { id: "bs_15000429", name: "Deep End", mode: "knockout", thumbnail: "/brawlscout/map-img/deep-end-15000429.webp" },
  { id: "bs_15001018", name: "Double Decker", mode: "knockout", thumbnail: "/brawlscout/map-img/double-decker-15001018.webp" },
  { id: "bs_15000440", name: "Flaring Phoenix", mode: "knockout", thumbnail: "/brawlscout/map-img/flaring-phoenix-15000440.webp" },
  { id: "bs_15000502", name: "Flowing Springs", mode: "knockout", thumbnail: "/brawlscout/map-img/flowing-springs-15000502.webp" },
  { id: "bs_15000734", name: "Four Levels", mode: "knockout", thumbnail: "/brawlscout/map-img/four-levels-15000734.webp" },
  { id: "bs_15000367", name: "Goldarm Gulch", mode: "knockout", thumbnail: "/brawlscout/map-img/goldarm-gulch-15000367.webp" },
  { id: "bs_15000882", name: "H For...", mode: "knockout", thumbnail: "/brawlscout/map-img/h-for-15000882.webp" },
  { id: "bs_15000581", name: "Healthy Middle Ground", mode: "knockout", thumbnail: "/brawlscout/map-img/healthy-middle-ground-15000581.webp" },
  { id: "bs_15001276", name: "Jungle Top", mode: "knockout", thumbnail: "/brawlscout/map-img/jungle-top-15001276.webp" },
  { id: "bs_15001173", name: "Konnakol", mode: "knockout", thumbnail: "/brawlscout/map-img/konnakol-15001173.webp" },
  { id: "bs_15001277", name: "Leaping Dogs", mode: "knockout", thumbnail: "/brawlscout/map-img/leaping-dogs-15001277.webp" },
  { id: "bs_15000703", name: "New Horizons", mode: "knockout", thumbnail: "/brawlscout/map-img/new-horizons-15000703.webp" },
  { id: "bs_15000528", name: "New Perspective", mode: "knockout", thumbnail: "/brawlscout/map-img/new-perspective-15000528.webp" },
  { id: "bs_15001210", name: "Opening Move", mode: "knockout", thumbnail: "/brawlscout/map-img/opening-move-15001210.webp" },
  { id: "bs_15000548", name: "Out In The Open", mode: "knockout", thumbnail: "/brawlscout/map-img/out-in-the-open-15000548.webp" },
  { id: "bs_15001095", name: "Party For You", mode: "knockout", thumbnail: "/brawlscout/map-img/party-for-you-15001095.webp" },
  { id: "bs_15001179", name: "Pinned Down", mode: "knockout", thumbnail: "/brawlscout/map-img/pinned-down-15001179.webp" },
  { id: "bs_15001247", name: "Please Remain Standing", mode: "knockout", thumbnail: "/brawlscout/map-img/please-remain-standing-15001247.webp" },
  { id: "bs_15001019", name: "Streets With No Name", mode: "knockout", thumbnail: "/brawlscout/map-img/streets-with-no-name-15001019.webp" },
  { id: "bs_15001058", name: "Think Ahead", mode: "knockout", thumbnail: "/brawlscout/map-img/think-ahead-15001058.webp" },

  // ===== Heist (金库) =====
  { id: "bs_15001098", name: "All Things Wicked", mode: "heist", thumbnail: "/brawlscout/map-img/all-things-wicked-15001098.webp" },
  { id: "bs_15001169", name: "Aridity", mode: "heist", thumbnail: "/brawlscout/map-img/aridity-15001169.webp" },
  { id: "bs_15000072", name: "Bridge Too Far", mode: "heist", thumbnail: "/brawlscout/map-img/bridge-too-far-15000072.webp" },
  { id: "bs_15001063", name: "Corner Cave", mode: "heist", thumbnail: "/brawlscout/map-img/corner-cave-15001063.webp" },
  { id: "bs_15001245", name: "Eating Good", mode: "heist", thumbnail: "/brawlscout/map-img/eating-good-15001245.webp" },
  { id: "bs_15000900", name: "Gg 2.0", mode: "heist", thumbnail: "/brawlscout/map-img/gg-2-0-15000900.webp" },
  { id: "bs_15000053", name: "Hot Potato", mode: "heist", thumbnail: "/brawlscout/map-img/hot-potato-15000053.webp" },
  { id: "bs_15001272", name: "Hot Tubs", mode: "heist", thumbnail: "/brawlscout/map-img/hot-tubs-15001272.webp" },
  { id: "bs_15001273", name: "Jedna", mode: "heist", thumbnail: "/brawlscout/map-img/jedna-15001273.webp" },
  { id: "bs_15000018", name: "Kaboom Canyon", mode: "heist", thumbnail: "/brawlscout/map-img/kaboom-canyon-15000018.webp" },
  { id: "bs_15001207", name: "Perpetual Motion", mode: "heist", thumbnail: "/brawlscout/map-img/perpetual-motion-15001207.webp" },
  { id: "bs_15001099", name: "Photic Doom", mode: "heist", thumbnail: "/brawlscout/map-img/photic-doom-15001099.webp" },
  { id: "bs_15000137", name: "Pit Stop", mode: "heist", thumbnail: "/brawlscout/map-img/pit-stop-15000137.webp" },
  { id: "bs_15000933", name: "Plain Text", mode: "heist", thumbnail: "/brawlscout/map-img/plain-text-15000933.webp" },
  { id: "bs_15001170", name: "Quintillion", mode: "heist", thumbnail: "/brawlscout/map-img/quintillion-15001170.webp" },
  { id: "bs_15000019", name: "Safe Zone", mode: "heist", thumbnail: "/brawlscout/map-img/safe-zone-15000019.webp" },
  { id: "bs_15001024", name: "Subway Turfers", mode: "heist", thumbnail: "/brawlscout/map-img/subway-turfers-15001024.webp" },
  { id: "bs_15001206", name: "Tuning Fork", mode: "heist", thumbnail: "/brawlscout/map-img/tuning-fork-15001206.webp" },
  { id: "bs_15001062", name: "Zip Zap Zoom", mode: "heist", thumbnail: "/brawlscout/map-img/zip-zap-zoom-15001062.webp" },

];

// 派生索引与资源 URL 位于 catalog.ts，避免协议文件继续承担视图职责。

