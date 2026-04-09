import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { RefreshCw, Flame, Target, TrendingUp, TrendingDown, Zap, Star, AlertTriangle, CheckCircle2, XCircle, Clock, Rocket } from "lucide-react";

/**
 * 信号共振增强引擎 v2
 * 综合 AI 多空信号 + 主力成本偏离度 + 资金流方向 + OKX多空比 + 技术面 → 计算最终胜率评分
 *
 * 评分维度（满分 100）：
 * 1. AI 信号质量（Alpha/FOMO 标记）：25 分
 * 2. 主力成本偏离度（当前价 vs 主力成本）：20 分
 * 3. 资金流方向（现货+合约净流入）：20 分
 * 4. OKX 多空比（合约持仓占比）：15 分
 * 5. 技术面评分（RSI/MACD/布林带/EMA）：10 分
 * 6. 市场情绪（恐惧贪婪指数）：5 分
 * 7. 看涨情绪百分比：5 分
 */

const WATCH_SYMBOLS = ["BTC", "ETH", "SOL", "BNB", "XRP", "DOGE", "ADA", "AVAX"];

interface ResonanceScore {
  symbol: string;
  totalScore: number;
  aiScore: number;
  costScore: number;
  flowScore: number;
  lsScore: number;      // OKX 多空比评分
  techScore: number;    // 技术面评分
  sentimentScore: number;
  bullishScore: number;
  direction: "long" | "short" | "neutral";
  signals: string[];
  warnings: string[];
  recommendation: "强烈做多" | "做多" | "观望" | "做空" | "强烈做空";
  confidence: number;
}

function calcResonanceScore(params: {
  aiItem: any;
  whaleCostData: any;
  capitalFlowData: any;
  fearGreedValue: number;
  currentPrice: number;
  okxLSData?: { longShortRatio: number; longPct: number; shortPct: number; takerBuySellRatio: number } | null;
  technicalData?: { rsi: number; macdSignal: string; bbSignal: string; emaTrend: string } | null;
}): ResonanceScore {
  const { aiItem, whaleCostData, capitalFlowData, fearGreedValue, currentPrice, okxLSData, technicalData } = params;
  const symbol = aiItem?.symbol ?? aiItem?.tokenSymbol ?? "";
  const signals: string[] = [];
  const warnings: string[] = [];
  let aiScore = 0;
  let costScore = 0;
  let flowScore = 0;
  let lsScore = 0;
  let techScore = 0;
  let sentimentScore = 0;
  let bullishScore = 0;

  // 1. AI 信号质量（25分）
  const isAlpha = aiItem?.keyword === 1 || aiItem?.isAlpha;
  const isFomo = aiItem?.keyword === 2 || aiItem?.isFomo;
  const bullishPct = parseFloat(aiItem?.bullishSentiment ?? aiItem?.bullishPercent ?? "0");
  if (isAlpha && isFomo) { aiScore = 25; signals.push("⚡🔥 Alpha+FOMO 双重共振"); }
  else if (isAlpha) { aiScore = 20; signals.push("⚡ Alpha 鲸鱼异常活跃"); }
  else if (isFomo) { aiScore = 15; signals.push("🔥 FOMO 市场热情高涨"); }
  else { aiScore = 6; }

  // AI 过热警告
  const rawAiScore = parseFloat(aiItem?.aiScore ?? aiItem?.score ?? "0");
  if (rawAiScore > 80) { aiScore = Math.max(aiScore - 8, 0); warnings.push("⚠ AI 分数过热（>80），注意出货风险"); }

  // 2. 主力成本偏离度（20分）
  const whaleCost = parseFloat(whaleCostData?.avgCost ?? whaleCostData?.cost ?? whaleCostData?.whaleCost ?? "0");
  if (whaleCost > 0 && currentPrice > 0) {
    const deviation = ((currentPrice - whaleCost) / whaleCost) * 100;
    if (deviation < -15) { costScore = 20; signals.push(`📉 主力深套 ${deviation.toFixed(1)}%，强烈拉盘动力`); }
    else if (deviation < -5) { costScore = 16; signals.push(`📉 主力亏损 ${deviation.toFixed(1)}%，有拉盘动力`); }
    else if (deviation < 5) { costScore = 12; signals.push(`📊 价格在主力成本附近（偏离 ${deviation.toFixed(1)}%）`); }
    else if (deviation < 15) { costScore = 6; warnings.push(`⚠ 主力浮盈 ${deviation.toFixed(1)}%，注意减仓`); }
    else { costScore = 2; warnings.push(`🚨 主力严重浮盈 ${deviation.toFixed(1)}%，出货风险高`); }
  }

  // 3. 资金流方向（20分）
  const spotFlow = parseFloat(capitalFlowData?.spotNetFlow ?? capitalFlowData?.spot ?? "0");
  const futuresFlow = parseFloat(capitalFlowData?.futuresNetFlow ?? capitalFlowData?.futures ?? "0");
  const totalFlow = spotFlow + futuresFlow;
  if (spotFlow > 0 && futuresFlow > 0) { flowScore = 20; signals.push("💰 现货+合约双向净流入，主力积极建仓"); }
  else if (totalFlow > 0) { flowScore = 12; signals.push("💰 资金净流入"); }
  else if (totalFlow < 0) { flowScore = 4; warnings.push("📤 资金净流出，主力离场"); }

  // 4. OKX 多空比（15分）—— 逆向指标：多头过多反而危险
  if (okxLSData) {
    const { longShortRatio, longPct, takerBuySellRatio } = okxLSData;
    // 多空比逆向评分：空头过多（比 < 0.9）→ 反弹信号
    if (longShortRatio < 0.8) { lsScore = 15; signals.push(`🟢 OKX空头过多(${longPct.toFixed(0)}%多)，反弹信号强`); }
    else if (longShortRatio < 0.95) { lsScore = 10; signals.push(`🟢 OKX空头偏多(${longPct.toFixed(0)}%多)，小幅反弹信号`); }
    else if (longShortRatio <= 1.1) { lsScore = 8; signals.push(`⚪ OKX多空平衡(${longPct.toFixed(0)}%多)，中性`); }
    else if (longShortRatio <= 1.3) { lsScore = 5; warnings.push(`⚠ OKX多头偏多(${longPct.toFixed(0)}%多)，注意拥挤`); }
    else { lsScore = 2; warnings.push(`🚨 OKX多头过多(${longPct.toFixed(0)}%多)，高拥挤风险`); }
    // Taker 主动买入修正
    if (takerBuySellRatio > 1.1) { lsScore = Math.min(lsScore + 3, 15); signals.push(`📊 Taker主动买入强(${takerBuySellRatio.toFixed(2)})`); }
    else if (takerBuySellRatio < 0.9) { lsScore = Math.max(lsScore - 2, 0); warnings.push(`📊 Taker主动卖出强(${takerBuySellRatio.toFixed(2)})`); }
  }

  // 5. 技术面评分（10分）
  if (technicalData) {
    const { rsi, macdSignal, bbSignal, emaTrend } = technicalData;
    let techPoints = 0;
    // RSI：超卖区间做多，超买区间做空
    if (rsi < 30) { techPoints += 4; signals.push(`📊 RSI超卖(${rsi.toFixed(0)})，反弹信号`); }
    else if (rsi < 45) { techPoints += 2; signals.push(`📊 RSI偏低(${rsi.toFixed(0)})`); }
    else if (rsi > 70) { techPoints -= 2; warnings.push(`⚠ RSI超买(${rsi.toFixed(0)})，注意回调`); }
    // MACD
    if (macdSignal === "bullish") { techPoints += 3; signals.push("📊 MACD金叉，向上动能"); }
    else if (macdSignal === "bearish") { techPoints -= 1; warnings.push("⚠ MACD死叉，向下压力"); }
    // 布林带
    if (bbSignal === "oversold") { techPoints += 2; signals.push("📊 布林带下轨，反弹信号"); }
    else if (bbSignal === "overbought") { techPoints -= 1; warnings.push("⚠ 布林带上轨，注意压力"); }
    // EMA趋势
    if (emaTrend === "bullish") { techPoints += 2; signals.push("📊 EMA多头排列，上升趋势"); }
    else if (emaTrend === "bearish") { techPoints -= 1; warnings.push("⚠ EMA空头排列，下降趋势"); }
    techScore = Math.max(0, Math.min(10, techPoints));
  }

  // 6. 市场情绪（5分）
  if (fearGreedValue >= 25 && fearGreedValue <= 75) { sentimentScore = 5; signals.push(`😊 市场情绪适中（${fearGreedValue}）`); }
  else if (fearGreedValue < 25) { sentimentScore = 4; signals.push(`😨 极度恐惧（${fearGreedValue}），逆向做多机会`); }
  else { sentimentScore = 1; warnings.push(`🤑 极度贪婪（${fearGreedValue}），注意回调风险`); }

  // 7. 看涨情绪（5分）
  if (bullishPct >= 70) { bullishScore = 5; signals.push(`📈 看涨情绪强烈（${bullishPct.toFixed(0)}%）`); }
  else if (bullishPct >= 55) { bullishScore = 3; signals.push(`📈 看涨情绪偏多（${bullishPct.toFixed(0)}%）`); }
  else if (bullishPct >= 45) { bullishScore = 2; }
  else { bullishScore = 1; warnings.push(`📉 看涨情绪偏弱（${bullishPct.toFixed(0)}%）`); }

  const totalScore = aiScore + costScore + flowScore + lsScore + techScore + sentimentScore + bullishScore;
  const confidence = Math.min(totalScore, 100);

  let direction: "long" | "short" | "neutral" = "neutral";
  let recommendation: ResonanceScore["recommendation"] = "观望";
  if (totalScore >= 75) { direction = "long"; recommendation = "强烈做多"; }
  else if (totalScore >= 55) { direction = "long"; recommendation = "做多"; }
  else if (totalScore >= 35) { direction = "neutral"; recommendation = "观望"; }
  else if (totalScore >= 20) { direction = "short"; recommendation = "做空"; }
  else { direction = "short"; recommendation = "强烈做空"; }

  return { symbol, totalScore, aiScore, costScore, flowScore, lsScore, techScore, sentimentScore, bullishScore, direction, signals, warnings, recommendation, confidence };
}

function ScoreBar({ label, value, max = 30, color }: { label: string; value: number; max?: number; color: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className={color}>{value}/{max}</span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color.replace("text-", "bg-")}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// ── 一键下单弹窗 ──────────────────────────────────────────────────────────────
function QuickOrderDialog({
  open, onClose, symbol, direction, currentPrice,
}: {
  open: boolean; onClose: () => void;
  symbol: string; direction: "long" | "short"; currentPrice: number;
}) {
  const [exchange, setExchange] = useState<"binance" | "okx">("binance");
  const [qty, setQty] = useState("10");
  const [leverage, setLeverage] = useState("10");
  const [confirming, setConfirming] = useState(false);

  const binanceOrder = trpc.exchange.binancePlaceOrder.useMutation();
  const okxOrder = trpc.exchange.okxPlaceOrder.useMutation();

  const futureSym = symbol.endsWith("USDT") ? symbol : `${symbol}USDT`;
  const estMargin = (parseFloat(qty) * currentPrice / parseFloat(leverage)).toFixed(2);

  async function handleConfirm() {
    setConfirming(true);
    try {
      if (exchange === "binance") {
        await binanceOrder.mutateAsync({
          symbol: futureSym,
          side: direction === "long" ? "BUY" : "SELL",
          quantity: parseFloat(qty),
          leverage: parseInt(leverage),
        });
      } else {
        await okxOrder.mutateAsync({
          symbol: futureSym,
          side: direction === "long" ? "buy" : "sell",
          quantity: parseFloat(qty),
          leverage: parseInt(leverage),
        });
      }
      toast.success(`${futureSym} ${direction === "long" ? "做多" : "做空"} 下单成功！`);
      onClose();
    } catch (e: any) {
      toast.error(`下单失败：${e?.message ?? "未知错误"}`);
    } finally {
      setConfirming(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Rocket className="w-5 h-5 text-green-400" />
            一键下单 — {futureSym}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {/* 方向提示 */}
          <div className={`rounded-lg p-3 text-sm font-semibold text-center ${
            direction === "long" ? "bg-green-500/15 text-green-400 border border-green-500/30"
              : "bg-red-500/15 text-red-400 border border-red-500/30"
          }`}>
            {direction === "long" ? "▲ 做多（共振评分 ≥ 75）" : "▼ 做空（共振评分 ≤ 35）"}
          </div>
          {/* 交易所 */}
          <div className="space-y-1.5">
            <Label className="text-xs">交易所</Label>
            <Select value={exchange} onValueChange={v => setExchange(v as "binance" | "okx")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="binance">币安合约</SelectItem>
                <SelectItem value="okx">欧易合约</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {/* 数量 */}
          <div className="space-y-1.5">
            <Label className="text-xs">数量（USDT 价值）</Label>
            <Input value={qty} onChange={e => setQty(e.target.value)} placeholder="10" type="number" min="1" />
          </div>
          {/* 杠杆 */}
          <div className="space-y-1.5">
            <Label className="text-xs">杠杆倍数</Label>
            <Select value={leverage} onValueChange={setLeverage}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {[1,2,3,5,10,20,50].map(l => (
                  <SelectItem key={l} value={String(l)}>{l}x</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {/* 预估保证金 */}
          <div className="rounded-lg border border-border/50 p-3 text-xs space-y-1">
            <div className="flex justify-between"><span className="text-muted-foreground">当前价格</span><span>${currentPrice.toLocaleString()}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">下单数量</span><span>{qty} USDT</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">杠杆</span><span>{leverage}x</span></div>
            <div className="flex justify-between font-semibold"><span className="text-muted-foreground">预估保证金</span><span className="text-yellow-400">${estMargin}</span></div>
          </div>
          <p className="text-xs text-muted-foreground">⚠️ 请确保已在「实盘控制台」配置好 API Key，并开启实盘模式。</p>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>取消</Button>
          <Button
            size="sm"
            className={direction === "long" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"}
            onClick={handleConfirm}
            disabled={confirming}
          >
            {confirming ? <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1" /> : <Rocket className="w-3.5 h-3.5 mr-1" />}
            确认下单
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ResonanceCard({ aiItem, fearGreedValue }: { aiItem: any; fearGreedValue: number }) {
  const symbol = aiItem?.symbol ?? aiItem?.tokenSymbol ?? "BTC";
  const [orderOpen, setOrderOpen] = useState(false);
  const { data: whaleCostData } = trpc.vsData.whaleCost.useQuery({ symbol }, { refetchInterval: 120000 });
  const { data: capitalFlowData } = trpc.vsData.capitalFlow.useQuery({ symbol, period: "1h" }, { refetchInterval: 60000 });
  const { data: priceData } = trpc.market.price.useQuery({ symbol }, { refetchInterval: 30000 });
  // OKX 多空比 + 技术面数据（仅对 BTC/ETH/SOL/BNB 有效）
  const btcSymbol = ["BTC", "ETH", "SOL", "BNB", "XRP"].includes(symbol) ? `${symbol}USDT` : "BTCUSDT";
  const { data: bullBearData } = trpc.freeData.bullBearScore.useQuery(
    { symbol: btcSymbol },
    { refetchInterval: 120000, enabled: ["BTC", "ETH", "SOL", "BNB", "XRP"].includes(symbol) }
  );

  const score = useMemo(() => {
    const raw = (bullBearData as any)?.rawData;
    const okxLSData = raw?.longShortRatio ? {
      longShortRatio: raw.longShortRatio,
      longPct: raw.longPct ?? 50,
      shortPct: raw.shortPct ?? 50,
      takerBuySellRatio: raw.takerBuySellRatio ?? 1,
    } : null;
    const technicalData = raw?.technical ? {
      rsi: raw.technical.rsi ?? 50,
      macdSignal: raw.technical.macdSignal ?? "neutral",
      bbSignal: raw.technical.bbSignal ?? "neutral",
      emaTrend: raw.technical.emaTrend ?? "neutral",
    } : null;
    return calcResonanceScore({
      aiItem,
      whaleCostData: whaleCostData?.data,
      capitalFlowData: capitalFlowData?.data,
      fearGreedValue,
      currentPrice: priceData?.price ?? 0,
      okxLSData,
      technicalData,
    });
  }, [aiItem, whaleCostData, capitalFlowData, fearGreedValue, priceData, bullBearData]);

  const recColors: Record<string, string> = {
    "强烈做多": "text-green-400 border-green-400/50 bg-green-400/10",
    "做多": "text-green-300 border-green-300/30 bg-green-300/5",
    "观望": "text-yellow-400 border-yellow-400/30 bg-yellow-400/5",
    "做空": "text-red-300 border-red-300/30 bg-red-300/5",
    "强烈做空": "text-red-400 border-red-400/50 bg-red-400/10",
  };

  return (
    <Card className={`border-border/50 ${score.totalScore >= 75 ? "border-green-500/40 shadow-green-500/10 shadow-md" : ""}`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            {aiItem.icon && (
              <img src={aiItem.icon} alt={symbol} className="w-5 h-5 rounded-full" onError={e => (e.currentTarget.style.display = "none")} />
            )}
            <span className="font-bold text-foreground">{symbol}</span>
          </div>
          <Badge variant="outline" className={`text-xs ${recColors[score.recommendation] ?? ""}`}>
            {score.recommendation}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* 总分 */}
        <div className="flex items-center gap-3">
          <div className={`text-3xl font-black ${score.totalScore >= 75 ? "text-green-400" : score.totalScore >= 55 ? "text-yellow-400" : "text-red-400"}`}>
            {score.totalScore}
          </div>
          <div className="flex-1">
            <Progress value={score.confidence} className="h-2" />
            <div className="text-xs text-muted-foreground mt-0.5">综合胜率评分 / 100</div>
          </div>
        </div>

        {/* 分项评分 */}
        <div className="space-y-1.5">
          <ScoreBar label="AI 信号质量" value={score.aiScore} max={25} color="text-yellow-400" />
          <ScoreBar label="主力成本偏离" value={score.costScore} max={20} color="text-blue-400" />
          <ScoreBar label="资金流方向" value={score.flowScore} max={20} color="text-green-400" />
          <ScoreBar label="OKX多空比" value={score.lsScore} max={15} color="text-cyan-400" />
          <ScoreBar label="技术面" value={score.techScore} max={10} color="text-orange-400" />
          <ScoreBar label="市场情绪" value={score.sentimentScore} max={5} color="text-purple-400" />
          <ScoreBar label="看涨情绪" value={score.bullishScore} max={5} color="text-pink-400" />
        </div>

        {/* 正面信号 */}
        {score.signals.length > 0 && (
          <div className="space-y-1">
            {score.signals.slice(0, 3).map((s, i) => (
              <div key={i} className="flex items-start gap-1.5 text-xs text-green-400">
                <CheckCircle2 className="w-3 h-3 mt-0.5 shrink-0" />
                <span>{s}</span>
              </div>
            ))}
          </div>
        )}

        {/* 警告 */}
        {score.warnings.length > 0 && (
          <div className="space-y-1">
            {score.warnings.map((w, i) => (
              <div key={i} className="flex items-start gap-1.5 text-xs text-orange-400">
                <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
                <span>{w}</span>
              </div>
            ))}
          </div>
        )}
        {/* 一键下单按钮（评分 ≥ 75 或 ≤ 35 时显示） */}
        {(score.totalScore >= 75 || score.totalScore <= 35) && (
          <Button
            size="sm"
            className={`w-full text-xs font-semibold ${
              score.totalScore >= 75
                ? "bg-green-600 hover:bg-green-700 text-white"
                : "bg-red-600 hover:bg-red-700 text-white"
            }`}
            onClick={() => setOrderOpen(true)}
          >
            <Rocket className="w-3.5 h-3.5 mr-1.5" />
            {score.totalScore >= 75 ? "⚡ 一键做多" : "⚡ 一键做空"}
            <span className="ml-1 opacity-70">({score.totalScore}分)</span>
          </Button>
        )}
        {/* Dialog 始终挂载，避免条件渲染导致 Portal DOM removeChild 错误 */}
        <QuickOrderDialog
          open={orderOpen}
          onClose={() => setOrderOpen(false)}
          symbol={symbol}
          direction={score.direction === "short" ? "short" : "long"}
          currentPrice={priceData?.price ?? 0}
        />
      </CardContent>
    </Card>
  );
}

export default function SignalResonance() {
  const [refreshKey, setRefreshKey] = useState(0);

  const { data: aiData, isLoading: aiLoading, refetch } = trpc.vsData.aiLongShort.useQuery(
    { type: "long" },
    { refetchInterval: 60000 }
  );
  const { data: fearGreed } = trpc.valueScan.fearGreed.useQuery(undefined, { refetchInterval: 300000 });

  const aiItems: any[] = useMemo(() => {
    if (!aiData?.success || !aiData.data) return [];
    const items = Array.isArray(aiData.data) ? aiData.data : [];
    // 只取前8个，优先 Alpha/FOMO 标记的
    return items
      .sort((a: any, b: any) => {
        // 优先 alpha/fomo 标记的代币
        const aScore = ((a as any).alpha ? 2 : 0) + ((a as any).fomo ? 1 : 0) + ((a as any).keyword === 1 ? 2 : 0) + ((a as any).keyword === 2 ? 1 : 0);
        const bScore = ((b as any).alpha ? 2 : 0) + ((b as any).fomo ? 1 : 0) + ((b as any).keyword === 1 ? 2 : 0) + ((b as any).keyword === 2 ? 1 : 0);
        return bScore - aScore;
      })
      .slice(0, 8);
  }, [aiData]);

  const fearGreedValue = fearGreed?.value ?? 50;

  return (
    <div className="p-4 md:p-6 space-y-5">
      {/* 页头 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Flame className="w-6 h-6 text-orange-400" />
            信号共振增强引擎
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            综合 AI 多空 + 主力成本 + 资金流 → 多维度胜率评分，找出最佳入场时机
          </p>
        </div>
        <div className="flex items-center gap-2">
          {fearGreed?.success && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm"
              style={{ borderColor: fearGreed.color + "50", background: fearGreed.color + "15" }}>
              <span style={{ color: fearGreed.color }} className="font-bold">{fearGreed.value}</span>
              <span className="text-muted-foreground">{fearGreed.label}</span>
            </div>
          )}
          <Button variant="outline" size="sm" onClick={() => { refetch(); setRefreshKey(k => k + 1); }} disabled={aiLoading}>
            <RefreshCw className={`w-4 h-4 mr-1.5 ${aiLoading ? "animate-spin" : ""}`} />
            刷新
          </Button>
        </div>
      </div>

      {/* 评分说明 */}
      <Alert className="border-orange-500/30 bg-orange-500/5">
        <Flame className="w-4 h-4 text-orange-400" />
        <AlertDescription className="text-sm text-muted-foreground">
          <strong className="text-foreground">综合胜率评分</strong>：满分 100 分。
          <span className="text-green-400"> ≥75 分</span> = 强烈做多信号，多维度共振，历史胜率最高。
          <span className="text-yellow-400"> 55~74 分</span> = 做多信号，可以入场但需设好止损。
          <span className="text-red-400"> &lt;35 分</span> = 建议观望或做空。
        </AlertDescription>
      </Alert>

      {/* 评分维度说明 */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {[
          { label: "AI 信号质量", max: 30, color: "text-yellow-400", desc: "Alpha/FOMO 标记" },
          { label: "主力成本偏离", max: 25, color: "text-blue-400", desc: "价格 vs 主力成本" },
          { label: "资金流方向", max: 25, color: "text-green-400", desc: "现货+合约净流入" },
          { label: "市场情绪", max: 10, color: "text-purple-400", desc: "恐惧贪婪指数" },
          { label: "看涨情绪", max: 10, color: "text-pink-400", desc: "多头情绪百分比" },
        ].map(item => (
          <div key={item.label} className="rounded-lg border border-border/50 p-2.5 text-center">
            <div className={`text-lg font-bold ${item.color}`}>{item.max}分</div>
            <div className="text-xs font-medium text-foreground">{item.label}</div>
            <div className="text-xs text-muted-foreground">{item.desc}</div>
          </div>
        ))}
      </div>

      {/* 共振评分卡片 */}
      {aiLoading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <RefreshCw className="w-5 h-5 animate-spin mr-2" />
          正在加载 AI 信号并计算共振评分...
        </div>
      ) : !aiData?.success ? (
        <div className="text-center py-16 space-y-2">
          <AlertTriangle className="w-8 h-8 text-yellow-400 mx-auto" />
          <p className="text-muted-foreground text-sm">{aiData?.error || "获取 AI 信号失败，请检查 ValueScan 账号配置"}</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>重试</Button>
        </div>
      ) : aiItems.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Zap className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p>暂无 AI 信号，无法计算共振评分</p>
          <p className="text-xs mt-1 flex items-center justify-center gap-1">
            <Clock className="w-3 h-3" />每分钟自动刷新
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {aiItems.map((item: any, idx: number) => (
            <ResonanceCard key={item.id ?? idx} aiItem={item} fearGreedValue={fearGreedValue} />
          ))}
        </div>
      )}

      {/* 最高胜率策略总结 */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Star className="w-4 h-4 text-yellow-400" />
            最高胜率入场策略（基于 noelsonr ValueScan 教程）
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm">
            <div className="space-y-3">
              <div className="font-semibold text-green-400 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                完美做多条件（共振评分 ≥ 75）
              </div>
              <div className="space-y-2 text-xs text-muted-foreground">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-400 mt-0.5 shrink-0" />
                  <span>AI 多空信号面板出现 Alpha ⚡ 或 FOMO 🔥 标记（最好双重）</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-400 mt-0.5 shrink-0" />
                  <span>当前价格低于主力成本（偏离度为负），主力有拉盘动力</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-400 mt-0.5 shrink-0" />
                  <span>资金流仪表盘显示现货+合约双向净流入</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-400 mt-0.5 shrink-0" />
                  <span>恐惧贪婪指数在 25~75 之间（避免极端情绪）</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-400 mt-0.5 shrink-0" />
                  <span>K 线图表技术面确认（支撑位 + RSI 超卖 + MACD 金叉）</span>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <div className="font-semibold text-red-400 flex items-center gap-2">
                <TrendingDown className="w-4 h-4" />
                高风险警示（避免入场）
              </div>
              <div className="space-y-2 text-xs text-muted-foreground">
                <div className="flex items-start gap-2">
                  <XCircle className="w-3.5 h-3.5 text-red-400 mt-0.5 shrink-0" />
                  <span>AI 分数 &gt; 80（过热），代币可能即将出现大幅回调</span>
                </div>
                <div className="flex items-start gap-2">
                  <XCircle className="w-3.5 h-3.5 text-red-400 mt-0.5 shrink-0" />
                  <span>当前价格高于主力成本 20% 以上，主力浮盈大，随时可能出货</span>
                </div>
                <div className="flex items-start gap-2">
                  <XCircle className="w-3.5 h-3.5 text-red-400 mt-0.5 shrink-0" />
                  <span>资金流历史连续多期为负，主力持续撤离</span>
                </div>
                <div className="flex items-start gap-2">
                  <XCircle className="w-3.5 h-3.5 text-red-400 mt-0.5 shrink-0" />
                  <span>恐惧贪婪指数 &gt; 80（极度贪婪），市场泡沫风险高</span>
                </div>
                <div className="flex items-start gap-2">
                  <XCircle className="w-3.5 h-3.5 text-red-400 mt-0.5 shrink-0" />
                  <span>看涨情绪 &lt; 45%，多头力量不足</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
