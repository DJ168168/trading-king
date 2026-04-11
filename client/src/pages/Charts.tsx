import { useEffect, useMemo, useRef, useState } from "react";
import { Activity, AlertCircle, BarChart2, Layers, RefreshCw, Wifi, WifiOff } from "lucide-react";
import TradingViewChart, { TradingViewMarketOverview, TradingViewTicker } from "@/components/TradingViewChart";
import LightweightChart from "@/components/LightweightChart";
import EmptyState from "@/components/EmptyState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";

const SYMBOLS = [
  { value: "BINANCE:BTCUSDT.P", label: "BTC/USDT 永续", short: "BTC" },
  { value: "BINANCE:ETHUSDT.P", label: "ETH/USDT 永续", short: "ETH" },
  { value: "BINANCE:SOLUSDT.P", label: "SOL/USDT 永续", short: "SOL" },
  { value: "BINANCE:BNBUSDT.P", label: "BNB/USDT 永续", short: "BNB" },
  { value: "BINANCE:XRPUSDT.P", label: "XRP/USDT 永续", short: "XRP" },
  { value: "BINANCE:DOGEUSDT.P", label: "DOGE/USDT 永续", short: "DOGE" },
  { value: "BINANCE:ADAUSDT.P", label: "ADA/USDT 永续", short: "ADA" },
  { value: "BINANCE:AVAXUSDT.P", label: "AVAX/USDT 永续", short: "AVAX" },
  { value: "BINANCE:LINKUSDT.P", label: "LINK/USDT 永续", short: "LINK" },
  { value: "BINANCE:DOTUSDT.P", label: "DOT/USDT 永续", short: "DOT" },
];

const INTERVALS = [
  { value: "1", label: "1分钟" },
  { value: "5", label: "5分钟" },
  { value: "15", label: "15分钟" },
  { value: "30", label: "30分钟" },
  { value: "60", label: "1小时" },
  { value: "240", label: "4小时" },
  { value: "D", label: "日线" },
  { value: "W", label: "周线" },
];

const INDICATOR_PRESETS = [
  {
    id: "valuescan",
    name: "ValueScan 推荐",
    desc: "Supertrend + MACD + RSI（官方推荐组合）",
    studies: ["STD;Supertrend", "STD;MACD", "STD;RSI"],
    color: "text-primary",
    detail: "适合监控趋势确认与情绪回撤。Supertrend 提供方向过滤，MACD 与 RSI 负责寻找动能衰减与再启动点。",
  },
  {
    id: "trend",
    name: "趋势追踪",
    desc: "EMA 20/50/200 + Supertrend",
    studies: ["STD;EMA", "STD;Supertrend", "STD;Bollinger_Bands"],
    color: "text-profit",
    detail: "用于跟踪主升或主跌结构，适合与 Alpha 信号叠加，减少逆势入场。",
  },
  {
    id: "momentum",
    name: "动量策略",
    desc: "RSI + MACD + Stochastic",
    studies: ["STD;RSI", "STD;MACD", "STD;Stochastic"],
    color: "text-yellow-400",
    detail: "更适合观察短线脉冲与均值回归区间，在 FOMO 爆量时能帮助识别追涨风险。",
  },
  {
    id: "volume",
    name: "量价分析",
    desc: "Volume Profile + OBV + VWAP",
    studies: ["STD;Volume", "STD;OBV", "STD;VWAP"],
    color: "text-cyan-400",
    detail: "重点判断资金堆积区与平均成交价格，适合研判主力是否在高位派发或低位吸筹。",
  },
  {
    id: "volatility",
    name: "波动率策略",
    desc: "Bollinger Bands + ATR + Keltner",
    studies: ["STD;Bollinger_Bands", "STD;Average_True_Range", "STD;Keltner_Channels"],
    color: "text-orange-400",
    detail: "用于识别收敛后的扩张阶段，对突破前后设置止损与分批止盈尤其有效。",
  },
];

function MarketSkeleton({ height = 160 }: { height?: number }) {
  return (
    <div className="space-y-3">
      <Skeleton className="h-4 w-28 bg-primary/10" />
      <Skeleton className="w-full rounded-2xl bg-primary/10" style={{ height }} />
      <div className="grid grid-cols-2 gap-2">
        <Skeleton className="h-10 rounded-xl bg-primary/10" />
        <Skeleton className="h-10 rounded-xl bg-primary/10" />
      </div>
    </div>
  );
}

export default function Charts() {
  const [symbol, setSymbol] = useState("BINANCE:BTCUSDT.P");
  const [interval, setInterval] = useState("60");
  const [selectedPreset, setSelectedPreset] = useState("valuescan");
  const [showSignals, setShowSignals] = useState(true);
  const [tab, setTab] = useState("advanced");
  const [chartMode, setChartMode] = useState<"tradingview" | "lightweight">("tradingview");
  const [chartLoading, setChartLoading] = useState(true);

  const [wsPrice, setWsPrice] = useState<number | null>(null);
  const [wsPriceChange, setWsPriceChange] = useState<number>(0);
  const [wsConnected, setWsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  const symbolShort = SYMBOLS.find((s) => s.value === symbol)?.short ?? "BTC";
  const currentPreset = INDICATOR_PRESETS.find((p) => p.id === selectedPreset) ?? INDICATOR_PRESETS[0];

  useEffect(() => {
    setChartLoading(true);
    const timer = setTimeout(() => setChartLoading(false), 700);
    return () => clearTimeout(timer);
  }, [symbol, interval, tab, chartMode, selectedPreset]);

  useEffect(() => {
    const sym = symbolShort.toLowerCase() + "usdt";
    const url = `wss://fstream.binance.com/ws/${sym}@miniTicker`;
    let ws: WebSocket;
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined;

    const connect = () => {
      try {
        ws = new WebSocket(url);
        wsRef.current = ws;

        ws.onopen = () => setWsConnected(true);
        ws.onmessage = (e) => {
          try {
            const d = JSON.parse(e.data);
            if (d.c) {
              const price = parseFloat(d.c);
              const open = parseFloat(d.o);
              setWsPrice(price);
              setWsPriceChange(open > 0 ? ((price - open) / open) * 100 : 0);
            }
          } catch {}
        };
        ws.onerror = () => setWsConnected(false);
        ws.onclose = () => {
          setWsConnected(false);
          reconnectTimer = setTimeout(connect, 5000);
        };
      } catch {
        setWsConnected(false);
      }
    };

    connect();
    return () => {
      if (reconnectTimer) clearTimeout(reconnectTimer);
      wsRef.current?.close();
      wsRef.current = null;
      setWsConnected(false);
    };
  }, [symbolShort]);

  const tickerQuery = trpc.market.ticker24h.useQuery({ symbol: symbolShort }, { refetchInterval: 30000 });
  const vsSignalsQuery = trpc.valueScan.warnMessages.useQuery({ pageNum: 1, pageSize: 20 }, { refetchInterval: 30000, enabled: showSignals });

  const symbolSignals = useMemo(() => {
    const sym = symbolShort.toUpperCase();
    const SIGNAL_NAMES_CH: Record<number, string> = {
      1: "FOMO多",
      2: "FOMO空",
      3: "Alpha多",
      4: "Alpha空",
      5: "风险多",
      6: "风险空",
      7: "鲸买",
      8: "鲸卖",
      9: "流入",
      10: "流出",
      11: "资金入",
      12: "资金出",
      13: "转账",
    };

    return (vsSignalsQuery.data?.data ?? [])
      .map((s: any) => {
        let content: any = {};
        try {
          content = typeof s.content === "string" ? JSON.parse(s.content) : (s.content ?? {});
        } catch {}
        const fmType = content.fundsMovementType || 0;
        const direction = fmType % 2 === 1 ? "long" : fmType % 2 === 0 && fmType > 0 ? "short" : "neutral";
        return {
          id: s.id,
          signalName: SIGNAL_NAMES_CH[fmType] || s.title || "VS",
          direction,
          createTime: s.createTime || 0,
          price: content.price || 0,
          keyword: s.keyword || 0,
          symbol: content.symbol || "",
        };
      })
      .filter((s: any) => s.symbol.toUpperCase() === sym && s.price > 0)
      .slice(0, 5);
  }, [vsSignalsQuery.data, symbolShort]);

  const ticker = tickerQuery.data;
  const displayPrice = wsPrice ?? ticker?.price ?? 0;
  const displayChange = wsPrice !== null ? wsPriceChange : (ticker?.priceChangePercent ?? 0);
  const isPositive = displayChange >= 0;
  const priceLoading = tickerQuery.isLoading && wsPrice === null;

  return (
    <div className="space-y-4 p-4 md:p-6">
      <TradingViewTicker />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold text-foreground">
            <BarChart2 className="h-5 w-5 text-primary" />K 线图表中心
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">专业行情图表、实时价格通道与 ValueScan 预警联动监控。</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className={cn("flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs", wsConnected ? "border-profit/30 bg-profit/5 text-profit" : "border-border bg-background/50 text-muted-foreground")}>
            {wsConnected ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
            {wsConnected ? "实时" : "轮询"}
          </div>

          <Select value={symbol} onValueChange={setSymbol}>
            <SelectTrigger className="w-40 border-border bg-card text-foreground"><SelectValue /></SelectTrigger>
            <SelectContent>
              {SYMBOLS.map((s) => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={interval} onValueChange={setInterval}>
            <SelectTrigger className="w-24 border-border bg-card text-foreground"><SelectValue /></SelectTrigger>
            <SelectContent>
              {INTERVALS.map((i) => (
                <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex items-center gap-2">
            <Switch id="show-signals" checked={showSignals} onCheckedChange={setShowSignals} />
            <Label htmlFor="show-signals" className="cursor-pointer text-sm text-muted-foreground">信号</Label>
          </div>

          <Button variant="outline" size="icon" onClick={() => tickerQuery.refetch()} className="h-9 w-9 border-border">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          {
            label: "最新价格",
            value: displayPrice > 0 ? `$${displayPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}` : "--",
            helper: wsConnected ? "WebSocket 实时推送" : "接口轮询兜底",
          },
          {
            label: "24h 涨跌",
            value: `${isPositive ? "+" : ""}${displayChange.toFixed(2)}%`,
            helper: isPositive ? "短线趋势偏强" : "注意回撤与假突破",
            tone: isPositive ? "text-profit" : "text-loss",
          },
          {
            label: "24h 最高",
            value: ticker?.high ? `$${ticker.high.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}` : "--",
            helper: "用于观察高点突破",
          },
          {
            label: "24h 最低",
            value: ticker?.low ? `$${ticker.low.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}` : "--",
            helper: "用于观察支撑与踩踏区",
          },
        ].map((card) => (
          <Card key={card.label} className="border-border bg-card">
            <CardContent className="p-3">
              {priceLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-3 w-16 bg-primary/10" />
                  <Skeleton className="h-6 w-24 bg-primary/10" />
                  <Skeleton className="h-3 w-20 bg-primary/10" />
                </div>
              ) : (
                <>
                  <p className="flex items-center gap-1 text-xs text-muted-foreground">
                    {card.label}
                    {card.label === "最新价格" && wsConnected && <span className="signal-live inline-block h-1.5 w-1.5 rounded-full bg-profit" />}
                  </p>
                  <p className={cn("text-lg font-bold font-mono text-foreground", card.tone)}>{card.value}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">{card.helper}</p>
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-4">
        <div className="space-y-4 xl:col-span-3">
          <Tabs value={tab} onValueChange={setTab}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <TabsList className="border border-border bg-card">
                <TabsTrigger value="advanced">图表</TabsTrigger>
                <TabsTrigger value="overview">市场概览</TabsTrigger>
              </TabsList>

              {tab === "advanced" && (
                <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-1">
                  <button
                    onClick={() => setChartMode("tradingview")}
                    className={cn("rounded-md px-3 py-1 text-xs transition-all", chartMode === "tradingview" ? "bg-primary font-medium text-primary-foreground" : "text-muted-foreground hover:text-foreground")}
                  >
                    TradingView
                  </button>
                  <button
                    onClick={() => setChartMode("lightweight")}
                    className={cn("rounded-md px-3 py-1 text-xs transition-all", chartMode === "lightweight" ? "bg-primary font-medium text-primary-foreground" : "text-muted-foreground hover:text-foreground")}
                  >
                    精确 K 线
                  </button>
                </div>
              )}
            </div>

            <TabsContent value="advanced" className="mt-3">
              {chartLoading ? (
                <div className="gradient-card rounded-2xl p-4">
                  <MarketSkeleton height={580} />
                </div>
              ) : chartMode === "tradingview" ? (
                <Card className="overflow-hidden border-border bg-card">
                  <TradingViewChart
                    symbol={symbol}
                    interval={interval}
                    theme="dark"
                    height={580}
                    studies={currentPreset.studies}
                    showToolbar={true}
                    showSideToolbar={true}
                    allowSymbolChange={true}
                  />
                </Card>
              ) : (
                <LightweightChart symbol={symbolShort + "USDT"} interval={interval} height={580} showSignals={showSignals} />
              )}
            </TabsContent>

            <TabsContent value="overview" className="mt-3">
              {chartLoading ? (
                <div className="gradient-card rounded-2xl p-4">
                  <MarketSkeleton height={580} />
                </div>
              ) : (
                <Card className="overflow-hidden border-border bg-card">
                  <TradingViewMarketOverview colorTheme="dark" height={580} />
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>

        <div className="space-y-4">
          <Card className="border-border bg-card">
            <CardHeader className="px-4 pb-2 pt-4">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Layers className="h-4 w-4 text-primary" />指标预设
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 px-4 pb-4">
              {INDICATOR_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => setSelectedPreset(preset.id)}
                  className={cn("w-full rounded-lg border p-2.5 text-left transition-all", selectedPreset === preset.id ? "border-primary bg-primary/10" : "border-border bg-background/50 hover:border-primary/50")}
                >
                  <div className={cn("text-xs font-semibold", preset.color)}>{preset.name}</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">{preset.desc}</div>
                </button>
              ))}
              <div className="rounded-xl border border-primary/15 bg-primary/5 p-3 text-[11px] leading-5 text-muted-foreground">
                <span className="font-medium text-foreground">当前预设说明：</span>{currentPreset.detail}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardHeader className="px-4 pb-2 pt-4">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Activity className="h-4 w-4 text-primary" />{symbolShort} 最新信号
                {showSignals && <Badge variant="outline" className="ml-auto border-primary/30 text-xs text-primary">实时</Badge>}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              {!showSignals ? (
                <p className="py-4 text-center text-xs text-muted-foreground">信号标注已关闭</p>
              ) : vsSignalsQuery.isLoading ? (
                <MarketSkeleton height={120} />
              ) : symbolSignals.length === 0 ? (
                <EmptyState
                  icon={<AlertCircle className="h-8 w-8" />}
                  title={`暂无 ${symbolShort} 信号`}
                  description="当前标的还没有最新的 ValueScan 资金异动记录。你可以切换到更活跃标的，或等待实时流继续回传。"
                  hint="FOMO 侧重情绪脉冲，Alpha 侧重方向确认。两者都为空时，通常意味着当前标的尚未进入高波动窗口。"
                  className="py-8"
                />
              ) : (
                <div className="space-y-2">
                  {symbolSignals.map((sig: any) => (
                    <div
                      key={sig.id ?? `${sig.symbol}-${String(sig.createTime)}`}
                      className={cn(
                        "rounded-lg border p-2 text-xs",
                        sig.direction === "long" ? "border-profit/30 bg-profit/5" : sig.direction === "short" ? "border-loss/30 bg-loss/5" : "border-border bg-background/50",
                      )}
                    >
                      <div className="mb-1 flex items-center justify-between">
                        <span className={cn("font-semibold", sig.direction === "long" ? "text-profit" : sig.direction === "short" ? "text-loss" : "text-muted-foreground")}>
                          {sig.direction === "long" ? "▲" : sig.direction === "short" ? "▼" : "●"} {sig.signalName}
                        </span>
                        <span className="text-muted-foreground">{new Date(sig.createTime).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}</span>
                      </div>
                      {sig.price > 0 && (
                        <div className="text-muted-foreground">价格: <span className="font-mono text-foreground">${sig.price.toLocaleString()}</span></div>
                      )}
                      {sig.keyword > 0 && (
                        <div className="mt-1 flex items-center gap-1">
                          <span className="text-muted-foreground">风控评分:</span>
                          <span className={cn("font-mono font-semibold", sig.keyword >= 55 ? "text-profit" : sig.keyword >= 45 ? "text-yellow-400" : "text-loss")}>{sig.keyword}</span>
                          {sig.keyword >= 55 && <Badge className="border-profit/30 bg-profit/20 px-1 py-0 text-[10px] text-profit">高胜率</Badge>}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardHeader className="px-4 pb-2 pt-4">
              <CardTitle className="text-sm font-semibold text-foreground">使用指南</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 px-4 pb-4 text-xs text-muted-foreground">
              <div className="rounded-xl border border-primary/15 bg-primary/5 p-3">
                <span className="font-medium text-foreground">FOMO：</span>情绪与成交量共振，适合监控短线追单风险。
              </div>
              <div className="rounded-xl border border-border/60 bg-background/40 p-3">
                <span className="font-medium text-foreground">Alpha：</span>代表方向确认与主导资金一致性，适合与趋势指标叠加使用。
              </div>
              <div className="rounded-xl border border-border/60 bg-background/40 p-3">
                <span className="font-medium text-foreground">风控评分：</span>综合时间窗口、信号质量与异常标签，高分更适合优先执行。
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
