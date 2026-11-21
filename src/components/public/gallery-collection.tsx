"use client";

import { useMemo, useState } from "react";
import { ArrowRight, X } from "lucide-react";

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

export default function GalleryCollection({ items, categories }: { items: GalleryItem[]; categories: string[] }) {
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedItem, setSelectedItem] = useState<GalleryItem | null>(null);

  const visibleItems = useMemo(() => {
    if (selectedCategory === "All") return items;
    return items.filter((item) => item.category === selectedCategory);
  }, [items, selectedCategory]);

  return (
    <>
      <div className="mb-8 flex flex-wrap gap-3">
        {[
          "All",
          ...categories,
        ].map((category) => (
          <button
            key={category}
            type="button"
            onClick={() => setSelectedCategory(category)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
              selectedCategory === category
                ? "bg-[#101827] text-white"
                : "bg-white text-slate-600 border border-slate-200 hover:border-[#FF8A00] hover:text-[#FF8A00]"
            }`}
          >
            {category}
          </button>
        ))}
      </div>

      {visibleItems.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-center text-slate-500 sm:p-12">
          No gallery items are available in this category right now.
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {visibleItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setSelectedItem(item)}
              className="group overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-sm transition hover:-translate-y-1 hover:shadow-md"
            >
              <div className="relative h-72 overflow-hidden bg-slate-100">
                <img src={item.imageUrl} alt={item.title} loading="lazy" className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 group-hover:opacity-100 transition" />
              </div>
              <div className="p-5">
                <div className="mb-2 inline-flex rounded-full bg-orange-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#FF8A00]">
                  {item.category || "Other"}
                </div>
                <h3 className="text-xl font-bold text-[#101827]">{item.title}</h3>
                {item.description && <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>}
                <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
                  <span>{item.location || "Rwanda"}</span>
                  <span>{item.photoDate ? new Date(item.photoDate).toLocaleDateString("en-GB", { year: "numeric", month: "short", day: "numeric" }) : "Recent"}</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
          <div className="relative max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-2xl bg-white">
            <button type="button" onClick={() => setSelectedItem(null)} className="absolute right-4 top-4 z-10 rounded-full bg-white/90 p-2 text-[#101827] shadow-sm">
              <X className="h-5 w-5" />
            </button>
            <div className="max-h-[70vh] overflow-hidden bg-slate-100">
              <img src={selectedItem.imageUrl} alt={selectedItem.title} className="h-full w-full object-cover" />
            </div>
            <div className="p-6">
              <div className="mb-3 inline-flex rounded-full bg-orange-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#FF8A00]">
                {selectedItem.category || "Other"}
              </div>
              <h3 className="text-2xl font-bold text-[#101827]">{selectedItem.title}</h3>
              {selectedItem.description && <p className="mt-3 text-sm leading-7 text-slate-600">{selectedItem.description}</p>}
              <div className="mt-4 flex flex-wrap gap-4 text-sm text-slate-500">
                {selectedItem.location && <span>Location: {selectedItem.location}</span>}
                {selectedItem.photoDate && <span>Date: {new Date(selectedItem.photoDate).toLocaleDateString("en-GB", { year: "numeric", month: "short", day: "numeric" })}</span>}
                {selectedItem.photographer && <span>Source: {selectedItem.photographer}</span>}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
