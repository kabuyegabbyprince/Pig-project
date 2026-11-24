-- ============================================================================
-- GEBYIAN NETWORK — BARGAINABLE PRICING & PRODUCT-IMAGE STORAGE BUCKET UPDATE
-- Idempotent SQL Migration Script — Run in Supabase SQL Editor
-- ============================================================================

-- 1. Add bargainable / negotiable price flag on store_products
ALTER TABLE "store_products"
  ADD COLUMN IF NOT EXISTS "is_negotiable" BOOLEAN NOT NULL DEFAULT false;

-- 2. Create & expose public "product-image" Supabase Storage bucket for local PC uploads
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

-- ============================================================================
-- CELL MANAGER -> COOPERATIVE MANAGER (MAX 15) -> COOPERATIVE MEMBER REPORTING
-- Idempotent SQL Migration Script — Run in Supabase SQL Editor
-- ============================================================================

-- 1. Cooperatives table (managed by Cell Manager, max 15 members including 1 manager)
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

-- 2. Link users to their cooperative and track initial static password reset flag
ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "cooperative_id" TEXT REFERENCES "cooperatives"("id") ON DELETE SET NULL;

ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "must_change_password" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS "users_cooperative_id_idx" ON "users"("cooperative_id");

-- 3. Link animals (Pig) to cooperative and individual cooperative member owner
ALTER TABLE "Pig"
  ADD COLUMN IF NOT EXISTS "cooperative_id" TEXT REFERENCES "cooperatives"("id") ON DELETE SET NULL;

ALTER TABLE "Pig"
  ADD COLUMN IF NOT EXISTS "owner_member_id" TEXT;

ALTER TABLE "Pig"
  ADD COLUMN IF NOT EXISTS "owner_member_name" TEXT;

CREATE INDEX IF NOT EXISTS "Pig_cooperative_id_idx" ON "Pig"("cooperative_id");
CREATE INDEX IF NOT EXISTS "Pig_owner_member_id_idx" ON "Pig"("owner_member_id");

-- 4. Cooperative Member -> Cooperative Manager Reports table
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

-- 5. Enforce max 15 active/non-deleted members (including Cooperative Manager) at database level
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

-- ============================================================================
-- FINANCE OFFICER STOCK-IN & MEMBER QUALIFICATION PAYMENTS (16K RWF + 2.8K TAX)
-- ============================================================================

ALTER TABLE "Pig"
  ADD COLUMN IF NOT EXISTS "pig_type" TEXT,
  ADD COLUMN IF NOT EXISTS "days_age" INTEGER,
  ADD COLUMN IF NOT EXISTS "stocked_by_finance_id" TEXT;

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
