/**
 * 自动量化模拟交易引擎
 * 逻辑：每30秒轮询 ValueScan 信号 → 评分 → 自动开仓/止损/止盈/平仓
 */
import { getDb } from "./db";
import {
  paperAccount, paperPositions, paperTrades, paperEquityCurve,
  PaperAccount, PaperPosition
} from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { getFundsCoinList, getChanceCoinList, VSFundsCoinItem, VSChanceCoinItem } from "./valueScanService";
import { buildSignalContext, evaluateStrategies } from "./strategyEngine";

async function db() { return await getDb(); }

const BINANCE_BASE = "https://api.binance.com";

// 获取币安最新价格
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

// 计算信号评分（0-100）
function scoreSignal(signal: {
  symbol: string;
  type: "alpha" | "fomo" | "opportunity";
  intensity?: number;
  score?: number;
}): number {
  let base = 50;
  if (signal.type === "alpha") base = 70;
  if (signal.type === "fomo") base = 65;
  if (signal.type === "opportunity") base = 60;
  if (signal.intensity) base += Math.min(signal.intensity * 5, 20);
  if (signal.score) base = Math.max(base, signal.score);
  return Math.min(base, 100);
}

// 获取账户信息
async function getAccount(): Promise<PaperAccount | null> {
  const d = await db();
  if (!d) return null;
  const rows = await d.select().from(paperAccount).where(eq(paperAccount.id, 1)).limit(1);
  return rows[0] ?? null;
}

// 更新账户余额
async function updateAccount(updates: Partial<PaperAccount>) {
  const d = await db();
  if (!d) return;
  await d.update(paperAccount).set(updates).where(eq(paperAccount.id, 1));
}

// 获取当前持仓
async function getPositions(): Promise<PaperPosition[]> {
  const d = await db();
  if (!d) return [];
  return d.select().from(paperPositions);
}

// 记录权益曲线快照
async function recordEquityCurve(totalBalance: number, unrealizedPnl: number, openPositions: number) {
  const d = await db();
  if (!d) return;
  await d.insert(paperEquityCurve).values({ totalBalance, unrealizedPnl, openPositions });
}

// 开仓
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

  const stopLossMultiplier = direction === "long" ? (1 - (account.stopLossPct ?? 3) / 100) : (1 + (account.stopLossPct ?? 3) / 100);
  const takeProfitMultiplier = direction === "long" ? (1 + (account.takeProfitPct ?? 8) / 100) : (1 - (account.takeProfitPct ?? 8) / 100);

  const stopLoss = entryPrice * stopLossMultiplier;
  const takeProfit = entryPrice * takeProfitMultiplier;

  // 扣除保证金
  const margin = notionalValue;
  const newBalance = (account.balance ?? 10000) - margin;
  if (newBalance < 0) {
    console.log(`[PaperTrading] 余额不足，跳过开仓 ${symbol}`);
    return;
  }

  const d2 = await db();
  if (!d2) return;
  await d2.insert(paperPositions).values({
    symbol,
    direction,
    entryPrice,
    currentPrice: entryPrice,
    quantity,
    notionalValue,
    leverage,
    stopLoss,
    takeProfit,
    unrealizedPnl: 0,
    unrealizedPnlPct: 0,
    signalScore,
    triggerSignal,
  });

  await updateAccount({ balance: newBalance });
  console.log(`[PaperTrading] 开仓 ${direction.toUpperCase()} ${symbol} @ ${entryPrice.toFixed(4)}, 评分: ${signalScore.toFixed(0)}`);
}

// 平仓
async function closePosition(
  position: PaperPosition,
  exitPrice: number,
  closeReason: "take_profit" | "stop_loss" | "manual" | "signal_reverse" | "timeout",
  account: PaperAccount
) {
  const { symbol, direction, entryPrice, quantity, notionalValue, leverage, openedAt } = position;

  // 计算盈亏
  let pnlPct: number;
  const lev = leverage || 5;
  if (direction === "long") {
    pnlPct = ((exitPrice - entryPrice) / entryPrice) * lev * 100;
  } else {
    pnlPct = ((entryPrice - exitPrice) / entryPrice) * lev * 100;
  }
  const pnl = (notionalValue ?? 500) * (pnlPct / 100);

  // 持仓时长（分钟）
  const holdingMinutes = Math.round((Date.now() - new Date(openedAt).getTime()) / 60000);

  // 删除持仓并记录交易
  const d3 = await db();
  if (!d3) return;
  await d3.insert(paperTrades).values({
    symbol,
    direction,
    entryPrice,
    exitPrice,
    quantity,
    notionalValue: notionalValue ?? 500,
    leverage: leverage ?? 5,
    pnl,
    pnlPct,
    closeReason,
    signalScore: position.signalScore,
    triggerSignal: position.triggerSignal ?? "",
    holdingMinutes,
    openedAt,
    closedAt: new Date(),
  });
  await d3.delete(paperPositions).where(eq(paperPositions.id, position.id));

  // 更新账户
  const margin = notionalValue ?? 500;
  const returnedBalance = margin + pnl;
  const newBalance = (account.balance ?? 10000) + returnedBalance;
  const newTotalPnl = (account.totalPnl ?? 0) + pnl;
  const newTotalTrades = (account.totalTrades ?? 0) + 1;
  const newWinTrades = pnl > 0 ? (account.winTrades ?? 0) + 1 : (account.winTrades ?? 0);
  const newLossTrades = pnl <= 0 ? (account.lossTrades ?? 0) + 1 : (account.lossTrades ?? 0);

  // 计算总资产（需要加上其他持仓的未实现盈亏）
  const remainingPositions = await getPositions();
  const unrealizedTotal = remainingPositions.reduce((sum, p) => sum + (p.unrealizedPnl ?? 0), 0);
  const totalBalance = newBalance + unrealizedTotal + remainingPositions.reduce((sum, p) => sum + (p.notionalValue ?? 500), 0);

  const newPeakBalance = Math.max(account.peakBalance ?? 10000, totalBalance);
  const drawdown = newPeakBalance > 0 ? ((newPeakBalance - totalBalance) / newPeakBalance) * 100 : 0;
  const newMaxDrawdown = Math.max(account.maxDrawdown ?? 0, drawdown);
  const newTotalPnlPct = ((totalBalance - (account.initialBalance ?? 10000)) / (account.initialBalance ?? 10000)) * 100;

  await updateAccount({
    balance: newBalance,
    totalBalance,
    totalPnl: newTotalPnl,
    totalPnlPct: newTotalPnlPct,
    totalTrades: newTotalTrades,
    winTrades: newWinTrades,
    lossTrades: newLossTrades,
    peakBalance: newPeakBalance,
    maxDrawdown: newMaxDrawdown,
  });

  const emoji = pnl > 0 ? "🟢" : "🔴";
  console.log(`[PaperTrading] ${emoji} 平仓 ${symbol} @ ${exitPrice.toFixed(4)}, PnL: ${pnl >= 0 ? "+" : ""}${pnl.toFixed(2)} USDT (${pnlPct >= 0 ? "+" : ""}${pnlPct.toFixed(2)}%), 原因: ${closeReason}`);
}

// 更新持仓价格并检查止损/止盈
async function updatePositionsAndCheckSLTP(account: PaperAccount) {
  const positions = await getPositions();
  if (positions.length === 0) return;

  let totalUnrealized = 0;

  for (const pos of positions) {
    const currentPrice = await getBinancePrice(pos.symbol);
    if (!currentPrice) continue;

    // 计算未实现盈亏
    let unrealizedPnlPct: number;
    if (pos.direction === "long") {
      unrealizedPnlPct = ((currentPrice - pos.entryPrice) / pos.entryPrice) * (pos.leverage || 5) * 100;
    } else {
      unrealizedPnlPct = ((pos.entryPrice - currentPrice) / pos.entryPrice) * (pos.leverage || 5) * 100;
    }
    const unrealizedPnl = (pos.notionalValue ?? 500) * (unrealizedPnlPct / 100);
    totalUnrealized += unrealizedPnl;

    // 更新持仓价格
    const dUpdate = await db();
  if (!dUpdate) continue;
  await dUpdate.update(paperPositions)
      .set({ currentPrice, unrealizedPnl, unrealizedPnlPct, updatedAt: new Date() })
      .where(eq(paperPositions.id, pos.id));

    // 检查止盈
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

    // 检查止损
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

    // 超时平仓（持仓超过4小时）
    const holdingMs = Date.now() - new Date(pos.openedAt).getTime();
    if (holdingMs > 4 * 60 * 60 * 1000) {
      const latestAccount = await getAccount();
      if (latestAccount) await closePosition(pos, currentPrice, "timeout", latestAccount);
    }
  }

  // 更新总资产
  const latestAccount = await getAccount();
  if (latestAccount) {
    const positionsAfter = await getPositions();
    const marginInUse = positionsAfter.reduce((sum, p) => sum + (p.notionalValue ?? 500), 0);
    const totalBalance = (latestAccount.balance ?? 10000) + marginInUse + totalUnrealized;
    await updateAccount({ totalBalance });
  }
}

// 主引擎循环
let engineRunning = false;
let engineTimer: ReturnType<typeof setTimeout> | null = null;

export async function runPaperTradingCycle(force = false) {
  const account = await getAccount();
  if (!account) return;
  if (!force && !account.autoTradingEnabled) return;

  console.log("[PaperTrading] 开始交易周期...");

  // 1. 更新持仓价格，检查止损/止盈
  await updatePositionsAndCheckSLTP(account);

  // 2. 获取最新账户状态
  const latestAccount = await getAccount();
  if (!latestAccount || (!force && !latestAccount.autoTradingEnabled)) return;

  // 3. 检查持仓数量限制
  const currentPositions = await getPositions();
  if (currentPositions.length >= (latestAccount.maxPositions ?? 5)) {
    console.log(`[PaperTrading] 持仓已满 (${currentPositions.length}/${latestAccount.maxPositions})`);
    // 记录权益曲线
    const unrealized = currentPositions.reduce((sum, p) => sum + (p.unrealizedPnl ?? 0), 0);
    await recordEquityCurve(latestAccount.totalBalance ?? 10000, unrealized, currentPositions.length);
    return;
  }

  // 4. 获取 ValueScan 信号
  try {
    const [flowData, opportunityData] = await Promise.allSettled([
      getFundsCoinList(),
      getChanceCoinList(),
    ]);

    const signals: Array<{
      symbol: string;
      type: "alpha" | "fomo" | "opportunity";
      direction: "long" | "short";
      intensity?: number;
      description: string;
    }> = [];

    // 解析资金异常信号
    if (flowData.status === "fulfilled" && flowData.value?.data) {
      const list = Array.isArray(flowData.value.data) ? flowData.value.data : (flowData.value.data as any)?.list ?? [];
      for (const item of list as VSFundsCoinItem[]) {
        const sym = (item.symbol || "").replace("USDT", "").replace("/", "");
        if (!sym) continue;
        const isAlpha = item.alpha === true;
        const isFomo = item.fomo === true || item.fomoEscalation === true;
        if (isAlpha || isFomo) {
          signals.push({
            symbol: sym,
            type: isAlpha ? "alpha" : "fomo",
            direction: "long",
            intensity: typeof item.bullishRatio === "number" ? item.bullishRatio : 1,
            description: `${isAlpha ? "Alpha" : "FOMO"} 资金异常 ${sym}`,
          });
        }
      }
    }

    // 解析机会代币信号
    if (opportunityData.status === "fulfilled" && opportunityData.value?.data) {
      const list = Array.isArray(opportunityData.value.data) ? opportunityData.value.data : (opportunityData.value.data as any)?.list ?? [];
      for (const item of list as VSChanceCoinItem[]) {
        const sym = (item.symbol || "").replace("USDT", "").replace("/", "");
        if (!sym) continue;
        signals.push({
          symbol: sym,
          type: "opportunity",
          direction: "long",
          description: `机会代币 ${sym}`,
        });
      }
    }

    // 5. 对每个信号运行 6 大高胜率策略引擎评估
    const existingSymbols = new Set(currentPositions.map(p => p.symbol));

    // 计算全局信号统计（用于策略 5 和策略 6）
    const fomoCount = signals.filter(s => s.type === 'fomo').length;
    const alphaCount = signals.filter(s => s.type === 'alpha').length;
    const riskCount = 0; // 模拟交易中暂无风险信号
    const uniqueSymbols = new Set(signals.map(s => s.symbol)).size;
    const totalCount = signals.length;

    for (const signal of signals) {
      if (existingSymbols.has(signal.symbol)) continue; // 已有持仓

      // 构建信号上下文
      const messageType = signal.type === 'alpha' ? 110 : signal.type === 'fomo' ? 113 : 108;
      const rawData = {
        hasAlpha: signal.type === 'alpha',
        hasFomo: signal.type === 'fomo',
        hasFire: (signal.intensity ?? 0) > 1.5,
        aiScore: signal.intensity ? Math.min(50 + signal.intensity * 15, 100) : 60,
        isAtSupportZone: signal.type === 'alpha', // Alpha 信号通常在支撑区
        isBreakingResistance: signal.type === 'fomo' && (signal.intensity ?? 0) > 1.2,
        isAtResistanceZone: false,
        hasWhaleEscape: false,
        hasExchangeInflow: false,
        hasRisk: false,
      };

      const ctx = buildSignalContext({
        symbol: signal.symbol,
        messageType,
        rawData,
        recentSignalStats: { fomoCount, alphaCount, riskCount, totalCount, uniqueSymbols },
      });

      const strategyResult = evaluateStrategies(ctx);

      // 策略 6：风险警报空仓 - 立即停止开仓
      if (strategyResult.allResults.find(r => r.strategyId === 'risk_alert_flat' && r.triggered)) {
        console.log(`[PaperTrading] ❗ 风险警报空仓策略触发，停止开仓`);
        break;
      }

      // 必须有策略触发才开仓
      if (!strategyResult.triggered || !strategyResult.strategy) {
        console.log(`[PaperTrading] ${signal.symbol} 未满足任何策略条件，跳过`);
        continue;
      }

      const strategy = strategyResult.strategy;
      console.log(`[PaperTrading] ✅ ${signal.symbol} 触发策略：${strategy.strategyName} (胜率${(strategy.winRate * 100).toFixed(0)}%)`);

      // 获取当前价格
      const price = await getBinancePrice(signal.symbol);
      if (!price || price <= 0) continue;

      // 检查余额
      const margin = latestAccount.perTradeAmount ?? 500;
      if ((latestAccount.balance ?? 0) < margin) {
        console.log(`[PaperTrading] 余额不足 ${latestAccount.balance?.toFixed(2)} < ${margin}`);
        break;
      }

      // 开仓（使用策略方向）
      const direction = strategy.direction === 'short' ? 'short' : 'long';
      const score = Math.round(strategy.winRate * 100);
      const description = `[${strategy.strategyName}] ${strategy.reason}`;
      const freshAccount = await getAccount();
      if (!freshAccount) break;
      await openPosition(signal.symbol, direction, price, freshAccount, score, description);
      existingSymbols.add(signal.symbol);

      // 最多每次开1个新仓
      break;
    }
  } catch (err) {
    console.error("[PaperTrading] 信号获取失败:", err);
  }

  // 6. 记录权益曲线快照
  const finalAccount = await getAccount();
  const finalPositions = await getPositions();
  if (finalAccount) {
    const unrealized = finalPositions.reduce((sum, p) => sum + (p.unrealizedPnl ?? 0), 0);
    await recordEquityCurve(finalAccount.totalBalance ?? 10000, unrealized, finalPositions.length);
  }
}

// 启动/停止引擎
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
      engineTimer = setTimeout(loop, 30000); // 每30秒
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
