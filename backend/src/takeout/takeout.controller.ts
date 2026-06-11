import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Put, Query } from "@nestjs/common";
import {
  TakeoutCreateRequest,
  TakeoutResponse,
  TakeoutStatusChangeRequest,
} from "@oms/shared";
import { ZodPipe } from "../common/zod.pipe";
import { TakeoutService } from "./takeout.service";

@Controller("api/takeout")
export class TakeoutController {
  constructor(private readonly takeout: TakeoutService) {}

  @Get()
  list(@Query("all") all?: string): Promise<TakeoutResponse[]> {
    return this.takeout.list(all !== "true");
  }

  @Get(":id")
  get(@Param("id", ParseUUIDPipe) id: string): Promise<TakeoutResponse> {
    return this.takeout.get(id);
  }

  @Post()
  create(
    @Body(new ZodPipe(TakeoutCreateRequest)) body: TakeoutCreateRequest
  ): Promise<TakeoutResponse> {
    return this.takeout.create(body);
  }

  @Put(":id/status")
  changeStatus(
    @Param("id", ParseUUIDPipe) id: string,
    @Body(new ZodPipe(TakeoutStatusChangeRequest)) body: TakeoutStatusChangeRequest
  ): Promise<TakeoutResponse> {
    return this.takeout.changeStatus(id, body.status);
  }
}
