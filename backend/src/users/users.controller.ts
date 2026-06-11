import {
  Body,
  ConflictException,
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import * as bcrypt from "bcryptjs";
import { UserCreateRequest, UserResponse, UserUpdateRequest } from "@oms/shared";
import { Roles } from "../common/auth";
import { ZodPipe } from "../common/zod.pipe";
import { toUser } from "../common/serializers";
import { PrismaService } from "../prisma.service";

@Controller("api/users")
export class UsersController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @Roles("OWNER", "MANAGER")
  async list(): Promise<UserResponse[]> {
    const users = await this.prisma.user.findMany({ orderBy: { created_at: "asc" } });
    return users.map(toUser);
  }

  @Post()
  @Roles("OWNER")
  async create(@Body(new ZodPipe(UserCreateRequest)) body: UserCreateRequest): Promise<UserResponse> {
    try {
      const user = await this.prisma.user.create({
        data: {
          username: body.username,
          email: body.email,
          role: body.role,
          password_hash: await bcrypt.hash(body.password, 10),
        },
      });
      return toUser(user);
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        throw new ConflictException("このメールアドレスは既に登録されています");
      }
      throw e;
    }
  }

  @Put(":id")
  @Roles("OWNER")
  async update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body(new ZodPipe(UserUpdateRequest)) body: UserUpdateRequest
  ): Promise<UserResponse> {
    const data: Prisma.UserUpdateInput = {
      username: body.username,
      email: body.email,
      role: body.role,
      is_active: body.is_active,
    };
    if (body.password) data.password_hash = await bcrypt.hash(body.password, 10);
    try {
      const user = await this.prisma.user.update({ where: { id }, data });
      return toUser(user);
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") {
        throw new NotFoundException("ユーザーが見つかりません");
      }
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        throw new ConflictException("このメールアドレスは既に登録されています");
      }
      throw e;
    }
  }
}
