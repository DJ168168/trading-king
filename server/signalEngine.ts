// @ts-nocheck
import { getRecentSignals, recordConfluenceSignal, recordSignal } from "./db";

type SignalType = "FOMO" | "ALPHA" | "RISK" | "FALL" | "FUND_MOVE" | "LISTING" | "FUND_ESCAPE" | "FUND_ABNORMAL";

type CachedSignal = {
  signalId: string;
  symbol: string;
  signalType: SignalType;
  messageType: number;
  score: number;
  rawData: Record<string, any>;
  processed: boolean;
  createdAt: Date;
};

const signalCache: CachedSignal[] = [];
const confluenceCache: any[] = [];

function normalizeSymbol(symbol: string) {
  const s = String(symbol || "BTC").toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (s.endsWith("USDT")) return s;
  if (s.endsWith("USD")) return `${s}T`;
  return s;
}

function inferSignalType(messageType: number, data: Record<string, any>): SignalType {
  const content = JSON.stringify(data || {}).toLowerCase();
  const map: Record<number, SignalType> = {
    100: "FOMO",
    108: "ALPHA",
    109: "RISK",
    110: "FOMO",
    111: "ALPHA",
    112: "RISK",
    113: "FUND_MOVE",
    114: "LISTING",
  };
  if (map[messageType]) return map[messageType];
  if (content.includes("risk") || content.includes("danger") || content.includes("暴跌") || content.includes("预警")) return "RISK";
  if (content.includes("listing") || content.includes("上新") || content.includes("上线")) return "LISTING";
  if (content.includes("fund") || content.includes("whale") || content.includes("资金")) return "FUND_MOVE";
  if (content.includes("alpha") || content.includes("smart") || content.includes("策略")) return "ALPHA";
  return "FOMO";
}

function clamp(num: number, min = 0, max = 1) {
  return Math.max(min, Math.min(max, num));
}

function calcSignalScore(signalType: SignalType, data: Record<string, any>) {
  let score = signalType === "RISK" ? 0.35 : signalType === "ALPHA" ? 0.72 : 0.65;
  const confidence = Number(data?.confidence ?? data?.score ?? data?.strength ?? 0);
  if (confidence > 0) {
    score += confidence > 1 ? confidence / 100 * 0.2 : confidence * 0.2;
  }
  const volumeRatio = Number(data?.volumeRatio ?? data?.multiple ?? data?.intensity ?? 0);
  if (volumeRatio > 0) score += Math.min(volumeRatio / 10, 0.1);
  if (data?.isWhale || data?.smartMoney || data?.isSmartMoney) score += 0.08;
  if (data?.marketCap && Number(data.marketCap) < 1_000_000_000) score += 0.03;
  if (data?.negative || data?.bearish) score -= 0.08;
  return clamp(score);
}

function cleanup(windowSeconds = 3600) {
  const expireAt = Date.now() - windowSeconds * 1000;
  while (signalCache.length && signalCache[signalCache.length - 1].createdAt.getTime() < expireAt) signalCache.pop();
  while (confluenceCache.length && new Date(confluenceCache[confluenceCache.length - 1].createdAt).getTime() < expireAt) confluenceCache.pop();
}

function getWindowSignals(symbol: string, timeWindow = 300) {
  const normalized = normalizeSymbol(symbol);
  const since = Date.now() - timeWindow * 1000;
  return signalCache.filter((s) => s.symbol === normalized && s.createdAt.getTime() >= since);
}

export function hasRiskSignal(symbol: string, timeWindow = 300) {
  const matched = getWindowSignals(symbol, timeWindow);
  return matched.some((s) => s.signalType === "RISK" || s.signalType === "FALL" || s.signalType === "FUND_ESCAPE" || s.signalType === "FUND_ABNORMAL");
}

export function getCacheStatus() {
  cleanup();
  const latest = signalCache[0];
  return {
    totalSignals: signalCache.length,
    totalConfluenceSignals: confluenceCache.length,
    symbols: Array.from(new Set(signalCache.map((s) => s.symbol))).length,
    lastSignalAt: latest?.createdAt ?? null,
    riskSignalCount: signalCache.filter((s) => s.signalType === "RISK").length,
    recentConfluence: confluenceCache.slice(0, 5),
  };
}

export function generateMockSignal(symbol = "BTC") {
  const normalized = normalizeSymbol(symbol);
  const types = [100, 108, 110, 111, 109];
  const messageType = types[Math.floor(Math.random() * types.length)]!;
  return {
    messageType,
    messageId: `mock_${normalized}_${Date.now()}`,
    symbol: normalized,
    data: {
      confidence: 0.65 + Math.random() * 0.3,
      intensity: 2 + Math.random() * 4,
      source: "mock",
      text: messageType === 109 ? `${normalized} 风险预警` : `${normalized} 资金与情绪异动`,
    },
  };
}

async function hydrateFromDbIfNeeded() {
  if (signalCache.length > 0) return;
  const latest = await getRecentSignals(50);
  for (const item of latest.reverse()) {
    signalCache.unshift({
      signalId: item.signalId,
      symbol: normalizeSymbol(item.symbol),
      signalType: item.signalType,
      messageType: Number(item.messageType),
      score: Number(item.score ?? 0),
      rawData: (item.rawData ?? {}) as Record<string, any>,
      processed: Boolean(item.processed),
      createdAt: new Date(item.createdAt ?? Date.now()),
    });
  }
}

export async function processSignal(
  messageType: number,
  messageId: string,
  symbol: string,
  data: Record<string, any> = {},
  timeWindow = 300,
  minScore = 0.6,
) {
  await hydrateFromDbIfNeeded();
  cleanup(Math.max(timeWindow * 4, 3600));

  const normalizedSymbol = normalizeSymbol(symbol);
  const signalType = inferSignalType(messageType, data);
  const score = calcSignalScore(signalType, data);
  const createdAt = new Date();

  const signal: CachedSignal = {
    signalId: messageId,
    symbol: normalizedSymbol,
    signalType,
    messageType,
    score,
    rawData: data ?? {},
    processed: true,
    createdAt,
  };

  signalCache.unshift(signal);
  await recordSignal({
    signalId: messageId,
    symbol: normalizedSymbol,
    signalType,
    messageType,
    score,
    rawData: data ?? {},
    processed: true,
  });

  const recent = getWindowSignals(normalizedSymbol, timeWindow);
  const riskExists = recent.some((s) => s.signalType === "RISK" && s.signalId !== messageId);
  if (signalType === "RISK") return null;

  const latestFomo = recent.find((s) => s.signalType === "FOMO");
  const latestAlpha = recent.find((s) => s.signalType === "ALPHA");

  if (!latestFomo || !latestAlpha || riskExists) return null;

  const timeGap = Math.abs(latestFomo.createdAt.getTime() - latestAlpha.createdAt.getTime()) / 1000;
  let confluenceScore = clamp((latestFomo.score + latestAlpha.score) / 2 + 0.08 - Math.min(timeGap / Math.max(timeWindow, 1), 1) * 0.08);
  if (data?.isWhale || data?.smartMoney) confluenceScore = clamp(confluenceScore + 0.05);
  if (confluenceScore < minScore) return null;

  const duplicate = confluenceCache.find((item) => item.symbol === normalizedSymbol && Math.abs(new Date(item.createdAt).getTime() - Date.now()) < timeWindow * 1000);
  if (duplicate) return duplicate;

  const confluence = {
    id: confluenceCache.length + 1,
    symbol: normalizedSymbol,
    fomoSignalId: latestFomo.signalId,
    alphaSignalId: latestAlpha.signalId,
    timeGap,
    score: confluenceScore,
    status: riskExists ? "skipped" : "pending",
    skipReason: riskExists ? "近期存在风险信号" : null,
    createdAt,
  };

  confluenceCache.unshift(confluence);
  await recordConfluenceSignal({
    symbol: normalizedSymbol,
    fomoSignalId: latestFomo.signalId,
    alphaSignalId: latestAlpha.signalId,
    timeGap,
    score: confluenceScore,
    status: confluence.status,
    skipReason: confluence.skipReason,
  });

  return confluence;
}
