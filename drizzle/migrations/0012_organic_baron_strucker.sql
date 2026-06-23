ALTER TYPE "public"."role" ADD VALUE 'cashier';--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "outlet_id" integer;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_outlet_id_outlets_id_fk" FOREIGN KEY ("outlet_id") REFERENCES "public"."outlets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "users_outlet_id_idx" ON "users" USING btree ("outlet_id");--> statement-breakpoint
CREATE INDEX "users_outlet_role_idx" ON "users" USING btree ("outlet_id","role");