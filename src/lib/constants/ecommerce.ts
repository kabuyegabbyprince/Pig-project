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
  "stock" INTEGER NOT NULL DEFAULT 0,
  "category" TEXT,
  "imageUrl" TEXT,
  "isAvailable" BOOLEAN NOT NULL DEFAULT true,
  "pig_id" TEXT REFERENCES "Pig"("id") ON DELETE SET NULL,
  "source_pig_tag" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE "store_products" ADD COLUMN IF NOT EXISTS "pig_id" TEXT REFERENCES "Pig"("id") ON DELETE SET NULL;
ALTER TABLE "store_products" ADD COLUMN IF NOT EXISTS "source_pig_tag" TEXT;

CREATE TABLE IF NOT EXISTS "store_orders" (
  "id" TEXT PRIMARY KEY,
  "order_number" TEXT UNIQUE NOT NULL,
  "customer_name" TEXT NOT NULL,
  "customer_email" TEXT,
  "customer_phone" TEXT,
  "shipping_address" TEXT,
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

CREATE TABLE IF NOT EXISTS "store_order_items" (
  "id" TEXT PRIMARY KEY,
  "order_id" TEXT NOT NULL REFERENCES "store_orders"("id") ON DELETE CASCADE,
  "product_id" TEXT REFERENCES "store_products"("id") ON DELETE SET NULL,
  "quantity" INTEGER NOT NULL,
  "price" NUMERIC(12, 2) NOT NULL
);

CREATE INDEX IF NOT EXISTS "store_products_pig_id_idx" ON "store_products"("pig_id");
CREATE INDEX IF NOT EXISTS "store_orders_order_number_idx" ON "store_orders"("order_number");
CREATE INDEX IF NOT EXISTS "store_orders_status_idx" ON "store_orders"("status");
CREATE INDEX IF NOT EXISTS "store_order_items_order_id_idx" ON "store_order_items"("order_id");
CREATE INDEX IF NOT EXISTS "store_order_items_product_id_idx" ON "store_order_items"("product_id");

-- ============================================================================
-- PHASE 7.2 — SUPABASE ROW-LEVEL SECURITY (RLS) POLICIES
-- Public ANON key can only read published catalog & public website content.
-- Service Role Key (used by Control Panel & API checkout) bypasses RLS safely.
-- ============================================================================

ALTER TABLE "store_products" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "store_orders" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "store_order_items" ENABLE ROW LEVEL SECURITY;

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
`;
