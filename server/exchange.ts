import * as ccxt from "ccxt";

export type ExchangeId = "binance" | "okx" | "bybit";

// 交易所实例缓存
const exchangeInstances: Partial<Record<ExchangeId, any>> = {};

function getExchange(id: ExchangeId): any {
  if (exchangeInstances[id]) return exchangeInstances[id]!;

  const apiKey = process.env[`${id.toUpperCase()}_API_KEY`] || "";
  const secret = process.env[`${id.toUpperCase()}_API_SECRET`] || "";

  let exchange: ccxt.Exchange;

  if (id === "binance") {
    exchange = new ccxt.binance({
      apiKey,
      secret,
      options: { defaultType: "future" },
      enableRateLimit: true,
    });
  } else if (id === "okx") {
    const passphrase = process.env.OKX_PASSPHRASE || "";
    exchange = new ccxt.okx({
      apiKey,
      secret,
      password: passphrase,
      enableRateLimit: true,
    });
  } else {
    exchange = new ccxt.bybit({
      apiKey,
      secret,
      enableRateLimit: true,
      options: {
        adjustForTimeDifference: true,
        recvWindow: 10000,
      },
    });
  }

  exchangeInstances[id] = exchange;
  return exchange;
}

// 获取账户余额
export async function fetchBalance(exchangeId: ExchangeId) {
  try {
    const ex = getExchange(exchangeId);
    const balance = await ex.fetchBalance();
    const usdt = balance.USDT || balance.usdt || {};
    return {
      total: Number(usdt.total ?? 0),
      free: Number(usdt.free ?? 0),
      used: Number(usdt.used ?? 0),
      currency: "USDT",
    };
  } catch (err: any) {
    console.error(`[Exchange] fetchBalance ${exchangeId} error:`, err.message);
    return { total: 0, free: 0, used: 0, currency: "USDT", error: err.message };
  }
}

// 获取持仓
export async function fetchPositions(exchangeId: ExchangeId) {
  try {
    const ex = getExchange(exchangeId);
    const positions = await ex.fetchPositions();
    return positions
      .filter((p: any) => Number(p.contracts ?? p.size ?? 0) !== 0)
      .map((p: any) => ({
        symbol: p.symbol,
        side: p.side,
        size: Number(p.contracts ?? p.size ?? 0),
        entryPrice: Number(p.entryPrice ?? 0),
        markPrice: Number(p.markPrice ?? p.lastPrice ?? 0),
        pnl: Number(p.unrealizedPnl ?? 0),
        pnlPct: Number(p.percentage ?? 0),
        leverage: Number(p.leverage ?? 1),
        liquidationPrice: Number(p.liquidationPrice ?? 0),
        exchange: exchangeId,
      }));
  } catch (err: any) {
    console.error(`[Exchange] fetchPositions ${exchangeId} error:`, err.message);
    return [];
  }
}

// 获取最近交易历史
export async function fetchTrades(exchangeId: ExchangeId, symbol?: string, limit = 50) {
  try {
    const ex = getExchange(exchangeId);
    let trades: any[] = [];
    if (symbol) {
      trades = await ex.fetchMyTrades(symbol, undefined, limit);
    } else {
      // 获取主要交易对的历史
      const symbols = ["BTC/USDT:USDT", "ETH/USDT:USDT", "BTC/USDT", "ETH/USDT"];
      for (const sym of symbols) {
        try {
          const t = await ex.fetchMyTrades(sym, undefined, 20);
          trades.push(...t);
        } catch {}
      }
    }
    return trades
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit)
      .map((t: any) => ({
        id: t.id,
        symbol: t.symbol,
        side: t.side,
        price: Number(t.price),
        amount: Number(t.amount),
        cost: Number(t.cost),
        fee: Number(t.fee?.cost ?? 0),
        feeCurrency: t.fee?.currency ?? "USDT",
        pnl: Number(t.info?.realizedPnl ?? t.info?.pnl ?? 0),
        timestamp: t.timestamp,
        datetime: t.datetime,
        exchange: exchangeId,
      }));
  } catch (err: any) {
    console.error(`[Exchange] fetchTrades ${exchangeId} error:`, err.message);
    return [];
  }
}

// 获取行情价格
export async function fetchTicker(exchangeId: ExchangeId, symbol: string) {
  try {
    const ex = getExchange(exchangeId);
    const ticker = await ex.fetchTicker(symbol);
    return {
      symbol,
      last: Number(ticker.last ?? 0),
      bid: Number(ticker.bid ?? 0),
      ask: Number(ticker.ask ?? 0),
      high: Number(ticker.high ?? 0),
      low: Number(ticker.low ?? 0),
      volume: Number(ticker.baseVolume ?? 0),
      change: Number(ticker.change ?? 0),
      changePercent: Number(ticker.percentage ?? 0),
      exchange: exchangeId,
    };
  } catch (err: any) {
    console.error(`[Exchange] fetchTicker ${exchangeId} ${symbol} error:`, err.message);
    return null;
  }
}

// 批量获取行情
export async function fetchTickers(exchangeId: ExchangeId, symbols: string[]) {
  try {
    const ex = getExchange(exchangeId);
    const tickers = await ex.fetchTickers(symbols);
    return Object.values(tickers).map((ticker: any) => ({
      symbol: ticker.symbol,
      last: Number(ticker.last ?? 0),
      bid: Number(ticker.bid ?? 0),
      ask: Number(ticker.ask ?? 0),
      high: Number(ticker.high ?? 0),
      low: Number(ticker.low ?? 0),
      volume: Number(ticker.baseVolume ?? 0),
      change: Number(ticker.change ?? 0),
      changePercent: Number(ticker.percentage ?? 0),
      exchange: exchangeId,
    }));
  } catch (err: any) {
    console.error(`[Exchange] fetchTickers ${exchangeId} error:`, err.message);
    return [];
  }
}

// 获取 K 线数据
export async function fetchOHLCV(
  exchangeId: ExchangeId,
  symbol: string,
  timeframe = "1h",
  limit = 100
) {
  try {
    const ex = getExchange(exchangeId);
    const ohlcv = await ex.fetchOHLCV(symbol, timeframe, undefined, limit);
    return ohlcv.map(([time, open, high, low, close, volume]: any) => ({
      time: Number(time),
      open: Number(open),
      high: Number(high),
      low: Number(low),
      close: Number(close),
      volume: Number(volume),
    }));
  } catch (err: any) {
    console.error(`[Exchange] fetchOHLCV ${exchangeId} ${symbol} error:`, err.message);
    return [];
  }
}

// 下单（实盘）
export async function createOrder(
  exchangeId: ExchangeId,
  symbol: string,
  type: "market" | "limit",
  side: "buy" | "sell",
  amount: number,
  price?: number
) {
  try {
    const ex = getExchange(exchangeId);
    const order = await ex.createOrder(symbol, type, side, amount, price);
    return {
      id: order.id,
      symbol: order.symbol,
      type: order.type,
      side: order.side,
      amount: Number(order.amount),
      price: Number(order.price ?? 0),
      status: order.status,
      timestamp: order.timestamp,
      exchange: exchangeId,
    };
  } catch (err: any) {
    console.error(`[Exchange] createOrder ${exchangeId} error:`, err.message);
    throw new Error(err.message);
  }
}

// 获取资金费率
export async function fetchFundingRate(exchangeId: ExchangeId, symbol: string) {
  try {
    const ex = getExchange(exchangeId);
    const fr = await ex.fetchFundingRate(symbol);
    return {
      symbol,
      fundingRate: Number(fr.fundingRate ?? 0),
      nextFundingTime: fr.nextFundingDatetime,
      exchange: exchangeId,
    };
  } catch (err: any) {
    return { symbol, fundingRate: 0, nextFundingTime: null, exchange: exchangeId };
  }
}

// 测试连接
export async function testConnection(exchangeId: ExchangeId) {
  try {
    const ex = getExchange(exchangeId);
    await ex.loadMarkets();
    return { success: true, exchange: exchangeId };
  } catch (err: any) {
    return { success: false, exchange: exchangeId, error: err.message };
  }
}
