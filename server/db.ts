// @ts-nocheck
import mysql, { type Pool } from "mysql2/promise";
import { drizzle } from "drizzle-orm/mysql2";
import { and, desc, eq, gte } from "drizzle-orm";
import * as schema from "../drizzle/schema";
import {
  accountSnapshots,
  backtestResults,
  confluenceSignals,
  positions,
  signals,
  strategyConfig,
  telegramConfig,
  trades,
  users,
  vsSignalStats,
  type InsertSignal,
  type InsertConfluenceSignal,
} from "../drizzle/schema";

const DATABASE_URL = process.env.DATABASE_URL || process.env.MYSQL_URL || process.env.DB_URL || "";

let pool: mysql.Pool | null = null;
let dbInstance: any = null;

const memory = {
  signals: [] as any[],
  confluenceSignals: [] as any[],
  trades: [] as any[],
  positions: [] as any[],
  snapshots: [] as any[],
  backtests: [] as any[],
  vsStats: [] as any[],
  telegramConfig: null as any,
  strategyConfig: null as any,
};

const runtimeSecrets: { vsApiKey?: string | null; vsSecretKey?: string | null } = {
  vsApiKey: null,
  vsSecretKey: null,
};

function nowId(list: Array<{ id?: number }>) {
  const max = list.reduce((m, item) => Math.max(m, Number(item.id ?? 0)), 0);
  return max + 1;
}

function toResultInsertId(result: any): number {
  return Number(result?.[0]?.insertId ?? result?.insertId ?? 0);
}

function stripUndefined<T extends Record<string, any>>(input: T): T {
  return Object.fromEntries(Object.entries(input).filter(([, v]) => v !== undefined)) as T;
}

function buildDefaultConfig() {
  return {
    id: 1,
    name: "默认策略",
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
    createdAt: new Date(),
    updatedAt: new Date(),
    vsApiKey: runtimeSecrets.vsApiKey ?? null,
    vsSecretKey: runtimeSecrets.vsSecretKey ?? null,
  } as any;
}

function attachRuntimeSecrets<T extends Record<string, any> | null>(config: T): T {
  if (!config) return config;
  return {
    ...config,
    vsApiKey: runtimeSecrets.vsApiKey ?? (config as any).vsApiKey ?? null,
    vsSecretKey: runtimeSecrets.vsSecretKey ?? (config as any).vsSecretKey ?? null,
  } as T;
}

function sanitizeStrategyConfigInput(input: Record<string, any>) {
  const allowedKeys = new Set([
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
    "vsAutoRefreshEnabled",
  ]);

  if ("vsApiKey" in input) runtimeSecrets.vsApiKey = input.vsApiKey ?? null;
  if ("vsSecretKey" in input) runtimeSecrets.vsSecretKey = input.vsSecretKey ?? null;

  return stripUndefined(
    Object.fromEntries(Object.entries(input).filter(([key]) => allowedKeys.has(key))) as Record<string, any>,
  );
}

async function safe<T>(fallback: T, fn: (db: any) => Promise<T>): Promise<T> {
  const db = await getDb();
  if (!db) return fallback;
  try {
    return await fn(db);
  } catch (error) {
    console.error("[db] query failed:", error);
    return fallback;
  }
}

export async function getDb(): Promise<any | null> {
  if (!DATABASE_URL) return null;
  if (dbInstance) return dbInstance;
  try {
    pool = mysql.createPool({
      uri: DATABASE_URL,
      connectionLimit: 10,
      enableKeepAlive: true,
    });
    dbInstance = drizzle(pool as any, { schema, mode: "default" } as any);
    return dbInstance;
  } catch (error) {
    console.error("[db] init failed:", error);
    return null;
  }
}

export async function recordSignal(input: InsertSignal & Record<string, any>) {
  const row = { ...stripUndefined(input), id: nowId(memory.signals), createdAt: new Date() } as any;
  memory.signals.unshift(row);
  await safe(null, async (db) => {
    try {
      await db.insert(signals).values(stripUndefined(input as any));
    } catch (error: any) {
      if (!String(error?.message ?? "").includes("Duplicate")) throw error;
    }
    return null;
  });
  return row;
}

export async function recordConfluenceSignal(input: InsertConfluenceSignal & Record<string, any>) {
  const row = { ...stripUndefined(input), id: nowId(memory.confluenceSignals), createdAt: new Date() } as any;
  memory.confluenceSignals.unshift(row);
  await safe(null, async (db) => {
    await db.insert(confluenceSignals).values(stripUndefined(input as any));
    return null;
  });
  return row;
}

export async function getRecentSignals(limit = 50): Promise<any[]> {
  return safe(memory.signals.slice(0, limit), async (db) => {
    const rows = await db.select().from(signals).orderBy(desc(signals.createdAt)).limit(limit);
    return rows.length ? rows : memory.signals.slice(0, limit);
  });
}

export async function getRecentConfluenceSignals(limit = 20): Promise<any[]> {
  return safe(memory.confluenceSignals.slice(0, limit), async (db) => {
    const rows = await db.select().from(confluenceSignals).orderBy(desc(confluenceSignals.createdAt)).limit(limit);
    return rows.length ? rows : memory.confluenceSignals.slice(0, limit);
  });
}

export async function getTrades(limit = 50, offset = 0): Promise<any[]> {
  return safe(memory.trades.slice(offset, offset + limit), async (db) => {
    const rows = await db.select().from(trades).orderBy(desc(trades.openedAt)).limit(limit).offset(offset);
    return rows.length ? rows : memory.trades.slice(offset, offset + limit);
  });
}

export async function getOpenTrades(): Promise<any[]> {
  return safe(memory.trades.filter((t) => t.status === "open"), async (db) => {
    const rows = await db.select().from(trades).where(eq(trades.status, "open")).orderBy(desc(trades.openedAt));
    return rows.length ? rows : memory.trades.filter((t) => t.status === "open");
  });
}

export async function getTodayStats(): Promise<any> {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const fallbackRows = memory.trades.filter((t) => new Date(t.openedAt ?? t.createdAt ?? Date.now()) >= start);
  const rows = await safe(fallbackRows, async (db) => {
    const data = await db.select().from(trades).where(gte(trades.openedAt, start)).orderBy(desc(trades.openedAt));
    return data.length ? data : fallbackRows;
  });

  const closed = rows.filter((t) => t.status === "closed");
  const totalPnl = closed.reduce((sum, t) => sum + Number(t.pnl ?? 0), 0);
  const wins = closed.filter((t) => Number(t.pnl ?? 0) > 0).length;
  const losses = closed.filter((t) => Number(t.pnl ?? 0) <= 0).length;
  const winRate = closed.length ? (wins / closed.length) * 100 : 0;

  return {
    totalTrades: rows.length,
    openTrades: rows.filter((t) => t.status === "open").length,
    closedTrades: closed.length,
    wins,
    losses,
    winRate,
    totalPnl,
    avgPnl: closed.length ? totalPnl / closed.length : 0,
  };
}

export async function insertTrade(input: Record<string, any>): Promise<any | null> {
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
    openedAt: input.openedAt ?? new Date(),
    closedAt: input.closedAt ?? null,
  };
  memory.trades.unshift(row);

  const inserted = await safe<any | null>(null, async (db) => {
    const result: any = await db.insert(trades).values(stripUndefined(input as any));
    const id = toResultInsertId(result);
    if (!id) return row;
    const created = await db.select().from(trades).where(eq(trades.id, id)).limit(1);
    return created[0] ?? { ...row, id };
  });

  return inserted ?? row;
}

export async function closeTrade(id: number, exitPrice: number, pnl: number, pnlPercent: number, closeReason = "") {
  const target = memory.trades.find((t) => Number(t.id) === Number(id));
  if (target) {
    target.status = "closed";
    target.exitPrice = exitPrice;
    target.pnl = pnl;
    target.pnlPercent = pnlPercent;
    target.closeReason = closeReason;
    target.closedAt = new Date();
  }

  await safe(null, async (db) => {
    await db.update(trades)
      .set({ status: "closed", exitPrice, pnl, pnlPercent, closeReason, closedAt: new Date() })
      .where(eq(trades.id, id));
    return null;
  });

  return { success: true };
}

export async function getAllPositions(): Promise<any[]> {
  return safe(memory.positions, async (db) => {
    const rows = await db.select().from(positions).orderBy(desc(positions.updatedAt));
    return rows.length ? rows : memory.positions;
  });
}

export async function upsertPosition(input: Record<string, any>) {
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
    openedAt: input.openedAt ?? new Date(),
    updatedAt: new Date(),
  };
  const idx = memory.positions.findIndex((p) => p.symbol === symbol);
  if (idx >= 0) memory.positions[idx] = { ...memory.positions[idx], ...row, id: memory.positions[idx].id };
  else memory.positions.unshift(row);

  await safe(null, async (db) => {
    const existing = await db.select().from(positions).where(eq(positions.symbol, symbol)).limit(1);
    const payload = stripUndefined({ ...input, symbol, updatedAt: new Date() } as any);
    if (existing[0]) {
      await db.update(positions).set(payload).where(eq(positions.symbol, symbol));
    } else {
      await db.insert(positions).values(payload);
    }
    return null;
  });

  return memory.positions.find((p) => p.symbol === symbol) ?? row;
}

export async function deletePosition(symbol: string) {
  const normalized = symbol.toUpperCase();
  memory.positions = memory.positions.filter((p) => p.symbol !== normalized);
  await safe(null, async (db) => {
    await db.delete(positions).where(eq(positions.symbol, normalized));
    return null;
  });
  return { success: true };
}

export async function getActiveConfig(): Promise<any | null> {
  const fallback = attachRuntimeSecrets(memory.strategyConfig ?? buildDefaultConfig());
  return safe(fallback, async (db) => {
    const rows = await db.select().from(strategyConfig).where(eq(strategyConfig.isActive, true)).orderBy(desc(strategyConfig.updatedAt)).limit(1);
    const active = rows[0] ?? memory.strategyConfig ?? buildDefaultConfig();
    memory.strategyConfig = { ...fallback, ...active };
    return attachRuntimeSecrets(memory.strategyConfig);
  });
}

export async function getAllConfigs(): Promise<any[]> {
  const fallback = [attachRuntimeSecrets(memory.strategyConfig ?? buildDefaultConfig())];
  return safe(fallback, async (db) => {
    const rows = await db.select().from(strategyConfig).orderBy(desc(strategyConfig.updatedAt));
    return rows.length ? rows.map((row) => attachRuntimeSecrets(row)) : fallback;
  });
}

export async function upsertStrategyConfig(input: Record<string, any>) {
  const payload = sanitizeStrategyConfigInput({ ...input });
  const fallback = {
    ...(memory.strategyConfig ?? buildDefaultConfig()),
    ...payload,
    id: memory.strategyConfig?.id ?? 1,
    updatedAt: new Date(),
  };
  memory.strategyConfig = attachRuntimeSecrets(fallback);

  const saved = await safe<any>(memory.strategyConfig, async (db) => {
    if (payload.isActive) {
      await db.update(strategyConfig).set({ isActive: false });
    }
    const name = String(payload.name ?? memory.strategyConfig.name ?? "默认策略");
    const existing = await db.select().from(strategyConfig).where(eq(strategyConfig.name, name)).limit(1);
    if (existing[0]) {
      await db.update(strategyConfig).set(payload).where(eq(strategyConfig.id, existing[0].id));
      const rows = await db.select().from(strategyConfig).where(eq(strategyConfig.id, existing[0].id)).limit(1);
      return attachRuntimeSecrets(rows[0] ?? { ...memory.strategyConfig, id: existing[0].id });
    }
    const result: any = await db.insert(strategyConfig).values({ ...buildDefaultConfig(), ...payload, name } as any);
    const id = toResultInsertId(result);
    const rows = id ? await db.select().from(strategyConfig).where(eq(strategyConfig.id, id)).limit(1) : [];
    return attachRuntimeSecrets(rows[0] ?? { ...memory.strategyConfig, id: id || 1, name });
  });

  memory.strategyConfig = saved;
  return saved;
}

export async function updateStrategyConfig(id: number, input: Record<string, any>) {
  const payload = sanitizeStrategyConfigInput({ ...input, updatedAt: new Date() });
  memory.strategyConfig = attachRuntimeSecrets({ ...(memory.strategyConfig ?? buildDefaultConfig()), ...payload, id });

  const saved = await safe<any>(memory.strategyConfig, async (db) => {
    await db.update(strategyConfig).set(payload).where(eq(strategyConfig.id, id));
    const rows = await db.select().from(strategyConfig).where(eq(strategyConfig.id, id)).limit(1);
    return attachRuntimeSecrets(rows[0] ?? memory.strategyConfig);
  });

  memory.strategyConfig = saved;
  return saved;
}

export async function getLatestSnapshot(): Promise<any | null> {
  return safe(memory.snapshots[0] ?? null, async (db) => {
    const rows = await db.select().from(accountSnapshots).orderBy(desc(accountSnapshots.createdAt)).limit(1);
    return rows[0] ?? memory.snapshots[0] ?? null;
  });
}

export async function getSnapshotHistory(hours = 24): Promise<any[]> {
  const since = new Date(Date.now() - hours * 3600_000);
  const fallback = memory.snapshots.filter((s) => new Date(s.createdAt) >= since);
  return safe(fallback, async (db) => {
    const rows = await db.select().from(accountSnapshots).where(gte(accountSnapshots.createdAt, since)).orderBy(desc(accountSnapshots.createdAt));
    return rows.length ? rows : fallback;
  });
}

export async function insertAccountSnapshot(input: Record<string, any>) {
  const row = { id: nowId(memory.snapshots), ...stripUndefined(input), createdAt: new Date() };
  memory.snapshots.unshift(row);
  const saved = await safe<any>(row, async (db) => {
    const result: any = await db.insert(accountSnapshots).values(stripUndefined(input as any));
    const id = toResultInsertId(result);
    if (!id) return row;
    const rows = await db.select().from(accountSnapshots).where(eq(accountSnapshots.id, id)).limit(1);
    return rows[0] ?? { ...row, id };
  });
  return saved;
}

export async function getBacktestResults(): Promise<any[]> {
  return safe(memory.backtests, async (db) => {
    const rows = await db.select().from(backtestResults).orderBy(desc(backtestResults.createdAt));
    return rows.length ? rows : memory.backtests;
  });
}

export async function insertBacktestResult(input: Record<string, any>) {
  const row = { id: nowId(memory.backtests), ...stripUndefined(input), createdAt: new Date() };
  memory.backtests.unshift(row);
  const saved = await safe<any>(row, async (db) => {
    const result: any = await db.insert(backtestResults).values(stripUndefined(input as any));
    const id = toResultInsertId(result);
    if (!id) return row;
    const rows = await db.select().from(backtestResults).where(eq(backtestResults.id, id)).limit(1);
    return rows[0] ?? { ...row, id };
  });
  return saved;
}

export async function getTelegramConfig(): Promise<any | null> {
  return safe(memory.telegramConfig, async (db) => {
    const rows = await db.select().from(telegramConfig).orderBy(desc(telegramConfig.updatedAt)).limit(1);
    const cfg = rows[0] ?? memory.telegramConfig;
    if (cfg) memory.telegramConfig = cfg;
    return cfg ?? null;
  });
}

export async function upsertTelegramConfig(input: Record<string, any>) {
  const payload = stripUndefined(input);
  memory.telegramConfig = { id: memory.telegramConfig?.id ?? 1, ...memory.telegramConfig, ...payload, updatedAt: new Date() };
  const saved = await safe<any>(memory.telegramConfig, async (db) => {
    const rows = await db.select().from(telegramConfig).limit(1);
    if (rows[0]) {
      await db.update(telegramConfig).set(payload).where(eq(telegramConfig.id, rows[0].id));
      const updated = await db.select().from(telegramConfig).where(eq(telegramConfig.id, rows[0].id)).limit(1);
      return updated[0] ?? { ...memory.telegramConfig, id: rows[0].id };
    }
    const result: any = await db.insert(telegramConfig).values(payload as any);
    const id = toResultInsertId(result);
    const created = id ? await db.select().from(telegramConfig).where(eq(telegramConfig.id, id)).limit(1) : [];
    return created[0] ?? { ...memory.telegramConfig, id: id || 1 };
  });
  memory.telegramConfig = saved;
  return saved;
}

function inferStrategyName(trade: any) {
  if (trade?.confluenceSignalId) return "FOMO+Alpha 共振";
  const score = Number(trade?.signalScore ?? 0);
  if (score >= 85) return "高评分突破";
  if (score >= 70) return "趋势跟随";
  if (score >= 60) return "谨慎试单";
  return "其他策略";
}

export async function getStrategyWinRateStats(): Promise<any[]> {
  const allTrades = await getTrades(500, 0);
  const closed = allTrades.filter((t) => t.status === "closed");
  const bucket = new Map<string, any>();

  for (const trade of closed) {
    const strategyName = inferStrategyName(trade);
    const item = bucket.get(strategyName) ?? { strategyName, totalTrades: 0, winTrades: 0, lossTrades: 0, totalPnl: 0, winRate: 0 };
    item.totalTrades += 1;
    if (Number(trade.pnl ?? 0) > 0) item.winTrades += 1;
    else item.lossTrades += 1;
    item.totalPnl += Number(trade.pnl ?? 0);
    item.winRate = item.totalTrades ? (item.winTrades / item.totalTrades) * 100 : 0;
    bucket.set(strategyName, item);
  }

  const result = Array.from(bucket.values()).sort((a, b) => b.winRate - a.winRate);
  if (result.length) return result;

  return [
    { strategyName: "FOMO+Alpha 共振", totalTrades: 0, winTrades: 0, lossTrades: 0, totalPnl: 0, winRate: 0 },
    { strategyName: "高评分突破", totalTrades: 0, winTrades: 0, lossTrades: 0, totalPnl: 0, winRate: 0 },
    { strategyName: "趋势跟随", totalTrades: 0, winTrades: 0, lossTrades: 0, totalPnl: 0, winRate: 0 },
  ];
}

export async function getTradeCases(limit = 20): Promise<any[]> {
  const rows = await getTrades(limit, 0);
  return rows.slice(0, limit).map((trade) => ({
    ...trade,
    strategyName: inferStrategyName(trade),
    outcome: Number(trade.pnl ?? 0) > 0 ? "win" : Number(trade.pnl ?? 0) < 0 ? "loss" : "flat",
  }));
}

export async function addVsSignalStat(input: Record<string, any>) {
  const row = { id: nowId(memory.vsStats), ...stripUndefined(input), result: input.result ?? "pending", createdAt: new Date(), updatedAt: new Date() };
  memory.vsStats.unshift(row);

  const id = await safe<number>(row.id, async (db) => {
    const result: any = await db.insert(vsSignalStats).values(stripUndefined(input as any));
    return toResultInsertId(result) || row.id;
  });

  return id;
}

export async function updateVsSignalStat(id: number, input: Record<string, any>) {
  const idx = memory.vsStats.findIndex((item) => Number(item.id) === Number(id));
  if (idx >= 0) memory.vsStats[idx] = { ...memory.vsStats[idx], ...stripUndefined(input), updatedAt: new Date() };
  await safe(null, async (db) => {
    await db.update(vsSignalStats).set(stripUndefined({ ...input, updatedAt: new Date() } as any)).where(eq(vsSignalStats.id, id));
    return null;
  });
  return { success: true };
}

export async function getVsSignalStats(filters: { limit?: number; signalType?: string; direction?: string } = {}): Promise<any[]> {
  const { limit = 100, signalType, direction } = filters;
  const local = memory.vsStats.filter((item) => (!signalType || item.signalType === signalType) && (!direction || item.direction === direction)).slice(0, limit);
  return safe(local, async (db) => {
    const rows = await db.select().from(vsSignalStats).orderBy(desc(vsSignalStats.createdAt)).limit(limit);
    return rows.filter((item) => (!signalType || item.signalType === signalType) && (!direction || item.direction === direction));
  });
}

export async function getVsSignalWinRate(): Promise<any> {
  const rows = await getVsSignalStats({ limit: 500 });
  const pending = rows.filter((row) => !row.result || row.result === "pending").length;
  const completed = rows.filter((row) => row.result && row.result !== "pending");
  const win = completed.filter((row) => row.result === "win").length;
  const loss = completed.filter((row) => row.result === "loss").length;
  const byTypeMap = new Map<string, any>();

  for (const row of completed) {
    const key = row.signalType || "unknown";
    const item = byTypeMap.get(key) ?? { signalType: key, total: 0, win: 0, loss: 0, pending: 0, winRate: 0, avgPnl24h: 0, avgPnl48h: 0 };
    item.total += 1;
    if (row.result === "win") item.win += 1;
    if (row.result === "loss") item.loss += 1;
    item.avgPnl24h += Number(row.pnlPct24h ?? 0);
    item.avgPnl48h += Number(row.pnlPct48h ?? 0);
    item.winRate = item.total ? (item.win / item.total) * 100 : 0;
    byTypeMap.set(key, item);
  }

  const list = Array.from(byTypeMap.values())
    .map((item) => ({
      ...item,
      avgPnl24h: item.total ? item.avgPnl24h / item.total : 0,
      avgPnl48h: item.total ? item.avgPnl48h / item.total : 0,
    }))
    .sort((a, b) => b.winRate - a.winRate);

  const byType = Object.fromEntries(list.map((item) => [item.signalType, item]));

  return {
    total: rows.length,
    completed: completed.length,
    win,
    loss,
    pending,
    wins: win,
    losses: loss,
    winRate: completed.length ? (win / completed.length) * 100 : 0,
    byType,
    list,
  };
}

export async function saveVSLoginCredentials(email: string, password: string, refreshToken = "", autoRefreshEnabled = true) {
  const cfg = await getActiveConfig();
  const id = Number(cfg?.id ?? 1);
  return updateStrategyConfig(id, {
    vsLoginEmail: email,
    vsLoginPassword: password,
    vsRefreshToken: refreshToken,
    vsAutoRefreshEnabled: autoRefreshEnabled,
  });
}

export async function loadVSLoginCredentials(): Promise<any | null> {
  const cfg = await getActiveConfig();
  if (!cfg) return null;
  return {
    email: cfg.vsLoginEmail || "",
    password: cfg.vsLoginPassword || "",
    refreshToken: cfg.vsRefreshToken || "",
    autoRefreshEnabled: Boolean(cfg.vsAutoRefreshEnabled),
  };
}

export async function getUserByOpenId(openId: string): Promise<any | null> {
  const fallback = null;
  return safe(fallback, async (db) => {
    const rows = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
    return rows[0] ?? null;
  });
}

export async function upsertUser(input: Record<string, any>): Promise<any> {
  const openId = String(input.openId ?? "").trim();
  if (!openId) throw new Error("openId is required");
  const payload = stripUndefined({
    openId,
    name: input.name ?? null,
    email: input.email ?? null,
    loginMethod: input.loginMethod ?? null,
    role: input.role ?? "user",
    lastSignedIn: input.lastSignedIn ?? new Date(),
    updatedAt: new Date(),
  } as any);

  return safe({ ...payload, id: 0 }, async (db) => {
    const existing = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
    if (existing[0]) {
      await db.update(users).set(payload).where(eq(users.openId, openId));
      const rows = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
      return rows[0] ?? { ...existing[0], ...payload };
    }
    const result: any = await db.insert(users).values(payload);
    const id = toResultInsertId(result);
    const rows = id ? await db.select().from(users).where(eq(users.id, id)).limit(1) : [];
    return rows[0] ?? { ...payload, id };
  });
}
