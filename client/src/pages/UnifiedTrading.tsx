import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import EmptyState from "@/components/EmptyState";
import { Layers, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

const exchanges = ["模拟交易", "币安", "欧易", "Bybit", "Gate", "Bitget"];

export default function UnifiedTrading() {
  const [exchange, setExchange] = useState("模拟交易");
  const [symbol, setSymbol] = useState("BTCUSDT");
  const [orderType, setOrderType] = useState<"market" | "limit">("market");

  return (
    <div>
      <PageHeader title="🔗 统一交易面板" description="模拟 + 实盘 · 多交易所统一下单" />

      {/* Exchange Selector */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {exchanges.map((ex) => (
          <Button key={ex} variant={exchange === ex ? "default" : "outline"} size="sm" className="text-xs" onClick={() => setExchange(ex)}>
            {ex}
          </Button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Order Panel */}
        <div className="terminal-card p-4">
          <h3 className="text-sm font-medium mb-3">下单面板 · {exchange}</h3>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">交易对</label>
              <Input value={symbol} onChange={(e) => setSymbol(e.target.value)} className="h-8 text-xs bg-secondary" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">订单类型</label>
              <div className="flex gap-2">
                <Button variant={orderType === "market" ? "default" : "outline"} size="sm" className="text-xs flex-1" onClick={() => setOrderType("market")}>市价</Button>
                <Button variant={orderType === "limit" ? "default" : "outline"} size="sm" className="text-xs flex-1" onClick={() => setOrderType("limit")}>限价</Button>
              </div>
            </div>
            {orderType === "limit" && (
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">限价价格</label>
                <Input type="number" placeholder="输入价格" className="h-8 text-xs bg-secondary" />
              </div>
            )}
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">数量 (USDT)</label>
              <Input type="number" placeholder="100" className="h-8 text-xs bg-secondary" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">杠杆</label>
              <div className="flex gap-1">
                {[1, 2, 3, 5, 10, 20].map((l) => (
                  <Button key={l} variant="outline" size="sm" className="text-xs flex-1 h-7">{l}x</Button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-2">
              <Button className="bg-neon-green/20 text-neon-green hover:bg-neon-green/30 border border-neon-green/30 text-xs" onClick={() => toast.success(`${exchange} 做多下单`)}>
                做多
              </Button>
              <Button className="bg-neon-red/20 text-neon-red hover:bg-neon-red/30 border border-neon-red/30 text-xs" onClick={() => toast.success(`${exchange} 做空下单`)}>
                做空
              </Button>
            </div>
          </div>
        </div>

        {/* Positions & Orders */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="positions" className="w-full">
            <TabsList className="bg-secondary mb-3">
              <TabsTrigger value="positions" className="text-xs">当前持仓</TabsTrigger>
              <TabsTrigger value="orders" className="text-xs">挂单</TabsTrigger>
              <TabsTrigger value="history" className="text-xs">历史</TabsTrigger>
            </TabsList>

            <TabsContent value="positions">
              <div className="terminal-card p-4">
                <EmptyState icon={<TrendingUp size={40} />} title="暂无持仓" description="下单后持仓将显示在这里" />
              </div>
            </TabsContent>

            <TabsContent value="orders">
              <div className="terminal-card p-4">
                <EmptyState icon={<Layers size={40} />} title="暂无挂单" description="使用限价单后挂单将显示在这里" />
              </div>
            </TabsContent>

            <TabsContent value="history">
              <div className="terminal-card p-4">
                <EmptyState icon={<Layers size={40} />} title="暂无历史记录" description="交易完成后记录将显示在这里" />
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
