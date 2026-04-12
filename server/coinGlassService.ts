/**
 * CoinGlass API v4 Service
 * 使用 open-api-v4.coinglass.com 端点（已验证可用）
 */

const COINGLASS_BASE_V4 = "https://open-api-v4.coinglass.com";
const CG_API_KEY = process.env.COINGLASS_API_KEY ?? "9b35573cdb9d49d68c49c2b462c350e6";

async function cgFetchV4(path: string, params: Record<string, string | number> = {}): Promise<any> {
  const url = new URL(`${COINGLASS_BASE_V4}${path}`);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, String(v));
  }
  const res = await fetch(url.toString(), {
    headers: { "CG-API-KEY": CG_API_KEY, "accept": "application/json" },
    signal: AbortSignal.timeout(12000),
  });
  if (!res.ok) throw new Error(`CoinGlass API error: ${res.status} ${url.pathname}`);
  const json = await res.json();
  if (json.code !== "0") throw new Error(`CoinGlass error: ${json.msg || "unknown"} (code=${json.code})`);
  return json.data;
}

// ─── 多空比率 ──────────────────────────────────────────────────────────────────
export interface GlobalLongShortRatio {
  time: number;
  global_account_long_percent: number;
  global_account_short_percent: number;
  global_account_long_short_ratio: number;
}
export interface TopAccountRatio {
  time: number;
  top_account_long_percent: number;
  top_account_short_percent: number;
  top_account_long_short_ratio: number;
}
export interface TopPositionRatio {
  time: number;
  top_position_long_percent: number;
  top_position_short_percent: number;
  top_position_long_short_ratio: number;
}

export async function getGlobalLongShortRatio(exchange = "Binance", symbol = "BTCUSDT", interval = "4h", limit = 24): Promise<GlobalLongShortRatio[]> {
  return cgFetchV4("/api/futures/global-long-short-account-ratio/history", { exchange, symbol, interval, limit });
}
export async function getTopAccountRatio(exchange = "Binance", symbol = "BTCUSDT", interval = "4h", limit = 24): Promise<TopAccountRatio[]> {
  return cgFetchV4("/api/futures/top-long-short-account-ratio/history", { exchange, symbol, interval, limit });
}
export async function getTopPositionRatio(exchange = "Binance", symbol = "BTCUSDT", interval = "4h", limit = 24): Promise<TopPositionRatio[]> {
  return cgFetchV4("/api/futures/top-long-short-position-ratio/history", { exchange, symbol, interval, limit });
}

// ─── 清算 ──────────────────────────────────────────────────────────────────────
export interface LiquidationCoin {
  symbol: string;
  liquidation_usd_24h: number;
  long_liquidation_usd_24h: number;
  short_liquidation_usd_24h: number;
  liquidation_usd_12h: number;
  long_liquidation_usd_12h: number;
  short_liquidation_usd_12h: number;
  liquidation_usd_1h?: number;
  long_liquidation_usd_1h?: number;
  short_liquidation_usd_1h?: number;
}
export interface LiquidationHistory {
  time: number;
  long_liquidation_usd: number;
  short_liquidation_usd: number;
}

export async function getLiquidationCoinList(): Promise<LiquidationCoin[]> {
  return cgFetchV4("/api/futures/liquidation/coin-list");
}
export async function getLiquidationHistory(exchange = "Binance", symbol = "BTCUSDT", interval = "4h", limit = 24): Promise<LiquidationHistory[]> {
  return cgFetchV4("/api/futures/liquidation/history", { exchange, symbol, interval, limit });
}

// ─── CVD ───────────────────────────────────────────────────────────────────────
export interface CVDHistory {
  time: number;
  buy_volume_usd: number;
  sell_volume_usd: number;
  buy_volume: number;
  sell_volume: number;
}
export async function getCVDHistory(exchange = "Binance", symbol = "BTCUSDT", interval = "4h", limit = 24): Promise<CVDHistory[]> {
  return cgFetchV4("/api/futures/taker-buy-sell-volume/history", { exchange, symbol, interval, limit });
}

// ─── BTC ETF ───────────────────────────────────────────────────────────────────
export interface BTCETFFlow {
  timestamp: number;
  flow_usd: number;
  price_usd: number;
  etf_flows?: Array<{ etf_ticker: string; flow_usd: number }>;
}
export async function getBTCETFFlows(limit = 30): Promise<BTCETFFlow[]> {
  return cgFetchV4("/api/etf/bitcoin/flow-history", { limit });
}

// ─── 恐贪指数 ──────────────────────────────────────────────────────────────────
export interface FearGreedData { data_list: number[]; time_list: number[] }
export async function getFearGreedHistory(limit = 30): Promise<FearGreedData> {
  return cgFetchV4("/api/index/fear-greed-history", { limit });
}

// ─── 综合面板数据 ──────────────────────────────────────────────────────────────
export interface CoinGlassPanelData {
  globalLongShort: { longPercent: number; shortPercent: number; ratio: number; history: GlobalLongShortRatio[] } | null;
  topAccountRatio: { longPercent: number; shortPercent: number; ratio: number; history: TopAccountRatio[] } | null;
  topPositionRatio: { longPercent: number; shortPercent: number; ratio: number; history: TopPositionRatio[] } | null;
  liquidationCoins: LiquidationCoin[];
  liquidationHistory: LiquidationHistory[];
  cvdHistory: CVDHistory[];
  etfFlows: BTCETFFlow[];
  fearGreed: { current: number; history: number[]; timeList: number[] } | null;
  fetchedAt: number;
}

export async function getCoinGlassPanelData(): Promise<CoinGlassPanelData> {
  const [globalLS, topAccount, topPosition, liqCoins, liqHistory, cvd, etf, fg] = await Promise.allSettled([
    getGlobalLongShortRatio("Binance", "BTCUSDT", "4h", 24),
    getTopAccountRatio("Binance", "BTCUSDT", "4h", 24),
    getTopPositionRatio("Binance", "BTCUSDT", "4h", 24),
    getLiquidationCoinList(),
    getLiquidationHistory("Binance", "BTCUSDT", "4h", 24),
    getCVDHistory("Binance", "BTCUSDT", "4h", 24),
    getBTCETFFlows(30),
    getFearGreedHistory(30),
  ]);
  const latest = (arr: any[] | null) => arr && arr.length > 0 ? arr[arr.length - 1] : null;
  const globalLSData = globalLS.status === "fulfilled" ? globalLS.value : null;
  const topAccountData = topAccount.status === "fulfilled" ? topAccount.value : null;
  const topPositionData = topPosition.status === "fulfilled" ? topPosition.value : null;
  return {
    globalLongShort: globalLSData ? {
      longPercent: latest(globalLSData)?.global_account_long_percent ?? 0,
      shortPercent: latest(globalLSData)?.global_account_short_percent ?? 0,
      ratio: latest(globalLSData)?.global_account_long_short_ratio ?? 1,
      history: globalLSData,
    } : null,
    topAccountRatio: topAccountData ? {
      longPercent: latest(topAccountData)?.top_account_long_percent ?? 0,
      shortPercent: latest(topAccountData)?.top_account_short_percent ?? 0,
      ratio: latest(topAccountData)?.top_account_long_short_ratio ?? 1,
      history: topAccountData,
    } : null,
    topPositionRatio: topPositionData ? {
      longPercent: latest(topPositionData)?.top_position_long_percent ?? 0,
      shortPercent: latest(topPositionData)?.top_position_short_percent ?? 0,
      ratio: latest(topPositionData)?.top_position_long_short_ratio ?? 1,
      history: topPositionData,
    } : null,
    liquidationCoins: liqCoins.status === "fulfilled" ? liqCoins.value.slice(0, 20) : [],
    liquidationHistory: liqHistory.status === "fulfilled" ? liqHistory.value : [],
    cvdHistory: cvd.status === "fulfilled" ? cvd.value : [],
    etfFlows: etf.status === "fulfilled" ? etf.value : [],
    fearGreed: fg.status === "fulfilled" ? {
      current: fg.value.data_list[fg.value.data_list.length - 1] ?? 50,
      history: fg.value.data_list,
      timeList: fg.value.time_list,
    } : null,
    fetchedAt: Date.now(),
  };
}

// ─── 兼容旧接口（保持向后兼容）────────────────────────────────────────────────
export interface FundingRateItem { exchange: string; fundingRate: number; nextFundingTime: number; fundingIntervalHours: number }
export interface FundingRateData { symbol: string; usdtOrUsdMarginList: FundingRateItem[]; coinMarginList?: FundingRateItem[] }
export interface OpenInterestData { symbol: string; total: number; totalAmount: number; changePercent1h: number; changePercent4h: number; changePercent24h: number; exchanges: any[] }
export interface LongShortRatio { symbol: string; longShortRatio: number; longAccount: number; shortAccount: number; timestamp: number }
export interface MarketOverviewData { fundingRates: FundingRateData[]; openInterests: OpenInterestData[]; longShortRatios: LongShortRatio[]; fetchedAt: number }
export interface OpenInterestRecord { exchange: string; symbol: string; openInterest: number; openInterestAmount: number }

export async function getLongShortRatio(symbol = "BTCUSDT"): Promise<LongShortRatio | null> {
  try {
    const res = await fetch(`https://fapi.binance.com/futures/data/globalLongShortAccountRatio?symbol=${symbol}&period=1h&limit=1`, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) return null;
    const l = data[0];
    return { symbol, longShortRatio: parseFloat(l.longShortRatio), longAccount: parseFloat(l.longAccount), shortAccount: parseFloat(l.shortAccount), timestamp: l.timestamp };
  } catch { return null; }
}
export async function getMultiLongShortRatio(symbols = ["BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT", "XRPUSDT"]): Promise<LongShortRatio[]> {
  const results = await Promise.allSettled(symbols.map(s => getLongShortRatio(s)));
  return results.filter((r): r is PromiseFulfilledResult<LongShortRatio | null> => r.status === "fulfilled" && r.value !== null).map(r => r.value as LongShortRatio);
}
export async function getMultiFundingRates(symbols = ["BTC", "ETH", "SOL", "BNB", "XRP"]): Promise<FundingRateData[]> {
  try {
    const res = await fetch("https://fapi.binance.com/fapi/v1/premiumIndex", { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return [];
    const data: any[] = await res.json();
    return symbols.map(sym => {
      const item = data.find(d => d.symbol === `${sym}USDT`);
      return { symbol: sym, usdtOrUsdMarginList: item ? [{ exchange: "Binance", fundingRate: parseFloat(item.lastFundingRate) * 100, nextFundingTime: item.nextFundingTime, fundingIntervalHours: 8 }] : [] };
    });
  } catch { return []; }
}
export async function getMultiOpenInterest(symbols = ["BTC", "ETH", "SOL", "BNB", "XRP"]): Promise<OpenInterestData[]> {
  const results = await Promise.allSettled(symbols.map(async sym => {
    const res = await fetch(`https://fapi.binance.com/fapi/v1/openInterest?symbol=${sym}USDT`, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const d = await res.json();
    return { symbol: sym, total: parseFloat(d.openInterest), totalAmount: 0, changePercent1h: 0, changePercent4h: 0, changePercent24h: 0, exchanges: [] } as OpenInterestData;
  }));
  return results.filter((r): r is PromiseFulfilledResult<OpenInterestData | null> => r.status === "fulfilled" && r.value !== null).map(r => r.value as OpenInterestData);
}
export async function getMarketOverview(symbols = ["BTC", "ETH", "SOL", "BNB", "XRP"]): Promise<MarketOverviewData> {
  const [fr, oi, ls] = await Promise.allSettled([getMultiFundingRates(symbols), getMultiOpenInterest(symbols), getMultiLongShortRatio(symbols.map(s => `${s}USDT`))]);
  return { fundingRates: fr.status === "fulfilled" ? fr.value : [], openInterests: oi.status === "fulfilled" ? oi.value : [], longShortRatios: ls.status === "fulfilled" ? ls.value : [], fetchedAt: Date.now() };
}
