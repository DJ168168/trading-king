ALTER TABLE `strategy_config` ADD `vsLoginEmail` varchar(256) DEFAULT '';--> statement-breakpoint
ALTER TABLE `strategy_config` ADD `vsLoginPassword` varchar(256) DEFAULT '';--> statement-breakpoint
ALTER TABLE `strategy_config` ADD `vsRefreshToken` varchar(2048) DEFAULT '';--> statement-breakpoint
ALTER TABLE `strategy_config` ADD `vsAutoRefreshEnabled` boolean DEFAULT false;