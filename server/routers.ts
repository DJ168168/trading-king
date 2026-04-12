// @ts-nocheck
import { z } from "zod";
import { COOKIE_NAME } from "../shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import {
  getRecentSignals, getRecentConfluenceSignals,
  getTrades, getOpenTrades, getTodayStats, insertTrade, closeTrade,
  getAllPositions, upsertPosition, deletePosition,
  getActiveConfig, getAllConfigs, upsertStrategyConfig, updateStrategyConfig,
  getLatestSnapshot, getSnapshotHistory, insertAccountSnapshot,
  getBacktestResults, insertBacktestResult,
  getTelegramConfig, upsertTelegramConfig,
  getStrategyWinRateStats, getTradeCases,
  addVsSignalStat, updateVsSignalStat, getVsSignalStats, getVsSignalWinRate,
} from "./db";
import { processSignal, getCacheStatus, generateMockSignal, hasRiskSignal } from "./signalEngine";
import { evaluateStrategies, buildSignalContext, getAllStrategiesInfo } from "./strategyEngine";
import { checkRisk, calcPositionSize, calcDynamicPositionPercent, calcDynamicStopLoss, calcDynamicTakeProfit, getBtcTrend, getCooldownStatus, markCooldown } from "./riskManager";
import {
  getWarnMessages, getAIMessages, getFearGreedIndex,
  parseSignalContent, FUNDS_MOVEMENT_TYPE_MAP,
  setVSToken, getVSToken, getVSTokenStatus, initVSTokenFromDB,
  getFundsCoinList, getChanceCoinList, getRiskCoinList,
  getTokenList, getCoinSocialSentiment,
  getWarnMessageWithToken,
  loginValueScan, startAutoRefreshTimer, stopAutoRefreshTimer,
  getOpenChanceCoinList, getOpenRiskCoinList, getOpenFundsCoinList,
  getOpenBtcDenseArea, getOpenPriceMarketList, getOpenAiAnalyseList,
  getOpenLargeTradeList, getOpenCoinTrade, getOpenSocialSentiment,
  getOpenChanceCoinMessages, getOpenRiskCoinMessages, getOpenFundsCoinMessages,
} from "./valueScanService";
import { saveVSLoginCredentials, loadVSLoginCredentials } from "./db";
import { getNewsSentiment, getCoinNewsSentiment } from "./newsService";
import { TRPCError } from "@trpc/server";
import { getMarketOverview, getMultiFundingRates, getMultiOpenInterest, getMultiLongShortRatio } from "./coinGlassService";
import { createBinanceService } from "./binanceService";
import { createOKXService } from "./okxService";
import { createBybitService } from "./bybitService";
import { createGateService } from "./gateService";
import { createBitgetService } from "./bitgetService";
import {
  startPaperTradingEngine, stopPaperTradingEngine, isEngineRunning, runPaperTradingCycle, getEngineStatus
} from "./paperTradingEngine";
import {
  startLiveTradingEngine, stopLiveTradingEngine, isLiveEngineRunning, getLiveEngineStatus
} from "./liveTradingEngine";
import { getDb } from "./db";
import {
  getFearGreedHistory, getGlobalMarket, getTrendingCoins, calcBullBearScore,
  getOKXLongShortRatio, getOKXTakerRatio, getTechnicalScore,
  type OKXLongShortData, type OKXTakerData, type TechnicalScore,
} from "./freeDataService";
import {
  paperAccount, paperPositions, paperTrades, paperEquityCurve
} from "../drizzle/schema";
import { desc, eq } from "drizzle-orm";

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

  // ─── 信号相关 ──────────────────────────────────────────────────────────────
  signals: router({
    // 获取最近信号列表
    list: publicProcedure
      .input(z.object({ limit: z.number().default(50) }).optional())
      .query(async ({ input }) => {
        return getRecentSignals(input?.limit ?? 50);
      }),

    // 获取聚合信号列表
    confluenceList: publicProcedure
      .input(z.object({ limit: z.number().default(20) }).optional())
      .query(async ({ input }) => {
        return getRecentConfluenceSignals(input?.limit ?? 20);
      }),

    // 手动提交信号（来自 ValueScan webhook 或手动测试）
    submit: publicProcedure
      .input(z.object({
        messageType: z.number(),
        messageId: z.string(),
        symbol: z.string(),
        data: z.any().optional(),
      }))
      .mutation(async ({ input }) => {
        const config = await getActiveConfig();
        const timeWindow = config?.signalTimeWindow ?? 300;
        const minScore = config?.minSignalScore ?? 0.6;
        const confluence = await processSignal(input.messageType, input.messageId, input.symbol, input.data ?? {}, timeWindow, minScore);

        // 当有聚合信号时，运行 6 大高胜率策略引擎评估
        let strategyResult = null;
        if (confluence) {
          const recentSigs = await getRecentSignals(100);
          const oneHourAgo = Date.now() - 3600000;
          const recentHour = recentSigs.filter(s => new Date(s.createdAt).getTime() > oneHourAgo);
          const fomoCount = recentHour.filter(s => s.signalType === 'FOMO').length;
          const alphaCount = recentHour.filter(s => s.signalType === 'ALPHA').length;
          const riskCount = recentHour.filter(s => s.signalType === 'RISK').length;
          const uniqueSymbols = new Set(recentHour.map(s => s.symbol)).size;

          const ctx = buildSignalContext({
            symbol: input.symbol,
            messageType: input.messageType,
            rawData: input.data ?? {},
            recentSignalStats: {
              fomoCount, alphaCount, riskCount,
              totalCount: recentHour.length,
              uniqueSymbols,
            },
          });
          strategyResult = evaluateStrategies(ctx);

          // 自动交易引擎联动：评分超过阈值时自动下单
          let autoTradeResult: { success: boolean; message: string } | null = null;
          const scorePercent = Math.round(confluence.score * 100);
          const minThreshold = (config as any)?.minScoreThreshold ?? 60;
          const shouldAutoTrade = config?.autoTradingEnabled && scorePercent >= minThreshold;

          if (shouldAutoTrade) {
            const triggeredStrategy = strategyResult?.allResults?.find((r: any) => r.triggered);
            const direction: 'long' | 'short' = triggeredStrategy?.direction === 'short' ? 'short' : 'long';
            const exchange = (config as any)?.selectedExchange ?? 'binance';
            const symbol = confluence.symbol.endsWith('USDT') ? confluence.symbol : `${confluence.symbol}USDT`;
            const leverage = config?.leverage ?? 5;
            // ── 动态仓位管理：评分越高仓位越大（60分=base%, 90+=5*base%）
            const basePercent = Number((config as any)?.autoTradingPositionPercent ?? 1);
            const posPercent = calcDynamicPositionPercent(scorePercent, basePercent, Math.min(basePercent * 5, 10));
            // ── ATR动态止损：评分越高止损越紧（高质量信号不需要太宽的止损）
            const dynamicSL = calcDynamicStopLoss(scorePercent, config?.stopLossPercent ?? 3.0);
            const dynamicTP = calcDynamicTakeProfit(dynamicSL, config?.takeProfit1Percent ?? 5.0, config?.takeProfit2Percent ?? 10.0);
            // ── BTC趋势过滤：下跌趋势禁止做多
            if (direction === 'long') {
              const btcTrend = await getBtcTrend();
              if (btcTrend === 'down') {
                autoTradeResult = { success: false, message: `BTC下跌趋势过滤，禁止做多 ${symbol}` };
              }
            }

            if (!autoTradeResult) try {
              if (exchange === 'binance' && (config as any)?.binanceApiKey) {
                const svc = createBinanceService((config as any).binanceApiKey, (config as any).binanceSecretKey ?? '', (config as any).binanceUseTestnet ?? false);
                const bal = await svc.getUSDTBalance();
                const qty = Math.max(10, bal.balance * posPercent / 100) / leverage;
                const qtyRounded = Math.floor(qty * 1000) / 1000;
                if (direction === 'long') await svc.openLong(symbol, qtyRounded, leverage);
                else await svc.openShort(symbol, qtyRounded, leverage);
                autoTradeResult = { success: true, message: `Binance ${direction === 'long' ? '做多' : '做空'} ${symbol} qty=${qtyRounded}` };
              } else if (exchange === 'okx' && (config as any)?.okxApiKey) {
                const svc = createOKXService((config as any).okxApiKey, (config as any).okxSecretKey ?? '', (config as any).okxPassphrase ?? '', (config as any).okxUseDemo ?? false);
                const bal = await svc.getBalance('USDT');
                const notional = Math.max(10, bal.balance * posPercent / 100);
                const instId = `${symbol.replace('USDT','')}-USDT-SWAP`;
                await svc.placeOrder({ instId, tdMode: 'cross', side: direction === 'long' ? 'buy' : 'sell', posSide: direction === 'long' ? 'long' : 'short', ordType: 'market', sz: String(Math.floor(notional / leverage)) });
                autoTradeResult = { success: true, message: `OKX ${direction === 'long' ? '做多' : '做空'} ${instId}` };
              } else if (exchange === 'bybit' && (config as any)?.bybitApiKey) {
                const svc = createBybitService({ apiKey: (config as any).bybitApiKey, secretKey: (config as any).bybitSecretKey ?? '', useTestnet: (config as any).bybitUseTestnet ?? false });
                const balList = await svc.getBalance();
                const usdtBal = Number(balList.find((c: any) => c.coin === 'USDT')?.walletBalance ?? 0);
                const qty = Math.max(10, usdtBal * posPercent / 100) / leverage;
                await svc.setLeverage('linear', symbol, String(leverage), String(leverage));
                await svc.placeOrder({ category: 'linear', symbol, side: direction === 'long' ? 'Buy' : 'Sell', orderType: 'Market', qty: String(Math.floor(qty * 1000) / 1000) });
                autoTradeResult = { success: true, message: `Bybit ${direction === 'long' ? '做多' : '做空'} ${symbol}` };
              } else if (exchange === 'gate' && (config as any)?.gateApiKey) {
                const svc = createGateService({ apiKey: (config as any).gateApiKey, secretKey: (config as any).gateSecretKey ?? '' });
                const bal = await svc.getBalance();
                const notional = Math.max(10, Number(bal?.total ?? 0) * posPercent / 100);
                const size = Math.floor(notional / leverage) * (direction === 'long' ? 1 : -1);
                await svc.placeOrder('usdt', { contract: symbol, size, price: '0', tif: 'ioc' });
                autoTradeResult = { success: true, message: `Gate.io ${direction === 'long' ? '做多' : '做空'} ${symbol}` };
              } else if (exchange === 'bitget' && (config as any)?.bitgetApiKey) {
                const svc = createBitgetService({ apiKey: (config as any).bitgetApiKey, secretKey: (config as any).bitgetSecretKey ?? '', passphrase: (config as any).bitgetPassphrase ?? '' });
                const bal = await svc.getBalance();
                const notional = Math.max(10, Number(bal?.available ?? 0) * posPercent / 100);
                await svc.placeOrder({ symbol, productType: 'USDT-FUTURES', marginMode: 'crossed', marginCoin: 'USDT', size: String(Math.floor(notional / leverage * 1000) / 1000), side: direction === 'long' ? 'buy' : 'sell', tradeSide: 'open', orderType: 'market' });
                autoTradeResult = { success: true, message: `Bitget ${direction === 'long' ? '做多' : '做空'} ${symbol}` };
              } else {
                autoTradeResult = { success: false, message: '未配置该交易所 API Key' };
              }
            } catch (e: any) {
              autoTradeResult = { success: false, message: `下单失败: ${e.message ?? '未知错误'}` };
              // 下单失败时标记冷却期（防止反复尝试）
              markCooldown(confluence.symbol);
            }
          }

          // 发送 Telegram 通知（聚合信号触发时必定发送）
          try {
            const tgConfig = await getTelegramConfig();
            if (tgConfig?.botToken && tgConfig?.chatId && tgConfig?.enableTradeNotify) {
              const triggeredStrategy = strategyResult?.allResults?.find((r: any) => r.triggered);
              const scorePercent2 = Math.round(confluence.score * 100);
              const minThreshold2 = (config as any)?.minScoreThreshold ?? 60;
              const strategyName = triggeredStrategy ? `\n🎯 策略: <b>${triggeredStrategy.strategyName}</b> (胜率${Math.round(triggeredStrategy.winRate * 100)}%)` : '';
              let tradeStatus: string;
              if (!config?.autoTradingEnabled) {
                tradeStatus = '⚪️ 自动交易未开启';
              } else if (scorePercent2 < minThreshold2) {
                tradeStatus = `⚠️ 评分 ${scorePercent2}% < 阈值 ${minThreshold2}%，未下单`;
              } else if (autoTradeResult?.success) {
                tradeStatus = `✅ 自动下单: ${autoTradeResult.message}`;
              } else if (autoTradeResult) {
                tradeStatus = `❌ ${autoTradeResult.message}`;
              } else {
                tradeStatus = '⚠️ 交易所未配置';
              }
              const msg = `🚀 <b>勇少交易之王</b>\n\n` +
                `💎 <b>${confluence.symbol}</b> FOMO+Alpha 共振\n` +
                `📊 评分: <b>${scorePercent2}%</b> (阈值 ${minThreshold2}%)${strategyName}\n` +
                `⏱ 时间差: ${confluence.timeGap.toFixed(1)}s\n` +
                `${tradeStatus}\n` +
                `🕐 ${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}`;
              await fetch(`https://api.telegram.org/bot${tgConfig.botToken}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chat_id: tgConfig.chatId, text: msg, parse_mode: 'HTML' }),
              }).catch(() => {});
            }
          } catch (_) {}
        }

        return { success: true, confluence, strategyResult };
      }),

    // 模拟信号（演示用）
    mock: publicProcedure
      .input(z.object({ symbol: z.string().optional() }).optional())
      .mutation(async ({ input }) => {
        const mock = generateMockSignal(input?.symbol);
        const config = await getActiveConfig();
        const timeWindow = config?.signalTimeWindow ?? 300;
        const minScore = config?.minSignalScore ?? 0.6;
        const confluence = await processSignal(mock.messageType, mock.messageId, mock.symbol, mock.data, timeWindow, minScore);

        // 模拟信号也运行策略引擎评估
        const recentSigs = await getRecentSignals(100);
        const oneHourAgo = Date.now() - 3600000;
        const recentHour = recentSigs.filter(s => new Date(s.createdAt).getTime() > oneHourAgo);
        const fomoCount = recentHour.filter(s => s.signalType === 'FOMO').length;
        const alphaCount = recentHour.filter(s => s.signalType === 'ALPHA').length;
        const riskCount = recentHour.filter(s => s.signalType === 'RISK').length;
        const uniqueSymbols = new Set(recentHour.map(s => s.symbol)).size;
        const ctx = buildSignalContext({
          symbol: mock.symbol,
          messageType: mock.messageType,
          rawData: mock.data ?? {},
          recentSignalStats: { fomoCount, alphaCount, riskCount, totalCount: recentHour.length, uniqueSymbols },
        });
        const strategyResult = evaluateStrategies(ctx);

        return { signal: mock, confluence, strategyResult };
      }),

    // 获取信号引擎缓存状态
    cacheStatus: publicProcedure.query(() => getCacheStatus()),
  }),

  // ─── 6 大高胜率策略 ──────────────────────────────────────────────────────────
  strategies: router({
    // 获取所有策略信息
    list: publicProcedure.query(() => getAllStrategiesInfo()),

    // 手动评估当前信号上下文
    evaluate: publicProcedure
      .input(z.object({
        symbol: z.string(),
        messageType: z.number().optional(),
        rawData: z.any().optional(),
        recentSignalStats: z.object({
          fomoCount: z.number().default(0),
          alphaCount: z.number().default(0),
          riskCount: z.number().default(0),
          totalCount: z.number().default(0),
          uniqueSymbols: z.number().default(0),
        }).optional(),
      }))
      .query(async ({ input }) => {
        const recentSigs = await getRecentSignals(100);
        const oneHourAgo = Date.now() - 3600000;
        const recentHour = recentSigs.filter(s => new Date(s.createdAt).getTime() > oneHourAgo);
        const fomoCount = input.recentSignalStats?.fomoCount ?? recentHour.filter(s => s.signalType === 'FOMO').length;
        const alphaCount = input.recentSignalStats?.alphaCount ?? recentHour.filter(s => s.signalType === 'ALPHA').length;
        const riskCount = input.recentSignalStats?.riskCount ?? recentHour.filter(s => s.signalType === 'RISK').length;
        const totalCount = input.recentSignalStats?.totalCount ?? recentHour.length;
        const uniqueSymbols = input.recentSignalStats?.uniqueSymbols ?? new Set(recentHour.map(s => s.symbol)).size;
        const ctx = buildSignalContext({
          symbol: input.symbol,
          messageType: input.messageType ?? 110,
          rawData: input.rawData ?? {},
          recentSignalStats: { fomoCount, alphaCount, riskCount, totalCount, uniqueSymbols },
        });
        return evaluateStrategies(ctx);
      }),
  }),

  // ─── 交易相关 ──────────────────────────────────────────────────────────────
  trades: router({
    list: publicProcedure
      .input(z.object({ limit: z.number().default(50), offset: z.number().default(0) }).optional())
      .query(async ({ input }) => {
        return getTrades(input?.limit ?? 50, input?.offset ?? 0);
      }),

    open: publicProcedure.query(async () => getOpenTrades()),

    todayStats: publicProcedure.query(async () => getTodayStats()),

    // 手动开仓（演示/测试用）
    openManual: publicProcedure
      .input(z.object({
        symbol: z.string(),
        quantity: z.number().positive(),
        entryPrice: z.number().positive(),
        stopLoss: z.number().optional(),
        takeProfit1: z.number().optional(),
        takeProfit2: z.number().optional(),
        leverage: z.number().default(5),
        signalScore: z.number().optional(),
        confluenceSignalId: z.number().optional(),
        skipRiskCheck: z.boolean().default(false), // 手动操作可跳过风控
      }))
      .mutation(async ({ input }) => {
        // 风控检查（手动开仓默认跳过自动交易限制）
        if (!input.skipRiskCheck) {
          const positionValue = input.quantity * input.entryPrice;
          const riskResult = await checkRisk(input.symbol, positionValue);
          // 手动开仓只检查紧急停止和重复持仓，不检查自动交易开关
          if (riskResult.code === "EMERGENCY_STOP" || riskResult.code === "DUPLICATE_POSITION") {
            return { success: false, error: riskResult.reason, code: riskResult.code };
          }
        }
        const config = await getActiveConfig();
        const sl = input.stopLoss ?? input.entryPrice * (1 - (config?.stopLossPercent ?? 3) / 100);
        const tp1 = input.takeProfit1 ?? input.entryPrice * (1 + (config?.takeProfit1Percent ?? 5) / 100);
        const tp2 = input.takeProfit2 ?? input.entryPrice * (1 + (config?.takeProfit2Percent ?? 10) / 100);
        const trade = await insertTrade({
          symbol: input.symbol.toUpperCase(),
          action: "OPEN_LONG",
          quantity: input.quantity,
          entryPrice: input.entryPrice,
          stopLoss: sl,
          takeProfit1: tp1,
          takeProfit2: tp2,
          leverage: input.leverage,
          signalScore: input.signalScore,
          confluenceSignalId: input.confluenceSignalId,
          status: "open",
          isTestnet: config?.useTestnet ?? true,
        });
        if (trade) {
          await upsertPosition({
            symbol: input.symbol.toUpperCase(),
            quantity: input.quantity,
            entryPrice: input.entryPrice,
            currentPrice: input.entryPrice,
            leverage: input.leverage,
            stopLoss: sl,
            takeProfit1: tp1,
            takeProfit2: tp2,
            tradeId: trade.id,
          });
        }
        return { success: true, trade };
      }),

    // 手动平仓
    closeManual: publicProcedure
      .input(z.object({
        tradeId: z.number(),
        exitPrice: z.number().positive(),
        closeReason: z.string().default("手动平仓"),
      }))
      .mutation(async ({ input }) => {
        const openTrades = await getOpenTrades();
        const trade = openTrades.find(t => t.id === input.tradeId);
        if (!trade) return { success: false, error: "交易不存在或已关闭" };
        const pnl = (input.exitPrice - trade.entryPrice) * trade.quantity;
        const pnlPercent = ((input.exitPrice - trade.entryPrice) / trade.entryPrice) * 100;
        await closeTrade(trade.id, input.exitPrice, pnl, pnlPercent, input.closeReason);
        await deletePosition(trade.symbol);
        return { success: true, pnl, pnlPercent };
      }),
  }),

  // ─── 持仓相关 ──────────────────────────────────────────────────────────────
  positions: router({
    list: publicProcedure.query(async () => getAllPositions()),

    updatePrice: publicProcedure
      .input(z.object({ symbol: z.string(), currentPrice: z.number().positive() }))
      .mutation(async ({ input }) => {
        const positions = await getAllPositions();
        const pos = positions.find(p => p.symbol === input.symbol.toUpperCase());
        if (!pos) return { success: false };
        const unrealizedPnl = (input.currentPrice - pos.entryPrice) * pos.quantity;
        const unrealizedPnlPercent = ((input.currentPrice - pos.entryPrice) / pos.entryPrice) * 100;
        await upsertPosition({ ...pos, currentPrice: input.currentPrice, unrealizedPnl, unrealizedPnlPercent });
        return { success: true };
      }),
  }),

  // ─── 策略配置 ──────────────────────────────────────────────────────────────
  config: router({
    active: publicProcedure.query(async () => {
      const config = await getActiveConfig();
      if (!config) {
        // 返回默认配置
        return {
          id: 0, name: "默认策略", signalTimeWindow: 300, minSignalScore: 0.6,
          enableFomoIntensify: true, maxPositionPercent: 10.0, maxTotalPositionPercent: 50.0,
          maxDailyTrades: 20, maxDailyLossPercent: 5.0, stopLossPercent: 3.0,
          takeProfit1Percent: 5.0, takeProfit2Percent: 10.0, leverage: 5,
          marginType: "ISOLATED" as const, symbolSuffix: "USDT", enableTrailingStop: false,
          trailingStopActivation: 3.0, trailingStopCallback: 1.5, autoTradingEnabled: false,
          useTestnet: true, emergencyStop: false, isActive: true,
          createdAt: new Date(), updatedAt: new Date(),
        };
      }
      return config;
    }),

    list: publicProcedure.query(async () => getAllConfigs()),

    save: publicProcedure
      .input(z.object({
        name: z.string().default("默认策略"),
        signalTimeWindow: z.number().min(60).max(3600).default(300),
        minSignalScore: z.number().min(0).max(1).default(0.6),
        enableFomoIntensify: z.boolean().default(true),
        maxPositionPercent: z.number().min(1).max(100).default(10),
        maxTotalPositionPercent: z.number().min(10).max(100).default(50),
        maxDailyTrades: z.number().min(1).max(100).default(20),
        maxDailyLossPercent: z.number().min(0.5).max(50).default(5),
        stopLossPercent: z.number().min(0.5).max(20).default(3),
        takeProfit1Percent: z.number().min(1).max(50).default(5),
        takeProfit2Percent: z.number().min(2).max(100).default(10),
        leverage: z.number().min(1).max(125).default(5),
        marginType: z.enum(["ISOLATED", "CROSSED"]).default("ISOLATED"),
        symbolSuffix: z.string().default("USDT"),
        enableTrailingStop: z.boolean().default(false),
        trailingStopActivation: z.number().default(3),
        trailingStopCallback: z.number().default(1.5),
        autoTradingEnabled: z.boolean().default(false),
        useTestnet: z.boolean().default(true),
        emergencyStop: z.boolean().default(false),
        binanceApiKey: z.string().optional().default(""),
        binanceSecretKey: z.string().optional().default(""),
      }))
      .mutation(async ({ input }) => {
        const config = await upsertStrategyConfig({ ...input, isActive: true });
        return { success: true, config };
      }),

    toggleEmergencyStop: publicProcedure
      .input(z.object({ id: z.number(), enabled: z.boolean() }))
      .mutation(async ({ input }) => {
        await updateStrategyConfig(input.id, { emergencyStop: input.enabled });
        return { success: true };
      }),

    toggleAutoTrading: publicProcedure
      .input(z.object({ id: z.number(), enabled: z.boolean() }))
      .mutation(async ({ input }) => {
        await updateStrategyConfig(input.id, { autoTradingEnabled: input.enabled });
        return { success: true };
      }),
  }),

  // ─── 账户余额 ──────────────────────────────────────────────────────────────
  account: router({
    snapshot: publicProcedure.query(async () => getLatestSnapshot()),

    history: publicProcedure
      .input(z.object({ hours: z.number().default(24) }).optional())
      .query(async ({ input }) => getSnapshotHistory(input?.hours ?? 24)),

    updateSnapshot: publicProcedure
      .input(z.object({
        totalBalance: z.number(),
        availableBalance: z.number(),
        unrealizedPnl: z.number().default(0),
        dailyPnl: z.number().default(0),
        dailyTrades: z.number().default(0),
        positionCount: z.number().default(0),
      }))
      .mutation(async ({ input }) => {
        await insertAccountSnapshot(input);
        return { success: true };
      }),

    // 模拟账户数据（演示用）
    mockSnapshot: publicProcedure.mutation(async () => {
      const totalBalance = 10000 + Math.random() * 2000 - 1000;
      const availableBalance = totalBalance * (0.5 + Math.random() * 0.3);
      const unrealizedPnl = Math.random() * 500 - 200;
      const dailyPnl = Math.random() * 300 - 100;
      await insertAccountSnapshot({ totalBalance, availableBalance, unrealizedPnl, dailyPnl, dailyTrades: Math.floor(Math.random() * 10), positionCount: Math.floor(Math.random() * 5) });
      return { totalBalance, availableBalance, unrealizedPnl, dailyPnl };
    }),
  }),

  // ─── 回测 ──────────────────────────────────────────────────────────────────
  backtest: router({
    list: publicProcedure.query(async () => getBacktestResults()),

    run: publicProcedure
      .input(z.object({
        name: z.string(),
        startDate: z.string(),
        endDate: z.string(),
        initialBalance: z.number().positive(),
        timeWindow: z.number().default(300),
        minScore: z.number().default(0.6),
        stopLossPercent: z.number().default(3),
        takeProfit1Percent: z.number().default(5),
        takeProfit2Percent: z.number().default(10),
        leverage: z.number().default(5),
      }))
      .mutation(async ({ input }) => {
        // 基于历史信号数据运行回测模拟
        const result = await runBacktest(input);
        const saved = await insertBacktestResult({
          name: input.name,
          startDate: new Date(input.startDate),
          endDate: new Date(input.endDate),
          initialBalance: input.initialBalance,
          finalBalance: result.finalBalance,
          totalReturn: result.totalReturn,
          totalTrades: result.totalTrades,
          winTrades: result.winTrades,
          lossTrades: result.lossTrades,
          winRate: result.winRate,
          maxDrawdown: result.maxDrawdown,
          sharpeRatio: result.sharpeRatio,
          configSnapshot: input,
          tradeLog: result.tradeLog,
        });
        return { success: true, result, id: saved?.id };
      }),
  }),

  // ─── Telegram 配置 ─────────────────────────────────────────────────────────
  telegram: router({
    config: publicProcedure.query(async () => {
      const config = await getTelegramConfig();
      // 不返回 token 明文
      if (config?.botToken) {
        return { ...config, botToken: "****" + config.botToken.slice(-4) };
      }
      return config;
    }),

    save: publicProcedure
      .input(z.object({
        botToken: z.string().optional(),
        chatId: z.string().optional(),
        enableTradeNotify: z.boolean().default(true),
        enableRiskNotify: z.boolean().default(true),
        enableDailyReport: z.boolean().default(true),
        isActive: z.boolean().default(false),
      }))
      .mutation(async ({ input }) => {
        await upsertTelegramConfig(input);
        return { success: true };
      }),

    test: publicProcedure
      .input(z.object({ message: z.string().default("测试消息 - 交易之王系统运行正常 ✅") }))
      .mutation(async ({ input }) => {
        const config = await getTelegramConfig();
        if (!config?.botToken || !config?.chatId || !config?.isActive) {
          return { success: false, error: "Telegram 未配置或未启用" };
        }
        try {
          const res = await fetch(`https://api.telegram.org/bot${config.botToken}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chat_id: config.chatId, text: input.message, parse_mode: "HTML" }),
          });
          const data = await res.json() as any;
          return { success: data.ok, error: data.description };
        } catch (e: any) {
          return { success: false, error: e.message };
        }
      }),
  }),

  // ─── ValueScan 真实信号 API ─────────────────────────────────────────────────
  valueScan: router({
    // 获取实时预警信号（使用 getFundsMovementPage，API Key 认证）
    warnMessages: publicProcedure
      .input(z.object({ pageNum: z.number().default(1), pageSize: z.number().default(20) }).optional())
      .query(async ({ input }) => {
        try {
          const resp = await getWarnMessages(input?.pageNum ?? 1, input?.pageSize ?? 20);
          if (resp.code === 200) {
            // 返回原始信号数据，前端自行解析 content
            return { success: true, data: resp.data || [], userRole: resp.userRole };
          }
          return { success: false, data: [], error: resp.msg };
        } catch (e: any) {
          return { success: false, data: [], error: e.message };
        }
      }),

    // 获取 AI 信号历史（分页）
    aiMessages: publicProcedure
      .input(z.object({
        pageNum: z.number().default(1),
        pageSize: z.number().default(20),
        symbol: z.string().optional(),
        messageType: z.number().optional(),
        fundsMovementType: z.number().optional(),
      }).optional())
      .query(async ({ input }) => {
        try {
          const resp = await getAIMessages(
            input?.pageNum ?? 1,
            input?.pageSize ?? 20,
            { symbol: input?.symbol, messageType: input?.messageType, fundsMovementType: input?.fundsMovementType }
          );
          if (resp.code === 200) {
            return {
              success: true,
              total: resp.data.total,
              // 返回原始信号数据，前端自行解析 content
              list: resp.data.list || [],
              userRole: resp.userRole,
            };
          }
          return { success: false, total: 0, list: [], error: resp.msg };
        } catch (e: any) {
          return { success: false, total: 0, list: [], error: e.message };
        }
      }),

    // 获取恐惧贪婪指数
    fearGreed: publicProcedure.query(async () => {
      try {
        const resp = await getFearGreedIndex();
        if (resp.code === 200) {
          const val = resp.data.now;
          let label = "极度恐惧";
          let color = "#ef4444";
          if (val >= 75) { label = "极度贪婪"; color = "#22c55e"; }
          else if (val >= 55) { label = "贪婪"; color = "#86efac"; }
          else if (val >= 45) { label = "中性"; color = "#facc15"; }
          else if (val >= 25) { label = "恐惧"; color = "#f97316"; }
          return { success: true, value: val, label, color, data: resp.data };
        }
        return { success: false, value: 50, label: "中性", color: "#facc15" };
      } catch (e: any) {
        return { success: false, value: 50, label: "中性", color: "#facc15", error: e.message };
      }
    }),

    // 获取 API 连接状态
    accountInfo: publicProcedure.query(async () => {
      try {
        const status = getVSTokenStatus();
        return { success: true, data: { apiKeyConfigured: status.apiKeyOk, role: "API_KEY" } };
      } catch (e: any) {
        return { success: false, data: null, error: e.message };
      }
    }),

    // 设置 VS Token（登录用户均可配置，用于 warnMessage 接口）
    setToken: publicProcedure
      .input(z.object({ token: z.string().min(10) }))
      .mutation(async ({ input }) => {
        await setVSToken(input.token);
        return { success: true, message: "Token 已配置并持久化到数据库，服务重启后自动恢复" };
      }),
    // VS 自动登录（通过账号密码登录获取 Token）
    autoLogin: publicProcedure
      .input(z.object({
        email: z.string().email(),
        password: z.string().min(6),
        enableAutoRefresh: z.boolean().default(true),
      }))
      .mutation(async ({ input }) => {
        // 无论登录是否成功，都先保存凭证到数据库（以便 ValueScan 恢复后自动重试）
        await saveVSLoginCredentials(input.email, input.password, '', input.enableAutoRefresh);
        const result = await loginValueScan(input.email, input.password);
        if (!result.success || !result.token) {
          // 凭证已保存，启动自动刷新定时器（会定期重试登录）
          if (input.enableAutoRefresh) {
            startAutoRefreshTimer(input.email, input.password);
          }
          return { success: false, message: `${result.msg || '登录失败'}（凭证已保存，将自动重试）` };
        }
        // 保存 Token
        await setVSToken(result.token);
        // 如果开启了自动刷新，启动定时器
        if (input.enableAutoRefresh) {
          startAutoRefreshTimer(input.email, input.password);
        } else {
          stopAutoRefreshTimer();
        }
        return { success: true, message: `登录成功！Token 已获取并保存${input.enableAutoRefresh ? '，已开启 50 分钟自动刷新' : ''}` };
      }),
    // 获取自动登录配置状态
    autoLoginStatus: publicProcedure.query(async () => {
      const creds = await loadVSLoginCredentials();
      return {
        hasCredentials: !!(creds?.email && creds?.password),
        email: creds?.email ? `${creds.email.slice(0, 3)}***${creds.email.slice(-8)}` : null,
        autoRefreshEnabled: creds?.autoRefreshEnabled ?? false,
      };
    }),
    // 停止自动刷新
    stopAutoRefresh: publicProcedure.mutation(async () => {
      stopAutoRefreshTimer();
      const creds = await loadVSLoginCredentials();
      if (creds) {
        await saveVSLoginCredentials(creds.email, creds.password, creds.refreshToken, false);
      }
      return { success: true, message: '已停止自动刷新' };
    }),

    // 获取 Token 状态（如果内存中没有，先从数据库加载）
    tokenStatus: publicProcedure.query(async () => {
      await initVSTokenFromDB();
      const status = getVSTokenStatus();
      const token = getVSToken();
      return {
        hasToken: status.hasUserToken,
        tokenPreview: token ? `${token.slice(0, 20)}...` : null,
        tokenSetAt: status.tokenSetAt,
        // 计算过期时间（Token 有效期约 1 小时）
        tokenExpiresAt: status.tokenSetAt > 0 ? status.tokenSetAt + 3600 * 1000 : null,
        isExpired: status.tokenSetAt > 0 ? Date.now() > status.tokenSetAt + 3600 * 1000 : false,
      };
    }),

    // 获取个人预警信号（需要用户 Token）
    personalWarnMessages: publicProcedure
      .input(z.object({ pageNum: z.number().default(1), pageSize: z.number().default(20) }).optional())
      .query(async ({ input }) => {
        try {
          const resp = await getWarnMessageWithToken(input?.pageNum ?? 1, input?.pageSize ?? 20);
          return {
            success: resp.code === 200,
            data: resp.data || [],
            msg: resp.msg,
            expired: resp.expired ?? false,
          };
        } catch (e: any) {
          return { success: false, data: [], msg: e.message, expired: false };
        }
      }),

    // 信号类型映射表
    signalTypes: publicProcedure.query(() => {
      return Object.entries(FUNDS_MOVEMENT_TYPE_MAP).map(([key, val]) => ({
        fundsMovementType: parseInt(key),
        ...val,
      }));
    }),
    // ── 手动 API Key 管理 ────────────────────────────────────────────────
    getApiKeyConfig: publicProcedure.query(async () => {
      const cfg = await getActiveConfig();
      const vsKey = ((cfg as any)?.vsApiKey as string | undefined)
        || process.env.VALUESCAN_API_KEY
        || process.env.VS_API_KEY
        || "";
      return {
        usingDbKey: !!vsKey,
        apiKeyPreview: vsKey ? `${vsKey.slice(0, 8)}...` : null,
      };
    }),
    saveApiKey: publicProcedure
      .input(z.object({ apiKey: z.string().min(10), secretKey: z.string().min(10) }))
      .mutation(async ({ input }) => {
        const cfg = await getActiveConfig();
        if (!cfg) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: '未找到配置' });
        await updateStrategyConfig(cfg.id, { vsApiKey: input.apiKey, vsSecretKey: input.secretKey } as any);
        return { success: true };
      }),
    testApiKey: publicProcedure
      .input(z.object({ apiKey: z.string().optional(), secretKey: z.string().optional() }))
      .mutation(async ({ input }) => {
        try {
          const cfg = await getActiveConfig();
          const apiKey = input.apiKey || (cfg as any)?.vsApiKey || process.env.VALUESCAN_API_KEY;
          const secretKey = input.secretKey || (cfg as any)?.vsSecretKey || process.env.VALUESCAN_SECRET_KEY || '';
          if (!apiKey) return { success: false, message: '未配置 API Key' };
          const res = await fetch('https://api.valuescan.io/api/v1/market/fear-greed', {
            headers: { 'X-API-KEY': apiKey, 'X-SECRET-KEY': secretKey },
          });
          if (res.ok) return { success: true, message: `API Key 有效！连接成功 (HTTP ${res.status})` };
          return { success: false, message: `连接失败 (HTTP ${res.status})，请检查 API Key` };
        } catch (e: any) {
          return { success: false, message: '网络错误: ' + e.message };
        }
      }),
    clearApiKey: publicProcedure.mutation(async () => {
      const cfg = await getActiveConfig();
      if (!cfg) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: '未找到配置' });
      await updateStrategyConfig(cfg.id, { vsApiKey: null, vsSecretKey: null } as any);
      return { success: true };
    }),
  }),
  // ─── ValueScan Open API 数据面板 ─────────────────────────────────────────────
  vsOpenApi: router({
    chanceCoinList: publicProcedure.query(async () => getOpenChanceCoinList()),
    riskCoinList: publicProcedure.query(async () => getOpenRiskCoinList()),
    fundsCoinList: publicProcedure.query(async () => getOpenFundsCoinList()),
    btcDenseArea: publicProcedure
      .input(z.object({ vsTokenId: z.number().default(1) }).optional())
      .query(async ({ input }) => getOpenBtcDenseArea(input?.vsTokenId ?? 1)),
    priceMarketList: publicProcedure
      .input(z.object({ vsTokenId: z.number().default(1) }).optional())
      .query(async ({ input }) => getOpenPriceMarketList(input?.vsTokenId ?? 1)),
    aiAnalyseList: publicProcedure
      .input(z.object({ vsTokenId: z.number().default(1) }).optional())
      .query(async ({ input }) => getOpenAiAnalyseList(input?.vsTokenId ?? 1)),
    largeTradeList: publicProcedure
      .input(z.object({ vsTokenId: z.number().default(1) }).optional())
      .query(async ({ input }) => getOpenLargeTradeList(input?.vsTokenId ?? 1)),
    coinTrade: publicProcedure
      .input(z.object({ vsTokenId: z.number().default(1) }).optional())
      .query(async ({ input }) => getOpenCoinTrade(input?.vsTokenId ?? 1)),
    socialSentiment: publicProcedure
      .input(z.object({ symbol: z.string().default("BTC") }).optional())
      .query(async ({ input }) => getOpenSocialSentiment(input?.symbol ?? "BTC")),
    chanceCoinMessages: publicProcedure
      .input(z.object({ vsTokenId: z.number(), symbol: z.string().default("") }))
      .query(async ({ input }) => getOpenChanceCoinMessages(input.vsTokenId, input.symbol)),
    riskCoinMessages: publicProcedure
      .input(z.object({ vsTokenId: z.number(), symbol: z.string().default("") }))
      .query(async ({ input }) => getOpenRiskCoinMessages(input.vsTokenId, input.symbol)),
    fundsCoinMessages: publicProcedure
      .input(z.object({ vsTokenId: z.number(), symbol: z.string().default("") }))
      .query(async ({ input }) => getOpenFundsCoinMessages(input.vsTokenId, input.symbol)),
  }),
  // ─── 市场价格（通过 Binance 公开 API））─────────────────────────────────────
  market: router({
    price: publicProcedure
      .input(z.object({ symbol: z.string() }))
      .query(async ({ input }) => {
        try {
          const symbol = input.symbol.toUpperCase().endsWith("USDT") ? input.symbol.toUpperCase() : `${input.symbol.toUpperCase()}USDT`;
          const res = await fetch(`https://fapi.binance.com/fapi/v1/ticker/price?symbol=${symbol}`);
          const data = await res.json() as any;
          return { symbol, price: parseFloat(data.price ?? "0"), success: true };
        } catch (e) {
          return { symbol: input.symbol, price: 0, success: false };
        }
      }),

    klines: publicProcedure
      .input(z.object({ symbol: z.string(), interval: z.string().default("1h"), limit: z.number().default(100) }))
      .query(async ({ input }) => {
        try {
          const symbol = input.symbol.toUpperCase().endsWith("USDT") ? input.symbol.toUpperCase() : `${input.symbol.toUpperCase()}USDT`;
          const res = await fetch(`https://fapi.binance.com/fapi/v1/klines?symbol=${symbol}&interval=${input.interval}&limit=${input.limit}`);
          const raw = await res.json() as any[];
          return raw.map((k: any[]) => ({
            time: k[0],
            open: parseFloat(k[1]),
            high: parseFloat(k[2]),
            low: parseFloat(k[3]),
            close: parseFloat(k[4]),
            volume: parseFloat(k[5]),
          }));
        } catch (e) {
          return [];
        }
      }),

    ticker24h: publicProcedure
      .input(z.object({ symbol: z.string() }))
      .query(async ({ input }) => {
        try {
          const symbol = input.symbol.toUpperCase().endsWith("USDT") ? input.symbol.toUpperCase() : `${input.symbol.toUpperCase()}USDT`;
          const res = await fetch(`https://fapi.binance.com/fapi/v1/ticker/24hr?symbol=${symbol}`);
          const data = await res.json() as any;
          return {
            symbol,
            price: parseFloat(data.lastPrice ?? "0"),
            priceChange: parseFloat(data.priceChange ?? "0"),
            priceChangePercent: parseFloat(data.priceChangePercent ?? "0"),
            high: parseFloat(data.highPrice ?? "0"),
            low: parseFloat(data.lowPrice ?? "0"),
            volume: parseFloat(data.volume ?? "0"),
            success: true,
          };
        } catch (e) {
          return { symbol: input.symbol, price: 0, priceChange: 0, priceChangePercent: 0, high: 0, low: 0, volume: 0, success: false };
        }
      }),

    // 多个币种价格
    multiPrice: publicProcedure
      .input(z.object({ symbols: z.array(z.string()) }))
      .query(async ({ input }) => {
        try {
          const res = await fetch(`https://fapi.binance.com/fapi/v1/ticker/price`);
          const all = await res.json() as any[];
          const map: Record<string, number> = {};
          for (const item of all) {
            map[item.symbol] = parseFloat(item.price);
          }
          return input.symbols.map(s => {
            const sym = s.toUpperCase().endsWith("USDT") ? s.toUpperCase() : `${s.toUpperCase()}USDT`;
            return { symbol: s.toUpperCase(), price: map[sym] ?? 0 };
          });
        } catch (e) {
          return input.symbols.map(s => ({ symbol: s.toUpperCase(), price: 0 }));
        }
      }),
  }),

  // ─── CoinGlass 市场全景数据 ─────────────────────────────────────────────────────
  marketOverview: router({
    // 综合市场全景（资金费率 + 持仓量 + 多空比例）
    overview: publicProcedure
      .input(z.object({ symbols: z.array(z.string()).optional() }).optional())
      .query(async ({ input }) => {
        const symbols = input?.symbols ?? ["BTC", "ETH", "SOL", "BNB", "XRP"];
        return getMarketOverview(symbols);
      }),
    // 资金费率
    fundingRates: publicProcedure
      .input(z.object({ symbols: z.array(z.string()).optional() }).optional())
      .query(async ({ input }) => {
        const symbols = input?.symbols ?? ["BTC", "ETH", "SOL", "BNB", "XRP"];
        return getMultiFundingRates(symbols);
      }),
    // 持仓量
    openInterest: publicProcedure
      .input(z.object({ symbols: z.array(z.string()).optional() }).optional())
      .query(async ({ input }) => {
        const symbols = input?.symbols ?? ["BTC", "ETH", "SOL", "BNB", "XRP"];
        return getMultiOpenInterest(symbols);
      }),
    // 多空比例（Binance）
    longShortRatio: publicProcedure
      .input(z.object({ symbols: z.array(z.string()).optional() }).optional())
      .query(async ({ input }) => {
        const symbols = input?.symbols ?? ["BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT", "XRPUSDT"];
        return getMultiLongShortRatio(symbols);
      }),
  }),
  // ─── ValueScan 链上数据 & 资金流 ─────────────────────────────────────────────
  vsData: router({
    // AI 多空信号列表 - 使用机会/风险列表替代
    aiLongShort: publicProcedure
      .input(z.object({ type: z.enum(["long", "short"]).default("long") }).optional())
      .query(async ({ input }) => {
        try {
          if ((input?.type ?? "long") === "long") {
            const resp = await getChanceCoinList();
            return { success: true, data: resp.data ?? [], code: resp.code, msg: resp.message };
          } else {
            const resp = await getRiskCoinList();
            return { success: true, data: resp.data ?? [], code: resp.code, msg: resp.message };
          }
        } catch (e: any) {
          return { success: false, data: [], error: e.message };
        }
      }),

    // 主力成本 - 使用资金异常列表替代
    whaleCost: publicProcedure
      .input(z.object({ symbol: z.string() }))
      .query(async ({ input }) => {
        try {
          const resp = await getFundsCoinList();
          const found = (resp.data || []).find(item => item.symbol.toUpperCase() === input.symbol.toUpperCase());
          return { success: true, data: found ?? null, code: resp.code, msg: resp.message };
        } catch (e: any) {
          return { success: false, data: null, error: e.message };
        }
      }),

    // 主力成本历史偏离度 - 优先使用真实历史统计，无数据时回退模拟
    whaleCostDeviationHistory: publicProcedure
      .input(z.object({ symbol: z.string() }))
      .query(async ({ input }) => {
        try {
          const symbol = input.symbol.toUpperCase();
          const resp = await getFundsCoinList();
          const found = (resp.data || []).find(item => item.symbol.toUpperCase() === symbol);
          if (!found) return { success: false, data: [], error: '未找到该代币数据' };
          
          const pushPrice = parseFloat(found.pushPrice ?? '0');
          const currentPrice = parseFloat(found.price ?? '0');
          const currentDeviation = pushPrice > 0 && currentPrice > 0 ? ((currentPrice - pushPrice) / pushPrice) * 100 : 0;
          
          // 尝试从数据库获取真实历史统计
          const stats = await getVsSignalStats({ limit: 30 });
          const realHistory = stats
            .filter(s => s.symbol.toUpperCase() === symbol && s.pnlPct24h !== null)
            .map(s => ({
              date: new Date(s.createdAt).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' }),
              ts: new Date(s.createdAt).getTime(),
              deviation: parseFloat((s.pnlPct24h ?? 0).toFixed(2))
            }))
            .sort((a, b) => a.ts - b.ts);

          if (realHistory.length >= 5) {
            // 如果有足够的真实数据，直接返回
            return { success: true, data: realHistory, currentDeviation: parseFloat(currentDeviation.toFixed(2)), pushPrice, currentPrice, isReal: true };
          }

          // 无足够真实数据时，使用平滑模拟逻辑
          const now = Date.now();
          const dayMs = 86400000;
          const gains = found.gains ?? 0;
          const history = Array.from({ length: 30 }, (_, i) => {
            const daysAgo = 29 - i;
            const ts = now - daysAgo * dayMs;
            const seed = (daysAgo * 7 + symbol.charCodeAt(0)) % 100;
            const noise = Math.sin(seed * 0.7) * 5 + Math.cos(seed * 1.3) * 3;
            const startDev = gains - currentDeviation;
            const progress = i / 29;
            const trendDev = startDev * (1 - progress) + currentDeviation * progress;
            const deviation = parseFloat((trendDev + noise * (1 - progress * 0.5)).toFixed(2));
            return { date: new Date(ts).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' }), ts, deviation };
          });
          history[29].deviation = parseFloat(currentDeviation.toFixed(2));
          return { success: true, data: history, currentDeviation: parseFloat(currentDeviation.toFixed(2)), pushPrice, currentPrice, isReal: false };
        } catch (e: any) {
          return { success: false, data: [], error: e.message };
        }
      }),

    // 代币流向（Token Flow）- 使用资金异常列表替代
    tokenFlow: publicProcedure
      .input(z.object({ symbol: z.string(), period: z.string().default("1h") }))
      .query(async ({ input }) => {
        try {
          const resp = await getFundsCoinList();
          const filtered = (resp.data || []).filter(item => item.symbol.toUpperCase() === input.symbol.toUpperCase());
          return { success: true, data: filtered, code: resp.code, msg: resp.message };
        } catch (e: any) {
          return { success: false, data: [], error: e.message };
        }
      }),

    // 主力资金流（Capital Flow）- 使用机会代币列表替代
    capitalFlow: publicProcedure
      .input(z.object({ symbol: z.string(), period: z.string().default("5m") }))
      .query(async ({ input }) => {
        try {
          const resp = await getChanceCoinList();
          const found = (resp.data || []).find(item => item.symbol.toUpperCase() === input.symbol.toUpperCase());
          return { success: true, data: found ?? null, code: resp.code, msg: resp.message };
        } catch (e: any) {
          return { success: false, data: null, error: e.message };
        }
      }),

    // 资金流历史 - 使用风险代币列表替代
    fundFlowHistory: publicProcedure
      .input(z.object({ symbol: z.string(), period: z.string().default("1d") }))
      .query(async ({ input }) => {
        try {
          const resp = await getRiskCoinList();
          const filtered = (resp.data || []).filter(item => item.symbol.toUpperCase() === input.symbol.toUpperCase());
          return { success: true, data: filtered, code: resp.code, msg: resp.message };
        } catch (e: any) {
          return { success: false, data: [], error: e.message };
        }
      }),

    // 板块资金流 - 使用资金异常列表替代
    sectorFlow: publicProcedure
      .input(z.object({ period: z.string().default("1d") }).optional())
      .query(async ({ input: _input }) => {
        try {
          const resp = await getFundsCoinList();
          return { success: true, data: resp.data ?? [], code: resp.code, msg: resp.message };
        } catch (e: any) {
          return { success: false, data: [], error: e.message };
        }
      }),
  }),

  // ─── 策略胜率统计 & 实战案例 ────────────────────────────────────────────
  strategyStats: router({
    winRateStats: publicProcedure.query(async () => {
      return getStrategyWinRateStats();
    }),
    tradeCases: publicProcedure
      .input(z.object({ limit: z.number().default(20) }).optional())
      .query(async ({ input }) => {
        return getTradeCases(input?.limit ?? 20);
      }),

    // 冷却期状态查询
    cooldownStatus: publicProcedure.query(async () => {
      return getCooldownStatus();
    }),

    // BTC 趋势查询
    btcTrend: publicProcedure.query(async () => {
      const trend = await getBtcTrend();
      return { trend };
    }),

    // 动态仓位预览：根据评分预计实际仓位比例
    dynamicPositionPreview: publicProcedure
      .input(z.object({ scorePercent: z.number().min(0).max(100) }))
      .query(async ({ input }) => {
        const config = await getActiveConfig();
        const basePercent = Number((config as any)?.autoTradingPositionPercent ?? 1);
        const posPercent = calcDynamicPositionPercent(input.scorePercent, basePercent, Math.min(basePercent * 5, 10));
        const dynamicSL = calcDynamicStopLoss(input.scorePercent, config?.stopLossPercent ?? 3.0);
        const dynamicTP = calcDynamicTakeProfit(dynamicSL, config?.takeProfit1Percent ?? 5.0, config?.takeProfit2Percent ?? 10.0);
        return { scorePercent: input.scorePercent, posPercent, dynamicSL, dynamicTP };
      }),

    // 信号质量仪表盘：实时信号质量分布 + 各维度指标
    signalQualityDashboard: publicProcedure.query(async () => {
      const cacheStatus = getCacheStatus();
      const recentSignals = await getRecentSignals(200);
      const recentConfluence = await getRecentConfluenceSignals(50);
      const oneHourAgo = Date.now() - 3600000;
      const recentHour = recentSignals.filter(s => new Date(s.createdAt).getTime() > oneHourAgo);

      // 评分分布
      const scoreDistribution = [
        { range: '90-100分', count: recentConfluence.filter(s => (s.score ?? 0) >= 0.9).length, color: '#22c55e' },
        { range: '80-90分', count: recentConfluence.filter(s => (s.score ?? 0) >= 0.8 && (s.score ?? 0) < 0.9).length, color: '#84cc16' },
        { range: '70-80分', count: recentConfluence.filter(s => (s.score ?? 0) >= 0.7 && (s.score ?? 0) < 0.8).length, color: '#eab308' },
        { range: '60-70分', count: recentConfluence.filter(s => (s.score ?? 0) >= 0.6 && (s.score ?? 0) < 0.7).length, color: '#f97316' },
        { range: '<60分', count: recentConfluence.filter(s => (s.score ?? 0) < 0.6).length, color: '#ef4444' },
      ];

      // 市场状态指标
      const fomoCount = recentHour.filter(s => s.signalType === 'FOMO').length;
      const alphaCount = recentHour.filter(s => s.signalType === 'ALPHA').length;
      const riskCount = recentHour.filter(s => s.signalType === 'RISK').length;
      const totalCount = recentHour.length;
      const uniqueSymbols = new Set(recentHour.map(s => s.symbol)).size;
      const longRatio = totalCount > 0 ? ((fomoCount + alphaCount) / totalCount) : 0;

      // 当前市场环境评分
      let marketScore = 50;
      if (uniqueSymbols >= 10 && uniqueSymbols <= 20) marketScore += 20;
      if (longRatio > 0.7) marketScore += 15;
      if (riskCount < 3) marketScore += 10;
      if (riskCount >= 5) marketScore -= 30;
      if (totalCount <= 3) marketScore -= 20;
      marketScore = Math.max(0, Math.min(100, marketScore));

      const btcTrend = await getBtcTrend();
      const cooldowns = getCooldownStatus();

      return {
        scoreDistribution,
        marketStats: { fomoCount, alphaCount, riskCount, totalCount, uniqueSymbols, longRatio },
        marketScore,
        btcTrend,
        cooldowns,
        cacheStatus,
        recentConfluenceCount: recentConfluence.length,
        avgScore: recentConfluence.length > 0
          ? recentConfluence.reduce((s, c) => s + (c.score ?? 0), 0) / recentConfluence.length
          : 0,
      };
    }),
  }),

  // ─── 实盘交易所 API ────────────────────────────────────────────
  exchange: router({
    // 获取币安账户信息
    binanceAccount: publicProcedure.query(async ({ ctx }) => {
      const cfg = await getActiveConfig();
      if (!cfg?.binanceApiKey) throw new Error("请先在设置中配置币安 API Key");
      const svc = createBinanceService(cfg.binanceApiKey, cfg.binanceSecretKey ?? "", cfg.binanceUseTestnet ?? true);
      try {
        return await svc.getAccountInfo();
      } catch (e: any) {
        const status = e?.response?.status;
        if (status === 451) throw new TRPCError({ code: "FORBIDDEN", message: "币安 API 受地区限制（HTTP 451），请确认您的账户已开通合约权限，或通过合规方式访问" });
        throw e;
      }
    }),
    // 获取币安持仓
    binancePositions: publicProcedure.query(async ({ ctx }) => {
      const cfg = await getActiveConfig();
      if (!cfg?.binanceApiKey) throw new Error("请先在设置中配置币安 API Key");
      const svc = createBinanceService(cfg.binanceApiKey, cfg.binanceSecretKey ?? "", cfg.binanceUseTestnet ?? true);
      return svc.getPositions();
    }),
    // 币安下单
    binancePlaceOrder: publicProcedure
      .input(z.object({
        symbol: z.string(),
        side: z.enum(["BUY", "SELL"]),
        quantity: z.number().positive(),
        leverage: z.number().min(1).max(125).default(5),
        stopLoss: z.number().optional(),
        takeProfit: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const cfg = await getActiveConfig();
        if (!cfg?.binanceApiKey) throw new Error("请先在设置中配置币安 API Key");
        const svc = createBinanceService(cfg.binanceApiKey, cfg.binanceSecretKey ?? "", cfg.binanceUseTestnet ?? true);
        await svc.setLeverage(input.symbol, input.leverage);
        if (input.side === "BUY") return svc.openLong(input.symbol, input.quantity, input.leverage);
        return svc.openShort(input.symbol, input.quantity, input.leverage);
      }),
    // 币安平仓
    binanceClosePosition: publicProcedure
      .input(z.object({ symbol: z.string() }))
      .mutation(async ({ input }) => {
        const cfg = await getActiveConfig();
        if (!cfg?.binanceApiKey) throw new Error("请先在设置中配置币安 API Key");
        const svc = createBinanceService(cfg.binanceApiKey, cfg.binanceSecretKey ?? "", cfg.binanceUseTestnet ?? true);
        return svc.closeAllPositions(input.symbol);
      }),
    // 币安当前挂单
    binanceOpenOrders: publicProcedure
      .input(z.object({ symbol: z.string().optional() }))
      .query(async ({ input }) => {
        const cfg = await getActiveConfig();
        if (!cfg?.binanceApiKey) throw new Error("请先在设置中配置币安 API Key");
        const svc = createBinanceService(cfg.binanceApiKey, cfg.binanceSecretKey ?? "", cfg.binanceUseTestnet ?? true);
        return svc.getOpenOrders(input?.symbol);
      }),
    // 币安撤单
    binanceCancelOrder: publicProcedure
      .input(z.object({ symbol: z.string(), orderId: z.number() }))
      .mutation(async ({ input }) => {
        const cfg = await getActiveConfig();
        if (!cfg?.binanceApiKey) throw new Error("请先在设置中配置币安 API Key");
        const svc = createBinanceService(cfg.binanceApiKey, cfg.binanceSecretKey ?? "", cfg.binanceUseTestnet ?? true);
        return svc.cancelOrder(input.symbol, input.orderId);
      }),

    // 获取欧易账户信息
    okxAccount: publicProcedure.query(async ({ ctx }) => {
      const cfg = await getActiveConfig();
      if (!cfg?.okxApiKey) throw new Error("请先在设置中配置欧易 API Key");
      const svc = createOKXService(cfg.okxApiKey, cfg.okxSecretKey ?? "", cfg.okxPassphrase ?? "", cfg.okxUseDemo ?? true);
      return svc.getBalance();
    }),
    // 获取欧易持仓
    okxPositions: publicProcedure.query(async ({ ctx }) => {
      const cfg = await getActiveConfig();
      if (!cfg?.okxApiKey) throw new Error("请先在设置中配置欧易 API Key");
      const svc = createOKXService(cfg.okxApiKey, cfg.okxSecretKey ?? "", cfg.okxPassphrase ?? "", cfg.okxUseDemo ?? true);
      return svc.getPositions();
    }),
    // 欧易下单
    okxPlaceOrder: publicProcedure
      .input(z.object({
        symbol: z.string(),
        side: z.enum(["buy", "sell"]),
        quantity: z.number().positive(),
        leverage: z.number().min(1).max(125).default(5),
        stopLoss: z.number().optional(),
        takeProfit: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const cfg = await getActiveConfig();
        if (!cfg?.okxApiKey) throw new Error("请先在设置中配置欧易 API Key");
        const svc = createOKXService(cfg.okxApiKey, cfg.okxSecretKey ?? "", cfg.okxPassphrase ?? "", cfg.okxUseDemo ?? true);
        await svc.setLeverage(input.symbol, input.leverage);
        if (input.side === "buy") return svc.openLong(input.symbol, String(input.quantity), input.leverage);
        return svc.openShort(input.symbol, String(input.quantity), input.leverage);
      }),
    // 欧易平仓
    okxClosePosition: publicProcedure
      .input(z.object({ symbol: z.string() }))
      .mutation(async ({ input }) => {
        const cfg = await getActiveConfig();
        if (!cfg?.okxApiKey) throw new Error("请先在设置中配置欧易 API Key");
        const svc = createOKXService(cfg.okxApiKey, cfg.okxSecretKey ?? "", cfg.okxPassphrase ?? "", cfg.okxUseDemo ?? true);
        return svc.closeAllPositions(input.symbol);
      }),
    // 欧易当前挂单
    okxOpenOrders: publicProcedure.query(async ({ ctx }) => {
      const cfg = await getActiveConfig();
      if (!cfg?.okxApiKey) throw new Error("请先在设置中配置欧易 API Key");
      const svc = createOKXService(cfg.okxApiKey, cfg.okxSecretKey ?? "", cfg.okxPassphrase ?? "", cfg.okxUseDemo ?? true);
      return svc.getOpenOrders();
    }),
    // 欧易撤单
    okxCancelOrder: publicProcedure
      .input(z.object({ symbol: z.string(), orderId: z.string() }))
      .mutation(async ({ input }) => {
        const cfg = await getActiveConfig();
        if (!cfg?.okxApiKey) throw new Error("请先在设置中配置欧易 API Key");
        const svc = createOKXService(cfg.okxApiKey, cfg.okxSecretKey ?? "", cfg.okxPassphrase ?? "", cfg.okxUseDemo ?? true);
        return svc.cancelOrder(input.symbol, input.orderId);
      }),

    // 测试 Binance 连接
    binanceTest: publicProcedure.query(async () => {
      const cfg = await getActiveConfig();
      if (!cfg?.binanceApiKey) return { success: false, message: "请先配置 Binance API Key" };
      try {
        const svc = createBinanceService(cfg.binanceApiKey, cfg.binanceSecretKey ?? "", cfg.binanceUseTestnet ?? false);
        const ok = await svc.ping();
        if (!ok) return { success: false, message: "Binance 连接失败" };
        const bal = await svc.getUSDTBalance();
        return { success: true, message: `连接成功，USDT 余额: ${bal.balance.toFixed(2)}` };
      } catch (e: any) {
        return { success: false, message: e.message ?? "连接失败" };
      }
    }),
    // 获取币安合约账户详情（余额+持仓汇总）
    binanceAccountDetail: publicProcedure.query(async () => {
      const cfg = await getActiveConfig();
      if (!cfg?.binanceApiKey) return { success: false as const, error: "请先配置 Binance API Key" };
      try {
        const svc = createBinanceService(cfg.binanceApiKey, cfg.binanceSecretKey ?? "", cfg.binanceUseTestnet ?? false);
        const info = await svc.getAccountInfo();
        return {
          success: true as const,
          totalWalletBalance: parseFloat(info.totalWalletBalance),
          availableBalance: parseFloat(info.availableBalance),
          totalUnrealizedProfit: parseFloat(info.totalUnrealizedProfit),
          positions: info.positions.filter((p: any) => parseFloat(p.positionAmt) !== 0).map((p: any) => ({
            symbol: p.symbol,
            positionAmt: parseFloat(p.positionAmt),
            entryPrice: parseFloat(p.entryPrice),
            unRealizedProfit: parseFloat(p.unRealizedProfit),
            leverage: p.leverage,
          })),
        };
      } catch (e: any) {
        return { success: false as const, error: e.message ?? "获取账户信息失败" };
      }
    }),
    // 测试 OKX 连接
    okxTest: publicProcedure.query(async () => {
      const cfg = await getActiveConfig();
      if (!cfg?.okxApiKey) return { success: false, message: "请先配置 OKX API Key" };
      try {
        const svc = createOKXService(cfg.okxApiKey, cfg.okxSecretKey ?? "", cfg.okxPassphrase ?? "", cfg.okxUseDemo ?? false);
        const bal = await svc.getBalance('USDT');
        return { success: true, message: `连接成功，USDT 余额: ${bal.balance.toFixed(2)}` };
      } catch (e: any) {
        return { success: false, message: e.message ?? "连接失败" };
      }
    }),
    // 更新交易所配置（API Key + 交易所选择）
    saveExchangeConfig: publicProcedure
      .input(z.object({
        selectedExchange: z.enum(["binance", "okx", "both"]).default("binance"),
        binanceApiKey: z.string().default(""),
        binanceSecretKey: z.string().default(""),
        binanceUseTestnet: z.boolean().default(true),
        okxApiKey: z.string().default(""),
        okxSecretKey: z.string().default(""),
        okxPassphrase: z.string().default(""),
        okxUseDemo: z.boolean().default(true),
        autoTradingEnabled: z.boolean().default(false),
      }))
      .mutation(async ({ input }) => {
        const existing = await getActiveConfig();
        if (existing) {
          await updateStrategyConfig(existing.id, {
            selectedExchange: input.selectedExchange,
            binanceApiKey: input.binanceApiKey,
            binanceSecretKey: input.binanceSecretKey,
            binanceUseTestnet: input.binanceUseTestnet,
            okxApiKey: input.okxApiKey,
            okxSecretKey: input.okxSecretKey,
            okxPassphrase: input.okxPassphrase,
            okxUseDemo: input.okxUseDemo,
            autoTradingEnabled: input.autoTradingEnabled,
          });
        } else {
          await upsertStrategyConfig({
            name: "default",
            selectedExchange: input.selectedExchange,
            binanceApiKey: input.binanceApiKey,
            binanceSecretKey: input.binanceSecretKey,
            binanceUseTestnet: input.binanceUseTestnet,
            okxApiKey: input.okxApiKey,
            okxSecretKey: input.okxSecretKey,
            okxPassphrase: input.okxPassphrase,
            okxUseDemo: input.okxUseDemo,
            autoTradingEnabled: input.autoTradingEnabled,
          });
        }
        return { success: true };
      }),

    // 获取当前交易所配置
    getExchangeConfig: publicProcedure.query(async () => {
      const cfg = await getActiveConfig();
      return {
        selectedExchange: cfg?.selectedExchange ?? "binance",
        hasBinanceKey: !!(cfg?.binanceApiKey),
        hasBinanceSecret: !!(cfg?.binanceSecretKey),
        binanceUseTestnet: cfg?.binanceUseTestnet ?? true,
        hasOkxKey: !!(cfg?.okxApiKey),
        hasOkxSecret: !!(cfg?.okxSecretKey),
        hasOkxPassphrase: !!(cfg?.okxPassphrase),
        okxUseDemo: cfg?.okxUseDemo ?? true,
        hasBybitKey: !!(cfg?.bybitApiKey),
        hasBybitSecret: !!(cfg?.bybitSecretKey),
        bybitUseTestnet: cfg?.bybitUseTestnet ?? true,
        hasGateKey: !!(cfg?.gateApiKey),
        hasGateSecret: !!(cfg?.gateSecretKey),
        hasBitgetKey: !!(cfg?.bitgetApiKey),
        hasBitgetSecret: !!(cfg?.bitgetSecretKey),
        hasBitgetPassphrase: !!(cfg?.bitgetPassphrase),
        autoTradingEnabled: cfg?.autoTradingEnabled ?? false,
        minScoreThreshold: cfg?.minScoreThreshold ?? 60,
      };
    }),

    // 保存完整交易所配置（含 Bybit/Gate/Bitget）
    saveFullExchangeConfig: publicProcedure
      .input(z.object({
        selectedExchange: z.enum(["binance", "okx", "bybit", "gate", "bitget", "both", "all"]).default("binance"),
        binanceApiKey: z.string().default(""),
        binanceSecretKey: z.string().default(""),
        binanceUseTestnet: z.boolean().default(false),
        okxApiKey: z.string().default(""),
        okxSecretKey: z.string().default(""),
        okxPassphrase: z.string().default(""),
        okxUseDemo: z.boolean().default(false),
        bybitApiKey: z.string().default(""),
        bybitSecretKey: z.string().default(""),
        bybitUseTestnet: z.boolean().default(false),
        gateApiKey: z.string().default(""),
        gateSecretKey: z.string().default(""),
        bitgetApiKey: z.string().default(""),
        bitgetSecretKey: z.string().default(""),
        bitgetPassphrase: z.string().default(""),
        autoTradingEnabled: z.boolean().default(false),
        minScoreThreshold: z.number().min(0).max(100).default(60),
        autoTradingPositionPercent: z.number().min(1).max(10).default(1),
      }))
      .mutation(async ({ input }) => {
        const existing = await getActiveConfig();
        const updateData = {
          selectedExchange: input.selectedExchange as any,
          binanceApiKey: input.binanceApiKey,
          binanceSecretKey: input.binanceSecretKey,
          binanceUseTestnet: input.binanceUseTestnet,
          okxApiKey: input.okxApiKey,
          okxSecretKey: input.okxSecretKey,
          okxPassphrase: input.okxPassphrase,
          okxUseDemo: input.okxUseDemo,
          bybitApiKey: input.bybitApiKey,
          bybitSecretKey: input.bybitSecretKey,
          bybitUseTestnet: input.bybitUseTestnet,
          gateApiKey: input.gateApiKey,
          gateSecretKey: input.gateSecretKey,
          bitgetApiKey: input.bitgetApiKey,
          bitgetSecretKey: input.bitgetSecretKey,
          bitgetPassphrase: input.bitgetPassphrase,
          autoTradingEnabled: input.autoTradingEnabled,
          minScoreThreshold: input.minScoreThreshold,
          autoTradingPositionPercent: input.autoTradingPositionPercent,
        };
        if (existing) {
          await updateStrategyConfig(existing.id, updateData);
        } else {
          await upsertStrategyConfig({ name: "default", ...updateData });
        }
        return { success: true };
      }),

    // 测试 Bybit 连接
    bybitTest: publicProcedure.query(async () => {
      const cfg = await getActiveConfig();
      if (!cfg?.bybitApiKey) return { success: false, message: "请先配置 Bybit API Key" };
      const svc = createBybitService({ apiKey: cfg.bybitApiKey, secretKey: cfg.bybitSecretKey ?? "", useTestnet: cfg.bybitUseTestnet ?? false });
      return svc.testConnection();
    }),

    // 获取 Bybit 账户余额
    bybitAccount: publicProcedure.query(async () => {
      const cfg = await getActiveConfig();
      if (!cfg?.bybitApiKey) throw new Error("请先配置 Bybit API Key");
      const svc = createBybitService({ apiKey: cfg.bybitApiKey, secretKey: cfg.bybitSecretKey ?? "", useTestnet: cfg.bybitUseTestnet ?? false });
      return svc.getBalance();
    }),

    // 获取 Bybit 持仓
    bybitPositions: publicProcedure.query(async () => {
      const cfg = await getActiveConfig();
      if (!cfg?.bybitApiKey) throw new Error("请先配置 Bybit API Key");
      const svc = createBybitService({ apiKey: cfg.bybitApiKey, secretKey: cfg.bybitSecretKey ?? "", useTestnet: cfg.bybitUseTestnet ?? false });
      return svc.getPositions();
    }),

    // Bybit 下单
    bybitPlaceOrder: publicProcedure
      .input(z.object({
        symbol: z.string(),
        side: z.enum(["Buy", "Sell"]),
        qty: z.string(),
        orderType: z.enum(["Market", "Limit"]).default("Market"),
        price: z.string().optional(),
        leverage: z.number().min(1).max(100).default(5),
      }))
      .mutation(async ({ input }) => {
        const cfg = await getActiveConfig();
        if (!cfg?.bybitApiKey) throw new Error("请先配置 Bybit API Key");
        const svc = createBybitService({ apiKey: cfg.bybitApiKey, secretKey: cfg.bybitSecretKey ?? "", useTestnet: cfg.bybitUseTestnet ?? false });
        await svc.setLeverage("linear", input.symbol, String(input.leverage), String(input.leverage));
        return svc.placeOrder({
          category: "linear",
          symbol: input.symbol,
          side: input.side,
          orderType: input.orderType,
          qty: input.qty,
          price: input.price,
        });
      }),

    // Bybit 平仓
    bybitClosePosition: publicProcedure
      .input(z.object({ symbol: z.string(), side: z.enum(["Buy", "Sell"]), qty: z.string() }))
      .mutation(async ({ input }) => {
        const cfg = await getActiveConfig();
        if (!cfg?.bybitApiKey) throw new Error("请先配置 Bybit API Key");
        const svc = createBybitService({ apiKey: cfg.bybitApiKey, secretKey: cfg.bybitSecretKey ?? "", useTestnet: cfg.bybitUseTestnet ?? false });
        return svc.closePosition("linear", input.symbol, input.side, input.qty);
      }),

    // Gate.io 平仓
    gateClosePosition: publicProcedure
      .input(z.object({ contract: z.string(), size: z.number() }))
      .mutation(async ({ input }) => {
        const cfg = await getActiveConfig();
        if (!cfg?.gateApiKey) throw new Error("请先配置 Gate.io API Key");
        const svc = createGateService({ apiKey: cfg.gateApiKey, secretKey: cfg.gateSecretKey ?? "" });
        return svc.closePosition('usdt', input.contract, input.size);
      }),
    // 测试 Gate.io 连接
    gateTest: publicProcedure.query(async () => {
      const cfg = await getActiveConfig();
      if (!cfg?.gateApiKey) return { success: false, message: "请先配置 Gate.io API Key" };
      const svc = createGateService({ apiKey: cfg.gateApiKey, secretKey: cfg.gateSecretKey ?? "" });
      return svc.testConnection();
    }),

    // 获取 Gate.io 账户余额
    gateAccount: publicProcedure.query(async () => {
      const cfg = await getActiveConfig();
      if (!cfg?.gateApiKey) throw new Error("请先配置 Gate.io API Key");
      const svc = createGateService({ apiKey: cfg.gateApiKey, secretKey: cfg.gateSecretKey ?? "" });
      return svc.getBalance();
    }),

    // 获取 Gate.io 持仓
    gatePositions: publicProcedure.query(async () => {
      const cfg = await getActiveConfig();
      if (!cfg?.gateApiKey) throw new Error("请先配置 Gate.io API Key");
      const svc = createGateService({ apiKey: cfg.gateApiKey, secretKey: cfg.gateSecretKey ?? "" });
      return svc.getPositions();
    }),

    // Gate.io 下单
    gatePlaceOrder: publicProcedure
      .input(z.object({
        contract: z.string(),
        size: z.number(),
        price: z.string().optional(),
        reduceOnly: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const cfg = await getActiveConfig();
        if (!cfg?.gateApiKey) throw new Error("请先配置 Gate.io API Key");
        const svc = createGateService({ apiKey: cfg.gateApiKey, secretKey: cfg.gateSecretKey ?? "" });
        return svc.placeOrder("usdt", {
          contract: input.contract,
          size: input.size,
          price: input.price ?? "0",
          tif: "ioc",
          reduce_only: input.reduceOnly,
        });
      }),

    // Bitget 平仓
    bitgetClosePosition: publicProcedure
      .input(z.object({ symbol: z.string(), side: z.enum(['buy', 'sell']), size: z.string() }))
      .mutation(async ({ input }) => {
        const cfg = await getActiveConfig();
        if (!cfg?.bitgetApiKey) throw new Error("请先配置 Bitget API Key");
        const svc = createBitgetService({ apiKey: cfg.bitgetApiKey, secretKey: cfg.bitgetSecretKey ?? "", passphrase: cfg.bitgetPassphrase ?? "" });
        return svc.placeOrder({ symbol: input.symbol, productType: 'USDT-FUTURES', marginMode: 'crossed', marginCoin: 'USDT', size: input.size, side: input.side, tradeSide: 'close', orderType: 'market' });
      }),
    // 测试 Bitget 连接
    bitgetTest: publicProcedure.query(async () => {
      const cfg = await getActiveConfig();
      if (!cfg?.bitgetApiKey) return { success: false, message: "请先配置 Bitget API Key" };
      const svc = createBitgetService({ apiKey: cfg.bitgetApiKey, secretKey: cfg.bitgetSecretKey ?? "", passphrase: cfg.bitgetPassphrase ?? "" });
      return svc.testConnection();
    }),

    // 获取 Bitget 账户余额
    bitgetAccount: publicProcedure.query(async () => {
      const cfg = await getActiveConfig();
      if (!cfg?.bitgetApiKey) throw new Error("请先配置 Bitget API Key");
      const svc = createBitgetService({ apiKey: cfg.bitgetApiKey, secretKey: cfg.bitgetSecretKey ?? "", passphrase: cfg.bitgetPassphrase ?? "" });
      return svc.getBalance();
    }),

    // 获取 Bitget 持仓
    bitgetPositions: publicProcedure.query(async () => {
      const cfg = await getActiveConfig();
      if (!cfg?.bitgetApiKey) throw new Error("请先配置 Bitget API Key");
      const svc = createBitgetService({ apiKey: cfg.bitgetApiKey, secretKey: cfg.bitgetSecretKey ?? "", passphrase: cfg.bitgetPassphrase ?? "" });
      return svc.getPositions();
    }),

    // Bitget 下单
    bitgetPlaceOrder: publicProcedure
      .input(z.object({
        symbol: z.string(),
        side: z.enum(["buy", "sell"]),
        tradeSide: z.enum(["open", "close"]).default("open"),
        size: z.string(),
        orderType: z.enum(["market", "limit"]).default("market"),
        price: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const cfg = await getActiveConfig();
        if (!cfg?.bitgetApiKey) throw new Error("请先配置 Bitget API Key");
        const svc = createBitgetService({ apiKey: cfg.bitgetApiKey, secretKey: cfg.bitgetSecretKey ?? "", passphrase: cfg.bitgetPassphrase ?? "" });
        return svc.placeOrder({
          symbol: input.symbol,
          productType: "USDT-FUTURES",
          marginMode: "crossed",
          marginCoin: "USDT",
          size: input.size,
          side: input.side,
          tradeSide: input.tradeSide,
          orderType: input.orderType,
          price: input.price,
        });
      }),

    // 获取所有交易所汇总账户信息
    allAccounts: publicProcedure.query(async () => {
      const cfg = await getActiveConfig();
      const result: Record<string, any> = {};
      // Binance
      if (cfg?.binanceApiKey) {
        try {
          const svc = createBinanceService(cfg.binanceApiKey, cfg.binanceSecretKey ?? "", cfg.binanceUseTestnet ?? false);
          const usdtBal = await svc.getUSDTBalance();
          result.binance = { connected: true, usdtBalance: usdtBal.balance, availableBalance: usdtBal.available };
        } catch (e: any) { result.binance = { connected: false, error: e.message }; }
      }
      // OKX
      if (cfg?.okxApiKey) {
        try {
          const svc = createOKXService(cfg.okxApiKey, cfg.okxSecretKey ?? "", cfg.okxPassphrase ?? "", cfg.okxUseDemo ?? false);
          const usdtBal = await svc.getBalance('USDT');
          result.okx = { connected: true, usdtBalance: usdtBal.balance, availableBalance: usdtBal.available };
        } catch (e: any) { result.okx = { connected: false, error: e.message }; }
      }
      // Bybit
      if (cfg?.bybitApiKey) {
        try {
          const svc = createBybitService({ apiKey: cfg.bybitApiKey, secretKey: cfg.bybitSecretKey ?? "", useTestnet: cfg.bybitUseTestnet ?? false });
          const balances = await svc.getBalance();
          const usdt = balances.find((b: any) => b.coin === 'USDT');
          result.bybit = { connected: true, usdtBalance: parseFloat(usdt?.walletBalance ?? '0'), availableBalance: parseFloat(usdt?.availableToWithdraw ?? '0') };
        } catch (e: any) { result.bybit = { connected: false, error: e.message }; }
      }
      // Gate.io
      if (cfg?.gateApiKey) {
        try {
          const svc = createGateService({ apiKey: cfg.gateApiKey, secretKey: cfg.gateSecretKey ?? "" });
          const balance = await svc.getBalance();
          result.gate = { connected: true, usdtBalance: parseFloat(balance?.total ?? '0'), availableBalance: parseFloat(balance?.available ?? '0') };
        } catch (e: any) { result.gate = { connected: false, error: e.message }; }
      }
      // Bitget
      if (cfg?.bitgetApiKey) {
        try {
          const svc = createBitgetService({ apiKey: cfg.bitgetApiKey, secretKey: cfg.bitgetSecretKey ?? "", passphrase: cfg.bitgetPassphrase ?? "" });
          const balance = await svc.getBalance();
          result.bitget = { connected: true, usdtBalance: parseFloat(balance?.equity ?? '0'), availableBalance: parseFloat(balance?.available ?? '0') };
        } catch (e: any) { result.bitget = { connected: false, error: e.message }; }
      }
      return result;
    }),

    // 获取所有交易所汇总持仓
    allPositions: publicProcedure.query(async () => {
      const cfg = await getActiveConfig();
      const result: Array<{ exchange: string; symbol: string; side: string; size: string; entryPrice: string; unrealizedPnl: string; leverage: string }> = [];
      // Binance
      if (cfg?.binanceApiKey) {
        try {
          const svc = createBinanceService(cfg.binanceApiKey, cfg.binanceSecretKey ?? "", cfg.binanceUseTestnet ?? false);
          const positions = await svc.getPositions();
          for (const p of positions) {
            if (parseFloat(p.positionAmt) !== 0) {
              result.push({ exchange: 'binance', symbol: p.symbol, side: parseFloat(p.positionAmt) > 0 ? 'long' : 'short', size: Math.abs(parseFloat(p.positionAmt)).toString(), entryPrice: p.entryPrice, unrealizedPnl: p.unRealizedProfit, leverage: p.leverage });
            }
          }
        } catch {}
      }
      // OKX
      if (cfg?.okxApiKey) {
        try {
          const svc = createOKXService(cfg.okxApiKey, cfg.okxSecretKey ?? "", cfg.okxPassphrase ?? "", cfg.okxUseDemo ?? false);
          const positions = await svc.getPositions();
          for (const p of positions) {
            if (parseFloat(p.pos) !== 0) {
              result.push({ exchange: 'okx', symbol: p.instId, side: p.posSide, size: p.pos, entryPrice: p.avgPx, unrealizedPnl: p.upl, leverage: p.lever });
            }
          }
        } catch {}
      }
      // Bybit
      if (cfg?.bybitApiKey) {
        try {
          const svc = createBybitService({ apiKey: cfg.bybitApiKey, secretKey: cfg.bybitSecretKey ?? "", useTestnet: cfg.bybitUseTestnet ?? false });
          const positions = await svc.getPositions();
          for (const p of positions) {
            result.push({ exchange: 'bybit', symbol: p.symbol, side: p.side.toLowerCase(), size: p.size, entryPrice: p.avgPrice, unrealizedPnl: p.unrealisedPnl, leverage: p.leverage });
          }
        } catch {}
      }
      // Gate.io
      if (cfg?.gateApiKey) {
        try {
          const svc = createGateService({ apiKey: cfg.gateApiKey, secretKey: cfg.gateSecretKey ?? "" });
          const positions = await svc.getPositions();
          for (const p of positions) {
            result.push({ exchange: 'gate', symbol: p.contract, side: p.size > 0 ? 'long' : 'short', size: Math.abs(p.size).toString(), entryPrice: p.entry_price, unrealizedPnl: p.unrealised_pnl, leverage: p.leverage });
          }
        } catch {}
      }
      // Bitget
      if (cfg?.bitgetApiKey) {
        try {
          const svc = createBitgetService({ apiKey: cfg.bitgetApiKey, secretKey: cfg.bitgetSecretKey ?? "", passphrase: cfg.bitgetPassphrase ?? "" });
          const positions = await svc.getPositions();
          for (const p of positions) {
            result.push({ exchange: 'bitget', symbol: p.symbol, side: p.holdSide, size: p.total, entryPrice: p.openPriceAvg, unrealizedPnl: p.unrealizedPL, leverage: p.leverage });
          }
        } catch {}
      }
      return result;
    }),

    // 批量获取当前价格（优先用 Binance 公开行情接口）
    getTickerPrices: publicProcedure
      .input(z.object({ symbols: z.array(z.string()) }))
      .query(async ({ input }) => {
        const prices: Record<string, number> = {};
        if (!input.symbols.length) return prices;
        const tickers = input.symbols.map(s => s.endsWith('USDT') ? s : `${s}USDT`);
        const remaining = new Set(tickers);

        // 优先尝试 Binance 合约行情（公开接口）
        try {
          const res = await fetch(
            `https://fapi.binance.com/fapi/v1/ticker/price?symbols=${encodeURIComponent(JSON.stringify(Array.from(remaining)))}`
          );
          if (res.ok) {
            const data = await res.json() as Array<{ symbol: string; price: string }>;
            for (const item of data) {
              const p = parseFloat(item.price);
              if (isFinite(p) && p > 0) {
                prices[item.symbol] = p;
                prices[item.symbol.replace(/USDT$/, '')] = p;
                remaining.delete(item.symbol);
              }
            }
            if (remaining.size === 0) return prices;
          }
        } catch {}

        // 备用： OKX 公开行情接口
        for (const ticker of Array.from(remaining)) {
          try {
            const base = ticker.replace(/USDT$/, '');
            const instId = `${base}-USDT-SWAP`;
            const r = await fetch(`https://www.okx.com/api/v5/market/ticker?instId=${instId}`);
            if (r.ok) {
              const d = await r.json() as { data: Array<{ last: string }> };
              const p = parseFloat(d.data?.[0]?.last ?? '0');
              if (isFinite(p) && p > 0) {
                prices[ticker] = p;
                prices[base] = p;
                remaining.delete(ticker);
              }
            }
          } catch {}
        }

        // 备用： Bybit 公开行情接口
        for (const ticker of Array.from(remaining)) {
          try {
            const r = await fetch(`https://api.bybit.com/v5/market/tickers?category=linear&symbol=${ticker}`);
            if (r.ok) {
              const d = await r.json() as { result: { list: Array<{ lastPrice: string }> } };
              const p = parseFloat(d.result?.list?.[0]?.lastPrice ?? '0');
              if (isFinite(p) && p > 0) {
                prices[ticker] = p;
                prices[ticker.replace(/USDT$/, '')] = p;
                remaining.delete(ticker);
              }
            }
          } catch {}
        }

        // 备用： Gate.io 公开行情接口
        for (const ticker of Array.from(remaining)) {
          try {
            const base = ticker.replace(/USDT$/, '');
            const r = await fetch(`https://api.gateio.ws/api/v4/futures/usdt/contracts/${base}_USDT`);
            if (r.ok) {
              const d = await r.json() as { last_price: string };
              const p = parseFloat(d.last_price ?? '0');
              if (isFinite(p) && p > 0) {
                prices[ticker] = p;
                prices[base] = p;
                remaining.delete(ticker);
              }
            }
          } catch {}
        }

        // 备用： Bitget 公开行情接口
        for (const ticker of Array.from(remaining)) {
          try {
            const base = ticker.replace(/USDT$/, '');
            const r = await fetch(`https://api.bitget.com/api/mix/v1/market/ticker?symbol=${base}USDT_UMCBL`);
            if (r.ok) {
              const d = await r.json() as { data: { last: string } };
              const p = parseFloat(d.data?.last ?? '0');
              if (isFinite(p) && p > 0) {
                prices[ticker] = p;
                prices[base] = p;
                remaining.delete(ticker);
              }
            }
          } catch {}
        }

        return prices;
      }),
  }),
  // ─── ValueScan 信号历史胜率统计 ────────────────────────────────────────────────────────────────────────────────────
  // ─── 模拟交易 ────────────────────────────────────────────────────────────────
  paperTrading: router({
    // 获取账户状态
    getAccount: publicProcedure.query(async () => {
      const d = await getDb();
      if (!d) return null;
      const rows = await d.select().from(paperAccount).where(eq(paperAccount.id, 1)).limit(1);
      if (rows[0]) return rows[0];
      
      // 自动初始化模拟账户
      try {
        console.log("[PaperTrading] 尝试初始化账户 ID: 1");
        await d.insert(paperAccount).values({
          id: 1,
          balance: 10000,
          totalBalance: 10000,
          initialBalance: 10000,
          peakBalance: 10000,
          autoTradingEnabled: false,
        });
        console.log("[PaperTrading] 插入成功，正在重新查询...");
        const newRows = await d.select().from(paperAccount).where(eq(paperAccount.id, 1)).limit(1);
        console.log("[PaperTrading] 重新查询结果:", newRows[0] ? "成功" : "失败");
        return newRows[0] ?? null;
      } catch (e: any) {
        console.error("[PaperTrading] 自动初始化失败:", e.message);
        // 如果是因为 ID 冲突，尝试直接返回
        if (e.message.includes("Duplicate entry")) {
           const retryRows = await d.select().from(paperAccount).where(eq(paperAccount.id, 1)).limit(1);
           return retryRows[0] ?? null;
        }
        return null;
      }
    }),

    // 获取当前持仓
    getPositions: publicProcedure.query(async () => {
      const d = await getDb();
      if (!d) return [];
      return d.select().from(paperPositions);
    }),

    // 获取交易记录
    getTrades: publicProcedure
      .input(z.object({ limit: z.number().default(50) }).optional())
      .query(async ({ input }) => {
        const d = await getDb();
        if (!d) return [];
        return d.select().from(paperTrades).orderBy(desc(paperTrades.closedAt)).limit(input?.limit ?? 50);
      }),

    // 获取权益曲线
    getEquityCurve: publicProcedure
      .input(z.object({ limit: z.number().default(200) }).optional())
      .query(async ({ input }) => {
        const d = await getDb();
        if (!d) return [];
        return d.select().from(paperEquityCurve).orderBy(desc(paperEquityCurve.createdAt)).limit(input?.limit ?? 200);
      }),

    // 更新账户配置（开关自动交易、调整参数）
    updateConfig: publicProcedure
      .input(z.object({
        autoTradingEnabled: z.boolean().optional(),
        perTradeAmount: z.number().min(10).max(10000).optional(),
        leverage: z.number().min(1).max(20).optional(),
        stopLossPct: z.number().min(0.5).max(20).optional(),
        takeProfitPct: z.number().min(1).max(50).optional(),
        minSignalScore: z.number().min(50).max(95).optional(),
        maxPositions: z.number().min(1).max(10).optional(),
      }))
      .mutation(async ({ input }) => {
        const d = await getDb();
        if (!d) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
        await d.update(paperAccount).set(input).where(eq(paperAccount.id, 1));
        // 根据 autoTradingEnabled 控制引擎
        if (input.autoTradingEnabled === true && !isEngineRunning()) {
          startPaperTradingEngine();
        } else if (input.autoTradingEnabled === false && isEngineRunning()) {
          stopPaperTradingEngine();
        }
        return { success: true };
      }),

    // 重置账户
    resetAccount: publicProcedure
      .input(z.object({ initialBalance: z.number().min(1000).max(1000000).default(10000) }))
      .mutation(async ({ input }) => {
        const d = await getDb();
        if (!d) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
        // 停止引擎
        if (isEngineRunning()) stopPaperTradingEngine();
        // 清空持仓和交易记录
        await d.delete(paperPositions);
        await d.delete(paperTrades);
        await d.delete(paperEquityCurve);
        // 重置账户
        await d.update(paperAccount).set({
          balance: input.initialBalance,
          totalBalance: input.initialBalance,
          initialBalance: input.initialBalance,
          totalPnl: 0,
          totalPnlPct: 0,
          totalTrades: 0,
          winTrades: 0,
          lossTrades: 0,
          maxDrawdown: 0,
          peakBalance: input.initialBalance,
          autoTradingEnabled: false,
        }).where(eq(paperAccount.id, 1));
        return { success: true };
      }),

    // 手动平仓
    closePosition: publicProcedure
      .input(z.object({ positionId: z.number() }))
      .mutation(async ({ input }) => {
        const d = await getDb();
        if (!d) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
        const positions = await d.select().from(paperPositions).where(eq(paperPositions.id, input.positionId)).limit(1);
        if (!positions[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Position not found" });
        const pos = positions[0];
        // 获取当前价格
        const ticker = pos.symbol.endsWith("USDT") ? pos.symbol : `${pos.symbol}USDT`;
        let exitPrice = pos.currentPrice;
        try {
          const res = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${ticker}`);
          if (res.ok) {
            const data = await res.json() as { price: string };
            exitPrice = parseFloat(data.price);
          }
        } catch {}
        // 计算盈亏
        const lev = pos.leverage || 5;
        let pnlPct = pos.direction === "long"
          ? ((exitPrice - pos.entryPrice) / pos.entryPrice) * lev * 100
          : ((pos.entryPrice - exitPrice) / pos.entryPrice) * lev * 100;
        const pnl = (pos.notionalValue ?? 500) * (pnlPct / 100);
        const holdingMinutes = Math.round((Date.now() - new Date(pos.openedAt).getTime()) / 60000);
        // 记录交易
        await d.insert(paperTrades).values({
          symbol: pos.symbol, direction: pos.direction,
          entryPrice: pos.entryPrice, exitPrice,
          quantity: pos.quantity, notionalValue: pos.notionalValue ?? 500,
          leverage: lev, pnl, pnlPct, closeReason: "manual",
          signalScore: pos.signalScore, triggerSignal: pos.triggerSignal ?? "",
          holdingMinutes, openedAt: pos.openedAt, closedAt: new Date(),
        });
        await d.delete(paperPositions).where(eq(paperPositions.id, input.positionId));
        // 更新账户
        const accs = await d.select().from(paperAccount).where(eq(paperAccount.id, 1)).limit(1);
        const acc = accs[0];
        if (acc) {
          const margin = pos.notionalValue ?? 500;
          const newBalance = (acc.balance ?? 10000) + margin + pnl;
          const newTotalTrades = (acc.totalTrades ?? 0) + 1;
          const newWinTrades = pnl > 0 ? (acc.winTrades ?? 0) + 1 : (acc.winTrades ?? 0);
          const newLossTrades = pnl <= 0 ? (acc.lossTrades ?? 0) + 1 : (acc.lossTrades ?? 0);
          await d.update(paperAccount).set({
            balance: newBalance, totalTrades: newTotalTrades,
            winTrades: newWinTrades, lossTrades: newLossTrades,
          }).where(eq(paperAccount.id, 1));
        }
        return { success: true, pnl, pnlPct };
      }),

    // 引擎状态
    engineStatus: publicProcedure.query(() => ({
      paper: getEngineStatus(),
      live: getLiveEngineStatus(),
    })),
    // 启动/停止实盘引擎
    toggleLiveEngine: publicProcedure
      .input(z.object({ enabled: z.boolean() }))
      .mutation(({ input }) => {
        if (input.enabled && !isLiveEngineRunning()) {
          startLiveTradingEngine();
        } else if (!input.enabled && isLiveEngineRunning()) {
          stopLiveTradingEngine();
        }
        return { success: true, running: isLiveEngineRunning() };
      }),

    // 手动触发一次交易周期（用于测试）
    triggerCycle: publicProcedure.mutation(async () => {
      await runPaperTradingCycle(true); // force=true 绕过 autoTradingEnabled 检查
      return { success: true };
    }),
  }),

  // ─── 免费数据多空综合面板 ────────────────────────────────────────────────────
  freeData: router({
    // 恐惧贪婪指数历史（7天）
    fearGreedHistory: publicProcedure
      .input(z.object({ limit: z.number().default(7) }).optional())
      .query(async ({ input }) => {
        try {
          return { success: true, data: await getFearGreedHistory(input?.limit ?? 7) };
        } catch (e: any) {
          return { success: false, data: [], error: e.message };
        }
      }),

    // CoinGecko 全球市场数据
    globalMarket: publicProcedure.query(async () => {
      try {
        return { success: true, data: await getGlobalMarket() };
      } catch (e: any) {
        return { success: false, data: null, error: e.message };
      }
    }),

    // CoinGecko 热门代币
    trending: publicProcedure.query(async () => {
      try {
        return { success: true, data: await getTrendingCoins() };
      } catch (e: any) {
        return { success: false, data: [], error: e.message };
      }
    }),

    // OKX 合约账户多空比（已验证可用，替代 Binance Futures）
    longShortRatio: publicProcedure
      .input(z.object({ symbol: z.string().default("BTCUSDT"), period: z.string().default("1H"), limit: z.number().default(24) }).optional())
      .query(async ({ input }) => {
        try {
          const sym = (input?.symbol ?? "BTCUSDT").replace("USDT", "");
          const instId = `${sym}-USDT-SWAP`;
          const data = await getOKXLongShortRatio(instId, input?.period ?? "1H", input?.limit ?? 24);
          return { success: true, data, source: "OKX" };
        } catch (e: any) {
          return { success: false, data: [] as OKXLongShortData[], error: e.message, source: "OKX" };
        }
      }),

    // OKX Taker 主动买卖比（已验证可用，替代 Binance Futures）
    takerRatio: publicProcedure
      .input(z.object({ symbol: z.string().default("BTCUSDT"), period: z.string().default("1H"), limit: z.number().default(24) }).optional())
      .query(async ({ input }) => {
        try {
          const sym = (input?.symbol ?? "BTCUSDT").replace("USDT", "");
          const instId = `${sym}-USDT-SWAP`;
          const data = await getOKXTakerRatio(instId, input?.period ?? "1H", input?.limit ?? 24);
          return { success: true, data, source: "OKX" };
        } catch (e: any) {
          return { success: false, data: [] as OKXTakerData[], error: e.message, source: "OKX" };
        }
      }),

    // 技术面评分（RSI/MACD/布林带/EMA）
    technicalScore: publicProcedure
      .input(z.object({ symbol: z.string().default("BTCUSDT"), interval: z.string().default("1h") }).optional())
      .query(async ({ input }) => {
        try {
          const data = await getTechnicalScore(input?.symbol ?? "BTCUSDT", input?.interval ?? "1h");
          return { success: true, data };
        } catch (e: any) {
          return { success: false, data: null as TechnicalScore | null, error: e.message };
        }
      }),

    // CoinGlass 持仓量（按币种）
    oiHistory: publicProcedure
      .input(z.object({ symbol: z.string().default("BTCUSDT") }).optional())
      .query(async ({ input }) => {
        try {
          const sym = (input?.symbol ?? "BTCUSDT").replace("USDT", "");
          const data = await getMultiOpenInterest([sym]);
          return { success: true, data };
        } catch (e: any) {
          return { success: false, data: [], error: e.message };
        }
      }),

    // CoinGlass 资金费率（多币种）
    premiums: publicProcedure
      .input(z.object({ symbols: z.array(z.string()).optional() }).optional())
      .query(async ({ input }) => {
        try {
          const syms = (input?.symbols ?? ["BTC","ETH","SOL","BNB","XRP"]).map(s => s.replace("USDT",""));
          const data = await getMultiFundingRates(syms);
          return { success: true, data };
        } catch (e: any) {
          return { success: false, data: [], error: e.message };
        }
      }),

    // 综合多空评分（整合 OKX多空比 + CoinGlass资金费率 + 技术面 + FNG + CoinGecko）
    bullBearScore: publicProcedure
      .input(z.object({ symbol: z.string().default("BTCUSDT") }).optional())
      .query(async ({ input }) => {
        const symbol = input?.symbol ?? "BTCUSDT";
        const cgSymbol = symbol.replace("USDT", ""); // BTC, ETH, SOL...
        const okxInstId = `${cgSymbol}-USDT-SWAP`;
        try {
          // 并行获取所有数据（CoinGlass + Alternative.me + CoinGecko + OKX + 技术面 + 新闻情绪）
          const [fngList, globalMkt, cgFundingRates, cgOI, okxLS, okxTaker, techData, newsData] = await Promise.allSettled([
            getFearGreedHistory(1),
            getGlobalMarket(),
            getMultiFundingRates([cgSymbol]),
            getMultiOpenInterest([cgSymbol]),
            getOKXLongShortRatio(okxInstId, "1H", 1),
            getOKXTakerRatio(okxInstId, "1H", 1),
            getTechnicalScore(symbol, "1h"),
            getNewsSentiment(false),
          ]);

          const fng = fngList.status === "fulfilled" ? fngList.value[0]?.value ?? 50 : 50;
          const gm = globalMkt.status === "fulfilled" ? globalMkt.value : null;

          // 从 CoinGlass 获取资金费率（取 Binance 交易所的値）
          const frData = cgFundingRates.status === "fulfilled" ? cgFundingRates.value : [];
          const frItem = frData.find(d => d.symbol === cgSymbol.toUpperCase());
          const binanceFR = frItem?.usdtOrUsdMarginList?.find(e => e.exchange === "Binance");
          const fundingRate = binanceFR?.fundingRate ?? 0;

          // 从 CoinGlass 获取持仓量变化
          const oiData = cgOI.status === "fulfilled" ? cgOI.value : [];
          const oiItem = oiData.find(d => d.symbol === cgSymbol.toUpperCase());
          const oiChange = oiItem?.changePercent1h ?? 0;
          const oiChange24h = oiItem?.changePercent24h ?? 0;

          // OKX 多空比（已验证可用）
          const okxLSData = okxLS.status === "fulfilled" && okxLS.value.length > 0 ? okxLS.value[0] : null;
          const longShortRatio = okxLSData?.longShortRatio ?? 1;

          // OKX Taker 主动买卖比（已验证可用）
          const okxTakerData = okxTaker.status === "fulfilled" && okxTaker.value.length > 0 ? okxTaker.value[0] : null;
          const takerBuySellRatio = okxTakerData?.buySellRatio ?? 1;

          // 技术面评分
          const tech = techData.status === "fulfilled" ? techData.value : null;
          const priceChange24h = tech?.priceChange24h ?? (gm?.marketCapChange24h ?? 0);
          const markPrice = tech?.price ?? 0;

          // 新闻情绪评分（-100 ~ +100）
          const newsSummary = newsData.status === "fulfilled" ? newsData.value : null;
          const newsSentimentScore = newsSummary?.sentimentScore ?? 0;

          const score = calcBullBearScore({
            fng,
            btcDominance: gm?.btcDominance ?? 50,
            btcDominanceChange: 0,
            marketCapChange24h: gm?.marketCapChange24h ?? 0,
            longShortRatio,   // OKX 真实数据
            takerBuySellRatio, // OKX 真实数据
            fundingRate,
            oiChange,
            priceChange24h,
            newsSentimentScore: newsSentimentScore, // 新闻情绪评分
          });

          return {
            success: true,
            score,
            rawData: {
              fng,
              btcDominance: gm?.btcDominance ?? 50,
              marketCapChange24h: gm?.marketCapChange24h ?? 0,
              longShortRatio,
              longPct: okxLSData?.longPct ?? 50,
              shortPct: okxLSData?.shortPct ?? 50,
              takerBuySellRatio,
              takerBuyVol: okxTakerData?.buyVol ?? 0,
              takerSellVol: okxTakerData?.sellVol ?? 0,
              fundingRate,
              oiChange,
              oiChange24h,
              markPrice,
              premium: 0,
              // 多交易所资金费率
              allExchangeFR: frItem?.usdtOrUsdMarginList?.slice(0, 8) ?? [],
              // 技术面评分
              technical: tech,
              dataSource: {
                longShort: okxLSData ? "OKX" : "N/A",
                taker: okxTakerData ? "OKX" : "N/A",
                technical: tech ? "Binance" : "N/A",
                news: newsSummary ? "RSS" : "N/A",
              },
              // 新闻情绪数据
              news: newsSummary ? {
                sentimentScore: newsSummary.sentimentScore,
                overallSentiment: newsSummary.overallSentiment,
                bullishCount: newsSummary.bullishCount,
                bearishCount: newsSummary.bearishCount,
                neutralCount: newsSummary.neutralCount,
                totalCount: newsSummary.items.length,
                topBullish: newsSummary.topBullish.slice(0, 2).map(n => ({ title: n.title, source: n.source })),
                topBearish: newsSummary.topBearish.slice(0, 2).map(n => ({ title: n.title, source: n.source })),
              } : null,
            },
          };
        } catch (e: any) {
          return { success: false, score: null, rawData: null, error: e.message };
        }
      }),
  }),

  vsStats: router({
    winRate: publicProcedure.query(async () => getVsSignalWinRate()),
    list: publicProcedure
      .input(z.object({ limit: z.number().default(100), signalType: z.string().optional(), direction: z.string().optional() }).optional())
      .query(async ({ input }) => getVsSignalStats({ limit: input?.limit ?? 100, signalType: input?.signalType, direction: input?.direction })),
    add: publicProcedure
      .input(z.object({
        symbol: z.string(),
        signalType: z.string(),
        signalName: z.string().optional(),
        direction: z.enum(["long", "short", "neutral"]).default("neutral"),
        entryPrice: z.number().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const id = await addVsSignalStat(input);
        return { success: !!id, id };
      }),
    update: publicProcedure
      .input(z.object({
        id: z.number(),
        exitPrice24h: z.number().optional(),
        exitPrice48h: z.number().optional(),
        pnlPct24h: z.number().optional(),
        pnlPct48h: z.number().optional(),
        result: z.enum(["win", "loss", "pending"]).optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await updateVsSignalStat(id, data);
        return { success: true };
      }),
  }),

  // ─── 新闻情绪面板 ─────────────────────────────────────────────────────────────
  news: router({
    // 获取所有新闻情绪汇总（含评分）
    sentiment: publicProcedure
      .input(z.object({ forceRefresh: z.boolean().default(false) }).optional())
      .query(async ({ input }) => {
        try {
          const data = await getNewsSentiment(input?.forceRefresh ?? false);
          return { success: true, data };
        } catch (e: any) {
          return { success: false, data: null, error: e.message };
        }
      }),

    // 获取特定币种的新闻情绪
    coinSentiment: publicProcedure
      .input(z.object({ symbol: z.string().default("BTC") }))
      .query(async ({ input }) => {
        try {
          const data = await getCoinNewsSentiment(input.symbol);
          return { success: true, data };
        } catch (e: any) {
          return { success: false, data: null, error: e.message };
        }
      }),

    // 强制刷新新闻缓存
    refresh: publicProcedure.mutation(async () => {
      try {
        const data = await getNewsSentiment(true);
        return { success: true, count: data.items.length, fetchedAt: data.fetchedAt };
      } catch (e: any) {
        return { success: false, error: e.message };
      }
    }),
  }),
  // ─── 量化模拟交易（QuantSim 页面使用）─────────────────────────────────────────
  sim: router({
    positions: publicProcedure.query(async () => {
      const d = await getDb();
      if (!d) return [];
      const rows = await d.select().from(paperPositions);
      return Promise.all(rows.map(async (pos) => {
        const ticker = pos.symbol.endsWith("USDT") ? pos.symbol : pos.symbol + "USDT";
        let currentPrice = pos.currentPrice ?? pos.entryPrice;
        try {
          const res = await fetch("https://api.binance.com/api/v3/ticker/price?symbol=" + ticker);
          if (res.ok) { const data = await res.json() as { price: string }; currentPrice = parseFloat(data.price); }
        } catch {}
        const lev = pos.leverage || 1;
        const notional = pos.notionalValue ?? 500;
        const pnl = pos.direction === "long"
          ? ((currentPrice - pos.entryPrice) / pos.entryPrice) * lev * notional
          : ((pos.entryPrice - currentPrice) / pos.entryPrice) * lev * notional;
        return { id: pos.id, exchange: "paper", symbol: pos.symbol, side: pos.direction, size: pos.quantity, entryPrice: pos.entryPrice, currentPrice, pnl, leverage: lev, openedAt: pos.openedAt };
      }));
    }),
    trades: publicProcedure
      .input(z.object({ limit: z.number().default(20) }).optional())
      .query(async ({ input }) => {
        const d = await getDb();
        if (!d) return [];
        const rows = await d.select().from(paperTrades).orderBy(desc(paperTrades.closedAt)).limit(input?.limit ?? 20);
        return rows.map(t => ({ id: t.id, exchange: "paper", symbol: t.symbol, side: t.direction, size: t.quantity, entryPrice: t.entryPrice, exitPrice: t.exitPrice, pnl: t.pnl, closedAt: t.closedAt }));
      }),
    openPosition: publicProcedure
      .input(z.object({
        exchange: z.string().default("paper"),
        symbol: z.string(),
        side: z.enum(["long", "short"]),
        size: z.number().positive(),
        leverage: z.number().min(1).max(100).default(1),
      }))
      .mutation(async ({ input }) => {
        const d = await getDb();
        if (!d) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
        const ticker = input.symbol.replace("/", "").toUpperCase();
        let entryPrice = 0;
        try {
          const res = await fetch("https://api.binance.com/api/v3/ticker/price?symbol=" + ticker);
          if (res.ok) { const data = await res.json() as { price: string }; entryPrice = parseFloat(data.price); }
        } catch {}
        const notionalValue = entryPrice * input.size;
        const ids = await d.insert(paperPositions).values({
          symbol: ticker, direction: input.side, entryPrice, currentPrice: entryPrice,
          quantity: input.size, notionalValue, leverage: input.leverage,
          signalScore: 0, triggerSignal: "手动开仓(" + input.exchange + ")", openedAt: new Date(),
        });
        return { id: Number((ids as any)[0]?.insertId ?? 0), entryPrice, symbol: ticker, side: input.side };
      }),
    closePosition: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const d = await getDb();
        if (!d) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
        const positions = await d.select().from(paperPositions).where(eq(paperPositions.id, input.id)).limit(1);
        if (!positions[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Position not found" });
        const pos = positions[0];
        const ticker = pos.symbol.endsWith("USDT") ? pos.symbol : pos.symbol + "USDT";
        let exitPrice = pos.currentPrice ?? pos.entryPrice;
        try {
          const res = await fetch("https://api.binance.com/api/v3/ticker/price?symbol=" + ticker);
          if (res.ok) { const data = await res.json() as { price: string }; exitPrice = parseFloat(data.price); }
        } catch {}
        const lev = pos.leverage || 1;
        const notional = pos.notionalValue ?? 500;
        const pnl = pos.direction === "long"
          ? ((exitPrice - pos.entryPrice) / pos.entryPrice) * lev * notional
          : ((pos.entryPrice - exitPrice) / pos.entryPrice) * lev * notional;
        const pnlPct = pos.direction === "long"
          ? ((exitPrice - pos.entryPrice) / pos.entryPrice) * lev * 100
          : ((pos.entryPrice - exitPrice) / pos.entryPrice) * lev * 100;
        const holdingMinutes = Math.round((Date.now() - new Date(pos.openedAt).getTime()) / 60000);
        await d!.insert(paperTrades).values({
          symbol: pos.symbol, direction: pos.direction, entryPrice: pos.entryPrice, exitPrice,
          quantity: pos.quantity, notionalValue: notional, leverage: lev,
          pnl, pnlPct, closeReason: "manual", signalScore: pos.signalScore,
          triggerSignal: pos.triggerSignal ?? "", holdingMinutes, openedAt: pos.openedAt, closedAt: new Date(),
        });
        await d!.delete(paperPositions).where(eq(paperPositions.id, input.id));
        return { success: true, pnl, pnlPct };
      }),
  }),
});
;

// ─── 回测引擎 ─────────────────────────────────────────────────────────────────
async function runBacktest(params: {
  startDate: string; endDate: string; initialBalance: number;
  timeWindow: number; minScore: number; stopLossPercent: number;
  takeProfit1Percent: number; takeProfit2Percent: number; leverage: number;
}) {
  // 基于历史信号数据模拟回测
  const { initialBalance, stopLossPercent, takeProfit1Percent, takeProfit2Percent, leverage } = params;
  let balance = initialBalance;
  const tradeLog: any[] = [];
  let maxBalance = initialBalance;
  let maxDrawdown = 0;

  // 模拟历史信号（实际应从数据库读取历史信号）
  const mockSignals = generateMockHistoricalSignals(params.startDate, params.endDate);

  for (const signal of mockSignals) {
    if (balance <= 0) break;
    const positionValue = balance * 0.1; // 每次用10%资金
    const entryPrice = signal.price;
    const stopLoss = entryPrice * (1 - stopLossPercent / 100);
    const tp1 = entryPrice * (1 + takeProfit1Percent / 100);
    const tp2 = entryPrice * (1 + takeProfit2Percent / 100);

    // 模拟价格走势决定结果（使用与信号生成相同的 rng，保证确定性）
    const rngVal = Math.sin(signal.score * 12345.6789) * 0.5 + 0.5; // 基于信号评分的确定性值
    let exitPrice: number;
    let closeReason: string;

    if (rngVal < 0.55) { // 55% 胜率
      exitPrice = rngVal < 0.3 ? tp2 : tp1;
      closeReason = "止盈";
    } else {
      exitPrice = stopLoss;
      closeReason = "止损";
    }

    const pnl = (exitPrice - entryPrice) / entryPrice * positionValue * leverage;
    balance += pnl;
    if (balance > maxBalance) maxBalance = balance;
    const drawdown = (maxBalance - balance) / maxBalance * 100;
    if (drawdown > maxDrawdown) maxDrawdown = drawdown;

    tradeLog.push({ symbol: signal.symbol, entryPrice, exitPrice, pnl, closeReason, score: signal.score, time: signal.time });
  }

  const totalTrades = tradeLog.length;
  const winTrades = tradeLog.filter(t => t.pnl > 0).length;
  const lossTrades = totalTrades - winTrades;
  const totalReturn = ((balance - initialBalance) / initialBalance) * 100;
  const winRate = totalTrades > 0 ? (winTrades / totalTrades) * 100 : 0;

  // 计算夏普比率（简化版）
  const returns = tradeLog.map(t => t.pnl / initialBalance);
  const avgReturn = returns.reduce((s, r) => s + r, 0) / (returns.length || 1);
  const stdReturn = Math.sqrt(returns.reduce((s, r) => s + Math.pow(r - avgReturn, 2), 0) / (returns.length || 1));
  const sharpeRatio = stdReturn > 0 ? (avgReturn / stdReturn) * Math.sqrt(252) : 0;

  return { finalBalance: balance, totalReturn, totalTrades, winTrades, lossTrades, winRate, maxDrawdown, sharpeRatio, tradeLog };
}

// 确定性伪随机数生成器（xorshift32，种子固定保证回测结果一致）
function createSeededRandom(seed: number) {
  let s = (seed >>> 0) || 1;
  return () => {
    s ^= s << 13; s ^= s >> 17; s ^= s << 5;
    return (s >>> 0) / 4294967296;
  };
}

function generateMockHistoricalSignals(startDate: string, endDate: string) {
  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();
  const symbols = ["BTC", "ETH", "SOL", "BNB", "DOGE"];
  const signals = [];
  const basePrices: Record<string, number> = { BTC: 45000, ETH: 2800, SOL: 120, BNB: 380, DOGE: 0.12 };
  // 使用确定性种子（基于日期范围），相同参数每次结果一致
  const seed = ((start / 1000000) + (end / 1000000)) | 0;
  const rng = createSeededRandom(seed);
  let current = start;
  while (current < end) {
    const symbol = symbols[Math.floor(rng() * symbols.length)];
    const basePrice = basePrices[symbol] ?? 100;
    const price = basePrice * (0.9 + rng() * 0.2);
    const score = 0.6 + rng() * 0.4;
    signals.push({ symbol, price, score, time: new Date(current) });
    current += (1 + rng() * 4) * 3600 * 1000; // 1-5小时间隔
  }
  return signals;
}

// ─── 策略胜率统计 & 实战案例 ────────────────────────────────────────────────
// 注意：必须在 appRouter 内定义才能被注册，这里定义局部路由对象
const strategyStatsRouter = router({
  // 按策略类型统计历史胜率、盈亏比、最大回撤
  winRateStats: publicProcedure.query(async () => {
    return getStrategyWinRateStats();
  }),

  // 获取实战案例（真实交易记录）
  tradeCases: publicProcedure
    .input(z.object({ limit: z.number().default(20) }).optional())
    .query(async ({ input }) => {
      return getTradeCases(input?.limit ?? 20);
    }),
});

export type AppRouter = typeof appRouter;
