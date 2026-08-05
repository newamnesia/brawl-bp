import { io, Socket } from "socket.io-client";
import type { RoomState } from "../../shared/types";

// 默认走当前页面 origin：开发时经 Vite 代理 /socket.io，生产时同域直连
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || window.location.origin;

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(SOCKET_URL, {
      autoConnect: true,
      transports: ["websocket", "polling"],
    });
  }
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}

export type { RoomState };
