CREATE TABLE `app_feature_flags` (
	`key` text PRIMARY KEY NOT NULL,
	`enabled` integer NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
