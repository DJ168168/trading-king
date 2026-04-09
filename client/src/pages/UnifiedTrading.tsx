import { useState, useEffect, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import {
  TrendingUp, TrendingDown, Activity, RefreshCw, Plus, X,
  ChevronUp, ChevronDown, DollarSign, BarChart2, Zap, Shield,
  Eye, EyeOff, AlertTriangle, CheckCircle2, Clock, Target
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";

type TradingMode = "paper" | "live";
type Exchange = "binance" | "okx" | "bybit" | "gate" | "bitget";

const EXCHANGES: { id: Exchange; name: string; color: string }[] = [
  { id: "binance", name: "Binance", color: "text-yellow-400" },
  { id: "okx", name: "OKX", color: "text-blue-400" },
  { id: "bybit", name: "Bybit", color: "text-orange-400" },
  { id: "gate", name: "Gate.io", color: "text-green-400" },
  { id: "bitget", name: "Bitget", color: "text-cyan-400" },
];

const SYMBOLS = [
  "BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT", "XRPUSDT",
  "DOGEUSDT", "ADAUSDT", "LINKUSDT", "AVAXUSDT", "DOTUSDT",
  "MATICUSDT", "LTCUSDT", "ATOMUSDT", "NEARUSDT", "APTUSDT",
];

export default function UnifiedTrading() {
  const [mode, setMode] = useState<TradingMode>("paper");
  const [selectedExchange, setSelectedExchange] = useState<Exchange>("binance");
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [orderSide, setOrderSide] = useState<"long" | "short">("long");
  const [orderSymbol, setOrderSymbol] = useState("BTCUSDT");
  const [orderQty, setOrderQty] = useState("");
  const [orderLeverage, setOrderLeverage] = useState(5);
  const [orderType, setOrderType] = useState<"market" | "limit">("market");
  const [orderPrice, setOrderPrice] = useState("");
  const [activeTab, setActiveTab] = useState<"positions" | "orders" | "history" | "equity">("positions");

  // 模拟交易数据
  const { data: paperAccount, refetch: refetchPaperAccount } = trpc.paperTrading.getAccount.useQuery();
  const { data: paperPositions, refetch: refetchPaperPositions } = trpc.paperTrading.getPositions.useQuery();
  const { data: paperTrades } = trpc.paperTrading.getTrades.useQuery({ limit: 50 });
  const { data: paperEquity } = trpc.paperTrading.getEquityCurve.useQuery({ limit: 100 });

  // 实盘数据（汇总所有交易所）
  const { data: allAccounts, refetch: refetchAccounts } = trpc.exchange.allAccounts.useQuery(undefined, {
    enabled: mode === "live",
    refetchInterval: 30000,
  });
  const { data: allPositions, refetch: refetchPositions } = trpc.exchange.allPositions.useQuery(undefined, {
    enabled: mode === "live",
    refetchInterval: 15000,
  });

  // 模拟交易操作
  const paperUpdateConfig = trpc.paperTrading.updateConfig.useMutation({
    onSuccess: () => { refetchPaperAccount(); toast.success("配置已更新"); },
  });
  const paperClosePosition = trpc.paperTrading.closePosition.useMutation({
    onSuccess: () => { refetchPaperPositions(); refetchPaperAccount(); toast.success("平仓成功"); },
  });

  // 实盘下单（Binance）
  const binanceClosePosition = trpc.exchange.binanceClosePosition.useMutation({
    onSuccess: () => { refetchPositions(); toast.success("Binance 平仓成功"); },
    onError: (e) => toast.error(`Binance 平仓失败: ${e.message}`),
  });
  const okxClosePosition = trpc.exchange.okxClosePosition.useMutation({
    onSuccess: () => { refetchPositions(); toast.success("OKX 平仓成功"); },
    onError: (e) => toast.error(`OKX 平仓失败: ${e.message}`),
  });
  const bybitClosePosition = trpc.exchange.bybitClosePosition.useMutation({
    onSuccess: () => { refetchPositions(); toast.success("Bybit 平仓成功"); },
    onError: (e) => toast.error(`Bybit 平仓失败: ${e.message}`),
  });
  const gateClosePosition = trpc.exchange.gateClosePosition.useMutation({
    onSuccess: () => { refetchPositions(); toast.success("Gate.io 平仓成功"); },
    onError: (e) => toast.error(`Gate.io 平仓失败: ${e.message}`),
  });
  const bitgetClosePosition = trpc.exchange.bitgetClosePosition.useMutation({
    onSuccess: () => { refetchPositions(); toast.success("Bitget 平仓成功"); },
    onError: (e) => toast.error(`Bitget 平仓失败: ${e.message}`),
  });

  const handleLiveClosePosition = (pos: { exchange: string; symbol: string; side: string; size: string }) => {
    const confirmClose = window.confirm(`确认平仓 ${pos.exchange.toUpperCase()} ${pos.symbol} ${pos.side === 'long' || pos.side === 'buy' ? '做多' : '做空'} ${pos.size}?`);
    if (!confirmClose) return;
    if (pos.exchange === 'binance') {
      binanceClosePosition.mutate({ symbol: pos.symbol });
    } else if (pos.exchange === 'okx') {
      const okxSymbol = pos.symbol.replace('USDT', '-USDT-SWAP');
      okxClosePosition.mutate({ symbol: okxSymbol });
    } else if (pos.exchange === 'bybit') {
      bybitClosePosition.mutate({ symbol: pos.symbol, side: pos.side === 'long' || pos.side === 'buy' ? 'Sell' : 'Buy', qty: pos.size });
    } else if (pos.exchange === 'gate') {
      const contract = pos.symbol.replace('USDT', '_USDT');
      gateClosePosition.mutate({ contract, size: parseFloat(pos.size) });
    } else if (pos.exchange === 'bitget') {
      bitgetClosePosition.mutate({ symbol: pos.symbol, side: pos.side === 'long' || pos.side === 'buy' ? 'sell' : 'buy', size: pos.size });
    }
  };

  const binancePlaceOrder = trpc.exchange.binancePlaceOrder.useMutation({
    onSuccess: () => { refetchPositions(); toast.success("Binance 下单成功"); setShowOrderForm(false); },
    onError: (e) => toast.error(`Binance 下单失败: ${e.message}`),
  });
  const okxPlaceOrder = trpc.exchange.okxPlaceOrder.useMutation({
    onSuccess: () => { refetchPositions(); toast.success("OKX 下单成功"); setShowOrderForm(false); },
    onError: (e) => toast.error(`OKX 下单失败: ${e.message}`),
  });
  const bybitPlaceOrder = trpc.exchange.bybitPlaceOrder.useMutation({
    onSuccess: () => { refetchPositions(); toast.success("Bybit 下单成功"); setShowOrderForm(false); },
    onError: (e) => toast.error(`Bybit 下单失败: ${e.message}`),
  });
  const gatePlaceOrder = trpc.exchange.gatePlaceOrder.useMutation({
    onSuccess: () => { refetchPositions(); toast.success("Gate.io 下单成功"); setShowOrderForm(false); },
    onError: (e) => toast.error(`Gate.io 下单失败: ${e.message}`),
  });
  const bitgetPlaceOrder = trpc.exchange.bitgetPlaceOrder.useMutation({
    onSuccess: () => { refetchPositions(); toast.success("Bitget 下单成功"); setShowOrderForm(false); },
    onError: (e) => toast.error(`Bitget 下单失败: ${e.message}`),
  });

  // 计算统计
  const paperStats = useMemo(() => {
    if (!paperAccount) return null;
    const totalTrades = paperAccount.totalTrades ?? 0;
    const winTrades = paperAccount.winTrades ?? 0;
    const winRate = totalTrades > 0
      ? (winTrades / totalTrades * 100).toFixed(1)
      : "0.0";
    return {
      totalBalance: paperAccount.totalBalance ?? 10000,
      balance: paperAccount.balance ?? 10000,
      totalPnl: paperAccount.totalPnl ?? 0,
      totalPnlPct: paperAccount.totalPnlPct ?? 0,
      totalTrades,
      winRate,
      maxDrawdown: paperAccount.maxDrawdown ?? 0,
    };
  }, [paperAccount]);

  const liveStats = useMemo(() => {
    if (!allAccounts) return null;
    let totalBalance = 0;
    let connectedCount = 0;
    const pieData: { name: string; value: number; color: string }[] = [];
    const colorMap: Record<string, string> = { binance: '#F0B90B', okx: '#3B82F6', bybit: '#F97316', gate: '#22C55E', bitget: '#06B6D4' };
    EXCHANGES.forEach(ex => {
      const acc = (allAccounts as any)?.[ex.id];
      if (acc?.connected && (acc.usdtBalance ?? 0) > 0) {
        totalBalance += acc.usdtBalance ?? 0;
        connectedCount++;
        pieData.push({ name: ex.name, value: parseFloat((acc.usdtBalance ?? 0).toFixed(2)), color: colorMap[ex.id] ?? '#888' });
      }
    });
    return { totalBalance, connectedCount, pieData };
  }, [allAccounts]);

  // 下单处理
  const handlePlaceOrder = () => {
    if (!orderQty || parseFloat(orderQty) <= 0) {
      toast.error("请输入有效的数量");
      return;
    }
    if (mode === "live") {
      const side = orderSide === "long" ? "BUY" : "SELL";
      const qty = parseFloat(orderQty);
      if (selectedExchange === "binance") {
        binancePlaceOrder.mutate({ symbol: orderSymbol, side: side as "BUY" | "SELL", quantity: qty, leverage: orderLeverage });
      } else if (selectedExchange === "okx") {
        okxPlaceOrder.mutate({ symbol: orderSymbol, side: orderSide === "long" ? "buy" : "sell", quantity: qty, leverage: orderLeverage });
      } else if (selectedExchange === "bybit") {
        bybitPlaceOrder.mutate({ symbol: orderSymbol, side: orderSide === "long" ? "Buy" : "Sell", qty: orderQty, leverage: orderLeverage });
      } else if (selectedExchange === "gate") {
        const gateContract = orderSymbol.replace("USDT", "_USDT");
        gatePlaceOrder.mutate({ contract: gateContract, size: orderSide === "long" ? qty : -qty });
      } else if (selectedExchange === "bitget") {
        bitgetPlaceOrder.mutate({ symbol: orderSymbol, side: orderSide === "long" ? "buy" : "sell", tradeSide: "open", size: orderQty });
      }
    } else {
      toast.info("模拟交易由信号引擎自动执行，请在设置中开启自动交易");
    }
  };

  const currentExchange = EXCHANGES.find(e => e.id === selectedExchange);

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)] p-4 space-y-4">
      {/* 顶部控制栏 */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1 bg-[var(--color-card)] rounded-lg p-1 border border-[var(--color-border)]">
          <button
            onClick={() => setMode("paper")}
            className={cn(
              "px-4 py-2 rounded-md text-sm font-medium transition-all",
              mode === "paper"
                ? "bg-purple-500/20 text-purple-400 border border-purple-500/30"
                : "text-[var(--color-muted)] hover:text-[var(--color-text)]"
            )}
          >
            <Activity className="w-4 h-4 inline mr-1" />
            模拟交易
          </button>
          <button
            onClick={() => setMode("live")}
            className={cn(
              "px-4 py-2 rounded-md text-sm font-medium transition-all",
              mode === "live"
                ? "bg-green-500/20 text-green-400 border border-green-500/30"
                : "text-[var(--color-muted)] hover:text-[var(--color-text)]"
            )}
          >
            <Zap className="w-4 h-4 inline mr-1" />
            实盘交易
          </button>
        </div>

        {mode === "live" && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-[var(--color-muted)]">交易所:</span>
            <div className="flex gap-1">
              {EXCHANGES.map(ex => (
                <button
                  key={ex.id}
                  onClick={() => setSelectedExchange(ex.id)}
                  className={cn(
                    "px-3 py-1.5 rounded text-xs font-medium transition-all border",
                    selectedExchange === ex.id
                      ? `bg-[var(--color-card)] ${ex.color} border-current`
                      : "border-[var(--color-border)] text-[var(--color-muted)] hover:border-[var(--color-text)]"
                  )}
                >
                  {ex.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="ml-auto flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => { refetchPaperAccount(); refetchPaperPositions(); refetchAccounts(); refetchPositions(); }}
            className="border-[var(--color-border)] text-[var(--color-muted)]"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
          {mode === "live" && (
            <Button
              size="sm"
              onClick={() => setShowOrderForm(true)}
              className="bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30"
            >
              <Plus className="w-4 h-4 mr-1" />
              下单
            </Button>
          )}
        </div>
      </div>

      {/* 账户概览 */}
      {mode === "paper" && paperStats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-[var(--color-card)] rounded-lg p-4 border border-[var(--color-border)]">
            <div className="text-xs text-[var(--color-muted)] mb-1">模拟账户总资产</div>
            <div className="text-xl font-bold text-[var(--color-text)]">
              ${paperStats.totalBalance.toFixed(2)}
            </div>
            <div className={cn("text-sm mt-1", paperStats.totalPnl >= 0 ? "text-[var(--color-profit)]" : "text-[var(--color-loss)]")}>
              {paperStats.totalPnl >= 0 ? "+" : ""}{paperStats.totalPnl.toFixed(2)} ({paperStats.totalPnlPct.toFixed(2)}%)
            </div>
          </div>
          <div className="bg-[var(--color-card)] rounded-lg p-4 border border-[var(--color-border)]">
            <div className="text-xs text-[var(--color-muted)] mb-1">可用余额</div>
            <div className="text-xl font-bold text-[var(--color-text)]">${paperStats.balance.toFixed(2)}</div>
            <div className="text-xs text-[var(--color-muted)] mt-1">持仓占用 ${(paperStats.totalBalance - paperStats.balance).toFixed(2)}</div>
          </div>
          <div className="bg-[var(--color-card)] rounded-lg p-4 border border-[var(--color-border)]">
            <div className="text-xs text-[var(--color-muted)] mb-1">总交易次数</div>
            <div className="text-xl font-bold text-[var(--color-text)]">{paperStats.totalTrades}</div>
            <div className="text-xs text-[var(--color-profit)] mt-1">胜率 {paperStats.winRate}%</div>
          </div>
          <div className="bg-[var(--color-card)] rounded-lg p-4 border border-[var(--color-border)]">
            <div className="text-xs text-[var(--color-muted)] mb-1">最大回撤</div>
            <div className="text-xl font-bold text-[var(--color-loss)]">{paperStats.maxDrawdown.toFixed(2)}%</div>
            <div className="text-xs text-[var(--color-muted)] mt-1">
              {paperAccount?.autoTradingEnabled ? (
                <span className="text-[var(--color-profit)]">● 自动交易运行中</span>
              ) : (
                <span className="text-[var(--color-muted)]">○ 自动交易已停止</span>
              )}
            </div>
          </div>
        </div>
      )}

      {mode === "live" && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {EXCHANGES.map(ex => {
            const acc = allAccounts?.[ex.id] as any;
            return (
              <div
                key={ex.id}
                className={cn(
                  "bg-[var(--color-card)] rounded-lg p-3 border transition-all cursor-pointer",
                  selectedExchange === ex.id ? "border-current" : "border-[var(--color-border)]",
                  ex.color
                )}
                onClick={() => setSelectedExchange(ex.id)}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium">{ex.name}</span>
                  {acc?.connected ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-[var(--color-profit)]" />
                  ) : (
                    <AlertTriangle className="w-3.5 h-3.5 text-[var(--color-muted)]" />
                  )}
                </div>
                {acc?.connected ? (
                  <>
                    <div className="text-base font-bold text-[var(--color-text)]">
                      ${(acc.usdtBalance ?? 0).toFixed(2)}
                    </div>
                    <div className="text-xs text-[var(--color-muted)]">
                      可用 ${(acc.availableBalance ?? 0).toFixed(2)}
                    </div>
                  </>
                ) : (
                  <div className="text-xs text-[var(--color-muted)]">未配置</div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 实盘持仓价值饮图 */}
      {mode === "live" && liveStats && liveStats.pieData.length > 0 && (
        <div className="bg-[var(--color-card)] rounded-lg border border-[var(--color-border)] p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium">多交易所资金分布</span>
            <span className="text-xs text-[var(--color-muted)]">总计 ${liveStats.totalBalance.toFixed(2)} USDT</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-40 h-40 flex-shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={liveStats.pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={35}
                    outerRadius={65}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {liveStats.pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => [`$${value.toFixed(2)}`, 'USDT']}
                    contentStyle={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: '8px', fontSize: '12px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 space-y-2">
              {liveStats.pieData.map(item => (
                <div key={item.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: item.color }} />
                    <span className="text-xs text-[var(--color-muted)]">{item.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-medium text-[var(--color-text)]">${item.value.toFixed(2)}</span>
                    <span className="text-xs text-[var(--color-muted)] ml-1">
                      ({liveStats.totalBalance > 0 ? (item.value / liveStats.totalBalance * 100).toFixed(1) : 0}%)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 标签页 */}
      <div className="flex gap-1 border-b border-[var(--color-border)]">
        {[
          { key: "positions", label: "当前持仓" },
          { key: "orders", label: "挂单" },
          { key: "history", label: "交易记录" },
          { key: "equity", label: "权益曲线" },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={cn(
              "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
              activeTab === tab.key
                ? "border-[var(--color-accent)] text-[var(--color-accent)]"
                : "border-transparent text-[var(--color-muted)] hover:text-[var(--color-text)]"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 持仓列表 */}
      {activeTab === "positions" && (
        <div className="bg-[var(--color-card)] rounded-lg border border-[var(--color-border)] overflow-hidden">
          <div className="p-3 border-b border-[var(--color-border)] flex items-center justify-between">
            <span className="text-sm font-medium">
              {mode === "paper" ? "模拟持仓" : `${currentExchange?.name ?? "全部"} 实盘持仓`}
            </span>
            <span className="text-xs text-[var(--color-muted)]">
              {mode === "paper" ? (paperPositions?.length ?? 0) : (allPositions?.length ?? 0)} 个持仓
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)] text-[var(--color-muted)] text-xs">
                  {mode === "live" && <th className="text-left p-3">交易所</th>}
                  <th className="text-left p-3">币种</th>
                  <th className="text-left p-3">方向</th>
                  <th className="text-right p-3">数量</th>
                  <th className="text-right p-3">开仓价</th>
                  <th className="text-right p-3">当前价</th>
                  <th className="text-right p-3">未实现盈亏</th>
                  <th className="text-right p-3">杠杆</th>
                  <th className="text-right p-3">操作</th>
                </tr>
              </thead>
              <tbody>
                {mode === "paper" ? (
                  paperPositions && paperPositions.length > 0 ? (
                    paperPositions.map(pos => (
                      <tr key={pos.id} className="border-b border-[var(--color-border)]/50 hover:bg-[var(--color-border)]/20">
                        <td className="p-3 font-medium">{pos.symbol}</td>
                        <td className="p-3">
                          <span className={cn(
                            "px-2 py-0.5 rounded text-xs font-medium",
                            pos.direction === "long" ? "bg-green-500/10 text-[var(--color-profit)]" : "bg-red-500/10 text-[var(--color-loss)]"
                          )}>
                            {pos.direction === "long" ? "做多" : "做空"}
                          </span>
                        </td>
                        <td className="p-3 text-right">{pos.quantity.toFixed(4)}</td>
                        <td className="p-3 text-right">${pos.entryPrice.toFixed(2)}</td>
                        <td className="p-3 text-right">${pos.currentPrice.toFixed(2)}</td>
                        <td className={cn("p-3 text-right font-medium", (pos.unrealizedPnl ?? 0) >= 0 ? "text-[var(--color-profit)]" : "text-[var(--color-loss)]")}>
                          {(pos.unrealizedPnl ?? 0) >= 0 ? "+" : ""}{(pos.unrealizedPnl ?? 0).toFixed(2)}
                        </td>
                        <td className="p-3 text-right">{pos.leverage ?? 5}x</td>
                        <td className="p-3 text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => paperClosePosition.mutate({ positionId: pos.id })}
                            className="text-xs border-[var(--color-loss)]/30 text-[var(--color-loss)] hover:bg-[var(--color-loss)]/10"
                          >
                            平仓
                          </Button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan={9} className="p-8 text-center text-[var(--color-muted)]">暂无持仓</td></tr>
                  )
                ) : (
                  allPositions && allPositions.length > 0 ? (
                    allPositions.filter(p => selectedExchange === "binance" || p.exchange === selectedExchange || true).map((pos, i) => (
                      <tr key={i} className="border-b border-[var(--color-border)]/50 hover:bg-[var(--color-border)]/20">
                        <td className="p-3">
                          <span className={cn("text-xs font-medium", EXCHANGES.find(e => e.id === pos.exchange)?.color)}>
                            {EXCHANGES.find(e => e.id === pos.exchange)?.name ?? pos.exchange}
                          </span>
                        </td>
                        <td className="p-3 font-medium">{pos.symbol}</td>
                        <td className="p-3">
                          <span className={cn(
                            "px-2 py-0.5 rounded text-xs font-medium",
                            pos.side === "long" || pos.side === "buy" ? "bg-green-500/10 text-[var(--color-profit)]" : "bg-red-500/10 text-[var(--color-loss)]"
                          )}>
                            {pos.side === "long" || pos.side === "buy" ? "做多" : "做空"}
                          </span>
                        </td>
                        <td className="p-3 text-right">{parseFloat(pos.size).toFixed(4)}</td>
                        <td className="p-3 text-right">${parseFloat(pos.entryPrice).toFixed(2)}</td>
                        <td className="p-3 text-right">-</td>
                        <td className={cn("p-3 text-right font-medium", parseFloat(pos.unrealizedPnl) >= 0 ? "text-[var(--color-profit)]" : "text-[var(--color-loss)]")}>
                          {parseFloat(pos.unrealizedPnl) >= 0 ? "+" : ""}{parseFloat(pos.unrealizedPnl).toFixed(2)}
                        </td>
                        <td className="p-3 text-right">{pos.leverage}x</td>
                        <td className="p-3 text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs border-[var(--color-loss)]/30 text-[var(--color-loss)] hover:bg-[var(--color-loss)]/10"
                            onClick={() => handleLiveClosePosition(pos)}
                          >
                            平仓
                          </Button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan={9} className="p-8 text-center text-[var(--color-muted)]">暂无持仓</td></tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 交易记录 */}
      {activeTab === "history" && mode === "paper" && (
        <div className="bg-[var(--color-card)] rounded-lg border border-[var(--color-border)] overflow-hidden">
          <div className="p-3 border-b border-[var(--color-border)]">
            <span className="text-sm font-medium">模拟交易记录</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)] text-[var(--color-muted)] text-xs">
                  <th className="text-left p-3">币种</th>
                  <th className="text-left p-3">方向</th>
                  <th className="text-right p-3">开仓价</th>
                  <th className="text-right p-3">平仓价</th>
                  <th className="text-right p-3">盈亏</th>
                  <th className="text-right p-3">盈亏%</th>
                  <th className="text-right p-3">平仓原因</th>
                  <th className="text-right p-3">持仓时间</th>
                </tr>
              </thead>
              <tbody>
                {paperTrades && paperTrades.length > 0 ? (
                  paperTrades.map(t => (
                    <tr key={t.id} className="border-b border-[var(--color-border)]/50 hover:bg-[var(--color-border)]/20">
                      <td className="p-3 font-medium">{t.symbol}</td>
                      <td className="p-3">
                        <span className={cn("px-2 py-0.5 rounded text-xs", t.direction === "long" ? "bg-green-500/10 text-[var(--color-profit)]" : "bg-red-500/10 text-[var(--color-loss)]")}>
                          {t.direction === "long" ? "做多" : "做空"}
                        </span>
                      </td>
                      <td className="p-3 text-right">${t.entryPrice.toFixed(2)}</td>
                      <td className="p-3 text-right">${t.exitPrice.toFixed(2)}</td>
                      <td className={cn("p-3 text-right font-medium", t.pnl >= 0 ? "text-[var(--color-profit)]" : "text-[var(--color-loss)]")}>
                        {t.pnl >= 0 ? "+" : ""}{t.pnl.toFixed(2)}
                      </td>
                      <td className={cn("p-3 text-right", t.pnlPct >= 0 ? "text-[var(--color-profit)]" : "text-[var(--color-loss)]")}>
                        {t.pnlPct >= 0 ? "+" : ""}{t.pnlPct.toFixed(2)}%
                      </td>
                      <td className="p-3 text-right text-[var(--color-muted)] text-xs">
                        {t.closeReason === "take_profit" ? "止盈" : t.closeReason === "stop_loss" ? "止损" : t.closeReason === "manual" ? "手动" : t.closeReason}
                      </td>
                      <td className="p-3 text-right text-[var(--color-muted)] text-xs">
                        {t.holdingMinutes}分钟
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan={8} className="p-8 text-center text-[var(--color-muted)]">暂无交易记录</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "history" && mode === "live" && (
        <div className="bg-[var(--color-card)] rounded-lg border border-[var(--color-border)] p-8 text-center text-[var(--color-muted)]">
          <Clock className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p>实盘交易记录请前往各交易所官网查看</p>
        </div>
      )}

      {/* 权益曲线 */}
      {activeTab === "equity" && mode === "paper" && (
        <div className="bg-[var(--color-card)] rounded-lg border border-[var(--color-border)] p-4">
          <div className="text-sm font-medium mb-4">模拟账户权益曲线</div>
          {paperEquity && paperEquity.length > 0 ? (
            <div className="h-48 flex items-end gap-0.5">
              {paperEquity.slice(-60).map((point, i) => {
                const min = Math.min(...paperEquity.slice(-60).map(p => p.totalBalance));
                const max = Math.max(...paperEquity.slice(-60).map(p => p.totalBalance));
                const range = max - min || 1;
                const height = ((point.totalBalance - min) / range) * 100;
                const isUp = i > 0 && point.totalBalance >= paperEquity.slice(-60)[i - 1].totalBalance;
                return (
                  <div
                    key={i}
                    className={cn("flex-1 rounded-t transition-all", isUp ? "bg-[var(--color-profit)]/60" : "bg-[var(--color-loss)]/60")}
                    style={{ height: `${Math.max(height, 2)}%` }}
                    title={`$${point.totalBalance.toFixed(2)}`}
                  />
                );
              })}
            </div>
          ) : (
            <div className="h-48 flex items-center justify-center text-[var(--color-muted)]">
              <BarChart2 className="w-8 h-8 mr-2 opacity-40" />
              暂无权益数据
            </div>
          )}
        </div>
      )}

      {/* 挂单 */}
      {activeTab === "orders" && (
        <div className="bg-[var(--color-card)] rounded-lg border border-[var(--color-border)] p-8 text-center text-[var(--color-muted)]">
          <Target className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p>{mode === "paper" ? "模拟交易无挂单" : "实盘挂单功能开发中"}</p>
        </div>
      )}

      {/* 下单弹窗 */}
      {showOrderForm && mode === "live" && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--color-card)] rounded-xl border border-[var(--color-border)] p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">
                {currentExchange?.name} 下单
              </h3>
              <button onClick={() => setShowOrderForm(false)} className="text-[var(--color-muted)] hover:text-[var(--color-text)]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* 方向选择 */}
              <div className="flex gap-2">
                <button
                  onClick={() => setOrderSide("long")}
                  className={cn(
                    "flex-1 py-2 rounded-lg text-sm font-medium border transition-all",
                    orderSide === "long"
                      ? "bg-green-500/20 text-[var(--color-profit)] border-green-500/30"
                      : "border-[var(--color-border)] text-[var(--color-muted)]"
                  )}
                >
                  <TrendingUp className="w-4 h-4 inline mr-1" />
                  做多
                </button>
                <button
                  onClick={() => setOrderSide("short")}
                  className={cn(
                    "flex-1 py-2 rounded-lg text-sm font-medium border transition-all",
                    orderSide === "short"
                      ? "bg-red-500/20 text-[var(--color-loss)] border-red-500/30"
                      : "border-[var(--color-border)] text-[var(--color-muted)]"
                  )}
                >
                  <TrendingDown className="w-4 h-4 inline mr-1" />
                  做空
                </button>
              </div>

              {/* 交易对 */}
              <div>
                <label className="text-xs text-[var(--color-muted)] mb-1 block">交易对</label>
                <Select value={orderSymbol} onValueChange={setOrderSymbol}>
                  <SelectTrigger className="bg-[var(--color-bg)] border-[var(--color-border)]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SYMBOLS.map(s => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* 订单类型 */}
              <div className="flex gap-2">
                <button
                  onClick={() => setOrderType("market")}
                  className={cn("flex-1 py-1.5 rounded text-xs border", orderType === "market" ? "bg-[var(--color-accent)]/20 text-[var(--color-accent)] border-[var(--color-accent)]/30" : "border-[var(--color-border)] text-[var(--color-muted)]")}
                >市价</button>
                <button
                  onClick={() => setOrderType("limit")}
                  className={cn("flex-1 py-1.5 rounded text-xs border", orderType === "limit" ? "bg-[var(--color-accent)]/20 text-[var(--color-accent)] border-[var(--color-accent)]/30" : "border-[var(--color-border)] text-[var(--color-muted)]")}
                >限价</button>
              </div>

              {/* 数量 */}
              <div>
                <label className="text-xs text-[var(--color-muted)] mb-1 block">数量</label>
                <input
                  type="number"
                  value={orderQty}
                  onChange={e => setOrderQty(e.target.value)}
                  placeholder="输入数量"
                  className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-text)] placeholder-[var(--color-muted)]"
                />
              </div>

              {/* 限价 */}
              {orderType === "limit" && (
                <div>
                  <label className="text-xs text-[var(--color-muted)] mb-1 block">价格</label>
                  <input
                    type="number"
                    value={orderPrice}
                    onChange={e => setOrderPrice(e.target.value)}
                    placeholder="输入限价"
                    className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-text)] placeholder-[var(--color-muted)]"
                  />
                </div>
              )}

              {/* 杠杆 */}
              <div>
                <label className="text-xs text-[var(--color-muted)] mb-1 block">杠杆: {orderLeverage}x</label>
                <input
                  type="range"
                  min={1}
                  max={100}
                  value={orderLeverage}
                  onChange={e => setOrderLeverage(parseInt(e.target.value))}
                  className="w-full accent-[var(--color-accent)]"
                />
                <div className="flex justify-between text-xs text-[var(--color-muted)] mt-1">
                  <span>1x</span><span>25x</span><span>50x</span><span>100x</span>
                </div>
              </div>

              <Button
                onClick={handlePlaceOrder}
                className={cn(
                  "w-full font-medium",
                  orderSide === "long"
                    ? "bg-green-500/20 text-[var(--color-profit)] border border-green-500/30 hover:bg-green-500/30"
                    : "bg-red-500/20 text-[var(--color-loss)] border border-red-500/30 hover:bg-red-500/30"
                )}
              >
                {orderSide === "long" ? "做多开仓" : "做空开仓"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 模拟交易自动交易控制 */}
      {mode === "paper" && (
        <div className="bg-[var(--color-card)] rounded-lg border border-[var(--color-border)] p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">模拟自动交易</div>
              <div className="text-xs text-[var(--color-muted)] mt-0.5">
                基于 ValueScan 信号自动执行模拟交易
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-xs text-[var(--color-muted)]">
                最低评分: {paperAccount?.minSignalScore ?? 65}
              </div>
              <button
                onClick={() => paperUpdateConfig.mutate({
                  autoTradingEnabled: !(paperAccount?.autoTradingEnabled),
                })}
                className={cn(
                  "relative w-12 h-6 rounded-full transition-colors",
                  paperAccount?.autoTradingEnabled ? "bg-green-500" : "bg-[var(--color-border)]"
                )}
              >
                <span className={cn(
                  "absolute top-1 w-4 h-4 rounded-full bg-white transition-transform",
                  paperAccount?.autoTradingEnabled ? "translate-x-7" : "translate-x-1"
                )} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
