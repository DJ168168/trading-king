/**
 * VSDataPanel - ValueScan Open API 数据面板
 * 包含13个数据模块 + 推送控制面板
 */
import { useState } from "react";
import {
  Activity, AlertTriangle, ArrowDownRight, ArrowUpRight,
  BarChart2, Bell, BellOff, ChevronDown, ChevronRight,
  Cpu, Database, DollarSign, Eye, Flame, Globe,
  Layers, MessageSquare, RefreshCw, Send, Settings2,
  Shield, Sparkles, TrendingDown, TrendingUp, Zap,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import EmptyState from "@/components/EmptyState";

// ─── 工具函数 ────────────────────────────────────────────────────────────────
function fmt(v: any, decimals = 2) {
  const n = Number(v);
  if (isNaN(n)) return "—";
  return n.toLocaleString("zh-CN", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}
function fmtPrice(v: any) {
  const n = Number(v);
  if (isNaN(n) || n === 0) return "—";
  if (n >= 10000) return `$${(n / 1000).toFixed(1)}k`;
  if (n >= 1) return `$${n.toFixed(2)}`;
  return `$${n.toFixed(6)}`;
}
function fmtChange(v: any) {
  const n = Number(v);
  if (isNaN(n)) return { text: "—", up: null };
  return { text: `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`, up: n >= 0 };
}
function fmtAmount(v: any) {
  const n = Number(v);
  if (isNaN(n) || n === 0) return "—";
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
  return `$${n.toFixed(2)}`;
}
function timeAgo(ts: any) {
  const t = Number(ts);
  if (!t) return "—";
  const diff = Math.floor((Date.now() - t) / 1000);
  if (diff < 60) return `${diff}秒前`;
  if (diff < 3600) return `${Math.floor(diff / 60)}分钟前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}小时前`;
  return `${Math.floor(diff / 86400)}天前`;
}

// ─── 子组件 ──────────────────────────────────────────────────────────────────
function PanelCard({ title, icon: Icon, iconColor = "text-primary", count, children, loading, collapsible = true }: {
  title: string; icon: any; iconColor?: string; count?: number;
  children: React.ReactNode; loading?: boolean; collapsible?: boolean;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div className="gradient-card rounded-2xl border border-primary/10 overflow-hidden shadow-[0_0_20px_rgba(34,211,238,0.04)]">
      <div
        className={cn("flex items-center justify-between px-4 py-3 border-b border-border/40", collapsible && "cursor-pointer hover:bg-primary/5 transition-colors")}
        onClick={() => collapsible && setOpen(o => !o)}
      >
        <div className="flex items-center gap-2">
          <div className={cn("rounded-lg border border-primary/20 bg-primary/10 p-1.5", iconColor)}>
            <Icon className="h-3.5 w-3.5" />
          </div>
          <span className="text-sm font-semibold text-foreground">{title}</span>
          {count !== undefined && (
            <Badge variant="outline" className="h-5 px-1.5 text-[10px] font-mono border-primary/20 text-primary">
              {count}
            </Badge>
          )}
        </div>
        {collapsible && (open ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />)}
      </div>
      {open && (
        <div className="p-4">
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-10 w-full rounded-xl bg-primary/10" />)}
            </div>
          ) : children}
        </div>
      )}
    </div>
  );
}

function CoinRow({ item, type }: { item: any; type: "chance" | "risk" | "funds" }) {
  const symbol = item?.symbol || item?.coin || "—";
  const price = fmtPrice(item?.price ?? item?.lastPrice);
  const change = fmtChange(item?.change24h ?? item?.priceChangePercent24h ?? item?.change);
  const score = Number(item?.score ?? item?.confidence ?? 0);
  const icon = item?.icon || item?.logoUrl || "";
  return (
    <div className="flex items-center gap-2 border-b border-border/30 py-2 last:border-0">
      {icon ? (
        <img src={icon} alt={symbol} className="h-6 w-6 rounded-full flex-shrink-0" onError={e => (e.currentTarget.style.display = "none")} />
      ) : (
        <div className={cn("h-6 w-6 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold",
          type === "chance" ? "bg-green-500/20 text-green-400" : type === "risk" ? "bg-red-500/20 text-red-400" : "bg-blue-500/20 text-blue-400"
        )}>{symbol.slice(0, 2)}</div>
      )}
      <span className="flex-1 text-sm font-mono font-bold text-foreground">{symbol}</span>
      <span className="text-xs font-mono text-muted-foreground">{price}</span>
      {change.up !== null && (
        <span className={cn("text-xs font-mono flex items-center gap-0.5", change.up ? "text-green-400" : "text-red-400")}>
          {change.up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          {change.text}
        </span>
      )}
      {score > 0 && (
        <div className={cn("rounded border px-1.5 py-0.5 text-[10px] font-mono",
          type === "chance" ? "border-green-500/30 bg-green-500/10 text-green-400" :
          type === "risk" ? "border-red-500/30 bg-red-500/10 text-red-400" :
          "border-blue-500/30 bg-blue-500/10 text-blue-400"
        )}>{score}</div>
      )}
    </div>
  );
}

function MessageRow({ msg, symbol }: { msg: any; symbol?: string }) {
  const content = msg?.content || msg?.message || msg?.text || "";
  const ts = msg?.ts || msg?.timestamp || msg?.createTime || msg?.time;
  return (
    <div className="border-b border-border/30 py-2 last:border-0">
      <div className="flex items-center justify-between gap-2 mb-1">
        {symbol && <span className="text-xs font-mono font-bold text-primary">{symbol}</span>}
        <span className="text-[10px] text-muted-foreground ml-auto">{timeAgo(ts)}</span>
      </div>
      <p className="text-xs text-muted-foreground leading-5 line-clamp-3">{content || "—"}</p>
    </div>
  );
}

// ─── 推送控制面板 ─────────────────────────────────────────────────────────────
function PushControlPanel() {
  const utils = trpc.useUtils();
  const configQuery = trpc.telegram.config.useQuery();
  const saveMutation = trpc.telegram.save.useMutation({
    onSuccess: () => { utils.telegram.config.invalidate(); toast.success("推送配置已保存"); },
    onError: () => toast.error("保存失败"),
  });
  const testMutation = trpc.telegram.test.useMutation({
    onSuccess: (data) => data.success ? toast.success("测试消息已发送") : toast.error("发送失败: " + data.error),
  });
  const cfg = configQuery.data;
  const [open, setOpen] = useState(true);

  const toggle = (field: string, val: boolean) => {
    saveMutation.mutate({ [field]: val } as any);
  };

  return (
    <div className="gradient-card rounded-2xl border border-primary/10 overflow-hidden shadow-[0_0_20px_rgba(34,211,238,0.04)]">
      <div
        className="flex items-center justify-between px-4 py-3 border-b border-border/40 cursor-pointer hover:bg-primary/5 transition-colors"
        onClick={() => setOpen(o => !o)}
      >
        <div className="flex items-center gap-2">
          <div className="rounded-lg border border-cyan-500/30 bg-cyan-500/10 p-1.5 text-cyan-400">
            <Bell className="h-3.5 w-3.5" />
          </div>
          <span className="text-sm font-semibold text-foreground">推送控制</span>
          <Badge variant="outline" className={cn("h-5 px-1.5 text-[10px]", cfg?.isActive ? "border-green-500/30 text-green-400" : "border-muted text-muted-foreground")}>
            {cfg?.isActive ? "已激活" : "未激活"}
          </Badge>
        </div>
        {open ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
      </div>
      {open && (
        <div className="p-4 space-y-3">
          {configQuery.isLoading ? (
            <div className="space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-8 w-full rounded-xl bg-primary/10" />)}</div>
          ) : (
            <>
              <div className="flex items-center justify-between py-1">
                <div className="flex items-center gap-2">
                  <Bell className="h-4 w-4 text-cyan-400" />
                  <span className="text-sm text-foreground">Telegram 推送</span>
                </div>
                <Switch
                  checked={!!cfg?.isActive}
                  onCheckedChange={(v) => toggle("isActive", v)}
                  disabled={saveMutation.isPending}
                />
              </div>
              <div className="border-t border-border/30 pt-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <TrendingUp className="h-3 w-3 text-green-400" />交易通知
                  </span>
                  <Switch
                    checked={!!cfg?.enableTradeNotify}
                    onCheckedChange={(v) => toggle("enableTradeNotify", v)}
                    disabled={saveMutation.isPending}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <Shield className="h-3 w-3 text-red-400" />风险通知
                  </span>
                  <Switch
                    checked={!!cfg?.enableRiskNotify}
                    onCheckedChange={(v) => toggle("enableRiskNotify", v)}
                    disabled={saveMutation.isPending}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <BarChart2 className="h-3 w-3 text-blue-400" />日报推送
                  </span>
                  <Switch
                    checked={!!cfg?.enableDailyReport}
                    onCheckedChange={(v) => toggle("enableDailyReport", v)}
                    disabled={saveMutation.isPending}
                  />
                </div>
              </div>
              <div className="border-t border-border/30 pt-3 space-y-2">
                <div className="text-[11px] text-muted-foreground">
                  Bot Token: <span className="font-mono text-foreground">{cfg?.botToken ? `****${String(cfg.botToken).slice(-4)}` : "未配置"}</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-xs"
                  onClick={() => testMutation.mutate({ message: "🤖 TradingKing 推送测试 - 系统运行正常 ✅" })}
                  disabled={testMutation.isPending || !cfg?.isActive}
                >
                  <Send className="mr-1.5 h-3.5 w-3.5" />
                  {testMutation.isPending ? "发送中..." : "发送测试消息"}
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── 主组件 ──────────────────────────────────────────────────────────────────
export default function VSDataPanel() {
  const REFETCH = 60_000;
  const [selectedCoin, setSelectedCoin] = useState<{ vsTokenId: number; symbol: string; type: "chance" | "risk" | "funds" } | null>(null);

  // ── 数据查询 ──────────────────────────────────────────────────────────────
  const chanceListQ = trpc.vsOpenApi.chanceCoinList.useQuery(undefined, { refetchInterval: REFETCH });
  const riskListQ = trpc.vsOpenApi.riskCoinList.useQuery(undefined, { refetchInterval: REFETCH });
  const fundsListQ = trpc.vsOpenApi.fundsCoinList.useQuery(undefined, { refetchInterval: REFETCH });
  const btcDenseQ = trpc.vsOpenApi.btcDenseArea.useQuery(undefined, { refetchInterval: REFETCH });
  const priceMarketQ = trpc.vsOpenApi.priceMarketList.useQuery(undefined, { refetchInterval: REFETCH });
  const aiAnalyseQ = trpc.vsOpenApi.aiAnalyseList.useQuery(undefined, { refetchInterval: REFETCH });
  const largeTradeQ = trpc.vsOpenApi.largeTradeList.useQuery(undefined, { refetchInterval: REFETCH });
  const coinTradeQ = trpc.vsOpenApi.coinTrade.useQuery(undefined, { refetchInterval: REFETCH });
  const socialQ = trpc.vsOpenApi.socialSentiment.useQuery({ symbol: "BTC" }, { refetchInterval: REFETCH });

  // 代币消息（按选中代币）
  const chanceMsgQ = trpc.vsOpenApi.chanceCoinMessages.useQuery(
    { vsTokenId: selectedCoin?.vsTokenId ?? 0, symbol: selectedCoin?.symbol ?? "" },
    { enabled: !!selectedCoin && selectedCoin.type === "chance", refetchInterval: REFETCH }
  );
  const riskMsgQ = trpc.vsOpenApi.riskCoinMessages.useQuery(
    { vsTokenId: selectedCoin?.vsTokenId ?? 0, symbol: selectedCoin?.symbol ?? "" },
    { enabled: !!selectedCoin && selectedCoin.type === "risk", refetchInterval: REFETCH }
  );
  const fundsMsgQ = trpc.vsOpenApi.fundsCoinMessages.useQuery(
    { vsTokenId: selectedCoin?.vsTokenId ?? 0, symbol: selectedCoin?.symbol ?? "" },
    { enabled: !!selectedCoin && selectedCoin.type === "funds", refetchInterval: REFETCH }
  );

  const chanceList = (chanceListQ.data?.data ?? []) as any[];
  const riskList = (riskListQ.data?.data ?? []) as any[];
  const fundsList = (fundsListQ.data?.data ?? []) as any[];
  const denseList = (btcDenseQ.data?.data ?? []) as any[];
  const priceMarketList = (priceMarketQ.data?.data ?? []) as any[];
  const aiList = (aiAnalyseQ.data?.data ?? []) as any[];
  const largeList = (largeTradeQ.data?.data ?? []) as any[];
  const coinTrade = coinTradeQ.data?.data;
  const social = socialQ.data?.data;

  const activeMsgQ = selectedCoin?.type === "chance" ? chanceMsgQ : selectedCoin?.type === "risk" ? riskMsgQ : fundsMsgQ;
  const activeMsgs = (activeMsgQ.data?.data ?? []) as any[];

  const handleSelectCoin = (item: any, type: "chance" | "risk" | "funds") => {
    const vsTokenId = Number(item?.vsTokenId ?? item?.tokenId ?? item?.id ?? 0);
    const symbol = item?.symbol || item?.coin || "";
    if (!vsTokenId) { toast.error("该代币暂无 vsTokenId，无法加载消息"); return; }
    setSelectedCoin(prev =>
      prev?.vsTokenId === vsTokenId && prev?.type === type ? null : { vsTokenId, symbol, type }
    );
  };

  // 调试信息
  const debugInfo = {
    chanceLoading: chanceListQ.isLoading,
    chanceError: chanceListQ.isError,
    chanceDataType: typeof chanceListQ.data,
    chanceDataKeys: chanceListQ.data ? Object.keys(chanceListQ.data as any).join(',') : 'null',
    chanceListLen: chanceList.length,
    chanceStatus: chanceListQ.status,
    // fearGreed 对比
    fgKeys: fearGreedQ.data ? Object.keys(fearGreedQ.data as any).join(',') : 'null',
    fgStatus: fearGreedQ.status,
    fgRaw: JSON.stringify(fearGreedQ.data)?.slice(0, 100),
  };

  return (
    <div className="space-y-5 p-4 lg:p-6">
      {/* 调试面板 */}
      <div className="rounded-lg bg-yellow-500/10 border border-yellow-500/30 p-3 text-xs font-mono text-yellow-300">
        <div>DEBUG: loading={String(debugInfo.chanceLoading)} error={String(debugInfo.chanceError)} status={debugInfo.chanceStatus}</div>
        <div>data type={debugInfo.chanceDataType} keys={debugInfo.chanceDataKeys} listLen={debugInfo.chanceListLen}</div>
        <div>raw data: {JSON.stringify(chanceListQ.data)?.slice(0, 200)}</div>
        <div>FG: status={debugInfo.fgStatus} keys={debugInfo.fgKeys} raw={debugInfo.fgRaw}</div>
      </div>
      {/* 页头 */}
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl font-bold text-foreground">VS 数据面板</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">ValueScan Open API · 实时代币信号 · 推送控制</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="text-xs" onClick={() => {
            chanceListQ.refetch(); riskListQ.refetch(); fundsListQ.refetch();
            btcDenseQ.refetch(); priceMarketQ.refetch(); aiAnalyseQ.refetch();
            largeTradeQ.refetch(); coinTradeQ.refetch(); socialQ.refetch();
            toast.info("数据刷新中...");
          }}>
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />全局刷新
          </Button>
        </div>
      </div>

      {/* 双栏布局：左侧数据面板 + 右侧推送控制 */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_320px]">
        {/* ── 左侧：13个数据模块 ────────────────────────────────────────── */}
        <div className="space-y-4">
          {/* 第一行：机会/风险/资金异动 代币列表 */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {/* 机会代币列表 */}
            <PanelCard title="机会代币" icon={TrendingUp} iconColor="text-green-400" count={chanceList.length} loading={chanceListQ.isLoading}>
              {chanceList.length === 0 ? (
                <EmptyState icon={<TrendingUp className="h-8 w-8" />} title="暂无机会代币" description="当前没有机会代币信号" className="py-4" />
              ) : (
                <div>
                  {chanceList.slice(0, 8).map((item, i) => (
                    <div key={i} className={cn("cursor-pointer rounded-lg transition-colors", selectedCoin?.vsTokenId === Number(item?.vsTokenId) && selectedCoin?.type === "chance" ? "bg-green-500/10" : "hover:bg-primary/5")}
                      onClick={() => handleSelectCoin(item, "chance")}>
                      <CoinRow item={item} type="chance" />
                    </div>
                  ))}
                </div>
              )}
            </PanelCard>

            {/* 风险代币列表 */}
            <PanelCard title="风险代币" icon={AlertTriangle} iconColor="text-red-400" count={riskList.length} loading={riskListQ.isLoading}>
              {riskList.length === 0 ? (
                <EmptyState icon={<AlertTriangle className="h-8 w-8" />} title="暂无风险代币" description="当前没有风险代币信号" className="py-4" />
              ) : (
                <div>
                  {riskList.slice(0, 8).map((item, i) => (
                    <div key={i} className={cn("cursor-pointer rounded-lg transition-colors", selectedCoin?.vsTokenId === Number(item?.vsTokenId) && selectedCoin?.type === "risk" ? "bg-red-500/10" : "hover:bg-primary/5")}
                      onClick={() => handleSelectCoin(item, "risk")}>
                      <CoinRow item={item} type="risk" />
                    </div>
                  ))}
                </div>
              )}
            </PanelCard>

            {/* 资金异动列表 */}
            <PanelCard title="资金异动" icon={DollarSign} iconColor="text-blue-400" count={fundsList.length} loading={fundsListQ.isLoading}>
              {fundsList.length === 0 ? (
                <EmptyState icon={<DollarSign className="h-8 w-8" />} title="暂无资金异动" description="当前没有资金异动信号" className="py-4" />
              ) : (
                <div>
                  {fundsList.slice(0, 8).map((item, i) => (
                    <div key={i} className={cn("cursor-pointer rounded-lg transition-colors", selectedCoin?.vsTokenId === Number(item?.vsTokenId) && selectedCoin?.type === "funds" ? "bg-blue-500/10" : "hover:bg-primary/5")}
                      onClick={() => handleSelectCoin(item, "funds")}>
                      <CoinRow item={item} type="funds" />
                    </div>
                  ))}
                </div>
              )}
            </PanelCard>
          </div>

          {/* 代币消息区（点击代币后展开） */}
          {selectedCoin && (
            <PanelCard
              title={`${selectedCoin.symbol} · ${selectedCoin.type === "chance" ? "机会" : selectedCoin.type === "risk" ? "风险" : "资金"} 消息`}
              icon={MessageSquare}
              iconColor={selectedCoin.type === "chance" ? "text-green-400" : selectedCoin.type === "risk" ? "text-red-400" : "text-blue-400"}
              count={activeMsgs.length}
              loading={activeMsgQ.isLoading}
            >
              {activeMsgs.length === 0 ? (
                <EmptyState icon={<MessageSquare className="h-8 w-8" />} title="暂无消息" description="该代币当前没有信号消息" className="py-4" />
              ) : (
                <div className="max-h-48 overflow-y-auto">
                  {activeMsgs.map((msg, i) => <MessageRow key={i} msg={msg} symbol={selectedCoin.symbol} />)}
                </div>
              )}
            </PanelCard>
          )}

          {/* 第二行：BTC压力支撑 + 主力行为 */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* BTC 压力支撑位 */}
            <PanelCard title="BTC 压力支撑位" icon={Layers} iconColor="text-yellow-400" count={denseList.length} loading={btcDenseQ.isLoading}>
              {denseList.length === 0 ? (
                <EmptyState icon={<Layers className="h-8 w-8" />} title="暂无数据" description="暂无压力支撑数据" className="py-4" />
              ) : (
                <div className="space-y-1.5">
                  {denseList.slice(0, 8).map((item: any, i: number) => {
                    const price = Number(item?.price ?? item?.level ?? item?.value ?? 0);
                    const type = item?.type || item?.direction || (i % 2 === 0 ? "support" : "resistance");
                    const isSupport = /support|支撑|buy/i.test(String(type));
                    const strength = Number(item?.strength ?? item?.weight ?? item?.volume ?? 0);
                    return (
                      <div key={i} className="flex items-center gap-2 border-b border-border/30 py-1.5 last:border-0">
                        <div className={cn("h-2 w-2 rounded-full flex-shrink-0", isSupport ? "bg-green-400" : "bg-red-400")} />
                        <span className="flex-1 text-xs font-mono text-foreground">{fmtPrice(price)}</span>
                        <span className={cn("text-[10px] rounded border px-1.5 py-0.5",
                          isSupport ? "border-green-500/30 bg-green-500/10 text-green-400" : "border-red-500/30 bg-red-500/10 text-red-400"
                        )}>{isSupport ? "支撑" : "压力"}</span>
                        {strength > 0 && <span className="text-[10px] text-muted-foreground font-mono">{fmtAmount(strength)}</span>}
                      </div>
                    );
                  })}
                </div>
              )}
            </PanelCard>

            {/* 主力行为指标 */}
            <PanelCard title="主力行为指标" icon={Cpu} iconColor="text-purple-400" count={priceMarketList.length} loading={priceMarketQ.isLoading}>
              {priceMarketList.length === 0 ? (
                <EmptyState icon={<Cpu className="h-8 w-8" />} title="暂无数据" description="暂无主力行为指标" className="py-4" />
              ) : (
                <div className="space-y-1.5">
                  {priceMarketList.slice(0, 8).map((item: any, i: number) => {
                    const label = item?.name || item?.indicator || item?.type || `指标 ${i + 1}`;
                    const value = item?.value ?? item?.score ?? item?.signal;
                    const ts = item?.ts || item?.time || item?.timestamp;
                    return (
                      <div key={i} className="flex items-center gap-2 border-b border-border/30 py-1.5 last:border-0">
                        <span className="flex-1 text-xs text-muted-foreground truncate">{label}</span>
                        <span className="text-xs font-mono text-foreground">{value !== undefined ? String(value) : "—"}</span>
                        {ts && <span className="text-[10px] text-muted-foreground">{timeAgo(ts)}</span>}
                      </div>
                    );
                  })}
                </div>
              )}
            </PanelCard>
          </div>

          {/* 第三行：大盘解析历史 + 大额交易 */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* 大盘解析历史 */}
            <PanelCard title="大盘解析历史" icon={Sparkles} iconColor="text-cyan-400" count={aiList.length} loading={aiAnalyseQ.isLoading}>
              {aiList.length === 0 ? (
                <EmptyState icon={<Sparkles className="h-8 w-8" />} title="暂无AI解析" description="暂无大盘AI解析历史" className="py-4" />
              ) : (
                <div className="max-h-64 overflow-y-auto space-y-2">
                  {aiList.slice(0, 10).map((item: any, i: number) => {
                    const content = item?.content || item?.analyse || item?.text || item?.summary || "";
                    const ts = item?.ts || item?.time || item?.createTime;
                    const sentiment = item?.sentiment || item?.direction || "";
                    return (
                      <div key={i} className="border-b border-border/30 pb-2 last:border-0">
                        <div className="flex items-center justify-between mb-1">
                          {sentiment && (
                            <span className={cn("text-[10px] rounded border px-1.5 py-0.5",
                              /bull|多|上涨|看涨/i.test(sentiment) ? "border-green-500/30 bg-green-500/10 text-green-400" :
                              /bear|空|下跌|看跌/i.test(sentiment) ? "border-red-500/30 bg-red-500/10 text-red-400" :
                              "border-cyan-500/30 bg-cyan-500/10 text-cyan-400"
                            )}>{sentiment}</span>
                          )}
                          <span className="text-[10px] text-muted-foreground ml-auto">{timeAgo(ts)}</span>
                        </div>
                        <p className="text-xs text-muted-foreground leading-5 line-clamp-3">{content || "—"}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </PanelCard>

            {/* 大额交易列表 */}
            <PanelCard title="大额交易" icon={Zap} iconColor="text-orange-400" count={largeList.length} loading={largeTradeQ.isLoading}>
              {largeList.length === 0 ? (
                <EmptyState icon={<Zap className="h-8 w-8" />} title="暂无大额交易" description="暂无大额交易记录" className="py-4" />
              ) : (
                <div className="space-y-1.5 max-h-64 overflow-y-auto">
                  {largeList.slice(0, 10).map((item: any, i: number) => {
                    const amount = item?.amount ?? item?.value ?? item?.usdValue ?? 0;
                    const side = item?.side || item?.direction || item?.type || "";
                    const isBuy = /buy|in|多|流入/i.test(String(side));
                    const ts = item?.ts || item?.time || item?.timestamp;
                    const hash = item?.hash || item?.txHash || "";
                    return (
                      <div key={i} className="flex items-center gap-2 border-b border-border/30 py-1.5 last:border-0">
                        <div className={cn("h-2 w-2 rounded-full flex-shrink-0", isBuy ? "bg-green-400" : "bg-red-400")} />
                        <span className="flex-1 text-xs font-mono text-foreground">{fmtAmount(amount)}</span>
                        <span className={cn("text-[10px] rounded border px-1.5 py-0.5",
                          isBuy ? "border-green-500/30 bg-green-500/10 text-green-400" : "border-red-500/30 bg-red-500/10 text-red-400"
                        )}>{isBuy ? "买入" : "卖出"}</span>
                        {ts && <span className="text-[10px] text-muted-foreground">{timeAgo(ts)}</span>}
                      </div>
                    );
                  })}
                </div>
              )}
            </PanelCard>
          </div>

          {/* 第四行：实时资金积累 + 社媒情绪 */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* 实时资金积累（BTC） */}
            <PanelCard title="实时资金积累 (BTC)" icon={Database} iconColor="text-yellow-400" loading={coinTradeQ.isLoading}>
              {!coinTrade ? (
                <EmptyState icon={<Database className="h-8 w-8" />} title="暂无数据" description="暂无资金积累数据" className="py-4" />
              ) : (
                <div className="space-y-2">
                  {[
                    { label: "净流入", value: fmtAmount(coinTrade?.netInflow ?? coinTrade?.netFlow ?? coinTrade?.net), up: Number(coinTrade?.netInflow ?? coinTrade?.netFlow ?? 0) >= 0 },
                    { label: "买入量", value: fmtAmount(coinTrade?.buyAmount ?? coinTrade?.flowIn ?? coinTrade?.buy), up: true },
                    { label: "卖出量", value: fmtAmount(coinTrade?.sellAmount ?? coinTrade?.flowOut ?? coinTrade?.sell), up: false },
                    { label: "大单净流", value: fmtAmount(coinTrade?.largeNetInflow ?? coinTrade?.bigNetFlow ?? coinTrade?.largeNet), up: Number(coinTrade?.largeNetInflow ?? 0) >= 0 },
                    { label: "价格", value: fmtPrice(coinTrade?.price ?? coinTrade?.lastPrice), up: null },
                    { label: "24h涨跌", value: fmtChange(coinTrade?.change24h ?? coinTrade?.priceChangePercent24h).text, up: Number(coinTrade?.change24h ?? 0) >= 0 },
                  ].map((row, i) => (
                    <div key={i} className="flex items-center justify-between border-b border-border/30 py-1.5 last:border-0">
                      <span className="text-xs text-muted-foreground">{row.label}</span>
                      <span className={cn("text-xs font-mono", row.up === true ? "text-green-400" : row.up === false ? "text-red-400" : "text-foreground")}>
                        {row.value}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </PanelCard>

            {/* 社媒情绪 */}
            <PanelCard title="社媒情绪 (BTC)" icon={Globe} iconColor="text-pink-400" loading={socialQ.isLoading}>
              {!social ? (
                <EmptyState icon={<Globe className="h-8 w-8" />} title="暂无数据" description="暂无社媒情绪数据" className="py-4" />
              ) : (
                <div className="space-y-3">
                  {/* 情绪仪表盘 */}
                  <div className="flex items-center justify-center py-2">
                    <div className="relative flex h-28 w-28 items-center justify-center rounded-full border-4 border-primary/20 bg-primary/5">
                      <div className="text-center">
                        <div className={cn("text-3xl font-bold font-mono",
                          Number(social?.sentiment ?? social?.socialScore ?? 50) >= 60 ? "text-green-400" :
                          Number(social?.sentiment ?? social?.socialScore ?? 50) >= 40 ? "text-yellow-400" : "text-red-400"
                        )}>
                          {Math.round(Number(social?.sentiment ?? social?.socialScore ?? 50))}
                        </div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">情绪指数</div>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    {[
                      { label: "社交评分", value: fmt(social?.socialScore ?? social?.sentiment, 0) },
                      { label: "提及次数", value: (social?.mentionCount ?? "—").toString() },
                      { label: "数据来源", value: social?.source ?? "ValueScan" },
                      { label: "代币", value: social?.symbol ?? "BTC" },
                    ].map((row, i) => (
                      <div key={i} className="flex items-center justify-between border-b border-border/30 py-1 last:border-0">
                        <span className="text-xs text-muted-foreground">{row.label}</span>
                        <span className="text-xs font-mono text-foreground">{row.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </PanelCard>
          </div>
        </div>

        {/* ── 右侧：推送控制面板 ────────────────────────────────────────── */}
        <div className="space-y-4">
          <PushControlPanel />

          {/* VS 连接状态 */}
          <VSStatusCard />
        </div>
      </div>
    </div>
  );
}

// ─── VS 状态卡片 ──────────────────────────────────────────────────────────────
function VSStatusCard() {
  const tokenQ = trpc.valueScan.tokenStatus.useQuery(undefined, { refetchInterval: 30_000 });
  const apiKeyQ = trpc.valueScan.getApiKeyConfig.useQuery();
  const fearGreedQ = trpc.valueScan.fearGreed.useQuery(undefined, { refetchInterval: 60_000 });

  const token = tokenQ.data;
  const apiKey = apiKeyQ.data;
  const fg = fearGreedQ.data?.data;

  return (
    <PanelCard title="VS 连接状态" icon={Activity} iconColor="text-green-400" loading={tokenQ.isLoading}>
      <div className="space-y-2">
        <div className="flex items-center justify-between border-b border-border/30 py-1.5">
          <span className="text-xs text-muted-foreground">API Key</span>
          <span className={cn("text-xs font-mono", apiKey?.usingDbKey ? "text-green-400" : "text-muted-foreground")}>
            {apiKey?.usingDbKey ? `✓ ${apiKey.apiKeyPreview}` : "未配置"}
          </span>
        </div>
        <div className="flex items-center justify-between border-b border-border/30 py-1.5">
          <span className="text-xs text-muted-foreground">用户 Token</span>
          <span className={cn("text-xs font-mono", token?.hasToken && !token?.isExpired ? "text-green-400" : "text-red-400")}>
            {token?.hasToken ? (token.isExpired ? "已过期" : "✓ 有效") : "未设置"}
          </span>
        </div>
        <div className="flex items-center justify-between border-b border-border/30 py-1.5">
          <span className="text-xs text-muted-foreground">Token 设置于</span>
          <span className="text-xs font-mono text-muted-foreground">{token?.tokenSetAt ? timeAgo(token.tokenSetAt) : "—"}</span>
        </div>
        <div className="flex items-center justify-between border-b border-border/30 py-1.5">
          <span className="text-xs text-muted-foreground">恐贪指数</span>
          <span className={cn("text-xs font-mono",
            Number(fg?.now ?? 50) >= 60 ? "text-green-400" : Number(fg?.now ?? 50) >= 40 ? "text-yellow-400" : "text-red-400"
          )}>
            {fg?.now ?? "—"} {Number(fg?.now ?? 0) >= 60 ? "贪婪" : Number(fg?.now ?? 0) >= 40 ? "中性" : "恐惧"}
          </span>
        </div>
        {fg && (
          <>
            <div className="flex items-center justify-between border-b border-border/30 py-1.5">
              <span className="text-xs text-muted-foreground">昨日</span>
              <span className="text-xs font-mono text-muted-foreground">{fg.yesterday ?? "—"}</span>
            </div>
            <div className="flex items-center justify-between py-1.5">
              <span className="text-xs text-muted-foreground">上周</span>
              <span className="text-xs font-mono text-muted-foreground">{fg.lastWeek ?? "—"}</span>
            </div>
          </>
        )}
      </div>
    </PanelCard>
  );
}
