import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import PageHeader from "@/components/PageHeader";
import { toast } from "sonner";
import { useState } from "react";
import { CheckCircle, XCircle, Loader2, Send, Wifi, Settings2 } from "lucide-react";

function StatusBadge({ success, loading }: { success?: boolean | null; loading?: boolean }) {
  if (loading) return <Loader2 size={14} className="animate-spin text-muted-foreground" />;
  if (success === true) return <CheckCircle size={14} className="text-neon-green" />;
  if (success === false) return <XCircle size={14} className="text-neon-red" />;
  return null;
}

const EXCHANGE_CONFIGS = [
  {
    id: "binance" as const,
    name: "币安 Binance",
    apiKey: "r3yw73plsmdPC0ZGWoQTe72dmSNtMi4tIcXCtMTmIjuDDTCMcNCXEEibO6cgnGTK",
    secret: "YtL6Roq8SnsVivvxddRfrnXsctFK02IFtjCGPlvBjO2H5XpYhSfF6yVQ9YawhLZT",
    color: "text-yellow-400",
    borderColor: "border-yellow-500/30",
  },
  {
    id: "okx" as const,
    name: "欧易 OKX",
    apiKey: "193fc86d-af66-4ca1-acca-0f0dfd2c506c",
    secret: "2D20485B1DF60D9DC71A2C699ABED94B",
    passphrase: "Dj168168168-",
    color: "text-blue-400",
    borderColor: "border-blue-500/30",
  },
  {
    id: "bybit" as const,
    name: "Bybit",
    apiKey: "sHUGoC59hVyFcgXACg",
    secret: "vODVLpjIdk6Nv6gymUiDdKkxdpnDOZApw82G",
    color: "text-orange-400",
    borderColor: "border-orange-500/30",
  },
];

export default function Settings() {
  const testTelegram = trpc.settings.testTelegram.useMutation();
  const utils = trpc.useUtils();
  const [connStatus, setConnStatus] = useState<Record<string, boolean | null>>({});
  const [connLoading, setConnLoading] = useState<Record<string, boolean>>({});

  const handleTestTelegram = async () => {
    try {
      const result = await testTelegram.mutateAsync();
      if (result.success) {
        toast.success("Telegram 推送测试成功！请检查您的 Telegram");
      } else {
        toast.error("Telegram 推送失败，请检查配置");
      }
    } catch (err: any) {
      toast.error(`测试失败: ${err.message}`);
    }
  };

  const handleTestConnection = async (exchange: "binance" | "okx" | "bybit") => {
    setConnLoading(prev => ({ ...prev, [exchange]: true }));
    try {
      const result = await utils.account.testConnection.fetch({ exchange });
      setConnStatus(prev => ({ ...prev, [exchange]: result.success }));
      if (result.success) {
        toast.success(`${exchange} 连接成功！`);
      } else {
        toast.error(`${exchange} 连接失败: ${(result as any).error}`);
      }
    } catch (err: any) {
      setConnStatus(prev => ({ ...prev, [exchange]: false }));
      toast.error(`连接测试失败: ${err.message}`);
    } finally {
      setConnLoading(prev => ({ ...prev, [exchange]: false }));
    }
  };

  return (
    <div>
      <PageHeader title="系统设置" description="管理交易所 API · Telegram 推送 · 信号引擎配置" />

      <Tabs defaultValue="telegram" className="w-full">
        <TabsList className="bg-secondary mb-6 flex-wrap h-auto">
          <TabsTrigger value="telegram" className="text-xs">Telegram 推送</TabsTrigger>
          <TabsTrigger value="exchanges" className="text-xs">交易所 API</TabsTrigger>
          <TabsTrigger value="engine" className="text-xs">信号引擎</TabsTrigger>
          <TabsTrigger value="tv" className="text-xs">TV 图表</TabsTrigger>
        </TabsList>

        {/* Telegram 配置 */}
        <TabsContent value="telegram">
          <div className="terminal-card p-6">
            <div className="flex items-center gap-2 mb-6">
              <Send size={16} className="text-neon-blue" />
              <h3 className="text-sm font-medium text-foreground">Telegram Bot 推送配置</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">Bot Token</Label>
                <Input
                  value="8578235073:AAEBtN-P0p9BjD-oGwdFZa0Lf5R-e72mI0g"
                  readOnly
                  className="font-mono text-xs bg-muted/20 border-border/50"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">Chat ID</Label>
                <Input
                  value="7026428558"
                  readOnly
                  className="font-mono text-xs bg-muted/20 border-border/50"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 mb-6">
              <Button
                size="sm"
                className="text-xs bg-neon-blue/20 text-neon-blue hover:bg-neon-blue/30 border border-neon-blue/30"
                onClick={handleTestTelegram}
                disabled={testTelegram.isPending}
              >
                {testTelegram.isPending
                  ? <Loader2 size={14} className="mr-1 animate-spin" />
                  : <Send size={14} className="mr-1" />}
                发送测试消息
              </Button>
              {testTelegram.data && (
                <div className="flex items-center gap-1.5 text-xs">
                  <StatusBadge success={testTelegram.data.success} />
                  <span className={testTelegram.data.success ? "text-neon-green" : "text-neon-red"}>
                    {testTelegram.data.success ? "推送成功" : "推送失败"}
                  </span>
                </div>
              )}
            </div>

            <div className="p-4 rounded bg-muted/10 border border-border/30">
              <h4 className="text-xs font-medium text-foreground mb-3">已配置推送场景</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {[
                  "🟢 LONG 做多信号",
                  "🔴 SHORT 做空信号",
                  "⚪ CLOSE 平仓信号",
                  "📊 模拟盘开仓通知",
                  "💰 模拟盘平仓通知",
                  "📈 实盘成交通知",
                  "⚠️ 系统告警通知",
                  "✅ 连接测试消息",
                ].map(item => (
                  <div key={item} className="text-xs text-muted-foreground">{item}</div>
                ))}
              </div>
            </div>
          </div>
        </TabsContent>

        {/* 交易所 API */}
        <TabsContent value="exchanges">
          <div className="space-y-4">
            {EXCHANGE_CONFIGS.map(ex => (
              <div key={ex.id} className={`terminal-card p-6 border ${ex.borderColor}`}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Wifi size={16} className={ex.color} />
                    <h3 className={`text-sm font-medium ${ex.color}`}>{ex.name}</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge
                      success={connStatus[ex.id] as boolean | null}
                      loading={connLoading[ex.id]}
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs"
                      onClick={() => handleTestConnection(ex.id)}
                      disabled={connLoading[ex.id]}
                    >
                      {connLoading[ex.id]
                        ? <Loader2 size={12} className="mr-1 animate-spin" />
                        : <Wifi size={12} className="mr-1" />}
                      测试连接
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1.5 block">API Key</Label>
                    <Input value={ex.apiKey} readOnly className="font-mono text-xs bg-muted/20 border-border/50" />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1.5 block">API Secret</Label>
                    <Input value={ex.secret.replace(/./g, "•")} readOnly className="font-mono text-xs bg-muted/20 border-border/50" />
                  </div>
                  {ex.passphrase && (
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1.5 block">Passphrase</Label>
                      <Input value={ex.passphrase.replace(/./g, "•")} readOnly className="font-mono text-xs bg-muted/20 border-border/50" />
                    </div>
                  )}
                </div>
                {connStatus[ex.id] !== undefined && connStatus[ex.id] !== null && (
                  <div className={`mt-3 p-2 rounded text-xs ${connStatus[ex.id] ? "bg-green-500/10 text-green-400 border border-green-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"}`}>
                    {connStatus[ex.id]
                      ? `✅ ${ex.name} 连接正常，API 权限验证通过`
                      : `❌ ${ex.name} 连接失败，请检查 API Key 权限或网络`}
                  </div>
                )}
              </div>
            ))}
          </div>
        </TabsContent>

        {/* 信号引擎 */}
        <TabsContent value="engine">
          <div className="terminal-card p-6">
            <div className="flex items-center gap-2 mb-6">
              <Settings2 size={16} className="text-neon-green" />
              <h3 className="text-sm font-medium text-foreground">信号引擎配置</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {[
                { label: "检测间隔", value: "60 秒" },
                { label: "信号冷却期", value: "5 分钟" },
                { label: "最低评分阈值", value: "60 分" },
                { label: "价格变化触发", value: "3%" },
                { label: "成交量放大倍数", value: "1.5x" },
                { label: "监控交易对数量", value: "8 个" },
              ].map(item => (
                <div key={item.label} className="p-3 rounded bg-muted/10 border border-border/30">
                  <div className="text-xs text-muted-foreground mb-1">{item.label}</div>
                  <div className="text-sm font-mono font-bold text-foreground">{item.value}</div>
                </div>
              ))}
            </div>
            <div className="p-4 rounded bg-muted/10 border border-border/30">
              <h4 className="text-xs font-medium text-foreground mb-2">监控交易对</h4>
              <div className="flex flex-wrap gap-2">
                {["BTC/USDT","ETH/USDT","SOL/USDT","BNB/USDT","XRP/USDT","DOGE/USDT","ADA/USDT","AVAX/USDT"].map(sym => (
                  <span key={sym} className="text-xs px-2 py-1 rounded bg-neon-green/10 text-neon-green border border-neon-green/20">{sym}</span>
                ))}
              </div>
            </div>
          </div>
        </TabsContent>

        {/* TradingView 图表 */}
        <TabsContent value="tv">
          <div className="terminal-card p-4">
            <h3 className="text-sm font-medium mb-4">TradingView 专业图表</h3>
            <div className="bg-terminal-bg border border-border rounded-lg overflow-hidden" style={{ height: "500px" }}>
              <iframe
                src="https://s.tradingview.com/widgetembed/?frameElementId=tradingview_widget&symbol=BINANCE%3ABTCUSDT.P&interval=60&hidesidetoolbar=0&symboledit=1&saveimage=1&toolbarbg=f1f3f6&studies=%5B%5D&theme=dark&style=1&timezone=Asia%2FShanghai&withdateranges=1&showpopupbutton=1&locale=zh_CN"
                className="w-full h-full border-0"
                title="TradingView Chart"
              />
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
