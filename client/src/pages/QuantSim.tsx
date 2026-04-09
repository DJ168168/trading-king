import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import EmptyState from "@/components/EmptyState";
import { Play, Pause, RotateCcw, Bot } from "lucide-react";
import { toast } from "sonner";
import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";

const pnlData = Array.from({ length: 30 }, (_, i) => ({
  day: `Day ${i + 1}`,
  value: 10000 + Math.random() * 2000 - 500 + i * 30,
}));

export default function QuantSim() {
  return (
    <div>
      <PageHeader
        title="🤖 量化模拟交易"
        description="自动开仓 · 盈亏曲线 · 验证策略"
        actions={
          <div className="flex gap-2">
            <Button size="sm" className="text-xs bg-neon-green/20 text-neon-green hover:bg-neon-green/30 border border-neon-green/30" onClick={() => toast.info("模拟交易已启动")}>
              <Play size={14} className="mr-1" /> 启动
            </Button>
            <Button variant="outline" size="sm" className="text-xs" onClick={() => toast.info("模拟交易已暂停")}>
              <Pause size={14} className="mr-1" /> 暂停
            </Button>
            <Button variant="outline" size="sm" className="text-xs" onClick={() => toast.info("已重置")}>
              <RotateCcw size={14} className="mr-1" /> 重置
            </Button>
          </div>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: "模拟资金", value: "$10,000", color: "text-foreground" },
          { label: "当前净值", value: "$10,856", color: "text-neon-green" },
          { label: "总收益率", value: "+8.56%", color: "text-neon-green" },
          { label: "最大回撤", value: "-3.2%", color: "text-neon-red" },
        ].map((s) => (
          <div key={s.label} className="terminal-card p-4 text-center">
            <p className={`text-xl stat-number font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* PnL Chart */}
      <div className="terminal-card p-4 mb-6">
        <h3 className="text-sm font-medium mb-4">盈亏曲线</h3>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={pnlData}>
              <defs>
                <linearGradient id="pnlGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#00ff88" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#00ff88" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="day" tick={{ fontSize: 10, fill: "#666" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "#666" }} axisLine={false} tickLine={false} domain={["dataMin - 500", "dataMax + 500"]} />
              <Tooltip contentStyle={{ background: "#1a1a2e", border: "1px solid #333", borderRadius: "6px", fontSize: "12px" }} />
              <Area type="monotone" dataKey="value" stroke="#00ff88" fill="url(#pnlGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Trade Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <div className="terminal-card p-4">
          <h3 className="text-sm font-medium mb-3">交易统计</h3>
          <div className="space-y-2">
            {[
              { label: "总交易次数", value: "47" },
              { label: "盈利次数", value: "31" },
              { label: "亏损次数", value: "16" },
              { label: "胜率", value: "65.96%" },
              { label: "平均盈利", value: "+$42.30" },
              { label: "平均亏损", value: "-$28.50" },
              { label: "盈亏比", value: "1.48" },
              { label: "夏普比率", value: "1.82" },
            ].map((s) => (
              <div key={s.label} className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{s.label}</span>
                <span className="stat-number font-medium text-foreground">{s.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="terminal-card p-4">
          <h3 className="text-sm font-medium mb-3">模拟持仓</h3>
          <EmptyState
            icon={<Bot size={40} />}
            title="暂无模拟持仓"
            description="启动模拟交易后，系统将自动根据信号开仓"
          />
        </div>
      </div>
    </div>
  );
}
