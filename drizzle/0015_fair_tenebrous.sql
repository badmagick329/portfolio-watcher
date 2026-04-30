CREATE TABLE `instrument_provider_resolution_candidates` (
	`isin` text NOT NULL,
	`provider` text NOT NULL,
	`candidate_symbol` text NOT NULL,
	`candidate_name` text,
	`candidate_isin` text,
	`market_cap` real,
	`score` integer NOT NULL,
	`evidence` text,
	`fetched_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `instrument_provider_resolution_candidates_unique_idx` ON `instrument_provider_resolution_candidates` (`provider`,`isin`,`candidate_symbol`);--> statement-breakpoint
CREATE INDEX `instrument_provider_resolution_candidates_fetched_at_idx` ON `instrument_provider_resolution_candidates` (`fetched_at`);--> statement-breakpoint
CREATE TABLE `instrument_provider_resolution_status` (
	`isin` text NOT NULL,
	`provider` text NOT NULL,
	`status` text NOT NULL,
	`resolved_symbol` text,
	`resolution_method` text,
	`confidence` text,
	`message` text,
	`evidence` text,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `instrument_provider_resolution_status_unique_idx` ON `instrument_provider_resolution_status` (`provider`,`isin`);--> statement-breakpoint
CREATE INDEX `instrument_provider_resolution_status_updated_at_idx` ON `instrument_provider_resolution_status` (`updated_at`);
--> statement-breakpoint
INSERT OR IGNORE INTO `instrument_provider_resolution_status` (
	`isin`,
	`provider`,
	`status`,
	`resolved_symbol`,
	`resolution_method`,
	`confidence`,
	`message`,
	`evidence`
)
SELECT
	`isin`,
	`provider`,
	'resolved',
	`provider_symbol`,
	'manual',
	'high',
	NULL,
	NULL
FROM `instrument_provider_symbols`;
