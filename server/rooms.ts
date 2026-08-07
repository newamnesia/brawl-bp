import { randomBytes } from "crypto";
import type { Server, Socket } from "socket.io";
import {
  BAN_DURATION_MS,
  BAN_REVEAL_MS,
  BANS_PER_PLAYER,
  HEROES,
  type LobbyRoom,
  PICK_DURATION_MS,
  PICK_TURNS,
  type Phase,
  type PlayerRole,
  type RoomState,
  type SwapRequest,
  type TeamSide,
} from "../shared/types.js";

interface Player {
  id: string;
  nickname: string;
  role: PlayerRole;
  ready: boolean;
}

interface PendingSwap {
  requestId: string;
  fromId: string;
  toId: string;
}

interface Room {
  code: string;
  roomName: string;
  hostId: string;
  players: Map<string, Player>; // host & guest（选手）
  spectators: Map<string, Player>; // 观战席
  phase: Phase;
  firstPicker: PlayerRole | null;
  hostBans: string[];
  guestBans: string[];
  firstPicks: string[];
  secondPicks: string[];
  pickStep: number;
  phaseEndsAt: number | null;
  banTimer: ReturnType<typeof setTimeout> | null;
  revealTimer: ReturnType<typeof setTimeout> | null;
  pickTimer: ReturnType<typeof setTimeout> | null;
  timedOutBy: PlayerRole | null;
  pendingSwaps: Map<string, PendingSwap>; // requestId -> 换位申请
}

const rooms = new Map<string, Room>();
const socketToRoom = new Map<string, string>();

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  const bytes = randomBytes(6);
  for (let i = 0; i < 6; i++) {
    code += chars[bytes[i]! % chars.length];
  }
  return rooms.has(code) ? generateCode() : code;
}

function roleToTeam(role: PlayerRole, firstPicker: PlayerRole): TeamSide {
  return role === firstPicker ? "first" : "second";
}

function teamToRole(team: TeamSide, firstPicker: PlayerRole): PlayerRole {
  return team === "first" ? firstPicker : firstPicker === "host" ? "guest" : "host";
}

function getAvailableForRole(room: Room, role: PlayerRole): string[] {
  const team = roleToTeam(role, room.firstPicker!);
  const picks = team === "first" ? room.firstPicks : room.secondPicks;
  const opponentPicks = team === "first" ? room.secondPicks : room.firstPicks;
  const blocked = new Set([
    ...room.hostBans,
    ...room.guestBans,
    ...picks,
    ...opponentPicks,
  ]);
  return HEROES.map((h) => h.id).filter((id) => !blocked.has(id));
}

function broadcastRoom(io: Server, room: Room) {
  const viewers = [...room.players.values(), ...room.spectators.values()];
  for (const viewer of viewers) {
    const socket = io.sockets.sockets.get(viewer.id);
    if (socket) {
      socket.emit("room_state", buildRoomState(room, viewer));
    }
  }
}

function buildRoomState(room: Room, viewer: Player): RoomState {
  const isSpectator = viewer.role === "spectator";
  const opponent = isSpectator
    ? null
    : [...room.players.values()].find((p) => p.id !== viewer.id);
  const opponentRole = opponent?.role;
  const myBans = isSpectator
    ? []
    : viewer.role === "host"
      ? room.hostBans
      : room.guestBans;
  const opponentBans =
    opponentRole === "host" ? room.hostBans : opponentRole === "guest" ? room.guestBans : [];

  let activeTeam: TeamSide | null = null;
  let isMyTurn = false;
  if (room.phase === "pick" && room.firstPicker) {
    activeTeam = PICK_TURNS[room.pickStep] ?? null;
    if (!isSpectator) {
      const myTeam = roleToTeam(viewer.role, room.firstPicker);
      isMyTurn = activeTeam === myTeam;
    }
  }

  const showBans =
    room.phase === "ban_reveal" ||
    room.phase === "pick" ||
    room.phase === "complete";

  const incoming = [...room.pendingSwaps.values()].find((s) => s.toId === viewer.id);
  const outgoing = [...room.pendingSwaps.values()].find((s) => s.fromId === viewer.id);

  const pendingSwapToMe: SwapRequest | null = incoming
    ? {
        requestId: incoming.requestId,
        fromId: incoming.fromId,
        fromNickname: room.players.get(incoming.fromId)?.nickname ??
          room.spectators.get(incoming.fromId)?.nickname ??
          "玩家",
      }
    : null;

  return {
    code: room.code,
    roomName: room.roomName,
    phase: room.phase,
    players: [...room.players.values()],
    spectators: [...room.spectators.values()],
    hostId: room.hostId,
    firstPicker: room.firstPicker,
    pickStep: room.pickStep,
    phaseEndsAt: room.phaseEndsAt,
    myBans: [...myBans],
    opponentBanCount: opponentBans.length,
    hostBans: showBans ? [...room.hostBans] : null,
    guestBans: showBans ? [...room.guestBans] : null,
    firstPicks: [...room.firstPicks],
    secondPicks: [...room.secondPicks],
    activeTeam,
    myTeam: !isSpectator && room.firstPicker ? roleToTeam(viewer.role, room.firstPicker) : null,
    isMyTurn,
    isSpectator,
    timedOutBy: room.timedOutBy,
    pendingSwapToMe,
    mySwapRequestTo: outgoing ? outgoing.toId : null,
  };
}

function clearTimers(room: Room) {
  if (room.banTimer) clearTimeout(room.banTimer);
  if (room.revealTimer) clearTimeout(room.revealTimer);
  if (room.pickTimer) clearTimeout(room.pickTimer);
  room.banTimer = room.revealTimer = room.pickTimer = null;
}

function startBanPhase(io: Server, room: Room) {
  clearTimers(room);
  room.phase = "ban";
  room.hostBans = [];
  room.guestBans = [];
  room.firstPicks = [];
  room.secondPicks = [];
  room.pickStep = 0;
  room.phaseEndsAt = Date.now() + BAN_DURATION_MS;
  room.banTimer = setTimeout(() => endBanPhase(io, room), BAN_DURATION_MS);
  broadcastRoom(io, room);
}

function endBanPhase(io: Server, room: Room) {
  if (room.banTimer) clearTimeout(room.banTimer);
  room.banTimer = null;
  room.phase = "ban_reveal";
  room.phaseEndsAt = Date.now() + BAN_REVEAL_MS;
  room.revealTimer = setTimeout(() => startPickPhase(io, room), BAN_REVEAL_MS);
  broadcastRoom(io, room);
}

function startPickPhase(io: Server, room: Room) {
  room.revealTimer = null;
  room.phase = "pick";
  room.pickStep = 0;
  schedulePickTimer(io, room);
  broadcastRoom(io, room);
}

function schedulePickTimer(io: Server, room: Room) {
  if (room.pickTimer) clearTimeout(room.pickTimer);
  room.phaseEndsAt = Date.now() + PICK_DURATION_MS;
  room.pickTimer = setTimeout(() => handlePickTimeout(io, room), PICK_DURATION_MS);
}

// 选角时间结束仍未选定 → 判定当前方超时，直接终止 BP
function handlePickTimeout(io: Server, room: Room) {
  if (room.phase !== "pick" || !room.firstPicker) return;
  const team = PICK_TURNS[room.pickStep];
  if (!team) return;
  const role = teamToRole(team, room.firstPicker);
  room.timedOutBy = role;
  clearTimers(room);
  room.phase = "complete";
  room.phaseEndsAt = null;
  broadcastRoom(io, room);
}

function applyPick(io: Server, room: Room, role: PlayerRole, heroId: string) {
  const team = roleToTeam(role, room.firstPicker!);
  const list = team === "first" ? room.firstPicks : room.secondPicks;
  if (list.includes(heroId)) return;
  const available = getAvailableForRole(room, role);
  if (!available.includes(heroId)) return;
  list.push(heroId);
  advancePick(io, room);
}

function advancePick(io: Server, room: Room) {
  if (room.pickTimer) clearTimeout(room.pickTimer);
  room.pickStep++;
  if (room.pickStep >= PICK_TURNS.length) {
    room.phase = "complete";
    room.phaseEndsAt = null;
    room.pickTimer = null;
  } else {
    schedulePickTimer(io, room);
  }
  broadcastRoom(io, room);
}

function tryStartGame(io: Server, room: Room) {
  const players = [...room.players.values()];
  if (players.length !== 2) return;
  if (!room.firstPicker) return;
  if (!players.every((p) => p.ready)) return;
  startBanPhase(io, room);
  broadcastLobbyList(io);
}

function destroyRoom(code: string) {
  const room = rooms.get(code);
  if (room) clearTimers(room);
  rooms.delete(code);
}

// 换位：选手 <-> 观战席。选手让出位置后由观战席接替该角色（host/guest），
// 角色的 ban/pick 数据随角色保留，因此接替者继承当前禁选进度。
function performSwap(room: Room, fromId: string, toId: string) {
  const fromIsPlayer = room.players.has(fromId);
  const toIsPlayer = room.players.has(toId);
  if (fromIsPlayer === toIsPlayer) return; // 同侧不可换
  const from = fromIsPlayer ? room.players.get(fromId) : room.spectators.get(fromId);
  const to = toIsPlayer ? room.players.get(toId) : room.spectators.get(toId);
  if (!from || !to) return;
  if (fromIsPlayer) {
    const role = from.role; // host | guest
    from.role = "spectator";
    to.role = role;
    room.players.delete(fromId);
    room.spectators.delete(toId);
    room.players.set(toId, to);
    room.spectators.set(fromId, from);
  } else {
    const role = to.role; // host | guest
    to.role = "spectator";
    from.role = role;
    room.spectators.delete(fromId);
    room.players.delete(toId);
    room.players.set(fromId, from);
    room.spectators.set(toId, to);
  }
  // 大厅阶段重置准备态，避免换位后误启动
  if (room.phase === "lobby") {
    from.ready = false;
    to.ready = false;
  }
}

function getLobbyRooms(): LobbyRoom[] {
  const list: LobbyRoom[] = [];
  for (const room of rooms.values()) {
    // 展示未结束的房间：选手可加入(lobby 且未满)或观战可加入(任意阶段)
    if (room.phase === "complete") continue;
    const host = [...room.players.values()].find((p) => p.role === "host");
    list.push({
      code: room.code,
      roomName: room.roomName,
      hostNickname: host?.nickname ?? "房主",
      playerCount: room.players.size,
      spectatorCount: room.spectators.size,
      phase: room.phase,
    });
  }
  return list;
}

function broadcastLobbyList(io: Server) {
  io.emit("lobby_list", getLobbyRooms());
}

export function registerRoomHandlers(io: Server) {
  io.on("connection", (socket: Socket) => {
    socket.on(
      "create_room",
      (nickname: string, cb: (res: { ok: boolean; code?: string; error?: string }) => void) => {
        if (!nickname?.trim()) {
          cb({ ok: false, error: "请输入昵称" });
          return;
        }
        const code = generateCode();
        const room: Room = {
          code,
          roomName: `${nickname.trim()}的房间`,
          hostId: socket.id,
          players: new Map(),
          spectators: new Map(),
          phase: "lobby",
          firstPicker: null,
          hostBans: [],
          guestBans: [],
          firstPicks: [],
          secondPicks: [],
          pickStep: 0,
          phaseEndsAt: null,
          banTimer: null,
          revealTimer: null,
          pickTimer: null,
          timedOutBy: null,
          pendingSwaps: new Map(),
        };
        const player: Player = {
          id: socket.id,
          nickname: nickname.trim(),
          role: "host",
          ready: false,
        };
        room.players.set(socket.id, player);
        rooms.set(code, room);
        socketToRoom.set(socket.id, code);
        socket.join(code);
        cb({ ok: true, code });
        broadcastRoom(io, room);
        broadcastLobbyList(io);
      },
    );

    socket.on(
      "join_room",
      (
        payload: { code: string; nickname: string },
        cb: (res: { ok: boolean; error?: string }) => void,
      ) => {
        const code = payload.code?.toUpperCase().trim();
        const nickname = payload.nickname?.trim();
        if (!code || !nickname) {
          cb({ ok: false, error: "房间号或昵称无效" });
          return;
        }
        const room = rooms.get(code);
        if (!room) {
          cb({ ok: false, error: "房间不存在" });
          return;
        }
        if (room.players.size >= 2) {
          cb({ ok: false, error: "房间已满" });
          return;
        }
        if (room.phase !== "lobby") {
          cb({ ok: false, error: "对局已开始，无法加入" });
          return;
        }
        const player: Player = {
          id: socket.id,
          nickname,
          role: "guest",
          ready: false,
        };
        room.players.set(socket.id, player);
        socketToRoom.set(socket.id, code);
        socket.join(code);
        cb({ ok: true });
        broadcastRoom(io, room);
        broadcastLobbyList(io);
      },
    );

    socket.on("set_first_picker", (role: PlayerRole) => {
      const code = socketToRoom.get(socket.id);
      if (!code) return;
      const room = rooms.get(code);
      if (!room || room.phase !== "lobby") return;
      const player = room.players.get(socket.id);
      if (!player || player.role !== "host") return;
      room.firstPicker = role;
      broadcastRoom(io, room);
    });

    socket.on("set_room_name", (name: string) => {
      const code = socketToRoom.get(socket.id);
      if (!code) return;
      const room = rooms.get(code);
      if (!room || room.phase !== "lobby") return;
      const player = room.players.get(socket.id);
      if (!player || player.role !== "host") return;
      const trimmed = name?.trim().slice(0, 20);
      room.roomName = trimmed || room.roomName;
      broadcastRoom(io, room);
      broadcastLobbyList(io);
    });

    // 观战席加入：随时可加入，不限人数，BP 开始后也可加入
    socket.on(
      "join_room_spectator",
      (
        payload: { code: string; nickname: string },
        cb: (res: { ok: boolean; error?: string }) => void,
      ) => {
        const code = payload.code?.toUpperCase().trim();
        const nickname = payload.nickname?.trim();
        if (!code || !nickname) {
          cb({ ok: false, error: "房间号或昵称无效" });
          return;
        }
        const room = rooms.get(code);
        if (!room) {
          cb({ ok: false, error: "房间不存在" });
          return;
        }
        if (room.phase === "complete") {
          cb({ ok: false, error: "对局已结束" });
          return;
        }
        if (room.players.has(socket.id) || room.spectators.has(socket.id)) {
          cb({ ok: false, error: "你已在该房间" });
          return;
        }
        const spectator: Player = {
          id: socket.id,
          nickname,
          role: "spectator",
          ready: false,
        };
        room.spectators.set(socket.id, spectator);
        socketToRoom.set(socket.id, code);
        socket.join(code);
        cb({ ok: true });
        broadcastRoom(io, room);
        broadcastLobbyList(io);
      },
    );

    // 发起换位申请：仅选手 <-> 观战席
    socket.on("request_swap", (targetId: string) => {
      const code = socketToRoom.get(socket.id);
      if (!code) return;
      const room = rooms.get(code);
      if (!room) return;
      const from = room.players.get(socket.id) ?? room.spectators.get(socket.id);
      if (!from) return;
      const to = room.players.get(targetId) ?? room.spectators.get(targetId);
      if (!to) return;
      // 必须分属选手与观战席
      const fromIsPlayer = room.players.has(socket.id);
      const toIsPlayer = room.players.has(targetId);
      if (fromIsPlayer === toIsPlayer) return;
      // 已有涉及任一方的待处理申请则忽略
      const exists = [...room.pendingSwaps.values()].some(
        (s) => s.fromId === socket.id || s.toId === socket.id || s.toId === targetId,
      );
      if (exists) return;
      const requestId = randomBytes(4).toString("hex");
      room.pendingSwaps.set(requestId, { requestId, fromId: socket.id, toId: targetId });
      broadcastRoom(io, room);
    });

    // 取消换位申请（申请人主动取消自己发出的申请）
    socket.on("cancel_swap", () => {
      const code = socketToRoom.get(socket.id);
      if (!code) return;
      const room = rooms.get(code);
      if (!room) return;
      for (const [rid, s] of room.pendingSwaps) {
        if (s.fromId === socket.id) {
          room.pendingSwaps.delete(rid);
        }
      }
      broadcastRoom(io, room);
    });

    // 响应换位申请
    socket.on("respond_swap", (payload: { requestId: string; accept: boolean }) => {
      const code = socketToRoom.get(socket.id);
      if (!code) return;
      const room = rooms.get(code);
      if (!room) return;
      const sw = room.pendingSwaps.get(payload.requestId);
      if (!sw || sw.toId !== socket.id) return;
      room.pendingSwaps.delete(payload.requestId);
      if (payload.accept) {
        performSwap(room, sw.fromId, sw.toId);
      }
      broadcastRoom(io, room);
      broadcastLobbyList(io);
    });

    socket.on("list_rooms", (cb: (list: LobbyRoom[]) => void) => {
      cb(getLobbyRooms());
    });

    socket.on("set_ready", (ready: boolean) => {
      const code = socketToRoom.get(socket.id);
      if (!code) return;
      const room = rooms.get(code);
      if (!room || room.phase !== "lobby") return;
      const player = room.players.get(socket.id);
      if (!player) return;
      player.ready = ready;
      broadcastRoom(io, room);
      tryStartGame(io, room);
    });

    socket.on("toggle_ban", (heroId: string) => {
      const code = socketToRoom.get(socket.id);
      if (!code) return;
      const room = rooms.get(code);
      if (!room || room.phase !== "ban") return;
      const player = room.players.get(socket.id);
      if (!player) return;
      const bans = player.role === "host" ? room.hostBans : room.guestBans;
      const idx = bans.indexOf(heroId);
      if (idx >= 0) {
        bans.splice(idx, 1);
      } else if (bans.length < BANS_PER_PLAYER) {
        bans.push(heroId);
      }
      // 双方都禁满 3 个时提前进入公布阶段
      if (
        room.hostBans.length >= BANS_PER_PLAYER &&
        room.guestBans.length >= BANS_PER_PLAYER
      ) {
        endBanPhase(io, room);
        return;
      }
      broadcastRoom(io, room);
    });

    socket.on("pick_hero", (heroId: string) => {
      const code = socketToRoom.get(socket.id);
      if (!code) return;
      const room = rooms.get(code);
      if (!room || room.phase !== "pick" || !room.firstPicker) return;
      const player = room.players.get(socket.id);
      if (!player) return;
      const team = PICK_TURNS[room.pickStep];
      if (!team) return;
      if (roleToTeam(player.role, room.firstPicker) !== team) return;
      applyPick(io, room, player.role, heroId);
    });

    socket.on("leave_room", () => {
      handleDisconnect(io, socket);
    });

    socket.on("disconnect", () => {
      handleDisconnect(io, socket);
    });
  });

  function handleDisconnect(io: Server, socket: Socket) {
    const code = socketToRoom.get(socket.id);
    if (!code) return;
    const room = rooms.get(code);
    if (!room) return;

    // 清理涉及该 socket 的待处理换位申请
    for (const [rid, s] of room.pendingSwaps) {
      if (s.fromId === socket.id || s.toId === socket.id) {
        room.pendingSwaps.delete(rid);
      }
    }

    const wasPlayer = room.players.has(socket.id);
    room.players.delete(socket.id);
    room.spectators.delete(socket.id);
    socketToRoom.delete(socket.id);
    socket.leave(code);

    // 观战席离开：不影响对局
    if (!wasPlayer) {
      broadcastRoom(io, room);
      broadcastLobbyList(io);
      return;
    }

    // 选手离开
    if (room.players.size === 0) {
      destroyRoom(code);
      broadcastLobbyList(io);
      return;
    }

    if (room.phase === "lobby") {
      broadcastRoom(io, room);
      broadcastLobbyList(io);
      return;
    }

    // 对局中选手离开 → 终止
    io.to(code).emit("room_closed", "选手已离开房间，对局结束");
    destroyRoom(code);
    broadcastLobbyList(io);
  }
}
