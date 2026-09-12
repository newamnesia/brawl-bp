import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import HeroGrid, { HeroChip } from "../components/HeroGrid";
import Timer from "../components/Timer";
import TournamentDraftOverview from "../components/TournamentDraftOverview";
import { getSocket } from "../lib/socket";
import {
  DISABLED_HERO_IDS,
  GAME_MODES,
  MAPS,
  MAX_TURN_DURATION_SECONDS,
  MIN_TURN_DURATION_SECONDS,
  type TournamentRoomState,
  type TournamentTeam,
} from "../../shared/types";
import { MAP_MAP, mapThumbnailUrl, modeIconUrl } from "../../shared/catalog";

function SeatGrid({ state }: { state: TournamentRoomState }) {
  return (
    <div className="tournament-teams">
      {(["blue", "red"] as TournamentTeam[]).map((team) => (
        <section key={team} className={`tournament-team ${team}`}>
          <h3>{team === "blue" ? "蓝方" : "红方"}{state.firstPickTeam === team ? " · 先手" : ""}</h3>
          {[0, 1, 2].map((seatIndex) => {
            const player = state.players.find((item) => item.team === team && item.seatIndex === seatIndex);
            return <div key={seatIndex} className={`tournament-seat ${player?.ready ? "ready" : ""}`}><span>{seatIndex + 1} 席</span><strong>{player?.nickname ?? "等待选手"}</strong><em>{player?.ready ? "已准备" : player ? "未准备" : "空席"}</em></div>;
          })}
        </section>
      ))}
    </div>
  );
}

export default function TournamentRoom() {
  const navigate = useNavigate();
  const socket = getSocket();
  const [state, setState] = useState<TournamentRoomState | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [banSeconds, setBanSeconds] = useState("30");
  const [pickSeconds, setPickSeconds] = useState("30");
  const [mapSearch, setMapSearch] = useState("");

  useEffect(() => {
    const onState = (next: TournamentRoomState) => setState(next);
    const onClosed = (message: string) => { setError(message); setTimeout(() => navigate("/bp"), 1800); };
    socket.on("tournament_room_state", onState);
    socket.on("tournament_room_closed", onClosed);
    socket.emit("request_tournament_state");
    return () => {
      socket.off("tournament_room_state", onState);
      socket.off("tournament_room_closed", onClosed);
    };
  }, [navigate, socket]);

  useEffect(() => {
    if (!state) return;
    setBanSeconds(String(state.banDurationSeconds));
    setPickSeconds(String(state.pickDurationSeconds));
  }, [state?.banDurationSeconds, state?.pickDurationSeconds]);

  const modeMaps = useMemo(() => state?.gameMode ? MAPS.filter((map) => map.mode === state.gameMode && (!mapSearch.trim() || map.name.toLowerCase().includes(mapSearch.trim().toLowerCase()) || map.localizedName?.includes(mapSearch.trim()))) : [], [state?.gameMode, mapSearch]);

  if (!state) return <div className="app-shell"><div className="card waiting-text">正在连接赛事房…{error && <p className="error-msg">{error}</p>}</div></div>;

  const me = state.players.find((player) => player.id === socket.id);
  const isHost = state.hostId === socket.id;
  const allGlobalBans = [...(state.blueGlobalBans ?? []), ...(state.redGlobalBans ?? [])];
  const allRegularBans = [...state.blueBans, ...state.redBans].filter((id): id is string => Boolean(id));
  const allPicks = [...state.bluePicks, ...state.redPicks].filter((id): id is string => Boolean(id));
  const myPendingBan = state.myActiveBanSlot === null ? null : (state.myTeam === "blue" ? state.visibleBluePendingBans[state.myActiveBanSlot] : state.visibleRedPendingBans[state.myActiveBanSlot]);
  const selected = state.phase === "ban" ? myPendingBan : state.pendingPick;
  const disabledIds = state.phase === "ban"
    ? [...DISABLED_HERO_IDS, ...allGlobalBans, ...(state.myTeam === "blue" ? state.blueBans : state.redBans).filter((id): id is string => Boolean(id))]
    : [...DISABLED_HERO_IDS, ...allGlobalBans, ...allRegularBans, ...allPicks];
  const validTimes = [Number(banSeconds), Number(pickSeconds)].every((value) => Number.isInteger(value) && value >= MIN_TURN_DURATION_SECONDS && value <= MAX_TURN_DURATION_SECONDS);
  const canReady = Boolean(state.firstPickTeam && state.confirmedMapId);
  const inviteUrl = `${window.location.origin}/bp?code=${state.code}`;

  const leave = () => { socket.emit("leave_tournament_room"); navigate("/bp"); };
  const overview = <TournamentDraftOverview mode={state.gameMode} mapId={state.confirmedMapId} blueBans={state.blueBans} redBans={state.redBans} blueGlobalBans={state.blueGlobalBans ?? []} redGlobalBans={state.redGlobalBans ?? []} bluePicks={state.bluePicks} redPicks={state.redPicks} bluePendingBans={state.visibleBluePendingBans} redPendingBans={state.visibleRedPendingBans} />;

  if (state.phase === "complete") {
    return <main className="solo-board-page solo-result-page"><section className="solo-tactical-screen solo-overview-screen"><header className="solo-screen-header"><span>TOURNAMENT DRAFT // BP RESULT</span><button onClick={leave}>回到 BP 菜单</button></header>{overview}{state.timeoutMessage && <p className="tournament-timeout">{state.timeoutMessage}</p>}</section></main>;
  }

  if (state.phase === "lobby") {
    return (
      <div className="app-shell tournament-lobby">
        <h1 className="page-title">{state.roomName}</h1>
        <div className="room-code">{state.code}</div>
        <SeatGrid state={state} />
        <div className="card">
          <p className="waiting-text">双方各至少 1 名选手、所有在席选手准备后即可开始；空席的操作由队友代管。</p>
          {!state.isSpectator && <div className="invite-box"><input readOnly value={inviteUrl} /><button className="btn-secondary" onClick={async () => { await navigator.clipboard.writeText(inviteUrl); setCopied(true); }}>{copied ? "已复制" : "复制邀请链接"}</button></div>}

          <div className="time-limit-settings">
            <p className="time-limit-title">BP 时间限制</p>
            {isHost ? <div className="time-limit-form"><label>Ban 阶段（秒）<input type="number" min={MIN_TURN_DURATION_SECONDS} max={MAX_TURN_DURATION_SECONDS} value={banSeconds} onChange={(event) => setBanSeconds(event.target.value)} /></label><label>每手 Pick（秒）<input type="number" min={MIN_TURN_DURATION_SECONDS} max={MAX_TURN_DURATION_SECONDS} value={pickSeconds} onChange={(event) => setPickSeconds(event.target.value)} /></label><button className="btn-secondary" disabled={!validTimes} onClick={() => socket.emit("set_tournament_time_limits", { banSeconds: Number(banSeconds), pickSeconds: Number(pickSeconds) })}>保存时限</button></div> : <p className="time-limit-summary">Ban {state.banDurationSeconds} 秒 · 每手 Pick {state.pickDurationSeconds} 秒</p>}
          </div>

          <p className="map-picker-label">比赛模式（房主设置）</p>
          <div className="mode-grid">{GAME_MODES.map((mode) => <button key={mode.id} className={`mode-card ${state.gameMode === mode.id ? "active" : ""}`} disabled={!isHost} onClick={() => socket.emit("set_tournament_mode", state.gameMode === mode.id ? null : mode.id)}><img className="mode-icon" src={modeIconUrl(mode)} alt="" /><span>{mode.name}</span></button>)}</div>

          {state.gameMode && <><p className="map-picker-label">双方共同确认地图</p><div className="map-selection-status"><div className={`map-selection-slot ${state.confirmedMapId ? "confirmed" : ""}`}><span className="map-selection-role">蓝方</span><span className="map-selection-name">{state.teamMapIds.blue ? MAP_MAP[state.teamMapIds.blue]?.name : "未选择"}</span></div><div className={`map-selection-slot ${state.confirmedMapId ? "confirmed" : ""}`}><span className="map-selection-role">红方</span><span className="map-selection-name">{state.teamMapIds.red ? MAP_MAP[state.teamMapIds.red]?.name : "未选择"}</span></div></div>{!state.isSpectator && <><div className="map-search"><input value={mapSearch} onChange={(event) => setMapSearch(event.target.value)} placeholder="搜索地图名称" /></div><div className="map-grid tournament-map-grid">{modeMaps.map((map) => <div key={map.id} className={`map-card ${state.myTeam && state.teamMapIds[state.myTeam] === map.id ? "selected" : ""}`} onClick={() => socket.emit("set_tournament_map", state.myTeam && state.teamMapIds[state.myTeam] === map.id ? null : map.id)}><img className="map-thumbnail" src={mapThumbnailUrl(map)} alt={map.name} /><span className="map-name">{map.localizedName ?? map.name}</span></div>)}</div></>}</>}

          {isHost && <><p className="map-picker-label">确定先后手</p><div className="toggle-group"><button className={state.firstPickTeam === "blue" ? "active" : ""} onClick={() => socket.emit("set_tournament_first_picker", "blue")}>蓝方先手</button><button className={state.firstPickTeam === "red" ? "active" : ""} onClick={() => socket.emit("set_tournament_first_picker", "red")}>红方先手</button></div></>}
        </div>

        {!state.isSpectator && <div className={`card tournament-global-ban ${state.myTeam}`}><h2>本队全局 Ban（队内共享，敌方不可见）</h2><p>单击预选或撤销，最多 2 个；开赛后双方公开且均不可再次 Ban 或 Pick。</p><div className="picked-row">{state.myGlobalBans.length ? state.myGlobalBans.map((id) => <HeroChip key={id} heroId={id} variant="ban" />) : <span className="empty-slot">可留空</span>}</div><HeroGrid mode="ban" selectedIds={state.myGlobalBans} disabledIds={[...DISABLED_HERO_IDS]} onToggle={(id) => socket.emit("toggle_tournament_global_ban", id)} /></div>}

        {!state.isSpectator && <button className="btn-primary tournament-ready" disabled={!canReady} onClick={() => socket.emit("set_tournament_ready", !me?.ready)}>{me?.ready ? "取消准备" : "准备就绪"}</button>}
        <button className="btn-secondary" style={{ marginTop: ".75rem", width: "100%" }} onClick={leave}>退出赛事房</button>
      </div>
    );
  }

  const phaseName = state.phase === "ban" ? "BAN PHASE" : "PICK PHASE";
  return (
    <main className="solo-board-page tournament-board-page">
      <section className="solo-tactical-screen solo-overview-screen"><header className="solo-screen-header"><span>TOURNAMENT DRAFT // {phaseName}</span><button onClick={leave}>退出赛事房</button></header>{overview}</section>
      <section className={`solo-tactical-screen solo-roster-screen ${state.myTeam === "red" ? "opponent" : "self"} ${state.phase}`}>
        <div className="solo-roster-toolbar"><div className={`solo-side-switch ${state.myTeam === "red" ? "opponent" : "self"}`}>{state.isSpectator ? "观战席" : state.myTeam === "blue" ? `蓝方 ${Number(state.mySeatIndex) + 1} 席` : `红方 ${Number(state.mySeatIndex) + 1} 席`}</div><div className="solo-phase-copy"><strong>{state.phase === "ban" ? "双方同时 Ban" : `第 ${state.pickStep + 1}/6 手 Pick`}</strong><span>{state.canAct ? selected ? "已预选，确定后锁定" : state.phase === "ban" ? "可留空并确认" : "请选择角色" : "等待负责本位置的选手确认"}</span></div>{state.canAct && <div className="tournament-confirm-actions"><button className="solo-phase-action" disabled={state.phase === "pick" && !state.pendingPick} onClick={() => socket.emit("confirm_tournament_selection")}>确定</button>{state.phase === "ban" && <button className="btn-secondary" onClick={() => socket.emit("finish_tournament_ban")}>结束本队 Ban</button>}</div>}</div>
        <Timer endsAt={state.phaseEndsAt} label={state.phase === "ban" ? "Ban 总剩余时间" : "本手剩余时间"} />
        {state.canAct ? <div className="solo-roster-grid-wrap"><HeroGrid mode={state.phase === "ban" ? "ban" : "pick"} selectedIds={selected ? [selected] : []} disabledIds={disabledIds} onToggle={(id) => socket.emit("tournament_preselect", id)} onPick={(id) => socket.emit("tournament_preselect", id)} highlight /></div> : <div className="tournament-waiting-panel"><p>当前预选</p>{selected ? <HeroChip heroId={selected} /> : <span>尚未预选角色</span>}</div>}
      </section>
    </main>
  );
}
