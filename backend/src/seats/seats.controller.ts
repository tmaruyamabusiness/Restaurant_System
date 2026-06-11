import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Put } from "@nestjs/common";
import {
  GuideRequest,
  SeatCreateRequest,
  SeatResponse,
  SeatStatusChangeRequest,
  SeatUpdateRequest,
} from "@oms/shared";
import { Roles } from "../common/auth";
import { ZodPipe } from "../common/zod.pipe";
import { SeatsService } from "./seats.service";

@Controller("api/seats")
export class SeatsController {
  constructor(private readonly seats: SeatsService) {}

  @Get()
  list(): Promise<SeatResponse[]> {
    return this.seats.list();
  }

  @Get(":id")
  get(@Param("id", ParseUUIDPipe) id: string): Promise<SeatResponse> {
    return this.seats.serializeSeat(id);
  }

  @Post()
  @Roles("OWNER", "MANAGER")
  create(@Body(new ZodPipe(SeatCreateRequest)) body: SeatCreateRequest): Promise<SeatResponse> {
    return this.seats.create(body);
  }

  @Put(":id")
  @Roles("OWNER", "MANAGER")
  update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body(new ZodPipe(SeatUpdateRequest)) body: SeatUpdateRequest
  ): Promise<SeatResponse> {
    return this.seats.update(id, body);
  }

  @Post(":id/guide")
  guide(
    @Param("id", ParseUUIDPipe) id: string,
    @Body(new ZodPipe(GuideRequest)) body: GuideRequest
  ): Promise<SeatResponse> {
    return this.seats.guide(id, body.party_size);
  }

  @Post(":id/status")
  changeStatus(
    @Param("id", ParseUUIDPipe) id: string,
    @Body(new ZodPipe(SeatStatusChangeRequest)) body: SeatStatusChangeRequest
  ): Promise<SeatResponse> {
    return this.seats.changeStatus(id, body.status);
  }
}
