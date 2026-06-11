import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { assertConfig, config } from "./config";

async function bootstrap() {
  assertConfig();
  const app = await NestFactory.create(AppModule);
  // ワイルドカード+credentials は CORS 仕様違反のため、許可オリジンを明示する
  app.enableCors({ origin: config.corsOrigins, credentials: true });
  await app.listen(config.port, "0.0.0.0");
  // eslint-disable-next-line no-console
  console.log(`restaurant-oms backend listening on :${config.port}`);
}

bootstrap();
