import { Injectable } from "@nestjs/common";
import { WebSocketGateway, WebSocketServer } from "@nestjs/websockets";
import { Server } from "socket.io";
import { WsEventName, WsEvents } from "@oms/shared";
import { config } from "../config";

/**
 * Single broadcast channel for realtime updates (floor map, KDS, takeout).
 * Events are emitted AFTER the surrounding DB transaction has committed —
 * services call emit() only once their Prisma calls have resolved.
 */
@Injectable()
@WebSocketGateway({ cors: { origin: config.corsOrigins } })
export class EventsGateway {
  @WebSocketServer()
  server!: Server;

  emit<E extends WsEventName>(event: E, payload: WsEvents[E]): void {
    this.server?.emit(event, payload);
  }
}
