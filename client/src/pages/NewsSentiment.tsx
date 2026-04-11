import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";

const newsItems = [
  { source: "CoinDesk", title: "Bitcoin Holds Above $71K as Institutional Buying Continues", sentiment: "利多", time: "2h ago", impact: "高" },
  { source: "CryptoTwitter", title: "Whale Alert: 5000 BTC moved from exchange to cold wallet", sentiment: "利多", time: "3h ago", impact: "高" },
  { source: "Decrypt", title: "Ethereum Layer 2 TVL Reaches New All-Time High", sentiment: "利多", time: "4h ago", impact: "中" },
  { source: "CoinDesk", title: "SEC Delays Decision on Spot Ethereum ETF", sentiment: "利空", time: "5h ago", impact: "中" },
  { source: "CryptoTwitter", title: "Major DeFi Protocol Reports Security Vulnerability", sentiment: "利空", time: "6h ago", impact: "高" },
  { source: "Decrypt", title: "Solana DEX Volume Surpasses Ethereum for Third Consecutive Day", sentiment: "利多", time: "7h ago", impact: "中" },
  { source: "CoinDesk", title: "Federal Reserve Officials Signal Potential Rate Cuts", sentiment: "利多", time: "8h ago", impact: "高" },
  { source: "CryptoTwitter", title: "Binance Announces New Token Listing", sentiment: "中性", time: "9h ago", impact: "低" },
];

const sentimentSummary = [
  { label: "利多", count: 5, color: "text-neon-green", bg: "bg-neon-green/10" },
  { label: "利空", count: 2, color: "text-neon-red", bg: "bg-neon-red/10" },
  { label: "中性", count: 1, color: "text-neon-yellow", bg: "bg-neon-yellow/10" },
];

const sources = ["全部", "CoinDesk", "CryptoTwitter", "Decrypt"];

export default function NewsSentiment() {
  return (
    <div>
      <PageHeader
        title="📰 新闻情绪面板"
        description="CoinDesk · CryptoTwitter · Decrypt · 利多利空分析"
        actions={
          <Button variant="outline" size="sm" className="text-xs" onClick={() => toast.info("已刷新")}>
            <RefreshCw size={14} className="mr-1" /> 刷新
          </Button>
        }
      />

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {sentimentSummary.map((s) => (
          <div key={s.label} className={`terminal-card p-4 text-center ${s.bg}`}>
            <p className={`text-3xl stat-number font-bold ${s.color}`}>{s.count}</p>
            <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Sentiment Score */}
      <div className="terminal-card p-4 mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">综合情绪评分</span>
          <span className="text-lg stat-number font-bold text-neon-green">68</span>
        </div>
        <div className="w-full h-3 bg-secondary rounded-full overflow-hidden">
          <div className="h-full bg-neon-green rounded-full" style={{ width: "68%" }} />
        </div>
        <p className="text-[10px] text-muted-foreground mt-2">偏多 — 利多新闻占主导，市场情绪积极</p>
      </div>

      {/* Source Filter */}
      <div className="flex gap-2 mb-4">
        {sources.map((s) => (
          <Button key={s} variant={s === "全部" ? "default" : "outline"} size="sm" className="text-xs">{s}</Button>
        ))}
      </div>

      {/* News List */}
      <div className="space-y-3">
        {newsItems.map((n, i) => (
          <div key={i} className="terminal-card p-4 hover:border-neon-green/30 transition-colors">
            <div className="flex items-start gap-3">
              <div className="shrink-0">
                <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                  n.sentiment === "利多" ? "bg-neon-green/10 text-neon-green" :
                  n.sentiment === "利空" ? "bg-neon-red/10 text-neon-red" :
                  "bg-neon-yellow/10 text-neon-yellow"
                }`}>{n.sentiment}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground font-medium">{n.title}</p>
                <div className="flex items-center gap-3 mt-1.5">
                  <span className="text-[10px] text-neon-blue">{n.source}</span>
                  <span className="text-[10px] text-muted-foreground">{n.time}</span>
                  <span className={`text-[10px] ${n.impact === "高" ? "text-neon-red" : n.impact === "中" ? "text-neon-yellow" : "text-muted-foreground"}`}>
                    影响: {n.impact}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
