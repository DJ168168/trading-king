import { useState, useEffect, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import {
  Settings as SettingsIcon, Bell, BarChart2, Send, RefreshCw,
  TvMinimal, Activity, Crown, Calendar, Mail, User, Eye,
  Zap, TrendingUp, CheckCircle2, AlertCircle, WifiOff, Key, Lock, Shield
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import TradingViewChart, { TradingViewTicker, TradingViewMarketOverview } from "@/components/TradingViewChart";

const TV_SYMBOLS = [
  { value: "BINANCE:BTCUSDT.P", label: "BTC/USDT 永续" },
  { value: "BINANCE:ETHUSDT.P", label: "ETH/USDT 永续" },
  { value: "BINANCE:SOLUSDT.P", label: "SOL/USDT 永续" },
  { value: "BINANCE:BNBUSDT.P", label: "BNB/USDT 永续" },
  { value: "BINANCE:XRPUSDT.P", label: "XRP/USDT 永续" },
  { value: "BINANCE:DOGEUSDT.P", label: "DOGE/USDT 永续" },
  { value: "BINANCE:ADAUSDT.P", label: "ADA/USDT 永续" },
  { value: "BINANCE:LINKUSDT.P", label: "LINK/USDT 永续" },
  { value: "BINANCE:AVAXUSDT.P", label: "AVAX/USDT 永续" },
];

const TV_INTERVALS = [
  { value: "1", label: "1分钟" }, { value: "5", label: "5分钟" },
  { value: "15", label: "15分钟" }, { value: "30", label: "30分钟" },
  { value: "60", label: "1小时" }, { value: "240", label: "4小时" },
  { value: "D", label: "日线" }, { value: "W", label: "周线" },
];

const SIGNAL_TYPES = [
  { type: 1, name: "FOMO 做多", category: "fomo", direction: "long", desc: "资金大量流入，市场情绪极度看多，短期强烈上涨信号" },
  { type: 2, name: "FOMO 做空", category: "fomo", direction: "short", desc: "资金大量流出，市场情绪极度看空，短期强烈下跌信号" },
  { type: 3, name: "Alpha 做多", category: "alpha", direction: "long", desc: "聪明钱悄悄建仓，潜力标的看多，中长期机会" },
  { type: 4, name: "Alpha 做空", category: "alpha", direction: "short", desc: "聪明钱悄悄减仓，潜力标的看空，中长期风险" },
  { type: 5, name: "风险 做多", category: "risk", direction: "long", desc: "风险资金流入，高风险高回报做多机会" },
  { type: 6, name: "风险 做空", category: "risk", direction: "short", desc: "风险资金流出，高风险高回报做空机会" },
  { type: 7, name: "巨鲸买入", category: "whale", direction: "long", desc: "大额资金买入，主力进场信号，跟随主力" },
  { type: 8, name: "巨鲸卖出", category: "whale", direction: "short", desc: "大额资金卖出，主力出场信号，注意风险" },
  { type: 9, name: "交易所流入", category: "exchange", direction: "short", desc: "大量币流入交易所，抛压增加，看空信号" },
  { type: 10, name: "交易所流出", category: "exchange", direction: "long", desc: "大量币流出交易所，筹码锁定，看多信号" },
  { type: 11, name: "资金异常流入", category: "exchange", direction: "long", desc: "异常大额资金流入，可能有重大利好" },
  { type: 12, name: "资金异常流出", category: "exchange", direction: "short", desc: "异常大额资金流出，可能有重大利空" },
  { type: 13, name: "大额转账", category: "whale", direction: "neutral", desc: "链上大额转账，关注后续动向，方向待定" },
];

const CAT_COLORS: Record<string, string> = {
  fomo: "bg-orange-500/10 border-orange-500/30 text-orange-400",
  alpha: "bg-purple-500/10 border-purple-500/30 text-purple-400",
  risk: "bg-red-500/10 border-red-500/30 text-red-400",
  whale: "bg-blue-500/10 border-blue-500/30 text-blue-400",
  exchange: "bg-cyan-500/10 border-cyan-500/30 text-cyan-400",
};

const DIR_COLORS: Record<string, string> = {
  long: "text-green-400", short: "text-red-400", neutral: "text-yellow-400",
};

type TabKey = "chart" | "valuescan" | "telegram" | "market" | "binance" | "exchanges" | "autotrading";

export default function Settings() {
  const [activeTab, setActiveTab] = useState<TabKey>("chart");
  const [tvSymbol, setTvSymbol] = useState("BINANCE:BTCUSDT.P");
  const [tvInterval, setTvInterval] = useState("60");
  const [tgForm, setTgForm] = useState({
    botToken: "", chatId: "",
    enableTradeNotify: true, enableRiskNotify: true, enableDailyReport: true, isActive: false,
  });
  const [binanceForm, setBinanceForm] = useState({ apiKey: "", secretKey: "", showSecret: false });
  const [bybitForm, setBybitForm] = useState({ apiKey: "", secretKey: "", showSecret: false, useTestnet: false });
  const [gateForm, setGateForm] = useState({ apiKey: "", secretKey: "", showSecret: false });
  const [bitgetForm, setBitgetForm] = useState({ apiKey: "", secretKey: "", passphrase: "", showSecret: false });
  const [autoTradingForm, setAutoTradingForm] = useState({ enabled: false, minScoreThreshold: 60, positionPercent: 1, selectedExchange: "binance" as string });

  const { data: vsAccount, isLoading: vsLoading } = trpc.valueScan.accountInfo.useQuery();
  const { data: fearGreed } = trpc.valueScan.fearGreed.useQuery();
  const { data: tgConfig, refetch: refetchTg } = trpc.telegram.config.useQuery();
  const { data: activeConfig } = trpc.config.active.useQuery();

  useEffect(() => {
    if (tgConfig) {
      setTgForm(f => ({
        ...f,
        chatId: tgConfig.chatId ?? "",
        enableTradeNotify: tgConfig.enableTradeNotify ?? true,
        enableRiskNotify: tgConfig.enableRiskNotify ?? true,
        enableDailyReport: tgConfig.enableDailyReport ?? true,
        isActive: tgConfig.isActive ?? false,
      }));
    }
  }, [tgConfig]);

  useEffect(() => {
    if (activeConfig) {
      const cfg = activeConfig as any;
      setBinanceForm(f => ({ ...f, apiKey: cfg.binanceApiKey ?? "", secretKey: cfg.binanceSecretKey ?? "" }));
      setBybitForm(f => ({ ...f, apiKey: cfg.bybitApiKey ?? "", secretKey: cfg.bybitSecretKey ?? "", useTestnet: cfg.bybitUseTestnet ?? false }));
      setGateForm(f => ({ ...f, apiKey: cfg.gateApiKey ?? "", secretKey: cfg.gateSecretKey ?? "" }));
      setBitgetForm(f => ({ ...f, apiKey: cfg.bitgetApiKey ?? "", secretKey: cfg.bitgetSecretKey ?? "", passphrase: cfg.bitgetPassphrase ?? "" }));
      setAutoTradingForm({ enabled: cfg.autoTradingEnabled ?? false, minScoreThreshold: cfg.minScoreThreshold ?? 60, positionPercent: (cfg as any).autoTradingPositionPercent ?? 1, selectedExchange: cfg.selectedExchange ?? "binance" });
    }
  }, [activeConfig]);

  const saveTgMutation = trpc.telegram.save.useMutation({
    onSuccess: () => { toast.success("Telegram 配置已保存"); refetchTg(); },
    onError: () => toast.error("保存失败"),
  });
  const testTgMutation = trpc.telegram.test.useMutation({
    onSuccess: (d) => d.success ? toast.success("✅ 测试消息发送成功！") : toast.error(`发送失败: ${d.error}`),
  });
  const saveConfigMutation = trpc.config.save.useMutation({
    onSuccess: () => toast.success("币安 API Key 已保存"),
    onError: () => toast.error("保存失败"),
  });
  const saveFullExchangeMutation = trpc.exchange.saveFullExchangeConfig.useMutation({
    onSuccess: () => toast.success("交易所配置已保存"),
    onError: (e) => toast.error(`保存失败: ${e.message}`),
  });

  // 测试连接 state
  const [testResults, setTestResults] = useState<Record<string, { loading: boolean; success?: boolean; message?: string }>>({});
  const utils = trpc.useUtils();

  // 页面加载时静默检测所有已配置交易所的连通性
  useEffect(() => {
    if (!activeConfig) return;
    const cfg = activeConfig as any;
    const toCheck: Array<'binance' | 'okx' | 'bybit' | 'gate' | 'bitget'> = [];
    if (cfg.binanceApiKey) toCheck.push('binance');
    if (cfg.okxApiKey) toCheck.push('okx');
    if (cfg.bybitApiKey) toCheck.push('bybit');
    if (cfg.gateApiKey) toCheck.push('gate');
    if (cfg.bitgetApiKey) toCheck.push('bitget');
    // 未配置 API Key 的交易所显示灰色占位符
    const allExchanges: Array<'binance' | 'okx' | 'bybit' | 'gate' | 'bitget'> = ['binance', 'okx', 'bybit', 'gate', 'bitget'];
    allExchanges.forEach(ex => {
      if (!toCheck.includes(ex)) {
        setTestResults(r => ({ ...r, [ex]: { loading: false, success: undefined, message: '未配置 API Key' } }));
      }
    });
    let cancelled = false;
    const allTimers: ReturnType<typeof setTimeout>[] = [];
    // 静默检测（不显示 toast）
    const silentTest = async (exchange: 'binance' | 'okx' | 'bybit' | 'gate' | 'bitget') => {
      if (cancelled) return;
      setTestResults(r => ({ ...r, [exchange]: { loading: true } }));
      try {
        let result: { success: boolean; message: string };
        if (exchange === 'binance') result = await utils.exchange.binanceTest.fetch();
        else if (exchange === 'okx') result = await utils.exchange.okxTest.fetch();
        else if (exchange === 'bybit') result = await utils.exchange.bybitTest.fetch();
        else if (exchange === 'gate') result = await utils.exchange.gateTest.fetch();
        else result = await utils.exchange.bitgetTest.fetch();
        if (!cancelled) setTestResults(r => ({ ...r, [exchange]: { loading: false, success: result.success, message: result.message } }));
      } catch (e: any) {
        if (!cancelled) setTestResults(r => ({ ...r, [exchange]: { loading: false, success: false, message: e.message } }));
      }
    };
    // 延迟 1s 后逐个检测，避免页面加载时并发请求过多
    const outerTimer = setTimeout(() => {
      toCheck.forEach((ex, i) => {
        const t = setTimeout(() => silentTest(ex), i * 800);
        allTimers.push(t);
      });
    }, 1000);
    allTimers.push(outerTimer);
    return () => {
      cancelled = true;
      allTimers.forEach(t => clearTimeout(t));
    };
  }, [activeConfig?.id]); // 仅在配置加载时检测一次

  const testExchange = async (exchange: 'binance' | 'okx' | 'bybit' | 'gate' | 'bitget') => {
    setTestResults(r => ({ ...r, [exchange]: { loading: true } }));
    try {
      let result: { success: boolean; message: string };
      if (exchange === 'binance') result = await utils.exchange.binanceTest.fetch();
      else if (exchange === 'okx') result = await utils.exchange.okxTest.fetch();
      else if (exchange === 'bybit') result = await utils.exchange.bybitTest.fetch();
      else if (exchange === 'gate') result = await utils.exchange.gateTest.fetch();
      else result = await utils.exchange.bitgetTest.fetch();
      setTestResults(r => ({ ...r, [exchange]: { loading: false, success: result.success, message: result.message } }));
      if (result.success) toast.success(`✅ ${exchange.toUpperCase()} 连接成功: ${result.message}`);
      else toast.error(`❌ ${exchange.toUpperCase()} 连接失败: ${result.message}`);
    } catch (e: any) {
      setTestResults(r => ({ ...r, [exchange]: { loading: false, success: false, message: e.message } }));
      toast.error(`❌ ${exchange.toUpperCase()} 连接异常: ${e.message}`);
    }
  };

  const vsExpiry = useMemo(() => {
    const d = (vsAccount?.data as any)?.permissionExpired;
    if (!d) return null;
    return new Date(d).toLocaleDateString("zh-CN");
  }, [vsAccount]);

  const vsRoleLabel = useMemo(() => {
    const role = (vsAccount?.data as any)?.userRole || vsAccount?.data?.role;
    if (!role) return "API Key 模式";
    if (role.toUpperCase() === "SVIP") return "SVIP 会员";
    if (role.toUpperCase() === "VIP") return "VIP 会员";
    if (role === "API_KEY") return "API Key 模式";
    return role;
  }, [vsAccount]);

  // 交易所连接状态指示点
  const getExchangeDot = (exchange: string) => {
    const r = testResults[exchange];
    if (!r) return null;
    if (r.loading) return <span title="检测中..." className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse inline-block ml-1" />;
    if (r.success === undefined) return <span title="未配置 API Key" className="w-2 h-2 rounded-full bg-gray-400 inline-block ml-1" />;
    return r.success
      ? <span title="连接正常" className="w-2 h-2 rounded-full bg-green-400 inline-block ml-1" />
      : <span title={r.message ?? '连接失败'} className="w-2 h-2 rounded-full bg-red-400 inline-block ml-1" />;
  };

  const tabs: { key: TabKey; label: string; icon: React.ReactNode; dot?: React.ReactNode }[] = [
    { key: "chart", label: "TV 图表", icon: <TvMinimal className="w-3.5 h-3.5" /> },
    { key: "valuescan", label: "ValueScan", icon: <Activity className="w-3.5 h-3.5" /> },
    { key: "telegram", label: "Telegram", icon: <Bell className="w-3.5 h-3.5" /> },
    { key: "market", label: "市场概览", icon: <BarChart2 className="w-3.5 h-3.5" /> },
    { key: "binance", label: "币安 API", icon: <Key className="w-3.5 h-3.5" />, dot: getExchangeDot('binance') },
    { key: "exchanges", label: "多交易所", icon: <Key className="w-3.5 h-3.5" />, dot: (() => {
      const dots = ['bybit','gate','bitget','okx'].map(ex => testResults[ex]);
      const anyLoading = dots.some(d => d?.loading);
      const anyFail = dots.some(d => d && !d.loading && !d.success);
      const allOk = dots.filter(Boolean).length > 0 && dots.filter(Boolean).every(d => d?.success);
      if (anyLoading) return <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse inline-block ml-1" />;
      if (anyFail) return <span className="w-2 h-2 rounded-full bg-red-400 inline-block ml-1" />;
      if (allOk) return <span className="w-2 h-2 rounded-full bg-green-400 inline-block ml-1" />;
      return null;
    })() },
    { key: "autotrading", label: "自动交易", icon: <Activity className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="p-4 lg:p-6 space-y-5">
      <div>
        <h1 className="text-xl font-bold text-foreground">系统设置</h1>
        <p className="text-sm text-muted-foreground mt-0.5">TradingView 图表 · ValueScan 账户 · Telegram 通知 · 币安 API</p>
      </div>

      {/* 行情滚动条 */}
      <div className="gradient-card rounded-xl overflow-hidden">
        <TradingViewTicker colorTheme="dark" />
      </div>

      {/* Tab 导航 */}
      <div className="flex flex-wrap gap-1 p-1 bg-accent rounded-lg w-fit">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all",
              activeTab === tab.key
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.icon}{tab.label}{tab.dot}
          </button>
        ))}
      </div>

      {/* ─── TradingView 图表 ─── */}
      {activeTab === "chart" && (
        <div className="space-y-4">
          <div className="gradient-card rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <TvMinimal className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold">TradingView 专业图表</h3>
              <span className="text-xs text-muted-foreground">集成 Supertrend · MACD · RSI</span>
            </div>
            <div className="flex flex-wrap gap-3 mb-3">
              <div className="flex-1 min-w-[150px]">
                <label className="text-xs text-muted-foreground mb-1 block">交易对</label>
                <Select value={tvSymbol} onValueChange={setTvSymbol}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TV_SYMBOLS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1 min-w-[120px]">
                <label className="text-xs text-muted-foreground mb-1 block">时间周期</label>
                <Select value={tvInterval} onValueChange={setTvInterval}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TV_INTERVALS.map(i => <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end gap-2">
                {[
                  { name: "Supertrend", color: "text-purple-400 border-purple-500/30" },
                  { name: "MACD", color: "text-blue-400 border-blue-500/30" },
                  { name: "RSI", color: "text-amber-400 border-amber-500/30" },
                ].map(ind => (
                  <div key={ind.name} className={`flex items-center gap-1 px-2 py-1 rounded border text-xs ${ind.color} bg-background/50`}>
                    <Zap className="h-3 w-3" />{ind.name}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="rounded-xl overflow-hidden border border-border/50">
            <TradingViewChart
              symbol={tvSymbol}
              interval={tvInterval}
              theme="dark"
              height={600}
              showToolbar={true}
              showSideToolbar={true}
              allowSymbolChange={true}
              studies={["STD;Supertrend", "STD;MACD", "STD;RSI"]}
            />
          </div>
        </div>
      )}

      {/* ─── ValueScan 账户 ─── */}
      {activeTab === "valuescan" && (
        <div className="space-y-4">
          {/* 连接状态 */}
          <div className="gradient-card rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Activity className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold">ValueScan 账户状态</h3>
            </div>
            {vsLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <RefreshCw className="h-4 w-4 animate-spin" />正在连接 ValueScan...
              </div>
            ) : vsAccount?.success ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                  <span className="text-sm font-medium text-green-400">已连接</span>
                  <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-full text-xs flex items-center gap-1">
                    <Crown className="h-3 w-3" />{vsRoleLabel}
                  </span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {[
                    { icon: User, label: "账户", value: (vsAccount.data as any)?.username || "API Key" },
                    { icon: Mail, label: "状态", value: vsAccount.data?.apiKeyConfigured ? "已配置" : "未配置" },
                    { icon: Crown, label: "会员等级", value: vsRoleLabel },
                    { icon: Calendar, label: "到期时间", value: vsExpiry || "—" },
                  ].map(item => (
                    <div key={item.label} className="p-3 rounded-lg bg-accent/50 border border-border/50 space-y-1">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <item.icon className="h-3 w-3" />{item.label}
                      </div>
                      <div className="text-sm font-medium text-foreground truncate">{item.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-destructive text-sm">
                <WifiOff className="h-4 w-4" />连接失败: {vsAccount?.error || "未知错误"}
              </div>
            )}
          </div>

          {/* 恐惧贪婪指数 */}
          <div className="gradient-card rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Eye className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold">市场情绪指数（ValueScan 实时）</h3>
            </div>
            {fearGreed?.success ? (
              <div className="flex items-center gap-6">
                <div className="relative w-20 h-20 flex-shrink-0">
                  <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                    <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="14" />
                    <circle cx="50" cy="50" r="40" fill="none" stroke={fearGreed.color}
                      strokeWidth="14"
                      strokeDasharray={`${2 * Math.PI * 40 * (fearGreed.value / 100)} ${2 * Math.PI * 40}`}
                      strokeLinecap="round" />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-xl font-bold" style={{ color: fearGreed.color }}>{fearGreed.value}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="text-lg font-bold" style={{ color: fearGreed.color }}>{fearGreed.label}</div>
                  <div className="text-xs text-muted-foreground">当前市场情绪</div>
                  <div className="flex gap-3 text-xs">
                    {[
                      { label: "昨日", value: fearGreed.data?.yesterday },
                      { label: "上周", value: fearGreed.data?.lastWeek },
                      { label: "上月", value: fearGreed.data?.lastMonth },
                    ].map(item => (
                      <div key={item.label} className="text-center p-2 rounded-md bg-accent/50">
                        <div className="text-muted-foreground">{item.label}</div>
                        <div className="font-semibold">{item.value ?? "—"}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">正在加载市场情绪数据...</div>
            )}
          </div>

          {/* 信号类型说明 */}
          <div className="gradient-card rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Zap className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold">信号类型说明（fundsMovementType）</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {SIGNAL_TYPES.map(item => (
                <div key={item.type} className={`flex items-start gap-2.5 p-2.5 rounded-lg border ${CAT_COLORS[item.category]}`}>
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-background/50 flex items-center justify-center text-xs font-bold">
                    {item.type}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold">{item.name}</span>
                      <span className={`text-xs ${DIR_COLORS[item.direction]}`}>
                        {item.direction === "long" ? "▲" : item.direction === "short" ? "▼" : "◆"}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ─── Telegram 通知 ─── */}
      {activeTab === "telegram" && (
        <div className="gradient-card rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold">Telegram 通知配置</h3>
            {tgConfig?.isActive && (
              <span className="px-2 py-0.5 bg-green-500/10 text-green-400 border border-green-500/20 text-xs rounded-full flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />已启用
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Bot Token</label>
                <input
                  value={tgForm.botToken}
                  onChange={e => setTgForm(f => ({ ...f, botToken: e.target.value }))}
                  placeholder={tgConfig?.botToken ?? "从 @BotFather 获取"}
                  type="password"
                  className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Chat ID</label>
                <input
                  value={tgForm.chatId}
                  onChange={e => setTgForm(f => ({ ...f, chatId: e.target.value }))}
                  placeholder="从 @userinfobot 获取"
                  className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
            </div>
            <div className="space-y-2">
              {[
                { key: "enableTradeNotify", label: "交易执行通知", desc: "开仓/平仓时推送" },
                { key: "enableRiskNotify", label: "风险警报通知", desc: "触发风控时推送" },
                { key: "enableDailyReport", label: "每日报告推送", desc: "每天 20:00 发送" },
                { key: "isActive", label: "启用 Telegram 通知", desc: "总开关" },
              ].map(({ key, label, desc }) => (
                <div key={key} className="flex items-center justify-between py-1.5 border-b border-border/30 last:border-0">
                  <div>
                    <div className="text-sm">{label}</div>
                    <div className="text-xs text-muted-foreground">{desc}</div>
                  </div>
                  <button
                    onClick={() => setTgForm(f => ({ ...f, [key]: !(f as any)[key] }))}
                    className={cn("relative w-9 h-5 rounded-full transition-colors flex-shrink-0",
                      (tgForm as any)[key] ? "bg-primary" : "bg-muted"
                    )}
                  >
                    <div className={cn("absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform",
                      (tgForm as any)[key] ? "translate-x-4" : "translate-x-0.5"
                    )} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-2 pt-2 border-t border-border">
            <Button onClick={() => saveTgMutation.mutate(tgForm)} disabled={saveTgMutation.isPending} className="text-xs">
              <SettingsIcon className="w-3.5 h-3.5 mr-1.5" />保存配置
            </Button>
            <Button variant="outline" onClick={() => testTgMutation.mutate({ message: "🤖 交易之王系统测试消息\n\n✅ Telegram 通知配置成功！\n📊 ValueScan 信号监控已启动" })} disabled={testTgMutation.isPending} className="text-xs">
              <Send className="w-3.5 h-3.5 mr-1.5" />发送测试
            </Button>
          </div>

          <div className="p-3 bg-accent rounded-lg text-xs text-muted-foreground space-y-1">
            <div className="font-medium text-foreground mb-1">获取方式：</div>
            <div>1. Telegram 搜索 @BotFather → /newbot → 获取 Token</div>
            <div>2. Telegram 搜索 @userinfobot → /start → 获取 Chat ID</div>
            <div>3. 群组 Chat ID 以 -100 开头</div>
          </div>
        </div>
      )}

      {/* ─── 市场概览 ─── */}
      {activeTab === "market" && (
        <div className="rounded-xl overflow-hidden border border-border/50">
          <TradingViewMarketOverview colorTheme="dark" height={500} />
        </div>
      )}

      {/* ─── 币安 API Key 配置 ─── */}
      {activeTab === "binance" && (
        <div className="space-y-4">
          {/* 安全警示 */}
          <div className="flex items-start gap-3 p-4 bg-yellow-500/5 border border-yellow-500/20 rounded-xl">
            <Shield className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-semibold text-yellow-400">安全提示</p>
              <p className="text-xs text-muted-foreground">
                币安 API Key 仅存储在本地数据库，不会上传到任何第三方服务器。
                建议使用仅开启「合约交易」权限的 API Key，<strong className="text-destructive">禁止勾选提币权限</strong>。
              </p>
            </div>
          </div>

          {/* API Key 输入 */}
          <div className="gradient-card rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Key className="w-4 h-4 text-primary" />
              币安合约 API 配置
            </h3>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">API Key</label>
                <input
                  type="text"
                  value={binanceForm.apiKey}
                  onChange={e => setBinanceForm(f => ({ ...f, apiKey: e.target.value }))}
                  placeholder="请输入币安 API Key"
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">Secret Key</label>
                <div className="relative">
                  <input
                    type={binanceForm.showSecret ? "text" : "password"}
                    value={binanceForm.secretKey}
                    onChange={e => setBinanceForm(f => ({ ...f, secretKey: e.target.value }))}
                    placeholder="请输入币安 Secret Key"
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 pr-10 text-sm text-foreground placeholder:text-muted-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <button
                    type="button"
                    onClick={() => setBinanceForm(f => ({ ...f, showSecret: !f.showSecret }))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Button
                onClick={() => {
                  if (!activeConfig) return;
                  saveConfigMutation.mutate({
                    ...(activeConfig as any),
                    binanceApiKey: binanceForm.apiKey,
                    binanceSecretKey: binanceForm.secretKey,
                  });
                }}
                disabled={saveConfigMutation.isPending}
                className="bg-primary hover:bg-primary/90"
              >
                {saveConfigMutation.isPending ? "保存中..." : "保存 API Key"}
              </Button>
              <Button
                variant="outline"
                onClick={() => testExchange('binance')}
                disabled={testResults['binance']?.loading}
                className={cn(
                  "border-border",
                  testResults['binance']?.success === true && "border-green-500/50 text-green-400",
                  testResults['binance']?.success === false && "border-red-500/50 text-red-400"
                )}
              >
                {testResults['binance']?.loading ? "测试中..." : "测试连接"}
              </Button>
              {binanceForm.apiKey && (
                <Button
                  variant="outline"
                  onClick={() => setBinanceForm(f => ({ ...f, apiKey: "", secretKey: "" }))}
                  className="border-border text-muted-foreground"
                >
                  清除
                </Button>
              )}
            </div>
            {testResults['binance'] && !testResults['binance'].loading && (
              <div className={cn(
                "flex items-center gap-2 text-xs px-3 py-2 rounded-lg mt-2",
                testResults['binance'].success ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"
              )}>
                {testResults['binance'].success ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                {testResults['binance'].message}
              </div>
            )}
          </div>

          {/* 配置状态 */}
          <div className="gradient-card rounded-xl p-5">
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <Lock className="w-4 h-4 text-primary" />
              当前配置状态
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-background/50 rounded-lg p-3">
                <p className="text-xs text-muted-foreground">币安 API Key</p>
                <p className="text-sm font-mono text-foreground mt-1">
                  {binanceForm.apiKey
                    ? `${binanceForm.apiKey.slice(0, 8)}...${binanceForm.apiKey.slice(-4)}`
                    : <span className="text-muted-foreground italic">未配置</span>}
                </p>
              </div>
              <div className="bg-background/50 rounded-lg p-3">
                <p className="text-xs text-muted-foreground">Secret Key</p>
                <p className="text-sm font-mono text-foreground mt-1">
                  {binanceForm.secretKey
                    ? "••••••••"
                    : <span className="text-muted-foreground italic">未配置</span>}
                </p>
              </div>
            </div>
          </div>

          {/* 使用说明 */}
          <div className="gradient-card rounded-xl p-5 space-y-3">
            <h3 className="text-sm font-semibold text-foreground">币安 API Key 获取指南</h3>
            <div className="space-y-2 text-xs text-muted-foreground">
              <div className="flex gap-2">
                <span className="text-primary font-bold">1.</span>
                <span>登录币安官网 binance.com → 账户 → API 管理</span>
              </div>
              <div className="flex gap-2">
                <span className="text-primary font-bold">2.</span>
                <span>创建新 API Key，标签建议填写「交易之王自动交易」</span>
              </div>
              <div className="flex gap-2">
                <span className="text-primary font-bold">3.</span>
                <span>权限选择：仅勾选「合约交易」，<strong className="text-destructive">不要勾选提币</strong></span>
              </div>
              <div className="flex gap-2">
                <span className="text-primary font-bold">4.</span>
                <span>建议开启 IP 白名单限制，进一步提高安全性</span>
              </div>
              <div className="flex gap-2">
                <span className="text-primary font-bold">5.</span>
                <span>开启「测试网」模式可先在测试环境验证功能，无需真实资金</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── 多交易所 API 配置 ─── */}
      {activeTab === "exchanges" && (
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 bg-yellow-500/5 border border-yellow-500/20 rounded-xl">
            <Shield className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-yellow-400">安全提示</p>
              <p className="text-xs text-muted-foreground mt-0.5">所有 API Key 仅存储在本地数据库。建议仅开启「合约交易」权限，<strong className="text-destructive">禁止勾选提币权限</strong>。</p>
            </div>
          </div>

          {/* Bybit */}
          <div className="gradient-card rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-orange-400" />
              Bybit 合约 API 配置
            </h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">API Key</label>
                <input type="text" value={bybitForm.apiKey} onChange={e => setBybitForm(f => ({ ...f, apiKey: e.target.value }))} placeholder="请输入 Bybit API Key" className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">Secret Key</label>
                <div className="relative">
                  <input type={bybitForm.showSecret ? "text" : "password"} value={bybitForm.secretKey} onChange={e => setBybitForm(f => ({ ...f, secretKey: e.target.value }))} placeholder="请输入 Bybit Secret Key" className="w-full bg-background border border-border rounded-lg px-3 py-2 pr-10 text-sm text-foreground placeholder:text-muted-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary" />
                  <button type="button" onClick={() => setBybitForm(f => ({ ...f, showSecret: !f.showSecret }))} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><Eye className="w-4 h-4" /></button>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs text-muted-foreground">测试网模式</label>
                <button onClick={() => setBybitForm(f => ({ ...f, useTestnet: !f.useTestnet }))} className={`relative w-10 h-5 rounded-full transition-colors ${bybitForm.useTestnet ? "bg-primary" : "bg-border"}`}>
                  <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${bybitForm.useTestnet ? "translate-x-5" : "translate-x-0.5"}`} />
                </button>
              </div>
            </div>
            <Button onClick={() => saveFullExchangeMutation.mutate({ ...autoTradingForm, selectedExchange: autoTradingForm.selectedExchange as any, binanceApiKey: binanceForm.apiKey, binanceSecretKey: binanceForm.secretKey, binanceUseTestnet: false, okxApiKey: (activeConfig as any)?.okxApiKey ?? "", okxSecretKey: (activeConfig as any)?.okxSecretKey ?? "", okxPassphrase: (activeConfig as any)?.okxPassphrase ?? "", okxUseDemo: false, bybitApiKey: bybitForm.apiKey, bybitSecretKey: bybitForm.secretKey, bybitUseTestnet: bybitForm.useTestnet, gateApiKey: gateForm.apiKey, gateSecretKey: gateForm.secretKey, bitgetApiKey: bitgetForm.apiKey, bitgetSecretKey: bitgetForm.secretKey, bitgetPassphrase: bitgetForm.passphrase, autoTradingEnabled: autoTradingForm.enabled, minScoreThreshold: autoTradingForm.minScoreThreshold })} disabled={saveFullExchangeMutation.isPending} className="bg-primary hover:bg-primary/90">
              {saveFullExchangeMutation.isPending ? "保存中..." : "保存 Bybit 配置"}
            </Button>
            <Button
              variant="outline"
              onClick={() => testExchange('bybit')}
              disabled={testResults['bybit']?.loading}
              className={cn(
                "border-border",
                testResults['bybit']?.success === true && "border-green-500/50 text-green-400",
                testResults['bybit']?.success === false && "border-red-500/50 text-red-400"
              )}
            >
              {testResults['bybit']?.loading ? "测试中..." : "测试连接"}
            </Button>
            {testResults['bybit'] && !testResults['bybit'].loading && (
              <div className={cn(
                "flex items-center gap-2 text-xs px-3 py-2 rounded-lg",
                testResults['bybit'].success ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"
              )}>
                {testResults['bybit'].success ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                {testResults['bybit'].message}
              </div>
            )}
          </div>

          {/* Gate.io */}
          <div className="gradient-card rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-400" />
              Gate.io 合约 API 配置
            </h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">API Key</label>
                <input type="text" value={gateForm.apiKey} onChange={e => setGateForm(f => ({ ...f, apiKey: e.target.value }))} placeholder="请输入 Gate.io API Key" className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">Secret Key</label>
                <div className="relative">
                  <input type={gateForm.showSecret ? "text" : "password"} value={gateForm.secretKey} onChange={e => setGateForm(f => ({ ...f, secretKey: e.target.value }))} placeholder="请输入 Gate.io Secret Key" className="w-full bg-background border border-border rounded-lg px-3 py-2 pr-10 text-sm text-foreground placeholder:text-muted-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary" />
                  <button type="button" onClick={() => setGateForm(f => ({ ...f, showSecret: !f.showSecret }))} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><Eye className="w-4 h-4" /></button>
                </div>
              </div>
            </div>
            <Button onClick={() => saveFullExchangeMutation.mutate({ ...autoTradingForm, selectedExchange: autoTradingForm.selectedExchange as any, binanceApiKey: binanceForm.apiKey, binanceSecretKey: binanceForm.secretKey, binanceUseTestnet: false, okxApiKey: (activeConfig as any)?.okxApiKey ?? "", okxSecretKey: (activeConfig as any)?.okxSecretKey ?? "", okxPassphrase: (activeConfig as any)?.okxPassphrase ?? "", okxUseDemo: false, bybitApiKey: bybitForm.apiKey, bybitSecretKey: bybitForm.secretKey, bybitUseTestnet: bybitForm.useTestnet, gateApiKey: gateForm.apiKey, gateSecretKey: gateForm.secretKey, bitgetApiKey: bitgetForm.apiKey, bitgetSecretKey: bitgetForm.secretKey, bitgetPassphrase: bitgetForm.passphrase, autoTradingEnabled: autoTradingForm.enabled, minScoreThreshold: autoTradingForm.minScoreThreshold })} disabled={saveFullExchangeMutation.isPending} className="bg-primary hover:bg-primary/90">
              {saveFullExchangeMutation.isPending ? "保存中..." : "保存 Gate.io 配置"}
            </Button>
            <Button
              variant="outline"
              onClick={() => testExchange('gate')}
              disabled={testResults['gate']?.loading}
              className={cn(
                "border-border",
                testResults['gate']?.success === true && "border-green-500/50 text-green-400",
                testResults['gate']?.success === false && "border-red-500/50 text-red-400"
              )}
            >
              {testResults['gate']?.loading ? "测试中..." : "测试连接"}
            </Button>
            {testResults['gate'] && !testResults['gate'].loading && (
              <div className={cn(
                "flex items-center gap-2 text-xs px-3 py-2 rounded-lg",
                testResults['gate'].success ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"
              )}>
                {testResults['gate'].success ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                {testResults['gate'].message}
              </div>
            )}
          </div>

          {/* Bitget */}
          <div className="gradient-card rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400" />
              Bitget 合约 API 配置
            </h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">API Key</label>
                <input type="text" value={bitgetForm.apiKey} onChange={e => setBitgetForm(f => ({ ...f, apiKey: e.target.value }))} placeholder="请输入 Bitget API Key" className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">Secret Key</label>
                <div className="relative">
                  <input type={bitgetForm.showSecret ? "text" : "password"} value={bitgetForm.secretKey} onChange={e => setBitgetForm(f => ({ ...f, secretKey: e.target.value }))} placeholder="请输入 Bitget Secret Key" className="w-full bg-background border border-border rounded-lg px-3 py-2 pr-10 text-sm text-foreground placeholder:text-muted-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary" />
                  <button type="button" onClick={() => setBitgetForm(f => ({ ...f, showSecret: !f.showSecret }))} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><Eye className="w-4 h-4" /></button>
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">Passphrase</label>
                <input type="password" value={bitgetForm.passphrase} onChange={e => setBitgetForm(f => ({ ...f, passphrase: e.target.value }))} placeholder="请输入 Bitget Passphrase" className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary" />
              </div>
            </div>
            <Button onClick={() => saveFullExchangeMutation.mutate({ ...autoTradingForm, selectedExchange: autoTradingForm.selectedExchange as any, binanceApiKey: binanceForm.apiKey, binanceSecretKey: binanceForm.secretKey, binanceUseTestnet: false, okxApiKey: (activeConfig as any)?.okxApiKey ?? "", okxSecretKey: (activeConfig as any)?.okxSecretKey ?? "", okxPassphrase: (activeConfig as any)?.okxPassphrase ?? "", okxUseDemo: false, bybitApiKey: bybitForm.apiKey, bybitSecretKey: bybitForm.secretKey, bybitUseTestnet: bybitForm.useTestnet, gateApiKey: gateForm.apiKey, gateSecretKey: gateForm.secretKey, bitgetApiKey: bitgetForm.apiKey, bitgetSecretKey: bitgetForm.secretKey, bitgetPassphrase: bitgetForm.passphrase, autoTradingEnabled: autoTradingForm.enabled, minScoreThreshold: autoTradingForm.minScoreThreshold })} disabled={saveFullExchangeMutation.isPending} className="bg-primary hover:bg-primary/90">
              {saveFullExchangeMutation.isPending ? "保存中..." : "保存 Bitget 配置"}
            </Button>
            <Button
              variant="outline"
              onClick={() => testExchange('bitget')}
              disabled={testResults['bitget']?.loading}
              className={cn(
                "border-border",
                testResults['bitget']?.success === true && "border-green-500/50 text-green-400",
                testResults['bitget']?.success === false && "border-red-500/50 text-red-400"
              )}
            >
              {testResults['bitget']?.loading ? "测试中..." : "测试连接"}
            </Button>
            {testResults['bitget'] && !testResults['bitget'].loading && (
              <div className={cn(
                "flex items-center gap-2 text-xs px-3 py-2 rounded-lg",
                testResults['bitget'].success ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"
              )}>
                {testResults['bitget'].success ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                {testResults['bitget'].message}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── 自动交易设置 ─── */}
      {activeTab === "autotrading" && (
        <div className="space-y-4">
          <div className="gradient-card rounded-xl p-5 space-y-5">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" />
              自动交易开关
            </h3>

            {/* 自动交易开关 */}
            <div className="flex items-center justify-between p-4 bg-background/50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-foreground">启用自动交易</p>
                <p className="text-xs text-muted-foreground mt-0.5">系统将根据信号共振评分自动执行交易</p>
              </div>
              <button
                onClick={() => setAutoTradingForm(f => ({ ...f, enabled: !f.enabled }))}
                className={`relative w-12 h-6 rounded-full transition-colors ${autoTradingForm.enabled ? "bg-green-500" : "bg-border"}`}
              >
                <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${autoTradingForm.enabled ? "translate-x-7" : "translate-x-1"}`} />
              </button>
            </div>

            {/* 最低评分阈值 */}
            <div className="p-4 bg-background/50 rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-foreground">最低信号评分阈值</p>
                <span className="text-lg font-bold text-primary">{autoTradingForm.minScoreThreshold}</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={autoTradingForm.minScoreThreshold}
                onChange={e => setAutoTradingForm(f => ({ ...f, minScoreThreshold: parseInt(e.target.value) }))}
                className="w-full accent-primary"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>0 (全部执行)</span>
                <span className="text-yellow-400">60 (建议)</span>
                <span>100 (极严格)</span>
              </div>
              <p className="text-xs text-muted-foreground">评分高于此阈值的信号才会触发自动交易。建议设置 60-75 分，过低会频繁交易，过高会错过机会。</p>
            </div>

            {/* 每笔仓位比例 */}
            <div className="p-4 bg-background/50 rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-foreground">每笔仓位比例</p>
                <span className="text-lg font-bold text-primary">{autoTradingForm.positionPercent}%</span>
              </div>
              <input
                type="range"
                min={1}
                max={10}
                step={0.5}
                value={autoTradingForm.positionPercent}
                onChange={e => setAutoTradingForm(f => ({ ...f, positionPercent: parseFloat(e.target.value) }))}
                className="w-full accent-primary"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>1% (保守)</span>
                <span className="text-yellow-400">3% (建议)</span>
                <span>10% (高风险)</span>
              </div>
              <p className="text-xs text-muted-foreground">每笔自动交易使用账户余额的此比例开仓。建议 1%-5%，账户资金越小建议设置越低。</p>
            </div>

            {/* 默认交易所 */}
            <div className="p-4 bg-background/50 rounded-lg space-y-2">
              <p className="text-sm font-medium text-foreground">默认交易所</p>
              <div className="grid grid-cols-3 gap-2">
                {["binance", "okx", "bybit", "gate", "bitget", "all"].map(ex => (
                  <button
                    key={ex}
                    onClick={() => setAutoTradingForm(f => ({ ...f, selectedExchange: ex }))}
                    className={`py-2 rounded-lg text-xs font-medium border transition-all capitalize ${
                      autoTradingForm.selectedExchange === ex
                        ? "bg-primary/20 text-primary border-primary/30"
                        : "border-border text-muted-foreground hover:border-foreground"
                    }`}
                  >
                    {ex === "all" ? "全部" : ex === "binance" ? "Binance" : ex === "okx" ? "OKX" : ex === "bybit" ? "Bybit" : ex === "gate" ? "Gate.io" : "Bitget"}
                  </button>
                ))}
              </div>
            </div>

            <Button
              onClick={() => saveFullExchangeMutation.mutate({
                ...autoTradingForm,
                selectedExchange: autoTradingForm.selectedExchange as any,
                binanceApiKey: binanceForm.apiKey,
                binanceSecretKey: binanceForm.secretKey,
                binanceUseTestnet: false,
                okxApiKey: (activeConfig as any)?.okxApiKey ?? "",
                okxSecretKey: (activeConfig as any)?.okxSecretKey ?? "",
                okxPassphrase: (activeConfig as any)?.okxPassphrase ?? "",
                okxUseDemo: false,
                bybitApiKey: bybitForm.apiKey,
                bybitSecretKey: bybitForm.secretKey,
                bybitUseTestnet: bybitForm.useTestnet,
                gateApiKey: gateForm.apiKey,
                gateSecretKey: gateForm.secretKey,
                bitgetApiKey: bitgetForm.apiKey,
                bitgetSecretKey: bitgetForm.secretKey,
                bitgetPassphrase: bitgetForm.passphrase,
                autoTradingEnabled: autoTradingForm.enabled,
                minScoreThreshold: autoTradingForm.minScoreThreshold,
                autoTradingPositionPercent: autoTradingForm.positionPercent,
              })}
              disabled={saveFullExchangeMutation.isPending}
              className="w-full bg-primary hover:bg-primary/90"
            >
              {saveFullExchangeMutation.isPending ? "保存中..." : "保存自动交易配置"}
            </Button>
          </div>

          {/* 当前状态 */}
          <div className="gradient-card rounded-xl p-5">
            <h3 className="text-sm font-semibold text-foreground mb-3">当前状态</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-background/50 rounded-lg p-3">
                <p className="text-xs text-muted-foreground">自动交易</p>
                <p className={`text-sm font-medium mt-1 ${autoTradingForm.enabled ? "text-green-400" : "text-muted-foreground"}`}>
                  {autoTradingForm.enabled ? "✅ 已启用" : "⏸ 已停止"}
                </p>
              </div>
              <div className="bg-background/50 rounded-lg p-3">
                <p className="text-xs text-muted-foreground">最低评分</p>
                <p className="text-sm font-medium mt-1 text-primary">{autoTradingForm.minScoreThreshold} 分</p>
              </div>
              <div className="bg-background/50 rounded-lg p-3">
                <p className="text-xs text-muted-foreground">默认交易所</p>
                <p className="text-sm font-medium mt-1 text-foreground capitalize">{autoTradingForm.selectedExchange}</p>
              </div>
              <div className="bg-background/50 rounded-lg p-3">
                <p className="text-xs text-muted-foreground">Telegram 推送</p>
                <p className={`text-sm font-medium mt-1 ${tgConfig?.isActive ? "text-green-400" : "text-muted-foreground"}`}>
                  {tgConfig?.isActive ? "✅ 已启用" : "⏸ 未启用"}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
