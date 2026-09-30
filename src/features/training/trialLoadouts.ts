import type { TrialBrawlerId } from "./characterTrial";

export type TrialEquipmentOption = {
  id: string;
  name: string;
  description: string;
};

export type TrialLoadoutDefinition = {
  gadgets: readonly TrialEquipmentOption[];
  starPowers: readonly TrialEquipmentOption[];
  defaultGadget: string;
  defaultStarPower: string;
};

export type TrialLoadoutSelection = {
  gadget: string;
  starPower: string;
};

export const TRIAL_LOADOUTS: Record<TrialBrawlerId, TrialLoadoutDefinition> = {
  piper: {
    gadgets: [
      { id: "autoAimer", name: "自动瞄准器", description: "向最近敌人发射防身弹并击退。" },
      { id: "homemadeRecipe", name: "自制配方", description: "强化下一发普攻，使其追踪敌人。" },
    ],
    starPowers: [
      { id: "ambush", name: "埋伏", description: "在草丛中提高普攻伤害；空白试用地图中不会触发。" },
      { id: "snappySniping", name: "快速狙击", description: "普攻命中后立即恢复0.4发弹药。" },
    ],
    defaultGadget: "homemadeRecipe", defaultStarPower: "snappySniping",
  },
  bea: {
    gadgets: [
      { id: "honeyMolasses", name: "蜂蜜糖浆", description: "放置蜂巢，使附近敌人减速。" },
      { id: "rattledHive", name: "震荡蜂巢", description: "释放环绕扩散的蜜蜂攻击。" },
    ],
    starPowers: [
      { id: "instaBeaload", name: "瞬间充能", description: "强化弹未命中时保留一次强化机会。" },
      { id: "honeycomb", name: "蜂巢护盾", description: "强化弹准备期间获得减伤。" },
    ],
    defaultGadget: "honeyMolasses", defaultStarPower: "instaBeaload",
  },
  max: {
    gadgets: [
      { id: "phaseShifter", name: "相位偏移器", description: "向移动方向冲刺，冲刺期间免疫伤害。" },
      { id: "sneakySneakers", name: "隐秘跑鞋", description: "标记当前位置，延迟后返回并恢复期间损失的生命。" },
    ],
    starPowers: [
      { id: "superCharged", name: "超级充能", description: "移动时逐渐为大招充能。" },
      { id: "runNGun", name: "动感装弹", description: "移动时提高装填速度。" },
    ],
    defaultGadget: "phaseShifter", defaultStarPower: "runNGun",
  },
  byron: {
    gadgets: [
      { id: "shotInTheArm", name: "强效注射", description: "消耗一发弹药并持续治疗自己。" },
      { id: "boosterShots", name: "增强剂", description: "下一次普攻额外发射两支偏转药剂。" },
    ],
    starPowers: [
      { id: "malaise", name: "病入膏肓", description: "大招命中的敌人受到强力治疗削减。" },
      { id: "injection", name: "注射", description: "周期性强化普攻，使其能够穿透目标。" },
    ],
    defaultGadget: "boosterShots", defaultStarPower: "injection",
  },
  pierce: {
    gadgets: [
      { id: "bottomlessMags", name: "Bottomless Mags", description: "立即装填一发并在身边掉落一枚蛋壳。" },
      { id: "youOnlyBrawlTwice", name: "You Only Brawl Twice", description: "吸收场上蛋壳形成衰减护盾，并击退附近敌人。" },
    ],
    starPowers: [
      { id: "missionSwimpossible", name: "Mission: Swimpossible", description: "最后一发普攻命中后使敌人减速。" },
      { id: "slipNSnipe", name: "Slip 'n Snipe", description: "拾取蛋壳后短暂提高移动速度。" },
    ],
    defaultGadget: "bottomlessMags", defaultStarPower: "missionSwimpossible",
  },
  brock: {
    gadgets: [
      { id: "rocketLaces", name: "火箭助推器", description: "脚下爆炸并向当前方向跃进。" },
      { id: "rocketFuel", name: "火箭燃料", description: "强化下一枚火箭：更快、更大并能破墙。" },
    ],
    starPowers: [
      { id: "moreRockets", name: "火箭雨", description: "大招发射更多火箭；当前试用仅复刻普攻。" },
      { id: "rocketNoFour", name: "四号火箭", description: "弹药容量增加至4发。" },
    ],
    defaultGadget: "rocketFuel", defaultStarPower: "rocketNoFour",
  },
  gene: {
    gadgets: [
      { id: "lampBlowout", name: "神灯喷射", description: "击退附近敌人，命中敌方英雄时治疗自己。" },
      { id: "vengefulSpirits", name: "复仇之魂", description: "向范围内敌人发射追踪弹，伤害随距离提高。" },
    ],
    starPowers: [
      { id: "magicPuffs", name: "治愈魔雾", description: "持续治疗附近队友；单人试用中不会作用于自己。" },
      { id: "spiritSlap", name: "灵魂掌掴", description: "大招手掌命中时造成额外伤害。" },
    ],
    defaultGadget: "vengefulSpirits", defaultStarPower: "spiritSlap",
  },
  gray: {
    gadgets: [
      { id: "walkingCane", name: "手杖", description: "强化下一发普攻，命中后拉取敌人。" },
      { id: "grandPiano", name: "大钢琴", description: "下一发普攻落点延迟落下钢琴，造成伤害、击退并破墙。" },
    ],
    starPowers: [
      { id: "fakeInjury", name: "装病", description: "满生命时受到的下一次伤害降低50%。" },
      { id: "newPerspective", name: "新视角", description: "通过传送门后恢复20%最大生命。" },
    ],
    defaultGadget: "walkingCane", defaultStarPower: "newPerspective",
  },
  colt: {
    gadgets: [
      { id: "speedloader", name: "快速装弹", description: "立即向指定方向连续发射两发特殊子弹。" },
      { id: "silverBullet", name: "银弹", description: "强化下一次普攻为单发高伤害破墙子弹。" },
    ],
    starPowers: [
      { id: "slickBoots", name: "特制皮靴", description: "常驻提高移动速度。" },
      { id: "magnumSpecial", name: "特制左轮", description: "提高普攻射程与弹速。" },
    ],
    defaultGadget: "speedloader", defaultStarPower: "slickBoots",
  },
  mina: {
    gadgets: [
      { id: "windmill", name: "风车", description: "放置短暂存在、能够阻挡敌方弹道的风车。" },
      { id: "capoWhat", name: "Capo-What?", description: "下一次普通大招命中后立即充满大招。" },
    ],
    starPowers: [
      { id: "zumZumZum", name: "Zum Zum Zum", description: "第三段普攻命中时按伤害比例治疗自己。" },
      { id: "blownAway", name: "Blown Away", description: "大招额外定身目标。" },
    ],
    defaultGadget: "windmill", defaultStarPower: "zumZumZum",
  },
  spike: {
    gadgets: [
      { id: "poppingPincushion", name: "尖刺针垫", description: "向四周连续发射多轮尖刺。" },
      { id: "lifePlant", name: "生命植物", description: "投掷仙人掌，摧毁后治疗附近友军。" },
    ],
    starPowers: [
      { id: "fertilize", name: "滋养之地", description: "站在自己的大招区域内时持续治疗。" },
      { id: "curveball", name: "旋转刺球", description: "分裂尖刺沿弧线飞行。" },
    ],
    defaultGadget: "lifePlant", defaultStarPower: "curveball",
  },
  pearl: {
    gadgets: [
      { id: "overcooked", name: "烤糊了", description: "下一轮普攻命中后附加持续伤害。" },
      { id: "madeWithLove", name: "爱心烘焙", description: "下一轮普攻改为治疗友方。" },
    ],
    starPowers: [
      { id: "heatRetention", name: "余热保留", description: "释放大招后保留部分热量。" },
      { id: "heatShield", name: "热能护盾", description: "高热量时获得伤害减免。" },
    ],
    defaultGadget: "overcooked", defaultStarPower: "heatShield",
  },
  ollie: {
    gadgets: [
      { id: "regulate", name: "控场滑行", description: "向当前方向突进并在落点催眠敌人。" },
      { id: "allEyezOnMe", name: "全都看我", description: "下一次普攻命中后催眠目标。" },
    ],
    starPowers: [
      { id: "kickPush", name: "借墙加速", description: "靠近墙体时提高移动速度。" },
      { id: "renegade", name: "叛逆者", description: "发动大招冲刺时获得衰减护盾。" },
    ],
    defaultGadget: "regulate", defaultStarPower: "renegade",
  },
};

export function defaultTrialLoadout(heroId: TrialBrawlerId): TrialLoadoutSelection {
  const definition = TRIAL_LOADOUTS[heroId];
  return { gadget: definition.defaultGadget, starPower: definition.defaultStarPower };
}
