import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  TrendingUp, TrendingDown, Minus, RefreshCw, ExternalLink,
  Newspaper, AlertTriangle, CheckCircle2, Clock, Zap,
  BarChart2, Globe, Search
} from "lucide-react";
import PageHeader from "@/components/PageHeader";

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
  if (impact === "high") return <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30 text-xs">高影响</Badge>;
  if (impact === "medium") return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-xs">中影响</Badge>;
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
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}小时前`;
    return `${Math.floor(hours / 24)}天前`;
  }, [item.publishedAt]);

  return (
    <Card className={`gradient-card border transition-colors hover:border-primary/30 ${
      item.sentiment === "bullish" ? "border-green-500/20" :
      item.sentiment === "bearish" ? "border-red-500/20" : "border-border"
    }`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="shrink-0 mt-0.5">
            {item.sentiment === "bullish" ? (
              <TrendingUp className="w-4 h-4 text-green-400" />
            ) : item.sentiment === "bearish" ? (
              <TrendingDown className="w-4 h-4 text-red-400" />
            ) : (
              <Minus className="w-4 h-4 text-gray-400" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-2">
              <p className="text-sm font-medium text-foreground leading-snug">{item.title}</p>
              {item.url && (
                <a href={item.url} target="_blank" rel="noopener noreferrer" className="shrink-0 text-muted-foreground hover:text-primary transition-colors">
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
            {item.summary && (
              <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{item.summary}</p>
            )}
            <div className="flex flex-wrap items-center gap-2">
              <SourceBadge source={item.source} />
              <SentimentBadge sentiment={item.sentiment} />
              <ImpactBadge impact={item.impact} />
              {item.coins.slice(0, 3).map(coin => (
                <Badge key={coin} variant="outline" className="text-[10px] px-1.5 py-0">{coin}</Badge>
              ))}
              <span className="text-[10px] text-muted-foreground ml-auto flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {timeAgo}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

const COINS = ["BTC", "ETH", "SOL", "BNB", "XRP", "DOGE", "ADA", "AVAX"];

export default function NewsSentiment() {
  const [filterSentiment, setFilterSentiment] = useState<"all" | Sentiment>("all");
  const [filterSource, setFilterSource] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCoin, setSelectedCoin] = useState("BTC");
  const [tab, setTab] = useState("all");

  const { data: newsData, isLoading, refetch } = trpc.news.sentiment.useQuery(
    { forceRefresh: false },
    { refetchInterval: 120000 }
  );

  const refreshMutation = trpc.news.refresh.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        toast.success(`已刷新 ${data.count} 条新闻`);
        refetch();
      } else {
        toast.error("刷新失败: " + (data as any).error);
      }
    },
    onError: () => toast.error("刷新失败"),
  });

  const { data: coinNewsData, isLoading: coinLoading } = trpc.news.coinSentiment.useQuery(
    { symbol: selectedCoin },
    { refetchInterval: 120000 }
  );

  const summary = newsData?.data;
  const allItems: NewsItem[] = summary?.items ?? [];

  const sources = useMemo(() => {
    const s = new Set(allItems.map(i => i.source));
    return ["all", ...Array.from(s)];
  }, [allItems]);

  const filteredItems = useMemo(() => {
    return allItems.filter(item => {
      if (filterSentiment !== "all" && item.sentiment !== filterSentiment) return false;
      if (filterSource !== "all" && item.source !== filterSource) return false;
      if (searchQuery && !item.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });
  }, [allItems, filterSentiment, filterSource, searchQuery]);

  const sentimentScore = summary?.sentimentScore ?? 0;
  const normalizedScore = Math.round((sentimentScore + 100) / 2); // -100~100 → 0~100

  return (
    <div className="p-4 lg:p-6 space-y-5">
      <PageHeader
        title="📰 新闻情绪面板"
        description="CoinDesk · CoinTelegraph · Decrypt · CryptoNews · 实时利多利空分析"
        actions={
          <Button
            variant="outline"
            size="sm"
            className="text-xs"
            onClick={() => refreshMutation.mutate()}
            disabled={refreshMutation.isPending}
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1 ${refreshMutation.isPending ? "animate-spin" : ""}`} />
            强制刷新
          </Button>
        }
      />

      {/* 情绪概览 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="gradient-card">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold font-mono text-green-400">{summary?.bullishCount ?? 0}</p>
            <p className="text-xs text-muted-foreground mt-1 flex items-center justify-center gap-1">
              <TrendingUp className="w-3 h-3 text-green-400" /> 利多新闻
            </p>
          </CardContent>
        </Card>
        <Card className="gradient-card">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold font-mono text-red-400">{summary?.bearishCount ?? 0}</p>
            <p className="text-xs text-muted-foreground mt-1 flex items-center justify-center gap-1">
              <TrendingDown className="w-3 h-3 text-red-400" /> 利空新闻
            </p>
          </CardContent>
        </Card>
        <Card className="gradient-card">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold font-mono text-gray-400">{summary?.neutralCount ?? 0}</p>
            <p className="text-xs text-muted-foreground mt-1 flex items-center justify-center gap-1">
              <Minus className="w-3 h-3" /> 中性新闻
            </p>
          </CardContent>
        </Card>
        <Card className="gradient-card">
          <CardContent className="p-4 text-center">
            <p className={`text-3xl font-bold font-mono ${
              normalizedScore >= 60 ? "text-green-400" : normalizedScore >= 40 ? "text-yellow-400" : "text-red-400"
            }`}>{isLoading ? "—" : normalizedScore}</p>
            <p className="text-xs text-muted-foreground mt-1 flex items-center justify-center gap-1">
              <Zap className="w-3 h-3 text-primary" /> 情绪评分
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 综合情绪条 */}
      <Card className="gradient-card">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">综合情绪评分</span>
            <div className="flex items-center gap-2">
              <span className={`text-lg font-bold font-mono ${
                normalizedScore >= 60 ? "text-green-400" : normalizedScore >= 40 ? "text-yellow-400" : "text-red-400"
              }`}>{normalizedScore}/100</span>
              <Badge className={
                (summary?.overallSentiment ?? "neutral") === "bullish" ? "bg-green-500/20 text-green-400 border-green-500/30" :
                (summary?.overallSentiment ?? "neutral") === "bearish" ? "bg-red-500/20 text-red-400 border-red-500/30" :
                "bg-gray-500/20 text-gray-400 border-gray-500/30"
              }>
                {(summary?.overallSentiment ?? "neutral") === "bullish" ? "📈 偏多" :
                 (summary?.overallSentiment ?? "neutral") === "bearish" ? "📉 偏空" : "⏸ 中性"}
              </Badge>
            </div>
          </div>
          <Progress value={normalizedScore} className="h-2 mb-2" />
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span className="text-red-400">极度利空 0</span>
            <span>中性 50</span>
            <span className="text-green-400">极度利多 100</span>
          </div>
          {summary?.fetchedAt && (
            <p className="text-[10px] text-muted-foreground mt-2">
              最后更新：{new Date(summary.fetchedAt).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })}
            </p>
          )}
        </CardContent>
      </Card>

      {/* 新闻列表 */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-secondary">
          <TabsTrigger value="all" className="text-xs">全部新闻</TabsTrigger>
          <TabsTrigger value="bullish" className="text-xs">利多精选</TabsTrigger>
          <TabsTrigger value="bearish" className="text-xs">利空警告</TabsTrigger>
          <TabsTrigger value="coin" className="text-xs">币种分析</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-3">
          {/* 过滤器 */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-40">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                placeholder="搜索新闻标题..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="h-8 pl-8 text-xs bg-secondary"
              />
            </div>
            <div className="flex gap-1">
              {(["all", "bullish", "bearish", "neutral"] as const).map(s => (
                <Button
                  key={s}
                  variant={filterSentiment === s ? "default" : "outline"}
                  size="sm"
                  className="text-xs h-8"
                  onClick={() => setFilterSentiment(s)}
                >
                  {s === "all" ? "全部" : s === "bullish" ? "利多" : s === "bearish" ? "利空" : "中性"}
                </Button>
              ))}
            </div>
            <div className="flex gap-1">
              {sources.slice(0, 5).map(s => (
                <Button
                  key={s}
                  variant={filterSource === s ? "default" : "outline"}
                  size="sm"
                  className="text-xs h-8"
                  onClick={() => setFilterSource(s)}
                >
                  {s === "all" ? "全部来源" : s}
                </Button>
              ))}
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center h-40 text-muted-foreground">
              <RefreshCw className="w-5 h-5 animate-spin mr-2" />
              加载新闻中...
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-muted-foreground gap-2">
              <Newspaper className="w-8 h-8 opacity-40" />
              <span>暂无新闻数据</span>
              <span className="text-xs">点击「强制刷新」获取最新新闻</span>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredItems.map(item => (
                <NewsCard key={item.id} item={item} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="bullish" className="space-y-3">
          <p className="text-xs text-muted-foreground">精选利多新闻，按影响力排序</p>
          {(summary?.topBullish ?? []).length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-muted-foreground gap-2">
              <CheckCircle2 className="w-8 h-8 opacity-40" />
              <span>暂无利多新闻</span>
            </div>
          ) : (
            (summary?.topBullish ?? []).map(item => (
              <NewsCard key={item.id} item={item as NewsItem} />
            ))
          )}
        </TabsContent>

        <TabsContent value="bearish" className="space-y-3">
          <p className="text-xs text-muted-foreground">利空警告新闻，请注意风险</p>
          {(summary?.topBearish ?? []).length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-muted-foreground gap-2">
              <AlertTriangle className="w-8 h-8 opacity-40" />
              <span>暂无利空新闻</span>
            </div>
          ) : (
            (summary?.topBearish ?? []).map(item => (
              <NewsCard key={item.id} item={item as NewsItem} />
            ))
          )}
        </TabsContent>

        <TabsContent value="coin" className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {COINS.map(coin => (
              <Button
                key={coin}
                variant={selectedCoin === coin ? "default" : "outline"}
                size="sm"
                className="text-xs"
                onClick={() => setSelectedCoin(coin)}
              >
                {coin}
              </Button>
            ))}
          </div>

          {coinLoading ? (
            <div className="flex items-center justify-center h-40 text-muted-foreground">
              <RefreshCw className="w-5 h-5 animate-spin mr-2" />
              加载 {selectedCoin} 新闻...
            </div>
          ) : coinNewsData?.data ? (
            <div className="space-y-3">
              {/* 币种情绪摘要 */}
              <Card className="gradient-card">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Globe className="w-4 h-4 text-primary" />
                      <span className="text-sm font-medium">{selectedCoin} 新闻情绪</span>
                    </div>
                    <Badge className={
                      (coinNewsData.data as any).overallSentiment === "bullish" ? "bg-green-500/20 text-green-400 border-green-500/30" :
                      (coinNewsData.data as any).overallSentiment === "bearish" ? "bg-red-500/20 text-red-400 border-red-500/30" :
                      "bg-gray-500/20 text-gray-400 border-gray-500/30"
                    }>
                      {(coinNewsData.data as any).overallSentiment === "bullish" ? "📈 偏多" :
                       (coinNewsData.data as any).overallSentiment === "bearish" ? "📉 偏空" : "⏸ 中性"}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div>
                      <p className="text-xl font-bold font-mono text-green-400">{(coinNewsData.data as any).bullishCount ?? 0}</p>
                      <p className="text-[10px] text-muted-foreground">利多</p>
                    </div>
                    <div>
                      <p className="text-xl font-bold font-mono text-red-400">{(coinNewsData.data as any).bearishCount ?? 0}</p>
                      <p className="text-[10px] text-muted-foreground">利空</p>
                    </div>
                    <div>
                      <p className="text-xl font-bold font-mono text-gray-400">{(coinNewsData.data as any).neutralCount ?? 0}</p>
                      <p className="text-[10px] text-muted-foreground">中性</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              {((coinNewsData.data as any).items ?? []).map((item: NewsItem) => (
                <NewsCard key={item.id} item={item} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-40 text-muted-foreground gap-2">
              <Newspaper className="w-8 h-8 opacity-40" />
              <span>暂无 {selectedCoin} 相关新闻</span>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
