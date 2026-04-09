/**
 * 免费加密货币数据服务
 * 整合 Alternative.me / CoinGecko / Binance 现货 / OKX 公开 API
 * 无需 API Key，完全免费
 */
import axios from "axios";

const BINANCE_FAPI = "https://fapi.binance.com";
const BINANCE_SPOT = "https://api.binance.com";
const COINGECKO = "https://api.coingecko.com/api/v3";
const ALT_ME = "https://api.alternative.me";
const OKX_BASE = "https://www.okx.com";

const OKX_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  "Accept": "application/json",
};

// ─── 恐惧贪婪指数（Alternative.me）─────────────────────────────────────────

export interface FNGData {
  value: number;
  classification: string;
  timestamp: number;
}

export async function getFearGreedHistory(limit = 7): Promise<FNGData[]> {
  const r = await axios.get(`${ALT_ME}/fng/?limit=${limit}`, { timeout: 8000 });
  return (r.data.data as any[]).map((d: any) => ({
    value: parseInt(d.value),
    classification: d.value_classification,
    timestamp: parseInt(d.timestamp) * 1000,
  }));
}

// ─── CoinGecko 全球市场数据 ───────────────────────────────────────────────

export interface GlobalMarketData {
  btcDominance: number;
  ethDominance: number;
  totalMarketCap: number;
  totalVolume24h: number;
  marketCapChange24h: number;
  activeCryptos: number;
  markets: number;
}

export async function getGlobalMarket(): Promise<GlobalMarketData> {
  const r = await axios.get(`${COINGECKO}/global`, { timeout: 8000 });
  const d = r.data.data;
  return {
    btcDominance: d.market_cap_percentage.btc,
    ethDominance: d.market_cap_percentage.eth,
    totalMarketCap: d.total_market_cap.usd,
    totalVolume24h: d.total_volume.usd,
    marketCapChange24h: d.market_cap_change_percentage_24h_usd,
    activeCryptos: d.active_cryptocurrencies,
    markets: d.markets,
  };
}

// ─── CoinGecko 热门代币 ───────────────────────────────────────────────────

export interface TrendingCoin {
  id: string;
  name: string;
  symbol: string;
  rank: number;
  thumb: string;
  priceChange24h?: number;
}

export async function getTrendingCoins(): Promise<TrendingCoin[]> {
  const r = await axios.get(`${COINGECKO}/search/trending`, { timeout: 8000 });
  return (r.data.coins as any[]).slice(0, 10).map((c: any, i: number) => ({
    id: c.item.id,
    name: c.item.name,
    symbol: c.item.symbol,
    rank: c.item.market_cap_rank || i + 1,
    thumb: c.item.thumb,
    priceChange24h: c.item.data?.price_change_percentage_24h?.usd,
  }));
}

// ─── Binance 合约多空比 ───────────────────────────────────────────────────

export interface LongShortData {
  symbol: string;
  longShortRatio: number;
  longAccount: number;
  shortAccount: number;
  timestamp: number;
}

export async function getBinanceLongShortRatio(
  symbol = "BTCUSDT",
  period = "5m",
  limit = 24
): Promise<LongShortData[]> {
  const r = await axios.get(
    `${BINANCE_FAPI}/futures/data/globalLongShortAccountRatio?symbol=${symbol}&period=${period}&limit=${limit}`,
    { timeout: 8000 }
  );
  return (r.data as any[]).map((d: any) => ({
    symbol,
    longShortRatio: parseFloat(d.longShortRatio),
    longAccount: parseFloat(d.longAccount),
    shortAccount: parseFloat(d.shortAccount),
    timestamp: d.timestamp,
  }));
}

// ─── Binance Taker 主动买卖比 ─────────────────────────────────────────────

export interface TakerRatioData {
  symbol: string;
  buySellRatio: number;
  buyVol: number;
  sellVol: number;
  timestamp: number;
}

export async function getBinanceTakerRatio(
  symbol = "BTCUSDT",
  period = "5m",
  limit = 24
): Promise<TakerRatioData[]> {
  const r = await axios.get(
    `${BINANCE_FAPI}/futures/data/takerlongshortRatio?symbol=${symbol}&period=${period}&limit=${limit}`,
    { timeout: 8000 }
  );
  return (r.data as any[]).map((d: any) => ({
    symbol,
    buySellRatio: parseFloat(d.buySellRatio),
    buyVol: parseFloat(d.buyVol),
    sellVol: parseFloat(d.sellVol),
    timestamp: d.timestamp,
  }));
}

// ─── Binance 合约持仓量历史 ───────────────────────────────────────────────

export interface OpenInterestHistData {
  symbol: string;
  sumOpenInterest: number;
  sumOpenInterestValue: number;
  timestamp: number;
}

export async function getBinanceOIHistory(
  symbol = "BTCUSDT",
  period = "5m",
  limit = 24
): Promise<OpenInterestHistData[]> {
  const r = await axios.get(
    `${BINANCE_FAPI}/futures/data/openInterestHist?symbol=${symbol}&period=${period}&limit=${limit}`,
    { timeout: 8000 }
  );
  return (r.data as any[]).map((d: any) => ({
    symbol,
    sumOpenInterest: parseFloat(d.sumOpenInterest),
    sumOpenInterestValue: parseFloat(d.sumOpenInterestValue),
    timestamp: d.timestamp,
  }));
}

// ─── Binance 溢价率 & 资金费率 ────────────────────────────────────────────

export interface PremiumData {
  symbol: string;
  markPrice: number;
  indexPrice: number;
  lastFundingRate: number;
  nextFundingTime: number;
  premium: number; // (markPrice - indexPrice) / indexPrice * 100
}

export async function getBinancePremium(symbol = "BTCUSDT"): Promise<PremiumData> {
  const r = await axios.get(`${BINANCE_FAPI}/fapi/v1/premiumIndex?symbol=${symbol}`, {
    timeout: 8000,
  });
  const d = r.data;
  const mark = parseFloat(d.markPrice);
  const index = parseFloat(d.indexPrice);
  return {
    symbol,
    markPrice: mark,
    indexPrice: index,
    lastFundingRate: parseFloat(d.lastFundingRate),
    nextFundingTime: d.nextFundingTime,
    premium: index > 0 ? ((mark - index) / index) * 100 : 0,
  };
}

// ─── Binance 多币种溢价率（Top 合约）────────────────────────────────────

export async function getTopContractsPremium(
  symbols = ["BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT", "XRPUSDT"]
): Promise<PremiumData[]> {
  const results = await Promise.allSettled(symbols.map((s) => getBinancePremium(s)));
  return results
    .filter((r) => r.status === "fulfilled")
    .map((r) => (r as PromiseFulfilledResult<PremiumData>).value);
}

// ─── OKX 多空持仓比 ──────────────────────────────────────────────────────

export interface OKXLongShortData {
  timestamp: number;
  longShortRatio: number;  // 多空比（多方 / 空方）
  longPct: number;         // 多方占比 %
  shortPct: number;        // 空方占比 %
}

/**
 * OKX 合约账户多空比（公开接口，无需 API Key）
 * 端点：/api/v5/rubik/stat/contracts/long-short-account-ratio-contract
 */
export async function getOKXLongShortRatio(
  instId = "BTC-USDT-SWAP",
  period = "1H",
  limit = 24
): Promise<OKXLongShortData[]> {
  const r = await axios.get(
    `${OKX_BASE}/api/v5/rubik/stat/contracts/long-short-account-ratio-contract`,
    { params: { instId, period }, headers: OKX_HEADERS, timeout: 8000 }
  );
  const items: [string, string][] = r.data?.data ?? [];
  return items.slice(0, limit).map(([ts, ratio]) => {
    const r = parseFloat(ratio);
    const longPct = (r / (1 + r)) * 100;
    return { timestamp: parseInt(ts), longShortRatio: r, longPct, shortPct: 100 - longPct };
  });
}

// ─── OKX Taker 主动买卖比 ─────────────────────────────────────────────────

export interface OKXTakerData {
  timestamp: number;
  buyVol: number;
  sellVol: number;
  buySellRatio: number;  // 买量 / 卖量
}

/**
 * OKX 合约 Taker 主动买卖量（公开接口，无需 API Key）
 * 端点：/api/v5/rubik/stat/taker-volume-contract
 */
export async function getOKXTakerRatio(
  instId = "BTC-USDT-SWAP",
  period = "1H",
  limit = 24
): Promise<OKXTakerData[]> {
  const r = await axios.get(
    `${OKX_BASE}/api/v5/rubik/stat/taker-volume-contract`,
    { params: { instId, period }, headers: OKX_HEADERS, timeout: 8000 }
  );
  const items: [string, string, string][] = r.data?.data ?? [];
  return items.slice(0, limit).map(([ts, buyVol, sellVol]) => {
    const buy = parseFloat(buyVol);
    const sell = parseFloat(sellVol);
    return {
      timestamp: parseInt(ts),
      buyVol: buy,
      sellVol: sell,
      buySellRatio: sell > 0 ? buy / sell : 1,
    };
  });
}

// ─── 技术面评分（RSI / MACD / 布林带）────────────────────────────────────

export interface TechnicalScore {
  rsi: number;           // RSI(14)
  macdSignal: "bullish" | "bearish" | "neutral";  // MACD 金叉/死叉
  macdHist: number;      // MACD 柱状图值
  bbPosition: number;    // 布林带位置 0-100（0=下轨，50=中轨，100=上轨）
  ema20: number;         // EMA20
  ema50: number;         // EMA50
  emaTrend: "bullish" | "bearish" | "neutral";  // EMA20 > EMA50 = 多头
  price: number;         // 最新价格
  priceChange1h: number; // 1h 涨跌幅 %
  priceChange24h: number; // 24h 涨跌幅 %
  score: number;         // 技术面综合评分 -30 ~ +30
  signals: string[];     // 技术信号描述
}

/**
 * 计算 EMA
 */
function calcEMA(closes: number[], period: number): number[] {
  const k = 2 / (period + 1);
  const ema: number[] = [closes[0]];
  for (let i = 1; i < closes.length; i++) {
    ema.push(closes[i] * k + ema[i - 1] * (1 - k));
  }
  return ema;
}

/**
 * 获取技术面评分（基于 Binance 现货 K 线，OKX 作为备用）
 */
export async function getTechnicalScore(
  symbol = "BTCUSDT",
  interval = "1h",
  limit = 100
): Promise<TechnicalScore> {
  let closes: number[] = [];
  let highs: number[] = [];
  let lows: number[] = [];
  let price = 0;

  // 尝试 Binance 现货（通常不被封锁）
  try {
    const r = await axios.get(`${BINANCE_SPOT}/api/v3/klines`, {
      params: { symbol, interval, limit },
      timeout: 8000,
    });
    const klines: any[] = r.data;
    closes = klines.map((k) => parseFloat(k[4]));
    highs = klines.map((k) => parseFloat(k[2]));
    lows = klines.map((k) => parseFloat(k[3]));
    price = closes[closes.length - 1];
  } catch {
    // 备用：OKX K 线
    const instId = symbol.replace("USDT", "-USDT-SWAP");
    const r = await axios.get(`${OKX_BASE}/api/v5/market/candles`, {
      params: { instId, bar: interval === "1h" ? "1H" : interval, limit },
      headers: OKX_HEADERS,
      timeout: 8000,
    });
    const candles: any[] = r.data?.data ?? [];
    closes = candles.map((c) => parseFloat(c[4])).reverse();
    highs = candles.map((c) => parseFloat(c[2])).reverse();
    lows = candles.map((c) => parseFloat(c[3])).reverse();
    price = closes[closes.length - 1];
  }

  if (closes.length < 26) throw new Error("K 线数据不足");

  // ── RSI(14) ──────────────────────────────────────────────────────────
  const gains: number[] = [];
  const losses: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    gains.push(Math.max(diff, 0));
    losses.push(Math.max(-diff, 0));
  }
  const avgGain = gains.slice(-14).reduce((a, b) => a + b, 0) / 14;
  const avgLoss = losses.slice(-14).reduce((a, b) => a + b, 0) / 14;
  const rsi = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);

  // ── MACD(12,26,9) ────────────────────────────────────────────────────
  const ema12 = calcEMA(closes, 12);
  const ema26 = calcEMA(closes, 26);
  const macdLine = ema12.map((v, i) => v - ema26[i]);
  const signalLine = calcEMA(macdLine.slice(-20), 9);
  const macdHist = macdLine[macdLine.length - 1] - signalLine[signalLine.length - 1];
  const prevMacdHist = macdLine[macdLine.length - 2] - signalLine[signalLine.length - 2];
  const macdSignal: TechnicalScore["macdSignal"] =
    macdHist > 0 && prevMacdHist <= 0 ? "bullish" :  // 金叉
    macdHist < 0 && prevMacdHist >= 0 ? "bearish" :  // 死叉
    macdHist > 0 ? "bullish" : macdHist < 0 ? "bearish" : "neutral";

  // ── 布林带(20,2) ─────────────────────────────────────────────────────
  const bbPeriod = 20;
  const recentCloses = closes.slice(-bbPeriod);
  const bbMid = recentCloses.reduce((a, b) => a + b, 0) / bbPeriod;
  const bbStd = Math.sqrt(recentCloses.reduce((a, b) => a + Math.pow(b - bbMid, 2), 0) / bbPeriod);
  const bbUpper = bbMid + 2 * bbStd;
  const bbLower = bbMid - 2 * bbStd;
  const bbPosition = bbStd > 0 ? Math.max(0, Math.min(100, ((price - bbLower) / (bbUpper - bbLower)) * 100)) : 50;

  // ── EMA 趋势 ──────────────────────────────────────────────────────────
  const ema20Arr = calcEMA(closes, 20);
  const ema50Arr = calcEMA(closes, 50);
  const ema20 = ema20Arr[ema20Arr.length - 1];
  const ema50 = ema50Arr[ema50Arr.length - 1];
  const emaTrend: TechnicalScore["emaTrend"] = ema20 > ema50 ? "bullish" : ema20 < ema50 ? "bearish" : "neutral";

  // ── 价格变化 ──────────────────────────────────────────────────────────
  const priceChange1h = closes.length >= 2 ? ((closes[closes.length - 1] - closes[closes.length - 2]) / closes[closes.length - 2]) * 100 : 0;
  const priceChange24h = closes.length >= 25 ? ((closes[closes.length - 1] - closes[closes.length - 25]) / closes[closes.length - 25]) * 100 : 0;

  // ── 技术面综合评分 -30 ~ +30 ──────────────────────────────────────────
  let techScore = 0;
  const signals: string[] = [];

  // RSI 评分（超卖做多，超买做空）
  if (rsi < 30) { techScore += 12; signals.push(`RSI ${rsi.toFixed(0)} 超卖区间，强烈做多信号`); }
  else if (rsi < 40) { techScore += 7; signals.push(`RSI ${rsi.toFixed(0)} 偏低，做多机会`); }
  else if (rsi < 50) { techScore += 3; signals.push(`RSI ${rsi.toFixed(0)} 中性偏低`); }
  else if (rsi < 60) { techScore -= 2; }
  else if (rsi < 70) { techScore -= 6; signals.push(`RSI ${rsi.toFixed(0)} 偏高，注意回调`); }
  else { techScore -= 12; signals.push(`RSI ${rsi.toFixed(0)} 超买区间，做空风险`); }

  // MACD 评分
  if (macdSignal === "bullish") {
    techScore += macdHist > 0 && prevMacdHist <= 0 ? 10 : 5;
    if (macdHist > 0 && prevMacdHist <= 0) signals.push("MACD 金叉，趋势转多");
  } else if (macdSignal === "bearish") {
    techScore -= macdHist < 0 && prevMacdHist >= 0 ? 10 : 5;
    if (macdHist < 0 && prevMacdHist >= 0) signals.push("MACD 死叉，趋势转空");
  }

  // 布林带评分（超卖区间做多，超买区间做空）
  if (bbPosition < 15) { techScore += 8; signals.push(`价格触及布林带下轨，超卖反弹机会`); }
  else if (bbPosition < 30) { techScore += 4; }
  else if (bbPosition > 85) { techScore -= 8; signals.push(`价格触及布林带上轨，超买回调风险`); }
  else if (bbPosition > 70) { techScore -= 4; }

  // EMA 趋势评分
  if (emaTrend === "bullish") { techScore += 5; }
  else if (emaTrend === "bearish") { techScore -= 5; signals.push("EMA20 < EMA50，空头趋势"); }

  techScore = Math.max(-30, Math.min(30, techScore));

  return {
    rsi,
    macdSignal,
    macdHist,
    bbPosition,
    ema20,
    ema50,
    emaTrend,
    price,
    priceChange1h,
    priceChange24h,
    score: techScore,
    signals,
  };
}

// ─── 综合多空评分引擎 ─────────────────────────────────────────────────────

export interface BullBearScore {
  totalScore: number;       // -100 ~ +100，正数看多，负数看空
  bullScore: number;        // 做多信号强度 0~100
  bearScore: number;        // 做空信号强度 0~100
  signal: "强烈做多" | "做多" | "中性偏多" | "中性" | "中性偏空" | "做空" | "强烈做空";
  confidence: "高" | "中" | "低";
  factors: ScoreFactor[];
  recommendation: string;
  entryAdvice: string;
}

export interface ScoreFactor {
  name: string;
  value: string;
  score: number;       // -20 ~ +20
  signal: "bullish" | "bearish" | "neutral";
  weight: number;
  description: string;
}

/**
 * 综合多空评分引擎
 * 基于 7 个维度计算综合做多/做空评分
 */
export function calcBullBearScore(params: {
  fng: number;                    // 恐惧贪婪指数 0-100
  btcDominance: number;           // BTC 主导率 %
  btcDominanceChange: number;     // BTC 主导率变化（正=上升）
  marketCapChange24h: number;     // 总市值 24h 变化 %
  longShortRatio: number;         // 多空比（>1 多方占优）
  takerBuySellRatio: number;      // Taker 买卖比（>1 主动买多）
  fundingRate: number;            // 资金费率（正=多方付空方）
  oiChange: number;               // 持仓量变化 %（正=增仓）
  priceChange24h: number;         // BTC 价格 24h 变化 %
  vsSignalScore?: number;         // VS 信号综合评分（可选）
  newsSentimentScore?: number;    // 新闻情绪评分 -100 ~ +100（可选）
}): BullBearScore {
  const factors: ScoreFactor[] = [];
  let totalScore = 0;

  // ── 因子 1：恐惧贪婪指数 ─────────────────────────────────────────────
  // 极度恐惧(0-25) = 强烈买入机会；极度贪婪(75-100) = 卖出风险
  const fngScore = (() => {
    const v = params.fng;
    if (v <= 15) return 20;       // 极度恐惧 = 强烈做多
    if (v <= 25) return 15;       // 恐惧 = 做多
    if (v <= 40) return 8;        // 偏恐惧 = 轻微做多
    if (v <= 55) return 0;        // 中性
    if (v <= 70) return -8;       // 偏贪婪 = 轻微做空
    if (v <= 85) return -15;      // 贪婪 = 做空
    return -20;                   // 极度贪婪 = 强烈做空
  })();
  const fngLabel = params.fng <= 25 ? "恐惧区间（历史最佳买入区）" :
    params.fng <= 45 ? "偏恐惧（可考虑做多）" :
    params.fng <= 55 ? "中性区间" :
    params.fng <= 75 ? "偏贪婪（注意风险）" : "极度贪婪（高风险）";
  factors.push({
    name: "恐惧贪婪指数",
    value: `${params.fng} (${params.fng <= 25 ? "极度恐惧" : params.fng <= 45 ? "恐惧" : params.fng <= 55 ? "中性" : params.fng <= 75 ? "贪婪" : "极度贪婪"})`,
    score: fngScore,
    signal: fngScore > 0 ? "bullish" : fngScore < 0 ? "bearish" : "neutral",
    weight: 20,
    description: fngLabel,
  });
  totalScore += fngScore;

  // ── 因子 2：BTC 主导率 ────────────────────────────────────────────────
  // BTC 主导率上升 = 资金流入 BTC = 市场偏保守/看空山寨；下降 = 山寨季
  const btcDomScore = (() => {
    const change = params.btcDominanceChange;
    if (change > 1.5) return -10;   // BTC 主导率大幅上升 = 避险情绪
    if (change > 0.5) return -5;
    if (change > -0.5) return 0;
    if (change > -1.5) return 8;    // BTC 主导率下降 = 山寨季来临
    return 12;
  })();
  factors.push({
    name: "BTC 主导率",
    value: `${params.btcDominance.toFixed(1)}% (${params.btcDominanceChange > 0 ? "+" : ""}${params.btcDominanceChange.toFixed(2)}%)`,
    score: btcDomScore,
    signal: btcDomScore > 0 ? "bullish" : btcDomScore < 0 ? "bearish" : "neutral",
    weight: 12,
    description: params.btcDominanceChange > 0.5 ? "BTC主导率上升，资金回流BTC，山寨承压" :
      params.btcDominanceChange < -0.5 ? "BTC主导率下降，山寨季信号" : "BTC主导率稳定",
  });
  totalScore += btcDomScore;

  // ── 因子 3：总市值 24h 变化 ───────────────────────────────────────────
  const mcapScore = (() => {
    const c = params.marketCapChange24h;
    if (c > 5) return 15;
    if (c > 2) return 10;
    if (c > 0.5) return 5;
    if (c > -0.5) return 0;
    if (c > -2) return -5;
    if (c > -5) return -10;
    return -15;
  })();
  factors.push({
    name: "总市值变化",
    value: `${params.marketCapChange24h > 0 ? "+" : ""}${params.marketCapChange24h.toFixed(2)}% (24h)`,
    score: mcapScore,
    signal: mcapScore > 0 ? "bullish" : mcapScore < 0 ? "bearish" : "neutral",
    weight: 15,
    description: params.marketCapChange24h > 2 ? "市场资金大幅流入，看多信号" :
      params.marketCapChange24h < -2 ? "市场资金大幅流出，看空信号" : "市场资金流动平稳",
  });
  totalScore += mcapScore;

  // ── 因子 4：多空比 ────────────────────────────────────────────────────
  // 多空比 > 1.2 = 多方过度拥挤（反向信号，可能做空）
  // 多空比 < 0.8 = 空方过度拥挤（反向信号，可能做多）
  const lsScore = (() => {
    const r = params.longShortRatio;
    if (r < 0.7) return 15;       // 极度空方拥挤 = 反向做多
    if (r < 0.85) return 10;
    if (r < 0.95) return 5;
    if (r < 1.05) return 0;       // 平衡
    if (r < 1.15) return -5;
    if (r < 1.3) return -10;
    return -15;                   // 极度多方拥挤 = 反向做空
  })();
  factors.push({
    name: "多空持仓比",
    value: `${params.longShortRatio.toFixed(3)} (多:空 = ${(params.longShortRatio * 100 / (1 + params.longShortRatio)).toFixed(0)}%:${(100 / (1 + params.longShortRatio)).toFixed(0)}%)`,
    score: lsScore,
    signal: lsScore > 0 ? "bullish" : lsScore < 0 ? "bearish" : "neutral",
    weight: 15,
    description: params.longShortRatio < 0.85 ? "空方过度拥挤，反向做多机会" :
      params.longShortRatio > 1.15 ? "多方过度拥挤，注意多杀多风险" : "多空比均衡，方向不明",
  });
  totalScore += lsScore;

  // ── 因子 5：Taker 主动买卖比 ──────────────────────────────────────────
  // > 1 = 主动买入多于卖出 = 看多；< 1 = 主动卖出多 = 看空
  const takerScore = (() => {
    const r = params.takerBuySellRatio;
    if (r > 1.3) return 15;
    if (r > 1.15) return 10;
    if (r > 1.05) return 5;
    if (r > 0.95) return 0;
    if (r > 0.85) return -5;
    if (r > 0.7) return -10;
    return -15;
  })();
  factors.push({
    name: "Taker 买卖比",
    value: `${params.takerBuySellRatio.toFixed(3)} (${params.takerBuySellRatio > 1 ? "主动买入占优" : "主动卖出占优"})`,
    score: takerScore,
    signal: takerScore > 0 ? "bullish" : takerScore < 0 ? "bearish" : "neutral",
    weight: 15,
    description: params.takerBuySellRatio > 1.1 ? "主动买入强势，市场情绪积极" :
      params.takerBuySellRatio < 0.9 ? "主动卖出强势，市场情绪悲观" : "买卖力量均衡",
  });
  totalScore += takerScore;

  // ── 因子 6：资金费率 ──────────────────────────────────────────────────
  // 正资金费率 = 多方付费 = 多方拥挤（反向信号）
  // 负资金费率 = 空方付费 = 空方拥挤（反向信号）
  const frScore = (() => {
    const fr = params.fundingRate * 100; // 转为百分比
    if (fr < -0.05) return 15;    // 极度负资金费率 = 空方拥挤 = 做多
    if (fr < -0.01) return 8;
    if (fr < 0.01) return 3;      // 接近0 = 中性偏多
    if (fr < 0.05) return -3;
    if (fr < 0.1) return -8;
    return -15;                   // 极高正资金费率 = 多方拥挤 = 做空
  })();
  const frPct = (params.fundingRate * 100).toFixed(4);
  factors.push({
    name: "资金费率",
    value: `${parseFloat(frPct) > 0 ? "+" : ""}${frPct}%`,
    score: frScore,
    signal: frScore > 0 ? "bullish" : frScore < 0 ? "bearish" : "neutral",
    weight: 13,
    description: params.fundingRate < -0.0001 ? "负资金费率，空方付费，做多成本低" :
      params.fundingRate > 0.001 ? "高正资金费率，多方拥挤，注意回调" :
      params.fundingRate > 0.0005 ? "正常正资金费率，多方略占优" : "资金费率接近中性",
  });
  totalScore += frScore;

  // ── 因子 7：持仓量变化 ────────────────────────────────────────────────
  // OI 增加 + 价格上涨 = 真实多头；OI 增加 + 价格下跌 = 真实空头
  const oiScore = (() => {
    const oiC = params.oiChange;
    const priceC = params.priceChange24h;
    if (oiC > 3 && priceC > 1) return 10;    // 增仓 + 涨价 = 强多
    if (oiC > 1 && priceC > 0) return 5;
    if (oiC < -3 && priceC < -1) return -10; // 减仓 + 跌价 = 强空
    if (oiC < -1 && priceC < 0) return -5;
    if (oiC > 3 && priceC < -1) return -8;   // 增仓 + 跌价 = 空头建仓
    if (oiC < -3 && priceC > 1) return 8;    // 减仓 + 涨价 = 空头平仓（看多）
    return 0;
  })();
  factors.push({
    name: "持仓量变化",
    value: `${params.oiChange > 0 ? "+" : ""}${params.oiChange.toFixed(2)}% | BTC ${params.priceChange24h > 0 ? "+" : ""}${params.priceChange24h.toFixed(2)}%`,
    score: oiScore,
    signal: oiScore > 0 ? "bullish" : oiScore < 0 ? "bearish" : "neutral",
    weight: 10,
    description: params.oiChange > 2 && params.priceChange24h > 0 ? "增仓配合涨价，多头趋势确认" :
      params.oiChange > 2 && params.priceChange24h < 0 ? "增仓配合跌价，空头建仓信号" :
      params.oiChange < -2 && params.priceChange24h > 0 ? "减仓配合涨价，空头平仓，看多" : "持仓量变化平稳",
  });
  totalScore += oiScore;

  // ── 因子 8：新闻情绪 ─────────────────────────────────────────────────────────────
  // 新闻情绪 -100 ~ +100 归一化到 -10 ~ +10
  if (params.newsSentimentScore !== undefined) {
    const newsRaw = params.newsSentimentScore;
    const newsScore = (() => {
      if (newsRaw >= 40) return 10;    // 强烈利多
      if (newsRaw >= 20) return 7;
      if (newsRaw >= 8) return 4;
      if (newsRaw >= -8) return 0;     // 中性
      if (newsRaw >= -20) return -4;
      if (newsRaw >= -40) return -7;
      return -10;                      // 强烈利空
    })();
    factors.push({
      name: "新闻情绪",
      value: `评分 ${newsRaw > 0 ? "+" : ""}${newsRaw} (${newsRaw >= 15 ? "利多" : newsRaw <= -15 ? "利空" : "中性"})`,
      score: newsScore,
      signal: newsScore > 0 ? "bullish" : newsScore < 0 ? "bearish" : "neutral",
      weight: 10,
      description: newsRaw >= 20 ? "CoinDesk/CT/Decrypt新闻利多偏向，市场情绪积极" :
        newsRaw <= -20 ? "新闻利空偏向，市场情绪消极，谨慎操作" : "新闻情绪中性，对方向影响有限",
    });
    totalScore += newsScore;
  }

  // ── 最终评分计算 ─────────────────────────────────────────────────────────────
  // totalScore 范围约 -100 ~ +100
  const clampedScore = Math.max(-100, Math.min(100, totalScore));
  const bullScore = Math.max(0, Math.round((clampedScore + 100) / 2));
  const bearScore = 100 - bullScore;

  const signal: BullBearScore["signal"] =
    clampedScore >= 60 ? "强烈做多" :
    clampedScore >= 30 ? "做多" :
    clampedScore >= 10 ? "中性偏多" :
    clampedScore >= -10 ? "中性" :
    clampedScore >= -30 ? "中性偏空" :
    clampedScore >= -60 ? "做空" : "强烈做空";

  const bullFactors = factors.filter(f => f.signal === "bullish").length;
  const bearFactors = factors.filter(f => f.signal === "bearish").length;
  const confidence: BullBearScore["confidence"] =
    Math.abs(clampedScore) > 50 ? "高" :
    Math.abs(clampedScore) > 25 ? "中" : "低";

  const recommendation =
    clampedScore >= 60 ? "多个维度强烈看多，可考虑重仓做多，止损设在近期低点" :
    clampedScore >= 30 ? "多数指标看多，可轻仓做多，注意资金管理" :
    clampedScore >= 10 ? "略偏多，等待更强确认信号再入场" :
    clampedScore >= -10 ? "市场方向不明，建议观望或小仓位双向操作" :
    clampedScore >= -30 ? "略偏空，等待反弹做空机会" :
    clampedScore >= -60 ? "多数指标看空，可轻仓做空，严格止损" :
    "多个维度强烈看空，可考虑做空，但注意极度恐惧时的反弹风险";

  const entryAdvice =
    clampedScore >= 30 ? `建议做多 | ${bullFactors}/${factors.length} 个指标看多 | 置信度：${confidence}` :
    clampedScore <= -30 ? `建议做空 | ${bearFactors}/${factors.length} 个指标看空 | 置信度：${confidence}` :
    `建议观望 | 多空信号混杂 | 等待方向确认`;

  return {
    totalScore: clampedScore,
    bullScore,
    bearScore,
    signal,
    confidence,
    factors,
    recommendation,
    entryAdvice,
  };
}
