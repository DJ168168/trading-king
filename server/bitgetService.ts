/**
 * Bitget 合约实盘 API 服务
 * 支持 USDT 永续合约（Mix Futures）
 * 文档：https://www.bitget.com/api-doc/contract/intro
 */
import crypto from "crypto";
import axios, { AxiosInstance } from "axios";

const BITGET_BASE = "https://api.bitget.com";

export interface BitgetConfig {
  apiKey: string;
  secretKey: string;
  passphrase: string;
}

export interface BitgetOrderParams {
  symbol: string;           // e.g. "BTCUSDT"
  productType: "USDT-FUTURES" | "COIN-FUTURES";
  marginMode: "crossed" | "isolated";
  marginCoin: string;       // e.g. "USDT"
  size: string;             // 数量
  side: "buy" | "sell";
  tradeSide: "open" | "close";
  orderType: "market" | "limit";
  price?: string;           // 限价
  timeInForceValue?: "normal" | "post_only" | "fok" | "ioc";
  clientOid?: string;
  reduceOnly?: "YES" | "NO";
  presetStopSurplusPrice?: string;
  presetStopLossPrice?: string;
}

export interface BitgetPosition {
  symbol: string;
  marginCoin: string;
  holdSide: "long" | "short";
  openDelegateSize: string;
  marginSize: string;
  available: string;
  locked: string;
  total: string;
  leverage: string;
  achievedProfits: string;
  openPriceAvg: string;
  marginMode: string;
  posMode: string;
  unrealizedPL: string;
  liquidationPrice: string;
  keepMarginRate: string;
  markPrice: string;
  cTime: string;
  uTime: string;
}

export interface BitgetBalance {
  marginCoin: string;
  locked: string;
  available: string;
  crossedMaxAvailable: string;
  isolatedMaxAvailable: string;
  maxTransferOut: string;
  equity: string;
  usdtEquity: string;
  btcEquity: string;
  unrealizedPL: string;
  bonus: string;
}

export interface BitgetOrder {
  orderId: string;
  clientOid: string;
  symbol: string;
  size: string;
  orderType: string;
  side: string;
  tradeSide: string;
  price: string;
  priceAvg: string;
  status: string;
  baseVolume: string;
  quoteVolume: string;
  enterPointSource: string;
  tradeSideType: string;
  cTime: string;
  uTime: string;
}

export class BitgetService {
  private client: AxiosInstance;
  private apiKey: string;
  private secretKey: string;
  private passphrase: string;

  constructor(config: BitgetConfig) {
    this.apiKey = config.apiKey;
    this.secretKey = config.secretKey;
    this.passphrase = config.passphrase;
    this.client = axios.create({ baseURL: BITGET_BASE, timeout: 10000 });
  }

  private sign(timestamp: string, method: string, path: string, body: string): string {
    const message = `${timestamp}${method.toUpperCase()}${path}${body}`;
    return crypto.createHmac("sha256", this.secretKey).update(message).digest("base64");
  }

  private async request<T>(method: "GET" | "POST" | "DELETE", path: string, params: Record<string, any> = {}): Promise<T> {
    const timestamp = Date.now().toString();
    let queryString = "";
    let body = "";

    if (method === "GET") {
      queryString = new URLSearchParams(params).toString();
    } else {
      body = JSON.stringify(params);
    }

    const fullPath = queryString ? `${path}?${queryString}` : path;
    const signature = this.sign(timestamp, method, fullPath, body);

    const headers: Record<string, string> = {
      "ACCESS-KEY": this.apiKey,
      "ACCESS-SIGN": signature,
      "ACCESS-TIMESTAMP": timestamp,
      "ACCESS-PASSPHRASE": this.passphrase,
      "Content-Type": "application/json",
      "locale": "zh-CN",
    };

    const response = await this.client.request<{ code: string; msg: string; data: T }>({
      method, url: fullPath, headers,
      data: method === "POST" ? body : undefined,
    });

    if (response.data.code !== "00000") {
      throw new Error(`Bitget API Error: ${response.data.msg} (code: ${response.data.code})`);
    }
    return response.data.data;
  }

  /** 获取账户余额 */
  async getBalance(productType = "USDT-FUTURES", marginCoin = "USDT"): Promise<BitgetBalance | null> {
    try {
      const result = await this.request<BitgetBalance[]>("GET", "/api/v2/mix/account/account", {
        productType, marginCoin,
      });
      return result?.[0] ?? null;
    } catch (e: any) {
      console.error("[Bitget] getBalance error:", e.message);
      return null;
    }
  }

  /** 获取持仓 */
  async getPositions(productType = "USDT-FUTURES", marginCoin = "USDT"): Promise<BitgetPosition[]> {
    try {
      const result = await this.request<BitgetPosition[]>("GET", "/api/v2/mix/position/all-position", {
        productType, marginCoin,
      });
      return (result ?? []).filter(p => parseFloat(p.total) !== 0);
    } catch (e: any) {
      console.error("[Bitget] getPositions error:", e.message);
      return [];
    }
  }

  /** 下单 */
  async placeOrder(params: BitgetOrderParams): Promise<{ orderId: string; clientOid: string } | null> {
    try {
      return await this.request<{ orderId: string; clientOid: string }>("POST", "/api/v2/mix/order/place-order", params);
    } catch (e: any) {
      console.error("[Bitget] placeOrder error:", e.message);
      return null;
    }
  }

  /** 取消订单 */
  async cancelOrder(symbol: string, productType: string, orderId: string): Promise<boolean> {
    try {
      await this.request("POST", "/api/v2/mix/order/cancel-order", { symbol, productType, orderId });
      return true;
    } catch (e: any) {
      console.error("[Bitget] cancelOrder error:", e.message);
      return false;
    }
  }

  /** 获取未成交订单 */
  async getOpenOrders(productType = "USDT-FUTURES", symbol?: string): Promise<BitgetOrder[]> {
    try {
      const params: Record<string, any> = { productType };
      if (symbol) params.symbol = symbol;
      const result = await this.request<{ entrustedList: BitgetOrder[] }>(
        "GET", "/api/v2/mix/order/orders-pending", params
      );
      return result?.entrustedList ?? [];
    } catch (e: any) {
      console.error("[Bitget] getOpenOrders error:", e.message);
      return [];
    }
  }

  /** 设置杠杆 */
  async setLeverage(symbol: string, productType: string, marginCoin: string, leverage: string, holdSide?: "long" | "short"): Promise<boolean> {
    try {
      const params: Record<string, any> = { symbol, productType, marginCoin, leverage };
      if (holdSide) params.holdSide = holdSide;
      await this.request("POST", "/api/v2/mix/account/set-leverage", params);
      return true;
    } catch (e: any) {
      console.error("[Bitget] setLeverage error:", e.message);
      return false;
    }
  }

  /** 平仓（市价） */
  async closePosition(symbol: string, productType: string, holdSide: "long" | "short", size: string): Promise<boolean> {
    try {
      await this.placeOrder({
        symbol,
        productType: productType as "USDT-FUTURES",
        marginMode: "crossed",
        marginCoin: "USDT",
        size,
        side: holdSide === "long" ? "sell" : "buy",
        tradeSide: "close",
        orderType: "market",
      });
      return true;
    } catch (e: any) {
      console.error("[Bitget] closePosition error:", e.message);
      return false;
    }
  }

  /** 测试连接 */
  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      const balance = await this.getBalance();
      if (!balance) return { success: false, message: "无法获取账户余额" };
      return {
        success: true,
        message: `连接成功，权益: ${parseFloat(balance.equity).toFixed(2)} USDT`,
      };
    } catch (e: any) {
      return { success: false, message: e.message };
    }
  }
}

let _bitgetInstance: BitgetService | null = null;

export function createBitgetService(config: BitgetConfig): BitgetService {
  return new BitgetService(config);
}

export function getBitgetInstance(): BitgetService | null {
  return _bitgetInstance;
}

export function initBitgetService(config: BitgetConfig): BitgetService {
  _bitgetInstance = new BitgetService(config);
  return _bitgetInstance;
}
