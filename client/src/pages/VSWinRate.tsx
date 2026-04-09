import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, TrendingUp, TrendingDown, Clock, Plus, RefreshCw, CheckCircle, XCircle, Loader2 } from "lucide-react";

const SIGNAL_TYPES = [
  { value: "alpha", label: "Alpha ⚡ 信号" },
  { value: "fomo", label: "FOMO 🔥 信号" },
  { value: "alpha_fomo", label: "Alpha+FOMO 双重共振" },
  { value: "fund_inflow", label: "资金大幅流入" },
  { value: "whale_cost_below", label: "低于主力成本" },
  { value: "resonance_75", label: "共振评分≥75" },
  { value: "other", label: "其他" },
];

function WinRateBadge({ winRate }: { winRate: number }) {
  if (winRate >= 70) return <Badge className="bg-emerald-500 text-white">{winRate}% 高胜率</Badge>;
  if (winRate >= 55) return <Badge className="bg-yellow-500 text-white">{winRate}% 中等</Badge>;
  return <Badge className="bg-red-500 text-white">{winRate}% 低胜率</Badge>;
}

function ResultBadge({ result }: { result: string }) {
  if (result === "win") return <Badge className="bg-emerald-500 text-white flex items-center gap-1"><CheckCircle className="w-3 h-3" />盈利</Badge>;
  if (result === "loss") return <Badge className="bg-red-500 text-white flex items-center gap-1"><XCircle className="w-3 h-3" />亏损</Badge>;
  return <Badge variant="outline" className="flex items-center gap-1"><Clock className="w-3 h-3" />待定</Badge>;
}

export default function VSWinRate() {
  const { user } = useAuth();
  const [showAdd, setShowAdd] = useState(false);
  const [showUpdate, setShowUpdate] = useState<number | null>(null);
  const [filterType, setFilterType] = useState<string>("all");
  const [filterDir, setFilterDir] = useState<string>("all");

  // 表单状态
  const [form, setForm] = useState({
    symbol: "",
    signalType: "alpha",
    signalName: "",
    direction: "long" as "long" | "short" | "neutral",
    entryPrice: "",
    notes: "",
  });
  const [updateForm, setUpdateForm] = useState({
    exitPrice24h: "",
    exitPrice48h: "",
    pnlPct24h: "",
    pnlPct48h: "",
    result: "pending" as "win" | "loss" | "pending",
    notes: "",
  });

  const utils = trpc.useUtils();
  const { data: winRateData, isLoading: loadingWR } = trpc.vsStats.winRate.useQuery();
  const { data: listData, isLoading: loadingList } = trpc.vsStats.list.useQuery({
    limit: 200,
    signalType: filterType !== "all" ? filterType : undefined,
    direction: filterDir !== "all" ? filterDir : undefined,
  });

  const addMutation = trpc.vsStats.add.useMutation({
    onSuccess: () => {
      toast.success("信号记录已添加");
      setShowAdd(false);
      setForm({ symbol: "", signalType: "alpha", signalName: "", direction: "long", entryPrice: "", notes: "" });
      utils.vsStats.winRate.invalidate();
      utils.vsStats.list.invalidate();
    },
    onError: (e) => toast.error("添加失败: " + e.message),
  });

  const updateMutation = trpc.vsStats.update.useMutation({
    onSuccess: () => {
      toast.success("信号结果已更新");
      setShowUpdate(null);
      utils.vsStats.winRate.invalidate();
      utils.vsStats.list.invalidate();
    },
    onError: (e) => toast.error("更新失败: " + e.message),
  });

  const handleAdd = () => {
    if (!form.symbol) { toast.error("请输入交易对"); return; }
    addMutation.mutate({
      symbol: form.symbol.toUpperCase(),
      signalType: form.signalType,
      signalName: form.signalName || undefined,
      direction: form.direction,
      entryPrice: form.entryPrice ? parseFloat(form.entryPrice) : undefined,
      notes: form.notes || undefined,
    });
  };

  const handleUpdate = (id: number) => {
    updateMutation.mutate({
      id,
      exitPrice24h: updateForm.exitPrice24h ? parseFloat(updateForm.exitPrice24h) : undefined,
      exitPrice48h: updateForm.exitPrice48h ? parseFloat(updateForm.exitPrice48h) : undefined,
      pnlPct24h: updateForm.pnlPct24h ? parseFloat(updateForm.pnlPct24h) : undefined,
      pnlPct48h: updateForm.pnlPct48h ? parseFloat(updateForm.pnlPct48h) : undefined,
      result: updateForm.result,
      notes: updateForm.notes || undefined,
    });
  };

  const openUpdate = (item: any) => {
    setUpdateForm({
      exitPrice24h: item.exitPrice24h?.toString() ?? "",
      exitPrice48h: item.exitPrice48h?.toString() ?? "",
      pnlPct24h: item.pnlPct24h?.toString() ?? "",
      pnlPct48h: item.pnlPct48h?.toString() ?? "",
      result: item.result ?? "pending",
      notes: item.notes ?? "",
    });
    setShowUpdate(item.id);
  };

  return (
    <div className="p-6 space-y-6">
      {/* 标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <BarChart3 className="w-7 h-7 text-yellow-400" />
            ValueScan 信号历史胜率
          </h1>
          <p className="text-gray-400 text-sm mt-1">记录每次 ValueScan 信号的后续涨跌幅，自动统计各类型信号的真实历史胜率</p>
        </div>
        {user && (
          <Button onClick={() => setShowAdd(true)} className="bg-yellow-500 hover:bg-yellow-600 text-black font-semibold">
            <Plus className="w-4 h-4 mr-2" />记录新信号
          </Button>
        )}
      </div>

      {/* 胜率概览 */}
      {loadingWR ? (
        <div className="flex items-center justify-center h-24"><Loader2 className="w-6 h-6 animate-spin text-yellow-400" /></div>
      ) : winRateData ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-gray-900 border-gray-700">
            <CardContent className="p-4">
              <div className="text-gray-400 text-xs mb-1">总信号数</div>
              <div className="text-2xl font-bold text-white">{winRateData.total}</div>
            </CardContent>
          </Card>
          <Card className="bg-gray-900 border-gray-700">
            <CardContent className="p-4">
              <div className="text-gray-400 text-xs mb-1">综合胜率</div>
              <div className="text-2xl font-bold text-emerald-400">{winRateData.winRate}%</div>
            </CardContent>
          </Card>
          <Card className="bg-gray-900 border-gray-700">
            <CardContent className="p-4">
              <div className="text-gray-400 text-xs mb-1">盈利 / 亏损</div>
              <div className="text-xl font-bold">
                <span className="text-emerald-400">{winRateData.win}</span>
                <span className="text-gray-500 mx-1">/</span>
                <span className="text-red-400">{winRateData.loss}</span>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gray-900 border-gray-700">
            <CardContent className="p-4">
              <div className="text-gray-400 text-xs mb-1">待定（未出结果）</div>
              <div className="text-2xl font-bold text-yellow-400">{winRateData.pending}</div>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {/* 按类型胜率 */}
      {winRateData && Object.keys(winRateData.byType).length > 0 && (
        <Card className="bg-gray-900 border-gray-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-white text-base">各信号类型胜率</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(winRateData.byType)
                .sort(([, a], [, b]) => b.winRate - a.winRate)
                .map(([type, stats]) => (
                  <div key={type} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-300 text-sm">{SIGNAL_TYPES.find(t => t.value === type)?.label ?? type}</span>
                      <span className="text-gray-500 text-xs">({stats.total} 次)</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-32 bg-gray-700 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${stats.winRate >= 70 ? "bg-emerald-500" : stats.winRate >= 55 ? "bg-yellow-500" : "bg-red-500"}`}
                          style={{ width: `${stats.winRate}%` }}
                        />
                      </div>
                      <WinRateBadge winRate={stats.winRate} />
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 信号历史列表 */}
      <Card className="bg-gray-900 border-gray-700">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-white text-base">信号历史记录</CardTitle>
            <div className="flex gap-2">
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-36 bg-gray-800 border-gray-600 text-white text-xs h-8">
                  <SelectValue placeholder="信号类型" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-600">
                  <SelectItem value="all" className="text-white">全部类型</SelectItem>
                  {SIGNAL_TYPES.map(t => (
                    <SelectItem key={t.value} value={t.value} className="text-white">{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterDir} onValueChange={setFilterDir}>
                <SelectTrigger className="w-24 bg-gray-800 border-gray-600 text-white text-xs h-8">
                  <SelectValue placeholder="方向" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-600">
                  <SelectItem value="all" className="text-white">全部</SelectItem>
                  <SelectItem value="long" className="text-white">做多</SelectItem>
                  <SelectItem value="short" className="text-white">做空</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={() => { utils.vsStats.list.invalidate(); utils.vsStats.winRate.invalidate(); }} className="h-8 border-gray-600 text-gray-300">
                <RefreshCw className="w-3 h-3" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loadingList ? (
            <div className="flex items-center justify-center h-32"><Loader2 className="w-6 h-6 animate-spin text-yellow-400" /></div>
          ) : !listData || listData.length === 0 ? (
            <div className="text-center text-gray-500 py-12">
              <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>暂无信号记录</p>
              <p className="text-xs mt-1">点击「记录新信号」开始追踪 ValueScan 信号的历史胜率</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-400 text-xs border-b border-gray-700">
                    <th className="text-left py-2 pr-4">交易对</th>
                    <th className="text-left py-2 pr-4">信号类型</th>
                    <th className="text-left py-2 pr-4">方向</th>
                    <th className="text-right py-2 pr-4">入场价</th>
                    <th className="text-right py-2 pr-4">24h 涨跌</th>
                    <th className="text-right py-2 pr-4">48h 涨跌</th>
                    <th className="text-center py-2 pr-4">结果</th>
                    <th className="text-left py-2 pr-4">记录时间</th>
                    {user && <th className="text-center py-2">操作</th>}
                  </tr>
                </thead>
                <tbody>
                  {listData.map((item) => (
                    <tr key={item.id} className="border-b border-gray-800 hover:bg-gray-800/50">
                      <td className="py-2 pr-4 font-mono font-semibold text-white">{item.symbol}</td>
                      <td className="py-2 pr-4 text-gray-300 text-xs">
                        {SIGNAL_TYPES.find(t => t.value === item.signalType)?.label ?? item.signalType}
                      </td>
                      <td className="py-2 pr-4">
                        {item.direction === "long" ? (
                          <span className="text-emerald-400 flex items-center gap-1 text-xs"><TrendingUp className="w-3 h-3" />做多</span>
                        ) : item.direction === "short" ? (
                          <span className="text-red-400 flex items-center gap-1 text-xs"><TrendingDown className="w-3 h-3" />做空</span>
                        ) : (
                          <span className="text-gray-400 text-xs">观察</span>
                        )}
                      </td>
                      <td className="py-2 pr-4 text-right font-mono text-gray-300">
                        {item.entryPrice ? `$${item.entryPrice.toLocaleString()}` : "-"}
                      </td>
                      <td className="py-2 pr-4 text-right font-mono">
                        {item.pnlPct24h != null ? (
                          <span className={item.pnlPct24h >= 0 ? "text-emerald-400" : "text-red-400"}>
                            {item.pnlPct24h >= 0 ? "+" : ""}{item.pnlPct24h.toFixed(2)}%
                          </span>
                        ) : <span className="text-gray-500">-</span>}
                      </td>
                      <td className="py-2 pr-4 text-right font-mono">
                        {item.pnlPct48h != null ? (
                          <span className={item.pnlPct48h >= 0 ? "text-emerald-400" : "text-red-400"}>
                            {item.pnlPct48h >= 0 ? "+" : ""}{item.pnlPct48h.toFixed(2)}%
                          </span>
                        ) : <span className="text-gray-500">-</span>}
                      </td>
                      <td className="py-2 pr-4 text-center">
                        <ResultBadge result={item.result ?? "pending"} />
                      </td>
                      <td className="py-2 pr-4 text-gray-500 text-xs">
                        {new Date(item.createdAt).toLocaleDateString("zh-CN")}
                      </td>
                      {user && (
                        <td className="py-2 text-center">
                          <Button variant="ghost" size="sm" onClick={() => openUpdate(item)} className="h-6 px-2 text-xs text-yellow-400 hover:text-yellow-300">
                            更新结果
                          </Button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 添加信号弹窗 */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-md">
          <DialogHeader>
            <DialogTitle>记录新信号</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-gray-300 text-xs">交易对 *</Label>
                <Input value={form.symbol} onChange={e => setForm(f => ({ ...f, symbol: e.target.value.toUpperCase() }))}
                  placeholder="BTC" className="bg-gray-800 border-gray-600 text-white mt-1" />
              </div>
              <div>
                <Label className="text-gray-300 text-xs">入场价</Label>
                <Input value={form.entryPrice} onChange={e => setForm(f => ({ ...f, entryPrice: e.target.value }))}
                  placeholder="可选" type="number" className="bg-gray-800 border-gray-600 text-white mt-1" />
              </div>
            </div>
            <div>
              <Label className="text-gray-300 text-xs">信号类型 *</Label>
              <Select value={form.signalType} onValueChange={v => setForm(f => ({ ...f, signalType: v }))}>
                <SelectTrigger className="bg-gray-800 border-gray-600 text-white mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-600">
                  {SIGNAL_TYPES.map(t => (
                    <SelectItem key={t.value} value={t.value} className="text-white">{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-gray-300 text-xs">方向</Label>
              <Select value={form.direction} onValueChange={v => setForm(f => ({ ...f, direction: v as any }))}>
                <SelectTrigger className="bg-gray-800 border-gray-600 text-white mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-600">
                  <SelectItem value="long" className="text-white">做多</SelectItem>
                  <SelectItem value="short" className="text-white">做空</SelectItem>
                  <SelectItem value="neutral" className="text-white">观察</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-gray-300 text-xs">备注</Label>
              <Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="可选，如：Alpha+FOMO 双重共振，主力成本偏离-15%" className="bg-gray-800 border-gray-600 text-white mt-1" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)} className="border-gray-600 text-gray-300">取消</Button>
            <Button onClick={handleAdd} disabled={addMutation.isPending} className="bg-yellow-500 hover:bg-yellow-600 text-black">
              {addMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "记录"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 更新结果弹窗 */}
      <Dialog open={showUpdate !== null} onOpenChange={() => setShowUpdate(null)}>
        <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-md">
          <DialogHeader>
            <DialogTitle>更新信号结果</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-gray-300 text-xs">24h 后价格</Label>
                <Input value={updateForm.exitPrice24h} onChange={e => setUpdateForm(f => ({ ...f, exitPrice24h: e.target.value }))}
                  placeholder="可选" type="number" className="bg-gray-800 border-gray-600 text-white mt-1" />
              </div>
              <div>
                <Label className="text-gray-300 text-xs">48h 后价格</Label>
                <Input value={updateForm.exitPrice48h} onChange={e => setUpdateForm(f => ({ ...f, exitPrice48h: e.target.value }))}
                  placeholder="可选" type="number" className="bg-gray-800 border-gray-600 text-white mt-1" />
              </div>
              <div>
                <Label className="text-gray-300 text-xs">24h 涨跌幅 (%)</Label>
                <Input value={updateForm.pnlPct24h} onChange={e => setUpdateForm(f => ({ ...f, pnlPct24h: e.target.value }))}
                  placeholder="如 +5.2 或 -3.1" type="number" step="0.01" className="bg-gray-800 border-gray-600 text-white mt-1" />
              </div>
              <div>
                <Label className="text-gray-300 text-xs">48h 涨跌幅 (%)</Label>
                <Input value={updateForm.pnlPct48h} onChange={e => setUpdateForm(f => ({ ...f, pnlPct48h: e.target.value }))}
                  placeholder="如 +8.5 或 -2.0" type="number" step="0.01" className="bg-gray-800 border-gray-600 text-white mt-1" />
              </div>
            </div>
            <div>
              <Label className="text-gray-300 text-xs">最终结果</Label>
              <Select value={updateForm.result} onValueChange={v => setUpdateForm(f => ({ ...f, result: v as any }))}>
                <SelectTrigger className="bg-gray-800 border-gray-600 text-white mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-600">
                  <SelectItem value="win" className="text-white">盈利</SelectItem>
                  <SelectItem value="loss" className="text-white">亏损</SelectItem>
                  <SelectItem value="pending" className="text-white">待定</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-gray-300 text-xs">备注</Label>
              <Input value={updateForm.notes} onChange={e => setUpdateForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="可选" className="bg-gray-800 border-gray-600 text-white mt-1" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUpdate(null)} className="border-gray-600 text-gray-300">取消</Button>
            <Button onClick={() => showUpdate !== null && handleUpdate(showUpdate)} disabled={updateMutation.isPending} className="bg-yellow-500 hover:bg-yellow-600 text-black">
              {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "保存"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
