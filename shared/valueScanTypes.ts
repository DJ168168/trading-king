/**
 * ValueScan 信号类型完整映射
 * 来源：valuescan-master 源码 + API 数据结构分析
 */

// ─── 主信号类型（fundsMovementType / messageType）───────────────────────────
export const SIGNAL_TYPE_MAP: Record<number, { name: string; category: string; direction: "long" | "short" | "neutral"; desc: string }> = {
  // FOMO 信号（资金大量流入/流出）
  1:  { name: "FOMO 做多", category: "fomo", direction: "long",    desc: "资金大量流入，市场情绪极度看多，短期强烈上涨信号" },
  2:  { name: "FOMO 做空", category: "fomo", direction: "short",   desc: "资金大量流出，市场情绪极度看空，短期强烈下跌信号" },
  // Alpha 信号（聪明钱建仓/减仓）
  3:  { name: "Alpha 做多", category: "alpha", direction: "long",  desc: "聪明钱悄悄建仓，潜力标的看多，中长期机会" },
  4:  { name: "Alpha 做空", category: "alpha", direction: "short", desc: "聪明钱悄悄减仓，潜力标的看空，中长期风险" },
  // 风险信号
  5:  { name: "风险 做多", category: "risk", direction: "long",    desc: "风险资金流入，高风险高回报做多机会" },
  6:  { name: "风险 做空", category: "risk", direction: "short",   desc: "风险资金流出，高风险高回报做空机会" },
  // 巨鲸信号
  7:  { name: "巨鲸买入", category: "whale", direction: "long",    desc: "大额资金买入，主力进场信号，跟随主力" },
  8:  { name: "巨鲸卖出", category: "whale", direction: "short",   desc: "大额资金卖出，主力出场信号，注意风险" },
  // 交易所资金流向
  9:  { name: "交易所流入", category: "exchange", direction: "short", desc: "大量币流入交易所，抛压增加，看空信号" },
  10: { name: "交易所流出", category: "exchange", direction: "long",  desc: "大量币流出交易所，筹码锁定，看多信号" },
  11: { name: "资金异常流入", category: "exchange", direction: "long",  desc: "异常大额资金流入，可能有重大利好" },
  12: { name: "资金异常流出", category: "exchange", direction: "short", desc: "异常大额资金流出，可能有重大利空" },
  // 链上大额转账
  13: { name: "大额转账", category: "whale", direction: "neutral",  desc: "链上大额转账，关注后续动向，方向待定" },
  // 消息类型（messageType）
  100: { name: "下跌预警", category: "risk",  direction: "short",  desc: "价格下跌预警信号" },
  108: { name: "AI 追踪", category: "ai",    direction: "neutral", desc: "AI 主力追踪信号，分析主力行为" },
  109: { name: "AI 预测", category: "ai",    direction: "neutral", desc: "AI 行情预测信号" },
  110: { name: "Alpha 信号", category: "alpha", direction: "long", desc: "Alpha 聪明钱信号" },
  111: { name: "FOMO 信号", category: "fomo", direction: "long",   desc: "FOMO 资金流入信号" },
  112: { name: "风险信号", category: "risk",  direction: "short",  desc: "风险预警信号" },
  113: { name: "FOMO 信号", category: "fomo", direction: "long",   desc: "FOMO 强烈信号" },
  114: { name: "综合信号", category: "mixed", direction: "neutral", desc: "多类型综合信号" },
};

// ─── AI 追踪预测类型（31 种）──────────────────────────────────────────────────
export const AI_TRACK_TYPES: Record<number, { name: string; direction: "long" | "short" | "neutral"; score: number; desc: string }> = {
  // 主力行为类（1-10）
  1:  { name: "主力出货",   direction: "short",   score: 30, desc: "主力正在大量卖出，价格可能下跌" },
  2:  { name: "主力建仓",   direction: "long",    score: 80, desc: "主力正在悄悄买入，价格可能上涨" },
  3:  { name: "主力增持",   direction: "long",    score: 75, desc: "主力持续加仓，看多信号增强" },
  4:  { name: "主力减持",   direction: "short",   score: 35, desc: "主力开始减仓，注意风险" },
  5:  { name: "主力洗盘",   direction: "neutral", score: 50, desc: "主力震荡洗盘，等待方向确认" },
  6:  { name: "主力拉升",   direction: "long",    score: 85, desc: "主力开始拉升，跟随做多" },
  7:  { name: "主力砸盘",   direction: "short",   score: 25, desc: "主力主动砸盘，快速出场" },
  8:  { name: "主力控盘",   direction: "long",    score: 70, desc: "主力高度控盘，价格稳定上涨" },
  9:  { name: "主力吸筹",   direction: "long",    score: 78, desc: "主力低位吸筹，中长期看多" },
  10: { name: "主力派发",   direction: "short",   score: 28, desc: "主力高位派发，中长期看空" },
  // 资金流向类（11-20）
  11: { name: "大资金流入", direction: "long",    score: 82, desc: "大量资金持续流入，强烈看多" },
  12: { name: "大资金流出", direction: "short",   score: 22, desc: "大量资金持续流出，强烈看空" },
  13: { name: "聪明钱买入", direction: "long",    score: 80, desc: "聪明钱开始买入，中长期机会" },
  14: { name: "聪明钱卖出", direction: "short",   score: 25, desc: "聪明钱开始卖出，注意风险" },
  15: { name: "散户追涨",   direction: "short",   score: 35, desc: "散户大量追涨，可能是顶部信号" },
  16: { name: "散户恐慌",   direction: "long",    score: 72, desc: "散户恐慌卖出，可能是底部信号" },
  17: { name: "机构建仓",   direction: "long",    score: 85, desc: "机构资金开始建仓，强烈看多" },
  18: { name: "机构减仓",   direction: "short",   score: 30, desc: "机构资金开始减仓，注意风险" },
  19: { name: "资金异常",   direction: "neutral", score: 50, desc: "资金流向异常，方向待确认" },
  20: { name: "资金平衡",   direction: "neutral", score: 50, desc: "多空资金平衡，震荡行情" },
  // 技术形态类（21-31）
  21: { name: "三绿线底部", direction: "long",    score: 88, desc: "三绿线底部形态，强烈反转信号" },
  22: { name: "真空区突破", direction: "long",    score: 83, desc: "价格突破真空区，快速上涨通道" },
  23: { name: "做空信号",   direction: "short",   score: 20, desc: "技术形态做空信号，价格可能下跌" },
  24: { name: "支撑位反弹", direction: "long",    score: 72, desc: "价格在支撑位反弹，短期看多" },
  25: { name: "阻力位压制", direction: "short",   score: 38, desc: "价格在阻力位受阻，短期看空" },
  26: { name: "突破阻力",   direction: "long",    score: 80, desc: "价格突破阻力位，继续上涨" },
  27: { name: "跌破支撑",   direction: "short",   score: 25, desc: "价格跌破支撑位，继续下跌" },
  28: { name: "高位盘整",   direction: "short",   score: 40, desc: "高位盘整，注意回调风险" },
  29: { name: "低位盘整",   direction: "long",    score: 65, desc: "低位盘整，等待突破做多" },
  30: { name: "趋势反转",   direction: "neutral", score: 55, desc: "趋势可能反转，等待确认" },
  31: { name: "趋势延续",   direction: "neutral", score: 60, desc: "当前趋势延续，顺势操作" },
};

// ─── 行情判断指南 ─────────────────────────────────────────────────────────────
export const MARKET_JUDGE_RULES = {
  // 推送频率判断多空
  frequencyRules: [
    { condition: "同一币种 1 小时内收到 3+ 条 FOMO 做多信号", judgment: "强烈看多", score: 90, direction: "long" as const },
    { condition: "同一币种 1 小时内收到 2+ 条 Alpha 做多信号", judgment: "看多", score: 75, direction: "long" as const },
    { condition: "同一币种 1 小时内收到 3+ 条 FOMO 做空信号", judgment: "强烈看空", score: 10, direction: "short" as const },
    { condition: "同一币种 1 小时内收到 2+ 条 Alpha 做空信号", judgment: "看空", score: 25, direction: "short" as const },
    { condition: "FOMO + Alpha 同向信号在 30 分钟内同时出现", judgment: "高胜率信号", score: 85, direction: "long" as const },
    { condition: "风险信号出现后 15 分钟内无做多信号", judgment: "回避做多", score: 30, direction: "short" as const },
  ],
  // 评分阈值规则
  scoreThresholds: {
    strongLong:  { min: 80, max: 100, label: "强烈做多", action: "满仓做多，止损 2%，止盈 6%" },
    weakLong:    { min: 55, max: 79,  label: "谨慎做多", action: "半仓做多，止损 1.5%，止盈 3%" },
    neutral:     { min: 45, max: 54,  label: "观望",     action: "不操作，等待更明确信号" },
    weakShort:   { min: 21, max: 44,  label: "谨慎做空", action: "半仓做空，止损 1.5%，止盈 3%" },
    strongShort: { min: 0,  max: 20,  label: "强烈做空", action: "满仓做空，止损 2%，止盈 6%" },
  },
};

// ─── 类别颜色映射 ─────────────────────────────────────────────────────────────
export const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  fomo:     { bg: "bg-orange-500/10", text: "text-orange-400", border: "border-orange-500/30" },
  alpha:    { bg: "bg-purple-500/10", text: "text-purple-400", border: "border-purple-500/30" },
  risk:     { bg: "bg-red-500/10",    text: "text-red-400",    border: "border-red-500/30" },
  whale:    { bg: "bg-blue-500/10",   text: "text-blue-400",   border: "border-blue-500/30" },
  exchange: { bg: "bg-cyan-500/10",   text: "text-cyan-400",   border: "border-cyan-500/30" },
  ai:       { bg: "bg-violet-500/10", text: "text-violet-400", border: "border-violet-500/30" },
  mixed:    { bg: "bg-slate-500/10",  text: "text-slate-400",  border: "border-slate-500/30" },
};

export const DIRECTION_COLORS: Record<string, string> = {
  long:    "text-green-400",
  short:   "text-red-400",
  neutral: "text-yellow-400",
};

/** 根据 messageType 或 fundsMovementType 获取信号信息，未知类型返回默认值 */
export function getSignalInfo(type: number) {
  return SIGNAL_TYPE_MAP[type] ?? {
    name: `信号 #${type}`,
    category: "mixed",
    direction: "neutral" as const,
    desc: "未知信号类型",
  };
}

/** 根据 AI 追踪类型获取预测信息 */
export function getAITrackInfo(type: number) {
  return AI_TRACK_TYPES[type] ?? {
    name: `AI类型 #${type}`,
    direction: "neutral" as const,
    score: 50,
    desc: "未知 AI 预测类型",
  };
}
