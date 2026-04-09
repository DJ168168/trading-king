import PageHeader from "@/components/PageHeader";
import { BookOpen, FileText, Video, ExternalLink } from "lucide-react";
import { toast } from "sonner";

const categories = [
  {
    title: "入门教程",
    icon: <BookOpen size={18} />,
    articles: [
      { title: "量化交易基础概念", desc: "了解量化交易的基本原理和术语" },
      { title: "如何阅读 K 线图", desc: "K 线图的基本形态和含义" },
      { title: "技术指标入门", desc: "MACD、RSI、布林带等常用指标" },
      { title: "风险管理基础", desc: "仓位管理、止损止盈的重要性" },
    ],
  },
  {
    title: "策略教程",
    icon: <FileText size={18} />,
    articles: [
      { title: "FOMO+Alpha 共振策略", desc: "如何利用信号共振提高胜率" },
      { title: "主力成本分析策略", desc: "链上数据分析主力持仓成本" },
      { title: "资金流追踪策略", desc: "现货+合约+链上资金流分析" },
      { title: "恐慌指数抄底策略", desc: "利用市场情绪指数寻找入场时机" },
    ],
  },
  {
    title: "视频课程",
    icon: <Video size={18} />,
    articles: [
      { title: "实战：BTC 趋势交易", desc: "从信号到开仓的完整流程" },
      { title: "回测系统使用教程", desc: "如何验证你的交易策略" },
      { title: "ValueScan API 接入指南", desc: "连接 ValueScan 获取实时信号" },
      { title: "自动交易配置教程", desc: "从零配置自动交易系统" },
    ],
  },
  {
    title: "进阶研究",
    icon: <ExternalLink size={18} />,
    articles: [
      { title: "链上数据深度分析", desc: "Glassnode、Nansen 等工具使用" },
      { title: "市场微观结构", desc: "订单簿、流动性、滑点分析" },
      { title: "多因子模型构建", desc: "构建自己的量化因子库" },
      { title: "机器学习在交易中的应用", desc: "AI 预测模型入门" },
    ],
  },
];

export default function Knowledge() {
  return (
    <div>
      <PageHeader title="📚 知识库" description="策略教程 · 视频课程 · 进阶研究" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {categories.map((cat) => (
          <div key={cat.title} className="terminal-card p-4">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-neon-green">{cat.icon}</span>
              <h3 className="text-sm font-medium text-foreground">{cat.title}</h3>
              <span className="text-[10px] text-muted-foreground ml-auto">{cat.articles.length} 篇</span>
            </div>
            <div className="space-y-2">
              {cat.articles.map((a) => (
                <div
                  key={a.title}
                  className="p-3 bg-secondary/30 rounded-lg hover:bg-secondary/60 transition-colors cursor-pointer"
                  onClick={() => toast.info(`打开: ${a.title}`)}
                >
                  <p className="text-xs font-medium text-foreground">{a.title}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{a.desc}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
