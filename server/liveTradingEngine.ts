// @ts-nocheck
/**
 * 实盘自动交易引擎
 * 逻辑：每60秒轮询 ValueScan 信号 → 评分 → 真实下单（Binance/OKX/Bybit/Gate/Bitget）→ Telegram 推送
 * 与模拟盘引擎并行运行，互不干扰
 */
import { getDb, getActiveConfig, getTelegramConfig } from "./db";
import { trades, positions } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { getFundsCoinList, getChanceCoinList, VSFundsCoinItem, VSChanceCoinItem } from "./valueScanService";
import { createBinanceService } from "./binanceService";
import { createOKXService } from "./okxService";
import { createBybitService } from "./bybitService";
import { createGateService } from "./gateService";
import { createBitgetService } from "./bitgetService";

const BINANCE_BASE = "https://api.binance.com";

// ─── 价格获取 ─────────────────────────────────────────────────────────────────
async function getPrice(symbol: string): Promise<number | null> {
  const attempts = [
    () => fetch(`${BINANCE_BASE}/api/v3/ticker/price?symbol=${symbol.endsWith("USDT") ? symbol : symbol + "USDT"}`)
      .then(r => r.ok ? r.json() as Promise<{ price: string }> : null)
      .then(d => d ? parseFloat(d.price) : null),
    () => fetch(`https://www.okx.com/api/v5/market/ticker?instId=${symbol.endsWith("USDT") ? symbol.replace("USDT", "") + "-USDT-SWAP" : symbol + "-USDT-SWAP"}`)
      .then(r => r.ok ? r.json() as Promise<any> : null)
      .then(d => d?.data?.[0]?.last ? parseFloat(d.data[0].last) : null),
  ];
  for (const attempt of attempts) {
    try {
      const price = await attempt();
      if (price && price > 0) return price;
    } catch {}
  }
  return null;
}

// ─── Telegram 推送 ────────────────────────────────────────────────────────────
async function sendTg(message: string): Promise<void> {
  try {
    const cfg = await getTelegramConfig();
    if (!cfg?.botToken || !cfg?.chatId) return;
    await fetch(`https://api.telegram.org/bot${cfg.botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: cfg.chatId, text: message, parse_mode: "HTML" }),
    });
  } catch (e: any) {
    console.error("[LiveTrading] Telegram 推送失败:", e.message);
  }
}

// ─── 信号评分（与模拟盘相同逻辑） ─────────────────────────────────────────────
function evaluateVSSignal(item: VSFundsCoinItem): {
  shouldTrade: boolean;
  direction: "long" | "short";
  score: number;
  reason: string;
} {
  const isAlpha = item.alpha === true;
  const isFomo = item.fomo === true;
  const isFomoEscalation = item.fomoEscalation === true;
  const gains = item.gains ?? 0;
  const decline = item.decline ?? 0;
  const isShortSignal = item.tradeType === 2;

  if (isAlpha && (isFomo || isFomoEscalation)) {
    return { shouldTrade: true, direction: isShortSignal ? "short" : "long", score: 82, reason: `Alpha+${isFomoEscalation ? "FOMO升温" : "FOMO"}双标记 (gains:${gains.toFixed(1)}%)` };
  }
  if (isAlpha && !isShortSignal) {
    return { shouldTrade: true, direction: "long", score: 72, reason: `Alpha信号 做多方向 涨幅${gains.toFixed(1)}%` };
  }
  if (isFomoEscalation && !isShortSignal) {
    return { shouldTrade: true, direction: "long", score: 70, reason: `FOMO升温信号 做多方向` };
  }
  if (isAlpha && isShortSignal) {
    return { shouldTrade: true, direction: "short", score: 68, reason: `Alpha做空信号 跌幅${decline.toFixed(1)}%` };
  }
  if (isFomo && !isShortSignal) {
    return { shouldTrade: true, direction: "long", score: 65, reason: `FOMO信号 做多方向` };
  }
  return { shouldTrade: false, direction: "long", score: 0, reason: "未满足任何策略条件" };
}

// ─── 实盘下单 ─────────────────────────────────────────────────────────────────
async function placeRealOrder(
  symbol: string,
  direction: "long" | "short",
  price: number,
  config: any
): Promise<{ orderId: string; exchange: string; balance: number } | null> {
  const exchange = config.selectedExchange ?? "binance";
  const leverage = config.leverage ?? 5;
  const positionPercent = config.autoTradingPositionPercent ?? 1;
  // 获取账户余额来计算下单量
  let balance = 100; // 默认100 USDT
  try {
    if (exchange === "binance" || exchange === "both" || exchange === "all") {
      const svc = createBinanceService(config.binanceApiKey || process.env.BINANCE_API_KEY || "", config.binanceSecretKey || process.env.BINANCE_SECRET_KEY || "");
      const bal = await svc.getUSDTBalance();
      balance = bal?.available ?? 100;
    } else if (exchange === "okx") {
      const svc = createOKXService(config.okxApiKey || process.env.OKX_API_KEY || "", config.okxSecretKey || process.env.OKX_SECRET_KEY || "", config.okxPassphrase || process.env.OKX_PASSPHRASE || "");
      const bal = await svc.getBalance();
      balance = bal?.available ?? 100;
    }
  } catch {}
  const notional = balance * (positionPercent / 100) * leverage;
  const quantity = notional / price;
  if (quantity <= 0) return null;

  try {
    if (exchange === "binance" || exchange === "both" || exchange === "all") {
      const svc = createBinanceService(config.binanceApiKey || process.env.BINANCE_API_KEY || "", config.binanceSecretKey || process.env.BINANCE_SECRET_KEY || "");
      const sym = symbol.endsWith("USDT") ? symbol : symbol + "USDT";
      let order;
      if (direction === "long") {
        order = await svc.openLong(sym, parseFloat(quantity.toFixed(3)), leverage);
      } else {
        order = await svc.openShort(sym, parseFloat(quantity.toFixed(3)), leverage);
      }
      return { orderId: order.orderId?.toString() ?? "unknown", exchange: "binance", balance };
    } else if (exchange === "okx") {
      const svc = createOKXService(config.okxApiKey || process.env.OKX_API_KEY || "", config.okxSecretKey || process.env.OKX_SECRET_KEY || "", config.okxPassphrase || process.env.OKX_PASSPHRASE || "");
      const instId = symbol.replace("USDT", "") + "-USDT-SWAP";
      const sz = parseFloat(quantity.toFixed(0));
      let order;
      if (direction === "long") {
        order = await svc.openLong(instId, sz.toString());
      } else {
        order = await svc.openShort(instId, sz.toString());
      }
      return { orderId: order.ordId ?? "unknown", exchange: "okx", balance };
    } else if (exchange === "bybit") {
      const svc = createBybitService({ apiKey: config.bybitApiKey || "", secretKey: config.bybitSecretKey || "" });
      const sym = symbol.endsWith("USDT") ? symbol : symbol + "USDT";
      const qty = parseFloat(quantity.toFixed(3)).toString();
      const side = direction === "long" ? "Buy" : "Sell";
      const order = await svc.placeOrder({ category: "linear", symbol: sym, side, orderType: "Market", qty });
      return { orderId: order?.orderId ?? "unknown", exchange: "bybit", balance };
    }
  } catch (e: any) {
    console.error(`[LiveTrading] 下单失败 (${exchange}):`, e.message);
    return null;
  }
  return null;
}

// ─── 记录实盘交易 ─────────────────────────────────────────────────────────────
async function recordLiveTrade(
  symbol: string,
  direction: "long" | "short",
  price: number,
  quantity: number,
  score: number,
  orderId: string,
  exchange: string,
  config: any
) {
  const db = await getDb();
  if (!db) return;
  const leverage = config.leverage ?? 5;
  const notional = quantity * price / leverage;
  const slPct = config.stopLossPercent ?? 3;
  const tpPct = config.takeProfit1Percent ?? 8;
  const stopLoss = direction === "long" ? price * (1 - slPct / 100) : price * (1 + slPct / 100);
  const takeProfit1 = direction === "long" ? price * (1 + tpPct / 100) : price * (1 - tpPct / 100);
  const action = direction === "long" ? "OPEN_LONG" : "OPEN_SHORT";
  const [result] = await db.insert(trades).values({
    symbol, action, quantity, entryPrice: price,
    stopLoss, takeProfit1, leverage,
    signalScore: score, status: "open",
    binanceOrderId: orderId, isTestnet: false,
  });
  const tradeId = (result as any).insertId;
  // 记录持仓
  try {
    await db.insert(positions).values({
      symbol, quantity, entryPrice: price, currentPrice: price,
      leverage, unrealizedPnl: 0, unrealizedPnlPercent: 0,
      stopLoss, takeProfit1, tradeId,
    });
  } catch {}
  return tradeId;
}

// ─── 主引擎循环 ───────────────────────────────────────────────────────────────
let liveEngineRunning = false;
let liveEngineTimer: ReturnType<typeof setTimeout> | null = null;
let liveLastCycleTime: Date | null = null;
let liveLastSignalCount = 0;
let liveLastOrderTime: Date | null = null;

// 冷却期：同一币种下单后60分钟内不重复下单
const cooldownMap = new Map<string, number>();

export async function runLiveTradingCycle() {
  const config = await getActiveConfig();
  if (!config?.autoTradingEnabled) return;
  const minScore = config.minScoreThreshold ?? 60;
  console.log("[LiveTrading] 开始实盘交易周期...");
  liveLastCycleTime = new Date();

  // 清理过期冷却期
  const now = Date.now();
  for (const [sym, ts] of Array.from(cooldownMap.entries())) {
    if (now - ts > 60 * 60 * 1000) cooldownMap.delete(sym);
  }

  try {
    const [flowData, opportunityData] = await Promise.allSettled([
      getFundsCoinList(),
      getChanceCoinList(),
    ]);
    let signalCount = 0;
    let openedThisCycle = false;

    // 处理资金异常信号
    if (flowData.status === "fulfilled" && flowData.value?.data) {
      const list = Array.isArray(flowData.value.data)
        ? flowData.value.data
        : (flowData.value.data as any)?.list ?? [];
      signalCount += list.length;
      for (const item of list as VSFundsCoinItem[]) {
        if (openedThisCycle) break;
        const sym = (item.symbol || "").replace("USDT", "").replace("/", "");
        if (!sym) continue;
        if (cooldownMap.has(sym)) {
          console.log(`[LiveTrading] ${sym} 在冷却期内，跳过`);
          continue;
        }
        const eval_ = evaluateVSSignal(item);
        if (!eval_.shouldTrade || eval_.score < minScore) {
          console.log(`[LiveTrading] ${sym} 跳过 (评分${eval_.score} < 阈值${minScore})`);
          continue;
        }
        console.log(`[LiveTrading] ✅ ${sym} 触发实盘 (评分${eval_.score}): ${eval_.reason}`);
        const price = await getPrice(sym);
        if (!price || price <= 0) continue;
        const order = await placeRealOrder(sym, eval_.direction, price, config);
        if (order) {
          const notional = (config.autoTradingPositionPercent ?? 1) / 100;
          await recordLiveTrade(sym, eval_.direction, price, notional, eval_.score, order.orderId, order.exchange, config);
          cooldownMap.set(sym, Date.now());
          liveLastOrderTime = new Date();
          openedThisCycle = true;
          // Telegram 通知
          const dirEmoji = eval_.direction === "long" ? "🟢" : "🔴";
          const dirLabel = eval_.direction === "long" ? "做多" : "做空";
          const msg = `${dirEmoji} <b>🔴 实盘开仓 - ${dirLabel}</b>\n\n` +
            `💎 <b>${sym}/USDT</b>\n` +
            `💰 入场价: <b>$${price.toFixed(4)}</b>\n` +
            `📊 评分: <b>${eval_.score.toFixed(0)}/100</b>\n` +
            `🏦 交易所: <b>${order.exchange.toUpperCase()}</b>\n` +
            `💵 账户余额: <b>$${order.balance.toFixed(2)} USDT</b>\n` +
            `🔑 订单ID: ${order.orderId}\n` +
            `📝 ${eval_.reason.substring(0, 80)}\n` +
            `⏰ ${new Date().toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })}`;
          await sendTg(msg);
        } else {
          // 下单失败也通知
          const msg = `⚠️ <b>实盘下单失败</b>\n\n` +
            `💎 ${sym}/USDT  评分: ${eval_.score}\n` +
            `📝 ${eval_.reason}\n` +
            `⏰ ${new Date().toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })}`;
          await sendTg(msg);
        }
      }
    }

    // 处理机会代币信号
    if (!openedThisCycle && opportunityData.status === "fulfilled" && opportunityData.value?.data) {
      const list = Array.isArray(opportunityData.value.data)
        ? opportunityData.value.data
        : (opportunityData.value.data as any)?.list ?? [];
      signalCount += list.length;
      for (const item of list as VSChanceCoinItem[]) {
        if (openedThisCycle) break;
        const sym = (item.symbol || "").replace("USDT", "").replace("/", "");
        if (!sym || cooldownMap.has(sym)) continue;
        const vsScore = item.score ?? 0;
        if (vsScore < Math.max(minScore, 70)) continue;
        console.log(`[LiveTrading] ✅ 机会代币 ${sym} 评分 ${vsScore}，实盘开仓`);
        const price = await getPrice(sym);
        if (!price || price <= 0) continue;
        const order = await placeRealOrder(sym, "long", price, config);
        if (order) {
          const notional = (config.autoTradingPositionPercent ?? 1) / 100;
          await recordLiveTrade(sym, "long", price, notional, vsScore, order.orderId, order.exchange, config);
          cooldownMap.set(sym, Date.now());
          liveLastOrderTime = new Date();
          openedThisCycle = true;
          const msg = `🟢 <b>🔴 实盘开仓 - 做多</b>\n\n` +
            `💎 <b>${sym}/USDT</b>\n` +
            `💰 入场价: <b>$${price.toFixed(4)}</b>\n` +
            `📊 机会代币评分: <b>${vsScore}/100</b>\n` +
            `🏦 交易所: <b>${order.exchange.toUpperCase()}</b>\n` +
            `💵 账户余额: <b>$${order.balance.toFixed(2)} USDT</b>\n` +
            `⏰ ${new Date().toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })}`;
          await sendTg(msg);
        }
      }
    }
    liveLastSignalCount = signalCount;
    console.log(`[LiveTrading] 本轮信号数: ${signalCount}, 实盘开仓: ${openedThisCycle}`);
  } catch (err) {
    console.error("[LiveTrading] 引擎错误:", err);
  }
}

// ─── 启动/停止引擎 ────────────────────────────────────────────────────────────
export function startLiveTradingEngine() {
  if (liveEngineRunning) return;
  liveEngineRunning = true;
  console.log("[LiveTrading] 实盘引擎启动 ✅");
  const loop = async () => {
    if (!liveEngineRunning) return;
    try {
      await runLiveTradingCycle();
    } catch (err) {
      console.error("[LiveTrading] 引擎循环错误:", err);
    }
    if (liveEngineRunning) {
      liveEngineTimer = setTimeout(loop, 60000); // 每60秒
    }
  };
  loop();
}
export function stopLiveTradingEngine() {
  liveEngineRunning = false;
  if (liveEngineTimer) {
    clearTimeout(liveEngineTimer);
    liveEngineTimer = null;
  }
  console.log("[LiveTrading] 实盘引擎停止 ⛔");
}
export function isLiveEngineRunning() {
  return liveEngineRunning;
}
export function getLiveEngineStatus() {
  return {
    running: liveEngineRunning,
    lastCycleTime: liveLastCycleTime?.toISOString() ?? null,
    lastSignalCount: liveLastSignalCount,
    lastOrderTime: liveLastOrderTime?.toISOString() ?? null,
  };
}
