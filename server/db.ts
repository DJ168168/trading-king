import { eq, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser, users,
  signals, InsertSignal,
  simPositions, InsertSimPosition,
  simTrades, InsertSimTrade,
  systemConfig, simBalance
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
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

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ===== Signals =====
export async function insertSignal(signal: InsertSignal) {
  const db = await getDb();
  if (!db) return null;
  return db.insert(signals).values(signal);
}

export async function getRecentSignals(limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(signals).orderBy(desc(signals.createdAt)).limit(limit);
}

export async function markSignalTelegramSent(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(signals).set({ telegramSent: true }).where(eq(signals.id, id));
}

// ===== Sim Positions =====
export async function getOpenSimPositions() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(simPositions).where(eq(simPositions.status, "open")).orderBy(desc(simPositions.openedAt));
}

export async function insertSimPosition(pos: InsertSimPosition) {
  const db = await getDb();
  if (!db) return null;
  return db.insert(simPositions).values(pos);
}

export async function closeSimPosition(id: number, closePrice: number, pnl: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(simPositions).set({
    status: "closed",
    closePrice: String(closePrice),
    closedAt: new Date(),
    pnl: String(pnl),
  }).where(eq(simPositions.id, id));
}

export async function updateSimPositionPrice(id: number, currentPrice: number, pnl: number, pnlPct: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(simPositions).set({
    currentPrice: String(currentPrice),
    pnl: String(pnl),
    pnlPct: String(pnlPct),
  }).where(eq(simPositions.id, id));
}

// ===== Sim Trades =====
export async function insertSimTrade(trade: InsertSimTrade) {
  const db = await getDb();
  if (!db) return null;
  return db.insert(simTrades).values(trade);
}

export async function getRecentSimTrades(limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(simTrades).orderBy(desc(simTrades.createdAt)).limit(limit);
}

// ===== System Config =====
export async function getConfig(key: string): Promise<string | null> {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(systemConfig).where(eq(systemConfig.key, key)).limit(1);
  return result[0]?.value ?? null;
}

export async function setConfig(key: string, value: string) {
  const db = await getDb();
  if (!db) return;
  await db.insert(systemConfig).values({ key, value }).onDuplicateKeyUpdate({ set: { value } });
}

export async function getAllConfigs(): Promise<Record<string, string>> {
  const db = await getDb();
  if (!db) return {};
  const rows = await db.select().from(systemConfig);
  return Object.fromEntries(rows.map(r => [r.key, r.value ?? ""]));
}

// ===== Sim Balance =====
export async function recordSimBalance(balance: number, equity: number, pnl: number) {
  const db = await getDb();
  if (!db) return;
  await db.insert(simBalance).values({
    balance: String(balance),
    equity: String(equity),
    pnl: String(pnl),
  });
}

export async function getSimBalanceHistory(limit = 100) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(simBalance).orderBy(desc(simBalance.recordedAt)).limit(limit);
}
