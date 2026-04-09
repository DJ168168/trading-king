import { trpc } from "@/lib/trpc";
import PageHeader from "@/components/PageHeader";
import StatCard from "@/components/StatCard";
import EmptyState from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Zap, RefreshCw, Send, Activity, AlertTriangle, Radio } from "lucide-react";
import { toast } from "sonner";

function SignalTypeBadge({ type }: { type: string }) {
  const styles: Record<string, string> = {
    LONG: "bg-green-500/20 text-green-400 border border-green-500/30",
    SHORT: "bg-red-500/20 text-red-400 border border-red-500/30",
    CLOSE: "bg-gray-500/20 text-gray-400 border border-gray-500/30",
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded font-bold ${styles[type] ?? styles.CLOSE}`}>
      {type}
    </span>
  );
}

function ExchangeLabel({ exchange }: { exchange: string }) {
  const colors: Record<string, string> = {
    binance: "bg-yellow-500/20 text-yellow-400",
    okx: "bg-blue-500/20 text-blue-400",
    bybit: "bg-orange-500/20 text-orange-400",
  };
  const labels: Record<string, string> = { binance: "币安", okx: "欧易", bybit: "Bybit" };
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded ${colors[exchange] ?? "bg-gray-500/20 text-gray-400"}`}>
      {labels[exchange] ?? exchange}
    </span>
  );
}

function ScoreBar({ score }: { score: number }) {
  const color = score >= 80 ? "bg-green-500" : score >= 60 ? "bg-yellow-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 bg-gray-800 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-xs font-mono text-muted-foreground">{score}</span>
    </div>
  );
}

export default function Signals() {
  const { data: signals, isLoading, refetch } = trpc.signals.list.useQuery(
    { limit: 100 },
    { refetchInterval: 15000 }
  );
  const { data: engineStatus } = trpc.signals.engineStatus.useQuery(undefined, { refetchInterval: 10000 });
  const createSignal = trpc.signals.create.useMutation({
    onSuccess: () => { toast.success("测试信号已创建并推送 Telegram"); refetch(); },
    onError: (err) => toast.error(`创建失败: ${err.message}`),
  });

  const handleTestSignal = () => {
    createSignal.mutate({
      exchange: "binance",
      symbol: "BTC/USDT",
      type: "LONG",
      source: "手动测试",
      price: 84000,
      score: 85,
      reason: "手动触发测试信号",
      sendTelegram: true,
    });
  };

  const signalList = (signals as any[]) ?? [];
  const longCount = signalList.filter((s: any) => s.type === "LONG").length;
  const shortCount = signalList.filter((s: any) => s.type === "SHORT").length;
  const telegramCount = signalList.filter((s: any) => s.telegramSent).length;

  return (
    <div>
      <PageHeader
        title="信号监控"
        description="实时监控三大交易所交易信号，自动推送 Telegram"
        actions={
          <div className="flex gap-2 items-center">
            <div className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border ${engineStatus?.running ? "border-green-500/40 text-green-400 bg-green-500/10" : "border-gray-600 text-gray-500"}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${engineStatus?.running ? "bg-green-400 animate-pulse" : "bg-gray-500"}`} />
              信号引擎 {engineStatus?.running ? "运行中" : "已停止"}
            </div>
            <Button
              variant="outline" size="sm" className="text-xs"
              onClick={handleTestSignal}
              disabled={createSignal.isPending}
            >
              <Send size={14} className="mr-1" /> 测试信号
            </Button>
            <Button variant="outline" size="sm" className="text-xs" onClick={() => refetch()}>
              <RefreshCw size={14} className="mr-1" /> 刷新
            </Button>
          </div>
        }
      />

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={<Zap size={18} />} iconColor="text-neon-green" label="信号总数" value={`${signalList.length}`} sublabel="历史信号记录" />
        <StatCard icon={<Activity size={18} />} iconColor="text-neon-green" label="做多信号" value={`${longCount}`} sublabel="LONG 信号" />
        <StatCard icon={<AlertTriangle size={18} />} iconColor="text-neon-red" label="做空信号" value={`${shortCount}`} sublabel="SHORT 信号" />
        <StatCard icon={<Radio size={18} />} iconColor="text-neon-blue" label="Telegram 推送" value={`${telegramCount}`} sublabel="已推送通知" />
      </div>

      {/* 信号列表 */}
      <div className="terminal-card">
        <div className="p-4 border-b border-border/30 flex items-center justify-between">
          <h3 className="text-sm font-medium text-foreground">信号流</h3>
          <span className="text-xs text-muted-foreground">15s 自动刷新</span>
        </div>

        {isLoading ? (
          <div className="p-6 space-y-3">
            {[1,2,3,4,5].map(i => <div key={i} className="h-14 rounded bg-muted/20 animate-pulse" />)}
          </div>
        ) : signalList.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={<Zap size={40} />}
              title="暂无信号"
              description="信号引擎正在监控市场，有信号时将自动推送 Telegram。点击「测试信号」可手动触发一条测试信号。"
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/30">
                  {["时间","交易所","交易对","类型","价格","评分","来源","Telegram","原因"].map(h => (
                    <th key={h} className={`p-3 text-xs text-muted-foreground font-medium ${["时间","交易所","交易对","类型","来源","原因"].includes(h) ? "text-left" : "text-right"}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {signalList.map((sig: any) => (
                  <tr key={sig.id} className="border-b border-border/20 hover:bg-muted/10 transition-colors">
                    <td className="p-3 text-xs text-muted-foreground font-mono whitespace-nowrap">
                      {new Date(sig.createdAt).toLocaleString("zh-CN", {
                        timeZone: "Asia/Shanghai",
                        month: "2-digit", day: "2-digit",
                        hour: "2-digit", minute: "2-digit"
                      })}
                    </td>
                    <td className="p-3"><ExchangeLabel exchange={sig.exchange} /></td>
                    <td className="p-3 font-mono text-foreground">{sig.symbol}</td>
                    <td className="p-3"><SignalTypeBadge type={sig.type} /></td>
                    <td className="p-3 text-right font-mono text-foreground">${Number(sig.price).toFixed(4)}</td>
                    <td className="p-3 text-right"><ScoreBar score={sig.score} /></td>
                    <td className="p-3 text-xs text-muted-foreground">{sig.source}</td>
                    <td className="p-3 text-right">
                      <span className={`text-xs ${sig.telegramSent ? "text-neon-green" : "text-muted-foreground"}`}>
                        {sig.telegramSent ? "✓ 已推送" : "—"}
                      </span>
                    </td>
                    <td className="p-3 text-xs text-muted-foreground max-w-32 truncate">{sig.reason ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
