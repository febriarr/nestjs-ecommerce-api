ALTER TABLE "invoices" ADD COLUMN "amount_paid" bigint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "due_date" timestamp with time zone;