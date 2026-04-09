/**
 * 欧易（OKX）合约实盘 API 服务
 * 支持 USDT 永续合约（SWAP）
 * 文档：https://www.okx.com/docs-v5/zh/
 */
import crypto from "crypto";
import axios, { AxiosInstance } from "axios";

const OKX_BASE = "https://www.okx.com";
const OKX_DEMO_BASE = "https://www.okx.com"; // 模拟盘用相同域名，通过 header 区分

export interface OKXConfig {
  apiKey: string;
  secretKey: string;
  passphrase: string;
  useDemo?: boolean; // 模拟盘
}

export interface OKXOrderParams {
  instId: string;      // e.g. "BTC-USDT-SWAP"
  tdMode: "cross" | "isolated"; // 保证金模式
  side: "buy" | "sell";
  posSide?: "long" | "short" | "net"; // 持仓方向（双向持仓模式）
  ordType: "market" | "limit" | "post_only" | "fok" | "ioc";
  sz: string;          // 数量（张数）
  px?: string;         // 限价
  reduceOnly?: boolean;
  clOrdId?: string;    // 客户端订单 ID
  tpTriggerPx?: string;  // 止盈触发价
  tpOrdPx?: string;      // 止盈委托价（-1 = 市价）
  slTriggerPx?: string;  // 止损触发价
  slOrdPx?: string;      // 止损委托价（-1 = 市价）
}

export interface OKXPosition {
  instId: string;
  instType: string;
  mgnMode: string;
  posId: string;
  posSide: string;
  pos: string;         // 持仓数量（张）
  avgPx: string;       // 开仓均价
  upl: string;         // 未实现盈亏
  uplRatio: string;    // 未实现盈亏率
  liqPx: string;       // 预估强平价
  lever: string;       // 杠杆倍数
  notionalUsd: string; // 名义价值
  cTime: string;
  uTime: string;
}

export interface OKXBalance {
  ccy: string;         // 币种
  bal: string;         // 余额
  availBal: string;    // 可用余额
  frozenBal: string;   // 冻结余额
  upl: string;         // 未实现盈亏
}

export interface OKXOrder {
  ordId: string;
  clOrdId: string;
  instId: string;
  side: string;
  posSide: string;
  ordType: string;
  sz: string;
  px: string;
  fillSz: string;
  fillPx: string;
  state: string;       // live / partially_filled / filled / canceled
  cTime: string;
  uTime: string;
}

export class OKXService {
  private client: AxiosInstance;
  private apiKey: string;
  private secretKey: string;
  private passphrase: string;
  private useDemo: boolean;

  constructor(config: OKXConfig) {
    this.apiKey = config.apiKey;
    this.secretKey = config.secretKey;
    this.passphrase = config.passphrase;
    this.useDemo = config.useDemo ?? false;

    this.client = axios.create({
      baseURL: OKX_BASE,
      timeout: 10000,
      headers: { "Content-Type": "application/json" },
    });
  }

  /** 生成 ISO 时间戳 */
  private getTimestamp(): string {
    return new Date().toISOString();
  }

  /** HMAC-SHA256 签名 */
  private sign(timestamp: string, method: string, requestPath: string, body = ""): string {
    const message = `${timestamp}${method.toUpperCase()}${requestPath}${body}`;
    return crypto.createHmac("sha256", this.secretKey).update(message).digest("base64");
  }

  /** 构建请求头 */
  private buildHeaders(method: string, path: string, body = ""): Record<string, string> {
    const timestamp = this.getTimestamp();
    const sign = this.sign(timestamp, method, path, body);
    const headers: Record<string, string> = {
      "OK-ACCESS-KEY": this.apiKey,
      "OK-ACCESS-SIGN": sign,
      "OK-ACCESS-TIMESTAMP": timestamp,
      "OK-ACCESS-PASSPHRASE": this.passphrase,
    };
    if (this.useDemo) {
      headers["x-simulated-trading"] = "1";
    }
    return headers;
  }

  /** GET 请求 */
  private async get(path: string, params: Record<string, any> = {}): Promise<any> {
    const queryString = Object.entries(params)
      .filter(([, v]) => v !== undefined && v !== null)
      .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
      .join("&");
    const fullPath = queryString ? `${path}?${queryString}` : path;
    const headers = this.buildHeaders("GET", fullPath);
    const res = await this.client.get(fullPath, { headers });
    if (res.data.code !== "0") {
      throw new Error(`OKX API Error: ${res.data.msg} (code: ${res.data.code})`);
    }
    return res.data.data;
  }

  /** POST 请求 */
  private async post(path: string, body: any): Promise<any> {
    const bodyStr = JSON.stringify(body);
    const headers = this.buildHeaders("POST", path, bodyStr);
    const res = await this.client.post(path, body, { headers });
    if (res.data.code !== "0") {
      const errMsg = res.data.data?.[0]?.sMsg ?? res.data.msg;
      throw new Error(`OKX API Error: ${errMsg} (code: ${res.data.code})`);
    }
    return res.data.data;
  }

  /** 测试连接 */
  async ping(): Promise<boolean> {
    try {
      await axios.get(`${OKX_BASE}/api/v5/public/time`, { timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }

  /** 获取账户余额 */
  async getBalance(ccy = "USDT"): Promise<{ balance: number; available: number; unrealizedPnl: number }> {
    const data = await this.get("/api/v5/account/balance", { ccy });
    const details: OKXBalance[] = data?.[0]?.details ?? [];
    const usdtDetail = details.find(d => d.ccy === ccy);
    return {
      balance: parseFloat(usdtDetail?.bal ?? "0"),
      available: parseFloat(usdtDetail?.availBal ?? "0"),
      unrealizedPnl: parseFloat(usdtDetail?.upl ?? "0"),
    };
  }

  /** 获取持仓 */
  async getPositions(instId?: string): Promise<OKXPosition[]> {
    const params: Record<string, any> = { instType: "SWAP" };
    if (instId) params.instId = instId;
    const data = await this.get("/api/v5/account/positions", params);
    return (data as OKXPosition[]).filter(p => parseFloat(p.pos) !== 0);
  }

  /** 下单 */
  async placeOrder(order: OKXOrderParams): Promise<{ ordId: string; clOrdId: string }> {
    const body: Record<string, any> = {
      instId: order.instId,
      tdMode: order.tdMode,
      side: order.side,
      ordType: order.ordType,
      sz: order.sz,
    };
    if (order.posSide) body.posSide = order.posSide;
    if (order.px) body.px = order.px;
    if (order.reduceOnly) body.reduceOnly = "true";
    if (order.clOrdId) body.clOrdId = order.clOrdId;
    if (order.tpTriggerPx) body.tpTriggerPx = order.tpTriggerPx;
    if (order.tpOrdPx) body.tpOrdPx = order.tpOrdPx;
    if (order.slTriggerPx) body.slTriggerPx = order.slTriggerPx;
    if (order.slOrdPx) body.slOrdPx = order.slOrdPx;

    const data = await this.post("/api/v5/trade/order", body);
    return { ordId: data[0].ordId, clOrdId: data[0].clOrdId };
  }

  /** 市价开多（买入做多） */
  async openLong(instId: string, sz: string, leverage?: number): Promise<{ ordId: string }> {
    if (leverage) await this.setLeverage(instId, leverage);
    return this.placeOrder({ instId, tdMode: "cross", side: "buy", posSide: "long", ordType: "market", sz });
  }

  /** 市价开空（卖出做空） */
  async openShort(instId: string, sz: string, leverage?: number): Promise<{ ordId: string }> {
    if (leverage) await this.setLeverage(instId, leverage);
    return this.placeOrder({ instId, tdMode: "cross", side: "sell", posSide: "short", ordType: "market", sz });
  }

  /** 市价平多 */
  async closeLong(instId: string, sz: string): Promise<{ ordId: string }> {
    return this.placeOrder({ instId, tdMode: "cross", side: "sell", posSide: "long", ordType: "market", sz, reduceOnly: true });
  }

  /** 市价平空 */
  async closeShort(instId: string, sz: string): Promise<{ ordId: string }> {
    return this.placeOrder({ instId, tdMode: "cross", side: "buy", posSide: "short", ordType: "market", sz, reduceOnly: true });
  }

  /** 一键平仓 */
  async closeAllPositions(instId?: string): Promise<any[]> {
    const positions = await this.getPositions(instId);
    const results = [];
    for (const pos of positions) {
      const sz = Math.abs(parseFloat(pos.pos)).toString();
      if (pos.posSide === "long") {
        results.push(await this.closeLong(pos.instId, sz));
      } else if (pos.posSide === "short") {
        results.push(await this.closeShort(pos.instId, sz));
      }
    }
    return results;
  }

  /** 撤单 */
  async cancelOrder(instId: string, ordId: string): Promise<any> {
    return this.post("/api/v5/trade/cancel-order", { instId, ordId });
  }

  /** 撤销所有挂单 */
  async cancelAllOrders(instId: string): Promise<any> {
    const orders = await this.getOpenOrders(instId);
    if (orders.length === 0) return [];
    const cancelList = orders.map((o: OKXOrder) => ({ instId, ordId: o.ordId }));
    return this.post("/api/v5/trade/cancel-batch-orders", cancelList);
  }

  /** 获取当前挂单 */
  async getOpenOrders(instId?: string): Promise<OKXOrder[]> {
    const params: Record<string, any> = { instType: "SWAP" };
    if (instId) params.instId = instId;
    return this.get("/api/v5/trade/orders-pending", params);
  }

  /** 获取历史成交 */
  async getTradeHistory(instId: string, limit = 20): Promise<any[]> {
    return this.get("/api/v5/trade/fills", { instId, limit });
  }

  /** 设置杠杆 */
  async setLeverage(instId: string, lever: number, mgnMode = "cross"): Promise<any> {
    return this.post("/api/v5/account/set-leverage", {
      instId, lever: String(lever), mgnMode,
    });
  }

  /** 获取合约信息（最小下单量） */
  async getInstrumentInfo(instId: string): Promise<{ ctVal: number; minSz: number; lotSz: number }> {
    const data = await this.get("/api/v5/public/instruments", { instType: "SWAP", instId });
    const inst = data?.[0];
    return {
      ctVal: parseFloat(inst?.ctVal ?? "0.01"),    // 每张合约价值（BTC）
      minSz: parseFloat(inst?.minSz ?? "1"),        // 最小下单张数
      lotSz: parseFloat(inst?.lotSz ?? "1"),        // 下单张数精度
    };
  }

  /** 将 USDT 金额转换为张数 */
  static async calcContractSize(usdtAmount: number, price: number, ctVal: number): Promise<number> {
    // 张数 = USDT / (价格 * 每张合约价值)
    return Math.floor(usdtAmount / (price * ctVal));
  }

  /** 将 BTC-USDT 格式转为 OKX 合约格式 BTC-USDT-SWAP */
  static toInstId(symbol: string): string {
    const base = symbol.replace("USDT", "").replace("-", "");
    return `${base}-USDT-SWAP`;
  }
}

/** 创建欧易服务实例 */
export function createOKXService(apiKey: string, secretKey: string, passphrase: string, useDemo = false): OKXService {
  return new OKXService({ apiKey, secretKey, passphrase, useDemo });
}
