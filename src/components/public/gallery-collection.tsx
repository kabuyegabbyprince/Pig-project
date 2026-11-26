"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, ImageIcon, Maximize2, X } from "lucide-react";

type GalleryItem = {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string;
  category: string | null;
  location: string | null;
  photoDate: Date | string | null;
  photographer: string | null;
};

function normalizeImageKey(url: string): string {
  const trimmed = url.trim();
  try {
    const parsed = new URL(trimmed);
    return `${parsed.origin}${decodeURIComponent(parsed.pathname)}`.toLowerCase();
  } catch {
    return decodeURIComponent(trimmed).toLowerCase();
  }
}

export default function GalleryCollection({
  items,
  categories,
}: {
  items: GalleryItem[];
  categories: string[];
}) {
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  const uniqueItems = useMemo(() => {
    const seen = new Set<string>();
    return items.filter((item) => {
      const url = item.imageUrl?.trim();
      if (!url) return false;
      const key = normalizeImageKey(url);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [items]);

  const visibleItems = useMemo(() => {
    if (selectedCategory === "All") return uniqueItems;
    return uniqueItems.filter((item) => item.category === selectedCategory);
  }, [uniqueItems, selectedCategory]);

  const selectedItem =
    selectedIndex !== null && visibleItems[selectedIndex]
      ? visibleItems[selectedIndex]
      : null;

  useEffect(() => {
    if (selectedIndex === null) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSelectedIndex(null);
      } else if (event.key === "ArrowRight") {
        setSelectedIndex((prev) =>
          prev === null || visibleItems.length === 0
            ? null
            : (prev + 1) % visibleItems.length
        );
      } else if (event.key === "ArrowLeft") {
        setSelectedIndex((prev) =>
          prev === null || visibleItems.length === 0
            ? null
            : (prev - 1 + visibleItems.length) % visibleItems.length
        );
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedIndex, visibleItems.length]);

  const formatDate = (photoDate: Date | string | null) => {
    if (!photoDate) return null;
    const date = new Date(photoDate);
    if (Number.isNaN(date.getTime())) return null;
    return date.toLocaleDateString("en-GB", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <>
      {categories.length > 0 && (
        <div className="mb-8 flex flex-wrap items-center gap-2">
          {["All", ...categories].map((category) => (
            <button
              key={category}
              type="button"
              onClick={() => {
                setSelectedCategory(category);
                setSelectedIndex(null);
              }}
              className={`whitespace-nowrap shrink-0 rounded-full px-4 py-2 text-xs sm:text-sm font-semibold transition-colors ${
                selectedCategory === category
                  ? "bg-[#101827] text-white shadow-xs"
                  : "border border-slate-200 bg-white text-slate-600 hover:border-[#FF8A00] hover:text-[#FF8A00]"
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      )}

      {visibleItems.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-10 text-center text-slate-500">
          No gallery photographs are available in this category right now.
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {visibleItems.map((item, idx) => {
            const formattedDate = formatDate(item.photoDate);
            const hasMetadata = Boolean(
              item.category || item.location || formattedDate || item.description
            );
            const isBroken = Boolean(failedImages[item.id]);

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedIndex(idx)}
                aria-label="View photograph"
                className="group overflow-hidden rounded-xl border border-slate-200/80 bg-white text-left shadow-xs transition-all hover:border-slate-300 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF8A00]"
              >
                <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-100">
                  {isBroken ? (
                    <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-slate-100 text-slate-400">
                      <ImageIcon className="h-8 w-8" />
                      <span className="text-xs font-medium text-slate-500">
                        Field photograph unavailable
                      </span>
                    </div>
                  ) : (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={item.imageUrl}
                        alt={item.title || "Pig Project Rwanda field photograph"}
                        loading="lazy"
                        referrerPolicy="no-referrer"
                        onError={() =>
                          setFailedImages((prev) => ({ ...prev, [item.id]: true }))
                        }
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#101827]/45 via-transparent to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
                      <span className="pointer-events-none absolute bottom-3 right-3 inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-[#101827] opacity-0 shadow-xs transition-opacity duration-200 group-hover:opacity-100">
                        <Maximize2 className="h-4 w-4" />
                      </span>
                    </>
                  )}
                </div>

                {hasMetadata && (
                  <div className="p-4 sm:p-5">
                    {(item.category || item.location || formattedDate) && (
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
                        {item.category && (
                          <span className="font-semibold text-[#FF8A00]">
                            {item.category}
                          </span>
                        )}
                        {item.category && (item.location || formattedDate) && (
                          <span aria-hidden="true">·</span>
                        )}
                        {item.location && <span>{item.location}</span>}
                        {item.location && formattedDate && (
                          <span aria-hidden="true">·</span>
                        )}
                        {formattedDate && <span>{formattedDate}</span>}
                      </div>
                    )}
                    {item.description && (
                      <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-slate-600">
                        {item.description}
                      </p>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}

      {selectedItem && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setSelectedIndex(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#101827]/85 p-4 backdrop-blur-xs"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-4xl overflow-hidden rounded-xl border border-slate-200/20 bg-white shadow-xl"
          >
            <button
              type="button"
              aria-label="Close photograph viewer"
              onClick={() => setSelectedIndex(null)}
              className="absolute right-3 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/95 text-[#101827] shadow-sm hover:bg-orange-50 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="relative flex max-h-[75vh] min-h-[260px] items-center justify-center bg-[#101827]">
              {failedImages[selectedItem.id] ? (
                <div className="flex h-64 w-full flex-col items-center justify-center gap-2 text-slate-400">
                  <ImageIcon className="h-10 w-10" />
                  <span className="text-xs font-medium">
                    Field photograph unavailable
                  </span>
                </div>
              ) : (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={selectedItem.imageUrl}
                  alt={selectedItem.title || "Pig Project Rwanda field photograph"}
                  referrerPolicy="no-referrer"
                  className="max-h-[75vh] w-full object-contain"
                />
              )}

              {visibleItems.length > 1 && (
                <>
                  <button
                    type="button"
                    aria-label="Previous photograph"
                    onClick={() =>
                      setSelectedIndex((prev) =>
                        prev === null
                          ? 0
                          : (prev - 1 + visibleItems.length) % visibleItems.length
                      )
                    }
                    className="absolute left-3 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-[#101827] shadow-sm hover:bg-white transition-colors"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    aria-label="Next photograph"
                    onClick={() =>
                      setSelectedIndex((prev) =>
                        prev === null ? 0 : (prev + 1) % visibleItems.length
                      )
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-[#101827] shadow-sm hover:bg-white transition-colors"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </>
              )}
            </div>

            {(selectedItem.category ||
              selectedItem.location ||
              selectedItem.photoDate ||
              selectedItem.photographer ||
              selectedItem.description) && (
              <div className="border-t border-slate-200 bg-white p-5 sm:p-6">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
                  {selectedItem.category && (
                    <span className="font-semibold text-[#FF8A00]">
                      {selectedItem.category}
                    </span>
                  )}
                  {selectedItem.location && (
                    <>
                      {selectedItem.category && <span aria-hidden="true">·</span>}
                      <span>{selectedItem.location}</span>
                    </>
                  )}
                  {formatDate(selectedItem.photoDate) && (
                    <>
                      {(selectedItem.category || selectedItem.location) && (
                        <span aria-hidden="true">·</span>
                      )}
                      <span>{formatDate(selectedItem.photoDate)}</span>
                    </>
                  )}
                  {selectedItem.photographer && (
                    <>
                      {(selectedItem.category ||
                        selectedItem.location ||
                        selectedItem.photoDate) && (
                        <span aria-hidden="true">·</span>
                      )}
                      <span>Source: {selectedItem.photographer}</span>
                    </>
                  )}
                </div>
                {selectedItem.description && (
                  <p className="mt-2.5 text-sm leading-relaxed text-slate-600">
                    {selectedItem.description}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
