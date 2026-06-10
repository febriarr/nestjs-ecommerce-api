CREATE TYPE "public"."variant_status" AS ENUM('active', 'inactive');--> statement-breakpoint
CREATE TYPE "public"."discount_type" AS ENUM('PERCENTAGE', 'FIXED');--> statement-breakpoint
CREATE TYPE "public"."product_status" AS ENUM('draft', 'active', 'inactive');--> statement-breakpoint
CREATE SEQUENCE "public"."variant_sku_number_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1000000000 CACHE 1;--> statement-breakpoint
CREATE TABLE "product_variants" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"product_id" bigint NOT NULL,
	"sku_number" bigint DEFAULT nextval('variant_sku_number_seq') NOT NULL,
	"sku_code" varchar(100) NOT NULL,
	"variant_name" varchar(200),
	"price" bigint NOT NULL,
	"compare_at_price" bigint,
	"stock" integer DEFAULT 0 NOT NULL,
	"weight" integer,
	"is_default" boolean DEFAULT false NOT NULL,
	"status" "variant_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "product_variants_sku_number_unique" UNIQUE("sku_number"),
	CONSTRAINT "product_variants_sku_code_unique" UNIQUE("sku_code")
);
--> statement-breakpoint
CREATE TABLE "variant_attributes" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"variant_id" bigint NOT NULL,
	"attribute_id" bigint NOT NULL,
	"attribute_value_id" bigint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "variant_media" (
	"variant_id" bigint NOT NULL,
	"media_id" bigint NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "variant_media_variant_id_media_id_pk" PRIMARY KEY("variant_id","media_id")
);
--> statement-breakpoint
CREATE TABLE "product_attributes" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"product_id" bigint NOT NULL,
	"attribute_id" bigint NOT NULL,
	"is_required" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_discounts" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"product_id" bigint NOT NULL,
	"type" "discount_type" DEFAULT 'PERCENTAGE' NOT NULL,
	"percentage" numeric(5, 2),
	"fixed_amount" bigint,
	"max_discount" bigint,
	"priority" integer DEFAULT 0 NOT NULL,
	"start_at" timestamp with time zone NOT NULL,
	"end_at" timestamp with time zone NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "product_media" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"product_id" bigint NOT NULL,
	"image_url" varchar(512) NOT NULL,
	"image_alt" varchar(255),
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"name" varchar(200) NOT NULL,
	"slug" varchar(200) NOT NULL,
	"description" text,
	"short_description" varchar(300),
	"category_id" uuid NOT NULL,
	"brand_id" bigint,
	"status" "product_status" DEFAULT 'draft' NOT NULL,
	"thumbnail_media_id" bigint,
	"min_price" bigint,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "products_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "variant_attributes" ADD CONSTRAINT "variant_attributes_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "variant_attributes" ADD CONSTRAINT "variant_attributes_attribute_id_attributes_id_fk" FOREIGN KEY ("attribute_id") REFERENCES "public"."attributes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "variant_attributes" ADD CONSTRAINT "variant_attributes_attribute_value_id_attributes_valuse_id_fk" FOREIGN KEY ("attribute_value_id") REFERENCES "public"."attributes_valuse"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "variant_media" ADD CONSTRAINT "variant_media_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "variant_media" ADD CONSTRAINT "variant_media_media_id_product_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."product_media"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_attributes" ADD CONSTRAINT "product_attributes_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_attributes" ADD CONSTRAINT "product_attributes_attribute_id_attributes_id_fk" FOREIGN KEY ("attribute_id") REFERENCES "public"."attributes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_discounts" ADD CONSTRAINT "product_discounts_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_media" ADD CONSTRAINT "product_media_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_thumbnail_media_id_product_media_id_fk" FOREIGN KEY ("thumbnail_media_id") REFERENCES "public"."product_media"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "product_variants_sku_number_idx" ON "product_variants" USING btree ("sku_number");--> statement-breakpoint
CREATE UNIQUE INDEX "product_variants_sku_code_idx" ON "product_variants" USING btree ("sku_code");--> statement-breakpoint
CREATE INDEX "product_variants_product_id_idx" ON "product_variants" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "product_variants_status_idx" ON "product_variants" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "product_variants_one_default_idx" ON "product_variants" USING btree ("product_id") WHERE "product_variants"."is_default" = true;--> statement-breakpoint
CREATE UNIQUE INDEX "variant_attributes_variant_attribute_idx" ON "variant_attributes" USING btree ("variant_id","attribute_id");--> statement-breakpoint
CREATE UNIQUE INDEX "variant_attributes_unique_idx" ON "variant_attributes" USING btree ("variant_id","attribute_value_id");--> statement-breakpoint
CREATE INDEX "variant_attributes_variant_id_idx" ON "variant_attributes" USING btree ("variant_id");--> statement-breakpoint
CREATE INDEX "variant_attributes_attribute_value_id_idx" ON "variant_attributes" USING btree ("attribute_value_id");--> statement-breakpoint
CREATE INDEX "variant_media_media_id_idx" ON "variant_media" USING btree ("media_id");--> statement-breakpoint
CREATE UNIQUE INDEX "product_attributes_unique_idx" ON "product_attributes" USING btree ("product_id","attribute_id");--> statement-breakpoint
CREATE INDEX "product_attributes_product_id_idx" ON "product_attributes" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "product_attributes_attribute_id_idx" ON "product_attributes" USING btree ("attribute_id");--> statement-breakpoint
CREATE INDEX "product_discounts_product_id_idx" ON "product_discounts" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "product_discounts_active_window_idx" ON "product_discounts" USING btree ("product_id","is_active","start_at","end_at");--> statement-breakpoint
CREATE INDEX "product_discounts_priority_idx" ON "product_discounts" USING btree ("product_id","is_active","priority");--> statement-breakpoint
CREATE INDEX "product_media_product_id_idx" ON "product_media" USING btree ("product_id");--> statement-breakpoint
CREATE UNIQUE INDEX "product_media_product_url_idx" ON "product_media" USING btree ("product_id","image_url");--> statement-breakpoint
CREATE UNIQUE INDEX "products_slug_idx" ON "products" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "products_category_id_idx" ON "products" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "products_brand_id_idx" ON "products" USING btree ("brand_id");--> statement-breakpoint
CREATE INDEX "products_status_idx" ON "products" USING btree ("status");--> statement-breakpoint
CREATE INDEX "products_status_min_price_idx" ON "products" USING btree ("status","min_price");--> statement-breakpoint
CREATE INDEX "products_created_by_idx" ON "products" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "products_thumbnail_media_id_idx" ON "products" USING btree ("thumbnail_media_id");