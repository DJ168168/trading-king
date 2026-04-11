import { getActiveConfig, getAllPositions, getOpenTrades, getTodayStats } from "./db";

const cooldownMap = new Map<string, number>();

function clamp(num: number, min: number, max: number) {
  return Math.max(min, Math.min(max, num));
}

function normalizeSymbol(symbol: string) {
  return String(symbol || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function getCooldownStatus() {
  const now = Date.now();
  const entries = Array.from(cooldownMap.entries())
    .filter(([, expireAt]) => expireAt > now)
    .map(([symbol, expireAt]) => ({
      symbol,
      remainingMs: expireAt - now,
      remainingMinutes: Number(((expireAt - now) / 60000).toFixed(2)),
      expireAt: new Date(expireAt),
    }));

  return {
    count: entries.length,
    items: entries,
  };
}

export function markCooldown(symbol: string, minutes = 30) {
  const normalized = normalizeSymbol(symbol);
  cooldownMap.set(normalized, Date.now() + minutes * 60_000);
  return { symbol: normalized, minutes };
}

async function fetchBtcKlines(interval = "1h", limit = 48) {
  const res = await fetch(`https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=${interval}&limit=${limit}`);
  if (!res.ok) throw new Error(`获取 BTC K 线失败: ${res.status}`);
  return (await res.json()) as any[];
}

export async function getBtcTrend(): Promise<"up" | "down" | "sideways"> {
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

export function calcDynamicPositionPercent(scorePercent: number, basePercent = 1, maxPercent = 5) {
  const normalizedScore = clamp(scorePercent, 0, 100);
  if (normalizedScore <= 60) return Number(basePercent.toFixed(2));
  const factor = 1 + ((normalizedScore - 60) / 30) * 4;
  return Number(clamp(basePercent * factor, basePercent, maxPercent).toFixed(2));
}

export function calcDynamicStopLoss(scorePercent: number, baseStopLossPercent = 3) {
  const normalizedScore = clamp(scorePercent, 0, 100);
  const tighten = ((normalizedScore - 60) / 40) * 1.2;
  return Number(clamp(baseStopLossPercent - Math.max(0, tighten), 1, baseStopLossPercent).toFixed(2));
}

export function calcDynamicTakeProfit(dynamicStopLossPercent: number, tp1 = 5, tp2 = 10) {
  const ratio = dynamicStopLossPercent / 3;
  return {
    takeProfit1: Number(Math.max(tp1 * ratio, dynamicStopLossPercent * 1.5).toFixed(2)),
    takeProfit2: Number(Math.max(tp2 * ratio, dynamicStopLossPercent * 2.5).toFixed(2)),
  };
}

export function calcPositionSize(balance: number, entryPrice: number, leverage = 1, positionPercent = 1) {
  const safeBalance = Math.max(0, Number(balance || 0));
  const safePrice = Math.max(0.0000001, Number(entryPrice || 0));
  const notional = safeBalance * (Number(positionPercent || 0) / 100);
  const quantity = (notional * Math.max(1, Number(leverage || 1))) / safePrice;
  return {
    balance: safeBalance,
    notional,
    quantity: Number(quantity.toFixed(6)),
  };
}

export async function checkRisk(symbol: string, positionValue: number) {
  const cfg = await getActiveConfig();
  const positions = await getAllPositions();
  const todayStats = await getTodayStats();
  const openTrades = await getOpenTrades();
  const normalized = normalizeSymbol(symbol);

  if (cfg?.emergencyStop) {
    return { ok: false, code: "EMERGENCY_STOP", reason: "系统已开启紧急停止，禁止新开仓" };
  }

  if (!cfg?.autoTradingEnabled) {
    return { ok: false, code: "AUTO_TRADING_DISABLED", reason: "自动交易未开启" };
  }

  const cooldown = cooldownMap.get(normalized);
  if (cooldown && cooldown > Date.now()) {
    return { ok: false, code: "COOLDOWN", reason: `${normalized} 处于冷却期，请稍后再试` };
  }

  if (positions.some((p) => normalizeSymbol(p.symbol) === normalized) || openTrades.some((t) => normalizeSymbol(t.symbol) === normalized && t.status === "open")) {
    return { ok: false, code: "DUPLICATE_POSITION", reason: `${normalized} 已存在持仓或未平仓交易` };
  }

  const minOrderUsdt = Number(cfg?.minOrderUsdt ?? 1);
  if (positionValue < minOrderUsdt) {
    return { ok: false, code: "ORDER_TOO_SMALL", reason: `下单金额低于最小开仓金额 ${minOrderUsdt} USDT` };
  }

  const totalOpenExposure = positions.reduce((sum, item) => sum + Math.abs(Number(item.currentPrice ?? item.entryPrice ?? 0) * Number(item.quantity ?? 0)), 0);
  const maxTotalPositionPercent = Number(cfg?.maxTotalPositionPercent ?? 50);
  const assumedEquity = Math.max(1000, totalOpenExposure / Math.max(maxTotalPositionPercent / 100, 0.01));
  const totalRatio = ((totalOpenExposure + positionValue) / assumedEquity) * 100;
  if (totalRatio > maxTotalPositionPercent + 0.001) {
    return { ok: false, code: "MAX_TOTAL_POSITION", reason: `总持仓占比将达到 ${totalRatio.toFixed(2)}%，超过上限 ${maxTotalPositionPercent}%` };
  }

  const maxDailyTrades = Number(cfg?.maxDailyTrades ?? 20);
  if (Number(todayStats?.totalTrades ?? 0) >= maxDailyTrades) {
    return { ok: false, code: "MAX_DAILY_TRADES", reason: `今日交易次数已达到上限 ${maxDailyTrades}` };
  }

  const maxDailyLossPercent = Number(cfg?.maxDailyLossPercent ?? 5);
  const approxLossPct = Number(todayStats?.totalPnl ?? 0) < 0 ? Math.abs(Number(todayStats.totalPnl)) / Math.max(positionValue, 1) * 100 : 0;
  if (approxLossPct >= maxDailyLossPercent) {
    return { ok: false, code: "MAX_DAILY_LOSS", reason: `今日亏损估算已超过阈值 ${maxDailyLossPercent}%` };
  }

  return {
    ok: true,
    code: "OK",
    reason: "风控检查通过",
    limits: {
      minOrderUsdt,
      maxDailyTrades,
      maxDailyLossPercent,
      maxTotalPositionPercent,
    },
  };
}
