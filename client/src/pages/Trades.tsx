import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { History, TrendingUp, TrendingDown, RefreshCw, BarChart2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

const ACTION_LABELS: Record<string, string> = {
  OPEN_LONG: "开多", OPEN_SHORT: "开空", CLOSE_LONG: "平多", CLOSE_SHORT: "平空",
  PARTIAL_CLOSE: "部分平仓", STOP_LOSS: "止损", TAKE_PROFIT: "止盈",
};

const STATUS_STYLES: Record<string, string> = {
  open: "text-fomo bg-fomo-subtle border-fomo/20",
  closed: "text-muted-foreground bg-muted border-border",
  cancelled: "text-loss bg-loss-subtle border-loss/20",
};

export default function Trades() {
  const [page, setPage] = useState(0);
  const limit = 20;

  const { data: trades, refetch } = trpc.trades.list.useQuery({ limit, offset: page * limit }, { refetchInterval: 15000 });
  const { data: todayStats } = trpc.trades.todayStats.useQuery(undefined, { refetchInterval: 15000 });

  // 构建盈亏图表数据
  const closedTrades = trades?.filter((t: any) => t.status === "closed" && t.pnl !== null) ?? [];
  const chartData = closedTrades.slice(0, 20).map((t: any, i: number) => ({
    name: `#${t.id}`,
    pnl: t.pnl ?? 0,
    symbol: t.symbol,
  }));

  const totalPnl = closedTrades.reduce((sum: number, t: any) => sum + (t.pnl ?? 0), 0);
  const winTrades = closedTrades.filter((t: any) => (t.pnl ?? 0) > 0).length;
  const winRate = closedTrades.length > 0 ? (winTrades / closedTrades.length) * 100 : 0;

  return (
    <div className="p-4 lg:p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">交易历史</h1>
          <p className="text-sm text-muted-foreground mt-0.5">完整的交易记录与盈亏分析</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} className="text-xs">
          <RefreshCw className="w-3.5 h-3.5 mr-1.5" />刷新
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "今日交易", value: `${todayStats?.totalTrades ?? 0} 笔`, color: "text-foreground" },
          { label: "今日胜率", value: `${todayStats?.winRate?.toFixed(1) ?? "0"}%`, color: todayStats && todayStats.winRate >= 50 ? "text-profit" : "text-loss" },
          { label: "今日盈亏", value: `${(todayStats?.totalPnl ?? 0) >= 0 ? "+" : ""}$${(todayStats?.totalPnl ?? 0).toFixed(2)}`, color: (todayStats?.totalPnl ?? 0) >= 0 ? "text-profit" : "text-loss" },
          { label: "历史总盈亏", value: `${totalPnl >= 0 ? "+" : ""}$${totalPnl.toFixed(2)}`, color: totalPnl >= 0 ? "text-profit" : "text-loss" },
        ].map(({ label, value, color }) => (
          <div key={label} className="gradient-card rounded-xl p-4">
            <div className={cn("text-2xl font-bold font-mono", color)}>{value}</div>
            <div className="text-xs text-muted-foreground mt-1">{label}</div>
          </div>
        ))}
      </div>

      {/* PnL Chart */}
      {chartData.length > 0 && (
        <div className="gradient-card rounded-xl p-4">
          <h3 className="text-sm font-semibold text-foreground mb-4">盈亏分布</h3>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={chartData} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.2 0.01 240)" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: "oklch(0.55 0.01 240)" }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "oklch(0.55 0.01 240)" }} tickLine={false} axisLine={false} tickFormatter={v => `$${v.toFixed(0)}`} />
              <Tooltip contentStyle={{ backgroundColor: "oklch(0.11 0.01 240)", border: "1px solid oklch(0.2 0.01 240)", borderRadius: "8px", fontSize: "12px" }}
                labelStyle={{ color: "oklch(0.92 0.01 240)" }}
                formatter={(value: any, name: any, props: any) => [`$${Number(value).toFixed(2)}`, props.payload.symbol]} />
              <Bar dataKey="pnl" radius={[3, 3, 0, 0]}>
                {chartData.map((entry: any, index: number) => (
                  <Cell key={index} fill={entry.pnl >= 0 ? "oklch(0.65 0.18 160)" : "oklch(0.6 0.22 25)"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Trades Table */}
      <div className="gradient-card rounded-xl overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">交易记录</h3>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>胜率: <span className={cn("font-mono font-medium", winRate >= 50 ? "text-profit" : "text-loss")}>{winRate.toFixed(1)}%</span></span>
            <span>({winTrades}/{closedTrades.length})</span>
          </div>
        </div>
        {trades && trades.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    {["#", "标的", "操作", "数量", "开仓价", "出场价", "盈亏", "评分", "状态", "时间"].map(h => (
                      <th key={h} className="px-3 py-3 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {trades.map((t: any) => {
                    const pnl = t.pnl ?? 0;
                    const isProfit = pnl >= 0;
                    return (
                      <tr key={t.id} className="border-b border-border/50 hover:bg-accent/30 transition-colors">
                        <td className="px-3 py-3 text-xs text-muted-foreground font-mono">#{t.id}</td>
                        <td className="px-3 py-3 font-mono font-bold text-foreground text-sm">{t.symbol}</td>
                        <td className="px-3 py-3">
                          <span className="text-xs px-1.5 py-0.5 bg-accent rounded text-foreground">{ACTION_LABELS[t.action] ?? t.action}</span>
                        </td>
                        <td className="px-3 py-3 font-mono text-sm text-foreground">{t.quantity}</td>
                        <td className="px-3 py-3 font-mono text-sm text-foreground">${t.entryPrice.toFixed(4)}</td>
                        <td className="px-3 py-3 font-mono text-sm text-muted-foreground">{t.exitPrice ? `$${t.exitPrice.toFixed(4)}` : "--"}</td>
                        <td className="px-3 py-3">
                          {t.status === "closed" ? (
                            <div>
                              <div className={cn("font-mono text-sm font-medium", isProfit ? "text-profit" : "text-loss")}>
                                {isProfit ? "+" : ""}${pnl.toFixed(2)}
                              </div>
                              <div className={cn("text-xs font-mono", isProfit ? "text-profit" : "text-loss")}>
                                {isProfit ? "+" : ""}{(t.pnlPercent ?? 0).toFixed(2)}%
                              </div>
                            </div>
                          ) : <span className="text-muted-foreground text-xs">--</span>}
                        </td>
                        <td className="px-3 py-3">
                          {t.signalScore ? (
                            <div className="flex items-center gap-1">
                              <div className="w-12 h-1.5 bg-muted rounded-full overflow-hidden">
                                <div className="h-full bg-primary rounded-full" style={{ width: `${t.signalScore * 100}%` }} />
                              </div>
                              <span className="text-xs font-mono text-muted-foreground">{(t.signalScore * 100).toFixed(0)}%</span>
                            </div>
                          ) : <span className="text-muted-foreground text-xs">--</span>}
                        </td>
                        <td className="px-3 py-3">
                          <span className={cn("text-xs px-1.5 py-0.5 rounded border", STATUS_STYLES[t.status] ?? "text-muted-foreground bg-muted border-border")}>
                            {t.status === "open" ? "持仓中" : t.status === "closed" ? "已平仓" : "已取消"}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(t.openedAt).toLocaleString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between px-4 py-3 border-t border-border">
              <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="text-xs">上一页</Button>
              <span className="text-xs text-muted-foreground">第 {page + 1} 页</span>
              <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={(trades?.length ?? 0) < limit} className="text-xs">下一页</Button>
            </div>
          </>
        ) : (
          <div className="text-center py-16 text-muted-foreground">
            <History className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="text-sm font-medium">暂无交易记录</p>
            <p className="text-xs mt-1">在持仓管理页面创建交易后，记录将显示在这里</p>
          </div>
        )}
      </div>
    </div>
  );
}
