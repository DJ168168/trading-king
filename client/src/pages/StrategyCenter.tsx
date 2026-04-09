import { useState, useMemo, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import {
  TrendingUp, TrendingDown, Zap, Target, Shield, AlertTriangle,
  Activity, BarChart2, Flame, Star, ChevronRight, RefreshCw,
  CheckCircle2, XCircle, Clock, Layers, Eye, ArrowUpRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

// ─── 市场环境评估 ─────────────────────────────────────────────────────────────
function MarketEnvironment({ signals }: { signals: any[] }) {
  const env = useMemo(() => {
    const total = signals.length;
    const longCount = signals.filter(s => s.direction === "long").length;
    const shortCount = signals.filter(s => s.direction === "short").length;
    const fomoCount = signals.filter(s => s.category === "fomo").length;
    const alphaCount = signals.filter(s => s.category === "alpha").length;
    const riskCount = signals.filter(s => s.category === "risk").length;

    // 根据视频策略：10-20条推送=市场回暖，2-3条=市场冷清
    let marketState: "hot" | "warm" | "neutral" | "cold" | "risk";
    let stateLabel: string;
    let stateDesc: string;
    let stateColor: string;
    let action: string;
    let positionAdvice: string;

    if (riskCount >= 5) {
      marketState = "risk";
      stateLabel = "⚠️ 风险警报";
      stateDesc = "风险信号激增，市场流动性恶化";
      stateColor = "text-red-400";
      action = "立即止盈离场，空仓观望";
      positionAdvice = "0%";
    } else if (total >= 15 && longCount > shortCount * 2) {
      marketState = "hot";
      stateLabel = "🔥 市场火热";
      stateDesc = `${total}条信号推送，多头占优，大行情启动`;
      stateColor = "text-orange-400";
      action = "积极做多，可适当加仓";
      positionAdvice = "70-100%";
    } else if (total >= 8 && longCount > shortCount) {
      marketState = "warm";
      stateLabel = "📈 市场回暖";
      stateDesc = `${total}条信号推送，流动性回升`;
      stateColor = "text-green-400";
      action = "谨慎做多，控制仓位";
      positionAdvice = "40-60%";
    } else if (total <= 3) {
      marketState = "cold";
      stateLabel = "❄️ 市场冷清";
      stateDesc = `仅${total}条信号推送，流动性流失`;
      stateColor = "text-blue-400";
      action = "空仓观望，绝不逆势";
      positionAdvice = "0%";
    } else {
      marketState = "neutral";
      stateLabel = "⚖️ 市场中性";
      stateDesc = `${total}条信号，多空均衡`;
      stateColor = "text-yellow-400";
      action = "观望为主，等待明确方向";
      positionAdvice = "10-30%";
    }

    return {
      marketState, stateLabel, stateDesc, stateColor, action, positionAdvice,
      total, longCount, shortCount, fomoCount, alphaCount, riskCount,
      longRatio: total > 0 ? Math.round(longCount / total * 100) : 0,
    };
  }, [signals]);

  const bgMap = {
    hot: "from-orange-500/10 to-red-500/5 border-orange-500/30",
    warm: "from-green-500/10 to-emerald-500/5 border-green-500/30",
    neutral: "from-yellow-500/10 to-amber-500/5 border-yellow-500/30",
    cold: "from-blue-500/10 to-cyan-500/5 border-blue-500/30",
    risk: "from-red-500/15 to-rose-500/5 border-red-500/40",
  };

  return (
    <div className={cn("rounded-2xl border bg-gradient-to-br p-5", bgMap[env.marketState])}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className={cn("text-xl font-bold", env.stateColor)}>{env.stateLabel}</div>
          <div className="text-sm text-muted-foreground mt-0.5">{env.stateDesc}</div>
        </div>
        <div className="text-right">
          <div className="text-xs text-muted-foreground">建议仓位</div>
          <div className={cn("text-2xl font-bold font-mono", env.stateColor)}>{env.positionAdvice}</div>
        </div>
      </div>

      {/* 多空比例条 */}
      <div className="mb-4">
        <div className="flex justify-between text-xs text-muted-foreground mb-1">
          <span>多头 {env.longCount} 条</span>
          <span>空头 {env.shortCount} 条</span>
        </div>
        <div className="h-2 rounded-full bg-background/50 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-green-500 to-green-400 transition-all duration-500"
            style={{ width: `${env.longRatio}%` }}
          />
        </div>
      </div>

      {/* 信号分布 */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        {[
          { label: "FOMO", value: env.fomoCount, color: "text-orange-400" },
          { label: "Alpha", value: env.alphaCount, color: "text-purple-400" },
          { label: "风险", value: env.riskCount, color: "text-red-400" },
        ].map(item => (
          <div key={item.label} className="text-center bg-background/30 rounded-lg py-2">
            <div className={cn("text-lg font-bold font-mono", item.color)}>{item.value}</div>
            <div className="text-xs text-muted-foreground">{item.label}</div>
          </div>
        ))}
      </div>

      {/* 操作建议 */}
      <div className="flex items-center gap-2 bg-background/40 rounded-lg px-3 py-2">
        <Target className="h-4 w-4 text-primary flex-shrink-0" />
        <span className="text-sm font-medium">{env.action}</span>
      </div>
    </div>
  );
}

// ─── 信号共振检测 ─────────────────────────────────────────────────────────────
function ResonanceDetector({ signals }: { signals: any[] }) {
  const resonances = useMemo(() => {
    // 按币种分组，检测共振
    const bySymbol: Record<string, any[]> = {};
    signals.forEach(s => {
      if (!bySymbol[s.symbol]) bySymbol[s.symbol] = [];
      bySymbol[s.symbol].push(s);
    });

    return Object.entries(bySymbol)
      .map(([symbol, sigs]) => {
        const hasFomo = sigs.some(s => s.category === "fomo" && s.direction === "long");
        const hasAlpha = sigs.some(s => s.category === "alpha" && s.direction === "long");
        const hasWhale = sigs.some(s => s.category === "whale" && s.direction === "long");
        const hasRisk = sigs.some(s => s.category === "risk");
        const fomoShort = sigs.some(s => s.category === "fomo" && s.direction === "short");
        const alphaShort = sigs.some(s => s.category === "alpha" && s.direction === "short");

        // 计算共振评分（视频策略：Alpha+火=最强信号）
        let score = 0;
        let resonanceType = "";
        let direction: "long" | "short" | "none" = "none";
        const tags: string[] = [];

        if (hasFomo && hasAlpha && hasWhale) {
          score = 95;
          resonanceType = "三重共振";
          direction = "long";
          tags.push("FOMO", "Alpha", "巨鲸");
        } else if (hasFomo && hasAlpha) {
          score = 88;
          resonanceType = "Alpha+FOMO";
          direction = "long";
          tags.push("FOMO", "Alpha");
        } else if (hasAlpha && hasWhale) {
          score = 82;
          resonanceType = "Alpha+巨鲸";
          direction = "long";
          tags.push("Alpha", "巨鲸");
        } else if (fomoShort && alphaShort) {
          score = 85;
          resonanceType = "双重做空";
          direction = "short";
          tags.push("FOMO空", "Alpha空");
        } else if (hasFomo) {
          score = 65;
          resonanceType = "FOMO信号";
          direction = "long";
          tags.push("FOMO");
        } else if (hasAlpha) {
          score = 60;
          resonanceType = "Alpha信号";
          direction = "long";
          tags.push("Alpha");
        } else {
          return null;
        }

        // 有风险信号降分
        if (hasRisk) score = Math.max(score - 15, 30);

        const price = sigs[0]?.price ?? 0;
        const pChange = sigs[0]?.percentChange24h ?? 0;
        const icon = sigs[0]?.icon;

        return { symbol, score, resonanceType, direction, tags, sigs, price, pChange, icon, hasRisk };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null && r.score >= 55)
      .sort((a, b) => b.score - a.score)
      .slice(0, 12);
  }, [signals]);

  if (resonances.length === 0) {
    return (
      <div className="text-center py-10 text-muted-foreground">
        <Layers className="h-10 w-10 mx-auto mb-3 opacity-20" />
        <p className="text-sm">暂无高评分共振信号</p>
        <p className="text-xs mt-1">等待多类型信号在同一币种叠加出现</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
      {(resonances as any[]).map((r: any) => (
        <ResonanceCard key={r.symbol} resonance={r} />
      ))}
    </div>
  );
}

function ResonanceCard({ resonance }: { resonance: any }) {
  const isLong = resonance.direction === "long";
  const isShort = resonance.direction === "short";
  const scoreColor = resonance.score >= 85 ? "text-green-400" : resonance.score >= 70 ? "text-yellow-400" : "text-orange-400";
  const borderColor = resonance.score >= 85 ? "border-green-500/40" : resonance.score >= 70 ? "border-yellow-500/40" : "border-orange-500/40";
  const bgColor = resonance.score >= 85 ? "from-green-500/8 to-emerald-500/3" : resonance.score >= 70 ? "from-yellow-500/8 to-amber-500/3" : "from-orange-500/8 to-red-500/3";

  // 入场建议
  const getAdvice = () => {
    if (resonance.score >= 85 && isLong) return { action: "强烈做多", sl: "2%", tp: "6%", pos: "满仓" };
    if (resonance.score >= 70 && isLong) return { action: "谨慎做多", sl: "1.5%", tp: "3%", pos: "半仓" };
    if (resonance.score >= 85 && isShort) return { action: "强烈做空", sl: "2%", tp: "6%", pos: "满仓" };
    if (resonance.score >= 70 && isShort) return { action: "谨慎做空", sl: "1.5%", tp: "3%", pos: "半仓" };
    return { action: "观望", sl: "—", tp: "—", pos: "—" };
  };
  const advice = getAdvice();

  return (
    <div className={cn("rounded-xl border bg-gradient-to-br p-4 hover:scale-[1.01] transition-all", borderColor, bgColor)}>
      {/* 头部 */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          {resonance.icon ? (
            <img src={resonance.icon} alt={resonance.symbol} className="w-8 h-8 rounded-full"
              onError={e => (e.currentTarget.style.display = "none")} />
          ) : (
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
              {resonance.symbol.slice(0, 2)}
            </div>
          )}
          <div>
            <div className="font-bold text-foreground">{resonance.symbol}</div>
            <div className="text-xs text-muted-foreground">{resonance.resonanceType}</div>
          </div>
        </div>
        <div className="text-right">
          <div className={cn("text-2xl font-bold font-mono", scoreColor)}>{resonance.score}</div>
          <div className="text-xs text-muted-foreground">评分</div>
        </div>
      </div>

      {/* 信号标签 */}
      <div className="flex flex-wrap gap-1 mb-3">
        {resonance.tags.map((tag: string) => (
          <span key={tag} className="px-1.5 py-0.5 bg-primary/15 text-primary border border-primary/30 rounded text-xs font-medium">
            {tag}
          </span>
        ))}
        {resonance.hasRisk && (
          <span className="px-1.5 py-0.5 bg-red-500/15 text-red-400 border border-red-500/30 rounded text-xs">
            ⚠️ 有风险
          </span>
        )}
      </div>

      {/* 价格信息 */}
      <div className="flex items-center justify-between text-xs mb-3">
        <span className="font-mono text-foreground">
          ${resonance.price > 1000 ? resonance.price.toFixed(2) : resonance.price > 1 ? resonance.price.toFixed(4) : resonance.price.toFixed(6)}
        </span>
        <span className={cn("font-mono", resonance.pChange >= 0 ? "text-green-400" : "text-red-400")}>
          {resonance.pChange >= 0 ? "+" : ""}{resonance.pChange.toFixed(2)}%
        </span>
        <div className="flex items-center gap-1">
          {isLong && <TrendingUp className="h-4 w-4 text-green-400" />}
          {isShort && <TrendingDown className="h-4 w-4 text-red-400" />}
          <span className={cn("font-medium", isLong ? "text-green-400" : isShort ? "text-red-400" : "text-yellow-400")}>
            {advice.action}
          </span>
        </div>
      </div>

      {/* 入场参数 */}
      <div className="grid grid-cols-3 gap-1 bg-background/40 rounded-lg p-2">
        <div className="text-center">
          <div className="text-xs text-muted-foreground">止损</div>
          <div className="text-xs font-mono text-red-400 font-medium">{advice.sl}</div>
        </div>
        <div className="text-center border-x border-border/30">
          <div className="text-xs text-muted-foreground">止盈</div>
          <div className="text-xs font-mono text-green-400 font-medium">{advice.tp}</div>
        </div>
        <div className="text-center">
          <div className="text-xs text-muted-foreground">仓位</div>
          <div className="text-xs font-mono text-primary font-medium">{advice.pos}</div>
        </div>
      </div>
    </div>
  );
}

// ─── 高胜率策略说明 ───────────────────────────────────────────────────────────
const STRATEGIES = [
  {
    id: "triple_green",
    name: "三绿线底部策略",
    icon: "🟢",
    winRate: "82%",
    category: "做多",
    color: "border-green-500/30 bg-green-500/5",
    tagColor: "bg-green-500/20 text-green-400",
    conditions: [
      "Alpha + FOMO + 巨鲸 三类信号同时出现",
      "价格处于相对低位密集区（三绿线区域）",
      "主力资金流入信号出现",
      "AI 评分 ≥ 55 分",
    ],
    entry: "等待价格有效突破密集区上沿后入场",
    stopLoss: "密集区下沿 -2%",
    takeProfit: "上方下一个压力密集区",
    notes: "这是视频中提到的最高胜率策略，三类信号叠加代表主力共识底部",
  },
  {
    id: "vacuum_breakout",
    name: "真空区突破策略",
    icon: "🚀",
    winRate: "78%",
    category: "做多",
    color: "border-blue-500/30 bg-blue-500/5",
    tagColor: "bg-blue-500/20 text-blue-400",
    conditions: [
      "价格强势突破当前密集区压力位",
      "突破后上方进入无阻力真空区",
      "FOMO 信号频率增加（短时间多条）",
      "Alpha 评分 ≥ 55 分",
    ],
    entry: "突破确认后立即追多入场",
    stopLoss: "突破点 -1.5%",
    takeProfit: "上方下一个密集区（快速暴涨目标）",
    notes: "真空区内无主力阻力，价格会快速暴涨，需快进快出",
  },
  {
    id: "alpha_fire",
    name: "Alpha + 火 双标记策略",
    icon: "🔥",
    winRate: "75%",
    category: "做多",
    color: "border-orange-500/30 bg-orange-500/5",
    tagColor: "bg-orange-500/20 text-orange-400",
    conditions: [
      "同一币种同时出现 Alpha 标记（潜在价值）",
      "同时出现火🔥标记（超高流动性）",
      "AI 评分 ≥ 55 分",
      "无橙色风险标记",
    ],
    entry: "双标记出现后立即入场，优先大市值币种",
    stopLoss: "入场价 -2%",
    takeProfit: "入场价 +5%~8%",
    notes: "视频原话：Alpha+火是首选标的，高概率盈利与高流动性双重叠加",
  },
  {
    id: "main_force_escape",
    name: "主力出逃做空策略",
    icon: "📉",
    winRate: "72%",
    category: "做空",
    color: "border-red-500/30 bg-red-500/5",
    tagColor: "bg-red-500/20 text-red-400",
    conditions: [
      "价格上涨至上方压力密集区受阻",
      "出现主力资金出逃信号",
      "FOMO 做空信号出现",
      "交易所流入信号（抛压增加）",
    ],
    entry: "价格在压力位受阻回落时入场做空",
    stopLoss: "压力位 +2%",
    takeProfit: "下方支撑密集区",
    notes: "主力出逃是最明确的做空信号，结合压力位效果最佳",
  },
  {
    id: "frequency_long",
    name: "推送频率做多策略",
    icon: "📊",
    winRate: "70%",
    category: "做多",
    color: "border-purple-500/30 bg-purple-500/5",
    tagColor: "bg-purple-500/20 text-purple-400",
    conditions: [
      "1小时内推送 10-20 个不同币种信号",
      "多头信号占比 > 70%",
      "无大量风险信号",
      "市场整体处于回暖状态",
    ],
    entry: "选择评分最高的 2-3 个币种做多",
    stopLoss: "入场价 -1.5%",
    takeProfit: "入场价 +3%~5%",
    notes: "推送频率是判断市场环境的核心指标，10-20条=大行情启动",
  },
  {
    id: "risk_warning",
    name: "风险警报空仓策略",
    icon: "🛡️",
    winRate: "95%（避损）",
    category: "空仓",
    color: "border-yellow-500/30 bg-yellow-500/5",
    tagColor: "bg-yellow-500/20 text-yellow-400",
    conditions: [
      "风险看跌推送数量激增（≥5条）",
      "推送极度冷清（≤3条/小时）",
      "大量标的批量下榜",
      "橙色风险标记大量出现",
    ],
    entry: "不操作，立即清仓观望",
    stopLoss: "N/A",
    takeProfit: "N/A",
    notes: "保住本金是第一位，市场冷清时空仓是最高胜率的策略",
  },
];

// ─── 主页面 ────────────// ─── 主页面 ─────────────────────────────────────────────────
export default function StrategyCenter() {
  const [activeTab, setActiveTab] = useState<"resonance" | "strategies" | "scoring" | "leaderboard" | "cases">("resonance");
  const { data: warnData, isLoading, refetch } = trpc.valueScan.warnMessages.useQuery(
    { pageNum: 1, pageSize: 100 },
    { refetchInterval: 30000 }
  );
  const { data: fearGreed } = trpc.valueScan.fearGreed.useQuery(undefined, { refetchInterval: 60000 });

  // warnMessages 返回原始格式，需解析 content 字段
  const SIGNAL_NAMES_SC: Record<number, string> = { 1: "FOMO多", 2: "FOMO空", 3: "Alpha多", 4: "Alpha空", 5: "风险多", 6: "风险空", 7: "鲸买", 8: "鲸卖", 9: "流入", 10: "流出", 11: "资金入", 12: "资金出", 13: "转账" };
  const signals = (warnData?.data ?? []).map((s: any) => {
    let content: any = {};
    try { content = typeof s.content === "string" ? JSON.parse(s.content) : (s.content ?? {}); } catch {}
    const fmType = content.fundsMovementType || 0;
    const direction = fmType % 2 === 1 ? "long" : fmType % 2 === 0 && fmType > 0 ? "short" : "neutral";
    const category = content.alpha ? "alpha" : content.fomo ? "fomo" : fmType >= 7 && fmType <= 8 ? "whale" : fmType >= 9 ? "exchange" : fmType >= 5 && fmType <= 6 ? "risk" : fmType >= 1 && fmType <= 2 ? "fomo" : fmType >= 3 && fmType <= 4 ? "alpha" : "ai";
    return { ...s, symbol: content.symbol || s.title || "", price: content.price || 0, direction, category, signalName: SIGNAL_NAMES_SC[fmType] || s.title || "VS信号" };
  });
  const lastUpdate = warnData ? new Date().toLocaleTimeString("zh-CN") : "—";

  const { data: winRateStats, isLoading: statsLoading } = trpc.strategyStats.winRateStats.useQuery(
    undefined, { refetchInterval: 60000 }
  );
  const { data: tradeCases, isLoading: casesLoading } = trpc.strategyStats.tradeCases.useQuery(
    { limit: 30 }, { refetchInterval: 60000 }
  );

  // 实时策略评估（基于当前信号统计）
  const realtimeStats = useMemo(() => ({
    fomoCount: signals.filter(s => s.category === 'fomo').length,
    alphaCount: signals.filter(s => s.category === 'alpha').length,
    riskCount: signals.filter(s => s.category === 'risk').length,
    totalCount: signals.length,
    uniqueSymbols: new Set(signals.map(s => s.symbol)).size,
  }), [signals]);
  const { data: strategyEval } = trpc.strategies.evaluate.useQuery(
    { symbol: 'BTC', messageType: 110, recentSignalStats: realtimeStats },
    { refetchInterval: 30000 }
  );

  const tabs = [
    { key: "resonance" as const, label: "共振信号", icon: <Layers className="h-3.5 w-3.5" /> },
    { key: "strategies" as const, label: "高胜率策略", icon: <Target className="h-3.5 w-3.5" /> },
    { key: "scoring" as const, label: "评分体系", icon: <BarChart2 className="h-3.5 w-3.5" /> },
    { key: "leaderboard" as const, label: "策略排行榜", icon: <Star className="h-3.5 w-3.5" /> },
    { key: "cases" as const, label: "实战案例", icon: <ArrowUpRight className="h-3.5 w-3.5" /> },
  ];

  return (
    <div className="p-4 lg:p-6 space-y-5">
      {/* 标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            高胜率策略中心
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            基于 ValueScan 视频策略提炼 · 最后更新: {lastUpdate}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading} className="text-xs gap-1.5">
          <RefreshCw className={cn("h-3.5 w-3.5", isLoading && "animate-spin")} />
          刷新信号
        </Button>
      </div>

      {/* 市场环境 */}
      <MarketEnvironment signals={signals} />

      {/* 恐惧贪婪指数横条 */}
      {fearGreed?.success && (
        <div className="gradient-card rounded-xl p-3 flex items-center gap-4">
          <div className="text-xs text-muted-foreground w-20 flex-shrink-0">恐惧贪婪</div>
          <div className="flex-1 h-2 rounded-full bg-background/50 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${fearGreed.value}%`,
                background: `linear-gradient(to right, #22c55e, #eab308, #ef4444)`,
              }}
            />
          </div>
          <div className="font-bold font-mono text-sm" style={{ color: fearGreed.color }}>
            {fearGreed.value} · {fearGreed.label}
          </div>
          <div className="text-xs text-muted-foreground hidden md:block">
            {fearGreed.value <= 25 ? "→ 极度恐惧，考虑抄底" :
             fearGreed.value >= 75 ? "→ 极度贪婪，注意减仓" :
             "→ 顺势操作"}
          </div>
        </div>
      )}

      {/* Tab 导航 */}
      <div className="flex gap-1 p-1 bg-accent rounded-lg w-fit">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all",
              activeTab === tab.key
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.icon}{tab.label}
          </button>
        ))}
      </div>

      {/* ─── 共振信号 ─── */}
      {activeTab === "resonance" && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <h2 className="text-sm font-semibold">实时共振信号</h2>
            <span className="text-xs text-muted-foreground">多类型信号叠加 = 高胜率机会</span>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <RefreshCw className="h-5 w-5 animate-spin mr-2" />正在分析信号共振...
            </div>
          ) : (
            <ResonanceDetector signals={signals} />
          )}

          {/* 共振说明 */}
          <div className="mt-4 gradient-card rounded-xl p-4">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Star className="h-4 w-4 text-amber-400" />
              共振评分规则（来自 ValueScan 视频策略）
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
              {[
                { label: "FOMO + Alpha + 巨鲸 三重共振", score: "95分", color: "text-green-400", desc: "最高胜率，满仓做多" },
                { label: "Alpha + FOMO 双重共振", score: "88分", color: "text-green-400", desc: "高胜率，满仓做多" },
                { label: "Alpha + 巨鲸 双重共振", score: "82分", color: "text-yellow-400", desc: "较高胜率，半仓做多" },
                { label: "FOMO做空 + Alpha做空", score: "85分", color: "text-red-400", desc: "高胜率做空机会" },
                { label: "单独 FOMO 信号", score: "65分", color: "text-orange-400", desc: "谨慎参与，小仓位" },
                { label: "有风险标记", score: "-15分", color: "text-red-400", desc: "降低评分，谨慎操作" },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between bg-background/30 rounded-lg px-3 py-2">
                  <span className="text-muted-foreground">{item.label}</span>
                  <div className="flex items-center gap-2">
                    <span className={cn("font-mono font-bold", item.color)}>{item.score}</span>
                    <span className="text-muted-foreground hidden md:inline">{item.desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ─── 高胜率策略 ─── */}
      {activeTab === "strategies" && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Target className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold">6大核心高胜率策略</h2>
            <span className="text-xs text-muted-foreground">提炼自 ValueScan 官方视频</span>
          </div>

          {/* 当前触发策略提示条 */}
          {strategyEval?.triggered && strategyEval.strategy && (
            <div className="rounded-xl border border-green-500/40 bg-green-500/10 p-3 flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse flex-shrink-0" />
              <div className="flex-1">
                <span className="text-sm font-semibold text-green-400">✅ 当前已触发：{strategyEval.strategy.strategyName}</span>
                <span className="ml-2 text-xs text-muted-foreground">胜率 {(strategyEval.strategy.winRate * 100).toFixed(0)}% · {strategyEval.strategy.direction === 'long' ? '做多' : strategyEval.strategy.direction === 'short' ? '做空' : '空仓'}</span>
              </div>
              <div className="text-xs text-muted-foreground">止损 -{strategyEval.strategy.stopLossPercent}% / 止盈 +{strategyEval.strategy.takeProfitPercent}%</div>
            </div>
          )}
          {strategyEval && !strategyEval.triggered && (
            <div className="rounded-xl border border-border/30 bg-muted/20 p-3 flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-muted-foreground flex-shrink-0" />
              <span className="text-xs text-muted-foreground">当前无策略触发 · 自动交易引擎处于观望状态</span>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {STRATEGIES.map(strategy => {
              // 将前端策略 id 映射到后端策略 id
              const backendIdMap: Record<string, string> = {
                triple_green: 'three_green_lines',
                vacuum_breakout: 'vacuum_breakout',
                alpha_fire: 'alpha_fire_dual',
                main_force_escape: 'whale_escape_short',
                frequency_long: 'push_freq_long',
                risk_warning: 'risk_alert_flat',
              };
              const backendId = backendIdMap[strategy.id];
              const evalResult = strategyEval?.allResults?.find(r => r.strategyId === backendId);
              const isTriggered = evalResult?.triggered ?? false;
              const metCount = evalResult?.conditions?.filter(c => c.met).length ?? 0;
              const totalCount2 = evalResult?.conditions?.length ?? strategy.conditions.length;
              return (
              <div key={strategy.id} className={cn("rounded-xl border p-4", strategy.color, isTriggered && "ring-1 ring-green-500/50")}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{strategy.icon}</span>
                    <div>
                      <div className="font-bold text-foreground text-sm">{strategy.name}</div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={cn("text-xs px-1.5 py-0.5 rounded", strategy.tagColor)}>{strategy.category}</span>
                        <span className="text-xs text-green-400 font-medium">胜率 {strategy.winRate}</span>
                        {strategyEval && (
                          <span className={cn(
                            "text-xs px-1.5 py-0.5 rounded font-medium",
                            isTriggered ? "bg-green-500/20 text-green-400" : "bg-muted/40 text-muted-foreground"
                          )}>
                            {isTriggered ? `✅ 已触发` : `${metCount}/${totalCount2} 条件`}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 入场条件 */}
                <div className="mb-3">
                  <div className="text-xs text-muted-foreground mb-1.5 font-medium">入场条件（需全部满足）</div>
                  <div className="space-y-1">
                    {strategy.conditions.map((cond, i) => (
                      <div key={i} className="flex items-start gap-1.5 text-xs">
                        <CheckCircle2 className="h-3 w-3 text-primary mt-0.5 flex-shrink-0" />
                        <span className="text-foreground/80">{cond}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 止损止盈 */}
                <div className="grid grid-cols-3 gap-2 mb-3">
                  <div className="bg-background/40 rounded-lg p-2 text-center">
                    <div className="text-xs text-muted-foreground">入场</div>
                    <div className="text-xs font-medium text-foreground mt-0.5 leading-tight">{strategy.entry.slice(0, 12)}...</div>
                  </div>
                  <div className="bg-background/40 rounded-lg p-2 text-center">
                    <div className="text-xs text-muted-foreground">止损</div>
                    <div className="text-xs font-mono text-red-400 font-medium mt-0.5">{strategy.stopLoss}</div>
                  </div>
                  <div className="bg-background/40 rounded-lg p-2 text-center">
                    <div className="text-xs text-muted-foreground">止盈</div>
                    <div className="text-xs font-mono text-green-400 font-medium mt-0.5">{strategy.takeProfit}</div>
                  </div>
                </div>

                {/* 策略备注 */}
                <div className="flex items-start gap-1.5 bg-background/30 rounded-lg px-2 py-1.5">
                  <Eye className="h-3 w-3 text-amber-400 mt-0.5 flex-shrink-0" />
                  <span className="text-xs text-muted-foreground">{strategy.notes}</span>
                </div>
              </div>
            );
            })}
          </div>
        </div>
      )}

      {/* ─── 策略胜率排行榜 ─── */}
      {activeTab === "leaderboard" && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Star className="h-4 w-4 text-amber-400" />
            <h2 className="text-sm font-semibold">策略胜率排行榜</h2>
            <span className="text-xs text-muted-foreground">基于真实交易记录计算</span>
          </div>

          {statsLoading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <RefreshCw className="h-5 w-5 animate-spin mr-2" />计算胜率统计...
            </div>
          ) : !winRateStats || winRateStats.length === 0 ? (
            <div className="gradient-card rounded-xl p-8 text-center">
              <BarChart2 className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p className="text-sm text-muted-foreground">暂无历史交易数据</p>
              <p className="text-xs text-muted-foreground mt-1">完成并关闭交易后，胜率统计将自动更新</p>
            </div>
          ) : (
            <div className="space-y-3">
              {winRateStats.map((stat, idx) => (
                <div key={stat.signalType} className="gradient-card rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold",
                        idx === 0 ? "bg-amber-500/20 text-amber-400" :
                        idx === 1 ? "bg-slate-400/20 text-slate-300" :
                        idx === 2 ? "bg-orange-600/20 text-orange-400" : "bg-muted text-muted-foreground"
                      )}>
                        {idx + 1}
                      </div>
                      <div>
                        <div className="font-semibold text-sm">{stat.signalType}</div>
                        <div className="text-xs text-muted-foreground">{stat.totalTrades} 笔交易</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={cn(
                        "text-xl font-bold font-mono",
                        stat.winRate >= 60 ? "text-green-400" : stat.winRate >= 50 ? "text-yellow-400" : "text-red-400"
                      )}>{stat.winRate}%</div>
                      <div className="text-xs text-muted-foreground">胜率</div>
                    </div>
                  </div>

                  {/* 胜率进度条 */}
                  <div className="h-2 rounded-full bg-background/50 overflow-hidden mb-3">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-700",
                        stat.winRate >= 60 ? "bg-green-500" : stat.winRate >= 50 ? "bg-yellow-500" : "bg-red-500"
                      )}
                      style={{ width: `${Math.min(stat.winRate, 100)}%` }}
                    />
                  </div>

                  {/* 详细指标 */}
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { label: "胜利", value: stat.wins, color: "text-green-400" },
                      { label: "亏损", value: stat.losses, color: "text-red-400" },
                      { label: "盈亏比", value: stat.profitFactor.toFixed(2), color: "text-primary" },
                      { label: "最大回撤", value: `${stat.maxDrawdown.toFixed(1)}%`, color: "text-orange-400" },
                    ].map(m => (
                      <div key={m.label} className="text-center bg-background/30 rounded-lg py-1.5">
                        <div className={cn("text-sm font-bold font-mono", m.color)}>{m.value}</div>
                        <div className="text-xs text-muted-foreground">{m.label}</div>
                      </div>
                    ))}
                  </div>

                  {/* 总盈亏 */}
                  <div className={cn(
                    "mt-2 text-xs text-right font-mono",
                    stat.totalPnl >= 0 ? "text-green-400" : "text-red-400"
                  )}>
                    总盈亏: {stat.totalPnl >= 0 ? "+" : ""}{stat.totalPnl.toFixed(2)} USDT
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── 实战案例库 ─── */}
      {activeTab === "cases" && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <ArrowUpRight className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold">实战案例库</h2>
            <span className="text-xs text-muted-foreground">真实交易记录 · 入场/出场/盈亏详情</span>
          </div>

          {casesLoading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <RefreshCw className="h-5 w-5 animate-spin mr-2" />加载案例...
            </div>
          ) : !tradeCases || tradeCases.length === 0 ? (
            <div className="gradient-card rounded-xl p-8 text-center">
              <Activity className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p className="text-sm text-muted-foreground">暂无实战案例</p>
              <p className="text-xs text-muted-foreground mt-1">完成并关闭交易后，典型案例将在此展示</p>
            </div>
          ) : (
            <div className="space-y-3">
              {tradeCases.map((c) => (
                <div key={c.id} className={cn(
                  "gradient-card rounded-xl p-4 border-l-4",
                  c.isWin ? "border-l-green-500" : "border-l-red-500"
                )}>
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        "w-6 h-6 rounded-full flex items-center justify-center",
                        c.isWin ? "bg-green-500/20" : "bg-red-500/20"
                      )}>
                        {c.isWin
                          ? <CheckCircle2 className="h-3.5 w-3.5 text-green-400" />
                          : <XCircle className="h-3.5 w-3.5 text-red-400" />}
                      </div>
                      <div>
                        <span className="font-bold text-sm">{c.symbol}</span>
                        <span className={cn(
                          "ml-2 text-xs px-1.5 py-0.5 rounded",
                          c.direction === "long" ? "bg-green-500/15 text-green-400" : "bg-red-500/15 text-red-400"
                        )}>
                          {c.direction === "long" ? "做多" : "做空"}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={cn(
                        "text-lg font-bold font-mono",
                        c.isWin ? "text-green-400" : "text-red-400"
                      )}>
                        {c.pnl >= 0 ? "+" : ""}{c.pnl.toFixed(2)} USDT
                      </div>
                      <div className={cn(
                        "text-xs font-mono",
                        c.isWin ? "text-green-400/70" : "text-red-400/70"
                      )}>
                        {c.pnlPercent >= 0 ? "+" : ""}{c.pnlPercent.toFixed(2)}%
                      </div>
                    </div>
                  </div>

                  {/* 交易详情 */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-2">
                    {[
                      { label: "入场价", value: `$${c.entryPrice.toFixed(c.entryPrice > 100 ? 2 : 4)}` },
                      { label: "出场价", value: c.exitPrice > 0 ? `$${c.exitPrice.toFixed(c.exitPrice > 100 ? 2 : 4)}` : "持仓中" },
                      { label: "信号评分", value: c.signalScore > 0 ? `${c.signalScore.toFixed(0)}分` : "—" },
                      { label: "杠杆倍数", value: `${c.leverage}x` },
                    ].map(m => (
                      <div key={m.label} className="bg-background/30 rounded-lg px-2 py-1.5 text-center">
                        <div className="text-xs text-muted-foreground">{m.label}</div>
                        <div className="text-xs font-mono font-medium text-foreground mt-0.5">{m.value}</div>
                      </div>
                    ))}
                  </div>

                  {/* 底部信息 */}
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {c.openedAt ? new Date(c.openedAt).toLocaleString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—"}
                    </span>
                    <span className="text-xs">关闭原因: {c.closeReason}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── 评分体系 ─── */}
      {activeTab === "scoring" && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <BarChart2 className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold">AI 评分体系详解</h2>
            <span className="text-xs text-muted-foreground">ValueScan 官方评分标准</span>
          </div>

          {/* 评分阈值 */}
          <div className="gradient-card rounded-xl p-4">
            <h3 className="text-sm font-semibold mb-3">评分阈值与操作建议</h3>
            <div className="space-y-2">
              {[
                { range: "80-100分", label: "强烈做多", color: "bg-green-500", textColor: "text-green-400", action: "满仓做多，止损2%，止盈6%", width: "100%" },
                { range: "55-79分", label: "谨慎做多", color: "bg-yellow-500", textColor: "text-yellow-400", action: "半仓做多，止损1.5%，止盈3%", width: "70%" },
                { range: "45-54分", label: "观望", color: "bg-slate-500", textColor: "text-slate-400", action: "不操作，等待更明确信号", width: "50%" },
                { range: "21-44分", label: "谨慎做空", color: "bg-orange-500", textColor: "text-orange-400", action: "半仓做空，止损1.5%，止盈3%", width: "30%" },
                { range: "0-20分", label: "强烈做空", color: "bg-red-500", textColor: "text-red-400", action: "满仓做空，止损2%，止盈6%", width: "15%" },
              ].map(item => (
                <div key={item.range} className="flex items-center gap-3">
                  <div className="w-20 text-xs font-mono text-muted-foreground flex-shrink-0">{item.range}</div>
                  <div className="flex-1 h-6 bg-background/50 rounded-full overflow-hidden">
                    <div className={cn("h-full rounded-full flex items-center px-2", item.color)} style={{ width: item.width }}>
                      <span className="text-xs font-medium text-white">{item.label}</span>
                    </div>
                  </div>
                  <div className={cn("text-xs hidden md:block w-48", item.textColor)}>{item.action}</div>
                </div>
              ))}
            </div>
          </div>

          {/* 推送频率规则 */}
          <div className="gradient-card rounded-xl p-4">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              推送频率判断市场环境（视频核心策略）
            </h3>
            <div className="space-y-2">
              {[
                { freq: "15-20条/小时", env: "市场火热🔥", pos: "70-100%", color: "border-orange-500/30 bg-orange-500/5", textColor: "text-orange-400" },
                { freq: "8-15条/小时", env: "市场回暖📈", pos: "40-60%", color: "border-green-500/30 bg-green-500/5", textColor: "text-green-400" },
                { freq: "4-8条/小时", env: "市场中性⚖️", pos: "10-30%", color: "border-yellow-500/30 bg-yellow-500/5", textColor: "text-yellow-400" },
                { freq: "1-3条/小时", env: "市场冷清❄️", pos: "0%（空仓）", color: "border-blue-500/30 bg-blue-500/5", textColor: "text-blue-400" },
                { freq: "风险信号≥5条", env: "风险警报⚠️", pos: "0%（立即清仓）", color: "border-red-500/30 bg-red-500/5", textColor: "text-red-400" },
              ].map(item => (
                <div key={item.freq} className={cn("flex items-center justify-between rounded-lg border px-3 py-2", item.color)}>
                  <div>
                    <span className="text-xs font-mono text-foreground">{item.freq}</span>
                    <span className={cn("ml-2 text-xs font-medium", item.textColor)}>{item.env}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">建议仓位: <span className={cn("font-bold", item.textColor)}>{item.pos}</span></div>
                </div>
              ))}
            </div>
          </div>

          {/* 避坑指南 */}
          <div className="gradient-card rounded-xl p-4">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Shield className="h-4 w-4 text-red-400" />
              避坑指南（视频重点警告）
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {[
                { icon: "🟠", rule: "橙色标记 = 坚决不碰", desc: "代表未知风险，除非极强风控能力" },
                { icon: "📉", rule: "主力出逃时绝不接盘", desc: "主力资金流出时，不要做多" },
                { icon: "🪙", rule: "拒绝小市值山寨币", desc: "低流动性标的容易被庄家操控" },
                { icon: "❄️", rule: "推送冷清时空仓", desc: "没有信号推送就不操作，绝不逆势" },
                { icon: "⚡", rule: "AI评分50分以下不参与", desc: "性价比极低，风险收益比不划算" },
                { icon: "🎯", rule: "优先选高流动性大市值", desc: "BTC、ETH、SOL 等主流币优先" },
              ].map(item => (
                <div key={item.rule} className="flex items-start gap-2 bg-background/30 rounded-lg px-3 py-2">
                  <span className="text-base flex-shrink-0">{item.icon}</span>
                  <div>
                    <div className="text-xs font-medium text-foreground">{item.rule}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
