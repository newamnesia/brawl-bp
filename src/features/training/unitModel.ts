import { drawGroundRing, type GroundRingOptions, type GroundRingTeam } from "./groundRing";
import { drawUnitStatusBars, type UnitRelation } from "./statusBars";

type AmmoStatus = { current: number; capacity: number; reloadProgress: number; continuousReload?: boolean };
type TimedStatus = { progress: number; color?: string };

export type TrainingUnitModelOptions = {
  centerX: number;
  centerY: number;
  radiusX: number;
  radiusY: number;
  statusWidth: number;
  health: number;
  maxHealth: number;
  team: GroundRingTeam;
  relation: UnitRelation;
  ammo?: AmmoStatus;
  timedStatus?: TimedStatus;
  equipment?: GroundRingOptions;
  afterGroundRing?: () => void;
};

/** 训练与角色试用共用的人物模型：阵营地面圈、可选环形特效与状态条。 */
export function drawTrainingUnitModel(ctx: CanvasRenderingContext2D, options: TrainingUnitModelOptions) {
  drawGroundRing(ctx, options.centerX, options.centerY, options.radiusX, options.radiusY, options.team, options.equipment);
  options.afterGroundRing?.();
  drawUnitStatusBars(ctx, {
    centerX: options.centerX,
    centerY: options.centerY,
    radiusY: options.radiusY,
    width: options.statusWidth,
    health: options.health,
    maxHealth: options.maxHealth,
    relation: options.relation,
    ammo: options.ammo,
    timedStatus: options.timedStatus,
  });
}
