import { Button } from "@/components/ui/button";
import StatCard from "@/components/StatCard";
import PageHeader from "@/components/PageHeader";
import EmptyState from "@/components/EmptyState";
import { BarChart3, Target, TrendingUp, DollarSign, RefreshCw, History } from "lucide-react";
import { toast } from "sonner";

export default function Trades() {
  return (
    <div>
      <PageHeader
        title="交易历史"
        description="完整的交易记录与盈亏分析"
        actions={
          <Button variant="outline" size="sm" className="text-xs" onClick={() => toast.info("已刷新")}>
            <RefreshCw size={14} className="mr-1" /> 刷新
          </Button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={<BarChart3 size={18} />} iconColor="text-foreground" label="今日交易" value="0 笔" />
        <StatCard icon={<Target size={18} />} iconColor="text-neon-red" label="今日胜率" value="0.0%" />
        <StatCard icon={<TrendingUp size={18} />} iconColor="text-neon-green" label="今日盈亏" value="+$0.00" />
        <StatCard icon={<DollarSign size={18} />} iconColor="text-neon-green" label="历史总盈亏" value="+$0.00" />
      </div>

      <div className="terminal-card p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium">交易记录</h3>
          <span className="text-xs text-muted-foreground stat-number">胜率: 0.0% (0/0)</span>
        </div>
        <EmptyState
          icon={<History size={48} />}
          title="暂无交易记录"
          description="在持仓管理页面创建交易后，记录将显示在这里"
        />
      </div>
    </div>
  );
}
