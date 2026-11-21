CREATE TABLE "recovery_snapshots" (
	"id" serial PRIMARY KEY NOT NULL,
	"snapshot_key" text NOT NULL,
	"source_project_id" text NOT NULL,
	"source_branch_id" text NOT NULL,
	"algorithm" text DEFAULT 'aes-256-gcm' NOT NULL,
	"kdf" text DEFAULT 'hkdf-sha256' NOT NULL,
	"salt" text NOT NULL,
	"iv" text NOT NULL,
	"auth_tag" text NOT NULL,
	"ciphertext" text NOT NULL,
	"plaintext_sha256" text NOT NULL,
	"account_count" integer NOT NULL,
	"aggregate_xp" integer NOT NULL,
	"completed_lessons_count" integer NOT NULL,
	"summary" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "recovery_snapshots_snapshot_key_unique" UNIQUE("snapshot_key")
);
--> statement-breakpoint
CREATE INDEX "recovery_snapshots_created_at_idx" ON "recovery_snapshots" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "lab_notes_user_saved_idx" ON "lab_notes" USING btree ("user_id","last_saved");--> statement-breakpoint
CREATE INDEX "timeline_events_timestamp_idx" ON "timeline_events" USING btree ("timestamp");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "users_email_lower_unique" ON "users" (LOWER("email"));--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "users_username_norm_unique" ON "users" (LOWER(LTRIM("username", '@')));--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "group_invitations_group_norm_user_unique" ON "group_invitations" ("group_id", LOWER(LTRIM("username", '@')));--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "group_join_requests_group_norm_user_unique" ON "group_join_requests" ("group_id", LOWER(LTRIM("username", '@')));--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "users" ADD CONSTRAINT "users_xp_nonnegative_chk" CHECK ("xp" >= 0);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "users" ADD CONSTRAINT "users_streak_nonnegative_chk" CHECK ("streak" >= 0);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "user_progress" ADD CONSTRAINT "user_progress_xp_nonnegative_chk" CHECK ("xp" >= 0);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "user_progress" ADD CONSTRAINT "user_progress_streak_nonnegative_chk" CHECK ("streak" >= 0);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "post_xp_daily_totals" ADD CONSTRAINT "post_xp_daily_totals_nonnegative_chk" CHECK ("xp_awarded" >= 0);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;