/**
 * Gate.io 合约实盘 API 服务
 * 支持 USDT 永续合约（Futures）
 * 文档：https://www.gate.io/docs/developers/apiv4/
 */
import crypto from "crypto";
import axios, { AxiosInstance } from "axios";

const GATE_BASE = "https://api.gateio.ws";

export interface GateConfig {
  apiKey: string;
  secretKey: string;
}

export interface GateOrderParams {
  contract: string;       // e.g. "BTC_USDT"
  size: number;           // 正数做多，负数做空（张数）
  price?: string;         // 限价，0 表示市价
  tif?: "gtc" | "ioc" | "poc" | "fok";
  text?: string;          // 客户端订单 ID
  reduce_only?: boolean;
  auto_size?: "close_long" | "close_short";
  iceberg?: number;
  close?: boolean;
}

export interface GatePosition {
  contract: string;
  size: number;
  entry_price: string;
  mark_price: string;
  realised_pnl: string;
  unrealised_pnl: string;
  liq_price: string;
  leverage: string;
  mode: string;
  cross_leverage_limit: string;
  update_time: number;
}

export interface GateBalance {
  total: string;
  unrealised_pnl: string;
  position_margin: string;
  order_margin: string;
  available: string;
  currency: string;
}

export interface GateOrder {
  id: number;
  contract: string;
  size: number;
  price: string;
  fill_price: string;
  status: string;
  tif: string;
  text: string;
  create_time: number;
  finish_time: number;
}

export class GateService {
  private client: AxiosInstance;
  private apiKey: string;
  private secretKey: string;

  constructor(config: GateConfig) {
    this.apiKey = config.apiKey;
    this.secretKey = config.secretKey;
    this.client = axios.create({ baseURL: GATE_BASE, timeout: 10000 });
  }

  private sign(method: string, path: string, query: string, body: string, timestamp: string): string {
    const bodyHash = crypto.createHash("sha512").update(body || "").digest("hex");
    const signString = `${method}\n${path}\n${query}\n${bodyHash}\n${timestamp}`;
    return crypto.createHmac("sha512", this.secretKey).update(signString).digest("hex");
  }

  private async request<T>(method: "GET" | "POST" | "DELETE", path: string, params: Record<string, any> = {}): Promise<T> {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    let query = "";
    let body = "";

    if (method === "GET" || method === "DELETE") {
      query = new URLSearchParams(params).toString();
    } else {
      body = JSON.stringify(params);
    }

    const signature = this.sign(method, path, query, body, timestamp);

    const headers: Record<string, string> = {
      "KEY": this.apiKey,
      "SIGN": signature,
      "Timestamp": timestamp,
      "Content-Type": "application/json",
    };

    const url = query ? `${path}?${query}` : path;
    const response = await this.client.request<T>({
      method, url, headers,
      data: method === "POST" ? body : undefined,
    });

    return response.data;
  }

  /** 获取账户余额 */
  async getBalance(settle = "usdt"): Promise<GateBalance | null> {
    try {
      return await this.request<GateBalance>("GET", `/api/v4/futures/${settle}/accounts`);
    } catch (e: any) {
      console.error("[Gate.io] getBalance error:", e.message);
      return null;
    }
  }

  /** 获取持仓 */
  async getPositions(settle = "usdt"): Promise<GatePosition[]> {
    try {
      const result = await this.request<GatePosition[]>("GET", `/api/v4/futures/${settle}/positions`);
      return (result ?? []).filter(p => p.size !== 0);
    } catch (e: any) {
      console.error("[Gate.io] getPositions error:", e.message);
      return [];
    }
  }

  /** 下单 */
  async placeOrder(settle = "usdt", params: GateOrderParams): Promise<GateOrder | null> {
    try {
      return await this.request<GateOrder>("POST", `/api/v4/futures/${settle}/orders`, params);
    } catch (e: any) {
      console.error("[Gate.io] placeOrder error:", e.message);
      return null;
    }
  }

  /** 取消订单 */
  async cancelOrder(settle = "usdt", orderId: string): Promise<boolean> {
    try {
      await this.request("DELETE", `/api/v4/futures/${settle}/orders/${orderId}`);
      return true;
    } catch (e: any) {
      console.error("[Gate.io] cancelOrder error:", e.message);
      return false;
    }
  }

  /** 获取未成交订单 */
  async getOpenOrders(settle = "usdt", contract?: string): Promise<GateOrder[]> {
    try {
      const params: Record<string, any> = { status: "open" };
      if (contract) params.contract = contract;
      return await this.request<GateOrder[]>("GET", `/api/v4/futures/${settle}/orders`, params);
    } catch (e: any) {
      console.error("[Gate.io] getOpenOrders error:", e.message);
      return [];
    }
  }

  /** 设置杠杆 */
  async setLeverage(settle = "usdt", contract: string, leverage: number): Promise<boolean> {
    try {
      await this.request("POST", `/api/v4/futures/${settle}/positions/${contract}/leverage`, { leverage });
      return true;
    } catch (e: any) {
      console.error("[Gate.io] setLeverage error:", e.message);
      return false;
    }
  }

  /** 平仓（市价） */
  async closePosition(settle = "usdt", contract: string, size: number): Promise<boolean> {
    try {
      // size 为正数表示平多（卖出），负数表示平空（买入）
      await this.placeOrder(settle, {
        contract,
        size: -size, // 反向平仓
        price: "0",
        tif: "ioc",
        reduce_only: true,
      });
      return true;
    } catch (e: any) {
      console.error("[Gate.io] closePosition error:", e.message);
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
        message: `连接成功，可用余额: ${parseFloat(balance.available).toFixed(2)} USDT`,
      };
    } catch (e: any) {
      return { success: false, message: e.message };
    }
  }
}

let _gateInstance: GateService | null = null;

export function createGateService(config: GateConfig): GateService {
  return new GateService(config);
}

export function getGateInstance(): GateService | null {
  return _gateInstance;
}

export function initGateService(config: GateConfig): GateService {
  _gateInstance = new GateService(config);
  return _gateInstance;
}
