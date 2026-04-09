# 勇少交易之王 - TODO

## 基础设施
- [x] 安装额外依赖 (lightweight-charts, xml2js, node-forge)
- [x] 数据库Schema (信号、配置、Telegram、VS统计、模拟交易等表)
- [x] 执行数据库迁移

## 后端服务
- [x] server/freeDataService.ts (免费市场数据)
- [x] server/valueScanService.ts (ValueScan API集成)
- [x] server/signalEngine.ts (信号引擎)
- [x] server/strategyEngine.ts (策略引擎)
- [x] server/paperTradingEngine.ts (模拟交易引擎)
- [x] server/riskManager.ts (风险管理)
- [x] server/binanceService.ts (Binance集成)
- [x] server/okxService.ts (OKX集成)
- [x] server/coinGlassService.ts (CoinGlass数据)
- [x] server/newsService.ts (新闻情绪)
- [x] server/db.ts (数据库查询)
- [x] server/routers.ts (tRPC路由, 1561行)

## 前端框架
- [x] client/src/index.css (深色交易主题)
- [x] client/src/contexts/ThemeContext.tsx
- [x] client/src/components/TradingLayout.tsx (侧边栏布局)
- [x] client/src/components/LightweightChart.tsx
- [x] client/src/components/TradingViewChart.tsx
- [x] client/src/App.tsx (路由配置)

## 页面组件 (25个)
- [x] Dashboard.tsx (仪表盘)
- [x] Signals.tsx (信号列表)
- [x] VSSignals.tsx (VS信号)
- [x] SignalResonance.tsx (信号共振)
- [x] Strategy.tsx (策略)
- [x] StrategyCenter.tsx (策略中心)
- [x] PaperTrading.tsx (模拟交易)
- [x] LiveTrading.tsx (实盘交易)
- [x] Positions.tsx (持仓)
- [x] Trades.tsx (交易记录)
- [x] MarketOverview.tsx (市场总览)
- [x] Charts.tsx (K线图表)
- [x] AILongShort.tsx (AI多空)
- [x] WhaleCost.tsx (鲸鱼成本)
- [x] FundFlow.tsx (资金流向)
- [x] BullBearPanel.tsx (多空面板)
- [x] VSConnect.tsx (VS连接)
- [x] VSWinRate.tsx (VS胜率)
- [x] NewsPanel.tsx (新闻情绪)
- [x] Knowledge.tsx (知识库)
- [x] Backtest.tsx (回测)
- [x] Settings.tsx (设置)
- [x] NotFound.tsx
- [x] Home.tsx

## 测试
- [x] vitest测试通过 (1 test passed)

## Bug修复
- [x] 修复CSS @import顺序问题 (Google Fonts移至index.html)
