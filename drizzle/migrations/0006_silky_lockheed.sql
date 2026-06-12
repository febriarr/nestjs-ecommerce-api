ALTER TYPE "public"."order_status" ADD VALUE 'REFUNDED';--> statement-breakpoint
ALTER TYPE "public"."payment_status" ADD VALUE 'REFUNDED';--> statement-breakpoint
ALTER TYPE "public"."stock_movement_type" ADD VALUE 'REFUND_RESTOCK';--> statement-breakpoint
CREATE TABLE "idempotency_keys" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"scope" varchar(30) NOT NULL,
	"key" varchar(100) NOT NULL,
	"order_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "refunded_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "idempotency_keys" ADD CONSTRAINT "idempotency_keys_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "idempotency_keys" ADD CONSTRAINT "idempotency_keys_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "idempotency_keys_user_scope_key_idx" ON "idempotency_keys" USING btree ("user_id","scope","key");