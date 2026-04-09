import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RefreshCw, TrendingUp, TrendingDown, Zap, Star, AlertTriangle, Info, Clock } from "lucide-react";

// AI 分数评级
function getAIScoreLevel(score: number): { label: string; color: string; bg: string } {
  if (score > 80) return { label: "过热风险", color: "text-red-400", bg: "bg-red-500/10 border-red-500/30" };
  if (score > 55) return { label: "较正面", color: "text-green-400", bg: "bg-green-500/10 border-green-500/30" };
  if (score > 45) return { label: "观察中", color: "text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/30" };
  return { label: "较负面", color: "text-red-500", bg: "bg-red-900/10 border-red-900/30" };
}

// 看涨情绪颜色
function getBullishColor(pct: number): string {
  if (pct >= 70) return "text-green-400";
  if (pct >= 50) return "text-yellow-400";
  return "text-red-400";
}

// 格式化时间
function fmtTime(ts: number | string): string {
  if (!ts) return "—";
  const d = typeof ts === "number" ? new Date(ts) : new Date(ts);
  return d.toLocaleString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

// 格式化百分比
function fmtPct(v: number | string | undefined): string {
  if (v === undefined || v === null) return "—";
  const n = typeof v === "string" ? parseFloat(v) : v;
  return isNaN(n) ? "—" : `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;
}

// 格式化市值
function fmtMarketCap(v: number | string | undefined): string {
  if (!v) return "—";
  const n = typeof v === "string" ? parseFloat(v) : v;
  if (isNaN(n)) return "—";
  if (n >= 1e12) return `${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  return n.toFixed(0);
}

export default function AILongShort() {
  const [signalType, setSignalType] = useState<"long" | "short">("long");
  const [refreshKey, setRefreshKey] = useState(0);
  const [filterAlphaFomo, setFilterAlphaFomo] = useState(false);

  const { data, isLoading, error, refetch } = trpc.vsData.aiLongShort.useQuery(
    { type: signalType },
    { refetchInterval: 60000 }
  );

  // 同时获取恐惧贪婪指数
  const { data: fearGreed } = trpc.valueScan.fearGreed.useQuery(undefined, { refetchInterval: 300000 });

  const allItems: any[] = useMemo(() => {
    if (!data?.success || !data.data) return [];
    if (Array.isArray(data.data)) return data.data;
    return [];
  }, [data]);

  const items: any[] = useMemo(() => {
    if (!filterAlphaFomo) return allItems;
    return allItems.filter((item: any) => {
      const isAlpha = item.keyword === 1 || item.isAlpha;
      const isFomo = item.keyword === 2 || item.isFomo;
      return isAlpha && isFomo;
    });
  }, [allItems, filterAlphaFomo]);

  const alphaFomoCount = useMemo(() => allItems.filter((item: any) => {
    const isAlpha = item.keyword === 1 || item.isAlpha;
    const isFomo = item.keyword === 2 || item.isFomo;
    return isAlpha && isFomo;
  }).length, [allItems]);

  const handleRefresh = () => {
    refetch();
    setRefreshKey(k => k + 1);
  };

  return (
    <div className="p-4 md:p-6 space-y-5">
      {/* 页头 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Zap className="w-6 h-6 text-yellow-400" />
            AI 多空信号
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            基于 ValueScan AI 模型实时分析资金流向，识别具有套利潜力的代币
          </p>
        </div>
        <div className="flex items-center gap-2">
          {fearGreed?.success && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm"
              style={{ borderColor: fearGreed.color + "50", background: fearGreed.color + "15" }}>
              <span style={{ color: fearGreed.color }} className="font-bold">{fearGreed.value}</span>
              <span className="text-muted-foreground">{fearGreed.label}</span>
            </div>
          )}
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 mr-1.5 ${isLoading ? "animate-spin" : ""}`} />
            刷新
          </Button>
        </div>
      </div>

      {/* 信号说明卡片 */}
      <Alert className="border-blue-500/30 bg-blue-500/5">
        <Info className="w-4 h-4 text-blue-400" />
        <AlertDescription className="text-sm text-muted-foreground space-y-1">
          <p>
            <span className="text-yellow-400 font-semibold">Alpha ⚡</span> 信号：鲸鱼异常高活跃度，价格上涨概率更大，越早信号风险越低。
          </p>
          <p>
            <span className="text-purple-400 font-semibold">FOMO 🔥</span> 信号：市场整体热情高涨，FOMO 信号越频繁，价格上涨可能性越高。
          </p>
          <p>
            <span className="text-orange-400 font-semibold">橙色高亮</span>：警惕潜在的突然抛售风险，谨慎操作。
          </p>
        </AlertDescription>
      </Alert>

      {/* AI 分数评级说明 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { range: "< 45", label: "较负面", color: "text-red-500", bg: "bg-red-900/10 border-red-900/30" },
          { range: "45 ~ 55", label: "观察中", color: "text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/30" },
          { range: "55 ~ 80", label: "较正面", color: "text-green-400", bg: "bg-green-500/10 border-green-500/30" },
          { range: "> 80", label: "过热风险", color: "text-red-400", bg: "bg-red-500/10 border-red-500/30" },
        ].map(item => (
          <div key={item.range} className={`rounded-lg border p-3 text-center ${item.bg}`}>
            <div className={`text-lg font-bold ${item.color}`}>{item.range}</div>
            <div className="text-xs text-muted-foreground mt-0.5">AI 分数 → {item.label}</div>
          </div>
        ))}
      </div>

      {/* 多空切换 + Alpha+FOMO 筛选 */}
      <Tabs value={signalType} onValueChange={v => setSignalType(v as "long" | "short")}>
        <div className="flex items-center gap-3 flex-wrap">
          <TabsList className="grid w-full max-w-xs grid-cols-2">
            <TabsTrigger value="long" className="flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-green-400" />
              多头流入预警
            </TabsTrigger>
            <TabsTrigger value="short" className="flex items-center gap-1.5">
              <TrendingDown className="w-4 h-4 text-red-400" />
              空头流出预警
            </TabsTrigger>
          </TabsList>
          <button
            onClick={() => setFilterAlphaFomo(f => !f)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
              filterAlphaFomo
                ? "bg-purple-500/20 border-purple-500/50 text-purple-300"
                : "bg-background border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            <span>⚡️🔥</span>
            <span>Alpha+FOMO 双标记筛选</span>
            {alphaFomoCount > 0 && (
              <span className={`ml-1 px-1.5 py-0.5 rounded text-xs ${
                filterAlphaFomo ? "bg-purple-500/30 text-purple-200" : "bg-muted text-muted-foreground"
              }`}>
                {alphaFomoCount} 个
              </span>
            )}
          </button>
          {filterAlphaFomo && (
            <span className="text-xs text-purple-400">
              仅显示同时具有 ⚡ Alpha 和 🔥 FOMO 双标记的信号（共振最强）
            </span>
          )}
        </div>
      </Tabs>

      {/* 数据表格 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center justify-between">
            <span>
              {signalType === "long" ? "多头流入预警" : "空头流出预警"}
              {items.length > 0 && (
                <Badge variant="secondary" className="ml-2 text-xs">{items.length} 项</Badge>
              )}
            </span>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="w-3 h-3" />
              每分钟自动刷新
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <RefreshCw className="w-5 h-5 animate-spin mr-2" />
              正在加载 AI 信号数据...
            </div>
          ) : error || !data?.success ? (
            <div className="text-center py-12 space-y-2">
              <AlertTriangle className="w-8 h-8 text-yellow-400 mx-auto" />
              <p className="text-muted-foreground text-sm">
                {data?.error || error?.message || "获取数据失败，请检查 ValueScan 账号配置"}
              </p>
              <Button variant="outline" size="sm" onClick={handleRefresh}>重试</Button>
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Zap className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p>暂无{signalType === "long" ? "多头" : "空头"}信号</p>
              <p className="text-xs mt-1">AI 正在持续监控市场，有信号时会立即显示</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-muted-foreground text-xs">
                    <th className="text-left py-2 px-2 font-medium">#</th>
                    <th className="text-left py-2 px-2 font-medium">代币</th>
                    <th className="text-left py-2 px-2 font-medium">初始预警时间</th>
                    <th className="text-left py-2 px-2 font-medium">最新预警时间</th>
                    <th className="text-right py-2 px-2 font-medium">标记价格</th>
                    <th className="text-right py-2 px-2 font-medium">当前价格</th>
                    <th className="text-right py-2 px-2 font-medium">最大涨幅</th>
                    <th className="text-right py-2 px-2 font-medium">最大亏损</th>
                    <th className="text-right py-2 px-2 font-medium">看涨情绪</th>
                    <th className="text-center py-2 px-2 font-medium">类型</th>
                    <th className="text-right py-2 px-2 font-medium">市值</th>
                    <th className="text-center py-2 px-2 font-medium">短期信号</th>
                    <th className="text-center py-2 px-2 font-medium">趋势信号</th>
                    <th className="text-center py-2 px-2 font-medium">标记</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item: any, idx: number) => {
                    const isAlpha = item.keyword === 1 || item.isAlpha;
                    const isFomo = item.keyword === 2 || item.isFomo;
                    const isRisk = item.isRisk;
                    const bullishPct = parseFloat(item.bullishSentiment ?? item.bullishPercent ?? "0");
                    const aiScore = item.aiScore ?? item.score ?? 0;
                    const scoreLevel = aiScore > 0 ? getAIScoreLevel(aiScore) : null;
                    const maxGain = parseFloat(item.maxGain ?? item.maxProfit ?? "0");
                    const maxLoss = parseFloat(item.maxLoss ?? item.maxDrawdown ?? "0");

                    return (
                      <tr
                        key={item.id ?? idx}
                        className={`border-b border-border/50 hover:bg-muted/30 transition-colors ${isRisk ? "bg-orange-500/5" : ""}`}
                      >
                        <td className="py-2.5 px-2 text-muted-foreground">{idx + 1}</td>
                        <td className="py-2.5 px-2">
                          <div className="flex items-center gap-1.5">
                            {item.icon && (
                              <img src={item.icon} alt={item.symbol} className="w-5 h-5 rounded-full" onError={e => (e.currentTarget.style.display = "none")} />
                            )}
                            <span className={`font-semibold ${isRisk ? "text-orange-400" : "text-foreground"}`}>
                              {item.symbol ?? item.tokenSymbol ?? "—"}
                            </span>
                          </div>
                        </td>
                        <td className="py-2.5 px-2 text-muted-foreground text-xs">{fmtTime(item.iat ?? item.initialAlertTime ?? item.createTime)}</td>
                        <td className="py-2.5 px-2 text-muted-foreground text-xs">{fmtTime(item.lat ?? item.latestAlertTime ?? item.updateTime)}</td>
                        <td className="py-2.5 px-2 text-right font-mono">
                          ${parseFloat(item.markPrice ?? item.price ?? "0").toLocaleString()}
                        </td>
                        <td className="py-2.5 px-2 text-right font-mono">
                          ${parseFloat(item.currentPrice ?? item.price ?? "0").toLocaleString()}
                        </td>
                        <td className="py-2.5 px-2 text-right">
                          <span className={maxGain >= 0 ? "text-green-400" : "text-red-400"}>{fmtPct(maxGain)}</span>
                        </td>
                        <td className="py-2.5 px-2 text-right">
                          <span className="text-red-400">{fmtPct(maxLoss)}</span>
                        </td>
                        <td className="py-2.5 px-2 text-right">
                          <span className={getBullishColor(bullishPct)}>{bullishPct > 0 ? `${bullishPct.toFixed(2)}%` : "—"}</span>
                        </td>
                        <td className="py-2.5 px-2 text-center">
                          <Badge variant="outline" className="text-xs">
                            {item.tradeType === 1 || item.type === "Futures" ? "合约" : item.tradeType === 2 || item.type === "Spot" ? "现货" : item.type ?? "—"}
                          </Badge>
                        </td>
                        <td className="py-2.5 px-2 text-right text-muted-foreground text-xs">
                          {fmtMarketCap(item.marketCap ?? item.market_cap)}
                        </td>
                        <td className="py-2.5 px-2 text-center">
                          <span className="font-semibold text-blue-400">{item.shortTermSignals ?? item.shortSignals ?? "—"}</span>
                        </td>
                        <td className="py-2.5 px-2 text-center">
                          <span className="font-semibold text-purple-400">{item.trendSignals ?? item.longSignals ?? "—"}</span>
                        </td>
                        <td className="py-2.5 px-2 text-center">
                          <div className="flex items-center justify-center gap-1">
                            {isAlpha && (
                              <span title="Alpha信号：鲸鱼异常高活跃度" className="text-yellow-400 text-xs font-bold">⚡</span>
                            )}
                            {isFomo && (
                              <span title="FOMO信号：市场热情高涨" className="text-purple-400 text-xs font-bold">🔥</span>
                            )}
                            {isRisk && (
                              <span title="警惕潜在抛售风险" className="text-orange-400 text-xs font-bold">⚠</span>
                            )}
                            {scoreLevel && (
                              <span className={`text-xs ${scoreLevel.color}`}>{aiScore}</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 策略使用说明 */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
            <Star className="w-4 h-4 text-yellow-400" />
            最高胜率使用策略
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <div className="space-y-1.5">
              <div className="font-semibold text-yellow-400">第一步：筛选信号</div>
              <p className="text-muted-foreground text-xs">
                优先选择同时带有 ⚡Alpha 和 🔥FOMO 双重标记的代币，这类信号代表鲸鱼资金与市场情绪双重共振，胜率最高。
              </p>
            </div>
            <div className="space-y-1.5">
              <div className="font-semibold text-green-400">第二步：验证看涨情绪</div>
              <p className="text-muted-foreground text-xs">
                看涨情绪 &gt; 70% 为强烈看涨信号。结合主力成本页面确认主力是否在积累阶段，两者共振时入场胜率更高。
              </p>
            </div>
            <div className="space-y-1.5">
              <div className="font-semibold text-blue-400">第三步：技术面确认</div>
              <p className="text-muted-foreground text-xs">
                前往 K 线图表页面，确认价格在主力成本区间附近支撑，结合 RSI/MACD 技术指标共振后再入场。
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
