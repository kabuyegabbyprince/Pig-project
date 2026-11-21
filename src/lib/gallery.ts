import type { GalleryItem } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { unlink } from "node:fs/promises";
import { join } from "node:path";
import { prisma } from "@/lib/prisma";

const GALLERY_BUCKET = "gallery";
const IMAGE_EXTENSION_RE = /\.(jpe?g|png|webp|gif|avif)$/i;

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

function formatBucketObjectTitle(name: string): string {
  const base = name.split("/").pop() || name;
  const withoutExt = base.replace(/\.[^.]+$/, "");
  const withoutUuidPrefix = withoutExt.replace(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}[-_]?/i,
    ""
  );
  const cleaned = (withoutUuidPrefix || withoutExt).replace(/[-_]+/g, " ").trim();
  if (!cleaned) return "Field Documentation";
  return cleaned.replace(/\b\w/g, (c) => c.toUpperCase());
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

type StorageObjectEntry = {
  id?: string | null;
  name?: string;
  created_at?: string;
  updated_at?: string;
  metadata?: {
    mimetype?: string;
  } | null;
};

async function listGalleryBucketObjects(): Promise<GalleryItem[]> {
  const config = getSupabaseStorageConfig();
  if (!config) return [];

  try {
    const res = await fetch(`${config.url}/storage/v1/object/list/${GALLERY_BUCKET}`, {
      method: "POST",
      headers: {
        apikey: config.key,
        Authorization: `Bearer ${config.key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prefix: "",
        limit: 100,
        offset: 0,
        sortBy: { column: "created_at", order: "desc" },
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) return [];
    const data = (await res.json()) as unknown;
    if (!Array.isArray(data)) return [];

    return (data as StorageObjectEntry[])
      .filter((entry) => {
        if (!entry.id || !entry.name || entry.name === ".emptyFolderPlaceholder") return false;
        const mime = entry.metadata?.mimetype ?? "";
        return mime.startsWith("image/") || IMAGE_EXTENSION_RE.test(entry.name);
      })
      .map((entry, idx) => {
        const name = entry.name as string;
        const createdAt = entry.created_at ? new Date(entry.created_at) : new Date();
        const updatedAt = entry.updated_at ? new Date(entry.updated_at) : createdAt;
        return {
          id: `bucket-${entry.id || idx}`,
          title: formatBucketObjectTitle(name),
          description: null,
          imageUrl: getBucketPublicUrl(config.url, name),
          category: "Field Gallery",
          location: null,
          photoDate: createdAt,
          photographer: null,
          displayOrder: idx,
          isPublished: true,
          createdAt,
          updatedAt,
        };
      });
  } catch {
    return [];
  }
}

export async function getPublishedGalleryItems(limit?: number): Promise<GalleryItem[]> {
  const [dbItems, bucketItems] = await Promise.all([
    prisma.galleryItem
      .findMany({
        where: { isPublished: true },
        orderBy: [{ displayOrder: "asc" }, { createdAt: "desc" }],
      })
      .catch(() => [] as GalleryItem[]),
    listGalleryBucketObjects(),
  ]);

  const resolvedDbItems: GalleryItem[] = [];
  const seenUrls = new Set<string>();

  for (const item of dbItems) {
    const resolvedUrl = resolveGalleryImageUrl(item.imageUrl);
    if (!resolvedUrl) continue;
    seenUrls.add(resolvedUrl);
    resolvedDbItems.push({ ...item, imageUrl: resolvedUrl });
  }

  const merged = [...resolvedDbItems];
  for (const bucketItem of bucketItems) {
    if (!seenUrls.has(bucketItem.imageUrl)) {
      seenUrls.add(bucketItem.imageUrl);
      merged.push(bucketItem);
    }
  }

  return typeof limit === "number" ? merged.slice(0, limit) : merged;
}
