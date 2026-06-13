ALTER TABLE "variant_media" ADD COLUMN "is_default" boolean DEFAULT false NOT NULL;--> statement-breakpoint
-- Backfill: variant existing yang sudah punya media → tandai media dengan
-- sortOrder terkecil (lalu mediaId) sebagai default, satu per variant.
UPDATE "variant_media" vm SET "is_default" = true
FROM (
  SELECT DISTINCT ON ("variant_id") "variant_id", "media_id"
  FROM "variant_media"
  ORDER BY "variant_id", "sort_order", "media_id"
) first
WHERE vm."variant_id" = first."variant_id" AND vm."media_id" = first."media_id";--> statement-breakpoint
CREATE UNIQUE INDEX "variant_media_one_default_idx" ON "variant_media" USING btree ("variant_id") WHERE "variant_media"."is_default" = true;