"use client";

import { useState } from "react";
import Image from "next/image";
import { ShoppingBag, Heart, Star } from "lucide-react";
import { Product } from "@/types";
import { useCart } from "@/context/CartContext";
import clsx from "clsx";

interface Props {
  product: Product;
  compact?: boolean;
}

export default function ProductCard({ product, compact = false }: Props) {
  const { addItem, isInCart } = useCart();
  const [wished, setWished] = useState(false);
  const [added, setAdded] = useState(false);

  const defaultSize = product.sizes[0];

  function handleAddToCart() {
    addItem(product, defaultSize);
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  }

  const inCart = isInCart(product.id);

  return (
    <div
      className={clsx(
        "group relative bg-dark-100 border border-white/5 rounded-2xl overflow-hidden",
        "transition-all duration-500 hover:border-gold-400/30 hover:shadow-[0_8px_40px_rgba(196,149,58,0.15)]",
        compact ? "flex gap-3 p-3" : "flex flex-col"
      )}
    >
      {/* Image */}
      <div
        className={clsx(
          "relative overflow-hidden bg-dark-50",
          compact ? "w-20 h-20 rounded-xl flex-shrink-0" : "aspect-[3/4] w-full"
        )}
      >
        <Image
          src={product.image}
          alt={product.name}
          fill
          className="object-cover transition-transform duration-700 group-hover:scale-105"
          sizes={compact ? "80px" : "(max-width: 768px) 100vw, 33vw"}
        />

        {/* Overlay gradient */}
        {!compact && (
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        )}

        {/* Badges */}
        {!compact && (
          <div className="absolute top-3 left-3 flex flex-col gap-1.5">
            {product.isNew && (
              <span className="px-2 py-0.5 text-[10px] font-semibold tracking-widest uppercase bg-gold-gradient text-black rounded-full">
                New
              </span>
            )}
            {product.isSale && (
              <span className="px-2 py-0.5 text-[10px] font-semibold tracking-widest uppercase bg-red-500 text-white rounded-full">
                Sale
              </span>
            )}
          </div>
        )}

        {/* Wishlist */}
        {!compact && (
          <button
            onClick={() => setWished((w) => !w)}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-black/70"
          >
            <Heart
              size={14}
              className={wished ? "fill-red-400 text-red-400" : "text-white"}
            />
          </button>
        )}
      </div>

      {/* Info */}
      <div className={clsx("flex flex-col", compact ? "flex-1 min-w-0" : "p-4 gap-2")}>
        <p className={clsx("text-gold-400 font-medium", compact ? "text-[10px] uppercase tracking-wider" : "text-xs uppercase tracking-widest")}>
          {product.brand}
        </p>
        <h3
          className={clsx(
            "font-display text-white leading-tight",
            compact ? "text-sm truncate" : "text-base"
          )}
        >
          {product.name}
        </h3>

        {!compact && (
          <div className="flex items-center gap-1 mt-0.5">
            <Star size={11} className="fill-gold-400 text-gold-400" />
            <span className="text-xs text-zinc-400">
              {product.rating} ({product.reviews})
            </span>
          </div>
        )}

        <div className="flex items-center gap-2 mt-auto">
          <span className={clsx("font-semibold text-white", compact ? "text-sm" : "text-lg")}>
            ${product.price}
          </span>
          {product.originalPrice && (
            <span className="text-xs text-zinc-500 line-through">
              ${product.originalPrice}
            </span>
          )}
        </div>

        <button
          onClick={handleAddToCart}
          className={clsx(
            "flex items-center justify-center gap-2 rounded-xl font-medium text-sm transition-all duration-300",
            compact
              ? "mt-1.5 py-1.5 px-3 text-xs"
              : "mt-2 py-2.5 w-full",
            added || inCart
              ? "bg-gold-gradient text-black"
              : "bg-white/5 hover:bg-gold-gradient hover:text-black text-white border border-white/10 hover:border-transparent"
          )}
        >
          <ShoppingBag size={compact ? 12 : 14} />
          {added ? "Added!" : inCart ? "In Cart" : "Add to Cart"}
        </button>
      </div>
    </div>
  );
}
