import React, { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  TrendingUp, TrendingDown, Minus, RefreshCw, ExternalLink,
  Newspaper, AlertTriangle, CheckCircle2, Clock, Zap,
  BarChart2, Globe
} from "lucide-react";

// ─── 类型 ─────────────────────────────────────────────────────────────────────

type Sentiment = "bullish" | "bearish" | "neutral";

interface NewsItem {
  id: string;
  title: string;
  summary: string;
  url: string;
  source: string;
  publishedAt: number;
  sentiment: Sentiment;
  sentimentScore: number;
  coins: string[];
  impact: "high" | "medium" | "low";
}

// ─── 辅助组件 ─────────────────────────────────────────────────────────────────

function SentimentBadge({ sentiment }: { sentiment: Sentiment }) {
  if (sentiment === "bullish") {
    return (
      <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs gap-1">
        <TrendingUp className="w-3 h-3" /> 利多
      </Badge>
    );
  }
  if (sentiment === "bearish") {
    return (
      <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-xs gap-1">
        <TrendingDown className="w-3 h-3" /> 利空
      </Badge>
    );
  }
  return (
    <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30 text-xs gap-1">
      <Minus className="w-3 h-3" /> 中性
    </Badge>
  );
}

function ImpactBadge({ impact }: { impact: "high" | "medium" | "low" }) {
  if (impact === "high") {
    return <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30 text-xs">高影响</Badge>;
  }
  if (impact === "medium") {
    return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-xs">中影响</Badge>;
  }
  return <Badge className="bg-gray-500/10 text-gray-500 border-gray-500/20 text-xs">低影响</Badge>;
}

function SourceBadge({ source }: { source: string }) {
  const colors: Record<string, string> = {
    CoinDesk: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    CoinTelegraph: "bg-purple-500/20 text-purple-400 border-purple-500/30",
    Decrypt: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
    CryptoNews: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30",
  };
  const cls = colors[source] || "bg-gray-500/20 text-gray-400 border-gray-500/30";
  return <Badge className={`${cls} text-xs`}>{source}</Badge>;
}

function NewsCard({ item }: { item: NewsItem }) {
  const timeAgo = useMemo(() => {
    const diff = Date.now() - item.publishedAt;
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}分钟前`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}小时前`;
    return `${Math.floor(hrs / 24)}天前`;
  }, [item.publishedAt]);

  const borderColor = item.sentiment === "bullish"
    ? "border-l-green-500"
    : item.sentiment === "bearish"
    ? "border-l-red-500"
    : "border-l-gray-600";

  return (
    <div className={`border-l-2 ${borderColor} pl-3 py-2 space-y-1.5`}>
      <div className="flex items-start justify-between gap-2">
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-medium text-foreground hover:text-primary transition-colors leading-snug flex-1"
        >
          {item.title}
          <ExternalLink className="w-3 h-3 inline ml-1 opacity-50" />
        </a>
      </div>
      {item.summary && (
        <p className="text-xs text-muted-foreground line-clamp-2">{item.summary}</p>
      )}
      <div className="flex items-center gap-1.5 flex-wrap">
        <SentimentBadge sentiment={item.sentiment} />
        <ImpactBadge impact={item.impact} />
        <SourceBadge source={item.source} />
        {item.coins.slice(0, 3).map(c => (
          <Badge key={c} variant="outline" className="text-xs px-1.5 py-0">{c}</Badge>
        ))}
        <span className="text-xs text-muted-foreground ml-auto flex items-center gap-1">
          <Clock className="w-3 h-3" />{timeAgo}
        </span>
      </div>
    </div>
  );
}

// ─── 情绪仪表盘 ───────────────────────────────────────────────────────────────

function SentimentGauge({ score, sentiment }: { score: number; sentiment: Sentiment }) {
  const normalized = ((score + 100) / 200) * 100; // 0-100
  const color = sentiment === "bullish" ? "text-green-400" : sentiment === "bearish" ? "text-red-400" : "text-yellow-400";
  const label = sentiment === "bullish" ? "利多偏向" : sentiment === "bearish" ? "利空偏向" : "情绪中性";
  const icon = sentiment === "bullish" ? <TrendingUp className="w-5 h-5" /> : sentiment === "bearish" ? <TrendingDown className="w-5 h-5" /> : <Minus className="w-5 h-5" />;

  return (
    <div className="text-center space-y-2">
      <div className={`text-4xl font-bold ${color} flex items-center justify-center gap-2`}>
        {icon}
        {score > 0 ? "+" : ""}{score}
      </div>
      <div className={`text-sm font-medium ${color}`}>{label}</div>
      <div className="space-y-1">
        <Progress value={normalized} className="h-2" />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>极度利空 -100</span>
          <span>极度利多 +100</span>
        </div>
      </div>
    </div>
  );
}

// ─── 主组件 ───────────────────────────────────────────────────────────────────

export default function NewsPanel() {
  const [activeTab, setActiveTab] = useState("all");
  const [filterSentiment, setFilterSentiment] = useState<Sentiment | "all">("all");

  const { data: newsData, isLoading, refetch, isFetching } = trpc.news.sentiment.useQuery(
    {},
    { refetchInterval: 5 * 60 * 1000 } // 每5分钟刷新
  );

  const refreshMutation = trpc.news.refresh.useMutation({
    onSuccess: () => refetch(),
  });

  const summary = newsData?.data;

  const filteredItems = useMemo(() => {
    if (!summary?.items) return [];
    let items = summary.items;
    if (filterSentiment !== "all") {
      items = items.filter(i => i.sentiment === filterSentiment);
    }
    return items;
  }, [summary?.items, filterSentiment]);

  const fetchedAgo = useMemo(() => {
    if (!summary?.fetchedAt) return "";
    const diff = Date.now() - summary.fetchedAt;
    const mins = Math.floor(diff / 60000);
    return mins < 1 ? "刚刚" : `${mins}分钟前`;
  }, [summary?.fetchedAt]);

  // 新闻情绪对多空评分的影响说明
  const impactOnScore = useMemo(() => {
    if (!summary) return null;
    const s = summary.sentimentScore;
    if (s >= 30) return { text: "新闻情绪强烈利多，建议做多", color: "text-green-400", icon: <TrendingUp className="w-4 h-4" /> };
    if (s >= 10) return { text: "新闻情绪偏多，支持做多", color: "text-green-300", icon: <TrendingUp className="w-4 h-4" /> };
    if (s <= -30) return { text: "新闻情绪强烈利空，建议做空或观望", color: "text-red-400", icon: <TrendingDown className="w-4 h-4" /> };
    if (s <= -10) return { text: "新闻情绪偏空，谨慎做多", color: "text-red-300", icon: <TrendingDown className="w-4 h-4" /> };
    return { text: "新闻情绪中性，不影响方向判断", color: "text-yellow-400", icon: <Minus className="w-4 h-4" /> };
  }, [summary]);

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <div className="h-8 w-48 bg-muted/30 rounded animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-32 bg-muted/20 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-6xl mx-auto">
      {/* 标题栏 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Newspaper className="w-5 h-5 text-primary" />
            新闻情绪面板
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            实时聚合 CoinDesk / CoinTelegraph / Decrypt / CryptoNews · 5分钟缓存
            {fetchedAgo && ` · 上次更新：${fetchedAgo}`}
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => refreshMutation.mutate()}
          disabled={isFetching || refreshMutation.isPending}
        >
          <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${(isFetching || refreshMutation.isPending) ? "animate-spin" : ""}`} />
          刷新
        </Button>
      </div>

      {/* 顶部统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="bg-card/50">
          <CardContent className="pt-4 pb-3">
            <div className="text-2xl font-bold text-foreground">{summary?.items.length ?? 0}</div>
            <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
              <Globe className="w-3 h-3" /> 总新闻条数
            </div>
          </CardContent>
        </Card>
        <Card className="bg-green-500/5 border-green-500/20">
          <CardContent className="pt-4 pb-3">
            <div className="text-2xl font-bold text-green-400">{summary?.bullishCount ?? 0}</div>
            <div className="text-xs text-green-400/70 flex items-center gap-1 mt-0.5">
              <TrendingUp className="w-3 h-3" /> 利多新闻
            </div>
          </CardContent>
        </Card>
        <Card className="bg-red-500/5 border-red-500/20">
          <CardContent className="pt-4 pb-3">
            <div className="text-2xl font-bold text-red-400">{summary?.bearishCount ?? 0}</div>
            <div className="text-xs text-red-400/70 flex items-center gap-1 mt-0.5">
              <TrendingDown className="w-3 h-3" /> 利空新闻
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50">
          <CardContent className="pt-4 pb-3">
            <div className="text-2xl font-bold text-muted-foreground">{summary?.neutralCount ?? 0}</div>
            <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
              <Minus className="w-3 h-3" /> 中性新闻
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* 左侧：情绪仪表盘 */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-primary" />
                新闻情绪综合评分
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <SentimentGauge
                score={summary?.sentimentScore ?? 0}
                sentiment={summary?.overallSentiment ?? "neutral"}
              />

              {/* 对多空评分的影响 */}
              {impactOnScore && (
                <div className={`flex items-center gap-2 text-xs ${impactOnScore.color} bg-current/5 rounded-lg p-2.5 border border-current/20`}>
                  {impactOnScore.icon}
                  <span>{impactOnScore.text}</span>
                </div>
              )}

              {/* 数据源分布 */}
              <div className="space-y-1.5">
                <div className="text-xs text-muted-foreground font-medium">数据源分布</div>
                {["CoinDesk", "CoinTelegraph", "Decrypt", "CryptoNews"].map(src => {
                  const count = summary?.items.filter(i => i.source === src).length ?? 0;
                  const total = summary?.items.length ?? 1;
                  return (
                    <div key={src} className="flex items-center gap-2 text-xs">
                      <span className="w-24 text-muted-foreground truncate">{src}</span>
                      <Progress value={(count / total) * 100} className="h-1.5 flex-1" />
                      <span className="w-6 text-right text-muted-foreground">{count}</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* 重要利多新闻 */}
          {(summary?.topBullish?.length ?? 0) > 0 && (
            <Card className="border-green-500/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-green-400 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  重要利多新闻
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {summary!.topBullish.slice(0, 3).map(item => (
                  <div key={item.id} className="space-y-1">
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-green-300 hover:text-green-200 transition-colors leading-snug block"
                    >
                      {item.title}
                      <ExternalLink className="w-2.5 h-2.5 inline ml-1 opacity-50" />
                    </a>
                    <div className="flex items-center gap-1">
                      <SourceBadge source={item.source} />
                      <ImpactBadge impact={item.impact} />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* 重要利空新闻 */}
          {(summary?.topBearish?.length ?? 0) > 0 && (
            <Card className="border-red-500/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-red-400 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  重要利空新闻
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {summary!.topBearish.slice(0, 3).map(item => (
                  <div key={item.id} className="space-y-1">
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-red-300 hover:text-red-200 transition-colors leading-snug block"
                    >
                      {item.title}
                      <ExternalLink className="w-2.5 h-2.5 inline ml-1 opacity-50" />
                    </a>
                    <div className="flex items-center gap-1">
                      <SourceBadge source={item.source} />
                      <ImpactBadge impact={item.impact} />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        {/* 右侧：新闻流 */}
        <div className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Zap className="w-4 h-4 text-yellow-400" />
                  实时新闻流
                  <Badge variant="outline" className="text-xs">{filteredItems.length} 条</Badge>
                </CardTitle>
                {/* 情绪筛选 */}
                <div className="flex gap-1">
                  {(["all", "bullish", "bearish", "neutral"] as const).map(s => (
                    <Button
                      key={s}
                      size="sm"
                      variant={filterSentiment === s ? "default" : "ghost"}
                      className="h-6 px-2 text-xs"
                      onClick={() => setFilterSentiment(s)}
                    >
                      {s === "all" ? "全部" : s === "bullish" ? "利多" : s === "bearish" ? "利空" : "中性"}
                    </Button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="h-7 mb-3">
                  <TabsTrigger value="all" className="text-xs h-6">全部来源</TabsTrigger>
                  <TabsTrigger value="coindesk" className="text-xs h-6">CoinDesk</TabsTrigger>
                  <TabsTrigger value="cointelegraph" className="text-xs h-6">CT</TabsTrigger>
                  <TabsTrigger value="decrypt" className="text-xs h-6">Decrypt</TabsTrigger>
                </TabsList>

                <TabsContent value="all" className="mt-0">
                  <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                    {filteredItems.length === 0 ? (
                      <div className="text-center text-muted-foreground py-8 text-sm">暂无新闻数据</div>
                    ) : (
                      filteredItems.map(item => <NewsCard key={item.id} item={item} />)
                    )}
                  </div>
                </TabsContent>

                {["coindesk", "cointelegraph", "decrypt"].map(src => {
                  const srcName = src === "coindesk" ? "CoinDesk" : src === "cointelegraph" ? "CoinTelegraph" : "Decrypt";
                  const srcItems = filteredItems.filter(i => i.source === srcName);
                  return (
                    <TabsContent key={src} value={src} className="mt-0">
                      <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                        {srcItems.length === 0 ? (
                          <div className="text-center text-muted-foreground py-8 text-sm">暂无 {srcName} 新闻</div>
                        ) : (
                          srcItems.map(item => <NewsCard key={item.id} item={item} />)
                        )}
                      </div>
                    </TabsContent>
                  );
                })}
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 底部说明 */}
      <div className="text-xs text-muted-foreground bg-muted/10 rounded-lg p-3 border border-border/30">
        <strong className="text-foreground">情绪分析说明：</strong>
        基于 100+ 个利多/利空关键词对新闻标题和摘要进行情绪评分（-10 ~ +10）。高影响力新闻（含 BTC/ETH/SEC/ETF 等关键词）权重加倍。
        综合评分 ≥ +30 为强烈利多信号，≤ -30 为强烈利空信号。新闻情绪已纳入「多空综合面板」评分引擎。
      </div>
    </div>
  );
}
