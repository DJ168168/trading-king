/**
 * 量化实盘面板
 * 接入阿里云服务器 47.239.72.211:3888 API
 * 功能：实时信号、交易历史、系统状态、一键启停
 */
import { useState, useEffect, useCallback } from "react";
import {
  Activity, AlertTriangle, ArrowDownRight, ArrowUpRight,
  BarChart2, CheckCircle2, Clock, DollarSign,
  Flame, Pause, Play, RefreshCw, Server,
  Shield, TrendingDown, TrendingUp, XCircle, Zap,
  Target, StopCircle, BarChart3, Cpu,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const API_BASE = "http://47.239.72.211:3888";

// ─── 类型定义 ─────────────────────────────────────────────────────────────────
interface SignalData {
  signal: "LONG" | "SHORT" | "WAIT";
  symbol: string;
  win: number;
  score: number;
  strategy: string;
  detail: string;
  fg: number;
  take: number;
  stop: number;
}

interface StatusData {
  run: boolean;
  can_trade: boolean;
  daily_trades: number;
  daily_max: number;
  consecutive_fails: number;
}

interface TradeRecord {
  id: string;
  symbol: string;
  side: "LONG" | "SHORT";
  entry: number;
  exit?: number;
  pnl?: number;
  status: "open" | "closed" | "stopped";
  time: string;
  exchange: string;
}

// ─── 工具函数 ─────────────────────────────────────────────────────────────────
function fmtPct(v: number, digits = 1) {
  return `${v >= 0 ? "+" : ""}${v.toFixed(digits)}%`;
}

function fmtTime(ts: string) {
  try {
    const d = new Date(ts);
    return `${(d.getMonth() + 1).toString().padStart(2, "0")}/${d.getDate().toString().padStart(2, "0")} ${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
  } catch {
    return ts;
  }
}

// ─── 信号卡片 ─────────────────────────────────────────────────────────────────
function SignalCard({ data, loading }: { data: SignalData | null; loading: boolean }) {
  if (loading || !data) {
    return (
      <div className="rounded-xl border border-border/60 bg-card/80 p-6 animate-pulse">
        <div className="h-6 w-32 bg-muted rounded mb-4" />
        <div className="h-16 w-48 bg-muted rounded mb-4" />
        <div className="h-4 w-full bg-muted rounded" />
      </div>
    );
  }

  const isLong = data.signal === "LONG";
  const isShort = data.signal === "SHORT";
  const isWait = data.signal === "WAIT";

  const signalColor = isLong
    ? "text-emerald-400 border-emerald-500/40 bg-emerald-500/10"
    : isShort
    ? "text-red-400 border-red-500/40 bg-red-500/10"
    : "text-yellow-400 border-yellow-500/40 bg-yellow-500/10";

  const winColor = data.win >= 80 ? "text-emerald-400" : data.win >= 60 ? "text-yellow-400" : "text-red-400";

  return (
    <div className={cn("rounded-xl border p-6 transition-all", signalColor)}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">当前最优信号</p>
          <div className="flex items-center gap-3">
            <span className="text-5xl font-black tracking-tight">
              {isLong ? "做多" : isShort ? "做空" : "观望"}
            </span>
            {isLong && <TrendingUp className="w-10 h-10 text-emerald-400" />}
            {isShort && <TrendingDown className="w-10 h-10 text-red-400" />}
            {isWait && <Clock className="w-10 h-10 text-yellow-400" />}
          </div>
          <p className="mt-1 text-lg font-bold text-foreground">{data.symbol} / USDT</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground mb-1">综合评分</p>
          <p className="text-3xl font-black">{data.score}</p>
          <p className="text-xs text-muted-foreground">/ 100</p>
        </div>
      </div>

      {/* 胜率 + 策略 */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="rounded-lg bg-background/40 p-3">
          <p className="text-xs text-muted-foreground mb-1">预测胜率</p>
          <p className={cn("text-2xl font-black", winColor)}>{data.win.toFixed(1)}%</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {data.win >= 80 ? "✅ 达到开单门槛" : "⏳ 未达到 ≥80%"}
          </p>
        </div>
        <div className="rounded-lg bg-background/40 p-3">
          <p className="text-xs text-muted-foreground mb-1">策略</p>
          <p className="text-sm font-bold text-foreground">{data.strategy}</p>
          <p className="text-xs text-muted-foreground mt-0.5">恐贪指数 {data.fg}</p>
        </div>
      </div>

      {/* 止盈止损 */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3">
          <p className="text-xs text-emerald-400 mb-1">🎯 止盈目标</p>
          <p className="text-xl font-black text-emerald-400">+{data.take}%</p>
        </div>
        <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3">
          <p className="text-xs text-red-400 mb-1">🛑 止损线</p>
          <p className="text-xl font-black text-red-400">-{data.stop}%</p>
        </div>
      </div>

      {/* 分析详情 */}
      <div className="rounded-lg bg-background/40 px-4 py-3">
        <p className="text-xs text-muted-foreground mb-1">信号分析</p>
        <p className="text-sm text-foreground">{data.detail}</p>
      </div>
    </div>
  );
}

// ─── 状态卡片 ─────────────────────────────────────────────────────────────────
function StatusCard({ data, loading, onToggle }: { data: StatusData | null; loading: boolean; onToggle: () => void }) {
  if (loading || !data) {
    return (
      <div className="rounded-xl border border-border/60 bg-card/80 p-6 animate-pulse">
        <div className="h-6 w-32 bg-muted rounded mb-4" />
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-10 bg-muted rounded" />)}
        </div>
      </div>
    );
  }

  const statusItems = [
    {
      label: "系统状态",
      value: data.run ? "运行中" : "已暂停",
      icon: data.run ? <Activity className="w-4 h-4 text-emerald-400" /> : <Pause className="w-4 h-4 text-yellow-400" />,
      color: data.run ? "text-emerald-400" : "text-yellow-400",
    },
    {
      label: "交易许可",
      value: data.can_trade ? "允许开单" : "暂停交易",
      icon: data.can_trade ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <XCircle className="w-4 h-4 text-red-400" />,
      color: data.can_trade ? "text-emerald-400" : "text-red-400",
    },
    {
      label: "今日交易",
      value: `${data.daily_trades} / ${data.daily_max} 单`,
      icon: <BarChart3 className="w-4 h-4 text-blue-400" />,
      color: data.daily_trades >= data.daily_max ? "text-red-400" : "text-blue-400",
    },
    {
      label: "连续亏损",
      value: `${data.consecutive_fails} 次`,
      icon: data.consecutive_fails >= 3 ? <AlertTriangle className="w-4 h-4 text-red-400" /> : <Shield className="w-4 h-4 text-emerald-400" />,
      color: data.consecutive_fails >= 3 ? "text-red-400" : "text-emerald-400",
    },
  ];

  return (
    <div className="rounded-xl border border-border/60 bg-card/80 p-6">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <Cpu className="w-5 h-5 text-primary" />
          <h3 className="font-bold text-foreground">系统状态</h3>
        </div>
        <div className={cn(
          "flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold",
          data.run ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30" : "bg-yellow-500/15 text-yellow-400 border border-yellow-500/30"
        )}>
          <span className={cn("w-1.5 h-1.5 rounded-full", data.run ? "bg-emerald-400 animate-pulse" : "bg-yellow-400")} />
          {data.run ? "LIVE" : "PAUSED"}
        </div>
      </div>

      <div className="space-y-3 mb-5">
        {statusItems.map((item) => (
          <div key={item.label} className="flex items-center justify-between rounded-lg bg-background/50 px-4 py-3">
            <div className="flex items-center gap-2">
              {item.icon}
              <span className="text-sm text-muted-foreground">{item.label}</span>
            </div>
            <span className={cn("text-sm font-bold", item.color)}>{item.value}</span>
          </div>
        ))}
      </div>

      <Button
        onClick={onToggle}
        className={cn(
          "w-full font-bold",
          data.run
            ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/40 hover:bg-yellow-500/30"
            : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 hover:bg-emerald-500/30"
        )}
        variant="outline"
      >
        {data.run ? (
          <><Pause className="w-4 h-4 mr-2" />暂停交易系统</>
        ) : (
          <><Play className="w-4 h-4 mr-2" />启动交易系统</>
        )}
      </Button>
    </div>
  );
}

// ─── 交易所状态 ───────────────────────────────────────────────────────────────
function ExchangeStatus() {
  const exchanges = [
    { name: "Binance", color: "text-yellow-400", dot: "bg-yellow-400" },
    { name: "OKX", color: "text-blue-400", dot: "bg-blue-400" },
    { name: "Bybit", color: "text-orange-400", dot: "bg-orange-400" },
  ];

  return (
    <div className="rounded-xl border border-border/60 bg-card/80 p-6">
      <div className="flex items-center gap-2 mb-4">
        <Server className="w-5 h-5 text-primary" />
        <h3 className="font-bold text-foreground">交易所连接</h3>
      </div>
      <div className="space-y-3">
        {exchanges.map((ex) => (
          <div key={ex.name} className="flex items-center justify-between rounded-lg bg-background/50 px-4 py-3">
            <div className="flex items-center gap-2">
              <span className={cn("w-2 h-2 rounded-full animate-pulse", ex.dot)} />
              <span className={cn("text-sm font-bold", ex.color)}>{ex.name}</span>
            </div>
            <Badge variant="outline" className="text-emerald-400 border-emerald-500/30 text-xs">
              已连接
            </Badge>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── 风控规则 ─────────────────────────────────────────────────────────────────
function RiskRules() {
  const rules = [
    { icon: <Target className="w-4 h-4 text-emerald-400" />, label: "开单门槛", value: "胜率 ≥ 80%" },
    { icon: <BarChart2 className="w-4 h-4 text-blue-400" />, label: "每日限额", value: "最多 5 单" },
    { icon: <StopCircle className="w-4 h-4 text-red-400" />, label: "连亏保护", value: "3 连亏自停" },
    { icon: <Shield className="w-4 h-4 text-yellow-400" />, label: "止损规则", value: "单笔 -1.8%" },
    { icon: <Zap className="w-4 h-4 text-purple-400" />, label: "止盈目标", value: "单笔 +4.0%" },
    { icon: <Flame className="w-4 h-4 text-orange-400" />, label: "三所同步", value: "实盘执行" },
  ];

  return (
    <div className="rounded-xl border border-border/60 bg-card/80 p-6">
      <div className="flex items-center gap-2 mb-4">
        <Shield className="w-5 h-5 text-primary" />
        <h3 className="font-bold text-foreground">风控规则</h3>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {rules.map((r) => (
          <div key={r.label} className="flex items-center gap-2 rounded-lg bg-background/50 px-3 py-2.5">
            {r.icon}
            <div>
              <p className="text-xs text-muted-foreground">{r.label}</p>
              <p className="text-xs font-bold text-foreground">{r.value}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── 交易历史 ─────────────────────────────────────────────────────────────────
function TradeHistory({ records, loading }: { records: TradeRecord[]; loading: boolean }) {
  if (loading) {
    return (
      <div className="rounded-xl border border-border/60 bg-card/80 p-6 animate-pulse">
        <div className="h-6 w-32 bg-muted rounded mb-4" />
        {[1, 2, 3].map(i => <div key={i} className="h-12 bg-muted rounded mb-2" />)}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border/60 bg-card/80 p-6">
      <div className="flex items-center gap-2 mb-5">
        <BarChart3 className="w-5 h-5 text-primary" />
        <h3 className="font-bold text-foreground">交易历史</h3>
        <Badge variant="outline" className="ml-auto text-xs">{records.length} 条</Badge>
      </div>

      {records.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <Clock className="w-10 h-10 mb-3 opacity-40" />
          <p className="text-sm">暂无交易记录</p>
          <p className="text-xs mt-1 opacity-60">系统等待胜率 ≥80% 的信号...</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/40">
                <th className="text-left py-2 px-3 text-xs text-muted-foreground font-medium">时间</th>
                <th className="text-left py-2 px-3 text-xs text-muted-foreground font-medium">交易对</th>
                <th className="text-left py-2 px-3 text-xs text-muted-foreground font-medium">方向</th>
                <th className="text-left py-2 px-3 text-xs text-muted-foreground font-medium">交易所</th>
                <th className="text-right py-2 px-3 text-xs text-muted-foreground font-medium">盈亏</th>
                <th className="text-right py-2 px-3 text-xs text-muted-foreground font-medium">状态</th>
              </tr>
            </thead>
            <tbody>
              {records.map((r, i) => (
                <tr key={r.id || i} className="border-b border-border/20 hover:bg-background/40 transition-colors">
                  <td className="py-2.5 px-3 text-xs text-muted-foreground">{fmtTime(r.time)}</td>
                  <td className="py-2.5 px-3 font-bold text-foreground">{r.symbol}</td>
                  <td className="py-2.5 px-3">
                    <span className={cn(
                      "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold",
                      r.side === "LONG"
                        ? "bg-emerald-500/20 text-emerald-400"
                        : "bg-red-500/20 text-red-400"
                    )}>
                      {r.side === "LONG" ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                      {r.side === "LONG" ? "做多" : "做空"}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-xs text-muted-foreground">{r.exchange}</td>
                  <td className={cn(
                    "py-2.5 px-3 text-right font-bold text-sm",
                    r.pnl == null ? "text-muted-foreground" :
                    r.pnl >= 0 ? "text-emerald-400" : "text-red-400"
                  )}>
                    {r.pnl == null ? "—" : fmtPct(r.pnl)}
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <Badge variant="outline" className={cn(
                      "text-xs",
                      r.status === "open" ? "text-blue-400 border-blue-500/30" :
                      r.status === "closed" ? "text-emerald-400 border-emerald-500/30" :
                      "text-red-400 border-red-500/30"
                    )}>
                      {r.status === "open" ? "持仓中" : r.status === "closed" ? "已平仓" : "止损"}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── 主页面 ───────────────────────────────────────────────────────────────────
export default function QuantPanel() {
  const [signal, setSignal] = useState<SignalData | null>(null);
  const [status, setStatus] = useState<StatusData | null>(null);
  const [history, setHistory] = useState<TradeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    try {
      setError(null);
      const [signalRes, statusRes, historyRes] = await Promise.all([
        fetch(`${API_BASE}/api/best`).then(r => r.json()),
        fetch(`${API_BASE}/api/status`).then(r => r.json()),
        fetch(`${API_BASE}/api/history`).then(r => r.json()),
      ]);
      setSignal(signalRes);
      setStatus(statusRes);
      setHistory(Array.isArray(historyRes) ? historyRes : []);
      setLastUpdate(new Date());
    } catch (e) {
      setError("无法连接到量化服务器，请检查服务状态");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleToggle = useCallback(async () => {
    try {
      await fetch(`${API_BASE}/api/toggle`);
      await fetchAll();
    } catch {
      setError("操作失败，请重试");
    }
  }, [fetchAll]);

  useEffect(() => {
    fetchAll();
    const timer = setInterval(fetchAll, 30000); // 30秒自动刷新
    return () => clearInterval(timer);
  }, [fetchAll]);

  return (
    <div className="space-y-6">
      {/* 页头 */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground">量化实盘系统</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Binance · OKX · Bybit 三所同步实盘 · 胜率过滤 · 风控保护
          </p>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdate && (
            <span className="text-xs text-muted-foreground">
              更新: {lastUpdate.toLocaleTimeString("zh-CN")}
            </span>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={fetchAll}
            className="gap-2 border-primary/30 text-primary hover:bg-primary/10"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            刷新
          </Button>
        </div>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-5 py-4">
          <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
          <div>
            <p className="text-sm font-bold text-red-400">连接错误</p>
            <p className="text-xs text-muted-foreground mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* 主内容：信号 + 状态 */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* 信号卡（占2列） */}
        <div className="lg:col-span-2">
          <SignalCard data={signal} loading={loading} />
        </div>
        {/* 状态卡 */}
        <div>
          <StatusCard data={status} loading={loading} onToggle={handleToggle} />
        </div>
      </div>

      {/* 交易所 + 风控 */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <ExchangeStatus />
        <RiskRules />
      </div>

      {/* 交易历史 */}
      <TradeHistory records={history} loading={loading} />

      {/* 底部说明 */}
      <div className="rounded-xl border border-border/40 bg-card/40 px-5 py-4">
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            服务器: 47.239.72.211:3888
          </span>
          <span className="flex items-center gap-1.5">
            <RefreshCw className="w-3 h-3" />
            30 秒自动刷新
          </span>
          <span className="flex items-center gap-1.5">
            <Shield className="w-3 h-3" />
            systemd 开机自启，崩溃自动重启
          </span>
          <span className="flex items-center gap-1.5">
            <Zap className="w-3 h-3" />
            胜率 ≥80% 才开单，每日最多 5 单
          </span>
        </div>
      </div>
    </div>
  );
}
