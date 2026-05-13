"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import FashionProductCard from "./FashionProductCard";
import { getProductsByOccasion } from "@/data/products";
import { FashionProduct } from "@/types";

const tabs = [
  { label: "All",        value: "all",        emoji: "✨" },
  { label: "Wedding",    value: "wedding",     emoji: "💍" },
  { label: "Party",      value: "party",       emoji: "🎉" },
  { label: "Casual",     value: "casual",      emoji: "☀️" },
  { label: "Office",     value: "office",      emoji: "💼" },
  { label: "Festival",   value: "festival",    emoji: "🎵" },
  { label: "Date Night", value: "date night",  emoji: "🌙" },
  { label: "Vacation",   value: "vacation",    emoji: "✈️" },
];

export default function FeaturedProducts() {
  const [active, setActive] = useState("all");
  const products = (getProductsByOccasion(active) as FashionProduct[]).slice(0, 8);

  return (
    <section className="py-24 px-4 sm:px-6 bg-dark-300">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-12">
          <div>
            <p className="text-gold-400 text-xs font-medium tracking-widest uppercase mb-3">
              Collections
            </p>
            <h2 className="font-display text-4xl sm:text-5xl font-bold text-white">
              Featured Pieces
            </h2>
          </div>
          <Link
            href="/chat"
            className="group flex items-center gap-2 text-sm text-zinc-400 hover:text-gold-400 transition-colors duration-200 font-medium tracking-wider uppercase"
          >
            AI Stylist
            <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform duration-200" />
          </Link>
        </div>

        {/* Occasion tabs */}
        <div className="flex gap-2 mb-10 overflow-x-auto pb-2 scrollbar-hide">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActive(tab.value)}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-xs font-semibold tracking-wide transition-all duration-300 flex items-center gap-1.5 ${
                active === tab.value
                  ? "bg-gold-gradient text-black shadow-lg shadow-gold-400/20"
                  : "border border-white/10 text-zinc-400 hover:text-white hover:border-white/20"
              }`}
            >
              <span>{tab.emoji}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Grid */}
        {products.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
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
          <div className="text-center py-16 text-zinc-600">
            <p className="text-lg">No products for this occasion yet.</p>
          </div>
        )}
      </div>
    </section>
  );
}
