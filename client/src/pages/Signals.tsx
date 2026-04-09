import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import StatCard from "@/components/StatCard";
import PageHeader from "@/components/PageHeader";
import EmptyState from "@/components/EmptyState";
import { Zap, RefreshCw, Activity, AlertTriangle, Radio } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const filterTabs = ["全部", "FOMO", "Alpha信号", "风险预警", "暴跌信号", "资金流动"];

export default function Signals() {
  const [activeFilter, setActiveFilter] = useState("全部");
  const [symbol, setSymbol] = useState("BTC");

  return (
    <div>
      <PageHeader
        title="信号监控"
        description="实时接收并聚合 FOMO / Alpha 交易信号"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="text-xs" onClick={() => toast.info("模拟信号已生成")}>
              <Zap size={14} className="mr-1" /> 模拟信号
            </Button>
            <Button variant="outline" size="sm" className="text-xs" onClick={() => toast.info("已刷新")}>
              <RefreshCw size={14} className="mr-1" /> 刷新
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={<Zap size={18} />} iconColor="text-neon-red" label="FOMO 缓存" value="0" />
        <StatCard icon={<Activity size={18} />} iconColor="text-neon-green" label="Alpha 缓存" value="0" />
        <StatCard icon={<AlertTriangle size={18} />} iconColor="text-neon-yellow" label="风险信号" value="0" />
        <StatCard icon={<Radio size={18} />} iconColor="text-muted-foreground" label="已处理" value="0" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="lg:col-span-2 terminal-card p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium">信号流 (0)</h3>
          </div>
          <div className="flex flex-wrap gap-2 mb-4">
            {filterTabs.map((tab) => (
              <Button
                key={tab}
                variant={activeFilter === tab ? "default" : "outline"}
                size="sm"
                className="text-xs h-7"
                onClick={() => setActiveFilter(tab)}
              >
                {tab}
              </Button>
            ))}
          </div>
          <EmptyState
            icon={<Zap size={48} />}
            title="暂无信号数据"
            description='点击"模拟信号"生成测试数据'
          />
        </div>

        <div className="terminal-card p-4">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-2 h-2 rounded-full bg-neon-green" />
            <h3 className="text-sm font-medium">聚合信号</h3>
          </div>
          <EmptyState
            icon={<Activity size={40} />}
            title="暂无聚合信号"
            description="需要 FOMO+Alpha 同时触发"
          />
        </div>
      </div>

      <div className="terminal-card p-4">
        <h3 className="text-sm font-medium mb-4">手动提交信号</h3>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            placeholder="BTC"
            className="w-24 h-8 text-xs bg-secondary"
          />
          {["FOMO爆量", "Alpha信号", "FOMO增强", "暴跌信号"].map((type) => (
            <Button
              key={type}
              variant="outline"
              size="sm"
              className="text-xs h-8"
              onClick={() => toast.success(`已提交 ${symbol} ${type} 信号`)}
            >
              {type}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
