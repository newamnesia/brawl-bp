import { randomBytes } from "crypto";
import type { Server, Socket } from "socket.io";
import {
  BAN_DURATION_MS,
  BAN_REVEAL_MS,
  BANS_PER_PLAYER,
  DISABLED_HERO_IDS,
  HEROES,
  type GameMode,
  MAPS,
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
  resumeToken: string;
  disconnectTimer: ReturnType<typeof setTimeout> | null;
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
  cleanupTimer: ReturnType<typeof setTimeout> | null;
  timedOutBy: PlayerRole | null;
  pendingSwaps: Map<string, PendingSwap>; // requestId -> 换位申请
  gameMode: GameMode | null;
  hostMapId: string | null;
  guestMapId: string | null;
  confirmedMapId: string | null;
}

const rooms = new Map<string, Room>();
const socketToRoom = new Map<string, string>();
const RECONNECT_GRACE_MS = 120_000;
const COMPLETED_ROOM_TTL_MS = 30 * 60_000;

function generateResumeToken(): string {
  return randomBytes(24).toString("hex");
}

function publicPlayer(player: Player) {
  return {
    id: player.id,
    nickname: player.nickname,
    role: player.role,
    ready: player.ready,
  };
}

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
    ...DISABLED_HERO_IDS,
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
    players: [...room.players.values()].map(publicPlayer),
    spectators: [...room.spectators.values()].map(publicPlayer),
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
    gameMode: room.gameMode,
    hostMapId: room.hostMapId,
    guestMapId: room.guestMapId,
    confirmedMapId: room.confirmedMapId,
  };
}

function clearTimers(room: Room) {
  if (room.banTimer) clearTimeout(room.banTimer);
  if (room.revealTimer) clearTimeout(room.revealTimer);
  if (room.pickTimer) clearTimeout(room.pickTimer);
  if (room.cleanupTimer) clearTimeout(room.cleanupTimer);
  room.banTimer = room.revealTimer = room.pickTimer = null;
  room.cleanupTimer = null;
}

function scheduleCompletedRoomCleanup(io: Server, room: Room) {
  if (room.cleanupTimer) clearTimeout(room.cleanupTimer);
  room.cleanupTimer = setTimeout(() => {
    io.to(room.code).emit("room_closed", "房间结果已过期，请创建新房间");
    destroyRoom(room.code);
  }, COMPLETED_ROOM_TTL_MS);
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
  scheduleCompletedRoomCleanup(io, room);
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
    scheduleCompletedRoomCleanup(io, room);
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
}

function destroyRoom(code: string) {
  const room = rooms.get(code);
  if (room) {
    clearTimers(room);
    for (const member of [...room.players.values(), ...room.spectators.values()]) {
      if (member.disconnectTimer) clearTimeout(member.disconnectTimer);
      socketToRoom.delete(member.id);
    }
    room.pendingSwaps.clear();
    room.players.clear();
    room.spectators.clear();
  }
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

export function registerRoomHandlers(io: Server) {
  io.on("connection", (socket: Socket) => {
    socket.on(
      "create_room",
      (nickname: string, cb: (res: { ok: boolean; code?: string; resumeToken?: string; error?: string }) => void) => {
        if (!nickname?.trim()) {
          cb({ ok: false, error: "请输入昵称" });
          return;
        }
        // 若已在其他房间，先彻底离开，避免遗留幽灵房间
        if (socketToRoom.has(socket.id)) {
          handleDisconnect(io, socket);
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
          cleanupTimer: null,
          timedOutBy: null,
          pendingSwaps: new Map(),
          gameMode: null,
          hostMapId: null,
          guestMapId: null,
          confirmedMapId: null,
        };
        const player: Player = {
          id: socket.id,
          nickname: nickname.trim(),
          role: "host",
          ready: false,
          resumeToken: generateResumeToken(),
          disconnectTimer: null,
        };
        room.players.set(socket.id, player);
        rooms.set(code, room);
        socketToRoom.set(socket.id, code);
        socket.join(code);
        cb({ ok: true, code, resumeToken: player.resumeToken });
        broadcastRoom(io, room);
      },
    );

    socket.on(
      "join_room",
      (
        payload: { code: string; nickname: string },
        cb: (res: { ok: boolean; resumeToken?: string; error?: string }) => void,
      ) => {
        const code = payload.code?.toUpperCase().trim();
        const nickname = payload.nickname?.trim();
        if (!code || !nickname) {
          cb({ ok: false, error: "房间号或昵称无效" });
          return;
        }
        // 若已在其他房间，先彻底离开，避免遗留幽灵房间
        if (socketToRoom.has(socket.id)) {
          handleDisconnect(io, socket);
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
          resumeToken: generateResumeToken(),
          disconnectTimer: null,
        };
        room.players.set(socket.id, player);
        socketToRoom.set(socket.id, code);
        socket.join(code);
        cb({ ok: true, resumeToken: player.resumeToken });
        broadcastRoom(io, room);
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
    });

    // 设置游戏模式
    socket.on("set_game_mode", (mode: GameMode | null) => {
      const code = socketToRoom.get(socket.id);
      if (!code) return;
      const room = rooms.get(code);
      if (!room || room.phase !== "lobby") return;
      const player = room.players.get(socket.id);
      if (!player) return;
      // 验证 mode 合法
      if (mode !== null && !MAPS.some((m) => m.mode === mode)) return;
      room.gameMode = mode;
      // 切换模式时重置双方地图选择
      room.hostMapId = null;
      room.guestMapId = null;
      room.confirmedMapId = null;
      broadcastRoom(io, room);
    });

    // 选择地图
    socket.on("set_map", (mapId: string | null) => {
      const code = socketToRoom.get(socket.id);
      if (!code) return;
      const room = rooms.get(code);
      if (!room || room.phase !== "lobby") return;
      const player = room.players.get(socket.id);
      if (!player) return;
      // 验证地图属于当前模式
      if (mapId !== null && !MAPS.some((m) => m.id === mapId && m.mode === room.gameMode)) return;
      if (player.role === "host") {
        room.hostMapId = mapId;
      } else {
        room.guestMapId = mapId;
      }
      // 双方选了同一张地图 → 确认
      if (room.hostMapId && room.hostMapId === room.guestMapId) {
        room.confirmedMapId = room.hostMapId;
      } else {
        room.confirmedMapId = null;
      }
      broadcastRoom(io, room);
    });

    // 观战席加入：随时可加入，不限人数，BP 开始后也可加入
    socket.on(
      "join_room_spectator",
      (
        payload: { code: string; nickname: string },
        cb: (res: { ok: boolean; resumeToken?: string; error?: string }) => void,
      ) => {
        const code = payload.code?.toUpperCase().trim();
        const nickname = payload.nickname?.trim();
        if (!code || !nickname) {
          cb({ ok: false, error: "房间号或昵称无效" });
          return;
        }
        // 若已在其他房间，先彻底离开，避免遗留幽灵房间
        if (socketToRoom.has(socket.id)) {
          handleDisconnect(io, socket);
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
          resumeToken: generateResumeToken(),
          disconnectTimer: null,
        };
        room.spectators.set(socket.id, spectator);
        socketToRoom.set(socket.id, code);
        socket.join(code);
        cb({ ok: true, resumeToken: spectator.resumeToken });
        broadcastRoom(io, room);
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
    });

    // 客户端挂载后主动拉取当前房间状态，避免初始 room_state 在监听器注册前到达而丢失
    socket.on("request_state", () => {
      const code = socketToRoom.get(socket.id);
      if (!code) return;
      const room = rooms.get(code);
      if (!room) return;
      const viewer =
        room.players.get(socket.id) ?? room.spectators.get(socket.id);
      if (!viewer) return;
      socket.emit("room_state", buildRoomState(room, viewer));
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
      // 不可用角色不允许被禁用
      if (DISABLED_HERO_IDS.has(heroId)) return;
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

    socket.on('resume_room', (payload: { code?: string; resumeToken?: string }, cb: (result: { ok: boolean; error?: string }) => void) => {
      if (typeof cb !== 'function') return;
      if (!payload || typeof payload.code !== 'string' || typeof payload.resumeToken !== 'string') return cb({ ok: false, error: '恢复信息无效' });
      const room = rooms.get(payload.code);
      const player = room && [...room.players.values(), ...room.spectators.values()].find(p => p.resumeToken === payload.resumeToken);
      if (!room || !player) return cb({ ok: false, error: '房间已过期或服务器已重启，请重新加入' });
      const assigned = socketToRoom.get(socket.id);
      if (assigned && (assigned !== room.code || player.id !== socket.id)) return cb({ ok: false, error: '请先退出当前房间' });
      if (player.disconnectTimer) clearTimeout(player.disconnectTimer);
      player.disconnectTimer = null;
      const oldId = player.id;
      const oldSocket = io.sockets.sockets.get(oldId);
      socketToRoom.delete(oldId);
      if (oldSocket && oldId !== socket.id) { oldSocket.leave(room.code); oldSocket.emit('room_closed', '房间已在另一个连接恢复'); }
      const members = room.players.has(oldId) ? room.players : room.spectators;
      members.delete(oldId);
      player.id = socket.id;
      members.set(socket.id, player);
      if (room.hostId === oldId) room.hostId = socket.id;
      for (const [id, swap] of room.pendingSwaps) if (swap.fromId === oldId || swap.toId === oldId) room.pendingSwaps.delete(id);
      socketToRoom.set(socket.id, room.code);
      socket.join(room.code);
      cb({ ok: true });
      broadcastRoom(io, room);
    });

    socket.on("disconnect", () => {
      const code = socketToRoom.get(socket.id);
      const room = code && rooms.get(code);
      if (!room) return;
      const player = room.players.get(socket.id) ?? room.spectators.get(socket.id);
      if (!player) return;
      // 保留席位两分钟；禁选阶段与服务端倒计时始终继续。
      if (player.disconnectTimer) clearTimeout(player.disconnectTimer);
      player.disconnectTimer = setTimeout(() => handleDisconnect(io, socket), RECONNECT_GRACE_MS);
    });
  });

  function handleDisconnect(io: Server, socket: Socket) {
    const code = socketToRoom.get(socket.id);
    if (!code) return;
    const room = rooms.get(code);
    if (!room) return;

    const departing = room.players.get(socket.id) ?? room.spectators.get(socket.id);
    if (departing?.disconnectTimer) clearTimeout(departing.disconnectTimer);

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

    // BP 已结束：保留结果，直到所有人（选手+观战席）都退出才销毁
    if (room.phase === "complete") {
      if (room.players.size === 0 && room.spectators.size === 0) {
        destroyRoom(code);
      } else {
        broadcastRoom(io, room);
      }
      return;
    }

    // 观战席离开（非 complete 阶段）：不影响对局
    if (!wasPlayer) {
      broadcastRoom(io, room);
      return;
    }

    // 选手离开
    if (room.players.size === 0) {
      destroyRoom(code);
      return;
    }

    if (room.phase === "lobby") {
      broadcastRoom(io, room);
      return;
    }

    // 对局中选手离开 → 终止
    io.to(code).emit("room_closed", "选手已离开房间，对局结束");
    destroyRoom(code);
  }
}
