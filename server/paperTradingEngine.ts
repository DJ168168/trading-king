/**
 * 自动量化模拟交易引擎
 * 逻辑：每30秒轮询 ValueScan 信号 → 评分 → 自动开仓/止损/止盈/平仓
 * 修复：基于真实 VS 数据字段（alpha/fomo/fomoEscalation/bullishRatio）放宽策略条件
 * 新增：开仓/平仓/止损/止盈时发送 Telegram 通知
 */
import { getDb, getTelegramConfig } from "./db";
import {
  paperAccount, paperPositions, paperTrades, paperEquityCurve,
  PaperAccount, PaperPosition
} from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { getFundsCoinList, getChanceCoinList, VSFundsCoinItem, VSChanceCoinItem } from "./valueScanService";

async function db() { return await getDb(); }
const BINANCE_BASE = "https://api.binance.com";

// ─── 价格获取 ─────────────────────────────────────────────────────────────────
async function getBinancePrice(symbol: string): Promise<number | null> {
  try {
    const ticker = symbol.endsWith("USDT") ? symbol : `${symbol}USDT`;
    const res = await fetch(`${BINANCE_BASE}/api/v3/ticker/price?symbol=${ticker}`);
    if (!res.ok) return null;
    const data = await res.json() as { price: string };
    return parseFloat(data.price);
  } catch {
    return null;
  }
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
    console.error("[PaperTrading] Telegram 推送失败:", e.message);
  }
}

// ─── 账户操作 ─────────────────────────────────────────────────────────────────
async function getAccount(): Promise<PaperAccount | null> {
  const d = await db();
  if (!d) return null;
  const rows = await d.select().from(paperAccount).where(eq(paperAccount.id, 1)).limit(1);
  return rows[0] ?? null;
}
async function updateAccount(updates: Partial<PaperAccount>) {
  const d = await db();
  if (!d) return;
  await d.update(paperAccount).set(updates).where(eq(paperAccount.id, 1));
}
async function getPositions(): Promise<PaperPosition[]> {
  const d = await db();
  if (!d) return [];
  return d.select().from(paperPositions);
}
async function recordEquityCurve(totalBalance: number, unrealizedPnl: number, openPositions: number) {
  const d = await db();
  if (!d) return;
  await d.insert(paperEquityCurve).values({ totalBalance, unrealizedPnl, openPositions });
}

// ─── 开仓 ─────────────────────────────────────────────────────────────────────
async function openPosition(
  symbol: string,
  direction: "long" | "short",
  entryPrice: number,
  account: PaperAccount,
  signalScore: number,
  triggerSignal: string
) {
  const notionalValue = account.perTradeAmount ?? 500;
  const leverage = account.leverage ?? 5;
  const quantity = (notionalValue * leverage) / entryPrice;
  const slPct = account.stopLossPct ?? 3;
  const tpPct = account.takeProfitPct ?? 8;
  const stopLoss = direction === "long"
    ? entryPrice * (1 - slPct / 100)
    : entryPrice * (1 + slPct / 100);
  const takeProfit = direction === "long"
    ? entryPrice * (1 + tpPct / 100)
    : entryPrice * (1 - tpPct / 100);
  const margin = notionalValue;
  const newBalance = (account.balance ?? 10000) - margin;
  if (newBalance < 0) {
    console.log(`[PaperTrading] 余额不足，跳过开仓 ${symbol}`);
    return;
  }
  const d2 = await db();
  if (!d2) return;
  await d2.insert(paperPositions).values({
    symbol, direction, entryPrice, currentPrice: entryPrice,
    quantity, notionalValue, leverage, stopLoss, takeProfit,
    unrealizedPnl: 0, unrealizedPnlPct: 0, signalScore, triggerSignal,
  });
  await updateAccount({ balance: newBalance });
  const dirEmoji = direction === "long" ? "🟢" : "🔴";
  const dirLabel = direction === "long" ? "做多" : "做空";
  console.log(`[PaperTrading] ${dirEmoji} 开仓 ${dirLabel} ${symbol} @ ${entryPrice.toFixed(4)}, 评分: ${signalScore.toFixed(0)}`);

  // Telegram 通知
  const msg = `${dirEmoji} <b>📊 模拟盘开仓 - ${dirLabel}</b>\n\n` +
    `💎 <b>${symbol}/USDT</b>\n` +
    `💰 入场价: <b>$${entryPrice.toFixed(4)}</b>\n` +
    `📊 评分: <b>${signalScore.toFixed(0)}/100</b>\n` +
    `🏦 交易所: <b>模拟盘</b>\n` +
    `💵 模拟余额: <b>$${newBalance.toFixed(2)} USDT</b>\n` +
    `🛡 止损: $${stopLoss.toFixed(4)} (-${slPct}%)\n` +
    `🎯 止盈: $${takeProfit.toFixed(4)} (+${tpPct}%)\n` +
    `📝 ${triggerSignal.substring(0, 80)}\n` +
    `⏰ ${new Date().toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })}`;
  await sendTg(msg);
}

// ─── 平仓 ─────────────────────────────────────────────────────────────────────
async function closePosition(
  position: PaperPosition,
  exitPrice: number,
  closeReason: "take_profit" | "stop_loss" | "manual" | "signal_reverse" | "timeout",
  account: PaperAccount
) {
  const { symbol, direction, entryPrice, quantity, notionalValue, leverage, openedAt } = position;
  const lev = leverage || 5;
  let pnlPct: number;
  if (direction === "long") {
    pnlPct = ((exitPrice - entryPrice) / entryPrice) * lev * 100;
  } else {
    pnlPct = ((entryPrice - exitPrice) / entryPrice) * lev * 100;
  }
  const pnl = (notionalValue ?? 500) * (pnlPct / 100);
  const holdingMinutes = Math.round((Date.now() - new Date(openedAt).getTime()) / 60000);
  const d3 = await db();
  if (!d3) return;
  await d3.insert(paperTrades).values({
    symbol, direction, entryPrice, exitPrice, quantity,
    notionalValue: notionalValue ?? 500, leverage: leverage ?? 5,
    pnl, pnlPct, closeReason, signalScore: position.signalScore,
    triggerSignal: position.triggerSignal ?? "", holdingMinutes,
    openedAt, closedAt: new Date(),
  });
  await d3.delete(paperPositions).where(eq(paperPositions.id, position.id));
  const margin = notionalValue ?? 500;
  const returnedBalance = margin + pnl;
  const newBalance = (account.balance ?? 10000) + returnedBalance;
  const newTotalPnl = (account.totalPnl ?? 0) + pnl;
  const newTotalTrades = (account.totalTrades ?? 0) + 1;
  const newWinTrades = pnl > 0 ? (account.winTrades ?? 0) + 1 : (account.winTrades ?? 0);
  const newLossTrades = pnl <= 0 ? (account.lossTrades ?? 0) + 1 : (account.lossTrades ?? 0);
  const remainingPositions = await getPositions();
  const unrealizedTotal = remainingPositions.reduce((sum, p) => sum + (p.unrealizedPnl ?? 0), 0);
  const totalBalance = newBalance + unrealizedTotal + remainingPositions.reduce((sum, p) => sum + (p.notionalValue ?? 500), 0);
  const newPeakBalance = Math.max(account.peakBalance ?? 10000, totalBalance);
  const drawdown = newPeakBalance > 0 ? ((newPeakBalance - totalBalance) / newPeakBalance) * 100 : 0;
  const newMaxDrawdown = Math.max(account.maxDrawdown ?? 0, drawdown);
  const newTotalPnlPct = ((totalBalance - (account.initialBalance ?? 10000)) / (account.initialBalance ?? 10000)) * 100;
  await updateAccount({
    balance: newBalance, totalBalance, totalPnl: newTotalPnl, totalPnlPct: newTotalPnlPct,
    totalTrades: newTotalTrades, winTrades: newWinTrades, lossTrades: newLossTrades,
    peakBalance: newPeakBalance, maxDrawdown: newMaxDrawdown,
  });
  const pnlEmoji = pnl > 0 ? "🟢" : "🔴";
  const reasonMap: Record<string, string> = {
    take_profit: "🎯 止盈", stop_loss: "🛡 止损", manual: "👤 手动", timeout: "⏰ 超时", signal_reverse: "🔄 信号反转"
  };
  console.log(`[PaperTrading] ${pnlEmoji} 平仓 ${symbol} @ ${exitPrice.toFixed(4)}, PnL: ${pnl >= 0 ? "+" : ""}${pnl.toFixed(2)} USDT (${pnlPct >= 0 ? "+" : ""}${pnlPct.toFixed(2)}%), 原因: ${closeReason}`);

  // Telegram 通知
  const msg = `${pnlEmoji} <b>📊 模拟盘平仓 - ${reasonMap[closeReason] ?? closeReason}</b>\n\n` +
    `💎 <b>${symbol}/USDT</b>\n` +
    `💰 平仓价: <b>$${exitPrice.toFixed(4)}</b>\n` +
    `📈 盈亏: <b>${pnl >= 0 ? "+" : ""}$${pnl.toFixed(2)} (${pnlPct >= 0 ? "+" : ""}${pnlPct.toFixed(2)}%)</b>\n` +
    `🏦 交易所: <b>模拟盘</b>\n` +
    `💵 模拟余额: <b>$${newBalance.toFixed(2)} USDT</b>\n` +
    `⏱ 持仓: ${holdingMinutes} 分钟\n` +
    `⏰ ${new Date().toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })}`;
  await sendTg(msg);
}

// ─── 持仓更新 + 止损/止盈检查 ────────────────────────────────────────────────
async function updatePositionsAndCheckSLTP(account: PaperAccount) {
  const positions = await getPositions();
  if (positions.length === 0) return;
  let totalUnrealized = 0;
  for (const pos of positions) {
    const currentPrice = await getBinancePrice(pos.symbol);
    if (!currentPrice) continue;
    let unrealizedPnlPct: number;
    if (pos.direction === "long") {
      unrealizedPnlPct = ((currentPrice - pos.entryPrice) / pos.entryPrice) * (pos.leverage || 5) * 100;
    } else {
      unrealizedPnlPct = ((pos.entryPrice - currentPrice) / pos.entryPrice) * (pos.leverage || 5) * 100;
    }
    const unrealizedPnl = (pos.notionalValue ?? 500) * (unrealizedPnlPct / 100);
    totalUnrealized += unrealizedPnl;
    const dUpdate = await db();
    if (!dUpdate) continue;
    await dUpdate.update(paperPositions)
      .set({ currentPrice, unrealizedPnl, unrealizedPnlPct, updatedAt: new Date() })
      .where(eq(paperPositions.id, pos.id));
    if (pos.takeProfit) {
      const hitTP = pos.direction === "long"
        ? currentPrice >= pos.takeProfit
        : currentPrice <= pos.takeProfit;
      if (hitTP) {
        const latestAccount = await getAccount();
        if (latestAccount) await closePosition(pos, currentPrice, "take_profit", latestAccount);
        continue;
      }
    }
    if (pos.stopLoss) {
      const hitSL = pos.direction === "long"
        ? currentPrice <= pos.stopLoss
        : currentPrice >= pos.stopLoss;
      if (hitSL) {
        const latestAccount = await getAccount();
        if (latestAccount) await closePosition(pos, currentPrice, "stop_loss", latestAccount);
        continue;
      }
    }
    const holdingMs = Date.now() - new Date(pos.openedAt).getTime();
    if (holdingMs > 4 * 60 * 60 * 1000) {
      const latestAccount = await getAccount();
      if (latestAccount) await closePosition(pos, currentPrice, "timeout", latestAccount);
    }
  }
  const latestAccount = await getAccount();
  if (latestAccount) {
    const positionsAfter = await getPositions();
    const marginInUse = positionsAfter.reduce((sum, p) => sum + (p.notionalValue ?? 500), 0);
    const totalBalance = (latestAccount.balance ?? 10000) + marginInUse + totalUnrealized;
    await updateAccount({ totalBalance });
  }
}

// ─── 信号评分（基于真实 VS 数据） ─────────────────────────────────────────────
/**
 * 基于真实 ValueScan 数据评估信号，返回是否应该开仓及方向
 * 真实数据字段：alpha, fomo, fomoEscalation, bullishRatio, tradeType, gains, decline
 */
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
  // tradeType: 1 = 做多方向, 2 = 做空方向
  const isShortSignal = item.tradeType === 2;

  // 策略1：Alpha + FOMO 双标记（最强信号，82%+）
  if (isAlpha && (isFomo || isFomoEscalation)) {
    return {
      shouldTrade: true,
      direction: isShortSignal ? "short" : "long",
      score: 82,
      reason: `Alpha+${isFomoEscalation ? "FOMO升温" : "FOMO"}双标记 (gains:${gains.toFixed(1)}%)`,
    };
  }
  // 策略2：Alpha 单标记 + 做多方向
  if (isAlpha && !isShortSignal) {
    return {
      shouldTrade: true,
      direction: "long",
      score: 72,
      reason: `Alpha信号 做多方向 涨幅${gains.toFixed(1)}%`,
    };
  }
  // 策略3：FOMO升温 + 做多方向
  if (isFomoEscalation && !isShortSignal) {
    return {
      shouldTrade: true,
      direction: "long",
      score: 70,
      reason: `FOMO升温信号 做多方向`,
    };
  }
  // 策略4：Alpha + 做空方向（主力出逃）
  if (isAlpha && isShortSignal) {
    return {
      shouldTrade: true,
      direction: "short",
      score: 68,
      reason: `Alpha做空信号 跌幅${decline.toFixed(1)}%`,
    };
  }
  // 策略5：FOMO + 做多方向
  if (isFomo && !isShortSignal) {
    return {
      shouldTrade: true,
      direction: "long",
      score: 65,
      reason: `FOMO信号 做多方向`,
    };
  }

  return { shouldTrade: false, direction: "long", score: 0, reason: "未满足任何策略条件" };
}

// ─── 主引擎循环 ───────────────────────────────────────────────────────────────
let engineRunning = false;
let engineTimer: ReturnType<typeof setTimeout> | null = null;
let lastCycleTime: Date | null = null;
let lastSignalCount = 0;

export async function runPaperTradingCycle(force = false) {
  const account = await getAccount();
  if (!account) return;
  if (!force && !account.autoTradingEnabled) return;
  console.log("[PaperTrading] 开始交易周期...");
  lastCycleTime = new Date();
  await updatePositionsAndCheckSLTP(account);
  const latestAccount = await getAccount();
  if (!latestAccount || (!force && !latestAccount.autoTradingEnabled)) return;
  const currentPositions = await getPositions();
  if (currentPositions.length >= (latestAccount.maxPositions ?? 5)) {
    console.log(`[PaperTrading] 持仓已满 (${currentPositions.length}/${latestAccount.maxPositions})`);
    const unrealized = currentPositions.reduce((sum, p) => sum + (p.unrealizedPnl ?? 0), 0);
    await recordEquityCurve(latestAccount.totalBalance ?? 10000, unrealized, currentPositions.length);
    return;
  }
  try {
    const [flowData, opportunityData] = await Promise.allSettled([
      getFundsCoinList(),
      getChanceCoinList(),
    ]);
    const existingSymbols = new Set(currentPositions.map(p => p.symbol));
    let signalCount = 0;
    let openedThisCycle = false;

    // 处理资金异常信号（Alpha/FOMO）
    if (flowData.status === "fulfilled" && flowData.value?.data) {
      const list = Array.isArray(flowData.value.data)
        ? flowData.value.data
        : (flowData.value.data as any)?.list ?? [];
      signalCount += list.length;
      for (const item of list as VSFundsCoinItem[]) {
        if (openedThisCycle) break;
        const sym = (item.symbol || "").replace("USDT", "").replace("/", "");
        if (!sym || existingSymbols.has(sym)) continue;
        const eval_ = evaluateVSSignal(item);
        if (!eval_.shouldTrade) {
          console.log(`[PaperTrading] ${sym} 跳过 (alpha:${item.alpha} fomo:${item.fomo} fomoEsc:${item.fomoEscalation} tradeType:${item.tradeType})`);
          continue;
        }
        console.log(`[PaperTrading] ✅ ${sym} 触发 (评分${eval_.score}): ${eval_.reason}`);
        const price = await getBinancePrice(sym);
        if (!price || price <= 0) continue;
        const margin = latestAccount.perTradeAmount ?? 500;
        if ((latestAccount.balance ?? 0) < margin) {
          console.log(`[PaperTrading] 余额不足 ${latestAccount.balance?.toFixed(2)} < ${margin}`);
          break;
        }
        const freshAccount = await getAccount();
        if (!freshAccount) break;
        await openPosition(sym, eval_.direction, price, freshAccount, eval_.score, eval_.reason);
        existingSymbols.add(sym);
        openedThisCycle = true;
      }
    }

    // 处理机会代币信号（如果本轮还没开仓）
    if (!openedThisCycle && opportunityData.status === "fulfilled" && opportunityData.value?.data) {
      const list = Array.isArray(opportunityData.value.data)
        ? opportunityData.value.data
        : (opportunityData.value.data as any)?.list ?? [];
      signalCount += list.length;
      for (const item of list as VSChanceCoinItem[]) {
        if (openedThisCycle) break;
        const sym = (item.symbol || "").replace("USDT", "").replace("/", "");
        if (!sym || existingSymbols.has(sym)) continue;
        const vsScore = item.score ?? 0;
        if (vsScore < 70) continue;
        console.log(`[PaperTrading] ✅ 机会代币 ${sym} 评分 ${vsScore}，开仓`);
        const price = await getBinancePrice(sym);
        if (!price || price <= 0) continue;
        const margin = latestAccount.perTradeAmount ?? 500;
        if ((latestAccount.balance ?? 0) < margin) break;
        const freshAccount = await getAccount();
        if (!freshAccount) break;
        await openPosition(sym, "long", price, freshAccount, vsScore, `机会代币 评分${vsScore}`);
        existingSymbols.add(sym);
        openedThisCycle = true;
      }
    }
    lastSignalCount = signalCount;
    console.log(`[PaperTrading] 本轮信号数: ${signalCount}, 开仓: ${openedThisCycle}`);
  } catch (err) {
    console.error("[PaperTrading] 信号获取失败:", err);
  }
  const finalAccount = await getAccount();
  const finalPositions = await getPositions();
  if (finalAccount) {
    const unrealized = finalPositions.reduce((sum, p) => sum + (p.unrealizedPnl ?? 0), 0);
    await recordEquityCurve(finalAccount.totalBalance ?? 10000, unrealized, finalPositions.length);
  }
}

// ─── 启动/停止引擎 ────────────────────────────────────────────────────────────
export function startPaperTradingEngine() {
  if (engineRunning) return;
  engineRunning = true;
  console.log("[PaperTrading] 引擎启动 ✅");
  const loop = async () => {
    if (!engineRunning) return;
    try {
      await runPaperTradingCycle();
    } catch (err) {
      console.error("[PaperTrading] 引擎错误:", err);
    }
    if (engineRunning) {
      engineTimer = setTimeout(loop, 30000);
    }
  };
  loop();
}
export function stopPaperTradingEngine() {
  engineRunning = false;
  if (engineTimer) {
    clearTimeout(engineTimer);
    engineTimer = null;
  }
  console.log("[PaperTrading] 引擎停止 ⛔");
}
export function isEngineRunning() {
  return engineRunning;
}
export function getEngineStatus() {
  return {
    running: engineRunning,
    lastCycleTime: lastCycleTime?.toISOString() ?? null,
    lastSignalCount,
  };
}
