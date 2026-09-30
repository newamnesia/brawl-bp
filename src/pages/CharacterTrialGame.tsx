import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { isTrialBrawler, TRIAL_BRAWLERS } from "../features/training/characterTrial";
import {
  defaultTrialLoadout,
  TRIAL_LOADOUTS,
  type TrialLoadoutSelection,
} from "../features/training/trialLoadouts";
import OfflineTrainingGame from "./OfflineTrainingGame";

export default function CharacterTrialGame() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const requestedHero = searchParams.get("hero");
  const heroId = isTrialBrawler(requestedHero) ? requestedHero : "piper";
  const definition = TRIAL_LOADOUTS[heroId];
  const [draft, setDraft] = useState<TrialLoadoutSelection>(() => defaultTrialLoadout(heroId));
  const [confirmed, setConfirmed] = useState(false);

  if (confirmed) return <OfflineTrainingGame trialHeroId={heroId} trialLoadout={draft} />;

  const choose = (kind: keyof TrialLoadoutSelection, value: string) => {
    setDraft(current => ({ ...current, [kind]: value }));
  };

  return <main className="trial-loadout-screen">
    <div className="trial-loadout-backdrop" />
    <section className="trial-loadout-dialog" role="dialog" aria-modal="true" aria-labelledby="trial-loadout-title">
      <header>
        <span>对局准备</span>
        <h1 id="trial-loadout-title">{TRIAL_BRAWLERS[heroId].name}配装</h1>
        <p>选择本局使用的妙具与星辉，确认后开始试用。</p>
      </header>
      <EquipmentGroup
        title="妙具"
        value={draft.gadget}
        options={definition.gadgets}
        onChange={value => choose("gadget", value)}
      />
      <EquipmentGroup
        title="星辉"
        value={draft.starPower}
        options={definition.starPowers}
        onChange={value => choose("starPower", value)}
      />
      <footer>
        <button type="button" className="btn-secondary" onClick={() => navigate("/character-trial")}>返回</button>
        <button type="button" className="trial-loadout-confirm" onClick={() => setConfirmed(true)}>确认并开始</button>
      </footer>
    </section>
  </main>;
}

function EquipmentGroup({
  title,
  value,
  options,
  onChange,
}: {
  title: string;
  value: string;
  options: readonly { id: string; name: string; description: string }[];
  onChange: (value: string) => void;
}) {
  return <fieldset className="trial-loadout-group">
    <legend>{title}</legend>
    <div className="trial-loadout-options">
      {options.map(option => <button
        type="button"
        key={option.id}
        className={value === option.id ? "active" : ""}
        aria-pressed={value === option.id}
        onClick={() => onChange(option.id)}
      >
        <strong>{option.name}</strong>
        <small>{option.description}</small>
      </button>)}
    </div>
  </fieldset>;
}
