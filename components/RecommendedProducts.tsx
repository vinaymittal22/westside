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
      <div className="flex-shrink-0 px-4 sm:px-6 py-5 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-gray-900 flex items-center justify-center">
            <Sparkles size={12} className="text-white" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-gray-900 tracking-wider uppercase">
              AI Picks
            </h2>
            <p className="text-[10px] text-gray-400 tracking-wider">
              {products.length} piece{products.length !== 1 ? "s" : ""} curated for you
            </p>
          </div>
        </div>
      </div>

      {/* Product grid */}
      <div className="flex-1 overflow-y-auto px-3 sm:px-4 py-4 bg-gray-50">
        {products.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center gap-3 text-center py-16">
            <div className="w-12 h-12 rounded-2xl bg-gray-50 border border-gray-200 flex items-center justify-center">
              <Sparkles size={20} className="text-gray-800" />
            </div>
            <p className="text-gray-500 text-sm">
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
