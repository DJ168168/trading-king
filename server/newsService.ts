/**
 * newsService.ts
 * 免费加密货币新闻 RSS 解析 + 情绪分析引擎
 * 数据源：CoinDesk / CoinTelegraph / Decrypt / CryptoNews
 */

import axios from "axios";
import { parseStringPromise } from "xml2js";

// ─── 类型定义 ────────────────────────────────────────────────────────────────

export type NewsSentiment = "bullish" | "bearish" | "neutral";

export interface NewsItem {
  id: string;
  title: string;
  summary: string;
  url: string;
  source: string;
  publishedAt: number; // Unix ms
  sentiment: NewsSentiment;
  sentimentScore: number; // -10 ~ +10
  coins: string[]; // 相关币种
  impact: "high" | "medium" | "low"; // 影响级别
}

export interface NewsSentimentSummary {
  items: NewsItem[];
  bullishCount: number;
  bearishCount: number;
  neutralCount: number;
  overallSentiment: NewsSentiment;
  sentimentScore: number; // -100 ~ +100，纳入综合评分
  topBullish: NewsItem[];
  topBearish: NewsItem[];
  fetchedAt: number;
}

// ─── 情绪关键词库 ────────────────────────────────────────────────────────────

const BULLISH_KEYWORDS = [
  // 价格上涨
  "surge", "rally", "soar", "spike", "jump", "rise", "gain", "pump",
  "breakout", "breakthrough", "all-time high", "ath", "new high", "record",
  "bull", "bullish", "moon", "skyrocket", "explode", "parabolic",
  // 正面事件
  "adoption", "approval", "approved", "etf", "institutional", "investment",
  "partnership", "integration", "launch", "upgrade", "milestone",
  "accumulate", "buy", "long", "support", "backing", "fund",
  "halving", "scarcity", "demand", "inflow", "positive",
  "recovery", "rebound", "bounce", "reversal", "bottom",
  "regulation clarity", "legal", "legitimate", "mainstream",
];

const BEARISH_KEYWORDS = [
  // 价格下跌
  "crash", "plunge", "dump", "drop", "fall", "decline", "collapse",
  "sell-off", "selloff", "correction", "bear", "bearish", "tank",
  "tumble", "slump", "slide", "dip", "low", "bottom",
  // 负面事件
  "ban", "banned", "crackdown", "hack", "hacked", "exploit", "stolen",
  "fraud", "scam", "rug pull", "liquidation", "liquidated",
  "bankruptcy", "bankrupt", "insolvency", "insolvent",
  "regulation", "regulatory", "sec", "lawsuit", "investigation",
  "outflow", "sell", "short", "resistance", "rejection",
  "fear", "panic", "uncertainty", "risk", "warning", "concern",
  "tariff", "trade war", "inflation", "recession",
];

const HIGH_IMPACT_KEYWORDS = [
  "bitcoin", "btc", "ethereum", "eth", "federal reserve", "fed",
  "sec", "etf", "halving", "blackrock", "microstrategy", "coinbase",
  "binance", "tether", "usdt", "stablecoin", "cbdc",
  "trump", "biden", "congress", "senate", "regulation",
  "hack", "exploit", "billion", "trillion",
];

const COIN_PATTERNS: Record<string, RegExp> = {
  BTC: /\b(bitcoin|btc)\b/i,
  ETH: /\b(ethereum|eth)\b/i,
  SOL: /\b(solana|sol)\b/i,
  BNB: /\b(binance|bnb)\b/i,
  XRP: /\b(ripple|xrp)\b/i,
  ADA: /\b(cardano|ada)\b/i,
  DOGE: /\b(dogecoin|doge)\b/i,
  AVAX: /\b(avalanche|avax)\b/i,
  DOT: /\b(polkadot|dot)\b/i,
  LINK: /\b(chainlink|link)\b/i,
};

// ─── 情绪分析函数 ─────────────────────────────────────────────────────────────

function analyzeSentiment(title: string, summary: string): {
  sentiment: NewsSentiment;
  score: number;
  impact: "high" | "medium" | "low";
  coins: string[];
} {
  const text = `${title} ${summary}`.toLowerCase();

  let bullishHits = 0;
  let bearishHits = 0;

  for (const kw of BULLISH_KEYWORDS) {
    if (text.includes(kw)) bullishHits++;
  }
  for (const kw of BEARISH_KEYWORDS) {
    if (text.includes(kw)) bearishHits++;
  }

  // 计算情绪分数 -10 ~ +10
  const rawScore = bullishHits - bearishHits;
  const score = Math.max(-10, Math.min(10, rawScore * 2));

  let sentiment: NewsSentiment = "neutral";
  if (score >= 2) sentiment = "bullish";
  else if (score <= -2) sentiment = "bearish";

  // 影响级别
  const highImpactHits = HIGH_IMPACT_KEYWORDS.filter(kw => text.includes(kw)).length;
  const impact: "high" | "medium" | "low" =
    highImpactHits >= 3 ? "high" : highImpactHits >= 1 ? "medium" : "low";

  // 相关币种
  const coins: string[] = [];
  for (const [coin, pattern] of Object.entries(COIN_PATTERNS)) {
    if (pattern.test(text)) coins.push(coin);
  }
  if (coins.length === 0) coins.push("BTC"); // 默认关联 BTC

  return { sentiment, score, impact, coins };
}

// ─── RSS 解析 ─────────────────────────────────────────────────────────────────

const RSS_SOURCES = [
  {
    name: "CoinDesk",
    url: "https://www.coindesk.com/arc/outboundfeeds/rss/?outputType=xml",
    weight: 1.2, // 权威性权重
  },
  {
    name: "CoinTelegraph",
    url: "https://cointelegraph.com/rss",
    weight: 1.1,
  },
  {
    name: "Decrypt",
    url: "https://decrypt.co/feed",
    weight: 1.0,
  },
  {
    name: "CryptoNews",
    url: "https://cryptonews.com/news/feed/",
    weight: 0.9,
  },
];

const UA = "Mozilla/5.0 (compatible; TradingKing/1.0)";

async function fetchRSSFeed(source: { name: string; url: string; weight: number }): Promise<NewsItem[]> {
  try {
    const res = await axios.get(source.url, {
      headers: { "User-Agent": UA },
      timeout: 10000,
      responseType: "text",
    });

    const parsed = await parseStringPromise(res.data, { explicitArray: false });
    const channel = parsed?.rss?.channel;
    if (!channel) return [];

    const rawItems = Array.isArray(channel.item) ? channel.item : [channel.item].filter(Boolean);

    return rawItems.slice(0, 20).map((item: any, idx: number) => {
      const title = (item.title || "").replace(/<[^>]*>/g, "").trim();
      const summary = (item.description || item["content:encoded"] || "")
        .replace(/<[^>]*>/g, "")
        .trim()
        .slice(0, 300);
      const url = item.link || item.guid || "";
      const pubDate = item.pubDate || item["dc:date"] || "";
      const publishedAt = pubDate ? new Date(pubDate).getTime() : Date.now() - idx * 60000;

      const { sentiment, score, impact, coins } = analyzeSentiment(title, summary);

      return {
        id: `${source.name}-${Buffer.from(url || title).toString("base64").slice(0, 16)}`,
        title,
        summary,
        url,
        source: source.name,
        publishedAt: isNaN(publishedAt) ? Date.now() - idx * 60000 : publishedAt,
        sentiment,
        sentimentScore: Math.round(score * source.weight),
        coins,
        impact,
      } as NewsItem;
    });
  } catch (err) {
    console.warn(`[newsService] Failed to fetch ${source.name}:`, (err as Error).message);
    return [];
  }
}

// ─── 缓存 ─────────────────────────────────────────────────────────────────────

let _cache: NewsSentimentSummary | null = null;
let _cacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 分钟缓存

// ─── 主函数 ───────────────────────────────────────────────────────────────────

export async function getNewsSentiment(forceRefresh = false): Promise<NewsSentimentSummary> {
  if (!forceRefresh && _cache && Date.now() - _cacheTime < CACHE_TTL) {
    return _cache;
  }

  // 并行拉取所有 RSS 源
  const results = await Promise.allSettled(RSS_SOURCES.map(fetchRSSFeed));
  const allItems: NewsItem[] = [];

  for (const result of results) {
    if (result.status === "fulfilled") {
      allItems.push(...result.value);
    }
  }

  // 按时间排序（最新在前），去重（同 URL）
  const seen = new Set<string>();
  const deduped = allItems
    .filter(item => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    })
    .sort((a, b) => b.publishedAt - a.publishedAt)
    .slice(0, 60); // 最多保留 60 条

  const bullishCount = deduped.filter(i => i.sentiment === "bullish").length;
  const bearishCount = deduped.filter(i => i.sentiment === "bearish").length;
  const neutralCount = deduped.filter(i => i.sentiment === "neutral").length;

  // 综合情绪分数：-100 ~ +100
  // 高影响力新闻权重 x2，中等 x1.5，低 x1
  const weightedScore = deduped.reduce((sum, item) => {
    const w = item.impact === "high" ? 2 : item.impact === "medium" ? 1.5 : 1;
    return sum + item.sentimentScore * w;
  }, 0);

  const maxPossible = deduped.length * 10 * 2; // 最大可能分数
  const normalizedScore = maxPossible > 0
    ? Math.round((weightedScore / maxPossible) * 100)
    : 0;
  const sentimentScore = Math.max(-100, Math.min(100, normalizedScore));

  let overallSentiment: NewsSentiment = "neutral";
  if (sentimentScore >= 15) overallSentiment = "bullish";
  else if (sentimentScore <= -15) overallSentiment = "bearish";

  // 最重要的利多/利空新闻（高影响力优先）
  const topBullish = deduped
    .filter(i => i.sentiment === "bullish")
    .sort((a, b) => {
      const impactOrder = { high: 3, medium: 2, low: 1 };
      return impactOrder[b.impact] - impactOrder[a.impact] || b.sentimentScore - a.sentimentScore;
    })
    .slice(0, 5);

  const topBearish = deduped
    .filter(i => i.sentiment === "bearish")
    .sort((a, b) => {
      const impactOrder = { high: 3, medium: 2, low: 1 };
      return impactOrder[b.impact] - impactOrder[a.impact] || a.sentimentScore - b.sentimentScore;
    })
    .slice(0, 5);

  _cache = {
    items: deduped,
    bullishCount,
    bearishCount,
    neutralCount,
    overallSentiment,
    sentimentScore,
    topBullish,
    topBearish,
    fetchedAt: Date.now(),
  };
  _cacheTime = Date.now();

  return _cache;
}

/**
 * 获取特定币种的新闻情绪
 */
export async function getCoinNewsSentiment(symbol: string): Promise<{
  sentiment: NewsSentiment;
  score: number;
  count: number;
  items: NewsItem[];
}> {
  const summary = await getNewsSentiment();
  const coinItems = summary.items.filter(item =>
    item.coins.includes(symbol.toUpperCase())
  );

  if (coinItems.length === 0) {
    return { sentiment: "neutral", score: 0, count: 0, items: [] };
  }

  const avgScore = coinItems.reduce((s, i) => s + i.sentimentScore, 0) / coinItems.length;
  const score = Math.round(avgScore);
  const sentiment: NewsSentiment = score >= 2 ? "bullish" : score <= -2 ? "bearish" : "neutral";

  return {
    sentiment,
    score,
    count: coinItems.length,
    items: coinItems.slice(0, 10),
  };
}
