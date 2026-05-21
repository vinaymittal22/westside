"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Trash2, Plus, Minus, ShoppingBag, ArrowLeft, Sparkles, Check } from "lucide-react";
import { useCart } from "@/context/CartContext";

export default function CartPage() {
  const { items, totalItems, totalPrice, removeItem, updateQuantity, clearCart } = useCart();
  const [checkedOut, setCheckedOut] = useState(false);

  function handleCheckout() {
    setCheckedOut(true);
    setTimeout(() => setCheckedOut(false), 3000);
  }

  const shipping   = totalPrice > 500 ? 0 : 99;
  const tax        = Math.round(totalPrice * 0.05);
  const grandTotal = totalPrice + shipping + tax;

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-white pt-24 flex flex-col items-center justify-center px-4 text-center">
        <div className="w-20 h-20 rounded-3xl bg-gray-100 border border-gray-200 flex items-center justify-center mb-6">
          <ShoppingBag size={32} className="text-gray-400" />
        </div>
        <h2 className="font-display text-3xl font-bold text-gray-900 mb-3">Your bag is giving nothing</h2>
        <p className="text-gray-500 max-w-sm mb-8 text-sm">
          Let Toastie cook — drop your vibe and it&apos;ll fill this up with pieces that actually slap.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <Link href="/chat"
            className="flex items-center gap-2 px-8 py-4 rounded-full bg-gray-900 text-white font-semibold text-sm tracking-wider uppercase hover:bg-black transition-all duration-200 shadow-sm">
            <Sparkles size={16} />
            Ask Toastie, Your Stylist
          </Link>
          <Link href="/"
            className="flex items-center gap-2 px-8 py-4 rounded-full border border-gray-300 text-gray-700 font-medium text-sm tracking-wider uppercase hover:bg-gray-50 transition-all duration-200">
            Browse Collections
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-20 pb-16 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-8 pt-4">
          <div>
            <h1 className="font-display text-3xl sm:text-4xl font-bold text-gray-900">Shopping Bag</h1>
            <p className="text-gray-500 mt-1 text-sm">
              {totalItems} item{totalItems !== 1 ? "s" : ""} · Free shipping over ₹500
            </p>
          </div>
          <Link href="/" className="flex items-center gap-2 text-gray-400 hover:text-gray-900 text-sm transition-colors duration-200">
            <ArrowLeft size={16} />
            Continue Shopping
          </Link>
        </div>

        <div className="grid lg:grid-cols-[1fr_360px] gap-6">

          {/* Cart Items */}
          <div className="space-y-3">
            {items.map((item) => (
              <div
                key={`${item.id}-${item.selectedSize}`}
                className="flex gap-4 sm:gap-5 bg-white border border-gray-200 rounded-2xl p-4 sm:p-5 hover:border-gray-300 transition-all duration-200"
              >
                {/* Image */}
                <div className="relative w-24 h-32 sm:w-28 sm:h-36 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100">
                  <Image src={item.image} alt={item.name} fill className="object-cover" sizes="112px" />
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
                      <p className="text-[10px] text-gray-400 font-medium tracking-widest uppercase mb-1">{item.brand}</p>
                      <h3 className="font-display text-base font-semibold text-gray-900 leading-tight line-clamp-2">{item.name}</h3>
                    </div>
                    <button
                      onClick={() => removeItem(item.id, item.selectedSize)}
                      className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 transition-all duration-200"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  <div className="flex items-center gap-2 mt-2">
                    <span className="px-2.5 py-1 rounded-full bg-gray-100 text-xs text-gray-500">
                      Size: {item.selectedSize}
                    </span>
                    <span className="px-2.5 py-1 rounded-full bg-gray-100 text-xs text-gray-500 capitalize">
                      {item.category}
                    </span>
                  </div>

                  <div className="flex items-center justify-between mt-auto pt-3">
                    {/* Quantity */}
                    <div className="flex items-center gap-2 bg-gray-100 rounded-xl px-1 py-1">
                      <button
                        onClick={() => updateQuantity(item.id, item.selectedSize, item.quantity - 1)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-500 hover:text-gray-900 hover:bg-gray-200 transition-all duration-200"
                      >
                        <Minus size={12} />
                      </button>
                      <span className="text-sm font-semibold text-gray-900 w-6 text-center">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.id, item.selectedSize, item.quantity + 1)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-500 hover:text-gray-900 hover:bg-gray-200 transition-all duration-200"
                      >
                        <Plus size={12} />
                      </button>
                    </div>

                    {/* Price */}
                    <div className="text-right">
                      {item.originalPrice && (
                        <p className="text-xs text-gray-400 line-through">
                          ₹{(item.originalPrice * item.quantity).toLocaleString("en-IN")}
                        </p>
                      )}
                      <p className="text-base font-bold text-gray-900">
                        ₹{(item.price * item.quantity).toLocaleString("en-IN")}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            <button
              onClick={clearCart}
              className="text-xs text-gray-400 hover:text-red-500 transition-colors duration-200 tracking-wider uppercase flex items-center gap-1 mt-2"
            >
              <Trash2 size={12} />
              Clear Cart
            </button>
          </div>

          {/* Order Summary */}
          <div className="lg:sticky lg:top-24 self-start">
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
              <h2 className="font-display text-xl font-bold text-gray-900 mb-6">Order Summary</h2>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Subtotal ({totalItems} item{totalItems !== 1 ? "s" : ""})</span>
                  <span className="text-gray-900 font-medium">₹{totalPrice.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Shipping</span>
                  <span className={shipping === 0 ? "text-emerald-600 font-medium" : "text-gray-900"}>
                    {shipping === 0 ? "FREE" : `₹${shipping}`}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">GST (5%)</span>
                  <span className="text-gray-900">₹{tax.toLocaleString("en-IN")}</span>
                </div>

                {totalPrice <= 500 && (
                  <div className="flex items-start gap-2 p-3 rounded-xl bg-gray-50 border border-gray-200 text-xs text-gray-600">
                    Add ₹{(500 - totalPrice).toLocaleString("en-IN")} more for free shipping!
                  </div>
                )}

                <div className="border-t border-gray-200 pt-3 mt-3 flex justify-between text-base font-semibold">
                  <span className="text-gray-900">Total</span>
                  <span className="text-gray-900 font-bold text-lg">₹{grandTotal.toLocaleString("en-IN")}</span>
                </div>
              </div>

              <button
                onClick={handleCheckout}
                disabled={checkedOut}
                className="mt-6 w-full py-4 rounded-2xl bg-gray-900 text-white font-bold text-sm tracking-wider uppercase hover:bg-black transition-all duration-200 shadow-sm disabled:opacity-80 flex items-center justify-center gap-2"
              >
                {checkedOut ? (
                  <><Check size={16} /> Order Placed! We&apos;ll be in touch</>
                ) : (
                  "Checkout Securely"
                )}
              </button>

              <Link href="/chat"
                className="mt-3 w-full py-3 rounded-2xl border border-gray-200 text-gray-500 font-medium text-sm tracking-wider uppercase hover:border-gray-400 hover:text-gray-900 transition-all duration-200 flex items-center justify-center gap-2">
                <Sparkles size={14} />
                Get More Recommendations
              </Link>

              <div className="mt-5 space-y-2">
                {["256-bit SSL Encryption", "Free returns within 30 days", "Authenticity guaranteed"].map((t) => (
                  <div key={t} className="flex items-center gap-2 text-xs text-gray-400">
                    <span className="w-1 h-1 rounded-full bg-gray-400" />
                    {t}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
