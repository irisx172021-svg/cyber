CREATE TABLE "capstone_progress" (
	"user_id" text NOT NULL,
	"capstone_id" text NOT NULL,
	"current_stage_id" text NOT NULL,
	"stages" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"report_submitted" boolean DEFAULT false NOT NULL,
	"report_score" integer,
	"max_report_score" integer,
	"rubric_breakdown" jsonb,
	"last_submission_sections" jsonb,
	"detailed_solution_explanation" text,
	"completed_at" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "capstone_progress_user_id_capstone_id_pk" PRIMARY KEY("user_id","capstone_id")
);
--> statement-breakpoint
CREATE TABLE "group_invitations" (
	"id" text PRIMARY KEY NOT NULL,
	"group_id" text NOT NULL,
	"username" text NOT NULL,
	"invited_by" text NOT NULL,
	"created_at" text NOT NULL,
	"expires_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "group_join_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"group_id" text NOT NULL,
	"username" text NOT NULL,
	"requested_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "group_members" (
	"group_id" text NOT NULL,
	"member_handle" text NOT NULL,
	"user_id" text,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "group_members_group_id_member_handle_pk" PRIMARY KEY("group_id","member_handle")
);
--> statement-breakpoint
CREATE TABLE "group_messages" (
	"id" text PRIMARY KEY NOT NULL,
	"group_id" text NOT NULL,
	"sender_id" text,
	"sender_username" text NOT NULL,
	"sender_role" text NOT NULL,
	"content" text NOT NULL,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "groups" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"avatar" text NOT NULL,
	"visibility" text DEFAULT 'private' NOT NULL,
	"owner_id" text,
	"owner_handle" text NOT NULL,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lab_exploration" (
	"user_id" text NOT NULL,
	"lab_id" text NOT NULL,
	"explored_diagram_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"executed_terminal_commands" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"log_target_verified" boolean DEFAULT false NOT NULL,
	"verified_log_entry_id" text,
	"scenario_verified" boolean DEFAULT false NOT NULL,
	"verified_highlight_lines" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"exploration_complete" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "lab_exploration_user_id_lab_id_pk" PRIMARY KEY("user_id","lab_id")
);
--> statement-breakpoint
CREATE TABLE "lab_notes" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"module_id" text NOT NULL,
	"module_title" text NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"last_saved" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "migration_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"migration_key" text NOT NULL,
	"source_sha256" text NOT NULL,
	"schema_version" integer NOT NULL,
	"summary" jsonb NOT NULL,
	"applied_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "migration_history_migration_key_unique" UNIQUE("migration_key")
);
--> statement-breakpoint
CREATE TABLE "post_votes" (
	"post_id" text NOT NULL,
	"user_id" text NOT NULL,
	"vote" text NOT NULL,
	CONSTRAINT "post_votes_post_id_user_id_pk" PRIMARY KEY("post_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "post_xp_daily_totals" (
	"user_id" text NOT NULL,
	"date_key" text NOT NULL,
	"xp_awarded" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "post_xp_daily_totals_user_id_date_key_pk" PRIMARY KEY("user_id","date_key")
);
--> statement-breakpoint
CREATE TABLE "posts" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"author" text NOT NULL,
	"author_role" text NOT NULL,
	"content" text NOT NULL,
	"category" text NOT NULL,
	"upvotes" integer DEFAULT 0 NOT NULL,
	"user_vote" text,
	"created_at" text NOT NULL,
	"comments_count" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "revoked_sessions" (
	"sid" text PRIMARY KEY NOT NULL,
	"exp" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "timeline_events" (
	"id" text PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"action" text NOT NULL,
	"xp_reward" integer DEFAULT 0 NOT NULL,
	"timestamp" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_follows" (
	"follower_user_id" text NOT NULL,
	"followed_handle" text NOT NULL,
	"followed_user_id" text,
	"recorded_in_following" boolean DEFAULT true NOT NULL,
	"recorded_in_target_followers" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_follows_follower_user_id_followed_handle_pk" PRIMARY KEY("follower_user_id","followed_handle")
);
--> statement-breakpoint
CREATE TABLE "user_progress" (
	"user_id" text PRIMARY KEY NOT NULL,
	"schema_version" integer DEFAULT 2 NOT NULL,
	"completed_lesson_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"completed_exercise_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"completed_quiz_lesson_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"completed_homework_lesson_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"legacy_completed_lesson_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"xp" integer DEFAULT 0 NOT NULL,
	"streak" integer DEFAULT 0 NOT NULL,
	"last_active_date" text,
	"last_streak_update" text,
	"last_active_timestamp" text,
	"last_synced_at" text,
	"updated_at" text
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"username" text NOT NULL,
	"password_hash" text NOT NULL,
	"token_version" integer DEFAULT 1 NOT NULL,
	"xp" integer DEFAULT 0 NOT NULL,
	"streak" integer DEFAULT 0 NOT NULL,
	"level" integer DEFAULT 1 NOT NULL,
	"rank" text DEFAULT 'Cadet' NOT NULL,
	"completion" integer DEFAULT 0 NOT NULL,
	"verified_topics" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"last_active_date" text,
	"last_streak_update" text,
	"last_active_timestamp" text,
	"learning_profile" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "xp_events" (
	"user_id" text NOT NULL,
	"event_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "xp_events_user_id_event_id_pk" PRIMARY KEY("user_id","event_id")
);
--> statement-breakpoint
ALTER TABLE "capstone_progress" ADD CONSTRAINT "capstone_progress_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_invitations" ADD CONSTRAINT "group_invitations_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_join_requests" ADD CONSTRAINT "group_join_requests_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_members" ADD CONSTRAINT "group_members_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_members" ADD CONSTRAINT "group_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_messages" ADD CONSTRAINT "group_messages_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_messages" ADD CONSTRAINT "group_messages_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "groups" ADD CONSTRAINT "groups_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lab_exploration" ADD CONSTRAINT "lab_exploration_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lab_notes" ADD CONSTRAINT "lab_notes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_votes" ADD CONSTRAINT "post_votes_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_votes" ADD CONSTRAINT "post_votes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_xp_daily_totals" ADD CONSTRAINT "post_xp_daily_totals_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_follows" ADD CONSTRAINT "user_follows_follower_user_id_users_id_fk" FOREIGN KEY ("follower_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_follows" ADD CONSTRAINT "user_follows_followed_user_id_users_id_fk" FOREIGN KEY ("followed_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_progress" ADD CONSTRAINT "user_progress_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "xp_events" ADD CONSTRAINT "xp_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "group_invitations_group_user_unique" ON "group_invitations" USING btree ("group_id","username");--> statement-breakpoint
CREATE UNIQUE INDEX "group_join_requests_group_user_unique" ON "group_join_requests" USING btree ("group_id","username");--> statement-breakpoint
CREATE INDEX "group_messages_group_created_idx" ON "group_messages" USING btree ("group_id","created_at");--> statement-breakpoint
CREATE INDEX "lab_notes_user_id_idx" ON "lab_notes" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "posts_created_at_idx" ON "posts" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "revoked_sessions_exp_idx" ON "revoked_sessions" USING btree ("exp");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_unique" ON "users" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "users_username_unique" ON "users" USING btree ("username");