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
