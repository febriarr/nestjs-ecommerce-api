CREATE TYPE "public"."payment_method" AS ENUM('CASH', 'CARD', 'QRIS', 'TRANSFER', 'ONLINE');--> statement-breakpoint
-- Tambah `method` nullable dulu agar aman terhadap baris payments existing,
-- backfill dari provider (offline lama 'cash' → CASH, gateway → ONLINE),
-- baru tegakkan NOT NULL.
ALTER TABLE "payments" ADD COLUMN "method" "payment_method";--> statement-breakpoint
UPDATE "payments" SET "method" = CASE
  WHEN "provider" = 'cash' THEN 'CASH'::"public"."payment_method"
  ELSE 'ONLINE'::"public"."payment_method"
END WHERE "method" IS NULL;--> statement-breakpoint
ALTER TABLE "payments" ALTER COLUMN "method" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "reference" varchar(100);