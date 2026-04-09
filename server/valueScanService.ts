/**
 * ValueScan Open API Service
 * 文档: https://claw.valuescan.io/zh-CN/
 * 
 * 认证方式: HMAC-SHA256
 *   X-API-KEY: API Key
 *   X-TIMESTAMP: 13位毫秒时间戳
 *   X-SIGN: HMAC-SHA256(timestamp + rawBody, secretKey) 小写hex
 * 
 * Base URL: https://api.valuescan.io/api/open/v1
 */
import axios from "axios";
import { createHmac } from "crypto";
import { ENV } from "./_core/env";

const VS_BASE_URL = "https://api.valuescan.io/api/open/v1";

// ==================== 签名认证 ====================

/**
 * 生成官方文档规定的 HMAC-SHA256 签名请求头
 * signContent = X-TIMESTAMP + RawBody
 * X-SIGN = HMAC-SHA256(signContent, secretKey) hex lowercase
 */
function buildSignHeaders(rawBody: string): Record<string, string> {
  const apiKey = ENV.valueScanApiKey;
  const secretKey = ENV.valueScanSecretKey;

  if (!apiKey || !secretKey) {
    throw new Error("ValueScan API Key 未配置，请在环境变量中设置 VALUESCAN_API_KEY 和 VALUESCAN_SECRET_KEY");
  }

  const timestamp = String(Date.now());
  const signContent = timestamp + rawBody;
  const sign = createHmac("sha256", secretKey).update(signContent, "utf8").digest("hex");

  return {
    "X-API-KEY": apiKey,
    "X-TIMESTAMP": timestamp,
    "X-SIGN": sign,
    "Content-Type": "application/json; charset=utf-8",
    "Accept": "*/*",
  };
}

/**
 * 发送 POST 请求到 VS Open API
 */
async function vsPost<T = any>(path: string, body: object = {}): Promise<T> {
  const rawBody = JSON.stringify(body);
  const headers = buildSignHeaders(rawBody);
  const response = await axios.post(`${VS_BASE_URL}${path}`, rawBody, {
    headers,
    timeout: 15000,
  });
  return response.data as T;
}

// ==================== 资金异常信号 ====================

/**
 * 资金异常代币列表（Flow anomaly list）
 * 路径: /open/v1/ai/getFundsCoinList
 * 每5分钟更新，含 alpha/fomo 标志
 */
export async function getFundsCoinList(): Promise<VSOpenApiResponse<VSFundsCoinItem[]>> {
  return vsPost("/ai/getFundsCoinList", {});
}

/**
 * 资金异常消息列表（Flow anomaly messages）
 * 路径: /open/v1/ai/getFundsCoinMessageList
 * 需要 vsTokenId
 */
export async function getFundsCoinMessageList(vsTokenId: number, tradeType: 1 | 2 = 1): Promise<VSOpenApiResponse<VSFundsMessageItem[]>> {
  return vsPost("/ai/getFundsCoinMessageList", { vsTokenId, tradeType });
}

// ==================== 机会代币信号 ====================

/**
 * 机会代币列表（Opportunity token list）
 * 路径: /open/v1/ai/getChanceCoinList
 * AI 排名的上行机会代币
 */
export async function getChanceCoinList(): Promise<VSOpenApiResponse<VSChanceCoinItem[]>> {
  return vsPost("/ai/getChanceCoinList", {});
}

/**
 * 机会代币消息（Opportunity token messages）
 * 路径: /open/v1/ai/getChanceCoinMessageList
 */
export async function getChanceCoinMessageList(vsTokenId: number): Promise<VSOpenApiResponse<VSChanceMessageItem[]>> {
  return vsPost("/ai/getChanceCoinMessageList", { vsTokenId });
}

// ==================== 风险代币信号 ====================

/**
 * 风险代币列表（Risk token list）
 * 路径: /open/v1/ai/getRiskCoinList
 * AI 排名的下行风险代币
 */
export async function getRiskCoinList(): Promise<VSOpenApiResponse<VSRiskCoinItem[]>> {
  return vsPost("/ai/getRiskCoinList", {});
}

/**
 * 风险代币消息（Risk token messages）
 * 路径: /open/v1/ai/getRiskCoinMessageList
 */
export async function getRiskCoinMessageList(vsTokenId: number): Promise<VSOpenApiResponse<VSRiskMessageItem[]>> {
  return vsPost("/ai/getRiskCoinMessageList", { vsTokenId });
}

// ==================== 支撑阻力 & 鲸鱼 ====================

/**
 * 支撑阻力（Support & resistance）
 * 路径: /open/v1/ai/getSupportResistance
 */
export async function getSupportResistance(vsTokenId: number): Promise<VSOpenApiResponse<any>> {
  return vsPost("/ai/getSupportResistance", { vsTokenId });
}

/**
 * 鲸鱼行为指标（Whale behavior indicator）
 * 路径: /open/v1/ai/getWhaleBehaviorIndicator
 */
export async function getWhaleBehaviorIndicator(vsTokenId: number): Promise<VSOpenApiResponse<any>> {
  return vsPost("/ai/getWhaleBehaviorIndicator", { vsTokenId });
}

// ==================== 社交情绪 ====================

/**
 * 社交情绪（Social sentiment）
 * 路径: /open/v1/social-sentiment/getCoinSocialSentiment
 */
export async function getCoinSocialSentiment(vsTokenId: number): Promise<VSOpenApiResponse<VSSocialSentiment>> {
  return vsPost("/social-sentiment/getCoinSocialSentiment", { vsTokenId });
}

// ==================== 代币信息 ====================

/**
 * 代币列表（Token list）
 * 路径: /open/v1/vs-token/list
 */
export async function getTokenList(search?: string): Promise<VSOpenApiResponse<VSTokenItem[]>> {
  return vsPost("/vs-token/list", search ? { search } : {});
}

/**
 * 代币详情（Token details）
 * 路径: /open/v1/vs-token/detail
 */
export async function getTokenDetail(vsTokenId: number): Promise<VSOpenApiResponse<any>> {
  return vsPost("/vs-token/detail", { vsTokenId });
}

// ==================== K线数据 ====================

/**
 * K线数据
 * 路径: /open/v1/kline/getKlineData
 */
export async function getKlineData(vsTokenId: number, timeParticle: number, limit?: number): Promise<VSOpenApiResponse<any[]>> {
  return vsPost("/kline/getKlineData", { vsTokenId, timeParticle, limit: limit || 100 });
}

// ==================== 工具函数 ====================

/**
 * fundsMovementType 映射（与官方文档对应）
 */
export const FUNDS_MOVEMENT_TYPE_MAP: Record<number, { name: string; nameEn: string; direction: "long" | "short" | "neutral"; category: "fomo" | "alpha" | "risk" | "whale" | "exchange" | "ai" }> = {
  1: { name: "FOMO 做多", nameEn: "FOMO Long", direction: "long", category: "fomo" },
  2: { name: "FOMO 做空", nameEn: "FOMO Short", direction: "short", category: "fomo" },
  3: { name: "Alpha 做多", nameEn: "Alpha Long", direction: "long", category: "alpha" },
  4: { name: "Alpha 做空", nameEn: "Alpha Short", direction: "short", category: "alpha" },
  5: { name: "风险 做多", nameEn: "Risk Long", direction: "long", category: "risk" },
  6: { name: "风险 做空", nameEn: "Risk Short", direction: "short", category: "risk" },
  7: { name: "巨鲸买入", nameEn: "Whale Buy", direction: "long", category: "whale" },
  8: { name: "巨鲸卖出", nameEn: "Whale Sell", direction: "short", category: "whale" },
  9: { name: "交易所流入", nameEn: "Exchange Inflow", direction: "short", category: "exchange" },
  10: { name: "交易所流出", nameEn: "Exchange Outflow", direction: "long", category: "exchange" },
  11: { name: "资金异常流入", nameEn: "Fund Inflow", direction: "long", category: "exchange" },
  12: { name: "资金异常流出", nameEn: "Fund Outflow", direction: "short", category: "exchange" },
  13: { name: "大额转账", nameEn: "Large Transfer", direction: "neutral", category: "whale" },
};

/**
 * 将 VSFundsCoinItem 转换为前端信号格式
 */
export function fundsCoinToSignal(item: VSFundsCoinItem): ParsedSignal {
  let fmType = 11;
  if (item.alpha && item.fomo) fmType = 1;
  else if (item.alpha) fmType = 3;
  else if (item.fomo) fmType = 1;
  else if (item.fomoEscalation) fmType = 1;
  if (item.tradeType === 2) {
    // perp 做空方向
    if (fmType % 2 === 1) fmType = fmType + 1;
  }

  const typeInfo = FUNDS_MOVEMENT_TYPE_MAP[fmType] || {
    name: "资金异常",
    nameEn: "Fund Anomaly",
    direction: "neutral" as const,
    category: "exchange" as const,
  };

  return {
    id: item.vsTokenId,
    type: 108,
    messageType: 3,
    title: item.alpha ? "Alpha 信号" : item.fomo ? "FOMO 信号" : item.fomoEscalation ? "FOMO 升温" : "资金异常",
    fundsMovementType: fmType,
    signalName: typeInfo.name,
    signalNameEn: typeInfo.nameEn,
    direction: typeInfo.direction,
    category: typeInfo.category,
    symbol: item.symbol,
    price: parseFloat(item.price || "0"),
    percentChange24h: parseFloat(item.percentChange24h || "0"),
    icon: "",
    tradeType: item.tradeType,
    updateTime: new Date(item.updateTime).toISOString(),
    createTime: item.updateTime,
    isRead: false,
    observe: false,
    keyword: 0,
    rawContent: item,
    alpha: item.alpha,
    fomo: item.fomo,
    fomoEscalation: item.fomoEscalation,
    gains: item.gains,
    decline: item.decline,
    number24h: item.number24h,
    bullishRatio: typeof item.bullishRatio === "number" ? item.bullishRatio : undefined,
  };
}

// ==================== 旧接口兼容层（保持向后兼容） ====================

/**
 * @deprecated 使用 getFundsCoinList 替代
 * 获取实时预警信号（兼容旧代码）
 */
export async function getWarnMessages(pageNum = 1, _pageSize = 20): Promise<VSSignalResponse> {
  if (pageNum > 1) return { code: 200, data: [], msg: "no more data" };
  const resp = await getFundsCoinList();
  if (resp.code === 200 && resp.data) {
    const list = resp.data.map(item => ({
      id: item.vsTokenId,
      type: 108,
      messageType: 3,
      title: item.alpha ? "Alpha 信号" : item.fomo ? "FOMO 信号" : "资金异常",
      content: JSON.stringify({
        fundsMovementType: item.alpha ? 3 : item.fomo ? 1 : 11,
        symbol: item.symbol,
        price: parseFloat(item.price || "0"),
        percentChange24h: parseFloat(item.percentChange24h || "0"),
        tradeType: item.tradeType,
        updateTime: new Date(item.updateTime).toISOString(),
        alpha: item.alpha,
        fomo: item.fomo,
        fomoEscalation: item.fomoEscalation,
        bullishRatio: item.bullishRatio,
        gains: item.gains,
        number24h: item.number24h,
      }),
      isRead: false,
      param: "",
      createTime: item.updateTime,
      observe: false,
      keyword: 0,
    }));
    return { code: 200, data: list, msg: "success" };
  }
  return { code: resp.code, data: [], msg: resp.message || "error" };
}

/**
 * @deprecated 使用 getFundsCoinList 替代
 */
export async function getFundsMovementPage(_pageNum = 1, _pageSize = 20): Promise<any> {
  const resp = await getFundsCoinList();
  return {
    code: resp.code,
    msg: resp.message,
    data: {
      list: resp.data || [],
      total: resp.data?.length || 0,
    },
  };
}

/**
 * @deprecated 使用 getChanceCoinList 替代
 */
export async function getAIMessages(pageNum = 1, _pageSize = 20, _filters?: any): Promise<VSPageResponse> {
  if (pageNum > 1) return { code: 200, data: { total: 0, list: [] }, msg: "no more data" };
  const [chance, risk] = await Promise.all([getChanceCoinList(), getRiskCoinList()]);
  const chanceList = (chance.data || []).map(item => ({
    id: item.vsTokenId,
    type: 108,
    messageType: 1,
    title: `机会信号: ${item.symbol}`,
    content: JSON.stringify({ symbol: item.symbol, price: item.price, percentChange24h: item.percentChange24h, score: item.score }),
    isRead: false,
    param: "",
    createTime: item.updateTime || Date.now(),
    observe: false,
    keyword: 0,
  }));
  const riskList = (risk.data || []).map(item => ({
    id: item.vsTokenId,
    type: 108,
    messageType: 2,
    title: `风险信号: ${item.symbol}`,
    content: JSON.stringify({ symbol: item.symbol, price: item.price, percentChange24h: item.percentChange24h, score: item.score }),
    isRead: false,
    param: "",
    createTime: item.updateTime || Date.now(),
    observe: false,
    keyword: 0,
  }));
  const list = [...chanceList, ...riskList];
  return { code: 200, data: { total: list.length, list }, msg: "success" };
}

/**
 * @deprecated 恐惧贪婪指数 - 暂无官方接口，返回模拟数据
 */
export async function getFearGreedIndex(): Promise<VSFearGreedResponse> {
  // 官方 Open API 暂无恐惧贪婪指数接口，返回占位数据
  return {
    code: 200,
    data: { id: 0, now: 0, yesterday: "0", lastWeek: "0", lastMonth: "0", crawlDate: "" },
    msg: "no data",
  };
}

// ==================== 用户 Token 管理（内存 + 数据库双层存储）====================

import { saveVSToken as dbSaveVSToken, loadVSToken as dbLoadVSToken } from './db';

/** 内存中存储的用户 Token（快速读取） */
let _vsUserToken: string | null = process.env.VALUESCAN_USER_TOKEN || null;
let _vsUserTokenSetAt: number = _vsUserToken ? Date.now() : 0;
let _tokenLoaded = false;

/** 启动时从数据库加载 Token（如果内存中没有） */
export async function initVSTokenFromDB(): Promise<void> {
  if (_tokenLoaded) return;
  _tokenLoaded = true;
  if (_vsUserToken) return; // 环境变量优先
  try {
    const saved = await dbLoadVSToken();
    if (saved && saved.token) {
      _vsUserToken = saved.token;
      _vsUserTokenSetAt = saved.setAt;
      console.log(`[ValueScan] Token loaded from DB, set at ${new Date(saved.setAt).toISOString()}`);
    }
  } catch (e) {
    console.warn('[ValueScan] Failed to load token from DB:', e);
  }
}

/**
 * 设置用户 Token（用于 warnMessage 等需要会员权限的接口）
 * 同时将 Token 持久化到数据库
 */
export async function setVSToken(token: string): Promise<void> {
  _vsUserToken = token;
  _vsUserTokenSetAt = Date.now();
  console.log(`[ValueScan] User token updated at ${new Date().toISOString()}`);
  try {
    await dbSaveVSToken(token);
    console.log('[ValueScan] Token persisted to DB');
  } catch (e) {
    console.warn('[ValueScan] Failed to persist token to DB:', e);
  }
}

/**
 * 获取用户 Token
 */
export function getVSToken(): string | null {
  return _vsUserToken;
}

/**
 * Token 状态（用于 VSConnect 页面）
 */
export function getVSTokenStatus(): { configured: boolean; apiKeyOk: boolean; hasUserToken: boolean; tokenSetAt: number } {
  return {
    configured: !!(ENV.valueScanApiKey && ENV.valueScanSecretKey),
    apiKeyOk: !!(ENV.valueScanApiKey && ENV.valueScanSecretKey),
    hasUserToken: !!_vsUserToken,
    tokenSetAt: _vsUserTokenSetAt,
  };
}

/**
 * 使用用户 Token 调用 warnMessage 接口（Bearer 认证）
 * 接口路径: /api/open/v1/ai/getWarnMessage
 * 认证方式: Authorization: Bearer {token}（不是 HMAC 签名）
 */
export async function getWarnMessageWithToken(pageNum = 1, pageSize = 20): Promise<{ code: number; data: any[]; msg: string; expired?: boolean }> {
  const token = _vsUserToken;
  if (!token) {
    return { code: 4001, data: [], msg: "未配置用户 Token，请在 VS 连接页面配置" };
  }

  try {
    const response = await axios.post(
      `${VS_BASE_URL}/ai/getWarnMessage`,
      { pageNum, pageSize },
      {
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          "Origin": "https://www.valuescan.io",
          "Referer": "https://www.valuescan.io/",
        },
        timeout: 15000,
      }
    );
    const data = response.data;
    if (data.code === 4000) {
      // Token 过期，清除内存和数据库
      console.warn(`[ValueScan] User token expired, clearing token`);
      _vsUserToken = null;
      _vsUserTokenSetAt = 0;
      dbSaveVSToken('').catch(() => {}); // 异步清除数据库中的 Token
      return { code: 4000, data: [], msg: "Token 已过期，请重新配置", expired: true };
    }
    if (data.code === 200 || data.code === 0) {
      return { code: 200, data: data.data || [], msg: "success" };
    }
    return { code: data.code, data: [], msg: data.msg || "error" };
  } catch (e: any) {
    console.error(`[ValueScan] getWarnMessage error:`, e.message);
    return { code: 500, data: [], msg: e.message };
  }
}

/**
 * 解析信号内容（兼容旧代码）
 */
export function parseSignalContent(item: VSRawSignal): ParsedSignal {
  let content: any = {};
  try {
    content = typeof item.content === "string" ? JSON.parse(item.content) : item.content;
  } catch {}

  const fmType = content.fundsMovementType as number;
  const typeInfo = FUNDS_MOVEMENT_TYPE_MAP[fmType] || {
    name: item.title || "未知信号",
    nameEn: "Unknown",
    direction: "neutral" as const,
    category: "ai" as const,
  };

  return {
    id: item.id,
    type: item.type,
    messageType: item.messageType,
    title: item.title,
    fundsMovementType: fmType,
    signalName: typeInfo.name,
    signalNameEn: typeInfo.nameEn,
    direction: typeInfo.direction,
    category: typeInfo.category,
    symbol: content.symbol || "",
    price: content.price || 0,
    percentChange24h: content.percentChange24h || 0,
    icon: content.icon || "",
    tradeType: content.tradeType || 0,
    updateTime: content.updateTime || "",
    createTime: item.createTime,
    isRead: item.isRead,
    observe: item.observe || false,
    keyword: item.keyword || 0,
    rawContent: content,
  };
}

// ==================== TypeScript 类型定义 ====================

/** 官方 Open API 统一响应格式 */
export interface VSOpenApiResponse<T> {
  code: number;
  message: string;
  data: T;
  requestId?: string;
}

/** 资金异常代币（Flow anomaly list） */
export interface VSFundsCoinItem {
  updateTime: number;
  tradeType: number;
  vsTokenId: string;
  symbol: string;
  name: string;
  startTime: number;
  endTime: number;
  number24h: number;
  numberNot24h: number;
  price: string;
  pushPrice: string;
  gains: number;
  decline: number;
  percentChange24h: string;
  marketCap: string;
  alpha: boolean;
  fomo: boolean;
  fomoEscalation: boolean;
  bullishRatio: number | string;
}

/** 资金异常消息（Flow anomaly messages） */
export interface VSFundsMessageItem {
  updateTime: number;
  vsTokenId: string;
  symbol: string;
  name: string;
  tradeType: number;
  price: string;
  percentChange24h: number;
  fundsMovementType: number;
}

/** 机会代币（Opportunity token list） */
export interface VSChanceCoinItem {
  vsTokenId: string;
  symbol: string;
  name?: string;
  price: string;
  maxPrice?: string;
  minPrice?: string;
  percentChange1h?: string;
  percentChange24h: string;
  percentChange7d?: string;
  percentChange30d?: string;
  cost?: string;
  deviation?: string;
  marketCap?: string;
  marketCapRanking?: number;
  score?: number;
  bullishRatio?: number | string;
  bearishRatio?: number | string;
  updateTime?: number;
  pushPrice?: string;
  gains?: number;
  declines?: number;
}

/** 机会代币消息 */
export interface VSChanceMessageItem {
  updateTime: number;
  vsTokenId: string;
  symbol: string;
  name: string;
  chanceMessageType: number;
  scoring: number;
  grade: number;
  price: string;
  percentChange24h: number;
  gains: number;
  decline: number;
}

/** 风险代币（Risk token list） */
export interface VSRiskCoinItem {
  vsTokenId: string;
  symbol: string;
  name?: string;
  price: string;
  percentChange24h?: string;
  marketCap?: string;
  marketCapRanking?: number;
  score?: number;
  bullishRatio?: number | string;
  bearishRatio?: number | string;
  updateTime?: number;
  pushPrice?: string;
  gains?: number;
  declines?: number;
}

/** 风险代币消息 */
export interface VSRiskMessageItem {
  updateTime: number;
  vsTokenId: string;
  symbol: string;
  name: string;
  riskMessageType: number;
  scoring: number;
  grade: number;
  price: string;
  percentChange24h: number;
}

/** 代币列表 */
export interface VSTokenItem {
  id: number;
  symbol: string;
  name: string;
}

/** 社交情绪 */
export interface VSSocialSentiment {
  updateTime: number;
  vsTokenId: string;
  symbol: string;
  name: string;
  bullishRatio: number;
  neutralRatio: number;
  bearishRatio: number;
  bearishContents: Array<{ english: string; updateTime: number }>;
  neutralContents: Array<{ english: string; updateTime: number }>;
  bullishContents: Array<{ english: string; updateTime: number }>;
}

// ==================== 旧类型兼容 ====================

export interface VSRawSignal {
  id: string;
  type: number;
  messageType: number;
  title: string;
  content: string;
  isRead: boolean;
  param: string;
  createTime: number;
  observe: boolean;
  keyword: number;
  tradeType?: number;
}

export interface ParsedSignal {
  id: string;
  type: number;
  messageType: number;
  title: string;
  fundsMovementType: number;
  signalName: string;
  signalNameEn: string;
  direction: "long" | "short" | "neutral";
  category: "fomo" | "alpha" | "risk" | "whale" | "exchange" | "ai";
  symbol: string;
  price: number;
  percentChange24h: number;
  icon: string;
  tradeType: number;
  updateTime: string;
  createTime: number;
  isRead: boolean;
  observe: boolean;
  keyword: number;
  rawContent: any;
  alpha?: boolean;
  fomo?: boolean;
  fomoEscalation?: boolean;
  gains?: number;
  decline?: number;
  number24h?: number;
  bullishRatio?: number;
}

export interface VSSignalResponse {
  code: number;
  data: VSRawSignal[];
  msg: string;
  userRole?: string;
}

export interface VSPageResponse {
  code: number;
  data: {
    total: number;
    list: VSRawSignal[];
    extend?: string;
  };
  msg: string;
  userRole?: string;
}

export interface VSFearGreedResponse {
  code: number;
  data: {
    id: number;
    now: number;
    yesterday: string;
    lastWeek: string;
    lastMonth: string;
    crawlDate: string;
  };
  msg: string;
}

export interface VSFundsMovementItem {
  id: string;
  updateTime: number;
  tradeType: number;
  keyword: number;
  symbol: string;
  beginTime: number;
  endTime: number;
  number24h: number;
  numberNot24h: number;
  price: string;
  beginPrice: string;
  gains: number;
  decline: number;
  favor: boolean;
  percentChange24h: string;
  marketCap: string;
  observe: boolean;
  alpha: boolean;
  fomo: boolean;
  fomoEscalation: boolean;
  icon: string;
  bullishRatio: number;
}

export interface VSFundsMovementResponse {
  code: number;
  msg: string;
  data: {
    list: VSFundsMovementItem[];
    total: number;
  };
}

export interface VSAccountResponse {
  code: number;
  data: any;
  msg: string;
}
