import { trpc } from "@/lib/trpc";
import StatCard from "@/components/StatCard";
import PageHeader from "@/components/PageHeader";
import EmptyState from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart3, Target, TrendingUp, DollarSign, RefreshCw, History } from "lucide-react";
import { useState } from "react";

const EXCHANGES = [
  { value: "binance", label: "币安 Binance" },
  { value: "okx", label: "欧易 OKX" },
  { value: "bybit", label: "Bybit" },
];

function ExchangeLabel({ exchange }: { exchange: string }) {
  const colors: Record<string, string> = {
    binance: "bg-yellow-500/20 text-yellow-400",
    okx: "bg-blue-500/20 text-blue-400",
    bybit: "bg-orange-500/20 text-orange-400",
  };
  const labels: Record<string, string> = { binance: "币安", okx: "欧易", bybit: "Bybit" };
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded ${colors[exchange] ?? "bg-gray-500/20 text-gray-400"}`}>
      {labels[exchange] ?? exchange}
    </span>
  );
}

export default function Trades() {
  const [exchange, setExchange] = useState<"binance" | "okx" | "bybit">("okx");

  const { data: trades, isLoading, refetch } = trpc.trades.history.useQuery(
    { exchange, limit: 50 },
    { refetchInterval: 60000 }
  );

  const tradeList = (trades as any[]) ?? [];
  const totalPnl = tradeList.reduce((sum: number, t: any) => sum + (t.pnl ?? 0), 0);
  const winTrades = tradeList.filter((t: any) => t.pnl > 0).length;
  const winRate = tradeList.length > 0 ? ((winTrades / tradeList.length) * 100).toFixed(1) : "0.0";

  return (
    <div>
      <PageHeader
        title="交易历史"
        description="实盘交易记录与盈亏分析"
        actions={
          <div className="flex gap-2 items-center">
            <Select value={exchange} onValueChange={(v) => setExchange(v as any)}>
              <SelectTrigger className="h-8 text-xs w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EXCHANGES.map(ex => <SelectItem key={ex.value} value={ex.value}>{ex.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" className="text-xs" onClick={() => refetch()}>
              <RefreshCw size={14} className="mr-1" /> 刷新
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={<BarChart3 size={18} />} iconColor="text-foreground" label="交易总数" value={`${tradeList.length} 笔`} sublabel="历史记录" />
        <StatCard icon={<Target size={18} />} iconColor="text-neon-yellow" label="历史胜率" value={`${winRate}%`} sublabel={`${winTrades}/${tradeList.length}`} />
        <StatCard icon={<TrendingUp size={18} />} iconColor={totalPnl >= 0 ? "text-neon-green" : "text-neon-red"} label="历史总盈亏" value={`${totalPnl >= 0 ? "+" : ""}$${totalPnl.toFixed(2)}`} sublabel="已实现" />
        <StatCard icon={<DollarSign size={18} />} iconColor="text-neon-blue" label="总手续费" value={`$${tradeList.reduce((s: number, t: any) => s + (t.fee ?? 0), 0).toFixed(4)}`} sublabel="累计费用" />
      </div>

      <div className="terminal-card">
        <div className="p-4 border-b border-border/30 flex items-center justify-between">
          <h3 className="text-sm font-medium">交易记录</h3>
          <ExchangeLabel exchange={exchange} />
        </div>

        {isLoading ? (
          <div className="p-4 space-y-2">{[1,2,3,4,5].map(i => <div key={i} className="h-12 rounded bg-muted/20 animate-pulse" />)}</div>
        ) : tradeList.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={<History size={40} />}
              title="暂无交易记录"
              description={`${EXCHANGES.find(e => e.value === exchange)?.label} 账户暂无历史交易记录，或 API 权限不足以查询交易历史。`}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/30">
                  {["时间","交易所","交易对","方向","数量","价格","成本","手续费","盈亏"].map(h => (
                    <th key={h} className={`p-3 text-xs text-muted-foreground font-medium ${["时间","交易所","交易对","方向"].includes(h) ? "text-left" : "text-right"}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tradeList.map((t: any, idx: number) => (
                  <tr key={`${t.id}-${idx}`} className="border-b border-border/20 hover:bg-muted/10 transition-colors">
                    <td className="p-3 text-xs text-muted-foreground font-mono whitespace-nowrap">
                      {t.datetime ? new Date(t.datetime).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—"}
                    </td>
                    <td className="p-3"><ExchangeLabel exchange={t.exchange} /></td>
                    <td className="p-3 font-mono text-foreground">{t.symbol}</td>
                    <td className="p-3">
                      <span className={`text-xs font-bold ${t.side === "buy" ? "text-neon-green" : "text-neon-red"}`}>
                        {t.side === "buy" ? "买入" : "卖出"}
                      </span>
                    </td>
                    <td className="p-3 text-right font-mono text-foreground">{Number(t.amount).toFixed(6)}</td>
                    <td className="p-3 text-right font-mono text-foreground">${Number(t.price).toFixed(4)}</td>
                    <td className="p-3 text-right font-mono text-muted-foreground">${Number(t.cost).toFixed(2)}</td>
                    <td className="p-3 text-right font-mono text-muted-foreground">${Number(t.fee).toFixed(6)}</td>
                    <td className="p-3 text-right">
                      {t.pnl !== 0 ? (
                        <span className={`font-mono font-bold text-sm ${t.pnl >= 0 ? "text-neon-green" : "text-neon-red"}`}>
                          {t.pnl >= 0 ? "+" : ""}{Number(t.pnl).toFixed(4)}
                        </span>
                      ) : <span className="text-muted-foreground">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
