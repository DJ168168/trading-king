import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

const strategies = [
  { name: "FOMO+Alpha 共振策略", desc: "当 FOMO 和 Alpha 信号在时间窗口内同时出现时开仓", winRate: "68%", risk: "中", tags: ["共振", "自动"] },
  { name: "资金流入追踪策略", desc: "追踪大额资金异常流入的币种，顺势做多", winRate: "62%", risk: "中高", tags: ["资金流", "手动"] },
  { name: "主力成本偏离策略", desc: "当价格低于主力成本时做多，高于主力成本20%时做空", winRate: "71%", risk: "低", tags: ["链上", "自动"] },
  { name: "恐慌指数抄底策略", desc: "当恐慌贪婪指数低于20时分批建仓", winRate: "75%", risk: "低", tags: ["情绪", "手动"] },
  { name: "多空综合评分策略", desc: "综合7大数据源评分，评分>70做多，<30做空", winRate: "65%", risk: "中", tags: ["综合", "自动"] },
  { name: "新闻情绪突变策略", desc: "监控新闻情绪突变，利多做多利空做空", winRate: "58%", risk: "高", tags: ["新闻", "手动"] },
];

const videos = [
  { title: "FOMO+Alpha 共振策略详解", duration: "15:30", views: "2.3k" },
  { title: "如何利用主力成本判断入场时机", duration: "12:45", views: "1.8k" },
  { title: "恐慌指数抄底实战案例", duration: "18:20", views: "3.1k" },
  { title: "资金流分析从入门到精通", duration: "22:10", views: "1.5k" },
];

export default function StrategyCenter() {
  return (
    <div>
      <PageHeader title="⚡ 高胜率策略中心" description="共振检测 · 视频策略教程 · 实战案例" />

      <Tabs defaultValue="strategies" className="w-full">
        <TabsList className="bg-secondary mb-4">
          <TabsTrigger value="strategies" className="text-xs">策略库</TabsTrigger>
          <TabsTrigger value="videos" className="text-xs">视频教程</TabsTrigger>
          <TabsTrigger value="resonance" className="text-xs">共振检测</TabsTrigger>
        </TabsList>

        <TabsContent value="strategies">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {strategies.map((s) => (
              <div key={s.name} className="terminal-card p-4 hover:border-neon-green/30 transition-colors">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-sm font-medium text-foreground">{s.name}</h3>
                  <span className="text-xs stat-number text-neon-green font-bold">{s.winRate}</span>
                </div>
                <p className="text-xs text-muted-foreground mb-3">{s.desc}</p>
                <div className="flex items-center justify-between">
                  <div className="flex gap-1">
                    {s.tags.map((tag) => (
                      <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">{tag}</span>
                    ))}
                  </div>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                    s.risk === "低" ? "bg-neon-green/10 text-neon-green" :
                    s.risk === "中" ? "bg-neon-yellow/10 text-neon-yellow" :
                    s.risk === "中高" ? "bg-neon-yellow/10 text-neon-yellow" :
                    "bg-neon-red/10 text-neon-red"
                  }`}>
                    风险: {s.risk}
                  </span>
                </div>
                <Button variant="outline" size="sm" className="text-xs mt-3 w-full" onClick={() => toast.info(`已选择: ${s.name}`)}>
                  应用策略
                </Button>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="videos">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {videos.map((v) => (
              <div key={v.title} className="terminal-card p-4 hover:border-neon-green/30 transition-colors cursor-pointer" onClick={() => toast.info("视频播放功能")}>
                <div className="w-full h-32 bg-secondary/50 rounded-lg mb-3 flex items-center justify-center">
                  <span className="text-3xl">▶</span>
                </div>
                <h3 className="text-sm font-medium text-foreground">{v.title}</h3>
                <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground">
                  <span>{v.duration}</span>
                  <span>{v.views} 观看</span>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="resonance">
          <div className="terminal-card p-4">
            <h3 className="text-sm font-medium mb-4">共振检测引擎</h3>
            <p className="text-xs text-muted-foreground mb-4">实时检测多个信号源的共振情况，当多个维度同时发出信号时触发高胜率交易机会。</p>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {["FOMO信号", "Alpha信号", "资金流入", "主力成本", "恐慌指数", "新闻情绪", "技术指标", "链上数据"].map((dim) => (
                <div key={dim} className="p-3 bg-secondary/50 rounded-lg text-center">
                  <div className="w-3 h-3 rounded-full bg-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">{dim}</p>
                  <p className="text-[10px] text-muted-foreground/60 mt-1">待检测</p>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
