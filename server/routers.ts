import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import {
  fetchBalance, fetchPositions, fetchTrades, fetchTicker,
  fetchTickers, fetchOHLCV, createOrder, fetchFundingRate,
  testConnection, ExchangeId
} from "./exchange";
import {
  getRecentSignals, insertSignal,
  getOpenSimPositions, insertSimPosition, closeSimPosition,
  insertSimTrade, getRecentSimTrades,
  getConfig, setConfig, getAllConfigs,
  getSimBalanceHistory
} from "./db";
import { sendSignalAlert, sendTelegramMessage, testTelegram } from "./telegram";
import { getEngineStatus } from "./signalEngine";

const EXCHANGE_SCHEMA = z.enum(["binance", "okx", "bybit"]);
const DEFAULT_SYMBOLS = ["BTC/USDT", "ETH/USDT", "SOL/USDT", "BNB/USDT", "XRP/USDT"];

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ===== 行情数据 =====
  market: router({
    ticker: publicProcedure
      .input(z.object({ exchange: EXCHANGE_SCHEMA, symbol: z.string() }))
      .query(async ({ input }) => fetchTicker(input.exchange as ExchangeId, input.symbol)),

    tickers: publicProcedure
      .input(z.object({ exchange: EXCHANGE_SCHEMA, symbols: z.array(z.string()).optional() }))
      .query(async ({ input }) => fetchTickers(input.exchange as ExchangeId, input.symbols ?? DEFAULT_SYMBOLS)),

    klines: publicProcedure
      .input(z.object({ exchange: EXCHANGE_SCHEMA, symbol: z.string(), timeframe: z.string().default("1h"), limit: z.number().default(100) }))
      .query(async ({ input }) => fetchOHLCV(input.exchange as ExchangeId, input.symbol, input.timeframe, input.limit)),

    fundingRate: publicProcedure
      .input(z.object({ exchange: EXCHANGE_SCHEMA, symbol: z.string() }))
      .query(async ({ input }) => fetchFundingRate(input.exchange as ExchangeId, input.symbol)),

    overview: publicProcedure.query(async () => {
      const exchanges: ExchangeId[] = ["binance", "okx", "bybit"];
      const results: any[] = [];
      for (const ex of exchanges) {
        const tickers = await fetchTickers(ex, ["BTC/USDT", "ETH/USDT", "SOL/USDT", "BNB/USDT"]);
        results.push(...tickers);
      }
      return results;
    }),
  }),

  // ===== 账户与持仓 =====
  account: router({
    balance: publicProcedure
      .input(z.object({ exchange: EXCHANGE_SCHEMA }))
      .query(async ({ input }) => fetchBalance(input.exchange as ExchangeId)),

    allBalances: publicProcedure.query(async () => {
      const exchanges: ExchangeId[] = ["binance", "okx", "bybit"];
      const results: Record<string, any> = {};
      for (const ex of exchanges) { results[ex] = await fetchBalance(ex); }
      return results;
    }),

    positions: publicProcedure
      .input(z.object({ exchange: EXCHANGE_SCHEMA }))
      .query(async ({ input }) => fetchPositions(input.exchange as ExchangeId)),

    allPositions: publicProcedure.query(async () => {
      const exchanges: ExchangeId[] = ["binance", "okx", "bybit"];
      const all: any[] = [];
      for (const ex of exchanges) { all.push(...(await fetchPositions(ex))); }
      return all;
    }),

    testConnection: publicProcedure
      .input(z.object({ exchange: EXCHANGE_SCHEMA }))
      .query(async ({ input }) => testConnection(input.exchange as ExchangeId)),
  }),

  // ===== 实盘交易 =====
  trades: router({
    history: publicProcedure
      .input(z.object({ exchange: EXCHANGE_SCHEMA, symbol: z.string().optional(), limit: z.number().default(50) }))
      .query(async ({ input }) => fetchTrades(input.exchange as ExchangeId, input.symbol, input.limit)),

    createOrder: publicProcedure
      .input(z.object({
        exchange: EXCHANGE_SCHEMA,
        symbol: z.string(),
        type: z.enum(["market", "limit"]),
        side: z.enum(["buy", "sell"]),
        amount: z.number().positive(),
        price: z.number().optional(),
      }))
      .mutation(async ({ input }) =>
        createOrder(input.exchange as ExchangeId, input.symbol, input.type, input.side, input.amount, input.price)
      ),
  }),

  // ===== 交易信号 =====
  signals: router({
    list: publicProcedure
      .input(z.object({ limit: z.number().default(50) }))
      .query(async ({ input }) => getRecentSignals(input.limit)),

    create: publicProcedure
      .input(z.object({
        exchange: EXCHANGE_SCHEMA,
        symbol: z.string(),
        type: z.enum(["LONG", "SHORT", "CLOSE"]),
        source: z.string(),
        price: z.number(),
        score: z.number().default(70),
        reason: z.string().optional(),
        sendTelegram: z.boolean().default(true),
      }))
      .mutation(async ({ input }) => {
        await insertSignal({
          exchange: input.exchange, symbol: input.symbol, type: input.type,
          source: input.source, price: String(input.price), score: input.score,
          reason: input.reason, telegramSent: false,
        });
        if (input.sendTelegram) {
          await sendSignalAlert({
            exchange: input.exchange, symbol: input.symbol, type: input.type,
            source: input.source, price: input.price, score: input.score, reason: input.reason,
          });
        }
        return { success: true };
      }),

    engineStatus: publicProcedure.query(() => getEngineStatus()),
  }),

  // ===== 模拟盘 =====
  sim: router({
    positions: publicProcedure.query(async () => {
      const positions = await getOpenSimPositions();
      return positions.map(p => ({
        ...p,
        size: Number(p.size), entryPrice: Number(p.entryPrice),
        currentPrice: Number(p.currentPrice), pnl: Number(p.pnl),
        pnlPct: Number(p.pnlPct), closePrice: p.closePrice ? Number(p.closePrice) : null,
      }));
    }),

    openPosition: publicProcedure
      .input(z.object({
        exchange: EXCHANGE_SCHEMA, symbol: z.string(),
        side: z.enum(["long", "short"]), size: z.number().positive(),
        leverage: z.number().default(1), sendTelegram: z.boolean().default(true),
      }))
      .mutation(async ({ input }) => {
        const ticker = await fetchTicker(input.exchange as ExchangeId, input.symbol);
        if (!ticker?.last) throw new Error("无法获取当前价格");
        const entryPrice = ticker.last;
        await insertSimPosition({
          exchange: input.exchange, symbol: input.symbol, side: input.side,
          size: String(input.size), entryPrice: String(entryPrice),
          currentPrice: String(entryPrice), leverage: input.leverage,
        });
        await insertSimTrade({
          exchange: input.exchange, symbol: input.symbol,
          side: input.side === "long" ? "buy" : "sell",
          size: String(input.size), price: String(entryPrice),
        });
        if (input.sendTelegram) {
          await sendTelegramMessage(
            `📊 <b>【模拟盘】开仓通知</b>\n\n` +
            `交易对：${input.symbol}\n方向：${input.side === "long" ? "🟢 做多" : "🔴 做空"}\n` +
            `数量：${input.size}\n开仓价：$${entryPrice.toFixed(4)}\n杠杆：${input.leverage}x\n` +
            `⏰ ${new Date().toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })}`
          );
        }
        return { success: true, entryPrice };
      }),

    closePosition: publicProcedure
      .input(z.object({ id: z.number(), sendTelegram: z.boolean().default(true) }))
      .mutation(async ({ input }) => {
        const positions = await getOpenSimPositions();
        const pos = positions.find(p => p.id === input.id);
        if (!pos) throw new Error("持仓不存在");
        const ticker = await fetchTicker(pos.exchange as ExchangeId, pos.symbol);
        const closePrice = ticker?.last ?? Number(pos.currentPrice);
        const entryPrice = Number(pos.entryPrice);
        const size = Number(pos.size);
        const pnl = pos.side === "long" ? (closePrice - entryPrice) * size : (entryPrice - closePrice) * size;
        await closeSimPosition(input.id, closePrice, pnl);
        await insertSimTrade({
          exchange: pos.exchange, symbol: pos.symbol,
          side: pos.side === "long" ? "sell" : "buy",
          size: String(size), price: String(closePrice), pnl: String(pnl), signalId: null,
        });
        if (input.sendTelegram) {
          await sendTelegramMessage(
            `💰 <b>【模拟盘】平仓通知</b>\n\n` +
            `交易对：${pos.symbol}\n平仓价：$${closePrice.toFixed(4)}\n` +
            `盈亏：${pnl >= 0 ? "+" : ""}$${pnl.toFixed(2)}\n` +
            `⏰ ${new Date().toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })}`
          );
        }
        return { success: true, pnl, closePrice };
      }),

    trades: publicProcedure
      .input(z.object({ limit: z.number().default(50) }))
      .query(async ({ input }) => {
        const trades = await getRecentSimTrades(input.limit);
        return trades.map(t => ({
          ...t, size: Number(t.size), price: Number(t.price), pnl: Number(t.pnl), fee: Number(t.fee),
        }));
      }),

    balanceHistory: publicProcedure.query(async () => {
      const history = await getSimBalanceHistory(100);
      return history.map(h => ({
        ...h, balance: Number(h.balance), equity: Number(h.equity), pnl: Number(h.pnl),
      }));
    }),
  }),

  // ===== 系统设置 =====
  settings: router({
    getAll: publicProcedure.query(async () => getAllConfigs()),

    save: publicProcedure
      .input(z.object({ key: z.string(), value: z.string() }))
      .mutation(async ({ input }) => { await setConfig(input.key, input.value); return { success: true }; }),

    saveMany: publicProcedure
      .input(z.array(z.object({ key: z.string(), value: z.string() })))
      .mutation(async ({ input }) => {
        for (const { key, value } of input) await setConfig(key, value);
        return { success: true };
      }),

    testTelegram: publicProcedure.mutation(async () => testTelegram()),

    sendTelegram: publicProcedure
      .input(z.object({ message: z.string() }))
      .mutation(async ({ input }) => ({ success: await sendTelegramMessage(input.message) })),
  }),
});

export type AppRouter = typeof appRouter;
