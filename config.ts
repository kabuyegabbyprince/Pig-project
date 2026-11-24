/**
 * Central Application Configuration File
 * Change the constants below to update external URLs or platform defaults across the app.
 */

/** Public Gebyian Network E-Commerce website URL (editable constant) */
export const GEBYIAN_WEBSITE_URL = "https://gebyian-net.ai.studio";

export const APP_CONFIG = {
  /** Public Gebyian Network E-Commerce website URL */
  gebyianWebsiteUrl: GEBYIAN_WEBSITE_URL,
  /** Internal storefront route fallback */
  internalStoreRoute: "/store",
  /** Supabase Storage bucket for product photos uploaded from local PC */
  productImageBucket: "product-image",
  /** Default currency formatting */
  currency: "RWF",
  /** Default low-stock warning threshold */
  defaultLowStockThreshold: 3,
} as const;
