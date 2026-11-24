import { randomUUID } from "node:crypto";
import { APP_CONFIG } from "@/lib/config";

const PRODUCT_IMAGE_BUCKET = APP_CONFIG.productImageBucket;
const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
]);

function getSupabaseStorageConfig() {
  const url = process.env.SUPABASE_URL?.trim().replace(/\/+$/, "");
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    process.env.SUPABASE_SECRET_KEY?.trim();
  if (!url || !key) return null;
  return { url, key };
}

export function getProductImagePublicUrl(supabaseUrl: string, objectPath: string): string {
  const cleanPath = objectPath.replace(/^\/+/, "");
  return `${supabaseUrl}/storage/v1/object/public/${PRODUCT_IMAGE_BUCKET}/${cleanPath}`;
}

export async function uploadToProductImageBucket(file: File): Promise<string> {
  if (!ALLOWED_IMAGE_TYPES.has(file.type) && !file.type.startsWith("image/")) {
    throw new Error("Only JPG, PNG, WebP, GIF, or AVIF product images are allowed.");
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new Error("Product image must be 5 MB or smaller.");
  }

  const config = getSupabaseStorageConfig();
  if (!config) {
    throw new Error("Supabase Storage configuration is missing.");
  }

  const extension = file.name.includes(".")
    ? file.name.split(".").pop()?.toLowerCase() || "jpg"
    : "jpg";
  const fileName = `${randomUUID()}.${extension}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  const contentType = file.type || "image/jpeg";

  const upload = async () =>
    fetch(
      `${config.url}/storage/v1/object/${PRODUCT_IMAGE_BUCKET}/${encodeURIComponent(fileName)}`,
      {
        method: "POST",
        headers: {
          apikey: config.key,
          Authorization: `Bearer ${config.key}`,
          "Content-Type": contentType,
          "x-upsert": "true",
        },
        body: buffer,
        signal: AbortSignal.timeout(15000),
      }
    );

  let res = await upload();
  if (res.status === 404) {
    await fetch(`${config.url}/storage/v1/bucket`, {
      method: "POST",
      headers: {
        apikey: config.key,
        Authorization: `Bearer ${config.key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: PRODUCT_IMAGE_BUCKET,
        name: PRODUCT_IMAGE_BUCKET,
        public: true,
      }),
      signal: AbortSignal.timeout(10000),
    });
    res = await upload();
  }

  if (!res.ok) {
    const msg = await res.text().catch(() => res.statusText);
    throw new Error(`Failed to upload image to product-image bucket: ${msg}`);
  }

  return getProductImagePublicUrl(config.url, fileName);
}
