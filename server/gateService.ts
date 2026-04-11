import crypto from "node:crypto";

type GateCredentials = {
  apiKey: string;
  secretKey: string;
  baseUrl?: string;
};

function buildQuery(params: Record<string, any>) {
  return new URLSearchParams(
    Object.entries(params)
      .filter(([, v]) => v !== undefined && v !== null && v !== "")
      .map(([k, v]) => [k, String(v)]),
  ).toString();
}

class GateService {
  private readonly apiKey: string;
  private readonly secretKey: string;
  private readonly baseUrl: string;

  constructor(creds: GateCredentials) {
    this.apiKey = creds.apiKey || "";
    this.secretKey = creds.secretKey || "";
    this.baseUrl = creds.baseUrl || "https://api.gateio.ws/api/v4";
  }

  private sign(method: string, path: string, queryString: string, body = "") {
    const ts = String(Math.floor(Date.now() / 1000));
    const bodyHash = crypto.createHash("sha512").update(body).digest("hex");
    const signString = [method, path, queryString, bodyHash, ts].join("\n");
    const sign = crypto.createHmac("sha512", this.secretKey).update(signString).digest("hex");
    return { ts, sign };
  }

  private async request<T = any>(method: "GET" | "POST" | "DELETE", path: string, query: Record<string, any> = {}, body?: any): Promise<T> {
    const queryString = buildQuery(query);
    const payload = body ? JSON.stringify(body) : "";
    const { ts, sign } = this.sign(method, path, queryString, payload);
    const url = `${this.baseUrl}${path}${queryString ? `?${queryString}` : ""}`;
    const res = await fetch(url, {
      method,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        KEY: this.apiKey,
        Timestamp: ts,
        SIGN: sign,
      },
      body: payload || undefined,
    });
    const text = await res.text();
    const json = text ? JSON.parse(text) : null;
    if (!res.ok) throw new Error(json?.label || json?.message || `Gate HTTP ${res.status}`);
    return json as T;
  }

  testConnection() {
    return this.getBalance().then(() => ({ success: true })).catch((e: any) => ({ success: false, error: e?.message || "连接失败" }));
  }

  async getBalance() {
    const rows = await this.request<any[]>("GET", "/wallet/total_balance");
    const details = Array.isArray(rows) ? rows[0] : rows;
    const total = Number(details?.total?.amount || details?.details?.futures?.amount || details?.details?.spot?.amount || 0);
    const available = Number(details?.available?.amount || details?.details?.futures?.available || total || 0);
    return { balance: total, available };
  }

  async getUSDTBalance() {
    const res = await this.request<any[]>("GET", "/futures/usdt/accounts");
    const row = Array.isArray(res) ? res[0] : res;
    return {
      currency: "USDT",
      balance: Number(row?.total || row?.available || 0),
      available: Number(row?.available || row?.total || 0),
    };
  }

  getPositions(settle = "usdt") {
    return this.request<any[]>("GET", `/futures/${settle}/positions`);
  }

  placeOrder(settle = "usdt", order: Record<string, any>) {
    return this.request<any>("POST", `/futures/${settle}/orders`, {}, order);
  }

  async setLeverage(contract: string, leverage: number) {
    return this.request<any>("POST", `/futures/usdt/positions/${encodeURIComponent(contract)}/leverage`, {}, { leverage: String(leverage) });
  }

  async openLong(symbol: string, quantity: number | string, leverage = 5) {
    const contract = symbol.toUpperCase().includes("_") ? symbol.toUpperCase() : `${symbol.toUpperCase().replace(/USDT$/, "")}_USDT`;
    await this.setLeverage(contract, leverage);
    return this.placeOrder("usdt", { contract, size: String(Math.abs(Number(quantity))), price: "0", tif: "ioc" });
  }

  async openShort(symbol: string, quantity: number | string, leverage = 5) {
    const contract = symbol.toUpperCase().includes("_") ? symbol.toUpperCase() : `${symbol.toUpperCase().replace(/USDT$/, "")}_USDT`;
    await this.setLeverage(contract, leverage);
    return this.placeOrder("usdt", { contract, size: String(-Math.abs(Number(quantity))), price: "0", tif: "ioc" });
  }

  async closePosition(settle = "usdt", contract: string, size?: string | number) {
    const positions = await this.getPositions(settle);
    const found = positions.find((p: any) => p.contract === contract || p.symbol === contract);
    const currentSize = Number(size ?? found?.size ?? 0);
    if (!currentSize) return { success: true, message: "无持仓可平" };
    return this.placeOrder(settle, { contract, size: String(currentSize > 0 ? -Math.abs(currentSize) : Math.abs(currentSize)), price: "0", tif: "ioc", reduce_only: true });
  }

  async closeAllPositions(symbol?: string) {
    const positions = await this.getPositions("usdt");
    const filtered = symbol
      ? positions.filter((p: any) => p.contract === symbol || p.contract === `${symbol.toUpperCase().replace(/USDT$/, "")}_USDT`)
      : positions;
    const results = [] as any[];
    for (const pos of filtered) {
      const size = Number(pos.size ?? 0);
      if (!size) continue;
      results.push(await this.placeOrder("usdt", { contract: pos.contract, size: String(size > 0 ? -Math.abs(size) : Math.abs(size)), price: "0", tif: "ioc", reduce_only: true }));
    }
    return results;
  }
}

export function createGateService(creds: GateCredentials) {
  return new GateService(creds);
}
