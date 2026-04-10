/**
 * ValueScan SSE 订阅服务
 * 1. 大盘分析订阅: GET https://stream.valuescan.ai/stream/market/subscribe
 * 2. 代币信号订阅: GET https://stream.valuescan.ai/stream/signal/subscribe
 *
 * 签名算法: sign = HMAC-SHA256(SK, timestamp毫秒 + nonce)
 */
import https from "https";
import { createHmac } from "crypto";
import { ENV } from "./_core/env";
import { getDb } from "./db";
import { marketAnalysis, tokenSignals } from "../drizzle/schema";
import { eq } from "drizzle-orm";

const STREAM_BASE = "https://stream.valuescan.ai";

// ==================== 签名生成 ====================
function buildSSEParams(extraParams: Record<string, string> = {}): string {
  const apiKey = ENV.valueScanApiKey;
  const secretKey = ENV.valueScanSecretKey;
  if (!apiKey || !secretKey) {
    throw new Error("ValueScan API Key 未配置");
  }
  const ts = Date.now();
  const nonce = Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2);
  const sign = createHmac("sha256", secretKey)
    .update(String(ts) + nonce)
    .digest("hex");
  const params = new URLSearchParams({
    apiKey,
    sign,
    timestamp: String(ts),
    nonce,
    ...extraParams,
  });
  return params.toString();
}

// ==================== Telegram 推送 ====================
async function sendToTelegram(message: string): Promise<void> {
  try {
    const db = await getDb();
    if (!db) return;
    const { telegramConfig } = await import("../drizzle/schema");
    const configs = await db.select().from(telegramConfig).limit(1);
    const cfg = configs[0];
    if (!cfg?.isActive || !cfg.botToken || !cfg.chatId) return;

    const url = `https://api.telegram.org/bot${cfg.botToken}/sendMessage`;
    const body = JSON.stringify({
      chat_id: cfg.chatId,
      text: message,
      parse_mode: "HTML",
      disable_web_page_preview: true,
    });
    await new Promise<void>((resolve, reject) => {
      const req = https.request(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) },
      }, (res) => {
        res.resume();
        resolve();
      });
      req.on("error", reject);
      req.write(body);
      req.end();
    });
  } catch {
    // 忽略 Telegram 推送失败
  }
}

// ==================== SSE 通用读取器 ====================
function connectSSE(
  path: string,
  queryString: string,
  onEvent: (eventName: string, data: string) => void,
  onError?: (err: Error) => void
): () => void {
  let destroyed = false;
  let retryCount = 0;

  function connect() {
    if (destroyed) return;
    const url = `${STREAM_BASE}${path}?${queryString}`;
    const urlObj = new URL(url);

    const req = https.request({
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: "GET",
      headers: { Accept: "text/event-stream", "Cache-Control": "no-cache" },
      timeout: 310000, // 310s 超时（SSE 每20s心跳）
    }, (res) => {
      if (res.statusCode !== 200) {
        console.error(`[ValueScan SSE] ${path} HTTP ${res.statusCode}`);
        res.resume();
        scheduleRetry();
        return;
      }
      retryCount = 0;
      let buffer = "";
      let eventName = "";

      res.on("data", (chunk: Buffer) => {
        buffer += chunk.toString("utf8");
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trimEnd();
          if (trimmed.startsWith(":")) {
            // 心跳，忽略
          } else if (trimmed === "") {
            // 空行 = 事件结束
            eventName = "";
          } else if (trimmed.startsWith("event:")) {
            eventName = trimmed.slice(6).trim();
          } else if (trimmed.startsWith("data:")) {
            const data = trimmed.slice(5).trim();
            if (eventName && data) {
              try {
                onEvent(eventName, data);
              } catch (e) {
                console.error("[ValueScan SSE] onEvent error:", e);
              }
            }
          }
        }
      });

      res.on("end", () => {
        if (!destroyed) scheduleRetry();
      });

      res.on("error", (err) => {
        if (!destroyed) {
          console.error("[ValueScan SSE] response error:", err.message);
          scheduleRetry();
        }
      });
    });

    req.on("error", (err) => {
      if (!destroyed) {
        console.error("[ValueScan SSE] request error:", err.message);
        scheduleRetry();
      }
    });

    req.on("timeout", () => {
      req.destroy();
    });

    req.end();
  }

  function scheduleRetry() {
    if (destroyed) return;
    retryCount++;
    const wait = Math.min(2 ** retryCount, 60) * 1000;
    console.log(`[ValueScan SSE] 将在 ${wait / 1000}s 后重连 (第${retryCount}次)...`);
    setTimeout(() => {
      if (!destroyed) {
        // 重新生成签名（旧签名过期）
        try {
          const newQs = queryString.includes("tokens")
            ? buildSSEParams({ tokens: new URLSearchParams(queryString).get("tokens") ?? "" })
            : buildSSEParams();
          queryString = newQs;
        } catch {
          // 忽略签名失败
        }
        connect();
      }
    }, wait);
  }

  connect();
  return () => { destroyed = true; };
}

// ==================== 大盘分析订阅 ====================
let marketSSEStop: (() => void) | null = null;

export function startMarketAnalysisSSE(): void {
  if (marketSSEStop) return; // 已在运行

  const apiKey = ENV.valueScanApiKey;
  const secretKey = ENV.valueScanSecretKey;
  if (!apiKey || !secretKey) {
    console.warn("[ValueScan SSE] 大盘分析订阅：API Key 未配置，跳过");
    return;
  }

  console.log("[ValueScan SSE] 启动大盘分析订阅...");

  let qs: string;
  try {
    qs = buildSSEParams();
  } catch (e) {
    console.error("[ValueScan SSE] 签名失败:", e);
    return;
  }

  marketSSEStop = connectSSE(
    "/stream/market/subscribe",
    qs,
    async (eventName, data) => {
      if (eventName === "connected") {
        console.log("[ValueScan SSE] 大盘分析已连接");
        return;
      }
      if (eventName !== "market") return;

      try {
        const payload = JSON.parse(data) as { ts: number; uniqueId: string; content: string };
        const db = await getDb();
        if (!db) return;

        // 去重插入
        const existing = await db.select({ id: marketAnalysis.id })
          .from(marketAnalysis)
          .where(eq(marketAnalysis.uniqueId, payload.uniqueId))
          .limit(1);
        if (existing.length > 0) return;

        await db.insert(marketAnalysis).values({
          uniqueId: payload.uniqueId,
          ts: payload.ts,
          content: payload.content,
          sentToTelegram: false,
        });

        // 推送 Telegram
        const time = new Date(payload.ts).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" });
        const msg = `📊 <b>AI 大盘解析</b>\n⏰ ${time}\n\n${payload.content.slice(0, 3000)}`;
        await sendToTelegram(msg);

        // 标记已推送
        await db.update(marketAnalysis)
          .set({ sentToTelegram: true })
          .where(eq(marketAnalysis.uniqueId, payload.uniqueId));

        console.log(`[ValueScan SSE] 大盘分析已存储并推送: ${payload.uniqueId}`);
      } catch (e) {
        console.error("[ValueScan SSE] 大盘分析处理失败:", e);
      }
    }
  );
}

export function stopMarketAnalysisSSE(): void {
  if (marketSSEStop) {
    marketSSEStop();
    marketSSEStop = null;
    console.log("[ValueScan SSE] 大盘分析订阅已停止");
  }
}

// ==================== 代币信号订阅 ====================
let tokenSSEStop: (() => void) | null = null;

export function startTokenSignalSSE(tokens = ""): void {
  if (tokenSSEStop) {
    tokenSSEStop();
    tokenSSEStop = null;
  }

  const apiKey = ENV.valueScanApiKey;
  const secretKey = ENV.valueScanSecretKey;
  if (!apiKey || !secretKey) {
    console.warn("[ValueScan SSE] 代币信号订阅：API Key 未配置，跳过");
    return;
  }

  console.log(`[ValueScan SSE] 启动代币信号订阅 tokens=${tokens || "全部"}...`);

  let qs: string;
  try {
    qs = buildSSEParams({ tokens });
  } catch (e) {
    console.error("[ValueScan SSE] 签名失败:", e);
    return;
  }

  tokenSSEStop = connectSSE(
    "/stream/signal/subscribe",
    qs,
    async (eventName, data) => {
      if (eventName === "connected") {
        console.log("[ValueScan SSE] 代币信号已连接");
        return;
      }
      if (eventName !== "signal") return;

      try {
        const payload = JSON.parse(data) as {
          tokenId: number;
          type: "OPPORTUNITY" | "RISK" | "FUNDS";
          content: string;
          ts: number;
          uniqueKey?: string;
        };
        const db = await getDb();
        if (!db) return;

        // 生成唯一键（优先用 payload.uniqueKey，否则用 tokenId+ts 拼接）
        const uniqueKey = payload.uniqueKey ?? `${payload.tokenId}_${payload.ts}`;

        // 去重
        const existing = await db.select({ id: tokenSignals.id })
          .from(tokenSignals)
          .where(eq(tokenSignals.uniqueKey, uniqueKey))
          .limit(1);
        if (existing.length > 0) return;

        // 解析 content
        let contentObj: Record<string, unknown> = {};
        try {
          contentObj = JSON.parse(payload.content);
        } catch {
          contentObj = {};
        }

        const symbol = (contentObj.symbol as string) ?? "";
        const name = (contentObj.name as string) ?? "";
        const price = (contentObj.price as string) ?? "";
        const percentChange24h = (contentObj.percentChange24h as number) ?? 0;
        const scoring = (contentObj.scoring as number) ?? undefined;
        const grade = (contentObj.grade as number) ?? undefined;

        await db.insert(tokenSignals).values({
          uniqueKey,
          tokenId: payload.tokenId,
          type: payload.type,
          symbol,
          name,
          price,
          percentChange24h,
          scoring: scoring ?? null,
          grade: grade ?? null,
          content: payload.content,
          ts: payload.ts,
          sentToTelegram: false,
        });

        // 推送 Telegram
        const typeLabel = payload.type === "OPPORTUNITY" ? "🟢 机会信号" : payload.type === "RISK" ? "🔴 风险信号" : "🟡 资金异动";
        const scoreStr = scoring ? ` 得分: ${scoring.toFixed(0)}` : "";
        const changeStr = percentChange24h ? ` 24h: ${percentChange24h > 0 ? "+" : ""}${percentChange24h.toFixed(2)}%` : "";
        const time = new Date(payload.ts).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" });
        const msg = `${typeLabel}\n💎 <b>${symbol}</b> (${name})\n💰 价格: $${price}${changeStr}${scoreStr}\n⏰ ${time}`;
        await sendToTelegram(msg);

        await db.update(tokenSignals)
          .set({ sentToTelegram: true })
          .where(eq(tokenSignals.uniqueKey, uniqueKey));
        console.log(`[ValueScan SSE] 代币信号已存储: ${payload.type} ${symbol} ${uniqueKey}`);;
      } catch (e) {
        console.error("[ValueScan SSE] 代币信号处理失败:", e);
      }
    }
  );
}

export function stopTokenSignalSSE(): void {
  if (tokenSSEStop) {
    tokenSSEStop();
    tokenSSEStop = null;
    console.log("[ValueScan SSE] 代币信号订阅已停止");
  }
}

export function getSSEStatus(): { market: boolean; token: boolean } {
  return {
    market: marketSSEStop !== null,
    token: tokenSSEStop !== null,
  };
}
