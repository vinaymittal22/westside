"use client";

import { FashionProduct } from "@/types";
import FashionProductCard from "./FashionProductCard";
import { Sparkles } from "lucide-react";

interface Props {
  products: FashionProduct[];
}

export default function RecommendedProducts({ products }: Props) {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 px-4 sm:px-6 py-5 border-b border-white/5">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-gold-gradient flex items-center justify-center">
            <Sparkles size={12} className="text-black" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white tracking-wider uppercase">
              AI Picks
            </h2>
            <p className="text-[10px] text-zinc-600 tracking-wider">
              {products.length} piece{products.length !== 1 ? "s" : ""} curated for you
            </p>
          </div>
        </div>
      </div>

      {/* Product grid */}
      <div className="flex-1 overflow-y-auto px-3 sm:px-4 py-4">
        {products.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center gap-3 text-center py-16">
            <div className="w-12 h-12 rounded-2xl bg-gold-400/10 flex items-center justify-center">
              <Sparkles size={20} className="text-gold-400" />
            </div>
            <p className="text-zinc-500 text-sm">
              Chat with the stylist to get personalized recommendations.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {products.map((product, i) => (
              <div
                key={`${product.id}-${i}`}
                className="animate-slide-in-left"
                style={{ animationDelay: `${i * 0.05}s`, animationFillMode: "both" }}
              >
                <FashionProductCard product={product} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
