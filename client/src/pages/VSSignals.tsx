import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import PageHeader from "@/components/PageHeader";
import { RefreshCw } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const signals = [
  { symbol: "SIREN", tags: ["Alpha", "FOMO"], type: "Alpha 做多", price: "$0.7265", change: "+17.75%", time: "19:20" },
  { symbol: "BCH", tags: ["Alpha"], type: "Alpha 做多", price: "$445.60", change: "-0.43%", time: "19:10" },
  { symbol: "PAXG", tags: [], type: "资金异常流入", price: "$4760.10", change: "-2.18%", time: "19:00" },
  { symbol: "HYPE", tags: ["Alpha"], type: "Alpha 做多", price: "$40.017", change: "-1.14%", time: "19:05" },
  { symbol: "BTC", tags: [], type: "资金异常流入", price: "$71923.85", change: "-1.00%", time: "19:05" },
  { symbol: "AVAX", tags: [], type: "资金异常流入", price: "$9.31", change: "-3.42%", time: "19:15" },
  { symbol: "BNB", tags: ["Alpha"], type: "Alpha 做多", price: "$607.82", change: "-1.88%", time: "19:00" },
  { symbol: "ADA", tags: ["Alpha"], type: "Alpha 做多", price: "$0.2551", change: "-3.12%", time: "19:10" },
  { symbol: "SOL", tags: ["Alpha"], type: "Alpha 做多", price: "$83.79", change: "-2.75%", time: "17:05" },
  { symbol: "ETH", tags: ["Alpha"], type: "Alpha 做多", price: "$2212.64", change: "-2.70%", time: "19:05" },
  { symbol: "TAO", tags: ["Alpha"], type: "Alpha 做多", price: "$335.30", change: "-7.00%", time: "19:05" },
  { symbol: "MAGMA", tags: ["Alpha", "FOMO"], type: "Alpha 做多", price: "$0.1789", change: "+41.87%", time: "18:55" },
  { symbol: "ZEC", tags: ["Alpha", "FOMO"], type: "Alpha 做多", price: "$364.19", change: "+0.63%", time: "18:30" },
  { symbol: "SUI", tags: [], type: "资金异常流入", price: "$0.9391", change: "+0.08%", time: "19:00" },
  { symbol: "DOGE", tags: [], type: "资金异常流入", price: "$0.0933", change: "-0.08%", time: "19:10" },
  { symbol: "NOM", tags: [], type: "资金异常流入", price: "$0.0074", change: "-8.04%", time: "11:45" },
  { symbol: "AGT", tags: [], type: "资金异常流入", price: "$0.0149", change: "+45.60%", time: "15:15" },
  { symbol: "RIVER", tags: [], type: "资金异常流入", price: "$10.654", change: "+1.24%", time: "15:45" },
];

const filterTabs = ["全部", "FOMO", "Alpha", "风险", "巨鲸", "交易所", "AI追踪"];
const directionTabs = ["全部方向", "▲ 做多", "▼ 做空"];

export default function VSSignals() {
  const [activeFilter, setActiveFilter] = useState("全部");
  const [activeDir, setActiveDir] = useState("全部方向");
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"fund" | "ai">("fund");

  const filtered = signals.filter((s) => {
    if (search && !s.symbol.toLowerCase().includes(search.toLowerCase())) return false;
    if (activeFilter === "FOMO" && !s.tags.includes("FOMO")) return false;
    if (activeFilter === "Alpha" && !s.tags.includes("Alpha")) return false;
    return true;
  });

  return (
    <div>
      <PageHeader
        title="ValueScan 实时信号"
        description="服务端 API · 24h 运行中"
        actions={
          <Button variant="outline" size="sm" className="text-xs" onClick={() => toast.info("已刷新")}>
            <RefreshCw size={14} className="mr-1" /> 刷新
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
        {[
          { label: "总信号", value: "18", color: "text-foreground" },
          { label: "做多", value: "18", color: "text-neon-green" },
          { label: "做空", value: "0", color: "text-neon-red" },
          { label: "FOMO 🔥", value: "0", color: "text-neon-yellow" },
          { label: "Alpha ⚡", value: "10", color: "text-neon-blue" },
          { label: "巨鲸 🐋", value: "0", color: "text-muted-foreground" },
        ].map((s) => (
          <div key={s.label} className="terminal-card p-3 text-center">
            <p className={`text-xl font-bold stat-number ${s.color}`}>{s.value}</p>
            <p className="text-[10px] text-muted-foreground mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Sentiment */}
      <div className="terminal-card p-4 mb-4 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-neon-red/20 flex items-center justify-center">
            <span className="text-xl font-bold text-neon-red stat-number">0</span>
          </div>
          <div>
            <p className="text-sm font-bold text-neon-red">极度恐惧</p>
            <p className="text-[10px] text-muted-foreground">市场情绪指数 · 每日更新</p>
          </div>
        </div>
        <div className="sm:ml-auto text-right">
          <p className="text-xs text-foreground">交易建议</p>
          <p className="text-xs text-neon-yellow">极度恐惧 → 考虑抄底</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-3">
        {filterTabs.map((tab) => (
          <Button key={tab} variant={activeFilter === tab ? "default" : "outline"} size="sm" className="text-xs h-7" onClick={() => setActiveFilter(tab)}>{tab}</Button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {directionTabs.map((tab) => (
          <Button key={tab} variant={activeDir === tab ? "default" : "outline"} size="sm" className="text-xs h-7" onClick={() => setActiveDir(tab)}>{tab}</Button>
        ))}
        <Input placeholder="搜索币种 (BTC, ETH...)" value={search} onChange={(e) => setSearch(e.target.value)} className="h-7 w-48 text-xs bg-secondary" />
      </div>

      {/* Tab switch */}
      <div className="flex gap-2 mb-4">
        <Button variant={activeTab === "fund" ? "default" : "outline"} size="sm" className="text-xs" onClick={() => setActiveTab("fund")}>资金异常信号 (18)</Button>
        <Button variant={activeTab === "ai" ? "default" : "outline"} size="sm" className="text-xs" onClick={() => setActiveTab("ai")}>AI 历史信号 (43)</Button>
      </div>

      {/* Signal Cards */}
      <div className="mb-2 text-xs text-muted-foreground">实时预警信号（每30秒自动刷新）</div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map((s, i) => (
          <div key={i} className="terminal-card p-3 hover:border-neon-green/30 transition-colors">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded bg-secondary flex items-center justify-center text-xs font-bold text-foreground">
                {s.symbol.slice(0, 2)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <span className="text-sm font-bold text-foreground">{s.symbol}</span>
                  {s.tags.includes("Alpha") && <span className="text-[9px] px-1 rounded bg-neon-blue/20 text-neon-blue">⚡ Alpha</span>}
                  {s.tags.includes("FOMO") && <span className="text-[9px] px-1 rounded bg-neon-red/20 text-neon-red">🔥 FOMO</span>}
                </div>
                <p className="text-[10px] text-muted-foreground">{s.type}</p>
              </div>
              <span className="text-[10px] text-muted-foreground">{s.time}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm stat-number font-medium text-foreground">{s.price}</span>
              <span className={`text-xs stat-number ${s.change.startsWith("+") ? "text-neon-green" : "text-neon-red"}`}>{s.change}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
