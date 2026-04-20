PRAGMA foreign_keys=OFF;--> statement-breakpoint
ALTER TABLE `instruments` RENAME TO `instruments_legacy`;--> statement-breakpoint
CREATE TABLE `instruments` (
	`isin` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`currency` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
INSERT OR IGNORE INTO `instruments`("isin", "name", "currency", "created_at")
SELECT "isin", "name", "currency", "created_at"
FROM `instruments_legacy`;--> statement-breakpoint
INSERT OR IGNORE INTO `instruments`("isin", "name", "currency")
SELECT "isin", "name", "currency_code"
FROM `t212_instrument_catalog`;--> statement-breakpoint
CREATE TABLE `instrument_listings` (
	`ticker` text PRIMARY KEY NOT NULL,
	`isin` text NOT NULL,
	`provider` text DEFAULT 't212' NOT NULL,
	`name` text NOT NULL,
	`currency` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`isin`) REFERENCES `instruments`(`isin`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT OR IGNORE INTO `instrument_listings`(
	"ticker",
	"isin",
	"provider",
	"name",
	"currency",
	"created_at",
	"updated_at"
)
SELECT
	"ticker",
	"isin",
	't212',
	"name",
	"currency",
	"created_at",
	CURRENT_TIMESTAMP
FROM `instruments_legacy`;--> statement-breakpoint
INSERT OR IGNORE INTO `instrument_listings`(
	"ticker",
	"isin",
	"provider",
	"name",
	"currency",
	"created_at",
	"updated_at"
)
SELECT
	"ticker",
	"isin",
	't212',
	"name",
	"currency_code",
	CURRENT_TIMESTAMP,
	CURRENT_TIMESTAMP
FROM `t212_instrument_catalog`;--> statement-breakpoint
CREATE INDEX `instrument_listings_isin_idx` ON `instrument_listings` (`isin`);--> statement-breakpoint
CREATE INDEX `instrument_listings_provider_idx` ON `instrument_listings` (`provider`);--> statement-breakpoint
CREATE TABLE `__migration_assert_orphan_orders` (
	`count` integer NOT NULL CHECK (`count` = 0)
);--> statement-breakpoint
INSERT INTO `__migration_assert_orphan_orders`
SELECT count(*)
FROM `orders`
LEFT JOIN `instrument_listings`
	ON `orders`.`ticker` = `instrument_listings`.`ticker`
WHERE `instrument_listings`.`ticker` IS NULL;--> statement-breakpoint
DROP TABLE `__migration_assert_orphan_orders`;--> statement-breakpoint
CREATE TABLE `__new_orders` (
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
	FOREIGN KEY (`ticker`) REFERENCES `instrument_listings`(`ticker`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_orders`(
	"id",
	"strategy",
	"type",
	"ticker",
	"quantity",
	"filled_quantity",
	"value",
	"filled_value",
	"limit_price",
	"status",
	"currency",
	"extended_hours",
	"initiated_from",
	"side",
	"created_at"
)
SELECT
	"id",
	"strategy",
	"type",
	"ticker",
	"quantity",
	"filled_quantity",
	"value",
	"filled_value",
	"limit_price",
	"status",
	"currency",
	"extended_hours",
	"initiated_from",
	"side",
	"created_at"
FROM `orders`;--> statement-breakpoint
CREATE TABLE `__new_fills` (
	`id` integer PRIMARY KEY NOT NULL,
	`order_id` integer NOT NULL UNIQUE,
	`quantity` real NOT NULL,
	`price` real NOT NULL,
	`type` text NOT NULL,
	`trading_method` text NOT NULL,
	`filled_at` text NOT NULL,
	`wallet_currency` text NOT NULL,
	`wallet_net_value` real NOT NULL,
	`wallet_fx_rate` real NOT NULL,
	FOREIGN KEY (`order_id`) REFERENCES `__new_orders`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_fills`(
	"id",
	"order_id",
	"quantity",
	"price",
	"type",
	"trading_method",
	"filled_at",
	"wallet_currency",
	"wallet_net_value",
	"wallet_fx_rate"
)
SELECT
	"id",
	"order_id",
	"quantity",
	"price",
	"type",
	"trading_method",
	"filled_at",
	"wallet_currency",
	"wallet_net_value",
	"wallet_fx_rate"
FROM `fills`;--> statement-breakpoint
CREATE TABLE `__new_fill_taxes` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`fill_id` integer NOT NULL,
	`name` text NOT NULL,
	`quantity` real NOT NULL,
	`currency` text NOT NULL,
	`charged_at` text NOT NULL,
	FOREIGN KEY (`fill_id`) REFERENCES `__new_fills`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_fill_taxes`(
	"id",
	"fill_id",
	"name",
	"quantity",
	"currency",
	"charged_at"
)
SELECT
	"id",
	"fill_id",
	"name",
	"quantity",
	"currency",
	"charged_at"
FROM `fill_taxes`;--> statement-breakpoint
DROP TABLE `fill_taxes`;--> statement-breakpoint
DROP TABLE `fills`;--> statement-breakpoint
DROP TABLE `orders`;--> statement-breakpoint
ALTER TABLE `__new_orders` RENAME TO `orders`;--> statement-breakpoint
CREATE INDEX `orders_ticker_idx` ON `orders` (`ticker`);--> statement-breakpoint
CREATE INDEX `orders_created_at_idx` ON `orders` (`created_at`);--> statement-breakpoint
ALTER TABLE `__new_fills` RENAME TO `fills`;--> statement-breakpoint
CREATE INDEX `fills_order_id_idx` ON `fills` (`order_id`);--> statement-breakpoint
CREATE INDEX `fills_filled_at_idx` ON `fills` (`filled_at`);--> statement-breakpoint
ALTER TABLE `__new_fill_taxes` RENAME TO `fill_taxes`;--> statement-breakpoint
CREATE INDEX `fill_taxes_fill_id_idx` ON `fill_taxes` (`fill_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `fill_taxes_unique_entry_idx` ON `fill_taxes` (`fill_id`,`name`,`quantity`,`currency`,`charged_at`);--> statement-breakpoint
DROP TABLE `instruments_legacy`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE TABLE `__migration_assert_foreign_keys` (
	`count` integer NOT NULL CHECK (`count` = 0)
);--> statement-breakpoint
INSERT INTO `__migration_assert_foreign_keys`
SELECT count(*)
FROM pragma_foreign_key_check;--> statement-breakpoint
DROP TABLE `__migration_assert_foreign_keys`;
