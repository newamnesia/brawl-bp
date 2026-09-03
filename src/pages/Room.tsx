import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import HeroGrid, { HeroChip } from "../components/HeroGrid";
import MapPicker, { MapBanner } from "../components/MapPicker";
import Timer from "../components/Timer";
import { disconnectSocket, getSocket, type RoomState } from "../lib/socket";
import {
  BANS_PER_PLAYER,
  DISABLED_HERO_IDS,
  HEROES,
  PICKS_PER_TEAM,
  PICK_TURNS,
} from "../../shared/types";

/** 选手席位标签：按 players 数组顺序 选手1/选手2 */
function playerSeatLabel(index: number): string {
  return `选手${index + 1}`;
}

/** 观战席标签：按 spectators 数组顺序 观战席1/2/3... */
function spectatorSeatLabel(index: number): string {
  return `观战席${index + 1}`;
}

export default function Room() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const [state, setState] = useState<RoomState | null>(null);
  const [closedMsg, setClosedMsg] = useState("");
  const [copied, setCopied] = useState(false);
  const [localBans, setLocalBans] = useState<string[]>([]);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [connectTimedOut, setConnectTimedOut] = useState(false);
  const socket = getSocket();

  const inviteUrl = useMemo(
    () => `${window.location.origin}/bp?code=${code ?? ""}`,
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

  const myPlayer =
    state?.players.find((p) => p.id === socket.id) ??
    state?.spectators.find((p) => p.id === socket.id);
  const isHost = myPlayer?.role === "host";
  const isSpectator = state?.isSpectator ?? myPlayer?.role === "spectator";

  useEffect(() => {
    const onState = (s: RoomState) => setState(s);
    const onClosed = (msg: string) => {
      setClosedMsg(msg);
      setState(null);
    };

    socket.on("room_state", onState);
    socket.on("room_closed", onClosed);

    // 挂载后主动拉取当前房间状态，避免初始 room_state 在监听器注册前到达而丢失
    socket.emit("request_state");

    // 兜底：8 秒仍未收到状态，显示终止退出按钮
    const t = setTimeout(() => setConnectTimedOut(true), 8000);

    return () => {
      socket.off("room_state", onState);
      socket.off("room_closed", onClosed);
      clearTimeout(t);
    };
  }, [socket]);

  // 收到状态后清除超时
  useEffect(() => {
    if (state) setConnectTimedOut(false);
  }, [state]);

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
    navigate("/bp");
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
    const blocked = new Set([...DISABLED_HERO_IDS, ...allBans, ...allPickedIds, ...myTeamPicks]);
    return HEROES.map((h) => h.id).filter((id) => blocked.has(id));
  }, [state, myPlayer, allPickedIds]);

  if (closedMsg) {
    return (
      <div className="app-shell">
        <div className="card" style={{ textAlign: "center" }}>
          <p style={{ marginBottom: "1rem" }}>{closedMsg}</p>
          <button className="btn-primary" onClick={() => navigate("/bp")}>
            返回 BP 大厅
          </button>
        </div>
      </div>
    );
  }

  if (!state) {
    return (
      <div className="app-shell">
        <p className="waiting-text">连接房间中…</p>
        {connectTimedOut && (
          <div className="card" style={{ textAlign: "center", marginTop: "1rem" }}>
            <p style={{ marginBottom: "1rem", color: "var(--red)" }}>
              连接超时，可能是网络问题或房间已不存在
            </p>
            <button
              className="btn-primary"
              onClick={() => {
                socket.emit("leave_room");
                disconnectSocket();
                navigate("/bp");
              }}
            >
              终止并返回 BP 大厅
            </button>
          </div>
        )}
      </div>
    );
  }

  const bothJoined = state.players.length === 2;

  // 地图选择：大厅中选手可操作
  const handleSetGameMode = (mode: string | null) => {
    socket.emit("set_game_mode", mode);
  };
  const handleSetMap = (mapId: string | null) => {
    socket.emit("set_map", mapId);
  };

  const allMembers = [...state.players, ...state.spectators];
  const myIsPlayer = myPlayer ? state.players.some((p) => p.id === myPlayer.id) : false;

  // 向某成员发起换位申请
  const requestSwapTo = (targetId: string) => {
    socket.emit("request_swap", targetId);
  };

  return (
    <div className="app-shell">
      {isSpectator && (
        <div className="spectator-banner">观战席 · 仅可观看，无法操作（除退出房间与换位）</div>
      )}

      {/* 收到的换位申请：醒目大 UI */}
      {state.pendingSwapToMe && (
        <div className="swap-modal">
          <div className="swap-modal-card">
            <p className="swap-modal-title">
              {state.pendingSwapToMe.fromNickname} 向你申请换位
            </p>
            <p className="swap-modal-desc">
              同意后将与对方交换位置（选手 ↔ 观战席），你将接替对方的位置与禁选进度。
            </p>
            <div className="swap-modal-actions">
              <button
                className="btn-primary"
                onClick={() =>
                  socket.emit("respond_swap", {
                    requestId: state.pendingSwapToMe!.requestId,
                    accept: true,
                  })
                }
              >
                接受换位
              </button>
              <button
                className="btn-secondary"
                onClick={() =>
                  socket.emit("respond_swap", {
                    requestId: state.pendingSwapToMe!.requestId,
                    accept: false,
                  })
                }
              >
                拒绝
              </button>
            </div>
          </div>
        </div>
      )}

      <h1 className="page-title">{state.roomName}</h1>
      <div className="room-code">{state.code}</div>

      <div className="player-list">
        {state.players.map((p, i) => (
          <span
            key={p.id}
            className={`player-badge ${p.ready ? "ready" : ""} ${p.role === "host" ? "host" : ""}`}
          >
            <span className={`status-dot ${p.ready ? "ready" : ""}`} />
            {p.nickname}
            {p.id === socket.id && " (你)"}
            <span className="role-tag">{playerSeatLabel(i)}</span>
          </span>
        ))}
        {state.spectators.map((s, i) => (
          <span key={s.id} className="player-badge spectator">
            <span className="status-dot" />
            {s.nickname}
            {s.id === socket.id && " (你)"}
            <span className="role-tag">{spectatorSeatLabel(i)}</span>
          </span>
        ))}
      </div>

      {/* 成员 / 换位面板：任意成员可向其他成员发起换位（仅选手 ↔ 观战席） */}
      {allMembers.length > 1 && (
        <div className="card member-panel">
          <p className="member-panel-title">成员（{allMembers.length}）</p>
          <ul className="member-list">
            {allMembers.map((m) => {
              const isMe = m.id === socket.id;
              const mIsPlayer = state.players.some((p) => p.id === m.id);
              const canSwap = !isMe && mIsPlayer !== myIsPlayer;
              const isMyTarget = state.mySwapRequestTo === m.id;
              const seatText = mIsPlayer
                ? playerSeatLabel(state.players.findIndex((p) => p.id === m.id))
                : spectatorSeatLabel(state.spectators.findIndex((s) => s.id === m.id));
              return (
                <li key={m.id} className="member-item">
                  <span className="member-name">
                    {m.nickname}
                    {isMe && " (你)"}
                    <span className="role-tag">{seatText}</span>
                  </span>
                  {isMe ? (
                    state.mySwapRequestTo && (
                      <span className="member-hint">已发出换位申请，等待对方回应…</span>
                    )
                  ) : canSwap ? (
                    <button
                      className="btn-secondary btn-sm"
                      disabled={!!state.mySwapRequestTo || !!state.pendingSwapToMe}
                      onClick={() => requestSwapTo(m.id)}
                    >
                      换位
                    </button>
                  ) : isMyTarget ? (
                    <span className="member-hint">已申请</span>
                  ) : (
                    <span className="member-hint">同侧不可换</span>
                  )}
                </li>
              );
            })}
          </ul>
          {state.mySwapRequestTo && (
            <button
              className="btn-secondary btn-sm"
              style={{ marginTop: "0.5rem", width: "100%" }}
              onClick={() => socket.emit("cancel_swap")}
            >
              取消换位申请
            </button>
          )}
        </div>
      )}

      {state.phase === "lobby" && (
        <div className="card">
          {isHost && !editingName && (
            <div className="room-name-row">
              <span className="room-name-label">房间名称：{state.roomName}</span>
              <button
                type="button"
                className="btn-secondary btn-sm"
                onClick={() => {
                  setNameInput(state.roomName);
                  setEditingName(true);
                }}
              >
                修改
              </button>
            </div>
          )}

          {isHost && editingName && (
            <div className="form-group">
              <label>房间名称</label>
              <div className="invite-box">
                <input
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder="输入房间名称"
                  maxLength={20}
                />
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    socket.emit("set_room_name", nameInput);
                    setEditingName(false);
                  }}
                >
                  保存
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setEditingName(false)}
                >
                  取消
                </button>
              </div>
            </div>
          )}

          {!bothJoined && (
            <p className="waiting-text">
              等待对手加入…<br />
              <small style={{ color: "var(--muted)" }}>
                将房间号 {state.code} 或下方邀请链接发给朋友
              </small>
            </p>
          )}

          {!isSpectator && !bothJoined && (
            <div className="invite-box">
              <input readOnly value={inviteUrl} aria-label="邀请链接" />
              <button type="button" className="btn-secondary" onClick={copyInvite}>
                {copied ? "已复制" : "复制链接"}
              </button>
            </div>
          )}

          {isSpectator && (
            <p className="waiting-text">
              你在观战席 · 等待选手开始对局<br />
              <small style={{ color: "var(--muted)" }}>
                可在上方成员列表向选手申请换位
              </small>
            </p>
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

          {/* 地图选择 */}
          {bothJoined && (
            <MapPicker
              gameMode={state.gameMode}
              hostMapId={state.hostMapId}
              guestMapId={state.guestMapId}
              confirmedMapId={state.confirmedMapId}
              myRole={myPlayer?.role === "host" ? "host" : myPlayer?.role === "guest" ? "guest" : "spectator"}
              onSetGameMode={handleSetGameMode}
              onSetMap={handleSetMap}
            />
          )}

          {!isHost && !isSpectator && bothJoined && state.firstPicker && (
            <p style={{ textAlign: "center", color: "var(--muted)", marginBottom: "1rem" }}>
              {state.firstPicker === "guest"
                ? "你将先手选角"
                : "你将后手选角"}
            </p>
          )}

          {isSpectator && bothJoined && state.firstPicker && (
            <p style={{ textAlign: "center", color: "var(--muted)", marginBottom: "1rem" }}>
              {state.firstPicker === "host" ? "选手1先手选角" : "选手2先手选角"}
            </p>
          )}

          {!isSpectator && bothJoined && (
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
          <MapBanner confirmedMapId={state.confirmedMapId} />
          <div className="phase-banner ban">禁用阶段 · 选择 3 个角色</div>
          <Timer endsAt={state.phaseEndsAt} label="剩余时间" />
          {isSpectator ? (
            <p className="waiting-text">观战中 · 双方禁选进行中…</p>
          ) : (
            <>
              <p style={{ textAlign: "center", color: "var(--muted)", margin: "0.75rem 0" }}>
                已禁用 {localBans.length}/{BANS_PER_PLAYER} · 对手已选 {state.opponentBanCount} 个（隐藏）
              </p>
              <HeroGrid
                mode="ban"
                selectedIds={localBans}
                onToggle={handleToggleBan}
                disabledIds={[...DISABLED_HERO_IDS]}
              />
            </>
          )}
        </>
      )}

      {state.phase === "ban_reveal" && (
        <>
          <MapBanner confirmedMapId={state.confirmedMapId} />
          <div className="phase-banner reveal">公布禁用结果</div>
          <Timer endsAt={state.phaseEndsAt} />
          <div className="team-panel">
            <div className="team-box first">
              <h3>先手方 禁用</h3>
              <div className="picked-row">
                {(state.firstPicker === "guest" ? (state.guestBans ?? []) : (state.hostBans ?? [])).map((id) => (
                  <HeroChip key={id} heroId={id} variant="ban" />
                ))}
              </div>
            </div>
            <div className="team-box second">
              <h3>后手方 禁用</h3>
              <div className="picked-row">
                {(state.firstPicker === "guest" ? (state.hostBans ?? []) : (state.guestBans ?? [])).map((id) => (
                  <HeroChip key={id} heroId={id} variant="ban" />
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {(state.phase === "pick" || state.phase === "complete") && (
        <>
          <MapBanner confirmedMapId={state.confirmedMapId} />
          <div className={`phase-banner ${state.phase === "complete" ? "complete" : "pick"}`}>
            {state.phase === "complete"
              ? state.timedOutBy
                ? `${state.timedOutBy === myPlayer?.role ? "你" : "选手"}超时，BP终止`
                : "BP 完成！"
              : isSpectator
                ? "观战中 · 等待选手选角"
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

          {state.phase === "pick" && !isSpectator && (
            <HeroGrid
              mode="pick"
              disabledIds={pickDisabledIds}
              onPick={(id) => state.isMyTurn && socket.emit("pick_hero", id)}
              highlight={state.isMyTurn}
            />
          )}

          {state.phase === "pick" && isSpectator && (
            <p className="waiting-text">观战席无法操作，等待选手选角…</p>
          )}

          {state.phase === "complete" && (
            <div className="card" style={{ textAlign: "center" }}>
              <p style={{ marginBottom: "1rem", color: "var(--green)", fontWeight: 800 }}>
                {state.timedOutBy
                  ? `${state.timedOutBy === myPlayer?.role ? "你" : "对手"}超时，BP已终止`
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

      {isSpectator &&
        (state.phase === "ban" || state.phase === "ban_reveal" || state.phase === "pick") && (
          <button
            className="btn-secondary"
            style={{ marginTop: "1rem", width: "100%" }}
            onClick={leave}
          >
            退出观战
          </button>
        )}
    </div>
  );
}
