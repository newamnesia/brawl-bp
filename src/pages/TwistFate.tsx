import OfflineTrainingGame from "./OfflineTrainingGame";

/** 关卡页只注入场景，完整战斗逻辑沿用角色试用系统。 */
export default function TwistFate() {
  return <OfflineTrainingGame trialHeroId="gene" scenarioId="twist-fate" />;
}
