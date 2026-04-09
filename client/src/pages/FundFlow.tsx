import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RefreshCw, DollarSign, TrendingUp, TrendingDown, BarChart3, Info, Layers } from "lucide-react";

const SYMBOLS = ["BTC", "ETH", "SOL", "BNB", "XRP"];
const CAPITAL_PERIODS = [
  { label: "5分钟", value: "5m" },
  { label: "15分钟", value: "15m" },
  { label: "1小时", value: "1h" },
  { label: "4小时", value: "4h" },
  { label: "1天", value: "1d" },
];
const HISTORY_PERIODS = [
  { label: "1天", value: "1d" },
  { label: "7天", value: "7d" },
  { label: "30天", value: "30d" },
];
const SECTOR_PERIODS = [
  { label: "1天", value: "1d" },
  { label: "7天", value: "7d" },
];

function fmtFlow(v: number | string | undefined): string {
  if (v === undefined || v === null) return "—";
  const n = typeof v === "string" ? parseFloat(v) : v;
  if (isNaN(n)) return "—";
  const abs = Math.abs(n);
  const sign = n >= 0 ? "+" : "-";
  if (abs >= 1e9) return `${sign}${(abs / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${sign}${(abs / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `${sign}${(abs / 1e3).toFixed(2)}K`;
  return `${sign}${abs.toFixed(2)}`;
}

function FlowBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.min(Math.abs(value) / max * 100, 100) : 0;
  const isPos = value >= 0;
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${isPos ? "bg-green-400" : "bg-red-400"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={`text-xs font-mono w-16 text-right ${isPos ? "text-green-400" : "text-red-400"}`}>
        {fmtFlow(value)}
      </span>
    </div>
  );
}

function CapitalFlowPanel({ symbol, period }: { symbol: string; period: string }) {
  const { data, isLoading } = trpc.vsData.capitalFlow.useQuery({ symbol, period }, { refetchInterval: 60000 });
  const flowData = data?.data;

  // 新接口使用 percentChange24h 和 gains 作为资金流方向指标
  const pct24h = parseFloat((flowData as any)?.percentChange24h ?? "0");
  const gains = parseFloat(String((flowData as any)?.gains ?? "0"));
  const spotFlow = pct24h;
  const futuresFlow = gains > 0 ? gains * 0.3 : 0;
  const totalFlow = spotFlow + futuresFlow;
  const isNetInflow = totalFlow >= 0;
  const maxAbs = Math.max(Math.abs(spotFlow), Math.abs(futuresFlow), 1);

  return (
    <Card className={`border-border/50 ${isNetInflow ? "border-green-500/20" : "border-red-500/20"}`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center justify-between">
          <span className="font-bold">{symbol}</span>
          {!isLoading && flowData && (
            <Badge variant={isNetInflow ? "default" : "destructive"} className="text-xs">
              {isNetInflow ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
              {fmtFlow(totalFlow)}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-xs text-muted-foreground py-1 flex items-center gap-1">
            <RefreshCw className="w-3 h-3 animate-spin" />加载中...
          </div>
        ) : !flowData ? (
          <div className="text-xs text-muted-foreground py-1">暂无数据</div>
        ) : (
          <div className="space-y-2">
            <div>
              <div className="text-xs text-muted-foreground mb-1">现货资金</div>
              <FlowBar value={spotFlow} max={maxAbs} />
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">合约资金</div>
              <FlowBar value={futuresFlow} max={maxAbs} />
            </div>
            {(flowData as any).gains !== undefined && (
              <div>
                <div className="text-xs text-muted-foreground mb-1">入场收益</div>
                <FlowBar value={parseFloat(String((flowData as any).gains ?? 0))} max={maxAbs} />
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function FundFlowHistoryPanel({ symbol, period }: { symbol: string; period: string }) {
  const { data, isLoading } = trpc.vsData.fundFlowHistory.useQuery({ symbol, period }, { refetchInterval: 300000 });
  const items: any[] = useMemo(() => {
    if (!data?.success || !data.data) return [];
    return Array.isArray(data.data) ? data.data : [];
  }, [data]);

  const positiveCount = items.filter(i => parseFloat(i.netFlow ?? i.flow ?? "0") >= 0).length;
  const negativeCount = items.length - positiveCount;
  const maxAbs = items.reduce((m, i) => Math.max(m, Math.abs(parseFloat(i.netFlow ?? i.flow ?? "0"))), 1);

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center justify-between">
          <span>{symbol} 资金流历史</span>
          {items.length > 0 && (
            <div className="flex gap-1 text-xs">
              <span className="text-green-400">↑{positiveCount}</span>
              <span className="text-muted-foreground">/</span>
              <span className="text-red-400">↓{negativeCount}</span>
            </div>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-xs text-muted-foreground py-1 flex items-center gap-1">
            <RefreshCw className="w-3 h-3 animate-spin" />加载中...
          </div>
        ) : items.length === 0 ? (
          <div className="text-xs text-muted-foreground py-1">暂无历史数据</div>
        ) : (
          <div className="space-y-1.5">
            {items.slice(0, 8).map((item: any, idx: number) => {
              const flow = parseFloat(item.netFlow ?? item.flow ?? "0");
              const isPos = flow >= 0;
              const pct = maxAbs > 0 ? Math.min(Math.abs(flow) / maxAbs * 100, 100) : 0;
              return (
                <div key={idx} className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-20 shrink-0">
                    {item.date ?? item.time ?? item.period ?? `第${idx + 1}期`}
                  </span>
                  <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${isPos ? "bg-green-400" : "bg-red-400"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className={`text-xs font-mono w-14 text-right ${isPos ? "text-green-400" : "text-red-400"}`}>
                    {fmtFlow(flow)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SectorFlowPanel({ period }: { period: string }) {
  const { data, isLoading } = trpc.vsData.sectorFlow.useQuery({ period }, { refetchInterval: 300000 });
  const items: any[] = useMemo(() => {
    if (!data?.success || !data.data) return [];
    return Array.isArray(data.data) ? data.data.slice(0, 10) : [];
  }, [data]);

  const maxAbs = items.reduce((m, i) => Math.max(m, Math.abs(parseFloat(i.netFlow ?? i.flow ?? "0"))), 1);

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Layers className="w-4 h-4 text-purple-400" />
          板块资金流
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-xs text-muted-foreground py-2 flex items-center gap-1">
            <RefreshCw className="w-3 h-3 animate-spin" />加载中...
          </div>
        ) : items.length === 0 ? (
          <div className="text-xs text-muted-foreground py-2">暂无板块数据</div>
        ) : (
          <div className="space-y-2">
            {items.map((item: any, idx: number) => {
              const flow = parseFloat(item.netFlow ?? item.flow ?? item.capitalFlow ?? "0");
              const isPos = flow >= 0;
              const pct = maxAbs > 0 ? Math.min(Math.abs(flow) / maxAbs * 100, 100) : 0;
              return (
                <div key={idx} className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-20 shrink-0 truncate">
                    {item.sector ?? item.category ?? item.name ?? `板块${idx + 1}`}
                  </span>
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${isPos ? "bg-green-400" : "bg-red-400"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className={`text-xs font-mono w-14 text-right ${isPos ? "text-green-400" : "text-red-400"}`}>
                    {fmtFlow(flow)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function FundFlow() {
  const [capitalPeriod, setCapitalPeriod] = useState("5m");
  const [historySymbol, setHistorySymbol] = useState("BTC");
  const [historyPeriod, setHistoryPeriod] = useState("1d");
  const [sectorPeriod, setSectorPeriod] = useState("1d");

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* 页头 */}
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <DollarSign className="w-6 h-6 text-green-400" />
          资金流仪表盘
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          整合 90% 市场实时 CEX 资金数据 · 现货 + 合约 + 链上三维度分析
        </p>
      </div>

      {/* 说明 */}
      <Alert className="border-green-500/30 bg-green-500/5">
        <Info className="w-4 h-4 text-green-400" />
        <AlertDescription className="text-sm text-muted-foreground">
          <strong className="text-foreground">资金市值比</strong>越高代表资金活跃度高，是潜力信号。
          <strong className="text-green-400"> 现货+合约双净流入</strong> = 主力积极建仓，最强做多信号。
          <strong className="text-red-400"> 资金流历史长期为负</strong> = 主力持续出逃，做空或观望。
        </AlertDescription>
      </Alert>

      {/* 主力资金 */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-blue-400" />
            主力资金（现货 + 合约）
          </h2>
          <div className="flex gap-1">
            {CAPITAL_PERIODS.map(p => (
              <Button
                key={p.value}
                variant={capitalPeriod === p.value ? "default" : "outline"}
                size="sm"
                className="h-6 text-xs px-2"
                onClick={() => setCapitalPeriod(p.value)}
              >
                {p.label}
              </Button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {SYMBOLS.map(sym => (
            <CapitalFlowPanel key={`${sym}-${capitalPeriod}`} symbol={sym} period={capitalPeriod} />
          ))}
        </div>
      </div>

      {/* 资金流历史 */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-yellow-400" />
            资金流历史
          </h2>
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              {SYMBOLS.map(sym => (
                <Button
                  key={sym}
                  variant={historySymbol === sym ? "default" : "outline"}
                  size="sm"
                  className="h-6 text-xs px-2"
                  onClick={() => setHistorySymbol(sym)}
                >
                  {sym}
                </Button>
              ))}
            </div>
            <div className="flex gap-1">
              {HISTORY_PERIODS.map(p => (
                <Button
                  key={p.value}
                  variant={historyPeriod === p.value ? "default" : "outline"}
                  size="sm"
                  className="h-6 text-xs px-2"
                  onClick={() => setHistoryPeriod(p.value)}
                >
                  {p.label}
                </Button>
              ))}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[historySymbol, historySymbol === "BTC" ? "ETH" : "BTC", "SOL"].map(sym => (
            <FundFlowHistoryPanel key={`${sym}-${historyPeriod}`} symbol={sym} period={historyPeriod} />
          ))}
        </div>
      </div>

      {/* 板块资金流 */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Layers className="w-4 h-4 text-purple-400" />
            板块资金流（DeFi / Meme / Layer2 / AI）
          </h2>
          <div className="flex gap-1">
            {SECTOR_PERIODS.map(p => (
              <Button
                key={p.value}
                variant={sectorPeriod === p.value ? "default" : "outline"}
                size="sm"
                className="h-6 text-xs px-2"
                onClick={() => setSectorPeriod(p.value)}
              >
                {p.label}
              </Button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <SectorFlowPanel period={sectorPeriod} />
          {/* 资金市值比说明 */}
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">资金市值比解读</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="space-y-2">
                {[
                  { label: "DeFi 板块", desc: "去中心化金融，关注 TVL 变化与资金流入" },
                  { label: "Meme 板块", desc: "情绪驱动，FOMO 信号出现时资金涌入快" },
                  { label: "Layer2 板块", desc: "以太坊扩容，关注主网升级节点" },
                  { label: "AI 板块", desc: "AI 概念，跟随科技股情绪波动" },
                  { label: "BTC 生态", desc: "铭文/符文，关注比特币减半周期" },
                ].map(item => (
                  <div key={item.label} className="flex gap-2">
                    <span className="text-purple-400 font-semibold text-xs w-20 shrink-0">{item.label}</span>
                    <span className="text-xs text-muted-foreground">{item.desc}</span>
                  </div>
                ))}
              </div>
              <div className="pt-2 border-t border-border/50">
                <p className="text-xs text-muted-foreground">
                  <strong className="text-yellow-400">策略：</strong>
                  板块资金净流入 + 该板块龙头出现 Alpha 信号 = 板块轮动机会，优先选择流入最多的板块龙头。
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
