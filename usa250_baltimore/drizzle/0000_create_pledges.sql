CREATE TABLE IF NOT EXISTS `pledges` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `name` text NOT NULL,
  `amount_cents` integer NOT NULL,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `pledges_created_at_idx`
ON `pledges` (`created_at` DESC, `id` DESC);
