export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  // ValueScan API (HMAC-SHA256 signed)
  valueScanApiKey: process.env.VALUESCAN_API_KEY ?? "",
  valueScanSecretKey: process.env.VALUESCAN_SECRET_KEY ?? "",
  // ValueScan User Token (Bearer auth for warnMessage / real-time alerts)
  valueScanToken: process.env.VALUESCAN_TOKEN ?? "",
  // Binance API
  binanceApiKey: process.env.BINANCE_API_KEY ?? "",
  binanceSecretKey: process.env.BINANCE_SECRET_KEY ?? "",
  // OKX API
  okxApiKey: process.env.OKX_API_KEY ?? "",
  okxSecretKey: process.env.OKX_SECRET_KEY ?? "",
  // Telegram Bot
  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN ?? "",
  telegramChatId: process.env.TELEGRAM_CHAT_ID ?? "",
  // CoinGlass API
  coinGlassApiKey: process.env.COINGLASS_API_KEY ?? "",
};
