import crypto from "node:crypto";

function toQuery(params: Record<string, any>) {
  return new URLSearchParams(
    Object.entries(params)
      .filter(([, value]) => value !== undefined && value !== null && value !== "")
      .map(([key, value]) => [key, String(value)]),
  ).toString();
}

class BinanceService {
  private readonly apiKey: string;
  private readonly secretKey: string;
  private readonly baseUrl: string;

  constructor(apiKey: string, secretKey: string, useTestnet = false) {
    this.apiKey = apiKey || "";
    this.secretKey = secretKey || "";
    this.baseUrl = useTestnet ? "https://testnet.binancefuture.com" : "https://fapi.binance.com";
  }

  private sign(query: string) {
    return crypto.createHmac("sha256", this.secretKey).update(query).digest("hex");
  }

  private async request<T = any>(path: string, method: "GET" | "POST" | "DELETE" = "GET", params: Record<string, any> = {}, signed = false): Promise<T> {
    const baseParams = signed ? { ...params, timestamp: Date.now(), recvWindow: 5000 } : { ...params };
    const query = toQuery(baseParams);
    const signedQuery = signed ? `${query}&signature=${this.sign(query)}` : query;
    const url = `${this.baseUrl}${path}${signedQuery ? `?${signedQuery}` : ""}`;
    const headers: Record<string, string> = {};
    if (this.apiKey) headers["X-MBX-APIKEY"] = this.apiKey;
    const res = await fetch(url, { method, headers });
    const text = await res.text();
    const json = text ? JSON.parse(text) : null;
    if (!res.ok) throw new Error(json?.msg || `Binance HTTP ${res.status}`);
    return json as T;
  }

  ping() {
    return this.request("/fapi/v1/ping").then(() => true).catch(() => false);
  }

  getAccountInfo() {
    return this.request<any>("/fapi/v2/account", "GET", {}, true);
  }

  async getAccountBalance() {
    return this.request<any[]>("/fapi/v2/balance", "GET", {}, true);
  }

  async getUSDTBalance() {
    const balances = await this.getAccountBalance();
    const usdt = balances.find((item: any) => item.asset === "USDT");
    return {
      asset: "USDT",
      walletBalance: Number(usdt?.balance ?? usdt?.walletBalance ?? 0),
      availableBalance: Number(usdt?.availableBalance ?? 0),
    };
  }

  async getPositions(symbol?: string) {
    const rows = await this.request<any[]>("/fapi/v2/positionRisk", "GET", symbol ? { symbol } : {}, true);
    return rows.filter((item: any) => Math.abs(Number(item.positionAmt ?? 0)) > 0 || !symbol);
  }

  getOpenPositions(symbol?: string) {
    return this.getPositions(symbol);
  }

  getOpenOrders(symbol?: string) {
    return this.request<any[]>("/fapi/v1/openOrders", "GET", symbol ? { symbol } : {}, true);
  }

  cancelOrder(symbol: string, orderId: string | number) {
    return this.request<any>("/fapi/v1/order", "DELETE", { symbol, orderId }, true);
  }

  setLeverage(symbol: string, leverage: number) {
    return this.request<any>("/fapi/v1/leverage", "POST", { symbol, leverage }, true);
  }

  placeOrder(input: {
    symbol: string;
    side: "BUY" | "SELL";
    type?: "MARKET" | "LIMIT" | "STOP_MARKET" | "TAKE_PROFIT_MARKET";
    quantity: number | string;
    reduceOnly?: boolean;
    price?: number | string;
    stopPrice?: number | string;
    timeInForce?: "GTC" | "IOC" | "FOK";
    positionSide?: "LONG" | "SHORT" | "BOTH";
  }) {
    return this.request<any>("/fapi/v1/order", "POST", {
      symbol: input.symbol,
      side: input.side,
      type: input.type ?? "MARKET",
      quantity: input.quantity,
      reduceOnly: input.reduceOnly,
      price: input.price,
      stopPrice: input.stopPrice,
      timeInForce: input.timeInForce,
      positionSide: input.positionSide,
    }, true);
  }

  async openLong(symbol: string, quantity: number | string, leverage?: number) {
    if (leverage) await this.setLeverage(symbol, leverage);
    return this.placeOrder({ symbol, side: "BUY", type: "MARKET", quantity, positionSide: "LONG" });
  }

  async openShort(symbol: string, quantity: number | string, leverage?: number) {
    if (leverage) await this.setLeverage(symbol, leverage);
    return this.placeOrder({ symbol, side: "SELL", type: "MARKET", quantity, positionSide: "SHORT" });
  }

  async closeAllPositions(symbol?: string) {
    const positions = await this.getPositions(symbol);
    const results = [] as any[];
    for (const pos of positions) {
      const qty = Math.abs(Number(pos.positionAmt ?? 0));
      if (!qty) continue;
      const side = Number(pos.positionAmt) > 0 ? "SELL" : "BUY";
      const positionSide = Number(pos.positionAmt) > 0 ? "LONG" : "SHORT";
      results.push(await this.placeOrder({ symbol: pos.symbol, side, quantity: qty, type: "MARKET", reduceOnly: true, positionSide }));
    }
    return results;
  }
}

export function createBinanceService(apiKey: string, secretKey: string, useTestnet = false) {
  return new BinanceService(apiKey, secretKey, useTestnet);
}
