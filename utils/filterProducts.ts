import { FashionProduct } from "@/types";

/* ── Public filter state ─────────────────────────────────────────── */
export interface FilterState {
  gender:     "male" | "female" | "all";
  occasion:   string;        // "all" | "wedding" | "party" | …
  colors:     string[];      // [] = no preference
  bodyType:   string;        // "all" | "slim" | "athletic" | …
  budgetMin:  number;        // 0
  budgetMax:  number;        // Infinity = no cap
}

export const DEFAULT_FILTERS: FilterState = {
  gender:    "all",
  occasion:  "all",
  colors:    [],
  bodyType:  "all",
  budgetMin: 0,
  budgetMax: Infinity,
};

/* ── Score weights ───────────────────────────────────────────────── */
const W = {
  GENDER_EXACT:   10,   // wrong gender = product excluded
  OCCASION_EXACT:  6,
  BUDGET_IN:       4,
  BUDGET_SWEET:    2,   // extra bonus if ≤ 80 % of max
  COLOR_PER_MATCH: 3,
  BODY_MATCH:      3,
  FABRIC_SEASON:   1,
};

/* ── Color alias map ─────────────────────────────────────────────── */
const COLOR_ALIASES: Record<string, string[]> = {
  red:       ["red", "maroon", "crimson", "burgundy"],
  gold:      ["gold", "yellow", "amber", "mustard"],
  blue:      ["blue", "navy", "royal blue", "sky blue", "indigo", "teal"],
  green:     ["green", "sage green", "olive", "mint", "emerald green"],
  black:     ["black", "charcoal"],
  white:     ["white", "cream", "ivory", "beige"],
  pink:      ["pink", "blush pink", "rose gold", "rose pink", "coral"],
  purple:    ["purple", "lavender", "violet"],
  orange:    ["orange", "coral", "peach"],
  silver:    ["silver", "grey", "gray"],
  multicolor:["multicolor"],
};

function colorsMatch(productColors: string[], preferredColors: string[]): number {
  if (!preferredColors.length) return 0;
  let score = 0;
  for (const pref of preferredColors) {
    const aliases = COLOR_ALIASES[pref.toLowerCase()] ?? [pref.toLowerCase()];
    const matched = productColors.some((pc) =>
      aliases.some(
        (a) =>
          pc.toLowerCase().includes(a) || a.includes(pc.toLowerCase())
      )
    );
    if (matched) score += W.COLOR_PER_MATCH;
  }
  return score;
}

/* ── Main filter + sort function ─────────────────────────────────── */
export function filterProducts(
  products: FashionProduct[],
  filters: FilterState
): FashionProduct[] {
  const results: { product: FashionProduct; score: number }[] = [];

  for (const p of products) {
    /* ── Hard filter: gender (unisex shown for any gender filter) ── */
    if (filters.gender !== "all" && p.gender !== filters.gender && p.gender !== "unisex") continue;

    /* ── Hard filter: budget ceiling (10 % tolerance) ────────── */
    const cap = filters.budgetMax === Infinity ? Infinity : filters.budgetMax * 1.1;
    if (p.price > cap) continue;

    let score = 0;

    /* Gender exact bonus */
    if (filters.gender !== "all") score += W.GENDER_EXACT;

    /* Occasion */
    if (filters.occasion === "all") {
      score += 1;
    } else if (p.occasion === filters.occasion) {
      score += W.OCCASION_EXACT;
    }

    /* Budget */
    if (p.price >= filters.budgetMin && p.price <= filters.budgetMax) {
      score += W.BUDGET_IN;
      if (
        filters.budgetMax !== Infinity &&
        p.price <= filters.budgetMax * 0.8
      )
        score += W.BUDGET_SWEET;
    }

    /* Color */
    score += colorsMatch(p.color ?? [], filters.colors);
    if (!filters.colors.length) score += 1; // no preference = neutral

    /* Body type */
    if (filters.bodyType === "all") {
      score += 1;
    } else if (p.bodyType?.includes(filters.bodyType)) {
      score += W.BODY_MATCH;
    }

    /* Small bonus: sale items surface higher in results */
    if (p.isSale) score += 0.5;
    if (p.isNew)  score += 0.3;

    results.push({ product: p, score });
  }

  return results.sort((a, b) => b.score - a.score).map((r) => r.product);
}

/* ── Occasion keyword extractor ──────────────────────────────────── */
const OCCASION_KEYWORDS: Record<string, string[]> = {
  casual:      ["casual", "everyday", "chill", "lounge", "home", "lazy", "relaxed", "sunday"],
  college:     ["college", "university", "class", "campus", "study", "school"],
  "night-out": ["party", "night out", "dinner", "weekend", "going out", "club", "date", "birthday", "friends"],
  beach:       ["beach", "vacation", "holiday", "travel", "trip", "pool", "summer"],
  active:      ["gym", "sport", "active", "workout", "running", "yoga", "exercise"],
  work:        ["work", "office", "internship", "job", "meeting", "professional"],
};

export function extractOccasion(text: string): string | null {
  const lower = text.toLowerCase();
  for (const [occasion, kws] of Object.entries(OCCASION_KEYWORDS)) {
    if (kws.some((kw) => lower.includes(kw))) return occasion;
  }
  return null;
}

export function extractColors(text: string): string[] {
  const lower = text.toLowerCase();
  const found: string[] = [];
  for (const color of Object.keys(COLOR_ALIASES)) {
    const aliases = COLOR_ALIASES[color];
    if (aliases.some((a) => lower.includes(a))) {
      if (!found.includes(color)) found.push(color);
    }
  }
  return found;
}
