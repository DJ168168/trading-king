import { ReactNode, useState } from "react";
import { Link, useLocation } from "wouter";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard, Radio, Wallet, History, Settings2, FlaskConical,
  Settings, Zap, Target, BookOpen, Globe, LineChart, Brain,
  DollarSign, Waves, Radar, Shield, BarChart3, Newspaper,
  Bot, Monitor, Layers, TrendingUp, Link2, ChevronLeft, ChevronRight, LogIn, Menu
} from "lucide-react";

interface NavItem {
  path: string;
  label: string;
  sublabel: string;
  icon: ReactNode;
}

const mainNav: NavItem[] = [
  { path: "/", label: "仪表盘", sublabel: "总览", icon: <LayoutDashboard size={18} /> },
  { path: "/signals", label: "信号监控", sublabel: "实时信号流", icon: <Radio size={18} /> },
  { path: "/positions", label: "持仓管理", sublabel: "当前持仓", icon: <Wallet size={18} /> },
  { path: "/trades", label: "交易历史", sublabel: "历史记录", icon: <History size={18} /> },
  { path: "/strategy", label: "策略配置", sublabel: "风险管理", icon: <Settings2 size={18} /> },
  { path: "/backtest", label: "回测模拟", sublabel: "策略验证", icon: <FlaskConical size={18} /> },
  { path: "/settings", label: "系统设置", sublabel: "Telegram等", icon: <Settings size={18} /> },
];

const extendedNav: NavItem[] = [
  { path: "/vs-signals", label: "VS 实时信号", sublabel: "ValueScan API", icon: <Zap size={18} /> },
  { path: "/strategy-center", label: "高胜率策略", sublabel: "共振检测·视频策略", icon: <Target size={18} /> },
  { path: "/knowledge", label: "知识库", sublabel: "策略教程", icon: <BookOpen size={18} /> },
  { path: "/market-overview", label: "市场全景", sublabel: "资金费率·持仓量", icon: <Globe size={18} /> },
  { path: "/charts", label: "K 线图表", sublabel: "TradingView·信号标注", icon: <LineChart size={18} /> },
  { path: "/ai-long-short", label: "AI 多空信号", sublabel: "Alpha·FOMO·看涨情绪", icon: <Brain size={18} /> },
  { path: "/whale-cost", label: "主力成本", sublabel: "链上成本·偏离度", icon: <DollarSign size={18} /> },
  { path: "/fund-flow", label: "资金流仪表盘", sublabel: "现货+合约+链上", icon: <Waves size={18} /> },
  { path: "/resonance-engine", label: "信号共振引擎", sublabel: "多维度胜率评分", icon: <Radar size={18} /> },
  { path: "/signal-quality", label: "信号质量仪表盘", sublabel: "动态仓位·冷却期·BTC趋势", icon: <Shield size={18} /> },
  { path: "/long-short-panel", label: "多空综合面板", sublabel: "7大免费数据源·综合评分", icon: <BarChart3 size={18} /> },
  { path: "/news-sentiment", label: "新闻情绪面板", sublabel: "CoinDesk·CT·Decrypt·利多利空", icon: <Newspaper size={18} /> },
  { path: "/quant-sim", label: "量化模拟交易", sublabel: "自动开仓·盈亏曲线·验证策略", icon: <Bot size={18} /> },
  { path: "/live-console", label: "实盘控制台", sublabel: "币安·欧易实盘下单", icon: <Monitor size={18} /> },
  { path: "/unified-trading", label: "统一交易面板", sublabel: "模拟+实盘·多交易所", icon: <Layers size={18} /> },
  { path: "/vs-win-rate", label: "VS 信号胜率", sublabel: "历史胜率统计", icon: <TrendingUp size={18} /> },
  { path: "/vs-connect", label: "VS 账号连接", sublabel: "连接 ValueScan", icon: <Link2 size={18} /> },
];

function NavLink({ item, collapsed }: { item: NavItem; collapsed: boolean }) {
  const [location] = useLocation();
  const isActive = location === item.path;

  return (
    <Link href={item.path}>
      <div
        className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-all duration-200 group cursor-pointer ${
          isActive
            ? "bg-neon-green/10 text-neon-green border-l-2 border-neon-green"
            : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
        }`}
      >
        <span className={`shrink-0 ${isActive ? "text-neon-green" : "text-muted-foreground group-hover:text-foreground"}`}>
          {item.icon}
        </span>
        {!collapsed && (
          <div className="flex flex-col min-w-0">
            <span className="truncate font-medium text-[13px]">{item.label}</span>
            <span className="truncate text-[10px] text-muted-foreground">{item.sublabel}</span>
          </div>
        )}
        {isActive && !collapsed && (
          <span className="ml-auto w-1.5 h-1.5 rounded-full bg-neon-green animate-pulse" />
        )}
      </div>
    </Link>
  );
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-neon-green/20 flex items-center justify-center">
            <Zap size={18} className="text-neon-green" />
          </div>
          {!collapsed && (
            <div>
              <h1 className="text-sm font-bold text-foreground">勇少交易之王</h1>
              <p className="text-[10px] text-muted-foreground">量化交易系统</p>
            </div>
          )}
        </div>
      </div>

      {/* Account Balance */}
      {!collapsed && (
        <div className="p-4 border-b border-border">
          <p className="text-[10px] text-muted-foreground mb-1">账户余额</p>
          <p className="text-xl font-bold stat-number text-foreground">$10,085.66</p>
          <p className="text-xs text-neon-green stat-number">+$82.78 今日</p>
        </div>
      )}

      {/* Navigation */}
      <ScrollArea className="flex-1 px-2 py-2">
        <div className="space-y-0.5">
          {mainNav.map((item) => (
            <NavLink key={item.path} item={item} collapsed={collapsed} />
          ))}
        </div>
        <div className="my-3 mx-3 border-t border-border" />
        <div className="space-y-0.5">
          {extendedNav.map((item) => (
            <NavLink key={item.path} item={item} collapsed={collapsed} />
          ))}
        </div>
      </ScrollArea>

      {/* Bottom section */}
      <div className="p-3 border-t border-border space-y-2">
        {!collapsed && (
          <>
            <div className="text-[10px] text-muted-foreground px-1">实时信号</div>
            <div className="text-[10px] text-muted-foreground px-1">暂无信号</div>
            <div className="text-[10px] text-muted-foreground px-1 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground" />
              观察模式
            </div>
          </>
        )}
        <Button
          variant="outline"
          size="sm"
          className="w-full border-neon-green/30 text-neon-green hover:bg-neon-green/10 text-xs"
        >
          <LogIn size={14} className="mr-1" />
          {!collapsed && "点击登录"}
        </Button>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="hidden lg:flex absolute -right-3 top-20 w-6 h-6 rounded-full bg-secondary border border-border items-center justify-center text-muted-foreground hover:text-foreground z-50"
      >
        {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
      </button>
    </>
  );

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Mobile menu button */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="lg:hidden fixed top-3 left-3 z-50 p-2 rounded-md bg-secondary border border-border text-foreground"
      >
        <Menu size={18} />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:relative z-40 h-full bg-sidebar border-r border-sidebar-border
          transition-all duration-300 flex flex-col
          ${collapsed ? "w-16" : "w-60"}
          ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
      >
        {sidebarContent}
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="h-12 border-b border-border flex items-center justify-between px-4 shrink-0 bg-background">
          <div className="flex items-center gap-2 ml-10 lg:ml-0">
            <span className="text-xs px-2 py-0.5 rounded bg-neon-yellow/20 text-neon-yellow border border-neon-yellow/30 font-medium">
              测试网
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/vs-signals">
              <span className="text-xs px-2 py-1 rounded bg-neon-green/10 text-neon-green border border-neon-green/30 cursor-pointer hover:bg-neon-green/20 transition-colors">
                VS 全功能
              </span>
            </Link>
            <span className="text-[10px] text-muted-foreground">实时</span>
            <Button variant="outline" size="sm" className="text-xs h-7">
              登录
            </Button>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-auto p-4 lg:p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
