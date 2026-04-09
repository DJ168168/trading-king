import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import DashboardLayout from "./components/DashboardLayout";
import Dashboard from "./pages/Dashboard";
import Signals from "./pages/Signals";
import Positions from "./pages/Positions";
import Trades from "./pages/Trades";
import Strategy from "./pages/Strategy";
import Backtest from "./pages/Backtest";
import Settings from "./pages/Settings";
import VSSignals from "./pages/VSSignals";
import StrategyCenter from "./pages/StrategyCenter";
import Knowledge from "./pages/Knowledge";
import MarketOverview from "./pages/MarketOverview";
import Charts from "./pages/Charts";
import AILongShort from "./pages/AILongShort";
import WhaleCost from "./pages/WhaleCost";
import FundFlow from "./pages/FundFlow";
import ResonanceEngine from "./pages/ResonanceEngine";
import SignalQuality from "./pages/SignalQuality";
import LongShortPanel from "./pages/LongShortPanel";
import NewsSentiment from "./pages/NewsSentiment";
import QuantSim from "./pages/QuantSim";
import LiveConsole from "./pages/LiveConsole";
import UnifiedTrading from "./pages/UnifiedTrading";
import VSWinRate from "./pages/VSWinRate";
import VSConnect from "./pages/VSConnect";
function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <DashboardLayout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/signals" component={Signals} />
        <Route path="/positions" component={Positions} />
        <Route path="/trades" component={Trades} />
        <Route path="/strategy" component={Strategy} />
        <Route path="/backtest" component={Backtest} />
        <Route path="/settings" component={Settings} />
        <Route path="/vs-signals" component={VSSignals} />
        <Route path="/strategy-center" component={StrategyCenter} />
        <Route path="/knowledge" component={Knowledge} />
        <Route path="/market-overview" component={MarketOverview} />
        <Route path="/charts" component={Charts} />
        <Route path="/ai-long-short" component={AILongShort} />
        <Route path="/whale-cost" component={WhaleCost} />
        <Route path="/fund-flow" component={FundFlow} />
        <Route path="/resonance-engine" component={ResonanceEngine} />
        <Route path="/signal-quality" component={SignalQuality} />
        <Route path="/long-short-panel" component={LongShortPanel} />
        <Route path="/news-sentiment" component={NewsSentiment} />
        <Route path="/quant-sim" component={QuantSim} />
        <Route path="/live-console" component={LiveConsole} />
        <Route path="/unified-trading" component={UnifiedTrading} />
        <Route path="/vs-win-rate" component={VSWinRate} />
        <Route path="/vs-connect" component={VSConnect} />
        <Route path="/404" component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </DashboardLayout>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
