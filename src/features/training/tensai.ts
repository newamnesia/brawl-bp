export const TENSAI_HOLD_SECONDS = 2;

/** Only uninterrupted eligible time counts toward completing a target. */
export function advanceTensaiHold(elapsed: number, dt: number, eligible: boolean) {
  if (!eligible) return 0;
  return Math.min(TENSAI_HOLD_SECONDS, elapsed + Math.max(0, dt));
}
