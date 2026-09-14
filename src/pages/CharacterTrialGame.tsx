import { useSearchParams } from "react-router-dom";
import { isTrialBrawler } from "../features/training/characterTrial";
import OfflineTrainingGame from "./OfflineTrainingGame";

export default function CharacterTrialGame() {
  const [searchParams] = useSearchParams();
  const requestedHero = searchParams.get("hero");
  return <OfflineTrainingGame trialHeroId={isTrialBrawler(requestedHero) ? requestedHero : "piper"} />;
}
