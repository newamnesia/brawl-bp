import { Preferences } from '@capacitor/preferences';

export interface TrainingRecord {
  id: string;
  at: string;
  mode: string;
  hero: string;
  result: string;
  duration: number;
  damage: number;
  reactionMs: number | null;
  turnIntervalMs: number | null;
  aimLeadDeg: number | null;
}
const key = 'training-history-v1';
let pending: Promise<void> = Promise.resolve();
export async function readHistory(): Promise<TrainingRecord[]> {
  await pending;
  const { value } = await Preferences.get({ key });
  if (!value) return [];
  const data = JSON.parse(value);
  if (data.version !== 1 || !Array.isArray(data.records)) throw new Error('训练历史格式无法读取');
  return data.records;
}
export function saveTraining(record: TrainingRecord) {
  const task = pending.then(async () => {
    const { value } = await Preferences.get({ key });
    const data = value ? JSON.parse(value) : { version: 1, records: [] };
    if (data.version !== 1 || !Array.isArray(data.records)) throw new Error('训练历史格式无法读取');
    if (!data.records.some((item: TrainingRecord) => item.id === record.id)) data.records.unshift(record);
    await Preferences.set({ key, value: JSON.stringify(data) });
  });
  pending = task.catch(() => {});
  return task;
}
export const mean = (values: number[]): number | null => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
