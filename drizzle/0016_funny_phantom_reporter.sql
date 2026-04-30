PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_fills` (
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
);--> statement-breakpoint
INSERT INTO `__new_fills` (`id`, `order_id`, `quantity`, `price`, `type`, `trading_method`, `filled_at`, `wallet_currency`, `wallet_net_value`, `wallet_fx_rate`)
SELECT `id`, `order_id`, `quantity`, `price`, `type`, `trading_method`, `filled_at`, `wallet_currency`, `wallet_net_value`, `wallet_fx_rate`
FROM `fills`;--> statement-breakpoint
DROP TABLE `fills`;--> statement-breakpoint
ALTER TABLE `__new_fills` RENAME TO `fills`;--> statement-breakpoint
CREATE INDEX `fills_order_id_idx` ON `fills` (`order_id`);--> statement-breakpoint
CREATE INDEX `fills_filled_at_idx` ON `fills` (`filled_at`);--> statement-breakpoint
PRAGMA foreign_keys=ON;
