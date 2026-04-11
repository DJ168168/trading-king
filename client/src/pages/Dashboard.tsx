// @ts-nocheck
import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Zap, Activity, Target, Shield, RefreshCw, BarChart2, Power } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";

function StatCard({ title, value, sub, icon: Icon, trend, className }: {
  title: string; value: string; sub?: string; icon: any; trend?: "up" | "down" | "neutral"; className?: string;
}) {
  return (
    <div className={cn("gradient-card rounded-xl p-4 relative overflow-hidden", className)}>
      <div className="flex items-start justify-between mb-3">
        <div className="p-2 rounded-lg bg-accent">
          <Icon className="w-4 h-4 text-primary" />
        </div>
        {trend && (
          <div className={cn("flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full",
            trend === "up" ? "bg-profit-subtle text-profit" :
            trend === "down" ? "bg-loss-subtle text-loss" : "bg-muted text-muted-foreground"
          )}>
            {trend === "up" ? <TrendingUp className="w-3 h-3" /> : trend === "down" ? <TrendingDown className="w-3 h-3" /> : null}
            {trend === "up" ? "盈利" : trend === "down" ? "亏损" : "持平"}
          </div>
        )}
      </div>
      <div className="text-2xl font-bold font-mono text-foreground mb-1">{value}</div>
      <div className="text-xs text-muted-foreground">{title}</div>
      {sub && <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>}
    </div>
  );
}

const SIGNAL_TYPE_LABEL: Record<string, string> = {
  FOMO: "FOMO", ALPHA: "ALPHA", RISK: "风险", FALL: "下跌",
  FUND_MOVE: "资金", LISTING: "上市", FUND_ESCAPE: "逃跑", FUND_ABNORMAL: "异常"
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

export default function Dashboard() {
  const [refreshKey, setRefreshKey] = useState(0);

  const { data: snapshot, refetch: refetchSnapshot } = trpc.account.snapshot.useQuery(undefined, { refetchInterval: 30000 });
  const { data: history } = trpc.account.history.useQuery({ hours: 24 }, { refetchInterval: 60000 });
  const { data: todayStats } = trpc.trades.todayStats.useQuery(undefined, { refetchInterval: 15000 });
  const { data: recentSignals } = trpc.signals.list.useQuery({ limit: 8 }, { refetchInterval: 5000 });
  const { data: confluenceSignals } = trpc.signals.confluenceList.useQuery({ limit: 5 }, { refetchInterval: 5000 });
  const { data: positions } = trpc.positions.list.useQuery(undefined, { refetchInterval: 10000 });
  const { data: config } = trpc.config.active.useQuery();
  const { data: cacheStatus } = trpc.signals.cacheStatus.useQuery(undefined, { refetchInterval: 5000 });
  const { data: fearGreed } = trpc.valueScan.fearGreed.useQuery(undefined, { refetchInterval: 60000 });
  const { data: vsWarn } = trpc.valueScan.warnMessages.useQuery({ pageNum: 1, pageSize: 6 }, { refetchInterval: 30000 });
  const { data: engineStatus } = trpc.paperTrading.engineStatus.useQuery(undefined, { refetchInterval: 5000 });
  const toggleLiveEngine = trpc.paperTrading.toggleLiveEngine.useMutation({
    onSuccess: (data) => {
      utils.paperTrading.engineStatus.invalidate();
      toast.success(data.running ? "🔴 实盘引擎已启动！每60秒轮询信号" : "⏸ 实盘引擎已暂停");
    },
    onError: () => toast.error("切换实盘引擎失败")
  });

  const mockMutation = trpc.signals.mock.useMutation({
    onSuccess: (data) => {
      if (data.confluence) {
        toast.success(`🎯 聚合信号触发！${data.confluence.symbol} 评分: ${(data.confluence.score * 100).toFixed(0)}%`);
      } else {
        toast.info(`📡 信号已接收: ${data.signal.symbol} (${data.signal.messageType})`);
      }
    }
  });

  const mockSnapshotMutation = trpc.account.mockSnapshot.useMutation({
    onSuccess: () => { refetchSnapshot(); toast.success("账户数据已更新"); }
  });
  const utils = trpc.useUtils();
  const toggleAutoMutation = trpc.config.toggleAutoTrading.useMutation({
    onSuccess: (_, vars) => {
      utils.config.active.invalidate();
      toast.success(vars.enabled ? "🚀 自动交易已开启！等待 ValueScan 信号触发" : "⏸ 自动交易已暂停");
    },
    onError: () => toast.error("切换失败，请重试")
  });

  const totalBalance = snapshot?.totalBalance ?? 0;
  const availableBalance = snapshot?.availableBalance ?? 0;
  const unrealizedPnl = snapshot?.unrealizedPnl ?? 0;
  const dailyPnl = snapshot?.dailyPnl ?? 0;
  const positionCount = positions?.length ?? 0;

  // 图表数据
  const chartData = (history ?? []).map((s: any, i: number) => ({
    time: new Date(s.createdAt).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" }),
    balance: s.totalBalance,
    pnl: s.dailyPnl,
  }));

  return (
    <div className="p-4 lg:p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">交易仪表盘</h1>
          <p className="text-sm text-muted-foreground mt-0.5">实时监控您的量化交易系统</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => mockMutation.mutate({})} disabled={mockMutation.isPending} className="text-xs">
            <Zap className="w-3.5 h-3.5 mr-1.5" />模拟信号
          </Button>
          <Button variant="outline" size="sm" onClick={() => mockSnapshotMutation.mutate()} disabled={mockSnapshotMutation.isPending} className="text-xs">
            <RefreshCw className={cn("w-3.5 h-3.5 mr-1.5", mockSnapshotMutation.isPending && "animate-spin")} />更新余额
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard title="账户总余额" value={totalBalance > 0 ? `$${totalBalance.toLocaleString("en-US", { maximumFractionDigits: 0 })}` : "--"}
          sub={`可用: $${availableBalance.toFixed(0)}`} icon={BarChart2}
          trend={dailyPnl > 0 ? "up" : dailyPnl < 0 ? "down" : "neutral"} />
        <StatCard title="今日盈亏" value={dailyPnl !== 0 ? `${dailyPnl >= 0 ? "+" : ""}$${dailyPnl.toFixed(2)}` : "--"}
          sub={`未实现: ${unrealizedPnl >= 0 ? "+" : ""}$${unrealizedPnl.toFixed(2)}`} icon={TrendingUp}
          trend={dailyPnl > 0 ? "up" : dailyPnl < 0 ? "down" : "neutral"} />
        <StatCard title="今日交易" value={`${todayStats?.totalTrades ?? 0} 笔`}
          sub={`胜率: ${todayStats?.winRate?.toFixed(1) ?? "0"}%`} icon={Activity}
          trend={todayStats && todayStats.winRate > 50 ? "up" : todayStats && todayStats.winRate < 50 ? "down" : "neutral"} />
        <StatCard title="当前持仓" value={`${positionCount} 个`}
          sub={`信号缓存: F${cacheStatus?.fomoCount ?? 0}/A${cacheStatus?.alphaCount ?? 0}`} icon={Target}
          trend="neutral" />
      </div>

      {/* Charts + Signals */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Balance Chart */}
        <div className="lg:col-span-2 gradient-card rounded-xl p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-foreground">账户余额走势</h3>
              <p className="text-xs text-muted-foreground">过去24小时</p>
            </div>
          </div>
          {chartData.length > 1 ? (
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="balanceGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="oklch(0.65 0.18 160)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="oklch(0.65 0.18 160)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.2 0.01 240)" />
                <XAxis dataKey="time" tick={{ fontSize: 10, fill: "oklch(0.55 0.01 240)" }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "oklch(0.55 0.01 240)" }} tickLine={false} axisLine={false} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                <Tooltip contentStyle={{ backgroundColor: "oklch(0.11 0.01 240)", border: "1px solid oklch(0.2 0.01 240)", borderRadius: "8px", fontSize: "12px" }}
                  labelStyle={{ color: "oklch(0.92 0.01 240)" }} itemStyle={{ color: "oklch(0.65 0.18 160)" }} />
                <Area type="monotone" dataKey="balance" stroke="oklch(0.65 0.18 160)" strokeWidth={2} fill="url(#balanceGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-40 flex items-center justify-center text-muted-foreground text-sm">
              <div className="text-center">
                <BarChart2 className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p>暂无历史数据</p>
                <p className="text-xs mt-1">点击"更新余额"生成模拟数据</p>
              </div>
            </div>
          )}
        </div>

        {/* Signal Engine Status */}
        <div className="gradient-card rounded-xl p-4">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2 h-2 rounded-full bg-profit signal-live" />
            <h3 className="text-sm font-semibold text-foreground">信号引擎状态</h3>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">FOMO 缓存</span>
              <span className="text-xs font-mono text-fomo font-medium">{cacheStatus?.fomoCount ?? 0} 条</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">Alpha 缓存</span>
              <span className="text-xs font-mono text-alpha font-medium">{cacheStatus?.alphaCount ?? 0} 条</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">风险信号</span>
              <span className="text-xs font-mono text-risk font-medium">{cacheStatus?.riskCount ?? 0} 条</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">已处理 ID</span>
              <span className="text-xs font-mono text-muted-foreground">{cacheStatus?.processedIds ?? 0}</span>
            </div>
            <div className="border-t border-border pt-3">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs text-muted-foreground">时间窗口</span>
                <span className="text-xs font-mono text-foreground">{config?.signalTimeWindow ?? 300}s</span>
              </div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs text-muted-foreground">最低评分</span>
                <span className="text-xs font-mono text-foreground">{((config?.minSignalScore ?? 0.6) * 100).toFixed(0)}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Power className="w-3 h-3" />自动交易
                </span>
                <div className="flex items-center gap-1.5">
                  <span className={cn("text-xs font-medium", config?.autoTradingEnabled ? "text-profit" : "text-muted-foreground")}>
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
              {/* 实盘引擎状态 */}
              <div className="flex justify-between items-center mt-2">
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <span className={cn("w-1.5 h-1.5 rounded-full", engineStatus?.live?.running ? "bg-red-500 animate-pulse" : "bg-muted-foreground")} />
                  实盘引擎
                </span>
                <div className="flex items-center gap-1.5">
                  <span className={cn("text-xs font-medium", engineStatus?.live?.running ? "text-red-400" : "text-muted-foreground")}>
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
              {/* 模拟盘引擎状态 */}
              <div className="flex justify-between items-center mt-1">
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <span className={cn("w-1.5 h-1.5 rounded-full", engineStatus?.paper?.running ? "bg-yellow-400 animate-pulse" : "bg-muted-foreground")} />
                  模拟盘引擎
                </span>
                <span className={cn("text-xs font-medium", engineStatus?.paper?.running ? "text-yellow-400" : "text-muted-foreground")}>
                  {engineStatus?.paper?.running ? "运行中" : "已停止"}
                </span>
              </div>
              {engineStatus?.live?.lastOrderTime && (
                <div className="mt-2 text-xs text-muted-foreground">
                  实盘最近下单: {new Date(engineStatus.live.lastOrderTime).toLocaleTimeString("zh-CN")}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Signals + Confluence */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent Signals */}
        <div className="gradient-card rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-foreground">最新信号</h3>
            <span className="text-xs text-muted-foreground">{recentSignals?.length ?? 0} 条</span>
          </div>
          <div className="space-y-2">
            {recentSignals && recentSignals.length > 0 ? recentSignals.map((s: any) => (
              <div key={s.id} className="flex items-center gap-3 py-2 border-b border-border/50 last:border-0 slide-in">
                <div className={cn("px-2 py-0.5 rounded text-xs font-medium border", SIGNAL_TYPE_COLOR[s.signalType] ?? "text-muted-foreground bg-muted border-border")}>
                  {SIGNAL_TYPE_LABEL[s.signalType] ?? s.signalType}
                </div>
                <span className="text-sm font-mono font-medium text-foreground flex-1">{s.symbol}</span>
                <span className="text-xs text-muted-foreground">
                  {new Date(s.createdAt).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                </span>
              </div>
            )) : (
              <div className="text-center py-6 text-muted-foreground text-sm">
                <Zap className="w-6 h-6 mx-auto mb-2 opacity-30" />
                <p>暂无信号</p>
                <p className="text-xs mt-1">点击"模拟信号"生成测试数据</p>
              </div>
            )}
          </div>
        </div>

        {/* Confluence Signals */}
        <div className="gradient-card rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-foreground">聚合信号</h3>
            <span className="text-xs text-muted-foreground">FOMO + Alpha 匹配</span>
          </div>
          <div className="space-y-2">
            {confluenceSignals && confluenceSignals.length > 0 ? confluenceSignals.map((cs: any) => (
              <div key={cs.id} className="p-3 bg-accent rounded-lg border border-border/50 slide-in">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-mono font-bold text-foreground">{cs.symbol}</span>
                  <div className={cn("px-2 py-0.5 rounded text-xs font-medium",
                    cs.status === "executed" ? "bg-profit-subtle text-profit" :
                    cs.status === "pending" ? "bg-fomo-subtle text-fomo" :
                    cs.status === "skipped" ? "bg-muted text-muted-foreground" : "bg-loss-subtle text-loss"
                  )}>
                    {cs.status === "executed" ? "已执行" : cs.status === "pending" ? "待处理" : cs.status === "skipped" ? "已跳过" : "失败"}
                  </div>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>评分: <span className="text-primary font-mono font-medium">{(cs.score * 100).toFixed(0)}%</span></span>
                  <span>时差: <span className="font-mono">{cs.timeGap.toFixed(0)}s</span></span>
                  <span className="ml-auto">{new Date(cs.createdAt).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}</span>
                </div>
              </div>
            )) : (
              <div className="text-center py-6 text-muted-foreground text-sm">
                <Target className="w-6 h-6 mx-auto mb-2 opacity-30" />
                <p>暂无聚合信号</p>
                <p className="text-xs mt-1">需要 FOMO + Alpha 信号在时间窗口内同时出现</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ValueScan 实时数据 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 恐惧贪婪指数 */}
        {fearGreed?.success && (
          <div className="gradient-card rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <h3 className="text-sm font-semibold text-foreground">市场情绪指数</h3>
              <span className="text-xs text-muted-foreground">ValueScan 实时</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="relative w-16 h-16 flex-shrink-0">
                <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                  <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="16" />
                  <circle cx="50" cy="50" r="40" fill="none" stroke={fearGreed.color}
                    strokeWidth="16"
                    strokeDasharray={`${2 * Math.PI * 40 * (fearGreed.value / 100)} ${2 * Math.PI * 40}`}
                    strokeLinecap="round" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-lg font-bold" style={{ color: fearGreed.color }}>{fearGreed.value}</span>
                </div>
              </div>
              <div>
                <div className="text-base font-bold" style={{ color: fearGreed.color }}>{fearGreed.label}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {fearGreed.value <= 20 ? "极度恐惧 → 考虑抄底" :
                   fearGreed.value <= 40 ? "恐惧 → 谨慎做多" :
                   fearGreed.value <= 60 ? "中性 → 观望为主" :
                   fearGreed.value <= 80 ? "贪婪 → 注意风险" :
                   "极度贪婪 → 考虑减仓"}
                </div>
                <div className="flex gap-2 mt-2 text-xs text-muted-foreground">
                  <span>昨: {fearGreed.data?.yesterday ?? "—"}</span>
                  <span>周: {fearGreed.data?.lastWeek ?? "—"}</span>
                  <span>月: {fearGreed.data?.lastMonth ?? "—"}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ValueScan 实时预警信号 */}
        <div className="gradient-card rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <h3 className="text-sm font-semibold text-foreground">ValueScan 实时预警</h3>
            </div>
            <span className="text-xs text-muted-foreground">{vsWarn?.data?.length ?? 0} 条</span>
          </div>
          <div className="space-y-1.5">
            {vsWarn?.data && vsWarn.data.length > 0 ? vsWarn.data.slice(0, 5).map((s: any) => {
              // warnMessages 返回原始格式，解析 content 字段
              let content: any = {};
              try { content = typeof s.content === "string" ? JSON.parse(s.content) : (s.content ?? {}); } catch {}
              const fmType = content.fundsMovementType || 0;
              const SIGNAL_NAMES: Record<number, string> = { 1: "FOMO多", 2: "FOMO空", 3: "Alpha多", 4: "Alpha空", 5: "风险多", 6: "风险空", 7: "鲸买", 8: "鲸卖", 9: "流入", 10: "流出", 11: "资金入", 12: "资金出", 13: "转账" };
              const category = content.alpha ? "alpha" : content.fomo ? "fomo" : fmType >= 7 && fmType <= 8 ? "whale" : fmType >= 9 ? "exchange" : fmType >= 1 && fmType <= 2 ? "fomo" : fmType >= 3 && fmType <= 4 ? "alpha" : "ai";
              const direction = fmType % 2 === 1 ? "long" : fmType % 2 === 0 && fmType > 0 ? "short" : "neutral";
              const symbol = content.symbol || s.title || "";
              const icon = content.icon || "";
              const signalName = SIGNAL_NAMES[fmType] || s.title || "VS信号";
              return (
              <div key={s.id} className="flex items-center gap-2 py-1.5 border-b border-border/30 last:border-0">
                {icon && <img src={icon} alt={symbol} className="w-5 h-5 rounded-full flex-shrink-0" onError={e => (e.currentTarget.style.display = "none")} />}
                <span className="text-sm font-mono font-bold text-foreground flex-1">{symbol}</span>
                <span className={cn("text-xs px-1.5 py-0.5 rounded border",
                  category === "fomo" ? "bg-orange-500/10 text-orange-400 border-orange-500/30" :
                  category === "alpha" ? "bg-purple-500/10 text-purple-400 border-purple-500/30" :
                  category === "whale" ? "bg-blue-500/10 text-blue-400 border-blue-500/30" :
                  "bg-cyan-500/10 text-cyan-400 border-cyan-500/30"
                )}>{signalName}</span>
                <span className={cn("text-xs font-mono", direction === "long" ? "text-green-400" : "text-red-400")}>
                  {direction === "long" ? "▲" : "▼"}
                </span>
              </div>
              );
            }) : (
              <div className="text-center py-4 text-muted-foreground text-xs">
                <Activity className="w-5 h-5 mx-auto mb-1 opacity-30" />
                正在加载 ValueScan 实时信号...
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Today's Trade Stats */}
      {todayStats && todayStats.totalTrades > 0 && (
        <div className="gradient-card rounded-xl p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">今日交易统计</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
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
          {/* Win rate bar */}
          <div className="mt-3 h-2 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-profit rounded-full transition-all duration-500" style={{ width: `${todayStats.winRate}%` }} />
          </div>
        </div>
      )}
    </div>
  );
}
