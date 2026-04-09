import { trpc } from "@/lib/trpc";
import PageHeader from "@/components/PageHeader";
import EmptyState from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useState } from "react";
import { TrendingUp, TrendingDown, Plus, X, RefreshCw, Loader2, Bot } from "lucide-react";

const SYMBOLS = ["BTC/USDT","ETH/USDT","SOL/USDT","BNB/USDT","XRP/USDT","DOGE/USDT","ADA/USDT","AVAX/USDT"];
const EXCHANGES = [
  { value: "binance", label: "币安 Binance" },
  { value: "okx", label: "欧易 OKX" },
  { value: "bybit", label: "Bybit" },
];

function ExchangeLabel({ exchange }: { exchange: string }) {
  const colors: Record<string, string> = {
    binance: "bg-yellow-500/20 text-yellow-400",
    okx: "bg-blue-500/20 text-blue-400",
    bybit: "bg-orange-500/20 text-orange-400",
  };
  const labels: Record<string, string> = { binance: "币安", okx: "欧易", bybit: "Bybit" };
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded ${colors[exchange] ?? "bg-gray-500/20 text-gray-400"}`}>
      {labels[exchange] ?? exchange}
    </span>
  );
}

export default function QuantSim() {
  const [exchange, setExchange] = useState<"binance" | "okx" | "bybit">("binance");
  const [symbol, setSymbol] = useState("BTC/USDT");
  const [side, setSide] = useState<"long" | "short">("long");
  const [size, setSize] = useState("0.01");
  const [leverage, setLeverage] = useState("1");
  const [closingId, setClosingId] = useState<number | null>(null);

  const { data: positions, isLoading: posLoading, refetch } = trpc.sim.positions.useQuery(undefined, { refetchInterval: 10000 });
  const { data: trades, isLoading: tradeLoading } = trpc.sim.trades.useQuery({ limit: 20 }, { refetchInterval: 30000 });

  const openPos = trpc.sim.openPosition.useMutation({
    onSuccess: (data) => {
      toast.success(`模拟开仓成功！入场价: $${data.entryPrice.toFixed(4)}`);
      refetch();
    },
    onError: (err) => toast.error(`开仓失败: ${err.message}`),
  });

  const closePos = trpc.sim.closePosition.useMutation({
    onSuccess: (data) => {
      toast.success(`平仓成功！盈亏: ${data.pnl >= 0 ? "+" : ""}$${data.pnl.toFixed(2)}`);
      setClosingId(null);
      refetch();
    },
    onError: (err) => { toast.error(`平仓失败: ${err.message}`); setClosingId(null); },
  });

  const handleOpen = () => {
    const sizeNum = parseFloat(size);
    const levNum = parseInt(leverage);
    if (isNaN(sizeNum) || sizeNum <= 0) { toast.error("请输入有效的数量"); return; }
    openPos.mutate({ exchange, symbol, side, size: sizeNum, leverage: levNum, sendTelegram: true });
  };

  const handleClose = (id: number) => {
    setClosingId(id);
    closePos.mutate({ id, sendTelegram: true });
  };

  const posList = (positions as any[]) ?? [];
  const tradeList = (trades as any[]) ?? [];
  const totalPnl = posList.reduce((sum: number, p: any) => sum + p.pnl, 0);
  const totalTradePnl = tradeList.filter((t: any) => t.pnl).reduce((sum: number, t: any) => sum + t.pnl, 0);
  const winTrades = tradeList.filter((t: any) => t.pnl > 0).length;
  const winRate = tradeList.length > 0 ? ((winTrades / tradeList.length) * 100).toFixed(1) : "—";

  return (
    <div>
      <PageHeader
        title="🤖 量化模拟交易"
        description="使用真实市场价格进行模拟交易，开平仓自动推送 Telegram"
        actions={
          <Button variant="outline" size="sm" className="text-xs" onClick={() => refetch()}>
            <RefreshCw size={14} className="mr-1" /> 刷新
          </Button>
        }
      />

      {/* 统计 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="terminal-card p-4 text-center">
          <p className="text-xl stat-number font-bold text-foreground">{posList.length}</p>
          <p className="text-xs text-muted-foreground mt-1">当前持仓</p>
        </div>
        <div className="terminal-card p-4 text-center">
          <p className={`text-xl stat-number font-bold ${totalPnl >= 0 ? "text-neon-green" : "text-neon-red"}`}>
            {totalPnl >= 0 ? "+" : ""}{totalPnl.toFixed(2)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">浮动盈亏</p>
        </div>
        <div className="terminal-card p-4 text-center">
          <p className={`text-xl stat-number font-bold ${totalTradePnl >= 0 ? "text-neon-green" : "text-neon-red"}`}>
            {totalTradePnl >= 0 ? "+" : ""}{totalTradePnl.toFixed(2)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">历史盈亏</p>
        </div>
        <div className="terminal-card p-4 text-center">
          <p className="text-xl stat-number font-bold text-neon-blue">{winRate}{winRate !== "—" ? "%" : ""}</p>
          <p className="text-xs text-muted-foreground mt-1">历史胜率</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 开仓面板 */}
        <div className="terminal-card p-6">
          <h3 className="text-sm font-medium text-foreground mb-4">模拟开仓</h3>
          <div className="space-y-4">
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">交易所</Label>
              <Select value={exchange} onValueChange={(v) => setExchange(v as any)}>
                <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {EXCHANGES.map(ex => <SelectItem key={ex.value} value={ex.value}>{ex.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">交易对</Label>
              <Select value={symbol} onValueChange={setSymbol}>
                <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SYMBOLS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">方向</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button size="sm" className={`text-xs ${side === "long" ? "bg-green-500/30 text-green-400 border border-green-500/50" : "bg-muted/20 text-muted-foreground border border-border/30"}`} onClick={() => setSide("long")}>
                  <TrendingUp size={14} className="mr-1" /> 做多
                </Button>
                <Button size="sm" className={`text-xs ${side === "short" ? "bg-red-500/30 text-red-400 border border-red-500/50" : "bg-muted/20 text-muted-foreground border border-border/30"}`} onClick={() => setSide("short")}>
                  <TrendingDown size={14} className="mr-1" /> 做空
                </Button>
              </div>
            </div>

            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">数量</Label>
              <Input value={size} onChange={(e) => setSize(e.target.value)} className="h-9 text-xs font-mono" placeholder="0.01" />
            </div>

            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">杠杆</Label>
              <div className="flex gap-2">
                {["1","5","10","20"].map(lev => (
                  <Button key={lev} size="sm" className={`text-xs flex-1 ${leverage === lev ? "bg-neon-blue/20 text-neon-blue border border-neon-blue/30" : "bg-muted/20 text-muted-foreground border border-border/30"}`} onClick={() => setLeverage(lev)}>
                    {lev}x
                  </Button>
                ))}
              </div>
            </div>

            <Button
              className={`w-full text-sm font-bold ${side === "long" ? "bg-green-500/20 text-green-400 hover:bg-green-500/30 border border-green-500/30" : "bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30"}`}
              onClick={handleOpen}
              disabled={openPos.isPending}
            >
              {openPos.isPending ? <Loader2 size={14} className="mr-1 animate-spin" /> : <Plus size={14} className="mr-1" />}
              {side === "long" ? "模拟做多" : "模拟做空"}
            </Button>

            <p className="text-[10px] text-muted-foreground text-center">
              使用真实市场价格 · 开平仓自动推送 Telegram
            </p>
          </div>
        </div>

        {/* 持仓 + 历史 */}
        <div className="lg:col-span-2 space-y-4">
          {/* 当前持仓 */}
          <div className="terminal-card">
            <div className="p-4 border-b border-border/30 flex items-center justify-between">
              <h3 className="text-sm font-medium text-foreground">模拟持仓</h3>
              <span className="text-xs text-muted-foreground">10s 自动刷新</span>
            </div>
            {posLoading ? (
              <div className="p-4 space-y-2">{[1,2,3].map(i => <div key={i} className="h-12 rounded bg-muted/20 animate-pulse" />)}</div>
            ) : posList.length === 0 ? (
              <div className="p-4">
                <EmptyState icon={<Bot size={32} />} title="暂无模拟持仓" description="在左侧面板开启模拟仓位" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/30">
                      {["交易所","交易对","方向","数量","开仓价","当前价","盈亏","操作"].map(h => (
                        <th key={h} className={`p-3 text-xs text-muted-foreground font-medium ${["交易所","交易对","方向"].includes(h) ? "text-left" : "text-right"}`}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {posList.map((pos: any) => (
                      <tr key={pos.id} className="border-b border-border/20 hover:bg-muted/10">
                        <td className="p-3"><ExchangeLabel exchange={pos.exchange} /></td>
                        <td className="p-3 font-mono text-foreground">{pos.symbol}</td>
                        <td className="p-3">
                          <span className={`text-xs font-bold ${pos.side === "long" ? "text-neon-green" : "text-neon-red"}`}>
                            {pos.side === "long" ? "多" : "空"}
                          </span>
                        </td>
                        <td className="p-3 text-right font-mono text-foreground">{pos.size}</td>
                        <td className="p-3 text-right font-mono text-foreground">${pos.entryPrice.toFixed(4)}</td>
                        <td className="p-3 text-right font-mono text-foreground">${pos.currentPrice.toFixed(4)}</td>
                        <td className="p-3 text-right">
                          <div className={`font-mono font-bold text-sm ${pos.pnl >= 0 ? "text-neon-green" : "text-neon-red"}`}>
                            {pos.pnl >= 0 ? "+" : ""}{pos.pnl.toFixed(2)}
                          </div>
                        </td>
                        <td className="p-3 text-right">
                          <Button size="sm" variant="outline" className="text-xs h-7 text-neon-red border-red-500/30 hover:bg-red-500/10" onClick={() => handleClose(pos.id)} disabled={closingId === pos.id}>
                            {closingId === pos.id ? <Loader2 size={12} className="animate-spin" /> : <X size={12} />}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* 历史记录 */}
          <div className="terminal-card">
            <div className="p-4 border-b border-border/30">
              <h3 className="text-sm font-medium text-foreground">模拟交易历史</h3>
            </div>
            {tradeLoading ? (
              <div className="p-4 space-y-2">{[1,2,3].map(i => <div key={i} className="h-10 rounded bg-muted/20 animate-pulse" />)}</div>
            ) : tradeList.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">暂无历史记录</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/30">
                      {["时间","交易对","方向","数量","价格","盈亏"].map(h => (
                        <th key={h} className={`p-3 text-xs text-muted-foreground font-medium ${["时间","交易对","方向"].includes(h) ? "text-left" : "text-right"}`}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {tradeList.map((t: any) => (
                      <tr key={t.id} className="border-b border-border/20 hover:bg-muted/10">
                        <td className="p-3 text-xs text-muted-foreground font-mono">
                          {new Date(t.createdAt).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}
                        </td>
                        <td className="p-3 font-mono text-foreground">{t.symbol}</td>
                        <td className="p-3">
                          <span className={`text-xs font-bold ${t.side === "buy" ? "text-neon-green" : "text-neon-red"}`}>
                            {t.side === "buy" ? "买入" : "卖出"}
                          </span>
                        </td>
                        <td className="p-3 text-right font-mono text-foreground">{t.size}</td>
                        <td className="p-3 text-right font-mono text-foreground">${t.price.toFixed(4)}</td>
                        <td className="p-3 text-right">
                          {t.pnl !== 0 ? (
                            <span className={`font-mono font-bold text-sm ${t.pnl >= 0 ? "text-neon-green" : "text-neon-red"}`}>
                              {t.pnl >= 0 ? "+" : ""}{t.pnl.toFixed(2)}
                            </span>
                          ) : <span className="text-muted-foreground">—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
