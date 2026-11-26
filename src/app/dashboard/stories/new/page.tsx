import { getCachedSession } from "@/lib/session";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save } from "lucide-react";
import { createGroundStory } from "@/app/actions/stories";
import { SubmitButton } from "@/components/ui/SubmitButton";

export const dynamic = "force-dynamic";

export default async function NewGroundStoryPage() {
  const session = await getCachedSession();

  if (!session || session.user.role !== "SUPER_ADMIN") {
    redirect("/dashboard");
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/stories" className="text-[#5d6e64] hover:text-[#1c2b23]">
          <ArrowLeft className="h-6 w-6" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold font-serif text-[#1c2b23]">
            Add Story from Ground
          </h1>
          <p className="mt-1 text-sm text-[#5d6e64]">
            Post a story with image, title, and comment to the public Stories from the ground section.
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-[#d9e1d8] bg-white p-6 shadow-sm">
        <form action={createGroundStory} className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="md:col-span-2">
              <label
                htmlFor="story-title"
                className="mb-1 block text-sm font-medium text-[#1c2b23]"
              >
                Title *
              </label>
              <input
                id="story-title"
                name="title"
                required
                className="w-full rounded-md border border-[#d9e1d8] p-2.5 focus:border-[#2c5a43] focus:ring-[#2c5a43]"
                placeholder="First Litter Born in Bugesera Cooperative"
              />
            </div>

            <div className="md:col-span-2">
              <label
                htmlFor="story-comment"
                className="mb-1 block text-sm font-medium text-[#1c2b23]"
              >
                Comment
              </label>
              <textarea
                id="story-comment"
                name="comment"
                rows={4}
                defaultValue="it works"
                className="w-full rounded-md border border-[#d9e1d8] p-2.5 focus:border-[#2c5a43] focus:ring-[#2c5a43]"
                placeholder="it works"
              />
              <p className="mt-1 text-xs text-[#5d6e64]">
                Default text is &ldquo;it works&rdquo;. You can keep or customize this comment.
              </p>
            </div>

            <div>
              <label
                htmlFor="story-order"
                className="mb-1 block text-sm font-medium text-[#1c2b23]"
              >
                Display Order
              </label>
              <input
                id="story-order"
                type="number"
                name="displayOrder"
                defaultValue={0}
                className="w-full rounded-md border border-[#d9e1d8] p-2.5 focus:border-[#2c5a43] focus:ring-[#2c5a43]"
              />
            </div>

            <div className="md:col-span-2">
              <label
                htmlFor="story-image"
                className="mb-1 block text-sm font-medium text-[#1c2b23]"
              >
                Image *
              </label>
              <input
                id="story-image"
                type="file"
                name="image"
                accept="image/jpeg,image/png,image/webp"
                required
                className="w-full rounded-md border border-[#d9e1d8] p-2.5 file:mr-3 file:rounded file:border-0 file:bg-[#e4ede6] file:px-3 file:py-2 file:text-sm file:font-medium file:text-[#2c5a43]"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              id="story-published"
              type="checkbox"
              name="isPublished"
              defaultChecked
              className="h-4 w-4"
            />
            <label htmlFor="story-published" className="text-sm text-[#1c2b23]">
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
              pendingText="Saving Story..."
              className="inline-flex items-center gap-2 rounded-md bg-[#2c5a43] px-4 py-2 text-sm font-medium text-white hover:bg-[#1c2b23] cursor-pointer"
            >
              <Save className="h-4 w-4" />
              Save Story
            </SubmitButton>
          </div>
        </form>
      </div>
    </div>
  );
}
