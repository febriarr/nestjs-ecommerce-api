DROP INDEX "outlets_code_idx";--> statement-breakpoint
CREATE UNIQUE INDEX "outlets_code_active_idx" ON "outlets" USING btree ("code") WHERE "outlets"."deleted_at" IS NULL;