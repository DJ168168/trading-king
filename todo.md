# Trading King 全栈升级任务

## Phase 1: 升级项目架构
- [x] 使用 webdev_add_feature 升级为 web-db-user
- [x] 安装后端依赖：ccxt, ws, node-telegram-bot-api 等
- [x] 配置环境变量（交易所 API、Telegram Token）

## Phase 2: 后端核心服务
- [x] 币安 API 接入服务（REST 行情 + 账户）
- [x] 欧易 API 接入服务（REST 行情 + 账户）
- [x] Bybit API 接入服务（REST 行情 + 账户）
- [x] Telegram Bot 推送服务（ZHNAGYONGTetrisBot）
- [x] 信号引擎（检测交易信号并触发推送，60s 轮询）

## Phase 3: 后端 tRPC 路由
- [x] market.overview - 多交易所实时行情
- [x] market.ticker - 单交易对行情
- [x] market.klines - K线数据
- [x] market.fundingRate - 资金费率
- [x] account.balance - 单交易所账户余额
- [x] account.allBalances - 三大交易所合计余额
- [x] account.positions - 持仓信息
- [x] account.allPositions - 全交易所持仓
- [x] trades.history - 交易历史
- [x] trades.createOrder - 实盘下单
- [x] signals.list - 信号列表
- [x] signals.create - 创建信号（含 Telegram 推送）
- [x] signals.engineStatus - 信号引擎状态
- [x] sim.openPosition - 模拟开仓
- [x] sim.closePosition - 模拟平仓
- [x] sim.positions - 模拟持仓
- [x] sim.trades - 模拟交易历史
- [x] settings.save / saveMany - 保存配置
- [x] settings.getAll - 读取配置
- [x] settings.testTelegram - 测试 Telegram 推送
- [x] settings.sendTelegram - 发送自定义消息

## Phase 4: 前端对接
- [x] Dashboard 页面接入实时数据（三大交易所余额+持仓）
- [x] 信号监控页面接入实时信号（含 Telegram 推送按钮）
- [x] 持仓管理页面接入真实持仓（三大交易所）
- [x] 交易历史页面接入真实记录（按交易所筛选）
- [x] 量化模拟交易页面接入模拟盘（开仓/平仓/历史）
- [x] 市场全景页面接入行情数据（行情总览+资金费率）
- [x] 系统设置页面接入配置保存（Telegram测试+API连接测试）

## Phase 5: 部署
- [ ] 配置 Vercel 环境变量
- [ ] 推送代码到 GitHub 触发部署
- [ ] 验证线上功能
