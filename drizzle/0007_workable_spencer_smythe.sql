CREATE TABLE `t212_instrument_catalog` (
	`ticker` text PRIMARY KEY NOT NULL,
	`isin` text NOT NULL,
	`name` text NOT NULL,
	`short_name` text,
	`instrument_type` text,
	`currency_code` text NOT NULL,
	`extended_hours` integer NOT NULL,
	`max_open_quantity` real,
	`added_on` text,
	`fetched_at` text NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `t212_instrument_catalog_isin_idx` ON `t212_instrument_catalog` (`isin`);--> statement-breakpoint
CREATE INDEX `t212_instrument_catalog_name_idx` ON `t212_instrument_catalog` (`name`);