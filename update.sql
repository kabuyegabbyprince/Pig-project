-- ============================================================================
-- GEBYIAN NETWORK & PIG PROJECT RWANDA — COMPLETE SUPABASE SQL SCHEMA UPDATE
-- Idempotent Migration Script — Safe to execute repeatedly in Supabase SQL Editor
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. ORDER STATUS ENUM
-- ----------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'PAID', 'PROCESSING', 'DISPATCHED', 'COMPLETED', 'CANCELLED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ----------------------------------------------------------------------------
-- 2. STORE PRODUCTS (Animals & Animal Food)
-- ----------------------------------------------------------------------------
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
  "pig_id" TEXT,
  "source_pig_tag" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Backward-compatible columns addition
ALTER TABLE "store_products" ADD COLUMN IF NOT EXISTS "is_negotiable" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "store_products" ADD COLUMN IF NOT EXISTS "discount_percent" NUMERIC(5, 2) NOT NULL DEFAULT 0;
ALTER TABLE "store_products" ADD COLUMN IF NOT EXISTS "discount_price" NUMERIC(12, 2);
ALTER TABLE "store_products" ADD COLUMN IF NOT EXISTS "discount_label" TEXT;
ALTER TABLE "store_products" ADD COLUMN IF NOT EXISTS "discount_starts_at" TIMESTAMP(3);
ALTER TABLE "store_products" ADD COLUMN IF NOT EXISTS "discount_ends_at" TIMESTAMP(3);
ALTER TABLE "store_products" ADD COLUMN IF NOT EXISTS "low_stock_threshold" INTEGER NOT NULL DEFAULT 3;
ALTER TABLE "store_products" ADD COLUMN IF NOT EXISTS "store_section" TEXT NOT NULL DEFAULT 'ANIMALS';
ALTER TABLE "store_products" ADD COLUMN IF NOT EXISTS "pig_id" TEXT;
ALTER TABLE "store_products" ADD COLUMN IF NOT EXISTS "source_pig_tag" TEXT;

CREATE INDEX IF NOT EXISTS "store_products_pig_id_idx" ON "store_products"("pig_id");
CREATE INDEX IF NOT EXISTS "store_products_section_idx" ON "store_products"("store_section");
CREATE INDEX IF NOT EXISTS "store_products_stock_idx" ON "store_products"("stock");

-- ----------------------------------------------------------------------------
-- 3. STORE ORDERS (Public Buyer Orders)
-- ----------------------------------------------------------------------------
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

CREATE INDEX IF NOT EXISTS "store_orders_order_number_idx" ON "store_orders"("order_number");
CREATE INDEX IF NOT EXISTS "store_orders_status_idx" ON "store_orders"("status");

-- ----------------------------------------------------------------------------
-- 4. STORE ORDER ITEMS
-- ----------------------------------------------------------------------------
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

CREATE INDEX IF NOT EXISTS "store_order_items_order_id_idx" ON "store_order_items"("order_id");
CREATE INDEX IF NOT EXISTS "store_order_items_product_id_idx" ON "store_order_items"("product_id");

-- ----------------------------------------------------------------------------
-- 5. COOPERATIVE ANIMAL STOCK REPORTS (Cell Manager Only)
-- ----------------------------------------------------------------------------
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
  "pig_id" TEXT,
  "source_pig_tag" TEXT,
  "notes" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "listed_product_id" TEXT REFERENCES "store_products"("id") ON DELETE SET NULL,
  "reviewed_by_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "coop_stock_reports_status_idx" ON "cooperative_stock_reports"("status");
CREATE INDEX IF NOT EXISTS "coop_stock_reports_cell_idx" ON "cooperative_stock_reports"("cell_name");

-- ----------------------------------------------------------------------------
-- 6. CELL FEED SALES (Animal Food Field Sales by Cell Manager)
-- ----------------------------------------------------------------------------
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

CREATE INDEX IF NOT EXISTS "cell_feed_sales_status_idx" ON "cell_feed_sales"("verification_status");
CREATE INDEX IF NOT EXISTS "cell_feed_sales_sold_by_idx" ON "cell_feed_sales"("sold_by_id");

-- ----------------------------------------------------------------------------
-- 7. SUPABASE STORAGE BUCKET: "product-image" (Local PC Photo Uploads)
-- ----------------------------------------------------------------------------
INSERT INTO storage.buckets ("id", "name", "public")
VALUES ('product-image', 'product-image', true)
ON CONFLICT ("id") DO UPDATE
  SET "public" = true;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Public read product-image bucket" ON storage.objects;
  CREATE POLICY "Public read product-image bucket"
    ON storage.objects FOR SELECT
    TO anon, authenticated
    USING (bucket_id = 'product-image');
EXCEPTION WHEN undefined_table THEN null;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Service manage product-image bucket" ON storage.objects;
  CREATE POLICY "Service manage product-image bucket"
    ON storage.objects FOR ALL
    TO service_role
    USING (bucket_id = 'product-image')
    WITH CHECK (bucket_id = 'product-image');
EXCEPTION WHEN undefined_table THEN null;
END $$;

-- ----------------------------------------------------------------------------
-- 8. COOPERATIVES (Max 15 Members including 1 Manager)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "cooperatives" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "code" TEXT,
  "cell_name" TEXT NOT NULL,
  "max_members" INTEGER NOT NULL DEFAULT 15 CHECK ("max_members" = 15),
  "leader_user_id" TEXT,
  "leader_name" TEXT,
  "created_by_id" TEXT NOT NULL,
  "created_by_name" TEXT,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "cooperatives_created_by_idx" ON "cooperatives"("created_by_id");
CREATE INDEX IF NOT EXISTS "cooperatives_leader_idx" ON "cooperatives"("leader_user_id");

-- Link users to cooperative and password change flag
ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "cooperative_id" TEXT REFERENCES "cooperatives"("id") ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS "must_change_password" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS "users_cooperative_id_idx" ON "users"("cooperative_id");

-- Link Pig to cooperative and member owner
ALTER TABLE "Pig"
  ADD COLUMN IF NOT EXISTS "cooperative_id" TEXT REFERENCES "cooperatives"("id") ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS "owner_member_id" TEXT,
  ADD COLUMN IF NOT EXISTS "owner_member_name" TEXT,
  ADD COLUMN IF NOT EXISTS "pig_type" TEXT,
  ADD COLUMN IF NOT EXISTS "days_age" INTEGER,
  ADD COLUMN IF NOT EXISTS "stocked_by_finance_id" TEXT;

CREATE INDEX IF NOT EXISTS "Pig_cooperative_id_idx" ON "Pig"("cooperative_id");
CREATE INDEX IF NOT EXISTS "Pig_owner_member_id_idx" ON "Pig"("owner_member_id");

-- Cooperative Member -> Cooperative Leader Reports
CREATE TABLE IF NOT EXISTS "cooperative_member_reports" (
  "id" TEXT PRIMARY KEY,
  "cooperative_id" TEXT NOT NULL REFERENCES "cooperatives"("id") ON DELETE CASCADE,
  "cooperative_name" TEXT NOT NULL,
  "member_id" TEXT NOT NULL,
  "member_name" TEXT NOT NULL,
  "leader_id" TEXT,
  "leader_name" TEXT,
  "pig_id" TEXT REFERENCES "Pig"("id") ON DELETE SET NULL,
  "pig_tag" TEXT,
  "report_type" TEXT NOT NULL DEFAULT 'ROUTINE_UPDATE',
  "animal_count" INTEGER NOT NULL DEFAULT 1,
  "estimated_weight_kg" NUMERIC(8,2),
  "summary" TEXT NOT NULL,
  "notes" TEXT,
  "status" TEXT NOT NULL DEFAULT 'SUBMITTED',
  "leader_notes" TEXT,
  "reviewed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "coop_member_reports_coop_idx" ON "cooperative_member_reports"("cooperative_id");
CREATE INDEX IF NOT EXISTS "coop_member_reports_member_idx" ON "cooperative_member_reports"("member_id");
CREATE INDEX IF NOT EXISTS "coop_member_reports_status_idx" ON "cooperative_member_reports"("status");

-- Enforce max 15 members per cooperative
CREATE OR REPLACE FUNCTION enforce_cooperative_max_15_members()
RETURNS TRIGGER AS $$
DECLARE
  member_count INTEGER;
BEGIN
  IF NEW.cooperative_id IS NOT NULL AND UPPER(COALESCE(NEW.status, 'ACTIVE')) <> 'DELETED' THEN
    SELECT COUNT(*)
      INTO member_count
      FROM "users"
     WHERE cooperative_id = NEW.cooperative_id
       AND UPPER(COALESCE(status, 'ACTIVE')) <> 'DELETED'
       AND (TG_OP = 'INSERT' OR id <> NEW.id);

    IF member_count >= 15 THEN
      RAISE EXCEPTION 'Cooperative capacity limit reached: maximum 15 members (including Cooperative Manager) allowed.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_enforce_cooperative_max_15 ON "users";
CREATE TRIGGER trg_enforce_cooperative_max_15
  BEFORE INSERT OR UPDATE OF cooperative_id, status ON "users"
  FOR EACH ROW
  EXECUTE FUNCTION enforce_cooperative_max_15_members();

-- ----------------------------------------------------------------------------
-- 9. COOPERATIVE MEMBER QUALIFICATION PAYMENTS (16K RWF + 2.8K TAX = 18.8K RWF)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "cooperative_member_payments" (
  "id" TEXT PRIMARY KEY,
  "member_id" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "cooperative_id" TEXT NOT NULL REFERENCES "cooperatives"("id") ON DELETE CASCADE,
  "pig_value_fee" NUMERIC(10,2) NOT NULL DEFAULT 16000.00,
  "tax_fee" NUMERIC(10,2) NOT NULL DEFAULT 2800.00,
  "total_amount" NUMERIC(10,2) NOT NULL DEFAULT 18800.00,
  "momo_reference" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'VERIFIED',
  "verified_by_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "coop_member_payments_member_idx" ON "cooperative_member_payments"("member_id");
CREATE INDEX IF NOT EXISTS "coop_member_payments_coop_idx" ON "cooperative_member_payments"("cooperative_id");

-- ----------------------------------------------------------------------------
-- 10. ROW LEVEL SECURITY (RLS) FOR PUBLIC ACCESS
-- ----------------------------------------------------------------------------
ALTER TABLE "store_products" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "store_orders" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "store_order_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "cooperative_stock_reports" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "cell_feed_sales" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "cooperative_member_payments" ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Public read available store products" ON "store_products";
  CREATE POLICY "Public read available store products"
    ON "store_products" FOR SELECT
    TO anon, authenticated
    USING ("isAvailable" = true);
EXCEPTION WHEN undefined_table THEN null;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Service role full access on store_products" ON "store_products";
  CREATE POLICY "Service role full access on store_products"
    ON "store_products" FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
EXCEPTION WHEN undefined_table THEN null;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Service role full access on store_orders" ON "store_orders";
  CREATE POLICY "Service role full access on store_orders"
    ON "store_orders" FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
EXCEPTION WHEN undefined_table THEN null;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Service role full access on store_order_items" ON "store_order_items";
  CREATE POLICY "Service role full access on store_order_items"
    ON "store_order_items" FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
EXCEPTION WHEN undefined_table THEN null;
END $$;
