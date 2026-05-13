"use client";

import { useState } from "react";
import { FashionProduct } from "@/types";
import ConversationalChat from "@/components/ConversationalChat";
import RecommendedProducts from "@/components/RecommendedProducts";
import { ShoppingBag } from "lucide-react";
import Link from "next/link";
import { useCart } from "@/context/CartContext";

export default function ChatPage() {
  const [recommendedProducts, setRecommendedProducts] = useState<FashionProduct[]>([]);
  const { totalItems } = useCart();

  return (
    <div
      className="flex flex-col bg-[#0a0a0a]"
      style={{ height: "100dvh" }}
    >
      {/* ── Thin top bar (replaces heavy header on this page) ── */}
      <div className="flex-shrink-0 flex items-center justify-between px-4 sm:px-6 border-b border-white/[0.06] bg-[#080808]/95 backdrop-blur-md"
           style={{ paddingTop: "env(safe-area-inset-top)", height: "56px" }}>
        <Link href="/" className="font-display text-lg font-bold tracking-widest text-white uppercase">
          West<span className="text-gold-400">side</span>
        </Link>

        <Link href="/cart" className="relative p-2 rounded-full hover:bg-white/5 transition-colors">
          <ShoppingBag size={20} className="text-white" />
          {totalItems > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-5 h-5 rounded-full bg-gold-gradient text-black text-[10px] font-bold flex items-center justify-center">
              {totalItems > 9 ? "9+" : totalItems}
            </span>
          )}
        </Link>
      </div>

      {/* ── Main split area ─────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Left — Chat (full width on mobile, 55% on desktop) */}
        <div className="flex flex-col w-full lg:w-[55%] border-r border-white/[0.05] overflow-hidden">
          <ConversationalChat onProductsChange={setRecommendedProducts} />
        </div>

        {/* Right — Recommended products (desktop only) */}
        <div className="hidden lg:flex flex-col w-[45%] bg-[#0d0d0d] overflow-hidden">
          <RecommendedProducts products={recommendedProducts} />
        </div>
      </div>

      {/* Mobile: horizontal product strip (shows after first AI reply) */}
      {recommendedProducts.length > 0 && (
        <div className="lg:hidden flex-shrink-0 border-t border-white/[0.06] bg-[#0d0d0d]">
          <div className="px-4 pt-3 pb-1 flex items-center justify-between">
            <p className="text-[10px] font-semibold text-zinc-500 tracking-widest uppercase">
              AI Picks
            </p>
            <span className="text-[10px] text-zinc-700">
              {recommendedProducts.length} pieces
            </span>
          </div>
          <div className="flex gap-3 overflow-x-auto scrollbar-hide px-4 pb-3 pt-1">
            {recommendedProducts.map((p) => (
              <div key={p.id} className="flex-shrink-0 w-36 animate-scale-in">
                <div className="bg-[#141414] rounded-2xl overflow-hidden border border-white/5 hover:border-gold-400/20 transition-colors duration-300">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={p.image}
                    alt={p.name}
                    className="w-full h-40 object-cover"
                  />
                  <div className="p-2.5">
                    <p className="text-[9px] text-gold-400 tracking-widest uppercase font-medium truncate">{p.brand}</p>
                    <p className="text-xs text-white font-medium truncate mt-0.5 leading-tight">{p.name}</p>
                    <p className="text-sm font-bold text-white mt-1.5">₹{p.price.toLocaleString("en-IN")}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
