import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);

// 服务器启动后自动恢复模拟交易引擎（如果配置了 autoTradingEnabled）
setTimeout(async () => {
  try {
    const { getDb } = await import('../db');
    const { strategyConfig } = await import('../../drizzle/schema');
    const { eq } = await import('drizzle-orm');
    const { startPaperTradingEngine, isEngineRunning } = await import('../paperTradingEngine');
    const db = await getDb();
    if (!db) return;
    const rows = await db.select().from(strategyConfig).where(eq(strategyConfig.isActive, true)).limit(1);
    const cfg = rows[0] as any;
    if (cfg?.autoTradingEnabled && !isEngineRunning()) {
      startPaperTradingEngine();
      console.log('[AutoStart] 模拟交易引擎已自动启动 (根据数据库配置)');
    }
  } catch (e) {
    console.error('[AutoStart] 模拟引擎自动启动失败:', e);
  }
}, 3000);

// 启动 ValueScan 自动登录、Token 刷新与在线信号订阅
setTimeout(async () => {
  try {
    const { bootstrapValueScanService } = await import('../valueScanService');
    const status = await bootstrapValueScanService();
    console.log('[AutoStart] ValueScan 在线服务已启动:', status);
  } catch (e) {
    console.error('[AutoStart] ValueScan 在线服务启动失败:', e);
  }
}, 3500);

// 启动每日报告定时任务（UTC+8 20:00 推送）
setTimeout(async () => {
  try {
    const { startDailyReportScheduler } = await import('../dailyReportService');
    startDailyReportScheduler();
  } catch (e) {
    console.error('[AutoStart] 每日报告定时任务启动失败:', e);
  }
}, 5000);
