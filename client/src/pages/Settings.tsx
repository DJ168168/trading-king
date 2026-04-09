import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PageHeader from "@/components/PageHeader";
import { toast } from "sonner";

const tickers = [
  { symbol: "BTC/USDT", price: "71,899.5", change: "+861.40", pct: "+1.21%" },
  { symbol: "ETH/USDT", price: "2,212.03", change: "+23.16", pct: "+1.06%" },
  { symbol: "SOL/USDT", price: "83.81", change: "+1.29", pct: "+1.56%" },
  { symbol: "BNB/USDT", price: "608.41", change: "+7.00", pct: "+1.16%" },
  { symbol: "XRP/USDT", price: "1.3537", change: "+0.01", pct: "+0.88%" },
  { symbol: "DOGE/USDT", price: "0.09328", change: "+0.00093", pct: "+1.01%" },
];

export default function Settings() {
  return (
    <div>
      <PageHeader title="系统设置" description="TradingView 图表 · ValueScan 账户 · Telegram 通知 · 币安 API" />

      {/* Ticker Bar */}
      <div className="terminal-card p-2 mb-4 overflow-hidden">
        <div className="flex gap-6 animate-marquee">
          {[...tickers, ...tickers].map((t, i) => (
            <div key={i} className="flex items-center gap-2 shrink-0 text-xs">
              <span className="text-foreground font-medium">{t.symbol}</span>
              <span className="stat-number text-foreground">{t.price}</span>
              <span className="stat-number text-neon-green">{t.change} ({t.pct})</span>
            </div>
          ))}
        </div>
      </div>

      <Tabs defaultValue="tv" className="w-full">
        <TabsList className="bg-secondary mb-4 flex-wrap h-auto">
          <TabsTrigger value="tv" className="text-xs">TV 图表</TabsTrigger>
          <TabsTrigger value="vs" className="text-xs">ValueScan</TabsTrigger>
          <TabsTrigger value="tg" className="text-xs">Telegram</TabsTrigger>
          <TabsTrigger value="market" className="text-xs">市场概览</TabsTrigger>
          <TabsTrigger value="exchange" className="text-xs">OKX / Bybit / Gate / Bitget</TabsTrigger>
          <TabsTrigger value="binance" className="text-xs">币安 API</TabsTrigger>
          <TabsTrigger value="auto" className="text-xs">自动交易</TabsTrigger>
        </TabsList>

        <TabsContent value="tv">
          <div className="terminal-card p-4">
            <h3 className="text-sm font-medium mb-4">TradingView 专业图表</h3>
            <p className="text-xs text-muted-foreground mb-4">集成 Supertrend · MACD · RSI</p>
            <div className="bg-terminal-bg border border-border rounded-lg overflow-hidden" style={{ height: "500px" }}>
              <iframe
                src="https://s.tradingview.com/widgetembed/?frameElementId=tradingview_widget&symbol=BINANCE%3ABTCUSDT.P&interval=60&hidesidetoolbar=0&symboledit=1&saveimage=1&toolbarbg=f1f3f6&studies=%5B%5D&theme=dark&style=1&timezone=Asia%2FShanghai&withdateranges=1&showpopupbutton=1&studies_overrides=%7B%7D&overrides=%7B%7D&enabled_features=%5B%5D&disabled_features=%5B%5D&showpopupbutton=1&locale=zh_CN"
                className="w-full h-full border-0"
                title="TradingView Chart"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              />
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button variant="outline" size="sm" className="text-xs text-neon-green border-neon-green/30">Supertrend</Button>
              <Button variant="outline" size="sm" className="text-xs text-neon-yellow border-neon-yellow/30">MACD</Button>
              <Button variant="outline" size="sm" className="text-xs text-neon-blue border-neon-blue/30">RSI</Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="vs">
          <div className="terminal-card p-4">
            <h3 className="text-sm font-medium mb-2">ValueScan 连接状态</h3>
            <div className="flex items-center gap-2 mb-4">
              <span className="w-2 h-2 rounded-full bg-neon-green" />
              <span className="text-xs text-neon-green">已连接</span>
            </div>
            <p className="text-xs text-muted-foreground">ValueScan API 服务端连接正常，实时信号推送已启用。</p>
          </div>
        </TabsContent>

        <TabsContent value="tg">
          <div className="terminal-card p-4">
            <h3 className="text-sm font-medium mb-2">Telegram 通知设置</h3>
            <p className="text-xs text-muted-foreground mb-4">配置 Telegram Bot Token 和 Chat ID 以接收交易信号通知。</p>
            <Button variant="outline" size="sm" className="text-xs" onClick={() => toast.info("Telegram 配置功能")}>配置 Telegram</Button>
          </div>
        </TabsContent>

        <TabsContent value="market">
          <div className="terminal-card p-4">
            <h3 className="text-sm font-medium mb-4">市场概览</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {tickers.map((t) => (
                <div key={t.symbol} className="p-3 bg-secondary/50 rounded-lg">
                  <p className="text-sm font-medium">{t.symbol}</p>
                  <p className="text-lg stat-number font-bold">{t.price}</p>
                  <p className="text-xs text-neon-green stat-number">{t.change} ({t.pct})</p>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="exchange">
          <div className="terminal-card p-4">
            <h3 className="text-sm font-medium mb-2">交易所 API 配置</h3>
            <p className="text-xs text-muted-foreground">配置 OKX、Bybit、Gate、Bitget 交易所 API 密钥。</p>
          </div>
        </TabsContent>

        <TabsContent value="binance">
          <div className="terminal-card p-4">
            <h3 className="text-sm font-medium mb-2">币安 API 配置</h3>
            <p className="text-xs text-muted-foreground">配置币安 API Key 和 Secret 以启用自动交易功能。</p>
          </div>
        </TabsContent>

        <TabsContent value="auto">
          <div className="terminal-card p-4">
            <h3 className="text-sm font-medium mb-2">自动交易设置</h3>
            <p className="text-xs text-muted-foreground">配置自动交易参数，启用后系统将根据信号自动执行交易。</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
