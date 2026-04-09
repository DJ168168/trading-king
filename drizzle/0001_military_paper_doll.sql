CREATE TABLE `account_snapshots` (
	`id` int AUTO_INCREMENT NOT NULL,
	`totalBalance` float NOT NULL,
	`availableBalance` float NOT NULL,
	`unrealizedPnl` float DEFAULT 0,
	`dailyPnl` float DEFAULT 0,
	`dailyTrades` int DEFAULT 0,
	`positionCount` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `account_snapshots_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `backtest_results` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(128) NOT NULL,
	`startDate` timestamp NOT NULL,
	`endDate` timestamp NOT NULL,
	`initialBalance` float NOT NULL,
	`finalBalance` float NOT NULL,
	`totalReturn` float NOT NULL,
	`totalTrades` int DEFAULT 0,
	`winTrades` int DEFAULT 0,
	`lossTrades` int DEFAULT 0,
	`winRate` float DEFAULT 0,
	`maxDrawdown` float DEFAULT 0,
	`sharpeRatio` float DEFAULT 0,
	`configSnapshot` json,
	`tradeLog` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `backtest_results_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `confluence_signals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`symbol` varchar(32) NOT NULL,
	`fomoSignalId` varchar(128) NOT NULL,
	`alphaSignalId` varchar(128) NOT NULL,
	`timeGap` float NOT NULL,
	`score` float NOT NULL,
	`status` enum('pending','executed','skipped','failed') NOT NULL DEFAULT 'pending',
	`skipReason` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `confluence_signals_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `paper_account` (
	`id` int AUTO_INCREMENT NOT NULL,
	`balance` float NOT NULL DEFAULT 10000,
	`totalBalance` float NOT NULL DEFAULT 10000,
	`initialBalance` float NOT NULL DEFAULT 10000,
	`totalPnl` float DEFAULT 0,
	`totalPnlPct` float DEFAULT 0,
	`totalTrades` int DEFAULT 0,
	`winTrades` int DEFAULT 0,
	`lossTrades` int DEFAULT 0,
	`maxDrawdown` float DEFAULT 0,
	`peakBalance` float DEFAULT 10000,
	`autoTradingEnabled` boolean DEFAULT false,
	`perTradeAmount` float DEFAULT 500,
	`leverage` int DEFAULT 5,
	`stopLossPct` float DEFAULT 3,
	`takeProfitPct` float DEFAULT 8,
	`minSignalScore` float DEFAULT 65,
	`maxPositions` int DEFAULT 5,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `paper_account_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `paper_equity_curve` (
	`id` int AUTO_INCREMENT NOT NULL,
	`totalBalance` float NOT NULL,
	`unrealizedPnl` float DEFAULT 0,
	`openPositions` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `paper_equity_curve_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `paper_positions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`symbol` varchar(32) NOT NULL,
	`direction` enum('long','short') NOT NULL,
	`entryPrice` float NOT NULL,
	`currentPrice` float NOT NULL,
	`quantity` float NOT NULL,
	`notionalValue` float NOT NULL,
	`leverage` int DEFAULT 5,
	`stopLoss` float,
	`takeProfit` float,
	`unrealizedPnl` float DEFAULT 0,
	`unrealizedPnlPct` float DEFAULT 0,
	`signalScore` float,
	`triggerSignal` varchar(128),
	`openedAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `paper_positions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `paper_trades` (
	`id` int AUTO_INCREMENT NOT NULL,
	`symbol` varchar(32) NOT NULL,
	`direction` enum('long','short') NOT NULL,
	`entryPrice` float NOT NULL,
	`exitPrice` float NOT NULL,
	`quantity` float NOT NULL,
	`notionalValue` float NOT NULL,
	`leverage` int DEFAULT 5,
	`pnl` float NOT NULL,
	`pnlPct` float NOT NULL,
	`closeReason` enum('take_profit','stop_loss','manual','signal_reverse','timeout') NOT NULL,
	`signalScore` float,
	`triggerSignal` varchar(256),
	`holdingMinutes` int DEFAULT 0,
	`openedAt` timestamp NOT NULL,
	`closedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `paper_trades_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `positions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`symbol` varchar(32) NOT NULL,
	`quantity` float NOT NULL,
	`entryPrice` float NOT NULL,
	`currentPrice` float NOT NULL,
	`leverage` int DEFAULT 1,
	`unrealizedPnl` float DEFAULT 0,
	`unrealizedPnlPercent` float DEFAULT 0,
	`stopLoss` float,
	`takeProfit1` float,
	`takeProfit2` float,
	`tradeId` int,
	`openedAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `positions_id` PRIMARY KEY(`id`),
	CONSTRAINT `positions_symbol_unique` UNIQUE(`symbol`)
);
--> statement-breakpoint
CREATE TABLE `signals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`signalId` varchar(128) NOT NULL,
	`symbol` varchar(32) NOT NULL,
	`signalType` enum('FOMO','ALPHA','RISK','FALL','FUND_MOVE','LISTING','FUND_ESCAPE','FUND_ABNORMAL') NOT NULL,
	`messageType` int NOT NULL,
	`score` float DEFAULT 0,
	`rawData` json,
	`processed` boolean DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `signals_id` PRIMARY KEY(`id`),
	CONSTRAINT `signals_signalId_unique` UNIQUE(`signalId`)
);
--> statement-breakpoint
CREATE TABLE `strategy_config` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(64) NOT NULL,
	`signalTimeWindow` int DEFAULT 300,
	`minSignalScore` float DEFAULT 0.6,
	`enableFomoIntensify` boolean DEFAULT true,
	`minOrderUsdt` float DEFAULT 1,
	`maxPositionPercent` float DEFAULT 10,
	`maxTotalPositionPercent` float DEFAULT 50,
	`maxDailyTrades` int DEFAULT 20,
	`maxDailyLossPercent` float DEFAULT 5,
	`stopLossPercent` float DEFAULT 3,
	`takeProfit1Percent` float DEFAULT 5,
	`takeProfit2Percent` float DEFAULT 10,
	`leverage` int DEFAULT 5,
	`marginType` enum('ISOLATED','CROSSED') DEFAULT 'ISOLATED',
	`symbolSuffix` varchar(16) DEFAULT 'USDT',
	`enableTrailingStop` boolean DEFAULT false,
	`trailingStopActivation` float DEFAULT 3,
	`trailingStopCallback` float DEFAULT 1.5,
	`binanceApiKey` varchar(256) DEFAULT '',
	`binanceSecretKey` varchar(256) DEFAULT '',
	`binanceUseTestnet` boolean DEFAULT true,
	`okxApiKey` varchar(256) DEFAULT '',
	`okxSecretKey` varchar(256) DEFAULT '',
	`okxPassphrase` varchar(256) DEFAULT '',
	`okxUseDemo` boolean DEFAULT true,
	`selectedExchange` enum('binance','okx','both') DEFAULT 'binance',
	`autoTradingEnabled` boolean DEFAULT false,
	`useTestnet` boolean DEFAULT true,
	`emergencyStop` boolean DEFAULT false,
	`isActive` boolean DEFAULT true,
	`vsUserToken` varchar(2048) DEFAULT '',
	`vsTokenSetAt` bigint DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `strategy_config_id` PRIMARY KEY(`id`),
	CONSTRAINT `strategy_config_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `telegram_config` (
	`id` int AUTO_INCREMENT NOT NULL,
	`botToken` varchar(256),
	`chatId` varchar(64),
	`enableTradeNotify` boolean DEFAULT true,
	`enableRiskNotify` boolean DEFAULT true,
	`enableDailyReport` boolean DEFAULT true,
	`isActive` boolean DEFAULT false,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `telegram_config_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `trades` (
	`id` int AUTO_INCREMENT NOT NULL,
	`symbol` varchar(32) NOT NULL,
	`confluenceSignalId` int,
	`action` enum('OPEN_LONG','OPEN_SHORT','CLOSE_LONG','CLOSE_SHORT','PARTIAL_CLOSE','STOP_LOSS','TAKE_PROFIT') NOT NULL,
	`quantity` float NOT NULL,
	`entryPrice` float NOT NULL,
	`exitPrice` float,
	`stopLoss` float,
	`takeProfit1` float,
	`takeProfit2` float,
	`leverage` int DEFAULT 1,
	`pnl` float DEFAULT 0,
	`pnlPercent` float DEFAULT 0,
	`signalScore` float,
	`riskLevel` enum('LOW','MEDIUM','HIGH') DEFAULT 'MEDIUM',
	`status` enum('open','closed','cancelled') NOT NULL DEFAULT 'open',
	`closeReason` text,
	`binanceOrderId` varchar(128),
	`isTestnet` boolean DEFAULT false,
	`openedAt` timestamp NOT NULL DEFAULT (now()),
	`closedAt` timestamp,
	CONSTRAINT `trades_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `vs_signal_stats` (
	`id` int AUTO_INCREMENT NOT NULL,
	`symbol` varchar(32) NOT NULL,
	`signalType` varchar(32) NOT NULL,
	`signalName` varchar(128),
	`direction` enum('long','short','neutral') NOT NULL DEFAULT 'neutral',
	`entryPrice` float,
	`exitPrice24h` float,
	`exitPrice48h` float,
	`pnlPct24h` float,
	`pnlPct48h` float,
	`result` enum('win','loss','pending') NOT NULL DEFAULT 'pending',
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `vs_signal_stats_id` PRIMARY KEY(`id`)
);
