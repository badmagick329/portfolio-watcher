CREATE TABLE `account_summary_snapshots` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`currency` text NOT NULL,
	`current_value` real NOT NULL,
	`total_cost` real NOT NULL,
	`realized_profit_loss` real NOT NULL,
	`unrealized_profit_loss` real NOT NULL,
	`total_value` real NOT NULL,
	`as_of` text NOT NULL,
	`fetched_at` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `account_summary_snapshots_fetched_at_idx` ON `account_summary_snapshots` (`fetched_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `account_summary_snapshots_unique_snapshot_idx` ON `account_summary_snapshots` (`as_of`);--> statement-breakpoint
CREATE TABLE `current_position_snapshots` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`isin` text NOT NULL,
	`provider_symbol` text NOT NULL,
	`quantity` real NOT NULL,
	`current_price` real NOT NULL,
	`instrument_currency` text NOT NULL,
	`wallet_currency` text NOT NULL,
	`current_value` real NOT NULL,
	`total_cost` real NOT NULL,
	`unrealized_profit_loss` real NOT NULL,
	`fx_impact` real,
	`as_of` text NOT NULL,
	`fetched_at` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `current_position_snapshots_isin_idx` ON `current_position_snapshots` (`isin`);--> statement-breakpoint
CREATE INDEX `current_position_snapshots_fetched_at_idx` ON `current_position_snapshots` (`fetched_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `current_position_snapshots_unique_snapshot_idx` ON `current_position_snapshots` (`isin`,`as_of`);