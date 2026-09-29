CREATE TABLE `sample_verifications` (
	`sample_id` real PRIMARY KEY NOT NULL,
	`observed_date` text NOT NULL,
	`verification_note` text NOT NULL,
	`verified_at` text NOT NULL
);
--> statement-breakpoint
ALTER TABLE `ias_reports` ADD `review_note` text;--> statement-breakpoint
ALTER TABLE `ias_reports` ADD `reviewed_at` text;