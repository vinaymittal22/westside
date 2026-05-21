"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Heart, ShoppingBag, Trash2, ArrowLeft, Sparkles } from "lucide-react";
import { useWishlist } from "@/context/WishlistContext";
import { useCart } from "@/context/CartContext";
import { Product } from "@/types";
import clsx from "clsx";

function fmt(n: number) { return "₹" + n.toLocaleString("en-IN"); }

function WishlistCard({ product }: { product: Product }) {
  const { removeItem } = useWishlist();
  const { addItem, isInCart } = useCart();
  const [added, setAdded] = useState(false);
  const inCart = isInCart(product.id);
  const defaultSize = product.sizes?.[0] ?? "M";

  function handleCart() {
    addItem(product, defaultSize);
    setAdded(true);
    setTimeout(() => setAdded(false), 1600);
  }

  const discount = product.originalPrice
    ? Math.round((1 - product.price / product.originalPrice) * 100)
    : 0;

  return (
    <article className="group relative flex flex-col bg-white rounded-xl overflow-hidden border border-gray-200 hover:shadow-md hover:border-gray-300 transition-all duration-300">

      {/* Remove button */}
      <button
        onClick={() => removeItem(product.id)}
        aria-label="Remove from wishlist"
        className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-white/90 shadow-sm flex items-center justify-center hover:bg-red-50 transition-colors"
      >
        <Trash2 size={13} className="text-gray-400 group-hover:text-red-500 transition-colors" />
      </button>

      {/* Image */}
      <Link href={`/product/${product.id}`} className="relative aspect-[3/4] overflow-hidden bg-gray-100 block">
        <Image
          src={product.image}
          alt={product.name}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
        />
        <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10">
          {product.isNew && (
            <span className="px-2.5 py-1 rounded-full bg-gray-900 text-[9px] font-bold tracking-widest uppercase text-white">New</span>
          )}
          {product.isSale && discount > 0 && (
            <span className="px-2.5 py-1 rounded-full bg-red-500 text-[9px] font-bold tracking-widest uppercase text-white">-{discount}%</span>
          )}
        </div>
      </Link>

      {/* Info */}
      <div className="flex flex-col flex-1 p-3 gap-2">
        <p className="text-[10px] font-semibold text-gray-400 tracking-[0.18em] uppercase truncate">{product.brand}</p>
        <Link href={`/product/${product.id}`}>
          <h3 className="font-display text-gray-900 text-sm font-semibold leading-snug line-clamp-2 -mt-1 hover:underline">
            {product.name}
          </h3>
        </Link>

        <div className="flex items-baseline gap-2 mt-auto pt-1">
          <span className="text-base font-bold text-gray-900">{fmt(product.price)}</span>
          {product.originalPrice && (
            <span className="text-xs text-gray-400 line-through">{fmt(product.originalPrice)}</span>
          )}
        </div>

        <button
          onClick={handleCart}
          className={clsx(
            "w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-semibold tracking-wider uppercase transition-all duration-200",
            added || inCart
              ? "bg-gray-900 text-white"
              : "bg-gray-50 border border-gray-200 text-gray-700 hover:bg-gray-900 hover:text-white hover:border-gray-900"
          )}
        >
          <ShoppingBag size={12} />
          {added ? "Added!" : inCart ? "In Cart" : "Add to Cart"}
        </button>
      </div>
    </article>
  );
}

export default function WishlistPage() {
  const { items, clearWishlist, totalItems } = useWishlist();

  return (
    <div className="min-h-screen bg-gray-50 pt-24 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-700 tracking-wider uppercase font-medium transition-colors mb-3"
            >
              <ArrowLeft size={12} />
              Back to Shop
            </Link>
            <div className="flex items-center gap-3">
              <Heart size={24} className="fill-gray-900 text-gray-900" />
              <h1 className="font-display text-3xl font-bold text-gray-900">My Wishlist</h1>
              {totalItems > 0 && (
                <span className="px-2.5 py-1 rounded-full bg-gray-900 text-white text-xs font-bold">
                  {totalItems}
                </span>
              )}
            </div>
          </div>

          {totalItems > 0 && (
            <button
              onClick={clearWishlist}
              className="text-xs text-gray-400 hover:text-red-500 transition-colors font-medium tracking-wide uppercase flex items-center gap-1.5"
            >
              <Trash2 size={12} />
              Clear All
            </button>
          )}
        </div>

        {/* Empty state */}
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-28 gap-5 text-center">
            <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center">
              <Heart size={32} className="text-gray-300" />
            </div>
            <div>
              <h2 className="font-display text-xl font-semibold text-gray-800 mb-2">Your wishlist is lowkey empty</h2>
              <p className="text-gray-400 text-sm max-w-xs">
                Tap the heart on any piece that hits different — save it here and come back when you&apos;re ready to go off.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 mt-2">
              <Link
                href="/"
                className="px-6 py-3 rounded-xl bg-gray-900 text-white text-sm font-semibold tracking-wider uppercase hover:bg-gray-700 transition-colors"
              >
                Browse Products
              </Link>
              <Link
                href="/chat"
                className="px-6 py-3 rounded-xl border border-gray-200 bg-white text-gray-700 text-sm font-semibold tracking-wider uppercase hover:border-gray-900 transition-colors flex items-center gap-2"
              >
                <Sparkles size={14} />
                Ask Toastie
              </Link>
            </div>
          </div>
        ) : (
          <>
            {/* Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
              {items.map((product, i) => (
                <div
                  key={product.id}
                  className="animate-slide-up"
                  style={{ animationDelay: `${i * 0.05}s`, animationFillMode: "both" }}
                >
                  <WishlistCard product={product} />
                </div>
              ))}
            </div>

            {/* Footer CTA */}
            <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/"
                className="px-8 py-3 rounded-xl border border-gray-200 bg-white text-gray-700 text-sm font-semibold tracking-wider uppercase hover:border-gray-900 transition-colors"
              >
                Continue Shopping
              </Link>
              <Link
                href="/chat"
                className="px-8 py-3 rounded-xl bg-gray-900 text-white text-sm font-semibold tracking-wider uppercase hover:bg-gray-700 transition-colors flex items-center gap-2"
              >
                <Sparkles size={14} />
                Ask Toastie to Style These
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
