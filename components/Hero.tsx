"use client";

import Link from "next/link";
import { Sparkles, ArrowRight, ChevronDown } from "lucide-react";

export default function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-dark-400">
      {/* Ambient gradient orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-gold-400/5 blur-[120px]" />
        <div className="absolute -bottom-40 -right-40 w-[500px] h-[500px] rounded-full bg-gold-600/5 blur-[100px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-gold-500/3 blur-[150px]" />
      </div>

      {/* Grid pattern overlay */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(196,149,58,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(196,149,58,0.5) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      {/* Content */}
      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 text-center">
        {/* Pre-badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-gold-400/20 bg-gold-400/5 text-gold-400 text-xs font-medium tracking-widest uppercase mb-8 animate-fade-in">
          <Sparkles size={12} />
          AI-Powered Personal Styling
        </div>

        <h1 className="font-display text-5xl sm:text-6xl lg:text-8xl font-bold text-white leading-[1.05] tracking-tight animate-slide-up">
          Dress Like You{" "}
          <br />
          <span
            className="bg-gold-gradient bg-clip-text text-transparent"
            style={{ WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}
          >
            Were Born To
          </span>
        </h1>

        <p className="mt-6 text-lg sm:text-xl text-zinc-400 max-w-2xl mx-auto leading-relaxed animate-slide-up" style={{ animationDelay: "0.1s" }}>
          Your personal AI fashion stylist curates luxury looks tailored to your
          taste, occasion, and lifestyle — in seconds.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 animate-slide-up" style={{ animationDelay: "0.2s" }}>
          <Link
            href="/chat"
            className="group flex items-center gap-3 px-8 py-4 rounded-full bg-gold-gradient text-black font-semibold text-sm tracking-wider uppercase shadow-lg shadow-gold-400/20 hover:shadow-gold-400/40 hover:scale-105 transition-all duration-300"
          >
            <Sparkles size={16} />
            Chat with AI Stylist
            <ArrowRight
              size={16}
              className="group-hover:translate-x-1 transition-transform duration-200"
            />
          </Link>
          <Link
            href="/chat"
            className="flex items-center gap-2 px-8 py-4 rounded-full border border-white/10 text-white font-medium text-sm tracking-wider uppercase hover:bg-white/5 hover:border-white/20 transition-all duration-300"
          >
            Browse Collections
          </Link>
        </div>

        {/* Stats */}
        <div className="mt-16 grid grid-cols-3 gap-8 max-w-lg mx-auto animate-fade-in" style={{ animationDelay: "0.4s" }}>
          {[
            { label: "Luxury Brands", value: "50+" },
            { label: "Curated Pieces", value: "2,000+" },
            { label: "Happy Clients", value: "12K+" },
          ].map(({ label, value }) => (
            <div key={label} className="text-center">
              <p className="text-2xl font-bold font-display text-white">{value}</p>
              <p className="text-xs text-zinc-500 tracking-wider uppercase mt-1">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-float">
        <span className="text-[10px] text-zinc-600 tracking-widest uppercase">Scroll</span>
        <ChevronDown size={16} className="text-zinc-600" />
      </div>
    </section>
  );
}
