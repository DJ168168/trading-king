import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link2, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

export default function VSConnect() {
  const [apiKey, setApiKey] = useState("");
  const [connected, setConnected] = useState(true);

  return (
    <div>
      <PageHeader title="🔗 VS 账号连接" description="连接 ValueScan 获取实时信号" />

      {/* Connection Status */}
      <div className={`terminal-card p-6 mb-6 ${connected ? "border-neon-green/30" : "border-neon-red/30"}`}>
        <div className="flex items-center gap-4">
          {connected ? (
            <CheckCircle size={40} className="text-neon-green" />
          ) : (
            <XCircle size={40} className="text-neon-red" />
          )}
          <div>
            <h3 className="text-lg font-medium text-foreground">
              {connected ? "ValueScan 已连接" : "ValueScan 未连接"}
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              {connected ? "API 服务端连接正常，实时信号推送已启用" : "请输入 API Key 连接 ValueScan"}
            </p>
          </div>
          <div className="ml-auto">
            <span className={`text-xs px-3 py-1 rounded-full ${connected ? "bg-neon-green/10 text-neon-green" : "bg-neon-red/10 text-neon-red"}`}>
              {connected ? "在线" : "离线"}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* API Key Config */}
        <div className="terminal-card p-4">
          <h3 className="text-sm font-medium mb-4 flex items-center gap-2">
            <Link2 size={16} className="text-neon-green" /> API 配置
          </h3>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">ValueScan API Key</label>
              <Input
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="输入您的 API Key"
                type="password"
                className="h-8 text-xs bg-secondary"
              />
            </div>
            <Button
              className="w-full bg-neon-green/20 text-neon-green hover:bg-neon-green/30 border border-neon-green/30 text-xs"
              onClick={() => {
                setConnected(!connected);
                toast.success(connected ? "已断开连接" : "已连接 ValueScan");
              }}
            >
              {connected ? "断开连接" : "连接 ValueScan"}
            </Button>
          </div>
        </div>

        {/* Connection Info */}
        <div className="terminal-card p-4">
          <h3 className="text-sm font-medium mb-4">连接信息</h3>
          <div className="space-y-2">
            {[
              { label: "API 端点", value: "wss://api.valuescan.io/v2/ws" },
              { label: "连接状态", value: connected ? "已连接" : "未连接", color: connected ? "text-neon-green" : "text-neon-red" },
              { label: "信号推送", value: connected ? "已启用" : "已禁用", color: connected ? "text-neon-green" : "text-neon-red" },
              { label: "延迟", value: connected ? "< 100ms" : "—" },
              { label: "最后心跳", value: connected ? "刚刚" : "—" },
              { label: "订阅频道", value: connected ? "FOMO, Alpha, 资金流" : "—" },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between text-xs py-1.5 border-b border-border/50 last:border-0">
                <span className="text-muted-foreground">{item.label}</span>
                <span className={`stat-number font-medium ${item.color || "text-foreground"}`}>{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="terminal-card p-4 mt-4">
        <h3 className="text-sm font-medium mb-4">ValueScan 功能说明</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[
            { title: "Alpha 信号", desc: "检测异常高活跃度代币，价格上涨概率更大" },
            { title: "FOMO 信号", desc: "市场整体热情高涨，FOMO 信号越频繁越看涨" },
            { title: "资金流入预警", desc: "大额资金异常流入检测，追踪主力资金动向" },
            { title: "巨鲸追踪", desc: "链上大户交易追踪，发现主力建仓/出货" },
            { title: "AI 评分", desc: "综合多维度数据的 AI 评分系统" },
            { title: "实时推送", desc: "WebSocket 实时推送，延迟 < 100ms" },
          ].map((f) => (
            <div key={f.title} className="p-3 bg-secondary/30 rounded-lg">
              <p className="text-xs font-medium text-foreground">{f.title}</p>
              <p className="text-[10px] text-muted-foreground mt-1">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
