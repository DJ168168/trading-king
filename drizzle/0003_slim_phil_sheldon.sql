ALTER TABLE `strategy_config` MODIFY COLUMN `selectedExchange` enum('binance','okx','bybit','gate','bitget','both','all') DEFAULT 'binance';--> statement-breakpoint
ALTER TABLE `strategy_config` ADD `bybitApiKey` varchar(256) DEFAULT '';--> statement-breakpoint
ALTER TABLE `strategy_config` ADD `bybitSecretKey` varchar(256) DEFAULT '';--> statement-breakpoint
ALTER TABLE `strategy_config` ADD `bybitUseTestnet` boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE `strategy_config` ADD `gateApiKey` varchar(256) DEFAULT '';--> statement-breakpoint
ALTER TABLE `strategy_config` ADD `gateSecretKey` varchar(256) DEFAULT '';--> statement-breakpoint
ALTER TABLE `strategy_config` ADD `bitgetApiKey` varchar(256) DEFAULT '';--> statement-breakpoint
ALTER TABLE `strategy_config` ADD `bitgetSecretKey` varchar(256) DEFAULT '';--> statement-breakpoint
ALTER TABLE `strategy_config` ADD `bitgetPassphrase` varchar(256) DEFAULT '';--> statement-breakpoint
ALTER TABLE `strategy_config` ADD `minScoreThreshold` float DEFAULT 60;