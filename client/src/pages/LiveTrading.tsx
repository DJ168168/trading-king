import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import {
  AlertTriangle, TrendingUp, TrendingDown, DollarSign, Activity,
  Settings, RefreshCw, X, CheckCircle2, Shield, Zap, Eye, EyeOff
} from "lucide-react";

type ExchangeKey = "binance" | "okx" | "bybit" | "gate" | "bitget";

const EXCHANGES: { key: ExchangeKey; label: string; color: string; activeClass: string; icon: string }[] = [
  { key: "binance", label: "币安", color: "text-yellow-400", activeClass: "bg-yellow-500 text-black", icon: "₿" },
  { key: "okx",    label: "欧易",  color: "text-blue-400",   activeClass: "bg-blue-500 text-white",   icon: "◎" },
  { key: "bybit",  label: "Bybit", color: "text-orange-400", activeClass: "bg-orange-500 text-white", icon: "⬡" },
  { key: "gate",   label: "Gate",  color: "text-purple-400", activeClass: "bg-purple-500 text-white", icon: "◈" },
  { key: "bitget", label: "Bitget",color: "text-cyan-400",   activeClass: "bg-cyan-500 text-white",   icon: "⬟" },
];

export default function LiveTrading() {
  const [activeExchange, setActiveExchange] = useState<ExchangeKey>("binance");
  const [showSecrets, setShowSecrets] = useState(false);

  const [form, setForm] = useState({
    selectedExchange: "binance" as string,
    binanceApiKey: "", binanceSecretKey: "", binanceUseTestnet: true,
    okxApiKey: "", okxSecretKey: "", okxPassphrase: "", okxUseDemo: true,
    bybitApiKey: "", bybitSecretKey: "", bybitUseTestnet: false,
    gateApiKey: "", gateSecretKey: "",
    bitgetApiKey: "", bitgetSecretKey: "", bitgetPassphrase: "",
    autoTradingEnabled: false,
  });

  const [orderForm, setOrderForm] = useState({
    symbol: "BTCUSDT",
    side: "BUY" as "BUY" | "SELL",
    quantity: "0.001",
    leverage: 5,
  });

  const { data: exchangeConfig, refetch: refetchConfig } = trpc.exchange.getExchangeConfig.useQuery();

  // 加载已保存配置
  useEffect(() => {
    if (!exchangeConfig) return;
    setForm(f => ({
      ...f,
      selectedExchange: (exchangeConfig as any).selectedExchange ?? "binance",
      binanceUseTestnet: (exchangeConfig as any).binanceUseTestnet ?? true,
      okxUseDemo: (exchangeConfig as any).okxUseDemo ?? true,
      bybitUseTestnet: (exchangeConfig as any).bybitUseTestnet ?? false,
      autoTradingEnabled: (exchangeConfig as any).autoTradingEnabled ?? false,
    }));
  }, [exchangeConfig]);

  // ── 数据查询 ──
  const isBinanceReady = !!(exchangeConfig?.hasBinanceKey && exchangeConfig?.hasBinanceSecret);
  const isOkxReady = !!(exchangeConfig?.hasOkxKey && exchangeConfig?.hasOkxSecret && exchangeConfig?.hasOkxPassphrase);
  const isBybitReady = !!((exchangeConfig as any)?.hasBybitKey && (exchangeConfig as any)?.hasBybitSecret);
  const isGateReady = !!((exchangeConfig as any)?.hasGateKey && (exchangeConfig as any)?.hasGateSecret);
  const isBitgetReady = !!((exchangeConfig as any)?.hasBitgetKey && (exchangeConfig as any)?.hasBitgetSecret && (exchangeConfig as any)?.hasBitgetPassphrase);

  const readyMap: Record<ExchangeKey, boolean> = {
    binance: isBinanceReady, okx: isOkxReady,
    bybit: isBybitReady, gate: isGateReady, bitget: isBitgetReady,
  };

  const { data: binanceAccount, isLoading: binanceLoading, refetch: refetchBinance, error: binanceError } =
    trpc.exchange.binanceAccount.useQuery(undefined, { enabled: activeExchange === "binance" && isBinanceReady, retry: false });
  const { data: binancePositions, refetch: refetchBinancePos } =
    trpc.exchange.binancePositions.useQuery(undefined, { enabled: activeExchange === "binance" && isBinanceReady, retry: false, refetchInterval: 5000 });
  const { data: binanceOrders, refetch: refetchBinanceOrders } =
    trpc.exchange.binanceOpenOrders.useQuery({ symbol: undefined }, { enabled: activeExchange === "binance" && isBinanceReady, retry: false, refetchInterval: 5000 });

  const { data: okxAccount, isLoading: okxLoading, refetch: refetchOkx, error: okxError } =
    trpc.exchange.okxAccount.useQuery(undefined, { enabled: activeExchange === "okx" && isOkxReady, retry: false });
  const { data: okxPositions, refetch: refetchOkxPos } =
    trpc.exchange.okxPositions.useQuery(undefined, { enabled: activeExchange === "okx" && isOkxReady, retry: false, refetchInterval: 5000 });
  const { data: okxOrders, refetch: refetchOkxOrders } =
    trpc.exchange.okxOpenOrders.useQuery(undefined, { enabled: activeExchange === "okx" && isOkxReady, retry: false, refetchInterval: 5000 });

  const { data: bybitAccount, isLoading: bybitLoading, refetch: refetchBybit, error: bybitError } =
    trpc.exchange.bybitAccount.useQuery(undefined, { enabled: activeExchange === "bybit" && isBybitReady, retry: false });
  const { data: bybitPositions, refetch: refetchBybitPos } =
    trpc.exchange.bybitPositions.useQuery(undefined, { enabled: activeExchange === "bybit" && isBybitReady, retry: false, refetchInterval: 5000 });

  const { data: gateAccount, isLoading: gateLoading, refetch: refetchGate, error: gateError } =
    trpc.exchange.gateAccount.useQuery(undefined, { enabled: activeExchange === "gate" && isGateReady, retry: false });
  const { data: gatePositions, refetch: refetchGatePos } =
    trpc.exchange.gatePositions.useQuery(undefined, { enabled: activeExchange === "gate" && isGateReady, retry: false, refetchInterval: 5000 });

  const { data: bitgetAccount, isLoading: bitgetLoading, refetch: refetchBitget, error: bitgetError } =
    trpc.exchange.bitgetAccount.useQuery(undefined, { enabled: activeExchange === "bitget" && isBitgetReady, retry: false });
  const { data: bitgetPositions, refetch: refetchBitgetPos } =
    trpc.exchange.bitgetPositions.useQuery(undefined, { enabled: activeExchange === "bitget" && isBitgetReady, retry: false, refetchInterval: 5000 });

  // ── Mutations ──
  const saveConfig = trpc.exchange.saveFullExchangeConfig.useMutation({
    onSuccess: () => { toast.success("✅ 配置已保存"); refetchConfig(); },
    onError: (e) => toast.error("❌ 保存失败", { description: e.message }),
  });
  const binancePlaceOrder = trpc.exchange.binancePlaceOrder.useMutation({
    onSuccess: () => { toast.success("✅ 币安下单成功"); refetchBinancePos(); refetchBinanceOrders(); },
    onError: (e) => toast.error("❌ 下单失败", { description: e.message }),
  });
  const binanceClosePos = trpc.exchange.binanceClosePosition.useMutation({
    onSuccess: () => { toast.success("✅ 币安平仓成功"); refetchBinancePos(); },
    onError: (e) => toast.error("❌ 平仓失败", { description: e.message }),
  });
  const binanceCancelOrder = trpc.exchange.binanceCancelOrder.useMutation({
    onSuccess: () => { toast.success("✅ 撤单成功"); refetchBinanceOrders(); },
    onError: (e) => toast.error("❌ 撤单失败", { description: e.message }),
  });
  const okxPlaceOrder = trpc.exchange.okxPlaceOrder.useMutation({
    onSuccess: () => { toast.success("✅ 欧易下单成功"); refetchOkxPos(); refetchOkxOrders(); },
    onError: (e) => toast.error("❌ 下单失败", { description: e.message }),
  });
  const okxClosePos = trpc.exchange.okxClosePosition.useMutation({
    onSuccess: () => { toast.success("✅ 欧易平仓成功"); refetchOkxPos(); },
    onError: (e) => toast.error("❌ 平仓失败", { description: e.message }),
  });
  const okxCancelOrder = trpc.exchange.okxCancelOrder.useMutation({
    onSuccess: () => { toast.success("✅ 撤单成功"); refetchOkxOrders(); },
    onError: (e) => toast.error("❌ 撤单失败", { description: e.message }),
  });
  const bybitPlaceOrder = trpc.exchange.bybitPlaceOrder.useMutation({
    onSuccess: () => { toast.success("✅ Bybit 下单成功"); refetchBybitPos(); },
    onError: (e) => toast.error("❌ 下单失败", { description: e.message }),
  });
  const bybitClosePos = trpc.exchange.bybitClosePosition.useMutation({
    onSuccess: () => { toast.success("✅ Bybit 平仓成功"); refetchBybitPos(); },
    onError: (e) => toast.error("❌ 平仓失败", { description: e.message }),
  });
  const gatePlaceOrder = trpc.exchange.gatePlaceOrder.useMutation({
    onSuccess: () => { toast.success("✅ Gate.io 下单成功"); refetchGatePos(); },
    onError: (e) => toast.error("❌ 下单失败", { description: e.message }),
  });
  const gateClosePos = trpc.exchange.gateClosePosition.useMutation({
    onSuccess: () => { toast.success("✅ Gate.io 平仓成功"); refetchGatePos(); },
    onError: (e) => toast.error("❌ 平仓失败", { description: e.message }),
  });
  const bitgetPlaceOrder = trpc.exchange.bitgetPlaceOrder.useMutation({
    onSuccess: () => { toast.success("✅ Bitget 下单成功"); refetchBitgetPos(); },
    onError: (e) => toast.error("❌ 下单失败", { description: e.message }),
  });
  const bitgetClosePos = trpc.exchange.bitgetClosePosition.useMutation({
    onSuccess: () => { toast.success("✅ Bitget 平仓成功"); refetchBitgetPos(); },
    onError: (e) => toast.error("❌ 平仓失败", { description: e.message }),
  });

  const handleSaveConfig = () => {
    saveConfig.mutate({
      selectedExchange: form.selectedExchange as any,
      binanceApiKey: form.binanceApiKey, binanceSecretKey: form.binanceSecretKey, binanceUseTestnet: form.binanceUseTestnet,
      okxApiKey: form.okxApiKey, okxSecretKey: form.okxSecretKey, okxPassphrase: form.okxPassphrase, okxUseDemo: form.okxUseDemo,
      bybitApiKey: form.bybitApiKey, bybitSecretKey: form.bybitSecretKey, bybitUseTestnet: form.bybitUseTestnet,
      gateApiKey: form.gateApiKey, gateSecretKey: form.gateSecretKey,
      bitgetApiKey: form.bitgetApiKey, bitgetSecretKey: form.bitgetSecretKey, bitgetPassphrase: form.bitgetPassphrase,
      autoTradingEnabled: form.autoTradingEnabled, minScoreThreshold: 60,
    });
  };

  const handlePlaceOrder = () => {
    const qty = orderForm.quantity;
    const sym = orderForm.symbol;
    const isLong = orderForm.side === "BUY";
    if (activeExchange === "binance") {
      binancePlaceOrder.mutate({ symbol: sym, side: orderForm.side as "BUY" | "SELL", quantity: parseFloat(qty), leverage: orderForm.leverage });
    } else if (activeExchange === "okx") {
      okxPlaceOrder.mutate({ symbol: sym.replace("USDT", "-USDT-SWAP"), side: isLong ? "buy" : "sell", quantity: parseFloat(qty), leverage: orderForm.leverage });
    } else if (activeExchange === "bybit") {
      bybitPlaceOrder.mutate({ symbol: sym, side: isLong ? "Buy" : "Sell", qty, leverage: orderForm.leverage });
    } else if (activeExchange === "gate") {
      gatePlaceOrder.mutate({ contract: sym.replace("USDT", "_USDT"), size: isLong ? parseFloat(qty) : -parseFloat(qty) });
    } else if (activeExchange === "bitget") {
      bitgetPlaceOrder.mutate({ symbol: sym, side: isLong ? "buy" : "sell", tradeSide: "open", size: qty });
    }
  };

  const handleRefreshAll = () => {
    refetchBinance(); refetchBinancePos(); refetchBinanceOrders();
    refetchOkx(); refetchOkxPos(); refetchOkxOrders();
    refetchBybit(); refetchBybitPos();
    refetchGate(); refetchGatePos();
    refetchBitget(); refetchBitgetPos();
  };

  // ── 通用账户卡片 ──
  const AccountCards = ({ total, available, unrealized }: { total: number; available: number; unrealized: number }) => (
    <div className="grid grid-cols-3 gap-3">
      {[
        { label: "总余额", value: `$${total.toFixed(2)}`, cls: "text-white" },
        { label: "可用余额", value: `$${available.toFixed(2)}`, cls: "text-green-400" },
        { label: "未实现盈亏", value: `$${unrealized.toFixed(2)}`, cls: unrealized >= 0 ? "text-green-400" : "text-red-400" },
      ].map(c => (
        <Card key={c.label} className="bg-slate-800/50 border-slate-700">
          <CardContent className="pt-4 pb-3">
            <p className="text-slate-400 text-xs">{c.label}</p>
            <p className={`text-xl font-bold ${c.cls}`}>{c.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  // ── 通用持仓表格 ──
  const PositionTable = ({ positions, onClose }: {
    positions: { symbol: string; side: string; qty: number; entryPrice: number; markPrice?: number; unrealizedPnl: number; closeData: any }[];
    onClose: (data: any) => void;
  }) => (
    positions.length === 0 ? (
      <p className="text-slate-400 text-sm text-center py-4">暂无持仓</p>
    ) : (
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-slate-400 border-b border-slate-700">
              <th className="text-left py-2">合约</th>
              <th className="text-right py-2">方向</th>
              <th className="text-right py-2">数量</th>
              <th className="text-right py-2">开仓价</th>
              {positions[0]?.markPrice !== undefined && <th className="text-right py-2">标记价</th>}
              <th className="text-right py-2">未实现盈亏</th>
              <th className="text-right py-2">操作</th>
            </tr>
          </thead>
          <tbody>
            {positions.map((pos, i) => (
              <tr key={i} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                <td className="py-2 text-white font-medium">{pos.symbol}</td>
                <td className="py-2 text-right">
                  <Badge className={pos.side === "long" || pos.side === "多" ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}>
                    {pos.side === "long" ? "多" : pos.side === "short" ? "空" : pos.side}
                  </Badge>
                </td>
                <td className="py-2 text-right text-white">{pos.qty}</td>
                <td className="py-2 text-right text-slate-300">${pos.entryPrice.toFixed(2)}</td>
                {pos.markPrice !== undefined && <td className="py-2 text-right text-slate-300">${pos.markPrice.toFixed(2)}</td>}
                <td className={`py-2 text-right font-medium ${pos.unrealizedPnl >= 0 ? "text-green-400" : "text-red-400"}`}>
                  ${pos.unrealizedPnl.toFixed(2)}
                </td>
                <td className="py-2 text-right">
                  <Button size="sm" variant="outline"
                    className="border-red-500/30 text-red-400 hover:bg-red-500/10 h-6 text-xs"
                    onClick={() => onClose(pos.closeData)}>
                    平仓
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  );

  // ── 交易所切换按钮组 ──
  const ExchangeTabs = () => (
    <div className="flex flex-wrap gap-1.5">
      {EXCHANGES.map(ex => (
        <Button key={ex.key} size="sm"
          variant={activeExchange === ex.key ? "default" : "outline"}
          className={activeExchange === ex.key ? ex.activeClass : "border-slate-600 text-slate-300 text-xs"}
          onClick={() => setActiveExchange(ex.key)}
        >
          <span className={ex.color + " mr-1"}>{ex.icon}</span>{ex.label}
          {readyMap[ex.key] && <span className="ml-1 w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />}
        </Button>
      ))}
    </div>
  );

  // ── 未配置提示 ──
  const NotConfigured = ({ name }: { name: string }) => (
    <Alert className="border-yellow-500/30 bg-yellow-500/10">
      <AlertTriangle className="h-4 w-4 text-yellow-400" />
      <AlertDescription className="text-yellow-300">请先在「API 配置」Tab 中配置 {name} API Key</AlertDescription>
    </Alert>
  );

  // ── 构建各交易所持仓数据 ──
  const getBinancePositions = () =>
    (binancePositions ?? []).filter((p: any) => parseFloat(p.positionAmt) !== 0).map((p: any) => ({
      symbol: p.symbol, side: parseFloat(p.positionAmt) > 0 ? "多" : "空",
      qty: Math.abs(parseFloat(p.positionAmt)), entryPrice: parseFloat(p.entryPrice),
      markPrice: parseFloat(p.markPrice), unrealizedPnl: parseFloat(p.unRealizedProfit),
      closeData: { symbol: p.symbol },
    }));

  const getOkxPositions = () =>
    (okxPositions ?? []).map((p: any) => ({
      symbol: p.instId, side: p.posSide,
      qty: parseFloat(p.pos), entryPrice: parseFloat(p.avgPx || "0"),
      unrealizedPnl: parseFloat(p.upl || "0"),
      closeData: { symbol: p.instId },
    }));

  const getBybitPositions = () =>
    (bybitPositions ?? []).filter((p: any) => parseFloat(p.size || "0") !== 0).map((p: any) => ({
      symbol: p.symbol, side: p.side === "Buy" ? "多" : "空",
      qty: parseFloat(p.size || "0"), entryPrice: parseFloat(p.avgPrice || "0"),
      markPrice: parseFloat(p.markPrice || "0"), unrealizedPnl: parseFloat(p.unrealisedPnl || "0"),
      closeData: { symbol: p.symbol, side: p.side === "Buy" ? "Sell" : "Buy", qty: p.size },
    }));

  const getGatePositions = () =>
    (gatePositions ?? []).filter((p: any) => p.size !== 0).map((p: any) => ({
      symbol: p.contract, side: p.size > 0 ? "多" : "空",
      qty: Math.abs(p.size), entryPrice: parseFloat(p.entry_price || "0"),
      unrealizedPnl: parseFloat(p.unrealised_pnl || "0"),
      closeData: { contract: p.contract, size: -p.size },
    }));

  const getBitgetPositions = () =>
    (bitgetPositions ?? []).filter((p: any) => parseFloat(p.total || "0") !== 0).map((p: any) => ({
      symbol: p.symbol, side: p.holdSide === "long" ? "多" : "空",
      qty: parseFloat(p.total || "0"), entryPrice: parseFloat(p.openPriceAvg || "0"),
      unrealizedPnl: parseFloat(p.unrealizedPL || "0"),
      closeData: { symbol: p.symbol, side: p.holdSide === "long" ? "sell" : "buy", size: p.total },
    }));

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Zap className="w-6 h-6 text-yellow-400" />
            实盘交易控制台
          </h1>
          <p className="text-slate-400 text-sm mt-1">支持币安 · 欧易 · Bybit · Gate.io · Bitget 五大交易所</p>
        </div>
        <div className="flex items-center gap-3">
          {exchangeConfig?.autoTradingEnabled ? (
            <Badge className="bg-green-500/20 text-green-400 border-green-500/30 animate-pulse">
              <Activity className="w-3 h-3 mr-1" /> 自动交易运行中
            </Badge>
          ) : (
            <Badge className="bg-slate-700 text-slate-400 border-slate-600">
              <Shield className="w-3 h-3 mr-1" /> 手动模式
            </Badge>
          )}
        </div>
      </div>

      <Alert className="border-yellow-500/30 bg-yellow-500/10">
        <AlertTriangle className="h-4 w-4 text-yellow-400" />
        <AlertDescription className="text-yellow-300 text-sm">
          <strong>实盘风险提示：</strong>实盘交易涉及真实资金，请确认 API Key 仅开启合约交易权限，
          <strong>禁止勾选提币权限</strong>。建议先在测试网/模拟盘验证策略后再切换实盘。
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="config" className="space-y-4">
        <TabsList className="bg-slate-800 border border-slate-700">
          <TabsTrigger value="config" className="data-[state=active]:bg-yellow-500 data-[state=active]:text-black">
            <Settings className="w-4 h-4 mr-1" /> API 配置
          </TabsTrigger>
          <TabsTrigger value="positions" className="data-[state=active]:bg-yellow-500 data-[state=active]:text-black">
            <Activity className="w-4 h-4 mr-1" /> 实时持仓
          </TabsTrigger>
          <TabsTrigger value="orders" className="data-[state=active]:bg-yellow-500 data-[state=active]:text-black">
            <DollarSign className="w-4 h-4 mr-1" /> 挂单管理
          </TabsTrigger>
          <TabsTrigger value="manual" className="data-[state=active]:bg-yellow-500 data-[state=active]:text-black">
            <Zap className="w-4 h-4 mr-1" /> 手动下单
          </TabsTrigger>
        </TabsList>

        {/* ── API 配置 Tab ── */}
        <TabsContent value="config" className="space-y-4">
          {/* 交易所选择 */}
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white text-base">交易所选择</CardTitle>
              <CardDescription className="text-slate-400">选择自动交易使用的主交易所</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-slate-300 text-sm">主交易所</Label>
                <Select value={form.selectedExchange} onValueChange={(v) => setForm(p => ({ ...p, selectedExchange: v }))}>
                  <SelectTrigger className="bg-slate-700 border-slate-600 text-white mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="binance">₿ 币安 (Binance)</SelectItem>
                    <SelectItem value="okx">◎ 欧易 (OKX)</SelectItem>
                    <SelectItem value="bybit">⬡ Bybit</SelectItem>
                    <SelectItem value="gate">◈ Gate.io</SelectItem>
                    <SelectItem value="bitget">⬟ Bitget</SelectItem>
                    <SelectItem value="both">双交易所同步（币安+欧易）</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                <div>
                  <p className="text-white text-sm font-medium">自动交易</p>
                  <p className="text-slate-400 text-xs">信号触发时自动下单</p>
                </div>
                <Switch checked={form.autoTradingEnabled} onCheckedChange={(v) => setForm(p => ({ ...p, autoTradingEnabled: v }))} />
              </div>
              {/* 配置状态 */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 text-xs">
                {EXCHANGES.map(ex => {
                  const ready = readyMap[ex.key];
                  return (
                    <div key={ex.key} className={`p-2 rounded border ${ready ? "border-green-500/30 bg-green-500/10" : "border-slate-600 bg-slate-700/50"}`}>
                      <p className={`font-medium ${ready ? "text-green-400" : "text-slate-400"}`}>
                        {ready ? "✅" : "⚠️"} {ex.label}
                      </p>
                      <p className="text-slate-500 mt-0.5">{ready ? "已配置" : "未配置"}</p>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* API Key 表单 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {/* 币安 */}
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white text-base flex items-center gap-2">
                  <span className="text-yellow-400">₿</span> 币安 API
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-slate-300 text-sm">API Key</Label>
                  <Input className="bg-slate-700 border-slate-600 text-white mt-1 text-xs" placeholder="Binance API Key"
                    value={form.binanceApiKey} onChange={(e) => setForm(p => ({ ...p, binanceApiKey: e.target.value }))} />
                </div>
                <div>
                  <Label className="text-slate-300 text-sm">Secret Key</Label>
                  <div className="relative mt-1">
                    <Input className="bg-slate-700 border-slate-600 text-white text-xs pr-10" placeholder="Binance Secret Key"
                      type={showSecrets ? "text" : "password"}
                      value={form.binanceSecretKey} onChange={(e) => setForm(p => ({ ...p, binanceSecretKey: e.target.value }))} />
                    <button className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white" onClick={() => setShowSecrets(!showSecrets)}>
                      {showSecrets ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-slate-300 text-sm">使用测试网</Label>
                  <Switch checked={form.binanceUseTestnet} onCheckedChange={(v) => setForm(p => ({ ...p, binanceUseTestnet: v }))} />
                </div>
              </CardContent>
            </Card>

            {/* 欧易 */}
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white text-base flex items-center gap-2">
                  <span className="text-blue-400">◎</span> 欧易 OKX API
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-slate-300 text-sm">API Key</Label>
                  <Input className="bg-slate-700 border-slate-600 text-white mt-1 text-xs" placeholder="OKX API Key"
                    value={form.okxApiKey} onChange={(e) => setForm(p => ({ ...p, okxApiKey: e.target.value }))} />
                </div>
                <div>
                  <Label className="text-slate-300 text-sm">Secret Key</Label>
                  <Input className="bg-slate-700 border-slate-600 text-white mt-1 text-xs" placeholder="OKX Secret Key"
                    type={showSecrets ? "text" : "password"}
                    value={form.okxSecretKey} onChange={(e) => setForm(p => ({ ...p, okxSecretKey: e.target.value }))} />
                </div>
                <div>
                  <Label className="text-slate-300 text-sm">Passphrase</Label>
                  <Input className="bg-slate-700 border-slate-600 text-white mt-1 text-xs" placeholder="OKX Passphrase"
                    type={showSecrets ? "text" : "password"}
                    value={form.okxPassphrase} onChange={(e) => setForm(p => ({ ...p, okxPassphrase: e.target.value }))} />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-slate-300 text-sm">使用模拟盘</Label>
                  <Switch checked={form.okxUseDemo} onCheckedChange={(v) => setForm(p => ({ ...p, okxUseDemo: v }))} />
                </div>
              </CardContent>
            </Card>

            {/* Bybit */}
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white text-base flex items-center gap-2">
                  <span className="text-orange-400">⬡</span> Bybit API
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-slate-300 text-sm">API Key</Label>
                  <Input className="bg-slate-700 border-slate-600 text-white mt-1 text-xs" placeholder="Bybit API Key"
                    value={form.bybitApiKey} onChange={(e) => setForm(p => ({ ...p, bybitApiKey: e.target.value }))} />
                </div>
                <div>
                  <Label className="text-slate-300 text-sm">Secret Key</Label>
                  <Input className="bg-slate-700 border-slate-600 text-white mt-1 text-xs" placeholder="Bybit Secret Key"
                    type={showSecrets ? "text" : "password"}
                    value={form.bybitSecretKey} onChange={(e) => setForm(p => ({ ...p, bybitSecretKey: e.target.value }))} />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-slate-300 text-sm">使用测试网</Label>
                  <Switch checked={form.bybitUseTestnet} onCheckedChange={(v) => setForm(p => ({ ...p, bybitUseTestnet: v }))} />
                </div>
                <p className="text-xs text-slate-500">
                  获取：<a href="https://www.bybit.com/zh-MY/user/api-management" target="_blank" className="text-orange-400 hover:underline">bybit.com API 管理</a>
                </p>
              </CardContent>
            </Card>

            {/* Gate.io */}
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white text-base flex items-center gap-2">
                  <span className="text-purple-400">◈</span> Gate.io API
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-slate-300 text-sm">API Key</Label>
                  <Input className="bg-slate-700 border-slate-600 text-white mt-1 text-xs" placeholder="Gate.io API Key"
                    value={form.gateApiKey} onChange={(e) => setForm(p => ({ ...p, gateApiKey: e.target.value }))} />
                </div>
                <div>
                  <Label className="text-slate-300 text-sm">Secret Key</Label>
                  <Input className="bg-slate-700 border-slate-600 text-white mt-1 text-xs" placeholder="Gate.io Secret Key"
                    type={showSecrets ? "text" : "password"}
                    value={form.gateSecretKey} onChange={(e) => setForm(p => ({ ...p, gateSecretKey: e.target.value }))} />
                </div>
                <p className="text-xs text-slate-500">
                  获取：<a href="https://www.gate.io/zh/myaccount/api_key_manage" target="_blank" className="text-purple-400 hover:underline">gate.io API 管理</a>
                </p>
              </CardContent>
            </Card>

            {/* Bitget */}
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white text-base flex items-center gap-2">
                  <span className="text-cyan-400">⬟</span> Bitget API
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-slate-300 text-sm">API Key</Label>
                  <Input className="bg-slate-700 border-slate-600 text-white mt-1 text-xs" placeholder="Bitget API Key"
                    value={form.bitgetApiKey} onChange={(e) => setForm(p => ({ ...p, bitgetApiKey: e.target.value }))} />
                </div>
                <div>
                  <Label className="text-slate-300 text-sm">Secret Key</Label>
                  <Input className="bg-slate-700 border-slate-600 text-white mt-1 text-xs" placeholder="Bitget Secret Key"
                    type={showSecrets ? "text" : "password"}
                    value={form.bitgetSecretKey} onChange={(e) => setForm(p => ({ ...p, bitgetSecretKey: e.target.value }))} />
                </div>
                <div>
                  <Label className="text-slate-300 text-sm">Passphrase</Label>
                  <Input className="bg-slate-700 border-slate-600 text-white mt-1 text-xs" placeholder="Bitget Passphrase"
                    type={showSecrets ? "text" : "password"}
                    value={form.bitgetPassphrase} onChange={(e) => setForm(p => ({ ...p, bitgetPassphrase: e.target.value }))} />
                </div>
                <p className="text-xs text-slate-500">
                  获取：<a href="https://www.bitget.com/zh-CN/account/newapi" target="_blank" className="text-cyan-400 hover:underline">bitget.com API 管理</a>
                </p>
              </CardContent>
            </Card>

            {/* 保存按钮 */}
            <Card className="bg-slate-800/50 border-slate-700 flex flex-col justify-center">
              <CardContent className="pt-6 space-y-4">
                <div className="text-center space-y-2">
                  <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto" />
                  <p className="text-white font-medium">配置完成后保存</p>
                  <p className="text-slate-400 text-sm">API Key 加密存储，不会外传</p>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <button className="text-xs text-slate-400 hover:text-white flex items-center gap-1" onClick={() => setShowSecrets(!showSecrets)}>
                    {showSecrets ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    {showSecrets ? "隐藏密钥" : "显示密钥"}
                  </button>
                </div>
                <Button className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-bold"
                  onClick={handleSaveConfig} disabled={saveConfig.isPending}>
                  {saveConfig.isPending ? "保存中..." : "💾 保存全部配置"}
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── 实时持仓 Tab ── */}
        <TabsContent value="positions" className="space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <ExchangeTabs />
            <Button size="sm" variant="outline" className="border-slate-600 text-slate-300 ml-auto" onClick={handleRefreshAll}>
              <RefreshCw className="w-3 h-3 mr-1" /> 刷新
            </Button>
          </div>

          {/* 币安 */}
          {activeExchange === "binance" && (
            <div className="space-y-4">
              {!isBinanceReady ? <NotConfigured name="币安" /> :
               binanceLoading ? <div className="text-center py-8 text-slate-400">加载中...</div> :
               binanceError ? <Alert className="border-red-500/30 bg-red-500/10"><AlertTriangle className="h-4 w-4 text-red-400" /><AlertDescription className="text-red-300">{binanceError.message}</AlertDescription></Alert> :
               binanceAccount && (
                <>
                  <AccountCards
                    total={parseFloat((binanceAccount as any).totalWalletBalance || "0")}
                    available={parseFloat((binanceAccount as any).availableBalance || "0")}
                    unrealized={parseFloat((binanceAccount as any).totalUnrealizedProfit || "0")}
                  />
                  <Card className="bg-slate-800/50 border-slate-700">
                    <CardHeader><CardTitle className="text-white text-sm">当前持仓</CardTitle></CardHeader>
                    <CardContent>
                      <PositionTable positions={getBinancePositions()} onClose={(d) => binanceClosePos.mutate(d)} />
                    </CardContent>
                  </Card>
                </>
              )}
            </div>
          )}

          {/* 欧易 */}
          {activeExchange === "okx" && (
            <div className="space-y-4">
              {!isOkxReady ? <NotConfigured name="欧易" /> :
               okxLoading ? <div className="text-center py-8 text-slate-400">加载中...</div> :
               okxError ? <Alert className="border-red-500/30 bg-red-500/10"><AlertTriangle className="h-4 w-4 text-red-400" /><AlertDescription className="text-red-300">{okxError.message}</AlertDescription></Alert> :
               okxAccount && (
                <>
                  <AccountCards
                    total={(okxAccount as any).balance ?? 0}
                    available={(okxAccount as any).available ?? 0}
                    unrealized={(okxAccount as any).unrealizedPnl ?? 0}
                  />
                  <Card className="bg-slate-800/50 border-slate-700">
                    <CardHeader><CardTitle className="text-white text-sm">当前持仓</CardTitle></CardHeader>
                    <CardContent>
                      <PositionTable positions={getOkxPositions()} onClose={(d) => okxClosePos.mutate(d)} />
                    </CardContent>
                  </Card>
                </>
              )}
            </div>
          )}

          {/* Bybit */}
          {activeExchange === "bybit" && (
            <div className="space-y-4">
              {!isBybitReady ? <NotConfigured name="Bybit" /> :
               bybitLoading ? <div className="text-center py-8 text-slate-400">加载中...</div> :
               bybitError ? <Alert className="border-red-500/30 bg-red-500/10"><AlertTriangle className="h-4 w-4 text-red-400" /><AlertDescription className="text-red-300">{(bybitError as any).message}</AlertDescription></Alert> :
               bybitAccount && (
                <>
                  <AccountCards
                    total={parseFloat((bybitAccount as any).totalWalletBalance || "0")}
                    available={parseFloat((bybitAccount as any).availableBalance || "0")}
                    unrealized={parseFloat((bybitAccount as any).totalUnrealisedPnl || "0")}
                  />
                  <Card className="bg-slate-800/50 border-slate-700">
                    <CardHeader><CardTitle className="text-white text-sm">当前持仓</CardTitle></CardHeader>
                    <CardContent>
                      <PositionTable positions={getBybitPositions()} onClose={(d) => bybitClosePos.mutate(d)} />
                    </CardContent>
                  </Card>
                </>
              )}
            </div>
          )}

          {/* Gate.io */}
          {activeExchange === "gate" && (
            <div className="space-y-4">
              {!isGateReady ? <NotConfigured name="Gate.io" /> :
               gateLoading ? <div className="text-center py-8 text-slate-400">加载中...</div> :
               gateError ? <Alert className="border-red-500/30 bg-red-500/10"><AlertTriangle className="h-4 w-4 text-red-400" /><AlertDescription className="text-red-300">{(gateError as any).message}</AlertDescription></Alert> :
               gateAccount && (
                <>
                  <AccountCards
                    total={parseFloat((gateAccount as any).total || "0")}
                    available={parseFloat((gateAccount as any).available || "0")}
                    unrealized={parseFloat((gateAccount as any).unrealised_pnl || "0")}
                  />
                  <Card className="bg-slate-800/50 border-slate-700">
                    <CardHeader><CardTitle className="text-white text-sm">当前持仓</CardTitle></CardHeader>
                    <CardContent>
                      <PositionTable positions={getGatePositions()} onClose={(d) => gateClosePos.mutate(d)} />
                    </CardContent>
                  </Card>
                </>
              )}
            </div>
          )}

          {/* Bitget */}
          {activeExchange === "bitget" && (
            <div className="space-y-4">
              {!isBitgetReady ? <NotConfigured name="Bitget" /> :
               bitgetLoading ? <div className="text-center py-8 text-slate-400">加载中...</div> :
               bitgetError ? <Alert className="border-red-500/30 bg-red-500/10"><AlertTriangle className="h-4 w-4 text-red-400" /><AlertDescription className="text-red-300">{(bitgetError as any).message}</AlertDescription></Alert> :
               bitgetAccount && (
                <>
                  <AccountCards
                    total={parseFloat((bitgetAccount as any).usdtEquity || (bitgetAccount as any).available || "0")}
                    available={parseFloat((bitgetAccount as any).available || "0")}
                    unrealized={parseFloat((bitgetAccount as any).unrealizedPL || "0")}
                  />
                  <Card className="bg-slate-800/50 border-slate-700">
                    <CardHeader><CardTitle className="text-white text-sm">当前持仓</CardTitle></CardHeader>
                    <CardContent>
                      <PositionTable positions={getBitgetPositions()} onClose={(d) => bitgetClosePos.mutate(d)} />
                    </CardContent>
                  </Card>
                </>
              )}
            </div>
          )}
        </TabsContent>

        {/* ── 挂单管理 Tab ── */}
        <TabsContent value="orders" className="space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <ExchangeTabs />
            <Button size="sm" variant="outline" className="border-slate-600 text-slate-300 ml-auto"
              onClick={() => { refetchBinanceOrders(); refetchOkxOrders(); }}>
              <RefreshCw className="w-3 h-3 mr-1" /> 刷新
            </Button>
          </div>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white text-sm">
                {EXCHANGES.find(e => e.key === activeExchange)?.label} 当前挂单
              </CardTitle>
            </CardHeader>
            <CardContent>
              {activeExchange === "binance" && (
                !binanceOrders || binanceOrders.length === 0 ? (
                  <p className="text-slate-400 text-sm text-center py-4">暂无挂单</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-slate-400 border-b border-slate-700">
                          <th className="text-left py-2">交易对</th>
                          <th className="text-right py-2">方向</th>
                          <th className="text-right py-2">类型</th>
                          <th className="text-right py-2">数量</th>
                          <th className="text-right py-2">价格</th>
                          <th className="text-right py-2">状态</th>
                          <th className="text-right py-2">操作</th>
                        </tr>
                      </thead>
                      <tbody>
                        {binanceOrders.map((order: any) => (
                          <tr key={String(order.orderId ?? order.clientOrderId)} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                            <td className="py-2 text-white font-medium">{order.symbol}</td>
                            <td className="py-2 text-right">
                              <Badge className={order.side === "BUY" ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}>
                                {order.side === "BUY" ? "买入" : "卖出"}
                              </Badge>
                            </td>
                            <td className="py-2 text-right text-slate-300">{order.type}</td>
                            <td className="py-2 text-right text-white">{order.origQty}</td>
                            <td className="py-2 text-right text-slate-300">{order.price === "0" ? "市价" : `$${parseFloat(order.price).toFixed(2)}`}</td>
                            <td className="py-2 text-right"><Badge className="bg-blue-500/20 text-blue-400">{order.status}</Badge></td>
                            <td className="py-2 text-right">
                              <Button size="sm" variant="outline" className="border-red-500/30 text-red-400 hover:bg-red-500/10 h-6 text-xs"
                                onClick={() => binanceCancelOrder.mutate({ symbol: order.symbol, orderId: order.orderId })}
                                disabled={binanceCancelOrder.isPending}>
                                <X className="w-3 h-3" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              )}
              {activeExchange === "okx" && (
                !okxOrders || okxOrders.length === 0 ? (
                  <p className="text-slate-400 text-sm text-center py-4">暂无挂单</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-slate-400 border-b border-slate-700">
                          <th className="text-left py-2">合约</th>
                          <th className="text-right py-2">方向</th>
                          <th className="text-right py-2">数量</th>
                          <th className="text-right py-2">价格</th>
                          <th className="text-right py-2">操作</th>
                        </tr>
                      </thead>
                      <tbody>
                        {okxOrders.map((order: any) => (
                          <tr key={String(order.ordId ?? order.clOrdId)} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                            <td className="py-2 text-white font-medium">{order.instId}</td>
                            <td className="py-2 text-right">
                              <Badge className={order.side === "buy" ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}>
                                {order.side === "buy" ? "买入" : "卖出"}
                              </Badge>
                            </td>
                            <td className="py-2 text-right text-white">{order.sz}</td>
                            <td className="py-2 text-right text-slate-300">{order.px === "-1" ? "市价" : `$${parseFloat(order.px).toFixed(2)}`}</td>
                            <td className="py-2 text-right">
                              <Button size="sm" variant="outline" className="border-red-500/30 text-red-400 hover:bg-red-500/10 h-6 text-xs"
                                onClick={() => okxCancelOrder.mutate({ symbol: order.instId, orderId: order.ordId })}
                                disabled={okxCancelOrder.isPending}>
                                <X className="w-3 h-3" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              )}
              {(activeExchange === "bybit" || activeExchange === "gate" || activeExchange === "bitget") && (
                <p className="text-slate-400 text-sm text-center py-4">
                  {EXCHANGES.find(e => e.key === activeExchange)?.label} 挂单管理请前往交易所官网查看
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── 手动下单 Tab ── */}
        <TabsContent value="manual" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white text-base">手动下单</CardTitle>
                <CardDescription className="text-slate-400">直接向交易所发送市价单</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ExchangeTabs />

                <div>
                  <Label className="text-slate-300 text-sm">交易对</Label>
                  <Input className="bg-slate-700 border-slate-600 text-white mt-1"
                    placeholder={activeExchange === "okx" ? "BTC-USDT-SWAP" : activeExchange === "gate" ? "BTC_USDT" : "BTCUSDT"}
                    value={orderForm.symbol}
                    onChange={(e) => setOrderForm(p => ({ ...p, symbol: e.target.value }))} />
                </div>

                <div>
                  <Label className="text-slate-300 text-sm">方向</Label>
                  <div className="flex gap-2 mt-1">
                    <Button className={`flex-1 ${orderForm.side === "BUY" ? "bg-green-500 hover:bg-green-400 text-white" : "border-slate-600 text-slate-300"}`}
                      variant={orderForm.side === "BUY" ? "default" : "outline"}
                      onClick={() => setOrderForm(p => ({ ...p, side: "BUY" }))}>
                      <TrendingUp className="w-4 h-4 mr-1" /> 做多
                    </Button>
                    <Button className={`flex-1 ${orderForm.side === "SELL" ? "bg-red-500 hover:bg-red-400 text-white" : "border-slate-600 text-slate-300"}`}
                      variant={orderForm.side === "SELL" ? "default" : "outline"}
                      onClick={() => setOrderForm(p => ({ ...p, side: "SELL" }))}>
                      <TrendingDown className="w-4 h-4 mr-1" /> 做空
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-slate-300 text-sm">数量</Label>
                    <Input className="bg-slate-700 border-slate-600 text-white mt-1" type="number" step="0.001"
                      value={orderForm.quantity} onChange={(e) => setOrderForm(p => ({ ...p, quantity: e.target.value }))} />
                  </div>
                  <div>
                    <Label className="text-slate-300 text-sm">杠杆倍数</Label>
                    <Input className="bg-slate-700 border-slate-600 text-white mt-1" type="number" min="1" max="125"
                      value={orderForm.leverage} onChange={(e) => setOrderForm(p => ({ ...p, leverage: parseInt(e.target.value) || 1 }))} />
                  </div>
                </div>

                <Alert className="border-red-500/30 bg-red-500/10">
                  <AlertTriangle className="h-4 w-4 text-red-400" />
                  <AlertDescription className="text-red-300 text-xs">
                    手动下单将立即以市价执行，请确认参数无误。
                    {!readyMap[activeExchange] && " ⚠️ 请先配置该交易所 API Key"}
                  </AlertDescription>
                </Alert>

                <Button
                  className={`w-full font-bold ${orderForm.side === "BUY" ? "bg-green-500 hover:bg-green-400" : "bg-red-500 hover:bg-red-400"} text-white`}
                  onClick={handlePlaceOrder}
                  disabled={!readyMap[activeExchange] || binancePlaceOrder.isPending || okxPlaceOrder.isPending || bybitPlaceOrder.isPending || gatePlaceOrder.isPending || bitgetPlaceOrder.isPending}
                >
                  {`${orderForm.side === "BUY" ? "🟢 做多" : "🔴 做空"} ${orderForm.symbol} x${orderForm.quantity} @ ${EXCHANGES.find(e => e.key === activeExchange)?.label}`}
                </Button>
              </CardContent>
            </Card>

            {/* 最高胜率入场策略 */}
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white text-base">最高胜率入场策略</CardTitle>
                <CardDescription className="text-slate-400">基于 ValueScan noelsonr 教程</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {[
                  { step: "1", title: "AI 多空信号确认", desc: "ValueScan 出现 Alpha ⚡ + FOMO 🔥 双重标记", color: "text-yellow-400" },
                  { step: "2", title: "主力成本分析", desc: "当前价格低于主力成本（偏离度为负）", color: "text-blue-400" },
                  { step: "3", title: "资金流确认", desc: "现货+合约双向净流入，主力在建仓", color: "text-green-400" },
                  { step: "4", title: "信号共振评分", desc: "综合评分 ≥ 75 分（最高胜率区间）", color: "text-purple-400" },
                  { step: "5", title: "技术面确认", desc: "K 线支撑位 + RSI 超卖 + MACD 金叉", color: "text-orange-400" },
                ].map(item => (
                  <div key={item.step} className="flex gap-3 p-2 rounded bg-slate-700/50">
                    <span className={`font-bold text-lg ${item.color} w-6 flex-shrink-0`}>{item.step}</span>
                    <div>
                      <p className="text-white font-medium">{item.title}</p>
                      <p className="text-slate-400 text-xs">{item.desc}</p>
                    </div>
                  </div>
                ))}
                <div className="mt-3 p-3 bg-green-500/10 border border-green-500/30 rounded">
                  <p className="text-green-400 font-medium text-xs">✅ 5 条件全满足 = 最高胜率入场</p>
                  <p className="text-slate-400 text-xs mt-1">历史回测胜率 &gt;80%，风险收益比 1:3+</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
