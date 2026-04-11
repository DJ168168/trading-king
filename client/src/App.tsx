import { Link, Route, Switch, useLocation } from "wouter";
import {
  BarChart3,
  BrainCircuit,
  CandlestickChart,
  Command,
  Database,
  Gauge,
  LayoutDashboard,
  Newspaper,
  Radar,
  Settings,
  ShieldCheck,
  TrendingUp,
  Waves,
} from "lucide-react";
import ErrorBoundary from "@/components/ErrorBoundary";
import Dashboard from "@/pages/Dashboard";
import ResonanceEngine from "@/pages/ResonanceEngine";
import VSSignals from "@/pages/VSSignals";
import BullBearPanel from "@/pages/BullBearPanel";
import LongShortPanel from "@/pages/LongShortPanel";
import WhaleCost from "@/pages/WhaleCost";
import NewsPanel from "@/pages/NewsPanel";
import NewsSentiment from "@/pages/NewsSentiment";
import SignalQuality from "@/pages/SignalQuality";
import SignalQualityDashboard from "@/pages/SignalQualityDashboard";
import Strategy from "@/pages/Strategy";
import StrategyCenter from "@/pages/StrategyCenter";
import Backtest from "@/pages/Backtest";
import Trades from "@/pages/Trades";
import Positions from "@/pages/Positions";
import PaperTrading from "@/pages/PaperTrading";
import QuantSim from "@/pages/QuantSim";
import LiveTrading from "@/pages/LiveTrading";
import LiveConsole from "@/pages/LiveConsole";
import VSConnect from "@/pages/VSConnect";
import VSWinRate from "@/pages/VSWinRate";
import Charts from "@/pages/Charts";
import SettingsPage from "@/pages/Settings";
import ComponentShowcase from "@/pages/ComponentShowcase";
import SignalResonance from "@/pages/SignalResonance";
import NotFound from "@/pages/NotFound";

type NavItem = {
  href: string;
  label: string;
  icon: any;
};

const navGroups: Array<{ title: string; items: NavItem[] }> = [
  {
    title: "总览",
    items: [
      { href: "/", label: "控制台", icon: LayoutDashboard },
      { href: "/resonance-engine", label: "共振引擎", icon: Radar },
      { href: "/signals", label: "VS 信号", icon: Waves },
      { href: "/signal-resonance", label: "信号共振", icon: BrainCircuit },
    ],
  },
      {
        title: "市场面板",
        items: [
          { href: "/bull-bear", label: "多空面板", icon: TrendingUp },
          { href: "/long-short", label: "多空比", icon: Gauge },
          { href: "/whale-cost", label: "巨鲸成本", icon: Database },
          { href: "/charts", label: "图表行情", icon: CandlestickChart },
          { href: "/news", label: "资讯面板", icon: Newspaper },
          { href: "/news-sentiment", label: "情绪分析", icon: ShieldCheck },
          { href: "/signal-quality", label: "信号质量", icon: BarChart3 },
          { href: "/signal-quality-dashboard", label: "质量仪表盘", icon: Command },
        ],
      },

      {
        title: "策略与交易",
        items: [
          { href: "/strategy-center", label: "策略中心", icon: Settings },
          { href: "/strategy", label: "策略工坊", icon: BrainCircuit },
          { href: "/backtest", label: "回测分析", icon: CandlestickChart },
          { href: "/trades", label: "交易记录", icon: BarChart3 },
          { href: "/positions", label: "持仓管理", icon: Database },
          { href: "/paper-trading", label: "模拟交易", icon: ShieldCheck },
          { href: "/quant-sim", label: "量化模拟", icon: Gauge },
          { href: "/live-trading", label: "实盘交易", icon: TrendingUp },
          { href: "/live-console", label: "实盘控制台", icon: Command },
          { href: "/vs-connect", label: "VS 连接", icon: Waves },
          { href: "/vs-win-rate", label: "胜率统计", icon: BarChart3 },
          { href: "/settings", label: "系统设置", icon: Settings },
          { href: "/showcase", label: "组件展示", icon: LayoutDashboard },
        ],
      },

];

function Shell({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top,rgba(34,197,94,0.12),transparent_35%),radial-gradient(circle_at_bottom,rgba(239,68,68,0.1),transparent_30%)]" />
      <div className="relative flex min-h-screen">
        <aside className="hidden w-72 shrink-0 border-r border-border/70 bg-card/70 backdrop-blur md:block">
          <div className="border-b border-border/70 px-6 py-5">
            <p className="text-xs uppercase tracking-[0.35em] text-primary/70">Cyber Quant Terminal</p>
            <h1 className="mt-3 text-2xl font-bold tracking-tight text-primary">勇少交易之王</h1>
            <p className="mt-2 text-sm text-muted-foreground">赛博朋克量化交易系统，聚合信号、风控、策略与执行。</p>
          </div>
          <nav className="space-y-6 px-4 py-5">
            {navGroups.map((group) => (
              <section key={group.title}>
                <h2 className="px-2 text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground/80">{group.title}</h2>
                <div className="mt-3 space-y-1">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const active = location === item.href;
                    return (
                      <Link key={item.href} href={item.href} className={`group flex items-center gap-3 rounded-lg border px-3 py-2.5 text-sm transition ${active ? "border-primary/60 bg-primary/10 text-primary shadow-[0_0_18px_rgba(34,197,94,0.14)]" : "border-transparent text-muted-foreground hover:border-primary/30 hover:bg-primary/5 hover:text-foreground"}`}>
                        <Icon className={`h-4 w-4 ${active ? "text-primary" : "text-primary/70 group-hover:text-primary"}`} />
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </section>
            ))}
          </nav>
        </aside>

        <main className="flex-1">
          <header className="sticky top-0 z-20 border-b border-border/60 bg-background/85 backdrop-blur">
            <div className="flex items-center justify-between gap-4 px-4 py-4 md:px-8">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground">ZhangYong.Guru</p>
                <h2 className="mt-1 text-lg font-semibold text-foreground">实时信号 · 策略执行 · 风险控制</h2>
              </div>
              <div className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                Terminal Online
              </div>
            </div>
          </header>
          <div className="px-4 py-4 md:px-8 md:py-6">{children}</div>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <Shell>
        <Switch>
          <Route path="/" component={Dashboard} />
          <Route path="/resonance-engine" component={ResonanceEngine} />
          <Route path="/signals" component={VSSignals} />
          <Route path="/signal-resonance" component={SignalResonance} />
          <Route path="/bull-bear" component={BullBearPanel} />
          <Route path="/long-short" component={LongShortPanel} />
          <Route path="/whale-cost" component={WhaleCost} />
          <Route path="/news" component={NewsPanel} />
          <Route path="/news-sentiment" component={NewsSentiment} />
          <Route path="/signal-quality" component={SignalQuality} />
          <Route path="/signal-quality-dashboard" component={SignalQualityDashboard} />
          <Route path="/strategy-center" component={StrategyCenter} />
          <Route path="/strategy" component={Strategy} />
          <Route path="/backtest" component={Backtest} />
          <Route path="/trades" component={Trades} />
          <Route path="/positions" component={Positions} />
          <Route path="/paper-trading" component={PaperTrading} />
          <Route path="/charts" component={Charts} />
          <Route path="/quant-sim" component={QuantSim} />
          <Route path="/live-trading" component={LiveTrading} />
          <Route path="/live-console" component={LiveConsole} />
          <Route path="/vs-connect" component={VSConnect} />
          <Route path="/vs-win-rate" component={VSWinRate} />
          <Route path="/settings" component={SettingsPage} />
          <Route path="/showcase" component={ComponentShowcase} />
          <Route component={NotFound} />
        </Switch>
      </Shell>
    </ErrorBoundary>
  );
}
