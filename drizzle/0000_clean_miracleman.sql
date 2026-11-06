CREATE TABLE `research_jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`venue` text NOT NULL,
	`provider_run_id` text,
	`status` text NOT NULL,
	`result_json` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`error` text
);
--> statement-breakpoint
CREATE INDEX `jobs_venue_status` ON `research_jobs` (`venue`,`status`);--> statement-breakpoint
CREATE TABLE `source_checks` (
	`venue` text PRIMARY KEY NOT NULL,
	`checked_at` integer NOT NULL,
	`result_json` text NOT NULL
);
