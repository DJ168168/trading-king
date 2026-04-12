/**
 * CoinGlass 多空分析面板
 * 集成 CoinGlass API v4 全量数据：多空比率、清算、CVD、ETF资金流、恐贪指数
 */
import { useState } from "react";
import {
  Activity, AlertTriangle, ArrowDownRight, ArrowUpRight,
  BarChart2, ChevronDown, ChevronRight, DollarSign,
  Flame, RefreshCw, Shield, TrendingDown, TrendingUp,
  Zap, Eye, Database, Globe,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

// ─── 工具函数 ────────────────────────────────────────────────────────────────
function fmtUSD(v: any): string {
  const n = Number(v);
  if (isNaN(n) || n === 0) return "—";
  if (Math.abs(n) >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (Math.abs(n) >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
  return `$${n.toFixed(2)}`;
}
function fmtPct(v: any, digits = 1): string {
  const n = Number(v);
  if (isNaN(n)) return "—";
  return `${n.toFixed(digits)}%`;
}
function fmtTime(ts: number): string {
  if (!ts) return "—";
  const d = new Date(ts * 1000);
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, "0")}:00`;
}
function fmtDate(ts: number): string {
  if (!ts) return "—";
  const d = new Date(ts * 1000);
  return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}-${d.getDate().toString().padStart(2, "0")}`;
}

// ─── 多空方向标签 ─────────────────────────────────────────────────────────────
function LongShortBadge({ longPct, shortPct }: { longPct: number; shortPct: number }) {
  const isLong = longPct >= shortPct;
  const diff = Math.abs(longPct - shortPct);
  const strength = diff > 10 ? "强" : diff > 5 ? "中" : "弱";
  return (
    <span className={cn(
      "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold",
      isLong ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-red-500/20 text-red-400 border border-red-500/30"
    )}>
      {isLong ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      {isLong ? `多头${strength}势` : `空头${strength}势`}
    </span>
  );
}

// ─── 多空进度条 ───────────────────────────────────────────────────────────────
function LongShortBar({ longPct, shortPct, label }: { longPct: number; shortPct: number; label: string }) {
  const long = Math.max(0, Math.min(100, longPct));
  const short = Math.max(0, Math.min(100, shortPct));
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span className="text-emerald-400 font-medium">多 {fmtPct(long)}</span>
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="text-red-400 font-medium">空 {fmtPct(short)}</span>
      </div>
      <div className="flex h-3 rounded-full overflow-hidden bg-muted/30">
        <div className="bg-emerald-500 transition-all duration-500" style={{ width: `${long}%` }} />
        <div className="bg-red-500 transition-all duration-500" style={{ width: `${short}%` }} />
      </div>
    </div>
  );
}

// ─── 恐贪指数环形图 ───────────────────────────────────────────────────────────
function FearGreedGauge({ value }: { value: number }) {
  const angle = (value / 100) * 180 - 90;
  const color = value >= 75 ? "#f97316" : value >= 55 ? "#eab308" : value >= 45 ? "#a3a3a3" : value >= 25 ? "#22c55e" : "#3b82f6";
  const label = value >= 75 ? "极度贪婪" : value >= 55 ? "贪婪" : value >= 45 ? "中性" : value >= 25 ? "恐惧" : "极度恐惧";
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-32 h-16">
        <svg viewBox="0 0 120 60" className="w-full h-full">
          <path d="M 10 55 A 50 50 0 0 1 110 55" fill="none" stroke="#374151" strokeWidth="8" strokeLinecap="round" />
          <path d="M 10 55 A 50 50 0 0 1 110 55" fill="none" stroke={color} strokeWidth="8" strokeLinecap="round"
            strokeDasharray={`${(value / 100) * 157} 157`} />
          <g transform={`translate(60,55) rotate(${angle})`}>
            <line x1="0" y1="0" x2="0" y2="-38" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
            <circle cx="0" cy="0" r="4" fill={color} />
          </g>
        </svg>
      </div>
      <div className="text-center">
        <div className="text-3xl font-bold" style={{ color }}>{value}</div>
        <div className="text-xs font-medium mt-0.5" style={{ color }}>{label}</div>
      </div>
    </div>
  );
}

// ─── 折叠卡片 ─────────────────────────────────────────────────────────────────
function PanelCard({ title, icon: Icon, iconColor = "text-primary", badge, children, defaultOpen = true }: {
  title: string; icon: any; iconColor?: string; badge?: React.ReactNode; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Icon className={cn("w-4 h-4", iconColor)} />
          <span className="font-semibold text-sm">{title}</span>
          {badge}
        </div>
        {open ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
      </button>
      {open && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}

// ─── 迷你图表（SVG折线）─────────────────────────────────────────────────────
function MiniChart({ data, color = "#22c55e", height = 40 }: { data: number[]; color?: string; height?: number }) {
  if (!data || data.length < 2) return <div className="h-10 flex items-center justify-center text-xs text-muted-foreground">暂无数据</div>;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const w = 200, h = height;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * h}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ─── 主页面 ───────────────────────────────────────────────────────────────────
export default function CoinGlassPanel() {
  const panelQ = trpc.coinGlass.panel.useQuery(undefined, { refetchInterval: 60_000, staleTime: 30_000 });
  const panel = panelQ.data?.data;
  const loading = panelQ.isLoading;

  // 综合多空信号判断
  function getOverallSignal() {
    if (!panel) return null;
    let bullScore = 0, bearScore = 0;
    const gl = panel.globalLongShort;
    const ta = panel.topAccountRatio;
    const tp = panel.topPositionRatio;
    if (gl) { gl.longPercent > gl.shortPercent ? bullScore++ : bearScore++; }
    if (ta) { ta.longPercent > ta.shortPercent ? bullScore++ : bearScore++; }
    if (tp) { tp.longPercent > tp.shortPercent ? bullScore++ : bearScore++; }
    // CVD：买入 > 卖出 = 多头
    if (panel.cvdHistory.length > 0) {
      const last = panel.cvdHistory[panel.cvdHistory.length - 1];
      last.buy_volume_usd > last.sell_volume_usd ? bullScore++ : bearScore++;
    }
    // 恐贪：>50 = 贪婪 = 多头
    if (panel.fearGreed) { panel.fearGreed.current > 50 ? bullScore++ : bearScore++; }
    // 清算：多头清算 > 空头清算 = 空头主导（多头被清）
    if (panel.liquidationHistory.length > 0) {
      const last = panel.liquidationHistory[panel.liquidationHistory.length - 1];
      last.long_liquidation_usd > last.short_liquidation_usd ? bearScore++ : bullScore++;
    }
    const total = bullScore + bearScore;
    return { bullScore, bearScore, total, bullPct: total > 0 ? (bullScore / total) * 100 : 50 };
  }
  const signal = getOverallSignal();

  return (
    <div className="p-4 space-y-4 max-w-5xl mx-auto">
      {/* 顶部标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-primary" />
            CoinGlass 多空面板
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            数据来源：CoinGlass API v4 · 每 60 秒自动刷新
            {panel && <span className="ml-2 text-muted-foreground/60">更新于 {new Date(panel.fetchedAt).toLocaleTimeString("zh-CN")}</span>}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => panelQ.refetch()} disabled={panelQ.isFetching}>
          <RefreshCw className={cn("w-3.5 h-3.5 mr-1.5", panelQ.isFetching && "animate-spin")} />
          刷新
        </Button>
      </div>

      {/* 综合多空信号卡 */}
      {loading ? (
        <Skeleton className="h-28 w-full rounded-xl" />
      ) : signal ? (
        <div className={cn(
          "rounded-xl border p-4 flex flex-col sm:flex-row items-center gap-4",
          signal.bullPct >= 60 ? "border-emerald-500/40 bg-emerald-500/5" :
          signal.bullPct <= 40 ? "border-red-500/40 bg-red-500/5" :
          "border-yellow-500/40 bg-yellow-500/5"
        )}>
          <div className="flex-1 text-center sm:text-left">
            <div className="text-xs text-muted-foreground mb-1">综合多空信号（6 维度评分）</div>
            <div className={cn(
              "text-2xl font-black",
              signal.bullPct >= 60 ? "text-emerald-400" : signal.bullPct <= 40 ? "text-red-400" : "text-yellow-400"
            )}>
              {signal.bullPct >= 60 ? "📈 多头主导" : signal.bullPct <= 40 ? "📉 空头主导" : "⚖️ 多空均衡"}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              多头 {signal.bullScore} 维 / 空头 {signal.bearScore} 维
            </div>
          </div>
          <div className="w-full sm:w-48">
            <div className="flex h-4 rounded-full overflow-hidden bg-muted/30">
              <div className="bg-emerald-500 transition-all duration-700" style={{ width: `${signal.bullPct}%` }} />
              <div className="bg-red-500 transition-all duration-700" style={{ width: `${100 - signal.bullPct}%` }} />
            </div>
            <div className="flex justify-between text-xs mt-1">
              <span className="text-emerald-400">多 {signal.bullPct.toFixed(0)}%</span>
              <span className="text-red-400">空 {(100 - signal.bullPct).toFixed(0)}%</span>
            </div>
          </div>
        </div>
      ) : null}

      {/* 两列布局 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* ─── 全球多空账户比率 ─── */}
        <PanelCard title="全球多空账户比率" icon={Globe} iconColor="text-blue-400"
          badge={panel?.globalLongShort && <LongShortBadge longPct={panel.globalLongShort.longPercent} shortPct={panel.globalLongShort.shortPercent} />}
        >
          {loading ? <Skeleton className="h-24 w-full" /> : panel?.globalLongShort ? (
            <div className="space-y-3">
              <LongShortBar longPct={panel.globalLongShort.longPercent} shortPct={panel.globalLongShort.shortPercent} label="全球账户" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>多空比: <span className="text-foreground font-medium">{panel.globalLongShort.ratio.toFixed(3)}</span></span>
                <span>24h 历史趋势</span>
              </div>
              <MiniChart
                data={panel.globalLongShort.history.map((h: any) => h.global_account_long_percent)}
                color="#22c55e"
              />
            </div>
          ) : <div className="text-xs text-muted-foreground py-4 text-center">暂无数据</div>}
        </PanelCard>

        {/* ─── 大户账户多空比率 ─── */}
        <PanelCard title="大户账户多空比率" icon={Eye} iconColor="text-purple-400"
          badge={panel?.topAccountRatio && <LongShortBadge longPct={panel.topAccountRatio.longPercent} shortPct={panel.topAccountRatio.shortPercent} />}
        >
          {loading ? <Skeleton className="h-24 w-full" /> : panel?.topAccountRatio ? (
            <div className="space-y-3">
              <LongShortBar longPct={panel.topAccountRatio.longPercent} shortPct={panel.topAccountRatio.shortPercent} label="大户账户" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>多空比: <span className="text-foreground font-medium">{panel.topAccountRatio.ratio.toFixed(3)}</span></span>
                <span>24h 历史趋势</span>
              </div>
              <MiniChart
                data={panel.topAccountRatio.history.map((h: any) => h.top_account_long_percent)}
                color="#a855f7"
              />
            </div>
          ) : <div className="text-xs text-muted-foreground py-4 text-center">暂无数据</div>}
        </PanelCard>

        {/* ─── 大户持仓多空比率 ─── */}
        <PanelCard title="大户持仓多空比率" icon={Database} iconColor="text-cyan-400"
          badge={panel?.topPositionRatio && <LongShortBadge longPct={panel.topPositionRatio.longPercent} shortPct={panel.topPositionRatio.shortPercent} />}
        >
          {loading ? <Skeleton className="h-24 w-full" /> : panel?.topPositionRatio ? (
            <div className="space-y-3">
              <LongShortBar longPct={panel.topPositionRatio.longPercent} shortPct={panel.topPositionRatio.shortPercent} label="大户持仓" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>多空比: <span className="text-foreground font-medium">{panel.topPositionRatio.ratio.toFixed(3)}</span></span>
                <span>24h 历史趋势</span>
              </div>
              <MiniChart
                data={panel.topPositionRatio.history.map((h: any) => h.top_position_long_percent)}
                color="#06b6d4"
              />
            </div>
          ) : <div className="text-xs text-muted-foreground py-4 text-center">暂无数据</div>}
        </PanelCard>

        {/* ─── 恐贪指数 ─── */}
        <PanelCard title="恐贪指数" icon={Activity} iconColor="text-orange-400">
          {loading ? <Skeleton className="h-32 w-full" /> : panel?.fearGreed ? (
            <div className="space-y-3">
              <div className="flex items-center justify-center">
                <FearGreedGauge value={panel.fearGreed.current} />
              </div>
              <div className="text-xs text-muted-foreground text-center">30 天历史趋势</div>
              <MiniChart
                data={panel.fearGreed.history}
                color={panel.fearGreed.current >= 50 ? "#f97316" : "#3b82f6"}
              />
            </div>
          ) : <div className="text-xs text-muted-foreground py-4 text-center">暂无数据</div>}
        </PanelCard>

      </div>

      {/* ─── CVD 主动买卖量 ─── */}
      <PanelCard title="CVD 主动买卖量（BTC 24h）" icon={Zap} iconColor="text-yellow-400">
        {loading ? <Skeleton className="h-32 w-full" /> : panel?.cvdHistory && panel.cvdHistory.length > 0 ? (
          <div className="space-y-3">
            {/* 最新一根 */}
            {(() => {
              const last = panel.cvdHistory[panel.cvdHistory.length - 1];
              const buyUSD = last.buy_volume_usd;
              const sellUSD = last.sell_volume_usd;
              const total = buyUSD + sellUSD;
              const buyPct = total > 0 ? (buyUSD / total) * 100 : 50;
              return (
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-emerald-400 font-medium">主动买入 {fmtUSD(buyUSD)} ({buyPct.toFixed(1)}%)</span>
                    <span className="text-red-400 font-medium">主动卖出 {fmtUSD(sellUSD)} ({(100 - buyPct).toFixed(1)}%)</span>
                  </div>
                  <div className="flex h-3 rounded-full overflow-hidden bg-muted/30">
                    <div className="bg-emerald-500 transition-all" style={{ width: `${buyPct}%` }} />
                    <div className="bg-red-500 transition-all" style={{ width: `${100 - buyPct}%` }} />
                  </div>
                  <div className="text-xs text-muted-foreground">最新时间: {fmtTime(last.time)}</div>
                </div>
              );
            })()}
            {/* 折线图：买入量 */}
            <div className="text-xs text-muted-foreground">24h 买入量趋势（绿=买入 红=卖出）</div>
            <div className="relative">
              <MiniChart data={panel.cvdHistory.map((h: any) => h.buy_volume_usd)} color="#22c55e" height={36} />
              <div className="absolute inset-0 opacity-60">
                <MiniChart data={panel.cvdHistory.map((h: any) => h.sell_volume_usd)} color="#ef4444" height={36} />
              </div>
            </div>
          </div>
        ) : <div className="text-xs text-muted-foreground py-4 text-center">暂无数据</div>}
      </PanelCard>

      {/* ─── 清算数据 ─── */}
      <PanelCard title="爆仓清算数据" icon={Flame} iconColor="text-red-400">
        {loading ? <Skeleton className="h-48 w-full" /> : (
          <div className="space-y-4">
            {/* 清算历史图 */}
            {panel?.liquidationHistory && panel.liquidationHistory.length > 0 && (
              <div className="space-y-2">
                {(() => {
                  const last = panel.liquidationHistory[panel.liquidationHistory.length - 1];
                  const longLiq = last.long_liquidation_usd;
                  const shortLiq = last.short_liquidation_usd;
                  return (
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-center">
                        <div className="text-xs text-muted-foreground mb-1">多头爆仓（最新1h）</div>
                        <div className="text-lg font-bold text-red-400">{fmtUSD(longLiq)}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">多头被清算</div>
                      </div>
                      <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3 text-center">
                        <div className="text-xs text-muted-foreground mb-1">空头爆仓（最新1h）</div>
                        <div className="text-lg font-bold text-emerald-400">{fmtUSD(shortLiq)}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">空头被清算</div>
                      </div>
                    </div>
                  );
                })()}
                <div className="text-xs text-muted-foreground">24h 清算趋势（红=多头爆仓 绿=空头爆仓）</div>
                <div className="relative">
                  <MiniChart data={panel.liquidationHistory.map((h: any) => h.long_liquidation_usd)} color="#ef4444" height={36} />
                  <div className="absolute inset-0 opacity-60">
                    <MiniChart data={panel.liquidationHistory.map((h: any) => h.short_liquidation_usd)} color="#22c55e" height={36} />
                  </div>
                </div>
              </div>
            )}
            {/* 清算币种排行 */}
            {panel?.liquidationCoins && panel.liquidationCoins.length > 0 && (
              <div>
                <div className="text-xs text-muted-foreground mb-2">24h 清算排行（Top 10）</div>
                <div className="space-y-1.5">
                  {panel.liquidationCoins.slice(0, 10).map((coin: any, i: number) => {
                    const total = coin.liquidation_usd_24h;
                    const longLiq = coin.long_liquidation_usd_24h;
                    const shortLiq = coin.short_liquidation_usd_24h;
                    const longPct = total > 0 ? (longLiq / total) * 100 : 50;
                    return (
                      <div key={coin.symbol} className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground w-4 text-right">{i + 1}</span>
                        <span className="text-xs font-medium w-14">{coin.symbol}</span>
                        <div className="flex-1 flex h-2 rounded-full overflow-hidden bg-muted/30">
                          <div className="bg-red-500" style={{ width: `${longPct}%` }} />
                          <div className="bg-emerald-500" style={{ width: `${100 - longPct}%` }} />
                        </div>
                        <span className="text-xs text-muted-foreground w-16 text-right">{fmtUSD(total)}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-between text-xs text-muted-foreground mt-1.5">
                  <span className="text-red-400">■ 多头爆仓</span>
                  <span className="text-emerald-400">■ 空头爆仓</span>
                </div>
              </div>
            )}
          </div>
        )}
      </PanelCard>

      {/* ─── BTC ETF 资金流 ─── */}
      <PanelCard title="BTC ETF 资金流" icon={DollarSign} iconColor="text-green-400">
        {loading ? <Skeleton className="h-48 w-full" /> : panel?.etfFlows && panel.etfFlows.length > 0 ? (
          <div className="space-y-3">
            {/* 最近 7 天 */}
            <div className="space-y-1.5">
              {panel.etfFlows.slice(-7).reverse().map((d: any, i: number) => {
                const flow = d.flow_usd ?? d.netFlowUsd ?? 0;
                const isIn = flow >= 0;
                const maxFlow = Math.max(...panel.etfFlows.map((f: any) => Math.abs(f.flow_usd ?? f.netFlowUsd ?? 0)));
                const barW = maxFlow > 0 ? (Math.abs(flow) / maxFlow) * 100 : 0;
                return (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-20">{fmtDate(d.timestamp)}</span>
                    <div className="flex-1 flex items-center gap-1">
                      {isIn ? (
                        <>
                          <div className="flex-1 flex justify-end">
                            <div className="h-4 rounded-sm bg-emerald-500/80" style={{ width: `${barW / 2}%`, minWidth: flow !== 0 ? 2 : 0 }} />
                          </div>
                          <div className="w-px h-4 bg-border" />
                          <div className="flex-1" />
                        </>
                      ) : (
                        <>
                          <div className="flex-1" />
                          <div className="w-px h-4 bg-border" />
                          <div className="flex-1 flex justify-start">
                            <div className="h-4 rounded-sm bg-red-500/80" style={{ width: `${barW / 2}%`, minWidth: flow !== 0 ? 2 : 0 }} />
                          </div>
                        </>
                      )}
                    </div>
                    <span className={cn("text-xs font-medium w-20 text-right", isIn ? "text-emerald-400" : "text-red-400")}>
                      {isIn ? "+" : ""}{fmtUSD(flow)}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span className="text-emerald-400">← 净流入（看多）</span>
              <span className="text-red-400">净流出（看空）→</span>
            </div>
          </div>
        ) : <div className="text-xs text-muted-foreground py-4 text-center">暂无 ETF 数据</div>}
      </PanelCard>

      {/* 底部说明 */}
      <div className="text-xs text-muted-foreground/60 text-center pb-2 space-y-1">
        <div>数据来源：CoinGlass API v4 · Binance 合约数据</div>
        <div>多空比率基于 Binance 合约账户 · 清算数据每小时更新 · ETF 数据每日更新</div>
      </div>
    </div>
  );
}
