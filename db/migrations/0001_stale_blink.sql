ALTER TABLE "cars" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "customers" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "dealers" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "orders" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "sales_targets" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "cars" CASCADE;--> statement-breakpoint
DROP TABLE "customers" CASCADE;--> statement-breakpoint
DROP TABLE "dealers" CASCADE;--> statement-breakpoint
DROP TABLE "orders" CASCADE;--> statement-breakpoint
DROP TABLE "sales_targets" CASCADE;--> statement-breakpoint
ALTER TABLE "users" DROP CONSTRAINT "users_dealer_id_dealers_id_fk";
--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "phone_number" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."car_status";--> statement-breakpoint
DROP TYPE "public"."order_status";