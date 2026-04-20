CREATE TABLE `__migration_assert_unmapped_current_positions` (
	`count` integer NOT NULL CHECK (`count` = 0)
);
--> statement-breakpoint
INSERT INTO `__migration_assert_unmapped_current_positions`
SELECT count(*)
FROM (
	SELECT DISTINCT `current_position_snapshots`.`provider_symbol`
	FROM `current_position_snapshots`
	LEFT JOIN `instrument_listings`
		ON `current_position_snapshots`.`provider_symbol` = `instrument_listings`.`ticker`
	LEFT JOIN `t212_instrument_catalog`
		ON `current_position_snapshots`.`provider_symbol` = `t212_instrument_catalog`.`ticker`
	WHERE `instrument_listings`.`ticker` IS NULL
		AND `t212_instrument_catalog`.`ticker` IS NULL
);
--> statement-breakpoint
DROP TABLE `__migration_assert_unmapped_current_positions`;
--> statement-breakpoint
INSERT OR IGNORE INTO `instruments`("isin", "name", "currency")
SELECT DISTINCT
	`current_position_snapshots`.`isin`,
	`t212_instrument_catalog`.`name`,
	`t212_instrument_catalog`.`currency_code`
FROM `current_position_snapshots`
INNER JOIN `t212_instrument_catalog`
	ON `current_position_snapshots`.`provider_symbol` = `t212_instrument_catalog`.`ticker`;
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
SELECT DISTINCT
	`current_position_snapshots`.`provider_symbol`,
	`current_position_snapshots`.`isin`,
	't212',
	`t212_instrument_catalog`.`name`,
	`t212_instrument_catalog`.`currency_code`,
	CURRENT_TIMESTAMP,
	CURRENT_TIMESTAMP
FROM `current_position_snapshots`
INNER JOIN `t212_instrument_catalog`
	ON `current_position_snapshots`.`provider_symbol` = `t212_instrument_catalog`.`ticker`;
--> statement-breakpoint
DELETE FROM `instrument_listings`
WHERE `ticker` NOT IN (SELECT DISTINCT `ticker` FROM `orders`)
	AND `ticker` NOT IN (
		SELECT DISTINCT `provider_symbol` FROM `current_position_snapshots`
	);
--> statement-breakpoint
DELETE FROM `instruments`
WHERE NOT EXISTS (
	SELECT 1
	FROM `instrument_listings`
	WHERE `instrument_listings`.`isin` = `instruments`.`isin`
);
--> statement-breakpoint
CREATE TABLE `__migration_assert_foreign_keys` (
	`count` integer NOT NULL CHECK (`count` = 0)
);
--> statement-breakpoint
INSERT INTO `__migration_assert_foreign_keys`
SELECT count(*)
FROM pragma_foreign_key_check;
--> statement-breakpoint
DROP TABLE `__migration_assert_foreign_keys`;
