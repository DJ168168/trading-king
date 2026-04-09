import { useEffect, useRef, memo } from "react";

interface TradingViewChartProps {
  symbol?: string;
  interval?: string;
  theme?: "dark" | "light";
  height?: number;
  showToolbar?: boolean;
  showSideToolbar?: boolean;
  allowSymbolChange?: boolean;
  studies?: string[];
  className?: string;
}

/**
 * TradingView 高级图表嵌入组件（免费 Widget）
 * 支持 Supertrend、MACD、RSI 等指标
 */
const TradingViewChart = memo(({
  symbol = "BINANCE:BTCUSDT.P",
  interval = "60",
  theme = "dark",
  height = 500,
  showToolbar = true,
  showSideToolbar = true,
  allowSymbolChange = true,
  studies = [
    "STD;Supertrend",
    "STD;MACD",
    "STD;RSI"
  ],
  className = "",
}: TradingViewChartProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const scriptRef = useRef<HTMLScriptElement | null>(null);
  const widgetIdRef = useRef(`tv_widget_${Math.random().toString(36).slice(2)}`);

  useEffect(() => {
    if (!containerRef.current) return;

    // 清理之前的 widget
    containerRef.current.innerHTML = "";

    const container = document.createElement("div");
    container.id = widgetIdRef.current;
    container.style.height = "100%";
    container.style.width = "100%";
    containerRef.current.appendChild(container);

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol,
      interval,
      timezone: "Asia/Shanghai",
      theme,
      style: "1",
      locale: "zh_CN",
      backgroundColor: theme === "dark" ? "#0f1117" : "#ffffff",
      gridColor: theme === "dark" ? "rgba(255, 255, 255, 0.06)" : "rgba(0, 0, 0, 0.06)",
      hide_top_toolbar: !showToolbar,
      hide_side_toolbar: !showSideToolbar,
      allow_symbol_change: allowSymbolChange,
      save_image: true,
      calendar: false,
      support_host: "https://www.tradingview.com",
      studies,
      container_id: widgetIdRef.current,
      withdateranges: true,
      range: "3M",
      hide_volume: false,
      watchlist: [
        "BINANCE:BTCUSDT.P",
        "BINANCE:ETHUSDT.P",
        "BINANCE:SOLUSDT.P",
        "BINANCE:BNBUSDT.P",
        "BINANCE:XRPUSDT.P",
      ],
    });

    container.appendChild(script);
    scriptRef.current = script;

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = "";
      }
    };
  }, [symbol, interval, theme, showToolbar, showSideToolbar, allowSymbolChange]);

  return (
    <div
      ref={containerRef}
      className={`tradingview-widget-container ${className}`}
      style={{ height: `${height}px`, width: "100%" }}
    />
  );
});

TradingViewChart.displayName = "TradingViewChart";
export default TradingViewChart;

// ─── 迷你行情 Widget（单行价格展示）────────────────────────────────────────────
interface TradingViewTickerProps {
  symbols?: Array<{ proName: string; title: string }>;
  colorTheme?: "dark" | "light";
}

export const TradingViewTicker = memo(({
  symbols = [
    { proName: "BINANCE:BTCUSDT.P", title: "BTC/USDT" },
    { proName: "BINANCE:ETHUSDT.P", title: "ETH/USDT" },
    { proName: "BINANCE:SOLUSDT.P", title: "SOL/USDT" },
    { proName: "BINANCE:BNBUSDT.P", title: "BNB/USDT" },
    { proName: "BINANCE:XRPUSDT.P", title: "XRP/USDT" },
    { proName: "BINANCE:DOGEUSDT.P", title: "DOGE/USDT" },
  ],
  colorTheme = "dark",
}: TradingViewTickerProps) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.innerHTML = "";

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-ticker-tape.js";
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = JSON.stringify({
      symbols,
      showSymbolLogo: true,
      isTransparent: true,
      displayMode: "adaptive",
      colorTheme,
      locale: "zh_CN",
    });

    containerRef.current.appendChild(script);

    return () => {
      if (containerRef.current) containerRef.current.innerHTML = "";
    };
  }, [colorTheme]);

  return (
    <div
      ref={containerRef}
      className="tradingview-widget-container"
      style={{ width: "100%", height: "46px" }}
    />
  );
});

TradingViewTicker.displayName = "TradingViewTicker";

// ─── 市场概览 Widget ──────────────────────────────────────────────────────────
interface TradingViewMarketOverviewProps {
  colorTheme?: "dark" | "light";
  height?: number;
}

export const TradingViewMarketOverview = memo(({
  colorTheme = "dark",
  height = 400,
}: TradingViewMarketOverviewProps) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.innerHTML = "";

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-market-overview.js";
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = JSON.stringify({
      colorTheme,
      dateRange: "12M",
      showChart: true,
      locale: "zh_CN",
      largeChartUrl: "",
      isTransparent: true,
      showSymbolLogo: true,
      showFloatingTooltip: false,
      width: "100%",
      height,
      tabs: [
        {
          title: "加密货币",
          symbols: [
            { s: "BINANCE:BTCUSDT.P", d: "BTC 永续" },
            { s: "BINANCE:ETHUSDT.P", d: "ETH 永续" },
            { s: "BINANCE:SOLUSDT.P", d: "SOL 永续" },
            { s: "BINANCE:BNBUSDT.P", d: "BNB 永续" },
            { s: "BINANCE:XRPUSDT.P", d: "XRP 永续" },
            { s: "BINANCE:DOGEUSDT.P", d: "DOGE 永续" },
          ],
          originalTitle: "Crypto",
        },
      ],
    });

    containerRef.current.appendChild(script);

    return () => {
      if (containerRef.current) containerRef.current.innerHTML = "";
    };
  }, [colorTheme, height]);

  return (
    <div
      ref={containerRef}
      className="tradingview-widget-container"
      style={{ width: "100%", height: `${height}px` }}
    />
  );
});

TradingViewMarketOverview.displayName = "TradingViewMarketOverview";
