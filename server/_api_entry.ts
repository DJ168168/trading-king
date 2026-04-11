import "dotenv/config";
import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "../server/routers";
import { createContext } from "../server/_core/context";
import { registerOAuthRoutes } from "../server/_core/oauth";
import { bootstrapValueScanService } from "../server/valueScanService";
import path from "path";
import fs from "fs";

void bootstrapValueScanService().catch((error) => {
  console.error("[ValueScan] serverless bootstrap failed:", error);
});

const app = express();

// Body parser
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// CORS
app.use((req, res, next) => {
  const origin = req.headers.origin || "";
  const allowedOrigins = [
    "https://zhangyong.guru",
    "https://www.zhangyong.guru",
    "http://localhost:3000",
    "http://localhost:5173",
  ];
  if (allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type,Authorization,x-trpc-source"
  );
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  next();
});

// OAuth routes
registerOAuthRoutes(app);

// tRPC API
app.use(
  "/api/trpc",
  createExpressMiddleware({
    router: appRouter,
    createContext,
  })
);

// Serve static files from dist/public
const distPath = path.join(process.cwd(), "dist", "public");
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
}

// SPA fallback - serve index.html for all non-API routes
app.use("*", (req, res) => {
  const indexPath = path.join(distPath, "index.html");
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).json({ error: "Frontend not built" });
  }
});

export default app;
