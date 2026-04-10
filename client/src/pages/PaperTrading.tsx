import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine
} from "recharts";
import {
  TrendingUp, TrendingDown, Activity, DollarSign, Target, RotateCcw,
  Play, Square, Zap, BarChart3, Clock, Award
} from "lucide-react";

function formatPnl(v: number | null | undefined) {
  if (v == null) return "—";
  const sign = v >= 0 ? "+" : "";
  return `${sign}${v.toFixed(2)}`;
}
function formatPct(v: number | null | undefined) {
  if (v == null) return "—";
  const sign = v >= 0 ? "+" : "";
  return `${sign}${v.toFixed(2)}%`;
}
function formatPrice(v: number | null | undefined) {
  if (v == null) return "—";
  if (v >= 1000) return v.toFixed(2);
  if (v >= 1) return v.toFixed(4);
  return v.toFixed(6);
}

export default function PaperTrading() {
  const utils = trpc.useUtils();

  // 数据查询
  const { data: account, isLoading: accountLoading } = trpc.paperTrading.getAccount.useQuery(undefined, {
    refetchInterval: 5000,
  });
  const { data: positions = [] } = trpc.paperTrading.getPositions.useQuery(undefined, {
    refetchInterval: 5000,
  });
  const { data: trades = [] } = trpc.paperTrading.getTrades.useQuery({ limit: 100 });
  const { data: equityCurve = [] } = trpc.paperTrading.getEquityCurve.useQuery({ limit: 200 });
  const { data: engineStatus } = trpc.paperTrading.engineStatus.useQuery(undefined, {
    refetchInterval: 3000,
  });

  // 本地配置状态
  const [perTradeAmount, setPerTradeAmount] = useState(500);
  const [leverage, setLeverage] = useState(5);
  const [stopLossPct, setStopLossPct] = useState(3);
  const [takeProfitPct, setTakeProfitPct] = useState(8);
  const [minSignalScore, setMinSignalScore] = useState(65);
  const [maxPositions, setMaxPositions] = useState(5);
  const [resetBalance, setResetBalance] = useState(10000);

  // 同步服务端配置到本地
  useEffect(() => {
    if (account) {
      setPerTradeAmount(account.perTradeAmount ?? 500);
      setLeverage(account.leverage ?? 5);
      setStopLossPct(account.stopLossPct ?? 3);
      setTakeProfitPct(account.takeProfitPct ?? 8);
      setMinSignalScore(account.minSignalScore ?? 65);
      setMaxPositions(account.maxPositions ?? 5);
    }
  }, [account]);

  // Mutations
  const updateConfig = trpc.paperTrading.updateConfig.useMutation({
    onSuccess: () => {
      utils.paperTrading.getAccount.invalidate();
      toast.success("配置已保存 — 自动交易参数已更新");
    },
  });

  const closePosition = trpc.paperTrading.closePosition.useMutation({
    onSuccess: (data) => {
      utils.paperTrading.getPositions.invalidate();
      utils.paperTrading.getAccount.invalidate();
      utils.paperTrading.getTrades.invalidate();
      const pnl = data.pnl ?? 0;
      if (pnl >= 0) {
        toast.success(`✅ 平仓盈利 ${formatPnl(pnl)} USDT (${formatPct(data.pnlPct)})`);
      } else {
        toast.error(`❌ 平仓亏损 ${formatPnl(pnl)} USDT (${formatPct(data.pnlPct)})`);
      }
    },
  });

  const resetAccount = trpc.paperTrading.resetAccount.useMutation({
    onSuccess: () => {
      utils.paperTrading.getAccount.invalidate();
      utils.paperTrading.getPositions.invalidate();
      utils.paperTrading.getTrades.invalidate();
      utils.paperTrading.getEquityCurve.invalidate();
      toast.success(`账户已重置 — 初始资金 ${resetBalance.toLocaleString()} USDT`);
    },
  });

  const triggerCycle = trpc.paperTrading.triggerCycle.useMutation({
    onSuccess: () => {
      setTimeout(() => {
        utils.paperTrading.getAccount.invalidate();
        utils.paperTrading.getPositions.invalidate();
      }, 1000);
      toast.info("交易周期已触发 — 正在检测信号并执行交易...");
    },
  });

  const toggleAutoTrading = () => {
    const newState = !(account?.autoTradingEnabled ?? false);
    updateConfig.mutate({ autoTradingEnabled: newState });
  };

  const saveConfig = () => {
    updateConfig.mutate({ perTradeAmount, leverage, stopLossPct, takeProfitPct, minSignalScore, maxPositions });
  };

  // 处理权益曲线数据
  const chartData = [...equityCurve].reverse().map((e, i) => ({
    index: i,
    balance: e.totalBalance,
    time: new Date(e.createdAt).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" }),
  }));

  const winRate = account && (account.totalTrades ?? 0) > 0
    ? (((account.winTrades ?? 0) / (account.totalTrades ?? 1)) * 100).toFixed(1)
    : "—";

  const isAutoOn = account?.autoTradingEnabled ?? false;
  const totalPnl = account?.totalPnl ?? 0;
  const totalPnlPct = account?.totalPnlPct ?? 0;

  if (accountLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground animate-pulse">加载模拟账户...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* 标题栏 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="w-6 h-6 text-yellow-400" />
            量化模拟交易
          </h1>
          <p className="text-sm text-muted-foreground mt-1">基于 ValueScan 实时信号自动开仓/平仓，验证策略后再转入实盘</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={engineStatus?.paper?.running ? "default" : "secondary"} className={engineStatus?.paper?.running ? "bg-green-500/20 text-green-400 border-green-500/30" : ""}>
            {engineStatus?.paper?.running ? "● 引擎运行中" : "○ 引擎停止"}
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={() => triggerCycle.mutate()}
            disabled={triggerCycle.isPending}
            className="border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/10"
          >
            <Zap className="w-4 h-4 mr-1" />
            手动触发
          </Button>
        </div>
      </div>

      {/* 账户概览卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <DollarSign className="w-3 h-3" /> 总资产
            </div>
            <div className="text-2xl font-bold">${(account?.totalBalance ?? 10000).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <div className={`text-sm mt-1 ${totalPnl >= 0 ? "text-green-400" : "text-red-400"}`}>
              {formatPnl(totalPnl)} USDT ({formatPct(totalPnlPct)})
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <Target className="w-3 h-3" /> 胜率
            </div>
            <div className="text-2xl font-bold">{winRate}{winRate !== "—" ? "%" : ""}</div>
            <div className="text-sm text-muted-foreground mt-1">
              {account?.winTrades ?? 0}胜 / {account?.lossTrades ?? 0}负 / {account?.totalTrades ?? 0}总
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <TrendingDown className="w-3 h-3" /> 最大回撤
            </div>
            <div className="text-2xl font-bold text-red-400">
              -{(account?.maxDrawdown ?? 0).toFixed(2)}%
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              峰值 ${(account?.peakBalance ?? 10000).toFixed(0)}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <BarChart3 className="w-3 h-3" /> 持仓/余额
            </div>
            <div className="text-2xl font-bold">{positions.length}</div>
            <div className="text-sm text-muted-foreground mt-1">
              可用 ${(account?.balance ?? 10000).toFixed(2)}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="positions" className="space-y-4">
        <TabsList className="bg-card/50">
          <TabsTrigger value="positions">当前持仓 ({positions.length})</TabsTrigger>
          <TabsTrigger value="curve">盈亏曲线</TabsTrigger>
          <TabsTrigger value="trades">交易记录 ({trades.length})</TabsTrigger>
          <TabsTrigger value="config">策略配置</TabsTrigger>
        </TabsList>

        {/* 当前持仓 */}
        <TabsContent value="positions">
          <Card className="bg-card/50 border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="w-4 h-4 text-yellow-400" />
                当前持仓
              </CardTitle>
            </CardHeader>
            <CardContent>
              {positions.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Activity className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p>暂无持仓</p>
                  <p className="text-xs mt-1">开启自动交易后，系统将根据 ValueScan 信号自动开仓</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {positions.map((pos) => {
                    const pnl = pos.unrealizedPnl ?? 0;
                    const pnlPct = pos.unrealizedPnlPct ?? 0;
                    return (
                      <div key={pos.id} className="flex items-center justify-between p-3 rounded-lg bg-background/50 border border-border/30">
                        <div className="flex items-center gap-3">
                          <Badge variant={pos.direction === "long" ? "default" : "destructive"} className={pos.direction === "long" ? "bg-green-500/20 text-green-400 border-green-500/30" : "bg-red-500/20 text-red-400 border-red-500/30"}>
                            {pos.direction === "long" ? "▲ 做多" : "▼ 做空"}
                          </Badge>
                          <div>
                            <div className="font-semibold">{pos.symbol}/USDT</div>
                            <div className="text-xs text-muted-foreground">
                              入场 {formatPrice(pos.entryPrice)} · {pos.leverage}x · 评分 {pos.signalScore?.toFixed(0) ?? "—"}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`font-semibold ${pnl >= 0 ? "text-green-400" : "text-red-400"}`}>
                            {formatPnl(pnl)} USDT
                          </div>
                          <div className={`text-xs ${pnl >= 0 ? "text-green-400" : "text-red-400"}`}>
                            {formatPct(pnlPct)} · 现价 {formatPrice(pos.currentPrice)}
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => closePosition.mutate({ positionId: pos.id })}
                          disabled={closePosition.isPending}
                          className="ml-3 border-red-500/30 text-red-400 hover:bg-red-500/10"
                        >
                          平仓
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 盈亏曲线 */}
        <TabsContent value="curve">
          <Card className="bg-card/50 border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-yellow-400" />
                权益曲线
              </CardTitle>
            </CardHeader>
            <CardContent>
              {chartData.length < 2 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p>暂无数据</p>
                  <p className="text-xs mt-1">开启自动交易后，每30秒记录一次权益快照</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="time" tick={{ fontSize: 11, fill: "#888" }} interval="preserveStartEnd" />
                    <YAxis tick={{ fontSize: 11, fill: "#888" }} domain={["auto", "auto"]} tickFormatter={(v) => `$${v.toFixed(0)}`} />
                    <Tooltip
                      contentStyle={{ background: "#1a1a2e", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }}
                      formatter={(v: number) => [`$${v.toFixed(2)}`, "总资产"]}
                    />
                    <ReferenceLine y={account?.initialBalance ?? 10000} stroke="rgba(255,255,255,0.2)" strokeDasharray="4 4" label={{ value: "初始资金", fill: "#888", fontSize: 11 }} />
                    <Line type="monotone" dataKey="balance" stroke="#eab308" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 交易记录 */}
        <TabsContent value="trades">
          <Card className="bg-card/50 border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="w-4 h-4 text-yellow-400" />
                历史交易记录
              </CardTitle>
            </CardHeader>
            <CardContent>
              {trades.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Clock className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p>暂无交易记录</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {trades.map((t) => {
                    const closeReasonMap: Record<string, string> = {
                      take_profit: "止盈 ✅",
                      stop_loss: "止损 ❌",
                      manual: "手动 🖐",
                      signal_reverse: "信号反转 🔄",
                      timeout: "超时 ⏰",
                    };
                    return (
                      <div key={t.id} className="flex items-center justify-between p-3 rounded-lg bg-background/50 border border-border/30 text-sm">
                        <div className="flex items-center gap-3">
                          <Badge variant={t.direction === "long" ? "default" : "destructive"} className={`text-xs ${t.direction === "long" ? "bg-green-500/20 text-green-400 border-green-500/30" : "bg-red-500/20 text-red-400 border-red-500/30"}`}>
                            {t.direction === "long" ? "多" : "空"}
                          </Badge>
                          <div>
                            <span className="font-medium">{t.symbol}</span>
                            <span className="text-muted-foreground ml-2 text-xs">{closeReasonMap[t.closeReason] ?? t.closeReason}</span>
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatPrice(t.entryPrice)} → {formatPrice(t.exitPrice)} · {t.holdingMinutes}分钟
                        </div>
                        <div className={`font-semibold ${(t.pnl ?? 0) >= 0 ? "text-green-400" : "text-red-400"}`}>
                          {formatPnl(t.pnl)} ({formatPct(t.pnlPct)})
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 策略配置 */}
        <TabsContent value="config">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 自动交易开关 */}
            <Card className="bg-card/50 border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Play className="w-4 h-4 text-yellow-400" />
                  自动交易控制
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-lg bg-background/50 border border-border/30">
                  <div>
                    <Label className="text-base font-medium">自动交易</Label>
                    <p className="text-xs text-muted-foreground mt-1">开启后每30秒自动检测 ValueScan 信号并执行交易</p>
                  </div>
                  <Switch
                    checked={isAutoOn}
                    onCheckedChange={toggleAutoTrading}
                    disabled={updateConfig.isPending}
                  />
                </div>
                {isAutoOn && (
                  <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-sm text-green-400">
                    ● 自动交易运行中 — 每30秒检测 ValueScan Alpha/FOMO 信号，评分≥{minSignalScore} 自动开仓
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 重置账户 */}
            <Card className="bg-card/50 border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <RotateCcw className="w-4 h-4 text-yellow-400" />
                  重置账户
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-sm">初始资金 (USDT)</Label>
                  <Input
                    type="number"
                    value={resetBalance}
                    onChange={(e) => setResetBalance(Number(e.target.value))}
                    className="mt-1 bg-background/50"
                    min={1000}
                    max={1000000}
                  />
                </div>
                <Button
                  variant="destructive"
                  className="w-full"
                  onClick={() => resetAccount.mutate({ initialBalance: resetBalance })}
                  disabled={resetAccount.isPending}
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  重置账户（清空所有记录）
                </Button>
              </CardContent>
            </Card>

            {/* 交易参数 */}
            <Card className="bg-card/50 border-border/50 md:col-span-2">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Award className="w-4 h-4 text-yellow-400" />
                  策略参数
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label className="text-sm">每笔交易金额: <span className="text-yellow-400">{perTradeAmount} USDT</span></Label>
                    <Slider value={[perTradeAmount]} onValueChange={([v]) => setPerTradeAmount(v)} min={100} max={5000} step={100} />
                    <div className="flex justify-between text-xs text-muted-foreground"><span>100</span><span>5000</span></div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">杠杆倍数: <span className="text-yellow-400">{leverage}x</span></Label>
                    <Slider value={[leverage]} onValueChange={([v]) => setLeverage(v)} min={1} max={20} step={1} />
                    <div className="flex justify-between text-xs text-muted-foreground"><span>1x</span><span>20x</span></div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">最低信号评分: <span className="text-yellow-400">{minSignalScore}</span></Label>
                    <Slider value={[minSignalScore]} onValueChange={([v]) => setMinSignalScore(v)} min={50} max={95} step={5} />
                    <div className="flex justify-between text-xs text-muted-foreground"><span>50</span><span>95</span></div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">止损比例: <span className="text-red-400">-{stopLossPct}%</span></Label>
                    <Slider value={[stopLossPct]} onValueChange={([v]) => setStopLossPct(v)} min={0.5} max={20} step={0.5} />
                    <div className="flex justify-between text-xs text-muted-foreground"><span>0.5%</span><span>20%</span></div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">止盈比例: <span className="text-green-400">+{takeProfitPct}%</span></Label>
                    <Slider value={[takeProfitPct]} onValueChange={([v]) => setTakeProfitPct(v)} min={1} max={50} step={1} />
                    <div className="flex justify-between text-xs text-muted-foreground"><span>1%</span><span>50%</span></div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">最大持仓数: <span className="text-yellow-400">{maxPositions}</span></Label>
                    <Slider value={[maxPositions]} onValueChange={([v]) => setMaxPositions(v)} min={1} max={10} step={1} />
                    <div className="flex justify-between text-xs text-muted-foreground"><span>1</span><span>10</span></div>
                  </div>
                </div>
                <Button onClick={saveConfig} disabled={updateConfig.isPending} className="mt-6 bg-yellow-500 hover:bg-yellow-600 text-black font-semibold">
                  保存策略参数
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
