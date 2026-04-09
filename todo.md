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

## API 配置
- [x] 配置 ValueScan account_token (已写入数据库)
- [x] 配置 ValueScan API Key/Secret (HMAC-SHA256 签名)
- [x] 配置 Binance API Key/Secret
- [x] 配置 OKX API Key/Secret
- [x] 配置 Telegram Bot Token + Chat ID
- [x] 实现 ValueScan ticket+AES 认证 (Access-Ticket)
- [x] 实现 ValueScan 自动刷新 Token (每50分钟)
- [x] 预警信号接口测试通过 (返回实时信号数据)

## 交易所扩展与统一面板
- [x] 接入 Bybit 交易所（合约，模拟+实盘，server/bybitService.ts）
- [x] 接入 Gate.io 交易所（合约，模拟+实盘，server/gateService.ts）
- [x] 接入 Bitget 交易所（合约，模拟+实盘，server/bitgetService.ts）
- [x] 统一交易面板：模拟交易+实盘交易整合到一个页面，支持切换交易所（/unified-trading）
- [x] 统一持仓面板：所有交易所持仓汇总展示（exchange.allPositions）
- [x] 统一账户余额：所有交易所余额汇总（exchange.allAccounts）
- [x] 开启自动交易（设置→「自动交易」 tab，滑块设置最低评分阈值）
- [x] Telegram 信号推送配置（设置→「Telegram」 tab）
- [x] 多交易所 API Key 配置页面（设置→「多交易所」 tab）
- [x] 数据库迁移：新增 bybitApiKey/gateApiKey/bitgetApiKey/minScoreThreshold/autoTradingEnabled 字段

## 新功能迭代（2026-04-09）
- [x] 多交易所测试连接按钮（Bybit/Gate.io/Bitget/Binance/OKX 各自测试连接）
- [x] 自动交易引擎联动：信号评分超过阈值时自动触发下单（5交易所全支持）
- [x] 自动交易下单结果推送到 Telegram（含评分/阈值/下单结果）
- [x] 统一面板持仓盈亏颜色标注（已存在）
- [x] 统一面板一键平仓按钮（实盘，5交易所全支持）
- [x] 统一面板多交易所持仓价值饼图分布（环形饼图+百分比）

## Bug修复（2026-04-09）
- [x] 修复 React insertBefore DOM 错误（池仓表格拆分为模拟/实盘两个独立表格，修复VSWinRate.tsx条件渲染th/td问题）
