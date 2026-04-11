import { useState } from "react";
import { Activity, Plus, RefreshCw, Wallet, X, Zap } from "lucide-react";
import { toast } from "sonner";
import EmptyState from "@/components/EmptyState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";

function PositionSkeleton() {
  return (
    <div className="space-y-2 p-4">
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="rounded-xl border border-border/50 bg-accent/30 p-3">
          <div className="grid grid-cols-5 gap-3">
            <Skeleton className="h-4 w-14 bg-primary/10" />
            <Skeleton className="h-4 w-16 bg-primary/10" />
            <Skeleton className="h-4 w-20 bg-primary/10" />
            <Skeleton className="h-4 w-16 bg-primary/10" />
            <Skeleton className="h-4 w-12 bg-primary/10" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Positions() {
  const [closeDialog, setCloseDialog] = useState<{ open: boolean; tradeId?: number; symbol?: string }>({ open: false });
  const [exitPrice, setExitPrice] = useState("");
  const [openDialog, setOpenDialog] = useState(false);
  const [openForm, setOpenForm] = useState({ symbol: "BTC", quantity: "0.01", entryPrice: "", leverage: "5" });

  const positionsQuery = trpc.positions.list.useQuery(undefined, { refetchInterval: 10000 });
  const openTradesQuery = trpc.trades.open.useQuery(undefined, { refetchInterval: 10000 });
  const snapshotQuery = trpc.account.snapshot.useQuery();

  const paperPositionsQuery = trpc.paperTrading.getPositions.useQuery(undefined, { refetchInterval: 5000 });
  const paperAccountQuery = trpc.paperTrading.getAccount.useQuery(undefined, { refetchInterval: 5000 });
  const engineStatusQuery = trpc.paperTrading.engineStatus.useQuery(undefined, { refetchInterval: 5000 });

  const positions = positionsQuery.data ?? [];
  const openTrades = openTradesQuery.data ?? [];
  const snapshot = snapshotQuery.data;
  const paperPositions = paperPositionsQuery.data ?? [];
  const paperAccount = paperAccountQuery.data;
  const engineStatus = engineStatusQuery.data;

  const closeMutation = trpc.trades.closeManual.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        toast.success(`平仓成功，盈亏 ${data.pnl && data.pnl >= 0 ? "+" : ""}$${data.pnl?.toFixed(2)}`);
        setCloseDialog({ open: false });
        positionsQuery.refetch();
        openTradesQuery.refetch();
      } else {
        toast.error(data.error ?? "平仓失败");
      }
    },
  });

  const closePaperMutation = trpc.paperTrading.closePosition.useMutation({
    onSuccess: (data) => {
      const pnl = data.pnl ?? 0;
      if (pnl >= 0) {
        toast.success(`模拟盘平仓盈利 +$${pnl.toFixed(2)}`);
      } else {
        toast.error(`模拟盘平仓亏损 $${pnl.toFixed(2)}`);
      }
      paperPositionsQuery.refetch();
      paperAccountQuery.refetch();
    },
  });

  const openMutation = trpc.trades.openManual.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        toast.success(`开仓成功：${data.trade?.symbol}`);
        setOpenDialog(false);
        positionsQuery.refetch();
        openTradesQuery.refetch();
      }
    },
    onError: () => toast.error("开仓失败，请检查参数"),
  });

  const totalUnrealizedPnl = positions.reduce((sum: number, p: any) => sum + (p.unrealizedPnl ?? 0), 0);
  const paperTotalPnl = paperPositions.reduce((sum: number, p: any) => sum + (p.unrealizedPnl ?? 0), 0);
  const loading = positionsQuery.isLoading || paperPositionsQuery.isLoading || engineStatusQuery.isLoading;

  return (
    <div className="space-y-5 p-4 lg:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">持仓管理</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">统一监控实盘与模拟盘持仓，观察盈亏与风控执行状态。</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              positionsQuery.refetch();
              paperPositionsQuery.refetch();
              openTradesQuery.refetch();
              paperAccountQuery.refetch();
            }}
            className="text-xs"
          >
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />刷新
          </Button>
          <Button size="sm" onClick={() => setOpenDialog(true)} className="text-xs">
            <Plus className="mr-1.5 h-3.5 w-3.5" />手动开仓
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "实盘持仓数", value: positions.length, tone: "text-foreground", helper: "真实风险敞口" },
          { label: "实盘未实现盈亏", value: `${totalUnrealizedPnl >= 0 ? "+" : ""}$${totalUnrealizedPnl.toFixed(2)}`, tone: totalUnrealizedPnl >= 0 ? "text-profit" : "text-loss", helper: "动态浮盈浮亏" },
          { label: "模拟盘持仓数", value: paperPositions.length, tone: "text-yellow-400", helper: "策略沙盒验证" },
          { label: "模拟盘未实现盈亏", value: `${paperTotalPnl >= 0 ? "+" : ""}$${paperTotalPnl.toFixed(2)}`, tone: paperTotalPnl >= 0 ? "text-profit" : "text-loss", helper: "低风险观察区" },
        ].map((item) => (
          <div key={item.label} className="gradient-card rounded-2xl border border-primary/10 p-4">
            {loading ? (
              <div className="space-y-2">
                <Skeleton className="h-8 w-16 bg-primary/10" />
                <Skeleton className="h-3 w-20 bg-primary/10" />
                <Skeleton className="h-3 w-full bg-primary/10" />
              </div>
            ) : (
              <>
                <div className={cn("text-2xl font-bold font-mono", item.tone)}>{item.value}</div>
                <div className="mt-1 text-xs text-muted-foreground">{item.label}</div>
                <div className="mt-2 text-[11px] text-muted-foreground/90">{item.helper}</div>
              </>
            )}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="gradient-card rounded-2xl p-4 xl:col-span-2">
          <h3 className="mb-3 text-sm font-semibold text-foreground">账户与仓位说明</h3>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-xl border border-primary/15 bg-primary/5 p-3 text-xs leading-6 text-muted-foreground">
              <span className="font-medium text-foreground">实盘持仓：</span>
              由真实账户资金支持，适合观察 ValueScan 推送后的执行稳定性与滑点风险。
            </div>
            <div className="rounded-xl border border-border/60 bg-background/40 p-3 text-xs leading-6 text-muted-foreground">
              <span className="font-medium text-foreground">模拟盘持仓：</span>
              用于策略回放与参数试错，适合先验证 Alpha / FOMO 共振逻辑。
            </div>
            <div className="rounded-xl border border-border/60 bg-background/40 p-3 text-xs leading-6 text-muted-foreground">
              <span className="font-medium text-foreground">可用余额：</span>
              应始终保留足够缓冲，避免在高波动时因仓位过满而失去应对空间。
            </div>
          </div>
        </div>

        <div className="gradient-card rounded-2xl p-4">
          <h3 className="mb-3 text-sm font-semibold text-foreground">账户快照</h3>
          {snapshotQuery.isLoading || paperAccountQuery.isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-5 w-24 bg-primary/10" />
              <Skeleton className="h-16 w-full rounded-xl bg-primary/10" />
              <Skeleton className="h-16 w-full rounded-xl bg-primary/10" />
            </div>
          ) : (
            <div className="space-y-3 text-xs">
              <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3">
                <div className="mb-1 flex items-center justify-between text-red-300">
                  <span>实盘引擎</span>
                  <span>{engineStatus?.live?.running ? "运行中" : "已停止"}</span>
                </div>
                <div className="text-muted-foreground">可用余额：${snapshot?.availableBalance?.toFixed(0) ?? "--"}</div>
              </div>
              <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/10 p-3">
                <div className="mb-1 flex items-center justify-between text-yellow-300">
                  <span>模拟盘引擎</span>
                  <span>{engineStatus?.paper?.running ? "运行中" : "已停止"}</span>
                </div>
                <div className="text-muted-foreground">模拟余额：${(paperAccount?.balance ?? 10000).toFixed(0)}</div>
              </div>
            </div>
          )}
        </div>
      </div>

      <Tabs defaultValue="live" className="space-y-4">
        <TabsList className="bg-card/50">
          <TabsTrigger value="live" className="flex items-center gap-1.5">
            <span className={cn("h-1.5 w-1.5 rounded-full", engineStatus?.live?.running ? "bg-red-500 animate-pulse" : "bg-muted-foreground")} />
            实盘持仓 ({positions.length})
          </TabsTrigger>
          <TabsTrigger value="paper" className="flex items-center gap-1.5">
            <span className={cn("h-1.5 w-1.5 rounded-full", engineStatus?.paper?.running ? "bg-yellow-400 animate-pulse" : "bg-muted-foreground")} />
            模拟盘持仓 ({paperPositions.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="live">
          <div className="gradient-card overflow-hidden rounded-2xl">
            <div className="flex items-center justify-between border-b border-border p-4">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Zap className="h-4 w-4 text-red-400" />实盘持仓
              </h3>
              <div className="flex items-center gap-2">
                <Badge variant={engineStatus?.live?.running ? "default" : "secondary"} className={engineStatus?.live?.running ? "border-red-500/30 bg-red-500/20 text-xs text-red-400" : "text-xs"}>
                  {engineStatus?.live?.running ? "● 引擎运行中" : "○ 引擎停止"}
                </Badge>
                <span className="text-xs text-muted-foreground">可用: ${snapshot?.availableBalance?.toFixed(0) ?? "--"}</span>
              </div>
            </div>

            {positionsQuery.isLoading ? (
              <PositionSkeleton />
            ) : positions.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      {["标的", "数量", "开仓价", "当前价", "未实现盈亏", "止损", "止盈", "杠杆", "操作"].map((h) => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {positions.map((pos: any) => {
                      const pnl = pos.unrealizedPnl ?? 0;
                      const pnlPct = pos.unrealizedPnlPercent ?? 0;
                      const isProfit = pnl >= 0;
                      const trade = openTrades.find((t: any) => t.id === pos.tradeId);
                      return (
                        <tr key={pos.id} className="border-b border-border/50 transition-colors hover:bg-accent/30">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="h-2 w-2 rounded-full bg-red-400" />
                              <span className="font-mono font-bold text-foreground">{pos.symbol}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm font-mono text-foreground">{pos.quantity}</td>
                          <td className="px-4 py-3 text-sm font-mono text-foreground">${pos.entryPrice.toFixed(4)}</td>
                          <td className="px-4 py-3 text-sm font-mono text-foreground">${pos.currentPrice.toFixed(4)}</td>
                          <td className="px-4 py-3">
                            <div className={cn("text-sm font-medium font-mono", isProfit ? "text-profit" : "text-loss")}>
                              {isProfit ? "+" : ""}${pnl.toFixed(2)}
                            </div>
                            <div className={cn("text-xs font-mono", isProfit ? "text-profit" : "text-loss")}>
                              {isProfit ? "+" : ""}{pnlPct.toFixed(2)}%
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm font-mono text-loss">{pos.stopLoss ? `$${pos.stopLoss.toFixed(4)}` : "--"}</td>
                          <td className="px-4 py-3 text-sm font-mono text-profit">{pos.takeProfit1 ? `$${pos.takeProfit1.toFixed(4)}` : "--"}</td>
                          <td className="px-4 py-3">
                            <span className="rounded-md bg-fomo-subtle px-2 py-0.5 text-xs font-mono text-fomo">{pos.leverage}x</span>
                          </td>
                          <td className="px-4 py-3">
                            {trade && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="border-loss/30 text-xs text-loss hover:bg-loss-subtle"
                                onClick={() => {
                                  setCloseDialog({ open: true, tradeId: trade.id, symbol: pos.symbol });
                                  setExitPrice(pos.currentPrice.toString());
                                }}
                              >
                                <X className="mr-1 h-3 w-3" />平仓
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
              <EmptyState
                icon={<Wallet className="h-10 w-10" />}
                title="实盘账户当前为空仓"
                description="系统暂未持有任何真实仓位。你可以先手动开仓做验证，或等待 ValueScan 实时信号触发自动策略。"
                hint="如果你期待自动入场，请确认实盘引擎已启动、ValueScan 已保持在线，并且账户可用余额充足。"
                action={<Button size="sm" onClick={() => setOpenDialog(true)}>创建首个实盘仓位</Button>}
                className="m-4 py-10"
              />
            )}
          </div>
        </TabsContent>

        <TabsContent value="paper">
          <div className="gradient-card overflow-hidden rounded-2xl">
            <div className="flex items-center justify-between border-b border-border p-4">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Activity className="h-4 w-4 text-yellow-400" />模拟盘持仓
              </h3>
              <div className="flex items-center gap-2">
                <Badge variant={engineStatus?.paper?.running ? "default" : "secondary"} className={engineStatus?.paper?.running ? "border-yellow-500/30 bg-yellow-500/20 text-xs text-yellow-400" : "text-xs"}>
                  {engineStatus?.paper?.running ? "● 引擎运行中" : "○ 引擎停止"}
                </Badge>
                <span className="text-xs text-muted-foreground">模拟余额: ${(paperAccount?.balance ?? 10000).toFixed(0)}</span>
              </div>
            </div>

            {paperPositionsQuery.isLoading ? (
              <PositionSkeleton />
            ) : paperPositions.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      {["标的", "方向", "开仓价", "当前价", "未实现盈亏", "止损", "止盈", "杠杆", "触发策略", "操作"].map((h) => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {paperPositions.map((pos: any) => {
                      const pnl = pos.unrealizedPnl ?? 0;
                      const pnlPct = pos.unrealizedPnlPct ?? 0;
                      const isProfit = pnl >= 0;
                      return (
                        <tr key={pos.id} className="border-b border-border/50 transition-colors hover:bg-accent/30">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="h-2 w-2 rounded-full bg-yellow-400" />
                              <span className="font-mono font-bold text-foreground">{pos.symbol}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant={pos.direction === "long" ? "default" : "destructive"} className={pos.direction === "long" ? "border-green-500/30 bg-green-500/20 text-xs text-green-400" : "text-xs"}>
                              {pos.direction === "long" ? "做多" : "做空"}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-sm font-mono text-foreground">${(pos.entryPrice ?? 0).toFixed(4)}</td>
                          <td className="px-4 py-3 text-sm font-mono text-foreground">${(pos.currentPrice ?? 0).toFixed(4)}</td>
                          <td className="px-4 py-3">
                            <div className={cn("text-sm font-medium font-mono", isProfit ? "text-profit" : "text-loss")}>
                              {isProfit ? "+" : ""}${pnl.toFixed(2)}
                            </div>
                            <div className={cn("text-xs font-mono", isProfit ? "text-profit" : "text-loss")}>
                              {isProfit ? "+" : ""}{pnlPct.toFixed(2)}%
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm font-mono text-loss">{pos.stopLoss ? `$${pos.stopLoss.toFixed(4)}` : "--"}</td>
                          <td className="px-4 py-3 text-sm font-mono text-profit">{pos.takeProfit ? `$${pos.takeProfit.toFixed(4)}` : "--"}</td>
                          <td className="px-4 py-3">
                            <span className="rounded-md bg-yellow-500/10 px-2 py-0.5 text-xs font-mono text-yellow-400">{pos.leverage ?? 5}x</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="block max-w-[140px] truncate text-xs text-muted-foreground" title={pos.signalReason ?? ""}>
                              {pos.signalReason ? pos.signalReason.substring(0, 24) + (pos.signalReason.length > 24 ? "..." : "") : "--"}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-yellow-500/30 text-xs text-yellow-400 hover:bg-yellow-500/10"
                              onClick={() => closePaperMutation.mutate({ positionId: pos.id })}
                              disabled={closePaperMutation.isPending}
                            >
                              <X className="mr-1 h-3 w-3" />平仓
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState
                icon={<Activity className="h-10 w-10" />}
                title="模拟盘当前没有仓位"
                description="这通常意味着策略还在等待更高质量的信号，或者模拟盘引擎尚未完成自动入场。"
                hint="建议先保持模拟盘运行，用于验证 FOMO 与 Alpha 共振策略，再决定是否同步到实盘。"
                className="m-4 py-10"
              />
            )}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={closeDialog.open} onOpenChange={(open) => setCloseDialog({ open })}>
        <DialogContent className="border-border bg-card">
          <DialogHeader>
            <DialogTitle className="text-foreground">平仓 {closeDialog.symbol}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <label className="mb-1.5 block text-xs text-muted-foreground">出场价格</label>
              <input
                value={exitPrice}
                onChange={(e) => setExitPrice(e.target.value)}
                type="number"
                step="0.0001"
                className="w-full rounded-md border border-border bg-input px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setCloseDialog({ open: false })}>取消</Button>
              <Button
                className="flex-1 bg-loss text-white hover:bg-loss/90"
                onClick={() => closeDialog.tradeId && closeMutation.mutate({ tradeId: closeDialog.tradeId, exitPrice: parseFloat(exitPrice), closeReason: "手动平仓" })}
                disabled={closeMutation.isPending || !exitPrice}
              >
                确认平仓
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent className="border-border bg-card">
          <DialogHeader>
            <DialogTitle className="text-foreground">手动开仓（实盘）</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            {[
              { label: "标的", key: "symbol", placeholder: "BTC" },
              { label: "数量", key: "quantity", placeholder: "0.01" },
              { label: "开仓价格", key: "entryPrice", placeholder: "45000" },
              { label: "杠杆倍数", key: "leverage", placeholder: "5" },
            ].map(({ label, key, placeholder }) => (
              <div key={key}>
                <label className="mb-1 block text-xs text-muted-foreground">{label}</label>
                <input
                  value={(openForm as any)[key]}
                  onChange={(e) => setOpenForm((f) => ({ ...f, [key]: e.target.value }))}
                  placeholder={placeholder}
                  className="w-full rounded-md border border-border bg-input px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
            ))}
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setOpenDialog(false)}>取消</Button>
              <Button
                className="flex-1"
                onClick={() => openMutation.mutate({ symbol: openForm.symbol, quantity: parseFloat(openForm.quantity), entryPrice: parseFloat(openForm.entryPrice), leverage: parseInt(openForm.leverage) })}
                disabled={openMutation.isPending || !openForm.entryPrice}
              >
                确认开仓
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
