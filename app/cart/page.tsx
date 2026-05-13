"use client";

import Image from "next/image";
import Link from "next/link";
import { Trash2, Plus, Minus, ShoppingBag, ArrowLeft, Sparkles, Tag } from "lucide-react";
import { useCart } from "@/context/CartContext";

export default function CartPage() {
  const { items, totalItems, totalPrice, removeItem, updateQuantity, clearCart } = useCart();

  const shipping = totalPrice > 500 ? 0 : 25;
  const tax = totalPrice * 0.08;
  const grandTotal = totalPrice + shipping + tax;

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-dark-400 pt-24 flex flex-col items-center justify-center px-4 text-center">
        <div className="w-20 h-20 rounded-3xl bg-dark-100 border border-white/5 flex items-center justify-center mb-6 animate-float">
          <ShoppingBag size={32} className="text-zinc-600" />
        </div>
        <h2 className="font-display text-3xl font-bold text-white mb-3">Your bag is empty</h2>
        <p className="text-zinc-500 max-w-sm mb-8">
          Let our AI stylist fill it with pieces that were made for you.
        </p>
        <div className="flex flex-col sm:flex-row gap-4">
          <Link
            href="/chat"
            className="flex items-center gap-2 px-8 py-4 rounded-full bg-gold-gradient text-black font-semibold text-sm tracking-wider uppercase hover:shadow-lg hover:shadow-gold-400/25 transition-all duration-300"
          >
            <Sparkles size={16} />
            Chat with AI Stylist
          </Link>
          <Link
            href="/"
            className="flex items-center gap-2 px-8 py-4 rounded-full border border-white/10 text-white font-medium text-sm tracking-wider uppercase hover:bg-white/5 transition-all duration-300"
          >
            Browse Collections
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-400 pt-24 pb-16 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-10">
          <div>
            <h1 className="font-display text-4xl font-bold text-white">Shopping Bag</h1>
            <p className="text-zinc-500 mt-1 text-sm">
              {totalItems} item{totalItems !== 1 ? "s" : ""} · Free shipping over $500
            </p>
          </div>
          <Link
            href="/"
            className="flex items-center gap-2 text-zinc-500 hover:text-white text-sm transition-colors duration-200"
          >
            <ArrowLeft size={16} />
            Continue Shopping
          </Link>
        </div>

        <div className="grid lg:grid-cols-[1fr_380px] gap-8">
          {/* Cart Items */}
          <div className="space-y-4">
            {items.map((item) => (
              <div
                key={`${item.id}-${item.selectedSize}`}
                className="group flex gap-4 sm:gap-6 bg-dark-100 border border-white/5 rounded-2xl p-4 sm:p-5 hover:border-white/10 transition-all duration-300"
              >
                {/* Image */}
                <div className="relative w-24 h-32 sm:w-32 sm:h-40 rounded-xl overflow-hidden flex-shrink-0 bg-dark-50">
                  <Image
                    src={item.image}
                    alt={item.name}
                    fill
                    className="object-cover"
                    sizes="128px"
                  />
                  {item.isSale && (
                    <span className="absolute top-2 left-2 px-1.5 py-0.5 text-[9px] font-bold bg-red-500 text-white rounded-full uppercase tracking-wider">
                      Sale
                    </span>
                  )}
                </div>

                {/* Details */}
                <div className="flex-1 flex flex-col min-w-0">
                  <div className="flex justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[10px] text-gold-400 font-medium tracking-widest uppercase mb-1">
                        {item.brand}
                      </p>
                      <h3 className="font-display text-lg font-semibold text-white leading-tight">
                        {item.name}
                      </h3>
                    </div>
                    <button
                      onClick={() => removeItem(item.id, item.selectedSize)}
                      className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-zinc-600 hover:text-red-400 hover:bg-red-400/10 transition-all duration-200"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  <div className="flex items-center gap-3 mt-2">
                    <span className="px-3 py-1 rounded-full bg-dark-50 border border-white/5 text-xs text-zinc-400">
                      Size: {item.selectedSize}
                    </span>
                    <span className="px-3 py-1 rounded-full bg-dark-50 border border-white/5 text-xs text-zinc-400 capitalize">
                      {item.category}
                    </span>
                  </div>

                  <div className="flex items-center justify-between mt-auto pt-3">
                    {/* Quantity */}
                    <div className="flex items-center gap-2 bg-dark-50 border border-white/5 rounded-xl px-1 py-1">
                      <button
                        onClick={() => updateQuantity(item.id, item.selectedSize, item.quantity - 1)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 transition-all duration-200"
                      >
                        <Minus size={12} />
                      </button>
                      <span className="text-sm font-semibold text-white w-6 text-center">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.id, item.selectedSize, item.quantity + 1)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 transition-all duration-200"
                      >
                        <Plus size={12} />
                      </button>
                    </div>

                    {/* Price */}
                    <div className="text-right">
                      {item.originalPrice && (
                        <p className="text-xs text-zinc-600 line-through">
                          ${(item.originalPrice * item.quantity).toFixed(2)}
                        </p>
                      )}
                      <p className="text-lg font-bold text-white">
                        ${(item.price * item.quantity).toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* Clear cart */}
            <button
              onClick={clearCart}
              className="text-xs text-zinc-600 hover:text-red-400 transition-colors duration-200 tracking-wider uppercase flex items-center gap-1"
            >
              <Trash2 size={12} />
              Clear Cart
            </button>
          </div>

          {/* Order Summary */}
          <div className="lg:sticky lg:top-24 self-start">
            <div className="bg-dark-100 border border-white/5 rounded-2xl p-6">
              <h2 className="font-display text-xl font-bold text-white mb-6">
                Order Summary
              </h2>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-zinc-500">Subtotal ({totalItems} items)</span>
                  <span className="text-white">${totalPrice.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Shipping</span>
                  <span className={shipping === 0 ? "text-emerald-400" : "text-white"}>
                    {shipping === 0 ? "FREE" : `$${shipping.toFixed(2)}`}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Tax (8%)</span>
                  <span className="text-white">${tax.toFixed(2)}</span>
                </div>

                {totalPrice <= 500 && (
                  <div className="flex items-start gap-2 p-3 rounded-xl bg-gold-400/5 border border-gold-400/15 text-xs text-gold-400">
                    <Tag size={12} className="flex-shrink-0 mt-0.5" />
                    Add ${(500 - totalPrice).toFixed(2)} more for free shipping!
                  </div>
                )}

                <div className="border-t border-white/10 pt-3 mt-3 flex justify-between text-base font-semibold">
                  <span className="text-white">Total</span>
                  <span className="text-gold-400 font-bold text-lg">${grandTotal.toFixed(2)}</span>
                </div>
              </div>

              <button className="mt-6 w-full py-4 rounded-2xl bg-gold-gradient text-black font-bold text-sm tracking-wider uppercase hover:shadow-lg hover:shadow-gold-400/25 hover:scale-[1.02] transition-all duration-300">
                Checkout Securely
              </button>

              <Link
                href="/chat"
                className="mt-3 w-full py-3 rounded-2xl border border-white/10 text-zinc-400 font-medium text-sm tracking-wider uppercase hover:border-white/20 hover:text-white transition-all duration-300 flex items-center justify-center gap-2"
              >
                <Sparkles size={14} />
                Get More Recommendations
              </Link>

              <div className="mt-6 space-y-2">
                {["256-bit SSL Encryption", "Free returns within 30 days", "Authenticity guaranteed"].map(
                  (t) => (
                    <div key={t} className="flex items-center gap-2 text-xs text-zinc-600">
                      <span className="w-1 h-1 rounded-full bg-gold-400/50" />
                      {t}
                    </div>
                  )
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
