import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import { io as client, type Socket } from 'socket.io-client';
import { registerRoomHandlers } from '../server/rooms.js';
import type { RoomState } from '../shared/types.js';

test('断线恢复保留禁选、角色及截止时间，拒绝错误凭据和跨房间恢复', { timeout: 12000 }, async () => {
  const http = createServer();
  const server = new Server(http);
  registerRoomHandlers(server);
  await new Promise<void>(resolve => http.listen(0, '127.0.0.1', resolve));
  const address = http.address() as { port: number };
  const sockets: Socket[] = [];
  async function connect() {
    const socket = client(`http://127.0.0.1:${address.port}`, { transports: ['websocket'], reconnection: false });
    sockets.push(socket);
    await new Promise<void>((resolve, reject) => { socket.once('connect', resolve); socket.once('connect_error', reject); });
    return socket;
  }
  const ack = (socket: Socket, event: string, payload: unknown) => socket.timeout(2000).emitWithAck(event, payload);
  const state = (socket: Socket, predicate: (value: RoomState) => boolean = () => true) => new Promise<RoomState>((resolve, reject) => {
    const timeout = setTimeout(() => { socket.off('room_state', receive); reject(new Error('state timeout')); }, 2000);
    function receive(value: RoomState) { if (predicate(value)) { clearTimeout(timeout); socket.off('room_state', receive); resolve(value); } }
    socket.on('room_state', receive); socket.emit('request_state');
  });
  try {
    const host = await connect();
    const guest = await connect();
    const spectator = await connect();
    const created = await ack(host, 'create_room', '房主');
    assert.equal(created.ok, true);
    await ack(guest, 'join_room', { code: created.code, nickname: '对手' });
    const watched = await ack(spectator, 'join_room_spectator', { code: created.code, nickname: '观战' });
    host.emit('set_first_picker', 'host');
    host.emit('set_ready', true);
    await state(host, value => value.players.some(player => player.role === 'host' && player.ready));
    guest.emit('set_ready', true);
    await state(guest, value => value.phase === 'ban');
    host.emit('toggle_ban', 'shelly');
    const before = await state(host, value => value.phase === 'ban' && value.myBans.includes('shelly'));
    assert.equal(before.phase, 'ban');
    assert.deepEqual(before.myBans, ['shelly']);
    const hostId = host.id;
    const dropped = new Promise<void>(resolve => server.sockets.sockets.get(hostId!)!.once('disconnect', () => resolve()));
    host.disconnect();
    await dropped;
    const during = await state(guest);
    assert.equal(during.phase, 'ban');
    assert.equal(during.phaseEndsAt, before.phaseEndsAt);
    const resumed = await connect();
    assert.equal((await ack(resumed, 'resume_room', { code: created.code, resumeToken: 'invalid' })).ok, false);
    assert.equal((await ack(resumed, 'resume_room', { code: created.code, resumeToken: created.resumeToken })).ok, true);
    const after = await state(resumed);
    assert.equal(after.phaseEndsAt, before.phaseEndsAt);
    assert.deepEqual(after.myBans, ['shelly']);
    assert.equal(after.players.find(player => player.role === 'host')?.id, resumed.id);
    assert.notEqual(resumed.id, hostId);
    assert.equal(after.players.some(player => player.id === hostId), false);
    const other = await connect();
    await ack(other, 'create_room', '另一房间');
    assert.equal((await ack(other, 'resume_room', { code: created.code, resumeToken: watched.resumeToken })).ok, false);
    const closed = new Promise<void>(resolve => guest.once('room_closed', () => resolve()));
    resumed.emit('leave_room');
    await closed;
    assert.equal((await ack(resumed, 'resume_room', { code: created.code, resumeToken: created.resumeToken })).ok, false);
    other.emit('leave_room');
    // 同一连接上的 ack 保证 leave_room 已处理，清除所有测试房间计时器。
    await ack(other, 'resume_room', { code: 'MISSING', resumeToken: 'invalid' });
  } finally {
    for (const socket of sockets) if (socket.connected) socket.emit('leave_room');
    await new Promise(resolve => setTimeout(resolve, 30));
    sockets.forEach(socket => socket.disconnect());
    await new Promise<void>(resolve => server.close(() => resolve()));
  }
});
