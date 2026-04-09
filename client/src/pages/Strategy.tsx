import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { Shield, Save, AlertTriangle, Power, Settings2, Sliders } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type ConfigForm = {
  name: string;
  signalTimeWindow: number; minSignalScore: number; enableFomoIntensify: boolean;
  maxPositionPercent: number; maxTotalPositionPercent: number; maxDailyTrades: number; maxDailyLossPercent: number;
  stopLossPercent: number; takeProfit1Percent: number; takeProfit2Percent: number;
  leverage: number; marginType: "ISOLATED" | "CROSSED"; symbolSuffix: string;
  enableTrailingStop: boolean; trailingStopActivation: number; trailingStopCallback: number;
  autoTradingEnabled: boolean; useTestnet: boolean; emergencyStop: boolean;
};

function SliderField({ label, value, min, max, step = 0.1, unit = "", onChange, description }: {
  label: string; value: number; min: number; max: number; step?: number; unit?: string; onChange: (v: number) => void; description?: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <label className="text-sm font-medium text-foreground">{label}</label>
        <span className="text-sm font-mono text-primary font-medium">{value}{unit}</span>
      </div>
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        className="w-full h-1.5 bg-muted rounded-full appearance-none cursor-pointer accent-primary" />
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{min}{unit}</span><span>{max}{unit}</span>
      </div>
    </div>
  );
}

function ToggleField({ label, value, onChange, description }: { label: string; value: boolean; onChange: (v: boolean) => void; description?: string }) {
  return (
    <div className="flex items-center justify-between py-2">
      <div>
        <div className="text-sm font-medium text-foreground">{label}</div>
        {description && <div className="text-xs text-muted-foreground mt-0.5">{description}</div>}
      </div>
      <button onClick={() => onChange(!value)}
        className={cn("relative w-10 h-5 rounded-full transition-colors duration-200 flex-shrink-0",
          value ? "bg-primary" : "bg-muted"
        )}>
        <div className={cn("absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform duration-200",
          value ? "translate-x-5" : "translate-x-0.5"
        )} />
      </button>
    </div>
  );
}

export default function Strategy() {
  const { data: config, refetch } = trpc.config.active.useQuery();
  const [form, setForm] = useState<ConfigForm>({
    name: "默认策略", signalTimeWindow: 300, minSignalScore: 0.6, enableFomoIntensify: true,
    maxPositionPercent: 10, maxTotalPositionPercent: 50, maxDailyTrades: 20, maxDailyLossPercent: 5,
    stopLossPercent: 3, takeProfit1Percent: 5, takeProfit2Percent: 10,
    leverage: 5, marginType: "ISOLATED", symbolSuffix: "USDT",
    enableTrailingStop: false, trailingStopActivation: 3, trailingStopCallback: 1.5,
    autoTradingEnabled: false, useTestnet: true, emergencyStop: false,
  });

  useEffect(() => {
    if (config) {
      setForm(f => ({
        ...f,
        name: config.name ?? f.name,
        signalTimeWindow: config.signalTimeWindow ?? f.signalTimeWindow,
        minSignalScore: config.minSignalScore ?? f.minSignalScore,
        enableFomoIntensify: config.enableFomoIntensify ?? f.enableFomoIntensify,
        maxPositionPercent: config.maxPositionPercent ?? f.maxPositionPercent,
        maxTotalPositionPercent: config.maxTotalPositionPercent ?? f.maxTotalPositionPercent,
        maxDailyTrades: config.maxDailyTrades ?? f.maxDailyTrades,
        maxDailyLossPercent: config.maxDailyLossPercent ?? f.maxDailyLossPercent,
        stopLossPercent: config.stopLossPercent ?? f.stopLossPercent,
        takeProfit1Percent: config.takeProfit1Percent ?? f.takeProfit1Percent,
        takeProfit2Percent: config.takeProfit2Percent ?? f.takeProfit2Percent,
        leverage: config.leverage ?? f.leverage,
        marginType: (config.marginType as "ISOLATED" | "CROSSED") ?? f.marginType,
        symbolSuffix: config.symbolSuffix ?? f.symbolSuffix,
        enableTrailingStop: config.enableTrailingStop ?? f.enableTrailingStop,
        trailingStopActivation: config.trailingStopActivation ?? f.trailingStopActivation,
        trailingStopCallback: config.trailingStopCallback ?? f.trailingStopCallback,
        autoTradingEnabled: config.autoTradingEnabled ?? f.autoTradingEnabled,
        useTestnet: config.useTestnet ?? f.useTestnet,
        emergencyStop: config.emergencyStop ?? f.emergencyStop,
      }));
    }
  }, [config]);

  const saveMutation = trpc.config.save.useMutation({
    onSuccess: () => { toast.success("策略配置已保存"); refetch(); },
    onError: () => toast.error("保存失败"),
  });

  const toggleEmergencyMutation = trpc.config.toggleEmergencyStop.useMutation({
    onSuccess: (_, vars) => {
      toast[vars.enabled ? "error" : "success"](vars.enabled ? "⚠️ 紧急停止已启用！所有交易暂停" : "✅ 紧急停止已解除");
      refetch();
    }
  });

  const toggleAutoMutation = trpc.config.toggleAutoTrading.useMutation({
    onSuccess: (_, vars) => {
      toast[vars.enabled ? "success" : "info"](vars.enabled ? "✅ 自动交易已启用" : "自动交易已禁用");
      refetch();
    }
  });

  const set = (key: keyof ConfigForm) => (v: any) => setForm(f => ({ ...f, [key]: v }));

  // 预期胜率计算
  const expectedWinRate = Math.min(95, Math.max(30,
    50 + (form.minSignalScore - 0.5) * 60 + (form.stopLossPercent < form.takeProfit1Percent ? 10 : -5)
  ));

  const riskRewardRatio = form.takeProfit1Percent / form.stopLossPercent;

  return (
    <div className="p-4 lg:p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">策略配置</h1>
          <p className="text-sm text-muted-foreground mt-0.5">配置信号聚合参数与风险管理规则</p>
        </div>
        <Button onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending} className="text-xs">
          <Save className="w-3.5 h-3.5 mr-1.5" />{saveMutation.isPending ? "保存中..." : "保存配置"}
        </Button>
      </div>

      {/* Strategy Preview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="gradient-card rounded-xl p-4 text-center">
          <div className="text-2xl font-bold font-mono text-profit">{expectedWinRate.toFixed(0)}%</div>
          <div className="text-xs text-muted-foreground mt-1">预期胜率</div>
        </div>
        <div className="gradient-card rounded-xl p-4 text-center">
          <div className="text-2xl font-bold font-mono text-primary">{riskRewardRatio.toFixed(1)}x</div>
          <div className="text-xs text-muted-foreground mt-1">盈亏比</div>
        </div>
        <div className="gradient-card rounded-xl p-4 text-center">
          <div className="text-2xl font-bold font-mono text-fomo">{form.leverage}x</div>
          <div className="text-xs text-muted-foreground mt-1">杠杆倍数</div>
        </div>
        <div className="gradient-card rounded-xl p-4 text-center">
          <div className={cn("text-2xl font-bold font-mono", form.autoTradingEnabled ? "text-profit" : "text-muted-foreground")}>
            {form.autoTradingEnabled ? "运行" : "暂停"}
          </div>
          <div className="text-xs text-muted-foreground mt-1">自动交易</div>
        </div>
      </div>

      {/* Emergency Stop Banner */}
      {form.emergencyStop && (
        <div className="flex items-center gap-3 p-4 bg-destructive/10 border border-destructive/30 rounded-xl">
          <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0" />
          <div className="flex-1">
            <div className="text-sm font-semibold text-destructive">紧急停止已激活</div>
            <div className="text-xs text-muted-foreground">所有自动交易已暂停，请检查账户状态</div>
          </div>
          {config?.id && (
            <Button variant="outline" size="sm" className="text-xs border-destructive/30 text-destructive"
              onClick={() => toggleEmergencyMutation.mutate({ id: config.id, enabled: false })}>
              解除停止
            </Button>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Signal Engine Config */}
        <div className="gradient-card rounded-xl p-5 space-y-5">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">信号聚合参数</h3>
          </div>
          <SliderField label="信号时间窗口" value={form.signalTimeWindow} min={60} max={1800} step={30} unit="s"
            onChange={set("signalTimeWindow")} description="FOMO 与 Alpha 信号需在此时间窗口内同时出现才触发聚合" />
          <SliderField label="最低信号评分" value={form.minSignalScore} min={0.3} max={0.95} step={0.05} unit=""
            onChange={v => set("minSignalScore")(parseFloat(v.toFixed(2)))} description="低于此评分的聚合信号将被过滤，越高越严格" />
          <ToggleField label="FOMO 增强模式" value={form.enableFomoIntensify} onChange={set("enableFomoIntensify")}
            description="启用后，FOMO增强信号(112)的权重提升至1.0" />
        </div>

        {/* Risk Management */}
        <div className="gradient-card rounded-xl p-5 space-y-5">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">风险管理</h3>
          </div>
          <SliderField label="单仓最大仓位" value={form.maxPositionPercent} min={1} max={50} step={1} unit="%"
            onChange={set("maxPositionPercent")} description="单个标的最大占账户余额的比例" />
          <SliderField label="总仓位上限" value={form.maxTotalPositionPercent} min={10} max={100} step={5} unit="%"
            onChange={set("maxTotalPositionPercent")} description="所有持仓总价值占账户余额的上限" />
          <SliderField label="每日最大交易次数" value={form.maxDailyTrades} min={1} max={50} step={1} unit="次"
            onChange={set("maxDailyTrades")} description="超过此次数后当日不再开新仓" />
          <SliderField label="每日最大亏损" value={form.maxDailyLossPercent} min={0.5} max={20} step={0.5} unit="%"
            onChange={set("maxDailyLossPercent")} description="当日亏损超过此比例时自动停止交易" />
        </div>

        {/* Stop Loss / Take Profit */}
        <div className="gradient-card rounded-xl p-5 space-y-5">
          <div className="flex items-center gap-2">
            <Settings2 className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">止损止盈设置</h3>
          </div>
          <SliderField label="止损比例" value={form.stopLossPercent} min={0.5} max={15} step={0.5} unit="%"
            onChange={set("stopLossPercent")} description="从开仓价下跌此比例时触发止损" />
          <SliderField label="第一止盈" value={form.takeProfit1Percent} min={1} max={30} step={0.5} unit="%"
            onChange={set("takeProfit1Percent")} description="从开仓价上涨此比例时触发第一止盈（平50%仓位）" />
          <SliderField label="第二止盈" value={form.takeProfit2Percent} min={2} max={50} step={1} unit="%"
            onChange={set("takeProfit2Percent")} description="从开仓价上涨此比例时触发第二止盈（平剩余仓位）" />
          <div className="p-3 bg-accent rounded-lg">
            <div className="text-xs text-muted-foreground mb-1">盈亏比预览</div>
            <div className="flex items-center gap-2">
              <span className="text-loss text-sm font-mono">-{form.stopLossPercent}%</span>
              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden relative">
                <div className="absolute left-0 top-0 h-full bg-loss rounded-full" style={{ width: `${(form.stopLossPercent / (form.stopLossPercent + form.takeProfit2Percent)) * 100}%` }} />
                <div className="absolute right-0 top-0 h-full bg-profit rounded-full" style={{ width: `${(form.takeProfit2Percent / (form.stopLossPercent + form.takeProfit2Percent)) * 100}%` }} />
              </div>
              <span className="text-profit text-sm font-mono">+{form.takeProfit2Percent}%</span>
            </div>
            <div className="text-xs text-muted-foreground mt-1">盈亏比: <span className="text-primary font-mono font-medium">{riskRewardRatio.toFixed(2)}:1</span></div>
          </div>
          <ToggleField label="移动止损" value={form.enableTrailingStop} onChange={set("enableTrailingStop")}
            description="盈利达到激活线后，止损随价格移动" />
          {form.enableTrailingStop && (
            <>
              <SliderField label="激活线" value={form.trailingStopActivation} min={1} max={20} step={0.5} unit="%"
                onChange={set("trailingStopActivation")} />
              <SliderField label="回调幅度" value={form.trailingStopCallback} min={0.5} max={10} step={0.5} unit="%"
                onChange={set("trailingStopCallback")} />
            </>
          )}
        </div>

        {/* Trading Controls */}
        <div className="gradient-card rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Power className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">交易控制</h3>
          </div>
          <SliderField label="杠杆倍数" value={form.leverage} min={1} max={20} step={1} unit="x"
            onChange={set("leverage")} description="合约杠杆倍数，建议不超过10x" />
          <div className="space-y-1">
            <label className="text-sm font-medium text-foreground">保证金模式</label>
            <div className="flex gap-2">
              {(["ISOLATED", "CROSSED"] as const).map(mode => (
                <button key={mode} onClick={() => set("marginType")(mode)}
                  className={cn("flex-1 py-2 text-xs rounded-lg border transition-colors",
                    form.marginType === mode ? "bg-primary/15 border-primary/30 text-primary" : "bg-accent border-border text-muted-foreground hover:text-foreground"
                  )}>
                  {mode === "ISOLATED" ? "逐仓" : "全仓"}
                </button>
              ))}
            </div>
          </div>
          <div className="border-t border-border pt-4 space-y-3">
            <ToggleField label="测试网模式" value={form.useTestnet} onChange={set("useTestnet")}
              description="启用后使用币安测试网，不会产生真实交易" />
            <ToggleField label="自动交易" value={form.autoTradingEnabled} onChange={set("autoTradingEnabled")}
              description="启用后系统将自动执行聚合信号触发的交易" />
          </div>
          {/* Emergency Stop */}
          <div className="border-t border-border pt-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-foreground">紧急停止</div>
                <div className="text-xs text-muted-foreground mt-0.5">立即暂停所有自动交易</div>
              </div>
              {config?.id ? (
                <Button variant="outline" size="sm"
                  className={cn("text-xs", config.emergencyStop ? "border-profit/30 text-profit" : "border-destructive/30 text-destructive")}
                  onClick={() => toggleEmergencyMutation.mutate({ id: config.id, enabled: !config.emergencyStop })}>
                  {config.emergencyStop ? "解除停止" : "紧急停止"}
                </Button>
              ) : (
                <Button variant="outline" size="sm" className="text-xs border-destructive/30 text-destructive"
                  onClick={() => { set("emergencyStop")(!form.emergencyStop); }}>
                  {form.emergencyStop ? "解除停止" : "紧急停止"}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
