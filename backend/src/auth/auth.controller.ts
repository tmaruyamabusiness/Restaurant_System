import { Body, Controller, Get, Post, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcryptjs";
import { LoginRequest, LoginResponse, UserResponse } from "@oms/shared";
import { AuthUser, CurrentUser, Public } from "../common/auth";
import { ZodPipe } from "../common/zod.pipe";
import { toUser } from "../common/serializers";
import { PrismaService } from "../prisma.service";

@Controller("api/auth")
export class AuthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService
  ) {}

  @Public()
  @Post("login")
  async login(@Body(new ZodPipe(LoginRequest)) body: LoginRequest): Promise<LoginResponse> {
    const user = await this.prisma.user.findUnique({ where: { email: body.email } });
    if (!user || !user.is_active || !(await bcrypt.compare(body.password, user.password_hash))) {
      throw new UnauthorizedException("メールアドレスまたはパスワードが正しくありません");
    }
    const access_token = await this.jwt.signAsync({ sub: user.id, role: user.role });
    return { access_token, user: toUser(user) };
  }

  @Get("me")
  me(@CurrentUser() user: AuthUser): UserResponse {
    return user;
  }
}
