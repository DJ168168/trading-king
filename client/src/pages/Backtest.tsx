import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import PageHeader from "@/components/PageHeader";
import EmptyState from "@/components/EmptyState";
import { Play, BarChart3, FlaskConical } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function Backtest() {
  const [params, setParams] = useState({
    name: "回测_2026/4/9", startDate: "2026-03-10", endDate: "2026-04-09",
    capital: 10000, timeWindow: 300, minScore: 0.6,
    stopLoss: 3, takeProfit1: 5, takeProfit2: 10, leverage: 5,
  });

  const update = (key: string, value: string | number) => setParams((p) => ({ ...p, [key]: value }));

  return (
    <div>
      <PageHeader
        title="回测模拟"
        description="基于历史信号数据验证策略胜率与收益率"
        actions={
          <Button variant="outline" size="sm" className="text-xs" onClick={() => toast.info("多阈值对比功能")}>
            <BarChart3 size={14} className="mr-1" /> 多阈值对比
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="terminal-card p-4">
          <h3 className="text-sm font-medium mb-4 flex items-center gap-2">
            <span className="text-neon-yellow">⚠</span> 回测参数
          </h3>
          <div className="space-y-3">
            <Field label="回测名称"><Input value={params.name} onChange={(e) => update("name", e.target.value)} className="h-8 text-xs bg-secondary" /></Field>
            <Field label="开始日期"><Input type="date" value={params.startDate} onChange={(e) => update("startDate", e.target.value)} className="h-8 text-xs bg-secondary" /></Field>
            <Field label="结束日期"><Input type="date" value={params.endDate} onChange={(e) => update("endDate", e.target.value)} className="h-8 text-xs bg-secondary" /></Field>
            <Field label="初始资金 ($)"><Input type="number" value={params.capital} onChange={(e) => update("capital", +e.target.value)} className="h-8 text-xs bg-secondary" /></Field>
            <Field label="信号时间窗口 (s)"><Input type="number" value={params.timeWindow} onChange={(e) => update("timeWindow", +e.target.value)} className="h-8 text-xs bg-secondary" /></Field>
            <Field label="最低评分 (0-1)"><Input type="number" value={params.minScore} onChange={(e) => update("minScore", +e.target.value)} className="h-8 text-xs bg-secondary" step={0.1} /></Field>
            <Field label="止损比例 (%)"><Input type="number" value={params.stopLoss} onChange={(e) => update("stopLoss", +e.target.value)} className="h-8 text-xs bg-secondary" /></Field>
            <Field label="止盈1 (%)"><Input type="number" value={params.takeProfit1} onChange={(e) => update("takeProfit1", +e.target.value)} className="h-8 text-xs bg-secondary" /></Field>
            <Field label="止盈2 (%)"><Input type="number" value={params.takeProfit2} onChange={(e) => update("takeProfit2", +e.target.value)} className="h-8 text-xs bg-secondary" /></Field>
            <Field label="杠杆倍数"><Input type="number" value={params.leverage} onChange={(e) => update("leverage", +e.target.value)} className="h-8 text-xs bg-secondary" /></Field>
            <Button className="w-full bg-neon-green/20 text-neon-green hover:bg-neon-green/30 border border-neon-green/30" onClick={() => toast.info("回测开始运行...")}>
              <Play size={14} className="mr-1" /> 开始回测
            </Button>
          </div>
        </div>

        <div className="terminal-card p-4">
          <h3 className="text-sm font-medium mb-4">历史回测</h3>
          <EmptyState
            icon={<FlaskConical size={48} />}
            title="暂无回测记录"
            description='配置参数后点击"开始回测"'
          />
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs text-muted-foreground mb-1 block">{label}</label>
      {children}
    </div>
  );
}
