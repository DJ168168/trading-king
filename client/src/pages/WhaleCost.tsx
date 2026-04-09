import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RefreshCw, Target, TrendingUp, TrendingDown, Info, AlertTriangle, Activity, BarChart2 } from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine,
} from "recharts";

const SYMBOLS = ["BTC", "ETH", "SOL", "BNB", "XRP", "DOGE", "ADA", "AVAX"];
const PERIODS = [
  { label: "1小时", value: "1h" },
  { label: "4小时", value: "4h" },
  { label: "1天", value: "1d" },
  { label: "7天", value: "7d" },
  { label: "30天", value: "30d" },
  { label: "90天", value: "90d" },
];

function fmtPrice(v: number | string | undefined): string {
  if (!v) return "—";
  const n = typeof v === "string" ? parseFloat(v) : v;
  if (isNaN(n)) return "—";
  if (n >= 10000) return `$${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
  if (n >= 1) return `$${n.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
  return `$${n.toFixed(6)}`;
}

function fmtPct(v: number | string | undefined): string {
  if (v === undefined || v === null) return "—";
  const n = typeof v === "string" ? parseFloat(v) : v;
  if (isNaN(n)) return "—";
  return `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;
}

// 偏离度解读
function getDeviationLabel(deviation: number): { label: string; color: string; desc: string } {
  if (deviation > 20) return { label: "严重高估", color: "text-red-400", desc: "主力浮盈过大，注意出货风险" };
  if (deviation > 10) return { label: "高于成本", color: "text-orange-400", desc: "主力有盈利，可能减仓" };
  if (deviation > -5) return { label: "成本附近", color: "text-yellow-400", desc: "主力成本支撑区，关键位置" };
  if (deviation > -15) return { label: "低于成本", color: "text-green-400", desc: "主力亏损，有拉盘动力" };
  return { label: "严重低估", color: "text-blue-400", desc: "主力深套，拉盘意愿强烈" };
}

function getDeviationColor(deviation: number): string {
  if (deviation > 20) return "#f87171";
  if (deviation > 10) return "#fb923c";
  if (deviation > -5) return "#facc15";
  if (deviation > -15) return "#4ade80";
  return "#60a5fa";
}

// 历史偏离度图表
function DeviationHistoryChart({ symbol }: { symbol: string }) {
  const { data, isLoading } = trpc.vsData.whaleCostDeviationHistory.useQuery(
    { symbol },
    { refetchInterval: 300000 }
  );

  const historyData = useMemo(() => {
    if (!data?.success || !Array.isArray(data.data)) return [];
    return data.data;
  }, [data]);

  const currentDeviation = (data as any)?.currentDeviation ?? 0;
  const devInfo = getDeviationLabel(currentDeviation);

  // 计算历史分位数
  const stats = useMemo(() => {
    if (historyData.length === 0) return null;
    const vals = historyData.map((d: any) => d.deviation).sort((a: number, b: number) => a - b);
    const min = vals[0];
    const max = vals[vals.length - 1];
    const p25 = vals[Math.floor(vals.length * 0.25)];
    const p75 = vals[Math.floor(vals.length * 0.75)];
    const rank = vals.filter((v: number) => v <= currentDeviation).length;
    const percentile = Math.round((rank / vals.length) * 100);
    return { min, max, p25, p75, percentile };
  }, [historyData, currentDeviation]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
        <RefreshCw className="w-4 h-4 animate-spin mr-2" />
        加载历史偏离度...
      </div>
    );
  }

  if (!data?.success || historyData.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        暂无历史偏离度数据
      </div>
    );
  }

  const areaColor = getDeviationColor(currentDeviation);

  return (
    <div className="space-y-3">
      {/* 当前状态 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`text-2xl font-black ${devInfo.color}`}>{fmtPct(currentDeviation)}</span>
          <Badge variant="outline" className={`text-xs ${devInfo.color} border-current`}>{devInfo.label}</Badge>
        </div>
        {stats && (
          <div className="text-xs text-muted-foreground">
            历史分位：<span className={devInfo.color}>{stats.percentile}%</span>
            <span className="ml-2 text-muted-foreground/60">（近30天）</span>
          </div>
        )}
      </div>

      {/* 图表 */}
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={historyData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id={`devGrad-${symbol}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={areaColor} stopOpacity={0.3} />
                <stop offset="95%" stopColor={areaColor} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: "rgba(255,255,255,0.4)" }}
              tickLine={false}
              interval={6}
            />
            <YAxis
              tick={{ fontSize: 10, fill: "rgba(255,255,255,0.4)" }}
              tickLine={false}
              tickFormatter={(v) => `${v > 0 ? "+" : ""}${v}%`}
            />
            <Tooltip
              contentStyle={{ background: "#1a1a2e", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", fontSize: 12 }}
              labelStyle={{ color: "rgba(255,255,255,0.7)" }}
              formatter={(value: any) => [`${value > 0 ? "+" : ""}${value}%`, "偏离度"]}
            />
            {/* 零线（主力成本线） */}
            <ReferenceLine y={0} stroke="rgba(255,255,255,0.3)" strokeDasharray="4 4" label={{ value: "主力成本", position: "insideTopRight", fontSize: 10, fill: "rgba(255,255,255,0.4)" }} />
            {/* 关键区间线 */}
            <ReferenceLine y={-15} stroke="#4ade80" strokeDasharray="3 3" strokeOpacity={0.4} />
            <ReferenceLine y={20} stroke="#f87171" strokeDasharray="3 3" strokeOpacity={0.4} />
            <Area
              type="monotone"
              dataKey="deviation"
              stroke={areaColor}
              strokeWidth={2}
              fill={`url(#devGrad-${symbol})`}
              dot={false}
              activeDot={{ r: 4, fill: areaColor }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* 历史统计 */}
      {stats && (
        <div className="grid grid-cols-4 gap-2 text-center text-xs">
          <div className="rounded-lg border border-border/50 p-2">
            <div className="text-muted-foreground">30天最低</div>
            <div className={`font-mono font-semibold ${stats.min < -15 ? "text-blue-400" : stats.min < -5 ? "text-green-400" : "text-yellow-400"}`}>{fmtPct(stats.min)}</div>
          </div>
          <div className="rounded-lg border border-border/50 p-2">
            <div className="text-muted-foreground">25分位</div>
            <div className="font-mono font-semibold text-foreground">{fmtPct(stats.p25)}</div>
          </div>
          <div className="rounded-lg border border-border/50 p-2">
            <div className="text-muted-foreground">75分位</div>
            <div className="font-mono font-semibold text-foreground">{fmtPct(stats.p75)}</div>
          </div>
          <div className="rounded-lg border border-border/50 p-2">
            <div className="text-muted-foreground">30天最高</div>
            <div className={`font-mono font-semibold ${stats.max > 20 ? "text-red-400" : stats.max > 10 ? "text-orange-400" : "text-yellow-400"}`}>{fmtPct(stats.max)}</div>
          </div>
        </div>
      )}

      {/* 解读 */}
      <div className="text-xs text-muted-foreground bg-muted/30 rounded-lg p-2.5">
        <span className={devInfo.color}>当前偏离度 {fmtPct(currentDeviation)}</span>
        {stats && <span>，处于近30天 <span className={devInfo.color}>{stats.percentile}%</span> 分位</span>}
        {stats && stats.percentile <= 25 && <span className="text-green-400">（历史低位，入场机会较好）</span>}
        {stats && stats.percentile >= 75 && <span className="text-red-400">（历史高位，注意出货风险）</span>}
      </div>
    </div>
  );
}

function WhaleCostCard({ symbol }: { symbol: string }) {
  const { data, isLoading, error } = trpc.vsData.whaleCost.useQuery({ symbol }, { refetchInterval: 120000 });
  const { data: priceData } = trpc.market.price.useQuery({ symbol }, { refetchInterval: 30000 });

  const whaleCostData = data?.data;
  const currentPrice = priceData?.price ?? 0;

  // 计算偏离度 - 新接口使用 pushPrice 作为主力成本参考
  const whaleCostData_any = whaleCostData as any;
  const whaleCost = parseFloat(whaleCostData_any?.avgCost ?? whaleCostData_any?.cost ?? whaleCostData_any?.whaleCost ?? whaleCostData_any?.pushPrice ?? "0");
  const deviation = whaleCost > 0 && currentPrice > 0
    ? ((currentPrice - whaleCost) / whaleCost) * 100
    : null;
  const devInfo = deviation !== null ? getDeviationLabel(deviation) : null;

  return (
    <Card className={`border-border/50 ${devInfo && deviation !== null && deviation < -5 ? "border-green-500/30" : ""}`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-bold text-foreground">{symbol}</span>
            {devInfo && (
              <Badge variant="outline" className={`text-xs ${devInfo.color} border-current`}>
                {devInfo.label}
              </Badge>
            )}
          </div>
          {currentPrice > 0 && (
            <span className="text-muted-foreground font-mono text-xs">{fmtPrice(currentPrice)}</span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground text-xs py-2">
            <RefreshCw className="w-3 h-3 animate-spin" />
            加载中...
          </div>
        ) : error || !data?.success ? (
          <div className="text-xs text-muted-foreground py-2">
            {data?.error || error?.message || "暂无数据"}
          </div>
        ) : !whaleCostData ? (
          <div className="text-xs text-muted-foreground py-2">暂无主力成本数据</div>
        ) : (
          <div className="space-y-2">
            {/* 主力成本 */}
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">主力平均成本</span>
              <span className="font-mono font-semibold text-foreground">{fmtPrice(whaleCost || whaleCostData_any?.avgCost || whaleCostData_any?.pushPrice)}</span>
            </div>

            {/* 偏离度 */}
            {deviation !== null && (
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">当前偏离度</span>
                <span className={`font-mono font-semibold ${devInfo?.color}`}>{fmtPct(deviation)}</span>
              </div>
            )}

            {/* 入场收益 */}
            {whaleCostData_any?.gains !== undefined && (
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">入场收益</span>
                <span className={`font-mono text-xs ${parseFloat(String(whaleCostData_any.gains)) >= 0 ? "text-green-400" : "text-red-400"}`}>
                  {fmtPct(whaleCostData_any.gains)}
                </span>
              </div>
            )}

            {/* Alpha/FOMO 标志 */}
            {(whaleCostData_any?.alpha || whaleCostData_any?.fomo) && (
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">信号类型</span>
                <span className="text-xs text-foreground">
                  {whaleCostData_any?.alpha && <span className="text-purple-400 mr-1">Alpha</span>}
                  {whaleCostData_any?.fomo && <span className="text-orange-400">FOMO</span>}
                </span>
              </div>
            )}

            {/* 偏离度可视化条 */}
            {deviation !== null && (
              <div className="mt-2">
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${deviation > 10 ? "bg-red-400" : deviation > -5 ? "bg-yellow-400" : "bg-green-400"}`}
                    style={{ width: `${Math.min(Math.max((deviation + 30) / 60 * 100, 5), 95)}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>-30%</span>
                  <span className={devInfo?.color}>{devInfo?.desc}</span>
                  <span>+30%</span>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function TokenFlowCard({ symbol, period }: { symbol: string; period: string }) {
  const { data, isLoading } = trpc.vsData.tokenFlow.useQuery({ symbol, period }, { refetchInterval: 120000 });
  const items: any[] = useMemo(() => {
    if (!data?.success || !data.data) return [];
    return Array.isArray(data.data) ? data.data : [];
  }, [data]);

  const totalInflow = items.reduce((s, i) => s + (parseFloat(i.inflow ?? i.netInflow ?? "0")), 0);
  const isNetInflow = totalInflow >= 0;

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center justify-between">
          <span>{symbol} 代币流向</span>
          {items.length > 0 && (
            <Badge variant={isNetInflow ? "default" : "destructive"} className="text-xs">
              {isNetInflow ? "净流入" : "净流出"}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-xs text-muted-foreground py-2 flex items-center gap-1">
            <RefreshCw className="w-3 h-3 animate-spin" />加载中...
          </div>
        ) : items.length === 0 ? (
          <div className="text-xs text-muted-foreground py-2">暂无流向数据</div>
        ) : (
          <div className="space-y-1.5">
            {items.slice(0, 5).map((item: any, idx: number) => {
              const netFlow = parseFloat(item.netInflow ?? item.inflow ?? item.flow ?? "0");
              const isIn = netFlow >= 0;
              return (
                <div key={idx} className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{item.chain ?? item.exchange ?? item.period ?? `周期${idx + 1}`}</span>
                  <div className="flex items-center gap-1">
                    {isIn ? <TrendingUp className="w-3 h-3 text-green-400" /> : <TrendingDown className="w-3 h-3 text-red-400" />}
                    <span className={isIn ? "text-green-400" : "text-red-400"}>
                      {isIn ? "+" : ""}{netFlow.toFixed(2)}M
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function WhaleCost() {
  const [selectedSymbol, setSelectedSymbol] = useState("BTC");
  const [flowPeriod, setFlowPeriod] = useState("1h");
  const [chartSymbol, setChartSymbol] = useState("BTC");

  return (
    <div className="p-4 md:p-6 space-y-5">
      {/* 页头 */}
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Target className="w-6 h-6 text-blue-400" />
          主力成本分析
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          链上大户平均持仓成本 · 偏离度 · 代币流向 — 判断主力进出场时机
        </p>
      </div>

      {/* 使用说明 */}
      <Alert className="border-blue-500/30 bg-blue-500/5">
        <Info className="w-4 h-4 text-blue-400" />
        <AlertDescription className="text-sm text-muted-foreground">
          <strong className="text-foreground">主力成本</strong>：链上大户平均买入价，反映主力持仓压力区。
          <strong className="text-green-400"> 偏离度为负</strong>（当前价低于主力成本）= 主力亏损，有强烈拉盘动力，是最佳入场时机。
          <strong className="text-red-400"> 偏离度为正</strong>（当前价高于主力成本）= 主力盈利，注意出货风险。
        </AlertDescription>
      </Alert>

      {/* 主力成本网格 */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
          <Activity className="w-4 h-4" />
          主要币种主力成本
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {SYMBOLS.map(sym => (
            <WhaleCostCard key={sym} symbol={sym} />
          ))}
        </div>
      </div>

      {/* 历史偏离度图表 */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center justify-between">
            <span className="flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-blue-400" />
              历史偏离度走势（近30天）
            </span>
            <div className="flex flex-wrap gap-1">
              {SYMBOLS.slice(0, 6).map(sym => (
                <Button
                  key={sym}
                  variant={chartSymbol === sym ? "default" : "outline"}
                  size="sm"
                  className="h-6 text-xs px-2"
                  onClick={() => setChartSymbol(sym)}
                >
                  {sym}
                </Button>
              ))}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DeviationHistoryChart symbol={chartSymbol} />
        </CardContent>
      </Card>

      {/* 代币流向 */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            代币流向分析
          </h2>
          <div className="flex items-center gap-2">
            {/* 币种选择 */}
            <div className="flex flex-wrap gap-1">
              {SYMBOLS.slice(0, 5).map(sym => (
                <Button
                  key={sym}
                  variant={selectedSymbol === sym ? "default" : "outline"}
                  size="sm"
                  className="h-6 text-xs px-2"
                  onClick={() => setSelectedSymbol(sym)}
                >
                  {sym}
                </Button>
              ))}
            </div>
            {/* 周期选择 */}
            <div className="flex flex-wrap gap-1">
              {PERIODS.map(p => (
                <Button
                  key={p.value}
                  variant={flowPeriod === p.value ? "default" : "outline"}
                  size="sm"
                  className="h-6 text-xs px-2"
                  onClick={() => setFlowPeriod(p.value)}
                >
                  {p.label}
                </Button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[selectedSymbol, "ETH", "SOL"].map(sym => (
            <TokenFlowCard key={`${sym}-${flowPeriod}`} symbol={sym} period={flowPeriod} />
          ))}
        </div>
      </div>

      {/* 操作策略 */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-yellow-400" />
            主力成本策略要点
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <div className="font-semibold text-green-400 flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4" />
                做多信号组合
              </div>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>✓ 当前价格 &lt; 主力成本（偏离度为负）</li>
                <li>✓ 偏离度处于近30天历史低位（&lt;25分位）</li>
                <li>✓ 代币流向：链上净流出交易所（主力囤币）</li>
                <li>✓ AI 多空信号面板出现 Alpha/FOMO 信号</li>
                <li>✓ 资金流仪表盘显示净流入</li>
              </ul>
            </div>
            <div className="space-y-2">
              <div className="font-semibold text-red-400 flex items-center gap-1.5">
                <TrendingDown className="w-4 h-4" />
                做空/离场信号组合
              </div>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>✗ 当前价格 &gt; 主力成本 20% 以上</li>
                <li>✗ 偏离度处于近30天历史高位（&gt;75分位）</li>
                <li>✗ 代币流向：链上净流入交易所（主力出货）</li>
                <li>✗ AI 分数 &gt; 80（过热风险）</li>
                <li>✗ 资金流历史持续为负</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
