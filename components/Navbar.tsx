"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShoppingBag, Menu, X, Sparkles } from "lucide-react";
import { useCart } from "@/context/CartContext";
import clsx from "clsx";

const links = [
  { href: "/", label: "Home" },
  { href: "/chat", label: "AI Stylist" },
  { href: "/cart", label: "Cart" },
];

export default function Navbar() {
  const pathname = usePathname();
  const { totalItems } = useCart();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={clsx(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-500",
        scrolled
          ? "bg-black/90 backdrop-blur-xl border-b border-white/5 py-3"
          : "bg-transparent py-5"
      )}
    >
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-lg bg-gold-gradient flex items-center justify-center shadow-lg group-hover:shadow-gold-400/30 transition-shadow duration-300">
            <Sparkles size={16} className="text-black" />
          </div>
          <span className="font-display text-xl font-bold tracking-widest text-white uppercase">
            West<span className="text-gold-400">side</span>
          </span>
        </Link>

        {/* Desktop links */}
        <ul className="hidden md:flex items-center gap-8">
          {links.map(({ href, label }) => (
            <li key={href}>
              <Link
                href={href}
                className={clsx(
                  "text-sm font-medium tracking-wider uppercase transition-colors duration-200",
                  pathname === href
                    ? "text-gold-400"
                    : "text-zinc-400 hover:text-white"
                )}
              >
                {label}
              </Link>
            </li>
          ))}
        </ul>

        {/* Right actions */}
        <div className="flex items-center gap-3">
          <Link
            href="/chat"
            className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-full bg-gold-gradient text-black text-xs font-semibold tracking-wider uppercase hover:shadow-lg hover:shadow-gold-400/25 transition-all duration-300"
          >
            <Sparkles size={12} />
            Style Me
          </Link>

          <Link href="/cart" className="relative p-2 rounded-full hover:bg-white/5 transition-colors">
            <ShoppingBag size={20} className="text-white" />
            {totalItems > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-5 h-5 rounded-full bg-gold-gradient text-black text-[10px] font-bold flex items-center justify-center animate-pulse-gold">
                {totalItems > 9 ? "9+" : totalItems}
              </span>
            )}
          </Link>

          <button
            onClick={() => setMobileOpen((o) => !o)}
            className="md:hidden p-2 rounded-full hover:bg-white/5 transition-colors"
          >
            {mobileOpen ? (
              <X size={20} className="text-white" />
            ) : (
              <Menu size={20} className="text-white" />
            )}
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 bg-black/95 backdrop-blur-xl border-b border-white/5 py-4 animate-slide-up">
          <ul className="flex flex-col items-center gap-4">
            {links.map(({ href, label }) => (
              <li key={href}>
                <Link
                  href={href}
                  onClick={() => setMobileOpen(false)}
                  className={clsx(
                    "text-sm font-medium tracking-widest uppercase",
                    pathname === href ? "text-gold-400" : "text-zinc-300"
                  )}
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </header>
  );
}
