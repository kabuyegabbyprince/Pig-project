import { prisma } from "@/lib/prisma";
import { getCachedSession } from "@/lib/session";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save } from "lucide-react";
import { updateGroundStory } from "@/app/actions/stories";
import { STORY_FROM_GROUND_CATEGORY, resolveGalleryImageUrl } from "@/lib/gallery";
import { SubmitButton } from "@/components/ui/SubmitButton";

export const dynamic = "force-dynamic";

export default async function EditGroundStoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getCachedSession();

  if (!session || session.user.role !== "SUPER_ADMIN") {
    redirect("/dashboard");
  }

  const { id } = await params;
  const story = await prisma.galleryItem.findUnique({ where: { id } });

  if (!story || story.category !== STORY_FROM_GROUND_CATEGORY) {
    redirect("/dashboard/stories");
  }

  const previewUrl = resolveGalleryImageUrl(story.imageUrl) || story.imageUrl;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/stories" className="text-[#5d6e64] hover:text-[#1c2b23]">
          <ArrowLeft className="h-6 w-6" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold font-serif text-[#1c2b23]">
            Edit Story from Ground
          </h1>
          <p className="mt-1 text-sm text-[#5d6e64]">
            Update story image, title, or comment.
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-[#d9e1d8] bg-white p-6 shadow-sm">
        <form action={updateGroundStory.bind(null, story.id)} className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="md:col-span-2">
              <label
                htmlFor="edit-story-title"
                className="mb-1 block text-sm font-medium text-[#1c2b23]"
              >
                Title *
              </label>
              <input
                id="edit-story-title"
                name="title"
                required
                defaultValue={story.title}
                className="w-full rounded-md border border-[#d9e1d8] p-2.5 focus:border-[#2c5a43] focus:ring-[#2c5a43]"
              />
            </div>

            <div className="md:col-span-2">
              <label
                htmlFor="edit-story-comment"
                className="mb-1 block text-sm font-medium text-[#1c2b23]"
              >
                Comment
              </label>
              <textarea
                id="edit-story-comment"
                name="comment"
                rows={4}
                defaultValue={story.description?.trim() || "it works"}
                className="w-full rounded-md border border-[#d9e1d8] p-2.5 focus:border-[#2c5a43] focus:ring-[#2c5a43]"
              />
            </div>

            <div>
              <label
                htmlFor="edit-story-order"
                className="mb-1 block text-sm font-medium text-[#1c2b23]"
              >
                Display Order
              </label>
              <input
                id="edit-story-order"
                type="number"
                name="displayOrder"
                defaultValue={story.displayOrder}
                className="w-full rounded-md border border-[#d9e1d8] p-2.5 focus:border-[#2c5a43] focus:ring-[#2c5a43]"
              />
            </div>

            <div className="md:col-span-2 space-y-2">
              <label
                htmlFor="edit-story-image"
                className="block text-sm font-medium text-[#1c2b23]"
              >
                Replace Image (Optional)
              </label>
              {previewUrl && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={previewUrl}
                  alt={story.title}
                  className="h-32 w-48 rounded-lg object-cover border border-[#d9e1d8]"
                />
              )}
              <input
                id="edit-story-image"
                type="file"
                name="image"
                accept="image/jpeg,image/png,image/webp"
                className="w-full rounded-md border border-[#d9e1d8] p-2.5 file:mr-3 file:rounded file:border-0 file:bg-[#e4ede6] file:px-3 file:py-2 file:text-sm file:font-medium file:text-[#2c5a43]"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              id="edit-story-published"
              type="checkbox"
              name="isPublished"
              defaultChecked={story.isPublished}
              className="h-4 w-4"
            />
            <label htmlFor="edit-story-published" className="text-sm text-[#1c2b23]">
              Publish publicly
            </label>
          </div>

          <div className="flex justify-end gap-3">
            <Link
              href="/dashboard/stories"
              className="rounded-md border border-[#d9e1d8] bg-white px-4 py-2 text-sm font-medium text-[#5d6e64] hover:bg-[#f2f5f0]"
            >
              Cancel
            </Link>
            <SubmitButton
              pendingText="Updating Story..."
              className="inline-flex items-center gap-2 rounded-md bg-[#2c5a43] px-4 py-2 text-sm font-medium text-white hover:bg-[#1c2b23] cursor-pointer"
            >
              <Save className="h-4 w-4" />
              Update Story
            </SubmitButton>
          </div>
        </form>
      </div>
    </div>
  );
}
