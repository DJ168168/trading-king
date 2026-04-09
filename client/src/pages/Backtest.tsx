import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { FlaskConical, Play, TrendingUp, TrendingDown, BarChart2, GitCompare, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from "recharts";

export default function Backtest() {
  const [form, setForm] = useState({
    name: `回测_${new Date().toLocaleDateString("zh-CN")}`,
    startDate: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString().split("T")[0],
    endDate: new Date().toISOString().split("T")[0],
    initialBalance: 10000,
    timeWindow: 300,
    minScore: 0.6,
    stopLossPercent: 3,
    takeProfit1Percent: 5,
    takeProfit2Percent: 10,
    leverage: 5,
  });
  const [selectedResult, setSelectedResult] = useState<any>(null);
  const [compareMode, setCompareMode] = useState(false);
  const [compareResults, setCompareResults] = useState<any[]>([]);
  const [compareRunning, setCompareRunning] = useState(false);

  const { data: results, refetch } = trpc.backtest.list.useQuery();

  const runMutation = trpc.backtest.run.useMutation({
    onSuccess: (data) => {
      toast.success(`回测完成！胜率: ${data.result.winRate.toFixed(1)}%，收益: ${data.result.totalReturn.toFixed(2)}%`);
      refetch();
      setSelectedResult(data.result);
    },
    onError: () => toast.error("回测失败"),
  });

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [key]: key === "name" || key === "startDate" || key === "endDate" ? e.target.value : parseFloat(e.target.value) }));

  // 多评分阈值对比：同时运行 50/60/70 分三组
  const handleCompare = async () => {
    setCompareRunning(true);
    setCompareResults([]);
    const scores = [0.5, 0.6, 0.7];
    const results: any[] = [];
    for (const score of scores) {
      try {
        const res = await runMutation.mutateAsync({
          ...form,
          name: `对比_${Math.round(score * 100)}分_${new Date().toLocaleDateString("zh-CN")}`,
          minScore: score,
        });
        results.push({ score: Math.round(score * 100), ...res.result });
      } catch {
        results.push({ score: Math.round(score * 100), error: true });
      }
    }
    setCompareResults(results);
    setCompareRunning(false);
    refetch();
    toast.success("多阈值对比完成！");
  };

  // 生成权益曲线数据
  const equityCurve = selectedResult?.tradeLog ? (() => {
    let balance = form.initialBalance;
    return selectedResult.tradeLog.slice(0, 50).map((t: any, i: number) => {
      balance += t.pnl;
      return { index: i + 1, balance: parseFloat(balance.toFixed(2)), pnl: t.pnl };
    });
  })() : [];

  // 对比图表数据
  const compareChartData = compareResults.filter(r => !r.error).map(r => ({
    name: `${r.score}分`,
    胜率: parseFloat(r.winRate?.toFixed(1) ?? "0"),
    收益率: parseFloat(r.totalReturn?.toFixed(2) ?? "0"),
    最大回撤: parseFloat(r.maxDrawdown?.toFixed(2) ?? "0"),
    交易次数: r.totalTrades ?? 0,
  }));

  return (
    <div className="p-4 lg:p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">回测模拟</h1>
          <p className="text-sm text-muted-foreground mt-0.5">基于历史信号数据验证策略胜率与收益率</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCompareMode(!compareMode)}
            className={cn(compareMode ? "border-primary text-primary" : "border-border text-muted-foreground")}
          >
            <GitCompare className="w-3.5 h-3.5 mr-1.5" />
            {compareMode ? "关闭对比" : "多阈值对比"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Config Panel */}
        <div className="gradient-card rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <FlaskConical className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">回测参数</h3>
          </div>
          {[
            { label: "回测名称", key: "name", type: "text" },
            { label: "开始日期", key: "startDate", type: "date" },
            { label: "结束日期", key: "endDate", type: "date" },
            { label: "初始资金 ($)", key: "initialBalance", type: "number" },
            { label: "信号时间窗口 (s)", key: "timeWindow", type: "number" },
            { label: "最低评分 (0-1)", key: "minScore", type: "number", step: "0.05" },
            { label: "止损比例 (%)", key: "stopLossPercent", type: "number", step: "0.5" },
            { label: "止盈1 (%)", key: "takeProfit1Percent", type: "number", step: "0.5" },
            { label: "止盈2 (%)", key: "takeProfit2Percent", type: "number", step: "1" },
            { label: "杠杆倍数", key: "leverage", type: "number" },
          ].map(({ label, key, type, step }) => (
            <div key={key}>
              <label className="text-xs text-muted-foreground mb-1 block">{label}</label>
              <input type={type} step={step} value={(form as any)[key]} onChange={set(key)}
                className="w-full bg-input border border-border rounded-md px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
            </div>
          ))}

          <div className="flex flex-col gap-2">
            <Button className="w-full" onClick={() => runMutation.mutate(form)} disabled={runMutation.isPending || compareRunning}>
              <Play className="w-3.5 h-3.5 mr-1.5" />{runMutation.isPending ? "回测运行中..." : "开始回测"}
            </Button>
            {compareMode && (
              <Button
                variant="outline"
                className="w-full border-primary/30 text-primary hover:bg-primary/10"
                onClick={handleCompare}
                disabled={compareRunning || runMutation.isPending}
              >
                {compareRunning ? (
                  <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />对比运行中...</>
                ) : (
                  <><GitCompare className="w-3.5 h-3.5 mr-1.5" />运行 50/60/70 分对比</>
                )}
              </Button>
            )}
          </div>
        </div>

        {/* Results */}
        <div className="lg:col-span-2 space-y-4">
          {/* 多阈值对比结果 */}
          {compareMode && compareResults.length > 0 && (
            <div className="gradient-card rounded-xl p-5">
              <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                <GitCompare className="w-4 h-4 text-primary" />
                多评分阈值对比结果
              </h3>

              {/* 对比表格 */}
              <div className="overflow-x-auto mb-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground text-xs">
                      <th className="text-left py-2 pr-4">评分阈值</th>
                      <th className="text-right py-2 px-3">总收益率</th>
                      <th className="text-right py-2 px-3">胜率</th>
                      <th className="text-right py-2 px-3">最大回撤</th>
                      <th className="text-right py-2 px-3">交易次数</th>
                      <th className="text-right py-2 px-3">夏普比率</th>
                    </tr>
                  </thead>
                  <tbody>
                    {compareResults.map(r => (
                      <tr key={r.score} className={cn(
                        "border-b border-border/50",
                        !r.error && r.totalReturn === Math.max(...compareResults.filter(x => !x.error).map(x => x.totalReturn)) && "bg-profit/5"
                      )}>
                        <td className="py-2 pr-4">
                          <span className="px-2 py-0.5 rounded bg-primary/10 text-primary text-xs font-medium">{r.score}分</span>
                        </td>
                        {r.error ? (
                          <td colSpan={5} className="py-2 px-3 text-center text-muted-foreground text-xs">回测失败</td>
                        ) : (
                          <>
                            <td className={cn("py-2 px-3 text-right font-mono font-medium", r.totalReturn >= 0 ? "text-profit" : "text-loss")}>
                              {r.totalReturn >= 0 ? "+" : ""}{r.totalReturn?.toFixed(2)}%
                            </td>
                            <td className={cn("py-2 px-3 text-right font-mono", r.winRate >= 50 ? "text-profit" : "text-loss")}>
                              {r.winRate?.toFixed(1)}%
                            </td>
                            <td className="py-2 px-3 text-right font-mono text-loss">
                              -{r.maxDrawdown?.toFixed(2)}%
                            </td>
                            <td className="py-2 px-3 text-right font-mono text-foreground">
                              {r.totalTrades}
                            </td>
                            <td className={cn("py-2 px-3 text-right font-mono", (r.sharpeRatio ?? 0) > 1 ? "text-profit" : "text-fomo")}>
                              {r.sharpeRatio?.toFixed(2)}
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* 对比柱状图 */}
              {compareChartData.length > 0 && (
                <div className="space-y-4">
                  <div>
                    <div className="text-xs text-muted-foreground mb-2">胜率对比 (%)</div>
                    <ResponsiveContainer width="100%" height={120}>
                      <BarChart data={compareChartData} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.2 0.01 240)" />
                        <XAxis dataKey="name" tick={{ fontSize: 10, fill: "oklch(0.55 0.01 240)" }} tickLine={false} axisLine={false} />
                        <YAxis tick={{ fontSize: 10, fill: "oklch(0.55 0.01 240)" }} tickLine={false} axisLine={false} domain={[0, 100]} />
                        <Tooltip contentStyle={{ backgroundColor: "oklch(0.11 0.01 240)", border: "1px solid oklch(0.2 0.01 240)", borderRadius: "8px", fontSize: "12px" }} />
                        <Bar dataKey="胜率" fill="oklch(0.65 0.18 160)" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-2">收益率 vs 最大回撤 (%)</div>
                    <ResponsiveContainer width="100%" height={120}>
                      <BarChart data={compareChartData} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.2 0.01 240)" />
                        <XAxis dataKey="name" tick={{ fontSize: 10, fill: "oklch(0.55 0.01 240)" }} tickLine={false} axisLine={false} />
                        <YAxis tick={{ fontSize: 10, fill: "oklch(0.55 0.01 240)" }} tickLine={false} axisLine={false} />
                        <Tooltip contentStyle={{ backgroundColor: "oklch(0.11 0.01 240)", border: "1px solid oklch(0.2 0.01 240)", borderRadius: "8px", fontSize: "12px" }} />
                        <Legend wrapperStyle={{ fontSize: "10px" }} />
                        <Bar dataKey="收益率" fill="oklch(0.65 0.18 160)" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="最大回撤" fill="oklch(0.65 0.18 30)" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* 推荐结论 */}
              {compareChartData.length > 0 && (() => {
                const best = compareResults.filter(r => !r.error).reduce((a, b) =>
                  (a.winRate + a.totalReturn - a.maxDrawdown) > (b.winRate + b.totalReturn - b.maxDrawdown) ? a : b
                );
                return (
                  <div className="mt-4 p-3 bg-primary/10 border border-primary/20 rounded-lg">
                    <div className="text-xs font-medium text-primary mb-1">📊 综合推荐</div>
                    <div className="text-xs text-muted-foreground">
                      基于胜率+收益率-最大回撤综合评分，<span className="text-primary font-medium">{best.score}分阈值</span>表现最优
                      （胜率 {best.winRate?.toFixed(1)}%，收益 {best.totalReturn >= 0 ? "+" : ""}{best.totalReturn?.toFixed(2)}%，回撤 -{best.maxDrawdown?.toFixed(2)}%）。
                      建议将自动交易最低评分设置为 <span className="text-primary font-medium">{best.score} 分</span>。
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* Current Result */}
          {selectedResult && (
            <div className="gradient-card rounded-xl p-5">
              <h3 className="text-sm font-semibold text-foreground mb-4">回测结果</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                {[
                  { label: "总收益率", value: `${selectedResult.totalReturn >= 0 ? "+" : ""}${selectedResult.totalReturn.toFixed(2)}%`, color: selectedResult.totalReturn >= 0 ? "text-profit" : "text-loss" },
                  { label: "胜率", value: `${selectedResult.winRate.toFixed(1)}%`, color: selectedResult.winRate >= 50 ? "text-profit" : "text-loss" },
                  { label: "最大回撤", value: `-${selectedResult.maxDrawdown.toFixed(2)}%`, color: "text-loss" },
                  { label: "夏普比率", value: selectedResult.sharpeRatio.toFixed(2), color: selectedResult.sharpeRatio > 1 ? "text-profit" : "text-fomo" },
                ].map(({ label, value, color }) => (
                  <div key={label} className="text-center p-3 bg-accent rounded-lg">
                    <div className={cn("text-xl font-bold font-mono", color)}>{value}</div>
                    <div className="text-xs text-muted-foreground mt-1">{label}</div>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-3 mb-4 text-center">
                <div className="p-2 bg-accent rounded-lg">
                  <div className="text-lg font-bold font-mono text-foreground">{selectedResult.totalTrades}</div>
                  <div className="text-xs text-muted-foreground">总交易</div>
                </div>
                <div className="p-2 bg-profit-subtle rounded-lg">
                  <div className="text-lg font-bold font-mono text-profit">{selectedResult.winTrades}</div>
                  <div className="text-xs text-muted-foreground">盈利</div>
                </div>
                <div className="p-2 bg-loss-subtle rounded-lg">
                  <div className="text-lg font-bold font-mono text-loss">{selectedResult.lossTrades}</div>
                  <div className="text-xs text-muted-foreground">亏损</div>
                </div>
              </div>
              {/* Equity Curve */}
              {equityCurve.length > 1 && (
                <div>
                  <div className="text-xs text-muted-foreground mb-2">权益曲线</div>
                  <ResponsiveContainer width="100%" height={140}>
                    <LineChart data={equityCurve} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.2 0.01 240)" />
                      <XAxis dataKey="index" tick={{ fontSize: 10, fill: "oklch(0.55 0.01 240)" }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: "oklch(0.55 0.01 240)" }} tickLine={false} axisLine={false} tickFormatter={v => `$${(v/1000).toFixed(1)}k`} />
                      <Tooltip contentStyle={{ backgroundColor: "oklch(0.11 0.01 240)", border: "1px solid oklch(0.2 0.01 240)", borderRadius: "8px", fontSize: "12px" }}
                        labelStyle={{ color: "oklch(0.92 0.01 240)" }} itemStyle={{ color: "oklch(0.65 0.18 160)" }}
                        formatter={(v: any) => [`$${Number(v).toFixed(2)}`, "余额"]} />
                      <Line type="monotone" dataKey="balance" stroke="oklch(0.65 0.18 160)" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          )}

          {/* History */}
          <div className="gradient-card rounded-xl overflow-hidden">
            <div className="p-4 border-b border-border">
              <h3 className="text-sm font-semibold text-foreground">历史回测</h3>
            </div>
            {results && results.length > 0 ? (
              <div className="divide-y divide-border">
                {results.map((r: any) => (
                  <div key={r.id} className="p-4 hover:bg-accent/30 transition-colors cursor-pointer"
                    onClick={() => setSelectedResult({ ...r, tradeLog: r.tradeLog ?? [] })}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-foreground">{r.name}</span>
                      <div className="flex items-center gap-2">
                        <span className={cn("text-sm font-mono font-bold", r.totalReturn >= 0 ? "text-profit" : "text-loss")}>
                          {r.totalReturn >= 0 ? "+" : ""}{r.totalReturn.toFixed(2)}%
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-4 text-xs text-muted-foreground">
                      <span>胜率 <span className={cn("font-mono font-medium", r.winRate >= 50 ? "text-profit" : "text-loss")}>{r.winRate.toFixed(1)}%</span></span>
                      <span>交易 <span className="font-mono text-foreground">{r.totalTrades}</span></span>
                      <span>回撤 <span className="font-mono text-loss">-{r.maxDrawdown.toFixed(1)}%</span></span>
                      <span className="ml-auto">{new Date(r.createdAt).toLocaleDateString("zh-CN")}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <BarChart2 className="w-10 h-10 mx-auto mb-3 opacity-20" />
                <p className="text-sm">暂无回测记录</p>
                <p className="text-xs mt-1">配置参数后点击"开始回测"</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
