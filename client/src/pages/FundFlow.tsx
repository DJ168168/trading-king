import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Cell } from "recharts";

const flowData = [
  { name: "BTC", spot: 12.5, futures: -8.3, onchain: 5.2 },
  { name: "ETH", spot: 8.1, futures: -3.2, onchain: 2.8 },
  { name: "SOL", spot: 3.4, futures: 1.2, onchain: -0.8 },
  { name: "BNB", spot: 1.8, futures: -0.5, onchain: 0.3 },
  { name: "XRP", spot: -2.1, futures: 0.8, onchain: -1.2 },
  { name: "DOGE", spot: -0.5, futures: 0.3, onchain: -0.1 },
];

const periods = ["1小时", "4小时", "1天", "7天", "30天"];

export default function FundFlow() {
  const [period, setPeriod] = useState("1天");

  return (
    <div>
      <PageHeader
        title="💰 资金流仪表盘"
        description="现货 + 合约 + 链上资金流向分析"
        actions={
          <Button variant="outline" size="sm" className="text-xs" onClick={() => toast.info("已刷新")}>
            <RefreshCw size={14} className="mr-1" /> 刷新
          </Button>
        }
      />

      <div className="flex gap-2 mb-4 flex-wrap">
        {periods.map((p) => (
          <Button key={p} variant={period === p ? "default" : "outline"} size="sm" className="text-xs" onClick={() => setPeriod(p)}>{p}</Button>
        ))}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="terminal-card p-4">
          <p className="text-xs text-muted-foreground mb-1">现货净流入</p>
          <p className="text-xl stat-number font-bold text-neon-green">+$23.2M</p>
          <p className="text-[10px] text-muted-foreground mt-1">24h 累计</p>
        </div>
        <div className="terminal-card p-4">
          <p className="text-xs text-muted-foreground mb-1">合约净流入</p>
          <p className="text-xl stat-number font-bold text-neon-red">-$9.7M</p>
          <p className="text-[10px] text-muted-foreground mt-1">24h 累计</p>
        </div>
        <div className="terminal-card p-4">
          <p className="text-xs text-muted-foreground mb-1">链上净流入</p>
          <p className="text-xl stat-number font-bold text-neon-green">+$6.2M</p>
          <p className="text-[10px] text-muted-foreground mt-1">24h 累计</p>
        </div>
      </div>

      {/* Chart */}
      <div className="terminal-card p-4 mb-6">
        <h3 className="text-sm font-medium mb-4">各币种资金流向对比</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={flowData}>
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#888" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "#666" }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}M`} />
              <Tooltip contentStyle={{ background: "#1a1a2e", border: "1px solid #333", borderRadius: "6px", fontSize: "12px" }} />
              <Bar dataKey="spot" name="现货" radius={[4, 4, 0, 0]}>
                {flowData.map((entry, i) => (
                  <Cell key={i} fill={entry.spot >= 0 ? "#00ff88" : "#ff4444"} fillOpacity={0.7} />
                ))}
              </Bar>
              <Bar dataKey="futures" name="合约" radius={[4, 4, 0, 0]}>
                {flowData.map((entry, i) => (
                  <Cell key={i} fill={entry.futures >= 0 ? "#3b82f6" : "#f97316"} fillOpacity={0.7} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Detail Table */}
      <div className="terminal-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-secondary/30">
                <th className="text-left p-3 text-muted-foreground font-medium">币种</th>
                <th className="text-right p-3 text-muted-foreground font-medium">现货净流入</th>
                <th className="text-right p-3 text-muted-foreground font-medium">合约净流入</th>
                <th className="text-right p-3 text-muted-foreground font-medium">链上净流入</th>
                <th className="text-right p-3 text-muted-foreground font-medium">总计</th>
              </tr>
            </thead>
            <tbody>
              {flowData.map((d) => {
                const total = d.spot + d.futures + d.onchain;
                return (
                  <tr key={d.name} className="border-b border-border/50 hover:bg-secondary/20">
                    <td className="p-3 font-medium text-foreground">{d.name}</td>
                    <td className={`p-3 text-right stat-number ${d.spot >= 0 ? "text-neon-green" : "text-neon-red"}`}>{d.spot >= 0 ? "+" : ""}{d.spot.toFixed(1)}M</td>
                    <td className={`p-3 text-right stat-number ${d.futures >= 0 ? "text-neon-green" : "text-neon-red"}`}>{d.futures >= 0 ? "+" : ""}{d.futures.toFixed(1)}M</td>
                    <td className={`p-3 text-right stat-number ${d.onchain >= 0 ? "text-neon-green" : "text-neon-red"}`}>{d.onchain >= 0 ? "+" : ""}{d.onchain.toFixed(1)}M</td>
                    <td className={`p-3 text-right stat-number font-medium ${total >= 0 ? "text-neon-green" : "text-neon-red"}`}>{total >= 0 ? "+" : ""}{total.toFixed(1)}M</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
