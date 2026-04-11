import { useState } from "react";
import {
  Activity,
  BarChart2,
  Info,
  Power,
  RefreshCw,
  Shield,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  Zap,
} from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { toast } from "sonner";
import EmptyState from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";

function LoadingPanel({ rows = 4, height = 160 }: { rows?: number; height?: number }) {
  return (
    <div className="space-y-3">
      <Skeleton className="h-4 w-28 bg-primary/10" />
      <Skeleton className={`w-full rounded-xl bg-primary/10`} style={{ height }} />
      <div className="space-y-2">
        {Array.from({ length: rows }).map((_, index) => (
          <Skeleton key={index} className="h-10 w-full rounded-xl bg-primary/10" />
        ))}
      </div>
    </div>
  );
}

function TrendBadge({ trend, label }: { trend?: "up" | "down" | "neutral"; label?: string }) {
  if (!trend) return null;

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium",
        trend === "up"
          ? "border-profit/25 bg-profit/10 text-profit"
          : trend === "down"
            ? "border-loss/25 bg-loss/10 text-loss"
            : "border-border bg-muted/60 text-muted-foreground",
      )}
    >
      {trend === "up" ? <TrendingUp className="h-3 w-3" /> : trend === "down" ? <TrendingDown className="h-3 w-3" /> : <Activity className="h-3 w-3" />}
      {label ?? (trend === "up" ? "抬升" : trend === "down" ? "回撤" : "稳定")}
    </div>
  );
}

function StatCard({
  title,
  value,
  sub,
  helper,
  icon: Icon,
  trend,
  trendLabel,
  loading,
}: {
  title: string;
  value: string;
  sub?: string;
  helper?: string;
  icon: any;
  trend?: "up" | "down" | "neutral";
  trendLabel?: string;
  loading?: boolean;
}) {
  return (
    <div className="gradient-card relative overflow-hidden rounded-2xl border border-primary/10 p-4 shadow-[0_0_20px_rgba(34,211,238,0.06)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.12),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(168,85,247,0.08),transparent_25%)]" />
      <div className="relative">
        <div className="mb-3 flex items-start justify-between gap-2">
          <div className="rounded-xl border border-primary/20 bg-primary/10 p-2">
            <Icon className="h-4 w-4 text-primary" />
          </div>
          <TrendBadge trend={trend} label={trendLabel} />
        </div>
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-8 w-24 bg-primary/10" />
            <Skeleton className="h-3 w-16 bg-primary/10" />
            <Skeleton className="h-3 w-full bg-primary/10" />
          </div>
        ) : (
          <>
            <div className="text-2xl font-bold font-mono text-foreground">{value}</div>
            <div className="mt-1 text-xs text-muted-foreground">{title}</div>
            {sub && <div className="mt-1 text-xs text-muted-foreground">{sub}</div>}
            {helper && <div className="mt-3 text-[11px] leading-5 text-muted-foreground/90">{helper}</div>}
          </>
        )}
      </div>
    </div>
  );
}

const SIGNAL_TYPE_LABEL: Record<string, string> = {
  FOMO: "FOMO",
  ALPHA: "ALPHA",
  RISK: "风险",
  FALL: "下跌",
  FUND_MOVE: "资金",
  LISTING: "上市",
  FUND_ESCAPE: "逃跑",
  FUND_ABNORMAL: "异常",
};

const SIGNAL_TYPE_COLOR: Record<string, string> = {
  FOMO: "text-fomo bg-fomo-subtle border-fomo/20",
  ALPHA: "text-alpha bg-alpha-subtle border-alpha/20",
  RISK: "text-risk bg-risk-subtle border-risk/20",
  FALL: "text-loss bg-loss-subtle border-loss/20",
  FUND_MOVE: "text-primary bg-primary/10 border-primary/20",
  LISTING: "text-profit bg-profit-subtle border-profit/20",
  FUND_ESCAPE: "text-fomo bg-fomo-subtle border-fomo/20",
  FUND_ABNORMAL: "text-risk bg-risk-subtle border-risk/20",
};

const METRIC_GUIDES = [
  {
    title: "FOMO 热度",
    description: "捕捉异常放量与情绪加速，适合监控短线追涨与挤仓风险。",
    tone: "border-orange-500/25 bg-orange-500/10 text-orange-300",
  },
  {
    title: "Alpha 强度",
    description: "代表主导方向与趋势质量。Alpha 与 FOMO 共振时，通常意味着更高执行优先级。",
    tone: "border-purple-500/25 bg-purple-500/10 text-purple-300",
  },
  {
    title: "风控评分",
    description: "综合时间窗口、信号一致性与风险标签。分数越高，越适合进入自动交易白名单。",
    tone: "border-cyan-500/25 bg-cyan-500/10 text-cyan-300",
  },
];

export default function Dashboard() {
  const [refreshTick, setRefreshTick] = useState(0);
  const utils = trpc.useUtils();

  const snapshotQuery = trpc.account.snapshot.useQuery(undefined, { refetchInterval: 30000 });
  const historyQuery = trpc.account.history.useQuery({ hours: 24 }, { refetchInterval: 60000 });
  const todayStatsQuery = trpc.trades.todayStats.useQuery(undefined, { refetchInterval: 15000 });
  const recentSignalsQuery = trpc.signals.list.useQuery({ limit: 8 }, { refetchInterval: 5000 });
  const confluenceSignalsQuery = trpc.signals.confluenceList.useQuery({ limit: 5 }, { refetchInterval: 5000 });
  const positionsQuery = trpc.positions.list.useQuery(undefined, { refetchInterval: 10000 });
  const configQuery = trpc.config.active.useQuery();
  const cacheStatusQuery = trpc.signals.cacheStatus.useQuery(undefined, { refetchInterval: 5000 });
  const fearGreedQuery = trpc.valueScan.fearGreed.useQuery(undefined, { refetchInterval: 60000 });
  const vsWarnQuery = trpc.valueScan.warnMessages.useQuery({ pageNum: 1, pageSize: 6 }, { refetchInterval: 30000 });
  const engineStatusQuery = trpc.paperTrading.engineStatus.useQuery(undefined, { refetchInterval: 5000 });

  const toggleLiveEngine = trpc.paperTrading.toggleLiveEngine.useMutation({
    onSuccess: (data) => {
      utils.paperTrading.engineStatus.invalidate();
      toast.success(data.running ? "实盘引擎已启动，每 60 秒轮询 ValueScan 信号" : "实盘引擎已暂停");
    },
    onError: () => toast.error("切换实盘引擎失败"),
  });

  const mockMutation = trpc.signals.mock.useMutation({
    onSuccess: (data) => {
      if (data.confluence) {
        toast.success(`聚合信号触发：${data.confluence.symbol}，评分 ${(data.confluence.score * 100).toFixed(0)}%`);
      } else {
        toast.info(`信号已接收：${data.signal.symbol} (${data.signal.messageType})`);
      }
      recentSignalsQuery.refetch();
      confluenceSignalsQuery.refetch();
      cacheStatusQuery.refetch();
    },
  });

  const mockSnapshotMutation = trpc.account.mockSnapshot.useMutation({
    onSuccess: () => {
      snapshotQuery.refetch();
      historyQuery.refetch();
      toast.success("账户快照已更新");
    },
  });

  const toggleAutoMutation = trpc.config.toggleAutoTrading.useMutation({
    onSuccess: (_, vars) => {
      utils.config.active.invalidate();
      toast.success(vars.enabled ? "自动交易已开启，正在监听实时共振信号" : "自动交易已暂停");
    },
    onError: () => toast.error("切换失败，请重试"),
  });

  const snapshot = snapshotQuery.data;
  const history = historyQuery.data ?? [];
  const todayStats = todayStatsQuery.data;
  const recentSignals = recentSignalsQuery.data ?? [];
  const confluenceSignals = confluenceSignalsQuery.data ?? [];
  const positions = positionsQuery.data ?? [];
  const config = configQuery.data;
  const cacheStatus = cacheStatusQuery.data;
  const fearGreed = fearGreedQuery.data;
  const vsWarn = vsWarnQuery.data;
  const engineStatus = engineStatusQuery.data;

  const totalBalance = snapshot?.totalBalance ?? 0;
  const availableBalance = snapshot?.availableBalance ?? 0;
  const unrealizedPnl = snapshot?.unrealizedPnl ?? 0;
  const dailyPnl = snapshot?.dailyPnl ?? 0;
  const positionCount = positions.length;
  const isOverviewLoading = snapshotQuery.isLoading || todayStatsQuery.isLoading || positionsQuery.isLoading;
  const isChartLoading = historyQuery.isLoading || snapshotQuery.isLoading;
  const isSignalLoading = recentSignalsQuery.isLoading || confluenceSignalsQuery.isLoading;
  const isValueScanLoading = fearGreedQuery.isLoading || vsWarnQuery.isLoading;

  const chartData = history.map((s: any) => ({
    time: new Date(s.createdAt).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" }),
    balance: s.totalBalance,
    pnl: s.dailyPnl,
  }));

  const balanceTrendLabel = dailyPnl > 0 ? "日内扩张" : dailyPnl < 0 ? "回撤预警" : "等待突破";
  const winTrendLabel = (todayStats?.winRate ?? 0) >= 60 ? "策略占优" : (todayStats?.winRate ?? 0) >= 45 ? "震荡区间" : "需复盘";
  const positionTrendLabel = positionCount > 0 ? "已入场" : "空仓防守";

  return (
    <div className="space-y-5 p-4 lg:p-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl font-bold text-foreground">交易仪表盘</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">实时监控账户、信号质量与 ValueScan 在线状态。</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => mockMutation.mutate({})} disabled={mockMutation.isPending} className="text-xs">
            <Zap className="mr-1.5 h-3.5 w-3.5" />模拟信号
          </Button>
          <Button variant="outline" size="sm" onClick={() => mockSnapshotMutation.mutate()} disabled={mockSnapshotMutation.isPending} className="text-xs">
            <RefreshCw className={cn("mr-1.5 h-3.5 w-3.5", mockSnapshotMutation.isPending && "animate-spin")} />更新余额
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setRefreshTick(v => v + 1);
              snapshotQuery.refetch();
              historyQuery.refetch();
              todayStatsQuery.refetch();
              recentSignalsQuery.refetch();
              confluenceSignalsQuery.refetch();
              fearGreedQuery.refetch();
              vsWarnQuery.refetch();
            }}
            className="text-xs"
          >
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />全局刷新 #{refreshTick + 1}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
        {METRIC_GUIDES.map((item) => (
          <div key={item.title} className={cn("rounded-2xl border p-4", item.tone)}>
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
              <Info className="h-4 w-4" />
              {item.title}
            </div>
            <p className="text-xs leading-6 text-white/80">{item.description}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          title="账户总余额"
          value={totalBalance > 0 ? `$${totalBalance.toLocaleString("en-US", { maximumFractionDigits: 0 })}` : "--"}
          sub={`可用资金：$${availableBalance.toFixed(0)}`}
          helper="余额趋势用于判断风险预算是否充足，建议结合未实现盈亏同步观察。"
          icon={BarChart2}
          trend={dailyPnl > 0 ? "up" : dailyPnl < 0 ? "down" : "neutral"}
          trendLabel={balanceTrendLabel}
          loading={isOverviewLoading}
        />
        <StatCard
          title="今日盈亏"
          value={dailyPnl !== 0 ? `${dailyPnl >= 0 ? "+" : ""}$${dailyPnl.toFixed(2)}` : "--"}
          sub={`未实现：${unrealizedPnl >= 0 ? "+" : ""}$${unrealizedPnl.toFixed(2)}`}
          helper="若已实现盈亏与未实现盈亏出现背离，通常意味着仓位结构需要重平衡。"
          icon={TrendingUp}
          trend={dailyPnl > 0 ? "up" : dailyPnl < 0 ? "down" : "neutral"}
          trendLabel={dailyPnl > 0 ? "利润释放" : dailyPnl < 0 ? "风险暴露" : "暂无波动"}
          loading={isOverviewLoading}
        />
        <StatCard
          title="今日交易"
          value={`${todayStats?.totalTrades ?? 0} 笔`}
          sub={`胜率：${todayStats?.winRate?.toFixed(1) ?? "0"}%`}
          helper="胜率并非唯一判断指标，需与交易次数和平均盈亏一起评估策略稳定性。"
          icon={Activity}
          trend={(todayStats?.winRate ?? 0) > 50 ? "up" : (todayStats?.winRate ?? 0) < 50 ? "down" : "neutral"}
          trendLabel={winTrendLabel}
          loading={isOverviewLoading}
        />
        <StatCard
          title="当前持仓"
          value={`${positionCount} 个`}
          sub={`缓存：F${cacheStatus?.fomoCount ?? 0} / A${cacheStatus?.alphaCount ?? 0}`}
          helper="持仓数反映当前风险敞口，缓存信号越活跃，越需要关注自动交易阈值。"
          icon={Target}
          trend={positionCount > 0 ? "up" : "neutral"}
          trendLabel={positionTrendLabel}
          loading={isOverviewLoading || cacheStatusQuery.isLoading}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="gradient-card rounded-2xl p-4 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-foreground">账户余额走势</h3>
              <p className="text-xs text-muted-foreground">过去 24 小时资金曲线，用于观察波动与回撤节奏。</p>
            </div>
          </div>

          {isChartLoading ? (
            <LoadingPanel rows={0} height={180} />
          ) : chartData.length > 1 ? (
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="balanceGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="oklch(0.65 0.18 160)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="oklch(0.65 0.18 160)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.2 0.01 240)" />
                <XAxis dataKey="time" tick={{ fontSize: 10, fill: "oklch(0.55 0.01 240)" }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "oklch(0.55 0.01 240)" }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ backgroundColor: "oklch(0.11 0.01 240)", border: "1px solid oklch(0.2 0.01 240)", borderRadius: "8px", fontSize: "12px" }}
                  labelStyle={{ color: "oklch(0.92 0.01 240)" }}
                  itemStyle={{ color: "oklch(0.65 0.18 160)" }}
                />
                <Area type="monotone" dataKey="balance" stroke="oklch(0.65 0.18 160)" strokeWidth={2} fill="url(#balanceGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState
              icon={<BarChart2 className="h-10 w-10" />}
              title="账户曲线尚未建立"
              description="当前还没有足够的账户快照来生成资金曲线。先更新余额或接入真实账户，系统会自动开始累积历史序列。"
              hint="建议先执行一次余额同步，再保持 ValueScan 在线，让策略在真实流中持续记录表现。"
              action={
                <Button size="sm" variant="outline" onClick={() => mockSnapshotMutation.mutate()} disabled={mockSnapshotMutation.isPending}>
                  生成首个快照
                </Button>
              }
              className="py-8"
            />
          )}
        </div>

        <div className="gradient-card rounded-2xl p-4">
          <div className="mb-4 flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-profit signal-live" />
            <h3 className="text-sm font-semibold text-foreground">信号引擎状态</h3>
          </div>

          {cacheStatusQuery.isLoading || configQuery.isLoading || engineStatusQuery.isLoading ? (
            <LoadingPanel rows={5} height={72} />
          ) : (
            <div className="space-y-3 text-xs">
              <div className="flex justify-between"><span className="text-muted-foreground">FOMO 缓存</span><span className="font-mono text-fomo">{cacheStatus?.fomoCount ?? 0} 条</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Alpha 缓存</span><span className="font-mono text-alpha">{cacheStatus?.alphaCount ?? 0} 条</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">风险信号</span><span className="font-mono text-risk">{cacheStatus?.riskCount ?? 0} 条</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">已处理 ID</span><span className="font-mono text-muted-foreground">{cacheStatus?.processedIds ?? 0}</span></div>
              <div className="rounded-xl border border-primary/15 bg-primary/5 p-3 text-[11px] leading-5 text-muted-foreground">
                自动交易会优先关注时间窗口内的 FOMO + Alpha 共振，并结合最低评分过滤噪声信号。
              </div>
              <div className="border-t border-border pt-3">
                <div className="mb-1 flex justify-between"><span className="text-muted-foreground">时间窗口</span><span className="font-mono text-foreground">{config?.signalTimeWindow ?? 300}s</span></div>
                <div className="mb-2 flex justify-between"><span className="text-muted-foreground">最低评分</span><span className="font-mono text-foreground">{((config?.minSignalScore ?? 0.6) * 100).toFixed(0)}%</span></div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1 text-muted-foreground"><Power className="h-3 w-3" />自动交易</span>
                  <div className="flex items-center gap-1.5">
                    <span className={cn("font-medium", config?.autoTradingEnabled ? "text-profit" : "text-muted-foreground")}>
                      {config?.autoTradingEnabled ? "运行中" : "已停止"}
                    </span>
                    <Switch
                      checked={!!config?.autoTradingEnabled}
                      onCheckedChange={(checked) => {
                        if (config?.id) {
                          toggleAutoMutation.mutate({ id: config.id, enabled: checked });
                        } else {
                          toast.error("配置未加载，请刷新页面");
                        }
                      }}
                      disabled={toggleAutoMutation.isPending}
                      className="scale-75 origin-right"
                    />
                  </div>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <span className={cn("h-1.5 w-1.5 rounded-full", engineStatus?.live?.running ? "bg-red-500 animate-pulse" : "bg-muted-foreground")} />
                    实盘引擎
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className={cn("font-medium", engineStatus?.live?.running ? "text-red-400" : "text-muted-foreground")}>
                      {engineStatus?.live?.running ? "运行中" : "已停止"}
                    </span>
                    <Switch
                      checked={!!engineStatus?.live?.running}
                      onCheckedChange={(checked) => toggleLiveEngine.mutate({ enabled: checked })}
                      disabled={toggleLiveEngine.isPending}
                      className="scale-75 origin-right"
                    />
                  </div>
                </div>
                <div className="mt-1 flex items-center justify-between">
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <span className={cn("h-1.5 w-1.5 rounded-full", engineStatus?.paper?.running ? "bg-yellow-400 animate-pulse" : "bg-muted-foreground")} />
                    模拟盘引擎
                  </span>
                  <span className={cn("font-medium", engineStatus?.paper?.running ? "text-yellow-400" : "text-muted-foreground")}>
                    {engineStatus?.paper?.running ? "运行中" : "已停止"}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="gradient-card rounded-2xl p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">最新信号</h3>
            <span className="text-xs text-muted-foreground">{recentSignals.length} 条</span>
          </div>
          {isSignalLoading ? (
            <LoadingPanel rows={6} height={64} />
          ) : recentSignals.length > 0 ? (
            <div className="space-y-2">
              {recentSignals.map((s: any) => (
                <div key={s.id} className="slide-in flex items-center gap-3 rounded-xl border border-border/50 bg-accent/30 px-3 py-2.5">
                  <div className={cn("rounded border px-2 py-0.5 text-xs font-medium", SIGNAL_TYPE_COLOR[s.signalType] ?? "text-muted-foreground bg-muted border-border")}>
                    {SIGNAL_TYPE_LABEL[s.signalType] ?? s.signalType}
                  </div>
                  <span className="flex-1 text-sm font-mono font-medium text-foreground">{s.symbol}</span>
                  <span className="text-xs text-muted-foreground">{new Date(s.createdAt).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<Zap className="h-10 w-10" />}
              title="信号流暂时静默"
              description="还没有接收到新的策略信号。你可以先生成模拟信号，或确认 ValueScan 在线连接已经建立。"
              hint="若长时间无数据，请优先检查自动登录是否成功、Token 是否已刷新，以及订阅任务是否在运行。"
              action={<Button size="sm" variant="outline" onClick={() => mockMutation.mutate({})}>生成测试信号</Button>}
              className="py-8"
            />
          )}
        </div>

        <div className="gradient-card rounded-2xl p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">聚合信号</h3>
            <span className="text-xs text-muted-foreground">FOMO + Alpha 共振</span>
          </div>
          {isSignalLoading ? (
            <LoadingPanel rows={5} height={60} />
          ) : confluenceSignals.length > 0 ? (
            <div className="space-y-2">
              {confluenceSignals.map((cs: any) => (
                <div key={cs.id} className="slide-in rounded-xl border border-border/60 bg-accent/40 p-3">
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="text-sm font-mono font-bold text-foreground">{cs.symbol}</span>
                    <div
                      className={cn(
                        "rounded px-2 py-0.5 text-xs font-medium",
                        cs.status === "executed"
                          ? "bg-profit-subtle text-profit"
                          : cs.status === "pending"
                            ? "bg-fomo-subtle text-fomo"
                            : cs.status === "skipped"
                              ? "bg-muted text-muted-foreground"
                              : "bg-loss-subtle text-loss",
                      )}
                    >
                      {cs.status === "executed" ? "已执行" : cs.status === "pending" ? "待处理" : cs.status === "skipped" ? "已跳过" : "失败"}
                    </div>
                  </div>
                  <div className="mb-2 flex justify-between text-xs text-muted-foreground">
                    <span>评分 <span className="font-mono text-primary">{(cs.score * 100).toFixed(0)}%</span></span>
                    <span>时差 {cs.timeGap.toFixed(0)}s</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${cs.score * 100}%` }} />
                  </div>
                  <div className="mt-2 text-[11px] leading-5 text-muted-foreground">
                    共振评分越高，说明同币种在时间窗口内获得更强的一致性确认，更适合自动执行。
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<Target className="h-10 w-10" />}
              title="尚未形成高质量共振"
              description="系统还没有在时间窗口内同时捕获 FOMO 与 Alpha。当前更适合继续观察，避免低质量追单。"
              hint="你可以缩短时间窗口、降低最低评分做测试，但正式环境建议维持更严格的过滤阈值。"
              className="py-8"
            />
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {fearGreed?.success ? (
          <div className="gradient-card rounded-2xl p-4">
            <div className="mb-3 flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
              <h3 className="text-sm font-semibold text-foreground">市场情绪指数</h3>
              <span className="text-xs text-muted-foreground">ValueScan 实时</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="relative h-16 w-16 flex-shrink-0">
                <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
                  <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="16" />
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke={fearGreed.color}
                    strokeWidth="16"
                    strokeDasharray={`${2 * Math.PI * 40 * (fearGreed.value / 100)} ${2 * Math.PI * 40}`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-lg font-bold" style={{ color: fearGreed.color }}>{fearGreed.value}</span>
                </div>
              </div>
              <div>
                <div className="text-base font-bold" style={{ color: fearGreed.color }}>{fearGreed.label}</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {fearGreed.value <= 20 ? "极度恐惧：市场可能出现恐慌错杀，适合等待反转确认。" : fearGreed.value <= 40 ? "恐惧：适合轻仓试探，避免追涨。" : fearGreed.value <= 60 ? "中性：信号质量与成交量比方向判断更重要。" : fearGreed.value <= 80 ? "贪婪：趋势虽强，但需提高止盈纪律。" : "极度贪婪：更应防止高位接力与波动回撤。"}
                </div>
                <div className="mt-2 flex gap-2 text-xs text-muted-foreground">
                  <span>昨：{fearGreed.data?.yesterday ?? "—"}</span>
                  <span>周：{fearGreed.data?.lastWeek ?? "—"}</span>
                  <span>月：{fearGreed.data?.lastMonth ?? "—"}</span>
                </div>
              </div>
            </div>
          </div>
        ) : isValueScanLoading ? (
          <div className="gradient-card rounded-2xl p-4"><LoadingPanel rows={2} height={120} /></div>
        ) : null}

        <div className="gradient-card rounded-2xl p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
              <h3 className="text-sm font-semibold text-foreground">ValueScan 实时预警</h3>
            </div>
            <span className="text-xs text-muted-foreground">{vsWarn?.data?.length ?? 0} 条</span>
          </div>
          {isValueScanLoading ? (
            <LoadingPanel rows={5} height={48} />
          ) : vsWarn?.data && vsWarn.data.length > 0 ? (
            <div className="space-y-1.5">
              {vsWarn.data.slice(0, 5).map((s: any) => {
                let content: any = {};
                try {
                  content = typeof s.content === "string" ? JSON.parse(s.content) : (s.content ?? {});
                } catch {}
                const fmType = content.fundsMovementType || 0;
                const SIGNAL_NAMES: Record<number, string> = { 1: "FOMO多", 2: "FOMO空", 3: "Alpha多", 4: "Alpha空", 5: "风险多", 6: "风险空", 7: "鲸买", 8: "鲸卖", 9: "流入", 10: "流出", 11: "资金入", 12: "资金出", 13: "转账" };
                const category = content.alpha ? "alpha" : content.fomo ? "fomo" : fmType >= 7 && fmType <= 8 ? "whale" : fmType >= 9 ? "exchange" : fmType >= 1 && fmType <= 2 ? "fomo" : fmType >= 3 && fmType <= 4 ? "alpha" : "ai";
                const direction = fmType % 2 === 1 ? "long" : fmType % 2 === 0 && fmType > 0 ? "short" : "neutral";
                const symbol = content.symbol || s.title || "";
                const icon = content.icon || "";
                const signalName = SIGNAL_NAMES[fmType] || s.title || "VS信号";
                return (
                  <div key={s.id} className="flex items-center gap-2 border-b border-border/30 py-1.5 last:border-0">
                    {icon && <img src={icon} alt={symbol} className="h-5 w-5 rounded-full flex-shrink-0" onError={(e) => (e.currentTarget.style.display = "none")} />}
                    <span className="flex-1 text-sm font-mono font-bold text-foreground">{symbol}</span>
                    <span
                      className={cn(
                        "rounded border px-1.5 py-0.5 text-xs",
                        category === "fomo"
                          ? "border-orange-500/30 bg-orange-500/10 text-orange-400"
                          : category === "alpha"
                            ? "border-purple-500/30 bg-purple-500/10 text-purple-400"
                            : category === "whale"
                              ? "border-blue-500/30 bg-blue-500/10 text-blue-400"
                              : "border-cyan-500/30 bg-cyan-500/10 text-cyan-400",
                      )}
                    >
                      {signalName}
                    </span>
                    <span className={cn("text-xs font-mono", direction === "long" ? "text-green-400" : direction === "short" ? "text-red-400" : "text-muted-foreground")}>
                      {direction === "long" ? "▲" : direction === "short" ? "▼" : "●"}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState
              icon={<Activity className="h-10 w-10" />}
              title="ValueScan 实时流暂未回传数据"
              description="站点已准备好接收 ValueScan 预警，但当前未收到最近的预警记录。"
              hint="通常意味着新账号刚接入、在线连接刚恢复，或当前市场时段没有满足触发条件的资金异动。"
              className="py-8"
            />
          )}
        </div>
      </div>

      {todayStats && todayStats.totalTrades > 0 && (
        <div className="gradient-card rounded-2xl p-4">
          <h3 className="mb-3 text-sm font-semibold text-foreground">今日交易统计</h3>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="text-center">
              <div className="text-xl font-bold font-mono text-foreground">{todayStats.totalTrades}</div>
              <div className="text-xs text-muted-foreground">总交易数</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold font-mono text-profit">{todayStats.winTrades}</div>
              <div className="text-xs text-muted-foreground">盈利交易</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold font-mono text-loss">{todayStats.lossTrades}</div>
              <div className="text-xs text-muted-foreground">亏损交易</div>
            </div>
            <div className="text-center">
              <div className={cn("text-xl font-bold font-mono", todayStats.winRate >= 50 ? "text-profit" : "text-loss")}>
                {todayStats.winRate.toFixed(1)}%
              </div>
              <div className="text-xs text-muted-foreground">胜率</div>
            </div>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-profit transition-all duration-500" style={{ width: `${todayStats.winRate}%` }} />
          </div>
        </div>
      )}
    </div>
  );
}
