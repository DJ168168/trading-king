import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";

const dataSources = [
  { name: "资金费率", score: 65, signal: "偏多", desc: "BTC 资金费率 +0.01%，多头占优" },
  { name: "持仓量变化", score: 72, signal: "偏多", desc: "OI 24h +2.3%，资金持续流入" },
  { name: "大户持仓比", score: 58, signal: "中性", desc: "多空比 1.12，略偏多" },
  { name: "爆仓数据", score: 45, signal: "偏空", desc: "多头爆仓 > 空头爆仓" },
  { name: "恐慌贪婪指数", score: 25, signal: "偏多", desc: "极度恐惧，逆向做多信号" },
  { name: "链上数据", score: 68, signal: "偏多", desc: "交易所净流出，主力囤币" },
  { name: "技术指标", score: 55, signal: "中性", desc: "RSI 48，MACD 金叉待确认" },
];

const coins = ["BTC", "ETH", "SOL", "BNB"];

export default function LongShortPanel() {
  const totalScore = Math.round(dataSources.reduce((acc, d) => acc + d.score, 0) / dataSources.length);

  return (
    <div>
      <PageHeader
        title="📊 多空综合面板"
        description="7大免费数据源 · 综合评分"
        actions={
          <Button variant="outline" size="sm" className="text-xs" onClick={() => toast.info("已刷新")}>
            <RefreshCw size={14} className="mr-1" /> 刷新
          </Button>
        }
      />

      {/* Overall Score */}
      <div className="terminal-card p-6 mb-6 text-center">
        <p className="text-xs text-muted-foreground mb-2">综合多空评分</p>
        <p className={`text-5xl stat-number font-bold ${totalScore >= 60 ? "text-neon-green" : totalScore >= 40 ? "text-neon-yellow" : "text-neon-red"}`}>
          {totalScore}
        </p>
        <p className={`text-sm mt-2 ${totalScore >= 60 ? "text-neon-green" : totalScore >= 40 ? "text-neon-yellow" : "text-neon-red"}`}>
          {totalScore >= 60 ? "偏多 — 建议做多" : totalScore >= 40 ? "中性 — 建议观望" : "偏空 — 建议做空"}
        </p>
        <div className="w-full max-w-md mx-auto mt-4 h-3 bg-secondary rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${totalScore >= 60 ? "bg-neon-green" : totalScore >= 40 ? "bg-neon-yellow" : "bg-neon-red"}`}
            style={{ width: `${totalScore}%` }}
          />
        </div>
        <div className="flex justify-between max-w-md mx-auto mt-1">
          <span className="text-[10px] text-neon-red">极度看空 0</span>
          <span className="text-[10px] text-muted-foreground">中性 50</span>
          <span className="text-[10px] text-neon-green">极度看多 100</span>
        </div>
      </div>

      {/* Coin Tabs */}
      <div className="flex gap-2 mb-4">
        {coins.map((c) => (
          <Button key={c} variant="outline" size="sm" className="text-xs">{c}</Button>
        ))}
      </div>

      {/* Data Sources */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {dataSources.map((d) => (
          <div key={d.name} className="terminal-card p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-foreground">{d.name}</span>
              <span className={`text-xs px-2 py-0.5 rounded ${
                d.signal === "偏多" ? "bg-neon-green/10 text-neon-green" :
                d.signal === "偏空" ? "bg-neon-red/10 text-neon-red" :
                "bg-neon-yellow/10 text-neon-yellow"
              }`}>{d.signal}</span>
            </div>
            <div className="flex items-center gap-3 mb-2">
              <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${d.score >= 60 ? "bg-neon-green" : d.score >= 40 ? "bg-neon-yellow" : "bg-neon-red"}`}
                  style={{ width: `${d.score}%` }}
                />
              </div>
              <span className={`text-sm stat-number font-bold ${d.score >= 60 ? "text-neon-green" : d.score >= 40 ? "text-neon-yellow" : "text-neon-red"}`}>{d.score}</span>
            </div>
            <p className="text-[10px] text-muted-foreground">{d.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
