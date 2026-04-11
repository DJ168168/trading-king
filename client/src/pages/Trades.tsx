import { useMemo, useState } from "react";
import { BarChart2, History, RefreshCw, TrendingDown, TrendingUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import EmptyState from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";

const ACTION_LABELS: Record<string, string> = {
  OPEN_LONG: "开多",
  OPEN_SHORT: "开空",
  CLOSE_LONG: "平多",
  CLOSE_SHORT: "平空",
  PARTIAL_CLOSE: "部分平仓",
  STOP_LOSS: "止损",
  TAKE_PROFIT: "止盈",
};

const STATUS_STYLES: Record<string, string> = {
  open: "text-fomo bg-fomo-subtle border-fomo/20",
  closed: "text-muted-foreground bg-muted border-border",
  cancelled: "text-loss bg-loss-subtle border-loss/20",
};

function TableSkeleton() {
  return (
    <div className="space-y-2 p-4">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="rounded-xl border border-border/50 bg-accent/30 p-3">
          <div className="grid grid-cols-5 gap-3">
            <Skeleton className="h-4 w-12 bg-primary/10" />
            <Skeleton className="h-4 w-16 bg-primary/10" />
            <Skeleton className="h-4 w-20 bg-primary/10" />
            <Skeleton className="h-4 w-16 bg-primary/10" />
            <Skeleton className="h-4 w-20 bg-primary/10" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Trades() {
  const [page, setPage] = useState(0);
  const limit = 20;

  const tradesQuery = trpc.trades.list.useQuery({ limit, offset: page * limit }, { refetchInterval: 15000 });
  const todayStatsQuery = trpc.trades.todayStats.useQuery(undefined, { refetchInterval: 15000 });

  const trades = tradesQuery.data ?? [];
  const todayStats = todayStatsQuery.data;

  const closedTrades = useMemo(
    () => trades.filter((t: any) => t.status === "closed" && t.pnl !== null),
    [trades],
  );

  const chartData = closedTrades.slice(0, 20).map((t: any) => ({
    name: `#${t.id}`,
    pnl: t.pnl ?? 0,
    symbol: t.symbol,
  }));

  const totalPnl = closedTrades.reduce((sum: number, t: any) => sum + (t.pnl ?? 0), 0);
  const winTrades = closedTrades.filter((t: any) => (t.pnl ?? 0) > 0).length;
  const winRate = closedTrades.length > 0 ? (winTrades / closedTrades.length) * 100 : 0;
  const loading = tradesQuery.isLoading || todayStatsQuery.isLoading;

  return (
    <div className="space-y-5 p-4 lg:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">交易历史</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">完整记录每一笔交易的入场、出场与策略评分。</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => tradesQuery.refetch()} className="text-xs">
          <RefreshCw className="mr-1.5 h-3.5 w-3.5" />刷新
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          {
            label: "今日交易",
            value: `${todayStats?.totalTrades ?? 0} 笔`,
            color: "text-foreground",
            helper: "反映当天执行频率",
            trend: (todayStats?.totalTrades ?? 0) > 0,
          },
          {
            label: "今日胜率",
            value: `${todayStats?.winRate?.toFixed(1) ?? "0"}%`,
            color: todayStats && todayStats.winRate >= 50 ? "text-profit" : "text-loss",
            helper: todayStats && todayStats.winRate >= 50 ? "策略占优" : "需控制节奏",
            trend: (todayStats?.winRate ?? 0) >= 50,
          },
          {
            label: "今日盈亏",
            value: `${(todayStats?.totalPnl ?? 0) >= 0 ? "+" : ""}$${(todayStats?.totalPnl ?? 0).toFixed(2)}`,
            color: (todayStats?.totalPnl ?? 0) >= 0 ? "text-profit" : "text-loss",
            helper: "关注已实现盈亏",
            trend: (todayStats?.totalPnl ?? 0) >= 0,
          },
          {
            label: "历史总盈亏",
            value: `${totalPnl >= 0 ? "+" : ""}$${totalPnl.toFixed(2)}`,
            color: totalPnl >= 0 ? "text-profit" : "text-loss",
            helper: totalPnl >= 0 ? "账户累积正收益" : "需要复盘历史策略",
            trend: totalPnl >= 0,
          },
        ].map(({ label, value, color, helper, trend }) => (
          <div key={label} className="gradient-card rounded-2xl border border-primary/10 p-4">
            {loading ? (
              <div className="space-y-2">
                <Skeleton className="h-8 w-20 bg-primary/10" />
                <Skeleton className="h-3 w-16 bg-primary/10" />
                <Skeleton className="h-3 w-full bg-primary/10" />
              </div>
            ) : (
              <>
                <div className="mb-2 flex items-center justify-between">
                  <div className={cn("text-2xl font-bold font-mono", color)}>{value}</div>
                  {trend ? <TrendingUp className="h-4 w-4 text-profit" /> : <TrendingDown className="h-4 w-4 text-loss" />}
                </div>
                <div className="text-xs text-muted-foreground">{label}</div>
                <div className="mt-2 text-[11px] text-muted-foreground/90">{helper}</div>
              </>
            )}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="gradient-card rounded-2xl p-4 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-foreground">盈亏分布</h3>
              <p className="text-xs text-muted-foreground">最近 20 笔已平仓交易的收益分布，用于观察策略回撤与盈亏偏态。</p>
            </div>
          </div>

          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-4 w-28 bg-primary/10" />
              <Skeleton className="h-44 w-full rounded-xl bg-primary/10" />
            </div>
          ) : chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={chartData} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.2 0.01 240)" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "oklch(0.55 0.01 240)" }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "oklch(0.55 0.01 240)" }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v.toFixed(0)}`} />
                <Tooltip
                  contentStyle={{ backgroundColor: "oklch(0.11 0.01 240)", border: "1px solid oklch(0.2 0.01 240)", borderRadius: "8px", fontSize: "12px" }}
                  labelStyle={{ color: "oklch(0.92 0.01 240)" }}
                  formatter={(value: any, _name: any, props: any) => [`$${Number(value).toFixed(2)}`, props.payload.symbol]}
                />
                <Bar dataKey="pnl" radius={[3, 3, 0, 0]}>
                  {chartData.map((entry: any, index: number) => (
                    <Cell key={index} fill={entry.pnl >= 0 ? "oklch(0.65 0.18 160)" : "oklch(0.6 0.22 25)"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState
              icon={<BarChart2 className="h-10 w-10" />}
              title="还没有可分析的已平仓数据"
              description="图表只统计已完成的平仓交易。当前如果还处于观望阶段或仅有持仓中订单，这里会保持为空。"
              hint="建议先在持仓页执行一笔完整的开平仓流程，系统会自动生成盈亏图表与统计。"
              className="py-8"
            />
          )}
        </div>

        <div className="gradient-card rounded-2xl p-4">
          <h3 className="mb-3 text-sm font-semibold text-foreground">交易说明</h3>
          <div className="space-y-3 text-xs leading-6 text-muted-foreground">
            <div className="rounded-xl border border-primary/15 bg-primary/5 p-3">
              <span className="font-medium text-foreground">评分条：</span>
              代表该笔交易触发时的信号质量。评分越高，说明当时的 FOMO / Alpha 共振越完整。
            </div>
            <div className="rounded-xl border border-border/60 bg-background/40 p-3">
              <span className="font-medium text-foreground">胜率：</span>
              胜率需要结合交易次数一起观察。低样本高胜率并不等于策略稳定。
            </div>
            <div className="rounded-xl border border-border/60 bg-background/40 p-3">
              <span className="font-medium text-foreground">历史总盈亏：</span>
              用于判断长期表现，适合与账户总余额走势交叉验证。
            </div>
          </div>
        </div>
      </div>

      <div className="gradient-card overflow-hidden rounded-2xl">
        <div className="flex items-center justify-between border-b border-border p-4">
          <h3 className="text-sm font-semibold text-foreground">交易记录</h3>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>
              胜率: <span className={cn("font-mono font-medium", winRate >= 50 ? "text-profit" : "text-loss")}>{winRate.toFixed(1)}%</span>
            </span>
            <span>({winTrades}/{closedTrades.length})</span>
          </div>
        </div>

        {loading ? (
          <TableSkeleton />
        ) : trades.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    {["#", "标的", "操作", "数量", "开仓价", "出场价", "盈亏", "评分", "状态", "时间"].map((h) => (
                      <th key={h} className="whitespace-nowrap px-3 py-3 text-left text-xs font-medium text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {trades.map((t: any) => {
                    const pnl = t.pnl ?? 0;
                    const isProfit = pnl >= 0;
                    return (
                      <tr key={t.id} className="border-b border-border/50 transition-colors hover:bg-accent/30">
                        <td className="px-3 py-3 font-mono text-xs text-muted-foreground">#{t.id}</td>
                        <td className="px-3 py-3 text-sm font-bold font-mono text-foreground">{t.symbol}</td>
                        <td className="px-3 py-3">
                          <span className="rounded bg-accent px-1.5 py-0.5 text-xs text-foreground">{ACTION_LABELS[t.action] ?? t.action}</span>
                        </td>
                        <td className="px-3 py-3 text-sm font-mono text-foreground">{t.quantity}</td>
                        <td className="px-3 py-3 text-sm font-mono text-foreground">${t.entryPrice.toFixed(4)}</td>
                        <td className="px-3 py-3 text-sm font-mono text-muted-foreground">{t.exitPrice ? `$${t.exitPrice.toFixed(4)}` : "--"}</td>
                        <td className="px-3 py-3">
                          {t.status === "closed" ? (
                            <div>
                              <div className={cn("text-sm font-medium font-mono", isProfit ? "text-profit" : "text-loss")}>
                                {isProfit ? "+" : ""}${pnl.toFixed(2)}
                              </div>
                              <div className={cn("text-xs font-mono", isProfit ? "text-profit" : "text-loss")}>
                                {isProfit ? "+" : ""}{(t.pnlPercent ?? 0).toFixed(2)}%
                              </div>
                            </div>
                          ) : <span className="text-xs text-muted-foreground">--</span>}
                        </td>
                        <td className="px-3 py-3">
                          {t.signalScore ? (
                            <div className="flex items-center gap-1">
                              <div className="h-1.5 w-12 overflow-hidden rounded-full bg-muted">
                                <div className="h-full rounded-full bg-primary" style={{ width: `${t.signalScore * 100}%` }} />
                              </div>
                              <span className="text-xs font-mono text-muted-foreground">{(t.signalScore * 100).toFixed(0)}%</span>
                            </div>
                          ) : <span className="text-xs text-muted-foreground">--</span>}
                        </td>
                        <td className="px-3 py-3">
                          <span className={cn("rounded border px-1.5 py-0.5 text-xs", STATUS_STYLES[t.status] ?? "text-muted-foreground bg-muted border-border")}>
                            {t.status === "open" ? "持仓中" : t.status === "closed" ? "已平仓" : "已取消"}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-3 py-3 text-xs text-muted-foreground">
                          {new Date(t.openedAt).toLocaleString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between border-t border-border px-4 py-3">
              <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0} className="text-xs">上一页</Button>
              <span className="text-xs text-muted-foreground">第 {page + 1} 页</span>
              <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={trades.length < limit} className="text-xs">下一页</Button>
            </div>
          </>
        ) : (
          <EmptyState
            icon={<History className="h-10 w-10" />}
            title="还没有交易记录"
            description="当前系统尚未产生任何开平仓记录。完成第一笔策略交易后，这里会自动沉淀盈亏、评分与时间序列。"
            hint="如果你已经接入了 ValueScan 但仍为空，请确认自动交易开关是否开启，或先在持仓页手动生成测试订单。"
            className="m-4 py-10"
          />
        )}
      </div>
    </div>
  );
}
