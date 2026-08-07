import { randomBytes } from "crypto";
import type { Server, Socket } from "socket.io";
import {
  BAN_DURATION_MS,
  BAN_REVEAL_MS,
  BANS_PER_PLAYER,
  HEROES,
  PICK_DURATION_MS,
  PICK_TURNS,
  type Phase,
  type PlayerRole,
  type RoomState,
  type TeamSide,
} from "../shared/types.js";

interface Player {
  id: string;
  nickname: string;
  role: PlayerRole;
  ready: boolean;
}

interface Room {
  code: string;
  hostId: string;
  players: Map<string, Player>;
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
  surrenderedBy: PlayerRole | null;
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
  for (const [socketId, player] of room.players.entries()) {
    const socket = io.sockets.sockets.get(socketId);
    if (socket) {
      socket.emit("room_state", buildRoomState(room, player));
    }
  }
}

function buildRoomState(room: Room, viewer: Player): RoomState {
  const opponent = [...room.players.values()].find((p) => p.id !== viewer.id);
  const opponentRole = opponent?.role;
  const myBans = viewer.role === "host" ? room.hostBans : room.guestBans;
  const opponentBans =
    opponentRole === "host" ? room.hostBans : room.guestBans;

  let activeTeam: TeamSide | null = null;
  let isMyTurn = false;
  if (room.phase === "pick" && room.firstPicker) {
    activeTeam = PICK_TURNS[room.pickStep] ?? null;
    const myTeam = roleToTeam(viewer.role, room.firstPicker);
    isMyTurn = activeTeam === myTeam;
  }

  const showBans =
    room.phase === "ban_reveal" ||
    room.phase === "pick" ||
    room.phase === "complete";

  return {
    code: room.code,
    phase: room.phase,
    players: [...room.players.values()],
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
    myTeam: room.firstPicker ? roleToTeam(viewer.role, room.firstPicker) : null,
    isMyTurn,
    surrenderedBy: room.surrenderedBy,
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
  room.pickTimer = setTimeout(() => autoPick(io, room), PICK_DURATION_MS);
}

function autoPick(io: Server, room: Room) {
  if (room.phase !== "pick" || !room.firstPicker) return;
  const team = PICK_TURNS[room.pickStep];
  if (!team) return;
  const role = teamToRole(team, room.firstPicker);
  const available = getAvailableForRole(room, role);
  if (available.length === 0) {
    advancePick(io, room);
    return;
  }
  const pick = available[Math.floor(Math.random() * available.length)]!;
  applyPick(io, room, role, pick);
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
}

function destroyRoom(code: string) {
  const room = rooms.get(code);
  if (room) clearTimers(room);
  rooms.delete(code);
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
          hostId: socket.id,
          players: new Map(),
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
          surrenderedBy: null,
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
      },
    );

    socket.on("set_first_picker", (role: PlayerRole) => {
      const code = socketToRoom.get(socket.id);
      if (!code) return;
      const room = rooms.get(code);
      if (!room || room.hostId !== socket.id || room.phase !== "lobby") return;
      room.firstPicker = role;
      broadcastRoom(io, room);
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

    socket.on("surrender", () => {
      const code = socketToRoom.get(socket.id);
      if (!code) return;
      const room = rooms.get(code);
      if (!room || room.phase !== "pick") return;
      const player = room.players.get(socket.id);
      if (!player) return;
      room.surrenderedBy = player.role;
      clearTimers(room);
      room.phase = "complete";
      room.phaseEndsAt = null;
      broadcastRoom(io, room);
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

    room.players.delete(socket.id);
    socketToRoom.delete(socket.id);
    socket.leave(code);

    if (room.players.size === 0) {
      destroyRoom(code);
      return;
    }

    if (room.phase === "lobby") {
      broadcastRoom(io, room);
      return;
    }

    io.to(code).emit("room_closed", "对手已离开房间");
    destroyRoom(code);
  }
}
