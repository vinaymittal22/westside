"use client";

import React, { useState, useRef, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Heart, ShoppingBag, Check, Plus, Menu, X, Sparkles, User,
  GraduationCap, Briefcase, Plane, PartyPopper, Coffee, Music,
  Minus, Building2, Flower2, Cloud, Star, Sun, Moon, Flame,
  Camera, ImageIcon, XCircle,
} from "lucide-react";
import VirtualTryOnModal, { TryOnOutfitMap, TryOnEntry } from "./VirtualTryOnModal";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import { products as allProducts } from "@/data/products";
import { catalogueProducts } from "@/data/catalogue";
import { Product } from "@/types";
import { needsSizeSelection, resolveDefaultSize } from "@/utils/productSizing";

/* ──────────────────────────────────────────────────────────────
   BROKEN-IMAGE GUARD
   When a product image fails to load (404, CORS, etc.) we add its
   SKU to a module-level Set. Cards check this set on every render
   and bail out (return null) so broken products never display.
   Renderers also pre-filter their data using this set.
   ────────────────────────────────────────────────────────────── */
const brokenSkus = new Set<string>();
const brokenSkusListeners = new Set<() => void>();

function markSkuBroken(sku?: string | null) {
  if (!sku || brokenSkus.has(sku)) return;
  brokenSkus.add(sku);
  // notify all subscribers so dependent renderers re-evaluate
  brokenSkusListeners.forEach(fn => fn());
}

function useBrokenSkus(): Set<string> {
  const [, force] = useState(0);
  useEffect(() => {
    const listener = () => force(x => x + 1);
    brokenSkusListeners.add(listener);
    return () => { brokenSkusListeners.delete(listener); };
  }, []);
  return brokenSkus;
}

/** Returns true when the URL looks like a usable HTTP(S) image URL. */
function hasValidImageUrl(url?: string | null): boolean {
  if (!url) return false;
  const trimmed = url.trim();
  if (trimmed.length < 8) return false;
  return trimmed.startsWith("http://") || trimmed.startsWith("https://");
}

/** True when this product/item should be hidden from the chat. */
function isHiddenProduct(sku?: string, imgUrl?: string | null): boolean {
  if (sku && brokenSkus.has(sku)) return true;
  if (!hasValidImageUrl(imgUrl)) return true;
  return false;
}

/* ── Palette — editorial cream theme ─────────────────────────── */
const BG     = "#F0EBE0";   // cream paper background
const CARD   = "#F5F1E8";   // soft cream card
const BORDER = "#D8D2C4";   // warm beige line
const TEXT   = "#1A1A1A";   // ink
const MUTED  = "#8A8782";   // warm ash
const ACCENT = "#1A1A1A";   // ink (for primary CTAs)
const SAGE   = "#A4B596";   // sage accent (LIVE, APPROVED)
const SAGE_DEEP = "#748B6A";

/* ── Editorial font stack — matches globals.css tokens ─────── */
const FONT_DISPLAY = "'DM Serif Display', Georgia, serif";
const FONT_BRAND   = "'Caveat Brush', cursive";
const FONT_MONO    = "'JetBrains Mono', 'Courier New', monospace";
const FONT_BODY    = "'Inter', system-ui, sans-serif";

/* ── Section labels — one unified ink accent across all categories ── */
const INK = "#1A1A1A";
const SECTION_META: Record<string, { label: string; color: string }> = {
  top:        { label: "TOP",        color: INK },
  bottom:     { label: "BOTTOM",     color: INK },
  dress:      { label: "DRESS",      color: INK },
  footwear:   { label: "FOOTWEAR",   color: INK },
  bag:        { label: "BAG",        color: INK },
  sunglasses: { label: "SUNGLASSES", color: INK },
  necklace:   { label: "JEWELLERY",  color: INK },
  hat:        { label: "HAT",        color: INK },
  watch:      { label: "WATCH",      color: INK },
};

/* ── Aesthetic identities ────────────────────────────────────────── */
const AESTHETICS = [
  {
    title:    "Y2K Revival",
    icon:     "✨",
    color:    "#5B21B6",
    tagBg:    "#EDE9FE",
    tagColor: "#5B21B6",
    tags:     ["Bold", "Y2K", "Retro", "Statement"],
    occasions: [
      { icon: "🎓", label: "College fest / Freshers night" },
      { icon: "👗", label: "Farewell / Prom" },
      { icon: "🏠", label: "House party" },
      { icon: "🎵", label: "Clubbing / Music gig / Concert" },
      { icon: "🎂", label: "Birthday outfit" },
    ],
    prompt: "Show me Y2K revival style — bold and statement-making, full retro energy no cap",
  },
  {
    title:    "Urban Streetwear",
    icon:     "🔥",
    color:    "#92400E",
    tagBg:    "#FEF3C7",
    tagColor: "#92400E",
    tags:     ["Oversized", "Streetwear", "Preppy", "Athleisure"],
    occasions: [
      { icon: "✈️", label: "Airport look / Travel day trip" },
      { icon: "☕", label: "Casual hangout (café, brunch, mall, friends' place)" },
      { icon: "🏏", label: "Watching sports / IPL screening" },
      { icon: "🎒", label: "Daily campus life" },
    ],
    prompt: "Show me urban streetwear style — oversized and street-coded, preppy athleisure energy hits different",
  },
  {
    title:    "Smart Casual",
    icon:     "💫",
    color:    "#065F46",
    tagBg:    "#D1FAE5",
    tagColor: "#065F46",
    tags:     ["Classic", "Minimal", "Elegant", "Chic"],
    occasions: [
      { icon: "🌙", label: "Date night" },
      { icon: "💼", label: "Internship / Family office dinner" },
      { icon: "🤝", label: "Networking" },
    ],
    prompt: "Show me smart casual style — classic and minimal, elegant and chic, clean effortless look fr",
  },
];

/* ── Color hex map — used by ColorChip + product card swatches ─── */
const COLOR_HEX: Record<string, string> = {
  white:      "#FFFFFF",
  black:      "#1A1A1A",
  grey:       "#9CA3AF", gray: "#9CA3AF",
  brown:      "#8B5E3C",
  darkchocolate: "#3E2723",
  beige:      "#D4B996",
  cream:      "#F5F0E1",
  stone:      "#A8A29E",
  khaki:      "#A89968",
  tan:        "#C19A6B",
  camel:      "#C19A6B",
  pink:       "#EC4899",
  winepink:   "#B83280",
  peach:      "#FFB199",
  coral:      "#FF7F50",
  red:        "#DC2626",
  rust:       "#B7410E",
  wine:       "#722F37",
  burgundy:   "#800020",
  maroon:     "#800000",
  blue:       "#3B82F6",
  navy:       "#1E3A8A",
  midindigo:  "#34568B",
  indigo:     "#4F46E5",
  sky:        "#7DD3FC",
  lilac:      "#C8A2C8",
  lavender:   "#B57EDC",
  green:      "#22C55E",
  sage:       "#9CAF88",
  olive:      "#7A8450",
  mint:       "#98FF98",
  yellow:     "#FACC15",
  gold:       "#D4AF37",
  silver:     "#C0C0C0",
  orange:     "#F97316",
  cherry:     "#DE3163",
  multi:      "conic-gradient(from 0deg, #EC4899, #F97316, #FACC15, #22C55E, #3B82F6, #EC4899)",
  print:      "linear-gradient(135deg, #F87171 25%, #FBBF24 25%, #FBBF24 50%, #34D399 50%, #34D399 75%, #60A5FA 75%)",
  stripe:     "repeating-linear-gradient(90deg, #1A1A1A 0 5px, #FFFFFF 5px 10px)",
  striped:    "repeating-linear-gradient(90deg, #1A1A1A 0 5px, #FFFFFF 5px 10px)",
  floral:     "linear-gradient(135deg, #F472B6, #FBCFE8, #FCA5A5)",
  checked:    "repeating-conic-gradient(#1A1A1A 0% 25%, #FFFFFF 0% 50%) 50% / 8px 8px",
};

function colorBg(name: string): string {
  return COLOR_HEX[name.toLowerCase().replace(/[^a-z]/g, "")] ?? "#9CA3AF";
}

function ColorChip({ colors, size = 9 }: { colors?: string[]; size?: number }) {
  if (!colors || colors.length === 0) return null;
  const primary = colors[0];
  const bg = colorBg(primary);
  const label = colors.slice(0, 2).join(" / ");
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 9, color: MUTED, lineHeight: 1, fontFamily: "'Courier New',monospace", letterSpacing: 0.5 }}>
      <span
        title={label}
        style={{
          width: size, height: size, borderRadius: "50%",
          background: bg,
          border: primary.toLowerCase().includes("white") || primary.toLowerCase().includes("cream")
            ? "1px solid #d1d5db"
            : "1px solid rgba(0,0,0,0.08)",
          flexShrink: 0,
        }}
      />
      <span style={{ textTransform: "uppercase", fontWeight: 700 }}>{label}</span>
    </div>
  );
}

/* ── Types ───────────────────────────────────────────────────────── */
interface OutfitItem {
  sku: string;
  name: string;
  price: number;
  note: string;
  emoji: string;
  url: string;
  img?: string | null;
  colors?: string[];
  color_family?: string;
}

interface OutfitPair {
  top?: OutfitItem;
  bottom?: OutfitItem;
  dress?: OutfitItem;
  footwear?: OutfitItem;
  bag?: OutfitItem;
  sunglasses?: OutfitItem;
  necklace?: OutfitItem;
  hat?: OutfitItem;
  watch?: OutfitItem;
}

interface ChatData {
  type: "chat";
  message: string;
  quick_replies?: string[];
}

interface StyleNotes {
  aesthetic_name: string;
  vibe_summary:   string;
  color_story:    string;
  fit_balance:    string;
  accessory_note: string;
  day_to_night?:  string;
}

interface OutfitData {
  type: "outfit";
  message: string;
  occasion: string;
  vibe: string;
  outfit: OutfitPair;
  total: number;
  budget_note: string;
  next_question?: string;
  style_notes?: StyleNotes;
  /** Optional server-supplied follow-up chips. When present, overrides
   *  the default FOLLOWUP_CHIPS. Used by the purchase-intent fast path
   *  to surface cart-state-aware suggestions. */
  quick_replies?: string[];
}

interface LookEntry {
  look_number: number;
  label: string;
  occasion: string;
  vibe: string;
  outfit: OutfitPair;
  total: number;
  budget_note: string;
  style_notes?: StyleNotes;
}

interface MultiData {
  type: "multi";
  message: string;
  looks: LookEntry[];
  next_question?: string;
  /** Optional server-supplied follow-up chips. See OutfitData.quick_replies. */
  quick_replies?: string[];
}

interface ProductsApiItem {
  sku: string;
  name: string;
  price: number;
  img: string;
  url: string;
  category?: string;
  sizes?: string[];
  rating?: number;
  isNew?: boolean;
  colors?: string[];
  color_family?: string;
}

interface ProductsData {
  type: "products";
  message: string;
  category: string;
  gender?: string;
  next_question?: string;
  products?: ProductsApiItem[];
}

interface ReplaceOptionsData {
  type: "replace_options";
  message: string;
  replace_slot: string;
  locked_outfit?: Record<string, { sku: string; name?: string; price?: number }>;
  options: ProductsApiItem[];
  next_question?: string;
}

interface ImageAnalysisInfo {
  category: string;
  color: string;
  color_family?: string;
  pattern: string;
  style_type: string;
  material: string;
  fit: string;
  gender: string;
  season: string;
  aesthetic: string;
  description: string;
}

interface ImageLooksData {
  type: "image_looks";
  message: string;
  analysis: ImageAnalysisInfo;
  looks: LookEntry[];
  needs_gender?: boolean;
  anchor_info?: { role: string; type: string; excluded_roles: string[] };
  next_question?: string;
  quick_replies?: string[];
}

type ParsedResponse = ChatData | OutfitData | MultiData | ProductsData | ReplaceOptionsData | ImageLooksData;

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  parsed?: ParsedResponse | null;
}

/* ── Helper: filter catalogue by chat category string ─────────── */
function chatCategoryFilter(cat: string, gender: string) {
  const lower = cat.toLowerCase();
  return catalogueProducts.filter(p => {
    const pc = p.category.toLowerCase();
    const tags = (p.tags ?? []).map(t => t.toLowerCase());
    const catMatch = (() => {
      switch (lower) {
        case "tops": case "top":            return pc === "t-shirts" || pc === "tops";
        case "bottoms": case "bottom":      return pc === "bottoms" || pc === "skirts" || pc === "denims";
        case "dresses": case "dress":       return pc === "dresses";
        case "footwear": case "shoes":      return pc === "footwear";
        case "accessories": case "accessory":
          return pc === "accessories";
        // Fine-grained sub-categories — match Accessories + relevant tag
        case "bags": case "bag": case "handbag": case "handbags": case "clutch": case "purse":
          return pc === "accessories" && tags.some(t => t.includes("bag") || t.includes("clutch") || t.includes("purse"));
        case "necklaces": case "necklace": case "jewelry": case "jewellery": case "earrings": case "bracelet": case "bracelets":
          return pc === "accessories" && tags.some(t => t.includes("necklace") || t.includes("earring") || t.includes("bracelet") || t.includes("jewel"));
        case "sunglasses": case "eyewear":
          return pc === "accessories" && tags.some(t => t.includes("sunglass") || t.includes("eyewear"));
        case "watches": case "watch":
          return pc === "accessories" && tags.some(t => t.includes("watch"));
        case "hats": case "hat": case "cap":
          return pc === "accessories" && tags.some(t => t.includes("hat") || t.includes("cap"));
        default:                            return true;
      }
    })();
    const genderMatch = gender === "all" || gender === "" || p.gender === gender || p.gender === "unisex";
    return catMatch && genderMatch;
  });
}

/* ── Helper: build a Product from OutfitItem + optional DB lookup ── */
function buildProduct(item: OutfitItem, section: string): Product {
  // Check catalogue first (50+ products), then old 6-product list, then fallback
  return (
    catalogueProducts.find(p => p.id === item.sku) ??
    allProducts.find(p => p.id === item.sku) ?? {
      id: item.sku,
      name: item.name,
      brand: "Burnt Toast",
      price: item.price,
      image: item.img ?? "",
      category: section === "top" ? "Tops" : section === "bottom" ? "Bottoms" : section === "footwear" ? "Footwear" : "Accessories",
      tags: [],
      rating: 0,
      reviews: 0,
      sizes: ["XS", "S", "M", "L", "XL"],
      description: item.note,
    }
  );
}

/* ── Compact card — renders ALL outfit sections in one unified grid ── */
function CompactCard({ section, item, onRemove }: {
  section: string;
  item: OutfitItem;
  /** When provided, the card shows a ✕ button. Clicking calls this. */
  onRemove?: (section: string) => void;
}) {
  const meta = SECTION_META[section] ?? { label: section.toUpperCase(), color: ACCENT };
  const [imgError,    setImgError]    = useState(false);
  const [cartAdded,   setCartAdded]   = useState(false);
  const [showSizes,   setShowSizes]   = useState(false);
  const [pickedSize,  setPickedSize]  = useState<string | null>(null);
  const [removing,    setRemoving]    = useState(false);
  const [removeHover, setRemoveHover] = useState(false);
  const { addItem: addToCart, isInCart } = useCart();
  const { toggleItem, isWishlisted } = useWishlist();
  // Subscribe to broken-SKU updates so a card disappears if its image
  // fails AFTER first render somewhere else (e.g. shown again later).
  useBrokenSkus();

  if (!item?.name) return null;
  // Skip products that have no valid image URL or already errored.
  if (isHiddenProduct(item.sku, item.img)) return null;

  const product   = buildProduct(item, section);
  const inCart    = isInCart(item.sku);
  const wishlisted = isWishlisted(item.sku);

  // Only sized categories (tops, bottoms, dresses, footwear) need size selection.
  // Bags, jewellery, sunglasses, watches, hats, charms add directly with One-Size.
  const needsSize = needsSizeSelection(product.category, product.sizes);

  function addWithSize(size: string) {
    addToCart(product, size);
    setPickedSize(size);
    setCartAdded(true);
    setShowSizes(false);
    setTimeout(() => setCartAdded(false), 1800);
  }

  function handleCart(e: React.MouseEvent) {
    e.stopPropagation();
    if (cartAdded || inCart) return;
    if (needsSize) {
      setShowSizes(prev => !prev);   // toggle size picker
    } else {
      addWithSize(resolveDefaultSize(product.sizes));
    }
  }

  function handleWish(e: React.MouseEvent) {
    e.stopPropagation();
    toggleItem(product);
  }

  /** Remove this slot from the parent's outfit. Quick fade-out, no confirm dialog. */
  function handleRemoveClick(e: React.MouseEvent) {
    e.stopPropagation();
    if (!onRemove || removing) return;
    setRemoving(true);
    // 220ms fade-out matches the CSS transition below
    setTimeout(() => onRemove(section), 220);
  }

  /* primary color for the polaroid footer caption */
  const firstColor = item.colors?.[0];

  return (
    <div
      className="bt-card"
      style={{
        background: "#FFFFFF",
        border: `1px solid ${showSizes ? TEXT : BORDER}`,
        borderRadius: 10, overflow: "hidden",
        display: "flex", flexDirection: "column",
        cursor: "pointer",
        boxShadow: showSizes ? `0 0 0 2px rgba(26,26,26,0.10)` : "0 1px 3px rgba(0,0,0,0.04)",
        // Animate opacity + scale when the X button is pressed
        opacity:  removing ? 0 : 1,
        transform: removing ? "scale(0.94)" : undefined,
        pointerEvents: removing ? "none" : undefined,
        transition: "opacity 220ms ease, transform 220ms ease, box-shadow 0.15s, border-color 0.15s",
      }}
      onClick={() => !showSizes && item.url && window.open(item.url, "_blank", "noopener,noreferrer")}
      onMouseEnter={e => { if (!showSizes && !removing) { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 6px 18px rgba(0,0,0,0.08)"; e.currentTarget.style.borderColor = TEXT; }}}
      onMouseLeave={e => { if (!showSizes && !removing) { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.04)"; e.currentTarget.style.borderColor = BORDER; }}}
    >
      {/* (#4) Category caption above the image — magazine-style rule line
              The ✕ remove button sits flush right of this line when onRemove
              is provided, so the action visually belongs to the slot label
              ("remove this TOP") rather than to the image. */}
      <div style={{
        display: "flex", alignItems: "center", gap: 6,
        padding: "8px 10px 4px",
      }}>
        <span style={{
          fontFamily: "'JetBrains Mono','Courier New',monospace",
          fontSize: 8, fontWeight: 600, letterSpacing: 2,
          color: TEXT, whiteSpace: "nowrap",
        }}>— {meta.label}</span>
        <span style={{ flex: 1, height: 1, background: BORDER }} />
        {onRemove && (
          <button
            onClick={handleRemoveClick}
            onMouseEnter={() => setRemoveHover(true)}
            onMouseLeave={() => setRemoveHover(false)}
            aria-label={`Remove ${meta.label} from look`}
            title="Remove from look"
            style={{
              width: 22, height: 22, borderRadius: "50%",
              background: removeHover ? "#ef4444" : "transparent",
              color: removeHover ? "#fff" : MUTED,
              border: `1px solid ${removeHover ? "#ef4444" : BORDER}`,
              cursor: "pointer",
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
              marginLeft: 2,
              padding: 0,
              transition: "background 0.15s, color 0.15s, border-color 0.15s, transform 0.15s",
              transform: removeHover ? "scale(1.06)" : "scale(1)",
            }}
          >
            <X size={11} strokeWidth={2.5} />
          </button>
        )}
      </div>

      {/* Square image — uniform 1:1 ratio, soft cream stage so product pops */}
      <div style={{
        background: "#F5F1E8", position: "relative",
        width: "100%", paddingBottom: "100%", overflow: "hidden",
      }}>
        {item.img && !imgError ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.img} alt={item.name}
            className="bt-card-img"
            style={{
              position: "absolute", inset: 0, width: "100%", height: "100%",
              objectFit: "cover", objectPosition: "top center",
              transition: "transform 350ms cubic-bezier(0.16,1,0.3,1)",
            }}
            onError={() => { setImgError(true); markSkuBroken(item.sku); }}
          />
        ) : (
          <span style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", fontSize: 28 }}>
            {item.emoji}
          </span>
        )}

        {/* (#1) Hover ghost-preview overlay — VIEW DETAILS */}
        <div
          className="bt-card-overlay"
          style={{
            position: "absolute", left: 0, right: 0, bottom: 0,
            padding: "10px 12px",
            background: "linear-gradient(to top, rgba(26,26,26,0.78), rgba(26,26,26,0))",
            display: "flex", justifyContent: "space-between", alignItems: "center",
            color: "#FFFFFF",
            fontFamily: "'JetBrains Mono','Courier New',monospace",
            fontSize: 9, letterSpacing: 2, fontWeight: 600,
            opacity: 0, transform: "translateY(6px)",
            transition: "opacity 250ms ease, transform 250ms ease",
            pointerEvents: "none",
          }}
        >
          <span>VIEW DETAILS</span>
          <span style={{ fontSize: 13 }}>→</span>
        </div>

        {/* Wishlist button */}
        <button
          onClick={handleWish}
          aria-label="Toggle wishlist"
          style={{
            position: "absolute", top: 5, right: 5,
            width: 24, height: 24, borderRadius: "50%",
            background: "rgba(255,255,255,0.90)",
            border: "none", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 1px 4px rgba(0,0,0,0.15)",
          }}
        >
          <Heart size={11} fill={wishlisted ? "#ef4444" : "none"} color={wishlisted ? "#ef4444" : "#888"} />
        </button>

        {/* On-image color swatch removed for a cleaner editorial card */}
      </div>

      {/* (#3) Polaroid footer strip — film-roll caption with color dot + color name */}
      {firstColor && (
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8,
          padding: "6px 10px",
          background: "#FAFAF6",
          borderTop: `1px solid ${BORDER}`,
          fontFamily: "'JetBrains Mono','Courier New',monospace",
          fontSize: 8, letterSpacing: 1.5, color: MUTED, fontWeight: 600,
        }}>
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{
              width: 7, height: 7, borderRadius: "50%",
              background: colorBg(firstColor),
              border: /^(white|cream)$/i.test(firstColor) ? "1px solid #d1d5db" : "1px solid rgba(0,0,0,0.1)",
            }} />
            <span style={{ textTransform: "uppercase" }}>{firstColor}</span>
          </span>
          <span style={{ opacity: 0.6 }}>✦</span>
        </div>
      )}

      {/* Card body */}
      <div style={{ padding: "8px 10px 10px", display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
        <div style={{
          color: TEXT, fontWeight: 700, fontSize: 11, lineHeight: 1.3,
          overflow: "hidden", display: "-webkit-box",
          WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
        }}>{item.name}</div>
        <div style={{ color: TEXT, fontWeight: 800, fontSize: 13, fontFamily: "'JetBrains Mono','Courier New',monospace", letterSpacing: 0.3 }}>₹{item.price}</div>

        {/* ADD / ADDED button */}
        <button
          onClick={handleCart}
          style={{
            marginTop: "auto",
            width: "100%", padding: "8px 8px", borderRadius: 8,
            border: cartAdded || inCart || showSizes ? "none" : `1px solid ${BORDER}`,
            background: cartAdded || inCart ? TEXT : showSizes ? TEXT : "#FAFAF6",
            color: cartAdded || inCart || showSizes ? "#fff" : TEXT,
            fontSize: 9, fontWeight: 600,
            fontFamily: "'JetBrains Mono','Courier New',monospace", letterSpacing: 1.2,
            cursor: "pointer", transition: "all 0.2s",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
          }}
          onMouseEnter={e => { if (!cartAdded && !inCart && !showSizes) e.currentTarget.style.background = "#FFFFFF"; }}
          onMouseLeave={e => { if (!cartAdded && !inCart && !showSizes) e.currentTarget.style.background = "#FAFAF6"; }}
        >
          {cartAdded
            ? <><Check size={9} /> ADDED!</>
            : inCart
              ? <><Check size={9} /> IN CART</>
              : showSizes
                ? <>✕ CANCEL</>
                : needsSize
                  ? <><ShoppingBag size={9} /> SELECT SIZE</>
                  : <><ShoppingBag size={9} /> ADD</>
          }
        </button>

        {/* ── Inline size picker ── */}
        {showSizes && !cartAdded && (
          <div
            onClick={e => e.stopPropagation()}
            style={{ marginTop: 2 }}
          >
            <div style={{
              color: MUTED, fontSize: 8, fontWeight: 700,
              letterSpacing: 1.2, fontFamily: "'Courier New',monospace",
              marginBottom: 5,
            }}>PICK SIZE</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
              {product.sizes?.map(sz => (
                <button
                  key={sz}
                  onClick={e => { e.stopPropagation(); addWithSize(sz); }}
                  style={{
                    padding: "4px 8px", fontSize: 9, fontWeight: 700,
                    border: `1.5px solid ${pickedSize === sz ? meta.color : BORDER}`,
                    borderRadius: 5,
                    background: pickedSize === sz ? meta.color : BG,
                    color: pickedSize === sz ? "#fff" : TEXT,
                    cursor: "pointer",
                    fontFamily: "'Courier New',monospace",
                    transition: "all 0.15s",
                  }}
                  onMouseEnter={e => { if (pickedSize !== sz) { e.currentTarget.style.borderColor = meta.color; e.currentTarget.style.color = meta.color; }}}
                  onMouseLeave={e => { if (pickedSize !== sz) { e.currentTarget.style.borderColor = BORDER; e.currentTarget.style.color = TEXT; }}}
                >{sz}</button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Style Notes panel — the "WHY this works" stylist explanation ── */
function StyleNotesPanel({ notes }: { notes: StyleNotes }) {
  const lines: Array<{ icon: string; label: string; text: string }> = [
    { icon: "🎨", label: "COLOR STORY",   text: notes.color_story },
    { icon: "✂️",  label: "FIT BALANCE",   text: notes.fit_balance },
    { icon: "✨", label: "ACCESSORIES",   text: notes.accessory_note },
  ];
  if (notes.day_to_night) lines.push({ icon: "🌙", label: "DAY → NIGHT", text: notes.day_to_night });

  return (
    <div style={{
      background: "linear-gradient(135deg, #fff7ed 0%, #fef3f2 100%)",
      border: `1px solid ${BORDER}`,
      borderRadius: 12,
      padding: "12px 14px",
      display: "flex",
      flexDirection: "column",
      gap: 8,
    }}>
      {/* Aesthetic name banner */}
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        paddingBottom: 8, borderBottom: `1px solid ${BORDER}`,
      }}>
        <span style={{ fontSize: 16 }}>✦</span>
        <div style={{ flex: 1 }}>
          <div style={{
            color: TEXT, fontWeight: 900, fontSize: 13,
            fontFamily: "'Courier New',monospace", letterSpacing: 0.5,
          }}>
            {notes.aesthetic_name.toUpperCase()}
          </div>
          <div style={{ color: MUTED, fontSize: 11, lineHeight: 1.4, marginTop: 2, fontStyle: "italic" }}>
            {notes.vibe_summary}
          </div>
        </div>
      </div>

      {/* Reason lines */}
      {lines.map((line, i) => (
        <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
          <span style={{ fontSize: 13, marginTop: 1, flexShrink: 0 }}>{line.icon}</span>
          <div style={{ flex: 1 }}>
            <div style={{
              color: MUTED, fontSize: 8, fontWeight: 900, letterSpacing: 1.5,
              fontFamily: "'Courier New',monospace", marginBottom: 2,
            }}>
              {line.label}
            </div>
            <div style={{ color: TEXT, fontSize: 12, lineHeight: 1.55 }}>
              {line.text}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Virtual Try-On — per-outfit history persistence
   ─────────────────────────────────────────────────────────────────
   Stored in localStorage, keyed by outfit fingerprint (sorted SKUs).
   Best-effort: if quota is exceeded the in-memory state still works.
   Capped at 4 outfits × 2 versions (oldest outfit dropped first).
   ───────────────────────────────────────────────────────────────── */
const TRYON_STORAGE_KEY = "burnt_toast_tryon_history_v1";
const TRYON_MAX_VERSIONS = 2;
const TRYON_MAX_OUTFITS  = 4;

function fingerprintOutfit(outfit: TryOnOutfitMap): string {
  return Object.values(outfit)
    .map(i => i?.sku)
    .filter((s): s is string => !!s)
    .sort()
    .join("_");
}

function loadAllTryOnHistory(): Record<string, TryOnEntry[]> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(TRYON_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, TryOnEntry[]>) : {};
  } catch { return {}; }
}

function saveAllTryOnHistory(all: Record<string, TryOnEntry[]>) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(TRYON_STORAGE_KEY, JSON.stringify(all));
  } catch {
    // Quota or other write error — try shrinking by dropping the oldest outfit.
    try {
      const entries = Object.entries(all);
      if (entries.length > 1) {
        const shrunk = Object.fromEntries(entries.slice(-Math.max(1, entries.length - 1)));
        localStorage.setItem(TRYON_STORAGE_KEY, JSON.stringify(shrunk));
      }
    } catch {/* give up — in-memory state remains correct */}
  }
}

/* ── Single outfit block (reused in both outfit + multi) ─────────── */
function OutfitBlock({
  outfit, occasion, vibe, total, budget_note, label, style_notes, lookNumber, onRemoveSlot,
}: {
  outfit: OutfitPair;
  occasion: string;
  vibe: string;
  total: number;
  budget_note: string;
  label?: string;
  style_notes?: StyleNotes;
  lookNumber?: number;
  /** When provided, each card shows a ✕ button that calls this with the slot role. */
  onRemoveSlot?: (role: string) => void;
}) {
  // mute unused-var TS for style_notes (kept in API contract, hidden from UI)
  void style_notes;
  // Subscribe to broken-SKU updates so this block re-renders (and recomputes
  // visible keys + total) when an image fails to load.
  useBrokenSkus();
  // All available items in display order — every slot is its own key.
  // Order: dress first if present (replaces top+bottom), else top → bottom → rest.
  // Filter out slots whose product has no usable image / already-broken SKU.
  const allKeys = (["dress", "top", "bottom", "footwear", "bag", "sunglasses", "necklace", "hat", "watch"] as const)
    .filter(k => {
      const it = outfit?.[k];
      if (!it?.name) return false;
      if (isHiddenProduct(it.sku, it.img)) return false;
      return true;
    });

  // Recompute visible total from only the items we'll actually display.
  const visibleTotal = allKeys.reduce((sum, k) => sum + (outfit[k]?.price ?? 0), 0);

  // Items that need size selection — only sized categories (tops, bottoms,
  // dresses, footwear). Bags / jewellery / sunglasses skip the size step.
  const sizableKeys = allKeys.filter(k => {
    const it = outfit[k];
    if (!it) return false;
    const prod = buildProduct(it, k as string);
    return needsSizeSelection(prod.category, prod.sizes);
  });

  const { addItem: addToCart } = useCart();
  const [shopAdded,     setShopAdded]     = useState(false);
  const [showLookSizer, setShowLookSizer] = useState(false);
  const [lookSizes,     setLookSizes]     = useState<Record<string, string>>({});
  /* Virtual Try-On modal — opens only when a complete outfit exists */
  const [tryOnOpen,     setTryOnOpen]     = useState(false);
  const tryOnOutfit: TryOnOutfitMap = allKeys.reduce((acc, k) => {
    const it = outfit[k];
    if (it?.name) {
      acc[k] = {
        sku:          it.sku,
        name:         it.name,
        price:        it.price,
        note:         it.note,
        url:          it.url,
        img:          it.img ?? null,
        colors:       it.colors,
        color_family: it.color_family,
      };
    }
    return acc;
  }, {} as TryOnOutfitMap);

  /* ── Try-On history (per-outfit, max 2 versions) ───────────── */
  const tryOnFingerprint = fingerprintOutfit(tryOnOutfit);
  const [tryOnImages, setTryOnImages] = useState<TryOnEntry[]>([]);
  // Hydrate history from localStorage when the outfit identity changes
  useEffect(() => {
    if (!tryOnFingerprint) { setTryOnImages([]); return; }
    const all = loadAllTryOnHistory();
    setTryOnImages(all[tryOnFingerprint] ?? []);
  }, [tryOnFingerprint]);

  /** Append a new try-on. Slides oldest off when > 2 versions. */
  const appendTryOnImage = (entry: { imageUrl: string; caption: string }) => {
    const now = new Date().toISOString();
    setTryOnImages(prev => {
      const nextVersion = prev.length === 0 ? 1 : prev[prev.length - 1].version + 1;
      const newEntry: TryOnEntry = {
        version:   nextVersion,
        imageUrl:  entry.imageUrl,
        caption:   entry.caption,
        createdAt: now,
      };
      const merged = [...prev, newEntry].slice(-TRYON_MAX_VERSIONS);
      // Persist
      const all = loadAllTryOnHistory();
      all[tryOnFingerprint] = merged;
      // Cap stored outfits (oldest dropped)
      const keys = Object.keys(all);
      if (keys.length > TRYON_MAX_OUTFITS) {
        const trimmed: Record<string, TryOnEntry[]> = {};
        keys.slice(-TRYON_MAX_OUTFITS).forEach(k => { trimmed[k] = all[k]; });
        saveAllTryOnHistory(trimmed);
      } else {
        saveAllTryOnHistory(all);
      }
      return merged;
    });
  };

  const hasTryOn = tryOnImages.length > 0;

  // All sizable items have a size picked
  const allSizesPicked = sizableKeys.every(k => lookSizes[k]);

  function confirmAddLook() {
    allKeys.forEach(k => {
      const it = outfit[k];
      if (!it) return;
      const prod = buildProduct(it, k as string);
      const needsSize = needsSizeSelection(prod.category, prod.sizes);
      const size = needsSize
        ? (lookSizes[k] ?? prod.sizes?.[0] ?? "M")
        : resolveDefaultSize(prod.sizes);
      addToCart(prod, size);
    });
    setShopAdded(true);
    setShowLookSizer(false);
    setLookSizes({});
    setTimeout(() => setShopAdded(false), 2200);
  }

  function handleLookCartClick(e: React.MouseEvent) {
    e.stopPropagation();
    if (sizableKeys.length === 0) {
      // nothing needs sizing — add immediately
      confirmAddLook();
    } else {
      setShowLookSizer(prev => !prev);
    }
  }

  // lookNumber kept on the prop signature in case future UI wants to use it
  void lookNumber;

  return (
    <div style={{
      background: "#FFFFFF",
      border: `1px solid ${BORDER}`,
      borderRadius: 16, overflow: "hidden",
      boxShadow: "0 1px 2px rgba(0,0,0,0.03), 0 8px 24px rgba(0,0,0,0.04)",
    }}>
      {/* Label strip for multi-look */}
      {label && (
        <div style={{
          background: TEXT, color: "#FFFFFF",
          padding: "8px 16px", fontSize: 10, fontWeight: 600,
          letterSpacing: 2.5, fontFamily: "'JetBrains Mono','Courier New',monospace",
        }}>
          LOOK — {label.toUpperCase()}
        </div>
      )}

      <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 14 }}>
        {/* Occasion + vibe badges — ink/outline pair, no rainbow */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {occasion && (
            <span style={{
              background: TEXT, color: "#FFFFFF", fontSize: 9, fontWeight: 600,
              padding: "3px 10px", borderRadius: 999, letterSpacing: 2,
              fontFamily: "'JetBrains Mono','Courier New',monospace",
            }}>{occasion.toUpperCase()}</span>
          )}
          {vibe && (
            <span style={{
              border: `1px solid ${TEXT}`, color: TEXT, fontSize: 9, fontWeight: 600,
              padding: "3px 10px", borderRadius: 999, letterSpacing: 2,
              fontFamily: "'JetBrains Mono','Courier New',monospace",
            }}>{vibe}</span>
          )}
        </div>

        {/* ONE ROW — fixed order: top → bottom → footwear → bag → sunglasses → necklace */}
        {allKeys.length > 0 ? (
          <div style={{ overflowX: "auto", paddingBottom: 4 }}>
            <div style={{
              display: "grid",
              gridTemplateColumns: `repeat(${allKeys.length}, minmax(120px, 1fr))`,
              gap: 8,
              minWidth: allKeys.length * 128,
              alignItems: "start",
            }}>
              {allKeys.map(k => (
                <CompactCard
                  key={k}
                  section={k}
                  item={outfit[k]!}
                  onRemove={onRemoveSlot ? () => onRemoveSlot(k) : undefined}
                />
              ))}
            </div>
          </div>
        ) : (
          <div style={{ color: MUTED, fontSize: 12, textAlign: "center", padding: "12px 0" }}>
            No products in this look.
          </div>
        )}

        {/* Style notes panel intentionally hidden from chat UI
            (data still available in `style_notes` for internal logic) */}

        {/* ── Look-level size picker panel ── */}
        {showLookSizer && (
          <div style={{
            background: CARD, border: `1px solid ${BORDER}`,
            borderRadius: 12, padding: "14px 16px",
            display: "flex", flexDirection: "column", gap: 14,
          }}>
            <div style={{
              color: TEXT, fontWeight: 900, fontSize: 11,
              fontFamily: "'Courier New',monospace", letterSpacing: 1.5,
            }}>
              SELECT YOUR SIZES
            </div>

            {sizableKeys.map(k => {
              const it = outfit[k]!;
              const prod = buildProduct(it, k as string);
              const meta = SECTION_META[k] ?? { label: k.toUpperCase(), color: ACCENT };
              return (
                <div key={k}>
                  {/* Item header */}
                  <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 8 }}>
                    <span style={{
                      background: meta.color, color: "#fff",
                      fontSize: 7, fontWeight: 900, padding: "2px 7px",
                      borderRadius: 3, letterSpacing: 1.2,
                      fontFamily: "'Courier New',monospace",
                    }}>{meta.label}</span>
                    <span style={{ color: TEXT, fontSize: 11, fontWeight: 600 }}>{it.name}</span>
                    {lookSizes[k] && (
                      <span style={{
                        marginLeft: "auto", background: meta.color, color: "#fff",
                        fontSize: 9, fontWeight: 900, padding: "2px 8px", borderRadius: 20,
                        fontFamily: "'Courier New',monospace",
                      }}>✓ {lookSizes[k]}</span>
                    )}
                  </div>
                  {/* Size pills */}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {prod.sizes?.map(sz => (
                      <button
                        key={sz}
                        onClick={() => setLookSizes(prev => ({ ...prev, [k]: sz }))}
                        style={{
                          padding: "6px 12px", fontSize: 11, fontWeight: 700,
                          border: `1.5px solid ${lookSizes[k] === sz ? meta.color : BORDER}`,
                          borderRadius: 7,
                          background: lookSizes[k] === sz ? meta.color : BG,
                          color: lookSizes[k] === sz ? "#fff" : TEXT,
                          cursor: "pointer",
                          fontFamily: "'Courier New',monospace",
                          transition: "all 0.15s",
                        }}
                        onMouseEnter={e => { if (lookSizes[k] !== sz) { e.currentTarget.style.borderColor = meta.color; e.currentTarget.style.color = meta.color; }}}
                        onMouseLeave={e => { if (lookSizes[k] !== sz) { e.currentTarget.style.borderColor = BORDER; e.currentTarget.style.color = TEXT; }}}
                      >{sz}</button>
                    ))}
                  </div>
                </div>
              );
            })}

            {/* Confirm button */}
            <button
              onClick={allSizesPicked ? confirmAddLook : undefined}
              disabled={!allSizesPicked}
              style={{
                width: "100%", padding: "10px", borderRadius: 8, border: "none",
                background: allSizesPicked ? "#16a34a" : CARD,
                color: allSizesPicked ? "#fff" : MUTED,
                fontSize: 11, fontWeight: 900,
                fontFamily: "'Courier New',monospace", letterSpacing: 1,
                cursor: allSizesPicked ? "pointer" : "not-allowed",
                transition: "all 0.2s",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              }}
            >
              <ShoppingBag size={13} />
              {allSizesPicked ? "CONFIRM & ADD ALL TO CART" : `PICK ALL SIZES (${sizableKeys.filter(k => lookSizes[k]).length}/${sizableKeys.length} done)`}
            </button>
          </div>
        )}

        {/* Total + add-look-to-cart */}
        {allKeys.length > 0 && (
          <div style={{
            background: "#FAFAF6", border: `1px solid ${BORDER}`, borderRadius: 12,
            padding: "14px 16px", display: "flex",
            alignItems: "center", justifyContent: "space-between", gap: 8,
          }}>
            <div>
              <div style={{ color: MUTED, fontSize: 9, fontFamily: "'JetBrains Mono','Courier New',monospace", letterSpacing: 2.5, fontWeight: 600 }}>TOTAL</div>
              <div style={{ color: TEXT, fontSize: 24, fontWeight: 800, fontFamily: "'JetBrains Mono','Courier New',monospace", marginTop: 2 }}>
                ₹{(visibleTotal || total || 0).toLocaleString("en-IN")}
              </div>
              <div style={{ color: MUTED, fontSize: 11, marginTop: 2, fontStyle: "italic" }}>{budget_note}</div>
            </div>
            <div style={{ display: "flex", gap: 6, flexShrink: 0, flexWrap: "wrap", justifyContent: "flex-end" }}>
              {/* Try-On / View Try-On — only when a complete outfit exists.
                  When history exists, also shows a thumbnail preview to the LEFT
                  of the button that opens the same modal in view mode. */}
              {allKeys.length > 0 && (
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  {hasTryOn && tryOnImages[tryOnImages.length - 1]?.imageUrl && (
                    <button
                      onClick={e => { e.stopPropagation(); setTryOnOpen(true); }}
                      aria-label="View your virtual try-on"
                      title="View your try-on"
                      style={{
                        position: "relative",
                        width: 38, height: 38, padding: 0,
                        borderRadius: 8, overflow: "hidden",
                        border: `1px solid ${ACCENT}`,
                        cursor: "pointer", background: "#FFF",
                        flexShrink: 0,
                      }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={tryOnImages[tryOnImages.length - 1].imageUrl}
                        alt=""
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                      <span style={{
                        position: "absolute", bottom: 1, right: 1,
                        background: ACCENT, color: "#fff",
                        fontFamily: "'Courier New',monospace", fontSize: 7, fontWeight: 900,
                        padding: "1px 4px", borderRadius: 3, letterSpacing: 0.5,
                      }}>{tryOnImages.length}</span>
                    </button>
                  )}
                  <button
                    onClick={e => { e.stopPropagation(); setTryOnOpen(true); }}
                    aria-label={hasTryOn ? "View your virtual try-on" : "Try this look on virtually"}
                    style={{
                      background: hasTryOn ? ACCENT : "transparent",
                      color: hasTryOn ? "#fff" : ACCENT,
                      border: `1px solid ${ACCENT}`, borderRadius: 8,
                      padding: "8px 14px", fontSize: 11, fontWeight: 900,
                      cursor: "pointer", fontFamily: "'Courier New',monospace",
                      letterSpacing: 1, whiteSpace: "nowrap",
                      transition: "background 0.2s, color 0.2s",
                      display: "flex", alignItems: "center", gap: 6,
                    }}
                    onMouseEnter={e => {
                      if (hasTryOn) return;
                      e.currentTarget.style.background = ACCENT;
                      e.currentTarget.style.color = "#fff";
                    }}
                    onMouseLeave={e => {
                      if (hasTryOn) return;
                      e.currentTarget.style.background = "transparent";
                      e.currentTarget.style.color = ACCENT;
                    }}
                  >
                    <Camera size={13} /> {hasTryOn ? "VIEW TRY-ON" : "TRY IT ON"}
                  </button>
                </div>
              )}

              <button
                onClick={handleLookCartClick}
                style={{
                  background: shopAdded ? "#16a34a" : showLookSizer ? ACCENT : ACCENT,
                  color: "#fff", border: "none", borderRadius: 8,
                  padding: "9px 16px", fontSize: 11, fontWeight: 900,
                  cursor: "pointer", fontFamily: "'Courier New',monospace",
                  letterSpacing: 1, whiteSpace: "nowrap",
                  transition: "background 0.2s",
                  display: "flex", alignItems: "center", gap: 6,
                }}
              >
                {shopAdded
                  ? <><Check size={13} /> ADDED TO CART!</>
                  : showLookSizer
                    ? <>✕ CANCEL</>
                    : <><ShoppingBag size={13} /> SHOP THE LOOK</>
                }
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Virtual Try-On modal — mounted at outfit level so each look
          has its own modal state. Does not affect outfit data. */}
      <VirtualTryOnModal
        open={tryOnOpen}
        outfit={tryOnOutfit}
        images={tryOnImages}
        onClose={() => setTryOnOpen(false)}
        onNewImage={appendTryOnImage}
      />
    </div>
  );
}

/* ── Renderers ───────────────────────────────────────────────────── */

function ChatBubble({ data, onQuickReply }: { data: ChatData; onQuickReply: (t: string) => void }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{
        background: CARD, border: `1px solid ${BORDER}`,
        borderRadius: "4px 12px 12px 12px",
        padding: "12px 16px", color: TEXT, fontSize: 13, lineHeight: 1.75,
      }}>
        {data.message}
      </div>

      {/* Quick reply chips */}
      {data.quick_replies && data.quick_replies.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {data.quick_replies.map((qr, i) => (
            <button
              key={i}
              onClick={() => onQuickReply(qr)}
              style={{
                background: BG, border: `1px solid ${BORDER}`,
                borderRadius: 20, padding: "6px 12px",
                fontSize: 11, color: TEXT, cursor: "pointer",
                fontFamily: "'Segoe UI',sans-serif",
                transition: "all 0.15s",
              }}
              onMouseEnter={e => { e.currentTarget.style.background = ACCENT; e.currentTarget.style.color = "#fff"; e.currentTarget.style.borderColor = ACCENT; }}
              onMouseLeave={e => { e.currentTarget.style.background = BG; e.currentTarget.style.color = TEXT; e.currentTarget.style.borderColor = BORDER; }}
            >{qr}</button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Shared follow-up chips shown after every outfit / multi ─────── */
const FOLLOWUP_CHIPS = [
  "Show me more looks",
  "Different vibe",
  "Show me dresses",
  "Show me footwear",
  "More streetwear",
];

function FollowUpChips({ onQuickReply, chips }: { onQuickReply: (t: string) => void; chips?: string[] }) {
  // Use server-supplied chips when provided (e.g. cart-state-aware suggestions
  // from the purchase-intent fast path); otherwise fall back to the default
  // styling-only chips shared across all outfit responses.
  const items = chips && chips.length > 0 ? chips : FOLLOWUP_CHIPS;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
      {items.map((chip, i) => (
        <button
          key={i}
          onClick={() => onQuickReply(chip)}
          style={{
            background: BG, border: `1px solid ${BORDER}`,
            borderRadius: 20, padding: "6px 12px",
            fontSize: 11, color: TEXT, cursor: "pointer",
            fontFamily: "'Segoe UI',sans-serif",
            transition: "all 0.15s",
          }}
          onMouseEnter={e => { e.currentTarget.style.background = ACCENT; e.currentTarget.style.color = "#fff"; e.currentTarget.style.borderColor = ACCENT; }}
          onMouseLeave={e => { e.currentTarget.style.background = BG; e.currentTarget.style.color = TEXT; e.currentTarget.style.borderColor = BORDER; }}
        >{chip}</button>
      ))}
    </div>
  );
}

/* ── Analysis badges — show what AI detected from the image ─────── */
function AnalysisBadges({ analysis }: { analysis: ImageAnalysisInfo }) {
  const badges = [
    { label: analysis.category, icon: "📦" },
    { label: analysis.color, icon: "🎨" },
    { label: analysis.pattern, icon: "🔲" },
    { label: analysis.style_type, icon: "✨" },
    { label: analysis.material, icon: "🧵" },
    { label: analysis.fit, icon: "📐" },
    { label: analysis.season, icon: "🌤️" },
  ].filter(b => b.label && b.label !== "unknown");

  return (
    <div style={{
      display: "flex", flexWrap: "wrap", gap: 5, padding: "10px 0",
    }}>
      {badges.map((b, i) => (
        <span key={i} style={{
          background: "#FFFFFF", border: `1px solid ${BORDER}`,
          borderRadius: 20, padding: "4px 10px",
          fontSize: 10, color: TEXT, fontWeight: 600,
          fontFamily: "'JetBrains Mono','Courier New',monospace",
          letterSpacing: 0.8,
          display: "flex", alignItems: "center", gap: 4,
        }}>
          <span style={{ fontSize: 11 }}>{b.icon}</span>
          {b.label.toUpperCase()}
        </span>
      ))}
    </div>
  );
}

/* ── Image Looks renderer — shows AI analysis + multiple styled looks ── */
function ImageLooksRenderer({ data, onQuickReply, onRemoveSlot }: {
  data: ImageLooksData;
  onQuickReply: (t: string) => void;
  onRemoveSlot?: (lookIndex: number, role: string) => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Stylist message */}
      <div style={{
        background: "linear-gradient(135deg, #fff7ed 0%, #fef3f2 100%)",
        border: `1px solid ${BORDER}`,
        borderRadius: 14, padding: "14px 18px",
        color: TEXT, fontSize: 14, lineHeight: 1.75,
        boxShadow: "0 1px 2px rgba(0,0,0,0.02)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <Camera size={16} color={TEXT} />
          <span style={{
            fontFamily: "'JetBrains Mono','Courier New',monospace",
            fontSize: 9, fontWeight: 900, letterSpacing: 2.5, color: MUTED,
          }}>IMAGE ANALYSIS</span>
        </div>
        {data.message}
      </div>

      {/* Gender selection needed */}
      {data.needs_gender && data.quick_replies && (
        <div style={{
          display: "flex", flexDirection: "column", gap: 10,
          background: "#fffbeb", border: `1px solid #f59e0b`,
          borderRadius: 12, padding: 16,
        }}>
          <span style={{ fontSize: 13, color: TEXT, fontWeight: 500 }}>
            {data.next_question || "Are we styling this for men or women?"}
          </span>
          <div style={{ display: "flex", gap: 8 }}>
            {data.quick_replies.map((label) => (
              <button
                key={label}
                onClick={() => onQuickReply(label)}
                style={{
                  padding: "8px 18px", borderRadius: 20, border: `1px solid ${BORDER}`,
                  background: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600,
                  color: TEXT, transition: "all 0.15s",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "#fef3c7"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "#fff"; }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Section divider + outfit looks (only when we have looks) */}
      {data.looks && data.looks.length > 0 && (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ flex: 1, height: 1, background: BORDER }} />
            <span style={{ color: MUTED, fontSize: 9, fontWeight: 900, letterSpacing: 3, fontFamily: "'Courier New',monospace" }}>
              COMPLETE THE LOOK
            </span>
            <div style={{ flex: 1, height: 1, background: BORDER }} />
          </div>

          {data.looks.map((look, i) => (
            <OutfitBlock
              key={i}
              outfit={look.outfit}
              occasion={look.occasion}
              vibe={look.vibe}
              total={look.total}
              budget_note={look.budget_note}
              label={look.label}
              style_notes={look.style_notes}
              lookNumber={look.look_number}
              onRemoveSlot={onRemoveSlot ? (role) => onRemoveSlot(i, role) : undefined}
            />
          ))}
        </>
      )}

      {/* Follow-up question */}
      {data.next_question && (
        <div style={{
          color: MUTED, fontSize: 12, fontStyle: "italic",
          padding: "8px 14px", borderLeft: `3px solid ${BORDER}`, lineHeight: 1.6,
        }}>{data.next_question}</div>
      )}

      <FollowUpChips onQuickReply={onQuickReply} />
    </div>
  );
}

function OutfitRenderer({ data, onQuickReply, onRemoveSlot }: {
  data: OutfitData;
  onQuickReply: (t: string) => void;
  /** Called when the user clicks ✕ on a card. Receives the slot role. */
  onRemoveSlot?: (role: string) => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{
        background: "#FFFFFF", border: `1px solid ${BORDER}`,
        borderRadius: 14, padding: "14px 18px",
        color: TEXT, fontSize: 14, lineHeight: 1.75,
        boxShadow: "0 1px 2px rgba(0,0,0,0.02)",
      }}>{data.message}</div>

      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ flex: 1, height: 1, background: BORDER }} />
        <span style={{ color: MUTED, fontSize: 9, fontWeight: 900, letterSpacing: 3, fontFamily: "'Courier New',monospace" }}>
          TOASTIE&apos;S PICK FOR YOU
        </span>
        <div style={{ flex: 1, height: 1, background: BORDER }} />
      </div>

      <OutfitBlock
        outfit={data.outfit}
        occasion={data.occasion}
        vibe={data.vibe}
        total={data.total}
        budget_note={data.budget_note}
        style_notes={data.style_notes}
        lookNumber={1}
        onRemoveSlot={onRemoveSlot}
      />

      {data.next_question && (
        <div style={{
          color: MUTED, fontSize: 12, fontStyle: "italic",
          padding: "8px 14px", borderLeft: `3px solid ${BORDER}`, lineHeight: 1.6,
        }}>{data.next_question}</div>
      )}

      <FollowUpChips onQuickReply={onQuickReply} chips={data.quick_replies} />
    </div>
  );
}

function MultiRenderer({ data, onQuickReply, onRemoveSlot }: {
  data: MultiData;
  onQuickReply: (t: string) => void;
  /** Called when the user clicks ✕ on a card. Receives the look index + slot role. */
  onRemoveSlot?: (lookIndex: number, role: string) => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{
        background: "#FFFFFF", border: `1px solid ${BORDER}`,
        borderRadius: 14, padding: "14px 18px",
        color: TEXT, fontSize: 14, lineHeight: 1.75,
        boxShadow: "0 1px 2px rgba(0,0,0,0.02)",
      }}>{data.message}</div>

      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ flex: 1, height: 1, background: BORDER }} />
        <span style={{ color: MUTED, fontSize: 9, fontWeight: 900, letterSpacing: 3, fontFamily: "'Courier New',monospace" }}>
          {data.looks?.length ?? 0} LOOKS BY TOASTIE
        </span>
        <div style={{ flex: 1, height: 1, background: BORDER }} />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {(data.looks ?? []).map((look, i) => (
          <OutfitBlock
            key={look.look_number}
            outfit={look.outfit}
            occasion={look.occasion}
            vibe={look.vibe}
            total={look.total}
            budget_note={look.budget_note}
            label={look.label}
            style_notes={look.style_notes}
            lookNumber={look.look_number ?? i + 1}
            onRemoveSlot={onRemoveSlot ? (role) => onRemoveSlot(i, role) : undefined}
          />
        ))}
      </div>

      {data.next_question && (
        <div style={{
          color: MUTED, fontSize: 12, fontStyle: "italic",
          padding: "8px 14px", borderLeft: `3px solid ${BORDER}`, lineHeight: 1.6,
        }}>{data.next_question}</div>
      )}

      <FollowUpChips onQuickReply={onQuickReply} chips={data.quick_replies} />
    </div>
  );
}

/* ── Mini catalogue card for in-chat product browsing ─────────── */
function MiniProductCard({ product }: { product: Product & { colors?: string[]; url?: string } }) {
  const { addItem, isInCart } = useCart();
  const { toggleItem, isWishlisted } = useWishlist();
  const [added, setAdded] = useState(false);
  const [showSizes, setShowSizes] = useState(false);
  const [imgError, setImgError] = useState(false);
  useBrokenSkus();
  const sizeList = product.sizes ?? [];
  // Only sized categories (tops, bottoms, dresses, footwear) get the picker.
  // Accessories (bags, jewellery, sunglasses, watches, hats) add directly.
  const needsSize = needsSizeSelection(product.category, sizeList) && sizeList.length > 1;
  const inCart = isInCart(product.id);
  const wished = isWishlisted(product.id);
  const productColors = product.colors;

  // Skip products without a usable image URL or already-known-broken SKUs.
  if (isHiddenProduct(product.id, product.image)) return null;

  function addWithSize(sz: string) {
    addItem(product, sz);
    setAdded(true);
    setShowSizes(false);
    setTimeout(() => setAdded(false), 1800);
  }

  function handleCart(e: React.MouseEvent) {
    e.stopPropagation();
    if (added || inCart) return;
    if (needsSize) { setShowSizes(p => !p); } else { addWithSize(resolveDefaultSize(sizeList)); }
  }

  return (
    <div
      style={{
        background: BG, border: `1px solid ${showSizes ? ACCENT : BORDER}`, borderRadius: 10,
        overflow: "hidden", display: "flex", flexDirection: "column",
        cursor: "pointer", minWidth: 130, maxWidth: 150,
        transition: "transform 0.15s, box-shadow 0.15s",
      }}
      onClick={() => {
        if (showSizes) return;
        const externalUrl = (product as Product & { url?: string }).url;
        const target = externalUrl || `/product/${product.id}`;
        window.open(target, "_blank", "noopener,noreferrer");
      }}
      onMouseEnter={e => { if (!showSizes) { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 5px 16px rgba(0,0,0,0.10)"; } }}
      onMouseLeave={e => { if (!showSizes) { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = ""; } }}
    >
      {/* Image */}
      <div style={{ position: "relative", width: "100%", paddingBottom: "120%", background: CARD, overflow: "hidden" }}>
        {product.image && !imgError ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.image} alt={product.name}
            onError={() => { setImgError(true); markSkuBroken(product.id); }}
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }} />
        ) : (
          <span style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", fontSize: 24 }}>👚</span>
        )}
        {/* Wishlist */}
        <button onClick={e => { e.stopPropagation(); toggleItem(product); }}
          style={{ position: "absolute", top: 5, right: 5, width: 22, height: 22, borderRadius: "50%", background: "rgba(255,255,255,0.9)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Heart size={10} fill={wished ? "#ef4444" : "none"} color={wished ? "#ef4444" : "#888"} />
        </button>
        {product.isNew && (
          <span style={{ position: "absolute", top: 5, left: 5, background: ACCENT, color: "#fff", fontSize: 7, fontWeight: 900, padding: "2px 5px", borderRadius: 3, fontFamily: "'Courier New',monospace", letterSpacing: 1 }}>NEW</span>
        )}
        {/* Color swatch — bottom-left over image */}
        {productColors && productColors.length > 0 && (
          <div
            title={productColors.join(" / ")}
            style={{
              position: "absolute", bottom: 5, left: 5,
              display: "flex", alignItems: "center", gap: 3,
              background: "rgba(255,255,255,0.92)",
              padding: "2px 5px 2px 3px", borderRadius: 10,
              boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
            }}
          >
            <span style={{
              width: 7, height: 7, borderRadius: "50%",
              background: colorBg(productColors[0]),
              border: /^(white|cream)$/i.test(productColors[0]) ? "1px solid #d1d5db" : "1px solid rgba(0,0,0,0.1)",
            }} />
            <span style={{ fontSize: 7, fontWeight: 800, color: "#111", letterSpacing: 0.3, textTransform: "uppercase", fontFamily: "'Courier New',monospace" }}>
              {productColors[0]}
            </span>
          </div>
        )}
      </div>
      {/* Body */}
      <div style={{ padding: "7px 8px 9px", display: "flex", flexDirection: "column", gap: 3, flex: 1 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: TEXT, lineHeight: 1.3, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{product.name}</div>
        <ColorChip colors={productColors} size={8} />
        <div style={{ fontSize: 12, fontWeight: 900, color: ACCENT, fontFamily: "'Courier New',monospace" }}>₹{product.price.toLocaleString("en-IN")}</div>
        <button onClick={handleCart}
          style={{ marginTop: "auto", width: "100%", padding: "5px 6px", borderRadius: 5, border: "none", background: added || inCart ? "#16a34a" : showSizes ? ACCENT : "#f3f4f6", color: added || inCart || showSizes ? "#fff" : TEXT, fontSize: 8, fontWeight: 700, cursor: "pointer", fontFamily: "'Courier New',monospace", letterSpacing: 0.8, display: "flex", alignItems: "center", justifyContent: "center", gap: 3 }}>
          {added ? <><Check size={8} /> ADDED!</> : inCart ? <><Check size={8} /> IN CART</> : showSizes ? <>✕ CANCEL</> : needsSize ? <><ShoppingBag size={8} /> SELECT SIZE</> : <><ShoppingBag size={8} /> ADD</>}
        </button>
        {showSizes && !added && (
          <div onClick={e => e.stopPropagation()} style={{ display: "flex", flexWrap: "wrap", gap: 3, marginTop: 2 }}>
            {sizeList.map(sz => (
              <button key={sz} onClick={e => { e.stopPropagation(); addWithSize(sz); }}
                style={{ padding: "3px 6px", fontSize: 8, fontWeight: 700, border: `1px solid ${BORDER}`, borderRadius: 4, background: BG, color: TEXT, cursor: "pointer", fontFamily: "'Courier New',monospace" }}>
                {sz}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Products renderer — in-chat catalogue browsing ──────────── */
function ProductsRenderer({ data, onQuickReply }: { data: ProductsData; onQuickReply: (t: string) => void }) {
  useBrokenSkus();
  // Prefer API-provided products (engine output) — they include the burnt-toast.com URL.
  // Fallback to local catalogue filter if API didn't provide any.
  type ProductWithExtras = Product & { url?: string; colors?: string[] };
  const allResults: ProductWithExtras[] = data.products && data.products.length > 0
    ? data.products.map(p => ({
        id: p.sku,
        name: p.name,
        brand: "Burnt Toast",
        price: p.price,
        image: p.img,
        category: p.category ?? "",
        tags: [],
        rating: p.rating ?? 4.5,
        reviews: 0,
        isNew: p.isNew,
        sizes: p.sizes ?? ["XS", "S", "M", "L", "XL"],
        description: "",
        url: p.url,
        colors: p.colors ?? [],
      } as ProductWithExtras))
    : (chatCategoryFilter(data.category ?? "all", data.gender ?? "all").slice(0, 12)
        .map(p => ({ ...p, colors: p.color ?? [] } as ProductWithExtras)));
  // Hide any product without a usable image URL or already-known-broken.
  const results = allResults.filter(p => !isHiddenProduct(p.id, p.image));

  const catLabel = data.category === "all" ? "Collection" : data.category;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {/* Message bubble */}
      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: "4px 12px 12px 12px", padding: "12px 16px", color: TEXT, fontSize: 13, lineHeight: 1.75 }}>
        {data.message}
      </div>

      {/* Divider */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ flex: 1, height: 1, background: BORDER }} />
        <span style={{ color: MUTED, fontSize: 9, fontWeight: 900, letterSpacing: 3, fontFamily: "'Courier New',monospace", whiteSpace: "nowrap" }}>
          {results.length} {catLabel.toUpperCase()} PIECES
        </span>
        <div style={{ flex: 1, height: 1, background: BORDER }} />
      </div>

      {/* Horizontal scroll grid */}
      <div style={{ overflowX: "auto", paddingBottom: 6 }}>
        <div style={{ display: "flex", gap: 8, minWidth: "max-content" }}>
          {results.map(p => <MiniProductCard key={p.id} product={p} />)}
        </div>
      </div>

      {/* View all link */}
      <a href="/#collection" style={{ display: "inline-flex", alignItems: "center", gap: 5, color: ACCENT, fontSize: 11, fontWeight: 700, fontFamily: "'Courier New',monospace", letterSpacing: 1, textDecoration: "none", alignSelf: "flex-start" }}>
        VIEW ALL IN SHOP →
      </a>

      {data.next_question && (
        <div style={{ color: MUTED, fontSize: 12, fontStyle: "italic", padding: "8px 14px", borderLeft: `3px solid ${BORDER}`, lineHeight: 1.6 }}>
          {data.next_question}
        </div>
      )}

      <FollowUpChips onQuickReply={onQuickReply} />
    </div>
  );
}

/* ── Replace-options renderer — 3-4 alternative cards for one slot ──
   User taps a card → onSelectReplacement fires → API confirms swap and
   the updated full outfit appears as the next chat message.
   ───────────────────────────────────────────────────────────────── */
function ReplaceOptionsRenderer({
  data,
  onQuickReply,
  onSelectReplacement,
}: {
  data: ReplaceOptionsData;
  onQuickReply: (t: string) => void;
  onSelectReplacement: (slot: string, sku: string, name: string) => void;
}) {
  useBrokenSkus();
  const slotMeta = SECTION_META[data.replace_slot] ?? { label: data.replace_slot.toUpperCase(), color: ACCENT };
  const lockedRoles = Object.keys(data.locked_outfit ?? {});
  // Filter out options without a valid image or with a broken SKU.
  const visibleOptions = data.options.filter(p => !isHiddenProduct(p.sku, p.img));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {/* Message bubble */}
      <div style={{
        background: CARD, border: `1px solid ${BORDER}`,
        borderRadius: "4px 12px 12px 12px",
        padding: "12px 16px", color: TEXT, fontSize: 13, lineHeight: 1.65,
      }}>
        {data.message}
      </div>

      {/* "Keeping these" tags */}
      {lockedRoles.length > 0 && (
        <div style={{
          display: "flex", flexWrap: "wrap", alignItems: "center", gap: 5,
          padding: "6px 10px", background: "#f0fdf4",
          border: "1px solid #bbf7d0", borderRadius: 8,
        }}>
          <span style={{ color: "#15803d", fontSize: 9, fontWeight: 900, fontFamily: "'Courier New',monospace", letterSpacing: 1 }}>
            ✓ KEEPING
          </span>
          {lockedRoles.map(role => {
            const meta = SECTION_META[role] ?? { label: role.toUpperCase(), color: MUTED };
            return (
              <span key={role} style={{
                background: meta.color, color: "#fff",
                fontSize: 8, fontWeight: 900, padding: "2px 7px", borderRadius: 3,
                letterSpacing: 1, fontFamily: "'Courier New',monospace",
              }}>
                {meta.label}
              </span>
            );
          })}
        </div>
      )}

      {/* Divider */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ flex: 1, height: 1, background: BORDER }} />
        <span style={{ color: slotMeta.color, fontSize: 9, fontWeight: 900, letterSpacing: 3, fontFamily: "'Courier New',monospace", whiteSpace: "nowrap" }}>
          {visibleOptions.length} NEW {slotMeta.label} OPTIONS
        </span>
        <div style={{ flex: 1, height: 1, background: BORDER }} />
      </div>

      {/* Option cards — horizontal scroll */}
      <div style={{ overflowX: "auto", paddingBottom: 6 }}>
        <div style={{ display: "flex", gap: 8, minWidth: "max-content" }}>
          {visibleOptions.map(p => (
            <ReplaceOptionCard
              key={p.sku}
              product={p}
              slotColor={slotMeta.color}
              onChoose={() => onSelectReplacement(data.replace_slot, p.sku, p.name)}
            />
          ))}
        </div>
      </div>

      {data.next_question && (
        <div style={{ color: MUTED, fontSize: 12, fontStyle: "italic", padding: "8px 14px", borderLeft: `3px solid ${BORDER}`, lineHeight: 1.6 }}>
          {data.next_question}
        </div>
      )}

      <FollowUpChips onQuickReply={onQuickReply} />
    </div>
  );
}

function ReplaceOptionCard({
  product,
  slotColor,
  onChoose,
}: {
  product: ProductsApiItem;
  slotColor: string;
  onChoose: () => void;
}) {
  const [imgError, setImgError] = useState(false);
  useBrokenSkus();
  const { toggleItem, isWishlisted } = useWishlist();
  const wished = isWishlisted(product.sku);

  // Hide cards with no valid image or whose image already failed elsewhere.
  if (isHiddenProduct(product.sku, product.img)) return null;

  function openOriginal(e: React.MouseEvent) {
    e.stopPropagation();
    window.open(product.url, "_blank", "noopener,noreferrer");
  }

  return (
    <div
      onClick={onChoose}
      style={{
        background: BG, border: `2px solid ${BORDER}`, borderRadius: 10,
        overflow: "hidden", display: "flex", flexDirection: "column",
        minWidth: 145, maxWidth: 170, cursor: "pointer",
        transition: "transform 0.15s, box-shadow 0.15s, border-color 0.15s",
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = "0 6px 18px rgba(0,0,0,0.12)"; e.currentTarget.style.borderColor = slotColor; }}
      onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = ""; e.currentTarget.style.borderColor = BORDER; }}
    >
      <div style={{ height: 3, background: slotColor }} />
      <div style={{ position: "relative", width: "100%", paddingBottom: "120%", background: CARD, overflow: "hidden" }}>
        {product.img && !imgError ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.img} alt={product.name}
            onError={() => { setImgError(true); markSkuBroken(product.sku); }}
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }} />
        ) : (
          <span style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", fontSize: 24 }}>👚</span>
        )}
        {/* Wishlist */}
        <button onClick={e => { e.stopPropagation(); toggleItem({ id: product.sku, name: product.name, brand: "Burnt Toast", price: product.price, image: product.img, category: "", tags: [], rating: 0, reviews: 0, sizes: product.sizes ?? [], description: "" }); }}
          style={{ position: "absolute", top: 5, right: 5, width: 22, height: 22, borderRadius: "50%", background: "rgba(255,255,255,0.92)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Heart size={10} fill={wished ? "#ef4444" : "none"} color={wished ? "#ef4444" : "#888"} />
        </button>
        {/* Color swatch */}
        {product.colors && product.colors.length > 0 && (
          <div style={{ position: "absolute", bottom: 5, left: 5, display: "flex", alignItems: "center", gap: 3, background: "rgba(255,255,255,0.92)", padding: "2px 5px 2px 3px", borderRadius: 10, boxShadow: "0 1px 3px rgba(0,0,0,0.15)" }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: colorBg(product.colors[0]), border: /^(white|cream)$/i.test(product.colors[0]) ? "1px solid #d1d5db" : "1px solid rgba(0,0,0,0.1)" }} />
            <span style={{ fontSize: 7, fontWeight: 800, color: "#111", letterSpacing: 0.3, textTransform: "uppercase", fontFamily: "'Courier New',monospace" }}>{product.colors[0]}</span>
          </div>
        )}
      </div>
      <div style={{ padding: "7px 8px 9px", display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: TEXT, lineHeight: 1.3, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{product.name}</div>
        <div style={{ fontSize: 12, fontWeight: 900, color: slotColor, fontFamily: "'Courier New',monospace" }}>₹{product.price.toLocaleString("en-IN")}</div>
        <button onClick={(e) => { e.stopPropagation(); onChoose(); }}
          style={{ marginTop: "auto", width: "100%", padding: "6px 6px", borderRadius: 6, border: "none", background: slotColor, color: "#fff", fontSize: 9, fontWeight: 900, cursor: "pointer", fontFamily: "'Courier New',monospace", letterSpacing: 0.8, display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
          ✓ CHOOSE THIS
        </button>
        <button onClick={openOriginal}
          style={{ width: "100%", padding: "4px 6px", borderRadius: 5, border: `1px solid ${BORDER}`, background: BG, color: MUTED, fontSize: 8, fontWeight: 700, cursor: "pointer", fontFamily: "'Courier New',monospace", letterSpacing: 0.6 }}>
          👀 VIEW MORE
        </button>
      </div>
    </div>
  );
}

/* ── Smart dispatcher ────────────────────────────────────────────── */
function ResponseRenderer({
  data, onQuickReply, onSelectReplacement, onRemoveSlot,
}: {
  data: ParsedResponse;
  onQuickReply: (t: string) => void;
  onSelectReplacement: (slot: string, sku: string, name: string) => void;
  /**
   * Called when the user clicks ✕ on a card in this message.
   * For single-look responses (OutfitRenderer) lookIndex is null.
   * For multi-look responses (Multi / ImageLooks) lookIndex identifies the look.
   */
  onRemoveSlot?: (lookIndex: number | null, role: string) => void;
}) {
  if (data.type === "chat") return <ChatBubble data={data} onQuickReply={onQuickReply} />;
  if (data.type === "image_looks") return <ImageLooksRenderer data={data} onQuickReply={onQuickReply} onRemoveSlot={onRemoveSlot ? (i, r) => onRemoveSlot(i, r) : undefined} />;
  if (data.type === "multi") return <MultiRenderer data={data} onQuickReply={onQuickReply} onRemoveSlot={onRemoveSlot ? (i, r) => onRemoveSlot(i, r) : undefined} />;
  if (data.type === "products") return <ProductsRenderer data={data as ProductsData} onQuickReply={onQuickReply} />;
  if (data.type === "replace_options") return <ReplaceOptionsRenderer data={data} onQuickReply={onQuickReply} onSelectReplacement={onSelectReplacement} />;
  return <OutfitRenderer data={data as OutfitData} onQuickReply={onQuickReply} onRemoveSlot={onRemoveSlot ? (r) => onRemoveSlot(null, r) : undefined} />;
}

/* ── Parse helper ────────────────────────────────────────────────── */
function parseRaw(raw: string): ParsedResponse | null {
  if (!raw || !raw.trim()) return null;
  try {
    // 1. Strip markdown fences
    const stripped = raw
      .trim()
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/, "")
      .trim();

    // 2. Try to extract a JSON object — greedy from first { to last }
    const match = stripped.match(/\{[\s\S]*\}/);
    if (!match) return null;
    const jsonStr = match[0];

    // 3. Parse and normalise missing type field
    const obj = JSON.parse(jsonStr);

    if (!obj.type) {
      if (Array.isArray(obj.looks)) obj.type = "multi";
      else if (obj.outfit) obj.type = "outfit";
      else obj.type = "chat";
    }

    return obj as ParsedResponse;
  } catch {
    return null;
  }
}

/* ── Main component ──────────────────────────────────────────────── */
/* ── Session memory: outfit state + user profile across turns ── */
interface ImageContext {
  category: string;
  color: string;
  color_family?: string;
  pattern: string;
  style_type: string;
  material: string;
  fit: string;
  gender: string;
  season: string;
  aesthetic: string;
  description: string;
}

interface SessionState {
  currentOutfit: Record<string, { sku: string; name?: string; price?: number }>;
  userProfile: {
    gender?: string;
    occasion?: string;
    vibe?: string;
    color?: string;
    budget?: number;
  };
  rejectedSkus: string[];
  likedSkus: string[];
  /** Set when the user uploaded an anchor item — we build looks AROUND it. */
  anchor?: {
    type: string;
    role: string;
    excluded_roles: string[];
    description?: string;
  } | null;
  /** Persistent image analysis — stays active until user uploads new image or starts new chat. */
  imageContext?: ImageContext | null;
  /** Tracks the mode: null = normal text chat, "image_styling" = anchor-based outfit completion. */
  mode?: "image_styling" | null;
}

const EMPTY_SESSION: SessionState = {
  currentOutfit: {},
  userProfile: {},
  rejectedSkus: [],
  likedSkus: [],
  anchor: null,
  imageContext: null,
  mode: null,
};

/** Pull the latest outfit and profile bits from a parsed assistant response */
function deriveSessionUpdate(parsed: ParsedResponse, prev: SessionState): SessionState {
  const next: SessionState = {
    currentOutfit: { ...prev.currentOutfit },
    userProfile: { ...prev.userProfile },
    rejectedSkus: [...prev.rejectedSkus],
    likedSkus: [...prev.likedSkus],
    anchor: prev.anchor ?? null,         // PRESERVE anchor across chat turns
    imageContext: prev.imageContext ?? null,  // PRESERVE image context across turns
    mode: prev.mode ?? null,                 // PRESERVE mode across turns
  };
  // OUTFIT → store all slots as current
  if (parsed.type === "outfit") {
    const outfit = parsed.outfit ?? {};
    const newOutfit: SessionState["currentOutfit"] = {};
    for (const role of Object.keys(outfit) as Array<keyof OutfitPair>) {
      const item = outfit[role];
      if (item?.sku) newOutfit[role as string] = { sku: item.sku, name: item.name, price: item.price };
    }
    next.currentOutfit = newOutfit;
    if (parsed.occasion) next.userProfile.occasion = parsed.occasion;
    if (parsed.vibe)     next.userProfile.vibe = parsed.vibe;
  }
  // MULTI → take the FIRST look as the "current" outfit (user can swap by tapping)
  if (parsed.type === "multi" && parsed.looks?.[0]) {
    const outfit = parsed.looks[0].outfit ?? {};
    const newOutfit: SessionState["currentOutfit"] = {};
    for (const role of Object.keys(outfit) as Array<keyof OutfitPair>) {
      const item = outfit[role];
      if (item?.sku) newOutfit[role as string] = { sku: item.sku, name: item.name, price: item.price };
    }
    next.currentOutfit = newOutfit;
    if (parsed.looks[0].occasion) next.userProfile.occasion = parsed.looks[0].occasion;
    if (parsed.looks[0].vibe)     next.userProfile.vibe = parsed.looks[0].vibe;
  }
  return next;
}

interface ChatHistoryEntry {
  id: string;
  title: string;
  timestamp: number;
  messages: ChatMessage[];
  session: SessionState;
}

function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(ts).toLocaleDateString();
}

export default function LookbookChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [session, setSession]   = useState<SessionState>(EMPTY_SESSION);
  const [chatHistory, setChatHistory] = useState<ChatHistoryEntry[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeOccasion, setActiveOccasion] = useState<string | null>(null);
  const [activeVibe, setActiveVibe] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<{ base64: string; mime: string } | null>(null);
  // Persist the most-recent uploaded image so we can re-call /api/image-style
  // when the user picks a gender from the unisex disambiguation prompt.
  const lastUploadedRef = useRef<{ base64: string; mime: string; preview: string } | null>(null);
  const { totalItems: cartCount, items: cartItems } = useCart();
  const { totalItems: wishCount } = useWishlist();
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* Persist chat history to localStorage */
  useEffect(() => {
    try {
      const raw = localStorage.getItem("toastie_chat_history");
      if (raw) setChatHistory(JSON.parse(raw));
    } catch {}
  }, []);
  useEffect(() => {
    try { localStorage.setItem("toastie_chat_history", JSON.stringify(chatHistory)); } catch {}
  }, [chatHistory]);

  /* Save the current chat into history when a meaningful exchange exists */
  useEffect(() => {
    if (messages.length < 2) return;
    const firstUser = messages.find(m => m.role === "user");
    if (!firstUser) return;
    const title = firstUser.content.slice(0, 48);
    const id = activeChatId ?? `${Date.now()}`;
    setActiveChatId(id);
    setChatHistory(prev => {
      const without = prev.filter(c => c.id !== id);
      return [{ id, title, timestamp: Date.now(), messages, session }, ...without].slice(0, 20);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

  function newChat() {
    setMessages([]);
    setSession(EMPTY_SESSION);
    setActiveChatId(null);
    setSidebarOpen(false);
    lastUploadedRef.current = null;
  }
  function loadChat(entry: ChatHistoryEntry) {
    setMessages(entry.messages);
    setSession(entry.session);
    setActiveChatId(entry.id);
    setSidebarOpen(false);
  }

  /* ── Image upload handling ── */
  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    // Max 10MB
    if (file.size > 10 * 1024 * 1024) {
      alert("Image too large — please use an image under 10MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setImagePreview(dataUrl);
      // Extract base64 and mime
      const [header, base64] = dataUrl.split(",");
      const mime = header.match(/data:(.*?);/)?.[1] ?? "image/jpeg";
      setImageFile({ base64, mime });
    };
    reader.readAsDataURL(file);
    // Reset file input so same file can be re-selected
    e.target.value = "";
  }

  function clearImage() {
    setImagePreview(null);
    setImageFile(null);
  }

  /**
   * Helper: update session from an image_looks API response.
   * Sets anchor, imageContext, mode, currentOutfit, and userProfile.
   */
  function applyImageLooksToSession(imageLooks: ImageLooksData, genderOverride?: string) {
    setSession(prev => {
      const firstLook = imageLooks.looks?.[0];
      const newOutfit: SessionState["currentOutfit"] = {};
      if (firstLook?.outfit) {
        for (const role of Object.keys(firstLook.outfit) as Array<keyof OutfitPair>) {
          const item = firstLook.outfit[role];
          if (item?.sku) newOutfit[role as string] = { sku: item.sku, name: item.name, price: item.price };
        }
      }
      const anchorInfo = imageLooks.anchor_info;
      const nextAnchor = anchorInfo
        ? { type: anchorInfo.type, role: anchorInfo.role, excluded_roles: anchorInfo.excluded_roles, description: imageLooks.analysis?.description }
        : prev.anchor ?? null;

      // Build persistent imageContext from the analysis
      const analysis = imageLooks.analysis;
      const nextImageContext: ImageContext | null = analysis
        ? {
            category:    analysis.category,
            color:       analysis.color,
            color_family: analysis.color_family,
            pattern:     analysis.pattern,
            style_type:  analysis.style_type,
            material:    analysis.material,
            fit:         analysis.fit,
            gender:      analysis.gender,
            season:      analysis.season,
            aesthetic:   analysis.aesthetic,
            description: analysis.description,
          }
        : prev.imageContext ?? null;

      return {
        ...prev,
        currentOutfit: Object.keys(newOutfit).length ? newOutfit : prev.currentOutfit,
        userProfile: {
          ...prev.userProfile,
          gender:   genderOverride ?? analysis?.gender ?? prev.userProfile.gender,
          occasion: firstLook?.occasion ?? prev.userProfile.occasion,
          vibe:     firstLook?.vibe ?? prev.userProfile.vibe,
        },
        anchor: nextAnchor,
        imageContext: nextImageContext,
        mode: "image_styling" as const,
      };
    });
  }

  async function sendImage() {
    if (!imageFile || loading) return;
    const preview = imagePreview;
    // Capture any text the user typed alongside the image
    const userText = input.trim();
    setLoading(true);
    if (userText) setInput("");

    // Remember this upload so gender-quick-reply can re-call /api/image-style
    if (preview) {
      lastUploadedRef.current = { base64: imageFile.base64, mime: imageFile.mime, preview };
    }

    // Show user bubble — include their text if they wrote something
    const bubbleContent = userText
      ? `📸 [Uploaded a product image for styling]\n"${userText}"`
      : "📸 [Uploaded a product image for styling]";
    setMessages(prev => [...prev, { role: "user", content: bubbleContent }]);
    clearImage();

    try {
      const res = await fetch("/api/image-style", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: imageFile.base64,
          imageMime: imageFile.mime,
          session,
          // Send user's text so the API can use it for intent (occasion, vibe, budget)
          ...(userText ? { userMessage: userText } : {}),
        }),
      });
      const data = await res.json();

      let parsed: ParsedResponse | null = null;
      if (data && typeof data.type === "string") {
        parsed = data as ParsedResponse;
      }
      if (!parsed) {
        const fallback: ChatData = { type: "chat", message: "Couldn't analyze that image — try a clearer photo!" };
        setMessages(prev => [...prev, { role: "assistant", content: fallback.message, parsed: fallback }]);
      } else {
        setMessages(prev => [...prev, {
          role: "assistant",
          content: data.message || "",
          parsed,
          imagePreview: preview ?? undefined,
        } as ChatMessage]);
        if (parsed.type === "image_looks") {
          applyImageLooksToSession(parsed as ImageLooksData);
        }
      }
    } catch {
      const fallback: ChatData = { type: "chat", message: "Couldn't connect — try again!" };
      setMessages(prev => [...prev, { role: "assistant", content: "", parsed: fallback }]);
    }

    setLoading(false);
  }

  /**
   * Re-style the last uploaded image with an explicit gender override.
   * Called when the user clicks the "Women" / "Men" quick-reply after
   * the unisex disambiguation prompt.
   */
  async function restyleWithGender(gender: "female" | "male", userBubble: string) {
    const last = lastUploadedRef.current;
    if (!last || loading) return;
    setLoading(true);

    // Show the user's choice as a chat bubble
    setMessages(prev => [...prev, { role: "user", content: userBubble }]);

    try {
      const res = await fetch("/api/image-style", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: last.base64,
          imageMime:   last.mime,
          session,
          genderOverride: gender,
        }),
      });
      const data = await res.json();

      let parsed: ParsedResponse | null = null;
      if (data && typeof data.type === "string") {
        parsed = data as ParsedResponse;
      }
      if (!parsed) {
        setMessages(prev => [...prev, { role: "assistant", content: "Couldn't restyle — try again!", parsed: { type: "chat", message: "Couldn't restyle — try again!" } }]);
      } else {
        setMessages(prev => [...prev, {
          role: "assistant",
          content: data.message || "",
          parsed,
          imagePreview: last.preview,
        } as ChatMessage]);
        if (parsed.type === "image_looks") {
          applyImageLooksToSession(parsed as ImageLooksData, gender);
        }
      }
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "", parsed: { type: "chat", message: "Couldn't connect — try again!" } }]);
    }

    setLoading(false);
  }

  /**
   * Routes a quick-reply click. If the last assistant message asked for
   * gender disambiguation on an image upload, re-call /api/image-style
   * with the gender override (preserving anchor context). Otherwise fall
   * through to the regular chat send().
   */
  function handleQuickReply(text: string) {
    const lastAssistant = [...messages].reverse().find(m => m.role === "assistant");
    const askedGender =
      lastAssistant?.parsed?.type === "image_looks" &&
      (lastAssistant.parsed as ImageLooksData).needs_gender === true;

    if (askedGender && lastUploadedRef.current) {
      if (text.toLowerCase().startsWith("women")) return restyleWithGender("female", text);
      if (text.toLowerCase().startsWith("men"))   return restyleWithGender("male",   text);
    }
    send(text);
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  /** User tapped one of the 3-4 alternative cards in a replace_options grid */
  const handleSelectReplacement = (slot: string, sku: string, name: string) => {
    send("", {
      action: "confirm_replacement",
      actionParams: { replace_slot: slot, selected_sku: sku },
      userBubble: `Going with "${name}" ✓`,
    });
  };

  /**
   * User clicked the ✕ button on a card. Removes that slot from the
   * specific message's outfit (mutates messages[messageIdx].parsed.outfit
   * or messages[messageIdx].parsed.looks[lookIdx].outfit). Also keeps
   * session.currentOutfit in sync if this is the most recent outfit
   * — so the engine and "shop the look" total stay consistent.
   *
   * Silent UI removal — no chat bubble, no engine call, no confirmation.
   */
  const handleRemoveSlot = (messageIdx: number, lookIdx: number | null, role: string) => {
    setMessages(prev => {
      if (messageIdx < 0 || messageIdx >= prev.length) return prev;
      const msg = prev[messageIdx];
      if (!msg?.parsed) return prev;

      // Build a stripped parsed payload
      let newParsed: ParsedResponse | null = null;

      // Helper — strip a slot key from an outfit object and recompute total
      const strip = (outfit: OutfitPair, total: number): { outfit: OutfitPair; total: number } => {
        const removed = (outfit as unknown as Record<string, { price?: number } | undefined>)[role];
        if (!removed) return { outfit, total }; // nothing to remove
        const next = { ...(outfit as unknown as Record<string, unknown>) };
        delete next[role];
        const newTotal = Math.max(0, total - (removed.price ?? 0));
        return { outfit: next as unknown as OutfitPair, total: newTotal };
      };

      if (msg.parsed.type === "outfit" && lookIdx === null) {
        const next = { ...(msg.parsed as OutfitData) };
        const stripped = strip(next.outfit, next.total ?? 0);
        next.outfit = stripped.outfit;
        next.total  = stripped.total;
        newParsed = next as ParsedResponse;
      } else if (msg.parsed.type === "multi" && lookIdx !== null) {
        const multi = msg.parsed as MultiData;
        const looks = multi.looks.map((look, i) => {
          if (i !== lookIdx) return look;
          const stripped = strip(look.outfit, look.total ?? 0);
          return { ...look, outfit: stripped.outfit, total: stripped.total };
        });
        newParsed = { ...multi, looks } as ParsedResponse;
      } else if (msg.parsed.type === "image_looks" && lookIdx !== null) {
        const il = msg.parsed as ImageLooksData;
        const looks = (il.looks ?? []).map((look, i) => {
          if (i !== lookIdx) return look;
          const stripped = strip(look.outfit, look.total ?? 0);
          return { ...look, outfit: stripped.outfit, total: stripped.total };
        });
        newParsed = { ...il, looks } as ParsedResponse;
      } else {
        return prev; // Unknown shape — leave it alone
      }

      const nextMessages = [...prev];
      nextMessages[messageIdx] = { ...msg, parsed: newParsed };
      return nextMessages;
    });

    // Keep session.currentOutfit aligned when removing from the most recent
    // outfit (single-look responses or first multi-look). The chat-route
    // purchase-intent / replace fast paths read from session.currentOutfit,
    // so it must reflect what's actually on screen.
    setSession(prev => {
      if (!prev.currentOutfit || !prev.currentOutfit[role]) return prev;
      const next = { ...prev.currentOutfit };
      delete next[role];
      return { ...prev, currentOutfit: next };
    });
  };

  const send = async (text?: string, opts?: { action?: string; actionParams?: Record<string, unknown>; userBubble?: string }) => {
    const query = (text ?? input).trim();
    if (!query && !opts?.action) return;
    if (loading) return;

    // ── ROUTING GUARD ────────────────────────────────────────────
    // If the user has a STAGED image AND we haven't yet activated
    // image_styling mode (no imageContext), the text is about that
    // staged image — route to /api/image-style instead of /api/chat
    // so Sonnet actually SEES the picture.
    if (imageFile && !session.imageContext && !opts?.action) {
      // sendImage() handles its own loading state, user-bubble, and input clearing
      return sendImage();
    }

    if (!opts?.action) setInput("");

    // Show a user-side bubble unless explicitly suppressed
    const bubbleText = opts?.userBubble ?? query;
    if (bubbleText) {
      const userMsg: ChatMessage = { role: "user", content: bubbleText };
      setMessages(prev => [...prev, userMsg]);
    }
    setLoading(true);

    try {
      const history = messages.slice(-10).map(m => ({ role: m.role, content: m.content }));
      // Pass the SKUs currently in cart so the backend's purchase-intent
      // fast path knows which items are already added (vs. still need sizing).
      const cartSkus = Array.from(new Set(cartItems.map(i => i.id)));
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: query || "(action)",
          history,
          session,
          cartSkus,
          ...(opts?.action ? { action: opts.action, action_params: opts.actionParams } : {}),
        }),
      });

      const data = await res.json();

      let parsed: ParsedResponse | null = null;
      if (data && typeof data.type === "string") {
        parsed = data as ParsedResponse;
      } else {
        parsed = parseRaw(data._raw || "") ?? parseRaw(data.message || "");
      }

      if (!parsed) {
        const rawMsg = data.message || "";
        const safeMessage = rawMsg.trimStart().startsWith("{")
          ? "Let me try that again — what occasion or vibe are you styling for?"
          : (rawMsg || "Connection hiccup — give that another try in a sec.");
        const fallback: ChatData = { type: "chat", message: safeMessage };
        setMessages(prev => [...prev, { role: "assistant", content: safeMessage, parsed: fallback }]);
      } else {
        setMessages(prev => [...prev, { role: "assistant", content: data.message || "", parsed }]);
        // Update session memory with anything new from this response
        setSession(prev => deriveSessionUpdate(parsed!, prev));
      }
    } catch {
      const fallback: ChatData = { type: "chat", message: "Couldn't connect — try again!" };
      setMessages(prev => [...prev, { role: "assistant", content: "", parsed: fallback }]);
    }

    setLoading(false);
  };

  return (
    <div style={{ height: "100dvh", background: BG, display: "flex", flexDirection: "column", fontFamily: FONT_BODY, overflow: "hidden" }}>

      {/* ═══ HEADER ═══════════════════════════════════════════════ */}
      <header className="bt-chat-header" style={{
        background: BG, borderBottom: `1px solid ${BORDER}`,
        padding: "12px 20px", display: "flex", alignItems: "center",
        justifyContent: "space-between", zIndex: 30, flexShrink: 0,
      }}>
        {/* Left — logo + sidebar toggle on mobile */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1 }}>
          <button
            onClick={() => setSidebarOpen(o => !o)}
            aria-label="Toggle sidebar"
            className="lg:hidden"
            style={{
              background: "transparent", border: "none", padding: 6,
              cursor: "pointer", color: TEXT, display: "flex",
            }}
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <Link href="/" style={{ display: "flex", alignItems: "center", textDecoration: "none" }}>
            <Image
              src="https://burnt-toast.com/cdn/shop/files/Logo-8_1.png"
              alt="Burnt Toast"
              width={110}
              height={36}
              style={{ width: "auto", height: 32, objectFit: "contain" }}
              priority
              unoptimized
            />
          </Link>
        </div>

        {/* Center — Ask Toastie title */}
        <div className="bt-chat-header-center" style={{ textAlign: "center", flex: 1 }}>
          <div className="bt-chat-header-title" style={{ color: TEXT, fontWeight: 600, fontSize: 18, fontFamily: FONT_DISPLAY, lineHeight: 1.1 }}>
            Ask Toastie
          </div>
          <div className="bt-chat-header-sub" style={{ color: MUTED, fontSize: 9, letterSpacing: 3, fontFamily: FONT_MONO, marginTop: 2, fontWeight: 500 }}>
            YOUR PERSONAL AI STYLIST
          </div>
        </div>

        {/* Right — LIVE + nav + avatar */}
        <div style={{ display: "flex", gap: 14, alignItems: "center", flex: 1, justifyContent: "flex-end" }}>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }} className="hidden sm:flex">
            <div style={{ width: 8, height: 8, background: SAGE_DEEP, borderRadius: "50%" }} />
            <span style={{ fontSize: 10, color: SAGE_DEEP, fontFamily: FONT_MONO, letterSpacing: 1.5, fontWeight: 600 }}>LIVE</span>
          </div>

          <nav style={{ display: "flex", alignItems: "center", gap: 18 }} className="hidden md:flex">
            <Link href="/" style={{
              fontFamily: FONT_MONO, fontSize: 10, letterSpacing: 2, color: TEXT,
              textDecoration: "none", fontWeight: 500,
            }}>SHOP</Link>
            <Link href="/wishlist" style={{ position: "relative", display: "flex", alignItems: "center" }} aria-label="Wishlist">
              <Heart size={17} stroke={TEXT} fill={wishCount > 0 ? "#DC2626" : "none"} />
              {wishCount > 0 && (
                <span style={{
                  position: "absolute", top: -5, right: -7,
                  background: TEXT, color: BG,
                  fontFamily: FONT_MONO, fontSize: 8, fontWeight: 700,
                  borderRadius: "50%", width: 14, height: 14,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>{wishCount > 9 ? "9+" : wishCount}</span>
              )}
            </Link>
            <Link href="/cart" style={{ position: "relative", display: "flex", alignItems: "center" }} aria-label="Cart">
              <ShoppingBag size={17} stroke={TEXT} />
              {cartCount > 0 && (
                <span style={{
                  position: "absolute", top: -5, right: -7,
                  background: TEXT, color: BG,
                  fontFamily: FONT_MONO, fontSize: 8, fontWeight: 700,
                  borderRadius: "50%", width: 14, height: 14,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>{cartCount > 9 ? "9+" : cartCount}</span>
              )}
            </Link>
          </nav>

          {/* Profile avatar */}
          <div style={{
            width: 32, height: 32, borderRadius: "50%",
            background: CARD, border: `1px solid ${BORDER}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer",
          }}>
            <User size={15} stroke={TEXT} />
          </div>
        </div>
      </header>

      {/* ═══ BODY — sidebar + chat panel ══════════════════════════ */}
      <div className="bt-chat-body" style={{ flex: 1, display: "flex", overflow: "hidden", position: "relative", minHeight: 0 }}>

        {/* ─── SIDEBAR ───────────────────────────────────────────── */}
        <aside
          style={{
            width: 280, minWidth: 280, maxWidth: 280,
            background: BG, borderRight: `1px solid ${BORDER}`,
            display: "flex", flexDirection: "column",
            padding: "20px 16px", gap: 16,
            position: sidebarOpen ? "fixed" : "relative",
            top: sidebarOpen ? 0 : "auto", left: 0, bottom: 0,
            zIndex: 25, height: sidebarOpen ? "100vh" : "auto",
            transform: sidebarOpen ? "translateX(0)" : undefined,
            transition: "transform 0.3s",
          }}
          className={`bt-sidebar bt-sidebar-${sidebarOpen ? "open" : "closed"} ${sidebarOpen ? "" : "hidden lg:flex"}`}
        >
          {/* + New chat */}
          <button
            onClick={newChat}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              background: "transparent", border: `1px solid ${TEXT}`,
              borderRadius: 999, padding: "10px 16px",
              fontFamily: FONT_MONO, fontSize: 10, fontWeight: 600,
              letterSpacing: 2, color: TEXT, cursor: "pointer",
              transition: "all 0.2s",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = SAGE; e.currentTarget.style.borderColor = SAGE_DEEP; }}
            onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = TEXT; }}
          >
            <Plus size={13} /> NEW CHAT
          </button>

          {/* RECENT */}
          <div style={{
            color: MUTED, fontSize: 9, letterSpacing: 3, fontFamily: FONT_MONO,
            fontWeight: 600, display: "flex", alignItems: "center", gap: 6,
            paddingLeft: 4,
          }}>
            <span>RECENT</span>
            <span style={{ flex: 1, height: 1, background: BORDER }} />
          </div>

          <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 2 }}>
            {chatHistory.length === 0 ? (
              <div style={{
                color: MUTED, fontSize: 12, fontStyle: "italic",
                fontFamily: FONT_DISPLAY, padding: "20px 6px", textAlign: "center",
              }}>
                Your chats will appear here ✦
              </div>
            ) : (
              chatHistory.map(entry => (
                <button
                  key={entry.id}
                  onClick={() => loadChat(entry)}
                  style={{
                    background: activeChatId === entry.id ? CARD : "transparent",
                    border: "none", textAlign: "left", cursor: "pointer",
                    padding: "10px 12px", borderRadius: 8,
                    borderLeft: activeChatId === entry.id ? `2px solid ${SAGE_DEEP}` : "2px solid transparent",
                    display: "flex", flexDirection: "column", gap: 3,
                    transition: "background 0.15s",
                  }}
                  onMouseEnter={e => { if (activeChatId !== entry.id) e.currentTarget.style.background = CARD; }}
                  onMouseLeave={e => { if (activeChatId !== entry.id) e.currentTarget.style.background = "transparent"; }}
                >
                  <div style={{
                    fontFamily: FONT_DISPLAY, fontSize: 14,
                    fontStyle: "italic", color: TEXT, lineHeight: 1.3,
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>
                    {entry.title}
                  </div>
                  <div style={{ fontFamily: FONT_MONO, fontSize: 9, color: MUTED, letterSpacing: 0.5 }}>
                    {relativeTime(entry.timestamp)}
                  </div>
                </button>
              ))
            )}
          </div>

          {/* Sidebar footer */}
          <div style={{
            paddingTop: 14, borderTop: `1px solid ${BORDER}`,
            display: "flex", alignItems: "center", gap: 6,
            color: MUTED, fontFamily: FONT_MONO, fontSize: 9,
            letterSpacing: 2.5, fontWeight: 500,
          }}>
            <span style={{ color: TEXT, fontSize: 11 }}>✦</span>
            STYLED AROUND YOU.
          </div>
        </aside>

        {/* Sidebar backdrop on mobile */}
        {sidebarOpen && (
          <div
            onClick={() => setSidebarOpen(false)}
            style={{
              position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)",
              zIndex: 40,
            }}
            className="bt-sidebar-backdrop lg:hidden"
          />
        )}

        {/* ─── CHAT PANEL ────────────────────────────────────────── */}
        <div className="bt-chat-panel" style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minHeight: 0 }}>

      {/* ── BODY ─────────────────────────────────────────────────── */}
      <div className="bt-chat-scroll" style={{ flex: 1, overflowY: "auto", padding: "24px 16px", paddingBottom: 140, display: "flex", flexDirection: "column", gap: 20, minHeight: 0 }}>

        {/* ═══ WELCOME — compact hero + icon chip rows ═══════════════ */}
        {messages.length === 0 && !loading && (() => {
          const OCCASIONS = [
            { key: "college-fest", label: "College fest", Icon: GraduationCap },
            { key: "office",       label: "Office",       Icon: Briefcase },
            { key: "date-night",   label: "Date night",   Icon: Heart },
            { key: "travel",       label: "Travel",       Icon: Plane },
            { key: "party",        label: "Party",        Icon: PartyPopper },
            { key: "brunch",       label: "Brunch",       Icon: Coffee },
            { key: "wedding",      label: "Wedding",      Icon: Sparkles },
            { key: "concert",      label: "Concert",      Icon: Music },
          ];
          const VIBES = [
            { key: "minimal",          label: "Minimal",          Icon: Minus },
            { key: "downtown",         label: "Downtown",         Icon: Building2 },
            { key: "clean-girl",       label: "Clean girl",       Icon: Flower2 },
            { key: "soft-grunge",      label: "Soft grunge",      Icon: Cloud },
            { key: "elevated-basics",  label: "Elevated basics",  Icon: Star },
            { key: "coquette",         label: "Coquette",         Icon: Sun },
            { key: "old-money",        label: "Old money",        Icon: Moon },
            { key: "y2k",              label: "Y2K",              Icon: Flame },
          ];

          function applyChip(kind: "occasion" | "vibe", key: string, label: string) {
            const nextOccasion = kind === "occasion" ? (activeOccasion === key ? null : key) : activeOccasion;
            const nextVibe     = kind === "vibe"     ? (activeVibe     === key ? null : key) : activeVibe;
            if (kind === "occasion") setActiveOccasion(nextOccasion);
            else                     setActiveVibe(nextVibe);

            const occLabel  = nextOccasion ? (OCCASIONS.find(o => o.key === nextOccasion)?.label.toLowerCase() ?? "") : "";
            const vibeLabel = nextVibe     ? (VIBES.find(v => v.key === nextVibe)?.label.toLowerCase() ?? "")         : "";
            let query = "";
            if (occLabel && vibeLabel)      query = `Style me for ${occLabel} with a ${vibeLabel} vibe`;
            else if (occLabel)              query = `Style me for ${occLabel}`;
            else if (vibeLabel)             query = `Show me a ${vibeLabel} outfit`;
            setInput(query);
            // Suppress unused var warning if `label` is unused
            void label;
            // Auto-focus the input so user can edit/append
            setTimeout(() => inputRef.current?.focus(), 0);
          }

          const chipBase: React.CSSProperties = {
            display: "inline-flex", alignItems: "center", gap: 8,
            height: 38, padding: "0 16px",
            background: "transparent", border: `1px solid ${BORDER}`,
            borderRadius: 999, cursor: "pointer",
            fontFamily: FONT_BODY, fontSize: 13, fontWeight: 500,
            color: TEXT, whiteSpace: "nowrap",
            transition: "all 180ms ease",
          };
          const activeChip: React.CSSProperties = {
            background: SAGE, borderColor: SAGE_DEEP, color: "#fff",
          };
          const sectionLabel: React.CSSProperties = {
            fontFamily: FONT_MONO, fontSize: 11, color: MUTED,
            letterSpacing: 2, fontWeight: 600, textTransform: "uppercase",
            display: "flex", alignItems: "center", gap: 8,
          };

          return (
            <div className="animate-fade-in bt-hero" style={{
              maxWidth: 760, margin: "auto", width: "100%",
              padding: "16px 12px", display: "flex", flexDirection: "column",
              alignItems: "center", gap: 24,
            }}>

              {/* Hero — compact */}
              <div style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{
                  color: MUTED, fontSize: 10, letterSpacing: 3,
                  fontFamily: FONT_MONO, fontWeight: 600,
                  display: "inline-flex", alignItems: "center", gap: 8, justifyContent: "center",
                }}>
                  <span style={{ color: TEXT }}>✦</span>
                  YOUR PERSONAL AI STYLIST
                  <span style={{ color: TEXT }}>✦</span>
                </div>

                <h1 style={{
                  fontFamily: FONT_DISPLAY, color: TEXT,
                  fontSize: "clamp(28px, 4vw, 44px)",
                  lineHeight: 1.05, letterSpacing: -0.5, fontWeight: 400, margin: "4px 0 0",
                }}>
                  What&apos;s the <em style={{ fontStyle: "italic" }}>vibe</em> today?
                </h1>

                <p style={{
                  color: MUTED, fontSize: 13, lineHeight: 1.5,
                  maxWidth: 460, fontFamily: FONT_BODY, margin: "2px auto 0",
                }}>
                  Tell Toastie your occasion, mood, or budget.
                </p>
              </div>

              {/* OCCASIONS row */}
              <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 10, alignItems: "center" }}>
                <div style={sectionLabel}>
                  <span style={{ color: TEXT, fontSize: 8 }}>◆</span>
                  OCCASIONS
                </div>
                <div
                  className="chip-row"
                  style={{
                    display: "flex", flexWrap: "wrap", justifyContent: "center",
                    gap: 8, maxWidth: 720, width: "100%",
                  }}
                >
                  {OCCASIONS.map(({ key, label, Icon }) => {
                    const active = activeOccasion === key;
                    return (
                      <button
                        key={key}
                        onClick={() => applyChip("occasion", key, label)}
                        style={{ ...chipBase, ...(active ? activeChip : {}) }}
                        onMouseEnter={e => {
                          if (active) return;
                          e.currentTarget.style.background = "#FFFEF5";
                          e.currentTarget.style.borderColor = SAGE;
                          e.currentTarget.style.transform = "translateY(-1px)";
                        }}
                        onMouseLeave={e => {
                          if (active) return;
                          e.currentTarget.style.background = "transparent";
                          e.currentTarget.style.borderColor = BORDER;
                          e.currentTarget.style.transform = "translateY(0)";
                        }}
                      >
                        <Icon size={16} color={active ? "#fff" : TEXT} />
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* VIBES row */}
              <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 10, alignItems: "center" }}>
                <div style={sectionLabel}>
                  <span style={{ color: TEXT, fontSize: 8 }}>◆</span>
                  VIBES
                </div>
                <div
                  className="chip-row"
                  style={{
                    display: "flex", flexWrap: "wrap", justifyContent: "center",
                    gap: 8, maxWidth: 720, width: "100%",
                  }}
                >
                  {VIBES.map(({ key, label, Icon }) => {
                    const active = activeVibe === key;
                    return (
                      <button
                        key={key}
                        onClick={() => applyChip("vibe", key, label)}
                        style={{ ...chipBase, ...(active ? activeChip : {}) }}
                        onMouseEnter={e => {
                          if (active) return;
                          e.currentTarget.style.background = "#FFFEF5";
                          e.currentTarget.style.borderColor = SAGE;
                          e.currentTarget.style.transform = "translateY(-1px)";
                        }}
                        onMouseLeave={e => {
                          if (active) return;
                          e.currentTarget.style.background = "transparent";
                          e.currentTarget.style.borderColor = BORDER;
                          e.currentTarget.style.transform = "translateY(0)";
                        }}
                      >
                        <Icon size={16} color={active ? "#fff" : TEXT} />
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })()}

        {/* Message thread — editorial style */}
        {messages.length > 0 && (
          <div className="bt-message-thread" style={{ maxWidth: 900, margin: "0 auto", width: "100%", display: "flex", flexDirection: "column", gap: 20 }}>
            {messages.map((msg, i) => (
              <div key={i} style={{
                display: "flex",
                justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
                gap: 10,
                width: msg.role === "assistant" ? "100%" : undefined,
                maxWidth: msg.role === "user" ? "80%" : "100%",
                alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
              }}>
                {msg.role === "assistant" && (
                  <div style={{
                    width: 32, height: 32, minWidth: 32,
                    background: TEXT, color: BG,
                    borderRadius: "50%", display: "flex", alignItems: "center",
                    justifyContent: "center",
                    fontFamily: FONT_BRAND, fontSize: 18, marginTop: 4,
                    boxShadow: "0 2px 6px rgba(26,26,26,0.15)",
                  }}>T</div>
                )}

                <div style={{ flex: msg.role === "assistant" ? 1 : undefined }}>
                  {msg.role === "assistant" && (
                    <div style={{ color: MUTED, fontSize: 9, fontFamily: FONT_MONO, letterSpacing: 2, marginBottom: 5, marginLeft: 2 }}>
                      TOASTIE
                    </div>
                  )}
                  {msg.role === "assistant" ? (
                    msg.parsed
                      ? <ResponseRenderer
                          data={msg.parsed}
                          onQuickReply={handleQuickReply}
                          onSelectReplacement={handleSelectReplacement}
                          onRemoveSlot={(lookIdx, role) => handleRemoveSlot(i, lookIdx, role)}
                        />
                      : (
                        <div style={{
                          background: CARD, border: `1px solid ${BORDER}`,
                          borderRadius: "4px 14px 14px 14px",
                          padding: "12px 16px", color: TEXT, fontSize: 14, lineHeight: 1.6,
                          fontFamily: FONT_BODY,
                        }}>{msg.content || "Let me think about that..."}</div>
                      )
                  ) : (
                    <div style={{
                      background: TEXT, color: BG,
                      borderRadius: "14px 14px 4px 14px",
                      padding: "10px 16px", fontSize: 13, lineHeight: 1.5,
                      fontFamily: FONT_BODY,
                    }}>{msg.content}</div>
                  )}
                </div>

                {msg.role === "user" && (
                  <div style={{
                    width: 32, height: 32, minWidth: 32,
                    background: CARD, border: `1px solid ${BORDER}`,
                    borderRadius: "50%",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 13, marginTop: 2,
                    fontFamily: FONT_MONO, color: TEXT, fontWeight: 500,
                  }}>YOU</div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div style={{ maxWidth: 900, margin: "0 auto", width: "100%", display: "flex", gap: 10, alignItems: "flex-start" }}>
            <div style={{
              width: 32, height: 32, background: TEXT, color: BG,
              borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
              fontFamily: FONT_BRAND, fontSize: 18,
            }}>T</div>
            <div style={{
              background: CARD, border: `1px solid ${BORDER}`,
              borderRadius: "4px 14px 14px 14px",
              padding: "14px 18px", display: "flex", gap: 8, alignItems: "center",
            }}>
              <span style={{ color: MUTED, fontSize: 11, marginRight: 4, fontFamily: FONT_MONO, letterSpacing: 2 }}>
                TOASTIE IS COOKING SOMETHING...
              </span>
              {[0, 1, 2].map(n => (
                <div key={n} style={{
                  width: 5, height: 5, background: TEXT, borderRadius: "50%",
                  animation: "btpulse 1.2s infinite",
                  animationDelay: `${n * 0.2}s`,
                }} />
              ))}
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* ═══ INPUT BAR — fixed at bottom, always visible ═════════ */}
      <div className="bt-input-bar" style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        width: "100%",
        zIndex: 1000,
        background: BG,
        borderTop: `1px solid ${BORDER}`,
        padding: "16px 20px 20px",
      }}>
        <div className="bt-input-inner" style={{ maxWidth: 900, margin: "0 auto", display: "flex", flexDirection: "column", gap: 10 }}>

          {/* Hidden file input for image upload */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            onChange={handleImageSelect}
            style={{ display: "none" }}
          />

          {/* Anchor banner — visible whenever the user is styling around an uploaded item */}
          {session.anchor && (
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              gap: 12, background: "#fef3c7", border: "1px solid #f59e0b",
              borderRadius: 12, padding: "8px 12px",
            }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: "#92400e", lineHeight: 1.4 }}>
                🔗 Styling around your <strong>{session.anchor.type.toLowerCase()}</strong> — recommendations exclude {session.anchor.excluded_roles.join(", ")}.
              </span>
              <button
                onClick={() => {
                  setSession(prev => ({ ...prev, anchor: null, imageContext: null, mode: null }));
                  lastUploadedRef.current = null;
                }}
                style={{
                  padding: "4px 10px", borderRadius: 14, border: "1px solid #f59e0b",
                  background: "#fff", color: "#92400e", fontSize: 11, fontWeight: 700,
                  cursor: "pointer", whiteSpace: "nowrap",
                }}
                title="Forget the uploaded item and start a fresh full outfit"
              >
                Clear & full outfit
              </button>
            </div>
          )}

          {/* Image preview — shown above the pill when an image is staged */}
          {imagePreview && (
            <div style={{
              background: CARD, border: `1px solid ${BORDER}`,
              borderRadius: 16, padding: 12,
              display: "flex", alignItems: "flex-start", gap: 12,
              animation: "fadeIn 0.25s ease-out",
            }}>
              <div style={{
                width: 80, height: 80, borderRadius: 10, overflow: "hidden",
                border: `1px solid ${BORDER}`, flexShrink: 0, position: "relative",
              }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imagePreview}
                  alt="Upload preview"
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              </div>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <ImageIcon size={14} color={TEXT} />
                  <span style={{
                    fontFamily: FONT_MONO, fontSize: 10, fontWeight: 700,
                    letterSpacing: 1.5, color: TEXT,
                  }}>PRODUCT IMAGE READY</span>
                </div>
                <span style={{ fontSize: 11, color: MUTED, lineHeight: 1.4 }}>
                  Toastie will analyze this product and build complete outfit looks from our collection
                </span>
                <div style={{ display: "flex", gap: 8, marginTop: 2 }}>
                  <button
                    onClick={sendImage}
                    disabled={loading}
                    style={{
                      background: TEXT, color: BG, border: "none",
                      borderRadius: 8, padding: "7px 16px",
                      fontSize: 11, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer",
                      fontFamily: FONT_MONO, letterSpacing: 1,
                      display: "flex", alignItems: "center", gap: 5,
                      transition: "opacity 0.2s",
                      opacity: loading ? 0.5 : 1,
                    }}
                  >
                    <Sparkles size={12} /> STYLE THIS
                  </button>
                  <button
                    onClick={clearImage}
                    style={{
                      background: "transparent", color: MUTED,
                      border: `1px solid ${BORDER}`,
                      borderRadius: 8, padding: "7px 12px",
                      fontSize: 11, fontWeight: 600, cursor: "pointer",
                      fontFamily: FONT_MONO,
                      display: "flex", alignItems: "center", gap: 4,
                    }}
                  >
                    <XCircle size={12} /> REMOVE
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Pill input */}
          <div className="bt-input-pill" style={{
            display: "flex", alignItems: "center", gap: 12,
            background: CARD, border: `1px solid ${BORDER}`,
            borderRadius: 999, padding: "10px 10px 10px 14px",
            transition: "border-color 0.2s, box-shadow 0.2s",
          }}>
            {/* T avatar */}
            <div style={{
              width: 38, height: 38, minWidth: 38, background: BG,
              border: `1px solid ${BORDER}`,
              borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
              fontFamily: FONT_BRAND, fontSize: 20, color: TEXT,
              position: "relative",
            }}>
              T
              <div style={{
                position: "absolute", bottom: 1, right: 1,
                width: 9, height: 9, background: SAGE_DEEP,
                borderRadius: "50%", border: `2px solid ${CARD}`,
              }} />
            </div>

            {/* Brand mini-label */}
            <div style={{ display: "flex", flexDirection: "column", marginRight: 4, minWidth: 0 }} className="hidden md:flex">
              <span style={{ fontFamily: FONT_MONO, fontSize: 10, color: TEXT, letterSpacing: 2, fontWeight: 600 }}>TOASTIE</span>
              <span style={{ fontFamily: FONT_MONO, fontSize: 8, color: SAGE_DEEP, letterSpacing: 1.5, marginTop: 1, display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ width: 5, height: 5, borderRadius: "50%", background: SAGE_DEEP, display: "inline-block" }} />
                LIVE STYLIST AI
              </span>
            </div>

            {/* Image upload button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
              aria-label="Upload product image"
              title="Upload a product image for styling"
              style={{
                background: imagePreview ? TEXT : "transparent",
                color: imagePreview ? BG : MUTED,
                border: imagePreview ? "none" : `1px solid ${BORDER}`,
                borderRadius: "50%",
                width: 34, height: 34, minWidth: 34,
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: loading ? "not-allowed" : "pointer",
                transition: "all 0.2s",
                flexShrink: 0,
              }}
              onMouseEnter={e => { if (!imagePreview) { e.currentTarget.style.borderColor = TEXT; e.currentTarget.style.color = TEXT; }}}
              onMouseLeave={e => { if (!imagePreview) { e.currentTarget.style.borderColor = BORDER; e.currentTarget.style.color = MUTED; }}}
            >
              <Camera size={15} />
            </button>

            {/* Input */}
            <input
              ref={inputRef as unknown as React.RefObject<HTMLInputElement>}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder="Ask Toastie anything..."
              style={{
                flex: 1, background: "transparent", border: "none",
                padding: "8px 6px", color: TEXT,
                fontSize: 14, fontFamily: FONT_BODY,
                outline: "none",
              }}
            />

            {/* Submit — black circle with up arrow */}
            <button
              onClick={() => send()}
              disabled={loading || !input.trim()}
              aria-label="Send"
              style={{
                background: (!input.trim() || loading) ? CARD : TEXT,
                color: (!input.trim() || loading) ? MUTED : BG,
                border: (!input.trim() || loading) ? `1px solid ${BORDER}` : "none",
                borderRadius: "50%",
                width: 40, height: 40, minWidth: 40,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 16, fontWeight: 700,
                cursor: (!input.trim() || loading) ? "not-allowed" : "pointer",
                transition: "all 0.2s",
              }}
            >
              {loading ? "…" : "↑"}
            </button>
          </div>

          {/* Suggestion chips below input (only when no messages yet) */}
          {messages.length === 0 && (
            <div style={{
              display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 8,
              padding: "2px 8px",
            }}>
              {[
                "airport look under ₹4000",
                "date night soft glam",
                "what's trending this week?",
              ].map((prompt, i) => (
                <button
                  key={i}
                  onClick={() => send(prompt)}
                  style={{
                    background: "transparent",
                    border: `1px solid ${BORDER}`,
                    borderRadius: 999,
                    padding: "6px 14px",
                    color: MUTED, fontSize: 11,
                    fontFamily: FONT_BODY, fontStyle: "italic",
                    cursor: "pointer", transition: "all 0.2s",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = TEXT; e.currentTarget.style.color = TEXT; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = BORDER; e.currentTarget.style.color = MUTED; }}
                >
                  &ldquo;{prompt}&rdquo;
                </button>
              ))}
              <button
                onClick={() => fileInputRef.current?.click()}
                style={{
                  background: "transparent",
                  border: `1px solid ${BORDER}`,
                  borderRadius: 999,
                  padding: "6px 14px",
                  color: MUTED, fontSize: 11,
                  fontFamily: FONT_BODY,
                  cursor: "pointer", transition: "all 0.2s",
                  display: "flex", alignItems: "center", gap: 5,
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = TEXT; e.currentTarget.style.color = TEXT; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = BORDER; e.currentTarget.style.color = MUTED; }}
              >
                <Camera size={12} /> Upload a product image
              </button>
            </div>
          )}
        </div>
      </div>

        </div>{/* /chat panel */}
      </div>{/* /body sidebar+main */}
    </div>
  );
}
