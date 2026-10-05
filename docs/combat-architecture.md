# 战斗系统边界

## 数据来源

角色基础资料只在 `shared/types.ts` 的 `HEROES` 中维护，包括名称、血量、基础攻击字段、装填、射程、移速和弹药。

`src/features/training/characterTrial.ts` 把基础资料转换成战斗世界单位，并补充模拟器专用字段：弹速、弹丸宽度、攻击间隔、装填启动延迟和显示颜色。Gene 的分裂后总射程属于明确的模拟器覆盖值。

角色机制文件只维护该角色独有的规则，例如 Gene 分裂、Colt 连射、Pearl 热量、Mina 连段、Spike 分裂和 Pierce 弹壳。基础属性必须引用 `TRIAL_BRAWLERS`，不得再写数值副本。

## 统一战斗入口

`src/features/training/brawlerCombatSystem.ts` 提供以下公共能力：

- `planBrawlerBasicAttack`：生成一轮普攻的弹丸角度和逐颗出膛时间。
- `combatProjectileDamage`：按弹丸种类解析命中伤害。
- `createBrawlerCombatRuntime`：创建血量、弹药、装填和攻击冷却状态。
- `advanceBrawlerCombatTimers`：推进普通逐发装填与攻击冷却。
- `CombatProjectile`：训练场和小游戏共用的弹丸基础结构。

自动瞄准统一使用 `src/features/training/firing.ts` 的 `nearestAutoAimTarget`，它会排除墙后目标并选取可命中的最近单位。

## 页面职责

`OfflineTrainingGame.tsx` 和 `TidalWave.tsx` 负责输入、场景目标、绘制和模式规则。角色数值、普攻连射计划、通用弹丸结构、伤害解析和自动瞄准不得在页面内重新实现。

特殊装填策略可以留在模式中。例如 Pierce 在潮汐波纹关卡中使用整弹匣装填，因此不调用普通逐发装填函数，但它仍从统一角色配置创建初始状态并读取弹匣容量和装填时间。

## 新增角色流程

1. 在 `shared/types.ts` 补齐基础资料。
2. 在 `characterTrial.ts` 注册模拟器弹道和操作字段。
3. 在独立角色机制文件中实现特殊攻击、技能和强化规则。
4. 在 `planBrawlerBasicAttack` 注册多弹丸的角度和时间轴。
5. 在 `combatProjectileDamage` 注册新的弹丸种类。
6. 页面只把攻击计划转换为场上弹丸，并处理场景碰撞与表现。
