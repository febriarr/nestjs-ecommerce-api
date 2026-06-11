CREATE TYPE "public"."order_channel" AS ENUM('ONLINE', 'OFFLINE');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('PENDING', 'PAID', 'CANCELLED', 'EXPIRED');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('PENDING', 'SUCCEEDED', 'FAILED', 'EXPIRED');--> statement-breakpoint
CREATE TABLE "cart_items" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"cart_id" uuid NOT NULL,
	"variant_id" bigint NOT NULL,
	"quantity" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cart_items_quantity_positive" CHECK ("cart_items"."quantity" > 0)
);
--> statement-breakpoint
CREATE TABLE "carts" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"outlet_id" bigint,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "carts_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"order_id" uuid NOT NULL,
	"product_id" bigint NOT NULL,
	"variant_id" bigint NOT NULL,
	"product_name" varchar(200) NOT NULL,
	"variant_name" varchar(200),
	"sku_code" varchar(100) NOT NULL,
	"unit_price" bigint NOT NULL,
	"discount_amount" bigint DEFAULT 0 NOT NULL,
	"quantity" integer NOT NULL,
	"line_total" bigint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY NOT NULL,
	"order_number" varchar(50) NOT NULL,
	"user_id" uuid NOT NULL,
	"outlet_id" bigint NOT NULL,
	"channel" "order_channel" NOT NULL,
	"status" "order_status" DEFAULT 'PENDING' NOT NULL,
	"invoice_id" uuid,
	"shipping_address" jsonb,
	"subtotal" bigint NOT NULL,
	"discount_total" bigint DEFAULT 0 NOT NULL,
	"shipping_fee" bigint DEFAULT 0 NOT NULL,
	"total" bigint NOT NULL,
	"expires_at" timestamp with time zone,
	"paid_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "orders_order_number_unique" UNIQUE("order_number"),
	CONSTRAINT "orders_invoice_id_unique" UNIQUE("invoice_id")
);
--> statement-breakpoint
CREATE TABLE "outlet_inventory" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"outlet_id" bigint NOT NULL,
	"variant_id" bigint NOT NULL,
	"stock" integer DEFAULT 0 NOT NULL,
	"reserved_stock" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "outlet_inventory_stock_nonneg" CHECK ("outlet_inventory"."stock" >= 0),
	CONSTRAINT "outlet_inventory_reserved_nonneg" CHECK ("outlet_inventory"."reserved_stock" >= 0),
	CONSTRAINT "outlet_inventory_reserved_lte_stock" CHECK ("outlet_inventory"."reserved_stock" <= "outlet_inventory"."stock")
);
--> statement-breakpoint
CREATE TABLE "outlets" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"name" varchar(150) NOT NULL,
	"code" varchar(30) NOT NULL,
	"street" text,
	"district" varchar(100),
	"city" varchar(100),
	"province" varchar(100),
	"postal_code" varchar(10),
	"phone" varchar(20),
	"email" varchar(255),
	"latitude" numeric(10, 7),
	"longitude" numeric(10, 7),
	"is_active" boolean DEFAULT true NOT NULL,
	"serves_online" boolean DEFAULT false NOT NULL,
	"is_online_default" boolean DEFAULT false NOT NULL,
	"opening_hours" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "outlets_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY NOT NULL,
	"order_id" uuid NOT NULL,
	"provider" varchar(50) NOT NULL,
	"external_id" varchar(100),
	"payment_code" varchar(100),
	"amount" bigint NOT NULL,
	"status" "payment_status" DEFAULT 'PENDING' NOT NULL,
	"paid_at" timestamp with time zone,
	"failure_reason" varchar(512),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_cart_id_carts_id_fk" FOREIGN KEY ("cart_id") REFERENCES "public"."carts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "carts" ADD CONSTRAINT "carts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "carts" ADD CONSTRAINT "carts_outlet_id_outlets_id_fk" FOREIGN KEY ("outlet_id") REFERENCES "public"."outlets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_outlet_id_outlets_id_fk" FOREIGN KEY ("outlet_id") REFERENCES "public"."outlets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outlet_inventory" ADD CONSTRAINT "outlet_inventory_outlet_id_outlets_id_fk" FOREIGN KEY ("outlet_id") REFERENCES "public"."outlets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outlet_inventory" ADD CONSTRAINT "outlet_inventory_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "cart_items_cart_variant_idx" ON "cart_items" USING btree ("cart_id","variant_id");--> statement-breakpoint
CREATE INDEX "cart_items_variant_id_idx" ON "cart_items" USING btree ("variant_id");--> statement-breakpoint
CREATE INDEX "carts_outlet_id_idx" ON "carts" USING btree ("outlet_id");--> statement-breakpoint
CREATE INDEX "order_items_order_id_idx" ON "order_items" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "order_items_variant_id_idx" ON "order_items" USING btree ("variant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "orders_order_number_idx" ON "orders" USING btree ("order_number");--> statement-breakpoint
CREATE INDEX "orders_user_id_idx" ON "orders" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "orders_outlet_id_idx" ON "orders" USING btree ("outlet_id");--> statement-breakpoint
CREATE INDEX "orders_status_idx" ON "orders" USING btree ("status");--> statement-breakpoint
CREATE INDEX "orders_status_expires_at_idx" ON "orders" USING btree ("status","expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "outlet_inventory_outlet_variant_idx" ON "outlet_inventory" USING btree ("outlet_id","variant_id");--> statement-breakpoint
CREATE INDEX "outlet_inventory_variant_id_idx" ON "outlet_inventory" USING btree ("variant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "outlets_code_idx" ON "outlets" USING btree ("code");--> statement-breakpoint
CREATE INDEX "outlets_city_province_idx" ON "outlets" USING btree ("city","province");--> statement-breakpoint
CREATE INDEX "outlets_serves_online_idx" ON "outlets" USING btree ("serves_online","is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "outlets_one_online_default_idx" ON "outlets" USING btree ("is_online_default") WHERE "outlets"."is_online_default" = true;--> statement-breakpoint
CREATE INDEX "payments_order_id_idx" ON "payments" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "payments_external_id_idx" ON "payments" USING btree ("external_id");--> statement-breakpoint
CREATE UNIQUE INDEX "payments_one_pending_per_order_idx" ON "payments" USING btree ("order_id") WHERE "payments"."status" = 'PENDING';--> statement-breakpoint
-- Migrasi data stok global -> per-outlet (SEBELUM kolom di-drop):
-- 1) seed outlet default "Outlet Pusat" (fallback routing order online),
-- 2) pindahkan stok existing product_variants ke outlet_inventory milik outlet itu.
INSERT INTO "outlets" ("name", "code", "is_active", "serves_online", "is_online_default")
SELECT 'Outlet Pusat', 'MAIN', true, true, true
WHERE NOT EXISTS (SELECT 1 FROM "outlets" WHERE "code" = 'MAIN');--> statement-breakpoint
INSERT INTO "outlet_inventory" ("outlet_id", "variant_id", "stock", "reserved_stock")
SELECT (SELECT "id" FROM "outlets" WHERE "code" = 'MAIN'), pv."id", pv."stock", 0
FROM "product_variants" pv
WHERE pv."stock" > 0 AND pv."deleted_at" IS NULL
ON CONFLICT ("outlet_id", "variant_id") DO NOTHING;--> statement-breakpoint
ALTER TABLE "product_variants" DROP COLUMN "stock";