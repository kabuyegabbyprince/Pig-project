export const ECOMMERCE_SQL_MIGRATION = `-- ============================================================================
-- PIG PROJECT & E-COMMERCE PLATFORM — SUPABASE SQL MIGRATION & RLS POLICIES
-- Run this entire script in Supabase Dashboard -> SQL Editor (idempotent)
-- ============================================================================

DO $$ BEGIN
  CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'PAID', 'PROCESSING', 'DISPATCHED', 'COMPLETED', 'CANCELLED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "store_products" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "price" NUMERIC(12, 2) NOT NULL,
  "is_negotiable" BOOLEAN NOT NULL DEFAULT false,
  "discount_percent" NUMERIC(5, 2) NOT NULL DEFAULT 0,
  "discount_price" NUMERIC(12, 2),
  "discount_label" TEXT,
  "discount_starts_at" TIMESTAMP(3),
  "discount_ends_at" TIMESTAMP(3),
  "stock" INTEGER NOT NULL DEFAULT 0,
  "low_stock_threshold" INTEGER NOT NULL DEFAULT 3,
  "category" TEXT,
  "store_section" TEXT NOT NULL DEFAULT 'ANIMALS',
  "imageUrl" TEXT,
  "isAvailable" BOOLEAN NOT NULL DEFAULT true,
  "pig_id" TEXT REFERENCES "Pig"("id") ON DELETE SET NULL,
  "source_pig_tag" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE "store_products" ADD COLUMN IF NOT EXISTS "is_negotiable" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "store_products" ADD COLUMN IF NOT EXISTS "discount_percent" NUMERIC(5, 2) NOT NULL DEFAULT 0;
ALTER TABLE "store_products" ADD COLUMN IF NOT EXISTS "discount_price" NUMERIC(12, 2);
ALTER TABLE "store_products" ADD COLUMN IF NOT EXISTS "discount_label" TEXT;
ALTER TABLE "store_products" ADD COLUMN IF NOT EXISTS "discount_starts_at" TIMESTAMP(3);
ALTER TABLE "store_products" ADD COLUMN IF NOT EXISTS "discount_ends_at" TIMESTAMP(3);
ALTER TABLE "store_products" ADD COLUMN IF NOT EXISTS "low_stock_threshold" INTEGER NOT NULL DEFAULT 3;
ALTER TABLE "store_products" ADD COLUMN IF NOT EXISTS "store_section" TEXT NOT NULL DEFAULT 'ANIMALS';
ALTER TABLE "store_products" ADD COLUMN IF NOT EXISTS "pig_id" TEXT REFERENCES "Pig"("id") ON DELETE SET NULL;
ALTER TABLE "store_products" ADD COLUMN IF NOT EXISTS "source_pig_tag" TEXT;

CREATE TABLE IF NOT EXISTS "store_orders" (
  "id" TEXT PRIMARY KEY,
  "order_number" TEXT UNIQUE NOT NULL,
  "customer_name" TEXT NOT NULL,
  "customer_email" TEXT,
  "customer_phone" TEXT,
  "shipping_address" TEXT,
  "subtotal_amount" NUMERIC(12, 2) NOT NULL DEFAULT 0,
  "discount_total" NUMERIC(12, 2) NOT NULL DEFAULT 0,
  "total_amount" NUMERIC(12, 2) NOT NULL,
  "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
  "payment_method" TEXT,
  "payment_reference" TEXT,
  "notes" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE "store_orders" ADD COLUMN IF NOT EXISTS "shipping_address" TEXT;
ALTER TABLE "store_orders" ADD COLUMN IF NOT EXISTS "payment_reference" TEXT;
ALTER TABLE "store_orders" ADD COLUMN IF NOT EXISTS "subtotal_amount" NUMERIC(12, 2) NOT NULL DEFAULT 0;
ALTER TABLE "store_orders" ADD COLUMN IF NOT EXISTS "discount_total" NUMERIC(12, 2) NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS "store_order_items" (
  "id" TEXT PRIMARY KEY,
  "order_id" TEXT NOT NULL REFERENCES "store_orders"("id") ON DELETE CASCADE,
  "product_id" TEXT REFERENCES "store_products"("id") ON DELETE SET NULL,
  "quantity" INTEGER NOT NULL,
  "original_price" NUMERIC(12, 2),
  "discount_amount" NUMERIC(12, 2) NOT NULL DEFAULT 0,
  "price" NUMERIC(12, 2) NOT NULL
);

ALTER TABLE "store_order_items" ADD COLUMN IF NOT EXISTS "original_price" NUMERIC(12, 2);
ALTER TABLE "store_order_items" ADD COLUMN IF NOT EXISTS "discount_amount" NUMERIC(12, 2) NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS "cooperative_stock_reports" (
  "id" TEXT PRIMARY KEY,
  "reported_by_id" TEXT NOT NULL,
  "reported_by_name" TEXT NOT NULL,
  "cooperative_owner_name" TEXT NOT NULL,
  "cooperative_owner_role" TEXT NOT NULL DEFAULT 'COOPERATIVE_MEMBER',
  "cell_name" TEXT NOT NULL,
  "animal_title" TEXT NOT NULL,
  "pig_count" INTEGER NOT NULL DEFAULT 1,
  "estimated_weight_kg" NUMERIC(8, 2),
  "suggested_price" NUMERIC(12, 2),
  "pig_id" TEXT REFERENCES "Pig"("id") ON DELETE SET NULL,
  "source_pig_tag" TEXT,
  "notes" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "listed_product_id" TEXT REFERENCES "store_products"("id") ON DELETE SET NULL,
  "reviewed_by_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "cell_feed_sales" (
  "id" TEXT PRIMARY KEY,
  "sale_number" TEXT UNIQUE NOT NULL,
  "product_id" TEXT REFERENCES "store_products"("id") ON DELETE SET NULL,
  "product_name" TEXT NOT NULL,
  "buyer_name" TEXT NOT NULL,
  "buyer_phone" TEXT,
  "quantity" INTEGER NOT NULL,
  "unit_price" NUMERIC(12, 2) NOT NULL,
  "total_amount" NUMERIC(12, 2) NOT NULL,
  "payment_method" TEXT NOT NULL DEFAULT 'Cash',
  "sold_by_id" TEXT NOT NULL,
  "sold_by_name" TEXT NOT NULL,
  "cell_name" TEXT,
  "finance_transaction_id" TEXT,
  "verification_status" TEXT NOT NULL DEFAULT 'PENDING',
  "verified_by_id" TEXT,
  "verified_at" TIMESTAMP(3),
  "notes" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "store_products_pig_id_idx" ON "store_products"("pig_id");
CREATE INDEX IF NOT EXISTS "store_products_section_idx" ON "store_products"("store_section");
CREATE INDEX IF NOT EXISTS "store_orders_order_number_idx" ON "store_orders"("order_number");
CREATE INDEX IF NOT EXISTS "store_orders_status_idx" ON "store_orders"("status");
CREATE INDEX IF NOT EXISTS "store_order_items_order_id_idx" ON "store_order_items"("order_id");
CREATE INDEX IF NOT EXISTS "store_order_items_product_id_idx" ON "store_order_items"("product_id");
CREATE INDEX IF NOT EXISTS "coop_stock_reports_status_idx" ON "cooperative_stock_reports"("status");
CREATE INDEX IF NOT EXISTS "cell_feed_sales_status_idx" ON "cell_feed_sales"("verification_status");
CREATE INDEX IF NOT EXISTS "cell_feed_sales_sold_by_idx" ON "cell_feed_sales"("sold_by_id");

ALTER TABLE "store_products" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "store_orders" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "store_order_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "cooperative_stock_reports" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "cell_feed_sales" ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Public read available store products" ON "store_products";
  CREATE POLICY "Public read available store products"
    ON "store_products" FOR SELECT
    TO anon, authenticated
    USING ("isAvailable" = true);
EXCEPTION WHEN undefined_table THEN null;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'website_content') THEN
    ALTER TABLE "website_content" ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Public read website content" ON "website_content";
    CREATE POLICY "Public read website content"
      ON "website_content" FOR SELECT TO anon, authenticated USING (true);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'gallery_items') THEN
    ALTER TABLE "gallery_items" ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Public read published gallery" ON "gallery_items";
    CREATE POLICY "Public read published gallery"
      ON "gallery_items" FOR SELECT TO anon, authenticated USING ("is_published" = true);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'team_members') THEN
    ALTER TABLE "team_members" ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Public read published team" ON "team_members";
    CREATE POLICY "Public read published team"
      ON "team_members" FOR SELECT TO anon, authenticated USING ("is_published" = true);
  END IF;
END $$;

INSERT INTO storage.buckets (id, name, public)
VALUES ('product-image', 'product-image', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Public read product-image" ON storage.objects;
  CREATE POLICY "Public read product-image"
    ON storage.objects FOR SELECT TO public USING (bucket_id = 'product-image');
  DROP POLICY IF EXISTS "Service role manage product-image" ON storage.objects;
  CREATE POLICY "Service role manage product-image"
    ON storage.objects FOR ALL TO service_role USING (bucket_id = 'product-image') WITH CHECK (bucket_id = 'product-image');
EXCEPTION WHEN others THEN null;
END $$;
`;
