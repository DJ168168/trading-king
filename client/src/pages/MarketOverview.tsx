import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { RefreshCw, TrendingUp, TrendingDown, Activity, DollarSign, BarChart2, Percent } from "lucide-react";
import { useState } from "react";

const SYMBOLS = ["BTC", "ETH", "SOL", "BNB", "XRP"];

function formatBillions(val: number) {
  if (val >= 1e9) return `$${(val / 1e9).toFixed(2)}B`;
  if (val >= 1e6) return `$${(val / 1e6).toFixed(2)}M`;
  return `$${val.toFixed(0)}`;
}

function FundingRateCard({ data }: { data: any }) {
  const binance = data.usdtOrUsdMarginList?.find((e: any) => e.exchange === "Binance");
  const rate = binance?.fundingRate ?? 0;
  const isPositive = rate >= 0;
  const absRate = Math.abs(rate * 100);

  return (
    <Card className="bg-slate-900 border-slate-700">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="font-bold text-white text-lg">{data.symbol}</span>
          <Badge
            variant="outline"
            className={`text-xs font-mono ${isPositive ? "border-emerald-500 text-emerald-400" : "border-red-500 text-red-400"}`}
          >
            {isPositive ? "+" : ""}{(rate * 100).toFixed(4)}%
          </Badge>
        </div>
        <div className="space-y-1">
          <p className="text-xs text-slate-400">资金费率 (Binance)</p>
          <div className="flex items-center gap-2">
            {isPositive ? (
              <TrendingUp className="w-3 h-3 text-emerald-400" />
            ) : (
              <TrendingDown className="w-3 h-3 text-red-400" />
            )}
            <span className={`text-sm font-semibold ${isPositive ? "text-emerald-400" : "text-red-400"}`}>
              {isPositive ? "多头付费" : "空头付费"}
            </span>
          </div>
          <p className="text-xs text-slate-500">
            {data.usdtOrUsdMarginList?.length ?? 0} 个交易所
          </p>
        </div>
        {/* 费率强度条 */}
        <div className="mt-3">
          <div className="flex justify-between text-xs text-slate-500 mb-1">
            <span>费率强度</span>
            <span>{absRate.toFixed(4)}%</span>
          </div>
          <Progress
            value={Math.min(absRate / 0.1 * 100, 100)}
            className={`h-1.5 ${isPositive ? "[&>div]:bg-emerald-500" : "[&>div]:bg-red-500"}`}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function OpenInterestCard({ data }: { data: any }) {
  const change24h = data.changePercent24h ?? 0;
  const isPositive = change24h >= 0;

  return (
    <Card className="bg-slate-900 border-slate-700">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="font-bold text-white text-lg">{data.symbol}</span>
          <Badge
            variant="outline"
            className={`text-xs font-mono ${isPositive ? "border-emerald-500 text-emerald-400" : "border-red-500 text-red-400"}`}
          >
            {isPositive ? "+" : ""}{change24h.toFixed(2)}%
          </Badge>
        </div>
        <div className="space-y-1">
          <p className="text-xs text-slate-400">总持仓量</p>
          <p className="text-xl font-bold text-white">{formatBillions(data.total)}</p>
          <div className="grid grid-cols-3 gap-1 mt-2">
            <div className="text-center">
              <p className="text-xs text-slate-500">1h</p>
              <p className={`text-xs font-semibold ${(data.changePercent1h ?? 0) >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                {(data.changePercent1h ?? 0) >= 0 ? "+" : ""}{(data.changePercent1h ?? 0).toFixed(2)}%
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-slate-500">4h</p>
              <p className={`text-xs font-semibold ${(data.changePercent4h ?? 0) >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                {(data.changePercent4h ?? 0) >= 0 ? "+" : ""}{(data.changePercent4h ?? 0).toFixed(2)}%
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-slate-500">24h</p>
              <p className={`text-xs font-semibold ${change24h >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                {change24h >= 0 ? "+" : ""}{change24h.toFixed(2)}%
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function LongShortCard({ data }: { data: any }) {
  const longPct = (data.longAccount * 100);
  const shortPct = (data.shortAccount * 100);
  const ratio = data.longShortRatio;
  const isBullish = ratio >= 1;

  return (
    <Card className="bg-slate-900 border-slate-700">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="font-bold text-white text-lg">{data.symbol.replace("USDT", "")}</span>
          <Badge
            variant="outline"
            className={`text-xs ${isBullish ? "border-emerald-500 text-emerald-400" : "border-red-500 text-red-400"}`}
          >
            {isBullish ? "多头主导" : "空头主导"}
          </Badge>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-emerald-400">多头 {longPct.toFixed(1)}%</span>
            <span className="text-red-400">空头 {shortPct.toFixed(1)}%</span>
          </div>
          <div className="flex h-3 rounded-full overflow-hidden">
            <div
              className="bg-emerald-500 transition-all"
              style={{ width: `${longPct}%` }}
            />
            <div
              className="bg-red-500 transition-all"
              style={{ width: `${shortPct}%` }}
            />
          </div>
          <p className="text-xs text-slate-400 text-center">
            多空比: <span className="text-white font-mono">{ratio.toFixed(3)}</span>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function ExchangeTable({ symbol, data }: { symbol: string; data: any[] }) {
  return (
    <div className="mt-4">
      <h4 className="text-sm font-semibold text-slate-300 mb-2">{symbol} 各交易所资金费率</h4>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-slate-500 border-b border-slate-700">
              <th className="text-left py-1.5 pr-4">交易所</th>
              <th className="text-right py-1.5 pr-4">资金费率</th>
              <th className="text-right py-1.5">下次结算</th>
            </tr>
          </thead>
          <tbody>
            {data.slice(0, 8).map((item: any) => {
              const rate = item.fundingRate;
              const isPos = rate >= 0;
              const nextTime = item.nextFundingTime
                ? new Date(item.nextFundingTime).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })
                : "--";
              return (
                <tr key={item.exchange} className="border-b border-slate-800 hover:bg-slate-800/50">
                  <td className="py-1.5 pr-4 text-slate-300">{item.exchange}</td>
                  <td className={`py-1.5 pr-4 text-right font-mono ${isPos ? "text-emerald-400" : "text-red-400"}`}>
                    {isPos ? "+" : ""}{(rate * 100).toFixed(4)}%
                  </td>
                  <td className="py-1.5 text-right text-slate-400">{nextTime}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function MarketOverview() {
  const [selectedSymbol, setSelectedSymbol] = useState("BTC");

  const { data: overview, isLoading, refetch, dataUpdatedAt } = trpc.marketOverview.overview.useQuery(
    { symbols: SYMBOLS },
    { refetchInterval: 60000 }
  );

  const selectedFunding = overview?.fundingRates?.find((d: any) => d.symbol === selectedSymbol);

  return (
    <div className="p-6 space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">市场全景仪表盘</h1>
          <p className="text-slate-400 text-sm mt-1">实时资金费率 · 持仓量 · 多空比例 — 数据来源 CoinGlass & Binance</p>
        </div>
        <div className="flex items-center gap-3">
          {dataUpdatedAt > 0 && (
            <span className="text-xs text-slate-500">
              更新于 {new Date(dataUpdatedAt).toLocaleTimeString("zh-CN")}
            </span>
          )}
          <button
            onClick={() => refetch()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            刷新
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {SYMBOLS.map(s => (
            <Card key={s} className="bg-slate-900 border-slate-700 animate-pulse">
              <CardContent className="p-4 h-32" />
            </Card>
          ))}
        </div>
      ) : (
        <Tabs defaultValue="funding">
          <TabsList className="bg-slate-800 border border-slate-700">
            <TabsTrigger value="funding" className="data-[state=active]:bg-blue-600">
              <Percent className="w-3.5 h-3.5 mr-1.5" />
              资金费率
            </TabsTrigger>
            <TabsTrigger value="oi" className="data-[state=active]:bg-blue-600">
              <BarChart2 className="w-3.5 h-3.5 mr-1.5" />
              持仓量
            </TabsTrigger>
            <TabsTrigger value="longshort" className="data-[state=active]:bg-blue-600">
              <Activity className="w-3.5 h-3.5 mr-1.5" />
              多空比例
            </TabsTrigger>
            <TabsTrigger value="detail" className="data-[state=active]:bg-blue-600">
              <DollarSign className="w-3.5 h-3.5 mr-1.5" />
              交易所明细
            </TabsTrigger>
          </TabsList>

          {/* 资金费率 Tab */}
          <TabsContent value="funding" className="mt-4">
            <div className="mb-4 p-4 bg-slate-800/50 rounded-lg border border-slate-700">
              <h3 className="text-sm font-semibold text-slate-300 mb-1">📊 资金费率解读</h3>
              <p className="text-xs text-slate-400">
                正费率（多头付费）→ 市场偏多，过高时（&gt;0.1%）注意反转风险。
                负费率（空头付费）→ 市场偏空，极端负值时可能是抄底信号。
                <span className="text-yellow-400 ml-2">每8小时结算一次，费率 &gt; 0.05% 时谨慎做多。</span>
              </p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {(overview?.fundingRates ?? []).map((d: any) => (
                <FundingRateCard key={d.symbol} data={d} />
              ))}
            </div>
            {/* 费率排名 */}
            <Card className="mt-4 bg-slate-900 border-slate-700">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-slate-300">资金费率排名（Binance）</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {(overview?.fundingRates ?? [])
                    .map((d: any) => {
                      const binance = d.usdtOrUsdMarginList?.find((e: any) => e.exchange === "Binance");
                      return { symbol: d.symbol, rate: binance?.fundingRate ?? 0 };
                    })
                    .sort((a: any, b: any) => Math.abs(b.rate) - Math.abs(a.rate))
                    .map(({ symbol, rate }: any) => {
                      const isPos = rate >= 0;
                      const pct = Math.abs(rate * 100);
                      return (
                        <div key={symbol} className="flex items-center gap-3">
                          <span className="w-12 text-sm font-bold text-white">{symbol}</span>
                          <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${isPos ? "bg-emerald-500" : "bg-red-500"}`}
                              style={{ width: `${Math.min(pct / 0.15 * 100, 100)}%` }}
                            />
                          </div>
                          <span className={`w-20 text-right text-xs font-mono ${isPos ? "text-emerald-400" : "text-red-400"}`}>
                            {isPos ? "+" : ""}{(rate * 100).toFixed(4)}%
                          </span>
                        </div>
                      );
                    })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 持仓量 Tab */}
          <TabsContent value="oi" className="mt-4">
            <div className="mb-4 p-4 bg-slate-800/50 rounded-lg border border-slate-700">
              <h3 className="text-sm font-semibold text-slate-300 mb-1">📈 持仓量解读</h3>
              <p className="text-xs text-slate-400">
                持仓量上升 + 价格上涨 → 多头趋势强劲。
                持仓量下降 + 价格下跌 → 空头平仓，可能反弹。
                <span className="text-yellow-400 ml-2">持仓量急剧变化往往预示大行情。</span>
              </p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {(overview?.openInterests ?? []).map((d: any) => (
                <OpenInterestCard key={d.symbol} data={d} />
              ))}
            </div>
            {/* 持仓量对比 */}
            <Card className="mt-4 bg-slate-900 border-slate-700">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-slate-300">持仓量规模对比</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {(overview?.openInterests ?? [])
                    .sort((a: any, b: any) => b.total - a.total)
                    .map((d: any) => {
                      const maxOI = Math.max(...(overview?.openInterests ?? []).map((x: any) => x.total));
                      const pct = maxOI > 0 ? (d.total / maxOI) * 100 : 0;
                      const change24h = d.changePercent24h ?? 0;
                      return (
                        <div key={d.symbol} className="flex items-center gap-3">
                          <span className="w-12 text-sm font-bold text-white">{d.symbol}</span>
                          <div className="flex-1 h-3 bg-slate-700 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-500 rounded-full transition-all"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="w-24 text-right text-xs text-slate-300">{formatBillions(d.total)}</span>
                          <span className={`w-16 text-right text-xs font-mono ${change24h >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                            {change24h >= 0 ? "+" : ""}{change24h.toFixed(2)}%
                          </span>
                        </div>
                      );
                    })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 多空比例 Tab */}
          <TabsContent value="longshort" className="mt-4">
            <div className="mb-4 p-4 bg-slate-800/50 rounded-lg border border-slate-700">
              <h3 className="text-sm font-semibold text-slate-300 mb-1">⚖️ 多空比例解读</h3>
              <p className="text-xs text-slate-400">
                多空比 &gt; 1.5 → 多头过度拥挤，警惕回调。
                多空比 &lt; 0.7 → 空头过度拥挤，可能反弹。
                <span className="text-yellow-400 ml-2">极端多空比往往是反向信号。</span>
              </p>
            </div>
            {(overview?.longShortRatios ?? []).length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {(overview?.longShortRatios ?? []).map((d: any) => (
                  <LongShortCard key={d.symbol} data={d} />
                ))}
              </div>
            ) : (
              <Card className="bg-slate-900 border-slate-700">
                <CardContent className="p-8 text-center">
                  <Activity className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-400">多空比例数据暂时不可用</p>
                  <p className="text-xs text-slate-500 mt-1">Binance API 可能受网络限制，请稍后重试</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* 交易所明细 Tab */}
          <TabsContent value="detail" className="mt-4">
            <div className="flex gap-2 mb-4 flex-wrap">
              {SYMBOLS.map(s => (
                <button
                  key={s}
                  onClick={() => setSelectedSymbol(s)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    selectedSymbol === s
                      ? "bg-blue-600 text-white"
                      : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
            {selectedFunding && (
              <Card className="bg-slate-900 border-slate-700">
                <CardContent className="p-4">
                  <ExchangeTable
                    symbol={selectedSymbol}
                    data={selectedFunding.usdtOrUsdMarginList ?? []}
                  />
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      )}

      {/* 市场综合评分 */}
      {!isLoading && overview && (
        <Card className="bg-gradient-to-r from-slate-900 to-slate-800 border-slate-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-300 flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-400" />
              市场综合评分（基于资金费率 + 持仓量变化）
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {SYMBOLS.map(symbol => {
                const funding = overview.fundingRates?.find((d: any) => d.symbol === symbol);
                const oi = overview.openInterests?.find((d: any) => d.symbol === symbol);
                const binanceRate = funding?.usdtOrUsdMarginList?.find((e: any) => e.exchange === "Binance")?.fundingRate ?? 0;
                const oiChange = oi?.changePercent24h ?? 0;

                // 综合评分：资金费率适中（不过热）+ 持仓量增加 = 看多
                let score = 50;
                if (binanceRate > 0 && binanceRate < 0.0005) score += 15; // 适度正费率
                if (binanceRate < 0) score += 10; // 负费率（空头付费，看多）
                if (binanceRate > 0.001) score -= 20; // 过热，看空
                if (oiChange > 0) score += 10; // 持仓量增加
                if (oiChange > 5) score += 10; // 持仓量大幅增加
                if (oiChange < -5) score -= 15; // 持仓量大幅减少

                score = Math.max(0, Math.min(100, score));
                const sentiment = score >= 65 ? "看多" : score >= 45 ? "中性" : "看空";
                const color = score >= 65 ? "text-emerald-400" : score >= 45 ? "text-yellow-400" : "text-red-400";
                const barColor = score >= 65 ? "[&>div]:bg-emerald-500" : score >= 45 ? "[&>div]:bg-yellow-500" : "[&>div]:bg-red-500";

                return (
                  <div key={symbol} className="text-center">
                    <p className="text-sm font-bold text-white mb-1">{symbol}</p>
                    <p className={`text-lg font-bold ${color}`}>{score}</p>
                    <p className={`text-xs ${color} mb-2`}>{sentiment}</p>
                    <Progress value={score} className={`h-1.5 ${barColor}`} />
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
