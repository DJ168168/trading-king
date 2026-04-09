import { trpc } from "@/lib/trpc";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { RefreshCw, Globe, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useState } from "react";

const SYMBOLS = ["BTC/USDT", "ETH/USDT", "SOL/USDT", "BNB/USDT", "XRP/USDT", "DOGE/USDT", "ADA/USDT", "AVAX/USDT"];
const TABS = ["行情总览", "资金费率", "持仓量"];

function ExchangeTag({ exchange }: { exchange: string }) {
  const colors: Record<string, string> = {
    binance: "bg-yellow-500/20 text-yellow-400",
    okx: "bg-blue-500/20 text-blue-400",
    bybit: "bg-orange-500/20 text-orange-400",
  };
  const labels: Record<string, string> = { binance: "币安", okx: "欧易", bybit: "Bybit" };
  return <span className={`text-[10px] px-1.5 py-0.5 rounded ${colors[exchange] ?? "bg-gray-500/20 text-gray-400"}`}>{labels[exchange] ?? exchange}</span>;
}

export default function MarketOverview() {
  const [activeTab, setActiveTab] = useState("行情总览");

  const { data: overview, isLoading: mktLoading, refetch: refetchMkt } = trpc.market.overview.useQuery(undefined, { refetchInterval: 15000 });
  const { data: frBTC, refetch: refetchFr } = trpc.market.fundingRate.useQuery({ exchange: "binance", symbol: "BTC/USDT:USDT" }, { refetchInterval: 60000 });

  const tickers = (overview as any[]) ?? [];
  const fundingRates = frBTC ? [frBTC] : [];

  // 按交易所分组
  const binanceTickers = tickers.filter((t: any) => t.exchange === "binance");
  const okxTickers = tickers.filter((t: any) => t.exchange === "okx");

  const handleRefresh = () => { refetchMkt(); refetchFr(); };

  return (
    <div>
      <PageHeader
        title="市场全景"
        description="实时行情 · 资金费率 · 多交易所数据"
        actions={
          <Button variant="outline" size="sm" className="text-xs" onClick={handleRefresh}>
            <RefreshCw size={14} className="mr-1" /> 刷新
          </Button>
        }
      />

      {/* Tab 切换 */}
      <div className="flex gap-1 mb-4 border-b border-border/30">
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm transition-colors ${activeTab === tab ? "text-neon-green border-b-2 border-neon-green" : "text-muted-foreground hover:text-foreground"}`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === "行情总览" && (
        <div className="terminal-card">
          <div className="p-4 border-b border-border/30 flex items-center gap-2">
            <Globe size={16} className="text-neon-blue" />
            <span className="text-sm font-medium">实时行情（币安 + 欧易）</span>
            <span className="text-xs text-muted-foreground ml-auto">15s 自动刷新</span>
          </div>
          {mktLoading ? (
            <div className="p-4 space-y-2">{[1,2,3,4,5,6,7,8].map(i => <div key={i} className="h-12 rounded bg-muted/20 animate-pulse" />)}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/30">
                    {["交易所","交易对","最新价","24h涨跌","24h高","24h低","24h成交量"].map(h => (
                      <th key={h} className={`p-3 text-xs text-muted-foreground font-medium ${["交易所","交易对"].includes(h) ? "text-left" : "text-right"}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tickers.map((t: any, idx: number) => (
                    <tr key={`${t.exchange}-${t.symbol}-${idx}`} className="border-b border-border/20 hover:bg-muted/10 transition-colors">
                      <td className="p-3"><ExchangeTag exchange={t.exchange} /></td>
                      <td className="p-3 font-mono font-medium text-foreground">{t.symbol}</td>
                      <td className="p-3 text-right font-mono font-bold text-foreground">
                        ${Number(t.last).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 6 })}
                      </td>
                      <td className="p-3 text-right">
                        <span className={`font-mono font-bold text-sm flex items-center justify-end gap-1 ${t.changePercent >= 0 ? "text-neon-green" : "text-neon-red"}`}>
                          {t.changePercent >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                          {t.changePercent >= 0 ? "+" : ""}{Number(t.changePercent).toFixed(2)}%
                        </span>
                      </td>
                      <td className="p-3 text-right font-mono text-muted-foreground">
                        ${Number(t.high).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                      </td>
                      <td className="p-3 text-right font-mono text-muted-foreground">
                        ${Number(t.low).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                      </td>
                      <td className="p-3 text-right font-mono text-muted-foreground">
                        {Number(t.volume).toLocaleString("en-US", { maximumFractionDigits: 0 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === "资金费率" && (
        <div className="terminal-card">
          <div className="p-4 border-b border-border/30 flex items-center gap-2">
            <span className="text-sm font-medium">资金费率（币安合约）</span>
            <span className="text-xs text-muted-foreground ml-auto">每 8 小时结算</span>
          </div>
          {fundingRates.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">
              <Minus size={32} className="mx-auto mb-2 opacity-30" />
              暂无资金费率数据
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/30">
                    {["交易对","资金费率","下次结算","交易所"].map(h => (
                      <th key={h} className={`p-3 text-xs text-muted-foreground font-medium ${h === "交易对" ? "text-left" : "text-right"}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {fundingRates.map((fr: any, idx: number) => (
                    <tr key={`${fr.symbol}-${idx}`} className="border-b border-border/20 hover:bg-muted/10 transition-colors">
                      <td className="p-3 font-mono font-medium text-foreground">{fr.symbol}</td>
                      <td className="p-3 text-right">
                        <span className={`font-mono font-bold ${Number(fr.fundingRate) >= 0 ? "text-neon-green" : "text-neon-red"}`}>
                          {(Number(fr.fundingRate) * 100).toFixed(4)}%
                        </span>
                      </td>
                      <td className="p-3 text-right font-mono text-muted-foreground text-xs">
                        {fr.nextFundingTime ? new Date(fr.nextFundingTime).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai", hour: "2-digit", minute: "2-digit" }) : "—"}
                      </td>
                      <td className="p-3 text-right"><ExchangeTag exchange={fr.exchange} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === "持仓量" && (
        <div className="terminal-card p-8 text-center">
          <Globe size={40} className="mx-auto mb-3 text-muted-foreground opacity-30" />
          <p className="text-muted-foreground text-sm">持仓量数据需要专业数据服务，即将接入</p>
        </div>
      )}
    </div>
  );
}
