CREATE TABLE "attributes_values" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"attribute_id" bigint NOT NULL,
	"value" varchar(100) NOT NULL,
	"display_value" varchar(100),
	"color_hex" varchar(7),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "attributes_valuse" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "attributes_valuse" CASCADE;--> statement-breakpoint
--> statement-breakpoint
ALTER TABLE "attributes_values" ADD CONSTRAINT "attributes_values_attribute_id_attributes_id_fk" FOREIGN KEY ("attribute_id") REFERENCES "public"."attributes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "attribute_values_attribute_id_idx" ON "attributes_values" USING btree ("attribute_id");--> statement-breakpoint
CREATE UNIQUE INDEX "attribute_values_unique_idx" ON "attributes_values" USING btree ("attribute_id","value");--> statement-breakpoint
CREATE INDEX "attribute_values_create_at_idx" ON "attributes_values" USING btree ("created_at");--> statement-breakpoint
ALTER TABLE "variant_attributes" ADD CONSTRAINT "variant_attributes_attribute_value_id_attributes_values_id_fk" FOREIGN KEY ("attribute_value_id") REFERENCES "public"."attributes_values"("id") ON DELETE restrict ON UPDATE no action;