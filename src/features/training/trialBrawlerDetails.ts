import { BEA_SUPER, BEA_SUPER_AIM_SECONDS } from "./beaSuper";
import { COLT, COLT_LOADOUT } from "./coltCombat";
import { MAX_PROJECTILE_INTERVAL_SECONDS } from "./config";
import { GENE } from "./geneCombat";
import { GRAY } from "./grayCombat";
import { MINA, MINA_LOADOUT } from "./minaCombat";
import { PIERCE_SHELL, PIERCE_SUPER } from "./pierceCombat";
import { PIPER, PIPER_LOADOUT } from "./piperCombat";
import { SPIKE, SPIKE_LOADOUT } from "./spikeCombat";
import { TRIAL_BRAWLERS, type TrialBrawlerId } from "./characterTrial";

export type TrialBrawlerDetailRow = {
  label: string;
  value: string;
  note?: string;
};

export type TrialBrawlerDetailSection = {
  title: string;
  rows: TrialBrawlerDetailRow[];
};

const units = (value: number) => `${value}（${Number((value / 300).toFixed(2))} 格）`;
const seconds = (value: number) => `${Number(value.toFixed(3))} 秒`;
const percent = (value: number) => `${Number((value * 100).toFixed(3))}%`;
const bonusPercent = (multiplier: number) => `+${percent(multiplier - 1)}`;
const speed = (value: number) => `${Number(value.toFixed(3))} 单位/秒`;
const attackStartInterval = (id: TrialBrawlerId): TrialBrawlerDetailRow => ({
  label: "普攻起手间隔",
  value: seconds(TRIAL_BRAWLERS[id].attackIntervalSeconds),
  note: "两次独立普攻开始之间的最小间隔；不等于同一轮攻击内相邻弹丸的连发间隔。",
});

function base(id: TrialBrawlerId): TrialBrawlerDetailSection {
  const hero = TRIAL_BRAWLERS[id];
  return {
    title: "角色本身（无装备、无增益）",
    rows: [
      { label: "生命值", value: String(hero.health) },
      { label: "移动速度", value: `${hero.moveSpeed} 单位/秒` },
      { label: "弹药容量", value: `${hero.ammoCapacity} 发` },
      { label: "单发装填", value: seconds(hero.reloadSeconds) },
      { label: "攻击后停止装填间隔", value: seconds(hero.reloadDelaySeconds) },
    ],
  };
}

const notImplemented = (label: string): TrialBrawlerDetailSection => ({
  title: "当前实现范围",
  rows: [{ label, value: "未引入试用战斗" }],
});

export const TRIAL_BRAWLER_DETAILS: Partial<Record<TrialBrawlerId, TrialBrawlerDetailSection[]>> = {
  piper: [
    base("piper"),
    {
      title: "普通攻击",
      rows: [
        attackStartInterval("piper"),
        { label: "弹丸数量", value: "1 发" },
        { label: "伤害", value: "720 → 3600", note: "按已飞行距离/3000线性增长，达到最大射程时取满伤害。" },
        { label: "中心射程", value: units(3000) },
        { label: "弹丸速度", value: "4000 单位/秒" },
        { label: "碰撞宽度", value: units(200), note: "半径100。" },
        { label: "满射程飞行时间", value: seconds(3000 / 4000) },
        { label: "瞄准类型", value: "单发直线；70%透明白色矩形指示" },
      ],
    },
    {
      title: "星辉 · 回弹",
      rows: [
        { label: "触发条件", value: "普通攻击命中敌方单位" },
        { label: "即时恢复", value: `${PIPER.snappySnipingAmmoGain} 发弹药` },
        { label: "弹药上限", value: "恢复后不超过3发" },
        { label: "装备状态", value: PIPER_LOADOUT.starPower },
      ],
    },
    notImplemented("大招、妙具、超充与巴菲"),
  ],
  bea: [
    base("bea"),
    {
      title: "普通攻击",
      rows: [
        attackStartInterval("bea"),
        { label: "普通弹伤害", value: "1600" },
        { label: "强化弹伤害", value: "4400" },
        { label: "强化机制", value: "普通弹命中后启用强化弹；强化弹命中后复位" },
        { label: "中心射程", value: units(3000) },
        { label: "弹丸速度", value: "3255 单位/秒" },
        { label: "碰撞宽度", value: units(300), note: "半径150；普通弹和强化弹一致。" },
        { label: "普攻充能", value: "普通/强化命中均为26%" },
      ],
    },
    {
      title: "大招 · 机械蜂群",
      rows: [
        { label: "弹丸数量", value: `${BEA_SUPER.angularSpeeds.length} 发` },
        { label: "单发伤害", value: String(BEA_SUPER.damage) },
        { label: "总路程", value: units(BEA_SUPER.range * 300) },
        { label: "速度", value: `${Math.round(BEA_SUPER.speed * 300)} 单位/秒` },
        { label: "碰撞宽度", value: units(BEA_SUPER.radius * 300 * 2), note: `半径${BEA_SUPER.radius * 300}。` },
        { label: "减速比例", value: percent(1 - BEA_SUPER.slowMultiplier) },
        { label: "减速持续时间", value: seconds(BEA_SUPER.slowMs / 1000) },
        { label: "共同直行阶段", value: seconds(BEA_SUPER.straightSeconds) },
        { label: "转向角速度", value: BEA_SUPER.angularSpeeds.join("、") + " rad/s" },
        { label: "整组全中充能", value: "17.5%", note: "每发均摊2.5%；满充不保存溢出。" },
        { label: "人机瞄准时间", value: `${BEA_SUPER_AIM_SECONDS}秒`, note: "稳定瞄准至少0.12秒后释放。" },
      ],
    },
    notImplemented("妙具、星辉、超充与巴菲"),
  ],
  max: [
    base("max"),
    {
      title: "普通攻击",
      rows: [
        attackStartInterval("max"),
        { label: "每次弹丸", value: "4 发" },
        { label: "单发伤害", value: "640" },
        { label: "理论总伤害", value: "2560" },
        { label: "弹丸连发间隔", value: `${MAX_PROJECTILE_INTERVAL_SECONDS}秒/发`, note: "同一轮普攻的四发依次生成，不同时出膛。" },
        { label: "偏角", value: "0°、−1.5°、+1.5°～+1.8°、−3°" },
        { label: "瞄准覆盖边界", value: "−3° 至 +1.8°" },
        { label: "中心射程", value: units(2500) },
        { label: "弹丸速度", value: "4000 单位/秒" },
        { label: "碰撞宽度", value: units(100), note: "半径50。" },
        { label: "单发大招充能", value: "7.35%", note: "四发全中29.4%。" },
      ],
    },
    {
      title: "大招 · 全速出击",
      rows: [
        { label: "类型", value: "自身周围无指向范围增益" },
        { label: "影响半径", value: units(1200) },
        { label: "持续时间", value: "4 秒" },
        { label: "移动速度加成", value: "+300 单位/秒", note: "自身速度855 → 1155。" },
        { label: "瞄准表现", value: "显示作用区域，不显示方向线" },
      ],
    },
    notImplemented("妙具、星辉、超充；大招不带巴菲效果"),
  ],
  byron: [
    base("byron"),
    {
      title: "普通攻击",
      rows: [
        attackStartInterval("byron"),
        { label: "伤害方式", value: "760 × 3跳 = 2280" },
        { label: "跳伤间隔", value: "1 秒" },
        { label: "中心射程", value: units(3000) },
        { label: "弹丸速度", value: "4000 单位/秒" },
        { label: "碰撞宽度", value: units(300), note: "半径150。" },
        { label: "每跳大招充能", value: "11.3%" },
        { label: "完整命中充能", value: "33.9%" },
      ],
    },
    {
      title: "大招 · 全面治疗",
      rows: [
        { label: "类型", value: "投掷圆形区域" },
        { label: "投掷距离", value: units(2200), note: "拖动距离按比例决定落点；自瞄取目标当前位置。" },
        { label: "投射速度", value: "2000 单位/秒" },
        { label: "爆炸半径", value: units(800) },
        { label: "对敌伤害", value: "3000" },
        { label: "对己治疗", value: "3000" },
        { label: "大招命中充能", value: "24%" },
      ],
    },
    notImplemented("妙具、星辉、超充与巴菲"),
  ],
  pierce: [
    base("pierce"),
    {
      title: "普通攻击",
      rows: [
        attackStartInterval("pierce"),
        { label: "前两发伤害", value: "1900" },
        { label: "最后一发伤害", value: "3000" },
        { label: "中心射程", value: units(3000) },
        { label: "弹丸速度", value: "4000 单位/秒" },
        { label: "普通弹宽度", value: units(200), note: "半径100。" },
        { label: "最后一发宽度", value: units(220), note: "半径110。" },
        { label: "大招充能", value: "普通弹15.425%；最后一发24.375%" },
        { label: "装填规则", value: "三发全部打空后才开始3秒整匣恢复" },
      ],
    },
    {
      title: "蛋壳与自动射击",
      rows: [
        { label: "掉落条件", value: "普攻/追踪弹命中敌方英雄" },
        { label: "不触发对象", value: "金库、召唤物及人形召唤物等非英雄单位" },
        { label: "随机掉落距离", value: `${PIERCE_SHELL.minDistance}～${PIERCE_SHELL.maxDistance}单位` },
        { label: "存在时间", value: seconds(PIERCE_SHELL.lifetimeSeconds) },
        { label: "拾取半径", value: units(PIERCE_SHELL.pickupRadius) },
        { label: "拾取效果", value: "补1发弹药并自动射击" },
        { label: "自动弹伤害", value: "1200" },
        { label: "自动弹射程", value: units(3000) },
        { label: "自动弹速度", value: "4000 单位/秒" },
        { label: "自动弹碰撞宽度", value: units(200) },
        { label: "自动弹充能", value: "9%" },
        { label: "索敌", value: "无视墙体取视野内最近敌方英雄；无目标沿移动方向" },
      ],
    },
    {
      title: "大招 · 全域锁定",
      rows: [
        { label: "选区距离", value: units(PIERCE_SUPER.range) },
        { label: "选区半径", value: units(PIERCE_SUPER.radius) },
        { label: "预警时间", value: seconds(PIERCE_SUPER.warningSeconds) },
        { label: "锁定时间", value: seconds(PIERCE_SUPER.lockSeconds) },
        { label: "目标上限", value: "无限；范围内每名敌方英雄各触发1发" },
        { label: "追踪弹伤害", value: String(PIERCE_SUPER.damage) },
        { label: "追踪弹速度", value: `${PIERCE_SUPER.projectileSpeed} 单位/秒` },
        { label: "追踪弹碰撞半径", value: units(PIERCE_SUPER.projectileRadius) },
        { label: "追踪弹射程", value: units(PIERCE_SUPER.range) },
        { label: "追踪参数", value: `强度${PIERCE_SUPER.steerStrength}；前${PIERCE_SUPER.steerIgnoreSeconds}秒不转向；持续${PIERCE_SUPER.steerSeconds}秒` },
        { label: "拦截", value: "可被非锁定敌方单位途中抵挡" },
        { label: "单发大招充能", value: percent(PIERCE_SUPER.chargePerHit) },
      ],
    },
    notImplemented("妙具、星辉、超充与巴菲"),
  ],
  brock: [
    base("brock"),
    {
      title: "普通攻击",
      rows: [
        attackStartInterval("brock"),
        { label: "直击伤害", value: "2320" },
        { label: "中心射程", value: units(2700) },
        { label: "弹丸速度", value: "2700 单位/秒" },
        { label: "碰撞宽度", value: units(200), note: "半径100。" },
        { label: "爆炸半径", value: units(450) },
        { label: "燃烧区域半径", value: units(300) },
        { label: "燃烧伤害", value: "688/跳" },
        { label: "首跳延迟", value: "0.9秒" },
        { label: "后续跳伤", value: "每1秒一次" },
        { label: "燃烧持续", value: "2.9秒" },
      ],
    },
    notImplemented("大招、妙具、星辉、超充与巴菲"),
  ],
  gene: [
    base("gene"),
    {
      title: "普通攻击",
      rows: [
        attackStartInterval("gene"),
        { label: "直射伤害", value: String(GENE.directDamage) },
        { label: "直射距离", value: units(GENE.directRange) },
        { label: "总射程", value: units(GENE.totalRange), note: "直射结束后分裂继续飞行。" },
        { label: "分裂数量", value: `${GENE.splitCount} 发` },
        { label: "分裂单发伤害", value: String(GENE.splitDamage) },
        { label: "分裂总夹角", value: `${GENE.spreadDegrees}°` },
        { label: "分裂宽度", value: units(GENE.splitWidth) },
        { label: "大招充能", value: `直射${percent(GENE.directSuperCharge)}；分裂每发${percent(GENE.splitSuperCharge)}` },
        { label: "超充充能", value: `直射${percent(GENE.hyperDirectCharge)}；分裂每发${percent(GENE.hyperSplitCharge)}` },
      ],
    },
    {
      title: "大招 · 魔术手",
      rows: [
        { label: "基础射程", value: units(GENE.baseSuperRange) },
        { label: "当前装备射程", value: units(GENE.superRange), note: "神话装备额外增加1格。" },
        { label: "弹丸速度", value: `${GENE.superSpeed} 单位/秒` },
        { label: "碰撞宽度", value: units(GENE.superWidth) },
        { label: "普通拉回速度", value: `${GENE.pullSpeed} 单位/秒` },
        { label: "普通路径", value: "拉取路径破坏墙体" },
      ],
    },
    {
      title: "超充",
      rows: [
        { label: "持续时间", value: seconds(GENE.hyperDurationSeconds) },
        { label: "伤害加成", value: bonusPercent(GENE.hyperDamageMultiplier) },
        { label: "移动速度加成", value: bonusPercent(GENE.hyperSpeedMultiplier) },
        { label: "伤害减免", value: percent(GENE.hyperDamageReduction) },
        { label: "大招手掌", value: "3发" },
        { label: "三发总夹角", value: `${GENE.hyperHandSpreadDegrees}°` },
        { label: "超充大招射程", value: units(GENE.baseSuperRange), note: "三发都不吃神话装备射程加成。" },
        { label: "超充拉回速度", value: `${GENE.hyperPullSpeed} 单位/秒` },
        { label: "超充路径", value: "不破墙" },
      ],
    },
  ],
  gray: [
    base("gray"),
    {
      title: "普通攻击",
      rows: [
        attackStartInterval("gray"),
        { label: "伤害", value: String(GRAY.damage) },
        { label: "射程", value: units(GRAY.range) },
        { label: "速度", value: `${GRAY.projectileSpeed} 单位/秒` },
        { label: "实际碰撞宽度", value: units(GRAY.projectileWidth), note: "半径50；瞄准线同宽。" },
        { label: "大招充能", value: percent(GRAY.superChargePerHit) },
      ],
    },
    {
      title: "妙具 · 手杖",
      rows: [
        { label: "冷却", value: seconds(GRAY.gadgetCooldownSeconds) },
        { label: "效果", value: "强化下一次普攻；启动后不可取消" },
        { label: "钩射程", value: units(GRAY.range), note: "沿用强化普攻的飞行距离。" },
        { label: "钩宽度", value: units(GRAY.caneWidth) },
        { label: "出钩速度", value: `${GRAY.caneOutboundSpeed} 单位/秒` },
        { label: "拉回速度", value: `${GRAY.canePullSpeed} 单位/秒` },
        { label: "最大拉回距离", value: units(GRAY.canePullDistance) },
        { label: "普通钩", value: "短距离硬控拉取并破坏临近地形" },
        { label: "换位钩", value: "命中前位移则钩消失；拉取中位移则继续拖向攻击原点且不破墙" },
      ],
    },
    {
      title: "大招 · 传送门",
      rows: [
        { label: "施放距离", value: units(GRAY.superRange) },
        { label: "施放时间", value: seconds(GRAY.superCastSeconds) },
        { label: "触发半径", value: units(GRAY.portalTriggerRadius) },
        { label: "视觉半径", value: units(GRAY.portalVisualRadius) },
        { label: "激活时间", value: seconds(GRAY.portalActivationSeconds) },
        { label: "激活后空窗", value: seconds(GRAY.portalEntryDelaySeconds) },
        { label: "有效判定持续", value: seconds(GRAY.portalActiveSeconds) },
        { label: "使用后冷却", value: seconds(GRAY.portalPostUseCooldownSeconds) },
        { label: "单次激活限制", value: "每名玩家最多通过一次；玩家数量不限" },
      ],
    },
    notImplemented("星辉、超充与巴菲"),
  ],
  colt: [
    base("colt"),
    {
      title: "普通攻击",
      rows: [
        attackStartInterval("colt"),
        { label: "弹丸", value: `${COLT.attackBullets}发 × ${COLT.attackDamage} = ${COLT.attackBullets * COLT.attackDamage}` },
        { label: "射程", value: units(COLT.attackRange) },
        { label: "弹丸速度", value: `${COLT.attackProjectileSpeed} 单位/秒` },
        { label: "碰撞宽度", value: units(COLT.attackWidth) },
        { label: "弹丸连发间隔", value: seconds(COLT.attackBulletIntervalSeconds), note: "同一轮普攻内相邻两发子弹的出膛间隔。" },
        { label: "单发大招充能", value: percent(COLT.attackSuperCharge) },
        { label: "单发超充充能", value: percent(COLT.attackHyperCharge) },
      ],
    },
    {
      title: "妙具 · 快速装弹",
      rows: [
        { label: "冷却", value: seconds(COLT.speedloaderCooldownSeconds) },
        { label: "发射", value: `${COLT.speedloaderBullets}发 × ${COLT.speedloaderDamage}` },
        { label: "射程", value: units(COLT.attackRange) },
        { label: "弹丸速度", value: `${COLT.attackProjectileSpeed} 单位/秒` },
        { label: "碰撞宽度", value: units(COLT.attackWidth) },
        { label: "弹丸连发间隔", value: seconds(COLT.attackBulletIntervalSeconds) },
        { label: "减速", value: seconds(COLT.speedloaderSlowSeconds) },
        { label: "妙具巴菲", value: `每发偷取${COLT.speedloaderBuffieAmmoSteal}发弹药并补给自身` },
      ],
    },
    {
      title: "星辉 · 特制皮靴及星辉巴菲",
      rows: [
        { label: "常驻速度倍率", value: `×${COLT.slickBootsMultiplier}` },
        { label: "装备后移动速度", value: speed(COLT.baseMoveSpeed * COLT.slickBootsMultiplier), note: `基础${COLT.baseMoveSpeed} × ${COLT.slickBootsMultiplier}。` },
        { label: "星辉巴菲", value: `攻击命中后额外${bonusPercent(COLT.slickBootsBuffieMultiplier)}基础移速，持续${COLT.slickBootsBuffieSeconds}秒` },
        { label: "巴菲生效速度", value: speed(COLT.baseMoveSpeed * (COLT.slickBootsMultiplier + COLT.slickBootsBuffieMultiplier - 1)), note: "常驻+13%与临时+20%按基础移速相加。" },
      ],
    },
    {
      title: "大招",
      rows: [
        { label: "弹丸", value: `${COLT.superBullets}发 × ${COLT.superDamage} = ${COLT.superBullets * COLT.superDamage}` },
        { label: "射程", value: units(COLT.superRange) },
        { label: "弹丸速度", value: `${COLT.superProjectileSpeed} 单位/秒` },
        { label: "普通碰撞宽度", value: units(COLT.superWidth) },
        { label: "超充碰撞宽度", value: units(COLT.hyperSuperWidth) },
        { label: "弹丸连发间隔", value: seconds(COLT.superBulletIntervalSeconds) },
        { label: "性质", value: "穿透目标并破墙；大招可打断普攻" },
        { label: "动作互斥", value: "普攻不能打断大招；妙具不能打断或被打断，必须完整结束" },
        { label: "单发大招回充", value: percent(COLT.superSuperCharge) },
        { label: "单发超充充能", value: percent(COLT.superHyperCharge) },
      ],
    },
    {
      title: "超充与超充巴菲",
      rows: [
        { label: "基础持续", value: seconds(COLT.hyperBaseDurationSeconds) },
        { label: "超充巴菲持续加成", value: `+${COLT.hyperBuffieBonusSeconds}秒` },
        { label: "最终持续", value: `${COLT.hyperBaseDurationSeconds + COLT.hyperBuffieBonusSeconds}秒` },
        { label: "伤害加成", value: bonusPercent(COLT.hyperDamageMultiplier) },
        { label: "移动速度加成", value: bonusPercent(COLT.hyperSpeedMultiplier) },
        { label: "伤害减免", value: percent(COLT.hyperDamageReduction) },
        { label: "超充且装备星辉移速", value: speed(COLT.baseMoveSpeed * (COLT.slickBootsMultiplier + COLT.hyperSpeedMultiplier - 1)) },
        { label: "全部移速增益叠加", value: speed(COLT.baseMoveSpeed * (COLT.slickBootsMultiplier + COLT.slickBootsBuffieMultiplier + COLT.hyperSpeedMultiplier - 2)), note: "特制皮靴、星辉巴菲和超充移速同时生效。" },
        { label: "普攻连发间隔", value: seconds(COLT.hyperAttackBulletIntervalSeconds) },
        { label: "装备状态", value: `${COLT_LOADOUT.gadget} / ${COLT_LOADOUT.starPower} / 全巴菲` },
      ],
    },
  ],
  mina: [
    base("mina"),
    {
      title: "普通攻击 · 三段连携",
      rows: [
        attackStartInterval("mina"),
        { label: "三段伤害", value: MINA.attackDamage.join(" / ") },
        { label: "三段中心射程", value: MINA.attackRange.map(units).join(" / ") },
        { label: "前两段宽度", value: MINA.attackWidth.map(units).join(" / ") },
        { label: "弹丸速度", value: `${MINA.projectileSpeed} 单位/秒` },
        { label: "连携保持", value: seconds(MINA.comboWindowSeconds) },
        { label: "每段冲刺", value: `${MINA.dashDistance}单位，速度${MINA.dashSpeed}` },
        { label: "三段大招充能", value: MINA.attackSuperCharge.map(percent).join(" / ") },
        { label: "三段超充充能", value: MINA.attackHyperCharge.map(percent).join(" / ") },
      ],
    },
    {
      title: "第三段风弹",
      rows: [
        { label: "弹丸数量", value: `${MINA.thirdAttackProjectileCount}发` },
        { label: "总散布", value: `${MINA.thirdAttackSpreadDegrees}°（−32.5°/0°/+32.5°）` },
        { label: "单发碰撞", value: `半径${MINA.thirdAttackProjectileRadius}，宽度${MINA.thirdAttackProjectileRadius * 2}` },
        { label: "中心飞行距离", value: units(MINA.thirdAttackProjectileTravelDistance) },
        { label: "前摇", value: seconds(MINA.thirdAttackWindupSeconds) },
        { label: "前摇限制", value: "前摇期间不能使用妙具或大招" },
        { label: "命中结算", value: "三发可穿透；重叠只结算一次伤害" },
      ],
    },
    {
      title: "妙具与星辉",
      rows: [
        { label: "当前妙具", value: MINA_LOADOUT.gadget === "windmill" ? "风车" : "Capo-What?" },
        { label: "妙具冷却", value: seconds(MINA.gadgetCooldownSeconds) },
        { label: "风车类型", value: "以自身为中心的范围效果，无弹丸射程与弹速" },
        { label: "风车作用半径", value: units(MINA.windmillRadius) },
        { label: "风车持续时间", value: seconds(MINA.windmillDurationSeconds) },
        { label: "备选妙具", value: "Capo-What?：下一次普通大招命中后立即充满大招" },
        { label: "当前星辉", value: MINA_LOADOUT.starPower === "zumZumZum" ? "Zum Zum Zum" : "Blown Away" },
        { label: "Zum Zum Zum", value: `第三段治疗造成伤害的${percent(MINA.zumZumZumHealingRatio)}` },
        { label: "备选星辉", value: `Blown Away：大招额外定身${MINA.blownAwayRootSeconds}秒` },
      ],
    },
    {
      title: "大招",
      rows: [
        { label: "伤害", value: String(MINA.superDamage) },
        { label: "射程", value: units(MINA.superRange) },
        { label: "弹丸速度", value: `${MINA.superSpeed} 单位/秒` },
        { label: "碰撞宽度", value: units(MINA.superWidth) },
        { label: "拉取距离", value: units(MINA.superPullDistance) },
        { label: "拉取速度", value: `${MINA.superPullSpeed} 单位/秒` },
        { label: "悬空上限", value: seconds(MINA.airborneMaxSeconds) },
        { label: "大招充能", value: percent(MINA.superCharge) },
        { label: "超充充能", value: percent(MINA.superHyperCharge) },
      ],
    },
    {
      title: "超充与超充大招",
      rows: [
        { label: "持续", value: seconds(MINA.hyperDurationSeconds) },
        { label: "伤害加成", value: bonusPercent(MINA.hyperDamageMultiplier) },
        { label: "移动速度加成", value: bonusPercent(MINA.hyperSpeedMultiplier) },
        { label: "伤害减免", value: percent(MINA.hyperDamageReduction) },
        { label: "飓风数量", value: `${MINA.hyperHurricaneCount}发` },
        { label: "飓风总夹角", value: `${MINA.hyperSpreadDegrees}°` },
        { label: "速度", value: `${MINA.hyperSuperSpeed} 单位/秒` },
        { label: "反弹", value: `最多${MINA.hyperSuperMaxBounces}次，每次追加${MINA.hyperSuperBounceDistanceBonus}距离` },
        { label: "强化拉取", value: `${MINA.hyperSuperPullDistance}距离，${MINA.hyperSuperPullSpeed}速度` },
      ],
    },
  ],
  spike: [
    base("spike"),
    {
      title: "普通攻击",
      rows: [
        attackStartInterval("spike"),
        { label: "主弹伤害", value: String(SPIKE.attackDamage) },
        { label: "主弹射程", value: units(SPIKE.attackRange) },
        { label: "主弹速度", value: `${SPIKE.attackProjectileSpeed} 单位/秒` },
        { label: "主弹碰撞宽度", value: units(SPIKE.attackWidth) },
        { label: "爆裂半径", value: units(SPIKE.explosionRadius) },
        { label: "分裂刺", value: `${SPIKE.shardCount}发 × ${SPIKE.shardDamage}` },
        { label: "分裂刺速度", value: `${SPIKE.shardSpeed} 单位/秒` },
        { label: "分裂刺碰撞宽度", value: units(SPIKE.shardWidth) },
        { label: "分裂基础射程", value: units(SPIKE.shardBaseRange) },
        { label: "固定初始方向", value: "六向均匀分布，包含正左和正右" },
        { label: "大招充能", value: `每发分裂刺${percent(SPIKE.attackSuperCharge)}` },
      ],
    },
    {
      title: "星辉 · 旋转刺球及巴菲",
      rows: [
        { label: "总偏转", value: `${Number((SPIKE.curveballTurnRadians * 180 / Math.PI).toFixed(1))}°` },
        { label: "转向曲线", value: "进度平方递增；初始角速度接近0" },
        { label: "星辉巴菲额外射程", value: units(SPIKE.curveballBuffieExtraRange) },
        { label: "装备状态", value: `${SPIKE_LOADOUT.starPower} / 巴菲启用` },
      ],
    },
    {
      title: "妙具 · 生命植物及巴菲",
      rows: [
        { label: "投掷距离", value: units(SPIKE.gadgetRange) },
        { label: "投掷速度", value: `${SPIKE.gadgetProjectileSpeed} 单位/秒` },
        { label: "冷却", value: seconds(SPIKE.gadgetCooldownSeconds) },
        { label: "植物生命值", value: String(SPIKE.plantHealth) },
        { label: "植物碰撞半径", value: units(SPIKE.plantRadius) },
        { label: "摧毁治疗", value: `${SPIKE.plantHeal}，半径${units(SPIKE.plantHealRadius)}` },
        { label: "妙具巴菲爆炸", value: `${SPIKE.plantBuffieDamage}伤害，半径${units(SPIKE.plantBuffieBlastRadius)}` },
        { label: "妙具巴菲击退", value: `${SPIKE.plantBuffieKnockback}距离` },
      ],
    },
    {
      title: "大招",
      rows: [
        { label: "投掷距离", value: units(SPIKE.superRange) },
        { label: "投掷速度", value: `${SPIKE.superProjectileSpeed} 单位/秒` },
        { label: "区域半径", value: units(SPIKE.superRadius) },
        { label: "持续时间", value: seconds(SPIKE.superDurationSeconds) },
        { label: "跳伤间隔", value: seconds(SPIKE.superTickSeconds) },
        { label: "每跳伤害", value: String(SPIKE.superDamage) },
        { label: "减速", value: percent(1 - SPIKE.superSlowMultiplier) },
        { label: "每跳大招回充", value: percent(SPIKE.superRechargePerTick) },
      ],
    },
    {
      title: "超充与超充巴菲",
      rows: [
        { label: "充能倍率", value: `大招充能量 × ${SPIKE.hyperChargeMultiplier}` },
        { label: "持续", value: seconds(SPIKE.hyperDurationSeconds) },
        { label: "伤害加成", value: bonusPercent(SPIKE.hyperDamageMultiplier) },
        { label: "移动速度加成", value: bonusPercent(SPIKE.hyperSpeedMultiplier) },
        { label: "伤害减免", value: percent(SPIKE.hyperDamageReduction) },
        { label: "大招半径倍率", value: `×${SPIKE.hyperSuperRadiusMultiplier}` },
        { label: "超充大招半径", value: units(SPIKE.superRadius * SPIKE.hyperSuperRadiusMultiplier) },
        { label: "二次爆炸延迟", value: seconds(SPIKE.hyperSecondExplosionDelaySeconds) },
        { label: "装备状态", value: "超充巴菲启用" },
      ],
    },
  ],
};

export function trialBrawlerDetails(heroId: string): TrialBrawlerDetailSection[] | undefined {
  return TRIAL_BRAWLER_DETAILS[heroId as TrialBrawlerId];
}
