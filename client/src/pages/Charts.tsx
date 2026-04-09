import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { useState } from "react";

const symbols = ["BTCUSDT.P", "ETHUSDT.P", "SOLUSDT.P", "BNBUSDT.P", "XRPUSDT.P", "DOGEUSDT.P"];
const intervals = ["1m", "5m", "15m", "1h", "4h", "1D", "1W"];

export default function Charts() {
  const [symbol, setSymbol] = useState("BTCUSDT.P");
  const [interval, setInterval] = useState("1h");

  const chartUrl = `https://s.tradingview.com/widgetembed/?frameElementId=tradingview_chart&symbol=BINANCE%3A${symbol}&interval=${
    interval === "1D" ? "D" : interval === "1W" ? "W" : interval.replace("m", "").replace("h", "60")
  }&hidesidetoolbar=0&symboledit=1&saveimage=1&toolbarbg=f1f3f6&studies=%5B%5D&theme=dark&style=1&timezone=Asia%2FShanghai&withdateranges=1&showpopupbutton=1&locale=zh_CN`;

  return (
    <div>
      <PageHeader title="📈 K 线图表" description="TradingView 专业图表 · 信号标注" />

      <div className="flex flex-wrap gap-2 mb-3">
        {symbols.map((s) => (
          <Button key={s} variant={symbol === s ? "default" : "outline"} size="sm" className="text-xs" onClick={() => setSymbol(s)}>
            {s.replace("USDT.P", "")}
          </Button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {intervals.map((i) => (
          <Button key={i} variant={interval === i ? "default" : "outline"} size="sm" className="text-xs h-7" onClick={() => setInterval(i)}>
            {i}
          </Button>
        ))}
      </div>

      <div className="terminal-card overflow-hidden" style={{ height: "calc(100vh - 280px)", minHeight: "500px" }}>
        <iframe
          src={chartUrl}
          className="w-full h-full border-0"
          title="TradingView Chart"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        />
      </div>
    </div>
  );
}
