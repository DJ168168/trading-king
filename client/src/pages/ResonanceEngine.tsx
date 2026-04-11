import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";

const dimensions = [
  { name: "FOMO 信号", weight: 20, status: "inactive", score: 0 },
  { name: "Alpha 信号", weight: 20, status: "active", score: 75 },
  { name: "资金流入", weight: 15, status: "active", score: 60 },
  { name: "主力成本偏离", weight: 15, status: "active", score: 45 },
  { name: "恐慌指数", weight: 10, status: "active", score: 30 },
  { name: "新闻情绪", weight: 10, status: "inactive", score: 0 },
  { name: "技术指标", weight: 5, status: "active", score: 55 },
  { name: "链上数据", weight: 5, status: "active", score: 40 },
];

const resonanceResults = [
  { symbol: "BTC", score: 68, dims: 5, signal: "做多", strength: "中强" },
  { symbol: "ETH", score: 62, dims: 4, signal: "做多", strength: "中" },
  { symbol: "SOL", score: 71, dims: 5, signal: "做多", strength: "强" },
  { symbol: "BNB", score: 55, dims: 3, signal: "观望", strength: "弱" },
];

export default function ResonanceEngine() {
  return (
    <div>
      <PageHeader
        title="🔄 信号共振引擎"
        description="多维度胜率评分 · 共振检测"
        actions={
          <Button variant="outline" size="sm" className="text-xs" onClick={() => toast.info("已刷新")}>
            <RefreshCw size={14} className="mr-1" /> 刷新
          </Button>
        }
      />

      {/* Dimensions */}
      <div className="terminal-card p-4 mb-6">
        <h3 className="text-sm font-medium mb-4">信号维度配置</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {dimensions.map((d) => (
            <div key={d.name} className={`p-3 rounded-lg border ${d.status === "active" ? "border-neon-green/30 bg-neon-green/5" : "border-border bg-secondary/30"}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-foreground">{d.name}</span>
                <span className={`w-2 h-2 rounded-full ${d.status === "active" ? "bg-neon-green" : "bg-muted-foreground/30"}`} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground">权重: {d.weight}%</span>
                <span className={`text-sm stat-number font-bold ${d.score >= 60 ? "text-neon-green" : d.score >= 40 ? "text-neon-yellow" : "text-muted-foreground"}`}>
                  {d.score > 0 ? d.score : "—"}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Resonance Results */}
      <div className="terminal-card p-4">
        <h3 className="text-sm font-medium mb-4">共振结果</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {resonanceResults.map((r) => (
            <div key={r.symbol} className="p-4 bg-secondary/30 rounded-lg border border-border hover:border-neon-green/30 transition-colors">
              <div className="flex items-center justify-between mb-3">
                <span className="text-lg font-bold text-foreground">{r.symbol}</span>
                <span className={`text-xs px-2 py-0.5 rounded ${
                  r.signal === "做多" ? "bg-neon-green/10 text-neon-green" : "bg-neon-yellow/10 text-neon-yellow"
                }`}>{r.signal}</span>
              </div>
              <div className="mb-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] text-muted-foreground">综合评分</span>
                  <span className={`text-sm stat-number font-bold ${r.score >= 65 ? "text-neon-green" : r.score >= 50 ? "text-neon-yellow" : "text-neon-red"}`}>{r.score}</span>
                </div>
                <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${r.score >= 65 ? "bg-neon-green" : r.score >= 50 ? "bg-neon-yellow" : "bg-neon-red"}`} style={{ width: `${r.score}%` }} />
                </div>
              </div>
              <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                <span>共振维度: {r.dims}/8</span>
                <span>强度: {r.strength}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
