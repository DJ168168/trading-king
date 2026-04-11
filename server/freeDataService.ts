export type FearGreedPoint = {
  value: number;
  valueClass: string;
  timestamp: number;
  timeUntilUpdate?: number;
};

export type GlobalMarketData = {
  totalMarketCapUsd: number;
  totalVolumeUsd: number;
  btcDominance: number;
  ethDominance?: number;
  marketCapChange24h: number;
  activeCryptocurrencies?: number;
  totalMarketCap?: number;
  totalVolume24h?: number;
  activeCryptos?: number;
  markets?: number;
};

export type TrendingCoin = {
  symbol: string;
  name: string;
  marketCapRank?: number;
  priceBtc?: number;
  thumb?: string;
  score?: number;
  priceChange24h?: number;
};

export type FundingRateItem = {
  exchange: string;
  fundingRate: number;
  nextFundingTime?: number;
};

export type OpenInterestItem = {
  symbol: string;
  openInterest?: number;
  changePercent1h?: number;
  changePercent4h?: number;
  changePercent24h?: number;
};

export type OKXLongShortData = {
  ts: number;
  longShortRatio: number;
  longAccount?: number;
  shortAccount?: number;
  longPct?: number;
  shortPct?: number;
};

export type OKXTakerData = {
  ts: number;
  buySellRatio: number;
  buyVol?: number;
  sellVol?: number;
};

export type TechnicalScore = {
  symbol: string;
  timeframe: string;
  score: number;
  trend: "bullish" | "bearish" | "neutral";
  price: number;
  priceChange24h: number;
  rsi: number;
  maBias: number;
};

async function getJson(url: string, init?: RequestInit) {
  const res = await fetch(url, {
    ...init,
    headers: {
      accept: "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
  return res.json();
}

function classifyFearGreed(value: number) {
  if (value >= 75) return "极度贪婪";
  if (value >= 55) return "贪婪";
  if (value >= 45) return "中性";
  if (value >= 25) return "恐惧";
  return "极度恐惧";
}

export async function getFearGreedHistory(limit = 7): Promise<FearGreedPoint[]> {
  try {
    const json: any = await getJson(`https://api.alternative.me/fng/?limit=${Math.max(1, limit)}`);
    return (json?.data ?? []).map((item: any) => ({
      value: Number(item.value ?? 50),
      valueClass: item.value_classification ?? classifyFearGreed(Number(item.value ?? 50)),
      timestamp: Number(item.timestamp ?? 0),
      timeUntilUpdate: Number(item.time_until_update ?? 0),
    }));
  } catch {
    return Array.from({ length: Math.max(1, limit) }).map((_, index) => ({
      value: 50,
      valueClass: "中性",
      timestamp: Math.floor(Date.now() / 1000) - index * 86400,
      timeUntilUpdate: 0,
    }));
  }
}

export async function getGlobalMarket(): Promise<GlobalMarketData> {
  try {
    const json: any = await getJson("https://api.coingecko.com/api/v3/global");
    const data = json?.data ?? {};
    const totalMarketCapUsd = Number(data.total_market_cap?.usd ?? 0);
    const totalVolumeUsd = Number(data.total_volume?.usd ?? 0);
    const btcDominance = Number(data.market_cap_percentage?.btc ?? 0);
    const ethDominance = Number(data.market_cap_percentage?.eth ?? 0);
    const marketCapChange24h = Number(data.market_cap_change_percentage_24h_usd ?? 0);
    const activeCryptocurrencies = Number(data.active_cryptocurrencies ?? 0);
    return {
      totalMarketCapUsd,
      totalVolumeUsd,
      btcDominance,
      ethDominance,
      marketCapChange24h,
      activeCryptocurrencies,
      totalMarketCap: totalMarketCapUsd,
      totalVolume24h: totalVolumeUsd,
      activeCryptos: activeCryptocurrencies,
      markets: Number(data.markets ?? 0),
    };
  } catch {
    return {
      totalMarketCapUsd: 0,
      totalVolumeUsd: 0,
      btcDominance: 50,
      ethDominance: 18,
      marketCapChange24h: 0,
      activeCryptocurrencies: 0,
      totalMarketCap: 0,
      totalVolume24h: 0,
      activeCryptos: 0,
      markets: 0,
    };
  }
}

export async function getTrendingCoins(): Promise<TrendingCoin[]> {
  try {
    const json: any = await getJson("https://api.coingecko.com/api/v3/search/trending");
    return (json?.coins ?? []).map((item: any, idx: number) => ({
      symbol: String(item?.item?.symbol ?? "").toUpperCase(),
      name: item?.item?.name ?? "",
      marketCapRank: Number(item?.item?.market_cap_rank ?? 0),
      priceBtc: Number(item?.item?.price_btc ?? 0),
      thumb: item?.item?.thumb ?? "",
      score: idx + 1,
      priceChange24h: Number(item?.item?.data?.price_change_percentage_24h?.usd ?? 0),
    }));
  } catch {
    return [];
  }
}

async function getBinanceKlines(symbol: string, interval = "1h", limit = 100) {
  return getJson(`https://api.binance.com/api/v3/klines?symbol=${encodeURIComponent(symbol)}&interval=${interval}&limit=${limit}`) as Promise<any[]>;
}

export async function getTechnicalScore(symbol: string, timeframe = "1h"): Promise<TechnicalScore> {
  try {
    const klines = await getBinanceKlines(symbol, timeframe, 120);
    const closes = klines.map((k) => Number(k[4]));
    const price = closes.at(-1) ?? 0;
    const prev = closes.at(-25) ?? price;
    const ma20 = closes.slice(-20).reduce((a, b) => a + b, 0) / Math.max(1, closes.slice(-20).length);
    const changes = closes.slice(1).map((v, i) => v - closes[i]);
    const gains = changes.filter((v) => v > 0);
    const losses = changes.filter((v) => v < 0).map((v) => Math.abs(v));
    const avgGain = gains.reduce((a, b) => a + b, 0) / Math.max(1, gains.length);
    const avgLoss = losses.reduce((a, b) => a + b, 0) / Math.max(1, losses.length);
    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    const rsi = 100 - 100 / (1 + rs);
    const priceChange24h = prev ? ((price - prev) / prev) * 100 : 0;
    const maBias = ma20 ? ((price - ma20) / ma20) * 100 : 0;
    let score = 50;
    score += Math.max(-20, Math.min(20, priceChange24h * 2));
    score += Math.max(-15, Math.min(15, maBias * 2));
    score += rsi > 55 ? 10 : rsi < 45 ? -10 : 0;
    score = Math.max(0, Math.min(100, score));
    return {
      symbol,
      timeframe,
      score,
      trend: score >= 60 ? "bullish" : score <= 40 ? "bearish" : "neutral",
      price,
      priceChange24h,
      rsi,
      maBias,
    };
  } catch {
    return {
      symbol,
      timeframe,
      score: 50,
      trend: "neutral",
      price: 0,
      priceChange24h: 0,
      rsi: 50,
      maBias: 0,
    };
  }
}

export async function getOKXLongShortRatio(instId: string, period = "1H", limit = 20): Promise<OKXLongShortData[]> {
  try {
    const json: any = await getJson(`https://www.okx.com/api/v5/rubik/stat/contracts/long-short-account-ratio-contract?ccy=${encodeURIComponent(instId.split("-")[0])}&period=${encodeURIComponent(period)}`);
    const rows = (json?.data ?? []).slice(0, limit);
    return rows.map((row: any) => {
      const longAccount = Number(row.longAccount ?? row[2] ?? 0);
      const shortAccount = Number(row.shortAccount ?? row[3] ?? 0);
      const total = Math.max(1, longAccount + shortAccount);
      return {
        ts: Number(row.ts ?? row[0] ?? Date.now()),
        longShortRatio: Number(row.longShortRatio ?? row.ratio ?? row[1] ?? 1),
        longAccount,
        shortAccount,
        longPct: longAccount / total * 100,
        shortPct: shortAccount / total * 100,
      };
    });
  } catch {
    return [];
  }
}

export async function getOKXTakerRatio(instId: string, period = "1H", limit = 20): Promise<OKXTakerData[]> {
  try {
    const json: any = await getJson(`https://www.okx.com/api/v5/rubik/stat/taker-volume-contract?ccy=${encodeURIComponent(instId.split("-")[0])}&period=${encodeURIComponent(period)}`);
    const rows = (json?.data ?? []).slice(0, limit);
    return rows.map((row: any) => {
      const buyVol = Number(row.buyVol ?? row[2] ?? 0);
      const sellVol = Number(row.sellVol ?? row[3] ?? 0);
      return {
        ts: Number(row.ts ?? row[0] ?? Date.now()),
        buyVol,
        sellVol,
        buySellRatio: sellVol === 0 ? 1 : buyVol / sellVol,
      };
    });
  } catch {
    return [];
  }
}

export async function getMultiFundingRates(symbols: string[]): Promise<Array<{ symbol: string; usdtOrUsdMarginList: FundingRateItem[] }>> {
  return Promise.all(
    symbols.map(async (symbol) => {
      try {
        const json: any = await getJson(`https://fapi.binance.com/fapi/v1/premiumIndex?symbol=${encodeURIComponent(symbol.toUpperCase())}USDT`);
        return {
          symbol: symbol.toUpperCase(),
          usdtOrUsdMarginList: [{
            exchange: "Binance",
            fundingRate: Number(json?.lastFundingRate ?? 0),
            nextFundingTime: Number(json?.nextFundingTime ?? 0),
          }],
        };
      } catch {
        return { symbol: symbol.toUpperCase(), usdtOrUsdMarginList: [] };
      }
    }),
  );
}

export async function getMultiOpenInterest(symbols: string[]): Promise<OpenInterestItem[]> {
  return Promise.all(
    symbols.map(async (symbol) => {
      try {
        const [present, oneHour, oneDay] = await Promise.all([
          getJson(`https://fapi.binance.com/fapi/v1/openInterest?symbol=${encodeURIComponent(symbol.toUpperCase())}USDT`) as Promise<any>,
          getJson(`https://fapi.binance.com/futures/data/openInterestHist?symbol=${encodeURIComponent(symbol.toUpperCase())}USDT&period=5m&limit=12`) as Promise<any[]>,
          getJson(`https://fapi.binance.com/futures/data/openInterestHist?symbol=${encodeURIComponent(symbol.toUpperCase())}USDT&period=1h&limit=24`) as Promise<any[]>,
        ]);
        const cur = Number(present?.openInterest ?? 0);
        const prev1h = Number(oneHour?.[0]?.sumOpenInterest ?? cur);
        const prev24h = Number(oneDay?.[0]?.sumOpenInterest ?? cur);
        const change1h = prev1h ? ((cur - prev1h) / prev1h) * 100 : 0;
        const change24h = prev24h ? ((cur - prev24h) / prev24h) * 100 : 0;
        return {
          symbol: symbol.toUpperCase(),
          openInterest: cur,
          changePercent1h: change1h,
          changePercent4h: change1h,
          changePercent24h: change24h,
        };
      } catch {
        return { symbol: symbol.toUpperCase(), openInterest: 0, changePercent1h: 0, changePercent4h: 0, changePercent24h: 0 };
      }
    }),
  );
}

export function calcBullBearScore(input: {
  fng: number;
  btcDominance: number;
  btcDominanceChange?: number;
  marketCapChange24h: number;
  longShortRatio: number;
  takerBuySellRatio: number;
  fundingRate: number;
  oiChange: number;
  oiChange24h?: number;
  technicalScore: number;
  newsSentimentScore?: number;
  priceChange24h?: number;
}) {
  const bullScore = Math.max(0,
    (Number(input.fng ?? 50) - 50) * 0.35 +
    Number(input.marketCapChange24h ?? 0) * 2.5 +
    (Number(input.longShortRatio ?? 1) - 1) * 18 +
    (Number(input.takerBuySellRatio ?? 1) - 1) * 22 +
    Number(input.fundingRate ?? 0) * 2500 +
    Number(input.oiChange ?? 0) * 0.6 +
    (Number(input.technicalScore ?? 50) - 50) * 0.7 +
    Number(input.newsSentimentScore ?? 0) * 0.08 +
    Number(input.priceChange24h ?? 0) * 1.2
  );
  const bearScore = Math.max(0,
    (50 - Number(input.fng ?? 50)) * 0.35 +
    Math.max(0, -Number(input.marketCapChange24h ?? 0)) * 2.5 +
    Math.max(0, 1 - Number(input.longShortRatio ?? 1)) * 18 +
    Math.max(0, 1 - Number(input.takerBuySellRatio ?? 1)) * 22 +
    Math.max(0, -Number(input.fundingRate ?? 0)) * 2500 +
    Math.max(0, -Number(input.oiChange ?? 0)) * 0.6 +
    (50 - Number(input.technicalScore ?? 50)) * 0.7 +
    Math.max(0, -Number(input.newsSentimentScore ?? 0)) * 0.08 +
    Math.max(0, -Number(input.priceChange24h ?? 0)) * 1.2 +
    Math.max(0, Number(input.btcDominance ?? 50) - 55) * 0.6
  );
  const totalScore = Math.max(0, Math.min(100, 50 + bullScore - bearScore));
  const signal = totalScore >= 60 ? "LONG" : totalScore <= 40 ? "SHORT" : "NEUTRAL";
  const confidence = Math.min(100, Math.round(Math.abs(totalScore - 50) * 2));
  const recommendation = signal === "LONG" ? "偏多操作，优先考虑顺势做多" : signal === "SHORT" ? "偏空操作，优先考虑高位防守或回避风险" : "震荡中性，等待更明确方向";
  const entryAdvice = signal === "LONG" ? "关注回踩支撑后的放量确认" : signal === "SHORT" ? "关注反弹受阻后的弱势确认" : "等待突破关键位后再行动";
  const factors = [
    { name: "恐惧贪婪", value: Number(input.fng ?? 50) },
    { name: "市场市值变动", value: Number(input.marketCapChange24h ?? 0) },
    { name: "多空账户比", value: Number(input.longShortRatio ?? 1) },
    { name: "主动买卖比", value: Number(input.takerBuySellRatio ?? 1) },
    { name: "资金费率", value: Number(input.fundingRate ?? 0) },
    { name: "持仓量变化", value: Number(input.oiChange ?? 0) },
    { name: "技术面评分", value: Number(input.technicalScore ?? 50) },
    { name: "新闻情绪", value: Number(input.newsSentimentScore ?? 0) },
  ];
  return {
    score: totalScore,
    totalScore,
    bullScore: Math.max(0, Math.min(100, bullScore)),
    bearScore: Math.max(0, Math.min(100, bearScore)),
    signal,
    confidence,
    recommendation,
    entryAdvice,
    factors,
    bias: totalScore >= 60 ? "bullish" : totalScore <= 40 ? "bearish" : "neutral",
    label: totalScore >= 75 ? "强多头" : totalScore >= 60 ? "偏多" : totalScore <= 25 ? "强空头" : totalScore <= 40 ? "偏空" : "震荡",
  };
}
