/**
 * 币安合约实盘 API 服务
 * 支持 USDT 永续合约（USD-M Futures）
 * 文档：https://binance-docs.github.io/apidocs/futures/en/
 */
import crypto from "crypto";
import axios, { AxiosInstance } from "axios";

const BINANCE_FUTURES_BASE = "https://fapi.binance.com";
const BINANCE_TESTNET_BASE = "https://testnet.binancefuture.com";

export interface BinanceConfig {
  apiKey: string;
  secretKey: string;
  useTestnet?: boolean;
}

export interface PlaceOrderParams {
  symbol: string;        // e.g. "BTCUSDT"
  side: "BUY" | "SELL";
  positionSide?: "LONG" | "SHORT" | "BOTH"; // BOTH for one-way mode
  type: "MARKET" | "LIMIT" | "STOP_MARKET" | "TAKE_PROFIT_MARKET";
  quantity?: number;
  price?: number;        // for LIMIT orders
  stopPrice?: number;    // for STOP/TP orders
  reduceOnly?: boolean;
  timeInForce?: "GTC" | "IOC" | "FOK" | "GTX";
  newClientOrderId?: string;
}

export interface BinancePosition {
  symbol: string;
  positionAmt: string;
  entryPrice: string;
  markPrice: string;
  unRealizedProfit: string;
  liquidationPrice: string;
  leverage: string;
  marginType: string;
  positionSide: string;
  notional: string;
  isolatedWallet: string;
  updateTime: number;
}

export interface BinanceBalance {
  asset: string;
  balance: string;
  crossWalletBalance: string;
  crossUnPnl: string;
  availableBalance: string;
  maxWithdrawAmount: string;
  marginAvailable: boolean;
  updateTime: number;
}

export interface BinanceOrder {
  orderId: number;
  symbol: string;
  status: string;
  clientOrderId: string;
  price: string;
  avgPrice: string;
  origQty: string;
  executedQty: string;
  type: string;
  side: string;
  stopPrice: string;
  time: number;
  updateTime: number;
  reduceOnly: boolean;
  positionSide: string;
}

export class BinanceService {
  private client: AxiosInstance;
  private apiKey: string;
  private secretKey: string;

  constructor(config: BinanceConfig) {
    this.apiKey = config.apiKey;
    this.secretKey = config.secretKey;
    const baseURL = config.useTestnet ? BINANCE_TESTNET_BASE : BINANCE_FUTURES_BASE;

    this.client = axios.create({
      baseURL,
      timeout: 10000,
      headers: {
        "X-MBX-APIKEY": this.apiKey,
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });
  }

  /** HMAC-SHA256 签名 */
  private sign(queryString: string): string {
    return crypto.createHmac("sha256", this.secretKey).update(queryString).digest("hex");
  }

  /** 构建带签名的参数字符串 */
  private buildSignedParams(params: Record<string, any>): string {
    const timestamp = Date.now();
    const allParams = { ...params, timestamp };
    const queryString = Object.entries(allParams)
      .filter(([, v]) => v !== undefined && v !== null && String(v) !== "")
      .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
      .join("&");
    const signature = this.sign(queryString);
    return `${queryString}&signature=${signature}`;
  }

  /** 测试连接 */
  async ping(): Promise<boolean> {
    try {
      await this.client.get("/fapi/v1/ping");
      return true;
    } catch {
      return false;
    }
  }

  /** 获取账户信息（余额 + 持仓） */
  async getAccountInfo(): Promise<{ balances: BinanceBalance[]; positions: BinancePosition[]; totalWalletBalance: string; availableBalance: string; totalUnrealizedProfit: string }> {
    const params = this.buildSignedParams({});
    const res = await this.client.get(`/fapi/v2/account?${params}`);
    const data = res.data;
    return {
      balances: (data.assets || []).filter((a: any) => parseFloat(a.walletBalance) > 0),
      positions: (data.positions || []).filter((p: any) => parseFloat(p.positionAmt) !== 0),
      totalWalletBalance: data.totalWalletBalance,
      availableBalance: data.availableBalance,
      totalUnrealizedProfit: data.totalUnrealizedProfit,
    };
  }

  /** 获取 USDT 余额 */
  async getUSDTBalance(): Promise<{ balance: number; available: number; unrealizedPnl: number }> {
    const params = this.buildSignedParams({});
    const res = await this.client.get(`/fapi/v2/balance?${params}`);
    const usdt = (res.data as BinanceBalance[]).find(b => b.asset === "USDT");
    return {
      balance: parseFloat(usdt?.balance ?? "0"),
      available: parseFloat(usdt?.availableBalance ?? "0"),
      unrealizedPnl: parseFloat(usdt?.crossUnPnl ?? "0"),
    };
  }

  /** 获取当前持仓 */
  async getPositions(symbol?: string): Promise<BinancePosition[]> {
    const p: Record<string, any> = {};
    if (symbol) p.symbol = symbol.toUpperCase();
    const params = this.buildSignedParams(p);
    const res = await this.client.get(`/fapi/v2/positionRisk?${params}`);
    return (res.data as BinancePosition[]).filter(pos => parseFloat(pos.positionAmt) !== 0.0);
  }

  /** 下单 */
  async placeOrder(order: PlaceOrderParams): Promise<BinanceOrder> {
    const p: Record<string, any> = {
      symbol: order.symbol.toUpperCase(),
      side: order.side,
      type: order.type,
    };
    if (order.positionSide) p.positionSide = order.positionSide;
    if (order.quantity) p.quantity = order.quantity;
    if (order.price) p.price = order.price;
    if (order.stopPrice) p.stopPrice = order.stopPrice;
    if (order.reduceOnly !== undefined) p.reduceOnly = order.reduceOnly;
    if (order.timeInForce) p.timeInForce = order.timeInForce;
    if (order.newClientOrderId) p.newClientOrderId = order.newClientOrderId;
    if (order.type === "LIMIT" && !order.timeInForce) p.timeInForce = "GTC";

    const params = this.buildSignedParams(p);
    const res = await this.client.post(`/fapi/v1/order`, params);
    return res.data;
  }

  /** 市价开多 */
  async openLong(symbol: string, quantity: number, leverage?: number): Promise<BinanceOrder> {
    if (leverage) await this.setLeverage(symbol, leverage);
    return this.placeOrder({ symbol, side: "BUY", type: "MARKET", quantity });
  }

  /** 市价开空 */
  async openShort(symbol: string, quantity: number, leverage?: number): Promise<BinanceOrder> {
    if (leverage) await this.setLeverage(symbol, leverage);
    return this.placeOrder({ symbol, side: "SELL", type: "MARKET", quantity });
  }

  /** 市价平多 */
  async closeLong(symbol: string, quantity: number): Promise<BinanceOrder> {
    return this.placeOrder({ symbol, side: "SELL", type: "MARKET", quantity, reduceOnly: true });
  }

  /** 市价平空 */
  async closeShort(symbol: string, quantity: number): Promise<BinanceOrder> {
    return this.placeOrder({ symbol, side: "BUY", type: "MARKET", quantity, reduceOnly: true });
  }

  /** 一键平仓（平掉指定币种所有持仓） */
  async closeAllPositions(symbol: string): Promise<BinanceOrder[]> {
    const positions = await this.getPositions(symbol);
    const results: BinanceOrder[] = [];
    for (const pos of positions) {
      const amt = parseFloat(pos.positionAmt);
      if (amt === 0) continue;
      const qty = Math.abs(amt);
      if (amt > 0) {
        results.push(await this.closeLong(pos.symbol, qty));
      } else {
        results.push(await this.closeShort(pos.symbol, qty));
      }
    }
    return results;
  }

  /** 设置止损单 */
  async setStopLoss(symbol: string, side: "BUY" | "SELL", stopPrice: number, quantity: number): Promise<BinanceOrder> {
    return this.placeOrder({
      symbol, side, type: "STOP_MARKET",
      stopPrice, quantity, reduceOnly: true,
    });
  }

  /** 设置止盈单 */
  async setTakeProfit(symbol: string, side: "BUY" | "SELL", stopPrice: number, quantity: number): Promise<BinanceOrder> {
    return this.placeOrder({
      symbol, side, type: "TAKE_PROFIT_MARKET",
      stopPrice, quantity, reduceOnly: true,
    });
  }

  /** 撤单 */
  async cancelOrder(symbol: string, orderId: number): Promise<any> {
    const params = this.buildSignedParams({ symbol: symbol.toUpperCase(), orderId });
    const res = await this.client.delete(`/fapi/v1/order?${params}`);
    return res.data;
  }

  /** 撤销所有挂单 */
  async cancelAllOrders(symbol: string): Promise<any> {
    const params = this.buildSignedParams({ symbol: symbol.toUpperCase() });
    const res = await this.client.delete(`/fapi/v1/allOpenOrders?${params}`);
    return res.data;
  }

  /** 获取当前挂单 */
  async getOpenOrders(symbol?: string): Promise<BinanceOrder[]> {
    const p: Record<string, any> = {};
    if (symbol) p.symbol = symbol.toUpperCase();
    const params = this.buildSignedParams(p);
    const res = await this.client.get(`/fapi/v1/openOrders?${params}`);
    return res.data;
  }

  /** 获取历史成交 */
  async getTradeHistory(symbol: string, limit = 20): Promise<any[]> {
    const params = this.buildSignedParams({ symbol: symbol.toUpperCase(), limit });
    const res = await this.client.get(`/fapi/v1/userTrades?${params}`);
    return res.data;
  }

  /** 设置杠杆 */
  async setLeverage(symbol: string, leverage: number): Promise<any> {
    const params = this.buildSignedParams({ symbol: symbol.toUpperCase(), leverage });
    const res = await this.client.post(`/fapi/v1/leverage`, params);
    return res.data;
  }

  /** 设置保证金模式 */
  async setMarginType(symbol: string, marginType: "ISOLATED" | "CROSSED"): Promise<any> {
    try {
      const params = this.buildSignedParams({ symbol: symbol.toUpperCase(), marginType });
      const res = await this.client.post(`/fapi/v1/marginType`, params);
      return res.data;
    } catch (e: any) {
      // 如果已经是该模式，忽略错误
      if (e?.response?.data?.code === -4046) return { msg: "No need to change margin type." };
      throw e;
    }
  }

  /** 获取交易所信息（最小下单量等） */
  async getExchangeInfo(symbol?: string): Promise<any> {
    const url = symbol
      ? `/fapi/v1/exchangeInfo?symbol=${symbol.toUpperCase()}`
      : "/fapi/v1/exchangeInfo";
    const res = await this.client.get(url);
    return res.data;
  }

  /** 获取最小下单量 */
  async getMinQty(symbol: string): Promise<{ minQty: number; stepSize: number; minNotional: number }> {
    const info = await this.getExchangeInfo(symbol);
    const sym = info.symbols?.find((s: any) => s.symbol === symbol.toUpperCase());
    if (!sym) return { minQty: 0.001, stepSize: 0.001, minNotional: 5 };
    const lotFilter = sym.filters?.find((f: any) => f.filterType === "LOT_SIZE");
    const notionalFilter = sym.filters?.find((f: any) => f.filterType === "MIN_NOTIONAL");
    return {
      minQty: parseFloat(lotFilter?.minQty ?? "0.001"),
      stepSize: parseFloat(lotFilter?.stepSize ?? "0.001"),
      minNotional: parseFloat(notionalFilter?.notional ?? "5"),
    };
  }

  /** 根据 USDT 金额和价格计算下单数量（向下取整到 stepSize） */
  static calcQuantity(usdtAmount: number, price: number, stepSize: number): number {
    const rawQty = usdtAmount / price;
    const steps = Math.floor(rawQty / stepSize);
    return steps * stepSize;
  }
}

/** 创建币安服务实例（从数据库配置读取） */
export function createBinanceService(apiKey: string, secretKey: string, useTestnet = false): BinanceService {
  return new BinanceService({ apiKey, secretKey, useTestnet });
}
