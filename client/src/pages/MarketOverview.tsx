import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

const fundingRates = [
  { symbol: "BTC", rate: "+0.0100%", oi: "$18.2B", change: "+2.3%", price: "$71,899" },
  { symbol: "ETH", rate: "+0.0075%", oi: "$8.5B", change: "+1.8%", price: "$2,212" },
  { symbol: "SOL", rate: "+0.0120%", oi: "$2.1B", change: "+3.1%", price: "$83.81" },
  { symbol: "BNB", rate: "+0.0050%", oi: "$1.2B", change: "+0.9%", price: "$608.41" },
  { symbol: "XRP", rate: "+0.0080%", oi: "$0.8B", change: "+1.5%", price: "$1.3537" },
  { symbol: "DOGE", rate: "+0.0200%", oi: "$0.5B", change: "+4.2%", price: "$0.0933" },
  { symbol: "ADA", rate: "+0.0060%", oi: "$0.4B", change: "+1.2%", price: "$0.2551" },
  { symbol: "AVAX", rate: "+0.0090%", oi: "$0.3B", change: "+2.0%", price: "$9.31" },
];

const tabs = ["资金费率", "持仓量", "爆仓数据", "大户持仓比"];

export default function MarketOverview() {
  const [activeTab, setActiveTab] = useState("资金费率");

  return (
    <div>
      <PageHeader
        title="🌐 市场全景"
        description="资金费率 · 持仓量 · 爆仓数据 · 大户持仓比"
        actions={
          <Button variant="outline" size="sm" className="text-xs" onClick={() => toast.info("已刷新")}>
            <RefreshCw size={14} className="mr-1" /> 刷新
          </Button>
        }
      />

      <div className="flex gap-2 mb-4 flex-wrap">
        {tabs.map((tab) => (
          <Button key={tab} variant={activeTab === tab ? "default" : "outline"} size="sm" className="text-xs" onClick={() => setActiveTab(tab)}>
            {tab}
          </Button>
        ))}
      </div>

      {activeTab === "资金费率" && (
        <div className="terminal-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-secondary/30">
                  <th className="text-left p-3 text-muted-foreground font-medium">币种</th>
                  <th className="text-right p-3 text-muted-foreground font-medium">价格</th>
                  <th className="text-right p-3 text-muted-foreground font-medium">资金费率</th>
                  <th className="text-right p-3 text-muted-foreground font-medium">持仓量</th>
                  <th className="text-right p-3 text-muted-foreground font-medium">OI 变化</th>
                </tr>
              </thead>
              <tbody>
                {fundingRates.map((r) => (
                  <tr key={r.symbol} className="border-b border-border/50 hover:bg-secondary/20 transition-colors">
                    <td className="p-3 font-medium text-foreground">{r.symbol}</td>
                    <td className="p-3 text-right stat-number text-foreground">{r.price}</td>
                    <td className={`p-3 text-right stat-number ${r.rate.startsWith("+") ? "text-neon-green" : "text-neon-red"}`}>{r.rate}</td>
                    <td className="p-3 text-right stat-number text-foreground">{r.oi}</td>
                    <td className={`p-3 text-right stat-number ${r.change.startsWith("+") ? "text-neon-green" : "text-neon-red"}`}>{r.change}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "持仓量" && (
        <div className="terminal-card p-4">
          <h3 className="text-sm font-medium mb-4">持仓量变化趋势</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {fundingRates.slice(0, 4).map((r) => (
              <div key={r.symbol} className="p-3 bg-secondary/30 rounded-lg">
                <p className="text-sm font-medium text-foreground">{r.symbol}</p>
                <p className="text-lg stat-number font-bold text-foreground mt-1">{r.oi}</p>
                <p className={`text-xs stat-number mt-1 ${r.change.startsWith("+") ? "text-neon-green" : "text-neon-red"}`}>{r.change} 24h</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "爆仓数据" && (
        <div className="terminal-card p-4">
          <h3 className="text-sm font-medium mb-4">24h 爆仓统计</h3>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
            <div className="p-3 bg-secondary/30 rounded-lg text-center">
              <p className="text-lg stat-number font-bold text-neon-red">$127.5M</p>
              <p className="text-[10px] text-muted-foreground mt-1">总爆仓</p>
            </div>
            <div className="p-3 bg-secondary/30 rounded-lg text-center">
              <p className="text-lg stat-number font-bold text-neon-green">$68.3M</p>
              <p className="text-[10px] text-muted-foreground mt-1">多头爆仓</p>
            </div>
            <div className="p-3 bg-secondary/30 rounded-lg text-center">
              <p className="text-lg stat-number font-bold text-neon-red">$59.2M</p>
              <p className="text-[10px] text-muted-foreground mt-1">空头爆仓</p>
            </div>
            <div className="p-3 bg-secondary/30 rounded-lg text-center">
              <p className="text-lg stat-number font-bold text-foreground">45,230</p>
              <p className="text-[10px] text-muted-foreground mt-1">爆仓人数</p>
            </div>
          </div>
        </div>
      )}

      {activeTab === "大户持仓比" && (
        <div className="terminal-card p-4">
          <h3 className="text-sm font-medium mb-4">大户多空持仓比</h3>
          <div className="space-y-3">
            {fundingRates.slice(0, 6).map((r) => (
              <div key={r.symbol} className="flex items-center gap-3">
                <span className="text-xs font-medium text-foreground w-12">{r.symbol}</span>
                <div className="flex-1 h-4 bg-secondary/30 rounded-full overflow-hidden flex">
                  <div className="bg-neon-green/60 h-full" style={{ width: `${55 + Math.random() * 15}%` }} />
                  <div className="bg-neon-red/60 h-full flex-1" />
                </div>
                <span className="text-[10px] text-muted-foreground w-16 text-right">多 {(55 + Math.random() * 15).toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
