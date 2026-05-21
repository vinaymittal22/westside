"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import FashionProductCard from "./FashionProductCard";
import { products as allProducts } from "@/data/products";
import { FashionProduct } from "@/types";

const tabs = [
  { label: "All",       value: "all" },
  { label: "☕ Casual",  value: "casual" },
  { label: "🎓 College", value: "college" },
  { label: "🌙 Night Out", value: "night-out" },
  { label: "🏖️ Beach",  value: "beach" },
  { label: "💪 Active", value: "active" },
  { label: "💼 Work",   value: "work" },
];

export default function FeaturedProducts() {
  const [active, setActive] = useState("all");
  const products = (active === "all"
    ? allProducts
    : (allProducts as FashionProduct[]).filter((p) => p.occasion === active)
  ).slice(0, 8);

  return (
    <section className="py-20 px-4 sm:px-6 bg-gray-50 border-t border-gray-100">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-10">
          <div>
            <p className="text-gray-400 text-xs font-medium tracking-widest uppercase mb-2">
              Collections
            </p>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-gray-900">
              Featured Pieces
            </h2>
          </div>
          <Link
            href="/chat"
            className="group flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors duration-200 font-medium tracking-wider uppercase"
          >
            Ask Toastie
            <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform duration-200" />
          </Link>
        </div>

        {/* Occasion tabs */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2 scrollbar-hide">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActive(tab.value)}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-xs font-semibold tracking-wide transition-all duration-200 ${
                active === tab.value
                  ? "bg-gray-900 text-white shadow-sm"
                  : "border border-gray-200 text-gray-500 hover:text-gray-900 hover:border-gray-400 bg-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Grid */}
        {products.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
            {products.map((product, i) => (
              <div
                key={product.id}
                className="animate-slide-up"
                style={{ animationDelay: `${i * 0.05}s`, animationFillMode: "both" }}
              >
                <FashionProductCard product={product} />
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 text-gray-400">
            <p className="text-lg">No products for this occasion yet.</p>
          </div>
        )}
      </div>
    </section>
  );
}
