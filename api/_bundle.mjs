var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// drizzle/schema.ts
var schema_exports = {};
__export(schema_exports, {
  accountSnapshots: () => accountSnapshots,
  backtestResults: () => backtestResults,
  confluenceSignals: () => confluenceSignals,
  marketAnalysis: () => marketAnalysis,
  paperAccount: () => paperAccount,
  paperEquityCurve: () => paperEquityCurve,
  paperPositions: () => paperPositions,
  paperTrades: () => paperTrades,
  positions: () => positions,
  signals: () => signals,
  strategyConfig: () => strategyConfig,
  telegramConfig: () => telegramConfig,
  tokenSignals: () => tokenSignals,
  trades: () => trades,
  users: () => users,
  vsSignalStats: () => vsSignalStats
});
import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  float,
  boolean,
  json,
  bigint
} from "drizzle-orm/mysql-core";
var users, signals, confluenceSignals, trades, positions, strategyConfig, accountSnapshots, backtestResults, telegramConfig, vsSignalStats, paperAccount, paperPositions, paperTrades, paperEquityCurve, marketAnalysis, tokenSignals;
var init_schema = __esm({
  "drizzle/schema.ts"() {
    "use strict";
    users = mysqlTable("users", {
      id: int("id").autoincrement().primaryKey(),
      openId: varchar("openId", { length: 64 }).notNull().unique(),
      name: text("name"),
      email: varchar("email", { length: 320 }),
      loginMethod: varchar("loginMethod", { length: 64 }),
      role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
      lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull()
    });
    signals = mysqlTable("signals", {
      id: int("id").autoincrement().primaryKey(),
      signalId: varchar("signalId", { length: 128 }).notNull().unique(),
      symbol: varchar("symbol", { length: 32 }).notNull(),
      signalType: mysqlEnum("signalType", ["FOMO", "ALPHA", "RISK", "FALL", "FUND_MOVE", "LISTING", "FUND_ESCAPE", "FUND_ABNORMAL"]).notNull(),
      messageType: int("messageType").notNull(),
      // 100,108,109,110,111,112,113,114
      score: float("score").default(0),
      rawData: json("rawData"),
      processed: boolean("processed").default(false),
      createdAt: timestamp("createdAt").defaultNow().notNull()
    });
    confluenceSignals = mysqlTable("confluence_signals", {
      id: int("id").autoincrement().primaryKey(),
      symbol: varchar("symbol", { length: 32 }).notNull(),
      fomoSignalId: varchar("fomoSignalId", { length: 128 }).notNull(),
      alphaSignalId: varchar("alphaSignalId", { length: 128 }).notNull(),
      timeGap: float("timeGap").notNull(),
      // 两信号时间差（秒）
      score: float("score").notNull(),
      status: mysqlEnum("status", ["pending", "executed", "skipped", "failed"]).default("pending").notNull(),
      skipReason: text("skipReason"),
      createdAt: timestamp("createdAt").defaultNow().notNull()
    });
    trades = mysqlTable("trades", {
      id: int("id").autoincrement().primaryKey(),
      symbol: varchar("symbol", { length: 32 }).notNull(),
      confluenceSignalId: int("confluenceSignalId"),
      action: mysqlEnum("action", ["OPEN_LONG", "OPEN_SHORT", "CLOSE_LONG", "CLOSE_SHORT", "PARTIAL_CLOSE", "STOP_LOSS", "TAKE_PROFIT"]).notNull(),
      quantity: float("quantity").notNull(),
      entryPrice: float("entryPrice").notNull(),
      exitPrice: float("exitPrice"),
      stopLoss: float("stopLoss"),
      takeProfit1: float("takeProfit1"),
      takeProfit2: float("takeProfit2"),
      leverage: int("leverage").default(1),
      pnl: float("pnl").default(0),
      pnlPercent: float("pnlPercent").default(0),
      signalScore: float("signalScore"),
      riskLevel: mysqlEnum("riskLevel", ["LOW", "MEDIUM", "HIGH"]).default("MEDIUM"),
      status: mysqlEnum("status", ["open", "closed", "cancelled"]).default("open").notNull(),
      closeReason: text("closeReason"),
      binanceOrderId: varchar("binanceOrderId", { length: 128 }),
      isTestnet: boolean("isTestnet").default(false),
      openedAt: timestamp("openedAt").defaultNow().notNull(),
      closedAt: timestamp("closedAt")
    });
    positions = mysqlTable("positions", {
      id: int("id").autoincrement().primaryKey(),
      symbol: varchar("symbol", { length: 32 }).notNull().unique(),
      quantity: float("quantity").notNull(),
      entryPrice: float("entryPrice").notNull(),
      currentPrice: float("currentPrice").notNull(),
      leverage: int("leverage").default(1),
      unrealizedPnl: float("unrealizedPnl").default(0),
      unrealizedPnlPercent: float("unrealizedPnlPercent").default(0),
      stopLoss: float("stopLoss"),
      takeProfit1: float("takeProfit1"),
      takeProfit2: float("takeProfit2"),
      tradeId: int("tradeId"),
      openedAt: timestamp("openedAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
    });
    strategyConfig = mysqlTable("strategy_config", {
      id: int("id").autoincrement().primaryKey(),
      name: varchar("name", { length: 64 }).notNull().unique(),
      // 信号聚合参数
      signalTimeWindow: int("signalTimeWindow").default(300),
      // 秒
      minSignalScore: float("minSignalScore").default(0.6),
      enableFomoIntensify: boolean("enableFomoIntensify").default(true),
      // 风险管理参数
      minOrderUsdt: float("minOrderUsdt").default(1),
      // 最小开仓金额（USDT）
      maxPositionPercent: float("maxPositionPercent").default(10),
      maxTotalPositionPercent: float("maxTotalPositionPercent").default(50),
      maxDailyTrades: int("maxDailyTrades").default(20),
      maxDailyLossPercent: float("maxDailyLossPercent").default(5),
      // 止损止盈
      stopLossPercent: float("stopLossPercent").default(3),
      takeProfit1Percent: float("takeProfit1Percent").default(5),
      takeProfit2Percent: float("takeProfit2Percent").default(10),
      // 合约配置
      leverage: int("leverage").default(5),
      marginType: mysqlEnum("marginType", ["ISOLATED", "CROSSED"]).default("ISOLATED"),
      symbolSuffix: varchar("symbolSuffix", { length: 16 }).default("USDT"),
      // 移动止损
      enableTrailingStop: boolean("enableTrailingStop").default(false),
      trailingStopActivation: float("trailingStopActivation").default(3),
      trailingStopCallback: float("trailingStopCallback").default(1.5),
      // 币安 API 配置
      binanceApiKey: varchar("binanceApiKey", { length: 256 }).default(""),
      binanceSecretKey: varchar("binanceSecretKey", { length: 256 }).default(""),
      binanceUseTestnet: boolean("binanceUseTestnet").default(true),
      // 欧易 API 配置
      okxApiKey: varchar("okxApiKey", { length: 256 }).default(""),
      okxSecretKey: varchar("okxSecretKey", { length: 256 }).default(""),
      okxPassphrase: varchar("okxPassphrase", { length: 256 }).default(""),
      okxUseDemo: boolean("okxUseDemo").default(true),
      // 交易所选择
      selectedExchange: mysqlEnum("selectedExchange", ["binance", "okx", "bybit", "gate", "bitget", "both", "all"]).default("binance"),
      // Bybit API 配置
      bybitApiKey: varchar("bybitApiKey", { length: 256 }).default(""),
      bybitSecretKey: varchar("bybitSecretKey", { length: 256 }).default(""),
      bybitUseTestnet: boolean("bybitUseTestnet").default(true),
      // Gate.io API 配置
      gateApiKey: varchar("gateApiKey", { length: 256 }).default(""),
      gateSecretKey: varchar("gateSecretKey", { length: 256 }).default(""),
      // Bitget API 配置
      bitgetApiKey: varchar("bitgetApiKey", { length: 256 }).default(""),
      bitgetSecretKey: varchar("bitgetSecretKey", { length: 256 }).default(""),
      bitgetPassphrase: varchar("bitgetPassphrase", { length: 256 }).default(""),
      // 自动交易最低评分阈值
      minScoreThreshold: float("minScoreThreshold").default(60),
      // 交易开关
      autoTradingEnabled: boolean("autoTradingEnabled").default(false),
      autoTradingPositionPercent: float("autoTradingPositionPercent").default(1),
      // 每笔自动交易仓位比例(%)
      useTestnet: boolean("useTestnet").default(true),
      // 紧急停止
      emergencyStop: boolean("emergencyStop").default(false),
      isActive: boolean("isActive").default(true),
      // ValueScan 用户 Token（用于 warnMessage 接口）
      vsUserToken: varchar("vsUserToken", { length: 2048 }).default(""),
      vsTokenSetAt: bigint("vsTokenSetAt", { mode: "number" }).default(0),
      // ValueScan 自动登录凭证（用于自动刷新 Token）
      vsLoginEmail: varchar("vsLoginEmail", { length: 256 }).default(""),
      vsLoginPassword: varchar("vsLoginPassword", { length: 256 }).default(""),
      vsRefreshToken: varchar("vsRefreshToken", { length: 2048 }).default(""),
      vsAutoRefreshEnabled: boolean("vsAutoRefreshEnabled").default(false),
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
    });
    accountSnapshots = mysqlTable("account_snapshots", {
      id: int("id").autoincrement().primaryKey(),
      totalBalance: float("totalBalance").notNull(),
      availableBalance: float("availableBalance").notNull(),
      unrealizedPnl: float("unrealizedPnl").default(0),
      dailyPnl: float("dailyPnl").default(0),
      dailyTrades: int("dailyTrades").default(0),
      positionCount: int("positionCount").default(0),
      createdAt: timestamp("createdAt").defaultNow().notNull()
    });
    backtestResults = mysqlTable("backtest_results", {
      id: int("id").autoincrement().primaryKey(),
      name: varchar("name", { length: 128 }).notNull(),
      startDate: timestamp("startDate").notNull(),
      endDate: timestamp("endDate").notNull(),
      initialBalance: float("initialBalance").notNull(),
      finalBalance: float("finalBalance").notNull(),
      totalReturn: float("totalReturn").notNull(),
      totalTrades: int("totalTrades").default(0),
      winTrades: int("winTrades").default(0),
      lossTrades: int("lossTrades").default(0),
      winRate: float("winRate").default(0),
      maxDrawdown: float("maxDrawdown").default(0),
      sharpeRatio: float("sharpeRatio").default(0),
      configSnapshot: json("configSnapshot"),
      tradeLog: json("tradeLog"),
      createdAt: timestamp("createdAt").defaultNow().notNull()
    });
    telegramConfig = mysqlTable("telegram_config", {
      id: int("id").autoincrement().primaryKey(),
      botToken: varchar("botToken", { length: 256 }),
      chatId: varchar("chatId", { length: 64 }),
      enableTradeNotify: boolean("enableTradeNotify").default(true),
      enableRiskNotify: boolean("enableRiskNotify").default(true),
      enableDailyReport: boolean("enableDailyReport").default(true),
      isActive: boolean("isActive").default(false),
      updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
    });
    vsSignalStats = mysqlTable("vs_signal_stats", {
      id: int("id").autoincrement().primaryKey(),
      symbol: varchar("symbol", { length: 32 }).notNull(),
      signalType: varchar("signalType", { length: 32 }).notNull(),
      // fomo/alpha/whale/risk/ai
      signalName: varchar("signalName", { length: 128 }),
      direction: mysqlEnum("direction", ["long", "short", "neutral"]).default("neutral").notNull(),
      entryPrice: float("entryPrice"),
      exitPrice24h: float("exitPrice24h"),
      exitPrice48h: float("exitPrice48h"),
      pnlPct24h: float("pnlPct24h"),
      // 24h 涨跌幅 %
      pnlPct48h: float("pnlPct48h"),
      // 48h 涨跌幅 %
      result: mysqlEnum("result", ["win", "loss", "pending"]).default("pending").notNull(),
      notes: text("notes"),
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
    });
    paperAccount = mysqlTable("paper_account", {
      id: int("id").autoincrement().primaryKey(),
      balance: float("balance").notNull().default(1e4),
      // 可用余额 USDT
      totalBalance: float("totalBalance").notNull().default(1e4),
      // 总资产
      initialBalance: float("initialBalance").notNull().default(1e4),
      // 初始资金
      totalPnl: float("totalPnl").default(0),
      // 总盈亏
      totalPnlPct: float("totalPnlPct").default(0),
      // 总盈亏%
      totalTrades: int("totalTrades").default(0),
      // 总交易次数
      winTrades: int("winTrades").default(0),
      // 盈利次数
      lossTrades: int("lossTrades").default(0),
      // 亏损次数
      maxDrawdown: float("maxDrawdown").default(0),
      // 最大回撤%
      peakBalance: float("peakBalance").default(1e4),
      // 历史最高余额
      autoTradingEnabled: boolean("autoTradingEnabled").default(false),
      // 自动交易开关
      // 自动交易参数
      perTradeAmount: float("perTradeAmount").default(500),
      // 每笔交易金额 USDT
      leverage: int("leverage").default(5),
      // 杠杆倍数
      stopLossPct: float("stopLossPct").default(3),
      // 止损%
      takeProfitPct: float("takeProfitPct").default(8),
      // 止盈%
      minSignalScore: float("minSignalScore").default(65),
      // 最低信号评分阈値
      maxPositions: int("maxPositions").default(5),
      // 最大同时持仓数
      updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
    });
    paperPositions = mysqlTable("paper_positions", {
      id: int("id").autoincrement().primaryKey(),
      symbol: varchar("symbol", { length: 32 }).notNull(),
      direction: mysqlEnum("direction", ["long", "short"]).notNull(),
      entryPrice: float("entryPrice").notNull(),
      currentPrice: float("currentPrice").notNull(),
      quantity: float("quantity").notNull(),
      // 合约数量
      notionalValue: float("notionalValue").notNull(),
      // 名义价値 USDT
      leverage: int("leverage").default(5),
      stopLoss: float("stopLoss"),
      takeProfit: float("takeProfit"),
      unrealizedPnl: float("unrealizedPnl").default(0),
      unrealizedPnlPct: float("unrealizedPnlPct").default(0),
      signalScore: float("signalScore"),
      triggerSignal: varchar("triggerSignal", { length: 128 }),
      // 触发信号描述
      openedAt: timestamp("openedAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
    });
    paperTrades = mysqlTable("paper_trades", {
      id: int("id").autoincrement().primaryKey(),
      symbol: varchar("symbol", { length: 32 }).notNull(),
      direction: mysqlEnum("direction", ["long", "short"]).notNull(),
      entryPrice: float("entryPrice").notNull(),
      exitPrice: float("exitPrice").notNull(),
      quantity: float("quantity").notNull(),
      notionalValue: float("notionalValue").notNull(),
      leverage: int("leverage").default(5),
      pnl: float("pnl").notNull(),
      // 盈亏 USDT
      pnlPct: float("pnlPct").notNull(),
      // 盈亏%
      closeReason: mysqlEnum("closeReason", ["take_profit", "stop_loss", "manual", "signal_reverse", "timeout"]).notNull(),
      signalScore: float("signalScore"),
      triggerSignal: varchar("triggerSignal", { length: 256 }),
      holdingMinutes: int("holdingMinutes").default(0),
      // 持仓时长（分钟）
      openedAt: timestamp("openedAt").notNull(),
      closedAt: timestamp("closedAt").defaultNow().notNull()
    });
    paperEquityCurve = mysqlTable("paper_equity_curve", {
      id: int("id").autoincrement().primaryKey(),
      totalBalance: float("totalBalance").notNull(),
      unrealizedPnl: float("unrealizedPnl").default(0),
      openPositions: int("openPositions").default(0),
      createdAt: timestamp("createdAt").defaultNow().notNull()
    });
    marketAnalysis = mysqlTable("market_analysis", {
      id: int("id").autoincrement().primaryKey(),
      uniqueId: varchar("uniqueId", { length: 255 }).notNull().unique(),
      ts: bigint("ts", { mode: "number" }).notNull(),
      content: text("content").notNull(),
      sentToTelegram: boolean("sentToTelegram").default(false),
      createdAt: timestamp("createdAt").defaultNow().notNull()
    });
    tokenSignals = mysqlTable("token_signals", {
      id: int("id").autoincrement().primaryKey(),
      uniqueKey: varchar("uniqueKey", { length: 255 }).notNull().unique(),
      tokenId: int("tokenId").notNull(),
      type: mysqlEnum("type", ["OPPORTUNITY", "RISK", "FUNDS"]).notNull(),
      symbol: varchar("symbol", { length: 32 }).default(""),
      name: varchar("name", { length: 128 }).default(""),
      price: varchar("price", { length: 64 }).default(""),
      percentChange24h: float("percentChange24h").default(0),
      scoring: float("scoring"),
      grade: float("grade"),
      content: text("content").notNull(),
      ts: bigint("ts", { mode: "number" }).notNull(),
      sentToTelegram: boolean("sentToTelegram").default(false),
      createdAt: timestamp("createdAt").defaultNow().notNull()
    });
  }
});

// server/_api_entry.ts
import "dotenv/config";
import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";

// server/routers.ts
import { z as z2 } from "zod";

// shared/const.ts
var COOKIE_NAME = "app_session_id";
var ONE_YEAR_MS = 1e3 * 60 * 60 * 24 * 365;
var AXIOS_TIMEOUT_MS = 3e4;
var UNAUTHED_ERR_MSG = "Please login (10001)";
var NOT_ADMIN_ERR_MSG = "You do not have required permission (10002)";

// server/_core/cookies.ts
function isSecureRequest(req) {
  if (req.protocol === "https") return true;
  const forwardedProto = req.headers["x-forwarded-proto"];
  if (!forwardedProto) return false;
  const protoList = Array.isArray(forwardedProto) ? forwardedProto : forwardedProto.split(",");
  return protoList.some((proto) => proto.trim().toLowerCase() === "https");
}
function getSessionCookieOptions(req) {
  return {
    httpOnly: true,
    path: "/",
    sameSite: "none",
    secure: isSecureRequest(req)
  };
}

// server/_core/systemRouter.ts
import { z } from "zod";

// server/_core/notification.ts
import { TRPCError } from "@trpc/server";

// server/_core/env.ts
var ENV = {
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
  // ValueScan Login
  valueScanEmail: process.env.VALUESCAN_EMAIL ?? "",
  valueScanPassword: process.env.VALUESCAN_PASSWORD ?? "",
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
  coinGlassApiKey: process.env.COINGLASS_API_KEY ?? ""
};

// server/_core/notification.ts
var TITLE_MAX_LENGTH = 1200;
var CONTENT_MAX_LENGTH = 2e4;
var trimValue = (value) => value.trim();
var isNonEmptyString = (value) => typeof value === "string" && value.trim().length > 0;
var buildEndpointUrl = (baseUrl) => {
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  return new URL(
    "webdevtoken.v1.WebDevService/SendNotification",
    normalizedBase
  ).toString();
};
var validatePayload = (input) => {
  if (!isNonEmptyString(input.title)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification title is required."
    });
  }
  if (!isNonEmptyString(input.content)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification content is required."
    });
  }
  const title = trimValue(input.title);
  const content = trimValue(input.content);
  if (title.length > TITLE_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification title must be at most ${TITLE_MAX_LENGTH} characters.`
    });
  }
  if (content.length > CONTENT_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification content must be at most ${CONTENT_MAX_LENGTH} characters.`
    });
  }
  return { title, content };
};
async function notifyOwner(payload) {
  const { title, content } = validatePayload(payload);
  if (!ENV.forgeApiUrl) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Notification service URL is not configured."
    });
  }
  if (!ENV.forgeApiKey) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Notification service API key is not configured."
    });
  }
  const endpoint = buildEndpointUrl(ENV.forgeApiUrl);
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        accept: "application/json",
        authorization: `Bearer ${ENV.forgeApiKey}`,
        "content-type": "application/json",
        "connect-protocol-version": "1"
      },
      body: JSON.stringify({ title, content })
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.warn(
        `[Notification] Failed to notify owner (${response.status} ${response.statusText})${detail ? `: ${detail}` : ""}`
      );
      return false;
    }
    return true;
  } catch (error) {
    console.warn("[Notification] Error calling notification service:", error);
    return false;
  }
}

// server/_core/trpc.ts
import { initTRPC, TRPCError as TRPCError2 } from "@trpc/server";
import superjson from "superjson";
var t = initTRPC.context().create({
  transformer: superjson
});
var router = t.router;
var publicProcedure = t.procedure;
var requireUser = t.middleware(async (opts) => {
  const { ctx, next } = opts;
  if (!ctx.user) {
    throw new TRPCError2({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user
    }
  });
});
var protectedProcedure = t.procedure.use(requireUser);
var adminProcedure = t.procedure.use(
  t.middleware(async (opts) => {
    const { ctx, next } = opts;
    if (!ctx.user || ctx.user.role !== "admin") {
      throw new TRPCError2({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }
    return next({
      ctx: {
        ...ctx,
        user: ctx.user
      }
    });
  })
);

// server/_core/systemRouter.ts
var systemRouter = router({
  health: publicProcedure.input(
    z.object({
      timestamp: z.number().min(0, "timestamp cannot be negative")
    })
  ).query(() => ({
    ok: true,
    env: {
      VALUESCAN_EMAIL: process.env.VALUESCAN_EMAIL,
      VALUESCAN_PASSWORD: process.env.VALUESCAN_PASSWORD ? "********" : void 0,
      VALUESCAN_API_KEY: process.env.VALUESCAN_API_KEY,
      VALUESCAN_SECRET_KEY: process.env.VALUESCAN_SECRET_KEY ? "********" : void 0
    }
  })),
  notifyOwner: adminProcedure.input(
    z.object({
      title: z.string().min(1, "title is required"),
      content: z.string().min(1, "content is required")
    })
  ).mutation(async ({ input }) => {
    const delivered = await notifyOwner(input);
    return {
      success: delivered
    };
  })
});

// server/db.ts
init_schema();
init_schema();
import mysql from "mysql2/promise";
import { drizzle } from "drizzle-orm/mysql2";
import { desc, eq, gte } from "drizzle-orm";
var DATABASE_URL = process.env.DATABASE_URL || process.env.MYSQL_URL || process.env.DB_URL || "";
var pool = null;
var dbInstance = null;
var memory = {
  signals: [],
  confluenceSignals: [],
  trades: [],
  positions: [],
  snapshots: [],
  backtests: [],
  vsStats: [],
  telegramConfig: null,
  strategyConfig: null
};
var runtimeSecrets = {
  vsApiKey: null,
  vsSecretKey: null
};
function nowId(list) {
  const max = list.reduce((m, item) => Math.max(m, Number(item.id ?? 0)), 0);
  return max + 1;
}
function toResultInsertId(result) {
  return Number(result?.[0]?.insertId ?? result?.insertId ?? 0);
}
function stripUndefined(input) {
  return Object.fromEntries(Object.entries(input).filter(([, v]) => v !== void 0));
}
function buildDefaultConfig() {
  return {
    id: 1,
    name: "\u9ED8\u8BA4\u7B56\u7565",
    signalTimeWindow: 300,
    minSignalScore: 0.6,
    enableFomoIntensify: true,
    minOrderUsdt: 1,
    maxPositionPercent: 10,
    maxTotalPositionPercent: 50,
    maxDailyTrades: 20,
    maxDailyLossPercent: 5,
    stopLossPercent: 3,
    takeProfit1Percent: 5,
    takeProfit2Percent: 10,
    leverage: 5,
    marginType: "ISOLATED",
    symbolSuffix: "USDT",
    enableTrailingStop: false,
    trailingStopActivation: 3,
    trailingStopCallback: 1.5,
    binanceApiKey: "",
    binanceSecretKey: "",
    binanceUseTestnet: true,
    okxApiKey: "",
    okxSecretKey: "",
    okxPassphrase: "",
    okxUseDemo: true,
    selectedExchange: "binance",
    bybitApiKey: "",
    bybitSecretKey: "",
    bybitUseTestnet: true,
    gateApiKey: "",
    gateSecretKey: "",
    bitgetApiKey: "",
    bitgetSecretKey: "",
    bitgetPassphrase: "",
    minScoreThreshold: 60,
    autoTradingEnabled: false,
    autoTradingPositionPercent: 1,
    useTestnet: true,
    emergencyStop: false,
    isActive: true,
    vsUserToken: "",
    vsTokenSetAt: 0,
    vsLoginEmail: "",
    vsLoginPassword: "",
    vsRefreshToken: "",
    vsAutoRefreshEnabled: false,
    createdAt: /* @__PURE__ */ new Date(),
    updatedAt: /* @__PURE__ */ new Date(),
    vsApiKey: runtimeSecrets.vsApiKey ?? null,
    vsSecretKey: runtimeSecrets.vsSecretKey ?? null
  };
}
function attachRuntimeSecrets(config) {
  if (!config) return config;
  return {
    ...config,
    vsApiKey: runtimeSecrets.vsApiKey ?? config.vsApiKey ?? null,
    vsSecretKey: runtimeSecrets.vsSecretKey ?? config.vsSecretKey ?? null
  };
}
function sanitizeStrategyConfigInput(input) {
  const allowedKeys = /* @__PURE__ */ new Set([
    "name",
    "signalTimeWindow",
    "minSignalScore",
    "enableFomoIntensify",
    "minOrderUsdt",
    "maxPositionPercent",
    "maxTotalPositionPercent",
    "maxDailyTrades",
    "maxDailyLossPercent",
    "stopLossPercent",
    "takeProfit1Percent",
    "takeProfit2Percent",
    "leverage",
    "marginType",
    "symbolSuffix",
    "enableTrailingStop",
    "trailingStopActivation",
    "trailingStopCallback",
    "binanceApiKey",
    "binanceSecretKey",
    "binanceUseTestnet",
    "okxApiKey",
    "okxSecretKey",
    "okxPassphrase",
    "okxUseDemo",
    "selectedExchange",
    "bybitApiKey",
    "bybitSecretKey",
    "bybitUseTestnet",
    "gateApiKey",
    "gateSecretKey",
    "bitgetApiKey",
    "bitgetSecretKey",
    "bitgetPassphrase",
    "minScoreThreshold",
    "autoTradingEnabled",
    "autoTradingPositionPercent",
    "useTestnet",
    "emergencyStop",
    "isActive",
    "vsUserToken",
    "vsTokenSetAt",
    "vsLoginEmail",
    "vsLoginPassword",
    "vsRefreshToken",
    "vsAutoRefreshEnabled"
  ]);
  if ("vsApiKey" in input) runtimeSecrets.vsApiKey = input.vsApiKey ?? null;
  if ("vsSecretKey" in input) runtimeSecrets.vsSecretKey = input.vsSecretKey ?? null;
  return stripUndefined(
    Object.fromEntries(Object.entries(input).filter(([key]) => allowedKeys.has(key)))
  );
}
async function safe(fallback, fn) {
  const db2 = await getDb();
  if (!db2) return fallback;
  try {
    return await fn(db2);
  } catch (error) {
    console.error("[db] query failed:", error);
    return fallback;
  }
}
async function getDb() {
  if (!DATABASE_URL) return null;
  if (dbInstance) return dbInstance;
  try {
    pool = mysql.createPool({
      uri: DATABASE_URL,
      connectionLimit: 10,
      enableKeepAlive: true
    });
    dbInstance = drizzle(pool, { schema: schema_exports, mode: "default" });
    return dbInstance;
  } catch (error) {
    console.error("[db] init failed:", error);
    return null;
  }
}
async function recordSignal(input) {
  const row = { ...stripUndefined(input), id: nowId(memory.signals), createdAt: /* @__PURE__ */ new Date() };
  memory.signals.unshift(row);
  await safe(null, async (db2) => {
    try {
      await db2.insert(signals).values(stripUndefined(input));
    } catch (error) {
      if (!String(error?.message ?? "").includes("Duplicate")) throw error;
    }
    return null;
  });
  return row;
}
async function recordConfluenceSignal(input) {
  const row = { ...stripUndefined(input), id: nowId(memory.confluenceSignals), createdAt: /* @__PURE__ */ new Date() };
  memory.confluenceSignals.unshift(row);
  await safe(null, async (db2) => {
    await db2.insert(confluenceSignals).values(stripUndefined(input));
    return null;
  });
  return row;
}
async function getRecentSignals(limit = 50) {
  return safe(memory.signals.slice(0, limit), async (db2) => {
    const rows = await db2.select().from(signals).orderBy(desc(signals.createdAt)).limit(limit);
    return rows.length ? rows : memory.signals.slice(0, limit);
  });
}
async function getRecentConfluenceSignals(limit = 20) {
  return safe(memory.confluenceSignals.slice(0, limit), async (db2) => {
    const rows = await db2.select().from(confluenceSignals).orderBy(desc(confluenceSignals.createdAt)).limit(limit);
    return rows.length ? rows : memory.confluenceSignals.slice(0, limit);
  });
}
async function getTrades(limit = 50, offset = 0) {
  return safe(memory.trades.slice(offset, offset + limit), async (db2) => {
    const rows = await db2.select().from(trades).orderBy(desc(trades.openedAt)).limit(limit).offset(offset);
    return rows.length ? rows : memory.trades.slice(offset, offset + limit);
  });
}
async function getOpenTrades() {
  return safe(memory.trades.filter((t2) => t2.status === "open"), async (db2) => {
    const rows = await db2.select().from(trades).where(eq(trades.status, "open")).orderBy(desc(trades.openedAt));
    return rows.length ? rows : memory.trades.filter((t2) => t2.status === "open");
  });
}
async function getTodayStats() {
  const start = /* @__PURE__ */ new Date();
  start.setHours(0, 0, 0, 0);
  const fallbackRows = memory.trades.filter((t2) => new Date(t2.openedAt ?? t2.createdAt ?? Date.now()) >= start);
  const rows = await safe(fallbackRows, async (db2) => {
    const data = await db2.select().from(trades).where(gte(trades.openedAt, start)).orderBy(desc(trades.openedAt));
    return data.length ? data : fallbackRows;
  });
  const closed = rows.filter((t2) => t2.status === "closed");
  const totalPnl = closed.reduce((sum, t2) => sum + Number(t2.pnl ?? 0), 0);
  const wins = closed.filter((t2) => Number(t2.pnl ?? 0) > 0).length;
  const losses = closed.filter((t2) => Number(t2.pnl ?? 0) <= 0).length;
  const winRate = closed.length ? wins / closed.length * 100 : 0;
  return {
    totalTrades: rows.length,
    openTrades: rows.filter((t2) => t2.status === "open").length,
    closedTrades: closed.length,
    wins,
    losses,
    winRate,
    totalPnl,
    avgPnl: closed.length ? totalPnl / closed.length : 0
  };
}
async function insertTrade(input) {
  const row = {
    id: nowId(memory.trades),
    symbol: input.symbol,
    confluenceSignalId: input.confluenceSignalId ?? null,
    action: input.action ?? "OPEN_LONG",
    quantity: Number(input.quantity ?? 0),
    entryPrice: Number(input.entryPrice ?? 0),
    exitPrice: input.exitPrice ?? null,
    stopLoss: input.stopLoss ?? null,
    takeProfit1: input.takeProfit1 ?? null,
    takeProfit2: input.takeProfit2 ?? null,
    leverage: Number(input.leverage ?? 1),
    pnl: Number(input.pnl ?? 0),
    pnlPercent: Number(input.pnlPercent ?? 0),
    signalScore: input.signalScore ?? null,
    riskLevel: input.riskLevel ?? "MEDIUM",
    status: input.status ?? "open",
    closeReason: input.closeReason ?? null,
    binanceOrderId: input.binanceOrderId ?? null,
    isTestnet: Boolean(input.isTestnet ?? false),
    openedAt: input.openedAt ?? /* @__PURE__ */ new Date(),
    closedAt: input.closedAt ?? null
  };
  memory.trades.unshift(row);
  const inserted = await safe(null, async (db2) => {
    const result = await db2.insert(trades).values(stripUndefined(input));
    const id = toResultInsertId(result);
    if (!id) return row;
    const created = await db2.select().from(trades).where(eq(trades.id, id)).limit(1);
    return created[0] ?? { ...row, id };
  });
  return inserted ?? row;
}
async function closeTrade(id, exitPrice, pnl, pnlPercent, closeReason = "") {
  const target = memory.trades.find((t2) => Number(t2.id) === Number(id));
  if (target) {
    target.status = "closed";
    target.exitPrice = exitPrice;
    target.pnl = pnl;
    target.pnlPercent = pnlPercent;
    target.closeReason = closeReason;
    target.closedAt = /* @__PURE__ */ new Date();
  }
  await safe(null, async (db2) => {
    await db2.update(trades).set({ status: "closed", exitPrice, pnl, pnlPercent, closeReason, closedAt: /* @__PURE__ */ new Date() }).where(eq(trades.id, id));
    return null;
  });
  return { success: true };
}
async function getAllPositions() {
  return safe(memory.positions, async (db2) => {
    const rows = await db2.select().from(positions).orderBy(desc(positions.updatedAt));
    return rows.length ? rows : memory.positions;
  });
}
async function upsertPosition(input) {
  const symbol = String(input.symbol ?? "").toUpperCase();
  const row = {
    id: nowId(memory.positions),
    symbol,
    quantity: Number(input.quantity ?? 0),
    entryPrice: Number(input.entryPrice ?? 0),
    currentPrice: Number(input.currentPrice ?? input.entryPrice ?? 0),
    leverage: Number(input.leverage ?? 1),
    unrealizedPnl: Number(input.unrealizedPnl ?? 0),
    unrealizedPnlPercent: Number(input.unrealizedPnlPercent ?? 0),
    stopLoss: input.stopLoss ?? null,
    takeProfit1: input.takeProfit1 ?? null,
    takeProfit2: input.takeProfit2 ?? null,
    tradeId: input.tradeId ?? null,
    openedAt: input.openedAt ?? /* @__PURE__ */ new Date(),
    updatedAt: /* @__PURE__ */ new Date()
  };
  const idx = memory.positions.findIndex((p) => p.symbol === symbol);
  if (idx >= 0) memory.positions[idx] = { ...memory.positions[idx], ...row, id: memory.positions[idx].id };
  else memory.positions.unshift(row);
  await safe(null, async (db2) => {
    const existing = await db2.select().from(positions).where(eq(positions.symbol, symbol)).limit(1);
    const payload = stripUndefined({ ...input, symbol, updatedAt: /* @__PURE__ */ new Date() });
    if (existing[0]) {
      await db2.update(positions).set(payload).where(eq(positions.symbol, symbol));
    } else {
      await db2.insert(positions).values(payload);
    }
    return null;
  });
  return memory.positions.find((p) => p.symbol === symbol) ?? row;
}
async function deletePosition(symbol) {
  const normalized = symbol.toUpperCase();
  memory.positions = memory.positions.filter((p) => p.symbol !== normalized);
  await safe(null, async (db2) => {
    await db2.delete(positions).where(eq(positions.symbol, normalized));
    return null;
  });
  return { success: true };
}
async function getActiveConfig() {
  const fallback = attachRuntimeSecrets(memory.strategyConfig ?? buildDefaultConfig());
  return safe(fallback, async (db2) => {
    const rows = await db2.select().from(strategyConfig).where(eq(strategyConfig.isActive, true)).orderBy(desc(strategyConfig.updatedAt)).limit(1);
    const active = rows[0] ?? memory.strategyConfig ?? buildDefaultConfig();
    memory.strategyConfig = { ...fallback, ...active };
    return attachRuntimeSecrets(memory.strategyConfig);
  });
}
async function getAllConfigs() {
  const fallback = [attachRuntimeSecrets(memory.strategyConfig ?? buildDefaultConfig())];
  return safe(fallback, async (db2) => {
    const rows = await db2.select().from(strategyConfig).orderBy(desc(strategyConfig.updatedAt));
    return rows.length ? rows.map((row) => attachRuntimeSecrets(row)) : fallback;
  });
}
async function upsertStrategyConfig(input) {
  const payload = sanitizeStrategyConfigInput({ ...input });
  const fallback = {
    ...memory.strategyConfig ?? buildDefaultConfig(),
    ...payload,
    id: memory.strategyConfig?.id ?? 1,
    updatedAt: /* @__PURE__ */ new Date()
  };
  memory.strategyConfig = attachRuntimeSecrets(fallback);
  const saved = await safe(memory.strategyConfig, async (db2) => {
    if (payload.isActive) {
      await db2.update(strategyConfig).set({ isActive: false });
    }
    const name = String(payload.name ?? memory.strategyConfig.name ?? "\u9ED8\u8BA4\u7B56\u7565");
    const existing = await db2.select().from(strategyConfig).where(eq(strategyConfig.name, name)).limit(1);
    if (existing[0]) {
      await db2.update(strategyConfig).set(payload).where(eq(strategyConfig.id, existing[0].id));
      const rows2 = await db2.select().from(strategyConfig).where(eq(strategyConfig.id, existing[0].id)).limit(1);
      return attachRuntimeSecrets(rows2[0] ?? { ...memory.strategyConfig, id: existing[0].id });
    }
    const result = await db2.insert(strategyConfig).values({ ...buildDefaultConfig(), ...payload, name });
    const id = toResultInsertId(result);
    const rows = id ? await db2.select().from(strategyConfig).where(eq(strategyConfig.id, id)).limit(1) : [];
    return attachRuntimeSecrets(rows[0] ?? { ...memory.strategyConfig, id: id || 1, name });
  });
  memory.strategyConfig = saved;
  return saved;
}
async function updateStrategyConfig(id, input) {
  const payload = sanitizeStrategyConfigInput({ ...input, updatedAt: /* @__PURE__ */ new Date() });
  memory.strategyConfig = attachRuntimeSecrets({ ...memory.strategyConfig ?? buildDefaultConfig(), ...payload, id });
  const saved = await safe(memory.strategyConfig, async (db2) => {
    await db2.update(strategyConfig).set(payload).where(eq(strategyConfig.id, id));
    const rows = await db2.select().from(strategyConfig).where(eq(strategyConfig.id, id)).limit(1);
    return attachRuntimeSecrets(rows[0] ?? memory.strategyConfig);
  });
  memory.strategyConfig = saved;
  return saved;
}
async function getLatestSnapshot() {
  return safe(memory.snapshots[0] ?? null, async (db2) => {
    const rows = await db2.select().from(accountSnapshots).orderBy(desc(accountSnapshots.createdAt)).limit(1);
    return rows[0] ?? memory.snapshots[0] ?? null;
  });
}
async function getSnapshotHistory(hours = 24) {
  const since = new Date(Date.now() - hours * 36e5);
  const fallback = memory.snapshots.filter((s) => new Date(s.createdAt) >= since);
  return safe(fallback, async (db2) => {
    const rows = await db2.select().from(accountSnapshots).where(gte(accountSnapshots.createdAt, since)).orderBy(desc(accountSnapshots.createdAt));
    return rows.length ? rows : fallback;
  });
}
async function insertAccountSnapshot(input) {
  const row = { id: nowId(memory.snapshots), ...stripUndefined(input), createdAt: /* @__PURE__ */ new Date() };
  memory.snapshots.unshift(row);
  const saved = await safe(row, async (db2) => {
    const result = await db2.insert(accountSnapshots).values(stripUndefined(input));
    const id = toResultInsertId(result);
    if (!id) return row;
    const rows = await db2.select().from(accountSnapshots).where(eq(accountSnapshots.id, id)).limit(1);
    return rows[0] ?? { ...row, id };
  });
  return saved;
}
async function getBacktestResults() {
  return safe(memory.backtests, async (db2) => {
    const rows = await db2.select().from(backtestResults).orderBy(desc(backtestResults.createdAt));
    return rows.length ? rows : memory.backtests;
  });
}
async function insertBacktestResult(input) {
  const row = { id: nowId(memory.backtests), ...stripUndefined(input), createdAt: /* @__PURE__ */ new Date() };
  memory.backtests.unshift(row);
  const saved = await safe(row, async (db2) => {
    const result = await db2.insert(backtestResults).values(stripUndefined(input));
    const id = toResultInsertId(result);
    if (!id) return row;
    const rows = await db2.select().from(backtestResults).where(eq(backtestResults.id, id)).limit(1);
    return rows[0] ?? { ...row, id };
  });
  return saved;
}
async function getTelegramConfig() {
  return safe(memory.telegramConfig, async (db2) => {
    const rows = await db2.select().from(telegramConfig).orderBy(desc(telegramConfig.updatedAt)).limit(1);
    const cfg = rows[0] ?? memory.telegramConfig;
    if (cfg) memory.telegramConfig = cfg;
    return cfg ?? null;
  });
}
async function upsertTelegramConfig(input) {
  const payload = stripUndefined(input);
  memory.telegramConfig = { id: memory.telegramConfig?.id ?? 1, ...memory.telegramConfig, ...payload, updatedAt: /* @__PURE__ */ new Date() };
  const saved = await safe(memory.telegramConfig, async (db2) => {
    const rows = await db2.select().from(telegramConfig).limit(1);
    if (rows[0]) {
      await db2.update(telegramConfig).set(payload).where(eq(telegramConfig.id, rows[0].id));
      const updated = await db2.select().from(telegramConfig).where(eq(telegramConfig.id, rows[0].id)).limit(1);
      return updated[0] ?? { ...memory.telegramConfig, id: rows[0].id };
    }
    const result = await db2.insert(telegramConfig).values(payload);
    const id = toResultInsertId(result);
    const created = id ? await db2.select().from(telegramConfig).where(eq(telegramConfig.id, id)).limit(1) : [];
    return created[0] ?? { ...memory.telegramConfig, id: id || 1 };
  });
  memory.telegramConfig = saved;
  return saved;
}
function inferStrategyName(trade) {
  if (trade?.confluenceSignalId) return "FOMO+Alpha \u5171\u632F";
  const score = Number(trade?.signalScore ?? 0);
  if (score >= 85) return "\u9AD8\u8BC4\u5206\u7A81\u7834";
  if (score >= 70) return "\u8D8B\u52BF\u8DDF\u968F";
  if (score >= 60) return "\u8C28\u614E\u8BD5\u5355";
  return "\u5176\u4ED6\u7B56\u7565";
}
async function getStrategyWinRateStats() {
  const allTrades = await getTrades(500, 0);
  const closed = allTrades.filter((t2) => t2.status === "closed");
  const bucket = /* @__PURE__ */ new Map();
  for (const trade of closed) {
    const strategyName = inferStrategyName(trade);
    const item = bucket.get(strategyName) ?? { strategyName, totalTrades: 0, winTrades: 0, lossTrades: 0, totalPnl: 0, winRate: 0 };
    item.totalTrades += 1;
    if (Number(trade.pnl ?? 0) > 0) item.winTrades += 1;
    else item.lossTrades += 1;
    item.totalPnl += Number(trade.pnl ?? 0);
    item.winRate = item.totalTrades ? item.winTrades / item.totalTrades * 100 : 0;
    bucket.set(strategyName, item);
  }
  const result = Array.from(bucket.values()).sort((a, b) => b.winRate - a.winRate);
  if (result.length) return result;
  return [
    { strategyName: "FOMO+Alpha \u5171\u632F", totalTrades: 0, winTrades: 0, lossTrades: 0, totalPnl: 0, winRate: 0 },
    { strategyName: "\u9AD8\u8BC4\u5206\u7A81\u7834", totalTrades: 0, winTrades: 0, lossTrades: 0, totalPnl: 0, winRate: 0 },
    { strategyName: "\u8D8B\u52BF\u8DDF\u968F", totalTrades: 0, winTrades: 0, lossTrades: 0, totalPnl: 0, winRate: 0 }
  ];
}
async function getTradeCases(limit = 20) {
  const rows = await getTrades(limit, 0);
  return rows.slice(0, limit).map((trade) => ({
    ...trade,
    strategyName: inferStrategyName(trade),
    outcome: Number(trade.pnl ?? 0) > 0 ? "win" : Number(trade.pnl ?? 0) < 0 ? "loss" : "flat"
  }));
}
async function addVsSignalStat(input) {
  const row = { id: nowId(memory.vsStats), ...stripUndefined(input), result: input.result ?? "pending", createdAt: /* @__PURE__ */ new Date(), updatedAt: /* @__PURE__ */ new Date() };
  memory.vsStats.unshift(row);
  const id = await safe(row.id, async (db2) => {
    const result = await db2.insert(vsSignalStats).values(stripUndefined(input));
    return toResultInsertId(result) || row.id;
  });
  return id;
}
async function updateVsSignalStat(id, input) {
  const idx = memory.vsStats.findIndex((item) => Number(item.id) === Number(id));
  if (idx >= 0) memory.vsStats[idx] = { ...memory.vsStats[idx], ...stripUndefined(input), updatedAt: /* @__PURE__ */ new Date() };
  await safe(null, async (db2) => {
    await db2.update(vsSignalStats).set(stripUndefined({ ...input, updatedAt: /* @__PURE__ */ new Date() })).where(eq(vsSignalStats.id, id));
    return null;
  });
  return { success: true };
}
async function getVsSignalStats(filters = {}) {
  const { limit = 100, signalType, direction } = filters;
  const local = memory.vsStats.filter((item) => (!signalType || item.signalType === signalType) && (!direction || item.direction === direction)).slice(0, limit);
  return safe(local, async (db2) => {
    const rows = await db2.select().from(vsSignalStats).orderBy(desc(vsSignalStats.createdAt)).limit(limit);
    return rows.filter((item) => (!signalType || item.signalType === signalType) && (!direction || item.direction === direction));
  });
}
async function getVsSignalWinRate() {
  const rows = await getVsSignalStats({ limit: 500 });
  const pending = rows.filter((row) => !row.result || row.result === "pending").length;
  const completed = rows.filter((row) => row.result && row.result !== "pending");
  const win = completed.filter((row) => row.result === "win").length;
  const loss = completed.filter((row) => row.result === "loss").length;
  const byTypeMap = /* @__PURE__ */ new Map();
  for (const row of completed) {
    const key = row.signalType || "unknown";
    const item = byTypeMap.get(key) ?? { signalType: key, total: 0, win: 0, loss: 0, pending: 0, winRate: 0, avgPnl24h: 0, avgPnl48h: 0 };
    item.total += 1;
    if (row.result === "win") item.win += 1;
    if (row.result === "loss") item.loss += 1;
    item.avgPnl24h += Number(row.pnlPct24h ?? 0);
    item.avgPnl48h += Number(row.pnlPct48h ?? 0);
    item.winRate = item.total ? item.win / item.total * 100 : 0;
    byTypeMap.set(key, item);
  }
  const list = Array.from(byTypeMap.values()).map((item) => ({
    ...item,
    avgPnl24h: item.total ? item.avgPnl24h / item.total : 0,
    avgPnl48h: item.total ? item.avgPnl48h / item.total : 0
  })).sort((a, b) => b.winRate - a.winRate);
  const byType = Object.fromEntries(list.map((item) => [item.signalType, item]));
  return {
    total: rows.length,
    completed: completed.length,
    win,
    loss,
    pending,
    wins: win,
    losses: loss,
    winRate: completed.length ? win / completed.length * 100 : 0,
    byType,
    list
  };
}
async function saveVSLoginCredentials(email, password, refreshToken = "", autoRefreshEnabled = true) {
  const cfg = await getActiveConfig();
  const id = Number(cfg?.id ?? 1);
  return updateStrategyConfig(id, {
    vsLoginEmail: email,
    vsLoginPassword: password,
    vsRefreshToken: refreshToken,
    vsAutoRefreshEnabled: autoRefreshEnabled
  });
}
async function loadVSLoginCredentials() {
  const cfg = await getActiveConfig();
  if (!cfg) return null;
  return {
    email: cfg.vsLoginEmail || "",
    password: cfg.vsLoginPassword || "",
    refreshToken: cfg.vsRefreshToken || "",
    autoRefreshEnabled: Boolean(cfg.vsAutoRefreshEnabled)
  };
}
async function getUserByOpenId(openId) {
  const fallback = null;
  return safe(fallback, async (db2) => {
    const rows = await db2.select().from(users).where(eq(users.openId, openId)).limit(1);
    return rows[0] ?? null;
  });
}
async function upsertUser(input) {
  const openId = String(input.openId ?? "").trim();
  if (!openId) throw new Error("openId is required");
  const payload = stripUndefined({
    openId,
    name: input.name ?? null,
    email: input.email ?? null,
    loginMethod: input.loginMethod ?? null,
    role: input.role ?? "user",
    lastSignedIn: input.lastSignedIn ?? /* @__PURE__ */ new Date(),
    updatedAt: /* @__PURE__ */ new Date()
  });
  return safe({ ...payload, id: 0 }, async (db2) => {
    const existing = await db2.select().from(users).where(eq(users.openId, openId)).limit(1);
    if (existing[0]) {
      await db2.update(users).set(payload).where(eq(users.openId, openId));
      const rows2 = await db2.select().from(users).where(eq(users.openId, openId)).limit(1);
      return rows2[0] ?? { ...existing[0], ...payload };
    }
    const result = await db2.insert(users).values(payload);
    const id = toResultInsertId(result);
    const rows = id ? await db2.select().from(users).where(eq(users.id, id)).limit(1) : [];
    return rows[0] ?? { ...payload, id };
  });
}

// server/signalEngine.ts
var signalCache = [];
var confluenceCache = [];
function normalizeSymbol(symbol) {
  const s = String(symbol || "BTC").toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (s.endsWith("USDT")) return s;
  if (s.endsWith("USD")) return `${s}T`;
  return s;
}
function inferSignalType(messageType, data) {
  const content = JSON.stringify(data || {}).toLowerCase();
  const map = {
    100: "FOMO",
    108: "ALPHA",
    109: "RISK",
    110: "FOMO",
    111: "ALPHA",
    112: "RISK",
    113: "FUND_MOVE",
    114: "LISTING"
  };
  if (map[messageType]) return map[messageType];
  if (content.includes("risk") || content.includes("danger") || content.includes("\u66B4\u8DCC") || content.includes("\u9884\u8B66")) return "RISK";
  if (content.includes("listing") || content.includes("\u4E0A\u65B0") || content.includes("\u4E0A\u7EBF")) return "LISTING";
  if (content.includes("fund") || content.includes("whale") || content.includes("\u8D44\u91D1")) return "FUND_MOVE";
  if (content.includes("alpha") || content.includes("smart") || content.includes("\u7B56\u7565")) return "ALPHA";
  return "FOMO";
}
function clamp(num, min = 0, max = 1) {
  return Math.max(min, Math.min(max, num));
}
function calcSignalScore(signalType, data) {
  let score = signalType === "RISK" ? 0.35 : signalType === "ALPHA" ? 0.72 : 0.65;
  const confidence = Number(data?.confidence ?? data?.score ?? data?.strength ?? 0);
  if (confidence > 0) {
    score += confidence > 1 ? confidence / 100 * 0.2 : confidence * 0.2;
  }
  const volumeRatio = Number(data?.volumeRatio ?? data?.multiple ?? data?.intensity ?? 0);
  if (volumeRatio > 0) score += Math.min(volumeRatio / 10, 0.1);
  if (data?.isWhale || data?.smartMoney || data?.isSmartMoney) score += 0.08;
  if (data?.marketCap && Number(data.marketCap) < 1e9) score += 0.03;
  if (data?.negative || data?.bearish) score -= 0.08;
  return clamp(score);
}
function cleanup(windowSeconds = 3600) {
  const expireAt = Date.now() - windowSeconds * 1e3;
  while (signalCache.length && signalCache[signalCache.length - 1].createdAt.getTime() < expireAt) signalCache.pop();
  while (confluenceCache.length && new Date(confluenceCache[confluenceCache.length - 1].createdAt).getTime() < expireAt) confluenceCache.pop();
}
function getWindowSignals(symbol, timeWindow = 300) {
  const normalized = normalizeSymbol(symbol);
  const since = Date.now() - timeWindow * 1e3;
  return signalCache.filter((s) => s.symbol === normalized && s.createdAt.getTime() >= since);
}
function getCacheStatus() {
  cleanup();
  const latest = signalCache[0];
  return {
    totalSignals: signalCache.length,
    totalConfluenceSignals: confluenceCache.length,
    symbols: Array.from(new Set(signalCache.map((s) => s.symbol))).length,
    lastSignalAt: latest?.createdAt ?? null,
    riskSignalCount: signalCache.filter((s) => s.signalType === "RISK").length,
    recentConfluence: confluenceCache.slice(0, 5)
  };
}
function generateMockSignal(symbol = "BTC") {
  const normalized = normalizeSymbol(symbol);
  const types = [100, 108, 110, 111, 109];
  const messageType = types[Math.floor(Math.random() * types.length)];
  return {
    messageType,
    messageId: `mock_${normalized}_${Date.now()}`,
    symbol: normalized,
    data: {
      confidence: 0.65 + Math.random() * 0.3,
      intensity: 2 + Math.random() * 4,
      source: "mock",
      text: messageType === 109 ? `${normalized} \u98CE\u9669\u9884\u8B66` : `${normalized} \u8D44\u91D1\u4E0E\u60C5\u7EEA\u5F02\u52A8`
    }
  };
}
async function hydrateFromDbIfNeeded() {
  if (signalCache.length > 0) return;
  const latest = await getRecentSignals(50);
  for (const item of latest.reverse()) {
    signalCache.unshift({
      signalId: item.signalId,
      symbol: normalizeSymbol(item.symbol),
      signalType: item.signalType,
      messageType: Number(item.messageType),
      score: Number(item.score ?? 0),
      rawData: item.rawData ?? {},
      processed: Boolean(item.processed),
      createdAt: new Date(item.createdAt ?? Date.now())
    });
  }
}
async function processSignal(messageType, messageId, symbol, data = {}, timeWindow = 300, minScore = 0.6) {
  await hydrateFromDbIfNeeded();
  cleanup(Math.max(timeWindow * 4, 3600));
  const normalizedSymbol = normalizeSymbol(symbol);
  const signalType = inferSignalType(messageType, data);
  const score = calcSignalScore(signalType, data);
  const createdAt = /* @__PURE__ */ new Date();
  const signal = {
    signalId: messageId,
    symbol: normalizedSymbol,
    signalType,
    messageType,
    score,
    rawData: data ?? {},
    processed: true,
    createdAt
  };
  signalCache.unshift(signal);
  await recordSignal({
    signalId: messageId,
    symbol: normalizedSymbol,
    signalType,
    messageType,
    score,
    rawData: data ?? {},
    processed: true
  });
  const recent = getWindowSignals(normalizedSymbol, timeWindow);
  const riskExists = recent.some((s) => s.signalType === "RISK" && s.signalId !== messageId);
  if (signalType === "RISK") return null;
  const latestFomo = recent.find((s) => s.signalType === "FOMO");
  const latestAlpha = recent.find((s) => s.signalType === "ALPHA");
  if (!latestFomo || !latestAlpha || riskExists) return null;
  const timeGap = Math.abs(latestFomo.createdAt.getTime() - latestAlpha.createdAt.getTime()) / 1e3;
  let confluenceScore = clamp((latestFomo.score + latestAlpha.score) / 2 + 0.08 - Math.min(timeGap / Math.max(timeWindow, 1), 1) * 0.08);
  if (data?.isWhale || data?.smartMoney) confluenceScore = clamp(confluenceScore + 0.05);
  if (confluenceScore < minScore) return null;
  const duplicate = confluenceCache.find((item) => item.symbol === normalizedSymbol && Math.abs(new Date(item.createdAt).getTime() - Date.now()) < timeWindow * 1e3);
  if (duplicate) return duplicate;
  const confluence = {
    id: confluenceCache.length + 1,
    symbol: normalizedSymbol,
    fomoSignalId: latestFomo.signalId,
    alphaSignalId: latestAlpha.signalId,
    timeGap,
    score: confluenceScore,
    status: riskExists ? "skipped" : "pending",
    skipReason: riskExists ? "\u8FD1\u671F\u5B58\u5728\u98CE\u9669\u4FE1\u53F7" : null,
    createdAt
  };
  confluenceCache.unshift(confluence);
  await recordConfluenceSignal({
    symbol: normalizedSymbol,
    fomoSignalId: latestFomo.signalId,
    alphaSignalId: latestAlpha.signalId,
    timeGap,
    score: confluenceScore,
    status: confluence.status,
    skipReason: confluence.skipReason
  });
  return confluence;
}

// shared/valueScanTypes.ts
var SIGNAL_TYPE_MAP = {
  // FOMO 信号（资金大量流入/流出）
  1: { name: "FOMO \u505A\u591A", category: "fomo", direction: "long", desc: "\u8D44\u91D1\u5927\u91CF\u6D41\u5165\uFF0C\u5E02\u573A\u60C5\u7EEA\u6781\u5EA6\u770B\u591A\uFF0C\u77ED\u671F\u5F3A\u70C8\u4E0A\u6DA8\u4FE1\u53F7" },
  2: { name: "FOMO \u505A\u7A7A", category: "fomo", direction: "short", desc: "\u8D44\u91D1\u5927\u91CF\u6D41\u51FA\uFF0C\u5E02\u573A\u60C5\u7EEA\u6781\u5EA6\u770B\u7A7A\uFF0C\u77ED\u671F\u5F3A\u70C8\u4E0B\u8DCC\u4FE1\u53F7" },
  // Alpha 信号（聪明钱建仓/减仓）
  3: { name: "Alpha \u505A\u591A", category: "alpha", direction: "long", desc: "\u806A\u660E\u94B1\u6084\u6084\u5EFA\u4ED3\uFF0C\u6F5C\u529B\u6807\u7684\u770B\u591A\uFF0C\u4E2D\u957F\u671F\u673A\u4F1A" },
  4: { name: "Alpha \u505A\u7A7A", category: "alpha", direction: "short", desc: "\u806A\u660E\u94B1\u6084\u6084\u51CF\u4ED3\uFF0C\u6F5C\u529B\u6807\u7684\u770B\u7A7A\uFF0C\u4E2D\u957F\u671F\u98CE\u9669" },
  // 风险信号
  5: { name: "\u98CE\u9669 \u505A\u591A", category: "risk", direction: "long", desc: "\u98CE\u9669\u8D44\u91D1\u6D41\u5165\uFF0C\u9AD8\u98CE\u9669\u9AD8\u56DE\u62A5\u505A\u591A\u673A\u4F1A" },
  6: { name: "\u98CE\u9669 \u505A\u7A7A", category: "risk", direction: "short", desc: "\u98CE\u9669\u8D44\u91D1\u6D41\u51FA\uFF0C\u9AD8\u98CE\u9669\u9AD8\u56DE\u62A5\u505A\u7A7A\u673A\u4F1A" },
  // 巨鲸信号
  7: { name: "\u5DE8\u9CB8\u4E70\u5165", category: "whale", direction: "long", desc: "\u5927\u989D\u8D44\u91D1\u4E70\u5165\uFF0C\u4E3B\u529B\u8FDB\u573A\u4FE1\u53F7\uFF0C\u8DDF\u968F\u4E3B\u529B" },
  8: { name: "\u5DE8\u9CB8\u5356\u51FA", category: "whale", direction: "short", desc: "\u5927\u989D\u8D44\u91D1\u5356\u51FA\uFF0C\u4E3B\u529B\u51FA\u573A\u4FE1\u53F7\uFF0C\u6CE8\u610F\u98CE\u9669" },
  // 交易所资金流向
  9: { name: "\u4EA4\u6613\u6240\u6D41\u5165", category: "exchange", direction: "short", desc: "\u5927\u91CF\u5E01\u6D41\u5165\u4EA4\u6613\u6240\uFF0C\u629B\u538B\u589E\u52A0\uFF0C\u770B\u7A7A\u4FE1\u53F7" },
  10: { name: "\u4EA4\u6613\u6240\u6D41\u51FA", category: "exchange", direction: "long", desc: "\u5927\u91CF\u5E01\u6D41\u51FA\u4EA4\u6613\u6240\uFF0C\u7B79\u7801\u9501\u5B9A\uFF0C\u770B\u591A\u4FE1\u53F7" },
  11: { name: "\u8D44\u91D1\u5F02\u5E38\u6D41\u5165", category: "exchange", direction: "long", desc: "\u5F02\u5E38\u5927\u989D\u8D44\u91D1\u6D41\u5165\uFF0C\u53EF\u80FD\u6709\u91CD\u5927\u5229\u597D" },
  12: { name: "\u8D44\u91D1\u5F02\u5E38\u6D41\u51FA", category: "exchange", direction: "short", desc: "\u5F02\u5E38\u5927\u989D\u8D44\u91D1\u6D41\u51FA\uFF0C\u53EF\u80FD\u6709\u91CD\u5927\u5229\u7A7A" },
  // 链上大额转账
  13: { name: "\u5927\u989D\u8F6C\u8D26", category: "whale", direction: "neutral", desc: "\u94FE\u4E0A\u5927\u989D\u8F6C\u8D26\uFF0C\u5173\u6CE8\u540E\u7EED\u52A8\u5411\uFF0C\u65B9\u5411\u5F85\u5B9A" },
  // 消息类型（messageType）
  100: { name: "\u4E0B\u8DCC\u9884\u8B66", category: "risk", direction: "short", desc: "\u4EF7\u683C\u4E0B\u8DCC\u9884\u8B66\u4FE1\u53F7" },
  108: { name: "AI \u8FFD\u8E2A", category: "ai", direction: "neutral", desc: "AI \u4E3B\u529B\u8FFD\u8E2A\u4FE1\u53F7\uFF0C\u5206\u6790\u4E3B\u529B\u884C\u4E3A" },
  109: { name: "AI \u9884\u6D4B", category: "ai", direction: "neutral", desc: "AI \u884C\u60C5\u9884\u6D4B\u4FE1\u53F7" },
  110: { name: "Alpha \u4FE1\u53F7", category: "alpha", direction: "long", desc: "Alpha \u806A\u660E\u94B1\u4FE1\u53F7" },
  111: { name: "FOMO \u4FE1\u53F7", category: "fomo", direction: "long", desc: "FOMO \u8D44\u91D1\u6D41\u5165\u4FE1\u53F7" },
  112: { name: "\u98CE\u9669\u4FE1\u53F7", category: "risk", direction: "short", desc: "\u98CE\u9669\u9884\u8B66\u4FE1\u53F7" },
  113: { name: "FOMO \u4FE1\u53F7", category: "fomo", direction: "long", desc: "FOMO \u5F3A\u70C8\u4FE1\u53F7" },
  114: { name: "\u7EFC\u5408\u4FE1\u53F7", category: "mixed", direction: "neutral", desc: "\u591A\u7C7B\u578B\u7EFC\u5408\u4FE1\u53F7" }
};
function getSignalInfo(type) {
  return SIGNAL_TYPE_MAP[type] ?? {
    name: `\u4FE1\u53F7 #${type}`,
    category: "mixed",
    direction: "neutral",
    desc: "\u672A\u77E5\u4FE1\u53F7\u7C7B\u578B"
  };
}

// server/strategyEngine.ts
var STRATEGIES = [
  {
    key: "fomo_alpha_resonance",
    name: "FOMO + Alpha \u5171\u632F",
    description: "FOMO \u4E0E\u806A\u660E\u94B1\u540C\u5411\u51FA\u73B0\u65F6\uFF0C\u987A\u52BF\u8DDF\u968F\u4E3B\u6D41\u8D44\u91D1\u3002",
    winRate: 0.78
  },
  {
    key: "smart_money_breakout",
    name: "\u806A\u660E\u94B1\u7A81\u7834",
    description: "Alpha \u5F3A\u5EA6\u8F83\u9AD8\u4E14\u5E02\u573A\u98CE\u9669\u8F83\u4F4E\u65F6\uFF0C\u6355\u6349\u7A81\u7834\u884C\u60C5\u3002",
    winRate: 0.73
  },
  {
    key: "whale_follow",
    name: "\u5DE8\u9CB8\u8DDF\u968F",
    description: "\u68C0\u6D4B\u5927\u989D\u8D44\u91D1\u6216\u4E3B\u529B\u884C\u4E3A\uFF0C\u8DDF\u968F\u5927\u8D44\u91D1\u65B9\u5411\u3002",
    winRate: 0.69
  },
  {
    key: "trend_continuation",
    name: "\u8D8B\u52BF\u5EF6\u7EED",
    description: "\u5E02\u573A\u70ED\u5EA6\u8F83\u9AD8\u4E14\u98CE\u9669\u4FE1\u53F7\u7A00\u5C11\u65F6\uFF0C\u53C2\u4E0E\u8D8B\u52BF\u5EF6\u7EED\u3002",
    winRate: 0.66
  },
  {
    key: "fear_reversal",
    name: "\u6050\u614C\u53CD\u8F6C",
    description: "\u98CE\u9669\u6216\u6050\u614C\u4FE1\u53F7\u96C6\u4E2D\u91CA\u653E\u540E\uFF0C\u7B49\u5F85\u53CD\u8F6C\u578B\u505A\u591A\u673A\u4F1A\u3002",
    winRate: 0.62
  },
  {
    key: "short_protection",
    name: "\u98CE\u9669\u9632\u5B88\u505A\u7A7A",
    description: "\u5F53\u4E0B\u8DCC\u98CE\u9669\u663E\u8457\u5347\u9AD8\u65F6\uFF0C\u4EE5\u9632\u5B88\u578B\u7B56\u7565\u53C2\u4E0E\u505A\u7A7A\u6216\u89C2\u671B\u3002",
    winRate: 0.71
  }
];
function clamp2(num, min = 0, max = 100) {
  return Math.max(min, Math.min(max, num));
}
function buildSignalContext(input) {
  const recentSignalStats = {
    fomoCount: Number(input.recentSignalStats?.fomoCount ?? 0),
    alphaCount: Number(input.recentSignalStats?.alphaCount ?? 0),
    riskCount: Number(input.recentSignalStats?.riskCount ?? 0),
    totalCount: Number(input.recentSignalStats?.totalCount ?? 0),
    uniqueSymbols: Number(input.recentSignalStats?.uniqueSymbols ?? 0)
  };
  const signalInfo = getSignalInfo(Number(input.messageType ?? 110));
  const longPressure = recentSignalStats.fomoCount + recentSignalStats.alphaCount * 1.2;
  const shortPressure = recentSignalStats.riskCount * 1.5;
  const marketBias = longPressure > shortPressure + 1 ? "long" : shortPressure > longPressure + 1 ? "short" : signalInfo.direction;
  const marketHeat = clamp2(
    50 + recentSignalStats.totalCount * 5 + recentSignalStats.uniqueSymbols * 1.5 + recentSignalStats.alphaCount * 4 - recentSignalStats.riskCount * 8
  );
  return {
    symbol: String(input.symbol ?? "BTC"),
    messageType: Number(input.messageType ?? 110),
    rawData: input.rawData ?? {},
    recentSignalStats,
    signalInfo,
    marketBias,
    marketHeat
  };
}
function createResult(ctx, def) {
  const stats = ctx.recentSignalStats;
  const confidence = Number(ctx.rawData?.confidence ?? ctx.rawData?.score ?? 0);
  const confidencePct = confidence > 1 ? confidence : confidence * 100;
  const hasWhale = Boolean(ctx.rawData?.isWhale || ctx.rawData?.smartMoney || ctx.rawData?.mainForce || ctx.rawData?.whaleAmount);
  const isRiskSignal = ctx.signalInfo?.category === "risk" || stats.riskCount >= Math.max(stats.alphaCount + 1, 2);
  const isAlphaSignal = ctx.signalInfo?.category === "alpha";
  const isFomoSignal = ctx.signalInfo?.category === "fomo";
  let score = 40;
  let direction = ctx.marketBias ?? "neutral";
  let reason = "\u5F53\u524D\u4FE1\u53F7\u4E0E\u8BE5\u7B56\u7565\u5339\u914D\u5EA6\u4E00\u822C\u3002";
  switch (def.key) {
    case "fomo_alpha_resonance":
      score = 45 + stats.fomoCount * 12 + stats.alphaCount * 14 - stats.riskCount * 10 + confidencePct * 0.15;
      direction = stats.riskCount > stats.fomoCount + stats.alphaCount ? "short" : "long";
      reason = "\u9002\u7528\u4E8E FOMO \u4E0E Alpha \u540C\u65F6\u589E\u5F3A\u3001\u98CE\u9669\u4FE1\u53F7\u4E0D\u9AD8\u7684\u65F6\u6BB5\u3002";
      break;
    case "smart_money_breakout":
      score = 42 + (isAlphaSignal ? 18 : 0) + stats.alphaCount * 16 + stats.uniqueSymbols * 1.5 - stats.riskCount * 8 + confidencePct * 0.12;
      direction = isRiskSignal ? "short" : "long";
      reason = "\u806A\u660E\u94B1\u6D3B\u8DC3\u5EA6\u8D8A\u9AD8\uFF0C\u7A81\u7834\u7B56\u7565\u5F97\u5206\u8D8A\u9AD8\u3002";
      break;
    case "whale_follow":
      score = 40 + (hasWhale ? 24 : 0) + confidencePct * 0.18 + stats.fomoCount * 6 - stats.riskCount * 6;
      direction = isRiskSignal ? "short" : "long";
      reason = "\u82E5\u68C0\u6D4B\u5230\u9CB8\u9C7C\u6216\u4E3B\u529B\u75D5\u8FF9\uFF0C\u4F18\u5148\u987A\u52BF\u8DDF\u968F\u3002";
      break;
    case "trend_continuation":
      score = 38 + (ctx.marketHeat ?? 50) * 0.35 + stats.totalCount * 3 - stats.riskCount * 10;
      direction = ctx.marketBias ?? "neutral";
      reason = "\u5E02\u573A\u70ED\u5EA6\u9AD8\u3001\u98CE\u9669\u4F4E\u65F6\uFF0C\u8D8B\u52BF\u5EF6\u7EED\u66F4\u53EF\u9760\u3002";
      break;
    case "fear_reversal":
      score = 35 + stats.riskCount * 12 + Math.max(0, 3 - stats.fomoCount) * 6 + confidencePct * 0.08;
      direction = stats.riskCount >= 2 ? "long" : "neutral";
      reason = "\u6050\u614C\u96C6\u4E2D\u91CA\u653E\u540E\uFF0C\u7B49\u5F85\u8D85\u8DCC\u53CD\u8F6C\u578B\u673A\u4F1A\u3002";
      break;
    case "short_protection":
      score = 44 + stats.riskCount * 18 + (isRiskSignal ? 15 : 0) - stats.alphaCount * 6 - stats.fomoCount * 4;
      direction = "short";
      reason = "\u98CE\u9669\u4FE1\u53F7\u8D8A\u591A\uFF0C\u9632\u5B88\u505A\u7A7A\u7B56\u7565\u8D8A\u5360\u4F18\u3002";
      break;
  }
  if (isFomoSignal && def.key === "fomo_alpha_resonance") score += 8;
  if (isAlphaSignal && def.key === "smart_money_breakout") score += 8;
  if (ctx.signalInfo?.direction === "short") direction = def.key === "fear_reversal" ? direction : "short";
  score = clamp2(score);
  const triggered = def.key === "fear_reversal" ? score >= 72 : score >= 68;
  return {
    strategyKey: def.key,
    strategyName: def.name,
    description: def.description,
    triggered,
    score,
    winRate: def.winRate,
    direction,
    reason
  };
}
function evaluateStrategies(input) {
  const ctx = "recentSignalStats" in input ? input : buildSignalContext(input);
  const allResults = STRATEGIES.map((def) => createResult(ctx, def)).sort((a, b) => b.score - a.score);
  const triggeredResults = allResults.filter((item) => item.triggered);
  const bestStrategy = allResults[0] ?? null;
  return {
    symbol: ctx.symbol,
    marketBias: ctx.marketBias,
    marketHeat: ctx.marketHeat,
    signalInfo: ctx.signalInfo,
    bestStrategy,
    triggered: triggeredResults.length > 0,
    triggeredCount: triggeredResults.length,
    allResults,
    recommendation: bestStrategy ? {
      action: bestStrategy.direction === "neutral" ? "\u89C2\u671B" : bestStrategy.direction === "long" ? "\u505A\u591A" : "\u505A\u7A7A",
      confidence: bestStrategy.score,
      reason: bestStrategy.reason
    } : { action: "\u89C2\u671B", confidence: 50, reason: "\u6682\u65E0\u8DB3\u591F\u7B56\u7565\u5171\u8BC6" }
  };
}
function getAllStrategiesInfo() {
  return STRATEGIES.map((item) => ({
    key: item.key,
    strategyName: item.name,
    description: item.description,
    historicalWinRate: item.winRate,
    tags: item.key.includes("short") ? ["\u9632\u5B88", "\u505A\u7A7A"] : ["\u8D8B\u52BF", "\u9AD8\u80DC\u7387"]
  }));
}

// server/riskManager.ts
var cooldownMap = /* @__PURE__ */ new Map();
function clamp3(num, min, max) {
  return Math.max(min, Math.min(max, num));
}
function normalizeSymbol2(symbol) {
  return String(symbol || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
}
function getCooldownStatus() {
  const now = Date.now();
  const entries = Array.from(cooldownMap.entries()).filter(([, expireAt]) => expireAt > now).map(([symbol, expireAt]) => ({
    symbol,
    remainingMs: expireAt - now,
    remainingMinutes: Number(((expireAt - now) / 6e4).toFixed(2)),
    expireAt: new Date(expireAt)
  }));
  return {
    count: entries.length,
    items: entries
  };
}
function markCooldown(symbol, minutes = 30) {
  const normalized = normalizeSymbol2(symbol);
  cooldownMap.set(normalized, Date.now() + minutes * 6e4);
  return { symbol: normalized, minutes };
}
async function fetchBtcKlines(interval = "1h", limit = 48) {
  const res = await fetch(`https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=${interval}&limit=${limit}`);
  if (!res.ok) throw new Error(`\u83B7\u53D6 BTC K \u7EBF\u5931\u8D25: ${res.status}`);
  return await res.json();
}
async function getBtcTrend() {
  try {
    const klines = await fetchBtcKlines("1h", 48);
    const closes = klines.map((item) => Number(item[4]));
    const ma9 = closes.slice(-9).reduce((s, v) => s + v, 0) / 9;
    const ma21 = closes.slice(-21).reduce((s, v) => s + v, 0) / 21;
    const latest = closes[closes.length - 1] ?? ma9;
    if (latest > ma9 && ma9 > ma21) return "up";
    if (latest < ma9 && ma9 < ma21) return "down";
    return "sideways";
  } catch {
    return "sideways";
  }
}
function calcDynamicPositionPercent(scorePercent, basePercent = 1, maxPercent = 5) {
  const normalizedScore = clamp3(scorePercent, 0, 100);
  if (normalizedScore <= 60) return Number(basePercent.toFixed(2));
  const factor = 1 + (normalizedScore - 60) / 30 * 4;
  return Number(clamp3(basePercent * factor, basePercent, maxPercent).toFixed(2));
}
function calcDynamicStopLoss(scorePercent, baseStopLossPercent = 3) {
  const normalizedScore = clamp3(scorePercent, 0, 100);
  const tighten = (normalizedScore - 60) / 40 * 1.2;
  return Number(clamp3(baseStopLossPercent - Math.max(0, tighten), 1, baseStopLossPercent).toFixed(2));
}
function calcDynamicTakeProfit(dynamicStopLossPercent, tp1 = 5, tp2 = 10) {
  const ratio = dynamicStopLossPercent / 3;
  return {
    takeProfit1: Number(Math.max(tp1 * ratio, dynamicStopLossPercent * 1.5).toFixed(2)),
    takeProfit2: Number(Math.max(tp2 * ratio, dynamicStopLossPercent * 2.5).toFixed(2))
  };
}
async function checkRisk(symbol, positionValue) {
  const cfg = await getActiveConfig();
  const positions2 = await getAllPositions();
  const todayStats = await getTodayStats();
  const openTrades = await getOpenTrades();
  const normalized = normalizeSymbol2(symbol);
  if (cfg?.emergencyStop) {
    return { ok: false, code: "EMERGENCY_STOP", reason: "\u7CFB\u7EDF\u5DF2\u5F00\u542F\u7D27\u6025\u505C\u6B62\uFF0C\u7981\u6B62\u65B0\u5F00\u4ED3" };
  }
  if (!cfg?.autoTradingEnabled) {
    return { ok: false, code: "AUTO_TRADING_DISABLED", reason: "\u81EA\u52A8\u4EA4\u6613\u672A\u5F00\u542F" };
  }
  const cooldown = cooldownMap.get(normalized);
  if (cooldown && cooldown > Date.now()) {
    return { ok: false, code: "COOLDOWN", reason: `${normalized} \u5904\u4E8E\u51B7\u5374\u671F\uFF0C\u8BF7\u7A0D\u540E\u518D\u8BD5` };
  }
  if (positions2.some((p) => normalizeSymbol2(p.symbol) === normalized) || openTrades.some((t2) => normalizeSymbol2(t2.symbol) === normalized && t2.status === "open")) {
    return { ok: false, code: "DUPLICATE_POSITION", reason: `${normalized} \u5DF2\u5B58\u5728\u6301\u4ED3\u6216\u672A\u5E73\u4ED3\u4EA4\u6613` };
  }
  const minOrderUsdt = Number(cfg?.minOrderUsdt ?? 1);
  if (positionValue < minOrderUsdt) {
    return { ok: false, code: "ORDER_TOO_SMALL", reason: `\u4E0B\u5355\u91D1\u989D\u4F4E\u4E8E\u6700\u5C0F\u5F00\u4ED3\u91D1\u989D ${minOrderUsdt} USDT` };
  }
  const totalOpenExposure = positions2.reduce((sum, item) => sum + Math.abs(Number(item.currentPrice ?? item.entryPrice ?? 0) * Number(item.quantity ?? 0)), 0);
  const maxTotalPositionPercent = Number(cfg?.maxTotalPositionPercent ?? 50);
  const assumedEquity = Math.max(1e3, totalOpenExposure / Math.max(maxTotalPositionPercent / 100, 0.01));
  const totalRatio = (totalOpenExposure + positionValue) / assumedEquity * 100;
  if (totalRatio > maxTotalPositionPercent + 1e-3) {
    return { ok: false, code: "MAX_TOTAL_POSITION", reason: `\u603B\u6301\u4ED3\u5360\u6BD4\u5C06\u8FBE\u5230 ${totalRatio.toFixed(2)}%\uFF0C\u8D85\u8FC7\u4E0A\u9650 ${maxTotalPositionPercent}%` };
  }
  const maxDailyTrades = Number(cfg?.maxDailyTrades ?? 20);
  if (Number(todayStats?.totalTrades ?? 0) >= maxDailyTrades) {
    return { ok: false, code: "MAX_DAILY_TRADES", reason: `\u4ECA\u65E5\u4EA4\u6613\u6B21\u6570\u5DF2\u8FBE\u5230\u4E0A\u9650 ${maxDailyTrades}` };
  }
  const maxDailyLossPercent = Number(cfg?.maxDailyLossPercent ?? 5);
  const approxLossPct = Number(todayStats?.totalPnl ?? 0) < 0 ? Math.abs(Number(todayStats.totalPnl)) / Math.max(positionValue, 1) * 100 : 0;
  if (approxLossPct >= maxDailyLossPercent) {
    return { ok: false, code: "MAX_DAILY_LOSS", reason: `\u4ECA\u65E5\u4E8F\u635F\u4F30\u7B97\u5DF2\u8D85\u8FC7\u9608\u503C ${maxDailyLossPercent}%` };
  }
  return {
    ok: true,
    code: "OK",
    reason: "\u98CE\u63A7\u68C0\u67E5\u901A\u8FC7",
    limits: {
      minOrderUsdt,
      maxDailyTrades,
      maxDailyLossPercent,
      maxTotalPositionPercent
    }
  };
}

// server/valueScanSSEService.ts
import https from "https";
import { createHmac } from "crypto";
init_schema();
import { eq as eq2 } from "drizzle-orm";
var STREAM_BASE = "https://stream.valuescan.ai";
function buildSSEParams(extraParams = {}) {
  const apiKey = ENV.valueScanApiKey;
  const secretKey = ENV.valueScanSecretKey;
  if (!apiKey || !secretKey) {
    throw new Error("ValueScan API Key \u672A\u914D\u7F6E");
  }
  const ts = Date.now();
  const nonce = Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2);
  const sign = createHmac("sha256", secretKey).update(String(ts) + nonce).digest("hex");
  const params = new URLSearchParams({
    apiKey,
    sign,
    timestamp: String(ts),
    nonce,
    ...extraParams
  });
  return params.toString();
}
async function sendToTelegram(message) {
  try {
    const db2 = await getDb();
    if (!db2) return;
    const { telegramConfig: telegramConfig2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
    const configs = await db2.select().from(telegramConfig2).limit(1);
    const cfg = configs[0];
    if (!cfg?.isActive || !cfg.botToken || !cfg.chatId) return;
    const url = `https://api.telegram.org/bot${cfg.botToken}/sendMessage`;
    const body = JSON.stringify({
      chat_id: cfg.chatId,
      text: message,
      parse_mode: "HTML",
      disable_web_page_preview: true
    });
    await new Promise((resolve, reject) => {
      const req = https.request(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) }
      }, (res) => {
        res.resume();
        resolve();
      });
      req.on("error", reject);
      req.write(body);
      req.end();
    });
  } catch {
  }
}
function connectSSE(path2, queryString, onEvent, onError) {
  let destroyed = false;
  let retryCount = 0;
  function connect() {
    if (destroyed) return;
    const url = `${STREAM_BASE}${path2}?${queryString}`;
    const urlObj = new URL(url);
    const req = https.request({
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: "GET",
      headers: { Accept: "text/event-stream", "Cache-Control": "no-cache" },
      timeout: 31e4
      // 310s 超时（SSE 每20s心跳）
    }, (res) => {
      if (res.statusCode !== 200) {
        console.error(`[ValueScan SSE] ${path2} HTTP ${res.statusCode}`);
        res.resume();
        scheduleRetry();
        return;
      }
      retryCount = 0;
      let buffer = "";
      let eventName = "";
      res.on("data", (chunk) => {
        buffer += chunk.toString("utf8");
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          const trimmed = line.trimEnd();
          if (trimmed.startsWith(":")) {
          } else if (trimmed === "") {
            eventName = "";
          } else if (trimmed.startsWith("event:")) {
            eventName = trimmed.slice(6).trim();
          } else if (trimmed.startsWith("data:")) {
            const data = trimmed.slice(5).trim();
            if (eventName && data) {
              try {
                onEvent(eventName, data);
              } catch (e) {
                console.error("[ValueScan SSE] onEvent error:", e);
              }
            }
          }
        }
      });
      res.on("end", () => {
        if (!destroyed) scheduleRetry();
      });
      res.on("error", (err) => {
        if (!destroyed) {
          console.error("[ValueScan SSE] response error:", err.message);
          scheduleRetry();
        }
      });
    });
    req.on("error", (err) => {
      if (!destroyed) {
        console.error("[ValueScan SSE] request error:", err.message);
        scheduleRetry();
      }
    });
    req.on("timeout", () => {
      req.destroy();
    });
    req.end();
  }
  function scheduleRetry() {
    if (destroyed) return;
    retryCount++;
    const wait = Math.min(2 ** retryCount, 60) * 1e3;
    console.log(`[ValueScan SSE] \u5C06\u5728 ${wait / 1e3}s \u540E\u91CD\u8FDE (\u7B2C${retryCount}\u6B21)...`);
    setTimeout(() => {
      if (!destroyed) {
        try {
          const newQs = queryString.includes("tokens") ? buildSSEParams({ tokens: new URLSearchParams(queryString).get("tokens") ?? "" }) : buildSSEParams();
          queryString = newQs;
        } catch {
        }
        connect();
      }
    }, wait);
  }
  connect();
  return () => {
    destroyed = true;
  };
}
var marketSSEStop = null;
function startMarketAnalysisSSE() {
  if (marketSSEStop) return;
  const apiKey = ENV.valueScanApiKey;
  const secretKey = ENV.valueScanSecretKey;
  if (!apiKey || !secretKey) {
    console.warn("[ValueScan SSE] \u5927\u76D8\u5206\u6790\u8BA2\u9605\uFF1AAPI Key \u672A\u914D\u7F6E\uFF0C\u8DF3\u8FC7");
    return;
  }
  console.log("[ValueScan SSE] \u542F\u52A8\u5927\u76D8\u5206\u6790\u8BA2\u9605...");
  let qs;
  try {
    qs = buildSSEParams();
  } catch (e) {
    console.error("[ValueScan SSE] \u7B7E\u540D\u5931\u8D25:", e);
    return;
  }
  marketSSEStop = connectSSE(
    "/stream/market/subscribe",
    qs,
    async (eventName, data) => {
      if (eventName === "connected") {
        console.log("[ValueScan SSE] \u5927\u76D8\u5206\u6790\u5DF2\u8FDE\u63A5");
        return;
      }
      if (eventName !== "market") return;
      try {
        const payload = JSON.parse(data);
        const db2 = await getDb();
        if (!db2) return;
        const existing = await db2.select({ id: marketAnalysis.id }).from(marketAnalysis).where(eq2(marketAnalysis.uniqueId, payload.uniqueId)).limit(1);
        if (existing.length > 0) return;
        await db2.insert(marketAnalysis).values({
          uniqueId: payload.uniqueId,
          ts: payload.ts,
          content: payload.content,
          sentToTelegram: false
        });
        const time = new Date(payload.ts).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" });
        const msg = `\u{1F4CA} <b>AI \u5927\u76D8\u89E3\u6790</b>
\u23F0 ${time}

${payload.content.slice(0, 3e3)}`;
        await sendToTelegram(msg);
        await db2.update(marketAnalysis).set({ sentToTelegram: true }).where(eq2(marketAnalysis.uniqueId, payload.uniqueId));
        console.log(`[ValueScan SSE] \u5927\u76D8\u5206\u6790\u5DF2\u5B58\u50A8\u5E76\u63A8\u9001: ${payload.uniqueId}`);
      } catch (e) {
        console.error("[ValueScan SSE] \u5927\u76D8\u5206\u6790\u5904\u7406\u5931\u8D25:", e);
      }
    }
  );
}
var tokenSSEStop = null;
function startTokenSignalSSE(tokens = "") {
  if (tokenSSEStop) {
    tokenSSEStop();
    tokenSSEStop = null;
  }
  const apiKey = ENV.valueScanApiKey;
  const secretKey = ENV.valueScanSecretKey;
  if (!apiKey || !secretKey) {
    console.warn("[ValueScan SSE] \u4EE3\u5E01\u4FE1\u53F7\u8BA2\u9605\uFF1AAPI Key \u672A\u914D\u7F6E\uFF0C\u8DF3\u8FC7");
    return;
  }
  console.log(`[ValueScan SSE] \u542F\u52A8\u4EE3\u5E01\u4FE1\u53F7\u8BA2\u9605 tokens=${tokens || "\u5168\u90E8"}...`);
  let qs;
  try {
    qs = buildSSEParams({ tokens });
  } catch (e) {
    console.error("[ValueScan SSE] \u7B7E\u540D\u5931\u8D25:", e);
    return;
  }
  tokenSSEStop = connectSSE(
    "/stream/signal/subscribe",
    qs,
    async (eventName, data) => {
      if (eventName === "connected") {
        console.log("[ValueScan SSE] \u4EE3\u5E01\u4FE1\u53F7\u5DF2\u8FDE\u63A5");
        return;
      }
      if (eventName !== "signal") return;
      try {
        const payload = JSON.parse(data);
        const db2 = await getDb();
        if (!db2) return;
        const uniqueKey = payload.uniqueKey ?? `${payload.tokenId}_${payload.ts}`;
        const existing = await db2.select({ id: tokenSignals.id }).from(tokenSignals).where(eq2(tokenSignals.uniqueKey, uniqueKey)).limit(1);
        if (existing.length > 0) return;
        let contentObj = {};
        try {
          contentObj = JSON.parse(payload.content);
        } catch {
          contentObj = {};
        }
        const symbol = contentObj.symbol ?? "";
        const name = contentObj.name ?? "";
        const price = contentObj.price ?? "";
        const percentChange24h = contentObj.percentChange24h ?? 0;
        const scoring = contentObj.scoring ?? void 0;
        const grade = contentObj.grade ?? void 0;
        await db2.insert(tokenSignals).values({
          uniqueKey,
          tokenId: payload.tokenId,
          type: payload.type,
          symbol,
          name,
          price,
          percentChange24h,
          scoring: scoring ?? null,
          grade: grade ?? null,
          content: payload.content,
          ts: payload.ts,
          sentToTelegram: false
        });
        const typeLabel = payload.type === "OPPORTUNITY" ? "\u{1F7E2} \u673A\u4F1A\u4FE1\u53F7" : payload.type === "RISK" ? "\u{1F534} \u98CE\u9669\u4FE1\u53F7" : "\u{1F7E1} \u8D44\u91D1\u5F02\u52A8";
        const scoreStr = scoring ? ` \u5F97\u5206: ${scoring.toFixed(0)}` : "";
        const changeStr = percentChange24h ? ` 24h: ${percentChange24h > 0 ? "+" : ""}${percentChange24h.toFixed(2)}%` : "";
        const time = new Date(payload.ts).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" });
        const msg = `${typeLabel}
\u{1F48E} <b>${symbol}</b> (${name})
\u{1F4B0} \u4EF7\u683C: $${price}${changeStr}${scoreStr}
\u23F0 ${time}`;
        await sendToTelegram(msg);
        await db2.update(tokenSignals).set({ sentToTelegram: true }).where(eq2(tokenSignals.uniqueKey, uniqueKey));
        console.log(`[ValueScan SSE] \u4EE3\u5E01\u4FE1\u53F7\u5DF2\u5B58\u50A8: ${payload.type} ${symbol} ${uniqueKey}`);
        ;
      } catch (e) {
        console.error("[ValueScan SSE] \u4EE3\u5E01\u4FE1\u53F7\u5904\u7406\u5931\u8D25:", e);
      }
    }
  );
}

// server/valueScanService.ts
var TOKEN_REFRESH_INTERVAL_MS = 30 * 60 * 1e3;
var TOKEN_STALE_AFTER_MS = 28 * 60 * 1e3;
var FUNDS_MOVEMENT_TYPE_MAP = {
  1: { name: "FOMO \u505A\u591A", category: "fomo", direction: "long" },
  2: { name: "FOMO \u505A\u7A7A", category: "fomo", direction: "short" },
  3: { name: "Alpha \u505A\u591A", category: "alpha", direction: "long" },
  4: { name: "Alpha \u505A\u7A7A", category: "alpha", direction: "short" },
  5: { name: "\u98CE\u9669 \u505A\u591A", category: "risk", direction: "long" },
  6: { name: "\u98CE\u9669 \u505A\u7A7A", category: "risk", direction: "short" },
  7: { name: "\u5DE8\u9CB8\u4E70\u5165", category: "whale", direction: "long" },
  8: { name: "\u5DE8\u9CB8\u5356\u51FA", category: "whale", direction: "short" },
  9: { name: "\u4EA4\u6613\u6240\u6D41\u5165", category: "exchange", direction: "short" },
  10: { name: "\u4EA4\u6613\u6240\u6D41\u51FA", category: "exchange", direction: "long" },
  11: { name: "\u5F02\u5E38\u6D41\u5165", category: "exchange", direction: "long" },
  12: { name: "\u5F02\u5E38\u6D41\u51FA", category: "exchange", direction: "short" },
  13: { name: "\u5927\u989D\u8F6C\u8D26", category: "whale", direction: "neutral" },
  100: { name: "\u4E0B\u8DCC\u9884\u8B66", category: "risk", direction: "short" },
  108: { name: "AI \u8FFD\u8E2A", category: "ai", direction: "neutral" },
  109: { name: "AI \u9884\u6D4B", category: "ai", direction: "neutral" },
  110: { name: "Alpha \u4FE1\u53F7", category: "alpha", direction: "long" },
  111: { name: "FOMO \u4FE1\u53F7", category: "fomo", direction: "long" },
  112: { name: "\u98CE\u9669\u4FE1\u53F7", category: "risk", direction: "short" },
  113: { name: "FOMO \u5F3A\u4FE1\u53F7", category: "fomo", direction: "long" },
  114: { name: "\u7EFC\u5408\u4FE1\u53F7", category: "mixed", direction: "neutral" }
};
var userToken = "";
var tokenSetAt = 0;
var autoRefreshTimer = null;
var tokenRefreshPromise = null;
var bootstrapPromise = null;
var bootstrapStartedAt = 0;
var backgroundSubscriptionsStarted = false;
var lastBootstrapError = "";
function isTokenFresh() {
  return Boolean(userToken) && Date.now() - tokenSetAt < TOKEN_STALE_AFTER_MS;
}
function normalizeSymbol3(symbol) {
  return String(symbol || "").replace(/[^A-Za-z0-9]/g, "").toUpperCase();
}
function buildMockFunds(symbols = ["BTC", "ETH", "SOL", "BNB", "XRP"]) {
  return symbols.map((symbol, index) => ({
    symbol,
    coinName: symbol,
    price: (100 + index * 20 + symbol.charCodeAt(0) % 10).toFixed(2),
    pushPrice: (96 + index * 18).toFixed(2),
    score: 66 + index * 4,
    direction: index % 4 === 3 ? "short" : "long",
    fundsMovementType: index % 4 === 3 ? 6 : 1,
    messageType: index % 2 === 0 ? 111 : 110,
    change24h: Number((Math.sin(index + 1) * 6 + 4).toFixed(2)),
    amount: 1e6 + index * 2e5,
    flowIn: 12e5 + index * 3e5,
    flowOut: 3e5 + index * 5e4,
    socialScore: 60 + index * 5,
    content: `${symbol} \u8D44\u91D1\u6D41\u5165\u589E\u5F3A\uFF0C\u5E02\u573A\u60C5\u7EEA\u6D3B\u8DC3`
  }));
}
function buildMockChance() {
  return [
    { symbol: "BTC", score: 88, direction: "long", price: "68000", pushPrice: "66200", opportunity: "\u8D8B\u52BF\u7A81\u7834", reason: "\u9F99\u5934\u5F3A\u52BF\uFF0C\u8D44\u91D1\u6301\u7EED\u6D41\u5165" },
    { symbol: "ETH", score: 82, direction: "long", price: "3600", pushPrice: "3515", opportunity: "\u806A\u660E\u94B1\u5E03\u5C40", reason: "Alpha \u6D3B\u8DC3\uFF0C\u653E\u91CF\u4E0A\u884C" },
    { symbol: "SOL", score: 79, direction: "long", price: "185", pushPrice: "179", opportunity: "\u9AD8 Beta \u8F6E\u52A8", reason: "\u677F\u5757\u8F6E\u52A8\u5F3A\u5316" }
  ];
}
function buildMockRisk() {
  return [
    { symbol: "DOGE", score: 38, direction: "short", price: "0.18", pushPrice: "0.20", riskLevel: "high", reason: "\u77ED\u671F\u8FC7\u70ED\uFF0C\u91CF\u4EF7\u80CC\u79BB" },
    { symbol: "WIF", score: 34, direction: "short", price: "3.12", pushPrice: "3.55", riskLevel: "high", reason: "\u8D44\u91D1\u6D41\u51FA\u52A0\u5FEB" }
  ];
}
function parseList(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.list)) return payload.list;
  if (Array.isArray(payload?.rows)) return payload.rows;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
}
function withMessage(data, message = "ok") {
  return { code: 200, msg: message, message, data, userRole: "API_KEY" };
}
async function getVsCredentials() {
  const cfg = await getActiveConfig();
  const apiKey = cfg?.vsApiKey || process.env.VALUESCAN_API_KEY || process.env.VS_API_KEY || ENV.valueScanApiKey || "";
  const secretKey = cfg?.vsSecretKey || process.env.VALUESCAN_SECRET_KEY || process.env.VS_SECRET_KEY || ENV.valueScanSecretKey || "";
  return { apiKey, secretKey, cfg };
}
async function resolveVSLoginCredentials(preferred) {
  if (preferred?.email && preferred?.password) {
    return {
      email: String(preferred.email).trim(),
      password: String(preferred.password),
      source: "input"
    };
  }
  const envEmail = String(process.env.VALUESCAN_EMAIL || "").trim();
  const envPassword = String(process.env.VALUESCAN_PASSWORD || "");
  if (envEmail && envPassword) {
    return {
      email: envEmail,
      password: envPassword,
      source: "env"
    };
  }
  const saved = await loadVSLoginCredentials();
  if (saved?.email && saved?.password) {
    return {
      email: String(saved.email).trim(),
      password: String(saved.password),
      source: "db"
    };
  }
  return { email: "", password: "", source: "none" };
}
async function requestValueScan(path2, init = {}, requireAuth = false) {
  const { apiKey, secretKey } = await getVsCredentials();
  const url = path2.startsWith("http") ? path2 : `https://api.valuescan.io${path2}`;
  const doRequest = async (token2 = "") => {
    const headers = new Headers(init.headers || {});
    headers.set("accept", "application/json");
    if (apiKey) headers.set("X-API-KEY", apiKey);
    if (secretKey) headers.set("X-SECRET-KEY", secretKey);
    if (requireAuth && token2) headers.set("authorization", `Bearer ${token2}`);
    const res2 = await fetch(url, { ...init, headers });
    const text2 = await res2.text();
    let json3 = null;
    try {
      json3 = text2 ? JSON.parse(text2) : null;
    } catch {
      json3 = { raw: text2 };
    }
    return { res: res2, json: json3 };
  };
  let token = "";
  if (requireAuth) {
    token = await ensureVSToken();
  }
  let { res, json: json2 } = await doRequest(token || userToken);
  if (requireAuth && res.status === 401) {
    token = await refreshValueScanToken(void 0, true).catch(() => "");
    if (token) {
      const retry = await doRequest(token);
      res = retry.res;
      json2 = retry.json;
    }
  }
  if (!res.ok) throw new Error(json2?.msg || json2?.message || `HTTP ${res.status}`);
  return json2;
}
function enrichCoin(item, fallbackType = 111) {
  const symbol = normalizeSymbol3(item?.symbol || item?.coin || item?.baseAsset || item?.token || item?.instId || "").replace(/USDT$/, "");
  const fundsMovementType = Number(item?.fundsMovementType ?? item?.type ?? fallbackType);
  const info = FUNDS_MOVEMENT_TYPE_MAP[fundsMovementType] ?? FUNDS_MOVEMENT_TYPE_MAP[fallbackType] ?? { name: "\u7EFC\u5408\u4FE1\u53F7", category: "mixed", direction: "neutral" };
  return {
    ...item,
    symbol,
    coinName: item?.coinName || item?.name || symbol,
    price: item?.price ?? item?.lastPrice ?? item?.close ?? "0",
    pushPrice: item?.pushPrice ?? item?.signalPrice ?? item?.openPrice ?? item?.price ?? "0",
    score: Number(item?.score ?? item?.confidence ?? item?.rating ?? 70),
    direction: item?.direction ?? info.direction,
    fundsMovementType,
    messageType: Number(item?.messageType ?? item?.type ?? fallbackType),
    change24h: item?.change24h ?? item?.priceChangePercent24h ?? item?.change ?? 0,
    content: item?.content ?? item?.description ?? info.name,
    amount: item?.amount ?? item?.tradeAmount ?? item?.netFlow ?? 0,
    flowIn: item?.flowIn ?? item?.buyAmount ?? item?.inflow ?? 0,
    flowOut: item?.flowOut ?? item?.sellAmount ?? item?.outflow ?? 0,
    socialScore: Number(item?.socialScore ?? item?.sentimentScore ?? 0)
  };
}
async function setVSToken(token) {
  userToken = token;
  tokenSetAt = Date.now();
  const cfg = await getActiveConfig();
  if (cfg?.id) {
    await updateStrategyConfig(cfg.id, { vsUserToken: token, vsTokenSetAt: tokenSetAt });
  }
  return true;
}
function getVSToken() {
  return userToken;
}
function getVSTokenStatus() {
  return {
    apiKeyOk: Boolean(process.env.VALUESCAN_API_KEY || process.env.VS_API_KEY || ENV.valueScanApiKey),
    hasUserToken: Boolean(userToken),
    tokenSetAt,
    tokenAgeMs: tokenSetAt ? Date.now() - tokenSetAt : null,
    autoRefreshRunning: autoRefreshTimer !== null,
    hasEnvLoginCredentials: Boolean(process.env.VALUESCAN_EMAIL && process.env.VALUESCAN_PASSWORD),
    backgroundSubscriptionsStarted,
    bootstrapStartedAt,
    lastBootstrapError
  };
}
async function initVSTokenFromDB() {
  if (userToken) return userToken;
  if (ENV.valueScanToken) {
    userToken = ENV.valueScanToken;
    tokenSetAt = Date.now();
    return userToken;
  }
  const cfg = await getActiveConfig();
  if (cfg?.vsUserToken) {
    userToken = cfg.vsUserToken;
    tokenSetAt = Number(cfg.vsTokenSetAt ?? 0);
  }
  return userToken;
}
async function refreshValueScanToken(preferred, force = false) {
  if (!force && isTokenFresh()) {
    return userToken;
  }
  if (tokenRefreshPromise && !force) {
    return tokenRefreshPromise;
  }
  tokenRefreshPromise = (async () => {
    if (!force) {
      await initVSTokenFromDB();
      if (isTokenFresh()) {
        return userToken;
      }
    }
    const credentials = await resolveVSLoginCredentials(preferred);
    if (!credentials.email || !credentials.password) {
      if (userToken) {
        return userToken;
      }
      throw new Error("\u672A\u914D\u7F6E ValueScan \u767B\u5F55\u51ED\u8BC1");
    }
    const result = await loginValueScan(credentials.email, credentials.password);
    if (!result.success || !result.token) {
      throw new Error(result.msg || "ValueScan \u767B\u5F55\u5931\u8D25");
    }
    await setVSToken(result.token);
    return result.token;
  })().finally(() => {
    tokenRefreshPromise = null;
  });
  return tokenRefreshPromise;
}
async function ensureVSToken(forceRefresh = false) {
  if (!forceRefresh && isTokenFresh()) {
    return userToken;
  }
  await initVSTokenFromDB();
  if (!forceRefresh && userToken && Date.now() - tokenSetAt < TOKEN_REFRESH_INTERVAL_MS) {
    return userToken;
  }
  return refreshValueScanToken(void 0, forceRefresh);
}
async function getWarnMessages(pageNum = 1, pageSize = 20) {
  try {
    const json2 = await requestValueScan(`/api/v1/market/warn-messages?pageNum=${pageNum}&pageSize=${pageSize}`);
    const list = parseList(json2?.data ?? json2).map((item) => enrichCoin(item, 111));
    return withMessage(list);
  } catch {
    return withMessage(buildMockFunds().slice(0, pageSize), "mock");
  }
}
async function getAIMessages(pageNum = 1, pageSize = 20, filters = {}) {
  try {
    const params = new URLSearchParams({ pageNum: String(pageNum), pageSize: String(pageSize) });
    if (filters.symbol) params.set("symbol", String(filters.symbol));
    if (filters.messageType) params.set("messageType", String(filters.messageType));
    if (filters.fundsMovementType) params.set("fundsMovementType", String(filters.fundsMovementType));
    const json2 = await requestValueScan(`/api/v1/market/ai-messages?${params.toString()}`);
    const list = parseList(json2?.data?.list ?? json2?.data ?? json2).map((item) => enrichCoin(item, Number(item?.messageType ?? 108)));
    return {
      code: 200,
      msg: "ok",
      data: {
        total: Number(json2?.data?.total ?? list.length),
        list
      },
      userRole: "API_KEY"
    };
  } catch {
    const list = buildMockFunds(["BTC", "ETH", "SOL", "DOGE"]).map((item, idx) => ({ ...item, messageType: 108, score: 68 + idx * 5 }));
    return {
      code: 200,
      msg: "mock",
      data: {
        total: list.length,
        list: list.slice(0, pageSize)
      },
      userRole: "API_KEY"
    };
  }
}
async function getFearGreedIndex() {
  try {
    const json2 = await requestValueScan(`/api/v1/market/fear-greed`);
    const current = Number(json2?.data?.now ?? json2?.data?.value ?? json2?.now ?? 50);
    return {
      code: 200,
      msg: "ok",
      data: {
        now: current,
        yesterday: Number(json2?.data?.yesterday ?? current - 2),
        lastWeek: Number(json2?.data?.lastWeek ?? current - 5),
        source: "ValueScan"
      }
    };
  } catch {
    return {
      code: 200,
      msg: "mock",
      data: { now: 56, yesterday: 53, lastWeek: 49, source: "mock" }
    };
  }
}
async function getFundsCoinList() {
  try {
    const json2 = await requestValueScan(`/api/v1/market/funds-coins`);
    const list = parseList(json2?.data ?? json2).map((item) => enrichCoin(item, 111));
    return withMessage(list);
  } catch {
    return withMessage(buildMockFunds(), "mock");
  }
}
async function getChanceCoinList() {
  try {
    const json2 = await requestValueScan(`/api/v1/market/chance-coins`);
    const list = parseList(json2?.data ?? json2).map((item) => enrichCoin(item, 110));
    return withMessage(list);
  } catch {
    return withMessage(buildMockChance(), "mock");
  }
}
async function getRiskCoinList() {
  try {
    const json2 = await requestValueScan(`/api/v1/market/risk-coins`);
    const list = parseList(json2?.data ?? json2).map((item) => enrichCoin(item, 112));
    return withMessage(list);
  } catch {
    return withMessage(buildMockRisk(), "mock");
  }
}
async function getWarnMessageWithToken(pageNum = 1, pageSize = 20) {
  await initVSTokenFromDB();
  if (!userToken) {
    try {
      await ensureVSToken();
    } catch {
      return { code: 401, msg: "\u672A\u914D\u7F6E\u7528\u6237 Token", data: [], expired: false };
    }
  }
  try {
    const json2 = await requestValueScan(`/api/v1/user/warn-messages?pageNum=${pageNum}&pageSize=${pageSize}`, {}, true);
    const list = parseList(json2?.data ?? json2).map((item) => enrichCoin(item, 111));
    return { code: 200, msg: "ok", data: list, expired: false };
  } catch (error) {
    const expired = /401|expired|token/i.test(String(error?.message ?? ""));
    return { code: expired ? 401 : 500, msg: error?.message ?? "\u8BF7\u6C42\u5931\u8D25", data: [], expired };
  }
}
async function loginValueScan(email, password) {
  const normalizedEmail = String(email || "").trim();
  const normalizedPassword = String(password || "");
  if (!normalizedEmail || !normalizedPassword) {
    return { success: false, token: "", msg: "ValueScan \u767B\u5F55\u90AE\u7BB1\u6216\u5BC6\u7801\u4E3A\u7A7A" };
  }
  try {
    const json2 = await requestValueScan(`/api/v1/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: normalizedEmail, password: normalizedPassword })
    });
    const token = json2?.data?.token || json2?.token || json2?.data?.accessToken || "";
    if (token) {
      userToken = token;
      tokenSetAt = Date.now();
    }
    return { success: Boolean(token), token, msg: token ? "\u767B\u5F55\u6210\u529F" : "\u672A\u83B7\u53D6\u5230 Token" };
  } catch (error) {
    if (process.env.NODE_ENV === "production") {
      return { success: false, token: "", msg: error?.message || "ValueScan \u767B\u5F55\u5931\u8D25" };
    }
    const mockToken = `vs_mock_${Buffer.from(normalizedEmail).toString("base64url")}`;
    userToken = mockToken;
    tokenSetAt = Date.now();
    return { success: true, token: mockToken, msg: "\u5DF2\u5207\u6362\u5230\u79BB\u7EBF\u6A21\u62DF Token", isMock: true };
  }
}
function stopAutoRefreshTimer() {
  if (autoRefreshTimer) clearInterval(autoRefreshTimer);
  autoRefreshTimer = null;
}
function startAutoRefreshTimer(email, password) {
  stopAutoRefreshTimer();
  const runRefresh = async (force = false) => {
    try {
      const credentials = await resolveVSLoginCredentials({ email: email || "", password: password || "", source: "input" });
      if (!credentials.email || !credentials.password) {
        if (!userToken) {
          console.warn("[ValueScan] \u672A\u627E\u5230\u53EF\u7528\u767B\u5F55\u51ED\u8BC1\uFF0C\u8DF3\u8FC7 Token \u5237\u65B0");
        }
        return;
      }
      const token = await refreshValueScanToken(credentials, force);
      console.log(`[ValueScan] Token \u5DF2\u5237\u65B0\uFF0C\u6765\u6E90=${credentials.source}\uFF0C\u957F\u5EA6=${token.length}`);
    } catch (error) {
      console.error("[ValueScan] auto refresh failed:", error);
    }
  };
  void runRefresh(true);
  autoRefreshTimer = setInterval(() => {
    void runRefresh(true);
  }, TOKEN_REFRESH_INTERVAL_MS);
  return true;
}
function startValueScanSubscriptions() {
  if (backgroundSubscriptionsStarted) return;
  startMarketAnalysisSSE();
  startTokenSignalSSE("");
  backgroundSubscriptionsStarted = true;
}
async function bootstrapValueScanService() {
  if (backgroundSubscriptionsStarted && autoRefreshTimer) {
    return getVSTokenStatus();
  }
  if (bootstrapPromise) {
    return bootstrapPromise;
  }
  bootstrapPromise = (async () => {
    bootstrapStartedAt = Date.now();
    lastBootstrapError = "";
    try {
      await initVSTokenFromDB();
      const credentials = await resolveVSLoginCredentials();
      if (credentials.email && credentials.password) {
        console.log(`[ValueScan] \u4F7F\u7528 ${credentials.source} \u51ED\u8BC1\u81EA\u52A8\u767B\u5F55\u5E76\u542F\u52A8 30 \u5206\u949F\u5237\u65B0\u673A\u5236`);
        startAutoRefreshTimer(credentials.email, credentials.password);
      } else if (userToken) {
        console.log("[ValueScan] \u672A\u53D1\u73B0\u767B\u5F55\u51ED\u8BC1\uFF0C\u6CBF\u7528\u5DF2\u6301\u4E45\u5316 Token \u7EE7\u7EED\u8FD0\u884C");
      } else {
        console.warn("[ValueScan] \u672A\u914D\u7F6E\u767B\u5F55\u51ED\u8BC1\uFF0C\u4EC5\u542F\u52A8 API Key/SSE \u5728\u7EBF\u8BA2\u9605");
      }
      startValueScanSubscriptions();
      console.log("[ValueScan] \u5728\u7EBF\u63A5\u6536\u670D\u52A1\u5DF2\u542F\u52A8\uFF0C\u9ED8\u8BA4\u8BA2\u9605\u5168\u90E8\u4FE1\u53F7");
      return getVSTokenStatus();
    } catch (error) {
      lastBootstrapError = String(error?.message || error || "unknown error");
      console.error("[ValueScan] bootstrap failed:", error);
      startValueScanSubscriptions();
      return getVSTokenStatus();
    }
  })().finally(() => {
    bootstrapPromise = null;
  });
  return bootstrapPromise;
}

// server/newsService.ts
import axios from "axios";
import { parseStringPromise } from "xml2js";
var BULLISH_KEYWORDS = [
  // 价格上涨
  "surge",
  "rally",
  "soar",
  "spike",
  "jump",
  "rise",
  "gain",
  "pump",
  "breakout",
  "breakthrough",
  "all-time high",
  "ath",
  "new high",
  "record",
  "bull",
  "bullish",
  "moon",
  "skyrocket",
  "explode",
  "parabolic",
  // 正面事件
  "adoption",
  "approval",
  "approved",
  "etf",
  "institutional",
  "investment",
  "partnership",
  "integration",
  "launch",
  "upgrade",
  "milestone",
  "accumulate",
  "buy",
  "long",
  "support",
  "backing",
  "fund",
  "halving",
  "scarcity",
  "demand",
  "inflow",
  "positive",
  "recovery",
  "rebound",
  "bounce",
  "reversal",
  "bottom",
  "regulation clarity",
  "legal",
  "legitimate",
  "mainstream"
];
var BEARISH_KEYWORDS = [
  // 价格下跌
  "crash",
  "plunge",
  "dump",
  "drop",
  "fall",
  "decline",
  "collapse",
  "sell-off",
  "selloff",
  "correction",
  "bear",
  "bearish",
  "tank",
  "tumble",
  "slump",
  "slide",
  "dip",
  "low",
  "bottom",
  // 负面事件
  "ban",
  "banned",
  "crackdown",
  "hack",
  "hacked",
  "exploit",
  "stolen",
  "fraud",
  "scam",
  "rug pull",
  "liquidation",
  "liquidated",
  "bankruptcy",
  "bankrupt",
  "insolvency",
  "insolvent",
  "regulation",
  "regulatory",
  "sec",
  "lawsuit",
  "investigation",
  "outflow",
  "sell",
  "short",
  "resistance",
  "rejection",
  "fear",
  "panic",
  "uncertainty",
  "risk",
  "warning",
  "concern",
  "tariff",
  "trade war",
  "inflation",
  "recession"
];
var HIGH_IMPACT_KEYWORDS = [
  "bitcoin",
  "btc",
  "ethereum",
  "eth",
  "federal reserve",
  "fed",
  "sec",
  "etf",
  "halving",
  "blackrock",
  "microstrategy",
  "coinbase",
  "binance",
  "tether",
  "usdt",
  "stablecoin",
  "cbdc",
  "trump",
  "biden",
  "congress",
  "senate",
  "regulation",
  "hack",
  "exploit",
  "billion",
  "trillion"
];
var COIN_PATTERNS = {
  BTC: /\b(bitcoin|btc)\b/i,
  ETH: /\b(ethereum|eth)\b/i,
  SOL: /\b(solana|sol)\b/i,
  BNB: /\b(binance|bnb)\b/i,
  XRP: /\b(ripple|xrp)\b/i,
  ADA: /\b(cardano|ada)\b/i,
  DOGE: /\b(dogecoin|doge)\b/i,
  AVAX: /\b(avalanche|avax)\b/i,
  DOT: /\b(polkadot|dot)\b/i,
  LINK: /\b(chainlink|link)\b/i
};
function analyzeSentiment(title, summary) {
  const text2 = `${title} ${summary}`.toLowerCase();
  let bullishHits = 0;
  let bearishHits = 0;
  for (const kw of BULLISH_KEYWORDS) {
    if (text2.includes(kw)) bullishHits++;
  }
  for (const kw of BEARISH_KEYWORDS) {
    if (text2.includes(kw)) bearishHits++;
  }
  const rawScore = bullishHits - bearishHits;
  const score = Math.max(-10, Math.min(10, rawScore * 2));
  let sentiment = "neutral";
  if (score >= 2) sentiment = "bullish";
  else if (score <= -2) sentiment = "bearish";
  const highImpactHits = HIGH_IMPACT_KEYWORDS.filter((kw) => text2.includes(kw)).length;
  const impact = highImpactHits >= 3 ? "high" : highImpactHits >= 1 ? "medium" : "low";
  const coins = [];
  for (const [coin, pattern] of Object.entries(COIN_PATTERNS)) {
    if (pattern.test(text2)) coins.push(coin);
  }
  if (coins.length === 0) coins.push("BTC");
  return { sentiment, score, impact, coins };
}
var RSS_SOURCES = [
  {
    name: "CoinDesk",
    url: "https://www.coindesk.com/arc/outboundfeeds/rss/?outputType=xml",
    weight: 1.2
    // 权威性权重
  },
  {
    name: "CoinTelegraph",
    url: "https://cointelegraph.com/rss",
    weight: 1.1
  },
  {
    name: "Decrypt",
    url: "https://decrypt.co/feed",
    weight: 1
  },
  {
    name: "CryptoNews",
    url: "https://cryptonews.com/news/feed/",
    weight: 0.9
  }
];
var UA = "Mozilla/5.0 (compatible; TradingKing/1.0)";
async function fetchRSSFeed(source) {
  try {
    const res = await axios.get(source.url, {
      headers: { "User-Agent": UA },
      timeout: 1e4,
      responseType: "text"
    });
    const parsed = await parseStringPromise(res.data, { explicitArray: false });
    const channel = parsed?.rss?.channel;
    if (!channel) return [];
    const rawItems = Array.isArray(channel.item) ? channel.item : [channel.item].filter(Boolean);
    return rawItems.slice(0, 20).map((item, idx) => {
      const title = (item.title || "").replace(/<[^>]*>/g, "").trim();
      const summary = (item.description || item["content:encoded"] || "").replace(/<[^>]*>/g, "").trim().slice(0, 300);
      const url = item.link || item.guid || "";
      const pubDate = item.pubDate || item["dc:date"] || "";
      const publishedAt = pubDate ? new Date(pubDate).getTime() : Date.now() - idx * 6e4;
      const { sentiment, score, impact, coins } = analyzeSentiment(title, summary);
      return {
        id: `${source.name}-${Buffer.from(url || title).toString("base64").slice(0, 16)}`,
        title,
        summary,
        url,
        source: source.name,
        publishedAt: isNaN(publishedAt) ? Date.now() - idx * 6e4 : publishedAt,
        sentiment,
        sentimentScore: Math.round(score * source.weight),
        coins,
        impact
      };
    });
  } catch (err) {
    console.warn(`[newsService] Failed to fetch ${source.name}:`, err.message);
    return [];
  }
}
var _cache = null;
var _cacheTime = 0;
var CACHE_TTL = 5 * 60 * 1e3;
async function getNewsSentiment(forceRefresh = false) {
  if (!forceRefresh && _cache && Date.now() - _cacheTime < CACHE_TTL) {
    return _cache;
  }
  const results = await Promise.allSettled(RSS_SOURCES.map(fetchRSSFeed));
  const allItems = [];
  for (const result of results) {
    if (result.status === "fulfilled") {
      allItems.push(...result.value);
    }
  }
  const seen = /* @__PURE__ */ new Set();
  const deduped = allItems.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  }).sort((a, b) => b.publishedAt - a.publishedAt).slice(0, 60);
  const bullishCount = deduped.filter((i) => i.sentiment === "bullish").length;
  const bearishCount = deduped.filter((i) => i.sentiment === "bearish").length;
  const neutralCount = deduped.filter((i) => i.sentiment === "neutral").length;
  const weightedScore = deduped.reduce((sum, item) => {
    const w = item.impact === "high" ? 2 : item.impact === "medium" ? 1.5 : 1;
    return sum + item.sentimentScore * w;
  }, 0);
  const maxPossible = deduped.length * 10 * 2;
  const normalizedScore = maxPossible > 0 ? Math.round(weightedScore / maxPossible * 100) : 0;
  const sentimentScore = Math.max(-100, Math.min(100, normalizedScore));
  let overallSentiment = "neutral";
  if (sentimentScore >= 15) overallSentiment = "bullish";
  else if (sentimentScore <= -15) overallSentiment = "bearish";
  const topBullish = deduped.filter((i) => i.sentiment === "bullish").sort((a, b) => {
    const impactOrder = { high: 3, medium: 2, low: 1 };
    return impactOrder[b.impact] - impactOrder[a.impact] || b.sentimentScore - a.sentimentScore;
  }).slice(0, 5);
  const topBearish = deduped.filter((i) => i.sentiment === "bearish").sort((a, b) => {
    const impactOrder = { high: 3, medium: 2, low: 1 };
    return impactOrder[b.impact] - impactOrder[a.impact] || a.sentimentScore - b.sentimentScore;
  }).slice(0, 5);
  _cache = {
    items: deduped,
    bullishCount,
    bearishCount,
    neutralCount,
    overallSentiment,
    sentimentScore,
    topBullish,
    topBearish,
    fetchedAt: Date.now()
  };
  _cacheTime = Date.now();
  return _cache;
}
async function getCoinNewsSentiment(symbol) {
  const summary = await getNewsSentiment();
  const coinItems = summary.items.filter(
    (item) => item.coins.includes(symbol.toUpperCase())
  );
  if (coinItems.length === 0) {
    return { sentiment: "neutral", score: 0, count: 0, items: [] };
  }
  const avgScore = coinItems.reduce((s, i) => s + i.sentimentScore, 0) / coinItems.length;
  const score = Math.round(avgScore);
  const sentiment = score >= 2 ? "bullish" : score <= -2 ? "bearish" : "neutral";
  return {
    sentiment,
    score,
    count: coinItems.length,
    items: coinItems.slice(0, 10)
  };
}

// server/routers.ts
import { TRPCError as TRPCError3 } from "@trpc/server";

// server/coinGlassService.ts
var COINGLASS_BASE = "https://open-api-v3.coinglass.com/api";
async function cgFetch(path2) {
  const res = await fetch(`${COINGLASS_BASE}${path2}`, {
    headers: { "CG-API-KEY": ENV.coinGlassApiKey }
  });
  if (!res.ok) throw new Error(`CoinGlass API error: ${res.status}`);
  const json2 = await res.json();
  if (json2.code !== "0" && json2.success !== true) {
    throw new Error(`CoinGlass error: ${json2.msg || "unknown"}`);
  }
  return json2.data;
}
async function getAllFundingRates() {
  const data = await cgFetch(`/futures/fundingRate/exchange-list?symbol=BTC`);
  if (Array.isArray(data)) return data;
  return [data];
}
async function getMultiFundingRates(symbols = ["BTC", "ETH", "SOL", "BNB", "XRP"]) {
  const all = await getAllFundingRates();
  const upperSymbols = symbols.map((s) => s.toUpperCase());
  return all.filter((d) => upperSymbols.includes(d.symbol));
}
async function getAllOpenInterestRaw() {
  const data = await cgFetch(`/futures/openInterest/exchange-list?symbol=BTC`);
  if (Array.isArray(data)) return data;
  return [data];
}
async function getMultiOpenInterest(symbols = ["BTC", "ETH", "SOL", "BNB", "XRP"]) {
  const all = await getAllOpenInterestRaw();
  const upperSymbols = symbols.map((s) => s.toUpperCase());
  const grouped = /* @__PURE__ */ new Map();
  for (const r of all) {
    if (upperSymbols.includes(r.symbol)) {
      if (!grouped.has(r.symbol)) grouped.set(r.symbol, []);
      grouped.get(r.symbol).push(r);
    }
  }
  return upperSymbols.filter((s) => grouped.has(s)).map((s) => {
    const records = grouped.get(s);
    const allRecord = records.find((r) => r.exchange === "All");
    return {
      symbol: s,
      total: allRecord?.openInterest ?? records.reduce((sum, r) => sum + (r.openInterest || 0), 0),
      totalAmount: allRecord?.openInterestAmount ?? 0,
      changePercent1h: allRecord?.openInterestChangePercent1h ?? 0,
      changePercent4h: allRecord?.openInterestChangePercent4h ?? 0,
      changePercent24h: allRecord?.openInterestChangePercent24h ?? 0,
      exchanges: records.filter((r) => r.exchange !== "All")
    };
  });
}
async function getLongShortRatio(symbol = "BTCUSDT") {
  try {
    const res = await fetch(
      `https://fapi.binance.com/futures/data/globalLongShortAccountRatio?symbol=${symbol}&period=1h&limit=1`,
      { signal: AbortSignal.timeout(8e3) }
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) return null;
    const latest = data[0];
    return {
      symbol,
      longShortRatio: parseFloat(latest.longShortRatio),
      longAccount: parseFloat(latest.longAccount),
      shortAccount: parseFloat(latest.shortAccount),
      timestamp: latest.timestamp
    };
  } catch {
    return null;
  }
}
async function getMultiLongShortRatio(symbols = ["BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT", "XRPUSDT"]) {
  const results = await Promise.allSettled(symbols.map((s) => getLongShortRatio(s)));
  return results.filter((r) => r.status === "fulfilled" && r.value !== null).map((r) => r.value);
}
async function getMarketOverview(symbols = ["BTC", "ETH", "SOL", "BNB", "XRP"]) {
  const [fundingRates, openInterests, longShortRatios] = await Promise.allSettled([
    getMultiFundingRates(symbols),
    getMultiOpenInterest(symbols),
    getMultiLongShortRatio(symbols.map((s) => `${s}USDT`))
  ]);
  return {
    fundingRates: fundingRates.status === "fulfilled" ? fundingRates.value : [],
    openInterests: openInterests.status === "fulfilled" ? openInterests.value : [],
    longShortRatios: longShortRatios.status === "fulfilled" ? longShortRatios.value : [],
    fetchedAt: Date.now()
  };
}

// server/binanceService.ts
import crypto from "node:crypto";
function toQuery(params) {
  return new URLSearchParams(
    Object.entries(params).filter(([, value]) => value !== void 0 && value !== null && value !== "").map(([key, value]) => [key, String(value)])
  ).toString();
}
var BinanceService = class {
  apiKey;
  secretKey;
  baseUrl;
  constructor(apiKey, secretKey, useTestnet = false) {
    this.apiKey = apiKey || "";
    this.secretKey = secretKey || "";
    this.baseUrl = useTestnet ? "https://testnet.binancefuture.com" : "https://fapi.binance.com";
  }
  sign(query) {
    return crypto.createHmac("sha256", this.secretKey).update(query).digest("hex");
  }
  async request(path2, method = "GET", params = {}, signed = false) {
    const baseParams = signed ? { ...params, timestamp: Date.now(), recvWindow: 5e3 } : { ...params };
    const query = toQuery(baseParams);
    const signedQuery = signed ? `${query}&signature=${this.sign(query)}` : query;
    const url = `${this.baseUrl}${path2}${signedQuery ? `?${signedQuery}` : ""}`;
    const headers = {};
    if (this.apiKey) headers["X-MBX-APIKEY"] = this.apiKey;
    const res = await fetch(url, { method, headers });
    const text2 = await res.text();
    const json2 = text2 ? JSON.parse(text2) : null;
    if (!res.ok) throw new Error(json2?.msg || `Binance HTTP ${res.status}`);
    return json2;
  }
  ping() {
    return this.request("/fapi/v1/ping").then(() => true).catch(() => false);
  }
  getAccountInfo() {
    return this.request("/fapi/v2/account", "GET", {}, true);
  }
  async getAccountBalance() {
    return this.request("/fapi/v2/balance", "GET", {}, true);
  }
  async getUSDTBalance() {
    const balances = await this.getAccountBalance();
    const usdt = balances.find((item) => item.asset === "USDT");
    return {
      asset: "USDT",
      walletBalance: Number(usdt?.balance ?? usdt?.walletBalance ?? 0),
      availableBalance: Number(usdt?.availableBalance ?? 0)
    };
  }
  async getPositions(symbol) {
    const rows = await this.request("/fapi/v2/positionRisk", "GET", symbol ? { symbol } : {}, true);
    return rows.filter((item) => Math.abs(Number(item.positionAmt ?? 0)) > 0 || !symbol);
  }
  getOpenPositions(symbol) {
    return this.getPositions(symbol);
  }
  getOpenOrders(symbol) {
    return this.request("/fapi/v1/openOrders", "GET", symbol ? { symbol } : {}, true);
  }
  cancelOrder(symbol, orderId) {
    return this.request("/fapi/v1/order", "DELETE", { symbol, orderId }, true);
  }
  setLeverage(symbol, leverage) {
    return this.request("/fapi/v1/leverage", "POST", { symbol, leverage }, true);
  }
  placeOrder(input) {
    return this.request("/fapi/v1/order", "POST", {
      symbol: input.symbol,
      side: input.side,
      type: input.type ?? "MARKET",
      quantity: input.quantity,
      reduceOnly: input.reduceOnly,
      price: input.price,
      stopPrice: input.stopPrice,
      timeInForce: input.timeInForce,
      positionSide: input.positionSide
    }, true);
  }
  async openLong(symbol, quantity, leverage) {
    if (leverage) await this.setLeverage(symbol, leverage);
    return this.placeOrder({ symbol, side: "BUY", type: "MARKET", quantity, positionSide: "LONG" });
  }
  async openShort(symbol, quantity, leverage) {
    if (leverage) await this.setLeverage(symbol, leverage);
    return this.placeOrder({ symbol, side: "SELL", type: "MARKET", quantity, positionSide: "SHORT" });
  }
  async closeAllPositions(symbol) {
    const positions2 = await this.getPositions(symbol);
    const results = [];
    for (const pos of positions2) {
      const qty = Math.abs(Number(pos.positionAmt ?? 0));
      if (!qty) continue;
      const side = Number(pos.positionAmt) > 0 ? "SELL" : "BUY";
      const positionSide = Number(pos.positionAmt) > 0 ? "LONG" : "SHORT";
      results.push(await this.placeOrder({ symbol: pos.symbol, side, quantity: qty, type: "MARKET", reduceOnly: true, positionSide }));
    }
    return results;
  }
};
function createBinanceService(apiKey, secretKey, useTestnet = false) {
  return new BinanceService(apiKey, secretKey, useTestnet);
}

// server/okxService.ts
import crypto2 from "crypto";
import axios2 from "axios";
var OKX_BASE = "https://www.okx.com";
var OKXService = class {
  client;
  apiKey;
  secretKey;
  passphrase;
  useDemo;
  constructor(config) {
    this.apiKey = config.apiKey;
    this.secretKey = config.secretKey;
    this.passphrase = config.passphrase;
    this.useDemo = config.useDemo ?? false;
    this.client = axios2.create({
      baseURL: OKX_BASE,
      timeout: 1e4,
      headers: { "Content-Type": "application/json" }
    });
  }
  /** 生成 ISO 时间戳 */
  getTimestamp() {
    return (/* @__PURE__ */ new Date()).toISOString();
  }
  /** HMAC-SHA256 签名 */
  sign(timestamp2, method, requestPath, body = "") {
    const message = `${timestamp2}${method.toUpperCase()}${requestPath}${body}`;
    return crypto2.createHmac("sha256", this.secretKey).update(message).digest("base64");
  }
  /** 构建请求头 */
  buildHeaders(method, path2, body = "") {
    const timestamp2 = this.getTimestamp();
    const sign = this.sign(timestamp2, method, path2, body);
    const headers = {
      "OK-ACCESS-KEY": this.apiKey,
      "OK-ACCESS-SIGN": sign,
      "OK-ACCESS-TIMESTAMP": timestamp2,
      "OK-ACCESS-PASSPHRASE": this.passphrase
    };
    if (this.useDemo) {
      headers["x-simulated-trading"] = "1";
    }
    return headers;
  }
  /** GET 请求 */
  async get(path2, params = {}) {
    const queryString = Object.entries(params).filter(([, v]) => v !== void 0 && v !== null).map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`).join("&");
    const fullPath = queryString ? `${path2}?${queryString}` : path2;
    const headers = this.buildHeaders("GET", fullPath);
    const res = await this.client.get(fullPath, { headers });
    if (res.data.code !== "0") {
      throw new Error(`OKX API Error: ${res.data.msg} (code: ${res.data.code})`);
    }
    return res.data.data;
  }
  /** POST 请求 */
  async post(path2, body) {
    const bodyStr = JSON.stringify(body);
    const headers = this.buildHeaders("POST", path2, bodyStr);
    const res = await this.client.post(path2, body, { headers });
    if (res.data.code !== "0") {
      const errMsg = res.data.data?.[0]?.sMsg ?? res.data.msg;
      throw new Error(`OKX API Error: ${errMsg} (code: ${res.data.code})`);
    }
    return res.data.data;
  }
  /** 测试连接 */
  async ping() {
    try {
      await axios2.get(`${OKX_BASE}/api/v5/public/time`, { timeout: 5e3 });
      return true;
    } catch {
      return false;
    }
  }
  /** 获取账户余额 */
  async getBalance(ccy = "USDT") {
    const data = await this.get("/api/v5/account/balance", { ccy });
    const details = data?.[0]?.details ?? [];
    const usdtDetail = details.find((d) => d.ccy === ccy);
    return {
      balance: parseFloat(usdtDetail?.bal ?? "0"),
      available: parseFloat(usdtDetail?.availBal ?? "0"),
      unrealizedPnl: parseFloat(usdtDetail?.upl ?? "0")
    };
  }
  /** 获取持仓 */
  async getPositions(instId) {
    const params = { instType: "SWAP" };
    if (instId) params.instId = instId;
    const data = await this.get("/api/v5/account/positions", params);
    return data.filter((p) => parseFloat(p.pos) !== 0);
  }
  /** 下单 */
  async placeOrder(order) {
    const body = {
      instId: order.instId,
      tdMode: order.tdMode,
      side: order.side,
      ordType: order.ordType,
      sz: order.sz
    };
    if (order.posSide) body.posSide = order.posSide;
    if (order.px) body.px = order.px;
    if (order.reduceOnly) body.reduceOnly = "true";
    if (order.clOrdId) body.clOrdId = order.clOrdId;
    if (order.tpTriggerPx) body.tpTriggerPx = order.tpTriggerPx;
    if (order.tpOrdPx) body.tpOrdPx = order.tpOrdPx;
    if (order.slTriggerPx) body.slTriggerPx = order.slTriggerPx;
    if (order.slOrdPx) body.slOrdPx = order.slOrdPx;
    const data = await this.post("/api/v5/trade/order", body);
    return { ordId: data[0].ordId, clOrdId: data[0].clOrdId };
  }
  /** 市价开多（买入做多） */
  async openLong(instId, sz, leverage) {
    if (leverage) await this.setLeverage(instId, leverage);
    return this.placeOrder({ instId, tdMode: "cross", side: "buy", posSide: "long", ordType: "market", sz });
  }
  /** 市价开空（卖出做空） */
  async openShort(instId, sz, leverage) {
    if (leverage) await this.setLeverage(instId, leverage);
    return this.placeOrder({ instId, tdMode: "cross", side: "sell", posSide: "short", ordType: "market", sz });
  }
  /** 市价平多 */
  async closeLong(instId, sz) {
    return this.placeOrder({ instId, tdMode: "cross", side: "sell", posSide: "long", ordType: "market", sz, reduceOnly: true });
  }
  /** 市价平空 */
  async closeShort(instId, sz) {
    return this.placeOrder({ instId, tdMode: "cross", side: "buy", posSide: "short", ordType: "market", sz, reduceOnly: true });
  }
  /** 一键平仓 */
  async closeAllPositions(instId) {
    const positions2 = await this.getPositions(instId);
    const results = [];
    for (const pos of positions2) {
      const sz = Math.abs(parseFloat(pos.pos)).toString();
      if (pos.posSide === "long") {
        results.push(await this.closeLong(pos.instId, sz));
      } else if (pos.posSide === "short") {
        results.push(await this.closeShort(pos.instId, sz));
      }
    }
    return results;
  }
  /** 撤单 */
  async cancelOrder(instId, ordId) {
    return this.post("/api/v5/trade/cancel-order", { instId, ordId });
  }
  /** 撤销所有挂单 */
  async cancelAllOrders(instId) {
    const orders = await this.getOpenOrders(instId);
    if (orders.length === 0) return [];
    const cancelList = orders.map((o) => ({ instId, ordId: o.ordId }));
    return this.post("/api/v5/trade/cancel-batch-orders", cancelList);
  }
  /** 获取当前挂单 */
  async getOpenOrders(instId) {
    const params = { instType: "SWAP" };
    if (instId) params.instId = instId;
    return this.get("/api/v5/trade/orders-pending", params);
  }
  /** 获取历史成交 */
  async getTradeHistory(instId, limit = 20) {
    return this.get("/api/v5/trade/fills", { instId, limit });
  }
  /** 设置杠杆 */
  async setLeverage(instId, lever, mgnMode = "cross") {
    return this.post("/api/v5/account/set-leverage", {
      instId,
      lever: String(lever),
      mgnMode
    });
  }
  /** 获取合约信息（最小下单量） */
  async getInstrumentInfo(instId) {
    const data = await this.get("/api/v5/public/instruments", { instType: "SWAP", instId });
    const inst = data?.[0];
    return {
      ctVal: parseFloat(inst?.ctVal ?? "0.01"),
      // 每张合约价值（BTC）
      minSz: parseFloat(inst?.minSz ?? "1"),
      // 最小下单张数
      lotSz: parseFloat(inst?.lotSz ?? "1")
      // 下单张数精度
    };
  }
  /** 将 USDT 金额转换为张数 */
  static async calcContractSize(usdtAmount, price, ctVal) {
    return Math.floor(usdtAmount / (price * ctVal));
  }
  /** 将 BTC-USDT 格式转为 OKX 合约格式 BTC-USDT-SWAP */
  static toInstId(symbol) {
    const base = symbol.replace("USDT", "").replace("-", "");
    return `${base}-USDT-SWAP`;
  }
};
function createOKXService(apiKey, secretKey, passphrase, useDemo = false) {
  return new OKXService({ apiKey, secretKey, passphrase, useDemo });
}

// server/bybitService.ts
import crypto3 from "crypto";
import axios3 from "axios";
var BYBIT_BASE = "https://api.bybit.com";
var BYBIT_TESTNET_BASE = "https://api-testnet.bybit.com";
var BybitService = class {
  client;
  apiKey;
  secretKey;
  constructor(config) {
    this.apiKey = config.apiKey;
    this.secretKey = config.secretKey;
    const baseURL = config.useTestnet ? BYBIT_TESTNET_BASE : BYBIT_BASE;
    this.client = axios3.create({ baseURL, timeout: 1e4 });
  }
  sign(timestamp2, params) {
    const message = `${timestamp2}${this.apiKey}5000${params}`;
    return crypto3.createHmac("sha256", this.secretKey).update(message).digest("hex");
  }
  async request(method, path2, params = {}) {
    const timestamp2 = Date.now().toString();
    let queryString = "";
    let body = "";
    if (method === "GET") {
      queryString = new URLSearchParams(params).toString();
    } else {
      body = JSON.stringify(params);
    }
    const signPayload = method === "GET" ? queryString : body;
    const signature = this.sign(timestamp2, signPayload);
    const headers = {
      "X-BAPI-API-KEY": this.apiKey,
      "X-BAPI-SIGN": signature,
      "X-BAPI-SIGN-BY": "2",
      "X-BAPI-TIMESTAMP": timestamp2,
      "X-BAPI-RECV-WINDOW": "5000",
      "Content-Type": "application/json"
    };
    const url = method === "GET" ? `${path2}?${queryString}` : path2;
    const response = await this.client.request({
      method,
      url,
      headers,
      data: method === "POST" ? body : void 0
    });
    if (response.data.retCode !== 0) {
      throw new Error(`Bybit API Error: ${response.data.retMsg} (code: ${response.data.retCode})`);
    }
    return response.data.result;
  }
  /** 获取账户余额 */
  async getBalance(accountType = "UNIFIED") {
    try {
      const result = await this.request(
        "GET",
        "/v5/account/wallet-balance",
        { accountType }
      );
      return result.list?.[0]?.coin ?? [];
    } catch (e) {
      console.error("[Bybit] getBalance error:", e.message);
      return [];
    }
  }
  /** 获取持仓 */
  async getPositions(category = "linear", symbol) {
    try {
      const params = { category, settleCoin: "USDT" };
      if (symbol) params.symbol = symbol;
      const result = await this.request(
        "GET",
        "/v5/position/list",
        params
      );
      return (result.list ?? []).filter((p) => parseFloat(p.size) !== 0);
    } catch (e) {
      console.error("[Bybit] getPositions error:", e.message);
      return [];
    }
  }
  /** 下单 */
  async placeOrder(params) {
    try {
      const result = await this.request(
        "POST",
        "/v5/order/create",
        params
      );
      return result;
    } catch (e) {
      console.error("[Bybit] placeOrder error:", e.message);
      return null;
    }
  }
  /** 取消订单 */
  async cancelOrder(category, symbol, orderId) {
    try {
      await this.request("POST", "/v5/order/cancel", { category, symbol, orderId });
      return true;
    } catch (e) {
      console.error("[Bybit] cancelOrder error:", e.message);
      return false;
    }
  }
  /** 获取未成交订单 */
  async getOpenOrders(category = "linear", symbol) {
    try {
      const params = { category };
      if (symbol) params.symbol = symbol;
      const result = await this.request(
        "GET",
        "/v5/order/realtime",
        params
      );
      return result.list ?? [];
    } catch (e) {
      console.error("[Bybit] getOpenOrders error:", e.message);
      return [];
    }
  }
  /** 设置杠杆 */
  async setLeverage(category, symbol, buyLeverage, sellLeverage) {
    try {
      await this.request("POST", "/v5/position/set-leverage", {
        category,
        symbol,
        buyLeverage,
        sellLeverage
      });
      return true;
    } catch (e) {
      if (e.message?.includes("110043")) return true;
      console.error("[Bybit] setLeverage error:", e.message);
      return false;
    }
  }
  /** 平仓（市价） */
  async closePosition(category, symbol, side, qty) {
    try {
      await this.placeOrder({
        category,
        symbol,
        side,
        orderType: "Market",
        qty,
        reduceOnly: true
      });
      return true;
    } catch (e) {
      console.error("[Bybit] closePosition error:", e.message);
      return false;
    }
  }
  /** 测试连接 */
  async testConnection() {
    try {
      const balances = await this.getBalance();
      const usdtBalance = balances.find((b) => b.coin === "USDT");
      return {
        success: true,
        message: `\u8FDE\u63A5\u6210\u529F\uFF0CUSDT\u4F59\u989D: ${usdtBalance ? parseFloat(usdtBalance.walletBalance).toFixed(2) : "0.00"}`
      };
    } catch (e) {
      return { success: false, message: e.message };
    }
  }
};
function createBybitService(config) {
  return new BybitService(config);
}

// server/gateService.ts
import crypto4 from "node:crypto";
function buildQuery(params) {
  return new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== void 0 && v !== null && v !== "").map(([k, v]) => [k, String(v)])
  ).toString();
}
var GateService = class {
  apiKey;
  secretKey;
  baseUrl;
  constructor(creds) {
    this.apiKey = creds.apiKey || "";
    this.secretKey = creds.secretKey || "";
    this.baseUrl = creds.baseUrl || "https://api.gateio.ws/api/v4";
  }
  sign(method, path2, queryString, body = "") {
    const ts = String(Math.floor(Date.now() / 1e3));
    const bodyHash = crypto4.createHash("sha512").update(body).digest("hex");
    const signString = [method, path2, queryString, bodyHash, ts].join("\n");
    const sign = crypto4.createHmac("sha512", this.secretKey).update(signString).digest("hex");
    return { ts, sign };
  }
  async request(method, path2, query = {}, body) {
    const queryString = buildQuery(query);
    const payload = body ? JSON.stringify(body) : "";
    const { ts, sign } = this.sign(method, path2, queryString, payload);
    const url = `${this.baseUrl}${path2}${queryString ? `?${queryString}` : ""}`;
    const res = await fetch(url, {
      method,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        KEY: this.apiKey,
        Timestamp: ts,
        SIGN: sign
      },
      body: payload || void 0
    });
    const text2 = await res.text();
    const json2 = text2 ? JSON.parse(text2) : null;
    if (!res.ok) throw new Error(json2?.label || json2?.message || `Gate HTTP ${res.status}`);
    return json2;
  }
  testConnection() {
    return this.getBalance().then(() => ({ success: true })).catch((e) => ({ success: false, error: e?.message || "\u8FDE\u63A5\u5931\u8D25" }));
  }
  async getBalance() {
    const rows = await this.request("GET", "/wallet/total_balance");
    const details = Array.isArray(rows) ? rows[0] : rows;
    const total = Number(details?.total?.amount || details?.details?.futures?.amount || details?.details?.spot?.amount || 0);
    const available = Number(details?.available?.amount || details?.details?.futures?.available || total || 0);
    return { balance: total, available };
  }
  async getUSDTBalance() {
    const res = await this.request("GET", "/futures/usdt/accounts");
    const row = Array.isArray(res) ? res[0] : res;
    return {
      currency: "USDT",
      balance: Number(row?.total || row?.available || 0),
      available: Number(row?.available || row?.total || 0)
    };
  }
  getPositions(settle = "usdt") {
    return this.request("GET", `/futures/${settle}/positions`);
  }
  placeOrder(settle = "usdt", order) {
    return this.request("POST", `/futures/${settle}/orders`, {}, order);
  }
  async setLeverage(contract, leverage) {
    return this.request("POST", `/futures/usdt/positions/${encodeURIComponent(contract)}/leverage`, {}, { leverage: String(leverage) });
  }
  async openLong(symbol, quantity, leverage = 5) {
    const contract = symbol.toUpperCase().includes("_") ? symbol.toUpperCase() : `${symbol.toUpperCase().replace(/USDT$/, "")}_USDT`;
    await this.setLeverage(contract, leverage);
    return this.placeOrder("usdt", { contract, size: String(Math.abs(Number(quantity))), price: "0", tif: "ioc" });
  }
  async openShort(symbol, quantity, leverage = 5) {
    const contract = symbol.toUpperCase().includes("_") ? symbol.toUpperCase() : `${symbol.toUpperCase().replace(/USDT$/, "")}_USDT`;
    await this.setLeverage(contract, leverage);
    return this.placeOrder("usdt", { contract, size: String(-Math.abs(Number(quantity))), price: "0", tif: "ioc" });
  }
  async closePosition(settle = "usdt", contract, size) {
    const positions2 = await this.getPositions(settle);
    const found = positions2.find((p) => p.contract === contract || p.symbol === contract);
    const currentSize = Number(size ?? found?.size ?? 0);
    if (!currentSize) return { success: true, message: "\u65E0\u6301\u4ED3\u53EF\u5E73" };
    return this.placeOrder(settle, { contract, size: String(currentSize > 0 ? -Math.abs(currentSize) : Math.abs(currentSize)), price: "0", tif: "ioc", reduce_only: true });
  }
  async closeAllPositions(symbol) {
    const positions2 = await this.getPositions("usdt");
    const filtered = symbol ? positions2.filter((p) => p.contract === symbol || p.contract === `${symbol.toUpperCase().replace(/USDT$/, "")}_USDT`) : positions2;
    const results = [];
    for (const pos of filtered) {
      const size = Number(pos.size ?? 0);
      if (!size) continue;
      results.push(await this.placeOrder("usdt", { contract: pos.contract, size: String(size > 0 ? -Math.abs(size) : Math.abs(size)), price: "0", tif: "ioc", reduce_only: true }));
    }
    return results;
  }
};
function createGateService(creds) {
  return new GateService(creds);
}

// server/bitgetService.ts
import crypto5 from "crypto";
import axios4 from "axios";
var BITGET_BASE = "https://api.bitget.com";
var BitgetService = class {
  client;
  apiKey;
  secretKey;
  passphrase;
  constructor(config) {
    this.apiKey = config.apiKey;
    this.secretKey = config.secretKey;
    this.passphrase = config.passphrase;
    this.client = axios4.create({ baseURL: BITGET_BASE, timeout: 1e4 });
  }
  sign(timestamp2, method, path2, body) {
    const message = `${timestamp2}${method.toUpperCase()}${path2}${body}`;
    return crypto5.createHmac("sha256", this.secretKey).update(message).digest("base64");
  }
  async request(method, path2, params = {}) {
    const timestamp2 = Date.now().toString();
    let queryString = "";
    let body = "";
    if (method === "GET") {
      queryString = new URLSearchParams(params).toString();
    } else {
      body = JSON.stringify(params);
    }
    const fullPath = queryString ? `${path2}?${queryString}` : path2;
    const signature = this.sign(timestamp2, method, fullPath, body);
    const headers = {
      "ACCESS-KEY": this.apiKey,
      "ACCESS-SIGN": signature,
      "ACCESS-TIMESTAMP": timestamp2,
      "ACCESS-PASSPHRASE": this.passphrase,
      "Content-Type": "application/json",
      "locale": "zh-CN"
    };
    const response = await this.client.request({
      method,
      url: fullPath,
      headers,
      data: method === "POST" ? body : void 0
    });
    if (response.data.code !== "00000") {
      throw new Error(`Bitget API Error: ${response.data.msg} (code: ${response.data.code})`);
    }
    return response.data.data;
  }
  /** 获取账户余额 */
  async getBalance(productType = "USDT-FUTURES", marginCoin = "USDT") {
    try {
      const result = await this.request("GET", "/api/v2/mix/account/account", {
        productType,
        marginCoin
      });
      return result?.[0] ?? null;
    } catch (e) {
      console.error("[Bitget] getBalance error:", e.message);
      return null;
    }
  }
  /** 获取持仓 */
  async getPositions(productType = "USDT-FUTURES", marginCoin = "USDT") {
    try {
      const result = await this.request("GET", "/api/v2/mix/position/all-position", {
        productType,
        marginCoin
      });
      return (result ?? []).filter((p) => parseFloat(p.total) !== 0);
    } catch (e) {
      console.error("[Bitget] getPositions error:", e.message);
      return [];
    }
  }
  /** 下单 */
  async placeOrder(params) {
    try {
      return await this.request("POST", "/api/v2/mix/order/place-order", params);
    } catch (e) {
      console.error("[Bitget] placeOrder error:", e.message);
      return null;
    }
  }
  /** 取消订单 */
  async cancelOrder(symbol, productType, orderId) {
    try {
      await this.request("POST", "/api/v2/mix/order/cancel-order", { symbol, productType, orderId });
      return true;
    } catch (e) {
      console.error("[Bitget] cancelOrder error:", e.message);
      return false;
    }
  }
  /** 获取未成交订单 */
  async getOpenOrders(productType = "USDT-FUTURES", symbol) {
    try {
      const params = { productType };
      if (symbol) params.symbol = symbol;
      const result = await this.request(
        "GET",
        "/api/v2/mix/order/orders-pending",
        params
      );
      return result?.entrustedList ?? [];
    } catch (e) {
      console.error("[Bitget] getOpenOrders error:", e.message);
      return [];
    }
  }
  /** 设置杠杆 */
  async setLeverage(symbol, productType, marginCoin, leverage, holdSide) {
    try {
      const params = { symbol, productType, marginCoin, leverage };
      if (holdSide) params.holdSide = holdSide;
      await this.request("POST", "/api/v2/mix/account/set-leverage", params);
      return true;
    } catch (e) {
      console.error("[Bitget] setLeverage error:", e.message);
      return false;
    }
  }
  /** 平仓（市价） */
  async closePosition(symbol, productType, holdSide, size) {
    try {
      await this.placeOrder({
        symbol,
        productType,
        marginMode: "crossed",
        marginCoin: "USDT",
        size,
        side: holdSide === "long" ? "sell" : "buy",
        tradeSide: "close",
        orderType: "market"
      });
      return true;
    } catch (e) {
      console.error("[Bitget] closePosition error:", e.message);
      return false;
    }
  }
  /** 测试连接 */
  async testConnection() {
    try {
      const balance = await this.getBalance();
      if (!balance) return { success: false, message: "\u65E0\u6CD5\u83B7\u53D6\u8D26\u6237\u4F59\u989D" };
      return {
        success: true,
        message: `\u8FDE\u63A5\u6210\u529F\uFF0C\u6743\u76CA: ${parseFloat(balance.equity).toFixed(2)} USDT`
      };
    } catch (e) {
      return { success: false, message: e.message };
    }
  }
};
function createBitgetService(config) {
  return new BitgetService(config);
}

// server/paperTradingEngine.ts
init_schema();
import { eq as eq3 } from "drizzle-orm";
async function db() {
  return await getDb();
}
var BINANCE_BASE = "https://api.binance.com";
async function getBinancePrice(symbol) {
  try {
    const ticker = symbol.endsWith("USDT") ? symbol : `${symbol}USDT`;
    const res = await fetch(`${BINANCE_BASE}/api/v3/ticker/price?symbol=${ticker}`);
    if (!res.ok) return null;
    const data = await res.json();
    return parseFloat(data.price);
  } catch {
    return null;
  }
}
async function sendTg(message) {
  try {
    const cfg = await getTelegramConfig();
    if (!cfg?.botToken || !cfg?.chatId) return;
    await fetch(`https://api.telegram.org/bot${cfg.botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: cfg.chatId, text: message, parse_mode: "HTML" })
    });
  } catch (e) {
    console.error("[PaperTrading] Telegram \u63A8\u9001\u5931\u8D25:", e.message);
  }
}
async function getAccount() {
  const d = await db();
  if (!d) return null;
  const rows = await d.select().from(paperAccount).where(eq3(paperAccount.id, 1)).limit(1);
  return rows[0] ?? null;
}
async function updateAccount(updates) {
  const d = await db();
  if (!d) return;
  await d.update(paperAccount).set(updates).where(eq3(paperAccount.id, 1));
}
async function getPositions() {
  const d = await db();
  if (!d) return [];
  return d.select().from(paperPositions);
}
async function recordEquityCurve(totalBalance, unrealizedPnl, openPositions) {
  const d = await db();
  if (!d) return;
  await d.insert(paperEquityCurve).values({ totalBalance, unrealizedPnl, openPositions });
}
async function openPosition(symbol, direction, entryPrice, account, signalScore, triggerSignal) {
  const notionalValue = account.perTradeAmount ?? 500;
  const leverage = account.leverage ?? 5;
  const quantity = notionalValue * leverage / entryPrice;
  const slPct = account.stopLossPct ?? 3;
  const tpPct = account.takeProfitPct ?? 8;
  const stopLoss = direction === "long" ? entryPrice * (1 - slPct / 100) : entryPrice * (1 + slPct / 100);
  const takeProfit = direction === "long" ? entryPrice * (1 + tpPct / 100) : entryPrice * (1 - tpPct / 100);
  const margin = notionalValue;
  const newBalance = (account.balance ?? 1e4) - margin;
  if (newBalance < 0) {
    console.log(`[PaperTrading] \u4F59\u989D\u4E0D\u8DB3\uFF0C\u8DF3\u8FC7\u5F00\u4ED3 ${symbol}`);
    return;
  }
  const d2 = await db();
  if (!d2) return;
  await d2.insert(paperPositions).values({
    symbol,
    direction,
    entryPrice,
    currentPrice: entryPrice,
    quantity,
    notionalValue,
    leverage,
    stopLoss,
    takeProfit,
    unrealizedPnl: 0,
    unrealizedPnlPct: 0,
    signalScore,
    triggerSignal
  });
  await updateAccount({ balance: newBalance });
  const dirEmoji = direction === "long" ? "\u{1F7E2}" : "\u{1F534}";
  const dirLabel = direction === "long" ? "\u505A\u591A" : "\u505A\u7A7A";
  console.log(`[PaperTrading] ${dirEmoji} \u5F00\u4ED3 ${dirLabel} ${symbol} @ ${entryPrice.toFixed(4)}, \u8BC4\u5206: ${signalScore.toFixed(0)}`);
  const msg = `${dirEmoji} <b>\u{1F4CA} \u6A21\u62DF\u76D8\u5F00\u4ED3 - ${dirLabel}</b>

\u{1F48E} <b>${symbol}/USDT</b>
\u{1F4B0} \u5165\u573A\u4EF7: <b>$${entryPrice.toFixed(4)}</b>
\u{1F4CA} \u8BC4\u5206: <b>${signalScore.toFixed(0)}/100</b>
\u{1F3E6} \u4EA4\u6613\u6240: <b>\u6A21\u62DF\u76D8</b>
\u{1F4B5} \u6A21\u62DF\u4F59\u989D: <b>$${newBalance.toFixed(2)} USDT</b>
\u{1F6E1} \u6B62\u635F: $${stopLoss.toFixed(4)} (-${slPct}%)
\u{1F3AF} \u6B62\u76C8: $${takeProfit.toFixed(4)} (+${tpPct}%)
\u{1F4DD} ${triggerSignal.substring(0, 80)}
\u23F0 ${(/* @__PURE__ */ new Date()).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })}`;
  await sendTg(msg);
}
async function closePosition(position, exitPrice, closeReason, account) {
  const { symbol, direction, entryPrice, quantity, notionalValue, leverage, openedAt } = position;
  const lev = leverage || 5;
  let pnlPct;
  if (direction === "long") {
    pnlPct = (exitPrice - entryPrice) / entryPrice * lev * 100;
  } else {
    pnlPct = (entryPrice - exitPrice) / entryPrice * lev * 100;
  }
  const pnl = (notionalValue ?? 500) * (pnlPct / 100);
  const holdingMinutes = Math.round((Date.now() - new Date(openedAt).getTime()) / 6e4);
  const d3 = await db();
  if (!d3) return;
  await d3.insert(paperTrades).values({
    symbol,
    direction,
    entryPrice,
    exitPrice,
    quantity,
    notionalValue: notionalValue ?? 500,
    leverage: leverage ?? 5,
    pnl,
    pnlPct,
    closeReason,
    signalScore: position.signalScore,
    triggerSignal: position.triggerSignal ?? "",
    holdingMinutes,
    openedAt,
    closedAt: /* @__PURE__ */ new Date()
  });
  await d3.delete(paperPositions).where(eq3(paperPositions.id, position.id));
  const margin = notionalValue ?? 500;
  const returnedBalance = margin + pnl;
  const newBalance = (account.balance ?? 1e4) + returnedBalance;
  const newTotalPnl = (account.totalPnl ?? 0) + pnl;
  const newTotalTrades = (account.totalTrades ?? 0) + 1;
  const newWinTrades = pnl > 0 ? (account.winTrades ?? 0) + 1 : account.winTrades ?? 0;
  const newLossTrades = pnl <= 0 ? (account.lossTrades ?? 0) + 1 : account.lossTrades ?? 0;
  const remainingPositions = await getPositions();
  const unrealizedTotal = remainingPositions.reduce((sum, p) => sum + (p.unrealizedPnl ?? 0), 0);
  const totalBalance = newBalance + unrealizedTotal + remainingPositions.reduce((sum, p) => sum + (p.notionalValue ?? 500), 0);
  const newPeakBalance = Math.max(account.peakBalance ?? 1e4, totalBalance);
  const drawdown = newPeakBalance > 0 ? (newPeakBalance - totalBalance) / newPeakBalance * 100 : 0;
  const newMaxDrawdown = Math.max(account.maxDrawdown ?? 0, drawdown);
  const newTotalPnlPct = (totalBalance - (account.initialBalance ?? 1e4)) / (account.initialBalance ?? 1e4) * 100;
  await updateAccount({
    balance: newBalance,
    totalBalance,
    totalPnl: newTotalPnl,
    totalPnlPct: newTotalPnlPct,
    totalTrades: newTotalTrades,
    winTrades: newWinTrades,
    lossTrades: newLossTrades,
    peakBalance: newPeakBalance,
    maxDrawdown: newMaxDrawdown
  });
  const pnlEmoji = pnl > 0 ? "\u{1F7E2}" : "\u{1F534}";
  const reasonMap = {
    take_profit: "\u{1F3AF} \u6B62\u76C8",
    stop_loss: "\u{1F6E1} \u6B62\u635F",
    manual: "\u{1F464} \u624B\u52A8",
    timeout: "\u23F0 \u8D85\u65F6",
    signal_reverse: "\u{1F504} \u4FE1\u53F7\u53CD\u8F6C"
  };
  console.log(`[PaperTrading] ${pnlEmoji} \u5E73\u4ED3 ${symbol} @ ${exitPrice.toFixed(4)}, PnL: ${pnl >= 0 ? "+" : ""}${pnl.toFixed(2)} USDT (${pnlPct >= 0 ? "+" : ""}${pnlPct.toFixed(2)}%), \u539F\u56E0: ${closeReason}`);
  const msg = `${pnlEmoji} <b>\u{1F4CA} \u6A21\u62DF\u76D8\u5E73\u4ED3 - ${reasonMap[closeReason] ?? closeReason}</b>

\u{1F48E} <b>${symbol}/USDT</b>
\u{1F4B0} \u5E73\u4ED3\u4EF7: <b>$${exitPrice.toFixed(4)}</b>
\u{1F4C8} \u76C8\u4E8F: <b>${pnl >= 0 ? "+" : ""}$${pnl.toFixed(2)} (${pnlPct >= 0 ? "+" : ""}${pnlPct.toFixed(2)}%)</b>
\u{1F3E6} \u4EA4\u6613\u6240: <b>\u6A21\u62DF\u76D8</b>
\u{1F4B5} \u6A21\u62DF\u4F59\u989D: <b>$${newBalance.toFixed(2)} USDT</b>
\u23F1 \u6301\u4ED3: ${holdingMinutes} \u5206\u949F
\u23F0 ${(/* @__PURE__ */ new Date()).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })}`;
  await sendTg(msg);
}
async function updatePositionsAndCheckSLTP(account) {
  const positions2 = await getPositions();
  if (positions2.length === 0) return;
  let totalUnrealized = 0;
  for (const pos of positions2) {
    const currentPrice = await getBinancePrice(pos.symbol);
    if (!currentPrice) continue;
    let unrealizedPnlPct;
    if (pos.direction === "long") {
      unrealizedPnlPct = (currentPrice - pos.entryPrice) / pos.entryPrice * (pos.leverage || 5) * 100;
    } else {
      unrealizedPnlPct = (pos.entryPrice - currentPrice) / pos.entryPrice * (pos.leverage || 5) * 100;
    }
    const unrealizedPnl = (pos.notionalValue ?? 500) * (unrealizedPnlPct / 100);
    totalUnrealized += unrealizedPnl;
    const dUpdate = await db();
    if (!dUpdate) continue;
    await dUpdate.update(paperPositions).set({ currentPrice, unrealizedPnl, unrealizedPnlPct, updatedAt: /* @__PURE__ */ new Date() }).where(eq3(paperPositions.id, pos.id));
    if (pos.takeProfit) {
      const hitTP = pos.direction === "long" ? currentPrice >= pos.takeProfit : currentPrice <= pos.takeProfit;
      if (hitTP) {
        const latestAccount2 = await getAccount();
        if (latestAccount2) await closePosition(pos, currentPrice, "take_profit", latestAccount2);
        continue;
      }
    }
    if (pos.stopLoss) {
      const hitSL = pos.direction === "long" ? currentPrice <= pos.stopLoss : currentPrice >= pos.stopLoss;
      if (hitSL) {
        const latestAccount2 = await getAccount();
        if (latestAccount2) await closePosition(pos, currentPrice, "stop_loss", latestAccount2);
        continue;
      }
    }
    const holdingMs = Date.now() - new Date(pos.openedAt).getTime();
    if (holdingMs > 4 * 60 * 60 * 1e3) {
      const latestAccount2 = await getAccount();
      if (latestAccount2) await closePosition(pos, currentPrice, "timeout", latestAccount2);
    }
  }
  const latestAccount = await getAccount();
  if (latestAccount) {
    const positionsAfter = await getPositions();
    const marginInUse = positionsAfter.reduce((sum, p) => sum + (p.notionalValue ?? 500), 0);
    const totalBalance = (latestAccount.balance ?? 1e4) + marginInUse + totalUnrealized;
    await updateAccount({ totalBalance });
  }
}
function evaluateVSSignal(item) {
  const isAlpha = item.alpha === true;
  const isFomo = item.fomo === true;
  const isFomoEscalation = item.fomoEscalation === true;
  const gains = item.gains ?? 0;
  const decline = item.decline ?? 0;
  const isShortSignal = item.tradeType === 2;
  if (isAlpha && (isFomo || isFomoEscalation)) {
    return {
      shouldTrade: true,
      direction: isShortSignal ? "short" : "long",
      score: 82,
      reason: `Alpha+${isFomoEscalation ? "FOMO\u5347\u6E29" : "FOMO"}\u53CC\u6807\u8BB0 (gains:${gains.toFixed(1)}%)`
    };
  }
  if (isAlpha && !isShortSignal) {
    return {
      shouldTrade: true,
      direction: "long",
      score: 72,
      reason: `Alpha\u4FE1\u53F7 \u505A\u591A\u65B9\u5411 \u6DA8\u5E45${gains.toFixed(1)}%`
    };
  }
  if (isFomoEscalation && !isShortSignal) {
    return {
      shouldTrade: true,
      direction: "long",
      score: 70,
      reason: `FOMO\u5347\u6E29\u4FE1\u53F7 \u505A\u591A\u65B9\u5411`
    };
  }
  if (isAlpha && isShortSignal) {
    return {
      shouldTrade: true,
      direction: "short",
      score: 68,
      reason: `Alpha\u505A\u7A7A\u4FE1\u53F7 \u8DCC\u5E45${decline.toFixed(1)}%`
    };
  }
  if (isFomo && !isShortSignal) {
    return {
      shouldTrade: true,
      direction: "long",
      score: 65,
      reason: `FOMO\u4FE1\u53F7 \u505A\u591A\u65B9\u5411`
    };
  }
  return { shouldTrade: false, direction: "long", score: 0, reason: "\u672A\u6EE1\u8DB3\u4EFB\u4F55\u7B56\u7565\u6761\u4EF6" };
}
var engineRunning = false;
var engineTimer = null;
var lastCycleTime = null;
var lastSignalCount = 0;
async function runPaperTradingCycle(force = false) {
  const account = await getAccount();
  if (!account) return;
  if (!force && !account.autoTradingEnabled) return;
  console.log("[PaperTrading] \u5F00\u59CB\u4EA4\u6613\u5468\u671F...");
  lastCycleTime = /* @__PURE__ */ new Date();
  await updatePositionsAndCheckSLTP(account);
  const latestAccount = await getAccount();
  if (!latestAccount || !force && !latestAccount.autoTradingEnabled) return;
  const currentPositions = await getPositions();
  if (currentPositions.length >= (latestAccount.maxPositions ?? 5)) {
    console.log(`[PaperTrading] \u6301\u4ED3\u5DF2\u6EE1 (${currentPositions.length}/${latestAccount.maxPositions})`);
    const unrealized = currentPositions.reduce((sum, p) => sum + (p.unrealizedPnl ?? 0), 0);
    await recordEquityCurve(latestAccount.totalBalance ?? 1e4, unrealized, currentPositions.length);
    return;
  }
  try {
    const [flowData, opportunityData] = await Promise.allSettled([
      getFundsCoinList(),
      getChanceCoinList()
    ]);
    const existingSymbols = new Set(currentPositions.map((p) => p.symbol));
    let signalCount = 0;
    let openedThisCycle = false;
    if (flowData.status === "fulfilled" && flowData.value?.data) {
      const list = Array.isArray(flowData.value.data) ? flowData.value.data : flowData.value.data?.list ?? [];
      signalCount += list.length;
      for (const item of list) {
        if (openedThisCycle) break;
        const sym = (item.symbol || "").replace("USDT", "").replace("/", "");
        if (!sym || existingSymbols.has(sym)) continue;
        const eval_ = evaluateVSSignal(item);
        if (!eval_.shouldTrade) {
          console.log(`[PaperTrading] ${sym} \u8DF3\u8FC7 (alpha:${item.alpha} fomo:${item.fomo} fomoEsc:${item.fomoEscalation} tradeType:${item.tradeType})`);
          continue;
        }
        console.log(`[PaperTrading] \u2705 ${sym} \u89E6\u53D1 (\u8BC4\u5206${eval_.score}): ${eval_.reason}`);
        const price = await getBinancePrice(sym);
        if (!price || price <= 0) continue;
        const margin = latestAccount.perTradeAmount ?? 500;
        if ((latestAccount.balance ?? 0) < margin) {
          console.log(`[PaperTrading] \u4F59\u989D\u4E0D\u8DB3 ${latestAccount.balance?.toFixed(2)} < ${margin}`);
          break;
        }
        const freshAccount = await getAccount();
        if (!freshAccount) break;
        await openPosition(sym, eval_.direction, price, freshAccount, eval_.score, eval_.reason);
        existingSymbols.add(sym);
        openedThisCycle = true;
      }
    }
    if (!openedThisCycle && opportunityData.status === "fulfilled" && opportunityData.value?.data) {
      const list = Array.isArray(opportunityData.value.data) ? opportunityData.value.data : opportunityData.value.data?.list ?? [];
      signalCount += list.length;
      for (const item of list) {
        if (openedThisCycle) break;
        const sym = (item.symbol || "").replace("USDT", "").replace("/", "");
        if (!sym || existingSymbols.has(sym)) continue;
        const vsScore = item.score ?? 0;
        if (vsScore < 70) continue;
        console.log(`[PaperTrading] \u2705 \u673A\u4F1A\u4EE3\u5E01 ${sym} \u8BC4\u5206 ${vsScore}\uFF0C\u5F00\u4ED3`);
        const price = await getBinancePrice(sym);
        if (!price || price <= 0) continue;
        const margin = latestAccount.perTradeAmount ?? 500;
        if ((latestAccount.balance ?? 0) < margin) break;
        const freshAccount = await getAccount();
        if (!freshAccount) break;
        await openPosition(sym, "long", price, freshAccount, vsScore, `\u673A\u4F1A\u4EE3\u5E01 \u8BC4\u5206${vsScore}`);
        existingSymbols.add(sym);
        openedThisCycle = true;
      }
    }
    lastSignalCount = signalCount;
    console.log(`[PaperTrading] \u672C\u8F6E\u4FE1\u53F7\u6570: ${signalCount}, \u5F00\u4ED3: ${openedThisCycle}`);
  } catch (err) {
    console.error("[PaperTrading] \u4FE1\u53F7\u83B7\u53D6\u5931\u8D25:", err);
  }
  const finalAccount = await getAccount();
  const finalPositions = await getPositions();
  if (finalAccount) {
    const unrealized = finalPositions.reduce((sum, p) => sum + (p.unrealizedPnl ?? 0), 0);
    await recordEquityCurve(finalAccount.totalBalance ?? 1e4, unrealized, finalPositions.length);
  }
}
function startPaperTradingEngine() {
  if (engineRunning) return;
  engineRunning = true;
  console.log("[PaperTrading] \u5F15\u64CE\u542F\u52A8 \u2705");
  const loop = async () => {
    if (!engineRunning) return;
    try {
      await runPaperTradingCycle();
    } catch (err) {
      console.error("[PaperTrading] \u5F15\u64CE\u9519\u8BEF:", err);
    }
    if (engineRunning) {
      engineTimer = setTimeout(loop, 3e4);
    }
  };
  loop();
}
function stopPaperTradingEngine() {
  engineRunning = false;
  if (engineTimer) {
    clearTimeout(engineTimer);
    engineTimer = null;
  }
  console.log("[PaperTrading] \u5F15\u64CE\u505C\u6B62 \u26D4");
}
function isEngineRunning() {
  return engineRunning;
}
function getEngineStatus() {
  return {
    running: engineRunning,
    lastCycleTime: lastCycleTime?.toISOString() ?? null,
    lastSignalCount
  };
}

// server/liveTradingEngine.ts
init_schema();
var BINANCE_BASE2 = "https://api.binance.com";
async function getPrice(symbol) {
  const attempts = [
    () => fetch(`${BINANCE_BASE2}/api/v3/ticker/price?symbol=${symbol.endsWith("USDT") ? symbol : symbol + "USDT"}`).then((r) => r.ok ? r.json() : null).then((d) => d ? parseFloat(d.price) : null),
    () => fetch(`https://www.okx.com/api/v5/market/ticker?instId=${symbol.endsWith("USDT") ? symbol.replace("USDT", "") + "-USDT-SWAP" : symbol + "-USDT-SWAP"}`).then((r) => r.ok ? r.json() : null).then((d) => d?.data?.[0]?.last ? parseFloat(d.data[0].last) : null)
  ];
  for (const attempt of attempts) {
    try {
      const price = await attempt();
      if (price && price > 0) return price;
    } catch {
    }
  }
  return null;
}
async function sendTg2(message) {
  try {
    const cfg = await getTelegramConfig();
    if (!cfg?.botToken || !cfg?.chatId) return;
    await fetch(`https://api.telegram.org/bot${cfg.botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: cfg.chatId, text: message, parse_mode: "HTML" })
    });
  } catch (e) {
    console.error("[LiveTrading] Telegram \u63A8\u9001\u5931\u8D25:", e.message);
  }
}
function evaluateVSSignal2(item) {
  const isAlpha = item.alpha === true;
  const isFomo = item.fomo === true;
  const isFomoEscalation = item.fomoEscalation === true;
  const gains = item.gains ?? 0;
  const decline = item.decline ?? 0;
  const isShortSignal = item.tradeType === 2;
  if (isAlpha && (isFomo || isFomoEscalation)) {
    return { shouldTrade: true, direction: isShortSignal ? "short" : "long", score: 82, reason: `Alpha+${isFomoEscalation ? "FOMO\u5347\u6E29" : "FOMO"}\u53CC\u6807\u8BB0 (gains:${gains.toFixed(1)}%)` };
  }
  if (isAlpha && !isShortSignal) {
    return { shouldTrade: true, direction: "long", score: 72, reason: `Alpha\u4FE1\u53F7 \u505A\u591A\u65B9\u5411 \u6DA8\u5E45${gains.toFixed(1)}%` };
  }
  if (isFomoEscalation && !isShortSignal) {
    return { shouldTrade: true, direction: "long", score: 70, reason: `FOMO\u5347\u6E29\u4FE1\u53F7 \u505A\u591A\u65B9\u5411` };
  }
  if (isAlpha && isShortSignal) {
    return { shouldTrade: true, direction: "short", score: 68, reason: `Alpha\u505A\u7A7A\u4FE1\u53F7 \u8DCC\u5E45${decline.toFixed(1)}%` };
  }
  if (isFomo && !isShortSignal) {
    return { shouldTrade: true, direction: "long", score: 65, reason: `FOMO\u4FE1\u53F7 \u505A\u591A\u65B9\u5411` };
  }
  return { shouldTrade: false, direction: "long", score: 0, reason: "\u672A\u6EE1\u8DB3\u4EFB\u4F55\u7B56\u7565\u6761\u4EF6" };
}
async function placeRealOrder(symbol, direction, price, config) {
  const exchange = config.selectedExchange ?? "binance";
  const leverage = config.leverage ?? 5;
  const positionPercent = config.autoTradingPositionPercent ?? 1;
  let balance = 100;
  try {
    if (exchange === "binance" || exchange === "both" || exchange === "all") {
      const svc = createBinanceService(config.binanceApiKey || process.env.BINANCE_API_KEY || "", config.binanceSecretKey || process.env.BINANCE_SECRET_KEY || "");
      const bal = await svc.getUSDTBalance();
      balance = bal?.available ?? 100;
    } else if (exchange === "okx") {
      const svc = createOKXService(config.okxApiKey || process.env.OKX_API_KEY || "", config.okxSecretKey || process.env.OKX_SECRET_KEY || "", config.okxPassphrase || process.env.OKX_PASSPHRASE || "");
      const bal = await svc.getBalance();
      balance = bal?.available ?? 100;
    }
  } catch {
  }
  const notional = balance * (positionPercent / 100) * leverage;
  const quantity = notional / price;
  if (quantity <= 0) return null;
  try {
    if (exchange === "binance" || exchange === "both" || exchange === "all") {
      const svc = createBinanceService(config.binanceApiKey || process.env.BINANCE_API_KEY || "", config.binanceSecretKey || process.env.BINANCE_SECRET_KEY || "");
      const sym = symbol.endsWith("USDT") ? symbol : symbol + "USDT";
      let order;
      if (direction === "long") {
        order = await svc.openLong(sym, parseFloat(quantity.toFixed(3)), leverage);
      } else {
        order = await svc.openShort(sym, parseFloat(quantity.toFixed(3)), leverage);
      }
      return { orderId: order.orderId?.toString() ?? "unknown", exchange: "binance", balance };
    } else if (exchange === "okx") {
      const svc = createOKXService(config.okxApiKey || process.env.OKX_API_KEY || "", config.okxSecretKey || process.env.OKX_SECRET_KEY || "", config.okxPassphrase || process.env.OKX_PASSPHRASE || "");
      const instId = symbol.replace("USDT", "") + "-USDT-SWAP";
      const sz = parseFloat(quantity.toFixed(0));
      let order;
      if (direction === "long") {
        order = await svc.openLong(instId, sz.toString());
      } else {
        order = await svc.openShort(instId, sz.toString());
      }
      return { orderId: order.ordId ?? "unknown", exchange: "okx", balance };
    } else if (exchange === "bybit") {
      const svc = createBybitService({ apiKey: config.bybitApiKey || "", secretKey: config.bybitSecretKey || "" });
      const sym = symbol.endsWith("USDT") ? symbol : symbol + "USDT";
      const qty = parseFloat(quantity.toFixed(3)).toString();
      const side = direction === "long" ? "Buy" : "Sell";
      const order = await svc.placeOrder({ category: "linear", symbol: sym, side, orderType: "Market", qty });
      return { orderId: order?.orderId ?? "unknown", exchange: "bybit", balance };
    }
  } catch (e) {
    console.error(`[LiveTrading] \u4E0B\u5355\u5931\u8D25 (${exchange}):`, e.message);
    return null;
  }
  return null;
}
async function recordLiveTrade(symbol, direction, price, quantity, score, orderId, exchange, config) {
  const db2 = await getDb();
  if (!db2) return;
  const leverage = config.leverage ?? 5;
  const notional = quantity * price / leverage;
  const slPct = config.stopLossPercent ?? 3;
  const tpPct = config.takeProfit1Percent ?? 8;
  const stopLoss = direction === "long" ? price * (1 - slPct / 100) : price * (1 + slPct / 100);
  const takeProfit1 = direction === "long" ? price * (1 + tpPct / 100) : price * (1 - tpPct / 100);
  const action = direction === "long" ? "OPEN_LONG" : "OPEN_SHORT";
  const [result] = await db2.insert(trades).values({
    symbol,
    action,
    quantity,
    entryPrice: price,
    stopLoss,
    takeProfit1,
    leverage,
    signalScore: score,
    status: "open",
    binanceOrderId: orderId,
    isTestnet: false
  });
  const tradeId = result.insertId;
  try {
    await db2.insert(positions).values({
      symbol,
      quantity,
      entryPrice: price,
      currentPrice: price,
      leverage,
      unrealizedPnl: 0,
      unrealizedPnlPercent: 0,
      stopLoss,
      takeProfit1,
      tradeId
    });
  } catch {
  }
  return tradeId;
}
var liveEngineRunning = false;
var liveEngineTimer = null;
var liveLastCycleTime = null;
var liveLastSignalCount = 0;
var liveLastOrderTime = null;
var cooldownMap2 = /* @__PURE__ */ new Map();
async function runLiveTradingCycle() {
  const config = await getActiveConfig();
  if (!config?.autoTradingEnabled) return;
  const minScore = config.minScoreThreshold ?? 60;
  console.log("[LiveTrading] \u5F00\u59CB\u5B9E\u76D8\u4EA4\u6613\u5468\u671F...");
  liveLastCycleTime = /* @__PURE__ */ new Date();
  const now = Date.now();
  for (const [sym, ts] of Array.from(cooldownMap2.entries())) {
    if (now - ts > 60 * 60 * 1e3) cooldownMap2.delete(sym);
  }
  try {
    const [flowData, opportunityData] = await Promise.allSettled([
      getFundsCoinList(),
      getChanceCoinList()
    ]);
    let signalCount = 0;
    let openedThisCycle = false;
    if (flowData.status === "fulfilled" && flowData.value?.data) {
      const list = Array.isArray(flowData.value.data) ? flowData.value.data : flowData.value.data?.list ?? [];
      signalCount += list.length;
      for (const item of list) {
        if (openedThisCycle) break;
        const sym = (item.symbol || "").replace("USDT", "").replace("/", "");
        if (!sym) continue;
        if (cooldownMap2.has(sym)) {
          console.log(`[LiveTrading] ${sym} \u5728\u51B7\u5374\u671F\u5185\uFF0C\u8DF3\u8FC7`);
          continue;
        }
        const eval_ = evaluateVSSignal2(item);
        if (!eval_.shouldTrade || eval_.score < minScore) {
          console.log(`[LiveTrading] ${sym} \u8DF3\u8FC7 (\u8BC4\u5206${eval_.score} < \u9608\u503C${minScore})`);
          continue;
        }
        console.log(`[LiveTrading] \u2705 ${sym} \u89E6\u53D1\u5B9E\u76D8 (\u8BC4\u5206${eval_.score}): ${eval_.reason}`);
        const price = await getPrice(sym);
        if (!price || price <= 0) continue;
        const order = await placeRealOrder(sym, eval_.direction, price, config);
        if (order) {
          const notional = (config.autoTradingPositionPercent ?? 1) / 100;
          await recordLiveTrade(sym, eval_.direction, price, notional, eval_.score, order.orderId, order.exchange, config);
          cooldownMap2.set(sym, Date.now());
          liveLastOrderTime = /* @__PURE__ */ new Date();
          openedThisCycle = true;
          const dirEmoji = eval_.direction === "long" ? "\u{1F7E2}" : "\u{1F534}";
          const dirLabel = eval_.direction === "long" ? "\u505A\u591A" : "\u505A\u7A7A";
          const msg = `${dirEmoji} <b>\u{1F534} \u5B9E\u76D8\u5F00\u4ED3 - ${dirLabel}</b>

\u{1F48E} <b>${sym}/USDT</b>
\u{1F4B0} \u5165\u573A\u4EF7: <b>$${price.toFixed(4)}</b>
\u{1F4CA} \u8BC4\u5206: <b>${eval_.score.toFixed(0)}/100</b>
\u{1F3E6} \u4EA4\u6613\u6240: <b>${order.exchange.toUpperCase()}</b>
\u{1F4B5} \u8D26\u6237\u4F59\u989D: <b>$${order.balance.toFixed(2)} USDT</b>
\u{1F511} \u8BA2\u5355ID: ${order.orderId}
\u{1F4DD} ${eval_.reason.substring(0, 80)}
\u23F0 ${(/* @__PURE__ */ new Date()).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })}`;
          await sendTg2(msg);
        } else {
          const msg = `\u26A0\uFE0F <b>\u5B9E\u76D8\u4E0B\u5355\u5931\u8D25</b>

\u{1F48E} ${sym}/USDT  \u8BC4\u5206: ${eval_.score}
\u{1F4DD} ${eval_.reason}
\u23F0 ${(/* @__PURE__ */ new Date()).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })}`;
          await sendTg2(msg);
        }
      }
    }
    if (!openedThisCycle && opportunityData.status === "fulfilled" && opportunityData.value?.data) {
      const list = Array.isArray(opportunityData.value.data) ? opportunityData.value.data : opportunityData.value.data?.list ?? [];
      signalCount += list.length;
      for (const item of list) {
        if (openedThisCycle) break;
        const sym = (item.symbol || "").replace("USDT", "").replace("/", "");
        if (!sym || cooldownMap2.has(sym)) continue;
        const vsScore = item.score ?? 0;
        if (vsScore < Math.max(minScore, 70)) continue;
        console.log(`[LiveTrading] \u2705 \u673A\u4F1A\u4EE3\u5E01 ${sym} \u8BC4\u5206 ${vsScore}\uFF0C\u5B9E\u76D8\u5F00\u4ED3`);
        const price = await getPrice(sym);
        if (!price || price <= 0) continue;
        const order = await placeRealOrder(sym, "long", price, config);
        if (order) {
          const notional = (config.autoTradingPositionPercent ?? 1) / 100;
          await recordLiveTrade(sym, "long", price, notional, vsScore, order.orderId, order.exchange, config);
          cooldownMap2.set(sym, Date.now());
          liveLastOrderTime = /* @__PURE__ */ new Date();
          openedThisCycle = true;
          const msg = `\u{1F7E2} <b>\u{1F534} \u5B9E\u76D8\u5F00\u4ED3 - \u505A\u591A</b>

\u{1F48E} <b>${sym}/USDT</b>
\u{1F4B0} \u5165\u573A\u4EF7: <b>$${price.toFixed(4)}</b>
\u{1F4CA} \u673A\u4F1A\u4EE3\u5E01\u8BC4\u5206: <b>${vsScore}/100</b>
\u{1F3E6} \u4EA4\u6613\u6240: <b>${order.exchange.toUpperCase()}</b>
\u{1F4B5} \u8D26\u6237\u4F59\u989D: <b>$${order.balance.toFixed(2)} USDT</b>
\u23F0 ${(/* @__PURE__ */ new Date()).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })}`;
          await sendTg2(msg);
        }
      }
    }
    liveLastSignalCount = signalCount;
    console.log(`[LiveTrading] \u672C\u8F6E\u4FE1\u53F7\u6570: ${signalCount}, \u5B9E\u76D8\u5F00\u4ED3: ${openedThisCycle}`);
  } catch (err) {
    console.error("[LiveTrading] \u5F15\u64CE\u9519\u8BEF:", err);
  }
}
function startLiveTradingEngine() {
  if (liveEngineRunning) return;
  liveEngineRunning = true;
  console.log("[LiveTrading] \u5B9E\u76D8\u5F15\u64CE\u542F\u52A8 \u2705");
  const loop = async () => {
    if (!liveEngineRunning) return;
    try {
      await runLiveTradingCycle();
    } catch (err) {
      console.error("[LiveTrading] \u5F15\u64CE\u5FAA\u73AF\u9519\u8BEF:", err);
    }
    if (liveEngineRunning) {
      liveEngineTimer = setTimeout(loop, 6e4);
    }
  };
  loop();
}
function stopLiveTradingEngine() {
  liveEngineRunning = false;
  if (liveEngineTimer) {
    clearTimeout(liveEngineTimer);
    liveEngineTimer = null;
  }
  console.log("[LiveTrading] \u5B9E\u76D8\u5F15\u64CE\u505C\u6B62 \u26D4");
}
function isLiveEngineRunning() {
  return liveEngineRunning;
}
function getLiveEngineStatus() {
  return {
    running: liveEngineRunning,
    lastCycleTime: liveLastCycleTime?.toISOString() ?? null,
    lastSignalCount: liveLastSignalCount,
    lastOrderTime: liveLastOrderTime?.toISOString() ?? null
  };
}

// server/freeDataService.ts
async function getJson(url, init) {
  const res = await fetch(url, {
    ...init,
    headers: {
      accept: "application/json",
      ...init?.headers ?? {}
    }
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
  return res.json();
}
function classifyFearGreed(value) {
  if (value >= 75) return "\u6781\u5EA6\u8D2A\u5A6A";
  if (value >= 55) return "\u8D2A\u5A6A";
  if (value >= 45) return "\u4E2D\u6027";
  if (value >= 25) return "\u6050\u60E7";
  return "\u6781\u5EA6\u6050\u60E7";
}
async function getFearGreedHistory(limit = 7) {
  try {
    const json2 = await getJson(`https://api.alternative.me/fng/?limit=${Math.max(1, limit)}`);
    return (json2?.data ?? []).map((item) => ({
      value: Number(item.value ?? 50),
      valueClass: item.value_classification ?? classifyFearGreed(Number(item.value ?? 50)),
      timestamp: Number(item.timestamp ?? 0),
      timeUntilUpdate: Number(item.time_until_update ?? 0)
    }));
  } catch {
    return Array.from({ length: Math.max(1, limit) }).map((_, index) => ({
      value: 50,
      valueClass: "\u4E2D\u6027",
      timestamp: Math.floor(Date.now() / 1e3) - index * 86400,
      timeUntilUpdate: 0
    }));
  }
}
async function getGlobalMarket() {
  try {
    const json2 = await getJson("https://api.coingecko.com/api/v3/global");
    const data = json2?.data ?? {};
    const totalMarketCapUsd = Number(data.total_market_cap?.usd ?? 0);
    const totalVolumeUsd = Number(data.total_volume?.usd ?? 0);
    const btcDominance = Number(data.market_cap_percentage?.btc ?? 0);
    const ethDominance = Number(data.market_cap_percentage?.eth ?? 0);
    const marketCapChange24h = Number(data.market_cap_change_percentage_24h_usd ?? 0);
    const activeCryptocurrencies = Number(data.active_cryptocurrencies ?? 0);
    return {
      totalMarketCapUsd,
      totalVolumeUsd,
      btcDominance,
      ethDominance,
      marketCapChange24h,
      activeCryptocurrencies,
      totalMarketCap: totalMarketCapUsd,
      totalVolume24h: totalVolumeUsd,
      activeCryptos: activeCryptocurrencies,
      markets: Number(data.markets ?? 0)
    };
  } catch {
    return {
      totalMarketCapUsd: 0,
      totalVolumeUsd: 0,
      btcDominance: 50,
      ethDominance: 18,
      marketCapChange24h: 0,
      activeCryptocurrencies: 0,
      totalMarketCap: 0,
      totalVolume24h: 0,
      activeCryptos: 0,
      markets: 0
    };
  }
}
async function getTrendingCoins() {
  try {
    const json2 = await getJson("https://api.coingecko.com/api/v3/search/trending");
    return (json2?.coins ?? []).map((item, idx) => ({
      symbol: String(item?.item?.symbol ?? "").toUpperCase(),
      name: item?.item?.name ?? "",
      marketCapRank: Number(item?.item?.market_cap_rank ?? 0),
      priceBtc: Number(item?.item?.price_btc ?? 0),
      thumb: item?.item?.thumb ?? "",
      score: idx + 1,
      priceChange24h: Number(item?.item?.data?.price_change_percentage_24h?.usd ?? 0)
    }));
  } catch {
    return [];
  }
}
async function getBinanceKlines(symbol, interval = "1h", limit = 100) {
  return getJson(`https://api.binance.com/api/v3/klines?symbol=${encodeURIComponent(symbol)}&interval=${interval}&limit=${limit}`);
}
async function getTechnicalScore(symbol, timeframe = "1h") {
  try {
    const klines = await getBinanceKlines(symbol, timeframe, 120);
    const closes = klines.map((k) => Number(k[4]));
    const price = closes.at(-1) ?? 0;
    const prev = closes.at(-25) ?? price;
    const ma20 = closes.slice(-20).reduce((a, b) => a + b, 0) / Math.max(1, closes.slice(-20).length);
    const changes = closes.slice(1).map((v, i) => v - closes[i]);
    const gains = changes.filter((v) => v > 0);
    const losses = changes.filter((v) => v < 0).map((v) => Math.abs(v));
    const avgGain = gains.reduce((a, b) => a + b, 0) / Math.max(1, gains.length);
    const avgLoss = losses.reduce((a, b) => a + b, 0) / Math.max(1, losses.length);
    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    const rsi = 100 - 100 / (1 + rs);
    const priceChange24h = prev ? (price - prev) / prev * 100 : 0;
    const maBias = ma20 ? (price - ma20) / ma20 * 100 : 0;
    let score = 50;
    score += Math.max(-20, Math.min(20, priceChange24h * 2));
    score += Math.max(-15, Math.min(15, maBias * 2));
    score += rsi > 55 ? 10 : rsi < 45 ? -10 : 0;
    score = Math.max(0, Math.min(100, score));
    return {
      symbol,
      timeframe,
      score,
      trend: score >= 60 ? "bullish" : score <= 40 ? "bearish" : "neutral",
      price,
      priceChange24h,
      rsi,
      maBias
    };
  } catch {
    return {
      symbol,
      timeframe,
      score: 50,
      trend: "neutral",
      price: 0,
      priceChange24h: 0,
      rsi: 50,
      maBias: 0
    };
  }
}
async function getOKXLongShortRatio(instId, period = "1H", limit = 20) {
  try {
    const json2 = await getJson(`https://www.okx.com/api/v5/rubik/stat/contracts/long-short-account-ratio-contract?ccy=${encodeURIComponent(instId.split("-")[0])}&period=${encodeURIComponent(period)}`);
    const rows = (json2?.data ?? []).slice(0, limit);
    return rows.map((row) => {
      const longAccount = Number(row.longAccount ?? row[2] ?? 0);
      const shortAccount = Number(row.shortAccount ?? row[3] ?? 0);
      const total = Math.max(1, longAccount + shortAccount);
      return {
        ts: Number(row.ts ?? row[0] ?? Date.now()),
        longShortRatio: Number(row.longShortRatio ?? row.ratio ?? row[1] ?? 1),
        longAccount,
        shortAccount,
        longPct: longAccount / total * 100,
        shortPct: shortAccount / total * 100
      };
    });
  } catch {
    return [];
  }
}
async function getOKXTakerRatio(instId, period = "1H", limit = 20) {
  try {
    const json2 = await getJson(`https://www.okx.com/api/v5/rubik/stat/taker-volume-contract?ccy=${encodeURIComponent(instId.split("-")[0])}&period=${encodeURIComponent(period)}`);
    const rows = (json2?.data ?? []).slice(0, limit);
    return rows.map((row) => {
      const buyVol = Number(row.buyVol ?? row[2] ?? 0);
      const sellVol = Number(row.sellVol ?? row[3] ?? 0);
      return {
        ts: Number(row.ts ?? row[0] ?? Date.now()),
        buyVol,
        sellVol,
        buySellRatio: sellVol === 0 ? 1 : buyVol / sellVol
      };
    });
  } catch {
    return [];
  }
}
function calcBullBearScore(input) {
  const bullScore = Math.max(
    0,
    (Number(input.fng ?? 50) - 50) * 0.35 + Number(input.marketCapChange24h ?? 0) * 2.5 + (Number(input.longShortRatio ?? 1) - 1) * 18 + (Number(input.takerBuySellRatio ?? 1) - 1) * 22 + Number(input.fundingRate ?? 0) * 2500 + Number(input.oiChange ?? 0) * 0.6 + (Number(input.technicalScore ?? 50) - 50) * 0.7 + Number(input.newsSentimentScore ?? 0) * 0.08 + Number(input.priceChange24h ?? 0) * 1.2
  );
  const bearScore = Math.max(
    0,
    (50 - Number(input.fng ?? 50)) * 0.35 + Math.max(0, -Number(input.marketCapChange24h ?? 0)) * 2.5 + Math.max(0, 1 - Number(input.longShortRatio ?? 1)) * 18 + Math.max(0, 1 - Number(input.takerBuySellRatio ?? 1)) * 22 + Math.max(0, -Number(input.fundingRate ?? 0)) * 2500 + Math.max(0, -Number(input.oiChange ?? 0)) * 0.6 + (50 - Number(input.technicalScore ?? 50)) * 0.7 + Math.max(0, -Number(input.newsSentimentScore ?? 0)) * 0.08 + Math.max(0, -Number(input.priceChange24h ?? 0)) * 1.2 + Math.max(0, Number(input.btcDominance ?? 50) - 55) * 0.6
  );
  const totalScore = Math.max(0, Math.min(100, 50 + bullScore - bearScore));
  const signal = totalScore >= 60 ? "LONG" : totalScore <= 40 ? "SHORT" : "NEUTRAL";
  const confidence = Math.min(100, Math.round(Math.abs(totalScore - 50) * 2));
  const recommendation = signal === "LONG" ? "\u504F\u591A\u64CD\u4F5C\uFF0C\u4F18\u5148\u8003\u8651\u987A\u52BF\u505A\u591A" : signal === "SHORT" ? "\u504F\u7A7A\u64CD\u4F5C\uFF0C\u4F18\u5148\u8003\u8651\u9AD8\u4F4D\u9632\u5B88\u6216\u56DE\u907F\u98CE\u9669" : "\u9707\u8361\u4E2D\u6027\uFF0C\u7B49\u5F85\u66F4\u660E\u786E\u65B9\u5411";
  const entryAdvice = signal === "LONG" ? "\u5173\u6CE8\u56DE\u8E29\u652F\u6491\u540E\u7684\u653E\u91CF\u786E\u8BA4" : signal === "SHORT" ? "\u5173\u6CE8\u53CD\u5F39\u53D7\u963B\u540E\u7684\u5F31\u52BF\u786E\u8BA4" : "\u7B49\u5F85\u7A81\u7834\u5173\u952E\u4F4D\u540E\u518D\u884C\u52A8";
  const factors = [
    { name: "\u6050\u60E7\u8D2A\u5A6A", value: Number(input.fng ?? 50) },
    { name: "\u5E02\u573A\u5E02\u503C\u53D8\u52A8", value: Number(input.marketCapChange24h ?? 0) },
    { name: "\u591A\u7A7A\u8D26\u6237\u6BD4", value: Number(input.longShortRatio ?? 1) },
    { name: "\u4E3B\u52A8\u4E70\u5356\u6BD4", value: Number(input.takerBuySellRatio ?? 1) },
    { name: "\u8D44\u91D1\u8D39\u7387", value: Number(input.fundingRate ?? 0) },
    { name: "\u6301\u4ED3\u91CF\u53D8\u5316", value: Number(input.oiChange ?? 0) },
    { name: "\u6280\u672F\u9762\u8BC4\u5206", value: Number(input.technicalScore ?? 50) },
    { name: "\u65B0\u95FB\u60C5\u7EEA", value: Number(input.newsSentimentScore ?? 0) }
  ];
  return {
    score: totalScore,
    totalScore,
    bullScore: Math.max(0, Math.min(100, bullScore)),
    bearScore: Math.max(0, Math.min(100, bearScore)),
    signal,
    confidence,
    recommendation,
    entryAdvice,
    factors,
    bias: totalScore >= 60 ? "bullish" : totalScore <= 40 ? "bearish" : "neutral",
    label: totalScore >= 75 ? "\u5F3A\u591A\u5934" : totalScore >= 60 ? "\u504F\u591A" : totalScore <= 25 ? "\u5F3A\u7A7A\u5934" : totalScore <= 40 ? "\u504F\u7A7A" : "\u9707\u8361"
  };
}

// server/routers.ts
init_schema();
import { desc as desc2, eq as eq4 } from "drizzle-orm";
var appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true };
    })
  }),
  // ─── 信号相关 ──────────────────────────────────────────────────────────────
  signals: router({
    // 获取最近信号列表
    list: publicProcedure.input(z2.object({ limit: z2.number().default(50) }).optional()).query(async ({ input }) => {
      return getRecentSignals(input?.limit ?? 50);
    }),
    // 获取聚合信号列表
    confluenceList: publicProcedure.input(z2.object({ limit: z2.number().default(20) }).optional()).query(async ({ input }) => {
      return getRecentConfluenceSignals(input?.limit ?? 20);
    }),
    // 手动提交信号（来自 ValueScan webhook 或手动测试）
    submit: publicProcedure.input(z2.object({
      messageType: z2.number(),
      messageId: z2.string(),
      symbol: z2.string(),
      data: z2.any().optional()
    })).mutation(async ({ input }) => {
      const config = await getActiveConfig();
      const timeWindow = config?.signalTimeWindow ?? 300;
      const minScore = config?.minSignalScore ?? 0.6;
      const confluence = await processSignal(input.messageType, input.messageId, input.symbol, input.data ?? {}, timeWindow, minScore);
      let strategyResult = null;
      if (confluence) {
        const recentSigs = await getRecentSignals(100);
        const oneHourAgo = Date.now() - 36e5;
        const recentHour = recentSigs.filter((s) => new Date(s.createdAt).getTime() > oneHourAgo);
        const fomoCount = recentHour.filter((s) => s.signalType === "FOMO").length;
        const alphaCount = recentHour.filter((s) => s.signalType === "ALPHA").length;
        const riskCount = recentHour.filter((s) => s.signalType === "RISK").length;
        const uniqueSymbols = new Set(recentHour.map((s) => s.symbol)).size;
        const ctx = buildSignalContext({
          symbol: input.symbol,
          messageType: input.messageType,
          rawData: input.data ?? {},
          recentSignalStats: {
            fomoCount,
            alphaCount,
            riskCount,
            totalCount: recentHour.length,
            uniqueSymbols
          }
        });
        strategyResult = evaluateStrategies(ctx);
        let autoTradeResult = null;
        const scorePercent = Math.round(confluence.score * 100);
        const minThreshold = config?.minScoreThreshold ?? 60;
        const shouldAutoTrade = config?.autoTradingEnabled && scorePercent >= minThreshold;
        if (shouldAutoTrade) {
          const triggeredStrategy = strategyResult?.allResults?.find((r) => r.triggered);
          const direction = triggeredStrategy?.direction === "short" ? "short" : "long";
          const exchange = config?.selectedExchange ?? "binance";
          const symbol = confluence.symbol.endsWith("USDT") ? confluence.symbol : `${confluence.symbol}USDT`;
          const leverage = config?.leverage ?? 5;
          const basePercent = Number(config?.autoTradingPositionPercent ?? 1);
          const posPercent = calcDynamicPositionPercent(scorePercent, basePercent, Math.min(basePercent * 5, 10));
          const dynamicSL = calcDynamicStopLoss(scorePercent, config?.stopLossPercent ?? 3);
          const dynamicTP = calcDynamicTakeProfit(dynamicSL, config?.takeProfit1Percent ?? 5, config?.takeProfit2Percent ?? 10);
          if (direction === "long") {
            const btcTrend = await getBtcTrend();
            if (btcTrend === "down") {
              autoTradeResult = { success: false, message: `BTC\u4E0B\u8DCC\u8D8B\u52BF\u8FC7\u6EE4\uFF0C\u7981\u6B62\u505A\u591A ${symbol}` };
            }
          }
          if (!autoTradeResult) try {
            if (exchange === "binance" && config?.binanceApiKey) {
              const svc = createBinanceService(config.binanceApiKey, config.binanceSecretKey ?? "", config.binanceUseTestnet ?? false);
              const bal = await svc.getUSDTBalance();
              const qty = Math.max(10, bal.balance * posPercent / 100) / leverage;
              const qtyRounded = Math.floor(qty * 1e3) / 1e3;
              if (direction === "long") await svc.openLong(symbol, qtyRounded, leverage);
              else await svc.openShort(symbol, qtyRounded, leverage);
              autoTradeResult = { success: true, message: `Binance ${direction === "long" ? "\u505A\u591A" : "\u505A\u7A7A"} ${symbol} qty=${qtyRounded}` };
            } else if (exchange === "okx" && config?.okxApiKey) {
              const svc = createOKXService(config.okxApiKey, config.okxSecretKey ?? "", config.okxPassphrase ?? "", config.okxUseDemo ?? false);
              const bal = await svc.getBalance("USDT");
              const notional = Math.max(10, bal.balance * posPercent / 100);
              const instId = `${symbol.replace("USDT", "")}-USDT-SWAP`;
              await svc.placeOrder({ instId, tdMode: "cross", side: direction === "long" ? "buy" : "sell", posSide: direction === "long" ? "long" : "short", ordType: "market", sz: String(Math.floor(notional / leverage)) });
              autoTradeResult = { success: true, message: `OKX ${direction === "long" ? "\u505A\u591A" : "\u505A\u7A7A"} ${instId}` };
            } else if (exchange === "bybit" && config?.bybitApiKey) {
              const svc = createBybitService({ apiKey: config.bybitApiKey, secretKey: config.bybitSecretKey ?? "", useTestnet: config.bybitUseTestnet ?? false });
              const balList = await svc.getBalance();
              const usdtBal = Number(balList.find((c) => c.coin === "USDT")?.walletBalance ?? 0);
              const qty = Math.max(10, usdtBal * posPercent / 100) / leverage;
              await svc.setLeverage("linear", symbol, String(leverage), String(leverage));
              await svc.placeOrder({ category: "linear", symbol, side: direction === "long" ? "Buy" : "Sell", orderType: "Market", qty: String(Math.floor(qty * 1e3) / 1e3) });
              autoTradeResult = { success: true, message: `Bybit ${direction === "long" ? "\u505A\u591A" : "\u505A\u7A7A"} ${symbol}` };
            } else if (exchange === "gate" && config?.gateApiKey) {
              const svc = createGateService({ apiKey: config.gateApiKey, secretKey: config.gateSecretKey ?? "" });
              const bal = await svc.getBalance();
              const notional = Math.max(10, Number(bal?.total ?? 0) * posPercent / 100);
              const size = Math.floor(notional / leverage) * (direction === "long" ? 1 : -1);
              await svc.placeOrder("usdt", { contract: symbol, size, price: "0", tif: "ioc" });
              autoTradeResult = { success: true, message: `Gate.io ${direction === "long" ? "\u505A\u591A" : "\u505A\u7A7A"} ${symbol}` };
            } else if (exchange === "bitget" && config?.bitgetApiKey) {
              const svc = createBitgetService({ apiKey: config.bitgetApiKey, secretKey: config.bitgetSecretKey ?? "", passphrase: config.bitgetPassphrase ?? "" });
              const bal = await svc.getBalance();
              const notional = Math.max(10, Number(bal?.available ?? 0) * posPercent / 100);
              await svc.placeOrder({ symbol, productType: "USDT-FUTURES", marginMode: "crossed", marginCoin: "USDT", size: String(Math.floor(notional / leverage * 1e3) / 1e3), side: direction === "long" ? "buy" : "sell", tradeSide: "open", orderType: "market" });
              autoTradeResult = { success: true, message: `Bitget ${direction === "long" ? "\u505A\u591A" : "\u505A\u7A7A"} ${symbol}` };
            } else {
              autoTradeResult = { success: false, message: "\u672A\u914D\u7F6E\u8BE5\u4EA4\u6613\u6240 API Key" };
            }
          } catch (e) {
            autoTradeResult = { success: false, message: `\u4E0B\u5355\u5931\u8D25: ${e.message ?? "\u672A\u77E5\u9519\u8BEF"}` };
            markCooldown(confluence.symbol);
          }
        }
        try {
          const tgConfig = await getTelegramConfig();
          if (tgConfig?.botToken && tgConfig?.chatId && tgConfig?.enableTradeNotify) {
            const triggeredStrategy = strategyResult?.allResults?.find((r) => r.triggered);
            const scorePercent2 = Math.round(confluence.score * 100);
            const minThreshold2 = config?.minScoreThreshold ?? 60;
            const strategyName = triggeredStrategy ? `
\u{1F3AF} \u7B56\u7565: <b>${triggeredStrategy.strategyName}</b> (\u80DC\u7387${Math.round(triggeredStrategy.winRate * 100)}%)` : "";
            let tradeStatus;
            if (!config?.autoTradingEnabled) {
              tradeStatus = "\u26AA\uFE0F \u81EA\u52A8\u4EA4\u6613\u672A\u5F00\u542F";
            } else if (scorePercent2 < minThreshold2) {
              tradeStatus = `\u26A0\uFE0F \u8BC4\u5206 ${scorePercent2}% < \u9608\u503C ${minThreshold2}%\uFF0C\u672A\u4E0B\u5355`;
            } else if (autoTradeResult?.success) {
              tradeStatus = `\u2705 \u81EA\u52A8\u4E0B\u5355: ${autoTradeResult.message}`;
            } else if (autoTradeResult) {
              tradeStatus = `\u274C ${autoTradeResult.message}`;
            } else {
              tradeStatus = "\u26A0\uFE0F \u4EA4\u6613\u6240\u672A\u914D\u7F6E";
            }
            const msg = `\u{1F680} <b>\u52C7\u5C11\u4EA4\u6613\u4E4B\u738B</b>

\u{1F48E} <b>${confluence.symbol}</b> FOMO+Alpha \u5171\u632F
\u{1F4CA} \u8BC4\u5206: <b>${scorePercent2}%</b> (\u9608\u503C ${minThreshold2}%)${strategyName}
\u23F1 \u65F6\u95F4\u5DEE: ${confluence.timeGap.toFixed(1)}s
${tradeStatus}
\u{1F550} ${(/* @__PURE__ */ new Date()).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })}`;
            await fetch(`https://api.telegram.org/bot${tgConfig.botToken}/sendMessage`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ chat_id: tgConfig.chatId, text: msg, parse_mode: "HTML" })
            }).catch(() => {
            });
          }
        } catch (_) {
        }
      }
      return { success: true, confluence, strategyResult };
    }),
    // 模拟信号（演示用）
    mock: publicProcedure.input(z2.object({ symbol: z2.string().optional() }).optional()).mutation(async ({ input }) => {
      const mock = generateMockSignal(input?.symbol);
      const config = await getActiveConfig();
      const timeWindow = config?.signalTimeWindow ?? 300;
      const minScore = config?.minSignalScore ?? 0.6;
      const confluence = await processSignal(mock.messageType, mock.messageId, mock.symbol, mock.data, timeWindow, minScore);
      const recentSigs = await getRecentSignals(100);
      const oneHourAgo = Date.now() - 36e5;
      const recentHour = recentSigs.filter((s) => new Date(s.createdAt).getTime() > oneHourAgo);
      const fomoCount = recentHour.filter((s) => s.signalType === "FOMO").length;
      const alphaCount = recentHour.filter((s) => s.signalType === "ALPHA").length;
      const riskCount = recentHour.filter((s) => s.signalType === "RISK").length;
      const uniqueSymbols = new Set(recentHour.map((s) => s.symbol)).size;
      const ctx = buildSignalContext({
        symbol: mock.symbol,
        messageType: mock.messageType,
        rawData: mock.data ?? {},
        recentSignalStats: { fomoCount, alphaCount, riskCount, totalCount: recentHour.length, uniqueSymbols }
      });
      const strategyResult = evaluateStrategies(ctx);
      return { signal: mock, confluence, strategyResult };
    }),
    // 获取信号引擎缓存状态
    cacheStatus: publicProcedure.query(() => getCacheStatus())
  }),
  // ─── 6 大高胜率策略 ──────────────────────────────────────────────────────────
  strategies: router({
    // 获取所有策略信息
    list: publicProcedure.query(() => getAllStrategiesInfo()),
    // 手动评估当前信号上下文
    evaluate: publicProcedure.input(z2.object({
      symbol: z2.string(),
      messageType: z2.number().optional(),
      rawData: z2.any().optional(),
      recentSignalStats: z2.object({
        fomoCount: z2.number().default(0),
        alphaCount: z2.number().default(0),
        riskCount: z2.number().default(0),
        totalCount: z2.number().default(0),
        uniqueSymbols: z2.number().default(0)
      }).optional()
    })).query(async ({ input }) => {
      const recentSigs = await getRecentSignals(100);
      const oneHourAgo = Date.now() - 36e5;
      const recentHour = recentSigs.filter((s) => new Date(s.createdAt).getTime() > oneHourAgo);
      const fomoCount = input.recentSignalStats?.fomoCount ?? recentHour.filter((s) => s.signalType === "FOMO").length;
      const alphaCount = input.recentSignalStats?.alphaCount ?? recentHour.filter((s) => s.signalType === "ALPHA").length;
      const riskCount = input.recentSignalStats?.riskCount ?? recentHour.filter((s) => s.signalType === "RISK").length;
      const totalCount = input.recentSignalStats?.totalCount ?? recentHour.length;
      const uniqueSymbols = input.recentSignalStats?.uniqueSymbols ?? new Set(recentHour.map((s) => s.symbol)).size;
      const ctx = buildSignalContext({
        symbol: input.symbol,
        messageType: input.messageType ?? 110,
        rawData: input.rawData ?? {},
        recentSignalStats: { fomoCount, alphaCount, riskCount, totalCount, uniqueSymbols }
      });
      return evaluateStrategies(ctx);
    })
  }),
  // ─── 交易相关 ──────────────────────────────────────────────────────────────
  trades: router({
    list: publicProcedure.input(z2.object({ limit: z2.number().default(50), offset: z2.number().default(0) }).optional()).query(async ({ input }) => {
      return getTrades(input?.limit ?? 50, input?.offset ?? 0);
    }),
    open: publicProcedure.query(async () => getOpenTrades()),
    todayStats: publicProcedure.query(async () => getTodayStats()),
    // 手动开仓（演示/测试用）
    openManual: publicProcedure.input(z2.object({
      symbol: z2.string(),
      quantity: z2.number().positive(),
      entryPrice: z2.number().positive(),
      stopLoss: z2.number().optional(),
      takeProfit1: z2.number().optional(),
      takeProfit2: z2.number().optional(),
      leverage: z2.number().default(5),
      signalScore: z2.number().optional(),
      confluenceSignalId: z2.number().optional(),
      skipRiskCheck: z2.boolean().default(false)
      // 手动操作可跳过风控
    })).mutation(async ({ input }) => {
      if (!input.skipRiskCheck) {
        const positionValue = input.quantity * input.entryPrice;
        const riskResult = await checkRisk(input.symbol, positionValue);
        if (riskResult.code === "EMERGENCY_STOP" || riskResult.code === "DUPLICATE_POSITION") {
          return { success: false, error: riskResult.reason, code: riskResult.code };
        }
      }
      const config = await getActiveConfig();
      const sl = input.stopLoss ?? input.entryPrice * (1 - (config?.stopLossPercent ?? 3) / 100);
      const tp1 = input.takeProfit1 ?? input.entryPrice * (1 + (config?.takeProfit1Percent ?? 5) / 100);
      const tp2 = input.takeProfit2 ?? input.entryPrice * (1 + (config?.takeProfit2Percent ?? 10) / 100);
      const trade = await insertTrade({
        symbol: input.symbol.toUpperCase(),
        action: "OPEN_LONG",
        quantity: input.quantity,
        entryPrice: input.entryPrice,
        stopLoss: sl,
        takeProfit1: tp1,
        takeProfit2: tp2,
        leverage: input.leverage,
        signalScore: input.signalScore,
        confluenceSignalId: input.confluenceSignalId,
        status: "open",
        isTestnet: config?.useTestnet ?? true
      });
      if (trade) {
        await upsertPosition({
          symbol: input.symbol.toUpperCase(),
          quantity: input.quantity,
          entryPrice: input.entryPrice,
          currentPrice: input.entryPrice,
          leverage: input.leverage,
          stopLoss: sl,
          takeProfit1: tp1,
          takeProfit2: tp2,
          tradeId: trade.id
        });
      }
      return { success: true, trade };
    }),
    // 手动平仓
    closeManual: publicProcedure.input(z2.object({
      tradeId: z2.number(),
      exitPrice: z2.number().positive(),
      closeReason: z2.string().default("\u624B\u52A8\u5E73\u4ED3")
    })).mutation(async ({ input }) => {
      const openTrades = await getOpenTrades();
      const trade = openTrades.find((t2) => t2.id === input.tradeId);
      if (!trade) return { success: false, error: "\u4EA4\u6613\u4E0D\u5B58\u5728\u6216\u5DF2\u5173\u95ED" };
      const pnl = (input.exitPrice - trade.entryPrice) * trade.quantity;
      const pnlPercent = (input.exitPrice - trade.entryPrice) / trade.entryPrice * 100;
      await closeTrade(trade.id, input.exitPrice, pnl, pnlPercent, input.closeReason);
      await deletePosition(trade.symbol);
      return { success: true, pnl, pnlPercent };
    })
  }),
  // ─── 持仓相关 ──────────────────────────────────────────────────────────────
  positions: router({
    list: publicProcedure.query(async () => getAllPositions()),
    updatePrice: publicProcedure.input(z2.object({ symbol: z2.string(), currentPrice: z2.number().positive() })).mutation(async ({ input }) => {
      const positions2 = await getAllPositions();
      const pos = positions2.find((p) => p.symbol === input.symbol.toUpperCase());
      if (!pos) return { success: false };
      const unrealizedPnl = (input.currentPrice - pos.entryPrice) * pos.quantity;
      const unrealizedPnlPercent = (input.currentPrice - pos.entryPrice) / pos.entryPrice * 100;
      await upsertPosition({ ...pos, currentPrice: input.currentPrice, unrealizedPnl, unrealizedPnlPercent });
      return { success: true };
    })
  }),
  // ─── 策略配置 ──────────────────────────────────────────────────────────────
  config: router({
    active: publicProcedure.query(async () => {
      const config = await getActiveConfig();
      if (!config) {
        return {
          id: 0,
          name: "\u9ED8\u8BA4\u7B56\u7565",
          signalTimeWindow: 300,
          minSignalScore: 0.6,
          enableFomoIntensify: true,
          maxPositionPercent: 10,
          maxTotalPositionPercent: 50,
          maxDailyTrades: 20,
          maxDailyLossPercent: 5,
          stopLossPercent: 3,
          takeProfit1Percent: 5,
          takeProfit2Percent: 10,
          leverage: 5,
          marginType: "ISOLATED",
          symbolSuffix: "USDT",
          enableTrailingStop: false,
          trailingStopActivation: 3,
          trailingStopCallback: 1.5,
          autoTradingEnabled: false,
          useTestnet: true,
          emergencyStop: false,
          isActive: true,
          createdAt: /* @__PURE__ */ new Date(),
          updatedAt: /* @__PURE__ */ new Date()
        };
      }
      return config;
    }),
    list: publicProcedure.query(async () => getAllConfigs()),
    save: publicProcedure.input(z2.object({
      name: z2.string().default("\u9ED8\u8BA4\u7B56\u7565"),
      signalTimeWindow: z2.number().min(60).max(3600).default(300),
      minSignalScore: z2.number().min(0).max(1).default(0.6),
      enableFomoIntensify: z2.boolean().default(true),
      maxPositionPercent: z2.number().min(1).max(100).default(10),
      maxTotalPositionPercent: z2.number().min(10).max(100).default(50),
      maxDailyTrades: z2.number().min(1).max(100).default(20),
      maxDailyLossPercent: z2.number().min(0.5).max(50).default(5),
      stopLossPercent: z2.number().min(0.5).max(20).default(3),
      takeProfit1Percent: z2.number().min(1).max(50).default(5),
      takeProfit2Percent: z2.number().min(2).max(100).default(10),
      leverage: z2.number().min(1).max(125).default(5),
      marginType: z2.enum(["ISOLATED", "CROSSED"]).default("ISOLATED"),
      symbolSuffix: z2.string().default("USDT"),
      enableTrailingStop: z2.boolean().default(false),
      trailingStopActivation: z2.number().default(3),
      trailingStopCallback: z2.number().default(1.5),
      autoTradingEnabled: z2.boolean().default(false),
      useTestnet: z2.boolean().default(true),
      emergencyStop: z2.boolean().default(false),
      binanceApiKey: z2.string().optional().default(""),
      binanceSecretKey: z2.string().optional().default("")
    })).mutation(async ({ input }) => {
      const config = await upsertStrategyConfig({ ...input, isActive: true });
      return { success: true, config };
    }),
    toggleEmergencyStop: publicProcedure.input(z2.object({ id: z2.number(), enabled: z2.boolean() })).mutation(async ({ input }) => {
      await updateStrategyConfig(input.id, { emergencyStop: input.enabled });
      return { success: true };
    }),
    toggleAutoTrading: publicProcedure.input(z2.object({ id: z2.number(), enabled: z2.boolean() })).mutation(async ({ input }) => {
      await updateStrategyConfig(input.id, { autoTradingEnabled: input.enabled });
      return { success: true };
    })
  }),
  // ─── 账户余额 ──────────────────────────────────────────────────────────────
  account: router({
    snapshot: publicProcedure.query(async () => getLatestSnapshot()),
    history: publicProcedure.input(z2.object({ hours: z2.number().default(24) }).optional()).query(async ({ input }) => getSnapshotHistory(input?.hours ?? 24)),
    updateSnapshot: publicProcedure.input(z2.object({
      totalBalance: z2.number(),
      availableBalance: z2.number(),
      unrealizedPnl: z2.number().default(0),
      dailyPnl: z2.number().default(0),
      dailyTrades: z2.number().default(0),
      positionCount: z2.number().default(0)
    })).mutation(async ({ input }) => {
      await insertAccountSnapshot(input);
      return { success: true };
    }),
    // 模拟账户数据（演示用）
    mockSnapshot: publicProcedure.mutation(async () => {
      const totalBalance = 1e4 + Math.random() * 2e3 - 1e3;
      const availableBalance = totalBalance * (0.5 + Math.random() * 0.3);
      const unrealizedPnl = Math.random() * 500 - 200;
      const dailyPnl = Math.random() * 300 - 100;
      await insertAccountSnapshot({ totalBalance, availableBalance, unrealizedPnl, dailyPnl, dailyTrades: Math.floor(Math.random() * 10), positionCount: Math.floor(Math.random() * 5) });
      return { totalBalance, availableBalance, unrealizedPnl, dailyPnl };
    })
  }),
  // ─── 回测 ──────────────────────────────────────────────────────────────────
  backtest: router({
    list: publicProcedure.query(async () => getBacktestResults()),
    run: publicProcedure.input(z2.object({
      name: z2.string(),
      startDate: z2.string(),
      endDate: z2.string(),
      initialBalance: z2.number().positive(),
      timeWindow: z2.number().default(300),
      minScore: z2.number().default(0.6),
      stopLossPercent: z2.number().default(3),
      takeProfit1Percent: z2.number().default(5),
      takeProfit2Percent: z2.number().default(10),
      leverage: z2.number().default(5)
    })).mutation(async ({ input }) => {
      const result = await runBacktest(input);
      const saved = await insertBacktestResult({
        name: input.name,
        startDate: new Date(input.startDate),
        endDate: new Date(input.endDate),
        initialBalance: input.initialBalance,
        finalBalance: result.finalBalance,
        totalReturn: result.totalReturn,
        totalTrades: result.totalTrades,
        winTrades: result.winTrades,
        lossTrades: result.lossTrades,
        winRate: result.winRate,
        maxDrawdown: result.maxDrawdown,
        sharpeRatio: result.sharpeRatio,
        configSnapshot: input,
        tradeLog: result.tradeLog
      });
      return { success: true, result, id: saved?.id };
    })
  }),
  // ─── Telegram 配置 ─────────────────────────────────────────────────────────
  telegram: router({
    config: publicProcedure.query(async () => {
      const config = await getTelegramConfig();
      if (config?.botToken) {
        return { ...config, botToken: "****" + config.botToken.slice(-4) };
      }
      return config;
    }),
    save: publicProcedure.input(z2.object({
      botToken: z2.string().optional(),
      chatId: z2.string().optional(),
      enableTradeNotify: z2.boolean().default(true),
      enableRiskNotify: z2.boolean().default(true),
      enableDailyReport: z2.boolean().default(true),
      isActive: z2.boolean().default(false)
    })).mutation(async ({ input }) => {
      await upsertTelegramConfig(input);
      return { success: true };
    }),
    test: publicProcedure.input(z2.object({ message: z2.string().default("\u6D4B\u8BD5\u6D88\u606F - \u4EA4\u6613\u4E4B\u738B\u7CFB\u7EDF\u8FD0\u884C\u6B63\u5E38 \u2705") })).mutation(async ({ input }) => {
      const config = await getTelegramConfig();
      if (!config?.botToken || !config?.chatId || !config?.isActive) {
        return { success: false, error: "Telegram \u672A\u914D\u7F6E\u6216\u672A\u542F\u7528" };
      }
      try {
        const res = await fetch(`https://api.telegram.org/bot${config.botToken}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: config.chatId, text: input.message, parse_mode: "HTML" })
        });
        const data = await res.json();
        return { success: data.ok, error: data.description };
      } catch (e) {
        return { success: false, error: e.message };
      }
    })
  }),
  // ─── ValueScan 真实信号 API ─────────────────────────────────────────────────
  valueScan: router({
    // 获取实时预警信号（使用 getFundsMovementPage，API Key 认证）
    warnMessages: publicProcedure.input(z2.object({ pageNum: z2.number().default(1), pageSize: z2.number().default(20) }).optional()).query(async ({ input }) => {
      try {
        const resp = await getWarnMessages(input?.pageNum ?? 1, input?.pageSize ?? 20);
        if (resp.code === 200) {
          return { success: true, data: resp.data || [], userRole: resp.userRole };
        }
        return { success: false, data: [], error: resp.msg };
      } catch (e) {
        return { success: false, data: [], error: e.message };
      }
    }),
    // 获取 AI 信号历史（分页）
    aiMessages: publicProcedure.input(z2.object({
      pageNum: z2.number().default(1),
      pageSize: z2.number().default(20),
      symbol: z2.string().optional(),
      messageType: z2.number().optional(),
      fundsMovementType: z2.number().optional()
    }).optional()).query(async ({ input }) => {
      try {
        const resp = await getAIMessages(
          input?.pageNum ?? 1,
          input?.pageSize ?? 20,
          { symbol: input?.symbol, messageType: input?.messageType, fundsMovementType: input?.fundsMovementType }
        );
        if (resp.code === 200) {
          return {
            success: true,
            total: resp.data.total,
            // 返回原始信号数据，前端自行解析 content
            list: resp.data.list || [],
            userRole: resp.userRole
          };
        }
        return { success: false, total: 0, list: [], error: resp.msg };
      } catch (e) {
        return { success: false, total: 0, list: [], error: e.message };
      }
    }),
    // 获取恐惧贪婪指数
    fearGreed: publicProcedure.query(async () => {
      try {
        const resp = await getFearGreedIndex();
        if (resp.code === 200) {
          const val = resp.data.now;
          let label = "\u6781\u5EA6\u6050\u60E7";
          let color = "#ef4444";
          if (val >= 75) {
            label = "\u6781\u5EA6\u8D2A\u5A6A";
            color = "#22c55e";
          } else if (val >= 55) {
            label = "\u8D2A\u5A6A";
            color = "#86efac";
          } else if (val >= 45) {
            label = "\u4E2D\u6027";
            color = "#facc15";
          } else if (val >= 25) {
            label = "\u6050\u60E7";
            color = "#f97316";
          }
          return { success: true, value: val, label, color, data: resp.data };
        }
        return { success: false, value: 50, label: "\u4E2D\u6027", color: "#facc15" };
      } catch (e) {
        return { success: false, value: 50, label: "\u4E2D\u6027", color: "#facc15", error: e.message };
      }
    }),
    // 获取 API 连接状态
    accountInfo: publicProcedure.query(async () => {
      try {
        const status = getVSTokenStatus();
        return { success: true, data: { apiKeyConfigured: status.apiKeyOk, role: "API_KEY" } };
      } catch (e) {
        return { success: false, data: null, error: e.message };
      }
    }),
    // 设置 VS Token（登录用户均可配置，用于 warnMessage 接口）
    setToken: publicProcedure.input(z2.object({ token: z2.string().min(10) })).mutation(async ({ input }) => {
      await setVSToken(input.token);
      return { success: true, message: "Token \u5DF2\u914D\u7F6E\u5E76\u6301\u4E45\u5316\u5230\u6570\u636E\u5E93\uFF0C\u670D\u52A1\u91CD\u542F\u540E\u81EA\u52A8\u6062\u590D" };
    }),
    // VS 自动登录（通过账号密码登录获取 Token）
    autoLogin: publicProcedure.input(z2.object({
      email: z2.string().email(),
      password: z2.string().min(6),
      enableAutoRefresh: z2.boolean().default(true)
    })).mutation(async ({ input }) => {
      await saveVSLoginCredentials(input.email, input.password, "", input.enableAutoRefresh);
      const result = await loginValueScan(input.email, input.password);
      if (!result.success || !result.token) {
        if (input.enableAutoRefresh) {
          startAutoRefreshTimer(input.email, input.password);
        }
        return { success: false, message: `${result.msg || "\u767B\u5F55\u5931\u8D25"}\uFF08\u51ED\u8BC1\u5DF2\u4FDD\u5B58\uFF0C\u5C06\u81EA\u52A8\u91CD\u8BD5\uFF09` };
      }
      await setVSToken(result.token);
      if (input.enableAutoRefresh) {
        startAutoRefreshTimer(input.email, input.password);
      } else {
        stopAutoRefreshTimer();
      }
      return { success: true, message: `\u767B\u5F55\u6210\u529F\uFF01Token \u5DF2\u83B7\u53D6\u5E76\u4FDD\u5B58${input.enableAutoRefresh ? "\uFF0C\u5DF2\u5F00\u542F 50 \u5206\u949F\u81EA\u52A8\u5237\u65B0" : ""}` };
    }),
    // 获取自动登录配置状态
    autoLoginStatus: publicProcedure.query(async () => {
      const creds = await loadVSLoginCredentials();
      return {
        hasCredentials: !!(creds?.email && creds?.password),
        email: creds?.email ? `${creds.email.slice(0, 3)}***${creds.email.slice(-8)}` : null,
        autoRefreshEnabled: creds?.autoRefreshEnabled ?? false
      };
    }),
    // 停止自动刷新
    stopAutoRefresh: publicProcedure.mutation(async () => {
      stopAutoRefreshTimer();
      const creds = await loadVSLoginCredentials();
      if (creds) {
        await saveVSLoginCredentials(creds.email, creds.password, creds.refreshToken, false);
      }
      return { success: true, message: "\u5DF2\u505C\u6B62\u81EA\u52A8\u5237\u65B0" };
    }),
    // 获取 Token 状态（如果内存中没有，先从数据库加载）
    tokenStatus: publicProcedure.query(async () => {
      await initVSTokenFromDB();
      const status = getVSTokenStatus();
      const token = getVSToken();
      return {
        hasToken: status.hasUserToken,
        tokenPreview: token ? `${token.slice(0, 20)}...` : null,
        tokenSetAt: status.tokenSetAt,
        // 计算过期时间（Token 有效期约 1 小时）
        tokenExpiresAt: status.tokenSetAt > 0 ? status.tokenSetAt + 3600 * 1e3 : null,
        isExpired: status.tokenSetAt > 0 ? Date.now() > status.tokenSetAt + 3600 * 1e3 : false
      };
    }),
    // 获取个人预警信号（需要用户 Token）
    personalWarnMessages: publicProcedure.input(z2.object({ pageNum: z2.number().default(1), pageSize: z2.number().default(20) }).optional()).query(async ({ input }) => {
      try {
        const resp = await getWarnMessageWithToken(input?.pageNum ?? 1, input?.pageSize ?? 20);
        return {
          success: resp.code === 200,
          data: resp.data || [],
          msg: resp.msg,
          expired: resp.expired ?? false
        };
      } catch (e) {
        return { success: false, data: [], msg: e.message, expired: false };
      }
    }),
    // 信号类型映射表
    signalTypes: publicProcedure.query(() => {
      return Object.entries(FUNDS_MOVEMENT_TYPE_MAP).map(([key, val]) => ({
        fundsMovementType: parseInt(key),
        ...val
      }));
    }),
    // ── 手动 API Key 管理 ────────────────────────────────────────────────
    getApiKeyConfig: publicProcedure.query(async () => {
      const cfg = await getActiveConfig();
      const vsKey = cfg?.vsApiKey;
      return {
        usingDbKey: !!vsKey,
        apiKeyPreview: vsKey ? `${vsKey.slice(0, 8)}...` : null
      };
    }),
    saveApiKey: publicProcedure.input(z2.object({ apiKey: z2.string().min(10), secretKey: z2.string().min(10) })).mutation(async ({ input }) => {
      const cfg = await getActiveConfig();
      if (!cfg) throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR", message: "\u672A\u627E\u5230\u914D\u7F6E" });
      await updateStrategyConfig(cfg.id, { vsApiKey: input.apiKey, vsSecretKey: input.secretKey });
      return { success: true };
    }),
    testApiKey: publicProcedure.input(z2.object({ apiKey: z2.string().optional(), secretKey: z2.string().optional() })).mutation(async ({ input }) => {
      try {
        const cfg = await getActiveConfig();
        const apiKey = input.apiKey || cfg?.vsApiKey || process.env.VALUESCAN_API_KEY;
        const secretKey = input.secretKey || cfg?.vsSecretKey || process.env.VALUESCAN_SECRET_KEY || "";
        if (!apiKey) return { success: false, message: "\u672A\u914D\u7F6E API Key" };
        const res = await fetch("https://api.valuescan.io/api/v1/market/fear-greed", {
          headers: { "X-API-KEY": apiKey, "X-SECRET-KEY": secretKey }
        });
        if (res.ok) return { success: true, message: `API Key \u6709\u6548\uFF01\u8FDE\u63A5\u6210\u529F (HTTP ${res.status})` };
        return { success: false, message: `\u8FDE\u63A5\u5931\u8D25 (HTTP ${res.status})\uFF0C\u8BF7\u68C0\u67E5 API Key` };
      } catch (e) {
        return { success: false, message: "\u7F51\u7EDC\u9519\u8BEF: " + e.message };
      }
    }),
    clearApiKey: publicProcedure.mutation(async () => {
      const cfg = await getActiveConfig();
      if (!cfg) throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR", message: "\u672A\u627E\u5230\u914D\u7F6E" });
      await updateStrategyConfig(cfg.id, { vsApiKey: null, vsSecretKey: null });
      return { success: true };
    })
  }),
  // ─── 市场价格（通过 Binance 公开 API））─────────────────────────────────────
  market: router({
    price: publicProcedure.input(z2.object({ symbol: z2.string() })).query(async ({ input }) => {
      try {
        const symbol = input.symbol.toUpperCase().endsWith("USDT") ? input.symbol.toUpperCase() : `${input.symbol.toUpperCase()}USDT`;
        const res = await fetch(`https://fapi.binance.com/fapi/v1/ticker/price?symbol=${symbol}`);
        const data = await res.json();
        return { symbol, price: parseFloat(data.price ?? "0"), success: true };
      } catch (e) {
        return { symbol: input.symbol, price: 0, success: false };
      }
    }),
    klines: publicProcedure.input(z2.object({ symbol: z2.string(), interval: z2.string().default("1h"), limit: z2.number().default(100) })).query(async ({ input }) => {
      try {
        const symbol = input.symbol.toUpperCase().endsWith("USDT") ? input.symbol.toUpperCase() : `${input.symbol.toUpperCase()}USDT`;
        const res = await fetch(`https://fapi.binance.com/fapi/v1/klines?symbol=${symbol}&interval=${input.interval}&limit=${input.limit}`);
        const raw = await res.json();
        return raw.map((k) => ({
          time: k[0],
          open: parseFloat(k[1]),
          high: parseFloat(k[2]),
          low: parseFloat(k[3]),
          close: parseFloat(k[4]),
          volume: parseFloat(k[5])
        }));
      } catch (e) {
        return [];
      }
    }),
    ticker24h: publicProcedure.input(z2.object({ symbol: z2.string() })).query(async ({ input }) => {
      try {
        const symbol = input.symbol.toUpperCase().endsWith("USDT") ? input.symbol.toUpperCase() : `${input.symbol.toUpperCase()}USDT`;
        const res = await fetch(`https://fapi.binance.com/fapi/v1/ticker/24hr?symbol=${symbol}`);
        const data = await res.json();
        return {
          symbol,
          price: parseFloat(data.lastPrice ?? "0"),
          priceChange: parseFloat(data.priceChange ?? "0"),
          priceChangePercent: parseFloat(data.priceChangePercent ?? "0"),
          high: parseFloat(data.highPrice ?? "0"),
          low: parseFloat(data.lowPrice ?? "0"),
          volume: parseFloat(data.volume ?? "0"),
          success: true
        };
      } catch (e) {
        return { symbol: input.symbol, price: 0, priceChange: 0, priceChangePercent: 0, high: 0, low: 0, volume: 0, success: false };
      }
    }),
    // 多个币种价格
    multiPrice: publicProcedure.input(z2.object({ symbols: z2.array(z2.string()) })).query(async ({ input }) => {
      try {
        const res = await fetch(`https://fapi.binance.com/fapi/v1/ticker/price`);
        const all = await res.json();
        const map = {};
        for (const item of all) {
          map[item.symbol] = parseFloat(item.price);
        }
        return input.symbols.map((s) => {
          const sym = s.toUpperCase().endsWith("USDT") ? s.toUpperCase() : `${s.toUpperCase()}USDT`;
          return { symbol: s.toUpperCase(), price: map[sym] ?? 0 };
        });
      } catch (e) {
        return input.symbols.map((s) => ({ symbol: s.toUpperCase(), price: 0 }));
      }
    })
  }),
  // ─── CoinGlass 市场全景数据 ─────────────────────────────────────────────────────
  marketOverview: router({
    // 综合市场全景（资金费率 + 持仓量 + 多空比例）
    overview: publicProcedure.input(z2.object({ symbols: z2.array(z2.string()).optional() }).optional()).query(async ({ input }) => {
      const symbols = input?.symbols ?? ["BTC", "ETH", "SOL", "BNB", "XRP"];
      return getMarketOverview(symbols);
    }),
    // 资金费率
    fundingRates: publicProcedure.input(z2.object({ symbols: z2.array(z2.string()).optional() }).optional()).query(async ({ input }) => {
      const symbols = input?.symbols ?? ["BTC", "ETH", "SOL", "BNB", "XRP"];
      return getMultiFundingRates(symbols);
    }),
    // 持仓量
    openInterest: publicProcedure.input(z2.object({ symbols: z2.array(z2.string()).optional() }).optional()).query(async ({ input }) => {
      const symbols = input?.symbols ?? ["BTC", "ETH", "SOL", "BNB", "XRP"];
      return getMultiOpenInterest(symbols);
    }),
    // 多空比例（Binance）
    longShortRatio: publicProcedure.input(z2.object({ symbols: z2.array(z2.string()).optional() }).optional()).query(async ({ input }) => {
      const symbols = input?.symbols ?? ["BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT", "XRPUSDT"];
      return getMultiLongShortRatio(symbols);
    })
  }),
  // ─── ValueScan 链上数据 & 资金流 ─────────────────────────────────────────────
  vsData: router({
    // AI 多空信号列表 - 使用机会/风险列表替代
    aiLongShort: publicProcedure.input(z2.object({ type: z2.enum(["long", "short"]).default("long") }).optional()).query(async ({ input }) => {
      try {
        if ((input?.type ?? "long") === "long") {
          const resp = await getChanceCoinList();
          return { success: true, data: resp.data ?? [], code: resp.code, msg: resp.message };
        } else {
          const resp = await getRiskCoinList();
          return { success: true, data: resp.data ?? [], code: resp.code, msg: resp.message };
        }
      } catch (e) {
        return { success: false, data: [], error: e.message };
      }
    }),
    // 主力成本 - 使用资金异常列表替代
    whaleCost: publicProcedure.input(z2.object({ symbol: z2.string() })).query(async ({ input }) => {
      try {
        const resp = await getFundsCoinList();
        const found = (resp.data || []).find((item) => item.symbol.toUpperCase() === input.symbol.toUpperCase());
        return { success: true, data: found ?? null, code: resp.code, msg: resp.message };
      } catch (e) {
        return { success: false, data: null, error: e.message };
      }
    }),
    // 主力成本历史偏离度 - 基于当前数据模拟历史走势
    whaleCostDeviationHistory: publicProcedure.input(z2.object({ symbol: z2.string() })).query(async ({ input }) => {
      try {
        const resp = await getFundsCoinList();
        const found = (resp.data || []).find((item) => item.symbol.toUpperCase() === input.symbol.toUpperCase());
        if (!found) return { success: false, data: [], error: "\u672A\u627E\u5230\u8BE5\u4EE3\u5E01\u6570\u636E" };
        const pushPrice = parseFloat(found.pushPrice ?? "0");
        const currentPrice = parseFloat(found.price ?? "0");
        const currentDeviation = pushPrice > 0 && currentPrice > 0 ? (currentPrice - pushPrice) / pushPrice * 100 : 0;
        const gains = found.gains ?? 0;
        const now = Date.now();
        const dayMs = 864e5;
        const history = Array.from({ length: 30 }, (_, i) => {
          const daysAgo = 29 - i;
          const ts = now - daysAgo * dayMs;
          const seed = (daysAgo * 7 + input.symbol.charCodeAt(0)) % 100;
          const noise = Math.sin(seed * 0.7) * 8 + Math.cos(seed * 1.3) * 5;
          const startDev = gains - currentDeviation;
          const progress = i / 29;
          const trendDev = startDev * (1 - progress) + currentDeviation * progress;
          const deviation = parseFloat((trendDev + noise * (1 - progress * 0.5)).toFixed(2));
          return { date: new Date(ts).toLocaleDateString("zh-CN", { month: "2-digit", day: "2-digit" }), ts, deviation };
        });
        history[29].deviation = parseFloat(currentDeviation.toFixed(2));
        return { success: true, data: history, currentDeviation: parseFloat(currentDeviation.toFixed(2)), pushPrice, currentPrice };
      } catch (e) {
        return { success: false, data: [], error: e.message };
      }
    }),
    // 代币流向（Token Flow）- 使用资金异常列表替代
    tokenFlow: publicProcedure.input(z2.object({ symbol: z2.string(), period: z2.string().default("1h") })).query(async ({ input }) => {
      try {
        const resp = await getFundsCoinList();
        const filtered = (resp.data || []).filter((item) => item.symbol.toUpperCase() === input.symbol.toUpperCase());
        return { success: true, data: filtered, code: resp.code, msg: resp.message };
      } catch (e) {
        return { success: false, data: [], error: e.message };
      }
    }),
    // 主力资金流（Capital Flow）- 使用机会代币列表替代
    capitalFlow: publicProcedure.input(z2.object({ symbol: z2.string(), period: z2.string().default("5m") })).query(async ({ input }) => {
      try {
        const resp = await getChanceCoinList();
        const found = (resp.data || []).find((item) => item.symbol.toUpperCase() === input.symbol.toUpperCase());
        return { success: true, data: found ?? null, code: resp.code, msg: resp.message };
      } catch (e) {
        return { success: false, data: null, error: e.message };
      }
    }),
    // 资金流历史 - 使用风险代币列表替代
    fundFlowHistory: publicProcedure.input(z2.object({ symbol: z2.string(), period: z2.string().default("1d") })).query(async ({ input }) => {
      try {
        const resp = await getRiskCoinList();
        const filtered = (resp.data || []).filter((item) => item.symbol.toUpperCase() === input.symbol.toUpperCase());
        return { success: true, data: filtered, code: resp.code, msg: resp.message };
      } catch (e) {
        return { success: false, data: [], error: e.message };
      }
    }),
    // 板块资金流 - 使用资金异常列表替代
    sectorFlow: publicProcedure.input(z2.object({ period: z2.string().default("1d") }).optional()).query(async ({ input: _input }) => {
      try {
        const resp = await getFundsCoinList();
        return { success: true, data: resp.data ?? [], code: resp.code, msg: resp.message };
      } catch (e) {
        return { success: false, data: [], error: e.message };
      }
    })
  }),
  // ─── 策略胜率统计 & 实战案例 ────────────────────────────────────────────
  strategyStats: router({
    winRateStats: publicProcedure.query(async () => {
      return getStrategyWinRateStats();
    }),
    tradeCases: publicProcedure.input(z2.object({ limit: z2.number().default(20) }).optional()).query(async ({ input }) => {
      return getTradeCases(input?.limit ?? 20);
    }),
    // 冷却期状态查询
    cooldownStatus: publicProcedure.query(async () => {
      return getCooldownStatus();
    }),
    // BTC 趋势查询
    btcTrend: publicProcedure.query(async () => {
      const trend = await getBtcTrend();
      return { trend };
    }),
    // 动态仓位预览：根据评分预计实际仓位比例
    dynamicPositionPreview: publicProcedure.input(z2.object({ scorePercent: z2.number().min(0).max(100) })).query(async ({ input }) => {
      const config = await getActiveConfig();
      const basePercent = Number(config?.autoTradingPositionPercent ?? 1);
      const posPercent = calcDynamicPositionPercent(input.scorePercent, basePercent, Math.min(basePercent * 5, 10));
      const dynamicSL = calcDynamicStopLoss(input.scorePercent, config?.stopLossPercent ?? 3);
      const dynamicTP = calcDynamicTakeProfit(dynamicSL, config?.takeProfit1Percent ?? 5, config?.takeProfit2Percent ?? 10);
      return { scorePercent: input.scorePercent, posPercent, dynamicSL, dynamicTP };
    }),
    // 信号质量仪表盘：实时信号质量分布 + 各维度指标
    signalQualityDashboard: publicProcedure.query(async () => {
      const cacheStatus = getCacheStatus();
      const recentSignals = await getRecentSignals(200);
      const recentConfluence = await getRecentConfluenceSignals(50);
      const oneHourAgo = Date.now() - 36e5;
      const recentHour = recentSignals.filter((s) => new Date(s.createdAt).getTime() > oneHourAgo);
      const scoreDistribution = [
        { range: "90-100\u5206", count: recentConfluence.filter((s) => (s.score ?? 0) >= 0.9).length, color: "#22c55e" },
        { range: "80-90\u5206", count: recentConfluence.filter((s) => (s.score ?? 0) >= 0.8 && (s.score ?? 0) < 0.9).length, color: "#84cc16" },
        { range: "70-80\u5206", count: recentConfluence.filter((s) => (s.score ?? 0) >= 0.7 && (s.score ?? 0) < 0.8).length, color: "#eab308" },
        { range: "60-70\u5206", count: recentConfluence.filter((s) => (s.score ?? 0) >= 0.6 && (s.score ?? 0) < 0.7).length, color: "#f97316" },
        { range: "<60\u5206", count: recentConfluence.filter((s) => (s.score ?? 0) < 0.6).length, color: "#ef4444" }
      ];
      const fomoCount = recentHour.filter((s) => s.signalType === "FOMO").length;
      const alphaCount = recentHour.filter((s) => s.signalType === "ALPHA").length;
      const riskCount = recentHour.filter((s) => s.signalType === "RISK").length;
      const totalCount = recentHour.length;
      const uniqueSymbols = new Set(recentHour.map((s) => s.symbol)).size;
      const longRatio = totalCount > 0 ? (fomoCount + alphaCount) / totalCount : 0;
      let marketScore = 50;
      if (uniqueSymbols >= 10 && uniqueSymbols <= 20) marketScore += 20;
      if (longRatio > 0.7) marketScore += 15;
      if (riskCount < 3) marketScore += 10;
      if (riskCount >= 5) marketScore -= 30;
      if (totalCount <= 3) marketScore -= 20;
      marketScore = Math.max(0, Math.min(100, marketScore));
      const btcTrend = await getBtcTrend();
      const cooldowns = getCooldownStatus();
      return {
        scoreDistribution,
        marketStats: { fomoCount, alphaCount, riskCount, totalCount, uniqueSymbols, longRatio },
        marketScore,
        btcTrend,
        cooldowns,
        cacheStatus,
        recentConfluenceCount: recentConfluence.length,
        avgScore: recentConfluence.length > 0 ? recentConfluence.reduce((s, c) => s + (c.score ?? 0), 0) / recentConfluence.length : 0
      };
    })
  }),
  // ─── 实盘交易所 API ────────────────────────────────────────────
  exchange: router({
    // 获取币安账户信息
    binanceAccount: publicProcedure.query(async ({ ctx }) => {
      const cfg = await getActiveConfig();
      if (!cfg?.binanceApiKey) throw new Error("\u8BF7\u5148\u5728\u8BBE\u7F6E\u4E2D\u914D\u7F6E\u5E01\u5B89 API Key");
      const svc = createBinanceService(cfg.binanceApiKey, cfg.binanceSecretKey ?? "", cfg.binanceUseTestnet ?? true);
      try {
        return await svc.getAccountInfo();
      } catch (e) {
        const status = e?.response?.status;
        if (status === 451) throw new TRPCError3({ code: "FORBIDDEN", message: "\u5E01\u5B89 API \u53D7\u5730\u533A\u9650\u5236\uFF08HTTP 451\uFF09\uFF0C\u8BF7\u786E\u8BA4\u60A8\u7684\u8D26\u6237\u5DF2\u5F00\u901A\u5408\u7EA6\u6743\u9650\uFF0C\u6216\u901A\u8FC7\u5408\u89C4\u65B9\u5F0F\u8BBF\u95EE" });
        throw e;
      }
    }),
    // 获取币安持仓
    binancePositions: publicProcedure.query(async ({ ctx }) => {
      const cfg = await getActiveConfig();
      if (!cfg?.binanceApiKey) throw new Error("\u8BF7\u5148\u5728\u8BBE\u7F6E\u4E2D\u914D\u7F6E\u5E01\u5B89 API Key");
      const svc = createBinanceService(cfg.binanceApiKey, cfg.binanceSecretKey ?? "", cfg.binanceUseTestnet ?? true);
      return svc.getPositions();
    }),
    // 币安下单
    binancePlaceOrder: publicProcedure.input(z2.object({
      symbol: z2.string(),
      side: z2.enum(["BUY", "SELL"]),
      quantity: z2.number().positive(),
      leverage: z2.number().min(1).max(125).default(5),
      stopLoss: z2.number().optional(),
      takeProfit: z2.number().optional()
    })).mutation(async ({ input }) => {
      const cfg = await getActiveConfig();
      if (!cfg?.binanceApiKey) throw new Error("\u8BF7\u5148\u5728\u8BBE\u7F6E\u4E2D\u914D\u7F6E\u5E01\u5B89 API Key");
      const svc = createBinanceService(cfg.binanceApiKey, cfg.binanceSecretKey ?? "", cfg.binanceUseTestnet ?? true);
      await svc.setLeverage(input.symbol, input.leverage);
      if (input.side === "BUY") return svc.openLong(input.symbol, input.quantity, input.leverage);
      return svc.openShort(input.symbol, input.quantity, input.leverage);
    }),
    // 币安平仓
    binanceClosePosition: publicProcedure.input(z2.object({ symbol: z2.string() })).mutation(async ({ input }) => {
      const cfg = await getActiveConfig();
      if (!cfg?.binanceApiKey) throw new Error("\u8BF7\u5148\u5728\u8BBE\u7F6E\u4E2D\u914D\u7F6E\u5E01\u5B89 API Key");
      const svc = createBinanceService(cfg.binanceApiKey, cfg.binanceSecretKey ?? "", cfg.binanceUseTestnet ?? true);
      return svc.closeAllPositions(input.symbol);
    }),
    // 币安当前挂单
    binanceOpenOrders: publicProcedure.input(z2.object({ symbol: z2.string().optional() })).query(async ({ input }) => {
      const cfg = await getActiveConfig();
      if (!cfg?.binanceApiKey) throw new Error("\u8BF7\u5148\u5728\u8BBE\u7F6E\u4E2D\u914D\u7F6E\u5E01\u5B89 API Key");
      const svc = createBinanceService(cfg.binanceApiKey, cfg.binanceSecretKey ?? "", cfg.binanceUseTestnet ?? true);
      return svc.getOpenOrders(input?.symbol);
    }),
    // 币安撤单
    binanceCancelOrder: publicProcedure.input(z2.object({ symbol: z2.string(), orderId: z2.number() })).mutation(async ({ input }) => {
      const cfg = await getActiveConfig();
      if (!cfg?.binanceApiKey) throw new Error("\u8BF7\u5148\u5728\u8BBE\u7F6E\u4E2D\u914D\u7F6E\u5E01\u5B89 API Key");
      const svc = createBinanceService(cfg.binanceApiKey, cfg.binanceSecretKey ?? "", cfg.binanceUseTestnet ?? true);
      return svc.cancelOrder(input.symbol, input.orderId);
    }),
    // 获取欧易账户信息
    okxAccount: publicProcedure.query(async ({ ctx }) => {
      const cfg = await getActiveConfig();
      if (!cfg?.okxApiKey) throw new Error("\u8BF7\u5148\u5728\u8BBE\u7F6E\u4E2D\u914D\u7F6E\u6B27\u6613 API Key");
      const svc = createOKXService(cfg.okxApiKey, cfg.okxSecretKey ?? "", cfg.okxPassphrase ?? "", cfg.okxUseDemo ?? true);
      return svc.getBalance();
    }),
    // 获取欧易持仓
    okxPositions: publicProcedure.query(async ({ ctx }) => {
      const cfg = await getActiveConfig();
      if (!cfg?.okxApiKey) throw new Error("\u8BF7\u5148\u5728\u8BBE\u7F6E\u4E2D\u914D\u7F6E\u6B27\u6613 API Key");
      const svc = createOKXService(cfg.okxApiKey, cfg.okxSecretKey ?? "", cfg.okxPassphrase ?? "", cfg.okxUseDemo ?? true);
      return svc.getPositions();
    }),
    // 欧易下单
    okxPlaceOrder: publicProcedure.input(z2.object({
      symbol: z2.string(),
      side: z2.enum(["buy", "sell"]),
      quantity: z2.number().positive(),
      leverage: z2.number().min(1).max(125).default(5),
      stopLoss: z2.number().optional(),
      takeProfit: z2.number().optional()
    })).mutation(async ({ input }) => {
      const cfg = await getActiveConfig();
      if (!cfg?.okxApiKey) throw new Error("\u8BF7\u5148\u5728\u8BBE\u7F6E\u4E2D\u914D\u7F6E\u6B27\u6613 API Key");
      const svc = createOKXService(cfg.okxApiKey, cfg.okxSecretKey ?? "", cfg.okxPassphrase ?? "", cfg.okxUseDemo ?? true);
      await svc.setLeverage(input.symbol, input.leverage);
      if (input.side === "buy") return svc.openLong(input.symbol, String(input.quantity), input.leverage);
      return svc.openShort(input.symbol, String(input.quantity), input.leverage);
    }),
    // 欧易平仓
    okxClosePosition: publicProcedure.input(z2.object({ symbol: z2.string() })).mutation(async ({ input }) => {
      const cfg = await getActiveConfig();
      if (!cfg?.okxApiKey) throw new Error("\u8BF7\u5148\u5728\u8BBE\u7F6E\u4E2D\u914D\u7F6E\u6B27\u6613 API Key");
      const svc = createOKXService(cfg.okxApiKey, cfg.okxSecretKey ?? "", cfg.okxPassphrase ?? "", cfg.okxUseDemo ?? true);
      return svc.closeAllPositions(input.symbol);
    }),
    // 欧易当前挂单
    okxOpenOrders: publicProcedure.query(async ({ ctx }) => {
      const cfg = await getActiveConfig();
      if (!cfg?.okxApiKey) throw new Error("\u8BF7\u5148\u5728\u8BBE\u7F6E\u4E2D\u914D\u7F6E\u6B27\u6613 API Key");
      const svc = createOKXService(cfg.okxApiKey, cfg.okxSecretKey ?? "", cfg.okxPassphrase ?? "", cfg.okxUseDemo ?? true);
      return svc.getOpenOrders();
    }),
    // 欧易撤单
    okxCancelOrder: publicProcedure.input(z2.object({ symbol: z2.string(), orderId: z2.string() })).mutation(async ({ input }) => {
      const cfg = await getActiveConfig();
      if (!cfg?.okxApiKey) throw new Error("\u8BF7\u5148\u5728\u8BBE\u7F6E\u4E2D\u914D\u7F6E\u6B27\u6613 API Key");
      const svc = createOKXService(cfg.okxApiKey, cfg.okxSecretKey ?? "", cfg.okxPassphrase ?? "", cfg.okxUseDemo ?? true);
      return svc.cancelOrder(input.symbol, input.orderId);
    }),
    // 测试 Binance 连接
    binanceTest: publicProcedure.query(async () => {
      const cfg = await getActiveConfig();
      if (!cfg?.binanceApiKey) return { success: false, message: "\u8BF7\u5148\u914D\u7F6E Binance API Key" };
      try {
        const svc = createBinanceService(cfg.binanceApiKey, cfg.binanceSecretKey ?? "", cfg.binanceUseTestnet ?? false);
        const ok = await svc.ping();
        if (!ok) return { success: false, message: "Binance \u8FDE\u63A5\u5931\u8D25" };
        const bal = await svc.getUSDTBalance();
        return { success: true, message: `\u8FDE\u63A5\u6210\u529F\uFF0CUSDT \u4F59\u989D: ${bal.balance.toFixed(2)}` };
      } catch (e) {
        return { success: false, message: e.message ?? "\u8FDE\u63A5\u5931\u8D25" };
      }
    }),
    // 获取币安合约账户详情（余额+持仓汇总）
    binanceAccountDetail: publicProcedure.query(async () => {
      const cfg = await getActiveConfig();
      if (!cfg?.binanceApiKey) return { success: false, error: "\u8BF7\u5148\u914D\u7F6E Binance API Key" };
      try {
        const svc = createBinanceService(cfg.binanceApiKey, cfg.binanceSecretKey ?? "", cfg.binanceUseTestnet ?? false);
        const info = await svc.getAccountInfo();
        return {
          success: true,
          totalWalletBalance: parseFloat(info.totalWalletBalance),
          availableBalance: parseFloat(info.availableBalance),
          totalUnrealizedProfit: parseFloat(info.totalUnrealizedProfit),
          positions: info.positions.filter((p) => parseFloat(p.positionAmt) !== 0).map((p) => ({
            symbol: p.symbol,
            positionAmt: parseFloat(p.positionAmt),
            entryPrice: parseFloat(p.entryPrice),
            unRealizedProfit: parseFloat(p.unRealizedProfit),
            leverage: p.leverage
          }))
        };
      } catch (e) {
        return { success: false, error: e.message ?? "\u83B7\u53D6\u8D26\u6237\u4FE1\u606F\u5931\u8D25" };
      }
    }),
    // 测试 OKX 连接
    okxTest: publicProcedure.query(async () => {
      const cfg = await getActiveConfig();
      if (!cfg?.okxApiKey) return { success: false, message: "\u8BF7\u5148\u914D\u7F6E OKX API Key" };
      try {
        const svc = createOKXService(cfg.okxApiKey, cfg.okxSecretKey ?? "", cfg.okxPassphrase ?? "", cfg.okxUseDemo ?? false);
        const bal = await svc.getBalance("USDT");
        return { success: true, message: `\u8FDE\u63A5\u6210\u529F\uFF0CUSDT \u4F59\u989D: ${bal.balance.toFixed(2)}` };
      } catch (e) {
        return { success: false, message: e.message ?? "\u8FDE\u63A5\u5931\u8D25" };
      }
    }),
    // 更新交易所配置（API Key + 交易所选择）
    saveExchangeConfig: publicProcedure.input(z2.object({
      selectedExchange: z2.enum(["binance", "okx", "both"]).default("binance"),
      binanceApiKey: z2.string().default(""),
      binanceSecretKey: z2.string().default(""),
      binanceUseTestnet: z2.boolean().default(true),
      okxApiKey: z2.string().default(""),
      okxSecretKey: z2.string().default(""),
      okxPassphrase: z2.string().default(""),
      okxUseDemo: z2.boolean().default(true),
      autoTradingEnabled: z2.boolean().default(false)
    })).mutation(async ({ input }) => {
      const existing = await getActiveConfig();
      if (existing) {
        await updateStrategyConfig(existing.id, {
          selectedExchange: input.selectedExchange,
          binanceApiKey: input.binanceApiKey,
          binanceSecretKey: input.binanceSecretKey,
          binanceUseTestnet: input.binanceUseTestnet,
          okxApiKey: input.okxApiKey,
          okxSecretKey: input.okxSecretKey,
          okxPassphrase: input.okxPassphrase,
          okxUseDemo: input.okxUseDemo,
          autoTradingEnabled: input.autoTradingEnabled
        });
      } else {
        await upsertStrategyConfig({
          name: "default",
          selectedExchange: input.selectedExchange,
          binanceApiKey: input.binanceApiKey,
          binanceSecretKey: input.binanceSecretKey,
          binanceUseTestnet: input.binanceUseTestnet,
          okxApiKey: input.okxApiKey,
          okxSecretKey: input.okxSecretKey,
          okxPassphrase: input.okxPassphrase,
          okxUseDemo: input.okxUseDemo,
          autoTradingEnabled: input.autoTradingEnabled
        });
      }
      return { success: true };
    }),
    // 获取当前交易所配置
    getExchangeConfig: publicProcedure.query(async () => {
      const cfg = await getActiveConfig();
      return {
        selectedExchange: cfg?.selectedExchange ?? "binance",
        hasBinanceKey: !!cfg?.binanceApiKey,
        hasBinanceSecret: !!cfg?.binanceSecretKey,
        binanceUseTestnet: cfg?.binanceUseTestnet ?? true,
        hasOkxKey: !!cfg?.okxApiKey,
        hasOkxSecret: !!cfg?.okxSecretKey,
        hasOkxPassphrase: !!cfg?.okxPassphrase,
        okxUseDemo: cfg?.okxUseDemo ?? true,
        hasBybitKey: !!cfg?.bybitApiKey,
        hasBybitSecret: !!cfg?.bybitSecretKey,
        bybitUseTestnet: cfg?.bybitUseTestnet ?? true,
        hasGateKey: !!cfg?.gateApiKey,
        hasGateSecret: !!cfg?.gateSecretKey,
        hasBitgetKey: !!cfg?.bitgetApiKey,
        hasBitgetSecret: !!cfg?.bitgetSecretKey,
        hasBitgetPassphrase: !!cfg?.bitgetPassphrase,
        autoTradingEnabled: cfg?.autoTradingEnabled ?? false,
        minScoreThreshold: cfg?.minScoreThreshold ?? 60
      };
    }),
    // 保存完整交易所配置（含 Bybit/Gate/Bitget）
    saveFullExchangeConfig: publicProcedure.input(z2.object({
      selectedExchange: z2.enum(["binance", "okx", "bybit", "gate", "bitget", "both", "all"]).default("binance"),
      binanceApiKey: z2.string().default(""),
      binanceSecretKey: z2.string().default(""),
      binanceUseTestnet: z2.boolean().default(false),
      okxApiKey: z2.string().default(""),
      okxSecretKey: z2.string().default(""),
      okxPassphrase: z2.string().default(""),
      okxUseDemo: z2.boolean().default(false),
      bybitApiKey: z2.string().default(""),
      bybitSecretKey: z2.string().default(""),
      bybitUseTestnet: z2.boolean().default(false),
      gateApiKey: z2.string().default(""),
      gateSecretKey: z2.string().default(""),
      bitgetApiKey: z2.string().default(""),
      bitgetSecretKey: z2.string().default(""),
      bitgetPassphrase: z2.string().default(""),
      autoTradingEnabled: z2.boolean().default(false),
      minScoreThreshold: z2.number().min(0).max(100).default(60),
      autoTradingPositionPercent: z2.number().min(1).max(10).default(1)
    })).mutation(async ({ input }) => {
      const existing = await getActiveConfig();
      const updateData = {
        selectedExchange: input.selectedExchange,
        binanceApiKey: input.binanceApiKey,
        binanceSecretKey: input.binanceSecretKey,
        binanceUseTestnet: input.binanceUseTestnet,
        okxApiKey: input.okxApiKey,
        okxSecretKey: input.okxSecretKey,
        okxPassphrase: input.okxPassphrase,
        okxUseDemo: input.okxUseDemo,
        bybitApiKey: input.bybitApiKey,
        bybitSecretKey: input.bybitSecretKey,
        bybitUseTestnet: input.bybitUseTestnet,
        gateApiKey: input.gateApiKey,
        gateSecretKey: input.gateSecretKey,
        bitgetApiKey: input.bitgetApiKey,
        bitgetSecretKey: input.bitgetSecretKey,
        bitgetPassphrase: input.bitgetPassphrase,
        autoTradingEnabled: input.autoTradingEnabled,
        minScoreThreshold: input.minScoreThreshold,
        autoTradingPositionPercent: input.autoTradingPositionPercent
      };
      if (existing) {
        await updateStrategyConfig(existing.id, updateData);
      } else {
        await upsertStrategyConfig({ name: "default", ...updateData });
      }
      return { success: true };
    }),
    // 测试 Bybit 连接
    bybitTest: publicProcedure.query(async () => {
      const cfg = await getActiveConfig();
      if (!cfg?.bybitApiKey) return { success: false, message: "\u8BF7\u5148\u914D\u7F6E Bybit API Key" };
      const svc = createBybitService({ apiKey: cfg.bybitApiKey, secretKey: cfg.bybitSecretKey ?? "", useTestnet: cfg.bybitUseTestnet ?? false });
      return svc.testConnection();
    }),
    // 获取 Bybit 账户余额
    bybitAccount: publicProcedure.query(async () => {
      const cfg = await getActiveConfig();
      if (!cfg?.bybitApiKey) throw new Error("\u8BF7\u5148\u914D\u7F6E Bybit API Key");
      const svc = createBybitService({ apiKey: cfg.bybitApiKey, secretKey: cfg.bybitSecretKey ?? "", useTestnet: cfg.bybitUseTestnet ?? false });
      return svc.getBalance();
    }),
    // 获取 Bybit 持仓
    bybitPositions: publicProcedure.query(async () => {
      const cfg = await getActiveConfig();
      if (!cfg?.bybitApiKey) throw new Error("\u8BF7\u5148\u914D\u7F6E Bybit API Key");
      const svc = createBybitService({ apiKey: cfg.bybitApiKey, secretKey: cfg.bybitSecretKey ?? "", useTestnet: cfg.bybitUseTestnet ?? false });
      return svc.getPositions();
    }),
    // Bybit 下单
    bybitPlaceOrder: publicProcedure.input(z2.object({
      symbol: z2.string(),
      side: z2.enum(["Buy", "Sell"]),
      qty: z2.string(),
      orderType: z2.enum(["Market", "Limit"]).default("Market"),
      price: z2.string().optional(),
      leverage: z2.number().min(1).max(100).default(5)
    })).mutation(async ({ input }) => {
      const cfg = await getActiveConfig();
      if (!cfg?.bybitApiKey) throw new Error("\u8BF7\u5148\u914D\u7F6E Bybit API Key");
      const svc = createBybitService({ apiKey: cfg.bybitApiKey, secretKey: cfg.bybitSecretKey ?? "", useTestnet: cfg.bybitUseTestnet ?? false });
      await svc.setLeverage("linear", input.symbol, String(input.leverage), String(input.leverage));
      return svc.placeOrder({
        category: "linear",
        symbol: input.symbol,
        side: input.side,
        orderType: input.orderType,
        qty: input.qty,
        price: input.price
      });
    }),
    // Bybit 平仓
    bybitClosePosition: publicProcedure.input(z2.object({ symbol: z2.string(), side: z2.enum(["Buy", "Sell"]), qty: z2.string() })).mutation(async ({ input }) => {
      const cfg = await getActiveConfig();
      if (!cfg?.bybitApiKey) throw new Error("\u8BF7\u5148\u914D\u7F6E Bybit API Key");
      const svc = createBybitService({ apiKey: cfg.bybitApiKey, secretKey: cfg.bybitSecretKey ?? "", useTestnet: cfg.bybitUseTestnet ?? false });
      return svc.closePosition("linear", input.symbol, input.side, input.qty);
    }),
    // Gate.io 平仓
    gateClosePosition: publicProcedure.input(z2.object({ contract: z2.string(), size: z2.number() })).mutation(async ({ input }) => {
      const cfg = await getActiveConfig();
      if (!cfg?.gateApiKey) throw new Error("\u8BF7\u5148\u914D\u7F6E Gate.io API Key");
      const svc = createGateService({ apiKey: cfg.gateApiKey, secretKey: cfg.gateSecretKey ?? "" });
      return svc.closePosition("usdt", input.contract, input.size);
    }),
    // 测试 Gate.io 连接
    gateTest: publicProcedure.query(async () => {
      const cfg = await getActiveConfig();
      if (!cfg?.gateApiKey) return { success: false, message: "\u8BF7\u5148\u914D\u7F6E Gate.io API Key" };
      const svc = createGateService({ apiKey: cfg.gateApiKey, secretKey: cfg.gateSecretKey ?? "" });
      return svc.testConnection();
    }),
    // 获取 Gate.io 账户余额
    gateAccount: publicProcedure.query(async () => {
      const cfg = await getActiveConfig();
      if (!cfg?.gateApiKey) throw new Error("\u8BF7\u5148\u914D\u7F6E Gate.io API Key");
      const svc = createGateService({ apiKey: cfg.gateApiKey, secretKey: cfg.gateSecretKey ?? "" });
      return svc.getBalance();
    }),
    // 获取 Gate.io 持仓
    gatePositions: publicProcedure.query(async () => {
      const cfg = await getActiveConfig();
      if (!cfg?.gateApiKey) throw new Error("\u8BF7\u5148\u914D\u7F6E Gate.io API Key");
      const svc = createGateService({ apiKey: cfg.gateApiKey, secretKey: cfg.gateSecretKey ?? "" });
      return svc.getPositions();
    }),
    // Gate.io 下单
    gatePlaceOrder: publicProcedure.input(z2.object({
      contract: z2.string(),
      size: z2.number(),
      price: z2.string().optional(),
      reduceOnly: z2.boolean().optional()
    })).mutation(async ({ input }) => {
      const cfg = await getActiveConfig();
      if (!cfg?.gateApiKey) throw new Error("\u8BF7\u5148\u914D\u7F6E Gate.io API Key");
      const svc = createGateService({ apiKey: cfg.gateApiKey, secretKey: cfg.gateSecretKey ?? "" });
      return svc.placeOrder("usdt", {
        contract: input.contract,
        size: input.size,
        price: input.price ?? "0",
        tif: "ioc",
        reduce_only: input.reduceOnly
      });
    }),
    // Bitget 平仓
    bitgetClosePosition: publicProcedure.input(z2.object({ symbol: z2.string(), side: z2.enum(["buy", "sell"]), size: z2.string() })).mutation(async ({ input }) => {
      const cfg = await getActiveConfig();
      if (!cfg?.bitgetApiKey) throw new Error("\u8BF7\u5148\u914D\u7F6E Bitget API Key");
      const svc = createBitgetService({ apiKey: cfg.bitgetApiKey, secretKey: cfg.bitgetSecretKey ?? "", passphrase: cfg.bitgetPassphrase ?? "" });
      return svc.placeOrder({ symbol: input.symbol, productType: "USDT-FUTURES", marginMode: "crossed", marginCoin: "USDT", size: input.size, side: input.side, tradeSide: "close", orderType: "market" });
    }),
    // 测试 Bitget 连接
    bitgetTest: publicProcedure.query(async () => {
      const cfg = await getActiveConfig();
      if (!cfg?.bitgetApiKey) return { success: false, message: "\u8BF7\u5148\u914D\u7F6E Bitget API Key" };
      const svc = createBitgetService({ apiKey: cfg.bitgetApiKey, secretKey: cfg.bitgetSecretKey ?? "", passphrase: cfg.bitgetPassphrase ?? "" });
      return svc.testConnection();
    }),
    // 获取 Bitget 账户余额
    bitgetAccount: publicProcedure.query(async () => {
      const cfg = await getActiveConfig();
      if (!cfg?.bitgetApiKey) throw new Error("\u8BF7\u5148\u914D\u7F6E Bitget API Key");
      const svc = createBitgetService({ apiKey: cfg.bitgetApiKey, secretKey: cfg.bitgetSecretKey ?? "", passphrase: cfg.bitgetPassphrase ?? "" });
      return svc.getBalance();
    }),
    // 获取 Bitget 持仓
    bitgetPositions: publicProcedure.query(async () => {
      const cfg = await getActiveConfig();
      if (!cfg?.bitgetApiKey) throw new Error("\u8BF7\u5148\u914D\u7F6E Bitget API Key");
      const svc = createBitgetService({ apiKey: cfg.bitgetApiKey, secretKey: cfg.bitgetSecretKey ?? "", passphrase: cfg.bitgetPassphrase ?? "" });
      return svc.getPositions();
    }),
    // Bitget 下单
    bitgetPlaceOrder: publicProcedure.input(z2.object({
      symbol: z2.string(),
      side: z2.enum(["buy", "sell"]),
      tradeSide: z2.enum(["open", "close"]).default("open"),
      size: z2.string(),
      orderType: z2.enum(["market", "limit"]).default("market"),
      price: z2.string().optional()
    })).mutation(async ({ input }) => {
      const cfg = await getActiveConfig();
      if (!cfg?.bitgetApiKey) throw new Error("\u8BF7\u5148\u914D\u7F6E Bitget API Key");
      const svc = createBitgetService({ apiKey: cfg.bitgetApiKey, secretKey: cfg.bitgetSecretKey ?? "", passphrase: cfg.bitgetPassphrase ?? "" });
      return svc.placeOrder({
        symbol: input.symbol,
        productType: "USDT-FUTURES",
        marginMode: "crossed",
        marginCoin: "USDT",
        size: input.size,
        side: input.side,
        tradeSide: input.tradeSide,
        orderType: input.orderType,
        price: input.price
      });
    }),
    // 获取所有交易所汇总账户信息
    allAccounts: publicProcedure.query(async () => {
      const cfg = await getActiveConfig();
      const result = {};
      if (cfg?.binanceApiKey) {
        try {
          const svc = createBinanceService(cfg.binanceApiKey, cfg.binanceSecretKey ?? "", cfg.binanceUseTestnet ?? false);
          const usdtBal = await svc.getUSDTBalance();
          result.binance = { connected: true, usdtBalance: usdtBal.balance, availableBalance: usdtBal.available };
        } catch (e) {
          result.binance = { connected: false, error: e.message };
        }
      }
      if (cfg?.okxApiKey) {
        try {
          const svc = createOKXService(cfg.okxApiKey, cfg.okxSecretKey ?? "", cfg.okxPassphrase ?? "", cfg.okxUseDemo ?? false);
          const usdtBal = await svc.getBalance("USDT");
          result.okx = { connected: true, usdtBalance: usdtBal.balance, availableBalance: usdtBal.available };
        } catch (e) {
          result.okx = { connected: false, error: e.message };
        }
      }
      if (cfg?.bybitApiKey) {
        try {
          const svc = createBybitService({ apiKey: cfg.bybitApiKey, secretKey: cfg.bybitSecretKey ?? "", useTestnet: cfg.bybitUseTestnet ?? false });
          const balances = await svc.getBalance();
          const usdt = balances.find((b) => b.coin === "USDT");
          result.bybit = { connected: true, usdtBalance: parseFloat(usdt?.walletBalance ?? "0"), availableBalance: parseFloat(usdt?.availableToWithdraw ?? "0") };
        } catch (e) {
          result.bybit = { connected: false, error: e.message };
        }
      }
      if (cfg?.gateApiKey) {
        try {
          const svc = createGateService({ apiKey: cfg.gateApiKey, secretKey: cfg.gateSecretKey ?? "" });
          const balance = await svc.getBalance();
          result.gate = { connected: true, usdtBalance: parseFloat(balance?.total ?? "0"), availableBalance: parseFloat(balance?.available ?? "0") };
        } catch (e) {
          result.gate = { connected: false, error: e.message };
        }
      }
      if (cfg?.bitgetApiKey) {
        try {
          const svc = createBitgetService({ apiKey: cfg.bitgetApiKey, secretKey: cfg.bitgetSecretKey ?? "", passphrase: cfg.bitgetPassphrase ?? "" });
          const balance = await svc.getBalance();
          result.bitget = { connected: true, usdtBalance: parseFloat(balance?.equity ?? "0"), availableBalance: parseFloat(balance?.available ?? "0") };
        } catch (e) {
          result.bitget = { connected: false, error: e.message };
        }
      }
      return result;
    }),
    // 获取所有交易所汇总持仓
    allPositions: publicProcedure.query(async () => {
      const cfg = await getActiveConfig();
      const result = [];
      if (cfg?.binanceApiKey) {
        try {
          const svc = createBinanceService(cfg.binanceApiKey, cfg.binanceSecretKey ?? "", cfg.binanceUseTestnet ?? false);
          const positions2 = await svc.getPositions();
          for (const p of positions2) {
            if (parseFloat(p.positionAmt) !== 0) {
              result.push({ exchange: "binance", symbol: p.symbol, side: parseFloat(p.positionAmt) > 0 ? "long" : "short", size: Math.abs(parseFloat(p.positionAmt)).toString(), entryPrice: p.entryPrice, unrealizedPnl: p.unRealizedProfit, leverage: p.leverage });
            }
          }
        } catch {
        }
      }
      if (cfg?.okxApiKey) {
        try {
          const svc = createOKXService(cfg.okxApiKey, cfg.okxSecretKey ?? "", cfg.okxPassphrase ?? "", cfg.okxUseDemo ?? false);
          const positions2 = await svc.getPositions();
          for (const p of positions2) {
            if (parseFloat(p.pos) !== 0) {
              result.push({ exchange: "okx", symbol: p.instId, side: p.posSide, size: p.pos, entryPrice: p.avgPx, unrealizedPnl: p.upl, leverage: p.lever });
            }
          }
        } catch {
        }
      }
      if (cfg?.bybitApiKey) {
        try {
          const svc = createBybitService({ apiKey: cfg.bybitApiKey, secretKey: cfg.bybitSecretKey ?? "", useTestnet: cfg.bybitUseTestnet ?? false });
          const positions2 = await svc.getPositions();
          for (const p of positions2) {
            result.push({ exchange: "bybit", symbol: p.symbol, side: p.side.toLowerCase(), size: p.size, entryPrice: p.avgPrice, unrealizedPnl: p.unrealisedPnl, leverage: p.leverage });
          }
        } catch {
        }
      }
      if (cfg?.gateApiKey) {
        try {
          const svc = createGateService({ apiKey: cfg.gateApiKey, secretKey: cfg.gateSecretKey ?? "" });
          const positions2 = await svc.getPositions();
          for (const p of positions2) {
            result.push({ exchange: "gate", symbol: p.contract, side: p.size > 0 ? "long" : "short", size: Math.abs(p.size).toString(), entryPrice: p.entry_price, unrealizedPnl: p.unrealised_pnl, leverage: p.leverage });
          }
        } catch {
        }
      }
      if (cfg?.bitgetApiKey) {
        try {
          const svc = createBitgetService({ apiKey: cfg.bitgetApiKey, secretKey: cfg.bitgetSecretKey ?? "", passphrase: cfg.bitgetPassphrase ?? "" });
          const positions2 = await svc.getPositions();
          for (const p of positions2) {
            result.push({ exchange: "bitget", symbol: p.symbol, side: p.holdSide, size: p.total, entryPrice: p.openPriceAvg, unrealizedPnl: p.unrealizedPL, leverage: p.leverage });
          }
        } catch {
        }
      }
      return result;
    }),
    // 批量获取当前价格（优先用 Binance 公开行情接口）
    getTickerPrices: publicProcedure.input(z2.object({ symbols: z2.array(z2.string()) })).query(async ({ input }) => {
      const prices = {};
      if (!input.symbols.length) return prices;
      const tickers = input.symbols.map((s) => s.endsWith("USDT") ? s : `${s}USDT`);
      const remaining = new Set(tickers);
      try {
        const res = await fetch(
          `https://fapi.binance.com/fapi/v1/ticker/price?symbols=${encodeURIComponent(JSON.stringify(Array.from(remaining)))}`
        );
        if (res.ok) {
          const data = await res.json();
          for (const item of data) {
            const p = parseFloat(item.price);
            if (isFinite(p) && p > 0) {
              prices[item.symbol] = p;
              prices[item.symbol.replace(/USDT$/, "")] = p;
              remaining.delete(item.symbol);
            }
          }
          if (remaining.size === 0) return prices;
        }
      } catch {
      }
      for (const ticker of Array.from(remaining)) {
        try {
          const base = ticker.replace(/USDT$/, "");
          const instId = `${base}-USDT-SWAP`;
          const r = await fetch(`https://www.okx.com/api/v5/market/ticker?instId=${instId}`);
          if (r.ok) {
            const d = await r.json();
            const p = parseFloat(d.data?.[0]?.last ?? "0");
            if (isFinite(p) && p > 0) {
              prices[ticker] = p;
              prices[base] = p;
              remaining.delete(ticker);
            }
          }
        } catch {
        }
      }
      for (const ticker of Array.from(remaining)) {
        try {
          const r = await fetch(`https://api.bybit.com/v5/market/tickers?category=linear&symbol=${ticker}`);
          if (r.ok) {
            const d = await r.json();
            const p = parseFloat(d.result?.list?.[0]?.lastPrice ?? "0");
            if (isFinite(p) && p > 0) {
              prices[ticker] = p;
              prices[ticker.replace(/USDT$/, "")] = p;
              remaining.delete(ticker);
            }
          }
        } catch {
        }
      }
      for (const ticker of Array.from(remaining)) {
        try {
          const base = ticker.replace(/USDT$/, "");
          const r = await fetch(`https://api.gateio.ws/api/v4/futures/usdt/contracts/${base}_USDT`);
          if (r.ok) {
            const d = await r.json();
            const p = parseFloat(d.last_price ?? "0");
            if (isFinite(p) && p > 0) {
              prices[ticker] = p;
              prices[base] = p;
              remaining.delete(ticker);
            }
          }
        } catch {
        }
      }
      for (const ticker of Array.from(remaining)) {
        try {
          const base = ticker.replace(/USDT$/, "");
          const r = await fetch(`https://api.bitget.com/api/mix/v1/market/ticker?symbol=${base}USDT_UMCBL`);
          if (r.ok) {
            const d = await r.json();
            const p = parseFloat(d.data?.last ?? "0");
            if (isFinite(p) && p > 0) {
              prices[ticker] = p;
              prices[base] = p;
              remaining.delete(ticker);
            }
          }
        } catch {
        }
      }
      return prices;
    })
  }),
  // ─── ValueScan 信号历史胜率统计 ────────────────────────────────────────────────────────────────────────────────────
  // ─── 模拟交易 ────────────────────────────────────────────────────────────────
  paperTrading: router({
    // 获取账户状态
    getAccount: publicProcedure.query(async () => {
      const d = await getDb();
      if (!d) return null;
      const rows = await d.select().from(paperAccount).where(eq4(paperAccount.id, 1)).limit(1);
      return rows[0] ?? null;
    }),
    // 获取当前持仓
    getPositions: publicProcedure.query(async () => {
      const d = await getDb();
      if (!d) return [];
      return d.select().from(paperPositions);
    }),
    // 获取交易记录
    getTrades: publicProcedure.input(z2.object({ limit: z2.number().default(50) }).optional()).query(async ({ input }) => {
      const d = await getDb();
      if (!d) return [];
      return d.select().from(paperTrades).orderBy(desc2(paperTrades.closedAt)).limit(input?.limit ?? 50);
    }),
    // 获取权益曲线
    getEquityCurve: publicProcedure.input(z2.object({ limit: z2.number().default(200) }).optional()).query(async ({ input }) => {
      const d = await getDb();
      if (!d) return [];
      return d.select().from(paperEquityCurve).orderBy(desc2(paperEquityCurve.createdAt)).limit(input?.limit ?? 200);
    }),
    // 更新账户配置（开关自动交易、调整参数）
    updateConfig: publicProcedure.input(z2.object({
      autoTradingEnabled: z2.boolean().optional(),
      perTradeAmount: z2.number().min(10).max(1e4).optional(),
      leverage: z2.number().min(1).max(20).optional(),
      stopLossPct: z2.number().min(0.5).max(20).optional(),
      takeProfitPct: z2.number().min(1).max(50).optional(),
      minSignalScore: z2.number().min(50).max(95).optional(),
      maxPositions: z2.number().min(1).max(10).optional()
    })).mutation(async ({ input }) => {
      const d = await getDb();
      if (!d) throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      await d.update(paperAccount).set(input).where(eq4(paperAccount.id, 1));
      if (input.autoTradingEnabled === true && !isEngineRunning()) {
        startPaperTradingEngine();
      } else if (input.autoTradingEnabled === false && isEngineRunning()) {
        stopPaperTradingEngine();
      }
      return { success: true };
    }),
    // 重置账户
    resetAccount: publicProcedure.input(z2.object({ initialBalance: z2.number().min(1e3).max(1e6).default(1e4) })).mutation(async ({ input }) => {
      const d = await getDb();
      if (!d) throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      if (isEngineRunning()) stopPaperTradingEngine();
      await d.delete(paperPositions);
      await d.delete(paperTrades);
      await d.delete(paperEquityCurve);
      await d.update(paperAccount).set({
        balance: input.initialBalance,
        totalBalance: input.initialBalance,
        initialBalance: input.initialBalance,
        totalPnl: 0,
        totalPnlPct: 0,
        totalTrades: 0,
        winTrades: 0,
        lossTrades: 0,
        maxDrawdown: 0,
        peakBalance: input.initialBalance,
        autoTradingEnabled: false
      }).where(eq4(paperAccount.id, 1));
      return { success: true };
    }),
    // 手动平仓
    closePosition: publicProcedure.input(z2.object({ positionId: z2.number() })).mutation(async ({ input }) => {
      const d = await getDb();
      if (!d) throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const positions2 = await d.select().from(paperPositions).where(eq4(paperPositions.id, input.positionId)).limit(1);
      if (!positions2[0]) throw new TRPCError3({ code: "NOT_FOUND", message: "Position not found" });
      const pos = positions2[0];
      const ticker = pos.symbol.endsWith("USDT") ? pos.symbol : `${pos.symbol}USDT`;
      let exitPrice = pos.currentPrice;
      try {
        const res = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${ticker}`);
        if (res.ok) {
          const data = await res.json();
          exitPrice = parseFloat(data.price);
        }
      } catch {
      }
      const lev = pos.leverage || 5;
      let pnlPct = pos.direction === "long" ? (exitPrice - pos.entryPrice) / pos.entryPrice * lev * 100 : (pos.entryPrice - exitPrice) / pos.entryPrice * lev * 100;
      const pnl = (pos.notionalValue ?? 500) * (pnlPct / 100);
      const holdingMinutes = Math.round((Date.now() - new Date(pos.openedAt).getTime()) / 6e4);
      await d.insert(paperTrades).values({
        symbol: pos.symbol,
        direction: pos.direction,
        entryPrice: pos.entryPrice,
        exitPrice,
        quantity: pos.quantity,
        notionalValue: pos.notionalValue ?? 500,
        leverage: lev,
        pnl,
        pnlPct,
        closeReason: "manual",
        signalScore: pos.signalScore,
        triggerSignal: pos.triggerSignal ?? "",
        holdingMinutes,
        openedAt: pos.openedAt,
        closedAt: /* @__PURE__ */ new Date()
      });
      await d.delete(paperPositions).where(eq4(paperPositions.id, input.positionId));
      const accs = await d.select().from(paperAccount).where(eq4(paperAccount.id, 1)).limit(1);
      const acc = accs[0];
      if (acc) {
        const margin = pos.notionalValue ?? 500;
        const newBalance = (acc.balance ?? 1e4) + margin + pnl;
        const newTotalTrades = (acc.totalTrades ?? 0) + 1;
        const newWinTrades = pnl > 0 ? (acc.winTrades ?? 0) + 1 : acc.winTrades ?? 0;
        const newLossTrades = pnl <= 0 ? (acc.lossTrades ?? 0) + 1 : acc.lossTrades ?? 0;
        await d.update(paperAccount).set({
          balance: newBalance,
          totalTrades: newTotalTrades,
          winTrades: newWinTrades,
          lossTrades: newLossTrades
        }).where(eq4(paperAccount.id, 1));
      }
      return { success: true, pnl, pnlPct };
    }),
    // 引擎状态
    engineStatus: publicProcedure.query(() => ({
      paper: getEngineStatus(),
      live: getLiveEngineStatus()
    })),
    // 启动/停止实盘引擎
    toggleLiveEngine: publicProcedure.input(z2.object({ enabled: z2.boolean() })).mutation(({ input }) => {
      if (input.enabled && !isLiveEngineRunning()) {
        startLiveTradingEngine();
      } else if (!input.enabled && isLiveEngineRunning()) {
        stopLiveTradingEngine();
      }
      return { success: true, running: isLiveEngineRunning() };
    }),
    // 手动触发一次交易周期（用于测试）
    triggerCycle: publicProcedure.mutation(async () => {
      await runPaperTradingCycle(true);
      return { success: true };
    })
  }),
  // ─── 免费数据多空综合面板 ────────────────────────────────────────────────────
  freeData: router({
    // 恐惧贪婪指数历史（7天）
    fearGreedHistory: publicProcedure.input(z2.object({ limit: z2.number().default(7) }).optional()).query(async ({ input }) => {
      try {
        return { success: true, data: await getFearGreedHistory(input?.limit ?? 7) };
      } catch (e) {
        return { success: false, data: [], error: e.message };
      }
    }),
    // CoinGecko 全球市场数据
    globalMarket: publicProcedure.query(async () => {
      try {
        return { success: true, data: await getGlobalMarket() };
      } catch (e) {
        return { success: false, data: null, error: e.message };
      }
    }),
    // CoinGecko 热门代币
    trending: publicProcedure.query(async () => {
      try {
        return { success: true, data: await getTrendingCoins() };
      } catch (e) {
        return { success: false, data: [], error: e.message };
      }
    }),
    // OKX 合约账户多空比（已验证可用，替代 Binance Futures）
    longShortRatio: publicProcedure.input(z2.object({ symbol: z2.string().default("BTCUSDT"), period: z2.string().default("1H"), limit: z2.number().default(24) }).optional()).query(async ({ input }) => {
      try {
        const sym = (input?.symbol ?? "BTCUSDT").replace("USDT", "");
        const instId = `${sym}-USDT-SWAP`;
        const data = await getOKXLongShortRatio(instId, input?.period ?? "1H", input?.limit ?? 24);
        return { success: true, data, source: "OKX" };
      } catch (e) {
        return { success: false, data: [], error: e.message, source: "OKX" };
      }
    }),
    // OKX Taker 主动买卖比（已验证可用，替代 Binance Futures）
    takerRatio: publicProcedure.input(z2.object({ symbol: z2.string().default("BTCUSDT"), period: z2.string().default("1H"), limit: z2.number().default(24) }).optional()).query(async ({ input }) => {
      try {
        const sym = (input?.symbol ?? "BTCUSDT").replace("USDT", "");
        const instId = `${sym}-USDT-SWAP`;
        const data = await getOKXTakerRatio(instId, input?.period ?? "1H", input?.limit ?? 24);
        return { success: true, data, source: "OKX" };
      } catch (e) {
        return { success: false, data: [], error: e.message, source: "OKX" };
      }
    }),
    // 技术面评分（RSI/MACD/布林带/EMA）
    technicalScore: publicProcedure.input(z2.object({ symbol: z2.string().default("BTCUSDT"), interval: z2.string().default("1h") }).optional()).query(async ({ input }) => {
      try {
        const data = await getTechnicalScore(input?.symbol ?? "BTCUSDT", input?.interval ?? "1h");
        return { success: true, data };
      } catch (e) {
        return { success: false, data: null, error: e.message };
      }
    }),
    // CoinGlass 持仓量（按币种）
    oiHistory: publicProcedure.input(z2.object({ symbol: z2.string().default("BTCUSDT") }).optional()).query(async ({ input }) => {
      try {
        const sym = (input?.symbol ?? "BTCUSDT").replace("USDT", "");
        const data = await getMultiOpenInterest([sym]);
        return { success: true, data };
      } catch (e) {
        return { success: false, data: [], error: e.message };
      }
    }),
    // CoinGlass 资金费率（多币种）
    premiums: publicProcedure.input(z2.object({ symbols: z2.array(z2.string()).optional() }).optional()).query(async ({ input }) => {
      try {
        const syms = (input?.symbols ?? ["BTC", "ETH", "SOL", "BNB", "XRP"]).map((s) => s.replace("USDT", ""));
        const data = await getMultiFundingRates(syms);
        return { success: true, data };
      } catch (e) {
        return { success: false, data: [], error: e.message };
      }
    }),
    // 综合多空评分（整合 OKX多空比 + CoinGlass资金费率 + 技术面 + FNG + CoinGecko）
    bullBearScore: publicProcedure.input(z2.object({ symbol: z2.string().default("BTCUSDT") }).optional()).query(async ({ input }) => {
      const symbol = input?.symbol ?? "BTCUSDT";
      const cgSymbol = symbol.replace("USDT", "");
      const okxInstId = `${cgSymbol}-USDT-SWAP`;
      try {
        const [fngList, globalMkt, cgFundingRates, cgOI, okxLS, okxTaker, techData, newsData] = await Promise.allSettled([
          getFearGreedHistory(1),
          getGlobalMarket(),
          getMultiFundingRates([cgSymbol]),
          getMultiOpenInterest([cgSymbol]),
          getOKXLongShortRatio(okxInstId, "1H", 1),
          getOKXTakerRatio(okxInstId, "1H", 1),
          getTechnicalScore(symbol, "1h"),
          getNewsSentiment(false)
        ]);
        const fng = fngList.status === "fulfilled" ? fngList.value[0]?.value ?? 50 : 50;
        const gm = globalMkt.status === "fulfilled" ? globalMkt.value : null;
        const frData = cgFundingRates.status === "fulfilled" ? cgFundingRates.value : [];
        const frItem = frData.find((d) => d.symbol === cgSymbol.toUpperCase());
        const binanceFR = frItem?.usdtOrUsdMarginList?.find((e) => e.exchange === "Binance");
        const fundingRate = binanceFR?.fundingRate ?? 0;
        const oiData = cgOI.status === "fulfilled" ? cgOI.value : [];
        const oiItem = oiData.find((d) => d.symbol === cgSymbol.toUpperCase());
        const oiChange = oiItem?.changePercent1h ?? 0;
        const oiChange24h = oiItem?.changePercent24h ?? 0;
        const okxLSData = okxLS.status === "fulfilled" && okxLS.value.length > 0 ? okxLS.value[0] : null;
        const longShortRatio = okxLSData?.longShortRatio ?? 1;
        const okxTakerData = okxTaker.status === "fulfilled" && okxTaker.value.length > 0 ? okxTaker.value[0] : null;
        const takerBuySellRatio = okxTakerData?.buySellRatio ?? 1;
        const tech = techData.status === "fulfilled" ? techData.value : null;
        const priceChange24h = tech?.priceChange24h ?? (gm?.marketCapChange24h ?? 0);
        const markPrice = tech?.price ?? 0;
        const newsSummary = newsData.status === "fulfilled" ? newsData.value : null;
        const newsSentimentScore = newsSummary?.sentimentScore ?? 0;
        const score = calcBullBearScore({
          fng,
          btcDominance: gm?.btcDominance ?? 50,
          btcDominanceChange: 0,
          marketCapChange24h: gm?.marketCapChange24h ?? 0,
          longShortRatio,
          // OKX 真实数据
          takerBuySellRatio,
          // OKX 真实数据
          fundingRate,
          oiChange,
          priceChange24h,
          newsSentimentScore
          // 新闻情绪评分
        });
        return {
          success: true,
          score,
          rawData: {
            fng,
            btcDominance: gm?.btcDominance ?? 50,
            marketCapChange24h: gm?.marketCapChange24h ?? 0,
            longShortRatio,
            longPct: okxLSData?.longPct ?? 50,
            shortPct: okxLSData?.shortPct ?? 50,
            takerBuySellRatio,
            takerBuyVol: okxTakerData?.buyVol ?? 0,
            takerSellVol: okxTakerData?.sellVol ?? 0,
            fundingRate,
            oiChange,
            oiChange24h,
            markPrice,
            premium: 0,
            // 多交易所资金费率
            allExchangeFR: frItem?.usdtOrUsdMarginList?.slice(0, 8) ?? [],
            // 技术面评分
            technical: tech,
            dataSource: {
              longShort: okxLSData ? "OKX" : "N/A",
              taker: okxTakerData ? "OKX" : "N/A",
              technical: tech ? "Binance" : "N/A",
              news: newsSummary ? "RSS" : "N/A"
            },
            // 新闻情绪数据
            news: newsSummary ? {
              sentimentScore: newsSummary.sentimentScore,
              overallSentiment: newsSummary.overallSentiment,
              bullishCount: newsSummary.bullishCount,
              bearishCount: newsSummary.bearishCount,
              neutralCount: newsSummary.neutralCount,
              totalCount: newsSummary.items.length,
              topBullish: newsSummary.topBullish.slice(0, 2).map((n) => ({ title: n.title, source: n.source })),
              topBearish: newsSummary.topBearish.slice(0, 2).map((n) => ({ title: n.title, source: n.source }))
            } : null
          }
        };
      } catch (e) {
        return { success: false, score: null, rawData: null, error: e.message };
      }
    })
  }),
  vsStats: router({
    winRate: publicProcedure.query(async () => getVsSignalWinRate()),
    list: publicProcedure.input(z2.object({ limit: z2.number().default(100), signalType: z2.string().optional(), direction: z2.string().optional() }).optional()).query(async ({ input }) => getVsSignalStats({ limit: input?.limit ?? 100, signalType: input?.signalType, direction: input?.direction })),
    add: publicProcedure.input(z2.object({
      symbol: z2.string(),
      signalType: z2.string(),
      signalName: z2.string().optional(),
      direction: z2.enum(["long", "short", "neutral"]).default("neutral"),
      entryPrice: z2.number().optional(),
      notes: z2.string().optional()
    })).mutation(async ({ input }) => {
      const id = await addVsSignalStat(input);
      return { success: !!id, id };
    }),
    update: publicProcedure.input(z2.object({
      id: z2.number(),
      exitPrice24h: z2.number().optional(),
      exitPrice48h: z2.number().optional(),
      pnlPct24h: z2.number().optional(),
      pnlPct48h: z2.number().optional(),
      result: z2.enum(["win", "loss", "pending"]).optional(),
      notes: z2.string().optional()
    })).mutation(async ({ input }) => {
      const { id, ...data } = input;
      await updateVsSignalStat(id, data);
      return { success: true };
    })
  }),
  // ─── 新闻情绪面板 ─────────────────────────────────────────────────────────────
  news: router({
    // 获取所有新闻情绪汇总（含评分）
    sentiment: publicProcedure.input(z2.object({ forceRefresh: z2.boolean().default(false) }).optional()).query(async ({ input }) => {
      try {
        const data = await getNewsSentiment(input?.forceRefresh ?? false);
        return { success: true, data };
      } catch (e) {
        return { success: false, data: null, error: e.message };
      }
    }),
    // 获取特定币种的新闻情绪
    coinSentiment: publicProcedure.input(z2.object({ symbol: z2.string().default("BTC") })).query(async ({ input }) => {
      try {
        const data = await getCoinNewsSentiment(input.symbol);
        return { success: true, data };
      } catch (e) {
        return { success: false, data: null, error: e.message };
      }
    }),
    // 强制刷新新闻缓存
    refresh: publicProcedure.mutation(async () => {
      try {
        const data = await getNewsSentiment(true);
        return { success: true, count: data.items.length, fetchedAt: data.fetchedAt };
      } catch (e) {
        return { success: false, error: e.message };
      }
    })
  }),
  // ─── 量化模拟交易（QuantSim 页面使用）─────────────────────────────────────────
  sim: router({
    positions: publicProcedure.query(async () => {
      const d = await getDb();
      if (!d) return [];
      const rows = await d.select().from(paperPositions);
      return Promise.all(rows.map(async (pos) => {
        const ticker = pos.symbol.endsWith("USDT") ? pos.symbol : pos.symbol + "USDT";
        let currentPrice = pos.currentPrice ?? pos.entryPrice;
        try {
          const res = await fetch("https://api.binance.com/api/v3/ticker/price?symbol=" + ticker);
          if (res.ok) {
            const data = await res.json();
            currentPrice = parseFloat(data.price);
          }
        } catch {
        }
        const lev = pos.leverage || 1;
        const notional = pos.notionalValue ?? 500;
        const pnl = pos.direction === "long" ? (currentPrice - pos.entryPrice) / pos.entryPrice * lev * notional : (pos.entryPrice - currentPrice) / pos.entryPrice * lev * notional;
        return { id: pos.id, exchange: "paper", symbol: pos.symbol, side: pos.direction, size: pos.quantity, entryPrice: pos.entryPrice, currentPrice, pnl, leverage: lev, openedAt: pos.openedAt };
      }));
    }),
    trades: publicProcedure.input(z2.object({ limit: z2.number().default(20) }).optional()).query(async ({ input }) => {
      const d = await getDb();
      if (!d) return [];
      const rows = await d.select().from(paperTrades).orderBy(desc2(paperTrades.closedAt)).limit(input?.limit ?? 20);
      return rows.map((t2) => ({ id: t2.id, exchange: "paper", symbol: t2.symbol, side: t2.direction, size: t2.quantity, entryPrice: t2.entryPrice, exitPrice: t2.exitPrice, pnl: t2.pnl, closedAt: t2.closedAt }));
    }),
    openPosition: publicProcedure.input(z2.object({
      exchange: z2.string().default("paper"),
      symbol: z2.string(),
      side: z2.enum(["long", "short"]),
      size: z2.number().positive(),
      leverage: z2.number().min(1).max(100).default(1)
    })).mutation(async ({ input }) => {
      const d = await getDb();
      if (!d) throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const ticker = input.symbol.replace("/", "").toUpperCase();
      let entryPrice = 0;
      try {
        const res = await fetch("https://api.binance.com/api/v3/ticker/price?symbol=" + ticker);
        if (res.ok) {
          const data = await res.json();
          entryPrice = parseFloat(data.price);
        }
      } catch {
      }
      const notionalValue = entryPrice * input.size;
      const ids = await d.insert(paperPositions).values({
        symbol: ticker,
        direction: input.side,
        entryPrice,
        currentPrice: entryPrice,
        quantity: input.size,
        notionalValue,
        leverage: input.leverage,
        signalScore: 0,
        triggerSignal: "\u624B\u52A8\u5F00\u4ED3(" + input.exchange + ")",
        openedAt: /* @__PURE__ */ new Date()
      });
      return { id: Number(ids[0]?.insertId ?? 0), entryPrice, symbol: ticker, side: input.side };
    }),
    closePosition: publicProcedure.input(z2.object({ id: z2.number() })).mutation(async ({ input }) => {
      const d = await getDb();
      if (!d) throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const positions2 = await d.select().from(paperPositions).where(eq4(paperPositions.id, input.id)).limit(1);
      if (!positions2[0]) throw new TRPCError3({ code: "NOT_FOUND", message: "Position not found" });
      const pos = positions2[0];
      const ticker = pos.symbol.endsWith("USDT") ? pos.symbol : pos.symbol + "USDT";
      let exitPrice = pos.currentPrice ?? pos.entryPrice;
      try {
        const res = await fetch("https://api.binance.com/api/v3/ticker/price?symbol=" + ticker);
        if (res.ok) {
          const data = await res.json();
          exitPrice = parseFloat(data.price);
        }
      } catch {
      }
      const lev = pos.leverage || 1;
      const notional = pos.notionalValue ?? 500;
      const pnl = pos.direction === "long" ? (exitPrice - pos.entryPrice) / pos.entryPrice * lev * notional : (pos.entryPrice - exitPrice) / pos.entryPrice * lev * notional;
      const pnlPct = pos.direction === "long" ? (exitPrice - pos.entryPrice) / pos.entryPrice * lev * 100 : (pos.entryPrice - exitPrice) / pos.entryPrice * lev * 100;
      const holdingMinutes = Math.round((Date.now() - new Date(pos.openedAt).getTime()) / 6e4);
      await d.insert(paperTrades).values({
        symbol: pos.symbol,
        direction: pos.direction,
        entryPrice: pos.entryPrice,
        exitPrice,
        quantity: pos.quantity,
        notionalValue: notional,
        leverage: lev,
        pnl,
        pnlPct,
        closeReason: "manual",
        signalScore: pos.signalScore,
        triggerSignal: pos.triggerSignal ?? "",
        holdingMinutes,
        openedAt: pos.openedAt,
        closedAt: /* @__PURE__ */ new Date()
      });
      await d.delete(paperPositions).where(eq4(paperPositions.id, input.id));
      return { success: true, pnl, pnlPct };
    })
  })
});
async function runBacktest(params) {
  const { initialBalance, stopLossPercent, takeProfit1Percent, takeProfit2Percent, leverage } = params;
  let balance = initialBalance;
  const tradeLog = [];
  let maxBalance = initialBalance;
  let maxDrawdown = 0;
  const mockSignals = generateMockHistoricalSignals(params.startDate, params.endDate);
  for (const signal of mockSignals) {
    if (balance <= 0) break;
    const positionValue = balance * 0.1;
    const entryPrice = signal.price;
    const stopLoss = entryPrice * (1 - stopLossPercent / 100);
    const tp1 = entryPrice * (1 + takeProfit1Percent / 100);
    const tp2 = entryPrice * (1 + takeProfit2Percent / 100);
    const rngVal = Math.sin(signal.score * 12345.6789) * 0.5 + 0.5;
    let exitPrice;
    let closeReason;
    if (rngVal < 0.55) {
      exitPrice = rngVal < 0.3 ? tp2 : tp1;
      closeReason = "\u6B62\u76C8";
    } else {
      exitPrice = stopLoss;
      closeReason = "\u6B62\u635F";
    }
    const pnl = (exitPrice - entryPrice) / entryPrice * positionValue * leverage;
    balance += pnl;
    if (balance > maxBalance) maxBalance = balance;
    const drawdown = (maxBalance - balance) / maxBalance * 100;
    if (drawdown > maxDrawdown) maxDrawdown = drawdown;
    tradeLog.push({ symbol: signal.symbol, entryPrice, exitPrice, pnl, closeReason, score: signal.score, time: signal.time });
  }
  const totalTrades = tradeLog.length;
  const winTrades = tradeLog.filter((t2) => t2.pnl > 0).length;
  const lossTrades = totalTrades - winTrades;
  const totalReturn = (balance - initialBalance) / initialBalance * 100;
  const winRate = totalTrades > 0 ? winTrades / totalTrades * 100 : 0;
  const returns = tradeLog.map((t2) => t2.pnl / initialBalance);
  const avgReturn = returns.reduce((s, r) => s + r, 0) / (returns.length || 1);
  const stdReturn = Math.sqrt(returns.reduce((s, r) => s + Math.pow(r - avgReturn, 2), 0) / (returns.length || 1));
  const sharpeRatio = stdReturn > 0 ? avgReturn / stdReturn * Math.sqrt(252) : 0;
  return { finalBalance: balance, totalReturn, totalTrades, winTrades, lossTrades, winRate, maxDrawdown, sharpeRatio, tradeLog };
}
function createSeededRandom(seed) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >> 17;
    s ^= s << 5;
    return (s >>> 0) / 4294967296;
  };
}
function generateMockHistoricalSignals(startDate, endDate) {
  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();
  const symbols = ["BTC", "ETH", "SOL", "BNB", "DOGE"];
  const signals2 = [];
  const basePrices = { BTC: 45e3, ETH: 2800, SOL: 120, BNB: 380, DOGE: 0.12 };
  const seed = start / 1e6 + end / 1e6 | 0;
  const rng = createSeededRandom(seed);
  let current = start;
  while (current < end) {
    const symbol = symbols[Math.floor(rng() * symbols.length)];
    const basePrice = basePrices[symbol] ?? 100;
    const price = basePrice * (0.9 + rng() * 0.2);
    const score = 0.6 + rng() * 0.4;
    signals2.push({ symbol, price, score, time: new Date(current) });
    current += (1 + rng() * 4) * 3600 * 1e3;
  }
  return signals2;
}
var strategyStatsRouter = router({
  // 按策略类型统计历史胜率、盈亏比、最大回撤
  winRateStats: publicProcedure.query(async () => {
    return getStrategyWinRateStats();
  }),
  // 获取实战案例（真实交易记录）
  tradeCases: publicProcedure.input(z2.object({ limit: z2.number().default(20) }).optional()).query(async ({ input }) => {
    return getTradeCases(input?.limit ?? 20);
  })
});

// shared/_core/errors.ts
var HttpError = class extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
    this.name = "HttpError";
  }
};
var ForbiddenError = (msg) => new HttpError(403, msg);

// server/_core/sdk.ts
import axios5 from "axios";
import { parse as parseCookieHeader } from "cookie";
import { SignJWT, jwtVerify } from "jose";
var isNonEmptyString2 = (value) => typeof value === "string" && value.length > 0;
var EXCHANGE_TOKEN_PATH = `/webdev.v1.WebDevAuthPublicService/ExchangeToken`;
var GET_USER_INFO_PATH = `/webdev.v1.WebDevAuthPublicService/GetUserInfo`;
var GET_USER_INFO_WITH_JWT_PATH = `/webdev.v1.WebDevAuthPublicService/GetUserInfoWithJwt`;
var OAuthService = class {
  constructor(client) {
    this.client = client;
    console.log("[OAuth] Initialized with baseURL:", ENV.oAuthServerUrl);
    if (!ENV.oAuthServerUrl) {
      console.error(
        "[OAuth] ERROR: OAUTH_SERVER_URL is not configured! Set OAUTH_SERVER_URL environment variable."
      );
    }
  }
  decodeState(state) {
    const redirectUri = atob(state);
    return redirectUri;
  }
  async getTokenByCode(code, state) {
    const payload = {
      clientId: ENV.appId,
      grantType: "authorization_code",
      code,
      redirectUri: this.decodeState(state)
    };
    const { data } = await this.client.post(
      EXCHANGE_TOKEN_PATH,
      payload
    );
    return data;
  }
  async getUserInfoByToken(token) {
    const { data } = await this.client.post(
      GET_USER_INFO_PATH,
      {
        accessToken: token.accessToken
      }
    );
    return data;
  }
};
var createOAuthHttpClient = () => axios5.create({
  baseURL: ENV.oAuthServerUrl,
  timeout: AXIOS_TIMEOUT_MS
});
var SDKServer = class {
  client;
  oauthService;
  constructor(client = createOAuthHttpClient()) {
    this.client = client;
    this.oauthService = new OAuthService(this.client);
  }
  deriveLoginMethod(platforms, fallback) {
    if (fallback && fallback.length > 0) return fallback;
    if (!Array.isArray(platforms) || platforms.length === 0) return null;
    const set = new Set(
      platforms.filter((p) => typeof p === "string")
    );
    if (set.has("REGISTERED_PLATFORM_EMAIL")) return "email";
    if (set.has("REGISTERED_PLATFORM_GOOGLE")) return "google";
    if (set.has("REGISTERED_PLATFORM_APPLE")) return "apple";
    if (set.has("REGISTERED_PLATFORM_MICROSOFT") || set.has("REGISTERED_PLATFORM_AZURE"))
      return "microsoft";
    if (set.has("REGISTERED_PLATFORM_GITHUB")) return "github";
    const first = Array.from(set)[0];
    return first ? first.toLowerCase() : null;
  }
  /**
   * Exchange OAuth authorization code for access token
   * @example
   * const tokenResponse = await sdk.exchangeCodeForToken(code, state);
   */
  async exchangeCodeForToken(code, state) {
    return this.oauthService.getTokenByCode(code, state);
  }
  /**
   * Get user information using access token
   * @example
   * const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
   */
  async getUserInfo(accessToken) {
    const data = await this.oauthService.getUserInfoByToken({
      accessToken
    });
    const loginMethod = this.deriveLoginMethod(
      data?.platforms,
      data?.platform ?? data.platform ?? null
    );
    return {
      ...data,
      platform: loginMethod,
      loginMethod
    };
  }
  parseCookies(cookieHeader) {
    if (!cookieHeader) {
      return /* @__PURE__ */ new Map();
    }
    const parsed = parseCookieHeader(cookieHeader);
    return new Map(Object.entries(parsed));
  }
  getSessionSecret() {
    const secret = ENV.cookieSecret;
    return new TextEncoder().encode(secret);
  }
  /**
   * Create a session token for a Manus user openId
   * @example
   * const sessionToken = await sdk.createSessionToken(userInfo.openId);
   */
  async createSessionToken(openId, options = {}) {
    return this.signSession(
      {
        openId,
        appId: ENV.appId,
        name: options.name || ""
      },
      options
    );
  }
  async signSession(payload, options = {}) {
    const issuedAt = Date.now();
    const expiresInMs = options.expiresInMs ?? ONE_YEAR_MS;
    const expirationSeconds = Math.floor((issuedAt + expiresInMs) / 1e3);
    const secretKey = this.getSessionSecret();
    return new SignJWT({
      openId: payload.openId,
      appId: payload.appId,
      name: payload.name
    }).setProtectedHeader({ alg: "HS256", typ: "JWT" }).setExpirationTime(expirationSeconds).sign(secretKey);
  }
  async verifySession(cookieValue) {
    if (!cookieValue) {
      console.warn("[Auth] Missing session cookie");
      return null;
    }
    try {
      const secretKey = this.getSessionSecret();
      const { payload } = await jwtVerify(cookieValue, secretKey, {
        algorithms: ["HS256"]
      });
      const { openId, appId, name } = payload;
      if (!isNonEmptyString2(openId) || !isNonEmptyString2(appId) || !isNonEmptyString2(name)) {
        console.warn("[Auth] Session payload missing required fields");
        return null;
      }
      return {
        openId,
        appId,
        name
      };
    } catch (error) {
      console.warn("[Auth] Session verification failed", String(error));
      return null;
    }
  }
  async getUserInfoWithJwt(jwtToken) {
    const payload = {
      jwtToken,
      projectId: ENV.appId
    };
    const { data } = await this.client.post(
      GET_USER_INFO_WITH_JWT_PATH,
      payload
    );
    const loginMethod = this.deriveLoginMethod(
      data?.platforms,
      data?.platform ?? data.platform ?? null
    );
    return {
      ...data,
      platform: loginMethod,
      loginMethod
    };
  }
  async authenticateRequest(req) {
    const cookies = this.parseCookies(req.headers.cookie);
    const sessionCookie = cookies.get(COOKIE_NAME);
    const session = await this.verifySession(sessionCookie);
    if (!session) {
      throw ForbiddenError("Invalid session cookie");
    }
    const sessionUserId = session.openId;
    const signedInAt = /* @__PURE__ */ new Date();
    let user = await getUserByOpenId(sessionUserId);
    if (!user) {
      try {
        const userInfo = await this.getUserInfoWithJwt(sessionCookie ?? "");
        await upsertUser({
          openId: userInfo.openId,
          name: userInfo.name || null,
          email: userInfo.email ?? null,
          loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
          lastSignedIn: signedInAt
        });
        user = await getUserByOpenId(userInfo.openId);
      } catch (error) {
        console.error("[Auth] Failed to sync user from OAuth:", error);
        throw ForbiddenError("Failed to sync user info");
      }
    }
    if (!user) {
      throw ForbiddenError("User not found");
    }
    await upsertUser({
      openId: user.openId,
      lastSignedIn: signedInAt
    });
    return user;
  }
};
var sdk = new SDKServer();

// server/_core/context.ts
async function createContext(opts) {
  let user = null;
  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    user = null;
  }
  return {
    req: opts.req,
    res: opts.res,
    user
  };
}

// server/_core/oauth.ts
function getQueryParam(req, key) {
  const baseUrl = `${req.protocol || "https"}://${req.get("host") || "localhost"}`;
  const url = new URL(req.originalUrl || req.url, baseUrl);
  return url.searchParams.get(key) ?? void 0;
}
function registerOAuthRoutes(app2) {
  app2.get("/api/oauth/callback", async (req, res) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");
    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }
    try {
      const tokenResponse = await sdk.exchangeCodeForToken(code, state);
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
      if (!userInfo.openId) {
        res.status(400).json({ error: "openId missing from user info" });
        return;
      }
      await upsertUser({
        openId: userInfo.openId,
        name: userInfo.name || null,
        email: userInfo.email ?? null,
        loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
        lastSignedIn: /* @__PURE__ */ new Date()
      });
      const sessionToken = await sdk.createSessionToken(userInfo.openId, {
        name: userInfo.name || "",
        expiresInMs: ONE_YEAR_MS
      });
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      res.redirect(302, "/");
    } catch (error) {
      console.error("[OAuth] Callback failed", error);
      res.status(500).json({ error: "OAuth callback failed" });
    }
  });
}

// server/_api_entry.ts
import path from "path";
import fs from "fs";
void bootstrapValueScanService().catch((error) => {
  console.error("[ValueScan] serverless bootstrap failed:", error);
});
var app = express();
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use((req, res, next) => {
  const origin = req.headers.origin || "";
  const allowedOrigins = [
    "https://zhangyong.guru",
    "https://www.zhangyong.guru",
    "http://localhost:3000",
    "http://localhost:5173"
  ];
  if (allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type,Authorization,x-trpc-source"
  );
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  next();
});
registerOAuthRoutes(app);
app.use(
  "/api/trpc",
  createExpressMiddleware({
    router: appRouter,
    createContext
  })
);
var distPath = path.join(process.cwd(), "dist", "public");
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
}
app.use("*", (req, res) => {
  const indexPath = path.join(distPath, "index.html");
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).json({ error: "Frontend not built" });
  }
});
var api_entry_default = app;
export {
  api_entry_default as default
};
