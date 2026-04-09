import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";

const qualityMetrics = [
  { label: "信号总数", value: "156", color: "text-foreground" },
  { label: "有效信号", value: "98", color: "text-neon-green" },
  { label: "过滤信号", value: "58", color: "text-neon-red" },
  { label: "信号质量", value: "62.8%", color: "text-neon-green" },
];

const btcTrend = [
  { label: "BTC 趋势", value: "上涨", color: "text-neon-green" },
  { label: "趋势强度", value: "中等", color: "text-neon-yellow" },
  { label: "支撑位", value: "$69,500", color: "text-foreground" },
  { label: "阻力位", value: "$73,200", color: "text-foreground" },
];

const cooldownRules = [
  { name: "连续亏损冷却", desc: "连续3次亏损后暂停交易2小时", status: "启用", active: true },
  { name: "高波动冷却", desc: "BTC 1小时波动>5%时暂停开仓", status: "启用", active: true },
  { name: "资金费率冷却", desc: "资金费率>0.1%时降低仓位50%", status: "启用", active: true },
  { name: "新闻事件冷却", desc: "重大新闻发布前后1小时暂停", status: "禁用", active: false },
];

const positionRules = [
  { condition: "信号质量 > 80%", position: "100%", desc: "高质量信号，满仓" },
  { condition: "信号质量 60-80%", position: "60%", desc: "中等质量，6成仓" },
  { condition: "信号质量 40-60%", position: "30%", desc: "低质量，3成仓" },
  { condition: "信号质量 < 40%", position: "0%", desc: "质量过低，不开仓" },
];

export default function SignalQuality() {
  return (
    <div>
      <PageHeader
        title="🛡 信号质量仪表盘"
        description="动态仓位 · 冷却期 · BTC 趋势过滤"
        actions={
          <Button variant="outline" size="sm" className="text-xs" onClick={() => toast.info("已刷新")}>
            <RefreshCw size={14} className="mr-1" /> 刷新
          </Button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {qualityMetrics.map((m) => (
          <div key={m.label} className="terminal-card p-4 text-center">
            <p className={`text-2xl stat-number font-bold ${m.color}`}>{m.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{m.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {/* BTC Trend */}
        <div className="terminal-card p-4">
          <h3 className="text-sm font-medium mb-4">BTC 趋势过滤器</h3>
          <div className="grid grid-cols-2 gap-3">
            {btcTrend.map((t) => (
              <div key={t.label} className="p-3 bg-secondary/30 rounded-lg">
                <p className="text-[10px] text-muted-foreground">{t.label}</p>
                <p className={`text-sm stat-number font-bold ${t.color} mt-1`}>{t.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Cooldown Rules */}
        <div className="terminal-card p-4">
          <h3 className="text-sm font-medium mb-4">冷却期规则</h3>
          <div className="space-y-2">
            {cooldownRules.map((r) => (
              <div key={r.name} className={`p-3 rounded-lg border ${r.active ? "border-neon-green/20 bg-neon-green/5" : "border-border bg-secondary/30"}`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-foreground">{r.name}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${r.active ? "bg-neon-green/10 text-neon-green" : "bg-secondary text-muted-foreground"}`}>{r.status}</span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">{r.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Dynamic Position */}
      <div className="terminal-card p-4">
        <h3 className="text-sm font-medium mb-4">动态仓位管理</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {positionRules.map((r) => (
            <div key={r.condition} className="p-3 bg-secondary/30 rounded-lg">
              <p className="text-xs font-medium text-foreground">{r.condition}</p>
              <p className="text-lg stat-number font-bold text-neon-green mt-2">{r.position}</p>
              <p className="text-[10px] text-muted-foreground mt-1">{r.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
