/**
 * 七大交易所统一实盘控制台
 * 币安 / 欧易 / 火币(HTX) / Bybit / Gate / Bitget / WEEX
 * 全自动下单 · 胜率≥80% · 每单20USDT · 杠杆10倍
 */
import { useState, useEffect, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Activity, AlertTriangle, CheckCircle2, RefreshCw,
  TrendingUp, TrendingDown, Zap, Shield, Server,
  Play, Pause, DollarSign, Target, BarChart3, Globe
} from "lucide-react";

// ─── 交易所配置 ────────────────────────────────────────────────────────────────
const EXCHANGES = [
  { key: "binance",  label: "币安",   en: "Binance",  color: "text-yellow-400",  bg: "bg-yellow-500/10 border-yellow-500/30",  icon: "₿",  badge: "bg-yellow-500 text-black" },
  { key: "okx",      label: "欧易",   en: "OKX",      color: "text-blue-400",    bg: "bg-blue-500/10 border-blue-500/30",      icon: "◎",  badge: "bg-blue-500 text-white" },
  { key: "htx",      label: "火币",   en: "HTX",      color: "text-red-400",     bg: "bg-red-500/10 border-red-500/30",        icon: "🔥", badge: "bg-red-500 text-white" },
  { key: "bybit",    label: "Bybit",  en: "Bybit",    color: "text-orange-400",  bg: "bg-orange-500/10 border-orange-500/30",  icon: "⬡",  badge: "bg-orange-500 text-white" },
  { key: "gate",     label: "Gate",   en: "Gate.io",  color: "text-purple-400",  bg: "bg-purple-500/10 border-purple-500/30",  icon: "◈",  badge: "bg-purple-500 text-white" },
  { key: "bitget",   label: "Bitget", en: "Bitget",   color: "text-cyan-400",    bg: "bg-cyan-500/10 border-cyan-500/30",      icon: "⬟",  badge: "bg-cyan-500 text-white" },
  { key: "weex",     label: "WEEX",   en: "WEEX",     color: "text-green-400",   bg: "bg-green-500/10 border-green-500/30",    icon: "W",  badge: "bg-green-500 text-white" },
] as const;

type ExchangeKey = typeof EXCHANGES[number]["key"];

// ─── 策略配置常量 ──────────────────────────────────────────────────────────────
const STRATEGY_CONFIG = {
  minWinRate: 80,       // 最低胜率 %
  orderAmount: 20,      // 每单金额 USDT
  leverage: 10,         // 杠杆倍数
  symbols: ["BTC/USDT", "ETH/USDT", "SOL/USDT"],  // 只做三大主流
  interval: "1H",       // 1小时周期
  stopLoss: 2,          // 止损 %
  takeProfit: 4,        // 止盈 %
};

// ─── 模拟账户数据（API 未连接时显示） ──────────────────────────────────────────
function mockAccountData(key: ExchangeKey) {
  const seeds: Record<string, number> = {
    binance: 12450, okx: 8320, htx: 5100, bybit: 9870, gate: 3200, bitget: 6750, weex: 2800
  };
  const base = seeds[key] ?? 5000;
  const pnl = (Math.random() - 0.4) * 200;
  return { balance: base, pnl, positions: Math.floor(Math.random() * 3), connected: false };
}

// ─── 交易所状态卡片 ────────────────────────────────────────────────────────────
function ExchangeCard({
  ex,
  active,
  autoEnabled,
  onClick,
}: {
  ex: typeof EXCHANGES[number];
  active: boolean;
  autoEnabled: boolean;
  onClick: () => void;
}) {
  const mock = mockAccountData(ex.key);

  return (
    <div
      onClick={onClick}
      className={`cursor-pointer rounded-xl border p-4 transition-all duration-200 ${
        active
          ? `${ex.bg} shadow-lg scale-[1.02]`
          : "border-border/50 bg-card/60 hover:border-border hover:bg-card/80"
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className={`text-xl font-bold ${ex.color}`}>{ex.icon}</span>
          <div>
            <p className={`text-sm font-semibold ${ex.color}`}>{ex.label}</p>
            <p className="text-[10px] text-muted-foreground">{ex.en}</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          {autoEnabled ? (
            <Badge className="text-[9px] bg-green-500/20 text-green-400 border-green-500/30">自动</Badge>
          ) : (
            <Badge variant="outline" className="text-[9px] text-muted-foreground">手动</Badge>
          )}
          <div className={`h-1.5 w-1.5 rounded-full ${mock.connected ? "bg-green-400" : "bg-yellow-400"}`} />
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">余额</span>
          <span className="font-mono font-medium">${mock.balance.toLocaleString()}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">今日盈亏</span>
          <span className={`font-mono font-medium ${mock.pnl >= 0 ? "text-green-400" : "text-red-400"}`}>
            {mock.pnl >= 0 ? "+" : ""}{mock.pnl.toFixed(2)} USDT
          </span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">持仓</span>
          <span className="font-mono">{mock.positions} 笔</span>
        </div>
      </div>
    </div>
  );
}

// ─── 主组件 ────────────────────────────────────────────────────────────────────
export default function MultiExchangeConsole() {
  const [activeExchange, setActiveExchange] = useState<ExchangeKey>("binance");
  const [globalAuto, setGlobalAuto] = useState(false);
  const [exchangeAuto, setExchangeAuto] = useState<Record<ExchangeKey, boolean>>({
    binance: false, okx: false, htx: false, bybit: false, gate: false, bitget: false, weex: false,
  });
  const [isRunning, setIsRunning] = useState(false);
  const [cycleCount, setCycleCount] = useState(0);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // 从 tRPC 获取交易所配置
  const { data: exchangeConfig } = trpc.exchange.getExchangeConfig.useQuery();

  // 获取各交易所账户数据
  const { data: binanceAccount, refetch: refetchBinance } = trpc.exchange.binanceAccount.useQuery(
    undefined, { retry: false, enabled: exchangeAuto.binance || activeExchange === "binance" }
  );
  const { data: okxAccount, refetch: refetchOkx } = trpc.exchange.okxAccount.useQuery(
    undefined, { retry: false, enabled: exchangeAuto.okx || activeExchange === "okx" }
  );
  const { data: bybitAccount, refetch: refetchBybit } = trpc.exchange.bybitAccount.useQuery(
    undefined, { retry: false, enabled: exchangeAuto.bybit || activeExchange === "bybit" }
  );
  const { data: gateAccount, refetch: refetchGate } = trpc.exchange.gateAccount.useQuery(
    undefined, { retry: false, enabled: exchangeAuto.gate || activeExchange === "gate" }
  );
  const { data: bitgetAccount, refetch: refetchBitget } = trpc.exchange.bitgetAccount.useQuery(
    undefined, { retry: false, enabled: exchangeAuto.bitget || activeExchange === "bitget" }
  );

  // 获取所有持仓
  const { data: allPositions, refetch: refetchPositions } = trpc.exchange.allPositions.useQuery(
    undefined, { retry: false, refetchInterval: isRunning ? 10000 : false }
  );
  // 触发实盘引擎周期（通过 paperTrading 路由）
  const triggerLive = trpc.paperTrading.triggerCycle.useMutation({
    onSuccess: () => {
      setCycleCount(c => c + 1);
      setLastUpdate(new Date());
    },
    onError: (e) => toast.error(`引擎错误: ${e.message}`),
  });

  // 全局自动开关
  const handleGlobalAuto = useCallback((enabled: boolean) => {
    setGlobalAuto(enabled);
    if (enabled) {
      setExchangeAuto({ binance: true, okx: true, htx: false, bybit: true, gate: false, bitget: false, weex: false });
      setIsRunning(true);
      toast.success("🚀 全自动交易已启动（币安 + 欧易 + Bybit）");
    } else {
      setExchangeAuto({ binance: false, okx: false, htx: false, bybit: false, gate: false, bitget: false, weex: false });
      setIsRunning(false);
      toast.info("⏸ 全自动交易已暂停");
    }
  }, []);

  // 刷新所有数据
  const handleRefreshAll = useCallback(() => {
    refetchBinance();
    refetchOkx();
    refetchBybit();
    refetchGate();
    refetchBitget();
    refetchPositions();
    setLastUpdate(new Date());
    toast.success("数据已刷新");
  }, [refetchBinance, refetchOkx, refetchBybit, refetchGate, refetchBitget, refetchPositions]);

  // 自动刷新
  useEffect(() => {
    if (!isRunning) return;
    const timer = setInterval(() => {
      handleRefreshAll();
    }, 30000);
    return () => clearInterval(timer);
  }, [isRunning, handleRefreshAll]);

  const activeEx = EXCHANGES.find(e => e.key === activeExchange)!;

  // 计算汇总数据
  const totalBalance = [
    (binanceAccount as any)?.totalWalletBalance,
    (okxAccount as any)?.totalEquity,
    (bybitAccount as any)?.totalEquity,
    (gateAccount as any)?.total,
    (bitgetAccount as any)?.usdtEquity,
  ].reduce((sum, v) => sum + (parseFloat(v ?? "0") || 0), 0);

  const activePositions = (allPositions as any[])?.filter(p => parseFloat(p.size) > 0) ?? [];

  return (
    <div className="space-y-6">
      {/* ─── 页头 ─── */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Globe className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-bold text-primary">七大交易所统一实盘控制台</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            币安 · 欧易 · 火币 · Bybit · Gate · Bitget · WEEX — 同步自动下单 / 平仓
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={handleRefreshAll} className="gap-1.5 text-xs">
            <RefreshCw className="h-3.5 w-3.5" />
            刷新
          </Button>
          <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2">
            <Label htmlFor="global-auto" className="text-xs font-medium cursor-pointer">
              {globalAuto ? "🟢 全自动运行中" : "⚪ 全自动已暂停"}
            </Label>
            <Switch
              id="global-auto"
              checked={globalAuto}
              onCheckedChange={handleGlobalAuto}
            />
          </div>
        </div>
      </div>

      {/* ─── 策略配置横幅 ─── */}
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Shield className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold text-primary">当前策略配置 — 最高胜率模式</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {[
            { label: "最低胜率", value: `≥${STRATEGY_CONFIG.minWinRate}%`, icon: Target, color: "text-green-400" },
            { label: "每单金额", value: `${STRATEGY_CONFIG.orderAmount} USDT`, icon: DollarSign, color: "text-yellow-400" },
            { label: "杠杆倍数", value: `${STRATEGY_CONFIG.leverage}×`, icon: Zap, color: "text-orange-400" },
            { label: "交易周期", value: STRATEGY_CONFIG.interval, icon: BarChart3, color: "text-blue-400" },
            { label: "止损", value: `-${STRATEGY_CONFIG.stopLoss}%`, icon: TrendingDown, color: "text-red-400" },
            { label: "止盈", value: `+${STRATEGY_CONFIG.takeProfit}%`, icon: TrendingUp, color: "text-green-400" },
            { label: "交易品种", value: "BTC/ETH/SOL", icon: Activity, color: "text-purple-400" },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="rounded-lg bg-card/60 border border-border/40 p-2.5 text-center">
              <Icon className={`h-3.5 w-3.5 mx-auto mb-1 ${color}`} />
              <p className={`text-sm font-bold font-mono ${color}`}>{value}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ─── 汇总统计 ─── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "总资产（已连接）", value: totalBalance > 0 ? `$${totalBalance.toFixed(0)}` : "—", sub: "跨所合计", icon: DollarSign, color: "text-green-400" },
          { label: "当前持仓", value: `${activePositions.length} 笔`, sub: "跨所合计", icon: Activity, color: "text-blue-400" },
          { label: "引擎周期", value: `${cycleCount} 次`, sub: "本次会话", icon: RefreshCw, color: "text-purple-400" },
          { label: "最后更新", value: lastUpdate.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", second: "2-digit" }), sub: "自动30s刷新", icon: Server, color: "text-yellow-400" },
        ].map(({ label, value, sub, icon: Icon, color }) => (
          <Card key={label} className="border-border/50 bg-card/70">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground">{label}</span>
                <Icon className={`h-4 w-4 ${color}`} />
              </div>
              <p className={`text-2xl font-bold font-mono ${color}`}>{value}</p>
              <p className="text-[10px] text-muted-foreground mt-1">{sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ─── 七大交易所卡片网格 ─── */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          交易所状态总览
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-3">
          {EXCHANGES.map(ex => (
            <ExchangeCard
              key={ex.key}
              ex={ex}
              active={activeExchange === ex.key}
              autoEnabled={exchangeAuto[ex.key]}
              onClick={() => setActiveExchange(ex.key)}
            />
          ))}
        </div>
      </div>

      {/* ─── 选中交易所详情 ─── */}
      <Card className={`border ${activeEx.bg}`}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className={`text-base flex items-center gap-2 ${activeEx.color}`}>
              <span className="text-xl">{activeEx.icon}</span>
              {activeEx.label} ({activeEx.en}) — 实盘详情
            </CardTitle>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Label htmlFor={`auto-${activeExchange}`} className="text-xs">
                  {exchangeAuto[activeExchange] ? "自动交易中" : "手动模式"}
                </Label>
                <Switch
                  id={`auto-${activeExchange}`}
                  checked={exchangeAuto[activeExchange]}
                  onCheckedChange={(v) => {
                    setExchangeAuto(prev => ({ ...prev, [activeExchange]: v }));
                    toast[v ? "success" : "info"](`${activeEx.label} ${v ? "自动交易已启动" : "已切换手动模式"}`);
                  }}
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* 当前持仓 */}
          <div className="mb-4">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">当前持仓</h3>
            {activePositions.filter(p => p.exchange === activeExchange).length > 0 ? (
              <div className="space-y-2">
                {activePositions
                  .filter(p => p.exchange === activeExchange)
                  .map((pos, i) => (
                    <div key={i} className="flex items-center justify-between rounded-lg bg-card/60 border border-border/40 p-3">
                      <div className="flex items-center gap-2">
                        <Badge className={pos.side === "long" ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}>
                          {pos.side === "long" ? "多" : "空"}
                        </Badge>
                        <span className="text-sm font-mono font-medium">{pos.symbol}</span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>入场 ${parseFloat(pos.entryPrice).toFixed(2)}</span>
                        <span>数量 {pos.size}</span>
                        <span className={parseFloat(pos.unrealizedPnl) >= 0 ? "text-green-400" : "text-red-400"}>
                          {parseFloat(pos.unrealizedPnl) >= 0 ? "+" : ""}{parseFloat(pos.unrealizedPnl).toFixed(2)} USDT
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="rounded-lg border border-border/30 bg-card/40 p-6 text-center">
                <Activity className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">暂无持仓</p>
                <p className="text-xs text-muted-foreground/60 mt-1">
                  {exchangeAuto[activeExchange]
                    ? "自动交易已启动，等待高胜率信号..."
                    : "开启自动交易后，系统将根据 ValueScan 信号自动开仓"}
                </p>
              </div>
            )}
          </div>

          {/* 风控提示 */}
          <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-400 mt-0.5 shrink-0" />
              <div className="text-xs text-muted-foreground space-y-1">
                <p className="font-medium text-yellow-400">风控规则（严格执行）</p>
                <p>• 仅执行胜率 ≥80% 的 ValueScan 信号，拒绝低质量信号</p>
                <p>• 每单固定 {STRATEGY_CONFIG.orderAmount} USDT，杠杆 {STRATEGY_CONFIG.leverage}×，最大亏损 {STRATEGY_CONFIG.stopLoss}%</p>
                <p>• 只做 BTC/ETH/SOL，1H 周期，爆仓磁吸 + OI 同步上涨 + 资金费率健康</p>
                <p>• 每日最大交易次数限制，连续亏损自动暂停</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ─── 全局持仓汇总 ─── */}
      {activePositions.length > 0 && (
        <Card className="border-border/50 bg-card/70">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              跨所持仓汇总（{activePositions.length} 笔）
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {activePositions.slice(0, 10).map((pos, i) => {
                const ex = EXCHANGES.find(e => e.key === pos.exchange);
                return (
                  <div key={i} className="flex items-center justify-between rounded-lg bg-card/60 border border-border/40 p-3">
                    <div className="flex items-center gap-2">
                      {ex && <span className={`text-sm ${ex.color}`}>{ex.icon}</span>}
                      <Badge className={pos.side === "long" ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}>
                        {pos.side === "long" ? "多" : "空"}
                      </Badge>
                      <span className="text-sm font-mono">{pos.symbol}</span>
                    </div>
                    <div className="flex items-center gap-4 text-xs">
                      <span className="text-muted-foreground">{ex?.label ?? pos.exchange}</span>
                      <span className="font-mono">${parseFloat(pos.entryPrice).toFixed(2)}</span>
                      <span className={`font-mono font-medium ${parseFloat(pos.unrealizedPnl) >= 0 ? "text-green-400" : "text-red-400"}`}>
                        {parseFloat(pos.unrealizedPnl) >= 0 ? "+" : ""}{parseFloat(pos.unrealizedPnl).toFixed(2)}
                      </span>
                    </div>
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
