CREATE TABLE `signals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`exchange` varchar(32) NOT NULL,
	`symbol` varchar(32) NOT NULL,
	`type` enum('LONG','SHORT','CLOSE') NOT NULL,
	`source` varchar(64) NOT NULL,
	`price` decimal(20,8) NOT NULL,
	`score` int DEFAULT 0,
	`reason` text,
	`telegramSent` boolean DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `signals_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sim_balance` (
	`id` int AUTO_INCREMENT NOT NULL,
	`balance` decimal(20,8) NOT NULL,
	`equity` decimal(20,8) NOT NULL,
	`pnl` decimal(20,8) DEFAULT '0',
	`recordedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `sim_balance_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sim_positions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`exchange` varchar(32) NOT NULL,
	`symbol` varchar(32) NOT NULL,
	`side` enum('long','short') NOT NULL,
	`size` decimal(20,8) NOT NULL,
	`entryPrice` decimal(20,8) NOT NULL,
	`currentPrice` decimal(20,8) DEFAULT '0',
	`leverage` int DEFAULT 1,
	`pnl` decimal(20,8) DEFAULT '0',
	`pnlPct` decimal(10,4) DEFAULT '0',
	`status` enum('open','closed') DEFAULT 'open',
	`openedAt` timestamp NOT NULL DEFAULT (now()),
	`closedAt` timestamp,
	`closePrice` decimal(20,8),
	CONSTRAINT `sim_positions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sim_trades` (
	`id` int AUTO_INCREMENT NOT NULL,
	`exchange` varchar(32) NOT NULL,
	`symbol` varchar(32) NOT NULL,
	`side` enum('buy','sell') NOT NULL,
	`size` decimal(20,8) NOT NULL,
	`price` decimal(20,8) NOT NULL,
	`pnl` decimal(20,8) DEFAULT '0',
	`fee` decimal(20,8) DEFAULT '0',
	`signalId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `sim_trades_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `system_config` (
	`id` int AUTO_INCREMENT NOT NULL,
	`key` varchar(128) NOT NULL,
	`value` text,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `system_config_id` PRIMARY KEY(`id`),
	CONSTRAINT `system_config_key_unique` UNIQUE(`key`)
);
