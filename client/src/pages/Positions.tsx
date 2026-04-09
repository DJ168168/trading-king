import { trpc } from "@/lib/trpc";
import PageHeader from "@/components/PageHeader";
import EmptyState from "@/components/EmptyState";
import StatCard from "@/components/StatCard";
import { Button } from "@/components/ui/button";
import { Wallet, RefreshCw, AlertCircle, TrendingUp, TrendingDown, DollarSign, FileText } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

export default function Positions() {
  const [selectedExchange, setSelectedExchange] = useState<string>("all");

  const { data: allPositions, isLoading, refetch, error } = trpc.account.allPositions.useQuery(undefined, {
    refetchInterval: 15000,
  });
  const { data: allBalances } = trpc.account.allBalances.useQuery(undefined, { refetchInterval: 30000 });

  const positions = (allPositions as any[]) ?? [];
  const filtered = selectedExchange === "all"
    ? positions
    : positions.filter((p: any) => p.exchange === selectedExchange);

  const totalPnl = filtered.reduce((sum: number, p: any) => sum + (p.pnl ?? 0), 0);
  const longCount = filtered.filter((p: any) => p.side === "long").length;
  const shortCount = filtered.filter((p: any) => p.side === "short").length;
  const totalBalance = allBalances
    ? Object.values(allBalances as Record<string, any>).reduce((sum, b) => sum + (b.free ?? 0), 0)
    : 0;

  return (
    <div>
      <PageHeader
        title="持仓管理"
        description="实时监控三大交易所持仓状态（15s 自动刷新）"
        actions={
          <div className="flex gap-2 items-center">
            <Select value={selectedExchange} onValueChange={setSelectedExchange}>
              <SelectTrigger className="w-36 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部交易所</SelectItem>
                {EXCHANGES.map(ex => (
                  <SelectItem key={ex.value} value={ex.value}>{ex.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" className="text-xs" onClick={() => refetch()}>
              <RefreshCw size={14} className="mr-1" /> 刷新
            </Button>
          </div>
        }
      />

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={<Wallet size={18} />} iconColor="text-neon-green" label="当前持仓数" value={isLoading ? "—" : `${filtered.length} 个`} sublabel="实盘开放持仓" />
        <StatCard
          icon={<TrendingUp size={18} />}
          iconColor={totalPnl >= 0 ? "text-neon-green" : "text-neon-red"}
          label="未实现盈亏"
          value={isLoading ? "—" : `${totalPnl >= 0 ? "+" : ""}$${totalPnl.toFixed(2)}`}
          sublabel="所有持仓浮动盈亏"
        />
        <StatCard icon={<DollarSign size={18} />} iconColor="text-neon-blue" label="可用余额" value={`$${totalBalance.toFixed(2)}`} sublabel="三大交易所合计" />
        <StatCard icon={<FileText size={18} />} iconColor="text-muted-foreground" label="多/空比" value={`${longCount} / ${shortCount}`} sublabel="多单 / 空单" />
      </div>

      {/* 持仓列表 */}
      <div className="terminal-card">
        <div className="p-4 border-b border-border/30 flex items-center justify-between">
          <h3 className="text-sm font-medium text-foreground">持仓列表</h3>
          <span className="text-xs text-muted-foreground">{filtered.length} 个持仓</span>
        </div>

        {isLoading ? (
          <div className="p-6 space-y-3">
            {[1,2,3,4].map(i => (
              <div key={i} className="h-16 rounded bg-muted/20 animate-pulse" />
            ))}
          </div>
        ) : error ? (
          <div className="p-6 flex items-center gap-2 text-red-400">
            <AlertCircle size={16} />
            <span className="text-sm">获取持仓失败，请检查 API 配置</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={<TrendingUp size={40} />}
              title="暂无持仓"
              description="当前所选交易所无开放持仓，数据每 15 秒自动刷新"
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/30">
                  {["交易所","交易对","方向","数量","开仓价","标记价","杠杆","未实现盈亏","强平价"].map(h => (
                    <th key={h} className={`p-3 text-xs text-muted-foreground font-medium ${h === "交易所" || h === "交易对" || h === "方向" ? "text-left" : "text-right"}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((pos: any, i: number) => (
                  <tr key={i} className="border-b border-border/20 hover:bg-muted/10 transition-colors">
                    <td className="p-3"><ExchangeLabel exchange={pos.exchange} /></td>
                    <td className="p-3 font-mono text-foreground">{pos.symbol}</td>
                    <td className="p-3">
                      <span className={`flex items-center gap-1 text-xs font-bold ${pos.side === "long" ? "text-neon-green" : "text-neon-red"}`}>
                        {pos.side === "long" ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                        {pos.side === "long" ? "做多" : "做空"}
                      </span>
                    </td>
                    <td className="p-3 text-right font-mono text-foreground">{pos.size}</td>
                    <td className="p-3 text-right font-mono text-foreground">${pos.entryPrice.toFixed(4)}</td>
                    <td className="p-3 text-right font-mono text-foreground">${pos.markPrice.toFixed(4)}</td>
                    <td className="p-3 text-right font-mono text-foreground">{pos.leverage}x</td>
                    <td className="p-3 text-right">
                      <div className={`font-mono font-bold ${pos.pnl >= 0 ? "text-neon-green" : "text-neon-red"}`}>
                        {pos.pnl >= 0 ? "+" : ""}{pos.pnl.toFixed(2)}
                      </div>
                      <div className={`text-[10px] ${pos.pnlPct >= 0 ? "text-neon-green" : "text-neon-red"}`}>
                        {pos.pnlPct >= 0 ? "+" : ""}{pos.pnlPct.toFixed(2)}%
                      </div>
                    </td>
                    <td className="p-3 text-right font-mono text-muted-foreground">
                      {pos.liquidationPrice > 0 ? `$${pos.liquidationPrice.toFixed(2)}` : "—"}
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
