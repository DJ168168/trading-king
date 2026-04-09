import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import StatCard from "@/components/StatCard";
import PageHeader from "@/components/PageHeader";
import EmptyState from "@/components/EmptyState";
import { DollarSign, TrendingUp, BarChart3, Briefcase, Zap, RefreshCw, Activity, AlertCircle } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";

function ExchangeLabel({ exchange }: { exchange: string }) {
  const labels: Record<string, string> = { binance: "币安", okx: "欧易", bybit: "Bybit" };
  const colors: Record<string, string> = {
    binance: "bg-yellow-500/20 text-yellow-400",
    okx: "bg-blue-500/20 text-blue-400",
    bybit: "bg-orange-500/20 text-orange-400",
  };
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded ${colors[exchange] ?? "bg-gray-500/20 text-gray-400"}`}>
      {labels[exchange] ?? exchange}
    </span>
  );
}

export default function Dashboard() {
  const { data: allBalances, isLoading: balLoading, refetch: refetchBal } = trpc.account.allBalances.useQuery(undefined, { refetchInterval: 30000 });
  const { data: allPositions, isLoading: posLoading, refetch: refetchPos } = trpc.account.allPositions.useQuery(undefined, { refetchInterval: 30000 });
  const { data: signals, refetch: refetchSig } = trpc.signals.list.useQuery({ limit: 7 }, { refetchInterval: 30000 });
  const { data: overview } = trpc.market.overview.useQuery(undefined, { refetchInterval: 15000 });
  const { data: engineStatus } = trpc.signals.engineStatus.useQuery(undefined, { refetchInterval: 10000 });

  const totalBalance = allBalances
    ? Object.values(allBalances as Record<string, any>).reduce((sum, b) => sum + (b.total ?? 0), 0)
    : 0;
  const totalPnl = allPositions
    ? (allPositions as any[]).reduce((sum, p) => sum + (p.pnl ?? 0), 0)
    : 0;
  const openPositions = (allPositions as any[])?.length ?? 0;
  const btcTicker = (overview as any[])?.find((t: any) => t.symbol === "BTC/USDT" && t.exchange === "binance");

  const handleRefresh = () => { refetchBal(); refetchPos(); refetchSig(); };

  return (
    <div>
      <PageHeader
        title="交易仪表盘"
        description="实时接入币安 · 欧易 · Bybit 三大交易所"
        actions={
          <div className="flex gap-2 items-center">
            <div className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border ${engineStatus?.running ? "border-green-500/40 text-green-400 bg-green-500/10" : "border-gray-600 text-gray-500"}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${engineStatus?.running ? "bg-green-400 animate-pulse" : "bg-gray-500"}`} />
              信号引擎 {engineStatus?.running ? "运行中" : "已停止"}
            </div>
            <Button variant="outline" size="sm" className="text-xs" onClick={handleRefresh}>
              <RefreshCw size={14} className="mr-1" /> 刷新
            </Button>
          </div>
        }
      />

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          icon={<DollarSign size={18} />} iconColor="text-neon-green"
          label="账户总余额"
          value={balLoading ? "加载中..." : `$${totalBalance.toFixed(2)}`}
          sublabel="三大交易所合计 USDT"
        />
        <StatCard
          icon={<TrendingUp size={18} />}
          iconColor={totalPnl >= 0 ? "text-neon-green" : "text-neon-red"}
          label="未实现盈亏"
          value={posLoading ? "加载中..." : `${totalPnl >= 0 ? "+" : ""}$${totalPnl.toFixed(2)}`}
          sublabel="所有持仓浮动盈亏"
        />
        <StatCard
          icon={<Briefcase size={18} />} iconColor="text-neon-blue"
          label="当前持仓"
          value={posLoading ? "—" : `${openPositions} 个`}
          sublabel="实盘开放持仓"
        />
        <StatCard
          icon={<BarChart3 size={18} />} iconColor="text-neon-yellow"
          label="BTC 价格"
          value={btcTicker ? `$${btcTicker.last.toLocaleString()}` : "—"}
          sublabel={btcTicker ? `${btcTicker.changePercent >= 0 ? "+" : ""}${btcTicker.changePercent.toFixed(2)}% 24h` : "加载中..."}
        />
      </div>

      {/* 各交易所余额 + 信号引擎状态 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {/* 各交易所余额 */}
        <div className="terminal-card p-4">
          <h3 className="text-sm font-medium text-foreground mb-4">各交易所余额</h3>
          <div className="space-y-3">
            {["binance", "okx", "bybit"].map(ex => {
              const bal = (allBalances as any)?.[ex];
              const labels: Record<string, string> = { binance: "币安 Binance", okx: "欧易 OKX", bybit: "Bybit" };
              return (
                <div key={ex} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
                  <div className="flex items-center gap-2">
                    <ExchangeLabel exchange={ex} />
                    <span className="text-sm text-muted-foreground">{labels[ex]}</span>
                  </div>
                  <div className="text-right">
                    {balLoading ? (
                      <span className="text-xs text-muted-foreground">加载中...</span>
                    ) : bal?.error ? (
                      <span className="text-xs text-red-400 flex items-center gap-1"><AlertCircle size={12} />连接失败</span>
                    ) : (
                      <div>
                        <div className="text-sm font-mono font-bold text-foreground">${(bal?.total ?? 0).toFixed(2)}</div>
                        <div className="text-[10px] text-muted-foreground">可用 ${(bal?.free ?? 0).toFixed(2)}</div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 信号引擎状态 */}
        <div className="terminal-card p-4">
          <h3 className="text-sm font-medium text-foreground mb-4">信号引擎状态</h3>
          <div className="space-y-3">
            {[
              { label: "引擎状态", value: engineStatus?.running ? "运行中" : "已停止", color: engineStatus?.running ? "text-neon-green" : "text-neon-red" },
              { label: "监控交易所", value: "币安 · 欧易 · Bybit", color: "text-foreground" },
              { label: "监控交易对", value: "BTC ETH SOL BNB XRP DOGE ADA AVAX", color: "text-muted-foreground" },
              { label: "信号冷却期", value: "5 分钟", color: "text-foreground" },
              { label: "最低评分", value: "60 分", color: "text-foreground" },
              { label: "Telegram 推送", value: "已启用", color: "text-neon-green" },
              { label: "检测间隔", value: "60 秒", color: "text-foreground" },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{item.label}</span>
                <span className={`stat-number font-medium ${item.color}`}>{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 当前持仓 + 最近信号 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {/* 当前持仓 */}
        <div className="terminal-card p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-foreground">当前持仓（实盘）</h3>
            <span className="text-xs text-muted-foreground stat-number">{openPositions} 个</span>
          </div>
          {posLoading ? (
            <div className="space-y-2">
              {[1,2,3].map(i => <div key={i} className="h-12 rounded bg-muted/20 animate-pulse" />)}
            </div>
          ) : allPositions && (allPositions as any[]).length > 0 ? (
            <div className="space-y-2">
              {(allPositions as any[]).map((pos, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-1.5 py-0.5 rounded font-bold ${pos.side === "long" ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
                      {pos.side === "long" ? "多" : "空"}
                    </span>
                    <div>
                      <div className="text-sm font-mono text-foreground">{pos.symbol}</div>
                      <ExchangeLabel exchange={pos.exchange} />
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-sm font-mono font-bold ${pos.pnl >= 0 ? "text-neon-green" : "text-neon-red"}`}>
                      {pos.pnl >= 0 ? "+" : ""}{pos.pnl.toFixed(2)}
                    </div>
                    <div className="text-[10px] text-muted-foreground">{pos.size} @ ${pos.entryPrice.toFixed(4)}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState icon={<Briefcase size={36} />} title="暂无持仓" description="当前三大交易所均无开放持仓" />
          )}
        </div>

        {/* 最近信号 */}
        <div className="terminal-card p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-foreground">最近信号</h3>
            <span className="text-xs text-muted-foreground stat-number">{(signals as any[])?.length ?? 0} 条</span>
          </div>
          {signals && (signals as any[]).length > 0 ? (
            <div className="space-y-2">
              {(signals as any[]).map((sig: any) => (
                <div key={sig.id} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-1.5 py-0.5 rounded font-bold ${sig.type === "LONG" ? "bg-green-500/20 text-green-400" : sig.type === "SHORT" ? "bg-red-500/20 text-red-400" : "bg-gray-500/20 text-gray-400"}`}>
                      {sig.type}
                    </span>
                    <div>
                      <div className="text-sm font-mono text-foreground">{sig.symbol}</div>
                      <div className="text-[10px] text-muted-foreground">{sig.source}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-mono text-foreground">${Number(sig.price).toFixed(4)}</div>
                    <div className="text-[10px] text-muted-foreground">评分 {sig.score}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState icon={<Zap size={36} />} title="暂无信号" description="信号引擎正在监控市场，有信号时将自动推送 Telegram" />
          )}
        </div>
      </div>

      {/* 行情概览 */}
      <div className="terminal-card p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-foreground">行情概览（币安）</h3>
          <span className="text-xs text-muted-foreground">15s 自动刷新</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {(overview as any[])?.filter((t: any) => t.exchange === "binance").map((ticker: any) => (
            <div key={ticker.symbol} className="p-3 rounded-lg bg-muted/10 border border-border/30">
              <div className="text-xs text-muted-foreground mb-1">{ticker.symbol.replace("/USDT", "")}/USDT</div>
              <div className="text-lg font-mono font-bold text-foreground">${ticker.last.toLocaleString()}</div>
              <div className={`text-xs font-mono ${ticker.changePercent >= 0 ? "text-neon-green" : "text-neon-red"}`}>
                {ticker.changePercent >= 0 ? "▲" : "▼"} {Math.abs(ticker.changePercent).toFixed(2)}%
              </div>
            </div>
          )) ?? (
            <div className="col-span-4 text-center py-4 text-muted-foreground text-sm">行情加载中...</div>
          )}
        </div>
      </div>
    </div>
  );
}
