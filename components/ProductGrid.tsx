"use client";

import { useState, useMemo } from "react";
import { SlidersHorizontal, Search, X } from "lucide-react";
import { FashionProduct, Gender, Occasion } from "@/types";
import FashionProductCard from "./FashionProductCard";
import clsx from "clsx";

const OCCASIONS: { label: string; value: Occasion }[] = [
  { label: "All",         value: "all" },
  { label: "☕ Casual",   value: "casual" },
  { label: "🎓 College",  value: "college" },
  { label: "🌙 Night Out", value: "night-out" },
  { label: "🏖️ Beach",   value: "beach" },
  { label: "💪 Active",  value: "active" },
  { label: "💼 Work",    value: "work" },
];

const GENDERS: { label: string; value: Gender }[] = [
  { label: "All",    value: "all" },
  { label: "Women",  value: "female" },
  { label: "Men",    value: "male" },
];

const CATEGORIES = [
  { label: "All",         value: "all" },
  { label: "👚 Tops",     value: "tops" },
  { label: "👖 Bottoms",  value: "bottoms" },
  { label: "👗 Dresses",  value: "dresses" },
  { label: "👟 Footwear", value: "footwear" },
  { label: "👜 Accessories", value: "accessories" },
];

// Maps friendly filter → actual category strings in the data
function matchesCategory(cat: string, productCat: string): boolean {
  const pc = productCat.toLowerCase();
  switch (cat) {
    case "tops":        return pc === "t-shirts" || pc === "tops";
    case "bottoms":     return pc === "bottoms" || pc === "skirts" || pc === "denims";
    case "dresses":     return pc === "dresses";
    case "footwear":    return pc === "footwear";
    case "accessories": return pc === "accessories";
    default:            return true;
  }
}

function ChipRow<T extends string>({
  items,
  active,
  onChange,
}: {
  items: { label: string; value: T }[];
  active: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
      {items.map(({ label, value }) => (
        <button
          key={value}
          onClick={() => onChange(value)}
          className={clsx(
            "flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-medium tracking-wide transition-all duration-200 border",
            active === value
              ? "bg-gray-900 text-white border-gray-900"
              : "border-gray-200 text-gray-500 hover:border-gray-400 hover:text-gray-800 bg-white"
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-[#f8f5f0] rounded-2xl overflow-hidden border border-gray-200 animate-pulse">
      <div className="aspect-[3/4] bg-gray-200" />
      <div className="p-4 space-y-3">
        <div className="h-2.5 w-20 bg-gray-300 rounded" />
        <div className="h-4 w-4/5 bg-gray-300 rounded" />
        <div className="h-3 w-1/2 bg-gray-300 rounded" />
        <div className="h-8 w-full bg-gray-300 rounded-xl" />
      </div>
    </div>
  );
}

interface Props {
  products: FashionProduct[];
  title?: string;
  subtitle?: string;
  showFilters?: boolean;
  loading?: boolean;
}

export default function ProductGrid({
  products,
  title = "Our Collection",
  subtitle,
  showFilters = true,
  loading = false,
}: Props) {
  const [occasion,    setOccasion]    = useState<Occasion>("all");
  const [gender,      setGender]      = useState<Gender>("all");
  const [category,    setCategory]    = useState("all");
  const [search,      setSearch]      = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const filtered = useMemo(() => {
    let list = products;
    if (category !== "all") list = list.filter((p) => matchesCategory(category, p.category));
    if (occasion !== "all") list = list.filter((p) => p.occasion === occasion);
    if (gender   !== "all") list = list.filter((p) => p.gender   === gender);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((p) =>
        [
          p.name, p.brand, p.category, p.fabric, p.occasion,
          p.description, p.fit,
          ...(p.tags ?? []),
          ...(p.color ?? []),
        ].join(" ").toLowerCase().includes(q)
      );
    }
    return list;
  }, [products, category, occasion, gender, search]);

  const hasFilters = category !== "all" || occasion !== "all" || gender !== "all" || search.trim();

  function clearFilters() {
    setCategory("all");
    setOccasion("all");
    setGender("all");
    setSearch("");
  }

  return (
    <section className="w-full">
      {/* Header */}
      {(title || subtitle) && (
        <div className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            {title    && <h2 className="font-display text-3xl sm:text-4xl font-bold text-gray-900">{title}</h2>}
            {subtitle && <p className="mt-2 text-sm text-gray-500">{subtitle}</p>}
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <span>{filtered.length} piece{filtered.length !== 1 ? "s" : ""}</span>
          </div>
        </div>
      )}

      {/* Filters */}
      {showFilters && (
        <div className="mb-6 space-y-3">
          {/* Quick category chips always visible */}
          <ChipRow items={CATEGORIES} active={category} onChange={setCategory} />
          <div className="flex items-center gap-3">
            <div className="flex-1 relative">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search products, brands, fabrics…"
                className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white border border-gray-200 text-sm text-gray-800 placeholder-gray-400 outline-none focus:border-gray-400 transition-colors duration-200"
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700">
                  <X size={14} />
                </button>
              )}
            </div>

            <button
              onClick={() => setFiltersOpen((o) => !o)}
              className={clsx(
                "flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all duration-200",
                filtersOpen || hasFilters
                  ? "border-gray-900 bg-gray-900 text-white"
                  : "border-gray-200 text-gray-500 hover:border-gray-400 hover:text-gray-800 bg-white"
              )}
            >
              <SlidersHorizontal size={14} />
              Filters
              {hasFilters && (
                <span className="w-4 h-4 rounded-full bg-white text-gray-900 text-[9px] font-bold flex items-center justify-center">
                  !
                </span>
              )}
            </button>
          </div>

          {filtersOpen && (
            <div className="bg-white border border-gray-200 rounded-2xl p-4 space-y-4 animate-slide-up shadow-sm">
              <div>
                <p className="text-[10px] text-gray-400 uppercase tracking-widest font-medium mb-2">Category</p>
                <ChipRow items={CATEGORIES} active={category} onChange={setCategory} />
              </div>
              <div>
                <p className="text-[10px] text-gray-400 uppercase tracking-widest font-medium mb-2">Occasion</p>
                <ChipRow items={OCCASIONS} active={occasion} onChange={setOccasion} />
              </div>
              <div>
                <p className="text-[10px] text-gray-400 uppercase tracking-widest font-medium mb-2">Gender</p>
                <ChipRow items={GENDERS} active={gender} onChange={setGender} />
              </div>
              {hasFilters && (
                <button onClick={clearFilters} className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-red-500 transition-colors duration-200">
                  <X size={11} /> Clear all filters
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
          {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
          <div className="w-16 h-16 rounded-2xl bg-gray-100 border border-gray-200 flex items-center justify-center">
            <Search size={24} className="text-gray-400" />
          </div>
          <div>
            <p className="text-gray-900 font-semibold text-lg">No products found</p>
            <p className="text-gray-500 text-sm mt-1">Try changing your filters or search term.</p>
          </div>
          <button onClick={clearFilters} className="px-6 py-2.5 rounded-full bg-gray-900 text-white text-sm font-semibold hover:bg-black transition-colors">
            Clear Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
          {filtered.map((product, i) => (
            <div key={product.id} className="animate-slide-up" style={{ animationDelay: `${Math.min(i * 0.04, 0.4)}s`, animationFillMode: "both" }}>
              <FashionProductCard product={product} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
