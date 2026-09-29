CREATE TABLE `ias_reports` (
	`request_id` text PRIMARY KEY NOT NULL,
	`received_at` text NOT NULL,
	`species` text NOT NULL,
	`basin` text NOT NULL,
	`latitude` real NOT NULL,
	`longitude` real NOT NULL,
	`observed_date` text NOT NULL,
	`abundance` text,
	`habitat` text,
	`degradation` text,
	`notes` text,
	`photo_key` text,
	`review_status` text NOT NULL,
	`request_digest` text NOT NULL
);
