"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";

const CDN = "https://cdn.shopify.com/s/files/1/0626/4890/9886/files";

const CATEGORY_CARDS = [
  {
    title: "Tops",
    emoji: "👚",
    count: "17 styles",
    bg: "#F8F4FF",
    accent: "#7C3AED",
    img: `${CDN}/301060679WHITE_1.jpg`,
    href: "/#collection",
    description: "Fitted tees, knits & cropped tops",
  },
  {
    title: "Bottoms",
    emoji: "👖",
    count: "12 styles",
    bg: "#FFF7ED",
    accent: "#EA580C",
    img: `${CDN}/301064620PINK_1.jpg`,
    href: "/#collection",
    description: "Wide-leg pants, skirts & denims",
  },
  {
    title: "Dresses",
    emoji: "👗",
    count: "6 styles",
    bg: "#FFF1F2",
    accent: "#E11D48",
    img: `${CDN}/301062644KHAKHI_1.jpg`,
    href: "/#collection",
    description: "Mini dresses for every occasion",
  },
  {
    title: "Footwear",
    emoji: "👟",
    count: "17 styles",
    bg: "#F0FDF4",
    accent: "#16A34A",
    img: `${CDN}/301055054_1.jpg`,
    href: "/#collection",
    description: "Sandals, sneakers & loafers",
  },
];

export default function CategoryShowcase() {
  function scrollToCollection(e: React.MouseEvent) {
    e.preventDefault();
    document.getElementById("collection")?.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <section className="py-20 px-4 sm:px-8" style={{ background: "var(--cream)", borderTop: "1px solid var(--line)" }}>
      <div className="max-w-7xl mx-auto">

        <div className="text-center mb-14">
          <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--ash)", letterSpacing: 4, fontWeight: 500, marginBottom: 12 }}>
            SHOP BY CATEGORY <span style={{ color: "var(--ink)" }}>✦</span>
          </p>
          <h2 style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(38px, 5vw, 60px)",
            color: "var(--ink)", lineHeight: 1.05,
          }}>
            What are you <em style={{ fontStyle: "italic" }}>looking for?</em>
          </h2>
          <p style={{ marginTop: 16, color: "var(--ash)", fontSize: 14, maxWidth: 540, margin: "16px auto 0", fontFamily: "var(--font-body)" }}>
            Browse the full Spring 26 collection — from statement tops to must-have footwear.
          </p>
        </div>

        {/* Category grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          {CATEGORY_CARDS.map(({ title, emoji, count, bg, accent, img, description }) => (
            <a
              key={title}
              href="/#collection"
              onClick={scrollToCollection}
              className="group relative rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-xl border border-gray-100"
              style={{ background: bg }}
            >
              {/* Product image */}
              <div className="relative aspect-[3/4] overflow-hidden">
                <Image
                  src={img}
                  alt={title}
                  fill
                  className="object-cover object-top transition-transform duration-500 group-hover:scale-105"
                  sizes="(max-width: 640px) 50vw, 25vw"
                />
                {/* Overlay gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />

                {/* Bottom text — minimal editorial caption */}
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className="text-[9px] font-medium tracking-[3px] uppercase text-white/85"
                      style={{ fontFamily: "var(--font-mono)" }}
                    >
                      {count}
                    </span>
                    <span
                      className="text-[9px] tracking-[2px] uppercase text-white/70"
                      style={{ fontFamily: "var(--font-mono)" }}
                    >
                      0{["tops","bottoms","dresses","footwear"].indexOf(title.toLowerCase()) + 1} / 04
                    </span>
                  </div>
                  <h3
                    className="text-white text-2xl leading-tight"
                    style={{ fontFamily: "var(--font-display)", fontWeight: 400, letterSpacing: -0.5 }}
                  >
                    {title}
                  </h3>
                  <p className="text-white/70 text-xs mt-1 line-clamp-1" style={{ fontFamily: "var(--font-body)" }}>
                    {description}
                  </p>
                </div>
              </div>

              {/* Arrow hint */}
              <div className="absolute top-3 right-3 w-7 h-7 rounded-full bg-white/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 shadow-sm">
                <ArrowRight size={12} style={{ color: accent }} />
              </div>
            </a>
          ))}
        </div>

        {/* CTA Banner — editorial style */}
        <div className="rounded-3xl p-10 sm:p-16 text-center mt-4" style={{ background: "var(--cream-soft)", border: "1px solid var(--line)" }}>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--ash)", letterSpacing: 4, fontWeight: 500, marginBottom: 14 }}>
            YOUR PERSONAL STYLIST <span style={{ color: "var(--sage-deep)" }}>✦</span>
          </p>
          <h3 style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(30px, 4vw, 48px)",
            color: "var(--ink)", lineHeight: 1.05, marginBottom: 12,
          }}>
            Not sure what to wear? <em style={{ fontStyle: "italic" }}>Ask Toastie.</em>
          </h3>
          <p style={{ color: "var(--ash)", fontSize: 14, maxWidth: 480, margin: "0 auto 32px", fontFamily: "var(--font-body)", lineHeight: 1.6 }}>
            Drop your occasion, mood, or vibe — get a full shoppable look in seconds.
          </p>
          <Link
            href="/chat"
            className="inline-flex items-center gap-3 px-8 py-4 rounded-full transition-all"
            style={{
              background: "var(--ink)", color: "var(--cream)",
              fontFamily: "var(--font-mono)", fontSize: 11,
              letterSpacing: 2, fontWeight: 500,
            }}
          >
            ASK TOASTIE
            <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </section>
  );
}
