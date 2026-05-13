"use client";

import { useState, useMemo } from "react";
import { SlidersHorizontal, Search, X, Sparkles } from "lucide-react";
import { FashionProduct, Gender, Occasion } from "@/types";
import FashionProductCard from "./FashionProductCard";
import clsx from "clsx";

/* ── Filter chip helpers ────────────────────────────────────────── */
const OCCASIONS: { label: string; value: Occasion }[] = [
  { label: "All",       value: "all" },
  { label: "💍 Wedding",    value: "wedding" },
  { label: "🎉 Party",      value: "party" },
  { label: "☀️ Casual",     value: "casual" },
  { label: "💼 Office",     value: "office" },
  { label: "🎵 Festival",   value: "festival" },
  { label: "🌙 Date Night", value: "date night" },
  { label: "✈️ Vacation",   value: "vacation" },
];

const GENDERS: { label: string; value: Gender }[] = [
  { label: "All",    value: "all" },
  { label: "♀ Women", value: "female" },
  { label: "♂ Men",   value: "male" },
];

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
            "flex-shrink-0 px-3.5 py-2 rounded-full text-xs font-medium tracking-wide transition-all duration-300 border",
            active === value
              ? "bg-gold-gradient text-black border-transparent shadow-md shadow-gold-400/20"
              : "border-white/[0.08] text-zinc-400 hover:border-gold-400/30 hover:text-gold-400"
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

/* ── Skeleton card ──────────────────────────────────────────────── */
function SkeletonCard() {
  return (
    <div className="bg-[#111] rounded-2xl overflow-hidden border border-white/[0.05] animate-pulse">
      <div className="aspect-[3/4] bg-[#1a1a1a]" />
      <div className="p-4 space-y-3">
        <div className="h-2.5 w-20 bg-[#1f1f1f] rounded" />
        <div className="h-4 w-4/5 bg-[#1f1f1f] rounded" />
        <div className="h-3 w-1/2 bg-[#1f1f1f] rounded" />
        <div className="h-8 w-full bg-[#1f1f1f] rounded-xl" />
      </div>
    </div>
  );
}

/* ── Main grid ──────────────────────────────────────────────────── */
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
  const [occasion, setOccasion] = useState<Occasion>("all");
  const [gender,   setGender]   = useState<Gender>("all");
  const [search,   setSearch]   = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const filtered = useMemo(() => {
    let list = products;
    if (occasion !== "all")
      list = list.filter((p) => p.occasion === occasion);
    if (gender !== "all")
      list = list.filter((p) => p.gender === gender);
    if (search.trim())
      list = list.filter((p) =>
        [p.name, p.brand, p.category, p.fabric, p.occasion]
          .join(" ")
          .toLowerCase()
          .includes(search.toLowerCase())
      );
    return list;
  }, [products, occasion, gender, search]);

  const hasFilters = occasion !== "all" || gender !== "all" || search.trim();

  function clearFilters() {
    setOccasion("all");
    setGender("all");
    setSearch("");
  }

  return (
    <section className="w-full">
      {/* ── Section header ─────────────────────────────────────── */}
      {(title || subtitle) && (
        <div className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            {title && (
              <h2 className="font-display text-3xl sm:text-4xl font-bold text-white">
                {title}
              </h2>
            )}
            {subtitle && (
              <p className="mt-2 text-sm text-zinc-500">{subtitle}</p>
            )}
          </div>
          <div className="flex items-center gap-2 text-sm text-zinc-500">
            <Sparkles size={14} className="text-gold-400" />
            <span>{filtered.length} piece{filtered.length !== 1 ? "s" : ""}</span>
          </div>
        </div>
      )}

      {/* ── Filters ────────────────────────────────────────────── */}
      {showFilters && (
        <div className="mb-6 space-y-3">
          {/* Search + toggle */}
          <div className="flex items-center gap-3">
            <div className="flex-1 relative">
              <Search
                size={14}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-600"
              />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search products, brands, fabrics…"
                className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-[#141414] border border-white/[0.07] text-sm text-white placeholder-zinc-600 outline-none focus:border-gold-400/40 transition-colors duration-200"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-400"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <button
              onClick={() => setFiltersOpen((o) => !o)}
              className={clsx(
                "flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all duration-200",
                filtersOpen || hasFilters
                  ? "border-gold-400/50 bg-gold-400/10 text-gold-400"
                  : "border-white/[0.08] text-zinc-400 hover:border-white/20 hover:text-white"
              )}
            >
              <SlidersHorizontal size={14} />
              Filters
              {hasFilters && (
                <span className="w-4 h-4 rounded-full bg-gold-gradient text-[9px] font-bold text-black flex items-center justify-center">
                  !
                </span>
              )}
            </button>
          </div>

          {/* Expandable filter rows */}
          {filtersOpen && (
            <div className="bg-[#0f0f0f] border border-white/[0.06] rounded-2xl p-4 space-y-4 animate-slide-up">
              <div>
                <p className="text-[10px] text-zinc-600 uppercase tracking-widest font-medium mb-2">
                  Occasion
                </p>
                <ChipRow
                  items={OCCASIONS}
                  active={occasion}
                  onChange={setOccasion}
                />
              </div>
              <div>
                <p className="text-[10px] text-zinc-600 uppercase tracking-widest font-medium mb-2">
                  Gender
                </p>
                <ChipRow
                  items={GENDERS}
                  active={gender}
                  onChange={setGender}
                />
              </div>
              {hasFilters && (
                <button
                  onClick={clearFilters}
                  className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-red-400 transition-colors duration-200"
                >
                  <X size={11} /> Clear all filters
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Grid ───────────────────────────────────────────────── */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
          {Array.from({ length: 8 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#141414] border border-white/5 flex items-center justify-center">
            <Search size={24} className="text-zinc-700" />
          </div>
          <div>
            <p className="text-white font-semibold text-lg">No products found</p>
            <p className="text-zinc-600 text-sm mt-1">
              Try changing your filters or search term.
            </p>
          </div>
          <button
            onClick={clearFilters}
            className="px-6 py-2.5 rounded-full bg-gold-gradient text-black text-sm font-semibold"
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
          {filtered.map((product, i) => (
            <div
              key={product.id}
              className="animate-slide-up"
              style={{
                animationDelay: `${Math.min(i * 0.04, 0.4)}s`,
                animationFillMode: "both",
              }}
            >
              <FashionProductCard product={product} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
