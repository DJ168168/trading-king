import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Cell } from "recharts";

const winRateData = [
  { type: "Alpha 做多", total: 156, wins: 102, rate: 65.4 },
  { type: "FOMO 做多", total: 89, wins: 54, rate: 60.7 },
  { type: "资金流入", total: 234, wins: 140, rate: 59.8 },
  { type: "Alpha+FOMO", total: 45, wins: 34, rate: 75.6 },
  { type: "巨鲸追踪", total: 67, wins: 38, rate: 56.7 },
];

const monthlyData = [
  { month: "1月", rate: 62 }, { month: "2月", rate: 58 }, { month: "3月", rate: 71 },
  { month: "4月", rate: 65 }, { month: "5月", rate: 69 }, { month: "6月", rate: 63 },
];

const topCoins = [
  { symbol: "BTC", signals: 45, wins: 32, rate: 71.1, avgReturn: "+4.2%" },
  { symbol: "ETH", signals: 38, wins: 25, rate: 65.8, avgReturn: "+3.8%" },
  { symbol: "SOL", signals: 32, wins: 23, rate: 71.9, avgReturn: "+5.1%" },
  { symbol: "BNB", signals: 28, wins: 17, rate: 60.7, avgReturn: "+2.9%" },
  { symbol: "AVAX", signals: 22, wins: 15, rate: 68.2, avgReturn: "+4.5%" },
  { symbol: "ADA", signals: 19, wins: 11, rate: 57.9, avgReturn: "+2.1%" },
];

export default function VSWinRate() {
  return (
    <div>
      <PageHeader
        title="📈 VS 信号胜率"
        description="历史胜率统计 · 信号类型分析"
        actions={
          <Button variant="outline" size="sm" className="text-xs" onClick={() => toast.info("已刷新")}>
            <RefreshCw size={14} className="mr-1" /> 刷新
          </Button>
        }
      />

      {/* Overall Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: "总信号数", value: "591", color: "text-foreground" },
          { label: "总胜率", value: "63.6%", color: "text-neon-green" },
          { label: "平均收益", value: "+3.7%", color: "text-neon-green" },
          { label: "最高胜率", value: "75.6%", color: "text-neon-green" },
        ].map((s) => (
          <div key={s.label} className="terminal-card p-4 text-center">
            <p className={`text-2xl stat-number font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Win Rate by Type */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <div className="terminal-card p-4">
          <h3 className="text-sm font-medium mb-4">各信号类型胜率</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={winRateData} layout="vertical">
                <XAxis type="number" tick={{ fontSize: 10, fill: "#666" }} axisLine={false} tickLine={false} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                <YAxis type="category" dataKey="type" tick={{ fontSize: 11, fill: "#888" }} axisLine={false} tickLine={false} width={80} />
                <Tooltip contentStyle={{ background: "#1a1a2e", border: "1px solid #333", borderRadius: "6px", fontSize: "12px" }} formatter={(v: number) => `${v}%`} />
                <Bar dataKey="rate" radius={[0, 4, 4, 0]}>
                  {winRateData.map((entry, i) => (
                    <Cell key={i} fill={entry.rate >= 65 ? "#00ff88" : entry.rate >= 55 ? "#ffaa00" : "#ff4444"} fillOpacity={0.7} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="terminal-card p-4">
          <h3 className="text-sm font-medium mb-4">月度胜率趋势</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData}>
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#888" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#666" }} axisLine={false} tickLine={false} domain={[40, 80]} tickFormatter={(v) => `${v}%`} />
                <Tooltip contentStyle={{ background: "#1a1a2e", border: "1px solid #333", borderRadius: "6px", fontSize: "12px" }} formatter={(v: number) => `${v}%`} />
                <Bar dataKey="rate" radius={[4, 4, 0, 0]} fill="#00ff88" fillOpacity={0.6} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Top Coins */}
      <div className="terminal-card overflow-hidden">
        <div className="p-4 border-b border-border">
          <h3 className="text-sm font-medium">各币种胜率排行</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-secondary/30">
                <th className="text-left p-3 text-muted-foreground font-medium">币种</th>
                <th className="text-right p-3 text-muted-foreground font-medium">信号数</th>
                <th className="text-right p-3 text-muted-foreground font-medium">盈利次数</th>
                <th className="text-right p-3 text-muted-foreground font-medium">胜率</th>
                <th className="text-right p-3 text-muted-foreground font-medium">平均收益</th>
              </tr>
            </thead>
            <tbody>
              {topCoins.map((c) => (
                <tr key={c.symbol} className="border-b border-border/50 hover:bg-secondary/20">
                  <td className="p-3 font-medium text-foreground">{c.symbol}</td>
                  <td className="p-3 text-right stat-number text-foreground">{c.signals}</td>
                  <td className="p-3 text-right stat-number text-neon-green">{c.wins}</td>
                  <td className={`p-3 text-right stat-number font-medium ${c.rate >= 65 ? "text-neon-green" : c.rate >= 55 ? "text-neon-yellow" : "text-neon-red"}`}>{c.rate}%</td>
                  <td className="p-3 text-right stat-number text-neon-green">{c.avgReturn}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
