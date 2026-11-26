import { getPublishedGalleryItems } from "@/lib/gallery";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import GalleryCollection from "@/components/public/gallery-collection";
import PublicNavbar from "@/components/public/public-navbar";
import PublicFooter from "@/components/public/public-footer";
import type { GalleryItem } from "@prisma/client";

export const dynamic = "force-dynamic";

export default async function GalleryPage() {
  let items: GalleryItem[] = [];
  try {
    items = await getPublishedGalleryItems();
  } catch (error) {
    console.error("Failed to load gallery items:", error);
  }

  const categories = Array.from(
    new Set(
      items
        .map((item) => item.category?.trim())
        .filter((cat): cat is string => Boolean(cat))
    )
  );

  return (
    <div className="min-h-screen bg-white text-slate-900 antialiased">
      <PublicNavbar activePath="/gallery" />

      <section
        className="relative overflow-hidden bg-[#101827] pt-28 pb-14 sm:pt-32 sm:pb-16"
        style={{
          background:
            "linear-gradient(165deg, rgba(16,24,39,0.97) 0%, rgba(10,14,23,1) 100%)",
        }}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 right-0 h-72 w-72 rounded-full bg-[#FF8A00]/10 blur-3xl"
        />
        <div className="app-container relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#FF8A00]">
              Field Documentation
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-5xl text-balance">
              Project Field Gallery
            </h1>
            <p className="mt-4 text-sm leading-relaxed text-slate-300 sm:text-base">
              A visual narrative of rural families, livestock assets, veterinary follow-ups,
              and revolving community impact across Rwanda.
            </p>
            {items.length > 0 && (
              <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-medium text-slate-400">
                <span className="tabular-nums text-white">{items.length}</span>
                <span>{items.length === 1 ? "photograph" : "photographs"}</span>
                {categories.length > 0 && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="tabular-nums text-white">{categories.length}</span>
                    <span>{categories.length === 1 ? "category" : "categories"}</span>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      <main className="app-container mx-auto max-w-7xl px-4 py-12 sm:py-16 sm:px-6 lg:px-8">
        {items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-12 text-center text-slate-500">
            <p className="text-sm font-medium">
              Our gallery is currently being curated. Please check back shortly.
            </p>
          </div>
        ) : (
          <GalleryCollection
            items={items.map((item) => ({
              id: item.id,
              title: item.title,
              description: item.description,
              imageUrl: item.imageUrl,
              category: item.category,
              location: item.location,
              photoDate: item.photoDate,
              photographer: item.photographer,
            }))}
            categories={categories}
          />
        )}

        <div className="mt-12 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full bg-[#101827] px-6 py-3 text-xs sm:text-sm font-semibold text-white hover:bg-[#1f2937] transition-colors shadow-xs whitespace-nowrap"
          >
            <span>Back to Home</span>
            <ArrowRight className="h-3.5 w-3.5 text-[#FF8A00]" />
          </Link>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
