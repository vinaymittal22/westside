/**
 * Burnt Toast — Style Taxonomy
 * Used by the outfit recommendation engine (lib/outfitEngine.ts).
 */

import { FashionProduct } from "@/types";

/* ──────────────────────────────────────────────────────────────
   Hard taxonomy — every product gets exactly ONE of each
   ────────────────────────────────────────────────────────────── */

export type ProductType =
  | "TOP"
  | "BOTTOM"
  | "DRESS"
  | "OUTERWEAR"
  | "FOOTWEAR"
  | "BAG"
  | "JEWELRY"
  | "EYEWEAR"
  | "WATCH"
  | "HAT";

export type ColorFamily =
  | "neutral"        // white, black, grey, beige, cream, stone
  | "earth"          // brown, khaki, sage, olive, chocolate
  | "warm-pastel"    // pink, peach, blush, cream
  | "cool-pastel"    // mint, sky-blue, lilac
  | "bold"           // red, yellow, orange, electric blue
  | "jewel-tone"     // emerald, sapphire, ruby, navy
  | "monochrome"     // black+white combo
  | "multi";         // print / multi-color

/* ──────────────────────────────────────────────────────────────
   Soft taxonomy — products can have 1-3 aesthetics
   ────────────────────────────────────────────────────────────── */

export const AESTHETICS = [
  "y2k-revival",          // bold, retro, statement, low-rise, butterflies
  "urban-streetwear",     // oversized, baggy, sneakers, graphic
  "smart-casual",         // clean lines, neutral, structured
  "minimal-clean",        // monochrome, simple, no print
  "boho-coastal",         // crochet, earthy, flowy
  "preppy-collegiate",    // pleated, polo, plaid
  "athleisure",           // sporty, fitted, technical fabric
  "feminine-romantic",    // ruffles, lace, pastels, schiffli
] as const;

export type Aesthetic = typeof AESTHETICS[number];

/* ──────────────────────────────────────────────────────────────
   Occasions — what the user is dressing for
   ────────────────────────────────────────────────────────────── */

export const OCCASIONS = [
  "casual",          // everyday hangout, errands
  "college",         // daily campus
  "brunch",          // smart-casual day
  "date-night",      // dinner, drinks
  "party",           // club, house party
  "festival",        // music, college fest
  "beach",           // pool, vacation
  "travel",          // airport, day trip
  "work",            // office, internship
  "active",          // gym, sports
  "wedding",         // formal event
] as const;

export type Occasion = typeof OCCASIONS[number];

/* ──────────────────────────────────────────────────────────────
   Enriched product — base FashionProduct + computed style metadata
   ────────────────────────────────────────────────────────────── */

export interface EnrichedProduct extends FashionProduct {
  product_type: ProductType;
  aesthetics:   Aesthetic[];     // 1-3 most relevant
  color_family: ColorFamily;
  formality:    1 | 2 | 3 | 4 | 5;   // 1=very casual ... 5=very formal
  boldness:     1 | 2 | 3 | 4 | 5;   // 1=minimal ... 5=statement
  url:          string;              // burnt-toast.com product page
}

/* ──────────────────────────────────────────────────────────────
   Outfit shape returned by the engine
   ────────────────────────────────────────────────────────────── */

export interface OutfitSlot {
  role:       string;                // top | bottom | footwear | bag | etc.
  product:    EnrichedProduct;
  reason:     string;                // why the engine picked this
}

export interface GeneratedOutfit {
  id:           string;
  label:        string;              // e.g. "Sunday Brunch Slay"
  aesthetic:    Aesthetic;
  occasion:     string;
  vibe_label:   string;              // human-friendly: "Y2K Revival"
  slots:        OutfitSlot[];
  total_price:  number;
  budget_note:  string;
  hype_copy?:   string;              // filled in by Claude
}

/* ──────────────────────────────────────────────────────────────
   Engine context — what the engine takes as input
   ────────────────────────────────────────────────────────────── */

export interface OutfitContext {
  occasion?:     string;
  vibe?:         Aesthetic | string;
  gender?:       "female" | "male" | "unisex";
  budget?:       number;             // max total spend
  anchor_sku?:   string;             // user already picked this product
  preferred_colors?: string[];
  season?:       string;
  /** Force specific SKUs into specific roles (e.g. { bottom: "301044186" }).
   *  Used for "change the top" — locks every slot except the one being replaced. */
  lock_slots?:   Record<string, string>;
  /** SKUs the user already rejected — never re-suggest these */
  rejected_skus?: string[];
  /** For multi: which slot to vary across the N outfits (e.g. "top" → 3 different tops) */
  replace_slot?: string;
  /**
   * Optional keyword to sub-filter candidates within a slot's product_type.
   * Applied as a case-insensitive name/tag match.
   * Example: replace_slot="footwear" + name_filter="sneaker" → only sneakers shown.
   */
  name_filter?: string;
}
