CREATE TABLE `fill_taxes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`fill_id` integer NOT NULL,
	`name` text NOT NULL,
	`quantity` real NOT NULL,
	`currency` text NOT NULL,
	`charged_at` text NOT NULL,
	FOREIGN KEY (`fill_id`) REFERENCES `fills`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `fill_taxes_fill_id_idx` ON `fill_taxes` (`fill_id`);--> statement-breakpoint
CREATE TABLE `fills` (
	`id` integer PRIMARY KEY NOT NULL,
	`order_id` integer NOT NULL,
	`quantity` real NOT NULL,
	`price` real NOT NULL,
	`type` text NOT NULL,
	`trading_method` text NOT NULL,
	`filled_at` text NOT NULL,
	`wallet_currency` text NOT NULL,
	`wallet_net_value` real NOT NULL,
	`wallet_fx_rate` real NOT NULL,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `fills_order_id_unique` ON `fills` (`order_id`);--> statement-breakpoint
CREATE INDEX `fills_order_id_idx` ON `fills` (`order_id`);--> statement-breakpoint
CREATE INDEX `fills_filled_at_idx` ON `fills` (`filled_at`);--> statement-breakpoint
CREATE TABLE `instruments` (
	`ticker` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`isin` text NOT NULL,
	`currency` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `instruments_isin_idx` ON `instruments` (`isin`);--> statement-breakpoint
CREATE TABLE `orders` (
	`id` integer PRIMARY KEY NOT NULL,
	`strategy` text NOT NULL,
	`type` text NOT NULL,
	`ticker` text NOT NULL,
	`quantity` real,
	`filled_quantity` real,
	`value` real,
	`filled_value` real,
	`limit_price` real,
	`status` text NOT NULL,
	`currency` text NOT NULL,
	`extended_hours` integer NOT NULL,
	`initiated_from` text NOT NULL,
	`side` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`ticker`) REFERENCES `instruments`(`ticker`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `orders_ticker_idx` ON `orders` (`ticker`);--> statement-breakpoint
CREATE INDEX `orders_created_at_idx` ON `orders` (`created_at`);--> statement-breakpoint
CREATE TABLE `sync_state` (
	`key` text PRIMARY KEY NOT NULL,
	`backfill_next_page_path` text,
	`backfill_completed` integer DEFAULT false NOT NULL,
	`rate_limit_limit` integer,
	`rate_limit_period_sec` integer,
	`rate_limit_remaining` integer,
	`rate_limit_reset_epoch` integer,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
