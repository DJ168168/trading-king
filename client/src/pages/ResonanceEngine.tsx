import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  RefreshCw, Flame, Target, TrendingUp, TrendingDown, Zap,
  Activity, BarChart2, AlertTriangle, CheckCircle2, XCircle,
  Brain, DollarSign, Shield
} from "lucide-react";
import PageHeader from "@/components/PageHeader";
import {
  RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip
} from "recharts";

const SYMBOLS = ["BTC", "ETH", "SOL", "BNB", "XRP", "DOGE", "ADA", "AVAX"];

const DIMENSION_CONFIG = [
  { key: "aiScore", label: "AI 信号质量", icon: Brain, weight: 25, desc: "Alpha/FOMO 标记综合评分" },
  { key: "costScore", label: "主力成本偏离", icon: Target, weight: 20, desc: "当前价 vs 主力成本偏离度" },
  { key: "flowScore", label: "资金流方向", icon: DollarSign, weight: 20, desc: "现货+合约净流入方向" },
  { key: "lsScore", label: "多空比评分", icon: BarChart2, weight: 15, desc: "OKX 合约持仓多空占比" },
  { key: "techScore", label: "技术面评分", icon: Activity, weight: 10, desc: "RSI/MACD/布林带/EMA" },
  { key: "sentimentScore", label: "市场情绪", icon: Flame, weight: 5, desc: "恐惧贪婪指数" },
  { key: "bullishScore", label: "看涨情绪", icon: TrendingUp, weight: 5, desc: "看涨情绪百分比" },
];

function ScoreBadge({ score, recommendation }: { score: number; recommendation: string }) {
  const color =
    score >= 75 ? "bg-green-500/20 text-green-400 border-green-500/30" :
    score >= 60 ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" :
    score >= 45 ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" :
    score >= 30 ? "bg-orange-500/20 text-orange-400 border-orange-500/30" :
    "bg-red-500/20 text-red-400 border-red-500/30";
  return (
    <Badge className={`${color} text-xs font-medium`}>{recommendation}</Badge>
  );
}

function DimensionBar({ label, score, maxScore, icon: Icon, desc }: {
  label: string; score: number; maxScore: number; icon: any; desc: string;
}) {
  const pct = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
  return (
    <div className="flex items-center gap-3 py-2">
      <div className="w-6 h-6 flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-medium text-foreground truncate">{label}</span>
          <span className={`text-xs font-mono font-bold ml-2 ${
            pct >= 70 ? "text-green-400" : pct >= 40 ? "text-yellow-400" : "text-red-400"
          }`}>{score}/{maxScore}</span>
        </div>
        <Progress value={pct} className="h-1.5" />
        <p className="text-[10px] text-muted-foreground mt-0.5">{desc}</p>
      </div>
    </div>
  );
}

export default function ResonanceEngine() {
  const [selectedSymbol, setSelectedSymbol] = useState("BTC");
  const [tab, setTab] = useState("overview");

  const { data: scoreData, isLoading, refetch } = trpc.freeData.bullBearScore.useQuery(
    { symbol: selectedSymbol + "USDT" },
    { refetchInterval: 60000 }
  );

  const { data: fearGreedHistory } = trpc.freeData.fearGreedHistory.useQuery(
    { limit: 7 },
    { refetchInterval: 300000 }
  );

  const { data: lsData } = trpc.freeData.longShortRatio.useQuery(
    { symbol: selectedSymbol + "USDT", period: "1H", limit: 12 },
    { refetchInterval: 60000 }
  );

  const { data: techData } = trpc.freeData.technicalScore.useQuery(
    { symbol: selectedSymbol + "USDT", interval: "1h" },
    { refetchInterval: 60000 }
  );

  const score = scoreData?.score;

  // 构建雷达图数据（基于 factors 字段）
  const radarData = DIMENSION_CONFIG.map(d => ({
    subject: d.label.replace("评分", "").replace("方向", "").replace("偏离", ""),
    value: score ? Math.min(100, Math.max(0, Math.round(((score.bullScore ?? 0) / 100) * d.weight * 4))) : 0,
    fullMark: 100,
  }));

  // 构建多空比历史图表
  const lsChartData = (lsData?.data ?? []).slice(-12).map((item: any) => ({
    time: new Date(item.ts).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" }),
    long: parseFloat(item.longRatio ?? item.longPct ?? "50"),
    short: parseFloat(item.shortRatio ?? item.shortPct ?? "50"),
  }));

  const totalScore = score ? Math.round((score.totalScore + 100) / 2) : 0; // -100~100 → 0~100
  const direction = score ? (score.totalScore > 15 ? "long" : score.totalScore < -15 ? "short" : "neutral") : "neutral";
  const recommendation = score?.recommendation ?? "观望";
  const confidence = score ? (score.confidence === "高" ? 85 : score.confidence === "中" ? 60 : 35) : 0;

  return (
    <div className="p-4 lg:p-6 space-y-5">
      <PageHeader
        title="🔄 信号共振引擎"
        description="多维度胜率评分 · 7大数据源综合共振检测"
        actions={
          <div className="flex items-center gap-2">
            <Select value={selectedSymbol} onValueChange={setSelectedSymbol}>
              <SelectTrigger className="h-8 w-28 text-xs bg-secondary">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SYMBOLS.map(s => (
                  <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() => { refetch(); toast.info("正在刷新共振数据..."); }}
              disabled={isLoading}
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1 ${isLoading ? "animate-spin" : ""}`} />
              刷新
            </Button>
          </div>
        }
      />

      {/* 综合评分卡片 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* 主评分 */}
        <Card className="lg:col-span-1 gradient-card">
          <CardContent className="p-6 text-center">
            <p className="text-xs text-muted-foreground mb-3">综合共振评分</p>
            <div className={`text-6xl font-bold font-mono mb-2 ${
              totalScore >= 75 ? "text-green-400" :
              totalScore >= 60 ? "text-emerald-400" :
              totalScore >= 45 ? "text-yellow-400" :
              totalScore >= 30 ? "text-orange-400" :
              "text-red-400"
            }`}>
              {isLoading ? "—" : totalScore}
            </div>
            <div className="flex justify-center mb-3">
              {!isLoading && <ScoreBadge score={totalScore} recommendation={recommendation} />}
            </div>
            <Progress value={totalScore} className="h-2 mb-2" />
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>极度看空 0</span>
              <span>中性 50</span>
              <span>极度看多 100</span>
            </div>
            <div className="mt-4 pt-4 border-t border-border">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">方向</span>
                <span className={direction === "long" ? "text-green-400" : direction === "short" ? "text-red-400" : "text-yellow-400"}>
                  {direction === "long" ? "📈 做多" : direction === "short" ? "📉 做空" : "⏸ 观望"}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs mt-2">
                <span className="text-muted-foreground">置信度</span>
                <span className="text-foreground font-mono">{confidence.toFixed(0)}%</span>
              </div>
              <div className="flex items-center justify-between text-xs mt-2">
                <span className="text-muted-foreground">数据源</span>
                <span className="text-primary text-[10px]">{scoreData?.rawData?.dataSource ? Object.values(scoreData.rawData.dataSource).filter(v => v !== "N/A").join(" · ") : "加载中"}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 雷达图 */}
        <Card className="lg:col-span-2 gradient-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">多维度共振雷达</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
                <RefreshCw className="w-5 h-5 animate-spin mr-2" />
                加载中...
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="rgba(255,255,255,0.1)" />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: "#888" }} />
                  <Radar
                    name="评分"
                    dataKey="value"
                    stroke={totalScore >= 60 ? "#22c55e" : totalScore >= 45 ? "#eab308" : "#ef4444"}
                    fill={totalScore >= 60 ? "#22c55e" : totalScore >= 45 ? "#eab308" : "#ef4444"}
                    fillOpacity={0.2}
                  />
                </RadarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 详细分析 */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-secondary">
          <TabsTrigger value="overview" className="text-xs">维度详情</TabsTrigger>
          <TabsTrigger value="signals" className="text-xs">信号列表</TabsTrigger>
          <TabsTrigger value="longshort" className="text-xs">多空比历史</TabsTrigger>
          <TabsTrigger value="technical" className="text-xs">技术面</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card className="gradient-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">各维度评分详情</CardTitle>
            </CardHeader>
            <CardContent className="divide-y divide-border">
              {score?.factors?.map((f, i) => (
                <DimensionBar
                  key={i}
                  label={f.name}
                  score={Math.round(Math.max(0, f.score + f.weight))}
                  maxScore={f.weight * 2}
                  icon={DIMENSION_CONFIG[i % DIMENSION_CONFIG.length]?.icon ?? Activity}
                  desc={f.description}
                />
              )) ?? DIMENSION_CONFIG.map(d => (
                <DimensionBar
                  key={d.key}
                  label={d.label}
                  score={0}
                  maxScore={d.weight}
                  icon={d.icon}
                  desc={d.desc}
                />
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="signals">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="gradient-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-400" />
                  看多信号
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {isLoading ? (
                  <p className="text-xs text-muted-foreground">加载中...</p>
                ) : (score?.factors?.filter(f => f.signal === "bullish") ?? []).length > 0 ? (
                  (score?.factors?.filter(f => f.signal === "bullish") ?? []).map((f, i: number) => ({
                    content: `${f.name}: ${f.value} (${f.description})`,
                    key: i,
                  })).map(({ content, key }) => (
                    <div key={key} className="flex items-start gap-2 p-2 bg-green-950/20 rounded-lg border border-green-500/20">
                      <TrendingUp className="w-3.5 h-3.5 text-green-400 shrink-0 mt-0.5" />
                      <span className="text-xs text-foreground">{content}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground text-center py-4">暂无看多信号</p>
                )}
              </CardContent>
            </Card>

            <Card className="gradient-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-orange-400" />
                  风险警告
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {isLoading ? (
                  <p className="text-xs text-muted-foreground">加载中...</p>
                ) : (score?.factors?.filter(f => f.signal === "bearish") ?? []).length > 0 ? (
                  (score?.factors?.filter(f => f.signal === "bearish") ?? []).map((f, i: number) => ({
                    content: `${f.name}: ${f.value} (${f.description})`,
                    key: i,
                  })).map(({ content, key }) => (
                    <div key={key} className="flex items-start gap-2 p-2 bg-orange-950/20 rounded-lg border border-orange-500/20">
                      <AlertTriangle className="w-3.5 h-3.5 text-orange-400 shrink-0 mt-0.5" />
                      <span className="text-xs text-foreground">{content}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground text-center py-4">暂无风险警告</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="longshort">
          <Card className="gradient-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">OKX 多空比历史（近12小时）</CardTitle>
            </CardHeader>
            <CardContent>
              {lsChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={lsChartData} barGap={0}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="time" tick={{ fontSize: 10, fill: "#888" }} />
                    <YAxis tick={{ fontSize: 10, fill: "#888" }} domain={[0, 100]} />
                    <Tooltip
                      contentStyle={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: 8 }}
                      labelStyle={{ color: "#888", fontSize: 11 }}
                    />
                    <Bar dataKey="long" name="多头%" fill="#22c55e" opacity={0.8} radius={[2, 2, 0, 0]} />
                    <Bar dataKey="short" name="空头%" fill="#ef4444" opacity={0.8} radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
                  <XCircle className="w-5 h-5 mr-2 opacity-50" />
                  暂无多空比数据
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="technical">
          <Card className="gradient-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">技术面分析 — {selectedSymbol}/USDT 1H</CardTitle>
            </CardHeader>
            <CardContent>
              {techData?.data ? (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  {[
                    { label: "RSI (14)", value: (techData.data as any).rsi?.toFixed(1) ?? "—", signal: (techData.data as any).rsiSignal, icon: Activity },
                    { label: "MACD", value: (techData.data as any).macdSignal ?? "—", signal: (techData.data as any).macdSignal, icon: BarChart2 },
                    { label: "布林带", value: (techData.data as any).bbSignal ?? "—", signal: (techData.data as any).bbSignal, icon: Shield },
                    { label: "EMA 趋势", value: (techData.data as any).emaTrend ?? "—", signal: (techData.data as any).emaTrend, icon: TrendingUp },
                  ].map(item => (
                    <div key={item.label} className="p-3 bg-secondary/30 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <item.icon className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="text-[10px] text-muted-foreground">{item.label}</span>
                      </div>
                      <p className={`text-sm font-bold font-mono ${
                        (item.signal ?? "").includes("多") || (item.signal ?? "").includes("bullish") || (item.signal ?? "").includes("上") ? "text-green-400" :
                        (item.signal ?? "").includes("空") || (item.signal ?? "").includes("bearish") || (item.signal ?? "").includes("下") ? "text-red-400" :
                        "text-yellow-400"
                      }`}>{item.value}</p>
                    </div>
                  ))}
                  {(techData.data as any).score != null && (
                    <div className="col-span-2 lg:col-span-4 p-3 bg-primary/5 rounded-lg border border-primary/20">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">技术面综合评分</span>
                        <span className={`text-lg font-bold font-mono ${
                          (techData.data as any).score >= 7 ? "text-green-400" :
                          (techData.data as any).score >= 4 ? "text-yellow-400" : "text-red-400"
                        }`}>{(techData.data as any).score}/10</span>
                      </div>
                      <Progress value={(techData.data as any).score * 10} className="h-1.5 mt-2" />
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
                  <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                  加载技术面数据...
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 恐惧贪婪指数历史 */}
      {fearGreedHistory?.data && fearGreedHistory.data.length > 0 && (
        <Card className="gradient-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Flame className="w-4 h-4 text-orange-400" />
              恐惧贪婪指数（近7天）
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2 h-16">
              {fearGreedHistory.data.map((item: any, i: number) => {
                const val = parseInt(item.value ?? "50");
                const color = val >= 75 ? "#22c55e" : val >= 55 ? "#86efac" : val >= 45 ? "#eab308" : val >= 25 ? "#f97316" : "#ef4444";
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className="w-full rounded-t-sm transition-all"
                      style={{ height: `${val}%`, backgroundColor: color, opacity: 0.8 }}
                    />
                    <span className="text-[9px] text-muted-foreground">{val}</span>
                    <span className="text-[9px] text-muted-foreground truncate w-full text-center">
                      {new Date(item.timestamp * 1000).toLocaleDateString("zh-CN", { month: "numeric", day: "numeric" })}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between text-[10px] text-muted-foreground mt-2">
              <span className="text-red-400">极度恐惧 0-25</span>
              <span className="text-yellow-400">中性 45-55</span>
              <span className="text-green-400">极度贪婪 75-100</span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
