import { Controller, Get, Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { JwtModule } from "@nestjs/jwt";
import { AuthGuard, Public } from "./common/auth";
import { config } from "./config";
import { EventsGateway } from "./events/events.gateway";
import { PrismaService } from "./prisma.service";
import { AuthController } from "./auth/auth.controller";
import { MenuController } from "./menu/menu.controller";
import { OrdersController } from "./orders/orders.controller";
import { OrdersService } from "./orders/orders.service";
import { PaymentsController } from "./payments/payments.controller";
import { PaymentsService } from "./payments/payments.service";
import { ReportsController } from "./reports/reports.controller";
import { SeatsController } from "./seats/seats.controller";
import { SeatsService } from "./seats/seats.service";
import { SettingsController } from "./settings/settings.controller";
import { TakeoutController } from "./takeout/takeout.controller";
import { TakeoutService } from "./takeout/takeout.service";
import { UsersController } from "./users/users.controller";

@Controller()
class HealthController {
  @Public()
  @Get("health")
  health() {
    return { status: "healthy", service: "restaurant-oms" };
  }
}

@Module({
  imports: [
    JwtModule.register({
      global: true,
      secret: config.secretKey,
      signOptions: { expiresIn: config.tokenExpiresIn },
    }),
  ],
  controllers: [
    HealthController,
    AuthController,
    UsersController,
    SeatsController,
    MenuController,
    OrdersController,
    PaymentsController,
    TakeoutController,
    ReportsController,
    SettingsController,
  ],
  providers: [
    PrismaService,
    EventsGateway,
    SeatsService,
    OrdersService,
    PaymentsService,
    TakeoutService,
    { provide: APP_GUARD, useClass: AuthGuard },
  ],
})
export class AppModule {}
