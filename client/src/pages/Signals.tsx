import { useMemo, useState } from "react";
import { Filter, RefreshCw, Shield, Target, TrendingUp, Zap } from "lucide-react";
import { toast } from "sonner";
import EmptyState from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";

const SIGNAL_COLORS: Record<string, string> = {
  FOMO: "text-fomo bg-fomo-subtle border-fomo/20",
  ALPHA: "text-alpha bg-alpha-subtle border-alpha/20",
  RISK: "text-risk bg-risk-subtle border-risk/20",
  FALL: "text-loss bg-loss-subtle border-loss/20",
  FUND_MOVE: "text-primary bg-primary/10 border-primary/20",
  LISTING: "text-profit bg-profit-subtle border-profit/20",
  FUND_ESCAPE: "text-fomo bg-fomo-subtle border-fomo/20",
  FUND_ABNORMAL: "text-risk bg-risk-subtle border-risk/20",
};

const SIGNAL_LABELS: Record<string, string> = {
  FOMO: "FOMO爆量",
  ALPHA: "Alpha信号",
  RISK: "风险预警",
  FALL: "暴跌信号",
  FUND_MOVE: "资金流动",
  LISTING: "新币上市",
  FUND_ESCAPE: "资金逃跑",
  FUND_ABNORMAL: "资金异常",
};

const MSG_TYPE_LABELS: Record<number, string> = {
  100: "暴跌",
  108: "资金异常",
  109: "资金逃跑",
  110: "Alpha",
  111: "新币上市",
  112: "FOMO增强",
  113: "FOMO爆量",
  114: "资金流动",
};

function LoadingRows() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="rounded-xl border border-border/50 bg-accent/30 p-3">
          <div className="flex items-center gap-3">
            <Skeleton className="h-6 w-20 bg-primary/10" />
            <Skeleton className="h-6 w-16 bg-primary/10" />
            <Skeleton className="ml-auto h-5 w-20 bg-primary/10" />
          </div>
        </div>
      ))}
    </div>
  );
}

const GUIDE_CARDS = [
  {
    title: "FOMO",
    description: "代表情绪与成交量突然放大，适合监控追涨与挤仓风险。若缺乏 Alpha 配合，容易出现单边脉冲后回落。",
    tone: "border-orange-500/25 bg-orange-500/10 text-orange-300",
  },
  {
    title: "Alpha",
    description: "代表趋势方向和主导资金的一致性，通常用于确认信号质量。与 FOMO 同时出现时，更值得关注。",
    tone: "border-purple-500/25 bg-purple-500/10 text-purple-300",
  },
  {
    title: "风控评分",
    description: "系统基于时间窗口、信号共振与风险标签生成执行优先级。高分不等于必做，而是意味着更高的结构一致性。",
    tone: "border-cyan-500/25 bg-cyan-500/10 text-cyan-300",
  },
];

export default function Signals() {
  const [filter, setFilter] = useState<string>("ALL");
  const [symbol, setSymbol] = useState("");

  const signalsQuery = trpc.signals.list.useQuery({ limit: 100 }, { refetchInterval: 3000 });
  const confluenceQuery = trpc.signals.confluenceList.useQuery({ limit: 30 }, { refetchInterval: 3000 });
  const cacheStatusQuery = trpc.signals.cacheStatus.useQuery(undefined, { refetchInterval: 3000 });

  const mockMutation = trpc.signals.mock.useMutation({
    onSuccess: (data) => {
      if (data.confluence) {
        toast.success(`聚合信号：${data.confluence.symbol}，评分 ${(data.confluence.score * 100).toFixed(0)}%`, { duration: 5000 });
      } else {
        toast.info(`${data.signal.symbol} ${MSG_TYPE_LABELS[data.signal.messageType] ?? "信号"}`);
      }
      signalsQuery.refetch();
      confluenceQuery.refetch();
      cacheStatusQuery.refetch();
    },
  });

  const submitMutation = trpc.signals.submit.useMutation({
    onSuccess: (data) => {
      if (data.confluence) {
        toast.success(`聚合信号触发：${data.confluence.symbol}`);
      } else {
        toast.info("信号已提交");
      }
      signalsQuery.refetch();
      confluenceQuery.refetch();
      cacheStatusQuery.refetch();
    },
  });

  const signals = signalsQuery.data ?? [];
  const confluence = confluenceQuery.data ?? [];
  const cacheStatus = cacheStatusQuery.data;

  const filteredSignals = useMemo(
    () => signals.filter((s: any) => filter === "ALL" || s.signalType === filter),
    [signals, filter],
  );

  const signalTypes = ["ALL", "FOMO", "ALPHA", "RISK", "FALL", "FUND_MOVE"];
  const loading = signalsQuery.isLoading || confluenceQuery.isLoading || cacheStatusQuery.isLoading;
  const hasActiveSymbols = (cacheStatus?.symbols?.fomo?.length ?? 0) > 0 || (cacheStatus?.symbols?.alpha?.length ?? 0) > 0;

  return (
    <div className="space-y-5 p-4 lg:p-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl font-bold text-foreground">信号监控</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">实时接收、筛选并聚合 FOMO / Alpha / 风险预警信号。</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => mockMutation.mutate({ symbol: symbol || undefined })} disabled={mockMutation.isPending} className="text-xs">
            <Zap className="mr-1.5 h-3.5 w-3.5" />模拟信号
          </Button>
          <Button variant="outline" size="sm" onClick={() => { signalsQuery.refetch(); confluenceQuery.refetch(); cacheStatusQuery.refetch(); }} className="text-xs">
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />刷新
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
        {GUIDE_CARDS.map((item) => (
          <div key={item.title} className={cn("rounded-2xl border p-4", item.tone)}>
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
              <Shield className="h-4 w-4" />
              {item.title}
            </div>
            <p className="text-xs leading-6 text-white/80">{item.description}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "FOMO 缓存", value: cacheStatus?.fomoCount ?? 0, color: "text-fomo", helper: "情绪脉冲" },
          { label: "Alpha 缓存", value: cacheStatus?.alphaCount ?? 0, color: "text-alpha", helper: "趋势确认" },
          { label: "风险信号", value: cacheStatus?.riskCount ?? 0, color: "text-risk", helper: "防守监测" },
          { label: "已处理", value: cacheStatus?.processedIds ?? 0, color: "text-muted-foreground", helper: "去重样本" },
        ].map(({ label, value, color, helper }) => (
          <div key={label} className="gradient-card rounded-2xl border border-primary/10 p-4 text-center">
            {loading ? <Skeleton className="mx-auto h-8 w-16 bg-primary/10" /> : <div className={cn("text-2xl font-bold font-mono", color)}>{value}</div>}
            <div className="mt-1 text-xs text-muted-foreground">{label}</div>
            <div className="mt-2 text-[11px] text-muted-foreground/90">{helper}</div>
          </div>
        ))}
      </div>

      {hasActiveSymbols && (
        <div className="gradient-card rounded-2xl p-4">
          <h3 className="mb-3 text-sm font-semibold text-foreground">活跃标的</h3>
          <div className="flex flex-wrap gap-2">
            {(cacheStatus?.symbols?.fomo ?? []).map((s: string) => (
              <span key={`f-${s}`} className="rounded-md border border-fomo/20 bg-fomo-subtle px-2 py-1 font-mono text-xs text-fomo">
                {s} <span className="opacity-60">FOMO</span>
              </span>
            ))}
            {(cacheStatus?.symbols?.alpha ?? []).map((s: string) => (
              <span key={`a-${s}`} className="rounded-md border border-alpha/20 bg-alpha-subtle px-2 py-1 font-mono text-xs text-alpha">
                {s} <span className="opacity-60">Alpha</span>
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="gradient-card rounded-2xl p-4 lg:col-span-2">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-profit signal-live" />
              <h3 className="text-sm font-semibold text-foreground">信号流</h3>
              <span className="text-xs text-muted-foreground">({filteredSignals.length})</span>
            </div>
            <div className="flex gap-1 overflow-x-auto">
              {signalTypes.map((type) => (
                <button
                  key={type}
                  onClick={() => setFilter(type)}
                  className={cn(
                    "whitespace-nowrap rounded-md px-2 py-1 text-xs transition-colors",
                    filter === type ? "bg-primary text-primary-foreground" : "bg-accent text-muted-foreground hover:text-foreground",
                  )}
                >
                  {type === "ALL" ? "全部" : SIGNAL_LABELS[type]?.split(/(?=[A-Z])/)?.[0] ?? type}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-3 rounded-xl border border-border/60 bg-background/40 p-3 text-[11px] leading-5 text-muted-foreground">
            <span className="font-medium text-foreground">监控提示：</span>
            当 FOMO 表示情绪点火、Alpha 表示方向确认，而风险信号快速抬升时，说明市场正在进入高波动窗口。
          </div>

          <div className="max-h-[28rem] space-y-1.5 overflow-y-auto pr-1">
            {loading ? (
              <LoadingRows />
            ) : filteredSignals.length > 0 ? (
              filteredSignals.map((s: any) => (
                <div key={s.id} className="slide-in flex items-center gap-3 rounded-xl border border-border/50 bg-accent/50 p-2.5 hover:bg-accent transition-colors">
                  <div className={cn("flex-shrink-0 rounded border px-2 py-0.5 text-xs font-medium", SIGNAL_COLORS[s.signalType] ?? "text-muted-foreground bg-muted border-border")}>
                    {SIGNAL_LABELS[s.signalType] ?? s.signalType}
                  </div>
                  <span className="w-16 flex-shrink-0 text-sm font-mono font-bold text-foreground">{s.symbol}</span>
                  <span className="flex-shrink-0 text-xs text-muted-foreground">类型 {s.messageType}</span>
                  <div className="flex-1" />
                  {s.processed && <span className="text-xs text-profit">已处理</span>}
                  <span className="flex-shrink-0 text-xs text-muted-foreground">
                    {new Date(s.createdAt).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                  </span>
                </div>
              ))
            ) : (
              <EmptyState
                icon={<Filter className="h-10 w-10" />}
                title="当前筛选条件下暂无信号"
                description="暂时没有符合当前分类过滤条件的信号。你可以切换过滤器、生成模拟信号，或等待 ValueScan 推送更多样本。"
                hint="若所有分类都为空，请先检查服务端是否保持在线，以及自动登录与 Token 刷新机制是否已经生效。"
                action={<Button size="sm" variant="outline" onClick={() => setFilter("ALL")}>重置筛选</Button>}
                className="py-8"
              />
            )}
          </div>
        </div>

        <div className="gradient-card rounded-2xl p-4">
          <div className="mb-3 flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">聚合信号</h3>
          </div>
          <div className="mb-3 rounded-xl border border-primary/15 bg-primary/5 p-3 text-[11px] leading-5 text-muted-foreground">
            聚合信号会将同一币种在时间窗口内的 FOMO 与 Alpha 进行合并打分。评分越高，说明多维确认越完整。
          </div>
          <div className="max-h-[28rem] space-y-2 overflow-y-auto pr-1">
            {loading ? (
              <LoadingRows />
            ) : confluence.length > 0 ? (
              confluence.map((cs: any) => (
                <div
                  key={cs.id}
                  className={cn(
                    "slide-in rounded-xl border p-3",
                    cs.status === "executed"
                      ? "border-profit/20 bg-profit-subtle"
                      : cs.status === "pending"
                        ? "border-fomo/20 bg-fomo-subtle"
                        : "border-border/50 bg-accent",
                  )}
                >
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-sm font-mono font-bold text-foreground">{cs.symbol}</span>
                    <div
                      className={cn(
                        "rounded px-1.5 py-0.5 text-xs font-medium",
                        cs.status === "executed"
                          ? "text-profit"
                          : cs.status === "pending"
                            ? "text-fomo"
                            : cs.status === "skipped"
                              ? "text-muted-foreground"
                              : "text-loss",
                      )}
                    >
                      {cs.status === "executed" ? "已执行" : cs.status === "pending" ? "待处理" : cs.status === "skipped" ? "已跳过" : "失败"}
                    </div>
                  </div>
                  <div className="mb-2">
                    <div className="mb-1 flex justify-between text-xs">
                      <span className="text-muted-foreground">风控评分</span>
                      <span className="font-mono font-medium text-primary">{(cs.score * 100).toFixed(0)}%</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${cs.score * 100}%` }} />
                    </div>
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>时差 {cs.timeGap.toFixed(0)}s</span>
                    <span>{new Date(cs.createdAt).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}</span>
                  </div>
                  {cs.skipReason && <div className="mt-1 truncate text-xs text-muted-foreground">{cs.skipReason}</div>}
                </div>
              ))
            ) : (
              <EmptyState
                icon={<TrendingUp className="h-10 w-10" />}
                title="还没有形成可执行共振"
                description="说明当前 FOMO 与 Alpha 还没有在设定时间窗口内同时出现，系统会继续观察并等待更高质量的结构。"
                hint="共振为空通常不是坏事，它意味着过滤器在主动帮你剔除低质量噪声。"
                className="py-8"
              />
            )}
          </div>
        </div>
      </div>

      <div className="gradient-card rounded-2xl p-4">
        <h3 className="mb-3 text-sm font-semibold text-foreground">手动提交信号</h3>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">标的</label>
            <input
              value={symbol}
              onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              placeholder="BTC"
              className="w-24 rounded-md border border-border bg-input px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              { type: 113, label: "FOMO爆量" },
              { type: 110, label: "Alpha信号" },
              { type: 112, label: "FOMO增强" },
              { type: 100, label: "暴跌信号" },
            ].map(({ type, label }) => (
              <Button
                key={type}
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => submitMutation.mutate({ messageType: type, messageId: `manual_${Date.now()}`, symbol: symbol || "BTC", data: {} })}
                disabled={submitMutation.isPending}
              >
                {label}
              </Button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
