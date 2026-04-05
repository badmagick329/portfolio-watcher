CREATE TABLE `order_execution_attempts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`environment` text NOT NULL,
	`instrument_input` text NOT NULL,
	`resolved_ticker` text NOT NULL,
	`resolved_isin` text NOT NULL,
	`resolved_name` text NOT NULL,
	`side` text NOT NULL,
	`requested_mode` text NOT NULL,
	`requested_quantity` real,
	`requested_value` real,
	`derived_quantity` real NOT NULL,
	`reference_price` real,
	`extended_hours` integer NOT NULL,
	`execution_mode` text NOT NULL,
	`broker_request_payload` text NOT NULL,
	`broker_response_payload` text,
	`error_code` text,
	`error_message` text,
	`attempted_at` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `order_execution_attempts_attempted_at_idx` ON `order_execution_attempts` (`attempted_at`);--> statement-breakpoint
CREATE INDEX `order_execution_attempts_resolved_ticker_idx` ON `order_execution_attempts` (`resolved_ticker`);