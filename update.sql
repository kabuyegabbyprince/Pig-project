-- ============================================================================
-- PIG PROJECT RWANDA — DATABASE UPDATE & MIGRATION SCRIPT (update.sql)
-- ============================================================================

-- 1. Role Enum Updates (Removed FIELD_OFFICER, verified cooperative hierarchy)
-- Note: PostgreSQL ENUM modifications or text casting
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'PROJECT_MANAGER';
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'COOPERATIVE_LEADER';
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'COOPERATIVE_MEMBER';
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'CELL_MANAGER';
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'VETERINARIAN';
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'ACCOUNTANT';
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'FINANCE_OFFICER';
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'TRAINER';
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'FUNDER';

-- 2. Gallery Storage Bucket / Table schema support
CREATE TABLE IF NOT EXISTS "gallery_items" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "image_url" TEXT NOT NULL,
    "category" TEXT,
    "location" TEXT,
    "photo_date" TIMESTAMP(3),
    "photographer" TEXT,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "is_published" BOOLEAN NOT NULL DEFAULT TRUE,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gallery_items_pkey" PRIMARY KEY ("id")
);

-- 3. Cooperative & Cell Management structures
-- Cell Managers manage akagari/cell operations, Veterinarians verify pig health clearances, 
-- Accountants verify transactions, Cooperative Leaders aggregate member reports.
CREATE INDEX IF NOT EXISTS "idx_gallery_published" ON "gallery_items"("is_published");
CREATE INDEX IF NOT EXISTS "idx_gallery_category" ON "gallery_items"("category");

-- 4. Website Content (Hero Section with updated asset)
CREATE TABLE IF NOT EXISTS "website_content" (
    "id" TEXT NOT NULL,
    "page" TEXT NOT NULL DEFAULT 'home',
    "section" TEXT NOT NULL DEFAULT 'hero',
    "title" TEXT,
    "description" TEXT,
    "primary_button_text" TEXT,
    "primary_button_link" TEXT,
    "secondary_button_text" TEXT,
    "secondary_button_link" TEXT,
    "image_url" TEXT,
    "image_alt" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "website_content_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "website_content_page_section_key" ON "website_content"("page", "section");
