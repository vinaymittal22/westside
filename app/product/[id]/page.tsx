"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft, ShoppingBag, Star, Check, Heart,
  Truck, RotateCcw as Returns, Shield, Sparkles,
  ChevronLeft, ChevronRight,
} from "lucide-react";
import clsx from "clsx";

import { products } from "@/data/products";
import { FashionProduct } from "@/types";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import { needsSizeSelection, resolveDefaultSize } from "@/utils/productSizing";

/* ── Helpers ───────────────────────────────────────────────────── */
function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span
      className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border capitalize"
      style={{ borderColor: `${color}40`, backgroundColor: `${color}10`, color }}
    >
      {label}
    </span>
  );
}

function InfoRow({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-3 py-3 border-b border-gray-100 last:border-0">
      <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center flex-shrink-0 text-gray-800">
        {icon}
      </div>
      <span className="text-sm text-gray-600">{text}</span>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   PRODUCT DETAIL PAGE
   ════════════════════════════════════════════════════════════════ */
export default function ProductPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { addItem, isInCart } = useCart();

  const product = products.find((p) => p.id === id) as FashionProduct | undefined;

  const { toggleItem, isWishlisted } = useWishlist();
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [added,        setAdded]        = useState(false);
  const [activeImg,    setActiveImg]    = useState(0);
  const alreadyInCart = product ? isInCart(product.id) : false;
  const wishlisted    = product ? isWishlisted(product.id) : false;

  // Related products — same occasion, different id, up to 4
  const related = product
    ? (products as FashionProduct[])
        .filter((p) => p.id !== product.id && p.occasion === product.occasion)
        .slice(0, 4)
    : [];

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    setActiveImg(0);
  }, [id]);

  if (!product) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-6 px-4 text-center">
        <div className="w-20 h-20 rounded-3xl bg-gray-100 flex items-center justify-center">
          <ShoppingBag className="w-8 h-8 text-gray-400" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Product not found</h2>
        <p className="text-gray-500 max-w-sm">This product may have been removed or the link is incorrect.</p>
        <Link href="/chat" className="px-6 py-3 rounded-full bg-gray-900 text-white font-semibold text-sm hover:shadow-lg transition-all">
          Back to Toastie
        </Link>
      </div>
    );
  }

  const discount = product.originalPrice
    ? Math.round((1 - product.price / product.originalPrice) * 100)
    : 0;

  // Only sized categories (tops, bottoms, dresses, footwear) require a size pick.
  // Bags, jewellery, sunglasses, watches, hats add with One-Size directly.
  const requiresSize = needsSizeSelection(product.category, product.sizes);

  const handleAdd = () => {
    if (requiresSize && !selectedSize) return;
    const size = requiresSize ? selectedSize! : resolveDefaultSize(product.sizes);
    addItem(product, size);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  return (
    <div className="min-h-screen bg-white">

      {/* ── Nav bar ────────────────────────────────────────────── */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors text-sm font-medium"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>

          <Link href="/" className="flex items-center">
            <Image
              src="https://burnt-toast.com/cdn/shop/files/Logo-8_1.png"
              alt="Burnt Toast"
              width={100}
              height={34}
              className="h-8 w-auto object-contain"
              style={{ width: "auto" }}
              priority
            />
          </Link>

          <Link href="/cart" className="relative p-2 rounded-full hover:bg-gray-100 transition-colors">
            <ShoppingBag className="w-5 h-5 text-gray-700" />
          </Link>
        </div>
      </div>

      {/* ── Main content ───────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16">

          {/* ── Left: Image gallery ─────────────────────────────── */}
          <div className="flex flex-col gap-4">

            {/* Main image with prev/next arrows */}
            <div className="relative aspect-[3/4] rounded-3xl overflow-hidden bg-[#f8f5f0] shadow-lg group">
              <Image
                key={activeImg}
                src={(product.images ?? [product.image])[activeImg] ?? product.image}
                alt={`${product.name} — view ${activeImg + 1}`}
                fill
                className="object-contain transition-opacity duration-300"
                sizes="(max-width: 1024px) 100vw, 50vw"
                priority={activeImg === 0}
              />

              {/* Badges */}
              <div className="absolute top-4 left-4 flex gap-2 z-10">
                {product.isNew && (
                  <span className="px-3 py-1 text-xs font-bold rounded-full bg-emerald-500 text-white shadow">NEW</span>
                )}
                {product.isSale && discount > 0 && (
                  <span className="px-3 py-1 text-xs font-bold rounded-full bg-red-500 text-white shadow">{discount}% OFF</span>
                )}
              </div>

              {/* Image counter */}
              <div className="absolute bottom-4 right-4 z-10 px-2.5 py-1 rounded-full bg-black/50 text-white text-xs font-semibold backdrop-blur-sm">
                {activeImg + 1} / {(product.images ?? [product.image]).length}
              </div>

              {/* Prev arrow */}
              {activeImg > 0 && (
                <button
                  onClick={() => setActiveImg(i => i - 1)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-white/90 shadow-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white"
                  aria-label="Previous image"
                >
                  <ChevronLeft className="w-5 h-5 text-gray-800" />
                </button>
              )}

              {/* Next arrow */}
              {activeImg < (product.images ?? [product.image]).length - 1 && (
                <button
                  onClick={() => setActiveImg(i => i + 1)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-white/90 shadow-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white"
                  aria-label="Next image"
                >
                  <ChevronRight className="w-5 h-5 text-gray-800" />
                </button>
              )}
            </div>

            {/* Thumbnail strip */}
            {(product.images ?? []).length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {(product.images ?? [product.image]).map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveImg(idx)}
                    className={clsx(
                      "relative flex-shrink-0 w-20 h-24 rounded-xl overflow-hidden border-2 transition-all duration-200 bg-[#f8f5f0]",
                      idx === activeImg
                        ? "border-gray-900 shadow-md"
                        : "border-gray-200 opacity-60 hover:opacity-100 hover:border-gray-400"
                    )}
                    aria-label={`View image ${idx + 1}`}
                  >
                    <Image
                      src={img}
                      alt={`${product.name} thumbnail ${idx + 1}`}
                      fill
                      className="object-contain"
                      sizes="80px"
                    />
                  </button>
                ))}
              </div>
            )}

            {/* Chat CTA below thumbnails */}
            <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-gray-900 flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-semibold text-gray-800">Need styling advice?</p>
                <p className="text-xs text-gray-500">Ask Toastie, your personal AI stylist</p>
              </div>
              <Link href="/chat" className="px-3 py-1.5 rounded-full bg-gray-900 text-white text-xs font-bold whitespace-nowrap hover:shadow-md transition-all">
                Chat Now
              </Link>
            </div>
          </div>

          {/* ── Right: Product details ──────────────────────────── */}
          <div className="flex flex-col">

            {/* Brand */}
            <p className="text-xs font-semibold text-gray-800 tracking-widest uppercase">{product.brand}</p>

            {/* Name */}
            <h1 className="mt-1 text-2xl sm:text-3xl font-bold text-gray-900 leading-tight">{product.name}</h1>

            {/* Rating */}
            <div className="flex items-center gap-2 mt-3">
              <div className="flex">
                {[1,2,3,4,5].map((s) => (
                  <Star key={s} className={clsx("w-4 h-4", s <= Math.round(product.rating) ? "text-gray-800 fill-gray-800" : "text-gray-300")} />
                ))}
              </div>
              <span className="text-sm text-gray-500">{product.rating} · {product.reviews} reviews</span>
            </div>

            {/* Price */}
            <div className="flex items-center gap-4 mt-4">
              <span className="text-3xl font-bold text-gray-900">₹{product.price.toLocaleString("en-IN")}</span>
              {product.originalPrice && (
                <>
                  <span className="text-lg text-gray-400 line-through">₹{product.originalPrice.toLocaleString("en-IN")}</span>
                  {discount > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-red-50 text-red-600 text-sm font-bold">{discount}% off</span>
                  )}
                </>
              )}
            </div>

            <p className="text-xs text-emerald-600 font-medium mt-1">Free delivery on orders above ₹500</p>

            {/* Tags */}
            <div className="flex flex-wrap gap-2 mt-4">
              <Badge label={product.occasion} color="#c4953a" />
              <Badge label={product.gender}   color="#6366f1" />
              <Badge label={product.category} color="#10b981" />
              {product.season && <Badge label={Array.isArray(product.season) ? product.season.join(", ") : product.season} color="#f59e0b" />}
            </div>

            {/* Description */}
            <p className="mt-5 text-sm sm:text-base text-gray-600 leading-relaxed">{product.description}</p>

            {/* Product details table */}
            <div className="mt-5 grid grid-cols-2 gap-x-8 gap-y-2">
              {[
                { label: "Fabric",   value: product.fabric },
                { label: "Fit",      value: product.fit },
                { label: "Gender",   value: product.gender },
                { label: "Occasion", value: product.occasion },
                { label: "Color(s)", value: product.color.join(", ") },
                ...(product.season ? [{ label: "Season", value: Array.isArray(product.season) ? product.season.join(", ") : product.season }] : []),
              ].map(({ label, value }) => (
                <div key={label}>
                  <dt className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{label}</dt>
                  <dd className="text-sm text-gray-700 capitalize mt-0.5">{value}</dd>
                </div>
              ))}
            </div>

            {/* Size selector — only for sized categories (tops, bottoms, dresses, footwear) */}
            {requiresSize && (
              <div className="mt-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold text-gray-700">
                    Select Size
                    {!selectedSize && <span className="ml-1 text-red-500 font-normal text-xs">(required)</span>}
                  </p>
                  <button className="text-xs text-gray-800 underline underline-offset-2 hover:text-gray-700">Size Guide</button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {product.sizes.map((s) => (
                    <button
                      key={s}
                      onClick={() => setSelectedSize(s)}
                      className={clsx(
                        "w-12 h-12 rounded-xl text-sm font-semibold border-2 transition-all duration-150",
                        selectedSize === s
                          ? "bg-gray-900 border-gray-900 text-white shadow-md shadow-gray-200"
                          : "border-gray-200 text-gray-600 hover:border-gray-300 hover:text-gray-900"
                      )}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="mt-6 flex gap-3">
              <button
                onClick={handleAdd}
                disabled={(requiresSize && !selectedSize) || added}
                className={clsx(
                  "flex-1 py-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all duration-300",
                  added
                    ? "bg-emerald-500 text-white"
                    : (requiresSize && !selectedSize)
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200"
                    : "bg-gray-900 text-white hover:bg-black shadow-lg shadow-gray-200 active:scale-95"
                )}
              >
                {added ? (
                  <><Check className="w-4 h-4" /> Added to Cart!</>
                ) : alreadyInCart ? (
                  <><ShoppingBag className="w-4 h-4" /> Add Again</>
                ) : (
                  <><ShoppingBag className="w-4 h-4" /> Add to Cart</>
                )}
              </button>

              <button
                onClick={() => product && toggleItem(product)}
                aria-label={wishlisted ? "Remove from wishlist" : "Save to wishlist"}
                className={clsx(
                  "w-14 h-14 rounded-2xl border-2 flex items-center justify-center transition-all",
                  wishlisted
                    ? "border-red-300 bg-red-50 text-red-500"
                    : "border-gray-200 text-gray-400 hover:border-red-200 hover:text-red-400"
                )}
              >
                <Heart className={clsx("w-5 h-5", wishlisted && "fill-current")} />
              </button>
            </div>

            {alreadyInCart && !added && (
              <div className="mt-2 flex items-center justify-between text-xs text-emerald-600 px-1">
                <span>✓ Already in your cart</span>
                <Link href="/cart" className="underline hover:text-emerald-700">View cart →</Link>
              </div>
            )}

            {/* Trust signals */}
            <div className="mt-6 rounded-2xl bg-gray-50 border border-gray-100 px-4 divide-y divide-gray-100">
              <InfoRow icon={<Truck className="w-4 h-4" />}    text="Free delivery on orders above ₹500 · 3–5 business days" />
              <InfoRow icon={<Returns className="w-4 h-4" />}  text="Easy 30-day returns & exchanges" />
              <InfoRow icon={<Shield className="w-4 h-4" />}   text="100% authentic products · secure payments" />
            </div>
          </div>
        </div>

        {/* ── Related products ────────────────────────────────────── */}
        {related.length > 0 && (
          <section className="mt-16">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900">You may also like</h2>
                <p className="text-sm text-gray-500 mt-0.5">More {product.occasion} picks for you</p>
              </div>
              <Link href="/chat" className="text-sm text-gray-800 hover:text-gray-700 font-medium flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" /> Get AI picks
              </Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {related.map((p) => (
                <Link key={p.id} href={`/product/${p.id}`} className="group">
                  <div className="rounded-2xl overflow-hidden bg-[#f8f5f0] aspect-[3/4] relative">
                    <Image
                      src={p.image}
                      alt={p.name}
                      fill
                      className="object-contain group-hover:scale-105 transition-transform duration-500"
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    />
                  </div>
                  <div className="mt-2 px-0.5">
                    <p className="text-[10px] text-gray-800 font-semibold tracking-widest uppercase">{p.brand}</p>
                    <p className="text-sm font-medium text-gray-800 truncate mt-0.5">{p.name}</p>
                    <p className="text-sm font-bold text-gray-900 mt-0.5">₹{p.price.toLocaleString("en-IN")}</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* ── Footer ─────────────────────────────────────────────────── */}
      <div className="mt-16 border-t border-gray-100 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <Image
            src="https://burnt-toast.com/cdn/shop/files/Logo-8_1.png"
            alt="Burnt Toast"
            width={100}
            height={34}
            className="h-8 w-auto object-contain"
          />
          <p className="text-xs text-gray-400">© 2026 Burnt Toast · Made by Nikita</p>
          <Link href="/chat" className="flex items-center gap-2 px-4 py-2 rounded-full bg-gray-900 text-white text-xs font-semibold hover:shadow-md transition-all">
            <Sparkles className="w-3.5 h-3.5" /> Ask Toastie, Your Stylist
          </Link>
        </div>
      </div>
    </div>
  );
}
