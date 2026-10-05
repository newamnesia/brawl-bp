import { GAME_MODES, type GameMode, type TournamentTeam } from "../../shared/types";
import { HERO_MAP, MAP_MAP, heroImageUrl, mapThumbnailUrl, modeIconUrl } from "../../shared/catalog";

function Slot({ heroId, label, compact = false, pending = false }: { heroId?: string | null; label: string; compact?: boolean; pending?: boolean }) {
  const hero = heroId ? HERO_MAP[heroId] : null;
  return (
    <div className={`solo-draft-slot ${compact ? "compact" : ""} ${pending ? "pending" : ""}`} aria-label={hero ? `${label}：${hero.name}${pending ? "（预选）" : ""}` : label}>
      {hero ? <img src={heroImageUrl(hero)} alt={hero.name} /> : <small>{label}</small>}
    </div>
  );
}

function TeamPanel({ team, bans, globalBans, picks, pendingBans, pendingPick, pendingPickSlot, globalBansPending }: {
  team: TournamentTeam;
  bans: Array<string | null>;
  globalBans: string[];
  picks: Array<string | null>;
  pendingBans: Array<string | null>;
  pendingPick: string | null;
  pendingPickSlot: number | null;
  globalBansPending: boolean;
}) {
  const order = team === "blue" ? [0, 1, 2] : [2, 1, 0];
  return (
    <section className={`solo-team-draft ${team}`}>
      <div className="solo-pick-slots">
        {order.map((index) => <Slot key={index} heroId={picks[index] ?? (pendingPickSlot === index ? pendingPick : null)} pending={!picks[index] && pendingPickSlot === index && Boolean(pendingPick)} label={`${index + 1}选`} />)}
      </div>
      <div className="solo-ban-columns">
        <div className="solo-ban-column">
          {[0, 1, 2].map((index) => <Slot key={index} heroId={bans[index] ?? pendingBans[index]} pending={!bans[index] && Boolean(pendingBans[index])} label={`${index + 1} Ban`} compact />)}
        </div>
        <div className="solo-global-ban-column">
          {[0, 1].map((index) => <Slot key={index} heroId={globalBans[index]} label="全局 Ban" compact pending={globalBansPending && Boolean(globalBans[index])} />)}
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
  pendingPick = null,
  activePickTeam = null,
  activePickSlot = null,
  globalBansPending = false,
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
  pendingPick?: string | null;
  activePickTeam?: TournamentTeam | null;
  activePickSlot?: number | null;
  globalBansPending?: boolean;
}) {
  const map = mapId ? MAP_MAP[mapId] : null;
  const modeInfo = mode ? GAME_MODES.find((item) => item.id === mode) : null;
  return (
    <div className="solo-draft-overview">
      <TeamPanel team="blue" bans={blueBans} globalBans={blueGlobalBans} picks={bluePicks} pendingBans={bluePendingBans} pendingPick={activePickTeam === "blue" ? pendingPick : null} pendingPickSlot={activePickTeam === "blue" ? activePickSlot : null} globalBansPending={globalBansPending} />
      <div className="solo-match-center tournament-match-center">
        {map && (
          <div className="tournament-map-preview">
            <img src={mapThumbnailUrl(map)} alt={`${map.localizedName ?? map.name}地图缩略图`} />
          </div>
        )}
        <div className="solo-map-readout">
          {modeInfo && <img src={modeIconUrl(modeInfo)} alt={modeInfo.name} />}
          <div>
            <strong>{map?.name ?? "等待地图"}</strong>
            <span>{map?.localizedName ? `（${map.localizedName}）` : modeInfo?.name ?? ""}</span>
          </div>
        </div>
      </div>
      <TeamPanel team="red" bans={redBans} globalBans={redGlobalBans} picks={redPicks} pendingBans={redPendingBans} pendingPick={activePickTeam === "red" ? pendingPick : null} pendingPickSlot={activePickTeam === "red" ? activePickSlot : null} globalBansPending={globalBansPending} />
    </div>
  );
}
