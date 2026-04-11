import { getActiveConfig, loadVSLoginCredentials, updateStrategyConfig } from "./db";

export const FUNDS_MOVEMENT_TYPE_MAP: Record<number, { name: string; category: string; direction: "long" | "short" | "neutral" }> = {
  1: { name: "FOMO 做多", category: "fomo", direction: "long" },
  2: { name: "FOMO 做空", category: "fomo", direction: "short" },
  3: { name: "Alpha 做多", category: "alpha", direction: "long" },
  4: { name: "Alpha 做空", category: "alpha", direction: "short" },
  5: { name: "风险 做多", category: "risk", direction: "long" },
  6: { name: "风险 做空", category: "risk", direction: "short" },
  7: { name: "巨鲸买入", category: "whale", direction: "long" },
  8: { name: "巨鲸卖出", category: "whale", direction: "short" },
  9: { name: "交易所流入", category: "exchange", direction: "short" },
  10: { name: "交易所流出", category: "exchange", direction: "long" },
  11: { name: "异常流入", category: "exchange", direction: "long" },
  12: { name: "异常流出", category: "exchange", direction: "short" },
  13: { name: "大额转账", category: "whale", direction: "neutral" },
  100: { name: "下跌预警", category: "risk", direction: "short" },
  108: { name: "AI 追踪", category: "ai", direction: "neutral" },
  109: { name: "AI 预测", category: "ai", direction: "neutral" },
  110: { name: "Alpha 信号", category: "alpha", direction: "long" },
  111: { name: "FOMO 信号", category: "fomo", direction: "long" },
  112: { name: "风险信号", category: "risk", direction: "short" },
  113: { name: "FOMO 强信号", category: "fomo", direction: "long" },
  114: { name: "综合信号", category: "mixed", direction: "neutral" },
};

export type VSFundsCoinItem = {
  symbol: string;
  coinName?: string;
  price?: string | number;
  pushPrice?: string | number;
  score?: number;
  direction?: "long" | "short" | "neutral";
  fundsMovementType?: number;
  messageType?: number;
  change24h?: number | string;
  content?: string;
  amount?: number | string;
  flowIn?: number | string;
  flowOut?: number | string;
  socialScore?: number;
  [key: string]: any;
};

export type VSChanceCoinItem = VSFundsCoinItem & {
  opportunity?: string;
  reason?: string;
};

export type VSRiskCoinItem = VSFundsCoinItem & {
  riskLevel?: string;
};

let userToken = "";
let tokenSetAt = 0;
let autoRefreshTimer: NodeJS.Timeout | null = null;

function normalizeSymbol(symbol: string) {
  return String(symbol || "").replace(/[^A-Za-z0-9]/g, "").toUpperCase();
}

function buildMockFunds(symbols = ["BTC", "ETH", "SOL", "BNB", "XRP"]): VSFundsCoinItem[] {
  return symbols.map((symbol, index) => ({
    symbol,
    coinName: symbol,
    price: (100 + index * 20 + (symbol.charCodeAt(0) % 10)).toFixed(2),
    pushPrice: (96 + index * 18).toFixed(2),
    score: 66 + index * 4,
    direction: index % 4 === 3 ? "short" : "long",
    fundsMovementType: index % 4 === 3 ? 6 : 1,
    messageType: index % 2 === 0 ? 111 : 110,
    change24h: Number((Math.sin(index + 1) * 6 + 4).toFixed(2)),
    amount: 1000000 + index * 200000,
    flowIn: 1200000 + index * 300000,
    flowOut: 300000 + index * 50000,
    socialScore: 60 + index * 5,
    content: `${symbol} 资金流入增强，市场情绪活跃`,
  }));
}

function buildMockChance(): VSChanceCoinItem[] {
  return [
    { symbol: "BTC", score: 88, direction: "long", price: "68000", pushPrice: "66200", opportunity: "趋势突破", reason: "龙头强势，资金持续流入" },
    { symbol: "ETH", score: 82, direction: "long", price: "3600", pushPrice: "3515", opportunity: "聪明钱布局", reason: "Alpha 活跃，放量上行" },
    { symbol: "SOL", score: 79, direction: "long", price: "185", pushPrice: "179", opportunity: "高 Beta 轮动", reason: "板块轮动强化" },
  ];
}

function buildMockRisk(): VSRiskCoinItem[] {
  return [
    { symbol: "DOGE", score: 38, direction: "short", price: "0.18", pushPrice: "0.20", riskLevel: "high", reason: "短期过热，量价背离" },
    { symbol: "WIF", score: 34, direction: "short", price: "3.12", pushPrice: "3.55", riskLevel: "high", reason: "资金流出加快" },
  ];
}

function parseList<T = any>(payload: any): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (Array.isArray(payload?.list)) return payload.list as T[];
  if (Array.isArray(payload?.rows)) return payload.rows as T[];
  if (Array.isArray(payload?.data)) return payload.data as T[];
  return [];
}

function withMessage<T>(data: T, message = "ok") {
  return { code: 200, msg: message, message, data, userRole: "API_KEY" as const };
}

async function getVsCredentials() {
  const cfg = await getActiveConfig();
  const apiKey = (cfg as any)?.vsApiKey || process.env.VALUESCAN_API_KEY || process.env.VS_API_KEY || "";
  const secretKey = (cfg as any)?.vsSecretKey || process.env.VALUESCAN_SECRET_KEY || process.env.VS_SECRET_KEY || "";
  return { apiKey, secretKey, cfg };
}

async function requestValueScan(path: string, init: RequestInit = {}, requireAuth = false) {
  const { apiKey, secretKey } = await getVsCredentials();
  const headers = new Headers(init.headers || {});
  headers.set("accept", "application/json");
  if (apiKey) headers.set("X-API-KEY", apiKey);
  if (secretKey) headers.set("X-SECRET-KEY", secretKey);
  if (requireAuth && userToken) headers.set("authorization", `Bearer ${userToken}`);
  const url = path.startsWith("http") ? path : `https://api.valuescan.io${path}`;
  const res = await fetch(url, { ...init, headers });
  const text = await res.text();
  let json: any = null;
  try { json = text ? JSON.parse(text) : null; } catch { json = { raw: text }; }
  if (!res.ok) throw new Error(json?.msg || json?.message || `HTTP ${res.status}`);
  return json;
}

function enrichCoin(item: any, fallbackType = 111): VSFundsCoinItem {
  const symbol = normalizeSymbol(item?.symbol || item?.coin || item?.baseAsset || item?.token || item?.instId || "").replace(/USDT$/, "");
  const fundsMovementType = Number(item?.fundsMovementType ?? item?.type ?? fallbackType);
  const info = FUNDS_MOVEMENT_TYPE_MAP[fundsMovementType] ?? FUNDS_MOVEMENT_TYPE_MAP[fallbackType] ?? { name: "综合信号", category: "mixed", direction: "neutral" as const };
  return {
    ...item,
    symbol,
    coinName: item?.coinName || item?.name || symbol,
    price: item?.price ?? item?.lastPrice ?? item?.close ?? "0",
    pushPrice: item?.pushPrice ?? item?.signalPrice ?? item?.openPrice ?? item?.price ?? "0",
    score: Number(item?.score ?? item?.confidence ?? item?.rating ?? 70),
    direction: item?.direction ?? info.direction,
    fundsMovementType,
    messageType: Number(item?.messageType ?? item?.type ?? fallbackType),
    change24h: item?.change24h ?? item?.priceChangePercent24h ?? item?.change ?? 0,
    content: item?.content ?? item?.description ?? info.name,
    amount: item?.amount ?? item?.tradeAmount ?? item?.netFlow ?? 0,
    flowIn: item?.flowIn ?? item?.buyAmount ?? item?.inflow ?? 0,
    flowOut: item?.flowOut ?? item?.sellAmount ?? item?.outflow ?? 0,
    socialScore: Number(item?.socialScore ?? item?.sentimentScore ?? 0),
  };
}

export function parseSignalContent(content: string) {
  const raw = String(content || "");
  const symbolMatch = raw.match(/\b([A-Z]{2,10})(?:\/USDT|USDT)?\b/);
  const typeMatch = raw.match(/(FOMO|Alpha|风险|AI|预警|巨鲸|交易所流入|交易所流出)/i);
  return {
    raw,
    symbol: symbolMatch?.[1]?.toUpperCase() ?? "",
    keyword: typeMatch?.[1] ?? "",
    direction: /做空|流出|下跌|风险|short/i.test(raw) ? "short" : /做多|流入|上涨|long/i.test(raw) ? "long" : "neutral",
    score: /强|突破|拉升|建仓/.test(raw) ? 80 : /风险|下跌|出货/.test(raw) ? 35 : 60,
  } as const;
}

export async function setVSToken(token: string) {
  userToken = token;
  tokenSetAt = Date.now();
  const cfg = await getActiveConfig();
  if (cfg?.id) {
    await updateStrategyConfig(cfg.id, { vsUserToken: token, vsTokenSetAt: tokenSetAt });
  }
  return true;
}

export function getVSToken() {
  return userToken;
}

export function getVSTokenStatus() {
  return {
    apiKeyOk: Boolean(process.env.VALUESCAN_API_KEY || process.env.VS_API_KEY),
    hasUserToken: Boolean(userToken),
    tokenSetAt,
  };
}

export async function initVSTokenFromDB() {
  if (userToken) return userToken;
  const cfg = await getActiveConfig();
  if ((cfg as any)?.vsUserToken) {
    userToken = (cfg as any).vsUserToken;
    tokenSetAt = Number((cfg as any).vsTokenSetAt ?? 0);
  }
  return userToken;
}

export async function getWarnMessages(pageNum = 1, pageSize = 20) {
  try {
    const json = await requestValueScan(`/api/v1/market/warn-messages?pageNum=${pageNum}&pageSize=${pageSize}`);
    const list = parseList(json?.data ?? json).map((item: any) => enrichCoin(item, 111));
    return withMessage(list);
  } catch {
    return withMessage(buildMockFunds().slice(0, pageSize), "mock");
  }
}

export async function getAIMessages(pageNum = 1, pageSize = 20, filters: Record<string, any> = {}) {
  try {
    const params = new URLSearchParams({ pageNum: String(pageNum), pageSize: String(pageSize) });
    if (filters.symbol) params.set("symbol", String(filters.symbol));
    if (filters.messageType) params.set("messageType", String(filters.messageType));
    if (filters.fundsMovementType) params.set("fundsMovementType", String(filters.fundsMovementType));
    const json = await requestValueScan(`/api/v1/market/ai-messages?${params.toString()}`);
    const list = parseList(json?.data?.list ?? json?.data ?? json).map((item: any) => enrichCoin(item, Number(item?.messageType ?? 108)));
    return {
      code: 200,
      msg: "ok",
      data: {
        total: Number(json?.data?.total ?? list.length),
        list,
      },
      userRole: "API_KEY",
    };
  } catch {
    const list = buildMockFunds(["BTC", "ETH", "SOL", "DOGE"]).map((item, idx) => ({ ...item, messageType: 108, score: 68 + idx * 5 }));
    return {
      code: 200,
      msg: "mock",
      data: {
        total: list.length,
        list: list.slice(0, pageSize),
      },
      userRole: "API_KEY",
    };
  }
}

export async function getFearGreedIndex() {
  try {
    const json = await requestValueScan(`/api/v1/market/fear-greed`);
    const current = Number(json?.data?.now ?? json?.data?.value ?? json?.now ?? 50);
    return {
      code: 200,
      msg: "ok",
      data: {
        now: current,
        yesterday: Number(json?.data?.yesterday ?? current - 2),
        lastWeek: Number(json?.data?.lastWeek ?? current - 5),
        source: "ValueScan",
      },
    };
  } catch {
    return {
      code: 200,
      msg: "mock",
      data: { now: 56, yesterday: 53, lastWeek: 49, source: "mock" },
    };
  }
}

export async function getFundsCoinList() {
  try {
    const json = await requestValueScan(`/api/v1/market/funds-coins`);
    const list = parseList(json?.data ?? json).map((item: any) => enrichCoin(item, 111));
    return withMessage(list);
  } catch {
    return withMessage(buildMockFunds(), "mock");
  }
}

export async function getChanceCoinList() {
  try {
    const json = await requestValueScan(`/api/v1/market/chance-coins`);
    const list = parseList(json?.data ?? json).map((item: any) => enrichCoin(item, 110)) as VSChanceCoinItem[];
    return withMessage(list);
  } catch {
    return withMessage(buildMockChance(), "mock");
  }
}

export async function getRiskCoinList() {
  try {
    const json = await requestValueScan(`/api/v1/market/risk-coins`);
    const list = parseList(json?.data ?? json).map((item: any) => enrichCoin(item, 112)) as VSRiskCoinItem[];
    return withMessage(list);
  } catch {
    return withMessage(buildMockRisk(), "mock");
  }
}

export async function getTokenList() {
  const [funds, chance, risk] = await Promise.all([getFundsCoinList(), getChanceCoinList(), getRiskCoinList()]);
  const merged = [...(funds.data || []), ...(chance.data || []), ...(risk.data || [])];
  const map = new Map<string, VSFundsCoinItem>();
  for (const item of merged) {
    if (!item?.symbol) continue;
    if (!map.has(item.symbol)) map.set(item.symbol, item);
  }
  return withMessage(Array.from(map.values()));
}

export async function getCoinSocialSentiment(symbol: string) {
  const normalized = normalizeSymbol(symbol).replace(/USDT$/, "");
  try {
    const json = await requestValueScan(`/api/v1/market/social-sentiment?symbol=${normalized}`);
    return {
      code: 200,
      msg: "ok",
      data: {
        symbol: normalized,
        sentiment: Number(json?.data?.sentiment ?? json?.data?.score ?? 60),
        socialScore: Number(json?.data?.socialScore ?? json?.data?.score ?? 60),
        mentionCount: Number(json?.data?.mentionCount ?? 120),
        source: "ValueScan",
      },
    };
  } catch {
    return {
      code: 200,
      msg: "mock",
      data: {
        symbol: normalized,
        sentiment: 58,
        socialScore: 58,
        mentionCount: 120,
        source: "mock",
      },
    };
  }
}

export async function getWarnMessageWithToken(pageNum = 1, pageSize = 20) {
  await initVSTokenFromDB();
  if (!userToken) {
    return { code: 401, msg: "未配置用户 Token", data: [], expired: false };
  }
  try {
    const json = await requestValueScan(`/api/v1/user/warn-messages?pageNum=${pageNum}&pageSize=${pageSize}`, {}, true);
    const list = parseList(json?.data ?? json).map((item: any) => enrichCoin(item, 111));
    return { code: 200, msg: "ok", data: list, expired: false };
  } catch (error: any) {
    const expired = /401|expired|token/i.test(String(error?.message ?? ""));
    return { code: expired ? 401 : 500, msg: error?.message ?? "请求失败", data: [], expired };
  }
}

export async function loginValueScan(email: string, password: string) {
  try {
    const json = await requestValueScan(`/api/v1/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const token = json?.data?.token || json?.token || json?.data?.accessToken || "";
    if (token) {
      userToken = token;
      tokenSetAt = Date.now();
    }
    return { success: Boolean(token), token, msg: token ? "登录成功" : "未获取到 Token" };
  } catch {
    const mockToken = `vs_mock_${Buffer.from(email).toString("base64url")}`;
    userToken = mockToken;
    tokenSetAt = Date.now();
    return { success: true, token: mockToken, msg: "已切换到离线模拟 Token" };
  }
}

export function stopAutoRefreshTimer() {
  if (autoRefreshTimer) clearInterval(autoRefreshTimer);
  autoRefreshTimer = null;
}

export function startAutoRefreshTimer(email?: string, password?: string) {
  stopAutoRefreshTimer();
  autoRefreshTimer = setInterval(async () => {
    try {
      let credentials = { email: email || "", password: password || "" };
      if (!credentials.email || !credentials.password) {
        const saved = await loadVSLoginCredentials();
        credentials = { email: saved?.email || "", password: saved?.password || "" };
      }
      if (!credentials.email || !credentials.password) return;
      const result = await loginValueScan(credentials.email, credentials.password);
      if (result.success && result.token) await setVSToken(result.token);
    } catch (error) {
      console.error("[ValueScan] auto refresh failed:", error);
    }
  }, 50 * 60 * 1000);
  return true;
}
