import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import HeroGrid, { HeroChip } from "../components/HeroGrid";
import Timer from "../components/Timer";
import { disconnectSocket, getSocket, type RoomState } from "../lib/socket";
import {
  BANS_PER_PLAYER,
  HEROES,
  PICKS_PER_TEAM,
  PICK_TURNS,
  type PlayerRole,
} from "../../shared/types";

function roleLabel(role: PlayerRole, firstPicker: PlayerRole | null): string {
  if (!firstPicker) return role === "host" ? "房主" : "玩家";
  const isFirst = role === firstPicker;
  return `${role === "host" ? "房主" : "玩家"}（${isFirst ? "先手" : "后手"}）`;
}

export default function Room() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const [state, setState] = useState<RoomState | null>(null);
  const [closedMsg, setClosedMsg] = useState("");
  const [copied, setCopied] = useState(false);
  const [localBans, setLocalBans] = useState<string[]>([]);
  const socket = getSocket();

  const inviteUrl = useMemo(
    () => `${window.location.origin}/?code=${code ?? ""}`,
    [code],
  );

  const copyInvite = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  };

  const myPlayer = state?.players.find((p) => p.id === socket.id);
  const isHost = myPlayer?.role === "host";

  useEffect(() => {
    const onState = (s: RoomState) => setState(s);
    const onClosed = (msg: string) => {
      setClosedMsg(msg);
      setState(null);
    };

    socket.on("room_state", onState);
    socket.on("room_closed", onClosed);

    return () => {
      socket.off("room_state", onState);
      socket.off("room_closed", onClosed);
    };
  }, [socket]);

  // 服务器状态变更时同步本地 ban 列表
  useEffect(() => {
    setLocalBans(state?.myBans ?? []);
  }, [state?.myBans]);

  // 乐观更新：点击后立即反映到 UI，避免因网络往返导致重复点击 toggle off
  const handleToggleBan = (heroId: string) => {
    setLocalBans((prev) => {
      const idx = prev.indexOf(heroId);
      if (idx >= 0) {
        return prev.filter((id) => id !== heroId);
      } else if (prev.length < BANS_PER_PLAYER) {
        return [...prev, heroId];
      }
      return prev;
    });
    socket.emit("toggle_ban", heroId);
  };

  const leave = () => {
    socket.emit("leave_room");
    disconnectSocket();
    navigate("/");
  };

  const allPickedIds = useMemo(() => {
    if (!state) return new Set<string>();
    return new Set([...state.firstPicks, ...state.secondPicks]);
  }, [state]);

  const pickDisabledIds = useMemo(() => {
    if (!state || !myPlayer) return HEROES.map((h) => h.id);
    const allBans = new Set<string>();
    if (state.hostBans) state.hostBans.forEach((id) => allBans.add(id));
    if (state.guestBans) state.guestBans.forEach((id) => allBans.add(id));
    const myTeamPicks =
      state.myTeam === "first" ? state.firstPicks
      : state.myTeam === "second" ? state.secondPicks
      : [];
    const blocked = new Set([...allBans, ...allPickedIds, ...myTeamPicks]);
    return HEROES.map((h) => h.id).filter((id) => blocked.has(id));
  }, [state, myPlayer, allPickedIds]);

  if (closedMsg) {
    return (
      <div className="app-shell">
        <div className="card" style={{ textAlign: "center" }}>
          <p style={{ marginBottom: "1rem" }}>{closedMsg}</p>
          <button className="btn-primary" onClick={() => navigate("/")}>
            返回首页
          </button>
        </div>
      </div>
    );
  }

  if (!state) {
    return (
      <div className="app-shell">
        <p className="waiting-text">连接房间中…</p>
      </div>
    );
  }

  const hostPlayer = state.players.find((p) => p.role === "host");
  const guestPlayer = state.players.find((p) => p.role === "guest");
  const bothJoined = state.players.length === 2;

  return (
    <div className="app-shell">
      <h1 className="page-title">房间 {code}</h1>
      <div className="room-code">{state.code}</div>

      <div className="player-list">
        {state.players.map((p) => (
          <span
            key={p.id}
            className={`player-badge ${p.ready ? "ready" : ""} ${p.role === "host" ? "host" : ""}`}
          >
            <span className={`status-dot ${p.ready ? "ready" : ""}`} />
            {p.nickname}
            {p.id === socket.id && " (你)"}
          </span>
        ))}
      </div>

      {state.phase === "lobby" && (
        <div className="card">
          {!bothJoined && (
            <p className="waiting-text">
              等待对手加入…<br />
              <small style={{ color: "var(--muted)" }}>
                将房间号 {state.code} 或下方邀请链接发给朋友
              </small>
            </p>
          )}

          {!bothJoined && (
            <div className="invite-box">
              <input readOnly value={inviteUrl} aria-label="邀请链接" />
              <button type="button" className="btn-secondary" onClick={copyInvite}>
                {copied ? "已复制" : "复制链接"}
              </button>
            </div>
          )}

          {isHost && bothJoined && (
            <>
              <p style={{ fontWeight: 700, marginBottom: "0.5rem" }}>选择先后手</p>
              <div className="toggle-group">
                <button
                  className={state.firstPicker === "host" ? "active" : ""}
                  onClick={() => socket.emit("set_first_picker", "host")}
                >
                  我先手
                </button>
                <button
                  className={state.firstPicker === "guest" ? "active" : ""}
                  onClick={() => socket.emit("set_first_picker", "guest")}
                >
                  对手先手
                </button>
              </div>
            </>
          )}

          {!isHost && bothJoined && state.firstPicker && (
            <p style={{ textAlign: "center", color: "var(--muted)", marginBottom: "1rem" }}>
              {state.firstPicker === "guest"
                ? "你将先手选角"
                : "你将后手选角"}
            </p>
          )}

          {bothJoined && (
            <button
              className="btn-primary"
              disabled={!state.firstPicker}
              onClick={() => socket.emit("set_ready", !myPlayer?.ready)}
            >
              {myPlayer?.ready ? "取消准备" : "准备就绪"}
            </button>
          )}

          <button
            className="btn-secondary"
            style={{ marginTop: "0.75rem", width: "100%" }}
            onClick={leave}
          >
            退出房间
          </button>
        </div>
      )}

      {state.phase === "ban" && (
        <>
          <div className="phase-banner ban">禁用阶段 · 选择 3 个角色</div>
          <Timer endsAt={state.phaseEndsAt} label="剩余时间" />
          <p style={{ textAlign: "center", color: "var(--muted)", margin: "0.75rem 0" }}>
            已禁用 {localBans.length}/{BANS_PER_PLAYER} · 对手已选 {state.opponentBanCount} 个（隐藏）
          </p>
          <HeroGrid
            mode="ban"
            selectedIds={localBans}
            onToggle={handleToggleBan}
          />
        </>
      )}

      {state.phase === "ban_reveal" && (
        <>
          <div className="phase-banner reveal">公布禁用结果</div>
          <Timer endsAt={state.phaseEndsAt} />
          <div className="team-panel">
            <div className="team-box first">
              <h3>{hostPlayer ? roleLabel("host", state.firstPicker) : "房主"} 禁用</h3>
              <div className="picked-row">
                {(state.hostBans ?? []).map((id) => (
                  <HeroChip key={id} heroId={id} variant="ban" />
                ))}
              </div>
            </div>
            <div className="team-box second">
              <h3>{guestPlayer ? roleLabel("guest", state.firstPicker) : "玩家"} 禁用</h3>
              <div className="picked-row">
                {(state.guestBans ?? []).map((id) => (
                  <HeroChip key={id} heroId={id} variant="ban" />
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {(state.phase === "pick" || state.phase === "complete") && (
        <>
          <div className={`phase-banner ${state.phase === "complete" ? "complete" : "pick"}`}>
            {state.phase === "complete"
              ? state.surrenderedBy
                ? `${state.surrenderedBy === myPlayer?.role ? "你" : "对手"}投降，BP终止`
                : "BP 完成！"
              : state.isMyTurn
                ? "轮到你了 · 选择角色"
                : "等待对手选择…"}
          </div>

          {state.phase === "pick" && (
            <Timer endsAt={state.phaseEndsAt} label={`第 ${state.pickStep + 1} 手 / 6`} />
          )}

          <div className="team-panel">
            <div className="team-box first">
              <h3>
                先手方
                {state.myTeam === "first" && " (你)"}
              </h3>
              <div className="picked-row">
                {state.firstPicks.map((id) => (
                  <HeroChip key={id} heroId={id} />
                ))}
                {Array.from({ length: Math.max(0, PICKS_PER_TEAM - state.firstPicks.length) }).map(
                  (_, i) => (
                    <span key={`empty-f-${i}`} className="empty-slot">?</span>
                  ),
                )}
              </div>
              {state.hostBans && (
                <div style={{ marginTop: "0.75rem" }}>
                  <small style={{ color: "var(--muted)" }}>禁用：</small>
                  <div className="picked-row" style={{ marginTop: "0.35rem" }}>
                    {(state.firstPicker === "host" ? state.hostBans : state.guestBans)?.map(
                      (id) => (
                        <HeroChip key={id} heroId={id} variant="ban" />
                      ),
                    )}
                  </div>
                </div>
              )}
            </div>
            <div className="team-box second">
              <h3>
                后手方
                {state.myTeam === "second" && " (你)"}
              </h3>
              <div className="picked-row">
                {state.secondPicks.map((id) => (
                  <HeroChip key={id} heroId={id} />
                ))}
                {Array.from({ length: Math.max(0, PICKS_PER_TEAM - state.secondPicks.length) }).map(
                  (_, i) => (
                    <span key={`empty-s-${i}`} className="empty-slot">?</span>
                  ),
                )}
              </div>
              {state.guestBans && state.firstPicker && (
                <div style={{ marginTop: "0.75rem" }}>
                  <small style={{ color: "var(--muted)" }}>禁用：</small>
                  <div className="picked-row" style={{ marginTop: "0.35rem" }}>
                    {(state.firstPicker === "guest" ? state.hostBans : state.guestBans)?.map(
                      (id) => (
                        <HeroChip key={id} heroId={id} variant="ban" />
                      ),
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {state.phase === "pick" && (
            <>
              <HeroGrid
                mode="pick"
                disabledIds={pickDisabledIds}
                onPick={(id) => state.isMyTurn && socket.emit("pick_hero", id)}
                highlight={state.isMyTurn}
              />
              <button
                className="btn-secondary"
                style={{ marginTop: "0.75rem", width: "100%", color: "var(--red)" }}
                onClick={() => {
                  if (confirm("确定要投降并终止BP吗？已选角色将保留，未选位置留空。")) {
                    socket.emit("surrender");
                  }
                }}
              >
                投降终止BP
              </button>
            </>
          )}

          {state.phase === "complete" && (
            <div className="card" style={{ textAlign: "center" }}>
              <p style={{ marginBottom: "1rem", color: "var(--green)", fontWeight: 800 }}>
                {state.surrenderedBy
                  ? `${state.surrenderedBy === myPlayer?.role ? "你" : "对手"}投降，BP已终止`
                  : "选秀结束，双方阵容已确定"}
              </p>
              <p style={{ color: "var(--muted)", fontSize: "0.9rem", marginBottom: "1rem" }}>
                选秀顺序：{PICK_TURNS.map((t, i) => `${i + 1}.${t === "first" ? "先" : "后"}`).join(" → ")}
              </p>
              <button className="btn-primary" onClick={leave}>
                退出房间
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
