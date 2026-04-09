/**
 * 统一风险管理器
 * 在每次开仓前强制校验所有风控规则，任何规则未通过均拒绝交易
 */

import { getActiveConfig, getAllPositions, getTodayStats, getLatestSnapshot } from "./db";
import { evaluateStrategies } from "./strategyEngine";

export interface RiskCheckResult {
  allowed: boolean;
  reason?: string;
  code?: string;
}

/**
 * 执行完整风控检查
 * @param symbol 交易标的
 * @param positionValue 本次开仓价值（USDT）
 */
export async function checkRisk(symbol: string, positionValue: number): Promise<RiskCheckResult> {
  const config = await getActiveConfig();
  if (!config) return { allowed: true }; // 无配置时放行（初始化阶段）

  // 1. 紧急停止硬门禁
  if (config.emergencyStop) {
    return { allowed: false, reason: "紧急停止已激活，所有交易暂停", code: "EMERGENCY_STOP" };
  }

  // 2. 自动交易开关
  if (!config.autoTradingEnabled) {
    return { allowed: false, reason: "自动交易未启用，当前为观察模式", code: "AUTO_TRADING_DISABLED" };
  }

  const snapshot = await getLatestSnapshot();
  const positions = await getAllPositions();
  const todayStats = await getTodayStats();

  // 3. 每日最大交易次数
  const dailyTrades = todayStats?.totalTrades ?? 0;
  if (dailyTrades >= (config.maxDailyTrades ?? 20)) {
    return {
      allowed: false,
      reason: `今日交易次数已达上限 (${dailyTrades}/${config.maxDailyTrades})`,
      code: "MAX_DAILY_TRADES",
    };
  }

  // 4. 每日最大亏损
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

  // 5. 单仓最大仓位
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

  // 6. 总仓位上限
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

  // 7. 同标的重复开仓检查
  const existingPosition = positions.find(p => p.symbol === symbol.toUpperCase());
  if (existingPosition) {
    return {
      allowed: false,
      reason: `${symbol} 已有持仓，不重复开仓`,
      code: "DUPLICATE_POSITION",
    };
  }

  // 8. 6大策略门控 - 必须满足至少一个高胜率策略才允许开仓
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
      reason: `未满足6大策略入场条件，当前无高胜率策略触发（已评估 ${strategyResult.allResults.length} 个策略）`,
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
 * 最小开仓金额由 minOrderUsdt 控制（默认 1 USDT）
 */
export async function calcPositionSize(entryPrice: number): Promise<number> {
  const config = await getActiveConfig();
  const snapshot = await getLatestSnapshot();
  const balance = snapshot?.totalBalance ?? 0;
  if (balance <= 0 || entryPrice <= 0) return 0;

  const minOrderUsdt = (config as any)?.minOrderUsdt ?? 1.0; // 最小开仓金额 USDT
  const maxPct = (config?.maxPositionPercent ?? 10) / 100;
  const leverage = config?.leverage ?? 5;

  // 按比例计算仓位金额，但不得低于 minOrderUsdt
  const positionValue = Math.max(balance * maxPct, minOrderUsdt);
  const quantity = (positionValue * leverage) / entryPrice;

  // 保留合理精度
  if (entryPrice > 1000) return parseFloat(quantity.toFixed(3));
  if (entryPrice > 1) return parseFloat(quantity.toFixed(2));
  return parseFloat(quantity.toFixed(0));
}
