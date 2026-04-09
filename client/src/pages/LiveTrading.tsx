import { useState } from "react";
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

export default function LiveTrading() {
  const [activeExchange, setActiveExchange] = useState<"binance" | "okx">("binance");
  const [showSecrets, setShowSecrets] = useState(false);

  // 配置表单
  const [form, setForm] = useState({
    selectedExchange: "binance" as "binance" | "okx" | "both",
    binanceApiKey: "",
    binanceSecretKey: "",
    binanceUseTestnet: true,
    okxApiKey: "",
    okxSecretKey: "",
    okxPassphrase: "",
    okxUseDemo: true,
    autoTradingEnabled: false,
  });

  // 手动下单表单
  const [orderForm, setOrderForm] = useState({
    symbol: "BTCUSDT",
    side: "BUY" as "BUY" | "SELL",
    quantity: 0.001,
    leverage: 5,
  });

  // 读取当前配置
  const { data: exchangeConfig, refetch: refetchConfig } = trpc.exchange.getExchangeConfig.useQuery();

  // 币安数据
  const { data: binanceAccount, isLoading: binanceLoading, refetch: refetchBinance, error: binanceError } =
    trpc.exchange.binanceAccount.useQuery(undefined, {
      enabled: activeExchange === "binance" && !!(exchangeConfig?.hasBinanceKey),
      retry: false,
    });

  const { data: binancePositions, refetch: refetchBinancePos } =
    trpc.exchange.binancePositions.useQuery(undefined, {
      enabled: activeExchange === "binance" && !!(exchangeConfig?.hasBinanceKey),
      retry: false,
      refetchInterval: 5000,
    });

  const { data: binanceOrders, refetch: refetchBinanceOrders } =
    trpc.exchange.binanceOpenOrders.useQuery({ symbol: undefined }, {
      enabled: activeExchange === "binance" && !!(exchangeConfig?.hasBinanceKey),
      retry: false,
      refetchInterval: 5000,
    });

  // 欧易数据
  const { data: okxAccount, isLoading: okxLoading, refetch: refetchOkx, error: okxError } =
    trpc.exchange.okxAccount.useQuery(undefined, {
      enabled: activeExchange === "okx" && !!(exchangeConfig?.hasOkxKey),
      retry: false,
    });

  const { data: okxPositions, refetch: refetchOkxPos } =
    trpc.exchange.okxPositions.useQuery(undefined, {
      enabled: activeExchange === "okx" && !!(exchangeConfig?.hasOkxKey),
      retry: false,
      refetchInterval: 5000,
    });

  const { data: okxOrders, refetch: refetchOkxOrders } =
    trpc.exchange.okxOpenOrders.useQuery(undefined, {
      enabled: activeExchange === "okx" && !!(exchangeConfig?.hasOkxKey),
      retry: false,
      refetchInterval: 5000,
    });

  // Mutations
  const saveConfig = trpc.exchange.saveExchangeConfig.useMutation({
    onSuccess: () => {
      toast.success("✅ 配置已保存", { description: "交易所 API 配置已成功保存" });
      refetchConfig();
    },
    onError: (e) => toast.error("❌ 保存失败", { description: e.message }),
  });

  const binancePlaceOrder = trpc.exchange.binancePlaceOrder.useMutation({
    onSuccess: () => {
      toast.success("✅ 币安下单成功", { description: `${orderForm.side} ${orderForm.symbol} x${orderForm.quantity}` });
      refetchBinancePos();
      refetchBinanceOrders();
    },
    onError: (e) => toast.error("❌ 下单失败", { description: e.message }),
  });

  const binanceClosePos = trpc.exchange.binanceClosePosition.useMutation({
    onSuccess: () => {
      toast.success("✅ 币安平仓成功");
      refetchBinancePos();
    },
    onError: (e) => toast.error("❌ 平仓失败", { description: e.message }),
  });

  const binanceCancelOrder = trpc.exchange.binanceCancelOrder.useMutation({
    onSuccess: () => {
      toast.success("✅ 撤单成功");
      refetchBinanceOrders();
    },
    onError: (e) => toast.error("❌ 撤单失败", { description: e.message }),
  });

  const okxPlaceOrder = trpc.exchange.okxPlaceOrder.useMutation({
    onSuccess: () => {
      toast.success("✅ 欧易下单成功", { description: `${orderForm.side} ${orderForm.symbol}` });
      refetchOkxPos();
      refetchOkxOrders();
    },
    onError: (e) => toast.error("❌ 下单失败", { description: e.message }),
  });

  const okxClosePos = trpc.exchange.okxClosePosition.useMutation({
    onSuccess: () => {
      toast.success("✅ 欧易平仓成功");
      refetchOkxPos();
    },
    onError: (e) => toast.error("❌ 平仓失败", { description: e.message }),
  });

  const okxCancelOrder = trpc.exchange.okxCancelOrder.useMutation({
    onSuccess: () => {
      toast.success("✅ 撤单成功");
      refetchOkxOrders();
    },
    onError: (e) => toast.error("❌ 撤单失败", { description: e.message }),
  });

  const handleSaveConfig = () => {
    saveConfig.mutate(form);
  };

  const handlePlaceOrder = () => {
    if (activeExchange === "binance") {
      binancePlaceOrder.mutate({
        symbol: orderForm.symbol,
        side: orderForm.side as "BUY" | "SELL",
        quantity: orderForm.quantity,
        leverage: orderForm.leverage,
      });
    } else {
      okxPlaceOrder.mutate({
        symbol: orderForm.symbol.replace("USDT", "-USDT-SWAP"),
        side: orderForm.side.toLowerCase() as "buy" | "sell",
        quantity: orderForm.quantity,
        leverage: orderForm.leverage,
      });
    }
  };

  const isBinanceReady = exchangeConfig?.hasBinanceKey && exchangeConfig?.hasBinanceSecret;
  const isOkxReady = exchangeConfig?.hasOkxKey && exchangeConfig?.hasOkxSecret && exchangeConfig?.hasOkxPassphrase;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Zap className="w-6 h-6 text-yellow-400" />
            实盘交易控制台
          </h1>
          <p className="text-slate-400 text-sm mt-1">连接币安/欧易实盘 API，实时持仓管理与手动下单</p>
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

      {/* 安全警告 */}
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* 交易所选择 */}
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white text-base">交易所选择</CardTitle>
                <CardDescription className="text-slate-400">选择使用的交易所及模式</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-slate-300 text-sm">主交易所</Label>
                  <Select value={form.selectedExchange} onValueChange={(v) => setForm(p => ({ ...p, selectedExchange: v as any }))}>
                    <SelectTrigger className="bg-slate-700 border-slate-600 text-white mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700">
                      <SelectItem value="binance">币安 (Binance)</SelectItem>
                      <SelectItem value="okx">欧易 (OKX)</SelectItem>
                      <SelectItem value="both">双交易所同步</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                  <div>
                    <p className="text-white text-sm font-medium">自动交易</p>
                    <p className="text-slate-400 text-xs">信号触发时自动下单</p>
                  </div>
                  <Switch
                    checked={form.autoTradingEnabled}
                    onCheckedChange={(v) => setForm(p => ({ ...p, autoTradingEnabled: v }))}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className={`p-2 rounded border ${isBinanceReady ? "border-green-500/30 bg-green-500/10" : "border-slate-600 bg-slate-700/50"}`}>
                    <p className={`font-medium ${isBinanceReady ? "text-green-400" : "text-slate-400"}`}>
                      {isBinanceReady ? "✅ 币安已配置" : "⚠️ 币安未配置"}
                    </p>
                    <p className="text-slate-500 mt-0.5">{exchangeConfig?.binanceUseTestnet ? "测试网" : "实盘"}</p>
                  </div>
                  <div className={`p-2 rounded border ${isOkxReady ? "border-green-500/30 bg-green-500/10" : "border-slate-600 bg-slate-700/50"}`}>
                    <p className={`font-medium ${isOkxReady ? "text-green-400" : "text-slate-400"}`}>
                      {isOkxReady ? "✅ 欧易已配置" : "⚠️ 欧易未配置"}
                    </p>
                    <p className="text-slate-500 mt-0.5">{exchangeConfig?.okxUseDemo ? "模拟盘" : "实盘"}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 币安 API */}
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white text-base flex items-center gap-2">
                  <span className="text-yellow-400">₿</span> 币安 API 配置
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-slate-300 text-sm">API Key</Label>
                  <Input
                    className="bg-slate-700 border-slate-600 text-white mt-1 text-xs"
                    placeholder="输入币安 API Key"
                    value={form.binanceApiKey}
                    onChange={(e) => setForm(p => ({ ...p, binanceApiKey: e.target.value }))}
                  />
                </div>
                <div>
                  <Label className="text-slate-300 text-sm">Secret Key</Label>
                  <div className="relative mt-1">
                    <Input
                      className="bg-slate-700 border-slate-600 text-white text-xs pr-10"
                      placeholder="输入币安 Secret Key"
                      type={showSecrets ? "text" : "password"}
                      value={form.binanceSecretKey}
                      onChange={(e) => setForm(p => ({ ...p, binanceSecretKey: e.target.value }))}
                    />
                    <button
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                      onClick={() => setShowSecrets(!showSecrets)}
                    >
                      {showSecrets ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-slate-300 text-sm">使用测试网</Label>
                  <Switch
                    checked={form.binanceUseTestnet}
                    onCheckedChange={(v) => setForm(p => ({ ...p, binanceUseTestnet: v }))}
                  />
                </div>
                <p className="text-xs text-slate-500">
                  测试网地址：<a href="https://testnet.binancefuture.com" target="_blank" className="text-yellow-400 hover:underline">testnet.binancefuture.com</a>
                </p>
              </CardContent>
            </Card>

            {/* 欧易 API */}
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white text-base flex items-center gap-2">
                  <span className="text-blue-400">◎</span> 欧易 API 配置
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-slate-300 text-sm">API Key</Label>
                  <Input
                    className="bg-slate-700 border-slate-600 text-white mt-1 text-xs"
                    placeholder="输入欧易 API Key"
                    value={form.okxApiKey}
                    onChange={(e) => setForm(p => ({ ...p, okxApiKey: e.target.value }))}
                  />
                </div>
                <div>
                  <Label className="text-slate-300 text-sm">Secret Key</Label>
                  <Input
                    className="bg-slate-700 border-slate-600 text-white mt-1 text-xs"
                    placeholder="输入欧易 Secret Key"
                    type={showSecrets ? "text" : "password"}
                    value={form.okxSecretKey}
                    onChange={(e) => setForm(p => ({ ...p, okxSecretKey: e.target.value }))}
                  />
                </div>
                <div>
                  <Label className="text-slate-300 text-sm">Passphrase</Label>
                  <Input
                    className="bg-slate-700 border-slate-600 text-white mt-1 text-xs"
                    placeholder="输入欧易 Passphrase"
                    type={showSecrets ? "text" : "password"}
                    value={form.okxPassphrase}
                    onChange={(e) => setForm(p => ({ ...p, okxPassphrase: e.target.value }))}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-slate-300 text-sm">使用模拟盘</Label>
                  <Switch
                    checked={form.okxUseDemo}
                    onCheckedChange={(v) => setForm(p => ({ ...p, okxUseDemo: v }))}
                  />
                </div>
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
                <Button
                  className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-bold"
                  onClick={handleSaveConfig}
                  disabled={saveConfig.isPending}
                >
                  {saveConfig.isPending ? "保存中..." : "💾 保存配置"}
                </Button>
                <p className="text-xs text-slate-500 text-center">
                  获取 API Key：
                  <a href="https://www.binance.com/zh-CN/my/settings/api-management" target="_blank" className="text-yellow-400 hover:underline mx-1">币安</a>
                  /
                  <a href="https://www.okx.com/zh-hans/account/my-api" target="_blank" className="text-blue-400 hover:underline mx-1">欧易</a>
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── 实时持仓 Tab ── */}
        <TabsContent value="positions" className="space-y-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={activeExchange === "binance" ? "default" : "outline"}
                className={activeExchange === "binance" ? "bg-yellow-500 text-black" : "border-slate-600 text-slate-300"}
                onClick={() => setActiveExchange("binance")}
              >
                ₿ 币安
              </Button>
              <Button
                size="sm"
                variant={activeExchange === "okx" ? "default" : "outline"}
                className={activeExchange === "okx" ? "bg-blue-500 text-white" : "border-slate-600 text-slate-300"}
                onClick={() => setActiveExchange("okx")}
              >
                ◎ 欧易
              </Button>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="border-slate-600 text-slate-300 ml-auto"
              onClick={() => { refetchBinancePos(); refetchOkxPos(); }}
            >
              <RefreshCw className="w-3 h-3 mr-1" /> 刷新
            </Button>
          </div>

          {/* 账户概览 */}
          {activeExchange === "binance" && (
            <div className="space-y-4">
              {!isBinanceReady ? (
                <Alert className="border-yellow-500/30 bg-yellow-500/10">
                  <AlertTriangle className="h-4 w-4 text-yellow-400" />
                  <AlertDescription className="text-yellow-300">请先在「API 配置」Tab 中配置币安 API Key</AlertDescription>
                </Alert>
              ) : binanceLoading ? (
                <div className="text-center py-8 text-slate-400">加载中...</div>
              ) : binanceError ? (
                <Alert className="border-red-500/30 bg-red-500/10">
                  <AlertTriangle className="h-4 w-4 text-red-400" />
                  <AlertDescription className="text-red-300">{binanceError.message}</AlertDescription>
                </Alert>
              ) : binanceAccount && (
                <>
                  <div className="grid grid-cols-3 gap-3">
                    <Card className="bg-slate-800/50 border-slate-700">
                      <CardContent className="pt-4 pb-3">
                        <p className="text-slate-400 text-xs">总余额</p>
                        <p className="text-white text-xl font-bold">${parseFloat(binanceAccount.totalWalletBalance || "0").toFixed(2)}</p>
                      </CardContent>
                    </Card>
                    <Card className="bg-slate-800/50 border-slate-700">
                      <CardContent className="pt-4 pb-3">
                        <p className="text-slate-400 text-xs">可用余额</p>
                        <p className="text-green-400 text-xl font-bold">${parseFloat(binanceAccount.availableBalance || "0").toFixed(2)}</p>
                      </CardContent>
                    </Card>
                    <Card className="bg-slate-800/50 border-slate-700">
                      <CardContent className="pt-4 pb-3">
                        <p className="text-slate-400 text-xs">未实现盈亏</p>
                        <p className={`text-xl font-bold ${parseFloat(binanceAccount.totalUnrealizedProfit || "0") >= 0 ? "text-green-400" : "text-red-400"}`}>
                          ${parseFloat(binanceAccount.totalUnrealizedProfit || "0").toFixed(2)}
                        </p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* 持仓列表 */}
                  <Card className="bg-slate-800/50 border-slate-700">
                    <CardHeader>
                      <CardTitle className="text-white text-sm">当前持仓</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {!binancePositions || binancePositions.filter(p => parseFloat(p.positionAmt) !== 0).length === 0 ? (
                        <p className="text-slate-400 text-sm text-center py-4">暂无持仓</p>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="text-slate-400 border-b border-slate-700">
                                <th className="text-left py-2">交易对</th>
                                <th className="text-right py-2">方向</th>
                                <th className="text-right py-2">数量</th>
                                <th className="text-right py-2">开仓价</th>
                                <th className="text-right py-2">标记价</th>
                                <th className="text-right py-2">未实现盈亏</th>
                                <th className="text-right py-2">操作</th>
                              </tr>
                            </thead>
                            <tbody>
                              {binancePositions.filter(p => parseFloat(p.positionAmt) !== 0).map((pos) => (
                                <tr key={pos.symbol} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                                  <td className="py-2 text-white font-medium">{pos.symbol}</td>
                                  <td className="py-2 text-right">
                                    <Badge className={parseFloat(pos.positionAmt) > 0 ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}>
                                      {parseFloat(pos.positionAmt) > 0 ? "多" : "空"}
                                    </Badge>
                                  </td>
                                  <td className="py-2 text-right text-white">{Math.abs(parseFloat(pos.positionAmt))}</td>
                                  <td className="py-2 text-right text-slate-300">${parseFloat(pos.entryPrice).toFixed(2)}</td>
                                  <td className="py-2 text-right text-slate-300">${parseFloat(pos.markPrice).toFixed(2)}</td>
                                  <td className={`py-2 text-right font-medium ${parseFloat(pos.unRealizedProfit) >= 0 ? "text-green-400" : "text-red-400"}`}>
                                    ${parseFloat(pos.unRealizedProfit).toFixed(2)}
                                  </td>
                                  <td className="py-2 text-right">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="border-red-500/30 text-red-400 hover:bg-red-500/10 h-6 text-xs"
                                      onClick={() => binanceClosePos.mutate({ symbol: pos.symbol })}
                                      disabled={binanceClosePos.isPending}
                                    >
                                      平仓
                                    </Button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </>
              )}
            </div>
          )}

          {activeExchange === "okx" && (
            <div className="space-y-4">
              {!isOkxReady ? (
                <Alert className="border-yellow-500/30 bg-yellow-500/10">
                  <AlertTriangle className="h-4 w-4 text-yellow-400" />
                  <AlertDescription className="text-yellow-300">请先在「API 配置」Tab 中配置欧易 API Key</AlertDescription>
                </Alert>
              ) : okxLoading ? (
                <div className="text-center py-8 text-slate-400">加载中...</div>
              ) : okxError ? (
                <Alert className="border-red-500/30 bg-red-500/10">
                  <AlertTriangle className="h-4 w-4 text-red-400" />
                  <AlertDescription className="text-red-300">{okxError.message}</AlertDescription>
                </Alert>
              ) : okxAccount && (
                <>
                  <div className="grid grid-cols-3 gap-3">
                    <Card className="bg-slate-800/50 border-slate-700">
                      <CardContent className="pt-4 pb-3">
                        <p className="text-slate-400 text-xs">总余额</p>
                        <p className="text-white text-xl font-bold">${okxAccount.balance.toFixed(2)}</p>
                      </CardContent>
                    </Card>
                    <Card className="bg-slate-800/50 border-slate-700">
                      <CardContent className="pt-4 pb-3">
                        <p className="text-slate-400 text-xs">可用余额</p>
                        <p className="text-green-400 text-xl font-bold">${okxAccount.available.toFixed(2)}</p>
                      </CardContent>
                    </Card>
                    <Card className="bg-slate-800/50 border-slate-700">
                      <CardContent className="pt-4 pb-3">
                        <p className="text-slate-400 text-xs">未实现盈亏</p>
                        <p className={`text-xl font-bold ${okxAccount.unrealizedPnl >= 0 ? "text-green-400" : "text-red-400"}`}>
                          ${okxAccount.unrealizedPnl.toFixed(2)}
                        </p>
                      </CardContent>
                    </Card>
                  </div>

                  <Card className="bg-slate-800/50 border-slate-700">
                    <CardHeader>
                      <CardTitle className="text-white text-sm">当前持仓</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {!okxPositions || okxPositions.length === 0 ? (
                        <p className="text-slate-400 text-sm text-center py-4">暂无持仓</p>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="text-slate-400 border-b border-slate-700">
                                <th className="text-left py-2">合约</th>
                                <th className="text-right py-2">方向</th>
                                <th className="text-right py-2">数量</th>
                                <th className="text-right py-2">开仓均价</th>
                                <th className="text-right py-2">未实现盈亏</th>
                                <th className="text-right py-2">操作</th>
                              </tr>
                            </thead>
                            <tbody>
                              {okxPositions.map((pos: any) => (
                                <tr key={`${pos.instId}-${pos.posSide}`} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                                  <td className="py-2 text-white font-medium">{pos.instId}</td>
                                  <td className="py-2 text-right">
                                    <Badge className={pos.posSide === "long" ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}>
                                      {pos.posSide === "long" ? "多" : "空"}
                                    </Badge>
                                  </td>
                                  <td className="py-2 text-right text-white">{pos.pos}</td>
                                  <td className="py-2 text-right text-slate-300">${parseFloat(pos.avgPx || "0").toFixed(2)}</td>
                                  <td className={`py-2 text-right font-medium ${parseFloat(pos.upl || "0") >= 0 ? "text-green-400" : "text-red-400"}`}>
                                    ${parseFloat(pos.upl || "0").toFixed(2)}
                                  </td>
                                  <td className="py-2 text-right">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="border-red-500/30 text-red-400 hover:bg-red-500/10 h-6 text-xs"
                                      onClick={() => okxClosePos.mutate({ symbol: pos.instId })}
                                      disabled={okxClosePos.isPending}
                                    >
                                      平仓
                                    </Button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </>
              )}
            </div>
          )}
        </TabsContent>

        {/* ── 挂单管理 Tab ── */}
        <TabsContent value="orders" className="space-y-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={activeExchange === "binance" ? "default" : "outline"}
                className={activeExchange === "binance" ? "bg-yellow-500 text-black" : "border-slate-600 text-slate-300"}
                onClick={() => setActiveExchange("binance")}
              >₿ 币安</Button>
              <Button
                size="sm"
                variant={activeExchange === "okx" ? "default" : "outline"}
                className={activeExchange === "okx" ? "bg-blue-500 text-white" : "border-slate-600 text-slate-300"}
                onClick={() => setActiveExchange("okx")}
              >◎ 欧易</Button>
            </div>
            <Button size="sm" variant="outline" className="border-slate-600 text-slate-300 ml-auto"
              onClick={() => { refetchBinanceOrders(); refetchOkxOrders(); }}>
              <RefreshCw className="w-3 h-3 mr-1" /> 刷新
            </Button>
          </div>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white text-sm">
                {activeExchange === "binance" ? "币安" : "欧易"} 当前挂单
              </CardTitle>
            </CardHeader>
            <CardContent>
              {activeExchange === "binance" ? (
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
                            <td className="py-2 text-right">
                              <Badge className="bg-blue-500/20 text-blue-400">{order.status}</Badge>
                            </td>
                            <td className="py-2 text-right">
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-red-500/30 text-red-400 hover:bg-red-500/10 h-6 text-xs"
                                onClick={() => binanceCancelOrder.mutate({ symbol: order.symbol, orderId: order.orderId })}
                                disabled={binanceCancelOrder.isPending}
                              >
                                <X className="w-3 h-3" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              ) : (
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
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-red-500/30 text-red-400 hover:bg-red-500/10 h-6 text-xs"
                                onClick={() => okxCancelOrder.mutate({ symbol: order.instId, orderId: order.ordId })}
                                disabled={okxCancelOrder.isPending}
                              >
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
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant={activeExchange === "binance" ? "default" : "outline"}
                    className={activeExchange === "binance" ? "bg-yellow-500 text-black" : "border-slate-600 text-slate-300"}
                    onClick={() => setActiveExchange("binance")}
                  >₿ 币安</Button>
                  <Button
                    size="sm"
                    variant={activeExchange === "okx" ? "default" : "outline"}
                    className={activeExchange === "okx" ? "bg-blue-500 text-white" : "border-slate-600 text-slate-300"}
                    onClick={() => setActiveExchange("okx")}
                  >◎ 欧易</Button>
                </div>

                <div>
                  <Label className="text-slate-300 text-sm">交易对</Label>
                  <Input
                    className="bg-slate-700 border-slate-600 text-white mt-1"
                    placeholder={activeExchange === "binance" ? "BTCUSDT" : "BTC-USDT-SWAP"}
                    value={orderForm.symbol}
                    onChange={(e) => setOrderForm(p => ({ ...p, symbol: e.target.value }))}
                  />
                </div>

                <div>
                  <Label className="text-slate-300 text-sm">方向</Label>
                  <div className="flex gap-2 mt-1">
                    <Button
                      className={`flex-1 ${orderForm.side === "BUY" ? "bg-green-500 hover:bg-green-400 text-white" : "border-slate-600 text-slate-300"}`}
                      variant={orderForm.side === "BUY" ? "default" : "outline"}
                      onClick={() => setOrderForm(p => ({ ...p, side: "BUY" }))}
                    >
                      <TrendingUp className="w-4 h-4 mr-1" /> 做多
                    </Button>
                    <Button
                      className={`flex-1 ${orderForm.side === "SELL" ? "bg-red-500 hover:bg-red-400 text-white" : "border-slate-600 text-slate-300"}`}
                      variant={orderForm.side === "SELL" ? "default" : "outline"}
                      onClick={() => setOrderForm(p => ({ ...p, side: "SELL" }))}
                    >
                      <TrendingDown className="w-4 h-4 mr-1" /> 做空
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-slate-300 text-sm">数量</Label>
                    <Input
                      className="bg-slate-700 border-slate-600 text-white mt-1"
                      type="number"
                      step="0.001"
                      value={orderForm.quantity}
                      onChange={(e) => setOrderForm(p => ({ ...p, quantity: parseFloat(e.target.value) || 0 }))}
                    />
                  </div>
                  <div>
                    <Label className="text-slate-300 text-sm">杠杆倍数</Label>
                    <Input
                      className="bg-slate-700 border-slate-600 text-white mt-1"
                      type="number"
                      min="1"
                      max="125"
                      value={orderForm.leverage}
                      onChange={(e) => setOrderForm(p => ({ ...p, leverage: parseInt(e.target.value) || 1 }))}
                    />
                  </div>
                </div>

                <Alert className="border-red-500/30 bg-red-500/10">
                  <AlertTriangle className="h-4 w-4 text-red-400" />
                  <AlertDescription className="text-red-300 text-xs">
                    手动下单将立即以市价执行，请确认参数无误。
                    {(activeExchange === "binance" && !isBinanceReady) || (activeExchange === "okx" && !isOkxReady)
                      ? " ⚠️ 请先配置 API Key" : ""}
                  </AlertDescription>
                </Alert>

                <Button
                  className={`w-full font-bold ${orderForm.side === "BUY" ? "bg-green-500 hover:bg-green-400" : "bg-red-500 hover:bg-red-400"} text-white`}
                  onClick={handlePlaceOrder}
                  disabled={
                    binancePlaceOrder.isPending || okxPlaceOrder.isPending ||
                    (activeExchange === "binance" && !isBinanceReady) ||
                    (activeExchange === "okx" && !isOkxReady)
                  }
                >
                  {binancePlaceOrder.isPending || okxPlaceOrder.isPending ? "下单中..." :
                    `${orderForm.side === "BUY" ? "🟢 做多" : "🔴 做空"} ${orderForm.symbol} x${orderForm.quantity}`}
                </Button>
              </CardContent>
            </Card>

            {/* 快捷操作说明 */}
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
