import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";

const longAlerts = [
  { rank: 1, symbol: "HUMA", time: "04/07 12:50", initPrice: "$0.015", curPrice: "$0.015", maxUp: "+0.00%", maxDown: "+0.00%", type: "合约", vol: "42.33M", score: 45 },
  { rank: 2, symbol: "ZEC", time: "04/07 12:50", initPrice: "$364.3", curPrice: "$364.3", maxUp: "+0.00%", maxDown: "+0.00%", type: "合约", vol: "5.94B", score: 80 },
  { rank: 3, symbol: "MET", time: "04/07 13:10", initPrice: "$0.135", curPrice: "$0.135", maxUp: "+0.00%", maxDown: "+0.00%", type: "合约", vol: "68.72M", score: null },
  { rank: 4, symbol: "KAITO", time: "04/07 15:10", initPrice: "$0.417", curPrice: "$0.417", maxUp: "+0.00%", maxDown: "+0.00%", type: "合约", vol: "107.75M", score: 45 },
  { rank: 5, symbol: "SKL", time: "04/07 16:00", initPrice: "$0.007", curPrice: "$0.007", maxUp: "+0.00%", maxDown: "+0.00%", type: "合约", vol: "39.73M", score: 60 },
  { rank: 6, symbol: "SOL", time: "04/07 20:05", initPrice: "$83.84", curPrice: "$83.84", maxUp: "+0.00%", maxDown: "+0.00%", type: "合约", vol: "48.14B", score: 55 },
  { rank: 7, symbol: "BTC", time: "04/07 21:10", initPrice: "$71,961.69", curPrice: "$71,961.69", maxUp: "+0.00%", maxDown: "+0.00%", type: "合约", vol: "1.44T", score: 71 },
  { rank: 8, symbol: "HYPE", time: "04/07 21:15", initPrice: "$40.017", curPrice: "$40.017", maxUp: "+0.00%", maxDown: "+0.00%", type: "现货", vol: "10.24B", score: null },
  { rank: 9, symbol: "SPX", time: "04/07 21:15", initPrice: "$0.305", curPrice: "$0.305", maxUp: "+0.00%", maxDown: "+0.00%", type: "现货", vol: "277.18M", score: 65 },
  { rank: 10, symbol: "ETH", time: "04/07 21:15", initPrice: "$2,214.36", curPrice: "$2,214.36", maxUp: "+0.00%", maxDown: "+0.00%", type: "合约", vol: "266.43B", score: null },
];

const scoreRanges = [
  { range: "< 45", label: "AI 分数 → 较负面", color: "text-neon-red", bg: "bg-neon-red/10" },
  { range: "45 ~ 55", label: "AI 分数 → 观察中", color: "text-neon-yellow", bg: "bg-neon-yellow/10" },
  { range: "55 ~ 80", label: "AI 分数 → 较正面", color: "text-neon-green", bg: "bg-neon-green/10" },
  { range: "> 80", label: "AI 分数 → 过热风险", color: "text-neon-red", bg: "bg-neon-red/10" },
];

export default function AILongShort() {
  return (
    <div>
      <PageHeader
        title="⚡ AI 多空信号"
        description="Alpha·FOMO 看涨情绪"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="text-xs text-neon-red border-neon-red/30">极度恐惧</Button>
            <Button variant="outline" size="sm" className="text-xs" onClick={() => toast.info("已刷新")}>
              <RefreshCw size={14} className="mr-1" /> 刷新
            </Button>
          </div>
        }
      />

      {/* Info Box */}
      <div className="terminal-card p-4 mb-4">
        <p className="text-xs text-foreground mb-2">
          <span className="text-neon-blue">Alpha ⚡</span> 信号：检测异常高活跃度，价格上涨概率更大，越早信号风险越低。
        </p>
        <p className="text-xs text-foreground mb-2">
          <span className="text-neon-red">FOMO 🔥</span> 信号：市场整体热情高涨，FOMO 信号越频繁，价格上涨可能性越高。
        </p>
        <p className="text-xs text-neon-yellow">橙色高亮：警惕潜在的突然抛售风险，谨慎操作。</p>
      </div>

      {/* Score Ranges */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        {scoreRanges.map((s) => (
          <div key={s.range} className={`p-3 rounded-lg border border-border ${s.bg}`}>
            <p className={`text-lg font-bold stat-number ${s.color}`}>{s.range}</p>
            <p className="text-[10px] text-muted-foreground mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="long" className="w-full">
        <TabsList className="bg-secondary mb-4">
          <TabsTrigger value="long" className="text-xs">多头流入预警</TabsTrigger>
          <TabsTrigger value="short" className="text-xs">空头流出预警</TabsTrigger>
        </TabsList>

        <TabsContent value="long">
          <div className="flex flex-wrap gap-2 mb-4">
            <Button variant="outline" size="sm" className="text-xs">⚡🔥 Alpha+FOMO 双标记筛选</Button>
          </div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium">多头流入预警 <span className="text-muted-foreground">{longAlerts.length} 条</span></p>
            <span className="text-[10px] text-muted-foreground">每分钟自动刷新</span>
          </div>
          <div className="terminal-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border bg-secondary/30">
                    <th className="text-left p-2.5 text-muted-foreground font-medium">#</th>
                    <th className="text-left p-2.5 text-muted-foreground font-medium">代币</th>
                    <th className="text-left p-2.5 text-muted-foreground font-medium">初始预警时间</th>
                    <th className="text-right p-2.5 text-muted-foreground font-medium">标记价格</th>
                    <th className="text-right p-2.5 text-muted-foreground font-medium">当前价格</th>
                    <th className="text-right p-2.5 text-muted-foreground font-medium">最大涨幅</th>
                    <th className="text-right p-2.5 text-muted-foreground font-medium">最大亏损</th>
                    <th className="text-center p-2.5 text-muted-foreground font-medium">类型</th>
                    <th className="text-right p-2.5 text-muted-foreground font-medium">市值</th>
                    <th className="text-right p-2.5 text-muted-foreground font-medium">标记</th>
                  </tr>
                </thead>
                <tbody>
                  {longAlerts.map((a) => (
                    <tr key={a.rank} className="border-b border-border/50 hover:bg-secondary/20 transition-colors">
                      <td className="p-2.5 text-muted-foreground">{a.rank}</td>
                      <td className="p-2.5 font-medium text-foreground">{a.symbol}</td>
                      <td className="p-2.5 text-muted-foreground stat-number">{a.time}</td>
                      <td className="p-2.5 text-right stat-number text-foreground">{a.initPrice}</td>
                      <td className="p-2.5 text-right stat-number text-foreground">{a.curPrice}</td>
                      <td className="p-2.5 text-right stat-number text-neon-green">{a.maxUp}</td>
                      <td className="p-2.5 text-right stat-number text-neon-green">{a.maxDown}</td>
                      <td className="p-2.5 text-center">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${a.type === "合约" ? "bg-neon-blue/10 text-neon-blue" : "bg-neon-yellow/10 text-neon-yellow"}`}>
                          {a.type}
                        </span>
                      </td>
                      <td className="p-2.5 text-right stat-number text-muted-foreground">{a.vol}</td>
                      <td className="p-2.5 text-right">
                        {a.score ? (
                          <span className={`stat-number font-medium ${a.score >= 55 ? "text-neon-green" : a.score >= 45 ? "text-neon-yellow" : "text-neon-red"}`}>
                            {a.score}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="short">
          <div className="terminal-card p-8 text-center">
            <p className="text-sm text-muted-foreground">暂无空头流出预警</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
