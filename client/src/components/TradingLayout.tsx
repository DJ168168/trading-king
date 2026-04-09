import { useState } from "react";
import { useLocation } from "wouter";
import { Link } from "wouter";
import {
  LayoutDashboard, Zap, TrendingUp, History, Settings, FlaskConical,
  ChevronLeft, ChevronRight, Activity, Shield, Bell, Menu, X,
  BookOpen, Satellite, Target, Globe, CandlestickChart,
  BrainCircuit, DollarSign, Crosshair, Flame, Radio, Bot, BarChart2, Newspaper,
  LogIn, LogOut, User
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";

const navItems = [
  { path: "/", icon: LayoutDashboard, label: "仪表盘", desc: "总览" },
  { path: "/signals", icon: Zap, label: "信号监控", desc: "实时信号流" },
  { path: "/positions", icon: TrendingUp, label: "持仓管理", desc: "当前持仓" },
  { path: "/trades", icon: History, label: "交易历史", desc: "历史记录" },
  { path: "/strategy", icon: Shield, label: "策略配置", desc: "风险管理" },
  { path: "/backtest", icon: FlaskConical, label: "回测模拟", desc: "策略验证" },
  { path: "/settings", icon: Settings, label: "系统设置", desc: "Telegram等" },
  { path: "/vs-signals", icon: Satellite, label: "VS 实时信号", desc: "ValueScan API" },
  { path: "/strategy-center", icon: Target, label: "高胜率策略", desc: "共振检测·视频策略" },
  { path: "/knowledge", icon: BookOpen, label: "知识库", desc: "策略教程" },
  { path: "/market-overview", icon: Globe, label: "市场全景", desc: "资金费率·持仓量" },
  { path: "/charts", icon: CandlestickChart, label: "K 线图表", desc: "TradingView·信号标注" },
  { path: "/ai-long-short", icon: BrainCircuit, label: "AI 多空信号", desc: "Alpha·FOMO·看涨情绪" },
  { path: "/whale-cost", icon: Crosshair, label: "主力成本", desc: "链上成本·偏离度" },
  { path: "/fund-flow", icon: DollarSign, label: "资金流仪表盘", desc: "现货+合约+链上" },
  { path: "/signal-resonance", icon: Flame, label: "信号共振引擎", desc: "多维度胜率评分" },
  { path: "/bull-bear", icon: BarChart2, label: "多空综合面板", desc: "7大免费数据源·综合评分" },
  { path: "/news", icon: Newspaper, label: "新闻情绪面板", desc: "CoinDesk·CT·Decrypt·利多利空" },
  { path: "/paper-trading", icon: Bot, label: "量化模拟交易", desc: "自动开仓·盈亏曲线·验证策略" },
  { path: "/live-trading", icon: Radio, label: "实盘控制台", desc: "币安·欧易实盘下单" },
  { path: "/unified-trading", icon: Radio, label: "统一交易面板", desc: "模拟+实盘·多交易所" },
  { path: "/vs-win-rate", icon: Target, label: "VS 信号胜率", desc: "历史胜率统计" },
  { path: "/vs-connect", icon: Satellite, label: "VS 账号连接", desc: "连接 ValueScan" },
];

const signalTypeColors: Record<number, string> = {
  110: "text-alpha",
  112: "text-risk",
  113: "text-fomo",
  100: "text-loss",
};

export default function TradingLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const { user, loading: authLoading, logout } = useAuth();

  const { data: snapshot } = trpc.account.snapshot.useQuery(undefined, { refetchInterval: 30000 });
  const { data: config } = trpc.config.active.useQuery();
  const { data: recentSignals } = trpc.signals.list.useQuery({ limit: 5 }, { refetchInterval: 5000 });
  // ValueScan 全局连接状态
  const { data: vsTokenStatus } = trpc.valueScan.tokenStatus.useQuery(undefined, { refetchInterval: 60000 });
  const { data: vsFearGreed } = trpc.valueScan.fearGreed.useQuery(undefined, { refetchInterval: 120000 });
  const vsApiOk = vsFearGreed?.success !== false;
  const vsHasToken = vsTokenStatus?.hasToken ?? false;

  // 直接从查询数据派生，不使用中间 state（避免 useEffect + setState 在并发模式下的 DOM 冲突）
  const liveSignals = recentSignals?.slice(0, 3) ?? [];

  const totalBalance = snapshot?.totalBalance ?? 0;
  const dailyPnl = snapshot?.dailyPnl ?? 0;
  const isProfit = dailyPnl >= 0;

  const handleLogin = () => {
    window.location.href = getLoginUrl();
  };

  const handleLogout = async () => {
    await logout();
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/60 z-40 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "flex flex-col bg-sidebar border-r border-sidebar-border transition-all duration-300 z-50",
        "fixed lg:relative h-full",
        collapsed ? "w-16" : "w-60",
        mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        {/* Logo */}
        <div className={cn("flex items-center gap-3 px-4 py-5 border-b border-sidebar-border", collapsed && "justify-center px-2")}>
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center flex-shrink-0 glow-primary">
            <Activity className="w-4 h-4 text-primary-foreground" />
          </div>
          {!collapsed && (
            <div>
              <div className="text-sm font-bold text-foreground leading-tight">勇少交易之王</div>
              <div className="text-xs text-muted-foreground">量化交易系统</div>
            </div>
          )}
        </div>

        {/* Account Summary */}
        {!collapsed && (
          <div className="px-3 py-3 border-b border-sidebar-border">
            <div className="bg-accent rounded-lg p-3">
              <div className="text-xs text-muted-foreground mb-1">账户余额</div>
              <div className="text-lg font-bold font-mono text-foreground">
                ${totalBalance > 0 ? totalBalance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "--"}
              </div>
              <div className={cn("text-xs font-mono mt-0.5", isProfit ? "text-profit" : "text-loss")}>
                {isProfit ? "+" : ""}{dailyPnl > 0 || dailyPnl < 0 ? `$${dailyPnl.toFixed(2)}` : "--"} 今日
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
          {navItems.map(({ path, icon: Icon, label, desc }) => {
            const isActive = location === path;
            return (
              <Link
                key={path}
                href={path}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 group no-underline",
                  isActive
                    ? "bg-primary/15 text-primary border border-primary/20"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-foreground",
                  collapsed && "justify-center px-2"
                )}
              >
                <Icon className={cn("w-4 h-4 flex-shrink-0", isActive && "text-primary")} />
                {!collapsed && (
                  <span className="min-w-0 flex flex-col">
                    <span className="text-sm font-medium leading-tight">{label}</span>
                    <span className="text-xs text-muted-foreground leading-tight">{desc}</span>
                  </span>
                )}
                {isActive && !collapsed && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0 block" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Status / Live Signals */}
        {!collapsed && (
          <div className="px-3 py-3 border-t border-sidebar-border">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-1.5 h-1.5 rounded-full bg-profit signal-live" />
              <span className="text-xs text-muted-foreground">实时信号</span>
            </div>
            <div className="space-y-1">
              {liveSignals.length > 0 ? liveSignals.map((s) => (
                <div key={s.signalId ?? s.id ?? `${s.symbol}-${String(s.createdAt)}`} className="flex items-center justify-between text-xs">
                  <span className="font-mono font-medium text-foreground">{s.symbol}</span>
                  <span className={cn("font-mono", signalTypeColors[s.messageType] ?? "text-muted-foreground")}>
                    {s.signalType}
                  </span>
                </div>
              )) : (
                <div className="text-xs text-muted-foreground">暂无信号</div>
              )}
            </div>
          </div>
        )}

        {/* Config Status */}
        {!collapsed && config && (
          <div className="px-3 pb-2">
            <div className={cn(
              "flex items-center gap-2 px-2 py-1.5 rounded-md text-xs",
              config.autoTradingEnabled ? "bg-profit-subtle text-profit" : "bg-muted text-muted-foreground"
            )}>
              <div className={cn("w-1.5 h-1.5 rounded-full", config.autoTradingEnabled ? "bg-profit signal-live" : "bg-muted-foreground")} />
              {config.autoTradingEnabled ? "自动交易运行中" : "观察模式"}
            </div>
          </div>
        )}

        {/* Login / User Area */}
        <div className={cn("px-3 pb-3 border-t border-sidebar-border pt-3", collapsed && "px-2")}>
          {authLoading ? (
            <div className={cn("flex items-center gap-2 px-2 py-2 rounded-lg bg-muted/30", collapsed && "justify-center")}>
              <div className="w-4 h-4 rounded-full bg-muted-foreground/30 animate-pulse" />
              {!collapsed && <span className="text-xs text-muted-foreground">加载中...</span>}
            </div>
          ) : user ? (
            <div className={cn("flex items-center gap-2", collapsed && "justify-center")}>
              <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                <User className="w-3.5 h-3.5 text-primary" />
              </div>
              {!collapsed && (
                <>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-foreground truncate">{user.name || "用户"}</div>
                    <div className="text-xs text-muted-foreground truncate">{user.email || "已登录"}</div>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                    title="退出登录"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
            </div>
          ) : (
            <button
              onClick={handleLogin}
              className={cn(
                "w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/10 border border-primary/20 text-primary hover:bg-primary/20 transition-colors",
                collapsed && "justify-center px-2"
              )}
            >
              <LogIn className="w-4 h-4 flex-shrink-0" />
              {!collapsed && <span className="text-sm font-medium">点击登录</span>}
            </button>
          )}
        </div>

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden lg:flex items-center justify-center h-8 border-t border-sidebar-border text-muted-foreground hover:text-foreground transition-colors"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card/50 backdrop-blur-sm flex-shrink-0">
          <button
            className="lg:hidden p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          {/* Breadcrumb */}
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-foreground">
              {navItems.find(n => n.path === location)?.label ?? "勇少交易之王"}
            </div>
            <div className="text-xs text-muted-foreground hidden sm:block">
              {navItems.find(n => n.path === location)?.desc ?? "勇少量化交易系统"}
            </div>
          </div>

          {/* Emergency Stop */}
          {config?.emergencyStop && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-destructive/15 border border-destructive/30 rounded-lg text-xs text-destructive font-medium">
              <Shield className="w-3.5 h-3.5" />
              紧急停止
            </div>
          )}

          {/* Testnet badge */}
          {config?.useTestnet && (
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-fomo-subtle border border-fomo/20 rounded-md text-xs text-fomo">
              测试网
            </div>
          )}

          {/* ValueScan 连接状态指示器 */}
          <Link
            href="/vs-connect"
            className={cn(
              "hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs border transition-colors no-underline",
              vsApiOk && vsHasToken
                ? "bg-green-500/10 border-green-500/30 text-green-400 hover:bg-green-500/20"
                : vsApiOk
                ? "bg-yellow-500/10 border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/20"
                : "bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20"
            )}
            title={vsApiOk && vsHasToken ? "ValueScan 全功能已连接" : vsApiOk ? "ValueScan 基础连接，Token 未配置" : "ValueScan 连接异常"}
          >
            <div className={cn(
              "w-1.5 h-1.5 rounded-full flex-shrink-0",
              vsApiOk && vsHasToken ? "bg-green-400 signal-live" : vsApiOk ? "bg-yellow-400" : "bg-red-400"
            )} />
            <span>VS</span>
            <span className="font-mono">{vsApiOk && vsHasToken ? "全功能" : vsApiOk ? "基础" : "断线"}</span>
          </Link>

          {/* Live indicator */}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <div className="w-1.5 h-1.5 rounded-full bg-profit signal-live" />
            <span className="hidden sm:inline">实时</span>
          </div>

          {/* Top bar login button (mobile / when not logged in) */}
          {!authLoading && !user && (
            <button
              onClick={handleLogin}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary/10 border border-primary/20 text-primary hover:bg-primary/20 transition-colors text-xs font-medium"
            >
              <LogIn className="w-3.5 h-3.5" />
              登录
            </button>
          )}
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
