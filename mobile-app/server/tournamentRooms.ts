import { randomBytes } from "crypto";
import type { Server, Socket } from "socket.io";
import {
  BAN_DURATION_MS,
  DISABLED_HERO_IDS,
  HEROES,
  MAPS,
  MAX_TURN_DURATION_SECONDS,
  MIN_TURN_DURATION_SECONDS,
  PICK_DURATION_MS,
  type GameMode,
  type TournamentRoomState,
  type TournamentTeam,
} from "../shared/types.js";

interface TournamentPlayer {
  id: string;
  nickname: string;
  team: TournamentTeam;
  seatIndex: number;
  ready: boolean;
}

interface TournamentSpectator {
  id: string;
  nickname: string;
}

interface TournamentRoom {
  code: string;
  roomName: string;
  hostId: string;
  players: Map<string, TournamentPlayer>;
  spectators: Map<string, TournamentSpectator>;
  phase: "lobby" | "ban" | "pick" | "complete";
  firstPickTeam: TournamentTeam | null;
  gameMode: GameMode | null;
  teamMapIds: Record<TournamentTeam, string | null>;
  confirmedMapId: string | null;
  globalBans: Record<TournamentTeam, string[]>;
  bans: Record<TournamentTeam, Array<string | null>>;
  picks: Record<TournamentTeam, Array<string | null>>;
  banLockedCount: Record<TournamentTeam, number>;
  banFinished: Record<TournamentTeam, boolean>;
  pendingBans: Record<TournamentTeam, Array<string | null>>;
  banConfirmed: Record<TournamentTeam, boolean[]>;
  pendingPick: string | null;
  pickStep: number;
  banDurationMs: number;
  pickDurationMs: number;
  phaseEndsAt: number | null;
  phaseTimer: ReturnType<typeof setTimeout> | null;
  cleanupTimer: ReturnType<typeof setTimeout> | null;
  timedOutSeatId: string | null;
  timeoutMessage: string | null;
}

const rooms = new Map<string, TournamentRoom>();
const socketToRoom = new Map<string, string>();
const COMPLETED_ROOM_TTL_MS = 30_000;
const MAX_GLOBAL_BANS_PER_TEAM = 2;
const MAX_TEAM_SEATS = 3;
const ALL_HERO_IDS = new Set(HEROES.map((hero) => hero.id));

const PICK_ORDER: Array<{ orderTeam: "first" | "second"; slot: number }> = [
  { orderTeam: "first", slot: 0 },
  { orderTeam: "second", slot: 0 },
  { orderTeam: "second", slot: 1 },
  { orderTeam: "first", slot: 1 },
  { orderTeam: "first", slot: 2 },
  { orderTeam: "second", slot: 2 },
];

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(6);
  let code = "";
  for (let i = 0; i < 6; i++) code += chars[bytes[i]! % chars.length];
  return rooms.has(code) ? generateCode() : code;
}

function otherTeam(team: TournamentTeam): TournamentTeam {
  return team === "blue" ? "red" : "blue";
}

function teamForPick(room: TournamentRoom, step = room.pickStep): TournamentTeam | null {
  const turn = PICK_ORDER[step];
  if (!turn || !room.firstPickTeam) return null;
  return turn.orderTeam === "first" ? room.firstPickTeam : otherTeam(room.firstPickTeam);
}

function controllerForSlot(room: TournamentRoom, team: TournamentTeam, slot: number) {
  const teamPlayers = [...room.players.values()]
    .filter((player) => player.team === team)
    .sort((a, b) => a.seatIndex - b.seatIndex);
  if (teamPlayers.length === 0) return null;
  return teamPlayers.find((player) => player.seatIndex === slot) ?? teamPlayers[slot % teamPlayers.length]!;
}

function activeController(room: TournamentRoom) {
  if (room.phase !== "pick") return null;
  const team = teamForPick(room);
  const turn = PICK_ORDER[room.pickStep];
  return team && turn ? controllerForSlot(room, team, turn.slot) : null;
}

function activeBanSlotForPlayer(room: TournamentRoom, player: TournamentPlayer) {
  if (room.phase !== "ban" || room.banFinished[player.team]) return null;
  for (let slot = 0; slot < MAX_TEAM_SEATS; slot++) {
    if (!room.banConfirmed[player.team][slot] && controllerForSlot(room, player.team, slot)?.id === player.id) return slot;
  }
  return null;
}

function canPlayerBan(room: TournamentRoom, player: TournamentPlayer) {
  return activeBanSlotForPlayer(room, player) !== null;
}

function globalBanSet(room: TournamentRoom) {
  return new Set([...room.globalBans.blue, ...room.globalBans.red]);
}

function availableForBan(room: TournamentRoom, team: TournamentTeam, heroId: string, ownSlot: number) {
  if (!ALL_HERO_IDS.has(heroId) || DISABLED_HERO_IDS.has(heroId)) return false;
  if (globalBanSet(room).has(heroId)) return false;
  return !room.bans[team].some((id, index) => index !== ownSlot && id === heroId)
    && !room.pendingBans[team].some((id, index) => index !== ownSlot && id === heroId);
}

function availableForPick(room: TournamentRoom, heroId: string) {
  if (!ALL_HERO_IDS.has(heroId) || DISABLED_HERO_IDS.has(heroId)) return false;
  return !new Set([
    ...room.globalBans.blue,
    ...room.globalBans.red,
    ...room.bans.blue.filter(Boolean),
    ...room.bans.red.filter(Boolean),
    ...room.picks.blue.filter(Boolean),
    ...room.picks.red.filter(Boolean),
  ]).has(heroId);
}

function buildState(room: TournamentRoom, viewerId: string): TournamentRoomState {
  const player = room.players.get(viewerId) ?? null;
  const spectator = room.spectators.has(viewerId);
  const revealGlobal = room.phase !== "lobby";
  const activeTeam = teamForPick(room);
  const activeSlot = room.phase === "pick" ? PICK_ORDER[room.pickStep]?.slot ?? null : null;
  const controller = activeController(room);
  const myActiveBanSlot = player ? activeBanSlotForPlayer(room, player) : null;
  const canAct = player
    ? room.phase === "ban"
      ? canPlayerBan(room, player)
      : room.phase === "pick" && controller?.id === player.id
    : false;
  const canSeeBluePending = spectator || player?.team === "blue";
  const canSeeRedPending = spectator || player?.team === "red";

  return {
    roomKind: "tournament",
    code: room.code,
    roomName: room.roomName,
    phase: room.phase,
    hostId: room.hostId,
    players: [...room.players.values()].map(({ id, nickname, team, seatIndex, ready }) => ({ id, nickname, team, seatIndex, ready })),
    spectators: [...room.spectators.values()].map(({ id, nickname }) => ({ id, nickname })),
    myTeam: player?.team ?? null,
    mySeatIndex: player?.seatIndex ?? null,
    isSpectator: spectator,
    firstPickTeam: room.firstPickTeam,
    gameMode: room.gameMode,
    teamMapIds: { ...room.teamMapIds },
    confirmedMapId: room.confirmedMapId,
    banDurationSeconds: room.banDurationMs / 1000,
    pickDurationSeconds: room.pickDurationMs / 1000,
    phaseEndsAt: room.phaseEndsAt,
    blueGlobalBans: revealGlobal || player?.team === "blue" ? [...room.globalBans.blue] : null,
    redGlobalBans: revealGlobal || player?.team === "red" ? [...room.globalBans.red] : null,
    myGlobalBans: player ? [...room.globalBans[player.team]] : [],
    blueBans: [...room.bans.blue],
    redBans: [...room.bans.red],
    bluePicks: [...room.picks.blue],
    redPicks: [...room.picks.red],
    blueBanLockedCount: room.banLockedCount.blue,
    redBanLockedCount: room.banLockedCount.red,
    blueBanFinished: room.banFinished.blue,
    redBanFinished: room.banFinished.red,
    visibleBluePendingBans: canSeeBluePending ? [...room.pendingBans.blue] : [null, null, null],
    visibleRedPendingBans: canSeeRedPending ? [...room.pendingBans.red] : [null, null, null],
    myActiveBanSlot,
    pendingPick: room.pendingPick,
    pickStep: room.pickStep,
    activePickTeam: activeTeam,
    activePickSlot: activeSlot,
    canAct,
    timedOutSeatId: room.timedOutSeatId,
    timeoutMessage: room.timeoutMessage,
  };
}

function broadcast(io: Server, room: TournamentRoom) {
  for (const id of [...room.players.keys(), ...room.spectators.keys()]) {
    io.sockets.sockets.get(id)?.emit("tournament_room_state", buildState(room, id));
  }
}

function clearTimers(room: TournamentRoom) {
  if (room.phaseTimer) clearTimeout(room.phaseTimer);
  if (room.cleanupTimer) clearTimeout(room.cleanupTimer);
  room.phaseTimer = null;
  room.cleanupTimer = null;
}

function destroyRoom(code: string) {
  const room = rooms.get(code);
  if (!room) return;
  clearTimers(room);
  for (const id of [...room.players.keys(), ...room.spectators.keys()]) socketToRoom.delete(id);
  rooms.delete(code);
}

function completeRoom(io: Server, room: TournamentRoom, message: string | null = null, seatId: string | null = null) {
  if (room.phaseTimer) clearTimeout(room.phaseTimer);
  room.phaseTimer = null;
  room.phase = "complete";
  room.phaseEndsAt = null;
  room.timeoutMessage = message;
  room.timedOutSeatId = seatId;
  room.cleanupTimer = setTimeout(() => {
    io.to(room.code).emit("tournament_room_closed", "赛事房结果已保留 30 秒，房间现已销毁");
    destroyRoom(room.code);
  }, COMPLETED_ROOM_TTL_MS);
  broadcast(io, room);
}

function advancePick(io: Server, room: TournamentRoom) {
  if (room.phaseTimer) clearTimeout(room.phaseTimer);
  room.phaseTimer = null;
  room.pendingPick = null;
  room.pickStep += 1;
  if (room.pickStep >= PICK_ORDER.length) {
    completeRoom(io, room);
    return;
  }
  schedulePickTimer(io, room);
  broadcast(io, room);
}

function handlePickTimeout(io: Server, room: TournamentRoom) {
  if (room.phase !== "pick") return;
  const controller = activeController(room);
  const team = teamForPick(room);
  const slot = PICK_ORDER[room.pickStep]?.slot;
  if (room.pendingPick && team && slot != null && availableForPick(room, room.pendingPick)) {
    room.picks[team][slot] = room.pendingPick;
    advancePick(io, room);
    return;
  }
  completeRoom(io, room, `第 ${room.pickStep + 1} 手选角超时且没有预选，BP 已终止`, controller?.id ?? null);
}

function schedulePickTimer(io: Server, room: TournamentRoom) {
  room.phaseEndsAt = Date.now() + room.pickDurationMs;
  room.phaseTimer = setTimeout(() => handlePickTimeout(io, room), room.pickDurationMs);
}

function startPick(io: Server, room: TournamentRoom) {
  if (room.phaseTimer) clearTimeout(room.phaseTimer);
  room.phaseTimer = null;
  room.phase = "pick";
  room.pickStep = 0;
  room.pendingPick = null;
  schedulePickTimer(io, room);
  broadcast(io, room);
}

function finishTeamBan(room: TournamentRoom, team: TournamentTeam, includePending: boolean) {
  for (let slot = 0; slot < MAX_TEAM_SEATS; slot++) {
    if (room.banConfirmed[team][slot]) continue;
    const pending = room.pendingBans[team][slot];
    if (includePending && pending && availableForBan(room, team, pending, slot)) room.bans[team][slot] = pending;
    room.banConfirmed[team][slot] = true;
  }
  room.pendingBans[team] = [null, null, null];
  room.banLockedCount[team] = MAX_TEAM_SEATS;
  room.banFinished[team] = true;
}

function handleBanTimeout(io: Server, room: TournamentRoom) {
  if (room.phase !== "ban") return;
  finishTeamBan(room, "blue", true);
  finishTeamBan(room, "red", true);
  startPick(io, room);
}

function startBan(io: Server, room: TournamentRoom) {
  room.phase = "ban";
  room.bans = { blue: [null, null, null], red: [null, null, null] };
  room.picks = { blue: [null, null, null], red: [null, null, null] };
  room.banLockedCount = { blue: 0, red: 0 };
  room.banFinished = { blue: false, red: false };
  room.pendingBans = { blue: [null, null, null], red: [null, null, null] };
  room.banConfirmed = { blue: [false, false, false], red: [false, false, false] };
  room.pendingPick = null;
  room.pickStep = 0;
  room.phaseEndsAt = Date.now() + room.banDurationMs;
  room.phaseTimer = setTimeout(() => handleBanTimeout(io, room), room.banDurationMs);
  broadcast(io, room);
}

function resetReady(room: TournamentRoom) {
  for (const player of room.players.values()) player.ready = false;
}

function tryStart(io: Server, room: TournamentRoom) {
  const players = [...room.players.values()];
  if (!players.some((player) => player.team === "blue") || !players.some((player) => player.team === "red")) return;
  if (!room.firstPickTeam || !room.confirmedMapId || !players.every((player) => player.ready)) return;
  startBan(io, room);
}

function nextSeat(room: TournamentRoom): { team: TournamentTeam; seatIndex: number } | null {
  const order: Array<{ team: TournamentTeam; seatIndex: number }> = [
    { team: "red", seatIndex: 0 },
    { team: "blue", seatIndex: 1 },
    { team: "red", seatIndex: 1 },
    { team: "blue", seatIndex: 2 },
    { team: "red", seatIndex: 2 },
  ];
  return order.find((seat) => ![...room.players.values()].some((player) => player.team === seat.team && player.seatIndex === seat.seatIndex)) ?? null;
}

export function registerTournamentRoomHandlers(io: Server) {
  io.on("connection", (socket: Socket) => {
    socket.on("create_tournament_room", (nickname: string, cb: (result: { ok: boolean; code?: string; error?: string }) => void) => {
      const name = nickname?.trim().slice(0, 16);
      if (!name) return cb({ ok: false, error: "请输入昵称" });
      const code = generateCode();
      const room: TournamentRoom = {
        code,
        roomName: `${name}的赛事房`,
        hostId: socket.id,
        players: new Map(),
        spectators: new Map(),
        phase: "lobby",
        firstPickTeam: null,
        gameMode: null,
        teamMapIds: { blue: null, red: null },
        confirmedMapId: null,
        globalBans: { blue: [], red: [] },
        bans: { blue: [null, null, null], red: [null, null, null] },
        picks: { blue: [null, null, null], red: [null, null, null] },
        banLockedCount: { blue: 0, red: 0 },
        banFinished: { blue: false, red: false },
        pendingBans: { blue: [null, null, null], red: [null, null, null] },
        banConfirmed: { blue: [false, false, false], red: [false, false, false] },
        pendingPick: null,
        pickStep: 0,
        banDurationMs: BAN_DURATION_MS,
        pickDurationMs: PICK_DURATION_MS,
        phaseEndsAt: null,
        phaseTimer: null,
        cleanupTimer: null,
        timedOutSeatId: null,
        timeoutMessage: null,
      };
      room.players.set(socket.id, { id: socket.id, nickname: name, team: "blue", seatIndex: 0, ready: false });
      rooms.set(code, room);
      socketToRoom.set(socket.id, code);
      socket.join(code);
      cb({ ok: true, code });
      broadcast(io, room);
    });

    socket.on("join_tournament_room", (payload: { code: string; nickname: string }, cb: (result: { ok: boolean; found?: boolean; error?: string }) => void) => {
      const code = payload.code?.toUpperCase().trim();
      const name = payload.nickname?.trim().slice(0, 16);
      const room = rooms.get(code);
      if (!room) return cb({ ok: false, found: false });
      if (!name) return cb({ ok: false, found: true, error: "请输入昵称" });
      if (room.phase !== "lobby") return cb({ ok: false, found: true, error: "赛事已经开始，请改为观战加入" });
      const seat = nextSeat(room);
      if (!seat) return cb({ ok: false, found: true, error: "六个选手席已满" });
      room.players.set(socket.id, { id: socket.id, nickname: name, ...seat, ready: false });
      socketToRoom.set(socket.id, code);
      socket.join(code);
      cb({ ok: true, found: true });
      broadcast(io, room);
    });

    socket.on("join_tournament_spectator", (payload: { code: string; nickname: string }, cb: (result: { ok: boolean; found?: boolean; error?: string }) => void) => {
      const code = payload.code?.toUpperCase().trim();
      const name = payload.nickname?.trim().slice(0, 16);
      const room = rooms.get(code);
      if (!room) return cb({ ok: false, found: false });
      if (!name) return cb({ ok: false, found: true, error: "请输入昵称" });
      if (room.phase === "complete") return cb({ ok: false, found: true, error: "赛事已经结束" });
      room.spectators.set(socket.id, { id: socket.id, nickname: name });
      socketToRoom.set(socket.id, code);
      socket.join(code);
      cb({ ok: true, found: true });
      broadcast(io, room);
    });

    socket.on("request_tournament_state", () => {
      const room = rooms.get(socketToRoom.get(socket.id) ?? "");
      if (room && (room.players.has(socket.id) || room.spectators.has(socket.id))) socket.emit("tournament_room_state", buildState(room, socket.id));
    });

    socket.on("set_tournament_room_name", (name: string) => {
      const room = rooms.get(socketToRoom.get(socket.id) ?? "");
      if (!room || room.phase !== "lobby" || room.hostId !== socket.id) return;
      const trimmed = name?.trim().slice(0, 20);
      if (trimmed) room.roomName = trimmed;
      broadcast(io, room);
    });

    socket.on("set_tournament_mode", (mode: GameMode | null) => {
      const room = rooms.get(socketToRoom.get(socket.id) ?? "");
      if (!room || room.phase !== "lobby" || room.hostId !== socket.id) return;
      if (mode !== null && !MAPS.some((map) => map.mode === mode)) return;
      room.gameMode = mode;
      room.teamMapIds = { blue: null, red: null };
      room.confirmedMapId = null;
      resetReady(room);
      broadcast(io, room);
    });

    socket.on("set_tournament_map", (mapId: string | null) => {
      const room = rooms.get(socketToRoom.get(socket.id) ?? "");
      const player = room?.players.get(socket.id);
      if (!room || !player || room.phase !== "lobby") return;
      if (mapId !== null && !MAPS.some((map) => map.id === mapId && map.mode === room.gameMode)) return;
      room.teamMapIds[player.team] = mapId;
      room.confirmedMapId = room.teamMapIds.blue && room.teamMapIds.blue === room.teamMapIds.red ? room.teamMapIds.blue : null;
      resetReady(room);
      broadcast(io, room);
    });

    socket.on("set_tournament_first_picker", (team: TournamentTeam) => {
      const room = rooms.get(socketToRoom.get(socket.id) ?? "");
      if (!room || room.phase !== "lobby" || room.hostId !== socket.id || (team !== "blue" && team !== "red")) return;
      room.firstPickTeam = team;
      resetReady(room);
      broadcast(io, room);
    });

    socket.on("set_tournament_time_limits", (payload: { banSeconds: number; pickSeconds: number }) => {
      const room = rooms.get(socketToRoom.get(socket.id) ?? "");
      if (!room || room.phase !== "lobby" || room.hostId !== socket.id) return;
      const banSeconds = Number(payload?.banSeconds);
      const pickSeconds = Number(payload?.pickSeconds);
      if (!Number.isInteger(banSeconds) || !Number.isInteger(pickSeconds) || banSeconds < MIN_TURN_DURATION_SECONDS || banSeconds > MAX_TURN_DURATION_SECONDS || pickSeconds < MIN_TURN_DURATION_SECONDS || pickSeconds > MAX_TURN_DURATION_SECONDS) return;
      room.banDurationMs = banSeconds * 1000;
      room.pickDurationMs = pickSeconds * 1000;
      resetReady(room);
      broadcast(io, room);
    });

    socket.on("toggle_tournament_global_ban", (heroId: string) => {
      const room = rooms.get(socketToRoom.get(socket.id) ?? "");
      const player = room?.players.get(socket.id);
      if (!room || !player || room.phase !== "lobby" || !ALL_HERO_IDS.has(heroId) || DISABLED_HERO_IDS.has(heroId)) return;
      const bans = room.globalBans[player.team];
      const index = bans.indexOf(heroId);
      if (index >= 0) bans.splice(index, 1);
      else if (bans.length < MAX_GLOBAL_BANS_PER_TEAM) bans.push(heroId);
      resetReady(room);
      broadcast(io, room);
    });

    socket.on("set_tournament_ready", (ready: boolean) => {
      const room = rooms.get(socketToRoom.get(socket.id) ?? "");
      const player = room?.players.get(socket.id);
      if (!room || !player || room.phase !== "lobby") return;
      player.ready = Boolean(ready);
      broadcast(io, room);
      tryStart(io, room);
    });

    socket.on("tournament_preselect", (heroId: string) => {
      const room = rooms.get(socketToRoom.get(socket.id) ?? "");
      const player = room?.players.get(socket.id);
      if (!room || !player || !room.phase) return;
      const banSlot = activeBanSlotForPlayer(room, player);
      if (room.phase === "ban" && banSlot !== null && availableForBan(room, player.team, heroId, banSlot)) {
        room.pendingBans[player.team][banSlot] = room.pendingBans[player.team][banSlot] === heroId ? null : heroId;
        broadcast(io, room);
      } else if (room.phase === "pick" && activeController(room)?.id === player.id && availableForPick(room, heroId)) {
        room.pendingPick = room.pendingPick === heroId ? null : heroId;
        broadcast(io, room);
      }
    });

    socket.on("confirm_tournament_selection", () => {
      const room = rooms.get(socketToRoom.get(socket.id) ?? "");
      const player = room?.players.get(socket.id);
      if (!room || !player) return;
      if (room.phase === "ban" && canPlayerBan(room, player)) {
        const team = player.team;
        const index = activeBanSlotForPlayer(room, player);
        if (index === null) return;
        const pending = room.pendingBans[team][index];
        room.bans[team][index] = pending && availableForBan(room, team, pending, index) ? pending : null;
        room.pendingBans[team][index] = null;
        room.banConfirmed[team][index] = true;
        room.banLockedCount[team] = room.banConfirmed[team].filter(Boolean).length;
        if (room.banLockedCount[team] >= MAX_TEAM_SEATS) room.banFinished[team] = true;
        if (room.banFinished.blue && room.banFinished.red) startPick(io, room);
        else broadcast(io, room);
      } else if (room.phase === "pick" && activeController(room)?.id === player.id && room.pendingPick && availableForPick(room, room.pendingPick)) {
        const team = teamForPick(room);
        const slot = PICK_ORDER[room.pickStep]?.slot;
        if (!team || slot == null) return;
        room.picks[team][slot] = room.pendingPick;
        advancePick(io, room);
      }
    });

    socket.on("finish_tournament_ban", () => {
      const room = rooms.get(socketToRoom.get(socket.id) ?? "");
      const player = room?.players.get(socket.id);
      if (!room || !player || room.phase !== "ban" || !canPlayerBan(room, player)) return;
      finishTeamBan(room, player.team, true);
      if (room.banFinished.blue && room.banFinished.red) startPick(io, room);
      else broadcast(io, room);
    });

    socket.on("leave_tournament_room", () => leave(io, socket));
    socket.on("disconnect", () => leave(io, socket));
  });
}

function leave(io: Server, socket: Socket) {
  const code = socketToRoom.get(socket.id);
  const room = code ? rooms.get(code) : null;
  if (!code || !room) return;
  const wasPlayer = room.players.delete(socket.id);
  room.spectators.delete(socket.id);
  socketToRoom.delete(socket.id);
  socket.leave(code);
  if (!wasPlayer) {
    broadcast(io, room);
    return;
  }
  if (room.players.size === 0) {
    io.to(code).emit("tournament_room_closed", "赛事房已关闭");
    destroyRoom(code);
    return;
  }
  if (room.hostId === socket.id) room.hostId = [...room.players.values()].sort((a, b) => a.seatIndex - b.seatIndex)[0]!.id;
  if (room.phase !== "lobby" && (![...room.players.values()].some((player) => player.team === "blue") || ![...room.players.values()].some((player) => player.team === "red"))) {
    completeRoom(io, room, "一方已无在线选手，BP 已终止", socket.id);
    return;
  }
  broadcast(io, room);
}

