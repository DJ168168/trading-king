/**
 * 统一风险管理器 v2
 * 新增：冷却期机制、ATR动态止损、动态仓位管理
 */

import { getActiveConfig, getAllPositions, getTodayStats, getLatestSnapshot } from "./db";
import { evaluateStrategies } from "./strategyEngine";

export interface RiskCheckResult {
  allowed: boolean;
  reason?: string;
  code?: string;
}

// ─── 冷却期缓存（内存，服务器重启后重置）───────────────────────────────────
// key: symbol (大写), value: 冷却期到期时间戳 (ms)
const cooldownMap = new Map<string, number>();
const COOLDOWN_DURATION_MS = 2 * 60 * 60 * 1000; // 2小时

/**
 * 标记某币种进入冷却期（亏损后调用）
 */
export function markCooldown(symbol: string): void {
  const expireAt = Date.now() + COOLDOWN_DURATION_MS;
  cooldownMap.set(symbol.toUpperCase(), expireAt);
}

/**
 * 检查某币种是否在冷却期内
 */
export function isInCooldown(symbol: string): boolean {
  const expireAt = cooldownMap.get(symbol.toUpperCase());
  if (!expireAt) return false;
  if (Date.now() > expireAt) {
    cooldownMap.delete(symbol.toUpperCase()); // 自动清理过期
    return false;
  }
  return true;
}

/**
 * 获取所有冷却期状态（用于前端展示）
 */
export function getCooldownStatus(): Array<{ symbol: string; expiresAt: number; remainingMs: number }> {
  const now = Date.now();
  const result: Array<{ symbol: string; expiresAt: number; remainingMs: number }> = [];
  for (const [symbol, expireAt] of Array.from(cooldownMap.entries())) {
    if (expireAt > now) {
      result.push({ symbol, expiresAt: expireAt, remainingMs: expireAt - now });
    } else {
      cooldownMap.delete(symbol);
    }
  }
  return result;
}

// ─── ATR 动态止损 ─────────────────────────────────────────────────────────────
// 简化版 ATR：使用近期价格波动率估算
// 真实 ATR 需要 K 线数据，这里用「评分 + 市场波动」近似
/**
 * 根据信号评分和市场状态计算动态止损百分比
 * - 高评分（≥80）：收紧止损（-1.5%），因为信号质量高
 * - 中评分（60-80）：标准止损（-2.5%）
 * - 低评分（<60）：宽松止损（-3.5%），给更多空间
 * - 风险信号激增时：收紧止损（-1.5%）
 */
export function calcDynamicStopLoss(
  scorePercent: number,
  baseStopLossPercent: number = 3.0,
  hasRiskSignal: boolean = false
): number {
  if (hasRiskSignal) return Math.min(baseStopLossPercent, 1.5);
  if (scorePercent >= 90) return Math.max(1.0, baseStopLossPercent * 0.5);
  if (scorePercent >= 80) return Math.max(1.5, baseStopLossPercent * 0.6);
  if (scorePercent >= 70) return Math.max(2.0, baseStopLossPercent * 0.8);
  return baseStopLossPercent; // 低评分用默认止损
}

/**
 * 根据动态止损计算对应的动态止盈（保持风险收益比 ≥ 2:1）
 */
export function calcDynamicTakeProfit(
  stopLossPercent: number,
  tp1Percent: number = 5.0,
  tp2Percent: number = 10.0
): { tp1: number; tp2: number } {
  const minRR = 2.0; // 最小风险收益比
  const tp1 = Math.max(tp1Percent, stopLossPercent * minRR);
  const tp2 = Math.max(tp2Percent, stopLossPercent * 3.0);
  return { tp1, tp2 };
}

// ─── 动态仓位管理 ─────────────────────────────────────────────────────────────
/**
 * 根据信号评分动态计算仓位比例
 * 60分 → 1%（最小），80分 → 3%，90+分 → 5%（最大）
 * 线性插值：posPercent = 1 + (score - 60) / (90 - 60) * (5 - 1)
 */
export function calcDynamicPositionPercent(
  scorePercent: number,
  basePercent: number = 1,
  maxPercent: number = 5
): number {
  const minScore = 60;
  const maxScore = 90;
  if (scorePercent <= minScore) return basePercent;
  if (scorePercent >= maxScore) return maxPercent;
  const ratio = (scorePercent - minScore) / (maxScore - minScore);
  const result = basePercent + ratio * (maxPercent - basePercent);
  return parseFloat(result.toFixed(2));
}

// ─── BTC 趋势缓存 ─────────────────────────────────────────────────────────────
let btcTrendCache: { trend: 'up' | 'down' | 'sideways'; updatedAt: number } | null = null;
const BTC_TREND_TTL_MS = 5 * 60 * 1000; // 5分钟缓存

/**
 * 获取 BTC 当前趋势（通过公开 API，无需 API Key）
 * 使用 Binance 公开行情：比较当前价格与 4小时前价格
 */
export async function getBtcTrend(): Promise<'up' | 'down' | 'sideways'> {
  const now = Date.now();
  if (btcTrendCache && now - btcTrendCache.updatedAt < BTC_TREND_TTL_MS) {
    return btcTrendCache.trend;
  }
  try {
    // 获取 BTC 近 24 根 1h K线，判断短期趋势
    const res = await fetch(
      'https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1h&limit=8',
      { signal: AbortSignal.timeout(5000) }
    );
    if (!res.ok) throw new Error('fetch failed');
    const klines: any[] = await res.json();
    if (!klines || klines.length < 4) throw new Error('no data');

    // 取最近 8 根 1h K线的收盘价，计算线性回归斜率
    const closes = klines.map((k: any) => parseFloat(k[4]));
    const n = closes.length;
    const sumX = (n * (n - 1)) / 2;
    const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6;
    const sumY = closes.reduce((a, b) => a + b, 0);
    const sumXY = closes.reduce((acc, y, i) => acc + i * y, 0);
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const avgPrice = sumY / n;
    const slopePercent = (slope / avgPrice) * 100;

    let trend: 'up' | 'down' | 'sideways';
    if (slopePercent > 0.05) trend = 'up';
    else if (slopePercent < -0.05) trend = 'down';
    else trend = 'sideways';

    btcTrendCache = { trend, updatedAt: now };
    return trend;
  } catch {
    // 获取失败时返回 sideways（不阻止交易）
    return 'sideways';
  }
}

/**
 * 执行完整风控检查
 */
export async function checkRisk(
  symbol: string,
  positionValue: number,
  direction: 'long' | 'short' = 'long'
): Promise<RiskCheckResult> {
  const config = await getActiveConfig();
  if (!config) return { allowed: true };

  // 1. 紧急停止硬门禁
  if (config.emergencyStop) {
    return { allowed: false, reason: "紧急停止已激活，所有交易暂停", code: "EMERGENCY_STOP" };
  }

  // 2. 自动交易开关
  if (!config.autoTradingEnabled) {
    return { allowed: false, reason: "自动交易未启用，当前为观察模式", code: "AUTO_TRADING_DISABLED" };
  }

  // 3. 冷却期检查（亏损后同币种 2 小时禁止重入）
  if (isInCooldown(symbol)) {
    const status = getCooldownStatus().find(s => s.symbol === symbol.toUpperCase());
    const remainMin = status ? Math.ceil(status.remainingMs / 60000) : 0;
    return {
      allowed: false,
      reason: `${symbol} 处于冷却期，还需等待 ${remainMin} 分钟（上次亏损保护）`,
      code: "COOLDOWN_ACTIVE",
    };
  }

  // 4. BTC 趋势过滤（下跌趋势时禁止做多）
  if (direction === 'long') {
    const btcTrend = await getBtcTrend();
    if (btcTrend === 'down') {
      return {
        allowed: false,
        reason: "BTC 当前处于下跌趋势，禁止做多（趋势过滤保护）",
        code: "BTC_DOWNTREND",
      };
    }
  }

  const snapshot = await getLatestSnapshot();
  const positions = await getAllPositions();
  const todayStats = await getTodayStats();

  // 5. 每日最大交易次数
  const dailyTrades = todayStats?.totalTrades ?? 0;
  if (dailyTrades >= (config.maxDailyTrades ?? 20)) {
    return {
      allowed: false,
      reason: `今日交易次数已达上限 (${dailyTrades}/${config.maxDailyTrades})`,
      code: "MAX_DAILY_TRADES",
    };
  }

  // 6. 每日最大亏损
  const totalBalance = snapshot?.totalBalance ?? 0;
  const dailyPnl = snapshot?.dailyPnl ?? 0;
  if (totalBalance > 0) {
    const dailyLossPct = Math.abs(Math.min(0, dailyPnl)) / totalBalance * 100;
    if (dailyLossPct >= (config.maxDailyLossPercent ?? 5)) {
      return {
        allowed: false,
        reason: `今日亏损已达上限 (${dailyLossPct.toFixed(2)}% / ${config.maxDailyLossPercent}%)`,
        code: "MAX_DAILY_LOSS",
      };
    }
  }

  // 7. 单仓最大仓位
  if (totalBalance > 0) {
    const positionPct = (positionValue / totalBalance) * 100;
    if (positionPct > (config.maxPositionPercent ?? 10)) {
      return {
        allowed: false,
        reason: `单仓仓位超限 (${positionPct.toFixed(1)}% > ${config.maxPositionPercent}%)`,
        code: "MAX_POSITION_SIZE",
      };
    }
  }

  // 8. 总仓位上限
  if (totalBalance > 0) {
    const totalPositionValue = positions.reduce((sum, p) => {
      return sum + (p.quantity * p.currentPrice * (p.leverage ?? 1));
    }, 0);
    const totalPositionPct = ((totalPositionValue + positionValue) / totalBalance) * 100;
    if (totalPositionPct > (config.maxTotalPositionPercent ?? 50)) {
      return {
        allowed: false,
        reason: `总仓位超限 (${totalPositionPct.toFixed(1)}% > ${config.maxTotalPositionPercent}%)`,
        code: "MAX_TOTAL_POSITION",
      };
    }
  }

  // 9. 同标的重复开仓检查
  const existingPosition = positions.find(p => p.symbol === symbol.toUpperCase());
  if (existingPosition) {
    return {
      allowed: false,
      reason: `${symbol} 已有持仓，不重复开仓`,
      code: "DUPLICATE_POSITION",
    };
  }

  // 10. 6大策略门控
  const { getCacheStatus } = await import("./signalEngine");
  const cacheStatus = getCacheStatus();
  const fomoC = cacheStatus.fomoCount ?? 0;
  const alphaC = cacheStatus.alphaCount ?? 0;
  const riskC = cacheStatus.riskCount ?? 0;
  const totalC = fomoC + alphaC + riskC;
  const uniqueSymbolsCount = new Set([
    ...cacheStatus.symbols.fomo,
    ...cacheStatus.symbols.alpha,
    ...cacheStatus.symbols.risk,
  ]).size;
  const longRatio = totalC > 0 ? (fomoC + alphaC) / totalC : 0;
  const symbolUpper = symbol.toUpperCase();
  const strategyCtx = {
    symbol: symbolUpper,
    recentSignals: {
      fomoCount: fomoC,
      alphaCount: alphaC,
      riskCount: riskC,
      totalCount: totalC,
      longRatio,
      uniqueSymbols: uniqueSymbolsCount,
    },
    currentSignal: {
      hasAlpha: cacheStatus.symbols.alpha.includes(symbolUpper),
      hasFomo: cacheStatus.symbols.fomo.includes(symbolUpper),
      hasFire: false,
      hasWhaleEscape: false,
      hasRisk: cacheStatus.symbols.risk.includes(symbolUpper),
      hasExchangeInflow: false,
      aiScore: 60,
      isAtSupportZone: false,
      isBreakingResistance: false,
      isAtResistanceZone: false,
      priceChange1h: 0,
    },
    marketState: {
      isWarming: totalC >= 8 && longRatio > 0.5,
      riskSignalsBurst: riskC >= 5,
      pushTooQuiet: totalC <= 3,
      massDelistings: false,
      orangeRiskBurst: riskC >= 5,
    },
  };
  const strategyResult = evaluateStrategies(strategyCtx);
  if (!strategyResult.triggered) {
    return {
      allowed: false,
      reason: `未满足6大策略入场条件（已评估 ${strategyResult.allResults.length} 个策略）`,
      code: "NO_STRATEGY_TRIGGERED",
    };
  }

  return { allowed: true };
}

/**
 * 仅检查紧急停止（用于快速路径）
 */
export async function isEmergencyStop(): Promise<boolean> {
  const config = await getActiveConfig();
  return config?.emergencyStop ?? false;
}

/**
 * 计算开仓数量（基于账户余额和风控参数）
 */
export async function calcPositionSize(entryPrice: number): Promise<number> {
  const config = await getActiveConfig();
  const snapshot = await getLatestSnapshot();
  const balance = snapshot?.totalBalance ?? 0;
  if (balance <= 0 || entryPrice <= 0) return 0;

  const minOrderUsdt = (config as any)?.minOrderUsdt ?? 1.0;
  const maxPct = (config?.maxPositionPercent ?? 10) / 100;
  const leverage = config?.leverage ?? 5;

  const positionValue = Math.max(balance * maxPct, minOrderUsdt);
  const quantity = (positionValue * leverage) / entryPrice;

  if (entryPrice > 1000) return parseFloat(quantity.toFixed(3));
  if (entryPrice > 1) return parseFloat(quantity.toFixed(2));
  return parseFloat(quantity.toFixed(0));
}
