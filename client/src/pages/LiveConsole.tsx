import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useState } from "react";

export default function LiveConsole() {
  const [symbol, setSymbol] = useState("BTCUSDT");
  const [amount, setAmount] = useState("100");
  const [leverage, setLeverage] = useState("5");

  return (
    <div>
      <PageHeader title="🖥 实盘控制台" description="币安 · 欧易实盘下单" />

      {/* Warning */}
      <div className="terminal-card p-4 mb-4 border-neon-red/30 bg-neon-red/5">
        <p className="text-xs text-neon-red font-medium">⚠ 实盘交易风险提示</p>
        <p className="text-[10px] text-muted-foreground mt-1">实盘交易涉及真实资金，请确保已充分了解风险。建议先在模拟环境中验证策略。</p>
      </div>

      <Tabs defaultValue="binance" className="w-full">
        <TabsList className="bg-secondary mb-4">
          <TabsTrigger value="binance" className="text-xs">币安 Binance</TabsTrigger>
          <TabsTrigger value="okx" className="text-xs">欧易 OKX</TabsTrigger>
        </TabsList>

        <TabsContent value="binance">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="terminal-card p-4">
              <h3 className="text-sm font-medium mb-4">快速下单</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">交易对</label>
                  <Input value={symbol} onChange={(e) => setSymbol(e.target.value)} className="h-8 text-xs bg-secondary" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">下单金额 (USDT)</label>
                  <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="h-8 text-xs bg-secondary" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">杠杆倍数</label>
                  <Input type="number" value={leverage} onChange={(e) => setLeverage(e.target.value)} className="h-8 text-xs bg-secondary" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Button className="bg-neon-green/20 text-neon-green hover:bg-neon-green/30 border border-neon-green/30 text-xs" onClick={() => toast.info("请先配置 API Key")}>
                    做多 / 买入
                  </Button>
                  <Button className="bg-neon-red/20 text-neon-red hover:bg-neon-red/30 border border-neon-red/30 text-xs" onClick={() => toast.info("请先配置 API Key")}>
                    做空 / 卖出
                  </Button>
                </div>
              </div>
            </div>

            <div className="terminal-card p-4">
              <h3 className="text-sm font-medium mb-4">API 连接状态</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
                  <span className="text-xs text-foreground">币安 API</span>
                  <span className="text-xs px-2 py-0.5 rounded bg-neon-red/10 text-neon-red">未连接</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
                  <span className="text-xs text-foreground">测试网模式</span>
                  <span className="text-xs px-2 py-0.5 rounded bg-neon-green/10 text-neon-green">已启用</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
                  <span className="text-xs text-foreground">自动交易</span>
                  <span className="text-xs px-2 py-0.5 rounded bg-neon-red/10 text-neon-red">已禁用</span>
                </div>
                <Button variant="outline" size="sm" className="text-xs w-full" onClick={() => toast.info("请在系统设置中配置 API Key")}>
                  配置 API Key
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="okx">
          <div className="terminal-card p-4 text-center py-12">
            <p className="text-sm text-muted-foreground">欧易 OKX 接口开发中</p>
            <p className="text-xs text-muted-foreground/60 mt-1">敬请期待</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
