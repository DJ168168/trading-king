/**
 * VS 实时信号页面
 * 使用服务端 tRPC API（HMAC-SHA256 API Key 认证，24 小时稳定运行）
 */
import { useState, useMemo, useRef, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Minus,
  Activity,
  Search,
  Eye,
} from "lucide-react";
import { toast } from "sonner";

const REFRESH_INTERVAL = 30_000;

// 信号类别颜色
const CAT_STYLES: Record<string, { bg: string; border: string; text: string; badge: string }> = {
  fomo:     { bg: "bg-orange-500/10", border: "border-orange-500/30", text: "text-orange-400", badge: "bg-orange-500/20 text-orange-400 border-orange-500/30" },
  alpha:    { bg: "bg-purple-500/10", border: "border-purple-500/30", text: "text-purple-400", badge: "bg-purple-500/20 text-purple-400 border-purple-500/30" },
  risk:     { bg: "bg-red-500/10",    border: "border-red-500/30",    text: "text-red-400",    badge: "bg-red-500/20 text-red-400 border-red-500/30" },
  whale:    { bg: "bg-blue-500/10",   border: "border-blue-500/30",   text: "text-blue-400",   badge: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  exchange: { bg: "bg-cyan-500/10",   border: "border-cyan-500/30",   text: "text-cyan-400",   badge: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30" },
  ai:       { bg: "bg-green-500/10",  border: "border-green-500/30",  text: "text-green-400",  badge: "bg-green-500/20 text-green-400 border-green-500/30" },
};

const CAT_LABELS: Record<string, string> = {
  fomo: "FOMO", alpha: "Alpha", risk: "风险", whale: "巨鲸", exchange: "交易所", ai: "AI追踪",
};

type FilterCategory = "all" | "fomo" | "alpha" | "risk" | "whale" | "exchange" | "ai";

// fundsMovementType 到 category 的映射
function getFmtCategory(fmType: number, alpha?: boolean, fomo?: boolean): FilterCategory {
  if (alpha) return "alpha";
  if (fomo) return "fomo";
  if (fmType >= 1 && fmType <= 2) return "fomo";
  if (fmType >= 3 && fmType <= 4) return "alpha";
  if (fmType >= 5 && fmType <= 6) return "risk";
  if (fmType === 7 || fmType === 8 || fmType === 13) return "whale";
  if (fmType >= 9 && fmType <= 12) return "exchange";
  return "ai";
}

export default function VSSignals() {
  const [filterCat, setFilterCat] = useState<FilterCategory>("all");
  const [filterDir, setFilterDir] = useState<"all" | "long" | "short">("all");
  const [searchSymbol, setSearchSymbol] = useState("");
  const [aiPage, setAiPage] = useState(1);
  const [activeTab, setActiveTab] = useState<"funds" | "ai">("funds");

  const PAGE_SIZE = 30;

  // Telegram Alpha+FOMO 双重共振推送：30 分钟内同一币种不重复推送
  const sentRef = useRef<Map<string, number>>(new Map());
  const telegramSend = trpc.telegram.test.useMutation();

  // ─── 服务端数据查询（tRPC，HMAC 认证，24h 稳定）─────────────────────────────
  const fundsQuery = trpc.valueScan.warnMessages.useQuery(
    { pageNum: 1, pageSize: 50 },
    { refetchInterval: REFRESH_INTERVAL, staleTime: 25_000 }
  );

  const aiQuery = trpc.valueScan.aiMessages.useQuery(
    { pageNum: aiPage, pageSize: PAGE_SIZE },
    { refetchInterval: REFRESH_INTERVAL, staleTime: 25_000 }
  );

  const fearGreedQuery = trpc.valueScan.fearGreed.useQuery(
    undefined,
    { refetchInterval: 60_000, staleTime: 55_000 }
  );

  const loading = fundsQuery.isLoading || aiQuery.isLoading;
  const lastUpdate = fundsQuery.dataUpdatedAt ? new Date(fundsQuery.dataUpdatedAt) : null;

  // 检查共振信号并推送 Telegram
  const checkResonance = useCallback((list: any[]) => {
    const now = Date.now();
    const COOLDOWN = 30 * 60 * 1000;
    const bySymbol = new Map<string, { alpha: boolean; fomo: boolean; price?: number }>();
    for (const item of list) {
      const sym = item.symbol || "";
      if (!sym) continue;
      const cur = bySymbol.get(sym) ?? { alpha: false, fomo: false };
      if (item.category === "alpha") cur.alpha = true;
      if (item.category === "fomo") cur.fomo = true;
      if (item.price) cur.price = item.price;
      bySymbol.set(sym, cur);
    }
    for (const [sym, info] of Array.from(bySymbol.entries())) {
      if (!info.alpha || !info.fomo) continue;
      const last = sentRef.current.get(sym) ?? 0;
      if (now - last < COOLDOWN) continue;
      sentRef.current.set(sym, now);
      const msg = [
        "<b>Alpha+FOMO 共振信号</b> — 交易之王",
        `币种：<b>${sym}</b>`,
        "信号：Alpha + FOMO 双重共振",
        info.price ? `当前价格：$${info.price.toLocaleString()}` : "",
        "建议：高胜率做多入场，评分预期 >= 75分",
        `时间：${new Date().toLocaleString("zh-CN")}`,
      ].filter(Boolean).join("\n");
      telegramSend.mutate({ message: msg });
      toast.success(`Telegram 已推送 ${sym} 共振信号`, { duration: 4000 });
    }
  }, [telegramSend]);

  // 将 warnMessages 数据规范化
  const normalizedFunds = useMemo(() => {
    const list = fundsQuery.data?.data || [];
    const normalized = list.map((item: any) => {
      let rawContent: any = {};
      try { rawContent = typeof item.content === "string" ? JSON.parse(item.content) : item.content; } catch {}
      const fmType = rawContent.fundsMovementType || 0;
      const alpha = rawContent.alpha || false;
      const fomo = rawContent.fomo || false;
      const category = getFmtCategory(fmType, alpha, fomo);
      const direction = (fmType % 2 === 1 || alpha) ? "long" : fmType % 2 === 0 && fmType > 0 ? "short" : "neutral";
      const SIGNAL_NAMES: Record<number, string> = {
        1: "FOMO 做多", 2: "FOMO 做空", 3: "Alpha 做多", 4: "Alpha 做空",
        5: "风险 做多", 6: "风险 做空", 7: "巨鲸买入", 8: "巨鲸卖出",
        9: "交易所流入", 10: "交易所流出", 11: "资金异常流入", 12: "资金异常流出", 13: "大额转账",
      };
      return {
        id: item.id,
        symbol: rawContent.symbol || item.title || "",
        price: rawContent.price || 0,
        percentChange24h: rawContent.percentChange24h || 0,
        icon: rawContent.icon || "",
        tradeType: rawContent.tradeType || 0,
        updateTime: item.createTime,
        alpha,
        fomo,
        fomoEscalation: rawContent.fomoEscalation || false,
        bullishRatio: rawContent.bullishRatio || 0,
        category,
        direction,
        signalName: SIGNAL_NAMES[fmType] || item.title || "资金异常",
      };
    });
    // 检查共振信号
    if (normalized.length > 0) checkResonance(normalized);
    return normalized;
  }, [fundsQuery.data, checkResonance]);

  // 将 aiMessages 数据规范化
  const normalizedAI = useMemo(() => {
    const list = aiQuery.data?.list || [];
    return list.map((item: any) => {
      let rawContent: any = {};
      try { rawContent = typeof item.content === "string" ? JSON.parse(item.content) : item.content; } catch {}
      const fmType = rawContent.fundsMovementType || 0;
      const category = getFmtCategory(fmType);
      const direction = fmType % 2 === 1 ? "long" : fmType % 2 === 0 && fmType > 0 ? "short" : "neutral";
      const SIGNAL_NAMES: Record<number, string> = {
        1: "FOMO 做多", 2: "FOMO 做空", 3: "Alpha 做多", 4: "Alpha 做空",
        5: "风险 做多", 6: "风险 做空", 7: "巨鲸买入", 8: "巨鲸卖出",
        9: "交易所流入", 10: "交易所流出", 11: "资金异常流入", 12: "资金异常流出", 13: "大额转账",
      };
      return {
        id: item.id,
        symbol: rawContent.symbol || item.title || "",
        price: rawContent.price || 0,
        percentChange24h: rawContent.percentChange24h || 0,
        icon: rawContent.icon || "",
        createTime: item.createTime,
        category,
        direction,
        signalName: SIGNAL_NAMES[fmType] || item.title || "AI 信号",
      };
    });
  }, [aiQuery.data]);

  // 过滤
  const filteredFunds = useMemo(() => normalizedFunds.filter(s => {
    if (filterCat !== "all" && s.category !== filterCat) return false;
    if (filterDir !== "all" && s.direction !== filterDir) return false;
    if (searchSymbol && !s.symbol.toLowerCase().includes(searchSymbol.toLowerCase())) return false;
    return true;
  }), [normalizedFunds, filterCat, filterDir, searchSymbol]);

  const filteredAI = useMemo(() => normalizedAI.filter(s => {
    if (filterCat !== "all" && s.category !== filterCat) return false;
    if (filterDir !== "all" && s.direction !== filterDir) return false;
    if (searchSymbol && !s.symbol.toLowerCase().includes(searchSymbol.toLowerCase())) return false;
    return true;
  }), [normalizedAI, filterCat, filterDir, searchSymbol]);

  // 统计
  const stats = useMemo(() => ({
    total: normalizedFunds.length,
    long: normalizedFunds.filter(s => s.direction === "long").length,
    short: normalizedFunds.filter(s => s.direction === "short").length,
    fomo: normalizedFunds.filter(s => s.category === "fomo").length,
    alpha: normalizedFunds.filter(s => s.category === "alpha").length,
    whale: normalizedFunds.filter(s => s.category === "whale").length,
  }), [normalizedFunds]);

  // 恐惧贪婪
  const fg = fearGreedQuery.data;
  const fgColor = fg
    ? fg.value >= 75 ? "#f87171"
    : fg.value >= 55 ? "#fb923c"
    : fg.value >= 45 ? "#facc15"
    : fg.value >= 25 ? "#4ade80"
    : "#34d399"
    : "#6b7280";

  const aiTotal = aiQuery.data?.total || 0;

  return (
    <div className="p-4 lg:p-6 space-y-5">
      {/* 标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            ValueScan 实时信号
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5 flex items-center gap-2">
            服务端 API · 最后更新: {lastUpdate ? lastUpdate.toLocaleTimeString("zh-CN") : "—"}
            <span className="flex items-center gap-1 px-1.5 py-0.5 bg-green-500/20 text-green-400 border border-green-500/30 rounded text-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              24h 运行中
            </span>
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => { fundsQuery.refetch(); aiQuery.refetch(); }}
          disabled={loading}
          className="text-xs gap-1.5"
        >
          <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
          刷新
        </Button>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
        {[
          { label: "总信号", value: stats.total, color: "text-foreground" },
          { label: "做多", value: stats.long, color: "text-green-400" },
          { label: "做空", value: stats.short, color: "text-red-400" },
          { label: "FOMO 🔥", value: stats.fomo, color: "text-orange-400" },
          { label: "Alpha ⚡", value: stats.alpha, color: "text-purple-400" },
          { label: "巨鲸 🐋", value: stats.whale, color: "text-blue-400" },
        ].map(item => (
          <div key={item.label} className="gradient-card rounded-lg p-3 text-center">
            <div className={cn("text-xl font-bold font-mono", item.color)}>{item.value}</div>
            <div className="text-xs text-muted-foreground">{item.label}</div>
          </div>
        ))}
      </div>

      {/* 恐惧贪婪指数 */}
      {fg && (
        <div className="gradient-card rounded-xl p-4 flex items-center gap-4">
          <div className="relative w-14 h-14 flex-shrink-0">
            <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
              <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="16" />
              <circle cx="50" cy="50" r="40" fill="none" stroke={fgColor}
                strokeWidth="16"
                strokeDasharray={`${2 * Math.PI * 40 * (fg.value / 100)} ${2 * Math.PI * 40}`}
                strokeLinecap="round" />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-sm font-bold" style={{ color: fgColor }}>{fg.value}</span>
            </div>
          </div>
          <div>
            <div className="text-base font-bold" style={{ color: fgColor }}>{fg.label}</div>
            <div className="text-xs text-muted-foreground">市场情绪指数 · 每日更新</div>
          </div>
          <div className="ml-auto text-right">
            <div className="text-xs text-muted-foreground">交易建议</div>
            <div className="text-sm font-medium mt-0.5" style={{ color: fgColor }}>
              {fg.value <= 20 ? "极度恐惧 → 考虑抄底" :
               fg.value <= 40 ? "恐惧 → 谨慎做多" :
               fg.value <= 60 ? "中性 → 观望为主" :
               fg.value <= 80 ? "贪婪 → 注意风险" :
               "极度贪婪 → 考虑减仓"}
            </div>
          </div>
        </div>
      )}

      {/* 过滤器 */}
      <div className="flex flex-wrap gap-2">
        <div className="flex items-center gap-1 bg-accent rounded-lg p-1">
          {(["all", "fomo", "alpha", "risk", "whale", "exchange", "ai"] as FilterCategory[]).map(cat => (
            <button
              key={cat}
              onClick={() => setFilterCat(cat)}
              className={cn(
                "px-2.5 py-1 text-xs rounded-md transition-all font-medium",
                filterCat === cat
                  ? cat === "all" ? "bg-primary text-primary-foreground" : `${CAT_STYLES[cat]?.bg} ${CAT_STYLES[cat]?.text} border ${CAT_STYLES[cat]?.border}`
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {cat === "all" ? "全部" : CAT_LABELS[cat]}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1 bg-accent rounded-lg p-1">
          {[{ key: "all", label: "全部方向" }, { key: "long", label: "▲ 做多" }, { key: "short", label: "▼ 做空" }].map(item => (
            <button
              key={item.key}
              onClick={() => setFilterDir(item.key as any)}
              className={cn(
                "px-2.5 py-1 text-xs rounded-md transition-all",
                filterDir === item.key ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="relative flex-1 min-w-[160px] max-w-[240px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="搜索币种 (BTC, ETH...)"
            value={searchSymbol}
            onChange={e => { setSearchSymbol(e.target.value); setAiPage(1); }}
            className="pl-8 h-8 text-xs"
          />
        </div>
      </div>

      {/* Tab 切换 */}
      <div className="flex gap-1 bg-accent/50 p-1 rounded-lg w-fit">
        <button
          onClick={() => setActiveTab("funds")}
          className={cn("px-3 py-1.5 text-xs rounded-md transition-colors font-medium",
            activeTab === "funds" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}
        >
          资金异常信号 ({filteredFunds.length})
        </button>
        <button
          onClick={() => setActiveTab("ai")}
          className={cn("px-3 py-1.5 text-xs rounded-md transition-colors font-medium",
            activeTab === "ai" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}
        >
          AI 历史信号 ({filteredAI.length})
        </button>
      </div>

      {/* 资金异常信号列表 */}
      {activeTab === "funds" && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-sm font-semibold text-foreground">实时预警信号</span>
            <span className="text-xs text-muted-foreground">（每30秒自动刷新）</span>
          </div>
          {loading && filteredFunds.length === 0 ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <RefreshCw className="h-5 w-5 animate-spin mr-2" />正在加载实时信号...
            </div>
          ) : fundsQuery.error ? (
            <div className="text-center py-8 text-red-400 text-sm">
              <Activity className="h-8 w-8 mx-auto mb-2 opacity-30" />
              加载失败: {fundsQuery.error.message}
            </div>
          ) : filteredFunds.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              <Activity className="h-8 w-8 mx-auto mb-2 opacity-30" />
              暂无匹配的实时信号
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
              {filteredFunds.map(signal => (
                <FundsSignalCard key={signal.id} signal={signal} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* AI 历史信号 */}
      {activeTab === "ai" && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Eye className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">历史信号记录</span>
            {aiTotal > 0 && <span className="text-xs text-muted-foreground">（共 {aiTotal.toLocaleString()} 条）</span>}
          </div>
          {loading && filteredAI.length === 0 ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <RefreshCw className="h-5 w-5 animate-spin mr-2" />加载历史信号...
            </div>
          ) : (
            <>
              <div className="space-y-1.5">
                {filteredAI.map(signal => (
                  <AISignalRow key={signal.id} signal={signal} />
                ))}
              </div>
              {aiTotal > PAGE_SIZE && (
                <div className="flex items-center justify-center gap-2 mt-4">
                  <Button variant="outline" size="sm" onClick={() => setAiPage(p => Math.max(1, p - 1))} disabled={aiPage === 1} className="text-xs">上一页</Button>
                  <span className="text-xs text-muted-foreground">第 {aiPage} / {Math.ceil(aiTotal / PAGE_SIZE)} 页</span>
                  <Button variant="outline" size="sm" onClick={() => setAiPage(p => p + 1)} disabled={aiPage >= Math.ceil(aiTotal / PAGE_SIZE)} className="text-xs">下一页</Button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function FundsSignalCard({ signal }: { signal: any }) {
  const catStyle = CAT_STYLES[signal.category] || CAT_STYLES.ai;
  const isLong = signal.direction === "long";
  const isShort = signal.direction === "short";
  const pct = parseFloat(String(signal.percentChange24h || "0"));

  return (
    <div className={cn("p-3 rounded-xl border transition-all hover:scale-[1.01]", catStyle.bg, catStyle.border)}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          {signal.icon ? (
            <img src={signal.icon} alt={signal.symbol} className="w-7 h-7 rounded-full" onError={e => (e.currentTarget.style.display = "none")} />
          ) : (
            <div className={cn("w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold", catStyle.bg, catStyle.text)}>
              {signal.symbol?.slice(0, 2)}
            </div>
          )}
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-bold text-foreground">{signal.symbol}</span>
              {signal.alpha && <span className="text-xs text-yellow-400">⚡ Alpha</span>}
              {signal.fomo && <span className="text-xs text-orange-400">🔥 FOMO</span>}
              {signal.fomoEscalation && <span className="text-xs text-red-400">🚀 升级</span>}
            </div>
            <div className={cn("text-xs", catStyle.text)}>{signal.signalName}</div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          {isLong && <TrendingUp className="h-3.5 w-3.5 text-green-400" />}
          {isShort && <TrendingDown className="h-3.5 w-3.5 text-red-400" />}
          {!isLong && !isShort && <Minus className="h-3.5 w-3.5 text-yellow-400" />}
        </div>
      </div>
      <div className="flex items-center justify-between text-xs">
        <span className="font-mono text-foreground">${parseFloat(String(signal.price || "0")).toFixed(4)}</span>
        <span className={cn("font-mono font-medium", pct >= 0 ? "text-green-400" : "text-red-400")}>
          {pct >= 0 ? "+" : ""}{pct.toFixed(2)}%
        </span>
        {signal.bullishRatio > 0 && (
          <span className="text-muted-foreground">
            看涨 <span className={cn(signal.bullishRatio >= 60 ? "text-green-400" : signal.bullishRatio >= 40 ? "text-yellow-400" : "text-red-400")}>
              {signal.bullishRatio?.toFixed(0)}%
            </span>
          </span>
        )}
        <span className="text-muted-foreground">
          {signal.updateTime ? new Date(signal.updateTime).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" }) : "—"}
        </span>
      </div>
    </div>
  );
}

function AISignalRow({ signal }: { signal: any }) {
  const catStyle = CAT_STYLES[signal.category] || CAT_STYLES.ai;
  const isLong = signal.direction === "long";
  const isShort = signal.direction === "short";
  const pct = signal.percentChange24h || 0;

  return (
    <div className={cn("flex items-center gap-3 px-3 py-2 rounded-lg border transition-colors hover:bg-accent/30", catStyle.border, "bg-background/30")}>
      {signal.icon ? (
        <img src={signal.icon} alt={signal.symbol} className="w-6 h-6 rounded-full flex-shrink-0" onError={e => (e.currentTarget.style.display = "none")} />
      ) : (
        <div className={cn("w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0", catStyle.bg, catStyle.text)}>
          {signal.symbol?.slice(0, 1)}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-foreground">{signal.symbol}</span>
          <span className={cn("text-xs px-1.5 py-0.5 rounded border", catStyle.badge)}>{signal.signalName}</span>
        </div>
      </div>
      <div className="flex items-center gap-3 text-xs flex-shrink-0">
        {signal.price > 0 && (
          <span className="font-mono text-foreground">
            ${signal.price > 1000 ? signal.price.toFixed(2) : signal.price > 1 ? signal.price.toFixed(4) : signal.price.toFixed(6)}
          </span>
        )}
        <span className={cn("font-mono w-14 text-right", pct >= 0 ? "text-green-400" : "text-red-400")}>
          {pct >= 0 ? "+" : ""}{pct.toFixed(2)}%
        </span>
        <div className="w-4">
          {isLong ? <TrendingUp className="h-3.5 w-3.5 text-green-400" /> :
           isShort ? <TrendingDown className="h-3.5 w-3.5 text-red-400" /> :
           <Minus className="h-3.5 w-3.5 text-yellow-400" />}
        </div>
        <span className="text-muted-foreground w-20 text-right">
          {new Date(signal.createTime).toLocaleString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>
    </div>
  );
}
