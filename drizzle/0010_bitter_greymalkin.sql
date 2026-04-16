CREATE TABLE `instrument_categories` (
	`isin` text PRIMARY KEY NOT NULL,
	`category` text NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `instrument_categories_category_idx` ON `instrument_categories` (`category`);