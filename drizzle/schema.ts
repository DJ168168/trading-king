import {
  int, mysqlEnum, mysqlTable, text, timestamp,
  varchar, decimal, boolean
} from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
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

// 交易信号表
export const signals = mysqlTable("signals", {
  id: int("id").autoincrement().primaryKey(),
  exchange: varchar("exchange", { length: 32 }).notNull(),
  symbol: varchar("symbol", { length: 32 }).notNull(),
  type: mysqlEnum("type", ["LONG", "SHORT", "CLOSE"]).notNull(),
  source: varchar("source", { length: 64 }).notNull(),
  price: decimal("price", { precision: 20, scale: 8 }).notNull(),
  score: int("score").default(0),
  reason: text("reason"),
  telegramSent: boolean("telegramSent").default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type Signal = typeof signals.$inferSelect;
export type InsertSignal = typeof signals.$inferInsert;

// 模拟持仓表
export const simPositions = mysqlTable("sim_positions", {
  id: int("id").autoincrement().primaryKey(),
  exchange: varchar("exchange", { length: 32 }).notNull(),
  symbol: varchar("symbol", { length: 32 }).notNull(),
  side: mysqlEnum("side", ["long", "short"]).notNull(),
  size: decimal("size", { precision: 20, scale: 8 }).notNull(),
  entryPrice: decimal("entryPrice", { precision: 20, scale: 8 }).notNull(),
  currentPrice: decimal("currentPrice", { precision: 20, scale: 8 }).default("0"),
  leverage: int("leverage").default(1),
  pnl: decimal("pnl", { precision: 20, scale: 8 }).default("0"),
  pnlPct: decimal("pnlPct", { precision: 10, scale: 4 }).default("0"),
  status: mysqlEnum("status", ["open", "closed"]).default("open"),
  openedAt: timestamp("openedAt").defaultNow().notNull(),
  closedAt: timestamp("closedAt"),
  closePrice: decimal("closePrice", { precision: 20, scale: 8 }),
});
export type SimPosition = typeof simPositions.$inferSelect;
export type InsertSimPosition = typeof simPositions.$inferInsert;

// 模拟交易历史表
export const simTrades = mysqlTable("sim_trades", {
  id: int("id").autoincrement().primaryKey(),
  exchange: varchar("exchange", { length: 32 }).notNull(),
  symbol: varchar("symbol", { length: 32 }).notNull(),
  side: mysqlEnum("side", ["buy", "sell"]).notNull(),
  size: decimal("size", { precision: 20, scale: 8 }).notNull(),
  price: decimal("price", { precision: 20, scale: 8 }).notNull(),
  pnl: decimal("pnl", { precision: 20, scale: 8 }).default("0"),
  fee: decimal("fee", { precision: 20, scale: 8 }).default("0"),
  signalId: int("signalId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type SimTrade = typeof simTrades.$inferSelect;
export type InsertSimTrade = typeof simTrades.$inferInsert;

// 系统配置表
export const systemConfig = mysqlTable("system_config", {
  id: int("id").autoincrement().primaryKey(),
  key: varchar("key", { length: 128 }).notNull().unique(),
  value: text("value"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type SystemConfig = typeof systemConfig.$inferSelect;

// 模拟账户余额快照
export const simBalance = mysqlTable("sim_balance", {
  id: int("id").autoincrement().primaryKey(),
  balance: decimal("balance", { precision: 20, scale: 8 }).notNull(),
  equity: decimal("equity", { precision: 20, scale: 8 }).notNull(),
  pnl: decimal("pnl", { precision: 20, scale: 8 }).default("0"),
  recordedAt: timestamp("recordedAt").defaultNow().notNull(),
});