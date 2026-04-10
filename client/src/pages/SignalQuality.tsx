import { trpc } from "@/lib/trpc";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { RefreshCw, TrendingUp, TrendingDown, Minus, Shield, Clock, BarChart2 } from "lucide-react";

export default function SignalQuality() {
  const { data, isLoading, refetch, isFetching } = trpc.strategyStats.signalQualityDashboard.useQuery(
    undefined,
    { refetchInterval: 30000 }
  );

  const btcTrendQuery = trpc.strategyStats.btcTrend.useQuery(undefined, { refetchInterval: 60000 });

  const btcTrend = btcTrendQuery.data?.trend ?? data?.btcTrend ?? "unknown";
  const cooldowns = data?.cooldowns ?? {};
  const marketScore = data?.marketScore ?? 0;
  const marketStats = data?.marketStats;
  const scoreDistribution = data?.scoreDistribution ?? [];
  const avgScore = data?.avgScore ?? 0;

  // 动态仓位规则
  const positionRules = [
    { condition: "信号质量 > 80%", position: "100%", desc: "高质量信号，满仓" },
    { condition: "信号质量 60-80%", position: "60%", desc: "中等质量，6成仓" },
    { condition: "信号质量 40-60%", position: "30%", desc: "低质量，3成仓" },
    { condition: "信号质量 < 40%", position: "0%", desc: "质量过低，不开仓" },
  ];

  const getTrendIcon = () => {
    if (btcTrend === "up") return <TrendingUp size={16} className="text-green-400" />;
    if (btcTrend === "down") return <TrendingDown size={16} className="text-red-400" />;
    return <Minus size={16} className="text-yellow-400" />;
  };

  const getTrendColor = () => {
    if (btcTrend === "up") return "text-green-400";
    if (btcTrend === "down") return "text-red-400";
    return "text-yellow-400";
  };

  const getTrendLabel = () => {
    if (btcTrend === "up") return "上涨趋势";
    if (btcTrend === "down") return "下跌趋势";
    return "震荡横盘";
  };

  const getScoreColor = (s: number) => s >= 60 ? "text-green-400" : s >= 40 ? "text-yellow-400" : "text-red-400";

  // 质量指标统计
  const totalSignals = marketStats?.totalCount ?? 0;
  const validSignals = (marketStats?.fomoCount ?? 0) + (marketStats?.alphaCount ?? 0);
  const riskSignals = marketStats?.riskCount ?? 0;
  const qualityPct = totalSignals > 0 ? ((validSignals / totalSignals) * 100).toFixed(1) : "0.0";

  const qualityMetrics = [
    { label: "近1小时信号", value: String(totalSignals), color: "text-foreground" },
    { label: "有效信号", value: String(validSignals), color: "text-green-400" },
    { label: "风险信号", value: String(riskSignals), color: "text-red-400" },
    { label: "信号质量", value: `${qualityPct}%`, color: "text-green-400" },
  ];

  return (
    <div>
      <PageHeader
        title="🛡 信号质量仪表盘"
        description="动态仓位 · 冷却期 · BTC 趋势过滤"
        actions={
          <Button
            variant="outline"
            size="sm"
            className="text-xs"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            <RefreshCw size={14} className={`mr-1 ${isFetching ? "animate-spin" : ""}`} /> 刷新
          </Button>
        }
      />

      {/* Quality Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {isLoading
          ? [1, 2, 3, 4].map((i) => (
              <div key={i} className="terminal-card p-4 text-center animate-pulse">
                <div className="h-8 bg-secondary rounded w-1/2 mx-auto mb-2" />
                <div className="h-3 bg-secondary rounded w-3/4 mx-auto" />
              </div>
            ))
          : qualityMetrics.map((m) => (
              <div key={m.label} className="terminal-card p-4 text-center">
                <p className={`text-2xl stat-number font-bold ${m.color}`}>{m.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{m.label}</p>
              </div>
            ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {/* BTC Trend */}
        <div className="terminal-card p-4">
          <h3 className="text-sm font-medium mb-4 flex items-center gap-2">
            <BarChart2 size={14} /> BTC 趋势过滤器
          </h3>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-12 bg-secondary rounded animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-secondary/30 rounded-lg">
                <p className="text-[10px] text-muted-foreground">BTC 趋势</p>
                <p className={`text-sm stat-number font-bold mt-1 flex items-center gap-1 ${getTrendColor()}`}>
                  {getTrendIcon()} {getTrendLabel()}
                </p>
              </div>
              <div className="p-3 bg-secondary/30 rounded-lg">
                <p className="text-[10px] text-muted-foreground">市场评分</p>
                <p className={`text-sm stat-number font-bold mt-1 ${getScoreColor(marketScore)}`}>{marketScore} 分</p>
              </div>
              <div className="p-3 bg-secondary/30 rounded-lg">
                <p className="text-[10px] text-muted-foreground">平均信号评分</p>
                <p className={`text-sm stat-number font-bold mt-1 ${getScoreColor(avgScore * 100)}`}>
                  {(avgScore * 100).toFixed(1)}%
                </p>
              </div>
              <div className="p-3 bg-secondary/30 rounded-lg">
                <p className="text-[10px] text-muted-foreground">监控交易对</p>
                <p className="text-sm stat-number font-bold mt-1 text-foreground">
                  {marketStats?.uniqueSymbols ?? 0} 个
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Cooldown Rules */}
        <div className="terminal-card p-4">
          <h3 className="text-sm font-medium mb-4 flex items-center gap-2">
            <Clock size={14} /> 冷却期状态
          </h3>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-14 bg-secondary rounded animate-pulse" />
              ))}
            </div>
          ) : Object.keys(cooldowns).length > 0 ? (
            <div className="space-y-2">
              {Object.entries(cooldowns).map(([symbol, info]: [string, any]) => (
                <div key={symbol} className="p-3 rounded-lg border border-red-400/20 bg-red-400/5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-foreground">{symbol}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-400/10 text-red-400">冷却中</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {info.reason ?? "冷却期保护中"} · 剩余 {Math.max(0, Math.ceil(((info.until ?? 0) - Date.now()) / 60000))} 分钟
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {[
                { name: "连续亏损冷却", desc: "连续3次亏损后暂停交易2小时", active: false },
                { name: "高波动冷却", desc: "BTC 1小时波动>5%时暂停开仓", active: false },
                { name: "资金费率冷却", desc: "资金费率>0.1%时降低仓位50%", active: true },
              ].map((r) => (
                <div key={r.name} className={`p-3 rounded-lg border ${r.active ? "border-green-400/20 bg-green-400/5" : "border-border bg-secondary/30"}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-foreground">{r.name}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${r.active ? "bg-green-400/10 text-green-400" : "bg-secondary text-muted-foreground"}`}>
                      {r.active ? "启用" : "待触发"}
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">{r.desc}</p>
                </div>
              ))}
              <p className="text-[10px] text-green-400 text-center pt-1">✓ 当前无冷却期限制</p>
            </div>
          )}
        </div>
      </div>

      {/* Score Distribution */}
      {scoreDistribution.length > 0 && (
        <div className="terminal-card p-4 mb-6">
          <h3 className="text-sm font-medium mb-4 flex items-center gap-2">
            <Shield size={14} /> 信号评分分布
          </h3>
          <div className="space-y-2">
            {scoreDistribution.map((d) => (
              <div key={d.range} className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground w-20 shrink-0">{d.range}</span>
                <div className="flex-1 h-4 bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${Math.min(100, (d.count / Math.max(1, data?.recentConfluenceCount ?? 1)) * 100)}%`,
                      backgroundColor: d.color,
                    }}
                  />
                </div>
                <span className="text-xs font-bold text-foreground w-8 text-right">{d.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Dynamic Position */}
      <div className="terminal-card p-4">
        <h3 className="text-sm font-medium mb-4">动态仓位管理</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {positionRules.map((r) => (
            <div key={r.condition} className="p-3 bg-secondary/30 rounded-lg">
              <p className="text-xs font-medium text-foreground">{r.condition}</p>
              <p className="text-lg stat-number font-bold text-green-400 mt-2">{r.position}</p>
              <p className="text-[10px] text-muted-foreground mt-1">{r.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
