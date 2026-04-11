import { Suspense, lazy } from "react";
import { Route, Switch } from "wouter";
import ErrorBoundary from "@/components/ErrorBoundary";
import TradingLayout from "@/components/TradingLayout";

const Dashboard = lazy(() => import("./pages/Dashboard"));
const Signals = lazy(() => import("./pages/Signals"));
const ResonanceEngine = lazy(() => import("./pages/ResonanceEngine"));
const VSSignals = lazy(() => import("./pages/VSSignals"));
const SignalResonance = lazy(() => import("./pages/SignalResonance"));
const BullBearPanel = lazy(() => import("./pages/BullBearPanel"));
const LongShortPanel = lazy(() => import("./pages/LongShortPanel"));
const WhaleCost = lazy(() => import("./pages/WhaleCost"));
const NewsPanel = lazy(() => import("./pages/NewsPanel"));
const NewsSentiment = lazy(() => import("./pages/NewsSentiment"));
const SignalQuality = lazy(() => import("./pages/SignalQuality"));
const SignalQualityDashboard = lazy(() => import("./pages/SignalQualityDashboard"));
const Strategy = lazy(() => import("./pages/Strategy"));
const Backtest = lazy(() => import("./pages/Backtest"));
const Trades = lazy(() => import("./pages/Trades"));
const Positions = lazy(() => import("./pages/Positions"));
const PaperTrading = lazy(() => import("./pages/PaperTrading"));
const QuantSim = lazy(() => import("./pages/QuantSim"));
const LiveTrading = lazy(() => import("./pages/LiveTrading"));
const LiveConsole = lazy(() => import("./pages/LiveConsole"));
const VSConnect = lazy(() => import("./pages/VSConnect"));
const VSWinRate = lazy(() => import("./pages/VSWinRate"));
const ComponentShowcase = lazy(() => import("./pages/ComponentShowcase"));
const Settings = lazy(() => import("./pages/Settings"));
const AIMarketAnalysis = lazy(() => import("./pages/AIMarketAnalysis"));
const StrategyCenter = lazy(() => import("./pages/StrategyCenter"));
const Knowledge = lazy(() => import("./pages/Knowledge"));
const MarketOverview = lazy(() => import("./pages/MarketOverview"));
const Charts = lazy(() => import("./pages/Charts"));
const AILongShort = lazy(() => import("./pages/AILongShort"));
const FundFlow = lazy(() => import("./pages/FundFlow"));
const UnifiedTrading = lazy(() => import("./pages/UnifiedTrading"));
const NotFound = lazy(() => import("./pages/NotFound"));

function RouteFallback() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center px-6 py-10">
      <div className="w-full max-w-3xl rounded-2xl border border-border/60 bg-card/60 p-6 backdrop-blur-sm">
        <div className="h-4 w-32 animate-pulse rounded bg-muted" />
        <div className="mt-4 h-24 animate-pulse rounded-xl bg-muted/70" />
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="h-40 animate-pulse rounded-xl bg-muted/60" />
          <div className="h-40 animate-pulse rounded-xl bg-muted/60" />
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <TradingLayout>
        <Suspense fallback={<RouteFallback />}>
          <Switch>
            <Route path="/" component={Dashboard} />
            <Route path="/signals" component={Signals} />
            <Route path="/resonance-engine" component={ResonanceEngine} />
            <Route path="/vs-signals" component={VSSignals} />
            <Route path="/signal-resonance" component={SignalResonance} />
            <Route path="/bull-bear" component={BullBearPanel} />
            <Route path="/long-short" component={LongShortPanel} />
            <Route path="/whale-cost" component={WhaleCost} />
            <Route path="/news" component={NewsPanel} />
            <Route path="/news-sentiment" component={NewsSentiment} />
            <Route path="/signal-quality" component={SignalQuality} />
            <Route path="/signal-quality-dashboard" component={SignalQualityDashboard} />
            <Route path="/strategy" component={Strategy} />
            <Route path="/backtest" component={Backtest} />
            <Route path="/trades" component={Trades} />
            <Route path="/positions" component={Positions} />
            <Route path="/paper-trading" component={PaperTrading} />
            <Route path="/quant-sim" component={QuantSim} />
            <Route path="/live-trading" component={LiveTrading} />
            <Route path="/live-console" component={LiveConsole} />
            <Route path="/vs-connect" component={VSConnect} />
            <Route path="/vs-win-rate" component={VSWinRate} />
            <Route path="/showcase" component={ComponentShowcase} />
            <Route path="/component-showcase" component={ComponentShowcase} />
            <Route path="/settings" component={Settings} />
            <Route path="/ai-market" component={AIMarketAnalysis} />
            <Route path="/strategy-center" component={StrategyCenter} />
            <Route path="/knowledge" component={Knowledge} />
            <Route path="/market-overview" component={MarketOverview} />
            <Route path="/charts" component={Charts} />
            <Route path="/ai-long-short" component={AILongShort} />
            <Route path="/fund-flow" component={FundFlow} />
            <Route path="/unified-trading" component={UnifiedTrading} />
            <Route component={NotFound} />
          </Switch>
        </Suspense>
      </TradingLayout>
    </ErrorBoundary>
  );
}
