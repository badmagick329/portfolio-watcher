CREATE TABLE `instrument_risk_metric_sync_status` (
	`isin` text NOT NULL,
	`provider` text NOT NULL,
	`provider_symbol` text NOT NULL,
	`status` text NOT NULL,
	`checked_at` text NOT NULL,
	`message` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `instrument_risk_metric_sync_status_unique_symbol_idx` ON `instrument_risk_metric_sync_status` (`provider`,`isin`,`provider_symbol`);--> statement-breakpoint
CREATE INDEX `instrument_risk_metric_sync_status_checked_at_idx` ON `instrument_risk_metric_sync_status` (`checked_at`);