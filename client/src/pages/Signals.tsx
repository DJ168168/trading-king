import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { Zap, Target, RefreshCw, Filter, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

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
  FOMO: "FOMO爆量", ALPHA: "Alpha信号", RISK: "风险预警",
  FALL: "暴跌信号", FUND_MOVE: "资金流动", LISTING: "新币上市",
  FUND_ESCAPE: "资金逃跑", FUND_ABNORMAL: "资金异常",
};

const MSG_TYPE_LABELS: Record<number, string> = {
  100: "暴跌", 108: "资金异常", 109: "资金逃跑",
  110: "Alpha", 111: "新币上市", 112: "FOMO增强", 113: "FOMO爆量", 114: "资金流动",
};

export default function Signals() {
  const [filter, setFilter] = useState<string>("ALL");
  const [symbol, setSymbol] = useState("");

  const { data: signals, refetch } = trpc.signals.list.useQuery({ limit: 100 }, { refetchInterval: 3000 });
  const { data: confluence } = trpc.signals.confluenceList.useQuery({ limit: 30 }, { refetchInterval: 3000 });
  const { data: cacheStatus } = trpc.signals.cacheStatus.useQuery(undefined, { refetchInterval: 3000 });

  const mockMutation = trpc.signals.mock.useMutation({
    onSuccess: (data) => {
      if (data.confluence) {
        toast.success(`🎯 聚合信号！${data.confluence.symbol} 评分: ${(data.confluence.score * 100).toFixed(0)}%`, { duration: 5000 });
      } else {
        toast.info(`📡 ${data.signal.symbol} ${MSG_TYPE_LABELS[data.signal.messageType] ?? "信号"}`);
      }
      refetch();
    }
  });

  const submitMutation = trpc.signals.submit.useMutation({
    onSuccess: (data) => {
      if (data.confluence) {
        toast.success(`🎯 聚合信号触发！${data.confluence.symbol}`);
      } else {
        toast.info("信号已提交");
      }
      refetch();
    }
  });

  const filteredSignals = signals?.filter(s => filter === "ALL" || s.signalType === filter) ?? [];

  const signalTypes = ["ALL", "FOMO", "ALPHA", "RISK", "FALL", "FUND_MOVE"];

  return (
    <div className="p-4 lg:p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">信号监控</h1>
          <p className="text-sm text-muted-foreground mt-0.5">实时接收并聚合 FOMO / Alpha 交易信号</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => mockMutation.mutate({ symbol: symbol || undefined })} disabled={mockMutation.isPending} className="text-xs">
            <Zap className="w-3.5 h-3.5 mr-1.5" />模拟信号
          </Button>
          <Button variant="outline" size="sm" onClick={() => refetch()} className="text-xs">
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />刷新
          </Button>
        </div>
      </div>

      {/* Engine Status Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "FOMO 缓存", value: cacheStatus?.fomoCount ?? 0, color: "text-fomo" },
          { label: "Alpha 缓存", value: cacheStatus?.alphaCount ?? 0, color: "text-alpha" },
          { label: "风险信号", value: cacheStatus?.riskCount ?? 0, color: "text-risk" },
          { label: "已处理", value: cacheStatus?.processedIds ?? 0, color: "text-muted-foreground" },
        ].map(({ label, value, color }) => (
          <div key={label} className="gradient-card rounded-xl p-3 text-center">
            <div className={cn("text-2xl font-bold font-mono", color)}>{value}</div>
            <div className="text-xs text-muted-foreground mt-1">{label}</div>
          </div>
        ))}
      </div>

      {/* Active Symbols */}
      {cacheStatus && (cacheStatus.symbols.fomo.length > 0 || cacheStatus.symbols.alpha.length > 0) && (
        <div className="gradient-card rounded-xl p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">活跃标的</h3>
          <div className="flex flex-wrap gap-2">
            {cacheStatus.symbols.fomo.map((s: string) => (
              <span key={`f-${s}`} className="px-2 py-1 bg-fomo-subtle text-fomo text-xs rounded-md border border-fomo/20 font-mono">
                {s} <span className="opacity-60">FOMO</span>
              </span>
            ))}
            {cacheStatus.symbols.alpha.map((s: string) => (
              <span key={`a-${s}`} className="px-2 py-1 bg-alpha-subtle text-alpha text-xs rounded-md border border-alpha/20 font-mono">
                {s} <span className="opacity-60">Alpha</span>
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Signal Stream */}
        <div className="lg:col-span-2 gradient-card rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-profit signal-live" />
              <h3 className="text-sm font-semibold text-foreground">信号流</h3>
              <span className="text-xs text-muted-foreground">({filteredSignals.length})</span>
            </div>
            {/* Filter */}
            <div className="flex gap-1 overflow-x-auto">
              {signalTypes.map(type => (
                <button key={type} onClick={() => setFilter(type)}
                  className={cn("px-2 py-1 text-xs rounded-md whitespace-nowrap transition-colors",
                    filter === type ? "bg-primary text-primary-foreground" : "bg-accent text-muted-foreground hover:text-foreground"
                  )}>
                  {type === "ALL" ? "全部" : SIGNAL_LABELS[type]?.split(/(?=[A-Z])/)[0] ?? type}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5 max-h-96 overflow-y-auto">
            {filteredSignals.length > 0 ? filteredSignals.map((s: any) => (
              <div key={s.id} className="flex items-center gap-3 p-2.5 bg-accent/50 rounded-lg hover:bg-accent transition-colors slide-in">
                <div className={cn("px-2 py-0.5 rounded text-xs font-medium border flex-shrink-0", SIGNAL_COLORS[s.signalType] ?? "text-muted-foreground bg-muted border-border")}>
                  {SIGNAL_LABELS[s.signalType] ?? s.signalType}
                </div>
                <span className="text-sm font-mono font-bold text-foreground w-16 flex-shrink-0">{s.symbol}</span>
                <span className="text-xs text-muted-foreground flex-shrink-0">类型 {s.messageType}</span>
                <div className="flex-1" />
                {s.processed && <span className="text-xs text-profit">已处理</span>}
                <span className="text-xs text-muted-foreground flex-shrink-0">
                  {new Date(s.createdAt).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                </span>
              </div>
            )) : (
              <div className="text-center py-12 text-muted-foreground">
                <Zap className="w-10 h-10 mx-auto mb-3 opacity-20" />
                <p className="text-sm">暂无信号数据</p>
                <p className="text-xs mt-1">点击"模拟信号"生成测试数据</p>
              </div>
            )}
          </div>
        </div>

        {/* Confluence Signals */}
        <div className="gradient-card rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Target className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">聚合信号</h3>
          </div>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {confluence && confluence.length > 0 ? confluence.map((cs: any) => (
              <div key={cs.id} className={cn("p-3 rounded-lg border slide-in",
                cs.status === "executed" ? "bg-profit-subtle border-profit/20" :
                cs.status === "pending" ? "bg-fomo-subtle border-fomo/20" :
                "bg-accent border-border/50"
              )}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-mono font-bold text-foreground">{cs.symbol}</span>
                  <div className={cn("text-xs font-medium px-1.5 py-0.5 rounded",
                    cs.status === "executed" ? "text-profit" :
                    cs.status === "pending" ? "text-fomo" :
                    cs.status === "skipped" ? "text-muted-foreground" : "text-loss"
                  )}>
                    {cs.status === "executed" ? "✓ 已执行" : cs.status === "pending" ? "⏳ 待处理" : cs.status === "skipped" ? "跳过" : "✗ 失败"}
                  </div>
                </div>
                {/* Score bar */}
                <div className="mb-2">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">评分</span>
                    <span className="font-mono text-primary font-medium">{(cs.score * 100).toFixed(0)}%</span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${cs.score * 100}%` }} />
                  </div>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>时差 {cs.timeGap.toFixed(0)}s</span>
                  <span>{new Date(cs.createdAt).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}</span>
                </div>
                {cs.skipReason && <div className="text-xs text-muted-foreground mt-1 truncate">{cs.skipReason}</div>}
              </div>
            )) : (
              <div className="text-center py-8 text-muted-foreground">
                <Target className="w-8 h-8 mx-auto mb-2 opacity-20" />
                <p className="text-sm">暂无聚合信号</p>
                <p className="text-xs mt-1">需要 FOMO+Alpha 同时触发</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Manual Signal Submit */}
      <div className="gradient-card rounded-xl p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3">手动提交信号</h3>
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">标的</label>
            <input value={symbol} onChange={e => setSymbol(e.target.value.toUpperCase())}
              placeholder="BTC" className="bg-input border border-border rounded-md px-3 py-1.5 text-sm text-foreground w-24 focus:outline-none focus:ring-1 focus:ring-ring" />
          </div>
          <div className="flex gap-2 flex-wrap">
            {[{ type: 113, label: "FOMO爆量" }, { type: 110, label: "Alpha信号" }, { type: 112, label: "FOMO增强" }, { type: 100, label: "暴跌信号" }].map(({ type, label }) => (
              <Button key={type} variant="outline" size="sm" className="text-xs"
                onClick={() => submitMutation.mutate({ messageType: type, messageId: `manual_${Date.now()}`, symbol: symbol || "BTC", data: {} })}
                disabled={submitMutation.isPending}>
                {label}
              </Button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
