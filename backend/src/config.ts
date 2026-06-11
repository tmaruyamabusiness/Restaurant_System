export const config = {
  port: Number(process.env.PORT ?? 8000),
  secretKey: process.env.SECRET_KEY ?? "",
  tokenExpiresIn: process.env.TOKEN_EXPIRES_IN ?? "8h",
  corsOrigins: (process.env.CORS_ORIGINS ?? "http://localhost:3000")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
  /** 店舗の営業タイムゾーン(日本)。レポートの日界に使用 */
  storeTzOffset: "+09:00",
};

export function assertConfig(): void {
  if (!config.secretKey || config.secretKey === "your-secret-key-change-in-production") {
    if (process.env.NODE_ENV === "production") {
      throw new Error("SECRET_KEY must be set to a strong value in production");
    }
    config.secretKey = config.secretKey || "dev-only-secret";
  }
}
