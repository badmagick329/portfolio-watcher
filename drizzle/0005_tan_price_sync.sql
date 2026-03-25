CREATE TABLE `instrument_price_sources` (
	`isin` text PRIMARY KEY NOT NULL,
	`provider` text NOT NULL,
	`provider_symbol` text NOT NULL,
	`provider_exchange` text NOT NULL,
	`provider_mic` text,
	`resolved_name` text NOT NULL,
	`resolved_currency` text,
	`resolution_confidence` real NOT NULL,
	`last_resolved_at` text NOT NULL,
	`last_fetch_status` text,
	`last_fetch_error` text,
	`last_fetch_attempted_at` text,
	`consecutive_failures` integer DEFAULT 0 NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `instrument_price_sources_provider_idx` ON `instrument_price_sources` (`provider`);
--> statement-breakpoint
CREATE TABLE `instrument_prices` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`isin` text NOT NULL,
	`provider` text NOT NULL,
	`provider_symbol` text NOT NULL,
	`currency` text NOT NULL,
	`price` real NOT NULL,
	`price_type` text NOT NULL,
	`as_of` text NOT NULL,
	`fetched_at` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `instrument_prices_isin_idx` ON `instrument_prices` (`isin`);
--> statement-breakpoint
CREATE INDEX `instrument_prices_fetched_at_idx` ON `instrument_prices` (`fetched_at`);
--> statement-breakpoint
CREATE UNIQUE INDEX `instrument_prices_unique_snapshot_idx` ON `instrument_prices` (`provider`,`isin`,`as_of`);
