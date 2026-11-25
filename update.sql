-- ============================================================================
-- PIG PROJECT RWANDA — PRODUCTION SCHEMA & CLEANUP MIGRATION (Idempotent)
-- Adds user profile address columns on public.users and cleans non-user data
-- ============================================================================

-- 1. Add profile & Cell Manager duty address columns to public.users
ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "district_name" TEXT,
  ADD COLUMN IF NOT EXISTS "sector_name" TEXT,
  ADD COLUMN IF NOT EXISTS "cell_name" TEXT,
  ADD COLUMN IF NOT EXISTS "village_name" TEXT,
  ADD COLUMN IF NOT EXISTS "address" TEXT;

-- 2. Production database reset (keeps ONLY active staff accounts in public.users)
BEGIN;

-- Clear cooperative links on remaining users
UPDATE "users" SET "cooperative_id" = NULL WHERE "cooperative_id" IS NOT NULL;

-- Remove specified non-staff / legacy user rows
DELETE FROM "users"
WHERE LOWER("email") IN (
  'coleader@gmail.com',
  'comember@gmail.com',
  'funder@gmail.com',
  'trainer@gmail.com'
);

-- Delete operational, e-commerce, finance, audit, CMS & partial geography rows (child -> parent)
DELETE FROM "store_order_items";
DELETE FROM "store_orders";
DELETE FROM "cell_feed_sales";
DELETE FROM "cooperative_stock_reports";
DELETE FROM "store_products";

DELETE FROM "cooperative_member_payments";
DELETE FROM "cooperative_member_reports";

DELETE FROM "PigTransfer";
DELETE FROM "PigReturn";
DELETE FROM "PigDistribution";
DELETE FROM "RevolvingCycle";
DELETE FROM "Repayment";
DELETE FROM "Redistribution";
DELETE FROM "Piglet";
DELETE FROM "Litter";
DELETE FROM "VeterinaryExamination";
DELETE FROM "Vaccination";
DELETE FROM "Treatment";
DELETE FROM "MortalityRecord";
DELETE FROM "VeterinaryVisit";
DELETE FROM "VeterinaryRecord";
DELETE FROM "FieldVisit";
DELETE FROM "Task";
DELETE FROM "Pig";
DELETE FROM "Beneficiary";
DELETE FROM "cooperatives";

DELETE FROM "FinanceTransaction";
DELETE FROM "EmployeeReport";
DELETE FROM "Document";
DELETE FROM "Comment";
DELETE FROM "OTP";
DELETE FROM "AuditLog";
DELETE FROM "Notification";

DELETE FROM "gallery_items";
DELETE FROM "team_members";
DELETE FROM "website_content";

DELETE FROM "UserLocationAccess";
DELETE FROM "Village";
DELETE FROM "Cell";
DELETE FROM "Sector";
DELETE FROM "District";

DELETE FROM "SystemSetting";

COMMIT;

-- 3. Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
