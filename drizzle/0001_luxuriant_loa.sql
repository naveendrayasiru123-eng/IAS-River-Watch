CREATE TABLE `admin_login_attempts` (
	`ip_hash` text PRIMARY KEY NOT NULL,
	`attempts` real NOT NULL,
	`window_start` real NOT NULL
);
