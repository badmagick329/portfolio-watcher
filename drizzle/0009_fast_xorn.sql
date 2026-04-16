ALTER TABLE `order_execution_attempts` ADD `order_type` text DEFAULT 'market' NOT NULL;--> statement-breakpoint
ALTER TABLE `order_execution_attempts` ADD `limit_price` real;--> statement-breakpoint
ALTER TABLE `order_execution_attempts` ADD `time_validity` text;