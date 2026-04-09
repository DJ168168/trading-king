/**
 * 6大核心高胜率策略引擎
 * 提炼自 ValueScan 官方视频
 * 
 * 策略列表：
 * 1. 三绿线底部策略  - 做多 胜率82%
 * 2. 真空区突破策略  - 做多 胜率78%
 * 3. Alpha+火双标记策略 - 做多 胜率75%
 * 4. 主力出逃做空策略 - 做空 胜率72%
 * 5. 推送频率做多策略 - 做多 胜率70%
 * 6. 风险警报空仓策略 - 空仓 胜率95%（避损）
 */

export type StrategyId =
  | "three_green_lines"   // 三绿线底部
  | "vacuum_breakout"     // 真空区突破
  | "alpha_fire_dual"     // Alpha+火双标记
  | "whale_escape_short"  // 主力出逃做空
  | "push_freq_long"      // 推送频率做多
  | "risk_alert_flat";    // 风险警报空仓

export type StrategyDirection = "long" | "short" | "flat";

export interface StrategySignal {
  strategyId: StrategyId;
  strategyName: string;
  direction: StrategyDirection;
  winRate: number;           // 胜率 0-1
  symbol: string;
  entryPrice?: number;
  stopLossPercent: number;   // 止损百分比
  takeProfitPercent: number; // 止盈百分比
  reason: string;            // 触发原因描述
  conditions: StrategyCondition[];
  timestamp: number;
}

export interface StrategyCondition {
  name: string;
  met: boolean;
  value?: string | number;
}

export interface SignalContext {
  symbol: string;
  // 最近信号统计（1小时内）
  recentSignals: {
    fomoCount: number;       // FOMO 信号数
    alphaCount: number;      // Alpha 信号数
    riskCount: number;       // 风险信号数
    totalCount: number;      // 总信号数
    longRatio: number;       // 多头信号占比 0-1
    uniqueSymbols: number;   // 不同币种数量
  };
  // 当前信号属性
  currentSignal: {
    hasAlpha: boolean;       // 是否有 Alpha 标记
    hasFomo: boolean;        // 是否有 FOMO 标记
    hasFire: boolean;        // 是否有火🔥标记（超高流动性）
    hasWhaleEscape: boolean; // 是否有主力出逃信号
    hasRisk: boolean;        // 是否有橙色风险标记
    hasExchangeInflow: boolean; // 是否有交易所流入信号
    aiScore: number;         // AI 评分 0-100
    isAtSupportZone: boolean; // 是否在支撑密集区（三绿线区域）
    isBreakingResistance: boolean; // 是否突破压力位
    isAtResistanceZone: boolean;   // 是否在压力密集区受阻
    priceChange1h: number;   // 1小时涨跌幅 %
  };
  // 市场整体状态
  marketState: {
    isWarming: boolean;      // 市场是否回暖
    riskSignalsBurst: boolean; // 风险信号激增（≥5条）
    pushTooQuiet: boolean;   // 推送极度冷清（≤3条/小时）
    massDelistings: boolean; // 大量标的批量下榜
    orangeRiskBurst: boolean; // 橙色风险标记大量出现
  };
}

export interface StrategyEvalResult {
  triggered: boolean;
  strategy?: StrategySignal;
  allResults: Array<{
    strategyId: StrategyId;
    strategyName: string;
    triggered: boolean;
    conditions: StrategyCondition[];
    direction: StrategyDirection;
    winRate: number;
  }>;
}

/**
 * 策略1：三绿线底部策略（做多，胜率82%）
 * 入场条件：Alpha + FOMO + 巨鲸三类信号同时出现 + 支撑密集区 + 主力资金流入 + AI评分≥65
 */
function evalThreeGreenLines(ctx: SignalContext): { triggered: boolean; conditions: StrategyCondition[] } {
  const c = ctx.currentSignal;
  const conditions: StrategyCondition[] = [
    {
      name: "Alpha 信号出现",
      met: c.hasAlpha,
    },
    {
      name: "FOMO 信号出现",
      met: c.hasFomo,
    },
    {
      name: "价格处于支撑密集区（三绿线区域）",
      met: c.isAtSupportZone,
    },
    {
      name: "主力资金流入信号",
      met: !c.hasWhaleEscape && c.hasFomo,
    },
    {
      name: "AI 评分 ≥ 65",
      met: c.aiScore >= 65,
      value: c.aiScore,
    },
    {
      name: "无橙色风险标记",
      met: !c.hasRisk,
    },
  ];
  const triggered = conditions.every(c => c.met);
  return { triggered, conditions };
}

/**
 * 策略2：真空区突破策略（做多，胜率78%）
 * 入场条件：强势突破压力位 + 上方进入真空区 + FOMO频率增加 + Alpha评分≥55
 */
function evalVacuumBreakout(ctx: SignalContext): { triggered: boolean; conditions: StrategyCondition[] } {
  const c = ctx.currentSignal;
  const r = ctx.recentSignals;
  const conditions: StrategyCondition[] = [
    {
      name: "价格强势突破压力位",
      met: c.isBreakingResistance,
    },
    {
      name: "FOMO 信号频率增加（短时多条）",
      met: r.fomoCount >= 2,
      value: r.fomoCount,
    },
    {
      name: "Alpha 评分 ≥ 65",
      met: c.aiScore >= 65,
      value: c.aiScore,
    },
    {
      name: "无橙色风险标记",
      met: !c.hasRisk,
    },
  ];
  const triggered = conditions.every(c => c.met);
  return { triggered, conditions };
}

/**
 * 策略3：Alpha+火双标记策略（做多，胜率75%）
 * 入场条件：同时出现 Alpha 标记 + 火🔥标记 + AI评分≥65 + 无风险标记
 */
function evalAlphaFireDual(ctx: SignalContext): { triggered: boolean; conditions: StrategyCondition[] } {
  const c = ctx.currentSignal;
  const conditions: StrategyCondition[] = [
    {
      name: "Alpha 标记出现（潜在价值）",
      met: c.hasAlpha,
    },
    {
      name: "火🔥标记出现（超高流动性）",
      met: c.hasFire,
    },
    {
      name: "AI 评分 ≥ 65",
      met: c.aiScore >= 65,
      value: c.aiScore,
    },
    {
      name: "无橙色风险标记",
      met: !c.hasRisk,
    },
  ];
  const triggered = conditions.every(c => c.met);
  return { triggered, conditions };
}

/**
 * 策略4：主力出逃做空策略（做空，胜率72%）
 * 入场条件：价格在压力密集区受阻 + 主力出逃信号 + FOMO做空信号 + 交易所流入信号
 */
function evalWhaleEscapeShort(ctx: SignalContext): { triggered: boolean; conditions: StrategyCondition[] } {
  const c = ctx.currentSignal;
  const conditions: StrategyCondition[] = [
    {
      name: "价格在压力密集区受阻",
      met: c.isAtResistanceZone,
    },
    {
      name: "主力资金出逃信号",
      met: c.hasWhaleEscape,
    },
    {
      name: "FOMO 做空信号出现",
      met: c.hasFomo && c.hasWhaleEscape,
    },
    {
      name: "交易所流入信号（抛压增加）",
      met: c.hasExchangeInflow,
    },
  ];
  const triggered = conditions.every(c => c.met);
  return { triggered, conditions };
}

/**
 * 策略5：推送频率做多策略（做多，胜率70%）
 * 入场条件：1小时内推送10-20个不同币种 + 多头占比>70% + 无大量风险信号 + 市场回暖
 */
function evalPushFreqLong(ctx: SignalContext): { triggered: boolean; conditions: StrategyCondition[] } {
  const r = ctx.recentSignals;
  const m = ctx.marketState;
  const conditions: StrategyCondition[] = [
    {
      name: "1小时内推送 10-20 个不同币种信号",
      met: r.uniqueSymbols >= 10 && r.uniqueSymbols <= 20,
      value: r.uniqueSymbols,
    },
    {
      name: "多头信号占比 > 70%",
      met: r.longRatio > 0.7,
      value: `${(r.longRatio * 100).toFixed(0)}%`,
    },
    {
      name: "无大量风险信号",
      met: r.riskCount < 3,
      value: r.riskCount,
    },
    {
      name: "市场整体处于回暖状态",
      met: m.isWarming,
    },
  ];
  const triggered = conditions.every(c => c.met);
  return { triggered, conditions };
}

/**
 * 策略6：风险警报空仓策略（空仓，胜率95%避损）
 * 触发条件：风险信号激增≥5条 OR 推送极度冷清≤3条 OR 大量标的批量下榜 OR 橙色风险标记大量出现
 * 触发后：立即清仓观望，不操作
 */
function evalRiskAlertFlat(ctx: SignalContext): { triggered: boolean; conditions: StrategyCondition[] } {
  const r = ctx.recentSignals;
  const m = ctx.marketState;
  const conditions: StrategyCondition[] = [
    {
      name: "风险看跌推送数量激增（≥5条）",
      met: m.riskSignalsBurst || r.riskCount >= 5,
      value: r.riskCount,
    },
    {
      name: "推送极度冷清（≤3条/小时）",
      met: m.pushTooQuiet || r.totalCount <= 3,
      value: r.totalCount,
    },
    {
      name: "大量标的批量下榜",
      met: m.massDelistings,
    },
    {
      name: "橙色风险标记大量出现",
      met: m.orangeRiskBurst,
    },
  ];
  // 任意一个条件满足即触发（OR逻辑，保守策略）
  const triggered = conditions.some(c => c.met);
  return { triggered, conditions };
}

/**
 * 主评估函数：评估所有策略，返回最高优先级触发策略
 * 优先级：风险警报空仓 > 三绿线底部 > Alpha+火双标记 > 真空区突破 > 主力出逃做空 > 推送频率做多
 */
export function evaluateStrategies(ctx: SignalContext): StrategyEvalResult {
  const strategies = [
    {
      id: "risk_alert_flat" as StrategyId,
      name: "风险警报空仓策略",
      direction: "flat" as StrategyDirection,
      winRate: 0.95,
      stopLossPercent: 0,
      takeProfitPercent: 0,
      eval: evalRiskAlertFlat,
      priority: 0, // 最高优先级
    },
    {
      id: "three_green_lines" as StrategyId,
      name: "三绿线底部策略",
      direction: "long" as StrategyDirection,
      winRate: 0.82,
      stopLossPercent: 2,
      takeProfitPercent: 8, // 上方下一个压力密集区，估算
      eval: evalThreeGreenLines,
      priority: 1,
    },
    {
      id: "alpha_fire_dual" as StrategyId,
      name: "Alpha+火双标记策略",
      direction: "long" as StrategyDirection,
      winRate: 0.75,
      stopLossPercent: 2,
      takeProfitPercent: 6.5, // 5%~8% 中间值
      eval: evalAlphaFireDual,
      priority: 2,
    },
    {
      id: "vacuum_breakout" as StrategyId,
      name: "真空区突破策略",
      direction: "long" as StrategyDirection,
      winRate: 0.78,
      stopLossPercent: 1.5,
      takeProfitPercent: 10, // 快速暴涨目标
      eval: evalVacuumBreakout,
      priority: 3,
    },
    {
      id: "whale_escape_short" as StrategyId,
      name: "主力出逃做空策略",
      direction: "short" as StrategyDirection,
      winRate: 0.72,
      stopLossPercent: 2,
      takeProfitPercent: 5, // 下方支撑密集区
      eval: evalWhaleEscapeShort,
      priority: 4,
    },
    {
      id: "push_freq_long" as StrategyId,
      name: "推送频率做多策略",
      direction: "long" as StrategyDirection,
      winRate: 0.70,
      stopLossPercent: 1.5,
      takeProfitPercent: 4, // 3%~5% 中间值
      eval: evalPushFreqLong,
      priority: 5,
    },
  ];

  const allResults = strategies.map(s => {
    const { triggered, conditions } = s.eval(ctx);
    return {
      strategyId: s.id,
      strategyName: s.name,
      triggered,
      conditions,
      direction: s.direction,
      winRate: s.winRate,
    };
  });

  // 按优先级找到第一个触发的策略
  const triggeredStrategies = strategies
    .filter((s, i) => allResults[i].triggered)
    .sort((a, b) => a.priority - b.priority);

  if (triggeredStrategies.length === 0) {
    return { triggered: false, allResults };
  }

  const best = triggeredStrategies[0];
  const bestResult = allResults.find(r => r.strategyId === best.id)!;

  const strategy: StrategySignal = {
    strategyId: best.id,
    strategyName: best.name,
    direction: best.direction,
    winRate: best.winRate,
    symbol: ctx.symbol,
    stopLossPercent: best.stopLossPercent,
    takeProfitPercent: best.takeProfitPercent,
    reason: bestResult.conditions.filter(c => c.met).map(c => c.name).join(" + "),
    conditions: bestResult.conditions,
    timestamp: Date.now(),
  };

  return { triggered: true, strategy, allResults };
}

/**
 * 从 ValueScan 信号数据构建 SignalContext
 */
export function buildSignalContext(params: {
  symbol: string;
  messageType: number;
  rawData: any;
  recentSignalStats: {
    fomoCount: number;
    alphaCount: number;
    riskCount: number;
    totalCount: number;
    uniqueSymbols: number;
  };
}): SignalContext {
  const { symbol, messageType, rawData, recentSignalStats } = params;
  const data = rawData ?? {};

  // 从 messageType 判断信号类型
  // 110 = Alpha, 112 = FOMO强化, 113 = FOMO, 108 = 风险/其他
  const hasAlpha = messageType === 110 || data.hasAlpha === true;
  const hasFomo = messageType === 113 || messageType === 112 || data.hasFomo === true;
  const hasRisk = messageType === 108 || data.hasRisk === true || data.isRisk === true;

  // 火🔥标记：通常在 Alpha 信号中高流动性标记
  const hasFire = data.hasFire === true || data.isHighLiquidity === true ||
    (hasAlpha && (data.liquidityScore ?? 0) > 80);

  // 主力出逃：通常是大额卖出信号
  const hasWhaleEscape = data.hasWhaleEscape === true || data.isWhaleExit === true ||
    (data.whaleAction === "sell") || (data.fundsMovementType === "OUTFLOW");

  // 交易所流入（抛压）
  const hasExchangeInflow = data.hasExchangeInflow === true ||
    (data.exchangeFlow === "inflow") || (data.fundsMovementType === "EXCHANGE_INFLOW");

  // AI 评分
  const aiScore = data.aiScore ?? data.score ?? data.vsScore ?? 60;

  // 价格位置判断（基于 rawData 中的密集区信息）
  const isAtSupportZone = data.isAtSupport === true || data.isAtSupportZone === true ||
    (data.priceZone === "support") || (data.densityZone === "bottom");
  const isBreakingResistance = data.isBreakout === true || data.isBreakingResistance === true ||
    (data.priceZone === "breakout") || ((data.priceChange1h ?? 0) > 2);
  const isAtResistanceZone = data.isAtResistance === true || data.isAtResistanceZone === true ||
    (data.priceZone === "resistance") || (data.densityZone === "top");

  // 多头信号占比
  const longCount = recentSignalStats.alphaCount + recentSignalStats.fomoCount;
  const longRatio = recentSignalStats.totalCount > 0
    ? longCount / recentSignalStats.totalCount
    : 0.5;

  // 市场状态
  const riskSignalsBurst = recentSignalStats.riskCount >= 5;
  const pushTooQuiet = recentSignalStats.totalCount <= 3;
  const isWarming = longRatio > 0.6 && !riskSignalsBurst && !pushTooQuiet;

  return {
    symbol,
    recentSignals: {
      fomoCount: recentSignalStats.fomoCount,
      alphaCount: recentSignalStats.alphaCount,
      riskCount: recentSignalStats.riskCount,
      totalCount: recentSignalStats.totalCount,
      longRatio,
      uniqueSymbols: recentSignalStats.uniqueSymbols,
    },
    currentSignal: {
      hasAlpha,
      hasFomo,
      hasFire,
      hasWhaleEscape,
      hasRisk,
      hasExchangeInflow,
      aiScore,
      isAtSupportZone,
      isBreakingResistance,
      isAtResistanceZone,
      priceChange1h: data.priceChange1h ?? 0,
    },
    marketState: {
      isWarming,
      riskSignalsBurst,
      pushTooQuiet,
      massDelistings: data.massDelistings === true,
      orangeRiskBurst: riskSignalsBurst && recentSignalStats.riskCount >= 8,
    },
  };
}

/**
 * 获取所有策略的静态描述（用于前端展示）
 */
export function getAllStrategiesInfo() {
  return [
    {
      id: "three_green_lines" as StrategyId,
      name: "三绿线底部策略",
      emoji: "🟢",
      direction: "long" as StrategyDirection,
      winRate: 0.82,
      description: "Alpha + FOMO + 巨鲸三类信号同时出现，价格处于相对低位密集区（三绿线区域），主力资金流入，AI评分≥65",
      entryConditions: [
        "Alpha + FOMO + 巨鲸 三类信号同时出现",
        "价格处于相对低位密集区（三绿线区域）",
        "主力资金流入信号出现",
        "AI 评分 ≥ 65 分",
      ],
      entry: "等待价格有效突破密集区上沿后入场",
      stopLoss: "密集区下沿 -2%",
      takeProfit: "上方下一个压力密集区",
      note: "这是视频中提到的最高胜率策略，三类信号叠加代表主力共识底部",
    },
    {
      id: "vacuum_breakout" as StrategyId,
      name: "真空区突破策略",
      emoji: "🚀",
      direction: "long" as StrategyDirection,
      winRate: 0.78,
      description: "价格强势突破当前密集区压力位，突破后上方进入无阻力真空区，FOMO信号频率增加，Alpha评分≥55",
      entryConditions: [
        "价格强势突破当前密集区压力位",
        "突破后上方进入无阻力真空区",
        "FOMO 信号频率增加（短时间多条）",
        "Alpha 评分 ≥ 65 分",
      ],
      entry: "突破确认后立即追多入场",
      stopLoss: "突破点 -1.5%",
      takeProfit: "上方下一个密集区（快速暴涨目标）",
      note: "真空区内无主力阻力，价格会快速暴涨，需快进快出",
    },
    {
      id: "alpha_fire_dual" as StrategyId,
      name: "Alpha+火双标记策略",
      emoji: "🔥",
      direction: "long" as StrategyDirection,
      winRate: 0.75,
      description: "同一币种同时出现 Alpha 标记（潜在价值）和火🔥标记（超高流动性），AI评分≥65，无橙色风险标记",
      entryConditions: [
        "同一币种同时出现 Alpha 标记（潜在价值）",
        "同时出现火🔥标记（超高流动性）",
        "AI 评分 ≥ 65 分",
        "无橙色风险标记",
      ],
      entry: "双标记出现后立即入场，优先选择",
      stopLoss: "入场价 -2%",
      takeProfit: "入场价 +5%~8%",
      note: "视频原话：Alpha+火是首选标的，高概率盈利与高流动性双重叠加",
    },
    {
      id: "whale_escape_short" as StrategyId,
      name: "主力出逃做空策略",
      emoji: "📉",
      direction: "short" as StrategyDirection,
      winRate: 0.72,
      description: "价格上涨至上方压力密集区受阻，出现主力资金出逃信号，FOMO做空信号，交易所流入信号（抛压增加）",
      entryConditions: [
        "价格上涨至上方压力密集区受阻",
        "出现主力资金出逃信号",
        "FOMO 做空信号出现",
        "交易所流入信号（抛压增加）",
      ],
      entry: "价格在压力位受阻回落时入场做空",
      stopLoss: "压力位 +2%",
      takeProfit: "下方支撑密集区",
      note: "主力出逃是最明确的做空信号，结合压力位效果最佳",
    },
    {
      id: "push_freq_long" as StrategyId,
      name: "推送频率做多策略",
      emoji: "📊",
      direction: "long" as StrategyDirection,
      winRate: 0.70,
      description: "1小时内推送10-20个不同币种信号，多头信号占比>70%，无大量风险信号，市场整体处于回暖状态",
      entryConditions: [
        "1小时内推送 10-20 个不同币种信号",
        "多头信号占比 > 70%",
        "无大量风险信号",
        "市场整体处于回暖状态",
      ],
      entry: "选择评分最高的 2-3 个标的入场",
      stopLoss: "入场价 -1.5%",
      takeProfit: "入场价 +3%~5%",
      note: "推送频率是判断市场环境的核心指标，10-20条=大行情启动",
    },
    {
      id: "risk_alert_flat" as StrategyId,
      name: "风险警报空仓策略",
      emoji: "🛡️",
      direction: "flat" as StrategyDirection,
      winRate: 0.95,
      description: "风险看跌推送数量激增（≥5条），或推送极度冷清（≤3条/小时），或大量标的批量下榜，或橙色风险标记大量出现",
      entryConditions: [
        "风险看跌推送数量激增（≥5条）",
        "推送极度冷清（≤3条/小时）",
        "大量标的批量下榜",
        "橙色风险标记大量出现",
      ],
      entry: "不操作，立即清仓观望",
      stopLoss: "N/A",
      takeProfit: "N/A",
      note: "保住本金是第一位，市场冷清时空仓是最高胜率的策略",
    },
  ];
}
