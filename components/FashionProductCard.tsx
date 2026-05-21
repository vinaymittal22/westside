"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ShoppingBag, Heart, Star, Tag } from "lucide-react";
import { FashionProduct } from "@/types";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import clsx from "clsx";

const OCCASION_STYLE: Record<string, string> = {
  casual:      "bg-sky-50 text-sky-600 border-sky-100",
  college:     "bg-indigo-50 text-indigo-600 border-indigo-100",
  "night-out": "bg-purple-50 text-purple-600 border-purple-100",
  beach:       "bg-teal-50 text-teal-600 border-teal-100",
  active:      "bg-emerald-50 text-emerald-600 border-emerald-100",
  work:        "bg-slate-50 text-slate-600 border-slate-200",
};

function fmt(n: number) { return "₹" + n.toLocaleString("en-IN"); }

interface Props { product: FashionProduct; }

export default function FashionProductCard({ product }: Props) {
  const { addItem, isInCart } = useCart();
  const { toggleItem, isWishlisted } = useWishlist();
  const [added, setAdded] = useState(false);
  const wished = isWishlisted(product.id);
  const sizeList = product.sizes ?? [];
  const [selSize, setSelSize] = useState(sizeList[0] ?? "M");

  const inCart   = isInCart(product.id);
  const discount = product.originalPrice
    ? Math.round((1 - product.price / product.originalPrice) * 100)
    : 0;
  const occStyle   = OCCASION_STYLE[product.occasion] ?? "bg-gray-50 text-gray-600 border-gray-200";
  const shownSizes = sizeList.slice(0, 4);
  const extraSizes = sizeList.length - 4;

  function handleCart() {
    addItem(product, selSize);
    setAdded(true);
    setTimeout(() => setAdded(false), 1600);
  }

  return (
    <article className="group relative flex flex-col bg-white rounded-xl overflow-hidden border border-gray-200 transition-all duration-300 hover:shadow-md hover:border-gray-300">

      {/* Image — hover swaps to second photo */}
      <Link href={`/product/${product.id}`} className="relative aspect-[3/4] overflow-hidden bg-[#f8f5f0] block">
        {/* Primary image */}
        <Image
          src={product.image}
          alt={product.name}
          fill
          className="object-contain transition-all duration-500 group-hover:opacity-0"
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
        />
        {/* Secondary image (shown on hover) */}
        {product.images?.[1] && (
          <Image
            src={product.images[1]}
            alt={`${product.name} — alternate view`}
            fill
            className="object-contain absolute inset-0 opacity-0 transition-all duration-500 group-hover:opacity-100"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          />
        )}

        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10">
          {product.isNew && (
            <span className="px-2.5 py-1 rounded-full bg-gray-900 text-[9px] font-bold tracking-widest uppercase text-white">
              New
            </span>
          )}
          {product.isSale && discount > 0 && (
            <span className="px-2.5 py-1 rounded-full bg-red-500 text-[9px] font-bold tracking-widest uppercase text-white">
              -{discount}%
            </span>
          )}
        </div>

        {/* Wishlist */}
        <button
          onClick={(e) => { e.preventDefault(); toggleItem(product); }}
          aria-label={wished ? "Remove from wishlist" : "Add to wishlist"}
          className={clsx(
            "absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-white/90 flex items-center justify-center transition-all duration-200 shadow-sm hover:scale-110",
            wished ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          )}
        >
          <Heart size={14} className={wished ? "fill-red-500 text-red-500" : "text-gray-500"} />
        </button>
      </Link>

      {/* Body */}
      <div className="flex flex-col flex-1 p-3 gap-2">

        <p className="text-[10px] font-semibold text-gray-400 tracking-[0.18em] uppercase truncate">
          {product.brand}
        </p>

        <Link href={`/product/${product.id}`}>
          <h3 className="font-display text-gray-900 text-sm font-semibold leading-snug line-clamp-2 -mt-1 hover:underline">
            {product.name}
          </h3>
        </Link>

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5">
          <span className={clsx("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border", occStyle)}>
            <Tag size={8} />
            {product.occasion.charAt(0).toUpperCase() + product.occasion.slice(1)}
          </span>
        </div>

        {/* Stars */}
        <div className="flex items-center gap-1.5">
          <div className="flex">
            {[1,2,3,4,5].map((n) => (
              <Star key={n} size={10} className={n <= Math.round(product.rating) ? "fill-gray-800 text-gray-800" : "fill-transparent text-gray-300"} />
            ))}
          </div>
          <span className="text-[10px] text-gray-400">{product.rating.toFixed(1)}</span>
        </div>

        {/* Size selector */}
        <div className="flex flex-wrap gap-1">
          {shownSizes.map((s: string) => (
            <button key={s} onClick={() => setSelSize(s)}
              className={clsx("px-2 py-0.5 rounded text-[10px] font-semibold border transition-all duration-150",
                selSize === s
                  ? "border-gray-900 bg-gray-900 text-white"
                  : "border-gray-200 text-gray-500 hover:border-gray-400 hover:text-gray-800"
              )}>
              {s}
            </button>
          ))}
          {extraSizes > 0 && <span className="px-1 py-0.5 text-[10px] text-gray-400">+{extraSizes}</span>}
        </div>

        {/* Price */}
        <div className="flex items-baseline gap-2 mt-auto pt-1">
          <span className="text-base font-bold text-gray-900">{fmt(product.price)}</span>
          {product.originalPrice && (
            <span className="text-xs text-gray-400 line-through">{fmt(product.originalPrice)}</span>
          )}
        </div>

        {/* Add to cart */}
        <button onClick={handleCart}
          className={clsx(
            "w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-semibold tracking-wider uppercase transition-all duration-200",
            added || inCart
              ? "bg-gray-900 text-white"
              : "bg-gray-50 border border-gray-200 text-gray-700 hover:bg-gray-900 hover:text-white hover:border-gray-900"
          )}>
          <ShoppingBag size={12} />
          {added ? "Added!" : inCart ? "In Cart" : "Add to Cart"}
        </button>
      </div>
    </article>
  );
}
