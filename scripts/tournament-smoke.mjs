import { io } from "socket.io-client";

const endpoint = process.env.TOURNAMENT_TEST_URL ?? "http://127.0.0.1:10001";
const host = io(endpoint, { transports: ["websocket"] });
const guest = io(endpoint, { transports: ["websocket"] });

const latest = new Map();
host.on("tournament_room_state", (state) => latest.set("host", state));
guest.on("tournament_room_state", (state) => latest.set("guest", state));

function waitUntil(predicate, timeout = 5000) {
  const started = Date.now();
  return new Promise((resolve, reject) => {
    const timer = setInterval(() => {
      if (predicate()) {
        clearInterval(timer);
        resolve();
      } else if (Date.now() - started > timeout) {
        clearInterval(timer);
        reject(new Error("等待赛事房状态超时"));
      }
    }, 20);
  });
}

function emitAck(socket, event, ...args) {
  return new Promise((resolve) => socket.emit(event, ...args, resolve));
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

try {
  await Promise.all([
    new Promise((resolve) => host.on("connect", resolve)),
    new Promise((resolve) => guest.on("connect", resolve)),
  ]);
  const created = await emitAck(host, "create_tournament_room", "蓝一");
  assert(created.ok && created.code, "创建赛事房失败");
  const joined = await emitAck(guest, "join_tournament_room", { code: created.code, nickname: "红一" });
  assert(joined.ok, "红方加入失败");
  await waitUntil(() => latest.get("guest")?.players.length === 2);

  host.emit("set_tournament_mode", "knockout");
  host.emit("set_tournament_map", "bs_15000368");
  guest.emit("set_tournament_map", "bs_15000368");
  host.emit("set_tournament_first_picker", "blue");
  host.emit("toggle_tournament_global_ban", "shelly");
  guest.emit("toggle_tournament_global_ban", "shelly");
  await waitUntil(() => latest.get("guest")?.myGlobalBans.includes("shelly"));
  assert(latest.get("guest").blueGlobalBans === null, "大厅阶段泄露了对方全局 Ban");
  assert(latest.get("host").redGlobalBans === null, "大厅阶段泄露了对方全局 Ban");

  host.emit("set_tournament_ready", true);
  guest.emit("set_tournament_ready", true);
  await waitUntil(() => latest.get("host")?.phase === "ban");
  assert(latest.get("host").redGlobalBans.includes("shelly"), "开赛后未公开全局 Ban");

  for (const hero of ["nita", "colt", "bull"]) {
    host.emit("tournament_preselect", hero);
    guest.emit("tournament_preselect", hero);
    await waitUntil(() => latest.get("host")?.visibleBluePendingBans[latest.get("host").myActiveBanSlot] === hero && latest.get("guest")?.visibleRedPendingBans[latest.get("guest").myActiveBanSlot] === hero);
    host.emit("confirm_tournament_selection");
    guest.emit("confirm_tournament_selection");
  }
  await waitUntil(() => latest.get("host")?.phase === "pick");
  assert(latest.get("host").blueBans.join() === latest.get("host").redBans.join(), "双方相同 Ban 未被保留");

  const picks = [
    [host, "brock"],
    [guest, "rico"],
    [guest, "darryl"],
    [host, "penny"],
    [host, "carl"],
    [guest, "jacky"],
  ];
  for (let step = 0; step < picks.length; step++) {
    const [socket, hero] = picks[step];
    socket.emit("tournament_preselect", hero);
    await waitUntil(() => latest.get("host")?.pendingPick === hero);
    socket.emit("confirm_tournament_selection");
    await waitUntil(() => latest.get("host")?.pickStep > step || latest.get("host")?.phase === "complete");
  }
  await waitUntil(() => latest.get("host")?.phase === "complete");
  assert(latest.get("host").bluePicks.filter(Boolean).length === 3, "蓝方 Pick 数量错误");
  assert(latest.get("host").redPicks.filter(Boolean).length === 3, "红方 Pick 数量错误");
  console.log("赛事房双客户端流程验证通过");
} finally {
  host.disconnect();
  guest.disconnect();
}

const sixPlayers = Array.from({ length: 6 }, () => io(endpoint, { transports: ["websocket"] }));
const sixStates = new Map();
sixPlayers.forEach((socket, index) => socket.on("tournament_room_state", (state) => sixStates.set(index, state)));
try {
  await Promise.all(sixPlayers.map((socket) => new Promise((resolve) => socket.on("connect", resolve))));
  const created = await emitAck(sixPlayers[0], "create_tournament_room", "蓝一");
  for (let index = 1; index < sixPlayers.length; index++) {
    const joined = await emitAck(sixPlayers[index], "join_tournament_room", { code: created.code, nickname: `选手${index + 1}` });
    assert(joined.ok, `第 ${index + 1} 名选手加入失败`);
  }
  await waitUntil(() => sixStates.get(5)?.players.length === 6);
  sixPlayers[0].emit("set_tournament_mode", "knockout");
  await waitUntil(() => sixStates.get(0)?.gameMode === "knockout");
  sixPlayers[0].emit("set_tournament_map", "bs_15000368");
  sixPlayers[1].emit("set_tournament_map", "bs_15000368");
  sixPlayers[0].emit("set_tournament_first_picker", "blue");
  await waitUntil(() => sixStates.get(0)?.confirmedMapId === "bs_15000368" && sixStates.get(0)?.firstPickTeam === "blue");
  sixPlayers.forEach((socket) => socket.emit("set_tournament_ready", true));
  await waitUntil(() => sixStates.get(5)?.phase === "ban");
  const expectedSlots = [0, 0, 1, 1, 2, 2];
  expectedSlots.forEach((slot, index) => {
    assert(sixStates.get(index).canAct, `第 ${index + 1} 席未获得 Ban 操作权`);
    assert(sixStates.get(index).myActiveBanSlot === slot, `第 ${index + 1} 席 Ban 位分配错误`);
  });
  ["nita", "colt", "bull", "barley", "poco", "rosa"].forEach((hero, index) => sixPlayers[index].emit("tournament_preselect", hero));
  await waitUntil(() => sixStates.get(0)?.visibleBluePendingBans.filter(Boolean).length === 3 && sixStates.get(1)?.visibleRedPendingBans.filter(Boolean).length === 3);
  sixPlayers.forEach((socket) => socket.emit("confirm_tournament_selection"));
  await waitUntil(() => sixStates.get(0)?.phase === "pick");
  assert(sixStates.get(0).blueBans.filter(Boolean).length === 3 && sixStates.get(0).redBans.filter(Boolean).length === 3, "六席并行 Ban 未全部锁定");
  console.log("六席并行 Ban 与席位分配验证通过");
} finally {
  sixPlayers.forEach((socket) => socket.disconnect());
}
