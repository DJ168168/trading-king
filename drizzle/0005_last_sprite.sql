CREATE TABLE `market_analysis` (
	`id` int AUTO_INCREMENT NOT NULL,
	`uniqueId` varchar(128) NOT NULL,
	`ts` bigint NOT NULL,
	`content` text NOT NULL,
	`sentToTelegram` boolean DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `market_analysis_id` PRIMARY KEY(`id`),
	CONSTRAINT `market_analysis_uniqueId_unique` UNIQUE(`uniqueId`)
);
--> statement-breakpoint
CREATE TABLE `token_signals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`uniqueKey` varchar(128) NOT NULL,
	`tokenId` bigint NOT NULL,
	`type` enum('OPPORTUNITY','RISK','FUNDS') NOT NULL,
	`symbol` varchar(32),
	`name` varchar(128),
	`price` varchar(64),
	`percentChange24h` float,
	`scoring` float,
	`grade` int,
	`content` text NOT NULL,
	`ts` bigint NOT NULL,
	`sentToTelegram` boolean DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `token_signals_id` PRIMARY KEY(`id`),
	CONSTRAINT `token_signals_uniqueKey_unique` UNIQUE(`uniqueKey`)
);
