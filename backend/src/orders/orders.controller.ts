import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Put } from "@nestjs/common";
import { z } from "zod";
import {
  OrderCreateRequest,
  OrderItemStatus,
  OrderItemUpdateRequest,
  OrderResponse,
} from "@oms/shared";
import { ZodPipe } from "../common/zod.pipe";
import { OrdersService } from "./orders.service";

@Controller("api")
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Post("orders")
  create(@Body(new ZodPipe(OrderCreateRequest)) body: OrderCreateRequest): Promise<OrderResponse> {
    return this.orders.create(body);
  }

  @Get("orders/session/:sessionId")
  listForSession(
    @Param("sessionId", ParseUUIDPipe) sessionId: string
  ): Promise<OrderResponse[]> {
    return this.orders.listForSession(sessionId);
  }

  @Put("orders/:orderId/items/:itemId")
  updateItem(
    @Param("orderId", ParseUUIDPipe) orderId: string,
    @Param("itemId", ParseUUIDPipe) itemId: string,
    @Body(new ZodPipe(OrderItemUpdateRequest)) body: OrderItemUpdateRequest
  ): Promise<OrderResponse> {
    return this.orders.updateItem(orderId, itemId, body);
  }

  // ---- KDS ------------------------------------------------------------------

  @Get("kds/orders")
  kdsList(): Promise<OrderResponse[]> {
    return this.orders.kdsList();
  }

  @Put("kds/items/:itemId/status")
  kdsUpdateItem(
    @Param("itemId", ParseUUIDPipe) itemId: string,
    @Body(new ZodPipe(z.object({ status: OrderItemStatus })))
    body: { status: OrderItemStatus }
  ): Promise<OrderResponse> {
    return this.orders.updateItemByKds(itemId, body.status);
  }
}
