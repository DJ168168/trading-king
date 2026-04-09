import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, X, RefreshCw, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export default function Positions() {
  const [closeDialog, setCloseDialog] = useState<{ open: boolean; tradeId?: number; symbol?: string }>({ open: false });
  const [exitPrice, setExitPrice] = useState("");
  const [openDialog, setOpenDialog] = useState(false);
  const [openForm, setOpenForm] = useState({ symbol: "BTC", quantity: "0.01", entryPrice: "", leverage: "5" });

  const { data: positions, refetch } = trpc.positions.list.useQuery(undefined, { refetchInterval: 10000 });
  const { data: openTrades } = trpc.trades.open.useQuery(undefined, { refetchInterval: 10000 });
  const { data: snapshot } = trpc.account.snapshot.useQuery();

  const closeMutation = trpc.trades.closeManual.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        toast.success(`平仓成功！盈亏: ${data.pnl && data.pnl >= 0 ? "+" : ""}$${data.pnl?.toFixed(2)}`);
        setCloseDialog({ open: false });
        refetch();
      } else {
        toast.error(data.error ?? "平仓失败");
      }
    }
  });

  const openMutation = trpc.trades.openManual.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        toast.success(`开仓成功！${data.trade?.symbol}`);
        setOpenDialog(false);
        refetch();
      }
    },
    onError: () => toast.error("开仓失败，请检查参数")
  });

  const totalUnrealizedPnl = positions?.reduce((sum: number, p: any) => sum + (p.unrealizedPnl ?? 0), 0) ?? 0;

  return (
    <div className="p-4 lg:p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">持仓管理</h1>
          <p className="text-sm text-muted-foreground mt-0.5">实时监控当前持仓与未实现盈亏</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} className="text-xs">
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />刷新
          </Button>
          <Button size="sm" onClick={() => setOpenDialog(true)} className="text-xs">
            <Plus className="w-3.5 h-3.5 mr-1.5" />手动开仓
          </Button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="gradient-card rounded-xl p-4">
          <div className="text-2xl font-bold font-mono text-foreground">{positions?.length ?? 0}</div>
          <div className="text-xs text-muted-foreground mt-1">当前持仓数</div>
        </div>
        <div className="gradient-card rounded-xl p-4">
          <div className={cn("text-2xl font-bold font-mono", totalUnrealizedPnl >= 0 ? "text-profit" : "text-loss")}>
            {totalUnrealizedPnl >= 0 ? "+" : ""}${totalUnrealizedPnl.toFixed(2)}
          </div>
          <div className="text-xs text-muted-foreground mt-1">未实现盈亏</div>
        </div>
        <div className="gradient-card rounded-xl p-4">
          <div className="text-2xl font-bold font-mono text-foreground">
            ${snapshot?.availableBalance?.toFixed(0) ?? "--"}
          </div>
          <div className="text-xs text-muted-foreground mt-1">可用余额</div>
        </div>
        <div className="gradient-card rounded-xl p-4">
          <div className="text-2xl font-bold font-mono text-foreground">{openTrades?.length ?? 0}</div>
          <div className="text-xs text-muted-foreground mt-1">未平仓订单</div>
        </div>
      </div>

      {/* Positions Table */}
      <div className="gradient-card rounded-xl overflow-hidden">
        <div className="p-4 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">当前持仓</h3>
        </div>
        {positions && positions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  {["标的", "数量", "开仓价", "当前价", "未实现盈亏", "止损", "止盈1", "杠杆", "操作"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {positions.map((pos: any) => {
                  const pnl = pos.unrealizedPnl ?? 0;
                  const pnlPct = pos.unrealizedPnlPercent ?? 0;
                  const isProfit = pnl >= 0;
                  const trade = openTrades?.find((t: any) => t.id === pos.tradeId);
                  return (
                    <tr key={pos.id} className="border-b border-border/50 hover:bg-accent/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-profit" />
                          <span className="font-mono font-bold text-foreground">{pos.symbol}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-sm text-foreground">{pos.quantity}</td>
                      <td className="px-4 py-3 font-mono text-sm text-foreground">${pos.entryPrice.toFixed(4)}</td>
                      <td className="px-4 py-3 font-mono text-sm text-foreground">${pos.currentPrice.toFixed(4)}</td>
                      <td className="px-4 py-3">
                        <div className={cn("font-mono text-sm font-medium", isProfit ? "text-profit" : "text-loss")}>
                          {isProfit ? "+" : ""}${pnl.toFixed(2)}
                        </div>
                        <div className={cn("text-xs font-mono", isProfit ? "text-profit" : "text-loss")}>
                          {isProfit ? "+" : ""}{pnlPct.toFixed(2)}%
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-sm text-loss">{pos.stopLoss ? `$${pos.stopLoss.toFixed(4)}` : "--"}</td>
                      <td className="px-4 py-3 font-mono text-sm text-profit">{pos.takeProfit1 ? `$${pos.takeProfit1.toFixed(4)}` : "--"}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 bg-fomo-subtle text-fomo text-xs rounded-md font-mono">{pos.leverage}x</span>
                      </td>
                      <td className="px-4 py-3">
                        {trade && (
                          <Button variant="outline" size="sm" className="text-xs text-loss border-loss/30 hover:bg-loss-subtle"
                            onClick={() => { setCloseDialog({ open: true, tradeId: trade.id, symbol: pos.symbol }); setExitPrice(pos.currentPrice.toString()); }}>
                            <X className="w-3 h-3 mr-1" />平仓
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-16 text-muted-foreground">
            <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="text-sm font-medium">暂无持仓</p>
            <p className="text-xs mt-1">点击"手动开仓"创建测试持仓</p>
          </div>
        )}
      </div>

      {/* Close Dialog */}
      <Dialog open={closeDialog.open} onOpenChange={(open) => setCloseDialog({ open })}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">平仓 {closeDialog.symbol}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">出场价格</label>
              <input value={exitPrice} onChange={e => setExitPrice(e.target.value)} type="number" step="0.0001"
                className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setCloseDialog({ open: false })}>取消</Button>
              <Button className="flex-1 bg-loss hover:bg-loss/90 text-white"
                onClick={() => closeDialog.tradeId && closeMutation.mutate({ tradeId: closeDialog.tradeId, exitPrice: parseFloat(exitPrice), closeReason: "手动平仓" })}
                disabled={closeMutation.isPending || !exitPrice}>
                确认平仓
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Open Dialog */}
      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">手动开仓</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            {[
              { label: "标的", key: "symbol", placeholder: "BTC" },
              { label: "数量", key: "quantity", placeholder: "0.01" },
              { label: "开仓价格", key: "entryPrice", placeholder: "45000" },
              { label: "杠杆倍数", key: "leverage", placeholder: "5" },
            ].map(({ label, key, placeholder }) => (
              <div key={key}>
                <label className="text-xs text-muted-foreground mb-1 block">{label}</label>
                <input value={(openForm as any)[key]} onChange={e => setOpenForm(f => ({ ...f, [key]: e.target.value }))}
                  placeholder={placeholder} className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
              </div>
            ))}
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setOpenDialog(false)}>取消</Button>
              <Button className="flex-1"
                onClick={() => openMutation.mutate({ symbol: openForm.symbol, quantity: parseFloat(openForm.quantity), entryPrice: parseFloat(openForm.entryPrice), leverage: parseInt(openForm.leverage) })}
                disabled={openMutation.isPending || !openForm.entryPrice}>
                确认开仓
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
