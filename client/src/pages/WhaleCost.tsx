import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";

const coins = [
  { symbol: "BTC", cost: "$71,142", gain: "+1.98%", tag: null },
  { symbol: "ETH", cost: "$2,194.14", gain: "+1.61%", tag: "Alpha" },
  { symbol: "SOL", cost: "$82.61", gain: "+2.53%", tag: "Alpha" },
  { symbol: "BNB", cost: "$602.63", gain: "+1.08%", tag: "Alpha" },
  { symbol: "XRP", cost: null, gain: null, tag: null },
  { symbol: "DOGE", cost: "$0.093520", gain: "+9.15%", tag: null },
  { symbol: "ADA", cost: "$0.251700", gain: "+2.07%", tag: "Alpha" },
  { symbol: "AVAX", cost: "$9.14", gain: "+2.74%", tag: null },
];

const deviationData = Array.from({ length: 30 }, (_, i) => ({
  date: `${3 + Math.floor(i / 30 * 30)}/${(i % 30) + 1}`,
  value: Math.sin(i * 0.5) * 6 + Math.random() * 3 - 1.5,
}));

const tokenTabs = ["BTC", "ETH", "SOL", "BNB", "XRP", "DOGE"];
const periodTabs = ["1小时", "4小时", "1天", "7天", "30天", "90天"];

export default function WhaleCost() {
  const [activeCoin, setActiveCoin] = useState("BTC");
  const [activePeriod, setActivePeriod] = useState("1天");

  return (
    <div>
      <PageHeader title="🐋 主力成本分析" description="链上大户平均持仓成本 · 偏离度 · 代币流向 — 判断主力进出场时机" />

      {/* Info Box */}
      <div className="terminal-card p-4 mb-4">
        <p className="text-xs text-foreground mb-1"><strong>主力成本</strong>：链上大户平均买入价，反映主力持仓压力区。</p>
        <p className="text-xs text-neon-green mb-1"><strong>偏离度为负</strong>（当前价低于主力成本）= 主力亏损，有强烈拉盘动力，是最佳入场时机。</p>
        <p className="text-xs text-neon-red"><strong>偏离度为正</strong>（当前价高于主力成本）= 主力盈利，注意出货风险。</p>
      </div>

      {/* Coin Cards */}
      <h3 className="text-sm font-medium mb-3">主要币种主力成本</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {coins.map((c) => (
          <div key={c.symbol} className="terminal-card p-4">
            <p className="text-sm font-bold text-foreground mb-2">{c.symbol}</p>
            {c.cost ? (
              <>
                <p className="text-xs text-muted-foreground">主力平均成本</p>
                <p className="text-lg stat-number font-bold text-foreground">{c.cost}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-muted-foreground">入场收益</span>
                  <span className="text-xs stat-number text-neon-green">{c.gain}</span>
                </div>
                {c.tag && <span className="text-[10px] px-1.5 py-0.5 rounded bg-neon-blue/10 text-neon-blue mt-2 inline-block">信号类型 {c.tag}</span>}
              </>
            ) : (
              <p className="text-xs text-muted-foreground">暂无主力成本数据</p>
            )}
          </div>
        ))}
      </div>

      {/* Deviation Chart */}
      <div className="terminal-card p-4 mb-6">
        <h3 className="text-sm font-medium mb-3">历史偏离度走势（近30天）</h3>
        <div className="flex gap-2 mb-3 flex-wrap">
          {tokenTabs.map((t) => (
            <Button key={t} variant={activeCoin === t ? "default" : "outline"} size="sm" className="text-xs h-7" onClick={() => setActiveCoin(t)}>{t}</Button>
          ))}
        </div>
        <div className="flex items-center gap-4 mb-3">
          <span className="text-lg font-bold stat-number text-neon-green">+1.17%</span>
          <span className="text-xs px-2 py-0.5 rounded bg-neon-yellow/10 text-neon-yellow">成本附近</span>
          <span className="text-xs text-muted-foreground ml-auto">历史分位：67%（近30天）</span>
        </div>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={deviationData}>
              <defs>
                <linearGradient id="devGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ffaa00" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#ffaa00" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#666" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "#666" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v.toFixed(0)}%`} />
              <Tooltip contentStyle={{ background: "#1a1a2e", border: "1px solid #333", borderRadius: "6px", fontSize: "12px" }} />
              <Area type="monotone" dataKey="value" stroke="#ffaa00" fill="url(#devGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="grid grid-cols-4 gap-3 mt-3">
          {[
            { label: "30天最低", value: "-7.39%", color: "text-neon-red" },
            { label: "25分位", value: "-2.59%", color: "text-muted-foreground" },
            { label: "75分位", value: "+4.91%", color: "text-muted-foreground" },
            { label: "30天最高", value: "+11.38%", color: "text-neon-green" },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <p className={`text-sm stat-number font-bold ${s.color}`}>{s.value}</p>
              <p className="text-[10px] text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Token Flow */}
      <div className="terminal-card p-4 mb-6">
        <h3 className="text-sm font-medium mb-3">代币流向分析</h3>
        <div className="flex gap-2 mb-3 flex-wrap">
          {tokenTabs.slice(0, 5).map((t) => (
            <Button key={t} variant={activeCoin === t ? "default" : "outline"} size="sm" className="text-xs h-7" onClick={() => setActiveCoin(t)}>{t}</Button>
          ))}
        </div>
        <div className="flex gap-2 mb-4 flex-wrap">
          {periodTabs.map((p) => (
            <Button key={p} variant={activePeriod === p ? "default" : "outline"} size="sm" className="text-xs h-7" onClick={() => setActivePeriod(p)}>{p}</Button>
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {["BTC", "ETH", "SOL"].map((t) => (
            <div key={t} className="p-3 bg-secondary/30 rounded-lg">
              <p className="text-xs text-foreground font-medium">{t} 代币流向净流入</p>
              <p className="text-xs text-muted-foreground mt-1">周期1</p>
              <p className="text-lg stat-number font-bold text-neon-green mt-1">+0.00M</p>
            </div>
          ))}
        </div>
      </div>

      {/* Strategy Tips */}
      <div className="terminal-card p-4">
        <h3 className="text-sm font-medium mb-4">主力成本策略要点</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            <h4 className="text-xs font-medium text-neon-green mb-2">做多信号组合</h4>
            <div className="space-y-1.5">
              {[
                "当前价格 < 主力成本（偏离度为负）",
                "偏离度处于近30天历史低位（<25分位）",
                "代币流向：链上净流出交易所（主力囤币）",
                "AI 多空信号面板出现 Alpha/FOMO 信号",
                "资金流仪表盘显示净流入",
              ].map((tip) => (
                <p key={tip} className="text-xs text-foreground flex items-center gap-1.5">
                  <span className="text-neon-green">✓</span> {tip}
                </p>
              ))}
            </div>
          </div>
          <div>
            <h4 className="text-xs font-medium text-neon-red mb-2">做空/离场信号组合</h4>
            <div className="space-y-1.5">
              {[
                "当前价格 > 主力成本 20% 以上",
                "偏离度处于近30天历史高位（>75分位）",
                "代币流向：链上净流入交易所（主力出货）",
                "AI 分数 > 80（过热风险）",
                "资金流历史持续为负",
              ].map((tip) => (
                <p key={tip} className="text-xs text-foreground flex items-center gap-1.5">
                  <span className="text-neon-red">✗</span> {tip}
                </p>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
