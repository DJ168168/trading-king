import { Button } from "@/components/ui/button";
import StatCard from "@/components/StatCard";
import PageHeader from "@/components/PageHeader";
import EmptyState from "@/components/EmptyState";
import { Wallet, TrendingUp, DollarSign, FileText, RefreshCw, Plus } from "lucide-react";
import { toast } from "sonner";

export default function Positions() {
  return (
    <div>
      <PageHeader
        title="持仓管理"
        description="实时监控当前持仓与未实现盈亏"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="text-xs" onClick={() => toast.info("已刷新")}>
              <RefreshCw size={14} className="mr-1" /> 刷新
            </Button>
            <Button size="sm" className="text-xs bg-neon-green/20 text-neon-green hover:bg-neon-green/30 border border-neon-green/30" onClick={() => toast.info("手动开仓功能")}>
              <Plus size={14} className="mr-1" /> 手动开仓
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={<Wallet size={18} />} iconColor="text-neon-green" label="当前持仓数" value="0" />
        <StatCard icon={<TrendingUp size={18} />} iconColor="text-neon-green" label="未实现盈亏" value="+$0.00" />
        <StatCard icon={<DollarSign size={18} />} iconColor="text-foreground" label="可用余额" value="$5618" />
        <StatCard icon={<FileText size={18} />} iconColor="text-muted-foreground" label="未平仓订单" value="0" />
      </div>

      <div className="terminal-card p-4">
        <h3 className="text-sm font-medium mb-4">当前持仓</h3>
        <EmptyState
          icon={<TrendingUp size={48} />}
          title="暂无持仓"
          description='点击"手动开仓"创建测试持仓'
        />
      </div>
    </div>
  );
}
