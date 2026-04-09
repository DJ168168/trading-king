import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import TradingLayout from "./components/TradingLayout";
import Dashboard from "./pages/Dashboard";
import Signals from "./pages/Signals";
import Positions from "./pages/Positions";
import Trades from "./pages/Trades";
import Strategy from "./pages/Strategy";
import Backtest from "./pages/Backtest";
import Settings from "./pages/Settings";
import VSSignals from "./pages/VSSignals";
import Knowledge from "./pages/Knowledge";
import StrategyCenter from "./pages/StrategyCenter";
import MarketOverview from "./pages/MarketOverview";
import Charts from "./pages/Charts";
import AILongShort from "./pages/AILongShort";
import WhaleCost from "./pages/WhaleCost";
import FundFlow from "./pages/FundFlow";
import SignalResonance from "./pages/SignalResonance";
import LiveTrading from "./pages/LiveTrading";
import VSConnect from "./pages/VSConnect";
import VSWinRate from "./pages/VSWinRate";
import PaperTrading from "./pages/PaperTrading";
import BullBearPanel from "./pages/BullBearPanel";
import NewsPanel from "./pages/NewsPanel";
import UnifiedTrading from "./pages/UnifiedTrading";

function Router() {
  return (
    <TradingLayout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/signals" component={Signals} />
        <Route path="/positions" component={Positions} />
        <Route path="/trades" component={Trades} />
        <Route path="/strategy" component={Strategy} />
        <Route path="/backtest" component={Backtest} />
        <Route path="/settings" component={Settings} />
        <Route path="/vs-signals" component={VSSignals} />
        <Route path="/knowledge" component={Knowledge} />
        <Route path="/strategy-center" component={StrategyCenter} />
        <Route path="/market-overview" component={MarketOverview} />
        <Route path="/charts" component={Charts} />
        <Route path="/ai-long-short" component={AILongShort} />
        <Route path="/whale-cost" component={WhaleCost} />
        <Route path="/fund-flow" component={FundFlow} />
        <Route path="/signal-resonance" component={SignalResonance} />
        <Route path="/live-trading" component={LiveTrading} />
        <Route path="/vs-connect" component={VSConnect} />
        <Route path="/vs-win-rate" component={VSWinRate} />
        <Route path="/paper-trading" component={PaperTrading} />
        <Route path="/bull-bear" component={BullBearPanel} />
        <Route path="/news" component={NewsPanel} />
        <Route path="/unified-trading" component={UnifiedTrading} />
        <Route path="/404" component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </TradingLayout>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster theme="dark" position="top-right" />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
