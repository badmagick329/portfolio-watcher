CREATE TABLE `instrument_provider_symbols` (
	`isin` text NOT NULL,
	`provider` text NOT NULL,
	`provider_symbol` text NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `instrument_provider_symbols_unique_provider_isin_idx` ON `instrument_provider_symbols` (`provider`,`isin`);--> statement-breakpoint
CREATE INDEX `instrument_provider_symbols_isin_idx` ON `instrument_provider_symbols` (`isin`);--> statement-breakpoint
CREATE TABLE `instrument_risk_metrics` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`isin` text NOT NULL,
	`provider` text NOT NULL,
	`provider_symbol` text NOT NULL,
	`beta` real NOT NULL,
	`source_type` text NOT NULL,
	`as_of` text NOT NULL,
	`fetched_at` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `instrument_risk_metrics_isin_idx` ON `instrument_risk_metrics` (`isin`);--> statement-breakpoint
CREATE INDEX `instrument_risk_metrics_fetched_at_idx` ON `instrument_risk_metrics` (`fetched_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `instrument_risk_metrics_unique_snapshot_idx` ON `instrument_risk_metrics` (`provider`,`isin`,`as_of`);