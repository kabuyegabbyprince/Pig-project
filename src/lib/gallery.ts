import type { GalleryItem } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { unlink } from "node:fs/promises";
import { join } from "node:path";
import { prisma } from "@/lib/prisma";

const GALLERY_BUCKET = "gallery";
export const STORY_FROM_GROUND_CATEGORY = "STORY_FROM_GROUND";

function getSupabaseStorageConfig() {
  const url = process.env.SUPABASE_URL?.trim().replace(/\/+$/, "");
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    process.env.SUPABASE_SECRET_KEY?.trim();
  if (!url || !key) return null;
  return { url, key };
}

function getBucketPublicUrl(supabaseUrl: string, objectPath: string): string {
  const cleanPath = objectPath.replace(/^\/+/, "");
  return `${supabaseUrl}/storage/v1/object/public/${GALLERY_BUCKET}/${cleanPath}`;
}

function extractBucketObjectPath(imageUrl: string): string | null {
  const marker = `/storage/v1/object/public/${GALLERY_BUCKET}/`;
  const idx = imageUrl.indexOf(marker);
  if (idx === -1) return null;
  return decodeURIComponent(imageUrl.slice(idx + marker.length));
}

export function resolveGalleryImageUrl(imageUrl: string | null | undefined): string | null {
  if (!imageUrl) return null;
  const trimmed = imageUrl.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }

  if (trimmed.startsWith("/uploads/gallery/")) {
    const localPath = join(process.cwd(), "public", trimmed);
    return existsSync(localPath) ? trimmed : null;
  }

  if (trimmed.startsWith("/")) {
    const localPath = join(process.cwd(), "public", trimmed);
    return existsSync(localPath) ? trimmed : null;
  }

  const config = getSupabaseStorageConfig();
  if (!config) return null;

  const objectPath = trimmed.startsWith(`${GALLERY_BUCKET}/`)
    ? trimmed.slice(GALLERY_BUCKET.length + 1)
    : trimmed;

  return getBucketPublicUrl(config.url, objectPath);
}

export async function uploadToGalleryBucket(file: File): Promise<string> {
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
    fetch(`${config.url}/storage/v1/object/${GALLERY_BUCKET}/${encodeURIComponent(fileName)}`, {
      method: "POST",
      headers: {
        apikey: config.key,
        Authorization: `Bearer ${config.key}`,
        "Content-Type": contentType,
        "x-upsert": "true",
      },
      body: buffer,
      signal: AbortSignal.timeout(15000),
    });

  let res = await upload();
  if (res.status === 404) {
    await fetch(`${config.url}/storage/v1/bucket`, {
      method: "POST",
      headers: {
        apikey: config.key,
        Authorization: `Bearer ${config.key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ id: GALLERY_BUCKET, name: GALLERY_BUCKET, public: true }),
      signal: AbortSignal.timeout(10000),
    });
    res = await upload();
  }

  if (!res.ok) {
    const msg = await res.text().catch(() => res.statusText);
    throw new Error(`Failed to upload image to gallery bucket: ${msg}`);
  }

  return getBucketPublicUrl(config.url, fileName);
}

export async function deleteFromGalleryBucket(imageUrl: string | null | undefined): Promise<void> {
  if (!imageUrl) return;

  if (imageUrl.startsWith("/uploads/gallery/")) {
    const filePath = join(process.cwd(), "public", imageUrl);
    if (existsSync(filePath)) {
      await unlink(filePath);
    }
    return;
  }

  const objectPath = extractBucketObjectPath(imageUrl);
  if (!objectPath) return;

  const config = getSupabaseStorageConfig();
  if (!config) return;

  await fetch(`${config.url}/storage/v1/object/${GALLERY_BUCKET}/${encodeURIComponent(objectPath)}`, {
    method: "DELETE",
    headers: {
      apikey: config.key,
      Authorization: `Bearer ${config.key}`,
    },
    signal: AbortSignal.timeout(10000),
  }).catch(() => undefined);
}

function normalizeImageUrlKey(url: string): string {
  const trimmed = url.trim();
  try {
    const parsed = new URL(trimmed);
    return `${parsed.origin}${decodeURIComponent(parsed.pathname)}`.toLowerCase();
  } catch {
    return decodeURIComponent(trimmed).toLowerCase();
  }
}

export async function getPublishedGalleryItems(limit?: number): Promise<GalleryItem[]> {
  const dbItems = await prisma.galleryItem
    .findMany({
      where: { isPublished: true },
      orderBy: [{ displayOrder: "asc" }, { createdAt: "desc" }],
    })
    .catch(() => [] as GalleryItem[]);

  const resolvedDbItems: GalleryItem[] = [];
  const seenUrls = new Set<string>();

  for (const item of dbItems) {
    if (item.category === STORY_FROM_GROUND_CATEGORY) continue;
    const resolvedUrl = resolveGalleryImageUrl(item.imageUrl);
    if (!resolvedUrl) continue;

    const urlKey = normalizeImageUrlKey(resolvedUrl);
    if (seenUrls.has(urlKey)) continue;
    seenUrls.add(urlKey);

    resolvedDbItems.push({ ...item, imageUrl: resolvedUrl });
  }

  return typeof limit === "number" ? resolvedDbItems.slice(0, limit) : resolvedDbItems;
}

export async function getPublishedGroundStories(limit?: number): Promise<GalleryItem[]> {
  const dbStories = await prisma.galleryItem
    .findMany({
      where: {
        isPublished: true,
        category: STORY_FROM_GROUND_CATEGORY,
      },
      orderBy: [{ displayOrder: "asc" }, { createdAt: "desc" }],
    })
    .catch(() => [] as GalleryItem[]);

  const resolved: GalleryItem[] = [];
  const seenUrls = new Set<string>();

  for (const item of dbStories) {
    const resolvedUrl = resolveGalleryImageUrl(item.imageUrl);
    if (!resolvedUrl) continue;

    const urlKey = normalizeImageUrlKey(resolvedUrl);
    if (seenUrls.has(urlKey)) continue;
    seenUrls.add(urlKey);

    resolved.push({
      ...item,
      imageUrl: resolvedUrl,
      description: item.description?.trim() ? item.description.trim() : "it works",
    });
  }

  return typeof limit === "number" ? resolved.slice(0, limit) : resolved;
}
