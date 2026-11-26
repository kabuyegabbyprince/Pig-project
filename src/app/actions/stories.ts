"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Role } from "@prisma/client";
import { getActiveUser } from "@/lib/active-user";
import { getCachedSession } from "@/lib/session";
import {
  STORY_FROM_GROUND_CATEGORY,
  deleteFromGalleryBucket,
  uploadToGalleryBucket,
} from "@/lib/gallery";
import { existsSync } from "node:fs";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { join } from "node:path";

const DEFAULT_STORY_COMMENT = "it works";

const fileIsAllowed = (file: File | null) => {
  if (!file || file.size === 0) return true;
  const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
  return allowedTypes.includes(file.type) && file.size <= 5 * 1024 * 1024;
};

const deleteLocalStoryImage = async (imageUrl: string | null | undefined) => {
  if (!imageUrl || !imageUrl.startsWith("/uploads/stories/")) return;
  const filePath = join(process.cwd(), "public", imageUrl);
  if (existsSync(filePath)) {
    await unlink(filePath).catch(() => undefined);
  }
};

const saveStoryImage = async (file: File | null, existingImageUrl?: string | null) => {
  if (!file || file.size === 0) {
    return existingImageUrl ?? null;
  }

  if (!fileIsAllowed(file)) {
    throw new Error("Only JPG, PNG, and WebP images up to 5 MB are allowed.");
  }

  let publicUrl: string;
  try {
    publicUrl = await uploadToGalleryBucket(file);
  } catch {
    const uploadDir = join(process.cwd(), "public", "uploads", "stories");
    await mkdir(uploadDir, { recursive: true });
    const extension = file.name.includes(".")
      ? file.name.split(".").pop()?.toLowerCase() || "jpg"
      : "jpg";
    const fileName = `${randomUUID()}.${extension}`;
    const filePath = join(uploadDir, fileName);
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filePath, buffer);
    publicUrl = `/uploads/stories/${fileName}`;
  }

  if (existingImageUrl && existingImageUrl !== publicUrl) {
    await deleteFromGalleryBucket(existingImageUrl).catch(() => undefined);
    await deleteLocalStoryImage(existingImageUrl);
  }

  return publicUrl;
};

const ensureAdminOnly = async () => {
  const session = await getCachedSession();
  if (!session?.user?.id) {
    redirect("/login");
  }
  const user = await getActiveUser([Role.SUPER_ADMIN]);
  if (!user) {
    redirect("/dashboard");
  }
  return user;
};

export async function createGroundStory(formData: FormData) {
  const user = await ensureAdminOnly();

  const title = String(formData.get("title") ?? "").trim();
  const commentRaw = String(formData.get("comment") ?? "").trim();
  const comment = commentRaw || DEFAULT_STORY_COMMENT;
  const displayOrder = Number(formData.get("displayOrder") ?? 0);
  const image = formData.get("image") as File | null;

  if (!title) throw new Error("Title is required.");
  if (!image || image.size === 0) throw new Error("A story image is required.");

  const imageUrl = await saveStoryImage(image);
  if (!imageUrl) {
    throw new Error("The story image could not be saved.");
  }

  const story = await prisma.galleryItem.create({
    data: {
      title,
      description: comment,
      imageUrl,
      category: STORY_FROM_GROUND_CATEGORY,
      displayOrder: Number.isFinite(displayOrder) ? displayOrder : 0,
      isPublished:
        formData.get("isPublished") === "on" ||
        formData.get("isPublished") === "true",
    },
  });

  await prisma.auditLog
    .create({
      data: {
        action: "CREATED",
        entity: "STORY_FROM_GROUND",
        entityId: story.id,
        user: { connect: { id: user.id } },
        newValue: {
          title: story.title,
          comment: story.description,
          imageUrl: story.imageUrl,
        },
      },
    })
    .catch((err) => console.error("Story audit log error:", err));

  revalidatePath("/");
  revalidatePath("/dashboard/stories");
  redirect("/dashboard/stories");
}

export async function updateGroundStory(id: string, formData: FormData) {
  const user = await ensureAdminOnly();
  const existing = await prisma.galleryItem.findUnique({ where: { id } });
  if (!existing || existing.category !== STORY_FROM_GROUND_CATEGORY) {
    throw new Error("Story not found.");
  }

  const title = String(formData.get("title") ?? "").trim();
  const commentRaw = String(formData.get("comment") ?? "").trim();
  const comment = commentRaw || DEFAULT_STORY_COMMENT;
  const displayOrder = Number(formData.get("displayOrder") ?? existing.displayOrder);
  const image = formData.get("image") as File | null;

  if (!title) throw new Error("Title is required.");

  const imageUrl = (await saveStoryImage(image, existing.imageUrl)) ?? existing.imageUrl;
  if (!imageUrl) {
    throw new Error("The story image could not be saved.");
  }

  const updated = await prisma.galleryItem.update({
    where: { id },
    data: {
      title,
      description: comment,
      imageUrl,
      displayOrder: Number.isFinite(displayOrder) ? displayOrder : existing.displayOrder,
      isPublished:
        formData.get("isPublished") === "on" ||
        formData.get("isPublished") === "true",
    },
  });

  await prisma.auditLog
    .create({
      data: {
        action: "UPDATED",
        entity: "STORY_FROM_GROUND",
        entityId: updated.id,
        user: { connect: { id: user.id } },
        newValue: {
          title: updated.title,
          comment: updated.description,
          imageUrl: updated.imageUrl,
        },
      },
    })
    .catch((err) => console.error("Story audit log error:", err));

  revalidatePath("/");
  revalidatePath("/dashboard/stories");
  redirect("/dashboard/stories");
}

export async function deleteGroundStory(id: string) {
  const user = await ensureAdminOnly();
  const story = await prisma.galleryItem.findUnique({ where: { id } });
  if (!story || story.category !== STORY_FROM_GROUND_CATEGORY) {
    redirect("/dashboard/stories");
  }

  await deleteFromGalleryBucket(story.imageUrl).catch(() => undefined);
  await deleteLocalStoryImage(story.imageUrl);
  await prisma.galleryItem.delete({ where: { id } });

  await prisma.auditLog
    .create({
      data: {
        action: "DELETED",
        entity: "STORY_FROM_GROUND",
        entityId: id,
        user: { connect: { id: user.id } },
        newValue: { title: story.title, deleted: true },
      },
    })
    .catch((err) => console.error("Story audit log error:", err));

  revalidatePath("/");
  revalidatePath("/dashboard/stories");
  redirect("/dashboard/stories");
}

export async function toggleGroundStoryPublished(id: string) {
  const user = await ensureAdminOnly();
  const story = await prisma.galleryItem.findUnique({ where: { id } });
  if (!story || story.category !== STORY_FROM_GROUND_CATEGORY) {
    return;
  }

  const updated = await prisma.galleryItem.update({
    where: { id },
    data: { isPublished: !story.isPublished },
  });

  await prisma.auditLog
    .create({
      data: {
        action: updated.isPublished ? "PUBLISHED" : "UNPUBLISHED",
        entity: "STORY_FROM_GROUND",
        entityId: story.id,
        user: { connect: { id: user.id } },
        newValue: { title: story.title, isPublished: updated.isPublished },
      },
    })
    .catch((err) => console.error("Story audit log error:", err));

  revalidatePath("/");
  revalidatePath("/dashboard/stories");
}
