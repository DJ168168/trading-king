import { useState, useMemo, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import TradingViewChart, { TradingViewTicker, TradingViewMarketOverview } from "@/components/TradingViewChart";
import LightweightChart from "@/components/LightweightChart";
import { TrendingUp, TrendingDown, Activity, BarChart2, Layers, RefreshCw, AlertCircle, Wifi, WifiOff } from "lucide-react";
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

// 指标预设组合
const INDICATOR_PRESETS = [
  {
    id: "valuescan",
    name: "ValueScan 推荐",
    desc: "Supertrend + MACD + RSI（官方推荐组合）",
    studies: ["STD;Supertrend", "STD;MACD", "STD;RSI"],
    color: "text-primary",
  },
  {
    id: "trend",
    name: "趋势追踪",
    desc: "EMA 20/50/200 + Supertrend",
    studies: ["STD;EMA", "STD;Supertrend", "STD;Bollinger_Bands"],
    color: "text-profit",
  },
  {
    id: "momentum",
    name: "动量策略",
    desc: "RSI + MACD + Stochastic",
    studies: ["STD;RSI", "STD;MACD", "STD;Stochastic"],
    color: "text-yellow-400",
  },
  {
    id: "volume",
    name: "量价分析",
    desc: "Volume Profile + OBV + VWAP",
    studies: ["STD;Volume", "STD;OBV", "STD;VWAP"],
    color: "text-cyan-400",
  },
  {
    id: "volatility",
    name: "波动率策略",
    desc: "Bollinger Bands + ATR + Keltner",
    studies: ["STD;Bollinger_Bands", "STD;Average_True_Range", "STD;Keltner_Channels"],
    color: "text-orange-400",
  },
];

export default function Charts() {
  const [symbol, setSymbol] = useState("BINANCE:BTCUSDT.P");
  const [interval, setInterval] = useState("60");
  const [selectedPreset, setSelectedPreset] = useState("valuescan");
  const [showSignals, setShowSignals] = useState(true);
  const [tab, setTab] = useState("advanced");
  const [chartMode, setChartMode] = useState<"tradingview" | "lightweight">("tradingview");

  // WebSocket 实时价格
  const [wsPrice, setWsPrice] = useState<number | null>(null);
  const [wsPriceChange, setWsPriceChange] = useState<number>(0);
  const [wsConnected, setWsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  const symbolShort = SYMBOLS.find(s => s.value === symbol)?.short ?? "BTC";

  // WebSocket 实时价格推送（Binance 公共流）
  useEffect(() => {
    const sym = symbolShort.toLowerCase() + "usdt";
    const url = `wss://fstream.binance.com/ws/${sym}@miniTicker`;
    let ws: WebSocket;
    let reconnectTimer: ReturnType<typeof setTimeout>;

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
          } catch (_) {}
        };

        ws.onerror = () => setWsConnected(false);
        ws.onclose = () => {
          setWsConnected(false);
          reconnectTimer = setTimeout(connect, 5000);
        };
      } catch (_) {
        setWsConnected(false);
      }
    };

    connect();
    return () => {
      clearTimeout(reconnectTimer);
      wsRef.current?.close();
      wsRef.current = null;
      setWsConnected(false);
    };
  }, [symbolShort]);

  const currentPreset = INDICATOR_PRESETS.find(p => p.id === selectedPreset) ?? INDICATOR_PRESETS[0];

  // 获取当前价格（轮询备用）
  const { data: ticker, refetch: refetchTicker } = trpc.market.ticker24h.useQuery(
    { symbol: symbolShort },
    { refetchInterval: 30000 }
  );

  // 获取最近信号（用于标注）
  const { data: signals } = trpc.signals.list.useQuery(
    { limit: 20 },
    { refetchInterval: 15000, enabled: showSignals }
  );

  // 获取 ValueScan 信号（真实数据）
  const { data: vsSignals } = trpc.valueScan.warnMessages.useQuery(
    { pageNum: 1, pageSize: 20 },
    { refetchInterval: 30000, enabled: showSignals }
  );

  // 过滤当前标的的信号（warnMessages 返回原始格式，解析 content 字段）
  const symbolSignals = useMemo(() => {
    const sym = symbolShort.toUpperCase();
    const SIGNAL_NAMES_CH: Record<number, string> = { 1: "FOMO多", 2: "FOMO空", 3: "Alpha多", 4: "Alpha空", 5: "风险多", 6: "风险空", 7: "鲸买", 8: "鲸卖", 9: "流入", 10: "流出", 11: "资金入", 12: "资金出", 13: "转账" };
    const vsFiltered = (vsSignals?.data ?? [])
      .map((s: any) => {
        let content: any = {};
        try { content = typeof s.content === "string" ? JSON.parse(s.content) : (s.content ?? {}); } catch {}
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
    return vsFiltered;
  }, [vsSignals, symbolShort]);

  // 价格显示：优先 WebSocket 实时价格，备用轮询
  const displayPrice = wsPrice ?? ticker?.price ?? 0;
  const displayChange = wsPrice ? wsPriceChange : (ticker?.priceChangePercent ?? 0);
  const isPositive = displayChange >= 0;

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* 顶部 Ticker 行情 */}
      <TradingViewTicker />

      {/* 页面标题 + 控制栏 */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-primary" />
            K 线图表中心
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            TradingView 专业图表 · lightweight-charts 精确 K 线 · 实时信号标注
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* WebSocket 状态 */}
          <div className={cn(
            "flex items-center gap-1.5 px-2 py-1 rounded-md text-xs border",
            wsConnected
              ? "border-profit/30 bg-profit/5 text-profit"
              : "border-border bg-background/50 text-muted-foreground"
          )}>
            {wsConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
            {wsConnected ? "实时" : "轮询"}
          </div>

          {/* 标的选择 */}
          <Select value={symbol} onValueChange={setSymbol}>
            <SelectTrigger className="w-40 bg-card border-border text-foreground">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SYMBOLS.map(s => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* 周期选择 */}
          <Select value={interval} onValueChange={setInterval}>
            <SelectTrigger className="w-24 bg-card border-border text-foreground">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {INTERVALS.map(i => (
                <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* 信号标注开关 */}
          <div className="flex items-center gap-2">
            <Switch id="show-signals" checked={showSignals} onCheckedChange={setShowSignals} />
            <Label htmlFor="show-signals" className="text-sm text-muted-foreground cursor-pointer">信号</Label>
          </div>

          <Button variant="outline" size="icon" onClick={() => refetchTicker()} className="border-border h-9 w-9">
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* 价格信息卡片 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="bg-card border-border">
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              最新价格
              {wsConnected && <span className="w-1.5 h-1.5 rounded-full bg-profit signal-live inline-block" />}
            </p>
            <p className="text-lg font-bold font-mono text-foreground">
              {displayPrice > 0
                ? `$${displayPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}`
                : "--"}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground">24h 涨跌</p>
            <p className={cn("text-lg font-bold font-mono", isPositive ? "text-profit" : "text-loss")}>
              {isPositive ? "+" : ""}{displayChange.toFixed(2)}%
            </p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground">24h 最高</p>
            <p className="text-sm font-mono text-foreground">
              {ticker?.high
                ? `$${ticker.high.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}`
                : "--"}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground">24h 最低</p>
            <p className="text-sm font-mono text-foreground">
              {ticker?.low
                ? `$${ticker.low.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}`
                : "--"}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
        {/* 主图表区域 */}
        <div className="xl:col-span-3 space-y-4">
          <Tabs value={tab} onValueChange={setTab}>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <TabsList className="bg-card border border-border">
                <TabsTrigger value="advanced">图表</TabsTrigger>
                <TabsTrigger value="overview">市场概览</TabsTrigger>
              </TabsList>

              {/* 图表引擎切换 */}
              {tab === "advanced" && (
                <div className="flex items-center gap-1 bg-card border border-border rounded-lg p-1">
                  <button
                    onClick={() => setChartMode("tradingview")}
                    className={cn(
                      "px-3 py-1 text-xs rounded-md transition-all",
                      chartMode === "tradingview"
                        ? "bg-primary text-primary-foreground font-medium"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    TradingView
                  </button>
                  <button
                    onClick={() => setChartMode("lightweight")}
                    className={cn(
                      "px-3 py-1 text-xs rounded-md transition-all",
                      chartMode === "lightweight"
                        ? "bg-primary text-primary-foreground font-medium"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    精确 K 线
                  </button>
                </div>
              )}
            </div>

            <TabsContent value="advanced" className="mt-3">
              {chartMode === "tradingview" ? (
                <Card className="bg-card border-border overflow-hidden">
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
                <LightweightChart
                  symbol={symbolShort + "USDT"}
                  interval={interval}
                  height={580}
                  showSignals={showSignals}
                />
              )}
            </TabsContent>

            <TabsContent value="overview" className="mt-3">
              <Card className="bg-card border-border overflow-hidden">
                <TradingViewMarketOverview colorTheme="dark" height={580} />
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* 右侧面板 */}
        <div className="space-y-4">
          {/* 指标预设 */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Layers className="w-4 h-4 text-primary" />
                指标预设
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-2">
              {INDICATOR_PRESETS.map(preset => (
                <button
                  key={preset.id}
                  onClick={() => setSelectedPreset(preset.id)}
                  className={cn(
                    "w-full text-left p-2.5 rounded-lg border transition-all",
                    selectedPreset === preset.id
                      ? "border-primary bg-primary/10"
                      : "border-border bg-background/50 hover:border-primary/50"
                  )}
                >
                  <div className={cn("text-xs font-semibold", preset.color)}>{preset.name}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{preset.desc}</div>
                </button>
              ))}
            </CardContent>
          </Card>

          {/* 当前标的 VS 信号 */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Activity className="w-4 h-4 text-primary" />
                {symbolShort} 最新信号
                {showSignals && (
                  <Badge variant="outline" className="ml-auto text-xs border-primary/30 text-primary">
                    实时
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              {!showSignals ? (
                <p className="text-xs text-muted-foreground text-center py-4">信号标注已关闭</p>
              ) : symbolSignals.length === 0 ? (
                <div className="text-center py-4">
                  <AlertCircle className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">暂无 {symbolShort} 信号</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {symbolSignals.map((sig: any) => (
                    <div key={sig.id ?? sig.signalId ?? `${sig.symbol}-${String(sig.createTime)}`} className={cn(
                      "p-2 rounded-lg border text-xs",
                      sig.direction === "long"
                        ? "border-profit/30 bg-profit/5"
                        : sig.direction === "short"
                        ? "border-loss/30 bg-loss/5"
                        : "border-border bg-background/50"
                    )}>
                      <div className="flex items-center justify-between mb-1">
                        <span className={cn(
                          "font-semibold",
                          sig.direction === "long" ? "text-profit" : sig.direction === "short" ? "text-loss" : "text-muted-foreground"
                        )}>
                          {sig.direction === "long" ? "▲" : sig.direction === "short" ? "▼" : "●"} {sig.signalName}
                        </span>
                        <span className="text-muted-foreground">
                          {new Date(sig.createTime).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      {sig.price > 0 && (
                        <div className="text-muted-foreground">
                          价格: <span className="font-mono text-foreground">${sig.price.toLocaleString()}</span>
                        </div>
                      )}
                      {sig.keyword > 0 && (
                        <div className="flex items-center gap-1 mt-1">
                          <span className="text-muted-foreground">AI评分:</span>
                          <span className={cn(
                            "font-mono font-semibold",
                            sig.keyword >= 55 ? "text-profit" : sig.keyword >= 45 ? "text-yellow-400" : "text-loss"
                          )}>
                            {sig.keyword}
                          </span>
                          {sig.keyword >= 55 && <Badge className="text-[10px] px-1 py-0 bg-profit/20 text-profit border-profit/30">高胜率</Badge>}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* 图表使用说明 */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm font-semibold text-foreground">使用指南</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-2 text-xs text-muted-foreground">
              <div className="flex gap-2">
                <span className="text-primary font-bold">①</span>
                <span>选择 <strong className="text-foreground">ValueScan 推荐</strong> 指标组合（Supertrend + MACD + RSI）</span>
              </div>
              <div className="flex gap-2">
                <span className="text-primary font-bold">②</span>
                <span>Supertrend 绿色 = 做多趋势，红色 = 做空趋势</span>
              </div>
              <div className="flex gap-2">
                <span className="text-primary font-bold">③</span>
                <span>RSI &gt; 70 超买，&lt; 30 超卖；结合 MACD 金叉死叉判断入场</span>
              </div>
              <div className="flex gap-2">
                <span className="text-primary font-bold">④</span>
                <span>切换「精确 K 线」模式可查看 lightweight-charts 精确蜡烛图（含 VS 信号标注线）</span>
              </div>
              <div className="flex gap-2">
                <span className="text-primary font-bold">⑤</span>
                <span>顶部「实时」绿点表示 WebSocket 实时价格推送已连接</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
