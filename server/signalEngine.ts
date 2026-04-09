/**
 * 信号聚合引擎 - 实现 FOMO + Alpha 时间窗口匹配策略
 * 基于 ValueScan 原始策略逻辑，集成数据库持久化
 */

import { insertSignal, insertConfluenceSignal, updateConfluenceSignalStatus } from "./db";

export interface RawSignal {
  signalId: string;
  symbol: string;
  signalType: "FOMO" | "ALPHA" | "RISK";
  messageType: number;
  timestamp: Date;
  data?: any;
}

export interface ConfluenceResult {
  symbol: string;
  fomoSignalId: string;
  alphaSignalId: string;
  timeGap: number;
  score: number;
  dbId?: number;
}

// 内存中的信号缓存（按标的分组）
const fomoCache = new Map<string, RawSignal[]>();
const alphaCache = new Map<string, RawSignal[]>();
const riskCache = new Map<string, RawSignal[]>();
const processedIds = new Set<string>();

// 信号类型常量
const FOMO_TYPE = 113;
const FOMO_INTENSIFY_TYPE = 112;
const ALPHA_TYPE = 110;

/**
 * 计算信号聚合评分（0-1）
 * - 时间接近度 40%
 * - FOMO 强度 30%
 * - 信号新鲜度 30%
 */
function calculateScore(fomo: RawSignal, alpha: RawSignal, timeGap: number, timeWindow: number): number {
  const timeScore = Math.max(0, Math.min(1, 1.0 - timeGap / timeWindow));
  const fomoStrength = fomo.messageType === FOMO_INTENSIFY_TYPE ? 1.0 : 0.8;
  const now = Date.now();
  const avgAge = ((now - fomo.timestamp.getTime()) + (now - alpha.timestamp.getTime())) / 2 / 1000;
  const freshnessScore = Math.max(0, 1.0 - Math.min(avgAge / 3600, 1.0));
  return timeScore * 0.4 + fomoStrength * 0.3 + freshnessScore * 0.3;
}

/**
 * 清理过期信号
 */
function cleanupExpiredSignals(timeWindow: number) {
  const cutoff = Date.now() - timeWindow * 1000;
  Array.from(fomoCache.entries()).forEach(([symbol, list]) => {
    const filtered = list.filter((s: RawSignal) => s.timestamp.getTime() > cutoff);
    if (filtered.length === 0) fomoCache.delete(symbol);
    else fomoCache.set(symbol, filtered);
  });
  Array.from(alphaCache.entries()).forEach(([symbol, list]) => {
    const filtered = list.filter((s: RawSignal) => s.timestamp.getTime() > cutoff);
    if (filtered.length === 0) alphaCache.delete(symbol);
    else alphaCache.set(symbol, filtered);
  });
  Array.from(riskCache.entries()).forEach(([symbol, list]) => {
    const filtered = list.filter((s: RawSignal) => s.timestamp.getTime() > cutoff);
    if (filtered.length === 0) riskCache.delete(symbol);
    else riskCache.set(symbol, filtered);
  });
}

/**
 * 尝试匹配聚合信号
 */
function tryMatchConfluence(symbol: string, timeWindow: number, minScore: number): { fomo: RawSignal; alpha: RawSignal; timeGap: number; score: number } | null {
  const fomoList = fomoCache.get(symbol) ?? [];
  const alphaList = alphaCache.get(symbol) ?? [];
  if (!fomoList.length || !alphaList.length) return null;

  let best: { fomo: RawSignal; alpha: RawSignal; timeGap: number; score: number } | null = null;
  let minGap = Infinity;

  for (const fomo of fomoList) {
    for (const alpha of alphaList) {
      const timeGap = Math.abs(fomo.timestamp.getTime() - alpha.timestamp.getTime()) / 1000;
      if (timeGap < timeWindow && timeGap < minGap) {
        const score = calculateScore(fomo, alpha, timeGap, timeWindow);
        if (score >= minScore) {
          minGap = timeGap;
          best = { fomo, alpha, timeGap, score };
        }
      }
    }
  }

  if (best) {
    // 移除已匹配的信号
    fomoCache.set(symbol, fomoList.filter(s => s.signalId !== best!.fomo.signalId));
    alphaCache.set(symbol, alphaList.filter(s => s.signalId !== best!.alpha.signalId));
  }

  return best;
}

/**
 * 处理新信号
 */
export async function processSignal(
  messageType: number,
  messageId: string,
  symbol: string,
  data: any,
  timeWindow: number = 300,
  minScore: number = 0.6
): Promise<ConfluenceResult | null> {
  if (processedIds.has(messageId)) return null;
  processedIds.add(messageId);
  if (processedIds.size > 5000) {
    const arr = Array.from(processedIds);
    arr.slice(0, 1000).forEach(id => processedIds.delete(id));
  }

  const symbolUpper = symbol.toUpperCase();
  const now = new Date();

  let signalType: "FOMO" | "ALPHA" | "RISK" | null = null;
  if (messageType === ALPHA_TYPE) signalType = "ALPHA";
  else if (messageType === FOMO_TYPE) signalType = "FOMO";
  else if (messageType === FOMO_INTENSIFY_TYPE) signalType = "RISK";

  if (!signalType) return null;

  const rawSignal: RawSignal = { signalId: messageId, symbol: symbolUpper, signalType, messageType, timestamp: now, data };

  // 持久化到数据库
  await insertSignal({ signalId: messageId, symbol: symbolUpper, signalType, messageType, score: 0, rawData: data, processed: false });

  // 加入缓存
  if (signalType === "FOMO") {
    const list = fomoCache.get(symbolUpper) ?? [];
    list.push(rawSignal);
    fomoCache.set(symbolUpper, list);
  } else if (signalType === "ALPHA") {
    const list = alphaCache.get(symbolUpper) ?? [];
    list.push(rawSignal);
    alphaCache.set(symbolUpper, list);
  } else if (signalType === "RISK") {
    const list = riskCache.get(symbolUpper) ?? [];
    list.push(rawSignal);
    riskCache.set(symbolUpper, list);
    return null; // 风险信号不触发聚合
  }

  // 清理过期信号
  cleanupExpiredSignals(timeWindow);

  // 尝试匹配
  const match = tryMatchConfluence(symbolUpper, timeWindow, minScore);
  if (!match) return null;

  // 持久化聚合信号
  const dbRecord = await insertConfluenceSignal({
    symbol: symbolUpper,
    fomoSignalId: match.fomo.signalId,
    alphaSignalId: match.alpha.signalId,
    timeGap: match.timeGap,
    score: match.score,
    status: "pending",
  });

  return {
    symbol: symbolUpper,
    fomoSignalId: match.fomo.signalId,
    alphaSignalId: match.alpha.signalId,
    timeGap: match.timeGap,
    score: match.score,
    dbId: dbRecord?.id,
  };
}

/**
 * 检查标的是否有风险信号
 */
export function hasRiskSignal(symbol: string): boolean {
  return (riskCache.get(symbol.toUpperCase()) ?? []).length > 0;
}

/**
 * 获取当前缓存状态（用于调试）
 */
export function getCacheStatus() {
  return {
    fomoCount: Array.from(fomoCache.values()).reduce((s: number, l: RawSignal[]) => s + l.length, 0),
    alphaCount: Array.from(alphaCache.values()).reduce((s: number, l: RawSignal[]) => s + l.length, 0),
    riskCount: Array.from(riskCache.values()).reduce((s: number, l: RawSignal[]) => s + l.length, 0),
    processedIds: processedIds.size,
    symbols: {
      fomo: Array.from(fomoCache.keys()) as string[],
      alpha: Array.from(alphaCache.keys()) as string[],
      risk: Array.from(riskCache.keys()) as string[],
    }
  };
}

/**
 * 生成模拟信号（用于演示和测试）
 */
export function generateMockSignal(symbol?: string): { messageType: number; messageId: string; symbol: string; data: any } {
  const symbols = ["BTC", "ETH", "SOL", "BNB", "DOGE", "XRP", "ADA", "AVAX"];
  const s = symbol ?? symbols[Math.floor(Math.random() * symbols.length)];
  const types = [110, 113, 112, 100, 108];
  const type = types[Math.floor(Math.random() * types.length)];
  return {
    messageType: type,
    messageId: `mock_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    symbol: s,
    data: { title: `${s} Signal`, price: Math.random() * 50000 + 1000 }
  };
}
