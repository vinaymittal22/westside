"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { ShoppingBag, Heart, Menu, X } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import clsx from "clsx";

const links = [
  { href: "/",         label: "Home" },
  { href: "/chat",     label: "Ask Toastie" },
  { href: "/wishlist", label: "Wishlist" },
  { href: "/cart",     label: "Cart" },
];

/* Hide on pages that have their own header */
const HIDE_ON = ["/chat"];

export default function Navbar() {
  const pathname  = usePathname();
  const { totalItems } = useCart();
  const { totalItems: wishlistCount } = useWishlist();
  const [scrolled,    setScrolled]    = useState(false);
  const [mobileOpen,  setMobileOpen]  = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /* Don't render on chat or product detail pages */
  if (HIDE_ON.some((p) => pathname === p) || pathname.startsWith("/product/")) {
    return null;
  }

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
      style={{
        background: "var(--cream)",
        borderBottom: scrolled ? "1px solid var(--line)" : "1px solid transparent",
        padding: scrolled ? "10px 0" : "16px 0",
      }}
    >
      <nav className="max-w-7xl mx-auto px-5 sm:px-8 flex items-center justify-between">

        {/* Brand mark — official Burnt Toast logo */}
        <Link href="/" className="flex items-center" style={{ textDecoration: "none" }}>
          <Image
            src="https://burnt-toast.com/cdn/shop/files/Logo-8_1.png"
            alt="Burnt Toast"
            width={110}
            height={36}
            className="h-8 sm:h-9 w-auto object-contain"
            style={{ width: "auto" }}
            priority
            unoptimized
          />
        </Link>

        {/* Center title (mobile-hidden) — links to chatbot */}
        <Link href="/chat" className="hidden md:flex flex-col items-center" style={{ textDecoration: "none", cursor: "pointer" }}>
          <span style={{
            fontFamily: "var(--font-display)",
            fontSize: 18, color: "var(--ink)", lineHeight: 1,
          }}>
            Ask Toastie
          </span>
          <span style={{
            fontFamily: "var(--font-mono)",
            fontSize: 9, color: "var(--ash)",
            letterSpacing: 3, marginTop: 4, fontWeight: 500,
          }}>
            YOUR PERSONAL AI STYLIST
          </span>
        </Link>

        {/* Right cluster — links + live + actions */}
        <div className="flex items-center gap-3 md:gap-5">

          {/* Desktop nav */}
          <ul className="hidden md:flex items-center gap-6 mr-3">
            {links.filter(l => l.href !== "/chat").map(({ href, label }) => (
              <li key={href}>
                <Link
                  href={href}
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 10, letterSpacing: 2, fontWeight: 500,
                    color: pathname === href ? "var(--ink)" : "var(--ash)",
                    textTransform: "uppercase",
                    textDecoration: pathname === href ? "underline" : "none",
                    textUnderlineOffset: 4,
                  }}
                  className="hover:opacity-70 transition-opacity"
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>

          {/* LIVE dot */}
          <div className="hidden sm:flex items-center gap-1.5">
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--sage)" }} />
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--sage)", letterSpacing: 1, fontWeight: 500 }}>LIVE</span>
          </div>

          <Link href="/wishlist" className="relative p-2 rounded-full transition-colors hover:bg-[var(--cream-deep)]">
            <Heart size={18} fill={wishlistCount > 0 ? "var(--burnt)" : "none"} stroke="var(--ink)" />
            {wishlistCount > 0 && (
              <span style={{
                position: "absolute", top: -2, right: -2,
                background: "var(--burnt)", color: "#fff",
                fontFamily: "var(--font-mono)", fontSize: 8, fontWeight: 700,
                borderRadius: "50%", width: 14, height: 14,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {wishlistCount > 9 ? "9+" : wishlistCount}
              </span>
            )}
          </Link>

          <Link href="/cart" className="relative p-2 rounded-full transition-colors hover:bg-[var(--cream-deep)]">
            <ShoppingBag size={18} stroke="var(--ink)" />
            {totalItems > 0 && (
              <span style={{
                position: "absolute", top: -2, right: -2,
                background: "var(--ink)", color: "var(--cream)",
                fontFamily: "var(--font-mono)", fontSize: 8, fontWeight: 700,
                borderRadius: "50%", width: 14, height: 14,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {totalItems > 9 ? "9+" : totalItems}
              </span>
            )}
          </Link>

          <button
            onClick={() => setMobileOpen((o) => !o)}
            className="md:hidden p-2 rounded-full transition-colors hover:bg-[var(--cream-deep)]"
            aria-label="Menu"
          >
            {mobileOpen
              ? <X size={20} stroke="var(--ink)" />
              : <Menu size={20} stroke="var(--ink)" />}
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      {mobileOpen && (
        <div
          className="md:hidden absolute top-full left-0 right-0 py-6 animate-slide-up"
          style={{ background: "var(--cream)", borderBottom: "1px solid var(--line)" }}
        >
          <ul className="flex flex-col items-center gap-5">
            {links.map(({ href, label }) => (
              <li key={href}>
                <Link
                  href={href}
                  onClick={() => setMobileOpen(false)}
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 12, letterSpacing: 2,
                    color: pathname === href ? "var(--ink)" : "var(--ash)",
                    fontWeight: pathname === href ? 700 : 500,
                    textTransform: "uppercase",
                  }}
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
