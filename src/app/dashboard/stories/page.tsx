import { prisma } from "@/lib/prisma";
import { getCachedSession } from "@/lib/session";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Pencil, Plus, Trash2 } from "lucide-react";
import {
  deleteGroundStory,
  toggleGroundStoryPublished,
} from "@/app/actions/stories";
import { STORY_FROM_GROUND_CATEGORY, resolveGalleryImageUrl } from "@/lib/gallery";
import { SubmitButton } from "@/components/ui/SubmitButton";

export const dynamic = "force-dynamic";

export default async function GroundStoriesManagementPage() {
  const session = await getCachedSession();

  if (!session || session.user.role !== "SUPER_ADMIN") {
    redirect("/dashboard");
  }

  const stories = await prisma.galleryItem.findMany({
    where: { category: STORY_FROM_GROUND_CATEGORY },
    orderBy: [{ displayOrder: "asc" }, { createdAt: "desc" }],
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-serif text-[#1c2b23]">
            Story from Ground
          </h1>
          <p className="mt-1 text-sm text-[#5d6e64]">
            Post field stories with image, title, and comment for the public homepage.
          </p>
        </div>
        <Link
          href="/dashboard/stories/new"
          className="inline-flex items-center gap-2 rounded-lg bg-[#2c5a43] px-4 py-2 text-sm font-medium text-white hover:bg-[#1c2b23]"
        >
          <Plus className="h-4 w-4" />
          Add Story
        </Link>
      </div>

      <div className="overflow-hidden rounded-xl border border-[#d9e1d8] bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-[#d9e1d8]">
            <thead className="bg-[#f2f5f0]">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-[#1c2b23]">
                  Story
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-[#1c2b23]">
                  Comment
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-[#1c2b23]">
                  Status
                </th>
                <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-[#1c2b23]">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#d9e1d8]">
              {stories.map((story) => {
                const imgSrc = resolveGalleryImageUrl(story.imageUrl) || story.imageUrl;
                const comment = story.description?.trim() || "it works";
                return (
                  <tr key={story.id} className="hover:bg-[#f2f5f0]">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={imgSrc}
                          alt={story.title}
                          className="h-12 w-12 rounded-md object-cover bg-slate-100"
                        />
                        <div>
                          <div className="text-sm font-semibold text-[#1c2b23]">
                            {story.title}
                          </div>
                          <div className="text-xs text-[#5d6e64]">
                            Order #{story.displayOrder}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm text-[#1c2b23] max-w-md">
                      {comment}
                    </td>
                    <td className="px-4 py-4">
                      <form action={toggleGroundStoryPublished.bind(null, story.id)}>
                        <SubmitButton
                          pendingText="Saving..."
                          className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-semibold cursor-pointer ${
                            story.isPublished
                              ? "bg-orange-50 text-[#FF8A00] border border-orange-200"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {story.isPublished ? (
                            <Eye className="h-3.5 w-3.5" />
                          ) : (
                            <EyeOff className="h-3.5 w-3.5" />
                          )}
                          {story.isPublished ? "Published" : "Draft"}
                        </SubmitButton>
                      </form>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/dashboard/stories/${story.id}/edit`}
                          className="inline-flex items-center gap-1 rounded-md border border-[#d9e1d8] bg-white px-2.5 py-1.5 text-xs font-medium text-[#1c2b23] hover:bg-[#f2f5f0]"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Edit
                        </Link>
                        <form action={deleteGroundStory.bind(null, story.id)}>
                          <SubmitButton
                            pendingText="Deleting..."
                            className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Delete
                          </SubmitButton>
                        </form>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {stories.length === 0 && (
          <div className="p-10 text-center text-sm text-[#5d6e64]">
            No ground stories have been posted yet.
          </div>
        )}
      </div>
    </div>
  );
}
