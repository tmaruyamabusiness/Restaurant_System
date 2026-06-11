import { Body, Controller, Get, Put } from "@nestjs/common";
import { SettingsResponse, SettingsUpdateRequest } from "@oms/shared";
import { Roles } from "../common/auth";
import { ZodPipe } from "../common/zod.pipe";
import { PrismaService } from "../prisma.service";

const DEFAULTS: SettingsResponse = {
  store_name: "レストランOMS",
  alert_threshold_minutes: 60,
};

/** 設定はDB保持(旧実装はプロセス内メモリで再起動消失・複数ワーカー不整合) */
@Controller("api/settings")
export class SettingsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async get(): Promise<SettingsResponse> {
    const rows = await this.prisma.setting.findMany();
    const map = new Map(rows.map((r) => [r.key, r.value]));
    return {
      store_name: map.get("store_name") ?? DEFAULTS.store_name,
      alert_threshold_minutes: Number(
        map.get("alert_threshold_minutes") ?? DEFAULTS.alert_threshold_minutes
      ),
    };
  }

  @Put()
  @Roles("OWNER", "MANAGER")
  async update(
    @Body(new ZodPipe(SettingsUpdateRequest)) body: SettingsUpdateRequest
  ): Promise<SettingsResponse> {
    const entries = Object.entries(body).filter(([, v]) => v !== undefined);
    for (const [key, value] of entries) {
      await this.prisma.setting.upsert({
        where: { key },
        update: { value: String(value) },
        create: { key, value: String(value) },
      });
    }
    return this.get();
  }
}
