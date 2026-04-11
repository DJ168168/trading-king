// @ts-nocheck
import React, { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  TrendingUp, TrendingDown, Minus, RefreshCw, AlertTriangle,
  Activity, BarChart2, Globe, Flame, Zap, Target
} from "lucide-react";

// ─── 辅助组件 ────────────────────────────────────────────────────────────────

function SignalBadge({ signal }: { signal: string }) {
  const cfg: Record<string, { color: string; icon: React.ReactElement }> = {
    "强烈做多": { color: "bg-emerald-500 text-white", icon: <TrendingUp className="w-3.5 h-3.5" /> },
    "做多":     { color: "bg-green-500 text-white",   icon: <TrendingUp className="w-3.5 h-3.5" /> },
    "中性偏多": { color: "bg-teal-500 text-white",    icon: <TrendingUp className="w-3.5 h-3.5" /> },
    "中性":     { color: "bg-slate-500 text-white",   icon: <Minus className="w-3.5 h-3.5" /> },
    "中性偏空": { color: "bg-orange-500 text-white",  icon: <TrendingDown className="w-3.5 h-3.5" /> },
    "做空":     { color: "bg-red-500 text-white",     icon: <TrendingDown className="w-3.5 h-3.5" /> },
    "强烈做空": { color: "bg-rose-600 text-white",    icon: <TrendingDown className="w-3.5 h-3.5" /> },
  };
  const c = cfg[signal] ?? { color: "bg-slate-500 text-white", icon: <Minus className="w-3.5 h-3.5" /> };
  return (
    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-bold ${c.color}`}>
      {c.icon}{signal}
    </span>
  );
}

function ScoreBar({ score, label, description, signal }: {
  score: number; label: string; description: string; signal: "bullish" | "bearish" | "neutral";
}) {
  const color = signal === "bullish" ? "bg-emerald-500" : signal === "bearish" ? "bg-red-500" : "bg-slate-400";
  const pct = Math.round(((score + 20) / 40) * 100);
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-foreground">{label}</span>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-xs">{description}</span>
          <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${
            signal === "bullish" ? "text-emerald-400" : signal === "bearish" ? "text-red-400" : "text-slate-400"
          }`}>{score > 0 ? "+" : ""}{score}</span>
        </div>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${Math.max(2, pct)}%` }} />
      </div>
    </div>
  );
}

function FNGGauge({ value }: { value: number }) {
  const color = value <= 25 ? "#10b981" : value <= 45 ? "#22c55e" : value <= 55 ? "#94a3b8" : value <= 75 ? "#f97316" : "#ef4444";
  const label = value <= 15 ? "极度恐惧" : value <= 25 ? "恐惧" : value <= 45 ? "偏恐惧" : value <= 55 ? "中性" : value <= 75 ? "贪婪" : "极度贪婪";
  const rotation = (value / 100) * 180 - 90;
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-24 h-12 overflow-hidden">
        <svg viewBox="0 0 100 50" className="w-full h-full">
          <path d="M5,50 A45,45 0 0,1 95,50" fill="none" stroke="#1e293b" strokeWidth="10" />
          <path d="M5,50 A45,45 0 0,1 95,50" fill="none" stroke="url(#fngGrad)" strokeWidth="10" />
          <defs>
            <linearGradient id="fngGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="50%" stopColor="#94a3b8" />
              <stop offset="100%" stopColor="#ef4444" />
            </linearGradient>
          </defs>
          <line
            x1="50" y1="50"
            x2={50 + 35 * Math.cos((rotation - 90) * Math.PI / 180)}
            y2={50 + 35 * Math.sin((rotation - 90) * Math.PI / 180)}
            stroke={color} strokeWidth="3" strokeLinecap="round"
          />
          <circle cx="50" cy="50" r="4" fill={color} />
        </svg>
      </div>
      <div className="text-2xl font-bold" style={{ color }}>{value}</div>
      <div className="text-xs font-medium" style={{ color }}>{label}</div>
    </div>
  );
}

// ─── 主组件 ──────────────────────────────────────────────────────────────────

const SYMBOLS = ["BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT"];

export default function BullBearPanel() {
  const [selectedSymbol, setSelectedSymbol] = useState("BTCUSDT");
  const [refreshKey, setRefreshKey] = useState(0);

  // 综合评分（核心接口）
  const { data: scoreData, isLoading: scoreLoading, refetch: refetchScore } = trpc.freeData.bullBearScore.useQuery(
    { symbol: selectedSymbol },
    { refetchInterval: 60000, queryHash: `bullBear-${selectedSymbol}-${refreshKey}` }
  );

  // 恐惧贪婪历史
  const { data: fngData } = trpc.freeData.fearGreedHistory.useQuery(
    { limit: 7 },
    { refetchInterval: 300000 }
  );

  // 全球市场
  const { data: globalData } = trpc.freeData.globalMarket.useQuery(undefined, { refetchInterval: 120000 });

  // 热门代币
  const { data: trendingData } = trpc.freeData.trending.useQuery(undefined, { refetchInterval: 300000 });

  // CoinGlass 资金费率（多币种）
  const { data: premiumsData } = trpc.freeData.premiums.useQuery(undefined, { refetchInterval: 60000 });

  // CoinGlass 持仓量
  const { data: oiData } = trpc.freeData.oiHistory.useQuery(
    { symbol: selectedSymbol },
    { refetchInterval: 60000 }
  );

  const score = scoreData?.score;
  const raw = scoreData?.rawData;
  const fngHistory = fngData?.data ?? [];
  const global = globalData?.data;
  const trending = trendingData?.data ?? [];
  // CoinGlass 资金费率数据（FundingRateData[] 格式）
  const cgFundingRates = (premiumsData?.data ?? []) as Array<{
    symbol: string;
    usdtOrUsdMarginList: Array<{ exchange: string; fundingRate: number; nextFundingTime?: number }>;
  }>;
  // CoinGlass 持仓量数据
  const cgOI = (oiData?.data ?? []) as Array<{
    symbol: string; total: number; totalAmount: number;
    changePercent1h: number; changePercent4h: number; changePercent24h: number;
  }>;

  // 从 CoinGlass 数据中提取选中币种的资金费率
  const selectedCgSymbol = selectedSymbol.replace("USDT", "");
  const selectedFR = useMemo(() => {
    const item = cgFundingRates.find(d => d.symbol === selectedCgSymbol);
    return item?.usdtOrUsdMarginList ?? [];
  }, [cgFundingRates, selectedCgSymbol]);

  const selectedOI = useMemo(() => {
    return cgOI.find(d => d.symbol === selectedCgSymbol) ?? null;
  }, [cgOI, selectedCgSymbol]);

  const handleRefresh = () => {
    setRefreshKey(k => k + 1);
    refetchScore();
  };

  // 评分颜色
  const scoreColor = !score ? "#94a3b8" :
    score.totalScore >= 30 ? "#10b981" :
    score.totalScore <= -30 ? "#ef4444" : "#f59e0b";

  const scoreBg = !score ? "from-slate-800 to-slate-900" :
    score.totalScore >= 30 ? "from-emerald-900/50 to-slate-900" :
    score.totalScore <= -30 ? "from-red-900/50 to-slate-900" : "from-amber-900/30 to-slate-900";

  // 当前 Binance 资金费率（用于显示）
  const binanceFR = selectedFR.find(e => e.exchange === "Binance")?.fundingRate ?? 0;
  const frPct = binanceFR * 100;

  return (
    <div className="space-y-4 p-4">
      {/* 标题栏 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            多空综合面板
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">整合 4 大免费数据源，实时计算做多/做空综合评分</p>
        </div>
        <div className="flex items-center gap-2">
          {/* 币种选择 */}
          <div className="flex gap-1">
            {SYMBOLS.map(s => (
              <Button
                key={s}
                size="sm"
                variant={selectedSymbol === s ? "default" : "outline"}
                className="text-xs px-2 py-1 h-7"
                onClick={() => setSelectedSymbol(s)}
              >
                {s.replace("USDT", "")}
              </Button>
            ))}
          </div>
          <Button size="sm" variant="outline" onClick={handleRefresh} className="h-7 w-7 p-0">
            <RefreshCw className={`w-3.5 h-3.5 ${scoreLoading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* 主评分卡 */}
      <div className={`rounded-xl bg-gradient-to-br ${scoreBg} border border-border p-5`}>
        {scoreLoading ? (
          <div className="flex items-center justify-center h-32 text-muted-foreground">
            <RefreshCw className="w-5 h-5 animate-spin mr-2" />加载中...
          </div>
        ) : score ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* 左：总评分 */}
            <div className="flex flex-col items-center justify-center gap-3">
              <div className="text-xs text-muted-foreground uppercase tracking-wider">综合评分</div>
              <div className="relative w-28 h-28">
                <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                  <circle cx="50" cy="50" r="42" fill="none" stroke="#1e293b" strokeWidth="10" />
                  <circle
                    cx="50" cy="50" r="42" fill="none"
                    stroke={scoreColor} strokeWidth="10" strokeLinecap="round"
                    strokeDasharray={`${Math.abs(score.totalScore) / 100 * 264} 264`}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-black" style={{ color: scoreColor }}>
                    {score.totalScore > 0 ? "+" : ""}{score.totalScore}
                  </span>
                  <span className="text-xs text-muted-foreground">/ 100</span>
                </div>
              </div>
              <SignalBadge signal={score.signal} />
              <div className="text-xs text-muted-foreground">置信度：<span className="font-bold text-foreground">{score.confidence}</span></div>
            </div>

            {/* 中：多空力量对比 */}
            <div className="flex flex-col justify-center gap-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-emerald-400 font-medium flex items-center gap-1">
                    <TrendingUp className="w-3.5 h-3.5" />做多力量
                  </span>
                  <span className="text-emerald-400 font-bold">{score.bullScore}%</span>
                </div>
                <Progress value={score.bullScore} className="h-3 bg-slate-800 [&>div]:bg-emerald-500" />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-red-400 font-medium flex items-center gap-1">
                    <TrendingDown className="w-3.5 h-3.5" />做空力量
                  </span>
                  <span className="text-red-400 font-bold">{score.bearScore}%</span>
                </div>
                <Progress value={score.bearScore} className="h-3 bg-slate-800 [&>div]:bg-red-500" />
              </div>
              {/* 关键数据速览 */}
              <div className="grid grid-cols-2 gap-2 mt-1">
                <div className="bg-black/30 rounded-lg p-2 text-center">
                  <div className="text-xs text-muted-foreground">恐惧贪婪</div>
                  <div className={`text-sm font-bold ${(raw?.fng ?? 50) <= 25 ? "text-emerald-400" : (raw?.fng ?? 50) >= 75 ? "text-red-400" : "text-amber-400"}`}>
                    {raw?.fng ?? "--"}
                  </div>
                </div>
                <div className="bg-black/30 rounded-lg p-2 text-center">
                  <div className="text-xs text-muted-foreground">资金费率</div>
                  <div className={`text-sm font-bold ${frPct < -0.01 ? "text-emerald-400" : frPct > 0.05 ? "text-red-400" : "text-amber-400"}`}>
                    {frPct > 0 ? "+" : ""}{frPct.toFixed(4)}%
                  </div>
                </div>
                <div className="bg-black/30 rounded-lg p-2 text-center">
                  <div className="text-xs text-muted-foreground">OKX 多空比</div>
                  <div className={`text-sm font-bold ${
                    (raw as any)?.longShortRatio > 1.1 ? "text-red-400" :
                    (raw as any)?.longShortRatio < 0.9 ? "text-emerald-400" : "text-amber-400"
                  }`}>
                    {(raw as any)?.longShortRatio?.toFixed(3) ?? "--"}
                  </div>
                  <div className="text-[9px] text-muted-foreground">
                    多{((raw as any)?.longPct ?? 50).toFixed(0)}% / 空{((raw as any)?.shortPct ?? 50).toFixed(0)}%
                  </div>
                </div>
                <div className="bg-black/30 rounded-lg p-2 text-center">
                  <div className="text-xs text-muted-foreground">技术面 RSI</div>
                  <div className={`text-sm font-bold ${
                    (raw as any)?.technical?.rsi < 30 ? "text-emerald-400" :
                    (raw as any)?.technical?.rsi > 70 ? "text-red-400" : "text-amber-400"
                  }`}>
                    {(raw as any)?.technical?.rsi?.toFixed(1) ?? "--"}
                  </div>
                  <div className="text-[9px] text-muted-foreground">
                    {(raw as any)?.technical?.macdSignal === "bullish" ? "金叉" :
                     (raw as any)?.technical?.macdSignal === "bearish" ? "死叉" : "MACD"}
                  </div>
                </div>
              </div>
            </div>

            {/* 右：建议 */}
            <div className="flex flex-col justify-center gap-3">
              <div className="text-xs text-muted-foreground uppercase tracking-wider">操作建议</div>
              <div className="text-sm text-foreground leading-relaxed">{score.recommendation}</div>
              <div className="mt-2 p-2 rounded-lg bg-black/30 text-xs text-muted-foreground leading-relaxed">
                {score.entryAdvice}
              </div>
              {/* 资金费率信号 */}
              <div className={`p-2 rounded-lg text-xs font-medium ${frPct < -0.05 ? "bg-emerald-900/40 text-emerald-300" : frPct > 0.05 ? "bg-red-900/40 text-red-300" : "bg-slate-800/50 text-slate-400"}`}>
                {frPct < -0.05 ? "💰 空方付费 → 做多成本极低" :
                 frPct < -0.01 ? "✅ 空方付费 → 看多信号" :
                 frPct > 0.05 ? "⚠️ 多方拥挤 → 注意回调风险" : "⚖️ 资金费率中性"}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-32 text-muted-foreground">
            <AlertTriangle className="w-5 h-5 mr-2" />数据加载失败，请刷新重试
          </div>
        )}
      </div>

      {/* 因子详情 */}
      {score && (
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-primary" />
              评分因子详情
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {score.factors.map((f, i) => (
              <ScoreBar key={i} score={f.score} label={f.name} description={f.value} signal={f.signal} />
            ))}
          </CardContent>
        </Card>
      )}

      {/* 数据面板 Tabs */}
      <Tabs defaultValue="sentiment">
        <TabsList className="bg-muted/50 h-8">
          <TabsTrigger value="sentiment" className="text-xs h-6">市场情绪</TabsTrigger>
          <TabsTrigger value="longshort" className="text-xs h-6">OKX多空比</TabsTrigger>
          <TabsTrigger value="market" className="text-xs h-6">全局市场</TabsTrigger>
          <TabsTrigger value="contracts" className="text-xs h-6">资金费率</TabsTrigger>
          <TabsTrigger value="trending" className="text-xs h-6">热门代币</TabsTrigger>
          <TabsTrigger value="news" className="text-xs h-6">新闻情绪</TabsTrigger>
        </TabsList>

        {/* 市场情绪 Tab */}
        <TabsContent value="sentiment" className="mt-3 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* 恐惧贪婪指数 */}
            <Card className="bg-card border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-muted-foreground flex items-center gap-1">
                  <Activity className="w-3.5 h-3.5" />恐惧贪婪指数（Alternative.me）
                </CardTitle>
              </CardHeader>
              <CardContent>
                {fngHistory.length > 0 ? (
                  <div className="flex flex-col items-center gap-2">
                    <FNGGauge value={fngHistory[0]?.value ?? 50} />
                    <div className="w-full flex items-end justify-between gap-1 mt-2">
                      {fngHistory.slice(0, 7).reverse().map((d, i) => {
                        const h = Math.max(4, (d.value / 100) * 40);
                        const col = d.value <= 25 ? "#10b981" : d.value <= 55 ? "#94a3b8" : "#ef4444";
                        return (
                          <div key={i} className="flex flex-col items-center gap-0.5 flex-1">
                            <div className="rounded-sm w-full" style={{ height: h, backgroundColor: col, opacity: 0.8 }} />
                            <span className="text-[9px] text-muted-foreground">{d.value}</span>
                          </div>
                        );
                      })}
                    </div>
                    <div className="text-[10px] text-muted-foreground">过去7天趋势（左旧右新）</div>
                    <div className="w-full mt-1 p-2 rounded-lg bg-muted/30 text-xs text-muted-foreground">
                      {(fngHistory[0]?.value ?? 50) <= 25 ? "✅ 极度恐惧区间 → 历史最佳买入时机（巴菲特：别人恐惧时贪婪）" :
                       (fngHistory[0]?.value ?? 50) <= 45 ? "📊 恐惧区间 → 可考虑分批建仓" :
                       (fngHistory[0]?.value ?? 50) <= 55 ? "⚖️ 市场中性 → 等待方向确认" :
                       (fngHistory[0]?.value ?? 50) <= 75 ? "⚠️ 贪婪区间 → 注意风险，减少仓位" :
                       "🔴 极度贪婪 → 高风险，建议减仓或观望"}
                    </div>
                  </div>
                ) : <div className="h-20 flex items-center justify-center text-muted-foreground text-xs">加载中...</div>}
              </CardContent>
            </Card>

            {/* 持仓量变化 */}
            <Card className="bg-card border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-muted-foreground flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5" />持仓量变化（CoinGlass）
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {selectedOI ? (
                  <>
                    <div className="text-center">
                      <div className="text-xs text-muted-foreground mb-1">{selectedCgSymbol} 全网持仓量</div>
                      <div className="text-2xl font-bold text-foreground">
                        ${(selectedOI.total / 1e9).toFixed(2)}B
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { label: "1小时", value: selectedOI.changePercent1h },
                        { label: "4小时", value: selectedOI.changePercent4h },
                        { label: "24小时", value: selectedOI.changePercent24h },
                      ].map((item, i) => (
                        <div key={i} className="bg-muted/30 rounded-lg p-2 text-center">
                          <div className="text-xs text-muted-foreground">{item.label}</div>
                          <div className={`text-sm font-bold ${item.value > 0 ? "text-emerald-400" : "text-red-400"}`}>
                            {item.value > 0 ? "+" : ""}{item.value.toFixed(2)}%
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="text-xs text-muted-foreground p-2 bg-muted/20 rounded">
                      {selectedOI.changePercent1h > 1 ? "✅ 持仓量快速增加 → 新资金入场，趋势延续信号" :
                       selectedOI.changePercent1h < -1 ? "⚠️ 持仓量快速减少 → 资金撤离，注意趋势反转" :
                       "持仓量变化平稳，市场观望情绪较浓"}
                    </div>
                  </>
                ) : <div className="h-20 flex items-center justify-center text-muted-foreground text-xs">加载中...</div>}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 全球市场 Tab */}
        <TabsContent value="market" className="mt-3">
          {global ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "BTC 主导率", value: `${global.btcDominance.toFixed(2)}%`, sub: "BTC 占总市值比例", color: "text-amber-400", icon: <Activity className="w-4 h-4" /> },
                { label: "ETH 主导率", value: `${global.ethDominance.toFixed(2)}%`, sub: "ETH 占总市值比例", color: "text-blue-400", icon: <Activity className="w-4 h-4" /> },
                { label: "总市值变化", value: `${global.marketCapChange24h > 0 ? "+" : ""}${global.marketCapChange24h.toFixed(2)}%`, sub: "24小时总市值变化", color: global.marketCapChange24h > 0 ? "text-emerald-400" : "text-red-400", icon: <Globe className="w-4 h-4" /> },
                { label: "总市值", value: `$${(global.totalMarketCap / 1e12).toFixed(2)}T`, sub: "全球加密市场总市值", color: "text-foreground", icon: <Globe className="w-4 h-4" /> },
                { label: "24h 成交量", value: `$${(global.totalVolume24h / 1e9).toFixed(1)}B`, sub: "全球24小时成交量", color: "text-foreground", icon: <BarChart2 className="w-4 h-4" /> },
                { label: "活跃加密货币", value: global.activeCryptos.toLocaleString(), sub: "当前活跃代币数量", color: "text-foreground", icon: <Activity className="w-4 h-4" /> },
                { label: "交易所数量", value: global.markets.toLocaleString(), sub: "全球交易所数量", color: "text-foreground", icon: <BarChart2 className="w-4 h-4" /> },
                { label: "山寨季指数", value: global.btcDominance < 45 ? "山寨季" : global.btcDominance < 55 ? "过渡期" : "BTC主导", sub: `BTC主导率 ${global.btcDominance.toFixed(1)}%`, color: global.btcDominance < 45 ? "text-emerald-400" : global.btcDominance < 55 ? "text-amber-400" : "text-blue-400", icon: <Flame className="w-4 h-4" /> },
              ].map((item, i) => (
                <Card key={i} className="bg-card border-border">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-1.5 text-muted-foreground mb-1.5">
                      {item.icon}
                      <span className="text-xs">{item.label}</span>
                    </div>
                    <div className={`text-xl font-bold ${item.color}`}>{item.value}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{item.sub}</div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">加载全球市场数据中...</div>}
        </TabsContent>

        {/* OKX 多空比 Tab */}
        <TabsContent value="longshort" className="mt-3">
          <div className="space-y-3">
            <Card className="bg-card border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <BarChart2 className="w-4 h-4 text-blue-400" />
                  OKX 合约多空比（实时）
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {(raw as any)?.longShortRatio ? (
                  <>
                    {/* 多空比进度条 */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-emerald-400 font-medium">多头持仓占比</span>
                        <span className="text-emerald-400 font-bold">{((raw as any)?.longPct ?? 50).toFixed(2)}%</span>
                      </div>
                      <div className="h-4 bg-muted rounded-full overflow-hidden flex">
                        <div className="bg-emerald-500 h-full transition-all" style={{ width: `${(raw as any)?.longPct ?? 50}%` }} />
                        <div className="bg-red-500 h-full transition-all flex-1" />
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>多头 {((raw as any)?.longPct ?? 50).toFixed(2)}%</span>
                        <span>多空比: <span className="font-bold text-foreground">{(raw as any)?.longShortRatio?.toFixed(4)}</span></span>
                        <span>空头 {((raw as any)?.shortPct ?? 50).toFixed(2)}%</span>
                      </div>
                    </div>
                    {/* Taker 主动买卖比 */}
                    {(raw as any)?.takerBuySellRatio && (
                      <div className="p-3 rounded-lg bg-muted/30 space-y-2">
                        <div className="text-xs font-medium text-muted-foreground">OKX Taker 主动买卖比</div>
                        <div className="flex justify-between text-sm">
                          <span>主动买入量</span>
                          <span className="text-emerald-400 font-mono">{((raw as any)?.takerBuyVol / 1e6).toFixed(2)}M</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>主动卖出量</span>
                          <span className="text-red-400 font-mono">{((raw as any)?.takerSellVol / 1e6).toFixed(2)}M</span>
                        </div>
                        <div className="flex justify-between text-sm font-bold">
                          <span>买卖比</span>
                          <span className={`font-mono ${
                            (raw as any)?.takerBuySellRatio > 1.05 ? "text-emerald-400" :
                            (raw as any)?.takerBuySellRatio < 0.95 ? "text-red-400" : "text-amber-400"
                          }`}>{(raw as any)?.takerBuySellRatio?.toFixed(4)}</span>
                        </div>
                      </div>
                    )}
                    {/* 信号解读 */}
                    <div className="p-2 rounded-lg bg-muted/20 text-xs text-muted-foreground space-y-1">
                      <div className="font-medium text-foreground">📊 OKX 多空比解读</div>
                      <div>• <span className="text-red-400">多空比 &gt; 1.2</span>：多头过多 → 小心多方拥挤，注意回调风险</div>
                      <div>• <span className="text-emerald-400">多空比 &lt; 0.8</span>：空头过多 → 反向信号，可能就要反弹</div>
                      <div>• <span className="text-amber-400">Taker买卖比 &gt; 1.05</span>：主动买入力度大 → 短期看多</div>
                      <div>• 数据来源：<span className="text-blue-400">OKX 公开 API（已验证可用）</span></div>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
                    <RefreshCw className="w-4 h-4 animate-spin mr-2" />加载 OKX 多空数据中...
                  </div>
                )}
              </CardContent>
            </Card>
            {/* 技术面评分 */}
            {(raw as any)?.technical && (
              <Card className="bg-card border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Activity className="w-4 h-4 text-purple-400" />
                    技术面评分（Binance K线实时计算）
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      { label: "RSI(14)", value: (raw as any)?.technical?.rsi?.toFixed(1), signal: (raw as any)?.technical?.rsi < 30 ? "超卖" : (raw as any)?.technical?.rsi > 70 ? "超买" : "中性", color: (raw as any)?.technical?.rsi < 30 ? "text-emerald-400" : (raw as any)?.technical?.rsi > 70 ? "text-red-400" : "text-amber-400" },
                      { label: "MACD信号", value: (raw as any)?.technical?.macdSignal === "bullish" ? "金叉" : (raw as any)?.technical?.macdSignal === "bearish" ? "死叉" : "中性", signal: (raw as any)?.technical?.macdSignal, color: (raw as any)?.technical?.macdSignal === "bullish" ? "text-emerald-400" : (raw as any)?.technical?.macdSignal === "bearish" ? "text-red-400" : "text-amber-400" },
                      { label: "布林带", value: (raw as any)?.technical?.bbSignal === "oversold" ? "下轨" : (raw as any)?.technical?.bbSignal === "overbought" ? "上轨" : "中轨", signal: (raw as any)?.technical?.bbSignal, color: (raw as any)?.technical?.bbSignal === "oversold" ? "text-emerald-400" : (raw as any)?.technical?.bbSignal === "overbought" ? "text-red-400" : "text-amber-400" },
                      { label: "EMA趋势", value: (raw as any)?.technical?.emaTrend === "bullish" ? "多头排列" : (raw as any)?.technical?.emaTrend === "bearish" ? "空头排列" : "混乱", signal: (raw as any)?.technical?.emaTrend, color: (raw as any)?.technical?.emaTrend === "bullish" ? "text-emerald-400" : (raw as any)?.technical?.emaTrend === "bearish" ? "text-red-400" : "text-amber-400" },
                    ].map((item, i) => (
                      <div key={i} className="bg-muted/30 rounded-lg p-3 text-center">
                        <div className="text-xs text-muted-foreground mb-1">{item.label}</div>
                        <div className={`text-lg font-bold ${item.color}`}>{item.value ?? "--"}</div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 p-2 rounded-lg bg-muted/20 text-xs text-muted-foreground">
                    📊 当前 {selectedSymbol} 价格: <span className="text-foreground font-bold">${(raw as any)?.technical?.price?.toLocaleString() ?? "--"}</span>
                    ，24h涨跌: <span className={(raw as any)?.technical?.priceChange24h > 0 ? "text-emerald-400" : "text-red-400"}>{(raw as any)?.technical?.priceChange24h?.toFixed(2) ?? "--"}%</span>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* 资金费率 Tab */}
        <TabsContent value="contracts" className="mt-3">
          <div className="space-y-3">
            {/* 多交易所资金费率表 */}
            <Card className="bg-card border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">主流合约资金费率（CoinGlass 多交易所）</CardTitle>
              </CardHeader>
              <CardContent>
                {cgFundingRates.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border text-muted-foreground text-xs">
                          <th className="text-left pb-2 font-medium">币种</th>
                          <th className="text-right pb-2 font-medium">Binance</th>
                          <th className="text-right pb-2 font-medium">OKX</th>
                          <th className="text-right pb-2 font-medium">Bybit</th>
                          <th className="text-right pb-2 font-medium">信号</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cgFundingRates.map((item, i) => {
                          const getRate = (ex: string) => item.usdtOrUsdMarginList?.find(e => e.exchange === ex)?.fundingRate ?? null;
                          const binRate = getRate("Binance");
                          const okxRate = getRate("OKX");
                          const bybitRate = getRate("Bybit");
                          const avgRate = [binRate, okxRate, bybitRate].filter(r => r !== null).reduce((s, r) => s + (r ?? 0), 0) / 3;
                          const frSignal = avgRate < -0.01 ? "空方付费↑多" : avgRate > 0.05 ? "多方拥挤↓空" : "中性";
                          const frColor = avgRate < -0.01 ? "text-emerald-400" : avgRate > 0.05 ? "text-red-400" : "text-muted-foreground";
                          const fmtRate = (r: number | null) => r !== null ? `${r > 0 ? "+" : ""}${(r * 100).toFixed(4)}%` : "--";
                          return (
                            <tr key={i} className="border-b border-border/50 hover:bg-muted/20">
                              <td className="py-2 font-medium">{item.symbol}</td>
                              <td className={`py-2 text-right font-mono text-xs ${binRate !== null && binRate < -0.01 ? "text-emerald-400" : binRate !== null && binRate > 0.05 ? "text-red-400" : "text-muted-foreground"}`}>
                                {fmtRate(binRate)}
                              </td>
                              <td className={`py-2 text-right font-mono text-xs ${okxRate !== null && okxRate < -0.01 ? "text-emerald-400" : okxRate !== null && okxRate > 0.05 ? "text-red-400" : "text-muted-foreground"}`}>
                                {fmtRate(okxRate)}
                              </td>
                              <td className={`py-2 text-right font-mono text-xs ${bybitRate !== null && bybitRate < -0.01 ? "text-emerald-400" : bybitRate !== null && bybitRate > 0.05 ? "text-red-400" : "text-muted-foreground"}`}>
                                {fmtRate(bybitRate)}
                              </td>
                              <td className={`py-2 text-right text-xs ${frColor}`}>{frSignal}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : <div className="flex items-center justify-center h-20 text-muted-foreground text-xs">加载中...</div>}
              </CardContent>
            </Card>

            {/* 资金费率说明 */}
            <Card className="bg-muted/20 border-border/50">
              <CardContent className="p-3">
                <div className="text-xs text-muted-foreground space-y-1">
                  <div className="font-medium text-foreground mb-1.5">📖 资金费率解读</div>
                  <div>• <span className="text-emerald-400">负资金费率</span>：空方向多方付费 → 做多成本低，看多信号</div>
                  <div>• <span className="text-amber-400">接近零</span>：多空平衡，市场中性</div>
                  <div>• <span className="text-red-400">高正资金费率（&gt;0.05%）</span>：多方拥挤 → 注意回调风险，看空信号</div>
                  <div>• <span className="text-blue-400">当前 {selectedCgSymbol} Binance 费率</span>：{frPct > 0 ? "+" : ""}{frPct.toFixed(4)}% → {frPct < -0.01 ? "空方付费，做多有利" : frPct > 0.05 ? "多方拥挤，注意风险" : "中性"}</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 热门代币 Tab */}
        <TabsContent value="trending" className="mt-3">
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Flame className="w-4 h-4 text-orange-400" />
                CoinGecko 热门代币 TOP 10
              </CardTitle>
            </CardHeader>
            <CardContent>
              {trending.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                  {trending.map((coin, i) => (
                    <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                      <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground flex-shrink-0">
                        {i + 1}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-foreground truncate">{coin.symbol}</div>
                        <div className="text-xs text-muted-foreground truncate">{coin.name}</div>
                        {coin.priceChange24h !== undefined && (
                          <div className={`text-xs font-medium ${coin.priceChange24h > 0 ? "text-emerald-400" : "text-red-400"}`}>
                            {coin.priceChange24h > 0 ? "+" : ""}{coin.priceChange24h.toFixed(1)}%
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : <div className="flex items-center justify-center h-20 text-muted-foreground text-xs">加载中...</div>}
              <div className="mt-3 text-xs text-muted-foreground">
                💡 热门代币反映市场关注度，结合多空评分可发现高胜率交易机会
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 新闻情绪 Tab */}
        <TabsContent value="news" className="mt-3">
          <Card className="bg-card/50 border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <span>📰</span> 加密货币新闻情绪分析
                <Badge variant="outline" className="ml-auto text-[10px] text-emerald-400 border-emerald-400/30">免费 RSS</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {raw?.news ? (
                <>
                  {/* 情绪概览 */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="text-center p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                      <div className="text-lg font-bold text-emerald-400">{raw.news.bullishCount}</div>
                      <div className="text-[10px] text-muted-foreground">利多新闻</div>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-slate-500/10 border border-slate-500/20">
                      <div className="text-lg font-bold text-slate-400">{raw.news.neutralCount}</div>
                      <div className="text-[10px] text-muted-foreground">中性新闻</div>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-red-500/10 border border-red-500/20">
                      <div className="text-lg font-bold text-red-400">{raw.news.bearishCount}</div>
                      <div className="text-[10px] text-muted-foreground">利空新闻</div>
                    </div>
                  </div>
                  {/* 情绪评分进度条 */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">情绪评分</span>
                      <span className={`font-bold ${
                        raw.news.sentimentScore >= 15 ? 'text-emerald-400' :
                        raw.news.sentimentScore <= -15 ? 'text-red-400' : 'text-slate-400'
                      }`}>{raw.news.sentimentScore > 0 ? '+' : ''}{raw.news.sentimentScore} ({raw.news.overallSentiment})</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          raw.news.sentimentScore >= 0 ? 'bg-emerald-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${Math.abs(raw.news.sentimentScore)}%` }}
                      />
                    </div>
                  </div>
                  {/* 利多新闻 */}
                  {raw.news.topBullish.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="text-xs font-medium text-emerald-400">📈 利多新闻</div>
                      {raw.news.topBullish.map((n: { title: string; source: string }, i: number) => (
                        <div key={i} className="p-2 rounded bg-emerald-500/5 border border-emerald-500/20">
                          <div className="text-xs text-foreground leading-snug">{n.title}</div>
                          <div className="text-[10px] text-muted-foreground mt-0.5">{n.source}</div>
                        </div>
                      ))}
                    </div>
                  )}
                  {/* 利空新闻 */}
                  {raw.news.topBearish.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="text-xs font-medium text-red-400">📉 利空新闻</div>
                      {raw.news.topBearish.map((n: { title: string; source: string }, i: number) => (
                        <div key={i} className="p-2 rounded bg-red-500/5 border border-red-500/20">
                          <div className="text-xs text-foreground leading-snug">{n.title}</div>
                          <div className="text-[10px] text-muted-foreground mt-0.5">{n.source}</div>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="text-[10px] text-muted-foreground text-center pt-1">
                    共分析 {raw.news.totalCount} 条新闻 · 来源：CoinDesk / CoinTelegraph / Decrypt / CryptoNews
                  </div>
                </>
              ) : (
                <div className="text-center text-muted-foreground text-sm py-6">新闻数据加载中...</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 数据源说明 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {[
          { name: "Alternative.me", desc: "恐惧贪婪指数", free: true },
          { name: "CoinGecko", desc: "全局市场/热门币", free: true },
          { name: "CoinGlass", desc: "资金费率/持仓量", free: true },
          { name: "OKX", desc: "多空比/Taker比", free: true },
          { name: "Binance K线", desc: "RSI/MACD/布林带", free: true },
          { name: "RSS 新闻源", desc: "CoinDesk/CT/Decrypt", free: true },
        ].map((s, i) => (
          <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-muted/20 border border-border/50">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
            <div>
              <div className="text-xs font-medium text-foreground">{s.name}</div>
              <div className="text-[10px] text-muted-foreground">{s.desc}</div>
            </div>
            <Badge variant="outline" className="ml-auto text-[9px] px-1 py-0 h-4 text-emerald-400 border-emerald-400/30">免费</Badge>
          </div>
        ))}
      </div>
    </div>
  );
}
