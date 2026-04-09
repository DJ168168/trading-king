/**
 * ValueScan 连接配置页面
 * - 服务端 API Key 认证（24小时稳定运行，无需用户操作）
 * - 手动 API Key 配置（支持自定义 Key 并连接测试）
 * - 图文指引：如何获取 Token（地址栏/控制台/手机App）
 * - 实时状态指示器
 * - Token 过期弹窗提醒
 */
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  Shield,
  Zap,
  ArrowRight,
  MousePointer,
  Monitor,
  ChevronRight,
  Settings,
  Trash2,
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

  // 手动 API Key 配置状态
  const [showApiKeyForm, setShowApiKeyForm] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [secretKeyInput, setSecretKeyInput] = useState("");
  const [showApiKeyValue, setShowApiKeyValue] = useState(false);
  const [showSecretKeyValue, setShowSecretKeyValue] = useState(false);

  // ── tRPC 查询 ──────────────────────────────────────────────
  const { data: apiKeyConfig, refetch: refetchApiKeyConfig } = trpc.valueScan.getApiKeyConfig.useQuery(
    undefined, { refetchInterval: 30000 }
  );
  const { data: tokenStatus, isLoading: statusLoading, refetch: refetchStatus } = trpc.valueScan.tokenStatus.useQuery(
    undefined, { refetchInterval: 30000 }
  );
  const { data: accountInfo } = trpc.valueScan.accountInfo.useQuery(
    undefined, { refetchInterval: 60000 }
  );
  const { data: fearGreed, isLoading: fearGreedLoading } = trpc.valueScan.fearGreed.useQuery(
    undefined, { refetchInterval: 60000 }
  );

  // ── 手动 API Key mutations ─────────────────────────────────
  const saveApiKeyMutation = trpc.valueScan.saveApiKey.useMutation({
    onSuccess: () => {
      toast.success("✅ ValueScan API Key 已保存！");
      setApiKeyInput("");
      setSecretKeyInput("");
      setShowApiKeyForm(false);
      refetchApiKeyConfig();
    },
    onError: (e) => toast.error("保存失败：" + e.message),
  });

  const testApiKeyMutation = trpc.valueScan.testApiKey.useMutation({
    onSuccess: (data) => {
      if (data.success) toast.success("✅ " + data.message);
      else toast.error("❌ " + data.message);
    },
    onError: (e) => toast.error("连接测试失败：" + e.message),
  });

  const clearApiKeyMutation = trpc.valueScan.clearApiKey.useMutation({
    onSuccess: () => {
      toast.success("已清除手动 API Key，恢复使用系统默认 Key");
      refetchApiKeyConfig();
    },
    onError: (e) => toast.error("清除失败：" + e.message),
  });

  // ── Token 过期检测 ─────────────────────────────────────────
  useEffect(() => {
    if (!expiredDismissed && tokenStatus?.hasToken === false && !statusLoading) {
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
          onClick={() => { refetchStatus(); refetchApiKeyConfig(); toast.info("正在刷新状态..."); }}
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
              <button
                onClick={() => setShowApiKeyForm(!showApiKeyForm)}
                className="ml-auto text-xs text-blue-400 hover:text-blue-300 underline flex-shrink-0"
              >
                {showApiKeyForm ? "收起" : "手动配置"}
              </button>
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
              {apiKeyConfig?.usingDbKey && (
                <span className="text-xs text-purple-400 ml-1">· 手动</span>
              )}
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
              {apiKeyConfig?.apiKeyPreview && (
                <div className="font-mono text-xs text-purple-400/80 mt-1 truncate">
                  {apiKeyConfig.apiKeyPreview}
                </div>
              )}
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

      {/* ── 手动 API Key 配置表单 ─────────────────────────────── */}
      {showApiKeyForm && (
        <Card className="border-blue-500/30 bg-blue-500/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Settings className="w-4 h-4 text-blue-400" />
              手动配置 ValueScan API Key
              {apiKeyConfig?.usingDbKey && (
                <Badge variant="outline" className="ml-auto text-xs border-purple-500/40 text-purple-400">已配置</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">
              手动配置后将覆盖系统默认 API Key，用于访问 ValueScan 数据接口。API Key 和 Secret Key 可在 ValueScan 账户设置中获取。
            </p>

            {/* API Key 输入 */}
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground font-medium">API Key</label>
              <div className="relative">
                <Input
                  type={showApiKeyValue ? "text" : "password"}
                  placeholder="输入 ValueScan API Key..."
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  className="pr-10 font-mono text-xs"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKeyValue(!showApiKeyValue)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showApiKeyValue ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Secret Key 输入 */}
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground font-medium">Secret Key</label>
              <div className="relative">
                <Input
                  type={showSecretKeyValue ? "text" : "password"}
                  placeholder="输入 ValueScan Secret Key..."
                  value={secretKeyInput}
                  onChange={(e) => setSecretKeyInput(e.target.value)}
                  className="pr-10 font-mono text-xs"
                />
                <button
                  type="button"
                  onClick={() => setShowSecretKeyValue(!showSecretKeyValue)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showSecretKeyValue ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* 操作按钮 */}
            <div className="flex gap-2 flex-wrap">
              <Button
                onClick={() => testApiKeyMutation.mutate({ apiKey: apiKeyInput || undefined, secretKey: secretKeyInput || undefined })}
                disabled={testApiKeyMutation.isPending}
                variant="outline"
                className="gap-1.5 flex-1"
              >
                {testApiKeyMutation.isPending ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Zap className="w-4 h-4 text-yellow-400" />
                )}
                连接测试
              </Button>
              <Button
                onClick={() => {
                  if (!apiKeyInput.trim() || !secretKeyInput.trim()) {
                    toast.error("请填写 API Key 和 Secret Key");
                    return;
                  }
                  saveApiKeyMutation.mutate({ apiKey: apiKeyInput.trim(), secretKey: secretKeyInput.trim() });
                }}
                disabled={saveApiKeyMutation.isPending}
                className="gap-1.5 flex-1 bg-blue-600 hover:bg-blue-700"
              >
                {saveApiKeyMutation.isPending ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle className="w-4 h-4" />
                )}
                保存
              </Button>
              {apiKeyConfig?.usingDbKey && (
                <Button
                  onClick={() => clearApiKeyMutation.mutate()}
                  disabled={clearApiKeyMutation.isPending}
                  variant="outline"
                  className="gap-1.5 text-red-400 border-red-500/30 hover:bg-red-500/10"
                >
                  <Trash2 className="w-4 h-4" />
                  清除
                </Button>
              )}
            </div>

            {/* 已配置的 Key 预览 */}
            {apiKeyConfig?.usingDbKey && apiKeyConfig.apiKeyPreview && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-purple-500/10 border border-purple-500/20">
                <CheckCircle className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
                <span className="text-xs text-purple-300">当前手动 Key：</span>
                <span className="font-mono text-xs text-purple-400">{apiKeyConfig.apiKeyPreview}</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

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
          </CardHeader>
          <CardContent className="space-y-3">
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
                <span>地址栏</span>
                <Badge variant="secondary" className="ml-1 text-[10px] px-1 py-0 bg-green-500/20 text-green-400 border-0">推荐</Badge>
              </TabsTrigger>
              <TabsTrigger value="console" className="text-xs gap-1">
                <Terminal className="w-3.5 h-3.5" />控制台
              </TabsTrigger>
              <TabsTrigger value="app" className="text-xs gap-1">
                <Smartphone className="w-3.5 h-3.5" />手机App
              </TabsTrigger>
            </TabsList>

            {/* 地址栏方法 */}
            <TabsContent value="url" className="space-y-3 mt-0">
              <StepCard step={1} title="打开 ValueScan 并登录">
                <a
                  href="https://valuescan.io"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300"
                >
                  valuescan.io <ExternalLink className="w-3 h-3" />
                </a>
              </StepCard>
              <StepCard step={2} title="将书签拖到书签栏">
                <p className="text-xs text-muted-foreground mb-2">将下方链接拖到浏览器书签栏，或复制后手动添加为书签</p>
                <CodeBlock code={BOOKMARKLET} copyKey="bookmarklet" copiedStates={copiedStates} onCopy={handleCopy} />
              </StepCard>
              <StepCard step={3} title="在 ValueScan 页面点击书签">
                <p className="text-xs text-muted-foreground">弹出框中会显示你的 Token，复制后粘贴到上方输入框</p>
              </StepCard>
            </TabsContent>

            {/* 控制台方法 */}
            <TabsContent value="console" className="space-y-3 mt-0">
              <StepCard step={1} title="打开 ValueScan 并登录">
                <a
                  href="https://valuescan.io"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300"
                >
                  valuescan.io <ExternalLink className="w-3 h-3" />
                </a>
              </StepCard>
              <StepCard step={2} title="打开浏览器开发者工具">
                <div className="flex gap-2 mt-1">
                  <div className="flex items-center gap-1 px-2 py-1 rounded bg-muted text-xs">
                    <Monitor className="w-3 h-3" />Windows: F12
                  </div>
                  <div className="flex items-center gap-1 px-2 py-1 rounded bg-muted text-xs">
                    <Monitor className="w-3 h-3" />Mac: ⌘+⌥+I
                  </div>
                </div>
              </StepCard>
              <StepCard step={3} title="切换到 Console 标签，输入命令">
                <p className="text-xs text-muted-foreground mb-1">方法一（自动复制到剪贴板）：</p>
                <CodeBlock code={CONSOLE_CMD} copyKey="console1" copiedStates={copiedStates} onCopy={handleCopy} />
                <p className="text-xs text-muted-foreground mt-2 mb-1">方法二（打印到控制台）：</p>
                <CodeBlock code={CONSOLE_CMD2} copyKey="console2" copiedStates={copiedStates} onCopy={handleCopy} />
              </StepCard>
            </TabsContent>

            {/* 手机App方法 */}
            <TabsContent value="app" className="space-y-3 mt-0">
              <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                <AlertTriangle className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-yellow-300">手机App方式需要借助电脑浏览器，建议优先使用「地址栏」方法</p>
              </div>
              <StepCard step={1} title="在手机上打开 ValueScan App 并登录">
                <p className="text-xs text-muted-foreground">确保已登录你的 ValueScan 账号</p>
              </StepCard>
              <StepCard step={2} title="在电脑浏览器打开 ValueScan 并登录同一账号">
                <a
                  href="https://valuescan.io"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300"
                >
                  valuescan.io <ExternalLink className="w-3 h-3" />
                </a>
              </StepCard>
              <StepCard step={3} title="按照「地址栏」或「控制台」方法获取 Token">
                <p className="text-xs text-muted-foreground">两种方法获取的 Token 效果相同</p>
              </StepCard>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* ── 账户信息（已连接时显示）─────────────────────────── */}
      {accountInfo && (
        <Card className="border-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="w-4 h-4 text-green-400" />
              ValueScan 账户信息
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {(accountInfo as any).username && (
                <div>
                  <span className="text-muted-foreground text-xs">用户名</span>
                  <p className="font-medium">{(accountInfo as any).username}</p>
                </div>
              )}
              {(accountInfo as any).email && (
                <div>
                  <span className="text-muted-foreground text-xs">邮箱</span>
                  <p className="font-medium">{(accountInfo as any).email}</p>
                </div>
              )}
              {(accountInfo as any).plan && (
                <div>
                  <span className="text-muted-foreground text-xs">订阅计划</span>
                  <p className="font-medium text-green-400">{(accountInfo as any).plan}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Token 过期弹窗 ────────────────────────────────────── */}
      <Dialog open={showExpiredDialog} onOpenChange={(open) => {
        if (!open) setExpiredDismissed(true);
        setShowExpiredDialog(open);
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-400" />
              ValueScan Token 已过期
            </DialogTitle>
            <DialogDescription>
              你的 ValueScan Token 已过期（有效期约 1 小时）。请重新获取 Token 并配置，以继续接收实时预警信号。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  type={showToken ? "text" : "password"}
                  placeholder="粘贴新的 ValueScan token..."
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
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowExpiredDialog(false); setExpiredDismissed(true); }}>
              稍后处理
            </Button>
            <Button
              onClick={() => tokenInput.trim() && setTokenMutation.mutate({ token: tokenInput.trim() })}
              disabled={!tokenInput.trim() || setTokenMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {setTokenMutation.isPending ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : null}
              立即更新
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
