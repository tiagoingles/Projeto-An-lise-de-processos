CREATE TABLE IF NOT EXISTS "allowed_users" (
	"email" text PRIMARY KEY NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"note" text,
	"added_by_email" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "analyses" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_email" text NOT NULL,
	"file_name" text,
	"process_number" text,
	"subject" text,
	"theme" text,
	"result" jsonb NOT NULL,
	"user_feedback_decision" text,
	"user_notes" text,
	"is_saved_to_precedents" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "precedents" (
	"id" text PRIMARY KEY NOT NULL,
	"process_number" text DEFAULT 'S/N' NOT NULL,
	"subject" text DEFAULT '' NOT NULL,
	"theme" text DEFAULT 'Geral' NOT NULL,
	"factual_summary" text DEFAULT '' NOT NULL,
	"final_decision" text DEFAULT '' NOT NULL,
	"deliberations_or_despacho" text DEFAULT '' NOT NULL,
	"unit" text DEFAULT 'GEMAP' NOT NULL,
	"date" text DEFAULT '' NOT NULL,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"precedent_summary" text DEFAULT '' NOT NULL,
	"outcome_type" text,
	"source_file_name" text,
	"created_by_email" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "rules" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"category" text NOT NULL,
	"theme" text,
	"description" text DEFAULT '' NOT NULL,
	"content" text DEFAULT '' NOT NULL,
	"citation_or_article" text,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"document_source" text,
	"subfolder_path" text,
	"created_by_email" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "themes" (
	"name" text PRIMARY KEY NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "usage_events" (
	"id" text PRIMARY KEY NOT NULL,
	"user_email" text NOT NULL,
	"action" text NOT NULL,
	"model" text,
	"process_number" text,
	"input_tokens" integer DEFAULT 0 NOT NULL,
	"output_tokens" integer DEFAULT 0 NOT NULL,
	"total_tokens" integer DEFAULT 0 NOT NULL,
	"latency_ms" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'ok' NOT NULL,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"picture" text,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "work_profiles" (
	"owner_email" text PRIMARY KEY NOT NULL,
	"role" text DEFAULT 'Analista / Gestor de Processos SEI' NOT NULL,
	"jurisdiction_or_organ" text DEFAULT 'GEMAP' NOT NULL,
	"decision_tone" text DEFAULT 'objetivo_direto' NOT NULL,
	"custom_instructions" text DEFAULT '' NOT NULL,
	"accumulated_learnings" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
