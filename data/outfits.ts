/**
 * Curated outfit collections — hand-built complete looks.
 * These act as ground truth for the engine: when two SKUs appear
 * in the same curated outfit, they get a strong compatibility boost.
 *
 * This is exactly how Stitch Fix and Zalando bootstrap their
 * recommendation engines on day one before they have user data.
 */

import { Aesthetic } from "@/types/fashion";

export interface CuratedOutfit {
  id:         string;
  label:      string;
  aesthetic:  Aesthetic;
  occasion:   string;
  gender:     "female" | "male" | "unisex";
  skus:       string[];      // 3-6 SKUs that make a complete look
}

/* All SKUs reference real items in data/catalogue.ts (+ data/products.ts) */
export const CURATED_OUTFITS: CuratedOutfit[] = [
  /* ── Y2K REVIVAL — bold party / festival ────────────────── */
  {
    id: "OUT_Y2K_01", label: "Sequin Night Out",
    aesthetic: "y2k-revival", occasion: "party", gender: "female",
    skus: ["301060589", "301044186", "301055054", "301055068", "301026609", "301039760"],
  },
  {
    id: "OUT_Y2K_02", label: "Festival Energy",
    aesthetic: "y2k-revival", occasion: "festival", gender: "female",
    skus: ["301062271", "301064620", "301055053", "301055068", "301026609", "301039760"],
  },
  {
    id: "OUT_Y2K_03", label: "College Fest Slay",
    aesthetic: "y2k-revival", occasion: "festival", gender: "female",
    skus: ["301060678", "301044186", "301055054", "301055068", "301039760"],
  },

  /* ── URBAN STREETWEAR — casual / college ────────────────── */
  {
    id: "OUT_STR_01", label: "Saturday Hangout",
    aesthetic: "urban-streetwear", occasion: "casual", gender: "female",
    skus: ["301060679", "301044186", "301055054", "301055068", "301026609"],
  },
  {
    id: "OUT_STR_02", label: "Campus Daily",
    aesthetic: "urban-streetwear", occasion: "college", gender: "female",
    skus: ["301060678", "301064620", "301055053", "301055068", "301026609"],
  },
  {
    id: "OUT_STR_03", label: "Coffee Run",
    aesthetic: "urban-streetwear", occasion: "casual", gender: "female",
    skus: ["301060679", "301044186", "301055053", "301026609"],
  },
  {
    id: "OUT_STR_04", label: "IPL Watch Party",
    aesthetic: "urban-streetwear", occasion: "casual", gender: "female",
    skus: ["301060589", "301064620", "301055054", "301026609"],
  },

  /* ── SMART CASUAL — brunch / date-night / work ──────────── */
  {
    id: "OUT_SMC_01", label: "Sunday Brunch",
    aesthetic: "smart-casual", occasion: "brunch", gender: "female",
    skus: ["301060679", "301044186", "301055053", "301055068", "301026609", "301039760"],
  },
  {
    id: "OUT_SMC_02", label: "Date Night Elegance",
    aesthetic: "smart-casual", occasion: "date-night", gender: "female",
    skus: ["301062644", "301055054", "301055068", "301039760"],
  },
  {
    id: "OUT_SMC_03", label: "Internship Day One",
    aesthetic: "smart-casual", occasion: "work", gender: "female",
    skus: ["301060679", "301044186", "301055053", "301055068"],
  },
  {
    id: "OUT_SMC_04", label: "Networking Lunch",
    aesthetic: "smart-casual", occasion: "work", gender: "female",
    skus: ["301060589", "301044186", "301055053", "301055068", "301026609"],
  },

  /* ── FEMININE ROMANTIC — date / wedding / soft party ───── */
  {
    id: "OUT_FEM_01", label: "Romantic Dinner",
    aesthetic: "feminine-romantic", occasion: "date-night", gender: "female",
    skus: ["301062644", "301055053", "301055068", "301039760"],
  },
  {
    id: "OUT_FEM_02", label: "Garden Party",
    aesthetic: "feminine-romantic", occasion: "party", gender: "female",
    skus: ["301062271", "301064620", "301055053", "301055068", "301039760"],
  },

  /* ── BOHO COASTAL — beach / festival / vacation ─────────── */
  {
    id: "OUT_BOH_01", label: "Beach Day Stroll",
    aesthetic: "boho-coastal", occasion: "beach", gender: "female",
    skus: ["301062271", "301044186", "301055053", "301055068", "301026609", "301039760"],
  },
  {
    id: "OUT_BOH_02", label: "Coastal Vacation",
    aesthetic: "boho-coastal", occasion: "travel", gender: "female",
    skus: ["301062644", "301055053", "301055068", "301026609"],
  },

  /* ── PREPPY COLLEGIATE — college / brunch ───────────────── */
  {
    id: "OUT_PRP_01", label: "Cardigan & Coffee",
    aesthetic: "preppy-collegiate", occasion: "college", gender: "female",
    skus: ["301060679", "301044186", "301055053", "301055068"],
  },

  /* ── ATHLEISURE — active / travel ───────────────────────── */
  {
    id: "OUT_ATH_01", label: "Airport Vibes",
    aesthetic: "athleisure", occasion: "travel", gender: "female",
    skus: ["301060679", "301044186", "301055054", "301055068", "301026609"],
  },
  {
    id: "OUT_ATH_02", label: "Errand Day",
    aesthetic: "athleisure", occasion: "casual", gender: "female",
    skus: ["301060678", "301044186", "301055054", "301055068"],
  },
];

/* ──────────────────────────────────────────────────────────────
   Co-occurrence map — derived from curated outfits
   Used by the engine to boost pair scores.
   { "skuA::skuB": count }
   ────────────────────────────────────────────────────────────── */
export const CO_OCCURRENCE: Record<string, number> = (() => {
  const map: Record<string, number> = {};
  for (const outfit of CURATED_OUTFITS) {
    const skus = outfit.skus;
    for (let i = 0; i < skus.length; i++) {
      for (let j = i + 1; j < skus.length; j++) {
        const a = skus[i] < skus[j] ? skus[i] : skus[j];
        const b = skus[i] < skus[j] ? skus[j] : skus[i];
        const key = `${a}::${b}`;
        map[key] = (map[key] ?? 0) + 1;
      }
    }
  }
  return map;
})();

export function pairCoOccurrence(skuA: string, skuB: string): number {
  const a = skuA < skuB ? skuA : skuB;
  const b = skuA < skuB ? skuB : skuA;
  return CO_OCCURRENCE[`${a}::${b}`] ?? 0;
}
