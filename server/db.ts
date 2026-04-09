import { eq, desc, and, gte, lte, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser, users,
  signals, InsertSignal,
  confluenceSignals, InsertConfluenceSignal,
  trades, InsertTrade,
  positions, InsertPosition,
  strategyConfig, InsertStrategyConfig,
  accountSnapshots,
  backtestResults,
  telegramConfig,
  vsSignalStats, InsertVsSignalStat,
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── Users ───────────────────────────────────────────────────────────────────
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;
  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;
  textFields.forEach((field) => {
    const value = user[field];
    if (value === undefined) return;
    const normalized = value ?? null;
    values[field] = normalized;
    updateSet[field] = normalized;
  });
  if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
  if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
  else if (user.openId === ENV.ownerOpenId) { values.role = 'admin'; updateSet.role = 'admin'; }
  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ─── Signals ─────────────────────────────────────────────────────────────────
export async function insertSignal(signal: InsertSignal) {
  const db = await getDb();
  if (!db) return null;
  try {
    await db.insert(signals).values(signal).onDuplicateKeyUpdate({ set: { processed: signal.processed } });
    const result = await db.select().from(signals).where(eq(signals.signalId, signal.signalId)).limit(1);
    return result[0] ?? null;
  } catch (e) { console.error("[DB] insertSignal error:", e); return null; }
}

export async function getRecentSignals(limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(signals).orderBy(desc(signals.createdAt)).limit(limit);
}

export async function getSignalsBySymbol(symbol: string, limit = 20) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(signals).where(eq(signals.symbol, symbol)).orderBy(desc(signals.createdAt)).limit(limit);
}

// ─── Confluence Signals ───────────────────────────────────────────────────────
export async function insertConfluenceSignal(cs: InsertConfluenceSignal) {
  const db = await getDb();
  if (!db) return null;
  try {
    const result = await db.insert(confluenceSignals).values(cs);
    const id = (result as any)[0]?.insertId;
    if (!id) return null;
    const rows = await db.select().from(confluenceSignals).where(eq(confluenceSignals.id, id)).limit(1);
    return rows[0] ?? null;
  } catch (e) { console.error("[DB] insertConfluenceSignal error:", e); return null; }
}

export async function updateConfluenceSignalStatus(id: number, status: "executed" | "skipped" | "failed", skipReason?: string) {
  const db = await getDb();
  if (!db) return;
  await db.update(confluenceSignals).set({ status, skipReason: skipReason ?? null }).where(eq(confluenceSignals.id, id));
}

export async function getRecentConfluenceSignals(limit = 20) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(confluenceSignals).orderBy(desc(confluenceSignals.createdAt)).limit(limit);
}

// ─── Trades ───────────────────────────────────────────────────────────────────
export async function insertTrade(trade: InsertTrade) {
  const db = await getDb();
  if (!db) return null;
  try {
    const result = await db.insert(trades).values(trade);
    const id = (result as any)[0]?.insertId;
    if (!id) return null;
    const rows = await db.select().from(trades).where(eq(trades.id, id)).limit(1);
    return rows[0] ?? null;
  } catch (e) { console.error("[DB] insertTrade error:", e); return null; }
}

export async function closeTrade(id: number, exitPrice: number, pnl: number, pnlPercent: number, closeReason: string) {
  const db = await getDb();
  if (!db) return;
  await db.update(trades).set({ exitPrice, pnl, pnlPercent, closeReason, status: "closed", closedAt: new Date() }).where(eq(trades.id, id));
}

export async function getTrades(limit = 50, offset = 0) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(trades).orderBy(desc(trades.openedAt)).limit(limit).offset(offset);
}

export async function getOpenTrades() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(trades).where(eq(trades.status, "open")).orderBy(desc(trades.openedAt));
}

export async function getTodayStats() {
  const db = await getDb();
  if (!db) return { totalTrades: 0, winTrades: 0, lossTrades: 0, totalPnl: 0, winRate: 0 };
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const result = await db.select().from(trades).where(and(gte(trades.openedAt, today), eq(trades.status, "closed")));
  const totalTrades = result.length;
  const winTrades = result.filter(t => (t.pnl ?? 0) > 0).length;
  const lossTrades = result.filter(t => (t.pnl ?? 0) <= 0).length;
  const totalPnl = result.reduce((sum, t) => sum + (t.pnl ?? 0), 0);
  const winRate = totalTrades > 0 ? (winTrades / totalTrades) * 100 : 0;
  return { totalTrades, winTrades, lossTrades, totalPnl, winRate };
}

// ─── Positions ────────────────────────────────────────────────────────────────
export async function upsertPosition(pos: InsertPosition) {
  const db = await getDb();
  if (!db) return;
  await db.insert(positions).values(pos).onDuplicateKeyUpdate({
    set: { quantity: pos.quantity, currentPrice: pos.currentPrice, unrealizedPnl: pos.unrealizedPnl, unrealizedPnlPercent: pos.unrealizedPnlPercent, updatedAt: new Date() }
  });
}

export async function deletePosition(symbol: string) {
  const db = await getDb();
  if (!db) return;
  await db.delete(positions).where(eq(positions.symbol, symbol));
}

export async function getAllPositions() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(positions).orderBy(desc(positions.openedAt));
}

// ─── Strategy Config ──────────────────────────────────────────────────────────
export async function getActiveConfig() {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(strategyConfig).where(eq(strategyConfig.isActive, true)).limit(1);
  return result[0] ?? null;
}

export async function getAllConfigs() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(strategyConfig).orderBy(desc(strategyConfig.createdAt));
}

export async function upsertStrategyConfig(config: InsertStrategyConfig) {
  const db = await getDb();
  if (!db) return null;
  await db.insert(strategyConfig).values(config).onDuplicateKeyUpdate({ set: { ...config, updatedAt: new Date() } });
  const result = await db.select().from(strategyConfig).where(eq(strategyConfig.name, config.name)).limit(1);
  return result[0] ?? null;
}

export async function updateStrategyConfig(id: number, updates: Partial<InsertStrategyConfig>) {
  const db = await getDb();
  if (!db) return;
  await db.update(strategyConfig).set({ ...updates, updatedAt: new Date() }).where(eq(strategyConfig.id, id));
}

// ─── ValueScan Token 持久化 ───────────────────────────────────────────────────

/** 将 VS Token 持久化到活跃配置中 */
export async function saveVSToken(token: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const config = await getActiveConfig();
  if (config) {
    await db.update(strategyConfig)
      .set({ vsUserToken: token, vsTokenSetAt: Date.now(), updatedAt: new Date() })
      .where(eq(strategyConfig.id, config.id));
  } else {
    // 如果没有活跃配置，创建一个默认配置
    await db.insert(strategyConfig).values({
      name: 'default',
      vsUserToken: token,
      vsTokenSetAt: Date.now(),
    }).onDuplicateKeyUpdate({ set: { vsUserToken: token, vsTokenSetAt: Date.now(), updatedAt: new Date() } });
  }
}

/** 从数据库加载 VS Token */
export async function loadVSToken(): Promise<{ token: string; setAt: number } | null> {
  const db = await getDb();
  if (!db) return null;
  const config = await getActiveConfig();
  if (!config || !config.vsUserToken) return null;
  return { token: config.vsUserToken, setAt: config.vsTokenSetAt ?? 0 };
}

/** 保存 VS 自动登录凭证和 Refresh Token */
export async function saveVSLoginCredentials(email: string, password: string, refreshToken: string, autoRefreshEnabled: boolean): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const config = await getActiveConfig();
  if (config) {
    await db.update(strategyConfig)
      .set({ vsLoginEmail: email, vsLoginPassword: password, vsRefreshToken: refreshToken, vsAutoRefreshEnabled: autoRefreshEnabled, updatedAt: new Date() })
      .where(eq(strategyConfig.id, config.id));
  } else {
    await db.insert(strategyConfig).values({
      name: 'default',
      vsLoginEmail: email,
      vsLoginPassword: password,
      vsRefreshToken: refreshToken,
      vsAutoRefreshEnabled: autoRefreshEnabled,
    }).onDuplicateKeyUpdate({ set: { vsLoginEmail: email, vsLoginPassword: password, vsRefreshToken: refreshToken, vsAutoRefreshEnabled: autoRefreshEnabled, updatedAt: new Date() } });
  }
}

/** 加载 VS 自动登录凭证 */
export async function loadVSLoginCredentials(): Promise<{ email: string; password: string; refreshToken: string; autoRefreshEnabled: boolean } | null> {
  const db = await getDb();
  if (!db) return null;
  const config = await getActiveConfig();
  if (!config) return null;
  return {
    email: config.vsLoginEmail ?? '',
    password: config.vsLoginPassword ?? '',
    refreshToken: config.vsRefreshToken ?? '',
    autoRefreshEnabled: config.vsAutoRefreshEnabled ?? false,
  };
}

// ─── Account Snapshots ─────────────────────────────────────────────────────────────────────────────────────
export async function insertAccountSnapshot(data: { totalBalance: number; availableBalance: number; unrealizedPnl?: number; dailyPnl?: number; dailyTrades?: number; positionCount?: number }) {
  const db = await getDb();
  if (!db) return;
  await db.insert(accountSnapshots).values(data);
}

export async function getLatestSnapshot() {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(accountSnapshots).orderBy(desc(accountSnapshots.createdAt)).limit(1);
  return result[0] ?? null;
}

export async function getSnapshotHistory(hours = 24) {
  const db = await getDb();
  if (!db) return [];
  const since = new Date(Date.now() - hours * 3600 * 1000);
  return db.select().from(accountSnapshots).where(gte(accountSnapshots.createdAt, since)).orderBy(accountSnapshots.createdAt);
}

// ─── Backtest Results ─────────────────────────────────────────────────────────
export async function insertBacktestResult(data: any) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(backtestResults).values(data);
  const id = (result as any)[0]?.insertId;
  if (!id) return null;
  const rows = await db.select().from(backtestResults).where(eq(backtestResults.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function getBacktestResults(limit = 10) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(backtestResults).orderBy(desc(backtestResults.createdAt)).limit(limit);
}

// ─── Telegram Config ──────────────────────────────────────────────────────────
export async function getTelegramConfig() {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(telegramConfig).limit(1);
  return result[0] ?? null;
}

export async function upsertTelegramConfig(config: { botToken?: string; chatId?: string; enableTradeNotify?: boolean; enableRiskNotify?: boolean; enableDailyReport?: boolean; isActive?: boolean }) {
  const db = await getDb();
  if (!db) return;
  const existing = await getTelegramConfig();
  if (existing) {
    await db.update(telegramConfig).set({ ...config, updatedAt: new Date() }).where(eq(telegramConfig.id, existing.id));
  } else {
    await db.insert(telegramConfig).values(config);
  }
}

// ─── Strategy Win Rate Stats ──────────────────────────────────────────────────
/**
 * 按信号类型聚合历史交易，计算胜率、盈亏比、样本量
 * 用于高胜率策略排行榜
 */
export async function getStrategyWinRateStats() {
  const db = await getDb();
  if (!db) return [];
  // 获取所有已关闭交易
  const closedTrades = await db
    .select()
    .from(trades)
    .where(eq(trades.status, "closed"))
    .orderBy(desc(trades.openedAt))
    .limit(500);

  if (closedTrades.length === 0) return [];

  // 按交易动作分组（OPEN_LONG = 做多策略, OPEN_SHORT = 做空策略）
  const groups: Record<string, typeof closedTrades> = {};
  for (const t of closedTrades) {
    const key = t.action.includes("LONG") ? "做多策略" : t.action.includes("SHORT") ? "做空策略" : t.action;
    if (!groups[key]) groups[key] = [];
    groups[key].push(t);
  }

  return Object.entries(groups).map(([signalType, tradeList]) => {
    const wins = tradeList.filter(t => (t.pnl ?? 0) > 0);
    const losses = tradeList.filter(t => (t.pnl ?? 0) <= 0);
    const winRate = tradeList.length > 0 ? (wins.length / tradeList.length) * 100 : 0;
    const avgWin = wins.length > 0 ? wins.reduce((s, t) => s + (t.pnlPercent ?? 0), 0) / wins.length : 0;
    const avgLoss = losses.length > 0 ? Math.abs(losses.reduce((s, t) => s + (t.pnlPercent ?? 0), 0) / losses.length) : 0;
    const profitFactor = avgLoss > 0 ? avgWin / avgLoss : avgWin > 0 ? 99 : 0;
    const totalPnl = tradeList.reduce((s, t) => s + (t.pnl ?? 0), 0);

    // 计算最大回撤（简化：最大单笔亏损）
    const maxDrawdown = losses.length > 0 ? Math.abs(Math.min(...losses.map(t => t.pnlPercent ?? 0))) : 0;

    return {
      signalType,
      totalTrades: tradeList.length,
      wins: wins.length,
      losses: losses.length,
      winRate: Math.round(winRate * 10) / 10,
      avgWinPct: Math.round(avgWin * 100) / 100,
      avgLossPct: Math.round(avgLoss * 100) / 100,
      profitFactor: Math.round(profitFactor * 100) / 100,
      totalPnl: Math.round(totalPnl * 100) / 100,
      maxDrawdown: Math.round(maxDrawdown * 100) / 100,
    };
  }).sort((a, b) => b.winRate - a.winRate);
}

/**
 * 获取实战案例：从真实交易记录生成典型案例
 */
export async function getTradeCases(limit = 20) {
  const db = await getDb();
  if (!db) return [];
  // 获取已关闭的交易，按盈亏绝对值排序（最典型的案例）
  const closedTrades = await db
    .select()
    .from(trades)
    .where(eq(trades.status, "closed"))
    .orderBy(desc(trades.openedAt))
    .limit(limit);

  return closedTrades.map(t => ({
    id: t.id,
    symbol: t.symbol,
    direction: t.action.includes("LONG") ? "long" : "short",
    signalType: t.action,
    signalScore: t.signalScore ?? 0,
    entryPrice: t.entryPrice,
    exitPrice: t.exitPrice ?? 0,
    pnl: t.pnl ?? 0,
    pnlPercent: t.pnlPercent ?? 0,
    closeReason: t.closeReason ?? "unknown",
    openedAt: t.openedAt,
    closedAt: t.closedAt,
    isWin: (t.pnl ?? 0) > 0,
    leverage: t.leverage ?? 1,
  }));
}

// ─── ValueScan 信号历史胜率统计 ────────────────────────────────────────────────
export async function addVsSignalStat(data: Omit<InsertVsSignalStat, "id" | "createdAt" | "updatedAt">) {
  const db = await getDb();
  if (!db) return null;
  const [res] = await db.insert(vsSignalStats).values(data);
  return (res as any).insertId as number;
}

export async function updateVsSignalStat(
  id: number,
  data: Partial<Pick<InsertVsSignalStat, "exitPrice24h" | "exitPrice48h" | "pnlPct24h" | "pnlPct48h" | "result" | "notes">>
) {
  const db = await getDb();
  if (!db) return;
  await db.update(vsSignalStats).set(data).where(eq(vsSignalStats.id, id));
}

export async function getVsSignalStats(opts: { limit?: number; signalType?: string; direction?: string } = {}) {
  const db = await getDb();
  if (!db) return [];
  const conditions: ReturnType<typeof eq>[] = [];
  if (opts.signalType) conditions.push(eq(vsSignalStats.signalType, opts.signalType));
  if (opts.direction) conditions.push(eq(vsSignalStats.direction, opts.direction as any));
  return db
    .select()
    .from(vsSignalStats)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(vsSignalStats.createdAt))
    .limit(opts.limit ?? 200);
}

export async function getVsSignalWinRate() {
  const db = await getDb();
  if (!db) return { total: 0, win: 0, loss: 0, pending: 0, winRate: 0, byType: {} as Record<string, { win: number; total: number; winRate: number }> };
  const allRows = await db.select().from(vsSignalStats).orderBy(desc(vsSignalStats.createdAt)).limit(1000);
  const resolved = allRows.filter(r => r.result !== "pending");
  const pending = allRows.filter(r => r.result === "pending").length;
  const win = resolved.filter(r => r.result === "win").length;
  const loss = resolved.filter(r => r.result === "loss").length;
  const byType: Record<string, { win: number; total: number; winRate: number }> = {};
  for (const row of resolved) {
    if (!byType[row.signalType]) byType[row.signalType] = { win: 0, total: 0, winRate: 0 };
    byType[row.signalType].total++;
    if (row.result === "win") byType[row.signalType].win++;
  }
  for (const k of Object.keys(byType)) {
    byType[k].winRate = byType[k].total > 0 ? Math.round(byType[k].win / byType[k].total * 100) : 0;
  }
  return {
    total: allRows.length,
    win,
    loss,
    pending,
    winRate: resolved.length > 0 ? Math.round(win / resolved.length * 100) : 0,
    byType,
  };
}
