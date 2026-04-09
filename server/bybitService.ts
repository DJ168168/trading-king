/**
 * Bybit 合约实盘 API 服务
 * 支持 USDT 永续合约（Linear Perpetual）
 * 文档：https://bybit-exchange.github.io/docs/v5/intro
 */
import crypto from "crypto";
import axios, { AxiosInstance } from "axios";

const BYBIT_BASE = "https://api.bybit.com";
const BYBIT_TESTNET_BASE = "https://api-testnet.bybit.com";

export interface BybitConfig {
  apiKey: string;
  secretKey: string;
  useTestnet?: boolean;
}

export interface BybitOrderParams {
  category: "linear" | "inverse" | "spot";
  symbol: string;         // e.g. "BTCUSDT"
  side: "Buy" | "Sell";
  orderType: "Market" | "Limit";
  qty: string;            // 数量
  price?: string;         // 限价
  timeInForce?: "GTC" | "IOC" | "FOK" | "PostOnly";
  reduceOnly?: boolean;
  closeOnTrigger?: boolean;
  positionIdx?: 0 | 1 | 2; // 0=单向, 1=双向多, 2=双向空
  stopLoss?: string;
  takeProfit?: string;
  orderLinkId?: string;
}

export interface BybitPosition {
  symbol: string;
  side: string;
  size: string;
  avgPrice: string;
  markPrice: string;
  unrealisedPnl: string;
  cumRealisedPnl: string;
  liqPrice: string;
  leverage: string;
  positionIdx: number;
  positionStatus: string;
  createdTime: string;
  updatedTime: string;
}

export interface BybitBalance {
  coin: string;
  walletBalance: string;
  availableToWithdraw: string;
  unrealisedPnl: string;
  equity: string;
  usdValue: string;
}

export interface BybitOrder {
  orderId: string;
  orderLinkId: string;
  symbol: string;
  side: string;
  orderType: string;
  qty: string;
  price: string;
  avgPrice: string;
  orderStatus: string;
  cumExecQty: string;
  cumExecValue: string;
  createdTime: string;
  updatedTime: string;
}

export class BybitService {
  private client: AxiosInstance;
  private apiKey: string;
  private secretKey: string;

  constructor(config: BybitConfig) {
    this.apiKey = config.apiKey;
    this.secretKey = config.secretKey;
    const baseURL = config.useTestnet ? BYBIT_TESTNET_BASE : BYBIT_BASE;
    this.client = axios.create({ baseURL, timeout: 10000 });
  }

  private sign(timestamp: string, params: string): string {
    const message = `${timestamp}${this.apiKey}5000${params}`;
    return crypto.createHmac("sha256", this.secretKey).update(message).digest("hex");
  }

  private async request<T>(method: "GET" | "POST", path: string, params: Record<string, any> = {}): Promise<T> {
    const timestamp = Date.now().toString();
    let queryString = "";
    let body = "";

    if (method === "GET") {
      queryString = new URLSearchParams(params).toString();
    } else {
      body = JSON.stringify(params);
    }

    const signPayload = method === "GET" ? queryString : body;
    const signature = this.sign(timestamp, signPayload);

    const headers = {
      "X-BAPI-API-KEY": this.apiKey,
      "X-BAPI-SIGN": signature,
      "X-BAPI-SIGN-BY": "2",
      "X-BAPI-TIMESTAMP": timestamp,
      "X-BAPI-RECV-WINDOW": "5000",
      "Content-Type": "application/json",
    };

    const url = method === "GET" ? `${path}?${queryString}` : path;
    const response = await this.client.request<{ retCode: number; retMsg: string; result: T }>({
      method, url, headers,
      data: method === "POST" ? body : undefined,
    });

    if (response.data.retCode !== 0) {
      throw new Error(`Bybit API Error: ${response.data.retMsg} (code: ${response.data.retCode})`);
    }
    return response.data.result;
  }

  /** 获取账户余额 */
  async getBalance(accountType = "UNIFIED"): Promise<BybitBalance[]> {
    try {
      const result = await this.request<{ list: Array<{ coin: BybitBalance[] }> }>(
        "GET", "/v5/account/wallet-balance", { accountType }
      );
      return result.list?.[0]?.coin ?? [];
    } catch (e: any) {
      console.error("[Bybit] getBalance error:", e.message);
      return [];
    }
  }

  /** 获取持仓 */
  async getPositions(category = "linear", symbol?: string): Promise<BybitPosition[]> {
    try {
      const params: Record<string, any> = { category, settleCoin: "USDT" };
      if (symbol) params.symbol = symbol;
      const result = await this.request<{ list: BybitPosition[] }>(
        "GET", "/v5/position/list", params
      );
      return (result.list ?? []).filter(p => parseFloat(p.size) !== 0);
    } catch (e: any) {
      console.error("[Bybit] getPositions error:", e.message);
      return [];
    }
  }

  /** 下单 */
  async placeOrder(params: BybitOrderParams): Promise<{ orderId: string; orderLinkId: string } | null> {
    try {
      const result = await this.request<{ orderId: string; orderLinkId: string }>(
        "POST", "/v5/order/create", params
      );
      return result;
    } catch (e: any) {
      console.error("[Bybit] placeOrder error:", e.message);
      return null;
    }
  }

  /** 取消订单 */
  async cancelOrder(category: string, symbol: string, orderId: string): Promise<boolean> {
    try {
      await this.request("POST", "/v5/order/cancel", { category, symbol, orderId });
      return true;
    } catch (e: any) {
      console.error("[Bybit] cancelOrder error:", e.message);
      return false;
    }
  }

  /** 获取未成交订单 */
  async getOpenOrders(category = "linear", symbol?: string): Promise<BybitOrder[]> {
    try {
      const params: Record<string, any> = { category };
      if (symbol) params.symbol = symbol;
      const result = await this.request<{ list: BybitOrder[] }>(
        "GET", "/v5/order/realtime", params
      );
      return result.list ?? [];
    } catch (e: any) {
      console.error("[Bybit] getOpenOrders error:", e.message);
      return [];
    }
  }

  /** 设置杠杆 */
  async setLeverage(category: string, symbol: string, buyLeverage: string, sellLeverage: string): Promise<boolean> {
    try {
      await this.request("POST", "/v5/position/set-leverage", {
        category, symbol, buyLeverage, sellLeverage,
      });
      return true;
    } catch (e: any) {
      // 已是该杠杆时会报错，忽略
      if (e.message?.includes("110043")) return true;
      console.error("[Bybit] setLeverage error:", e.message);
      return false;
    }
  }

  /** 平仓（市价） */
  async closePosition(category: string, symbol: string, side: "Buy" | "Sell", qty: string): Promise<boolean> {
    try {
      await this.placeOrder({
        category: category as "linear",
        symbol, side, orderType: "Market", qty,
        reduceOnly: true,
      });
      return true;
    } catch (e: any) {
      console.error("[Bybit] closePosition error:", e.message);
      return false;
    }
  }

  /** 测试连接 */
  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      const balances = await this.getBalance();
      const usdtBalance = balances.find(b => b.coin === "USDT");
      return {
        success: true,
        message: `连接成功，USDT余额: ${usdtBalance ? parseFloat(usdtBalance.walletBalance).toFixed(2) : "0.00"}`,
      };
    } catch (e: any) {
      return { success: false, message: e.message };
    }
  }
}

let _bybitInstance: BybitService | null = null;

export function createBybitService(config: BybitConfig): BybitService {
  return new BybitService(config);
}

export function getBybitInstance(): BybitService | null {
  return _bybitInstance;
}

export function initBybitService(config: BybitConfig): BybitService {
  _bybitInstance = new BybitService(config);
  return _bybitInstance;
}
