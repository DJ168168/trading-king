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
  bigint,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// 信号记录表
export const signals = mysqlTable("signals", {
  id: int("id").autoincrement().primaryKey(),
  signalId: varchar("signalId", { length: 128 }).notNull().unique(),
  symbol: varchar("symbol", { length: 32 }).notNull(),
  signalType: mysqlEnum("signalType", ["FOMO", "ALPHA", "RISK", "FALL", "FUND_MOVE", "LISTING", "FUND_ESCAPE", "FUND_ABNORMAL"]).notNull(),
  messageType: int("messageType").notNull(), // 100,108,109,110,111,112,113,114
  score: float("score").default(0),
  rawData: json("rawData"),
  processed: boolean("processed").default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Signal = typeof signals.$inferSelect;
export type InsertSignal = typeof signals.$inferInsert;

// 聚合信号表（FOMO + Alpha 匹配结果）
export const confluenceSignals = mysqlTable("confluence_signals", {
  id: int("id").autoincrement().primaryKey(),
  symbol: varchar("symbol", { length: 32 }).notNull(),
  fomoSignalId: varchar("fomoSignalId", { length: 128 }).notNull(),
  alphaSignalId: varchar("alphaSignalId", { length: 128 }).notNull(),
  timeGap: float("timeGap").notNull(), // 两信号时间差（秒）
  score: float("score").notNull(),
  status: mysqlEnum("status", ["pending", "executed", "skipped", "failed"]).default("pending").notNull(),
  skipReason: text("skipReason"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ConfluenceSignal = typeof confluenceSignals.$inferSelect;
export type InsertConfluenceSignal = typeof confluenceSignals.$inferInsert;

// 交易历史表
export const trades = mysqlTable("trades", {
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
  closedAt: timestamp("closedAt"),
});

export type Trade = typeof trades.$inferSelect;
export type InsertTrade = typeof trades.$inferInsert;

// 当前持仓表
export const positions = mysqlTable("positions", {
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
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Position = typeof positions.$inferSelect;
export type InsertPosition = typeof positions.$inferInsert;

// 策略配置表
export const strategyConfig = mysqlTable("strategy_config", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 64 }).notNull().unique(),
  // 信号聚合参数
  signalTimeWindow: int("signalTimeWindow").default(300), // 秒
  minSignalScore: float("minSignalScore").default(0.6),
  enableFomoIntensify: boolean("enableFomoIntensify").default(true),
  // 风险管理参数
  minOrderUsdt: float("minOrderUsdt").default(1.0),  // 最小开仓金额（USDT）
  maxPositionPercent: float("maxPositionPercent").default(10.0),
  maxTotalPositionPercent: float("maxTotalPositionPercent").default(50.0),
  maxDailyTrades: int("maxDailyTrades").default(20),
  maxDailyLossPercent: float("maxDailyLossPercent").default(5.0),
  // 止损止盈
  stopLossPercent: float("stopLossPercent").default(3.0),
  takeProfit1Percent: float("takeProfit1Percent").default(5.0),
  takeProfit2Percent: float("takeProfit2Percent").default(10.0),
  // 合约配置
  leverage: int("leverage").default(5),
  marginType: mysqlEnum("marginType", ["ISOLATED", "CROSSED"]).default("ISOLATED"),
  symbolSuffix: varchar("symbolSuffix", { length: 16 }).default("USDT"),
  // 移动止损
  enableTrailingStop: boolean("enableTrailingStop").default(false),
  trailingStopActivation: float("trailingStopActivation").default(3.0),
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
  autoTradingPositionPercent: float("autoTradingPositionPercent").default(1), // 每笔自动交易仓位比例(%)
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
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type StrategyConfig = typeof strategyConfig.$inferSelect;
export type InsertStrategyConfig = typeof strategyConfig.$inferInsert;

// 账户余额快照表
export const accountSnapshots = mysqlTable("account_snapshots", {
  id: int("id").autoincrement().primaryKey(),
  totalBalance: float("totalBalance").notNull(),
  availableBalance: float("availableBalance").notNull(),
  unrealizedPnl: float("unrealizedPnl").default(0),
  dailyPnl: float("dailyPnl").default(0),
  dailyTrades: int("dailyTrades").default(0),
  positionCount: int("positionCount").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AccountSnapshot = typeof accountSnapshots.$inferSelect;

// 回测结果表
export const backtestResults = mysqlTable("backtest_results", {
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
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type BacktestResult = typeof backtestResults.$inferSelect;

// Telegram 配置表
export const telegramConfig = mysqlTable("telegram_config", {
  id: int("id").autoincrement().primaryKey(),
  botToken: varchar("botToken", { length: 256 }),
  chatId: varchar("chatId", { length: 64 }),
  enableTradeNotify: boolean("enableTradeNotify").default(true),
  enableRiskNotify: boolean("enableRiskNotify").default(true),
  enableDailyReport: boolean("enableDailyReport").default(true),
  isActive: boolean("isActive").default(false),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type TelegramConfig = typeof telegramConfig.$inferSelect;

// ValueScan 信号历史胜率统计表
export const vsSignalStats = mysqlTable("vs_signal_stats", {
  id: int("id").autoincrement().primaryKey(),
  symbol: varchar("symbol", { length: 32 }).notNull(),
  signalType: varchar("signalType", { length: 32 }).notNull(), // fomo/alpha/whale/risk/ai
  signalName: varchar("signalName", { length: 128 }),
  direction: mysqlEnum("direction", ["long", "short", "neutral"]).default("neutral").notNull(),
  entryPrice: float("entryPrice"),
  exitPrice24h: float("exitPrice24h"),
  exitPrice48h: float("exitPrice48h"),
  pnlPct24h: float("pnlPct24h"),   // 24h 涨跌幅 %
  pnlPct48h: float("pnlPct48h"),   // 48h 涨跌幅 %
  result: mysqlEnum("result", ["win", "loss", "pending"]).default("pending").notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type VsSignalStat = typeof vsSignalStats.$inferSelect;
export type InsertVsSignalStat = typeof vsSignalStats.$inferInsert;

// ============ 模拟交易表 ============

// 模拟账户表
export const paperAccount = mysqlTable("paper_account", {
  id: int("id").autoincrement().primaryKey(),
  balance: float("balance").notNull().default(10000),        // 可用余额 USDT
  totalBalance: float("totalBalance").notNull().default(10000), // 总资产
  initialBalance: float("initialBalance").notNull().default(10000), // 初始资金
  totalPnl: float("totalPnl").default(0),                   // 总盈亏
  totalPnlPct: float("totalPnlPct").default(0),             // 总盈亏%
  totalTrades: int("totalTrades").default(0),               // 总交易次数
  winTrades: int("winTrades").default(0),                   // 盈利次数
  lossTrades: int("lossTrades").default(0),                 // 亏损次数
  maxDrawdown: float("maxDrawdown").default(0),             // 最大回撤%
  peakBalance: float("peakBalance").default(10000),         // 历史最高余额
  autoTradingEnabled: boolean("autoTradingEnabled").default(false), // 自动交易开关
  // 自动交易参数
  perTradeAmount: float("perTradeAmount").default(500),     // 每笔交易金额 USDT
  leverage: int("leverage").default(5),                     // 杠杆倍数
  stopLossPct: float("stopLossPct").default(3.0),           // 止损%
  takeProfitPct: float("takeProfitPct").default(8.0),       // 止盈%
  minSignalScore: float("minSignalScore").default(65),      // 最低信号评分阈値
  maxPositions: int("maxPositions").default(5),             // 最大同时持仓数
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type PaperAccount = typeof paperAccount.$inferSelect;

// 模拟持仓表
export const paperPositions = mysqlTable("paper_positions", {
  id: int("id").autoincrement().primaryKey(),
  symbol: varchar("symbol", { length: 32 }).notNull(),
  direction: mysqlEnum("direction", ["long", "short"]).notNull(),
  entryPrice: float("entryPrice").notNull(),
  currentPrice: float("currentPrice").notNull(),
  quantity: float("quantity").notNull(),        // 合约数量
  notionalValue: float("notionalValue").notNull(), // 名义价値 USDT
  leverage: int("leverage").default(5),
  stopLoss: float("stopLoss"),
  takeProfit: float("takeProfit"),
  unrealizedPnl: float("unrealizedPnl").default(0),
  unrealizedPnlPct: float("unrealizedPnlPct").default(0),
  signalScore: float("signalScore"),
  triggerSignal: varchar("triggerSignal", { length: 128 }), // 触发信号描述
  openedAt: timestamp("openedAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type PaperPosition = typeof paperPositions.$inferSelect;

// 模拟交易记录表
export const paperTrades = mysqlTable("paper_trades", {
  id: int("id").autoincrement().primaryKey(),
  symbol: varchar("symbol", { length: 32 }).notNull(),
  direction: mysqlEnum("direction", ["long", "short"]).notNull(),
  entryPrice: float("entryPrice").notNull(),
  exitPrice: float("exitPrice").notNull(),
  quantity: float("quantity").notNull(),
  notionalValue: float("notionalValue").notNull(),
  leverage: int("leverage").default(5),
  pnl: float("pnl").notNull(),              // 盈亏 USDT
  pnlPct: float("pnlPct").notNull(),        // 盈亏%
  closeReason: mysqlEnum("closeReason", ["take_profit", "stop_loss", "manual", "signal_reverse", "timeout"]).notNull(),
  signalScore: float("signalScore"),
  triggerSignal: varchar("triggerSignal", { length: 256 }),
  holdingMinutes: int("holdingMinutes").default(0),  // 持仓时长（分钟）
  openedAt: timestamp("openedAt").notNull(),
  closedAt: timestamp("closedAt").defaultNow().notNull(),
});
export type PaperTrade = typeof paperTrades.$inferSelect;

// 模拟账户权益曲线快照表
export const paperEquityCurve = mysqlTable("paper_equity_curve", {
  id: int("id").autoincrement().primaryKey(),
  totalBalance: float("totalBalance").notNull(),
  unrealizedPnl: float("unrealizedPnl").default(0),
  openPositions: int("openPositions").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type PaperEquityCurve = typeof paperEquityCurve.$inferSelect;

// ValueScan SSE 大盘分析存储表
export const marketAnalysis = mysqlTable("market_analysis", {
  id: int("id").autoincrement().primaryKey(),
  uniqueId: varchar("uniqueId", { length: 128 }).notNull().unique(),
  ts: bigint("ts", { mode: "number" }).notNull(),
  content: text("content").notNull(),
  sentToTelegram: boolean("sentToTelegram").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type MarketAnalysis = typeof marketAnalysis.$inferSelect;
export type InsertMarketAnalysis = typeof marketAnalysis.$inferInsert;

// ValueScan SSE 代币信号存储表
export const tokenSignals = mysqlTable("token_signals", {
  id: int("id").autoincrement().primaryKey(),
  uniqueKey: varchar("uniqueKey", { length: 160 }).notNull().unique(),
  tokenId: int("tokenId").notNull(),
  type: varchar("type", { length: 32 }).notNull(),
  symbol: varchar("symbol", { length: 32 }).default(""),
  name: varchar("name", { length: 128 }).default(""),
  price: varchar("price", { length: 64 }).default(""),
  percentChange24h: float("percentChange24h").default(0),
  scoring: float("scoring"),
  grade: float("grade"),
  content: text("content").notNull(),
  ts: bigint("ts", { mode: "number" }).notNull(),
  sentToTelegram: boolean("sentToTelegram").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type TokenSignal = typeof tokenSignals.$inferSelect;
export type InsertTokenSignal = typeof tokenSignals.$inferInsert;
