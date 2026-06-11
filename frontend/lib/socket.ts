import { io, Socket } from "socket.io-client";
import { WsEventName, WsEvents } from "@/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

let socket: Socket | null = null;

export function connectSocket(token: string): Socket {
  if (socket?.connected) {
    // 再ログイン後はトークンを更新して接続し直す
    if ((socket.auth as { token?: string })?.token !== token) {
      socket.disconnect();
      socket = null;
    } else {
      return socket;
    }
  }
  if (!socket) {
    socket = io(API_URL, { autoConnect: false, transports: ["websocket", "polling"] });
  }
  socket.auth = { token };
  if (!socket.connected) socket.connect();
  return socket;
}

export function disconnectSocket(): void {
  socket?.disconnect();
  socket = null;
}

/** 型付きイベント購読。戻り値で購読解除する */
export function onSocketEvent<E extends WsEventName>(
  event: E,
  handler: (payload: WsEvents[E]) => void
): () => void {
  const s = socket;
  if (!s) return () => undefined;
  s.on(event as string, handler as (...args: unknown[]) => void);
  return () => s.off(event as string, handler as (...args: unknown[]) => void);
}
