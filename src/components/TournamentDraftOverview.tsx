import { GAME_MODES, type GameMode, type TournamentTeam } from "../../shared/types";
import { HERO_MAP, MAP_MAP, heroImageUrl, modeIconUrl } from "../../shared/catalog";

function Slot({ heroId, label, compact = false, pending = false }: { heroId?: string | null; label: string; compact?: boolean; pending?: boolean }) {
  const hero = heroId ? HERO_MAP[heroId] : null;
  return (
    <div className={`solo-draft-slot ${compact ? "compact" : ""} ${pending ? "pending" : ""}`} aria-label={hero ? `${label}：${hero.name}${pending ? "（预选）" : ""}` : label}>
      {hero ? <img src={heroImageUrl(hero)} alt={hero.name} /> : <small>{label}</small>}
    </div>
  );
}

function TeamPanel({ team, bans, globalBans, picks, pendingBans }: {
  team: TournamentTeam;
  bans: Array<string | null>;
  globalBans: string[];
  picks: Array<string | null>;
  pendingBans: Array<string | null>;
}) {
  const order = team === "blue" ? [0, 1, 2] : [2, 1, 0];
  return (
    <section className={`solo-team-draft ${team}`}>
      <div className="solo-pick-slots">
        {order.map((index) => <Slot key={index} heroId={picks[index]} label={`${index + 1}选`} />)}
      </div>
      <div className="solo-ban-columns">
        <div className="solo-ban-column">
          {[0, 1, 2].map((index) => <Slot key={index} heroId={bans[index] ?? pendingBans[index]} pending={!bans[index] && Boolean(pendingBans[index])} label={`${index + 1} Ban`} compact />)}
        </div>
        <div className="solo-global-ban-column">
          {[0, 1].map((index) => <Slot key={index} heroId={globalBans[index]} label="全局 Ban" compact />)}
        </div>
      </div>
    </section>
  );
}

export default function TournamentDraftOverview({
  mode,
  mapId,
  blueBans,
  redBans,
  blueGlobalBans,
  redGlobalBans,
  bluePicks,
  redPicks,
  bluePendingBans = [null, null, null],
  redPendingBans = [null, null, null],
}: {
  mode: GameMode | null;
  mapId: string | null;
  blueBans: Array<string | null>;
  redBans: Array<string | null>;
  blueGlobalBans: string[];
  redGlobalBans: string[];
  bluePicks: Array<string | null>;
  redPicks: Array<string | null>;
  bluePendingBans?: Array<string | null>;
  redPendingBans?: Array<string | null>;
}) {
  const map = mapId ? MAP_MAP[mapId] : null;
  const modeInfo = mode ? GAME_MODES.find((item) => item.id === mode) : null;
  return (
    <div className="solo-draft-overview">
      <TeamPanel team="blue" bans={blueBans} globalBans={blueGlobalBans} picks={bluePicks} pendingBans={bluePendingBans} />
      <div className="solo-match-center">
        <div className="solo-map-readout">
          {modeInfo && <img src={modeIconUrl(modeInfo)} alt={modeInfo.name} />}
          <div>
            <strong>{map?.name ?? "等待地图"}</strong>
            <span>{map?.localizedName ? `（${map.localizedName}）` : modeInfo?.name ?? ""}</span>
          </div>
        </div>
      </div>
      <TeamPanel team="red" bans={redBans} globalBans={redGlobalBans} picks={redPicks} pendingBans={redPendingBans} />
    </div>
  );
}
