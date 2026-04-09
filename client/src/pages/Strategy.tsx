import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import StatCard from "@/components/StatCard";
import PageHeader from "@/components/PageHeader";
import { Target, TrendingUp, Gauge, Pause, Save, OctagonX } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function Strategy() {
  const [config, setConfig] = useState({
    timeWindow: 300, minScore: 0.6, fomoBoost: true,
    maxPosition: 10, totalPosition: 50, maxDailyTrades: 20, maxDailyLoss: 5,
    stopLoss: 3, takeProfit1: 5, takeProfit2: 10,
    leverage: 5, marginMode: "isolated" as "isolated" | "cross", testnet: true,
  });

  const updateConfig = (key: string, value: number | boolean | string) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div>
      <PageHeader
        title="策略配置"
        description="配置信号聚合参数与风险管理规则"
        actions={
          <Button size="sm" className="text-xs bg-neon-green/20 text-neon-green hover:bg-neon-green/30 border border-neon-green/30" onClick={() => toast.success("配置已保存")}>
            <Save size={14} className="mr-1" /> 保存配置
          </Button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={<Target size={18} />} iconColor="text-neon-green" label="预估胜率" value="66%" />
        <StatCard icon={<TrendingUp size={18} />} iconColor="text-neon-green" label="盈亏比" value="1.7x" />
        <StatCard icon={<Gauge size={18} />} iconColor="text-neon-yellow" label="杠杆倍数" value="5x" />
        <StatCard icon={<Pause size={18} />} iconColor="text-neon-red" label="自动交易" value="暂停" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {/* Signal Aggregation */}
        <div className="terminal-card p-4">
          <h3 className="text-sm font-medium mb-4 flex items-center gap-2">
            <span className="text-neon-green">⚡</span> 信号聚合参数
          </h3>
          <div className="space-y-5">
            <SliderField label="信号时间窗口" value={config.timeWindow} min={60} max={1800} unit="s" onChange={(v) => updateConfig("timeWindow", v)} />
            <SliderField label="最低信号评分" value={config.minScore} min={0.3} max={0.95} step={0.05} onChange={(v) => updateConfig("minScore", v)} />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-foreground">FOMO 增强模式</p>
                <p className="text-[10px] text-muted-foreground">启用后，FOMO爆量信号(112)的权重提升至1.0</p>
              </div>
              <Switch checked={config.fomoBoost} onCheckedChange={(v) => updateConfig("fomoBoost", v)} />
            </div>
          </div>
        </div>

        {/* Risk Management */}
        <div className="terminal-card p-4">
          <h3 className="text-sm font-medium mb-4 flex items-center gap-2">
            <span className="text-neon-yellow">⚙</span> 风险管理
          </h3>
          <div className="space-y-5">
            <SliderField label="单仓最大仓位" value={config.maxPosition} min={1} max={50} unit="%" onChange={(v) => updateConfig("maxPosition", v)} />
            <SliderField label="总仓位上限" value={config.totalPosition} min={10} max={100} unit="%" onChange={(v) => updateConfig("totalPosition", v)} />
            <SliderField label="每日最大交易次数" value={config.maxDailyTrades} min={1} max={50} unit="次" onChange={(v) => updateConfig("maxDailyTrades", v)} />
            <SliderField label="每日最大亏损" value={config.maxDailyLoss} min={0.5} max={20} unit="%" step={0.5} onChange={(v) => updateConfig("maxDailyLoss", v)} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {/* Stop Loss / Take Profit */}
        <div className="terminal-card p-4">
          <h3 className="text-sm font-medium mb-4 flex items-center gap-2">
            <span className="text-neon-red">🛡</span> 止损止盈设置
          </h3>
          <div className="space-y-5">
            <SliderField label="止损比例" value={config.stopLoss} min={0.5} max={15} unit="%" step={0.5} onChange={(v) => updateConfig("stopLoss", v)} />
            <SliderField label="第一止盈" value={config.takeProfit1} min={1} max={30} unit="%" onChange={(v) => updateConfig("takeProfit1", v)} />
            <SliderField label="第二止盈" value={config.takeProfit2} min={1} max={50} unit="%" onChange={(v) => updateConfig("takeProfit2", v)} />
          </div>
        </div>

        {/* Trading Control */}
        <div className="terminal-card p-4">
          <h3 className="text-sm font-medium mb-4 flex items-center gap-2">
            <span className="text-neon-blue">⚙</span> 交易控制
          </h3>
          <div className="space-y-5">
            <SliderField label="杠杆倍数" value={config.leverage} min={1} max={20} unit="x" onChange={(v) => updateConfig("leverage", v)} />
            <div>
              <p className="text-xs text-foreground mb-2">保证金模式</p>
              <div className="flex gap-2">
                <Button variant={config.marginMode === "isolated" ? "default" : "outline"} size="sm" className="text-xs" onClick={() => updateConfig("marginMode", "isolated")}>逐仓</Button>
                <Button variant={config.marginMode === "cross" ? "default" : "outline"} size="sm" className="text-xs" onClick={() => updateConfig("marginMode", "cross")}>全仓</Button>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-foreground">测试网模式</p>
                <p className="text-[10px] text-muted-foreground">启用后使用币安测试网，不会产生真实交易</p>
              </div>
              <Switch checked={config.testnet} onCheckedChange={(v) => updateConfig("testnet", v)} />
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-center">
        <Button variant="destructive" size="sm" className="text-xs" onClick={() => toast.error("紧急停止已触发")}>
          <OctagonX size={14} className="mr-1" /> 紧急停止
        </Button>
      </div>
    </div>
  );
}

function SliderField({ label, value, min, max, unit = "", step = 1, onChange }: {
  label: string; value: number; min: number; max: number; unit?: string; step?: number; onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs text-foreground">{label}</p>
        <span className="text-xs text-neon-green stat-number">{value}{unit}</span>
      </div>
      <Slider value={[value]} min={min} max={max} step={step} onValueChange={([v]) => onChange(v)} className="w-full" />
      <div className="flex justify-between mt-1">
        <span className="text-[10px] text-muted-foreground">{min}{unit}</span>
        <span className="text-[10px] text-muted-foreground">{max}{unit}</span>
      </div>
    </div>
  );
}
