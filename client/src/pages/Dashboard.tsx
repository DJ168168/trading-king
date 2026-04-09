import { Button } from "@/components/ui/button";
import StatCard from "@/components/StatCard";
import PageHeader from "@/components/PageHeader";
import EmptyState from "@/components/EmptyState";
import { DollarSign, TrendingUp, BarChart3, Briefcase, Zap, RefreshCw, Activity } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";
import { toast } from "sonner";

const balanceData = [
  { time: "07:54", value: 9800 }, { time: "10:41", value: 9900 }, { time: "11:10", value: 10100 },
  { time: "11:17", value: 9950 }, { time: "11:27", value: 10200 }, { time: "11:35", value: 10050 },
  { time: "13:31", value: 10300 }, { time: "14:39", value: 10150 }, { time: "14:52", value: 10400 },
  { time: "15:40", value: 10086 }, { time: "15:59", value: 10086 }, { time: "18:11", value: 10086 },
];

const vsAlerts = [
  { symbol: "SIREN", tag: "Alpha多", color: "text-neon-blue" },
  { symbol: "BCH", tag: "Alpha多", color: "text-neon-blue" },
  { symbol: "PAXG", tag: "资金入", color: "text-neon-yellow" },
  { symbol: "HYPE", tag: "Alpha多", color: "text-neon-blue" },
  { symbol: "BTC", tag: "资金入", color: "text-neon-yellow" },
  { symbol: "ETH", tag: "Alpha多", color: "text-neon-blue" },
  { symbol: "SOL", tag: "Alpha多", color: "text-neon-blue" },
];

export default function Dashboard() {
  return (
    <div>
      <PageHeader
        title="交易仪表盘"
        description="实时监控您的量化交易系统"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="text-xs" onClick={() => toast.info("模拟信号已生成")}>
              <Zap size={14} className="mr-1" /> 模拟信号
            </Button>
            <Button variant="outline" size="sm" className="text-xs" onClick={() => toast.info("余额已更新")}>
              <RefreshCw size={14} className="mr-1" /> 更新余额
            </Button>
          </div>
        }
      />

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={<DollarSign size={18} />} iconColor="text-neon-green" label="账户总余额" value="$10,086" sublabel="盈利" />
        <StatCard icon={<TrendingUp size={18} />} iconColor="text-neon-green" label="今日盈亏" value="+$82.78" sublabel="盈利" />
        <StatCard icon={<BarChart3 size={18} />} iconColor="text-neon-green" label="今日交易" value="0 笔" sublabel="亏损" />
        <StatCard icon={<Briefcase size={18} />} iconColor="text-neon-blue" label="持仓" value="0 个" sublabel="持平" />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {/* Balance Chart */}
        <div className="terminal-card p-4">
          <h3 className="text-sm font-medium text-foreground mb-1">账户余额走势</h3>
          <p className="text-[10px] text-muted-foreground mb-4">过去24小时</p>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={balanceData}>
                <defs>
                  <linearGradient id="balanceGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#00ff88" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#00ff88" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="time" tick={{ fontSize: 10, fill: "#666" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#666" }} axisLine={false} tickLine={false} domain={["dataMin - 200", "dataMax + 200"]} />
                <Tooltip
                  contentStyle={{ background: "#1a1a2e", border: "1px solid #333", borderRadius: "6px", fontSize: "12px" }}
                  labelStyle={{ color: "#888" }}
                />
                <Area type="monotone" dataKey="value" stroke="#00ff88" fill="url(#balanceGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Signal Engine Status */}
        <div className="terminal-card p-4">
          <h3 className="text-sm font-medium text-foreground mb-4">信号引擎状态</h3>
          <div className="space-y-3">
            {[
              { label: "FOMO 缓存", value: "0 条", color: "text-neon-red" },
              { label: "Alpha 缓存", value: "0 条", color: "text-neon-green" },
              { label: "风险信号", value: "0 条", color: "text-neon-yellow" },
              { label: "已处理 ID", value: "0", color: "text-muted-foreground" },
              { label: "时间窗口", value: "300s", color: "text-foreground" },
              { label: "最低评分", value: "60%", color: "text-foreground" },
              { label: "自动交易", value: "禁用", color: "text-neon-red" },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{item.label}</span>
                <span className={`stat-number font-medium ${item.color}`}>{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Signals Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <div className="terminal-card p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-foreground">最新信号</h3>
            <span className="text-xs text-muted-foreground stat-number">0 条</span>
          </div>
          <EmptyState
            icon={<Zap size={40} />}
            title="暂无信号"
            description='点击"模拟信号"生成测试数据'
          />
        </div>

        <div className="terminal-card p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-foreground">聚合信号</h3>
            <span className="text-xs text-muted-foreground">FOMO + Alpha 匹配</span>
          </div>
          <EmptyState
            icon={<Activity size={40} />}
            title="暂无聚合信号"
            description="需要 FOMO + Alpha 信号在时间窗口内同时出现"
          />
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Market Sentiment */}
        <div className="terminal-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full bg-neon-red animate-pulse" />
            <h3 className="text-sm font-medium text-foreground">市场情绪指数</h3>
            <span className="text-[10px] text-muted-foreground">ValueScan 实时</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-neon-red" />
              <span className="text-lg font-bold text-neon-red stat-number">极度恐惧</span>
            </div>
          </div>
          <p className="text-3xl font-bold text-neon-red stat-number mt-2">0</p>
          <p className="text-xs text-muted-foreground mt-1">极度恐惧 - 考虑抄底</p>
          <p className="text-[10px] text-muted-foreground mt-1">昨: 0  周: 0  月: 0</p>
        </div>

        {/* VS Alerts */}
        <div className="terminal-card p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-neon-green" />
              <h3 className="text-sm font-medium text-foreground">ValueScan 实时预警</h3>
            </div>
            <span className="text-xs text-muted-foreground stat-number">19 条</span>
          </div>
          <div className="space-y-2">
            {vsAlerts.map((alert, i) => (
              <div key={i} className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0">
                <span className="text-sm font-medium text-foreground">{alert.symbol}</span>
                <span className={`text-xs px-2 py-0.5 rounded ${
                  alert.tag === "Alpha多" ? "bg-neon-blue/10 text-neon-blue" : "bg-neon-yellow/10 text-neon-yellow"
                }`}>
                  {alert.tag}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
