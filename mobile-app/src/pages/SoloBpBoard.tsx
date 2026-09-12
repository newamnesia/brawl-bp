import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import HeroGrid from "../components/HeroGrid";
import RecommendedBanGrid from "../components/RecommendedBanGrid";
import { DISABLED_HERO_IDS, GAME_MODES, type GameMode } from "../../shared/types";
import { HERO_MAP, MAP_MAP, heroImageUrl, modeIconUrl } from "../../shared/catalog";

type DraftSide = "self" | "opponent";
type BanRosterOrder = "rarity" | "recommended";
type SoloDraftPhase = "ban" | "pick" | "complete";
const VALID_MODES = new Set<GameMode>(GAME_MODES.map((mode) => mode.id));
const PICK_SEQUENCE = ["first", "second", "second", "first", "first", "second"] as const;

function DraftSlot({ heroId, label, compact = false, crossed = false }: { heroId?: string; label: string; compact?: boolean; crossed?: boolean }) {
  const hero = heroId ? HERO_MAP[heroId] : null;
  return <div className={`solo-draft-slot ${compact ? "compact" : ""} ${crossed ? "crossed" : ""}`} aria-label={hero ? `${label}：${hero.name}` : label}>{hero ? <img src={heroImageUrl(hero)} alt={hero.name} /> : crossed ? <span>×</span> : <small>{label}</small>}</div>;
}

function TeamDraft({ side, bans, picks }: { side: DraftSide; bans: string[]; picks: string[] }) {
  const isSelf = side === "self";
  const pickOrder = isSelf ? [0, 1, 2] : [2, 1, 0];
  return <section className={`solo-team-draft ${isSelf ? "blue" : "red"}`}><div className="solo-pick-slots">{pickOrder.map((index) => <DraftSlot key={index} heroId={picks[index]} label={`${index + 1}选`} />)}</div><div className="solo-ban-columns"><div className="solo-ban-column">{[0, 1, 2].map((index) => <DraftSlot key={index} heroId={bans[index]} label={`${index + 1} Ban`} compact />)}</div><div className="solo-global-ban-column">{[0, 1].map((index) => <DraftSlot key={index} label="全局 Ban" compact crossed />)}</div></div></section>;
}

export default function SoloBpBoard() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const rawMode = params.get("mode") as GameMode | null;
  const map = MAP_MAP[params.get("map") ?? ""];
  const first = params.get("first") as DraftSide | null;
  const valid = Boolean(rawMode && VALID_MODES.has(rawMode) && map?.mode === rawMode && (first === "self" || first === "opponent"));
  const mode = rawMode ? GAME_MODES.find((item) => item.id === rawMode) : null;
  const [activeSide, setActiveSide] = useState<DraftSide>(first === "opponent" ? "opponent" : "self");
  const [selfBans, setSelfBans] = useState<string[]>([]);
  const [opponentBans, setOpponentBans] = useState<string[]>([]);
  const [rosterOrder, setRosterOrder] = useState<BanRosterOrder>("rarity");
  const [phase, setPhase] = useState<SoloDraftPhase>("ban");
  const [pickTurn, setPickTurn] = useState(0);
  const [pendingPick, setPendingPick] = useState<string | null>(null);
  const [selfPicks, setSelfPicks] = useState<string[]>([]);
  const [opponentPicks, setOpponentPicks] = useState<string[]>([]);
  const firstSide: DraftSide = first === "opponent" ? "opponent" : "self";
  const secondSide: DraftSide = firstSide === "self" ? "opponent" : "self";
  const pickSide = PICK_SEQUENCE[pickTurn] === "first" ? firstSide : secondSide;
  const displayedSide = phase === "ban" ? activeSide : pickSide;
  const activeBans = displayedSide === "self" ? selfBans : opponentBans;
  const pickedIds = [...selfPicks, ...opponentPicks];
  const pickDisabledIds = [...DISABLED_HERO_IDS, ...new Set([...selfBans, ...opponentBans, ...pickedIds])];
  const toggleBan = (heroId: string) => { const update = (current: string[]) => current.includes(heroId) ? current.filter((id) => id !== heroId) : current.length < 3 ? [...current, heroId] : current; activeSide === "self" ? setSelfBans(update) : setOpponentBans(update); };
  const finishBan = () => { setPhase("pick"); setPendingPick(null); };
  const confirmPick = () => { if (!pendingPick) return; pickSide === "self" ? setSelfPicks((current) => [...current, pendingPick]) : setOpponentPicks((current) => [...current, pendingPick]); setPendingPick(null); pickTurn === PICK_SEQUENCE.length - 1 ? setPhase("complete") : setPickTurn((current) => current + 1); };

  if (!valid || !mode || !map) return <div className="app-shell"><div className="card" style={{ textAlign: "center" }}><p style={{ marginBottom: "1rem" }}>单人 BP 配置无效，请重新选择。</p><button className="btn-primary" onClick={() => navigate("/solo-bp")}>返回设置</button></div></div>;

  const overview = <div className="solo-draft-overview"><TeamDraft side="self" bans={selfBans} picks={selfPicks} /><div className="solo-match-center"><div className="solo-team-name-lines"><span /><span /></div><div className="solo-map-readout"><img src={modeIconUrl(mode)} alt={mode.name} /><div><strong>{map.name}</strong><span>（{map.localizedName ?? "暂无中文名"}）</span></div></div><div className="solo-map-scanline" /></div><TeamDraft side="opponent" bans={opponentBans} picks={opponentPicks} /></div>;

  if (phase === "complete") return <main className="solo-board-page solo-result-page"><section className="solo-tactical-screen solo-overview-screen"><header className="solo-screen-header"><span>TACTICAL DRAFT // BP RESULT</span><button onClick={() => navigate("/bp")}>回到 BP 菜单</button></header>{overview}</section></main>;

  return <main className="solo-board-page">
    <section className="solo-tactical-screen solo-overview-screen">
      <header className="solo-screen-header"><span>TACTICAL DRAFT // {phase === "ban" ? "BAN PHASE" : "PICK PHASE"}</span><button onClick={() => navigate("/solo-bp")}>返回设置</button></header>
      {overview}
    </section>
    <section className={`solo-tactical-screen solo-roster-screen ${displayedSide} ${phase}`}>
      <div className="solo-roster-toolbar"><button className={`solo-side-switch ${displayedSide}`} onClick={phase === "ban" ? () => setActiveSide((side) => side === "self" ? "opponent" : "self") : undefined} disabled={phase === "pick"}>当前：{displayedSide === "self" ? "己方（蓝方）" : "对方（红方）"}{phase === "ban" ? " · 点击切换" : " · 自动判定"}</button><div className="solo-phase-copy"><strong>{phase === "ban" ? "BAN 阶段" : `PICK 阶段 · 第 ${pickTurn + 1}/6 手`}</strong><span>{phase === "ban" ? `选择${displayedSide === "self" ? "己方" : "对方"}角色 · ${activeBans.length}/3` : pendingPick ? "已暂选角色，请确认进入下一手" : "请选择本手角色"}</span></div>{phase === "ban" ? <button type="button" className="solo-phase-action" onClick={finishBan}>结束 Ban</button> : <button type="button" className="solo-phase-action" disabled={!pendingPick} onClick={confirmPick}>进入下一手</button>}</div>
      <div className="solo-roster-order" role="group" aria-label="角色排列方式"><button type="button" className={rosterOrder === "rarity" ? "active" : ""} onClick={() => setRosterOrder("rarity")}>按稀有度排列</button><button type="button" className={rosterOrder === "recommended" ? "active" : ""} onClick={() => setRosterOrder("recommended")}>按推荐角色排列</button></div>
      <div className="solo-roster-grid-wrap">{rosterOrder === "rarity" ? phase === "ban" ? <HeroGrid mode="ban" selectedIds={activeBans} disabledIds={[...DISABLED_HERO_IDS]} onToggle={toggleBan} /> : <HeroGrid mode="pick" selectedIds={pendingPick ? [pendingPick] : []} disabledIds={pickDisabledIds} onPick={setPendingPick} highlight /> : <RecommendedBanGrid recommendationSide={displayedSide === firstSide ? "first" : "second"} selectedIds={phase === "ban" ? activeBans : pendingPick ? [pendingPick] : []} disabledIds={[...DISABLED_HERO_IDS]} onToggle={toggleBan} empty={phase === "pick"} />}</div>
    </section>
  </main>;
}
