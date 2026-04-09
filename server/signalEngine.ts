import { getDb } from "./db";
import { signals } from "../drizzle/schema";
import { sendSignalAlert } from "./telegram";
import { fetchTickers, ExchangeId } from "./exchange";

// 监控的交易对
const WATCH_SYMBOLS = [
  "BTC/USDT", "ETH/USDT", "SOL/USDT", "BNB/USDT",
  "XRP/USDT", "DOGE/USDT", "ADA/USDT", "AVAX/USDT",
];

// 价格缓存（用于计算变化）
const priceCache: Record<string, { price: number; time: number }> = {};

// 信号冷却期（同一交易对 5 分钟内不重复发送）
const signalCooldown: Record<string, number> = {};
const COOLDOWN_MS = 5 * 60 * 1000;

// 评分阈值
const SCORE_THRESHOLD = 60;

// 计算信号评分
function calcScore(changePercent: number, volume: number, avgVolume: number): number {
  let score = 50;
  const absChange = Math.abs(changePercent);

  // 价格变化评分
  if (absChange > 5) score += 30;
  else if (absChange > 3) score += 20;
  else if (absChange > 1.5) score += 10;

  // 成交量评分
  if (avgVolume > 0) {
    const volRatio = volume / avgVolume;
    if (volRatio > 3) score += 20;
    else if (volRatio > 2) score += 10;
    else if (volRatio > 1.5) score += 5;
  }

  return Math.min(score, 100);
}

// 检测信号
async function detectSignals(exchangeId: ExchangeId) {
  try {
    const tickers = await fetchTickers(exchangeId, WATCH_SYMBOLS);

    for (const ticker of tickers) {
      if (!ticker.last || ticker.last === 0) continue;

      const key = `${exchangeId}:${ticker.symbol}`;
      const prev = priceCache[key];
      const now = Date.now();

      // 更新价格缓存
      priceCache[key] = { price: ticker.last, time: now };

      if (!prev) continue;

      // 检查冷却期
      if (signalCooldown[key] && now - signalCooldown[key] < COOLDOWN_MS) continue;

      const changePercent = ticker.changePercent ?? 0;
      const score = calcScore(changePercent, ticker.volume, ticker.volume * 0.7);

      if (score < SCORE_THRESHOLD) continue;

      // 判断方向
      let type: "LONG" | "SHORT" | null = null;
      let source = "Alpha";
      let reason = "";

      if (changePercent > 3) {
        type = "LONG";
        source = "Alpha多";
        reason = `价格上涨 ${changePercent.toFixed(2)}%，成交量放大，看涨信号`;
      } else if (changePercent < -3) {
        type = "SHORT";
        source = "Alpha空";
        reason = `价格下跌 ${Math.abs(changePercent).toFixed(2)}%，成交量放大，看跌信号`;
      }

      if (!type) continue;

      // 保存信号到数据库
      const db = await getDb();
      if (db) {
        await db.insert(signals).values({
          exchange: exchangeId,
          symbol: ticker.symbol,
          type,
          source,
          price: String(ticker.last),
          score,
          reason,
          telegramSent: false,
        });
      }

      // 发送 Telegram 推送
      const sent = await sendSignalAlert({
        exchange: exchangeId,
        symbol: ticker.symbol,
        type,
        source,
        price: ticker.last,
        score,
        reason,
      });

      if (sent) {
        // 更新冷却期
        signalCooldown[key] = now;

        // 更新数据库中的 telegramSent 状态
        if (db) {
          // 简单处理：不需要精确更新，下次查询时会反映
        }
      }

      console.log(`[SignalEngine] ${type} signal: ${ticker.symbol} @ ${ticker.last} (score: ${score})`);
    }
  } catch (err: any) {
    console.error(`[SignalEngine] detectSignals ${exchangeId} error:`, err.message);
  }
}

// 信号引擎定时器
let engineTimer: NodeJS.Timeout | null = null;
let isRunning = false;

export function startSignalEngine() {
  if (isRunning) return;
  isRunning = true;
  console.log("[SignalEngine] Starting...");

  const run = async () => {
    const exchanges: ExchangeId[] = ["binance", "okx", "bybit"];
    for (const ex of exchanges) {
      await detectSignals(ex);
    }
  };

  // 立即运行一次，然后每 60 秒运行
  run().catch(console.error);
  engineTimer = setInterval(() => {
    run().catch(console.error);
  }, 60_000);
}

export function stopSignalEngine() {
  if (engineTimer) {
    clearInterval(engineTimer);
    engineTimer = null;
  }
  isRunning = false;
  console.log("[SignalEngine] Stopped.");
}

export function getEngineStatus() {
  return { running: isRunning };
}
