"use client";

import { useState } from "react";
import Image from "next/image";
import { ShoppingBag, Heart, Star, Sparkles, Tag } from "lucide-react";
import { FashionProduct } from "@/types";
import { useCart } from "@/context/CartContext";
import clsx from "clsx";

/* ── Colour swatch map ──────────────────────────────────────────── */
const COLOR_MAP: Record<string, string> = {
  red:         "#dc2626",
  gold:        "#d4a840",
  maroon:      "#7f1d1d",
  navy:        "#1e3a5f",
  teal:        "#0d9488",
  cream:       "#fef3c7",
  ivory:       "#fffff0",
  white:       "#e8e8e8",
  black:       "#1a1a1a",
  blue:        "#1d4ed8",
  green:       "#16a34a",
  pink:        "#db2777",
  purple:      "#7c3aed",
  orange:      "#ea580c",
  yellow:      "#ca8a04",
  grey:        "#6b7280",
  silver:      "#a8a8a8",
  beige:       "#d2b48c",
  coral:       "#f87171",
  turquoise:   "#14b8a6",
  burgundy:    "#800020",
  olive:       "#556b2f",
  khaki:       "#c3b091",
  "rose gold":   "#b76e79",
  "royal blue":  "#2563eb",
  "sky blue":    "#38bdf8",
  "blush pink":  "#fbcfe8",
  "sage green":  "#86a98a",
  charcoal:    "#374151",
  multicolor:  "linear-gradient(135deg,#ef4444,#f59e0b,#22c55e,#3b82f6,#8b5cf6)",
};

function colorStyle(c: string): React.CSSProperties {
  const mapped = COLOR_MAP[c.toLowerCase()] ?? "#888";
  return mapped.startsWith("linear")
    ? { background: mapped }
    : { backgroundColor: mapped };
}

/* ── Star rating ────────────────────────────────────────────────── */
function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          size={11}
          className={
            n <= Math.round(rating)
              ? "fill-gold-400 text-gold-400"
              : "fill-transparent text-zinc-700"
          }
        />
      ))}
    </div>
  );
}

/* ── Occasion badge colour ──────────────────────────────────────── */
const OCCASION_STYLE: Record<string, string> = {
  wedding:    "bg-rose-500/15 text-rose-300 border-rose-500/20",
  party:      "bg-purple-500/15 text-purple-300 border-purple-500/20",
  casual:     "bg-sky-500/15 text-sky-300 border-sky-500/20",
  office:     "bg-slate-500/15 text-slate-300 border-slate-500/20",
  festival:   "bg-amber-500/15 text-amber-300 border-amber-500/20",
  "date night": "bg-pink-500/15 text-pink-300 border-pink-500/20",
  vacation:   "bg-teal-500/15 text-teal-300 border-teal-500/20",
};

/* ── Price formatter (₹ with Indian comma style) ────────────────── */
function fmt(n: number) {
  return "₹" + n.toLocaleString("en-IN");
}

/* ── Main component ─────────────────────────────────────────────── */
interface Props {
  product: FashionProduct;
}

export default function FashionProductCard({ product }: Props) {
  const { addItem, isInCart } = useCart();
  const [wished, setWished]   = useState(false);
  const [added, setAdded]     = useState(false);
  const [selSize, setSelSize] = useState(product.size[0] ?? "M");

  const inCart      = isInCart(product.id);
  const discount    = product.originalPrice
    ? Math.round((1 - product.price / product.originalPrice) * 100)
    : 0;
  const occStyle    = OCCASION_STYLE[product.occasion] ?? "bg-zinc-800 text-zinc-300 border-zinc-700";
  const shownSizes  = product.size.slice(0, 4);
  const extraSizes  = product.size.length - 4;

  function handleCart() {
    addItem(product, selSize);
    setAdded(true);
    setTimeout(() => setAdded(false), 1600);
  }

  return (
    <article className="group relative flex flex-col bg-[#111111] rounded-2xl overflow-hidden border border-white/[0.06] transition-all duration-500 hover:-translate-y-2 hover:border-gold-400/30 hover:shadow-[0_16px_48px_rgba(196,149,58,0.14)]">

      {/* ── Image ──────────────────────────────────────────────── */}
      <div className="relative aspect-[3/4] overflow-hidden bg-[#0d0d0d]">
        <Image
          src={product.image}
          alt={product.name}
          fill
          className="object-cover transition-transform duration-700 group-hover:scale-[1.07]"
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
        />

        {/* gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-400" />

        {/* top-left badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10">
          {product.isNew && (
            <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-gold-gradient text-[9px] font-bold tracking-widest uppercase text-black shadow-lg">
              <Sparkles size={8} /> New
            </span>
          )}
          {product.isSale && discount > 0 && (
            <span className="px-2.5 py-1 rounded-full bg-red-600 text-[9px] font-bold tracking-widest uppercase text-white">
              -{discount}%
            </span>
          )}
        </div>

        {/* Wishlist */}
        <button
          onClick={() => setWished((w) => !w)}
          aria-label="Wishlist"
          className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-black/70 hover:scale-110"
        >
          <Heart
            size={14}
            className={wished ? "fill-red-400 text-red-400" : "text-white"}
          />
        </button>

        {/* Gender pill - bottom of image */}
        <div className="absolute bottom-3 left-3 z-10 translate-y-2 opacity-0 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
          <span className="px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-sm text-[9px] font-semibold tracking-widest text-zinc-300 uppercase">
            {product.gender === "male" ? "♂ Men" : "♀ Women"}
          </span>
        </div>
      </div>

      {/* ── Card body ──────────────────────────────────────────── */}
      <div className="flex flex-col flex-1 p-4 gap-2.5">

        {/* Brand */}
        <p className="text-[10px] font-semibold text-gold-400 tracking-[0.18em] uppercase truncate">
          {product.brand}
        </p>

        {/* Name */}
        <h3 className="font-display text-white text-sm sm:text-base font-semibold leading-snug line-clamp-2 -mt-1">
          {product.name}
        </h3>

        {/* Occasion + fit tags */}
        <div className="flex flex-wrap gap-1.5">
          <span className={clsx("inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-medium border", occStyle)}>
            <Tag size={9} />
            {product.occasion.charAt(0).toUpperCase() + product.occasion.slice(1)}
          </span>
          <span className="px-2.5 py-1 rounded-full border border-white/[0.08] text-[10px] text-zinc-500 font-medium">
            {product.fit}
          </span>
        </div>

        {/* Rating */}
        <div className="flex items-center gap-2">
          <Stars rating={product.rating} />
          <span className="text-[11px] text-zinc-500">
            {product.rating.toFixed(1)} ({product.reviews.toLocaleString("en-IN")})
          </span>
        </div>

        {/* Colour swatches */}
        {product.color && product.color.length > 0 && (
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-zinc-600 uppercase tracking-wider mr-0.5">Colour:</span>
            {product.color.map((c) => (
              <span
                key={c}
                title={c}
                className="w-4 h-4 rounded-full border border-white/10 flex-shrink-0 cursor-default"
                style={colorStyle(c)}
              />
            ))}
          </div>
        )}

        {/* Size selector */}
        <div className="flex flex-wrap gap-1 mt-0.5">
          {shownSizes.map((s) => (
            <button
              key={s}
              onClick={() => setSelSize(s)}
              className={clsx(
                "px-2 py-0.5 rounded-md text-[10px] font-semibold border transition-all duration-150",
                selSize === s
                  ? "border-gold-400/60 bg-gold-400/10 text-gold-400"
                  : "border-white/[0.08] text-zinc-600 hover:border-white/20 hover:text-zinc-400"
              )}
            >
              {s}
            </button>
          ))}
          {extraSizes > 0 && (
            <span className="px-2 py-0.5 text-[10px] text-zinc-700">
              +{extraSizes}
            </span>
          )}
        </div>

        {/* Fabric */}
        <p className="text-[10px] text-zinc-600 tracking-wide -mt-1">
          {product.fabric} · {product.season?.join(", ") ?? "All season"}
        </p>

        {/* Price */}
        <div className="flex items-baseline gap-2 mt-auto pt-1">
          <span className="text-lg font-bold text-white">{fmt(product.price)}</span>
          {product.originalPrice && (
            <span className="text-xs text-zinc-600 line-through">{fmt(product.originalPrice)}</span>
          )}
        </div>

        {/* Add to Cart */}
        <button
          onClick={handleCart}
          className={clsx(
            "w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold tracking-wider uppercase transition-all duration-300",
            added || inCart
              ? "bg-gold-gradient text-black shadow-md shadow-gold-400/20"
              : "bg-white/[0.04] border border-white/[0.08] text-white hover:bg-gold-gradient hover:text-black hover:border-transparent hover:shadow-md hover:shadow-gold-400/20"
          )}
        >
          <ShoppingBag size={13} />
          {added ? "Added!" : inCart ? "In Cart" : "Add to Cart"}
        </button>
      </div>
    </article>
  );
}
