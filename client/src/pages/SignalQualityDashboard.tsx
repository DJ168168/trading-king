import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadialBarChart, RadialBar, PieChart, Pie, Cell, LineChart, Line, Legend
} from "recharts";
import {
  TrendingUp, TrendingDown, Minus, Activity, Shield, Clock, Zap, Target,
  AlertTriangle, CheckCircle, XCircle, RefreshCw, Brain, Flame, BarChart2
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export default function SignalQualityDashboard() {
  const [autoRefresh, setAutoRefresh] = useState(false);

  const { data: dashboard, isLoading, refetch } = trpc.strategyStats.signalQualityDashboard.useQuery(undefined, {
    refetchInterval: autoRefresh ? 30000 : false,
  });
  const { data: winRateStats } = trpc.strategyStats.winRateStats.useQuery();
  const { data: cooldowns } = trpc.strategyStats.cooldownStatus.useQuery(undefined, {
    refetchInterval: autoRefresh ? 30000 : false,
  });
  const { data: btcTrendData } = trpc.strategyStats.btcTrend.useQuery(undefined, {
    refetchInterval: autoRefresh ? 60000 : false,
  });

  const btcTrend = btcTrendData?.trend ?? dashboard?.btcTrend ?? 'sideways';
  const cooldownList = cooldowns ?? dashboard?.cooldowns ?? [];

  const BtcTrendIcon = btcTrend === 'up' ? TrendingUp : btcTrend === 'down' ? TrendingDown : Minus;
  const btcTrendColor = btcTrend === 'up' ? 'text-green-400' : btcTrend === 'down' ? 'text-red-400' : 'text-yellow-400';
  const btcTrendLabel = btcTrend === 'up' ? '上涨趋势 ✅ 允许做多' : btcTrend === 'down' ? '下跌趋势 🚫 禁止做多' : '横盘震荡 ⚠️ 谨慎操作';
  const btcTrendBg = btcTrend === 'up' ? 'bg-green-500/10 border-green-500/30' : btcTrend === 'down' ? 'bg-red-500/10 border-red-500/30' : 'bg-yellow-500/10 border-yellow-500/30';

  const marketScore = dashboard?.marketScore ?? 0;
  const marketScoreColor = marketScore >= 70 ? '#22c55e' : marketScore >= 50 ? '#eab308' : '#ef4444';
  const marketScoreLabel = marketScore >= 70 ? '市场热度高，适合交易' : marketScore >= 50 ? '市场中性，谨慎操作' : '市场冷淡，建议观望';

  // 动态仓位对照表
  const positionTable = [
    { score: 60, pos: '1x（基础仓位）', sl: '3.0%', tp1: '6.0%', tp2: '9.0%', color: '#f97316' },
    { score: 70, pos: '2.3x', sl: '2.4%', tp1: '4.8%', tp2: '7.2%', color: '#eab308' },
    { score: 80, pos: '3.7x', sl: '1.8%', tp1: '3.6%', tp2: '5.4%', color: '#84cc16' },
    { score: 90, pos: '5x（最大仓位）', sl: '1.5%', tp1: '3.0%', tp2: '4.5%', color: '#22c55e' },
  ];

  return (
    <div className="p-4 space-y-4 max-w-7xl mx-auto">
      {/* 标题栏 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="w-6 h-6 text-purple-400" />
            信号质量仪表盘
          </h1>
          <p className="text-sm text-muted-foreground mt-1">实时监控市场信号质量、动态风控参数与策略胜率</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => { refetch(); }}
          >
            <RefreshCw className="w-4 h-4 mr-1" />
            刷新
          </Button>
          <Button
            variant={autoRefresh ? "default" : "outline"}
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            <Activity className="w-4 h-4 mr-1" />
            {autoRefresh ? '自动刷新中' : '开启自动刷新'}
          </Button>
        </div>
      </div>

      {/* 顶部核心指标 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* BTC 趋势 */}
        <Card className={`border ${btcTrendBg}`}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <BtcTrendIcon className={`w-5 h-5 ${btcTrendColor}`} />
              <span className="text-sm font-medium">BTC 趋势</span>
            </div>
            <div className={`text-sm font-bold ${btcTrendColor}`}>{btcTrendLabel}</div>
            <div className="text-xs text-muted-foreground mt-1">每5分钟更新</div>
          </CardContent>
        </Card>

        {/* 市场热度评分 */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Flame className="w-5 h-5 text-orange-400" />
              <span className="text-sm font-medium">市场热度</span>
            </div>
            <div className="flex items-end gap-2">
              <span className="text-2xl font-bold" style={{ color: marketScoreColor }}>
                {isLoading ? '—' : marketScore}
              </span>
              <span className="text-sm text-muted-foreground mb-1">/ 100</span>
            </div>
            <div className="text-xs text-muted-foreground">{marketScoreLabel}</div>
          </CardContent>
        </Card>

        {/* 冷却期数量 */}
        <Card className={cooldownList.length > 0 ? 'border-yellow-500/30 bg-yellow-500/5' : ''}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-5 h-5 text-yellow-400" />
              <span className="text-sm font-medium">冷却期保护</span>
            </div>
            <div className="text-2xl font-bold text-yellow-400">{cooldownList.length}</div>
            <div className="text-xs text-muted-foreground">个币种被锁定</div>
          </CardContent>
        </Card>

        {/* 平均信号评分 */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-5 h-5 text-blue-400" />
              <span className="text-sm font-medium">平均信号评分</span>
            </div>
            <div className="text-2xl font-bold text-blue-400">
              {isLoading ? '—' : `${Math.round((dashboard?.avgScore ?? 0) * 100)}%`}
            </div>
            <div className="text-xs text-muted-foreground">近50次聚合信号</div>
          </CardContent>
        </Card>
      </div>

      {/* 第二行：信号分布 + 市场状态 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 评分分布柱状图 */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-purple-400" />
              信号评分分布
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-40 flex items-center justify-center text-muted-foreground">加载中...</div>
            ) : (
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={dashboard?.scoreDistribution ?? []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis dataKey="range" tick={{ fontSize: 11, fill: '#888' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#888' }} />
                  <Tooltip
                    contentStyle={{ background: '#1a1a2e', border: '1px solid #333', borderRadius: 8 }}
                    labelStyle={{ color: '#fff' }}
                  />
                  <Bar dataKey="count" name="信号数量" radius={[4, 4, 0, 0]}>
                    {(dashboard?.scoreDistribution ?? []).map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* 市场状态指标 */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="w-4 h-4 text-cyan-400" />
              近1小时市场状态
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading ? (
              <div className="h-40 flex items-center justify-center text-muted-foreground">加载中...</div>
            ) : (
              <>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">FOMO 信号</span>
                  <div className="flex items-center gap-2">
                    <Progress value={Math.min(100, (dashboard?.marketStats.fomoCount ?? 0) * 5)} className="w-24 h-2" />
                    <span className="text-sm font-bold text-orange-400 w-8 text-right">{dashboard?.marketStats.fomoCount ?? 0}</span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Alpha 信号</span>
                  <div className="flex items-center gap-2">
                    <Progress value={Math.min(100, (dashboard?.marketStats.alphaCount ?? 0) * 5)} className="w-24 h-2" />
                    <span className="text-sm font-bold text-purple-400 w-8 text-right">{dashboard?.marketStats.alphaCount ?? 0}</span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">风险信号</span>
                  <div className="flex items-center gap-2">
                    <Progress value={Math.min(100, (dashboard?.marketStats.riskCount ?? 0) * 10)} className="w-24 h-2" />
                    <span className="text-sm font-bold text-red-400 w-8 text-right">{dashboard?.marketStats.riskCount ?? 0}</span>
                  </div>
                </div>
                <Separator />
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <div className="text-lg font-bold text-white">{dashboard?.marketStats.totalCount ?? 0}</div>
                    <div className="text-xs text-muted-foreground">总信号数</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-cyan-400">{dashboard?.marketStats.uniqueSymbols ?? 0}</div>
                    <div className="text-xs text-muted-foreground">涉及币种</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-green-400">
                      {Math.round((dashboard?.marketStats.longRatio ?? 0) * 100)}%
                    </div>
                    <div className="text-xs text-muted-foreground">多头比例</div>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 动态仓位对照表 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="w-4 h-4 text-green-400" />
            动态仓位 & ATR止损对照表
            <Badge variant="outline" className="ml-2 text-xs">实时生效</Badge>
          </CardTitle>
          <p className="text-xs text-muted-foreground">评分越高，仓位越大，止损越紧（高质量信号不需要宽止损）</p>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-3 text-muted-foreground font-medium">信号评分</th>
                  <th className="text-left py-2 px-3 text-muted-foreground font-medium">仓位倍数</th>
                  <th className="text-left py-2 px-3 text-muted-foreground font-medium">动态止损</th>
                  <th className="text-left py-2 px-3 text-muted-foreground font-medium">止盈1</th>
                  <th className="text-left py-2 px-3 text-muted-foreground font-medium">止盈2</th>
                  <th className="text-left py-2 px-3 text-muted-foreground font-medium">风险收益比</th>
                </tr>
              </thead>
              <tbody>
                {positionTable.map((row) => (
                  <tr key={row.score} className="border-b border-border/50 hover:bg-muted/30">
                    <td className="py-2 px-3">
                      <span className="font-bold" style={{ color: row.color }}>{row.score}分</span>
                    </td>
                    <td className="py-2 px-3 font-medium">{row.pos}</td>
                    <td className="py-2 px-3 text-red-400">-{row.sl}</td>
                    <td className="py-2 px-3 text-green-400">+{row.tp1}</td>
                    <td className="py-2 px-3 text-emerald-400">+{row.tp2}</td>
                    <td className="py-2 px-3 text-blue-400">
                      {(parseFloat(row.tp1) / parseFloat(row.sl)).toFixed(1)}:1
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-3 p-3 bg-muted/30 rounded-lg text-xs text-muted-foreground">
            💡 <strong>说明</strong>：基础仓位 = 自动交易设置中的「仓位比例」。90分信号的仓位是60分信号的5倍，但止损更紧，整体风险可控。
          </div>
        </CardContent>
      </Card>

      {/* 策略胜率统计 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="w-4 h-4 text-yellow-400" />
            策略实际胜率追踪
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!winRateStats || (winRateStats as any[]).length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <BarChart2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">暂无策略胜率数据</p>
              <p className="text-xs mt-1">开启自动交易后，系统将自动记录每个策略的实际胜率</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={winRateStats as any[]}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="strategyName" tick={{ fontSize: 10, fill: '#888' }} />
                <YAxis tick={{ fontSize: 11, fill: '#888' }} domain={[0, 100]} unit="%" />
                <Tooltip
                  contentStyle={{ background: '#1a1a2e', border: '1px solid #333', borderRadius: 8 }}
                  formatter={(val: any) => [`${val}%`, '胜率']}
                />
                <Bar dataKey="winRate" name="胜率" fill="#a855f7" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* 冷却期列表 */}
      {cooldownList.length > 0 && (
        <Card className="border-yellow-500/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="w-4 h-4 text-yellow-400" />
              冷却期保护列表
              <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">{cooldownList.length} 个</Badge>
            </CardTitle>
            <p className="text-xs text-muted-foreground">以下币种因亏损触发冷却期保护，期间不会自动下单</p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {cooldownList.map((item: any) => {
                const remainMin = Math.ceil(item.remainingMs / 60000);
                const remainHr = (item.remainingMs / 3600000).toFixed(1);
                return (
                  <div key={item.symbol} className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
                    <div className="font-bold text-yellow-400">{item.symbol}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      剩余 {remainMin >= 60 ? `${remainHr}小时` : `${remainMin}分钟`}
                    </div>
                    <div className="mt-2">
                      <Progress value={100 - (item.remainingMs / (2 * 3600000)) * 100} className="h-1" />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 优化说明 */}
      <Card className="border-purple-500/20 bg-purple-500/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="w-4 h-4 text-purple-400" />
            已启用的胜率优化项
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              { icon: CheckCircle, color: 'text-green-400', title: '动态仓位管理', desc: '评分60分→1x，90分→5x，高质量信号自动加仓' },
              { icon: CheckCircle, color: 'text-green-400', title: 'ATR 动态止损', desc: '评分越高止损越紧，高质量信号止损收紧至1.5%' },
              { icon: CheckCircle, color: 'text-green-400', title: 'BTC 趋势过滤', desc: 'BTC下跌趋势时自动禁止做多，避免逆势操作' },
              { icon: CheckCircle, color: 'text-green-400', title: '同币种冷却期', desc: '亏损后同币种锁定2小时，防止连续亏损' },
              { icon: CheckCircle, color: 'text-green-400', title: '6大策略门控', desc: '只有满足高胜率策略条件的信号才会触发下单' },
              { icon: CheckCircle, color: 'text-green-400', title: '风险收益比保护', desc: '动态止盈确保风险收益比始终 ≥ 2:1' },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-3">
                <item.icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${item.color}`} />
                <div>
                  <div className="text-sm font-medium">{item.title}</div>
                  <div className="text-xs text-muted-foreground">{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
