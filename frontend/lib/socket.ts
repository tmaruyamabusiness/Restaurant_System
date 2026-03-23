import { io, Socket } from "socket.io-client";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(API_URL, {
      autoConnect: false,
      transports: ["websocket", "polling"],
    });
  }
  return socket;
}

export function connectSocket(token: string): Socket {
  const s = getSocket();
  if (!s.connected) {
    s.auth = { token };
    s.connect();
  }
  return s;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export type SocketEvent =
  | "seat_status_changed"
  | "new_order"
  | "order_item_status_changed"
  | "takeout_status_changed"
  | "connect"
  | "disconnect"
  | "connect_error";
