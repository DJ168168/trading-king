import { ENV } from "./_core/env";

const COINGLASS_BASE = "https://open-api-v3.coinglass.com/api";

async function cgFetch(path: string): Promise<any> {
  const res = await fetch(`${COINGLASS_BASE}${path}`, {
    headers: { "CG-API-KEY": ENV.coinGlassApiKey },
  });
  if (!res.ok) throw new Error(`CoinGlass API error: ${res.status}`);
  const json = await res.json();
  if (json.code !== "0" && json.success !== true) {
    throw new Error(`CoinGlass error: ${json.msg || "unknown"}`);
  }
  return json.data;
}

// ─── 资金费率类型（API 返回每个币种的对象，包含各交易所列表）──────────────────
export interface FundingRateItem {
  exchange: string;
  fundingRate: number;
  nextFundingTime: number;
  fundingIntervalHours: number;
}

export interface FundingRateData {
  symbol: string;
  usdtOrUsdMarginList: FundingRateItem[];
  coinMarginList?: FundingRateItem[];
}

// ─── 获取所有币种资金费率（API 返回 FundingRateData 数组）─────────────────────
export async function getAllFundingRates(): Promise<FundingRateData[]> {
  const data = await cgFetch(`/futures/fundingRate/exchange-list?symbol=BTC`);
  if (Array.isArray(data)) return data as FundingRateData[];
  return [data as FundingRateData];
}

// ─── 获取指定币种资金费率 ──────────────────────────────────────────────────────
export async function getFundingRates(symbol: string = "BTC"): Promise<FundingRateData> {
  const all = await getAllFundingRates();
  const found = all.find(d => d.symbol === symbol.toUpperCase());
  if (found) return found;
  return { symbol: symbol.toUpperCase(), usdtOrUsdMarginList: [] };
}

// ─── 获取多个币种资金费率 ──────────────────────────────────────────────────────
export async function getMultiFundingRates(symbols: string[] = ["BTC", "ETH", "SOL", "BNB", "XRP"]): Promise<FundingRateData[]> {
  const all = await getAllFundingRates();
  const upperSymbols = symbols.map(s => s.toUpperCase());
  return all.filter(d => upperSymbols.includes(d.symbol));
}

// ─── 持仓量类型（API 返回扁平数组，每条记录是一个交易所的数据）────────────────
export interface OpenInterestRecord {
  exchange: string;
  symbol: string;
  openInterest: number;
  openInterestAmount: number;
  openInterestByCoinMargin?: number;
  openInterestByStableCoinMargin?: number;
  openInterestChangePercent5m?: number;
  openInterestChangePercent15m?: number;
  openInterestChangePercent30m?: number;
  openInterestChangePercent1h?: number;
  openInterestChangePercent4h?: number;
  openInterestChangePercent24h?: number;
}

// ─── 聚合后的持仓量数据（按币种分组）─────────────────────────────────────────
export interface OpenInterestData {
  symbol: string;
  total: number;
  totalAmount: number;
  changePercent1h: number;
  changePercent4h: number;
  changePercent24h: number;
  exchanges: OpenInterestRecord[];
}

// ─── 获取所有币种持仓量（API 返回扁平数组）────────────────────────────────────
export async function getAllOpenInterestRaw(): Promise<OpenInterestRecord[]> {
  const data = await cgFetch(`/futures/openInterest/exchange-list?symbol=BTC`);
  if (Array.isArray(data)) return data as OpenInterestRecord[];
  return [data as OpenInterestRecord];
}

// ─── 获取指定币种持仓量（聚合各交易所数据）────────────────────────────────────
export async function getOpenInterest(symbol: string = "BTC"): Promise<OpenInterestData> {
  const all = await getAllOpenInterestRaw();
  const sym = symbol.toUpperCase();
  const records = all.filter(r => r.symbol === sym);
  const allRecord = records.find(r => r.exchange === "All");
  return {
    symbol: sym,
    total: allRecord?.openInterest ?? records.reduce((s, r) => s + (r.openInterest || 0), 0),
    totalAmount: allRecord?.openInterestAmount ?? 0,
    changePercent1h: allRecord?.openInterestChangePercent1h ?? 0,
    changePercent4h: allRecord?.openInterestChangePercent4h ?? 0,
    changePercent24h: allRecord?.openInterestChangePercent24h ?? 0,
    exchanges: records.filter(r => r.exchange !== "All"),
  };
}

// ─── 获取多个币种持仓量 ────────────────────────────────────────────────────────
export async function getMultiOpenInterest(symbols: string[] = ["BTC", "ETH", "SOL", "BNB", "XRP"]): Promise<OpenInterestData[]> {
  const all = await getAllOpenInterestRaw();
  const upperSymbols = symbols.map(s => s.toUpperCase());
  const grouped = new Map<string, OpenInterestRecord[]>();
  for (const r of all) {
    if (upperSymbols.includes(r.symbol)) {
      if (!grouped.has(r.symbol)) grouped.set(r.symbol, []);
      grouped.get(r.symbol)!.push(r);
    }
  }
  return upperSymbols
    .filter(s => grouped.has(s))
    .map(s => {
      const records = grouped.get(s)!;
      const allRecord = records.find(r => r.exchange === "All");
      return {
        symbol: s,
        total: allRecord?.openInterest ?? records.reduce((sum, r) => sum + (r.openInterest || 0), 0),
        totalAmount: allRecord?.openInterestAmount ?? 0,
        changePercent1h: allRecord?.openInterestChangePercent1h ?? 0,
        changePercent4h: allRecord?.openInterestChangePercent4h ?? 0,
        changePercent24h: allRecord?.openInterestChangePercent24h ?? 0,
        exchanges: records.filter(r => r.exchange !== "All"),
      };
    });
}

// ─── 从 Binance 获取多空比例（免费，但可能受 IP 限制）────────────────────────
export interface LongShortRatio {
  symbol: string;
  longShortRatio: number;
  longAccount: number;
  shortAccount: number;
  timestamp: number;
}

export async function getLongShortRatio(symbol: string = "BTCUSDT"): Promise<LongShortRatio | null> {
  try {
    const res = await fetch(
      `https://fapi.binance.com/futures/data/globalLongShortAccountRatio?symbol=${symbol}&period=1h&limit=1`,
      { signal: AbortSignal.timeout(8000) }
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) return null;
    const latest = data[0];
    return {
      symbol,
      longShortRatio: parseFloat(latest.longShortRatio),
      longAccount: parseFloat(latest.longAccount),
      shortAccount: parseFloat(latest.shortAccount),
      timestamp: latest.timestamp,
    };
  } catch {
    return null;
  }
}

// ─── 获取多个币种的多空比例 ────────────────────────────────────────────────────
export async function getMultiLongShortRatio(
  symbols: string[] = ["BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT", "XRPUSDT"]
): Promise<LongShortRatio[]> {
  const results = await Promise.allSettled(symbols.map(s => getLongShortRatio(s)));
  return results
    .filter((r): r is PromiseFulfilledResult<LongShortRatio | null> => r.status === "fulfilled" && r.value !== null)
    .map(r => r.value as LongShortRatio);
}

// ─── 综合市场数据（用于市场全景仪表盘）──────────────────────────────────────
export interface MarketOverviewData {
  fundingRates: FundingRateData[];
  openInterests: OpenInterestData[];
  longShortRatios: LongShortRatio[];
  fetchedAt: number;
}

export async function getMarketOverview(
  symbols: string[] = ["BTC", "ETH", "SOL", "BNB", "XRP"]
): Promise<MarketOverviewData> {
  const [fundingRates, openInterests, longShortRatios] = await Promise.allSettled([
    getMultiFundingRates(symbols),
    getMultiOpenInterest(symbols),
    getMultiLongShortRatio(symbols.map(s => `${s}USDT`)),
  ]);

  return {
    fundingRates: fundingRates.status === "fulfilled" ? fundingRates.value : [],
    openInterests: openInterests.status === "fulfilled" ? openInterests.value : [],
    longShortRatios: longShortRatios.status === "fulfilled" ? longShortRatios.value : [],
    fetchedAt: Date.now(),
  };
}
