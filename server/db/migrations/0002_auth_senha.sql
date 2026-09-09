DROP TABLE "users" CASCADE;--> statement-breakpoint
ALTER TABLE "allowed_users" ADD COLUMN "name" text;--> statement-breakpoint
ALTER TABLE "allowed_users" ADD COLUMN "password_hash" text;--> statement-breakpoint
ALTER TABLE "allowed_users" ADD COLUMN "last_login_at" timestamp with time zone;