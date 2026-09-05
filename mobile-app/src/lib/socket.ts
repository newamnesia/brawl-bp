import { io, Socket } from "socket.io-client";
import type { RoomState } from "../../shared/types";
import { serviceUrl } from './service';

// 默认走当前页面 origin：开发时经 Vite 代理 /socket.io，生产时同域直连
export function clearRoomSession() { localStorage.removeItem('bp-room-session'); }
export function saveRoomSession(code: string, resumeToken?: string) {
  if (resumeToken) localStorage.setItem('bp-room-session', JSON.stringify({ code, resumeToken, server: serviceUrl() }));
}
export function savedRoomCode(): string | null {
  try { const session = JSON.parse(localStorage.getItem('bp-room-session') || 'null'); return session?.server === serviceUrl() ? session.code : null; } catch { return null; }
}

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(serviceUrl() || 'https://localhost', {
      autoConnect: Boolean(serviceUrl()),
      transports: ["websocket", "polling"],
    });
    const current = socket;
    current.on('connect', () => {
      try {
        const session = JSON.parse(localStorage.getItem('bp-room-session') || 'null');
        if (session?.server === serviceUrl()) current.timeout(10000).emit('resume_room', session, (error: Error | null, result: { ok: boolean; error?: string }) => {
          if (!error && !result.ok) { clearRoomSession(); current.emit('request_state'); window.dispatchEvent(new CustomEvent('room-resume-failed', { detail: result.error })); }
        });
      } catch { clearRoomSession(); }
    });
    current.on('room_closed', clearRoomSession);
  }
  return socket;
}

export function disconnectSocket() {
  clearRoomSession();
  socket?.disconnect();
  socket = null;
}

export type { RoomState };
