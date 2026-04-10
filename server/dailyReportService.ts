/**
 * 每日交易报告服务
 * 每天 UTC+8 20:00 推送当日实盘+模拟盘盈亏汇总到 Telegram
 */
import { getDb, getTelegramConfig } from "./db";
import { trades, paperTrades, paperAccount, strategyConfig } from "../drizzle/schema";
import { gte, and, eq } from "drizzle-orm";

// ─── Telegram 推送 ────────────────────────────────────────────────────────────
async function sendTg(message: string): Promise<void> {
  try {
    const cfg = await getTelegramConfig();
    if (!cfg?.botToken || !cfg?.chatId) {
      console.log("[DailyReport] Telegram 未配置，跳过推送");
      return;
    }
    const res = await fetch(`https://api.telegram.org/bot${cfg.botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: cfg.chatId, text: message, parse_mode: "HTML" }),
    });
    if (res.ok) {
      console.log("[DailyReport] Telegram 推送成功");
    } else {
      console.error("[DailyReport] Telegram 推送失败:", await res.text());
    }
  } catch (e: any) {
    console.error("[DailyReport] Telegram 推送异常:", e.message);
  }
}

// ─── 生成每日报告 ─────────────────────────────────────────────────────────────
export async function generateAndSendDailyReport(): Promise<void> {
  console.log("[DailyReport] 开始生成每日报告...");
  const db = await getDb();
  if (!db) {
    console.error("[DailyReport] 数据库不可用");
    return;
  }

  // 今日 UTC+8 00:00 对应的 UTC 时间
  const now = new Date();
  const utc8Offset = 8 * 60 * 60 * 1000;
  const utc8Now = new Date(now.getTime() + utc8Offset);
  const utc8Today = new Date(Date.UTC(utc8Now.getUTCFullYear(), utc8Now.getUTCMonth(), utc8Now.getUTCDate()));
  const todayStart = new Date(utc8Today.getTime() - utc8Offset); // 转回 UTC

  // ─── 实盘统计 ─────────────────────────────────────────────────────────────
  let liveTotalPnl = 0;
  let liveTotalTrades = 0;
  let liveWinTrades = 0;
  let liveMaxDrawdown = 0;
  let liveExchange = "N/A";

  try {
    const liveTodayTrades = await db.select().from(trades)
      .where(and(gte(trades.openedAt, todayStart)));
    liveTotalTrades = liveTodayTrades.length;
    for (const t of liveTodayTrades) {
      const pnl = t.pnl ?? 0;
      liveTotalPnl += pnl;
      if (pnl > 0) liveWinTrades++;
    }
    // 获取配置的交易所
    const cfgRows = await db.select().from(strategyConfig).where(eq(strategyConfig.isActive, true)).limit(1);
    const cfg = cfgRows[0] as any;
    liveExchange = cfg?.selectedExchange?.toUpperCase() ?? "BINANCE";
    // 最大回撤（简化：今日最低点 vs 最高点）
    if (liveTodayTrades.length > 0) {
      let runningPnl = 0;
      let peak = 0;
      for (const t of liveTodayTrades) {
        runningPnl += t.pnl ?? 0;
        peak = Math.max(peak, runningPnl);
        const drawdown = peak > 0 ? ((peak - runningPnl) / peak) * 100 : 0;
        liveMaxDrawdown = Math.max(liveMaxDrawdown, drawdown);
      }
    }
  } catch (e: any) {
    console.error("[DailyReport] 实盘统计失败:", e.message);
  }

  // ─── 模拟盘统计 ───────────────────────────────────────────────────────────
  let paperTotalPnl = 0;
  let paperTotalTrades = 0;
  let paperWinTrades = 0;
  let paperMaxDrawdown = 0;
  let paperBalance = 10000;

  try {
    const paperTodayTrades = await db.select().from(paperTrades)
      .where(and(gte(paperTrades.closedAt, todayStart)));
    paperTotalTrades = paperTodayTrades.length;
    for (const t of paperTodayTrades) {
      const pnl = t.pnl ?? 0;
      paperTotalPnl += pnl;
      if (pnl > 0) paperWinTrades++;
    }
    // 模拟盘最大回撤
    if (paperTodayTrades.length > 0) {
      let runningPnl = 0;
      let peak = 0;
      for (const t of paperTodayTrades) {
        runningPnl += t.pnl ?? 0;
        peak = Math.max(peak, runningPnl);
        const drawdown = peak > 0 ? ((peak - runningPnl) / peak) * 100 : 0;
        paperMaxDrawdown = Math.max(paperMaxDrawdown, drawdown);
      }
    }
    // 模拟盘余额
    const acctRows = await db.select().from(paperAccount).where(eq(paperAccount.id, 1)).limit(1);
    paperBalance = acctRows[0]?.balance ?? 10000;
  } catch (e: any) {
    console.error("[DailyReport] 模拟盘统计失败:", e.message);
  }

  const liveWinRate = liveTotalTrades > 0 ? (liveWinTrades / liveTotalTrades * 100).toFixed(1) : "N/A";
  const paperWinRate = paperTotalTrades > 0 ? (paperWinTrades / paperTotalTrades * 100).toFixed(1) : "N/A";
  const dateStr = utc8Now.toLocaleDateString("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit" });

  const msg = `📊 <b>每日交易报告 - ${dateStr}</b>\n\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `🔴 <b>实盘（${liveExchange}）</b>\n` +
    `💰 今日盈亏: <b>${liveTotalPnl >= 0 ? "+" : ""}$${liveTotalPnl.toFixed(2)}</b>\n` +
    `📈 交易次数: ${liveTotalTrades} 笔\n` +
    `🎯 胜率: ${liveWinRate}${liveWinRate !== "N/A" ? "%" : ""}\n` +
    `📉 最大回撤: ${liveMaxDrawdown.toFixed(2)}%\n\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `🟡 <b>模拟盘</b>\n` +
    `💰 今日盈亏: <b>${paperTotalPnl >= 0 ? "+" : ""}$${paperTotalPnl.toFixed(2)}</b>\n` +
    `📈 交易次数: ${paperTotalTrades} 笔\n` +
    `🎯 胜率: ${paperWinRate}${paperWinRate !== "N/A" ? "%" : ""}\n` +
    `📉 最大回撤: ${paperMaxDrawdown.toFixed(2)}%\n` +
    `💵 模拟余额: $${paperBalance.toFixed(2)} USDT\n\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `⏰ 报告时间: ${now.toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })}`;

  await sendTg(msg);
}

// ─── 定时任务：每天 UTC+8 20:00 推送 ─────────────────────────────────────────
let dailyReportTimer: ReturnType<typeof setTimeout> | null = null;

function getMillisUntilNext2000CST(): number {
  const now = new Date();
  // UTC+8 当前时间
  const utc8Offset = 8 * 60 * 60 * 1000;
  const utc8Now = new Date(now.getTime() + utc8Offset);
  // 今天 UTC+8 20:00
  const next2000 = new Date(Date.UTC(
    utc8Now.getUTCFullYear(),
    utc8Now.getUTCMonth(),
    utc8Now.getUTCDate(),
    20, 0, 0, 0
  ));
  // 转回 UTC 时间戳
  const next2000UTC = next2000.getTime() - utc8Offset;
  // 如果今天 20:00 已过，则等到明天
  if (next2000UTC <= now.getTime()) {
    return next2000UTC + 24 * 60 * 60 * 1000 - now.getTime();
  }
  return next2000UTC - now.getTime();
}

export function startDailyReportScheduler(): void {
  const scheduleNext = () => {
    const msUntilNext = getMillisUntilNext2000CST();
    const nextTime = new Date(Date.now() + msUntilNext);
    console.log(`[DailyReport] 下次报告时间: ${nextTime.toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })} (${Math.round(msUntilNext / 60000)} 分钟后)`);
    dailyReportTimer = setTimeout(async () => {
      await generateAndSendDailyReport();
      scheduleNext(); // 递归调度下一天
    }, msUntilNext);
  };
  scheduleNext();
  console.log("[DailyReport] 每日报告定时任务已启动 (UTC+8 20:00)");
}

export function stopDailyReportScheduler(): void {
  if (dailyReportTimer) {
    clearTimeout(dailyReportTimer);
    dailyReportTimer = null;
    console.log("[DailyReport] 每日报告定时任务已停止");
  }
}
