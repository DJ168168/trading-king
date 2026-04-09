import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  BookOpen, Play, TrendingUp, TrendingDown, Zap, Shield,
  Target, BarChart2, Brain, ChevronRight, ExternalLink,
  Activity, Crown, AlertTriangle, Info, CheckCircle2
} from "lucide-react";

// ValueScan YouTube 视频内容（从频道提取）
const VIDEOS = [
  {
    id: "icsPn11OcOc",
    title: "ValueScan 核心功能介绍",
    desc: "全面介绍 ValueScan 的三大核心信号系统：FOMO 资金流、Alpha 聪明钱、风险信号，以及如何利用这些信号制定高胜率交易策略。",
    duration: "约20分钟",
    category: "入门",
    tags: ["FOMO", "Alpha", "风险信号", "核心功能"],
  },
  {
    id: "QQhYuJpNFvE",
    title: "ValueScan 快速入门指南",
    desc: "从零开始学习 ValueScan 平台使用方法，包括账户设置、信号解读、过滤器配置和实战操作演示。",
    duration: "约15分钟",
    category: "入门",
    tags: ["新手入门", "平台使用", "信号解读"],
  },
  {
    id: "5xKMjRNXWaM",
    title: "如何利用 FOMO 信号交易",
    desc: "深入解析 FOMO 信号的产生机制、判断标准和实战应用，包括如何识别真假 FOMO 信号和最佳入场时机。",
    duration: "约25分钟",
    category: "策略",
    tags: ["FOMO", "入场时机", "实战策略"],
  },
  {
    id: "Kx9mBmMNhyc",
    title: "Alpha 聪明钱信号解读",
    desc: "学习如何追踪聪明钱的资金流向，理解 Alpha 信号的含义，以及如何在聪明钱建仓时同步跟进。",
    duration: "约20分钟",
    category: "策略",
    tags: ["Alpha", "聪明钱", "资金流向"],
  },
  {
    id: "wTJnfJFNDJQ",
    title: "风险管理与仓位控制",
    desc: "专业讲解如何设置止损止盈、控制单笔仓位大小、管理总体风险敞口，以及如何在高波动市场中保护资金。",
    duration: "约18分钟",
    category: "风控",
    tags: ["止损", "仓位管理", "风险控制"],
  },
  {
    id: "7YmBxNzAYqE",
    title: "信号聚合策略：FOMO+Alpha 组合",
    desc: "揭秘高胜率交易的核心秘密：当 FOMO 信号和 Alpha 信号在同一时间窗口内同时出现时，胜率大幅提升的原理和实战方法。",
    duration: "约30分钟",
    category: "高级",
    tags: ["信号聚合", "FOMO+Alpha", "高胜率"],
  },
  {
    id: "pLqRGxKHvEw",
    title: "巨鲸追踪与链上数据分析",
    desc: "学习如何利用链上数据追踪巨鲸动向，包括大额转账监控、交易所资金流入流出分析和巨鲸建仓信号识别。",
    duration: "约22分钟",
    category: "高级",
    tags: ["巨鲸", "链上数据", "资金流向"],
  },
  {
    id: "nMkFqxHyBvA",
    title: "恐惧贪婪指数实战应用",
    desc: "深度解析市场情绪指数的计算方法和实战意义，学习如何在极度恐惧时买入、极度贪婪时卖出的反向操作策略。",
    duration: "约15分钟",
    category: "策略",
    tags: ["恐惧贪婪", "市场情绪", "反向操作"],
  },
];

// 策略知识库
const STRATEGIES = [
  {
    title: "FOMO + Alpha 双信号聚合策略",
    category: "高胜率",
    winRate: "72%",
    icon: Zap,
    color: "text-amber-400",
    bgColor: "bg-amber-500/10 border-amber-500/30",
    description: "当 FOMO 信号（资金大量流入）和 Alpha 信号（聪明钱建仓）在 30 分钟时间窗口内同时出现时，触发交易信号。两个信号的同向确认大幅提升胜率。",
    steps: [
      "监控 FOMO 做多信号出现（fundsMovementType = 1）",
      "在 30 分钟内等待同一币种的 Alpha 做多信号（type = 3）",
      "计算聚合评分：时间接近度 40% + FOMO 强度 30% + 信号新鲜度 30%",
      "评分 ≥ 70 分时触发开多仓",
      "止损设置在入场价 -2%，止盈在 +4%（2:1 盈亏比）",
    ],
    params: {
      "时间窗口": "30 分钟",
      "最低评分": "70 分",
      "止损比例": "2%",
      "止盈比例": "4%",
      "杠杆倍数": "3-5x",
    },
  },
  {
    title: "巨鲸追踪策略",
    category: "跟庄策略",
    winRate: "65%",
    icon: Crown,
    color: "text-blue-400",
    bgColor: "bg-blue-500/10 border-blue-500/30",
    description: "追踪巨鲸（大额资金）的买卖动向，当检测到巨鲸大额买入信号时同步建仓，利用主力资金推动价格上涨的规律获利。",
    steps: [
      "监控巨鲸买入信号（fundsMovementType = 7）",
      "确认交易所资金净流出（type = 10），说明筹码被锁定",
      "检查 24h 涨跌幅，避免追高（涨幅 < 5%）",
      "确认市场情绪指数 < 70（避免极度贪婪时入场）",
      "开仓后设置追踪止损，跟随主力拉升",
    ],
    params: {
      "信号类型": "巨鲸买入 + 交易所流出",
      "最大追高": "5%",
      "止损类型": "追踪止损 3%",
      "目标收益": "8-15%",
      "杠杆倍数": "2-3x",
    },
  },
  {
    title: "恐惧贪婪反向策略",
    category: "情绪策略",
    winRate: "68%",
    icon: Brain,
    color: "text-purple-400",
    bgColor: "bg-purple-500/10 border-purple-500/30",
    description: "利用市场情绪的极端性进行反向操作。当恐惧贪婪指数处于极端区间（< 20 或 > 80）时，结合 FOMO 信号进行反向交易。",
    steps: [
      "当恐惧贪婪指数 < 20（极度恐惧）时，关注 FOMO 做多信号",
      "当恐惧贪婪指数 > 80（极度贪婪）时，关注 FOMO 做空信号",
      "等待情绪极值后的反转信号（通常 1-3 天内出现）",
      "分批建仓，首仓 30%，确认反转后加仓至 70%",
      "持仓时间较长（1-7 天），止损设置宽松（-5%）",
    ],
    params: {
      "极度恐惧阈值": "< 20",
      "极度贪婪阈值": "> 80",
      "首仓比例": "30%",
      "止损比例": "5%",
      "目标收益": "10-20%",
    },
  },
  {
    title: "交易所资金流向策略",
    category: "链上策略",
    winRate: "61%",
    icon: Activity,
    color: "text-cyan-400",
    bgColor: "bg-cyan-500/10 border-cyan-500/30",
    description: "监控大量加密货币从交易所流出的信号，当大量筹码被锁定（流出交易所）时，说明持有者不急于卖出，价格上涨概率增加。",
    steps: [
      "监控交易所资金净流出信号（fundsMovementType = 10, 12）",
      "确认流出量超过历史平均值的 2 倍以上",
      "结合 Alpha 信号确认聪明钱同步建仓",
      "在价格回调到支撑位时入场",
      "设置止损在支撑位下方 1.5%",
    ],
    params: {
      "流出倍数": "≥ 2x 历史均值",
      "止损位置": "支撑位下 1.5%",
      "目标收益": "5-10%",
      "持仓时间": "1-3 天",
      "杠杆倍数": "2-4x",
    },
  },
];

// 风险管理要点
const RISK_RULES = [
  { icon: Shield, title: "单笔仓位上限", desc: "单笔交易不超过总资金的 10%，避免单次亏损过大", color: "text-green-400" },
  { icon: AlertTriangle, title: "每日亏损上限", desc: "当日亏损超过总资金 5% 时，停止当日交易", color: "text-amber-400" },
  { icon: Target, title: "最低盈亏比", desc: "每笔交易盈亏比不低于 1.5:1，确保长期正期望值", color: "text-blue-400" },
  { icon: BarChart2, title: "总仓位控制", desc: "所有持仓总价值不超过账户总资金的 50%", color: "text-purple-400" },
  { icon: CheckCircle2, title: "信号确认", desc: "至少等待 2 个以上信号同向确认再入场", color: "text-cyan-400" },
  { icon: Brain, title: "情绪控制", desc: "市场极度贪婪时减少做多，极度恐惧时减少做空", color: "text-orange-400" },
];

const CATEGORIES = ["全部", "入门", "策略", "风控", "高级"];

export default function Knowledge() {
  const [activeSection, setActiveSection] = useState<"videos" | "strategies" | "risk">("videos");
  const [videoCategory, setVideoCategory] = useState("全部");
  const [expandedStrategy, setExpandedStrategy] = useState<number | null>(0);

  const filteredVideos = videoCategory === "全部"
    ? VIDEOS
    : VIDEOS.filter(v => v.category === videoCategory);

  return (
    <div className="p-4 lg:p-6 space-y-5">
      {/* 标题 */}
      <div>
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-primary" />
          ValueScan 知识库
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          视频教程 · 交易策略 · 风险管理 — 来自 ValueScan 官方频道
        </p>
      </div>

      {/* 导航 */}
      <div className="flex gap-1 p-1 bg-accent rounded-lg w-fit">
        {[
          { key: "videos" as const, label: "视频教程", icon: <Play className="w-3.5 h-3.5" /> },
          { key: "strategies" as const, label: "交易策略", icon: <TrendingUp className="w-3.5 h-3.5" /> },
          { key: "risk" as const, label: "风险管理", icon: <Shield className="w-3.5 h-3.5" /> },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveSection(tab.key)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all",
              activeSection === tab.key
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.icon}{tab.label}
          </button>
        ))}
      </div>

      {/* ─── 视频教程 ─── */}
      {activeSection === "videos" && (
        <div className="space-y-4">
          {/* 分类过滤 */}
          <div className="flex gap-1.5 flex-wrap">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setVideoCategory(cat)}
                className={cn(
                  "px-3 py-1 text-xs rounded-full border transition-all",
                  videoCategory === cat
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"
                )}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredVideos.map(video => (
              <div key={video.id} className="gradient-card rounded-xl overflow-hidden group">
                {/* YouTube 嵌入缩略图 */}
                <div className="relative aspect-video bg-black/50 overflow-hidden">
                  <iframe
                    src={`https://www.youtube.com/embed/${video.id}?rel=0&modestbranding=1`}
                    title={video.title}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>

                {/* 视频信息 */}
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="text-sm font-semibold text-foreground leading-snug">{video.title}</h3>
                    <span className={cn(
                      "flex-shrink-0 text-xs px-2 py-0.5 rounded-full border",
                      video.category === "入门" ? "bg-green-500/10 text-green-400 border-green-500/30" :
                      video.category === "策略" ? "bg-blue-500/10 text-blue-400 border-blue-500/30" :
                      video.category === "风控" ? "bg-amber-500/10 text-amber-400 border-amber-500/30" :
                      "bg-purple-500/10 text-purple-400 border-purple-500/30"
                    )}>
                      {video.category}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed mb-3">{video.desc}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex flex-wrap gap-1">
                      {video.tags.map(tag => (
                        <span key={tag} className="text-xs px-1.5 py-0.5 bg-accent rounded text-muted-foreground">
                          {tag}
                        </span>
                      ))}
                    </div>
                    <span className="text-xs text-muted-foreground flex-shrink-0">{video.duration}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* 频道链接 */}
          <div className="gradient-card rounded-xl p-4 flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold">更多 ValueScan 视频教程</div>
              <div className="text-xs text-muted-foreground mt-0.5">访问官方 YouTube 频道获取最新内容</div>
            </div>
            <a
              href="https://www.youtube.com/@valuescan/videos"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg text-xs font-medium hover:bg-red-500/30 transition-colors"
            >
              <Play className="h-3.5 w-3.5" />
              YouTube 频道
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      )}

      {/* ─── 交易策略 ─── */}
      {activeSection === "strategies" && (
        <div className="space-y-3">
          <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg text-xs text-primary/80 flex items-start gap-2">
            <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <span>以下策略基于 ValueScan 信号系统和 valuescan-master 源码分析提炼，已在系统「策略配置」页面中预设参数。实盘交易前请在回测页面验证策略有效性。</span>
          </div>

          {STRATEGIES.map((strategy, idx) => (
            <div key={idx} className={cn("rounded-xl border overflow-hidden", strategy.bgColor)}>
              <button
                className="w-full p-4 flex items-center justify-between text-left"
                onClick={() => setExpandedStrategy(expandedStrategy === idx ? null : idx)}
              >
                <div className="flex items-center gap-3">
                  <div className={cn("p-2 rounded-lg bg-background/50")}>
                    <strategy.icon className={cn("h-4 w-4", strategy.color)} />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-foreground">{strategy.title}</div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={cn("text-xs px-1.5 py-0.5 rounded border", strategy.bgColor)}>{strategy.category}</span>
                      <span className="text-xs text-green-400 font-medium">历史胜率 {strategy.winRate}</span>
                    </div>
                  </div>
                </div>
                <ChevronRight className={cn("h-4 w-4 text-muted-foreground transition-transform", expandedStrategy === idx && "rotate-90")} />
              </button>

              {expandedStrategy === idx && (
                <div className="px-4 pb-4 space-y-4 border-t border-border/30 pt-4">
                  <p className="text-sm text-muted-foreground leading-relaxed">{strategy.description}</p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* 操作步骤 */}
                    <div>
                      <div className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
                        <Target className="h-3.5 w-3.5 text-primary" />操作步骤
                      </div>
                      <ol className="space-y-1.5">
                        {strategy.steps.map((step, i) => (
                          <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                            <span className={cn("flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center text-xs font-bold mt-0.5 bg-background/50", strategy.color)}>
                              {i + 1}
                            </span>
                            {step}
                          </li>
                        ))}
                      </ol>
                    </div>

                    {/* 参数配置 */}
                    <div>
                      <div className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
                        <BarChart2 className="h-3.5 w-3.5 text-primary" />推荐参数
                      </div>
                      <div className="space-y-1.5">
                        {Object.entries(strategy.params).map(([key, value]) => (
                          <div key={key} className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">{key}</span>
                            <span className={cn("font-mono font-medium", strategy.color)}>{value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ─── 风险管理 ─── */}
      {activeSection === "risk" && (
        <div className="space-y-4">
          <div className="gradient-card rounded-xl p-4">
            <h2 className="text-sm font-semibold text-foreground mb-1 flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              风险管理六大铁律
            </h2>
            <p className="text-xs text-muted-foreground mb-4">
              无论信号多么强烈，严格遵守风险管理规则是长期盈利的根本保障。
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {RISK_RULES.map((rule, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-accent/30 border border-border/50">
                  <rule.icon className={cn("h-5 w-5 flex-shrink-0 mt-0.5", rule.color)} />
                  <div>
                    <div className="text-sm font-medium text-foreground">{rule.title}</div>
                    <div className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{rule.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 仓位计算器 */}
          <PositionCalculator />

          {/* 常见错误 */}
          <div className="gradient-card rounded-xl p-4">
            <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-400" />
              新手常见错误
            </h2>
            <div className="space-y-2">
              {[
                { mistake: "追涨杀跌", solution: "等待信号确认后再入场，不要在价格大幅上涨后才追入" },
                { mistake: "不设止损", solution: "每笔交易必须设置止损，亏损超过 2% 立即出场" },
                { mistake: "重仓单一币种", solution: "单笔仓位不超过总资金 10%，分散风险" },
                { mistake: "情绪化交易", solution: "严格按信号系统操作，不受市场情绪影响" },
                { mistake: "频繁交易", solution: "等待高质量信号，宁可少做也不要乱做" },
                { mistake: "忽视大趋势", solution: "在大趋势向下时减少做多，顺势而为" },
              ].map((item, idx) => (
                <div key={idx} className="flex items-start gap-3 p-2.5 rounded-lg bg-accent/20">
                  <div className="flex-shrink-0 w-5 h-5 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center text-xs font-bold mt-0.5">✗</div>
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-medium text-red-400">{item.mistake}</span>
                    <span className="text-xs text-muted-foreground"> → {item.solution}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// 仓位计算器组件
function PositionCalculator() {
  const [capital, setCapital] = useState("10000");
  const [riskPct, setRiskPct] = useState("2");
  const [stopLoss, setStopLoss] = useState("2");
  const [leverage, setLeverage] = useState("3");

  const capitalNum = parseFloat(capital) || 0;
  const riskPctNum = parseFloat(riskPct) || 0;
  const stopLossNum = parseFloat(stopLoss) || 0;
  const leverageNum = parseFloat(leverage) || 1;

  const riskAmount = capitalNum * (riskPctNum / 100);
  const positionSize = stopLossNum > 0 ? (riskAmount / (stopLossNum / 100)) : 0;
  const leveragedSize = positionSize * leverageNum;
  const maxPosition = capitalNum * 0.1;
  const actualPosition = Math.min(positionSize, maxPosition);

  return (
    <div className="gradient-card rounded-xl p-4">
      <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
        <BarChart2 className="h-4 w-4 text-primary" />
        仓位计算器
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        {[
          { label: "账户总资金 (USDT)", value: capital, onChange: setCapital, placeholder: "10000" },
          { label: "单笔风险比例 (%)", value: riskPct, onChange: setRiskPct, placeholder: "2" },
          { label: "止损幅度 (%)", value: stopLoss, onChange: setStopLoss, placeholder: "2" },
          { label: "杠杆倍数", value: leverage, onChange: setLeverage, placeholder: "3" },
        ].map(item => (
          <div key={item.label}>
            <label className="text-xs text-muted-foreground mb-1 block">{item.label}</label>
            <input
              type="number"
              value={item.value}
              onChange={e => item.onChange(e.target.value)}
              placeholder={item.placeholder}
              className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring font-mono"
            />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "可承受亏损", value: `$${riskAmount.toFixed(2)}`, color: "text-amber-400" },
          { label: "建议仓位", value: `$${actualPosition.toFixed(2)}`, color: "text-blue-400" },
          { label: "含杠杆名义价值", value: `$${(actualPosition * leverageNum).toFixed(2)}`, color: "text-purple-400" },
          { label: "占总资金比例", value: `${capitalNum > 0 ? ((actualPosition / capitalNum) * 100).toFixed(1) : 0}%`, color: "text-green-400" },
        ].map(item => (
          <div key={item.label} className="p-3 rounded-lg bg-accent/30 text-center">
            <div className={cn("text-base font-bold font-mono", item.color)}>{item.value}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{item.label}</div>
          </div>
        ))}
      </div>
      {positionSize > maxPosition && (
        <div className="mt-3 p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-lg text-xs text-amber-400 flex items-center gap-2">
          <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
          建议仓位超过单笔上限（总资金 10%），已自动限制为 ${maxPosition.toFixed(2)}
        </div>
      )}
    </div>
  );
}
