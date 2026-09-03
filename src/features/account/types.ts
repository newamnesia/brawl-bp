export type Account = { username: string; role: string };
export type DistributionTotal = { bins: number[]; count: number; sum: number };
export type ModeStats = {
  uploads: number;
  stick: DistributionTotal;
  reaction: DistributionTotal;
  turn: DistributionTotal;
};
export type AimingStats = {
  uploads: number;
  lead: DistributionTotal & { max: number };
  emptyAmmoSeconds: number;
  totalSeconds: number;
};
export type PersonalStats = { keyboard: ModeStats; joystick: ModeStats; aiming: AimingStats };
export type RecordDistribution = DistributionTotal & { min: number; max: number };
export type TrainingRecord = {
  id: string;
  kind: "movement" | "aiming";
  uploadedAt: string;
  configuration: Record<string, string | number>;
  controlMode?: "keyboard" | "joystick";
  stick?: RecordDistribution;
  reaction?: RecordDistribution;
  turn?: RecordDistribution;
  lead?: RecordDistribution;
  emptyAmmoSeconds?: number;
  totalSeconds?: number;
  supportsEmptyAmmoRatio?: boolean;
};
export type AdminUser = {
  username: string;
  role: string;
  createdAt: string;
  movementUploads: number;
  aimingUploads: number;
  lastUpload: string | null;
};
