import { useEffect, useRef, useState } from "react";
import { createChart, IChartApi, ISeriesApi, CandlestickData, Time, ColorType, CrosshairMode, CandlestickSeries, HistogramSeries } from "lightweight-charts";
import { trpc } from "@/lib/trpc";
import { Loader2, RefreshCw, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface LightweightChartProps {
  symbol?: string;
  interval?: string;
  height?: number;
  showSignals?: boolean;
  className?: string;
}

const INTERVAL_MAP: Record<string, string> = {
  "1": "1m", "3": "3m", "5": "5m", "15": "15m", "30": "30m",
  "60": "1h", "120": "2h", "240": "4h", "D": "1d", "W": "1w",
};

export default function LightweightChart({
  symbol = "BTCUSDT",
  interval = "60",
  height = 400,
  showSignals = true,
  className,
}: LightweightChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [crosshairPrice, setCrosshairPrice] = useState<number | null>(null);
  const [crosshairTime, setCrosshairTime] = useState<string | null>(null);

  const intervalLabel = INTERVAL_MAP[interval] ?? interval;

  // 拉取 K 线数据
  const { data: klines, refetch, isFetching } = trpc.market.klines.useQuery(
    { symbol, interval: intervalLabel, limit: 300 },
    { refetchInterval: 30000 }
  );

  // 拉取信号数据（用于标注）
  const { data: vsSignals } = trpc.valueScan.warnMessages.useQuery(
    { pageNum: 1, pageSize: 50 },
    { refetchInterval: 30000, enabled: showSignals }
  );

  // 初始化图表
  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height,
      layout: {
        background: { type: ColorType.Solid, color: "#0a0b0f" },
        textColor: "#6b7280",
        fontFamily: "'Inter', monospace",
        fontSize: 11,
      },
      grid: {
        vertLines: { color: "#1a1d24", style: 1 },
        horzLines: { color: "#1a1d24", style: 1 },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: "#3b82f6", width: 1, style: 2, labelBackgroundColor: "#1e293b" },
        horzLine: { color: "#3b82f6", width: 1, style: 2, labelBackgroundColor: "#1e293b" },
      },
      rightPriceScale: {
        borderColor: "#1e293b",
        textColor: "#6b7280",
        scaleMargins: { top: 0.1, bottom: 0.25 },
      },
      timeScale: {
        borderColor: "#1e293b",
        timeVisible: true,
        secondsVisible: false,
      },
      handleScroll: { mouseWheel: true, pressedMouseMove: true, horzTouchDrag: true },
      handleScale: { axisPressedMouseMove: true, mouseWheel: true, pinch: true },
    });

    // 蜡烛图系列 (v5 API)
    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#22c55e",
      downColor: "#ef4444",
      borderUpColor: "#22c55e",
      borderDownColor: "#ef4444",
      wickUpColor: "#16a34a",
      wickDownColor: "#dc2626",
    });

    // 成交量系列 (v5 API)
    const volumeSeries = chart.addSeries(HistogramSeries, {
      color: "#3b82f6",
      priceFormat: { type: "volume" },
      priceScaleId: "volume",
    });
    chart.priceScale("volume").applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 },
    });

    // 十字线移动事件
    chart.subscribeCrosshairMove((param) => {
      if (param.time && param.seriesData.has(candleSeries)) {
        const data = param.seriesData.get(candleSeries) as CandlestickData;
        if (data) {
          setCrosshairPrice(data.close);
          const d = new Date((param.time as number) * 1000);
          setCrosshairTime(d.toLocaleString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }));
        }
      } else {
        setCrosshairPrice(null);
        setCrosshairTime(null);
      }
    });

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;
    volumeSeriesRef.current = volumeSeries;

    // 响应容器大小变化
    const resizeObserver = new ResizeObserver(() => {
      if (containerRef.current && chartRef.current) {
        chartRef.current.applyOptions({ width: containerRef.current.clientWidth });
      }
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
      volumeSeriesRef.current = null;
    };
  }, [height]);

  // 更新 K 线数据
  useEffect(() => {
    if (!klines || !candleSeriesRef.current || !volumeSeriesRef.current) return;
    setIsLoading(false);

    const candles: CandlestickData[] = (klines as any[])
      .filter((k) => k && k.openTime)
      .map((k) => ({
        time: Math.floor(k.openTime / 1000) as Time,
        open: k.open,
        high: k.high,
        low: k.low,
        close: k.close,
      }))
      .sort((a, b) => (a.time as number) - (b.time as number));

    const volumes = (klines as any[])
      .filter((k) => k && k.openTime)
      .map((k) => ({
        time: Math.floor(k.openTime / 1000) as Time,
        value: k.volume,
        color: k.close >= k.open ? "rgba(34,197,94,0.5)" : "rgba(239,68,68,0.5)",
      }))
      .sort((a, b) => (a.time as number) - (b.time as number));

    if (candles.length > 0) {
      candleSeriesRef.current.setData(candles);
      volumeSeriesRef.current.setData(volumes);
      chartRef.current?.timeScale().fitContent();
    }
  }, [klines]);

  // 添加信号标注线
  useEffect(() => {
    if (!vsSignals?.data || !candleSeriesRef.current || !chartRef.current) return;
    const sym = symbol.replace("USDT", "").toUpperCase();
    // warnMessages 返回原始信号格式，需解析 content 字段
    const filtered = (vsSignals.data as any[])
      .map((s: any) => {
        let content: any = {};
        try { content = typeof s.content === "string" ? JSON.parse(s.content) : (s.content ?? {}); } catch {}
        const fmType = content.fundsMovementType || 0;
        const SIGNAL_NAMES: Record<number, string> = {
          1: "FOMO多", 2: "FOMO空", 3: "Alpha多", 4: "Alpha空",
          5: "风险多", 6: "风险空", 7: "鲸买", 8: "鲸卖",
          9: "流入", 10: "流出", 11: "资金入", 12: "资金出", 13: "转账",
        };
        const direction = fmType % 2 === 1 ? "long" : fmType % 2 === 0 && fmType > 0 ? "short" : "neutral";
        return {
          symbol: content.symbol || "",
          price: content.price || 0,
          createTime: s.createTime || 0,
          direction,
          signalName: SIGNAL_NAMES[fmType] || "VS",
          keyword: s.keyword || 0,
        };
      })
      .filter((s: any) => s.symbol.toUpperCase() === sym && s.price > 0)
      .slice(0, 10);

    filtered.forEach((sig: any) => {
      if (!sig.createTime || !sig.price) return;
      const isLong = sig.direction === "long";
      try {
        candleSeriesRef.current?.createPriceLine({
          price: sig.price,
          color: isLong ? "rgba(34,197,94,0.7)" : "rgba(239,68,68,0.7)",
          lineWidth: 1,
          lineStyle: 2,
          axisLabelVisible: true,
          title: `${sig.signalName.slice(0, 8)} ${isLong ? "↑" : "↓"}`,
        });
      } catch (_) {}
    });
  }, [vsSignals, symbol]);

  return (
    <div className={cn("relative rounded-xl overflow-hidden border border-border/50 bg-card", className)}>
      {/* 顶部信息栏 */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border/50 bg-card/80">
        <div className="flex items-center gap-3">
          <TrendingUp className="w-4 h-4 text-primary" />
          <span className="text-sm font-bold font-mono text-foreground">{symbol}</span>
          <span className="text-xs text-muted-foreground bg-accent px-2 py-0.5 rounded">{intervalLabel}</span>
          {crosshairPrice && (
            <span className="text-xs font-mono text-primary">
              {crosshairTime} · ${crosshairPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
            </span>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-foreground"
          onClick={() => refetch()}
          disabled={isFetching}
        >
          <RefreshCw className={cn("w-3.5 h-3.5", isFetching && "animate-spin")} />
        </Button>
      </div>

      {/* 图表容器 */}
      <div ref={containerRef} style={{ height }} className="w-full" />

      {/* 加载状态 */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-card/80 backdrop-blur-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm">加载 K 线数据...</span>
          </div>
        </div>
      )}

      {/* 图例 */}
      <div className="flex items-center gap-4 px-4 py-2 border-t border-border/50 bg-card/50 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm" style={{ background: "#22c55e" }} />
          <span>涨</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm" style={{ background: "#ef4444" }} />
          <span>跌</span>
        </div>
        {showSignals && (
          <>
            <div className="flex items-center gap-1.5">
              <div className="w-6 h-0.5 border-t border-dashed" style={{ borderColor: "#22c55e" }} />
              <span>VS 做多信号</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-6 h-0.5 border-t border-dashed" style={{ borderColor: "#ef4444" }} />
              <span>VS 做空信号</span>
            </div>
          </>
        )}
        <div className="ml-auto text-xs opacity-50">lightweight-charts v5</div>
      </div>
    </div>
  );
}
