/**
 * ValueScan 连接配置页面
 * - 服务端 API Key 认证（24小时稳定运行，无需用户操作）
 * - 图文指引：如何获取 Token（地址栏/控制台/手机App）
 * - 实时状态指示器
 * - Token 过期弹窗提醒
 */
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  CheckCircle,
  XCircle,
  ExternalLink,
  Eye,
  EyeOff,
  RefreshCw,
  Wifi,
  WifiOff,
  Info,
  Copy,
  Check,
  AlertTriangle,
  Terminal,
  Globe,
  Smartphone,
  Key,
  Server,
  Shield,
  Zap,
  Clock,
  ArrowRight,
  MousePointer,
  Monitor,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";

// ── 步骤卡片组件 ──────────────────────────────────────────────
function StepCard({ step, title, children }: { step: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-xs font-bold text-blue-400">
        {step}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground mb-1">{title}</p>
        {children}
      </div>
    </div>
  );
}

// ── 代码块组件 ─────────────────────────────────────────────────
function CodeBlock({ code, copyKey, copiedStates, onCopy }: {
  code: string;
  copyKey: string;
  copiedStates: Record<string, boolean>;
  onCopy: (key: string, text: string) => void;
}) {
  return (
    <div className="relative mt-2">
      <div className="bg-black/40 rounded-lg p-3 font-mono text-xs text-green-400 break-all border border-green-500/20 pr-10">
        {code}
      </div>
      <button
        onClick={() => onCopy(copyKey, code)}
        className="absolute top-2 right-2 p-1.5 rounded bg-accent hover:bg-accent/80 text-muted-foreground hover:text-foreground transition-colors"
        title="复制"
      >
        {copiedStates[copyKey] ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
      </button>
    </div>
  );
}

// ── 状态指示器（顶部横幅）─────────────────────────────────────
function StatusBanner({ apiKeyOk, hasToken, isLoading }: { apiKeyOk: boolean; hasToken: boolean; isLoading: boolean }) {
  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-muted/50 border border-border">
        <RefreshCw className="w-4 h-4 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">正在检测连接状态...</span>
      </div>
    );
  }

  if (!apiKeyOk) {
    return (
      <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-red-500/10 border border-red-500/30">
        <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
        <span className="text-sm text-red-300">
          <strong>API Key 连接失败</strong> — 请检查网络连接或联系管理员
        </span>
      </div>
    );
  }

  if (apiKeyOk && !hasToken) {
    return (
      <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
        <AlertTriangle className="w-4 h-4 text-yellow-400 flex-shrink-0" />
        <span className="text-sm text-yellow-300">
          <strong>基础连接正常</strong> — AI信号、资金流数据已就绪。配置 Token 后可获取实时预警信号
        </span>
        <Badge variant="outline" className="ml-auto border-yellow-500/50 text-yellow-400 text-xs flex-shrink-0">
          部分功能
        </Badge>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-green-500/10 border border-green-500/30">
      <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
      <span className="text-sm text-green-300">
        <strong>完整连接</strong> — 所有数据源已连接，24小时稳定运行
      </span>
      <Badge variant="outline" className="ml-auto border-green-500/50 text-green-400 text-xs flex-shrink-0">
        <Zap className="w-3 h-3 mr-1" />全功能
      </Badge>
    </div>
  );
}

// ── 主组件 ────────────────────────────────────────────────────
export default function VSConnect() {
  const { user } = useAuth();
  const [tokenInput, setTokenInput] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [copiedStates, setCopiedStates] = useState<Record<string, boolean>>({});
  const [showExpiredDialog, setShowExpiredDialog] = useState(false);
  const [expiredDismissed, setExpiredDismissed] = useState(false);

  // ── tRPC 查询 ──────────────────────────────────────────────
  const { data: tokenStatus, isLoading: statusLoading, refetch: refetchStatus } = trpc.valueScan.tokenStatus.useQuery(
    undefined, { refetchInterval: 30000 }
  );
  const { data: accountInfo } = trpc.valueScan.accountInfo.useQuery(
    undefined, { refetchInterval: 60000 }
  );
  const { data: fearGreed, isLoading: fearGreedLoading } = trpc.valueScan.fearGreed.useQuery(
    undefined, { refetchInterval: 60000 }
  );

  // ── Token 过期检测 ─────────────────────────────────────────
  useEffect(() => {
    if (!expiredDismissed && tokenStatus?.hasToken === false && !statusLoading) {
      // 如果之前有 token 但现在没有（可能过期了），显示弹窗
      const hadToken = localStorage.getItem("vs_had_token");
      if (hadToken === "true") {
        setShowExpiredDialog(true);
      }
    }
    if (tokenStatus?.hasToken) {
      localStorage.setItem("vs_had_token", "true");
    }
  }, [tokenStatus, statusLoading, expiredDismissed]);

  // ── 设置 Token ─────────────────────────────────────────────
  const setTokenMutation = trpc.valueScan.setToken.useMutation({
    onSuccess: () => {
      toast.success("✅ Token 已配置到服务端！实时预警信号已启用");
      setTokenInput("");
      setShowExpiredDialog(false);
      setExpiredDismissed(false);
      refetchStatus();
    },
    onError: (e) => {
      toast.error("配置失败：" + e.message);
    },
  });

  async function handleCopy(key: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // 降级方案
      const el = document.createElement("textarea");
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
    setCopiedStates((prev) => ({ ...prev, [key]: true }));
    setTimeout(() => setCopiedStates((prev) => ({ ...prev, [key]: false })), 2000);
    toast.success("已复制到剪贴板");
  }

  const apiKeyOk = !fearGreedLoading && fearGreed?.success !== false;
  const hasToken = tokenStatus?.hasToken ?? false;
  const isAdmin = user?.role === "admin";

  const BOOKMARKLET = `javascript:prompt('ValueScan Token',localStorage.getItem('account_token'))`;
  const CONSOLE_CMD = `copy(localStorage.getItem('account_token'))`;
  const CONSOLE_CMD2 = `console.log(localStorage.getItem('account_token'))`;

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-5">

      {/* ── 页头 ─────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <div className={`p-2.5 rounded-xl ${apiKeyOk ? "bg-blue-500/10" : "bg-red-500/10"}`}>
          {apiKeyOk ? (
            <Wifi className="w-5 h-5 text-blue-400" />
          ) : (
            <WifiOff className="w-5 h-5 text-red-400" />
          )}
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">ValueScan 数据连接</h1>
          <p className="text-sm text-muted-foreground">服务端 24 小时稳定运行，无需浏览器保持在线</p>
        </div>
        <button
          onClick={() => { refetchStatus(); toast.info("正在刷新状态..."); }}
          className="ml-auto p-2 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
          title="刷新状态"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* ── 状态横幅 ─────────────────────────────────────────── */}
      <StatusBanner apiKeyOk={apiKeyOk} hasToken={hasToken} isLoading={statusLoading && fearGreedLoading} />

      {/* ── 数据源状态卡片 ────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3">
        {/* API Key 状态 */}
        <Card className={`border ${apiKeyOk ? "border-green-500/20 bg-green-500/5" : "border-border bg-card"}`}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Key className="w-4 h-4 text-blue-400" />
              <span className="text-sm font-medium text-foreground">API Key</span>
            </div>
            <div className="flex items-center gap-1.5 mb-1">
              {fearGreedLoading ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
              ) : apiKeyOk ? (
                <CheckCircle className="w-3.5 h-3.5 text-green-400" />
              ) : (
                <XCircle className="w-3.5 h-3.5 text-red-400" />
              )}
              <span className={`text-xs ${apiKeyOk ? "text-green-400" : fearGreedLoading ? "text-muted-foreground" : "text-red-400"}`}>
                {fearGreedLoading ? "检测中..." : apiKeyOk ? "已连接" : "连接失败"}
              </span>
            </div>
            <div className="text-xs text-muted-foreground space-y-0.5">
              <div className="flex items-center gap-1">
                <CheckCircle className="w-3 h-3 text-green-400/70" />
                <span>AI 信号 (37000+条)</span>
              </div>
              <div className="flex items-center gap-1">
                <CheckCircle className="w-3 h-3 text-green-400/70" />
                <span>资金异常信号</span>
              </div>
              <div className="flex items-center gap-1">
                <CheckCircle className="w-3 h-3 text-green-400/70" />
                <span>机会/风险代币</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Token 状态 */}
        <Card className={`border ${hasToken ? "border-purple-500/20 bg-purple-500/5" : "border-border bg-card"}`}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-4 h-4 text-purple-400" />
              <span className="text-sm font-medium text-foreground">会员 Token</span>
            </div>
            <div className="flex items-center gap-1.5 mb-1">
              {hasToken ? (
                <CheckCircle className="w-3.5 h-3.5 text-green-400" />
              ) : (
                <AlertTriangle className="w-3.5 h-3.5 text-yellow-400" />
              )}
              <span className={`text-xs ${hasToken ? "text-green-400" : "text-yellow-400"}`}>
                {hasToken ? "已配置" : "未配置"}
              </span>
            </div>
            <div className="text-xs text-muted-foreground space-y-0.5">
              <div className="flex items-center gap-1">
                {hasToken ? <CheckCircle className="w-3 h-3 text-green-400/70" /> : <XCircle className="w-3 h-3 text-muted-foreground/50" />}
                <span>实时预警信号</span>
              </div>
              <div className="flex items-center gap-1">
                {hasToken ? <CheckCircle className="w-3 h-3 text-green-400/70" /> : <XCircle className="w-3 h-3 text-muted-foreground/50" />}
                <span>个人订阅信号</span>
              </div>
              {hasToken && tokenStatus?.tokenPreview && (
                <div className="font-mono text-xs text-purple-400/80 mt-1">
                  {tokenStatus.tokenPreview}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── 恐惧贪婪指数 ─────────────────────────────────────── */}
      {fearGreed?.value !== undefined && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-card border border-border">
          <Zap className="w-4 h-4 text-yellow-400 flex-shrink-0" />
          <div className="flex-1">
            <span className="text-sm text-muted-foreground">恐惧贪婪指数：</span>
            <span className="font-bold ml-1" style={{ color: fearGreed.color }}>
              {fearGreed.value} · {fearGreed.label}
            </span>
          </div>
          <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${fearGreed.value}%`,
                backgroundColor: fearGreed.color,
              }}
            />
          </div>
        </div>
      )}

      {/* ── Token 配置区（登录用户均可配置）─────────────────────────────── */}
      {user && (
        <Card className="border-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Key className="w-4 h-4 text-yellow-400" />
              配置会员 Token
              {hasToken && <Badge variant="outline" className="ml-auto text-xs border-green-500/40 text-green-400">已配置</Badge>}
            </CardTitle>
          </CardHeader>         <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Token 配置到服务端后，所有用户的实时预警信号将通过此 Token 获取。Token 有效期约 1 小时，过期后需重新配置。
            </p>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  type={showToken ? "text" : "password"}
                  placeholder="粘贴 ValueScan token..."
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  className="pr-10 font-mono text-xs"
                />
                <button
                  type="button"
                  onClick={() => setShowToken(!showToken)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <Button
                onClick={() => tokenInput.trim() && setTokenMutation.mutate({ token: tokenInput.trim() })}
                disabled={!tokenInput.trim() || setTokenMutation.isPending}
                className="gap-1.5 bg-blue-600 hover:bg-blue-700"
              >
                {setTokenMutation.isPending ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle className="w-4 h-4" />
                )}
                配置
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── 图文指引：如何获取 Token ─────────────────────────── */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Info className="w-4 h-4 text-blue-400" />
            如何获取 ValueScan Token
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Token 用于获取你账号的实时预警信号，需要在 ValueScan 网站登录后获取
          </p>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="url">
            <TabsList className="w-full mb-4 grid grid-cols-3">
              <TabsTrigger value="url" className="text-xs gap-1">
                <Globe className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">地址栏</span>
                <span className="sm:hidden">地址栏</span>
                <Badge variant="secondary" className="ml-1 text-[10px] px-1 py-0 bg-green-500/20 text-green-400 border-0">推荐</Badge>
              </TabsTrigger>
              <TabsTrigger value="console" className="text-xs gap-1">
                <Terminal className="w-3.5 h-3.5" />控制台
              </TabsTrigger>
              <TabsTrigger value="app" className="text-xs gap-1">
                <Smartphone className="w-3.5 h-3.5" />手机App
              </TabsTrigger>
            </TabsList>

            {/* ── 地址栏方法（推荐）─────────────────────────── */}
            <TabsContent value="url" className="space-y-4">
              <Alert className="border-green-500/30 bg-green-500/5 py-2">
                <CheckCircle className="h-3.5 w-3.5 text-green-400" />
                <AlertDescription className="text-xs text-green-300">
                  此方法无需任何设置，所有浏览器均可使用，不受 Chrome 安全限制影响
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                <StepCard step={1} title="打开 ValueScan 网站并登录账号">
                  <a
                    href="https://www.valuescan.io"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 hover:underline mt-1"
                  >
                    <Globe className="w-3 h-3" />
                    www.valuescan.io
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </StepCard>

                <StepCard step={2} title="复制下方命令">
                  <p className="text-xs text-muted-foreground mb-1">点击右侧复制按钮，或手动全选复制</p>
                  <CodeBlock
                    code={BOOKMARKLET}
                    copyKey="bookmarklet"
                    copiedStates={copiedStates}
                    onCopy={handleCopy}
                  />
                </StepCard>

                <StepCard step={3} title="粘贴到浏览器地址栏">
                  <div className="mt-2 rounded-lg border border-border bg-muted/30 p-3 space-y-2">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Monitor className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>点击浏览器顶部地址栏（显示网址的地方）</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <MousePointer className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>粘贴命令（Ctrl+V 或 Cmd+V），然后按 <kbd className="bg-background border border-border rounded px-1 py-0.5 text-[10px]">Enter</kbd></span>
                    </div>
                    <Alert className="border-yellow-500/30 bg-yellow-500/5 py-1.5">
                      <AlertTriangle className="h-3 w-3 text-yellow-400" />
                      <AlertDescription className="text-[11px] text-yellow-300">
                        注意：粘贴到<strong>地址栏</strong>，不是搜索框或页面上
                      </AlertDescription>
                    </Alert>
                  </div>
                </StepCard>

                <StepCard step={4} title="从弹窗复制 Token">
                  <div className="mt-2 rounded-lg border border-border bg-muted/30 p-3 space-y-2">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <ChevronRight className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                      <span>浏览器会弹出一个对话框，里面显示你的 Token</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <ChevronRight className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                      <span>全选文本（Ctrl+A），复制（Ctrl+C）</span>
                    </div>
                  </div>
                </StepCard>

                <StepCard step={5} title="粘贴到上方「配置会员 Token」输入框">
                  <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                    <ArrowRight className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
                    <span>点击「配置」按钮，完成！服务端将自动使用此 Token 获取实时预警信号</span>
                  </div>
                </StepCard>
              </div>
            </TabsContent>

            {/* ── 控制台方法 ────────────────────────────────── */}
            <TabsContent value="console" className="space-y-4">
              <Alert className="border-yellow-500/30 bg-yellow-500/5 py-2">
                <AlertTriangle className="h-3.5 w-3.5 text-yellow-400" />
                <AlertDescription className="text-xs text-yellow-300">
                  Chrome 安全限制：首次使用需先在控制台输入 <code className="bg-black/30 px-1 rounded text-yellow-200">allow pasting</code> 解锁粘贴功能
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                <StepCard step={1} title="打开 ValueScan 网站并登录">
                  <a href="https://www.valuescan.io" target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-blue-400 hover:underline mt-1">
                    <Globe className="w-3 h-3" />www.valuescan.io<ExternalLink className="w-3 h-3" />
                  </a>
                </StepCard>

                <StepCard step={2} title="打开浏览器开发者工具">
                  <div className="mt-2 space-y-1.5 text-xs text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <kbd className="bg-background border border-border rounded px-1.5 py-0.5 text-[11px]">F12</kbd>
                      <span>或</span>
                      <kbd className="bg-background border border-border rounded px-1.5 py-0.5 text-[11px]">Ctrl+Shift+I</kbd>
                      <span>（Mac: Cmd+Option+I）</span>
                    </div>
                    <div>点击顶部 <strong className="text-foreground">Console</strong>（控制台）选项卡</div>
                  </div>
                </StepCard>

                <StepCard step={3} title="解锁 Chrome 粘贴限制（仅首次需要）">
                  <div className="mt-2 text-xs text-muted-foreground">
                    <p className="mb-1">在控制台输入以下内容并按回车：</p>
                    <CodeBlock code="allow pasting" copyKey="allow" copiedStates={copiedStates} onCopy={handleCopy} />
                    <p className="mt-1 text-yellow-400/80">⚠️ 这是手动输入，不能粘贴（Chrome 安全机制）</p>
                  </div>
                </StepCard>

                <StepCard step={4} title="复制 Token 到剪贴板">
                  <div className="mt-2 text-xs text-muted-foreground">
                    <p className="mb-1">粘贴并运行以下命令（Token 会自动复制到剪贴板）：</p>
                    <CodeBlock code={CONSOLE_CMD} copyKey="console" copiedStates={copiedStates} onCopy={handleCopy} />
                    <p className="mt-2 mb-1">或者直接打印查看：</p>
                    <CodeBlock code={CONSOLE_CMD2} copyKey="console2" copiedStates={copiedStates} onCopy={handleCopy} />
                  </div>
                </StepCard>

                <StepCard step={5} title="粘贴到上方输入框并点击「配置」">
                  <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                    <ArrowRight className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
                    <span>Token 已在剪贴板，直接 Ctrl+V 粘贴即可</span>
                  </div>
                </StepCard>
              </div>
            </TabsContent>

            {/* ── 手机 App 方法 ─────────────────────────────── */}
            <TabsContent value="app" className="space-y-4">
              <Alert className="border-blue-500/30 bg-blue-500/5 py-2">
                <Info className="h-3.5 w-3.5 text-blue-400" />
                <AlertDescription className="text-xs text-blue-300">
                  需要安装 ValueScan 官方 App（iOS / Android）
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                <StepCard step={1} title="下载并安装 ValueScan App">
                  <div className="mt-2 flex gap-2">
                    <div className="flex-1 rounded-lg border border-border bg-muted/30 p-2 text-center text-xs text-muted-foreground">
                      <div className="font-medium text-foreground mb-0.5">App Store</div>
                      <div>搜索 ValueScan</div>
                    </div>
                    <div className="flex-1 rounded-lg border border-border bg-muted/30 p-2 text-center text-xs text-muted-foreground">
                      <div className="font-medium text-foreground mb-0.5">Google Play</div>
                      <div>搜索 ValueScan</div>
                    </div>
                  </div>
                </StepCard>

                <StepCard step={2} title="登录你的 ValueScan 账号">
                  <p className="text-xs text-muted-foreground mt-1">使用邮箱/手机号登录</p>
                </StepCard>

                <StepCard step={3} title="进入 API 管理页面">
                  <div className="mt-2 space-y-1.5 text-xs text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <ChevronRight className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                      <span>点击底部「<strong className="text-foreground">我的</strong>」标签</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <ChevronRight className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                      <span>进入「<strong className="text-foreground">设置</strong>」</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <ChevronRight className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                      <span>找到「<strong className="text-foreground">API 管理</strong>」或「<strong className="text-foreground">开发者设置</strong>」</span>
                    </div>
                  </div>
                </StepCard>

                <StepCard step={4} title="复制 Token">
                  <p className="text-xs text-muted-foreground mt-1">点击 Token 旁边的复制图标，或长按选择复制</p>
                </StepCard>

                <StepCard step={5} title="在电脑上粘贴到输入框并配置">
                  <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                    <ArrowRight className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
                    <span>通过微信/邮件将 Token 发送到电脑，然后粘贴配置</span>
                  </div>
                </StepCard>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* ── 服务端账户信息 ────────────────────────────────────── */}
      {accountInfo?.data && (
        <Card className="border-border bg-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Server className="w-4 h-4 text-blue-400" />
              <span className="text-sm font-semibold text-foreground">服务端连接信息</span>
              <Badge variant="outline" className="ml-auto text-xs border-green-500/40 text-green-400">
                <CheckCircle className="w-3 h-3 mr-1" />在线
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-muted-foreground">认证方式：</span>
                <span className="text-foreground ml-1">HMAC-SHA256</span>
              </div>
              <div>
                <span className="text-muted-foreground">API 状态：</span>
                <span className="text-green-400 ml-1">{accountInfo.data.apiKeyConfigured ? "已配置" : "未配置"}</span>
              </div>
              <div>
                <span className="text-muted-foreground">更新频率：</span>
                <span className="text-foreground ml-1">每 5 分钟</span>
              </div>
              <div>
                <span className="text-muted-foreground">运行模式：</span>
                <span className="text-foreground ml-1">24小时服务端</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Token 过期弹窗 ────────────────────────────────────── */}
      <Dialog open={showExpiredDialog} onOpenChange={setShowExpiredDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-yellow-400">
              <Clock className="w-5 h-5" />
              Token 已过期，需要重新配置
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              ValueScan Token 有效期约 1 小时，当前 Token 已失效。实时预警信号已暂停，请重新获取并配置 Token。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Alert className="border-blue-500/30 bg-blue-500/5">
              <Info className="h-4 w-4 text-blue-400" />
              <AlertDescription className="text-sm text-blue-300">
                <strong>快速重新获取：</strong>打开 valuescan.io，将以下命令粘贴到地址栏：
              </AlertDescription>
            </Alert>
            <CodeBlock code={BOOKMARKLET} copyKey="dialog_bookmarklet" copiedStates={copiedStates} onCopy={handleCopy} />
            {isAdmin && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">获取 Token 后，粘贴到下方：</p>
                <div className="flex gap-2">
                  <Input
                    type="password"
                    placeholder="粘贴新 Token..."
                    value={tokenInput}
                    onChange={(e) => setTokenInput(e.target.value)}
                    className="font-mono text-xs"
                  />
                  <Button
                    onClick={() => tokenInput.trim() && setTokenMutation.mutate({ token: tokenInput.trim() })}
                    disabled={!tokenInput.trim() || setTokenMutation.isPending}
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {setTokenMutation.isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : "配置"}
                  </Button>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => { setShowExpiredDialog(false); setExpiredDismissed(true); }}
            >
              稍后配置
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
