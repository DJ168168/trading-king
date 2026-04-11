import { getSignalInfo } from "../shared/valueScanTypes";

type SignalContext = {
  symbol: string;
  messageType: number;
  rawData: Record<string, any>;
  recentSignalStats: {
    fomoCount: number;
    alphaCount: number;
    riskCount: number;
    totalCount: number;
    uniqueSymbols: number;
  };
  signalInfo?: ReturnType<typeof getSignalInfo>;
  marketBias?: "long" | "short" | "neutral";
  marketHeat?: number;
};

type StrategyResult = {
  strategyKey: string;
  strategyName: string;
  description: string;
  triggered: boolean;
  score: number;
  winRate: number;
  direction: "long" | "short" | "neutral";
  reason: string;
};

const STRATEGIES = [
  {
    key: "fomo_alpha_resonance",
    name: "FOMO + Alpha 共振",
    description: "FOMO 与聪明钱同向出现时，顺势跟随主流资金。",
    winRate: 0.78,
  },
  {
    key: "smart_money_breakout",
    name: "聪明钱突破",
    description: "Alpha 强度较高且市场风险较低时，捕捉突破行情。",
    winRate: 0.73,
  },
  {
    key: "whale_follow",
    name: "巨鲸跟随",
    description: "检测大额资金或主力行为，跟随大资金方向。",
    winRate: 0.69,
  },
  {
    key: "trend_continuation",
    name: "趋势延续",
    description: "市场热度较高且风险信号稀少时，参与趋势延续。",
    winRate: 0.66,
  },
  {
    key: "fear_reversal",
    name: "恐慌反转",
    description: "风险或恐慌信号集中释放后，等待反转型做多机会。",
    winRate: 0.62,
  },
  {
    key: "short_protection",
    name: "风险防守做空",
    description: "当下跌风险显著升高时，以防守型策略参与做空或观望。",
    winRate: 0.71,
  },
] as const;

function clamp(num: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, num));
}

export function buildSignalContext(input: Partial<SignalContext> & Record<string, any>): SignalContext {
  const recentSignalStats = {
    fomoCount: Number(input.recentSignalStats?.fomoCount ?? 0),
    alphaCount: Number(input.recentSignalStats?.alphaCount ?? 0),
    riskCount: Number(input.recentSignalStats?.riskCount ?? 0),
    totalCount: Number(input.recentSignalStats?.totalCount ?? 0),
    uniqueSymbols: Number(input.recentSignalStats?.uniqueSymbols ?? 0),
  };
  const signalInfo = getSignalInfo(Number(input.messageType ?? 110));
  const longPressure = recentSignalStats.fomoCount + recentSignalStats.alphaCount * 1.2;
  const shortPressure = recentSignalStats.riskCount * 1.5;
  const marketBias = longPressure > shortPressure + 1 ? "long" : shortPressure > longPressure + 1 ? "short" : signalInfo.direction;
  const marketHeat = clamp(
    50 + recentSignalStats.totalCount * 5 + recentSignalStats.uniqueSymbols * 1.5 + recentSignalStats.alphaCount * 4 - recentSignalStats.riskCount * 8,
  );

  return {
    symbol: String(input.symbol ?? "BTC"),
    messageType: Number(input.messageType ?? 110),
    rawData: (input.rawData ?? {}) as Record<string, any>,
    recentSignalStats,
    signalInfo,
    marketBias,
    marketHeat,
  };
}

function createResult(ctx: SignalContext, def: typeof STRATEGIES[number]): StrategyResult {
  const stats = ctx.recentSignalStats;
  const confidence = Number(ctx.rawData?.confidence ?? ctx.rawData?.score ?? 0);
  const confidencePct = confidence > 1 ? confidence : confidence * 100;
  const hasWhale = Boolean(ctx.rawData?.isWhale || ctx.rawData?.smartMoney || ctx.rawData?.mainForce || ctx.rawData?.whaleAmount);
  const isRiskSignal = ctx.signalInfo?.category === "risk" || stats.riskCount >= Math.max(stats.alphaCount + 1, 2);
  const isAlphaSignal = ctx.signalInfo?.category === "alpha";
  const isFomoSignal = ctx.signalInfo?.category === "fomo";

  let score = 40;
  let direction: "long" | "short" | "neutral" = ctx.marketBias ?? "neutral";
  let reason = "当前信号与该策略匹配度一般。";

  switch (def.key) {
    case "fomo_alpha_resonance":
      score = 45 + stats.fomoCount * 12 + stats.alphaCount * 14 - stats.riskCount * 10 + confidencePct * 0.15;
      direction = stats.riskCount > stats.fomoCount + stats.alphaCount ? "short" : "long";
      reason = "适用于 FOMO 与 Alpha 同时增强、风险信号不高的时段。";
      break;
    case "smart_money_breakout":
      score = 42 + (isAlphaSignal ? 18 : 0) + stats.alphaCount * 16 + stats.uniqueSymbols * 1.5 - stats.riskCount * 8 + confidencePct * 0.12;
      direction = isRiskSignal ? "short" : "long";
      reason = "聪明钱活跃度越高，突破策略得分越高。";
      break;
    case "whale_follow":
      score = 40 + (hasWhale ? 24 : 0) + confidencePct * 0.18 + stats.fomoCount * 6 - stats.riskCount * 6;
      direction = isRiskSignal ? "short" : "long";
      reason = "若检测到鲸鱼或主力痕迹，优先顺势跟随。";
      break;
    case "trend_continuation":
      score = 38 + (ctx.marketHeat ?? 50) * 0.35 + stats.totalCount * 3 - stats.riskCount * 10;
      direction = ctx.marketBias ?? "neutral";
      reason = "市场热度高、风险低时，趋势延续更可靠。";
      break;
    case "fear_reversal":
      score = 35 + stats.riskCount * 12 + Math.max(0, 3 - stats.fomoCount) * 6 + confidencePct * 0.08;
      direction = stats.riskCount >= 2 ? "long" : "neutral";
      reason = "恐慌集中释放后，等待超跌反转型机会。";
      break;
    case "short_protection":
      score = 44 + stats.riskCount * 18 + (isRiskSignal ? 15 : 0) - stats.alphaCount * 6 - stats.fomoCount * 4;
      direction = "short";
      reason = "风险信号越多，防守做空策略越占优。";
      break;
  }

  if (isFomoSignal && def.key === "fomo_alpha_resonance") score += 8;
  if (isAlphaSignal && def.key === "smart_money_breakout") score += 8;
  if (ctx.signalInfo?.direction === "short") direction = def.key === "fear_reversal" ? direction : "short";

  score = clamp(score);
  const triggered = def.key === "fear_reversal" ? score >= 72 : score >= 68;

  return {
    strategyKey: def.key,
    strategyName: def.name,
    description: def.description,
    triggered,
    score,
    winRate: def.winRate,
    direction,
    reason,
  };
}

export function evaluateStrategies(input: SignalContext | Record<string, any>) {
  const ctx = "recentSignalStats" in input ? (input as SignalContext) : buildSignalContext(input);
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
    recommendation: bestStrategy
      ? {
          action: bestStrategy.direction === "neutral" ? "观望" : bestStrategy.direction === "long" ? "做多" : "做空",
          confidence: bestStrategy.score,
          reason: bestStrategy.reason,
        }
      : { action: "观望", confidence: 50, reason: "暂无足够策略共识" },
  };
}

export function getAllStrategiesInfo() {
  return STRATEGIES.map((item) => ({
    key: item.key,
    strategyName: item.name,
    description: item.description,
    historicalWinRate: item.winRate,
    tags: item.key.includes("short") ? ["防守", "做空"] : ["趋势", "高胜率"],
  }));
}
