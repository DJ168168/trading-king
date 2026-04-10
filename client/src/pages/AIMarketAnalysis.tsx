import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Send, RefreshCw, Wifi, WifiOff, ChevronLeft, ChevronRight, TrendingUp, TrendingDown, AlertTriangle, DollarSign } from "lucide-react";

export default function AIMarketAnalysis() {
  const [marketPage, setMarketPage] = useState(1);
  const [tokenPage, setTokenPage] = useState(1);
  const [tokenType, setTokenType] = useState<"ALL" | "OPPORTUNITY" | "RISK" | "FUNDS">("ALL");
  const [expandedMarket, setExpandedMarket] = useState<number | null>(null);

  const PAGE_SIZE = 15;

  // 大盘解析历史
  const { data: marketData, refetch: refetchMarket, isLoading: marketLoading } = trpc.valueScanAI.marketHistory.useQuery(
    { page: marketPage, pageSize: PAGE_SIZE },
    { refetchInterval: 30000 }
  );

  // 代币信号历史
  const { data: tokenData, refetch: refetchToken, isLoading: tokenLoading } = trpc.valueScanAI.tokenSignalHistory.useQuery(
    { page: tokenPage, pageSize: PAGE_SIZE, type: tokenType },
    { refetchInterval: 15000 }
  );

  // SSE 状态
  const { data: sseStatus, refetch: refetchSSE } = trpc.valueScanAI.sseStatus.useQuery(undefined, { refetchInterval: 10000 });

  // 手动推送大盘解析
  const pushMarket = trpc.valueScanAI.pushMarketToTelegram.useMutation({
    onSuccess: () => toast.success("大盘解析已推送到 Telegram"),
    onError: (e) => toast.error(`推送失败: ${e.message}`),
  });

  // 手动推送代币信号
  const pushToken = trpc.valueScanAI.pushTokenSignalToTelegram.useMutation({
    onSuccess: () => toast.success("代币信号已推送到 Telegram"),
    onError: (e) => toast.error(`推送失败: ${e.message}`),
  });

  // 重启 SSE
  const restartSSE = trpc.valueScanAI.restartSSE.useMutation({
    onSuccess: () => {
      toast.success("SSE 订阅已重启");
      setTimeout(() => refetchSSE(), 2000);
    },
    onError: (e) => toast.error(`重启失败: ${e.message}`),
  });

  const marketTotal = marketData?.total ?? 0;
  const marketPages = Math.max(1, Math.ceil(marketTotal / PAGE_SIZE));
  const tokenTotal = tokenData?.total ?? 0;
  const tokenPages = Math.max(1, Math.ceil(tokenTotal / PAGE_SIZE));

  const typeColor = (type: string) => {
    if (type === "OPPORTUNITY") return "bg-green-500/20 text-green-400 border-green-500/30";
    if (type === "RISK") return "bg-red-500/20 text-red-400 border-red-500/30";
    return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
  };

  const typeLabel = (type: string) => {
    if (type === "OPPORTUNITY") return "🟢 机会";
    if (type === "RISK") return "🔴 风险";
    return "🟡 资金";
  };

  const typeIcon = (type: string) => {
    if (type === "OPPORTUNITY") return <TrendingUp className="w-3.5 h-3.5" />;
    if (type === "RISK") return <TrendingDown className="w-3.5 h-3.5" />;
    return <DollarSign className="w-3.5 h-3.5" />;
  };

  return (
    <div className="p-6 space-y-4">
      {/* 标题 + SSE 状态 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">AI 大盘解析</h1>
          <p className="text-sm text-muted-foreground mt-0.5">ValueScan AI 实时推送 · 大盘分析 · 代币信号</p>
        </div>
        <div className="flex items-center gap-3">
          {/* SSE 连接状态 */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-card border border-border">
            {sseStatus?.market ? (
              <Wifi className="w-4 h-4 text-green-400" />
            ) : (
              <WifiOff className="w-4 h-4 text-red-400" />
            )}
            <span className="text-xs text-muted-foreground">大盘</span>
            <span className={`text-xs font-medium ${sseStatus?.market ? "text-green-400" : "text-red-400"}`}>
              {sseStatus?.market ? "已连接" : "断开"}
            </span>
            <span className="text-muted-foreground mx-1">|</span>
            {sseStatus?.token ? (
              <Wifi className="w-4 h-4 text-green-400" />
            ) : (
              <WifiOff className="w-4 h-4 text-red-400" />
            )}
            <span className="text-xs text-muted-foreground">信号</span>
            <span className={`text-xs font-medium ${sseStatus?.token ? "text-green-400" : "text-red-400"}`}>
              {sseStatus?.token ? "已连接" : "断开"}
            </span>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => restartSSE.mutate()}
            disabled={restartSSE.isPending}
            className="gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${restartSSE.isPending ? "animate-spin" : ""}`} />
            重启订阅
          </Button>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">大盘解析总数</div>
            <div className="text-2xl font-bold text-foreground mt-1">{marketTotal}</div>
            <div className="text-xs text-muted-foreground mt-0.5">历史记录</div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">代币信号总数</div>
            <div className="text-2xl font-bold text-foreground mt-1">{tokenTotal}</div>
            <div className="text-xs text-muted-foreground mt-0.5">全部类型</div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">最新大盘解析</div>
            <div className="text-sm font-medium text-foreground mt-1 truncate">
              {marketData?.list?.[0]
                ? new Date(marketData.list[0].ts).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai", hour: "2-digit", minute: "2-digit" })
                : "—"}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">UTC+8 时间</div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">最新代币信号</div>
            <div className="text-sm font-medium text-foreground mt-1 truncate">
              {tokenData?.list?.[0]
                ? `${tokenData.list[0].symbol ?? ""} ${typeLabel(tokenData.list[0].type)}`
                : "—"}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">最近一条</div>
          </CardContent>
        </Card>
      </div>

      {/* 主内容 Tabs */}
      <Tabs defaultValue="market">
        <TabsList className="bg-card border border-border">
          <TabsTrigger value="market">📊 AI 大盘解析</TabsTrigger>
          <TabsTrigger value="token">🎯 代币信号</TabsTrigger>
        </TabsList>

        {/* 大盘解析 Tab */}
        <TabsContent value="market" className="space-y-3 mt-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">共 {marketTotal} 条记录，每30秒自动刷新</span>
            <Button size="sm" variant="ghost" onClick={() => refetchMarket()} disabled={marketLoading}>
              <RefreshCw className={`w-3.5 h-3.5 mr-1 ${marketLoading ? "animate-spin" : ""}`} />
              刷新
            </Button>
          </div>

          {marketLoading ? (
            <div className="flex items-center justify-center h-40 text-muted-foreground">加载中...</div>
          ) : marketData?.list?.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-muted-foreground gap-2">
              <AlertTriangle className="w-8 h-8 opacity-40" />
              <span>暂无大盘解析记录</span>
              <span className="text-xs">SSE 连接后会自动接收并存储</span>
            </div>
          ) : (
            <div className="space-y-2">
              {marketData?.list?.map((item) => (
                <Card key={item.id} className="bg-card border-border hover:border-primary/30 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-400 border-blue-500/30">
                            AI 大盘解析
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(item.ts).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })}
                          </span>
                          {item.sentToTelegram && (
                            <Badge variant="outline" className="text-xs bg-green-500/10 text-green-400 border-green-500/30">
                              ✓ 已推送
                            </Badge>
                          )}
                        </div>
                        <div
                          className={`text-sm text-foreground leading-relaxed whitespace-pre-wrap cursor-pointer ${
                            expandedMarket === item.id ? "" : "line-clamp-3"
                          }`}
                          onClick={() => setExpandedMarket(expandedMarket === item.id ? null : item.id)}
                        >
                          {item.content}
                        </div>
                        {item.content.length > 200 && (
                          <button
                            className="text-xs text-primary mt-1 hover:underline"
                            onClick={() => setExpandedMarket(expandedMarket === item.id ? null : item.id)}
                          >
                            {expandedMarket === item.id ? "收起" : "展开全文"}
                          </button>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="shrink-0 gap-1.5 text-xs"
                        onClick={() => pushMarket.mutate({ id: item.id })}
                        disabled={pushMarket.isPending}
                      >
                        <Send className="w-3 h-3" />
                        推送 TG
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* 分页 */}
          {marketPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-2">
              <Button size="sm" variant="outline" onClick={() => setMarketPage(p => Math.max(1, p - 1))} disabled={marketPage === 1}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm text-muted-foreground">{marketPage} / {marketPages}</span>
              <Button size="sm" variant="outline" onClick={() => setMarketPage(p => Math.min(marketPages, p + 1))} disabled={marketPage === marketPages}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </TabsContent>

        {/* 代币信号 Tab */}
        <TabsContent value="token" className="space-y-3 mt-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">共 {tokenTotal} 条</span>
              <Select value={tokenType} onValueChange={(v) => { setTokenType(v as typeof tokenType); setTokenPage(1); }}>
                <SelectTrigger className="w-32 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">全部类型</SelectItem>
                  <SelectItem value="OPPORTUNITY">🟢 机会信号</SelectItem>
                  <SelectItem value="RISK">🔴 风险信号</SelectItem>
                  <SelectItem value="FUNDS">🟡 资金异动</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button size="sm" variant="ghost" onClick={() => refetchToken()} disabled={tokenLoading}>
              <RefreshCw className={`w-3.5 h-3.5 mr-1 ${tokenLoading ? "animate-spin" : ""}`} />
              刷新
            </Button>
          </div>

          {tokenLoading ? (
            <div className="flex items-center justify-center h-40 text-muted-foreground">加载中...</div>
          ) : tokenData?.list?.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-muted-foreground gap-2">
              <AlertTriangle className="w-8 h-8 opacity-40" />
              <span>暂无代币信号记录</span>
              <span className="text-xs">SSE 连接后会自动接收并存储</span>
            </div>
          ) : (
            <div className="space-y-2">
              {tokenData?.list?.map((item) => (
                <Card key={item.id} className={`border transition-colors hover:border-primary/30 ${
                  item.type === "OPPORTUNITY" ? "bg-green-950/20" : item.type === "RISK" ? "bg-red-950/20" : "bg-yellow-950/20"
                }`}>
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-medium ${typeColor(item.type)}`}>
                          {typeIcon(item.type)}
                          {typeLabel(item.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-foreground text-sm">{item.symbol ?? "—"}</span>
                            {item.name && item.name !== item.symbol && (
                              <span className="text-xs text-muted-foreground truncate max-w-24">{item.name}</span>
                            )}
                            {item.price && (
                              <span className="text-xs font-mono text-foreground">${item.price}</span>
                            )}
                            {item.percentChange24h != null && (
                              <span className={`text-xs font-mono ${item.percentChange24h >= 0 ? "text-green-400" : "text-red-400"}`}>
                                {item.percentChange24h >= 0 ? "+" : ""}{item.percentChange24h.toFixed(2)}%
                              </span>
                            )}
                            {item.scoring != null && (
                              <Badge variant="outline" className="text-xs">
                                {item.scoring.toFixed(0)}分
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {new Date(item.ts).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })}
                            {item.sentToTelegram && <span className="ml-2 text-green-400">✓ 已推送</span>}
                          </div>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="shrink-0 gap-1 text-xs h-7"
                        onClick={() => pushToken.mutate({ id: item.id })}
                        disabled={pushToken.isPending}
                      >
                        <Send className="w-3 h-3" />
                        TG
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* 分页 */}
          {tokenPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-2">
              <Button size="sm" variant="outline" onClick={() => setTokenPage(p => Math.max(1, p - 1))} disabled={tokenPage === 1}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm text-muted-foreground">{tokenPage} / {tokenPages}</span>
              <Button size="sm" variant="outline" onClick={() => setTokenPage(p => Math.min(tokenPages, p + 1))} disabled={tokenPage === tokenPages}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
