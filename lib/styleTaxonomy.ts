/**
 * The style "knowledge base" — encodes fashion expertise as data:
 *   • which aesthetics work together (and which clash)
 *   • which colors harmonise
 *   • which aesthetics fit which occasions
 *   • outfit role templates (what makes a complete look)
 *
 * Everything in this file is hand-tuned by fashion logic, not learned.
 * It's what gives the engine its "expert stylist" feel from day one.
 */

import { Aesthetic, ColorFamily, ProductType } from "@/types/fashion";

/* ──────────────────────────────────────────────────────────────
   AESTHETIC COMPATIBILITY  — what vibes mix well, which clash
   1.0 = perfect match  |  0.0 = full clash
   ────────────────────────────────────────────────────────────── */
export const AESTHETIC_AFFINITY: Record<Aesthetic, Partial<Record<Aesthetic, number>>> = {
  "y2k-revival":         { "y2k-revival": 1.0, "feminine-romantic": 0.7, "urban-streetwear": 0.6, "athleisure": 0.4, "smart-casual": 0.2, "minimal-clean": 0.2, "preppy-collegiate": 0.3, "boho-coastal": 0.4 },
  "urban-streetwear":    { "urban-streetwear": 1.0, "athleisure": 0.85, "y2k-revival": 0.6, "minimal-clean": 0.5, "smart-casual": 0.5, "preppy-collegiate": 0.5, "feminine-romantic": 0.3, "boho-coastal": 0.3 },
  "smart-casual":        { "smart-casual": 1.0, "minimal-clean": 0.9, "preppy-collegiate": 0.75, "feminine-romantic": 0.55, "urban-streetwear": 0.5, "boho-coastal": 0.45, "athleisure": 0.4, "y2k-revival": 0.2 },
  "minimal-clean":       { "minimal-clean": 1.0, "smart-casual": 0.9, "urban-streetwear": 0.5, "athleisure": 0.55, "preppy-collegiate": 0.65, "feminine-romantic": 0.5, "boho-coastal": 0.4, "y2k-revival": 0.2 },
  "boho-coastal":        { "boho-coastal": 1.0, "feminine-romantic": 0.8, "smart-casual": 0.45, "minimal-clean": 0.4, "y2k-revival": 0.4, "urban-streetwear": 0.3, "preppy-collegiate": 0.3, "athleisure": 0.3 },
  "preppy-collegiate":   { "preppy-collegiate": 1.0, "smart-casual": 0.75, "minimal-clean": 0.65, "urban-streetwear": 0.5, "athleisure": 0.55, "feminine-romantic": 0.5, "boho-coastal": 0.3, "y2k-revival": 0.3 },
  "athleisure":          { "athleisure": 1.0, "urban-streetwear": 0.85, "minimal-clean": 0.55, "preppy-collegiate": 0.55, "smart-casual": 0.4, "y2k-revival": 0.4, "feminine-romantic": 0.3, "boho-coastal": 0.3 },
  "feminine-romantic":   { "feminine-romantic": 1.0, "boho-coastal": 0.8, "y2k-revival": 0.7, "smart-casual": 0.55, "minimal-clean": 0.5, "preppy-collegiate": 0.5, "urban-streetwear": 0.3, "athleisure": 0.3 },
};

/* ──────────────────────────────────────────────────────────────
   COLOR HARMONY  — Gen-Z friendly palette rules
   ────────────────────────────────────────────────────────────── */
export const COLOR_AFFINITY: Record<ColorFamily, Partial<Record<ColorFamily, number>>> = {
  "neutral":      { "neutral": 0.85, "earth": 0.95, "warm-pastel": 0.9, "cool-pastel": 0.9, "bold": 0.85, "jewel-tone": 0.85, "monochrome": 0.9, "multi": 0.85 },
  "earth":        { "earth": 0.85, "neutral": 0.95, "warm-pastel": 0.85, "cool-pastel": 0.6, "bold": 0.7, "jewel-tone": 0.7, "monochrome": 0.7, "multi": 0.8 },
  "warm-pastel":  { "warm-pastel": 0.85, "neutral": 0.9, "earth": 0.85, "cool-pastel": 0.7, "bold": 0.65, "jewel-tone": 0.55, "monochrome": 0.8, "multi": 0.75 },
  "cool-pastel":  { "cool-pastel": 0.85, "neutral": 0.9, "earth": 0.6, "warm-pastel": 0.7, "bold": 0.6, "jewel-tone": 0.75, "monochrome": 0.8, "multi": 0.7 },
  "bold":         { "bold": 0.5, "neutral": 0.85, "earth": 0.7, "warm-pastel": 0.65, "cool-pastel": 0.6, "jewel-tone": 0.55, "monochrome": 0.8, "multi": 0.6 },
  "jewel-tone":   { "jewel-tone": 0.7, "neutral": 0.85, "earth": 0.7, "warm-pastel": 0.55, "cool-pastel": 0.75, "bold": 0.55, "monochrome": 0.85, "multi": 0.7 },
  "monochrome":   { "monochrome": 0.9, "neutral": 0.9, "earth": 0.7, "warm-pastel": 0.8, "cool-pastel": 0.8, "bold": 0.8, "jewel-tone": 0.85, "multi": 0.75 },
  "multi":        { "multi": 0.5, "neutral": 0.85, "earth": 0.8, "warm-pastel": 0.75, "cool-pastel": 0.7, "bold": 0.6, "jewel-tone": 0.7, "monochrome": 0.75 },
};

/* ──────────────────────────────────────────────────────────────
   OCCASION → preferred aesthetics + formality
   Includes the curator's 28 specific Gen-Z India occasion tags
   from the xlsx + legacy broad tags as aliases.
   ────────────────────────────────────────────────────────────── */
export const OCCASION_PROFILE: Record<string, { aesthetics: Aesthetic[]; formality: number; }> = {
  /* ── Legacy broad tags (kept for backward compatibility) ── */
  "casual":      { aesthetics: ["urban-streetwear", "minimal-clean", "athleisure"],         formality: 2 },
  "college":     { aesthetics: ["urban-streetwear", "preppy-collegiate", "athleisure"],     formality: 2 },
  "brunch":      { aesthetics: ["smart-casual", "minimal-clean", "feminine-romantic"],      formality: 3 },
  "date-night":  { aesthetics: ["smart-casual", "feminine-romantic", "y2k-revival"],        formality: 4 },
  "party":       { aesthetics: ["y2k-revival", "feminine-romantic", "urban-streetwear"],    formality: 4 },
  "festival":    { aesthetics: ["y2k-revival", "boho-coastal", "feminine-romantic"],        formality: 3 },
  "beach":       { aesthetics: ["boho-coastal", "smart-casual", "minimal-clean"],            formality: 2 },
  "travel":      { aesthetics: ["athleisure", "smart-casual", "minimal-clean"],              formality: 2 },
  "work":        { aesthetics: ["smart-casual", "minimal-clean", "preppy-collegiate"],       formality: 4 },
  "active":      { aesthetics: ["athleisure", "urban-streetwear"],                            formality: 1 },
  "wedding":     { aesthetics: ["feminine-romantic", "smart-casual"],                         formality: 5 },
  "hangout":     { aesthetics: ["urban-streetwear", "minimal-clean"],                         formality: 2 },
  "everyday":    { aesthetics: ["urban-streetwear", "minimal-clean", "athleisure"],          formality: 2 },

  /* ── Curator-specific tags from the xlsx (Gen-Z India occasions) ── */
  // Casual / daily life
  "casual-hangout":       { aesthetics: ["urban-streetwear", "minimal-clean", "athleisure"],       formality: 2 },
  "friends-place":        { aesthetics: ["urban-streetwear", "minimal-clean"],                      formality: 2 },
  "mall":                 { aesthetics: ["urban-streetwear", "minimal-clean", "preppy-collegiate"], formality: 2 },
  "dailywear":            { aesthetics: ["urban-streetwear", "minimal-clean", "athleisure"],       formality: 2 },
  "daily-campus-life":    { aesthetics: ["urban-streetwear", "preppy-collegiate", "athleisure"],   formality: 2 },

  // Café / dining
  "cafe":                 { aesthetics: ["smart-casual", "minimal-clean", "feminine-romantic"],    formality: 3 },
  "dinner":               { aesthetics: ["smart-casual", "feminine-romantic", "y2k-revival"],      formality: 4 },

  // College events / fests
  "college-fest":         { aesthetics: ["y2k-revival", "feminine-romantic", "urban-streetwear"],  formality: 3 },
  "freshers-night":       { aesthetics: ["y2k-revival", "feminine-romantic", "smart-casual"],      formality: 4 },
  "music-gig":            { aesthetics: ["y2k-revival", "urban-streetwear", "boho-coastal"],       formality: 3 },
  "concert":              { aesthetics: ["y2k-revival", "urban-streetwear"],                       formality: 3 },
  "ipl-screening":        { aesthetics: ["urban-streetwear", "athleisure"],                        formality: 2 },
  "watching-sports":      { aesthetics: ["athleisure", "urban-streetwear"],                        formality: 2 },

  // Party / nightlife
  "house-party":          { aesthetics: ["y2k-revival", "feminine-romantic", "urban-streetwear"],  formality: 4 },
  "clubbing":             { aesthetics: ["y2k-revival", "feminine-romantic"],                      formality: 4 },
  "birthday-outfit":      { aesthetics: ["y2k-revival", "feminine-romantic", "smart-casual"],      formality: 4 },

  // Formal events
  "prom":                 { aesthetics: ["feminine-romantic", "smart-casual", "y2k-revival"],      formality: 5 },
  "farewell":             { aesthetics: ["smart-casual", "feminine-romantic"],                     formality: 4 },
  "family-office-dinner": { aesthetics: ["smart-casual", "minimal-clean"],                         formality: 4 },
  "networking":           { aesthetics: ["smart-casual", "minimal-clean", "preppy-collegiate"],    formality: 4 },
  "internship":           { aesthetics: ["smart-casual", "minimal-clean", "preppy-collegiate"],    formality: 4 },
  "office":               { aesthetics: ["smart-casual", "minimal-clean"],                         formality: 4 },

  // Travel
  "airport-look":         { aesthetics: ["athleisure", "smart-casual", "minimal-clean"],           formality: 2 },
  "travel-day-trip":      { aesthetics: ["athleisure", "minimal-clean", "smart-casual"],           formality: 2 },
  "vacation-wear":        { aesthetics: ["boho-coastal", "feminine-romantic", "smart-casual"],     formality: 3 },

  // Athletic
  "athleisure":           { aesthetics: ["athleisure", "urban-streetwear"],                        formality: 1 },
};

/* ──────────────────────────────────────────────────────────────
   OCCASION_ALIAS — broad-tag / natural-language → canonical slug
   Lets users type "party" and have it match house-party + clubbing too.
   ────────────────────────────────────────────────────────────── */
export const OCCASION_ALIAS: Record<string, string[]> = {
  // "party" expands to all party-style occasions
  "party":       ["party", "house-party", "clubbing", "birthday-outfit"],
  "festival":    ["festival", "college-fest", "music-gig", "concert", "freshers-night"],
  "casual":      ["casual", "casual-hangout", "dailywear", "friends-place", "mall", "hangout"],
  "college":     ["college", "college-fest", "freshers-night", "daily-campus-life"],
  "work":        ["work", "office", "internship", "networking", "family-office-dinner"],
  "travel":      ["travel", "airport-look", "travel-day-trip", "vacation-wear"],
  "active":      ["active", "athleisure", "watching-sports", "ipl-screening"],
  "date":        ["date-night", "dinner", "cafe"],
  "date-night":  ["date-night", "dinner", "cafe"],
};

/** Expand a user-typed occasion into all matching slugs (the slug itself + aliases) */
export function expandOccasion(occ: string): string[] {
  const k = occ.toLowerCase().trim();
  return OCCASION_ALIAS[k] ?? [k];
}

/* ──────────────────────────────────────────────────────────────
   VIBE LABEL → canonical aesthetic key (for Claude responses)
   ────────────────────────────────────────────────────────────── */
export const VIBE_TO_AESTHETIC: Record<string, Aesthetic> = {
  "y2k revival":          "y2k-revival",
  "y2k":                  "y2k-revival",
  "urban streetwear":     "urban-streetwear",
  "streetwear":           "urban-streetwear",
  "smart casual":         "smart-casual",
  "minimal":              "minimal-clean",
  "minimal clean":        "minimal-clean",
  "boho":                 "boho-coastal",
  "boho coastal":         "boho-coastal",
  "preppy":               "preppy-collegiate",
  "athleisure":           "athleisure",
  "feminine":             "feminine-romantic",
  "romantic":             "feminine-romantic",
  "feminine romantic":    "feminine-romantic",
};

export const AESTHETIC_LABEL: Record<Aesthetic, string> = {
  "y2k-revival":          "Y2K Revival",
  "urban-streetwear":     "Urban Streetwear",
  "smart-casual":         "Smart Casual",
  "minimal-clean":        "Minimal Clean",
  "boho-coastal":         "Boho Coastal",
  "preppy-collegiate":    "Preppy Collegiate",
  "athleisure":           "Athleisure",
  "feminine-romantic":    "Feminine Romantic",
};

/* ──────────────────────────────────────────────────────────────
   OUTFIT TEMPLATES — what makes a complete look
   ────────────────────────────────────────────────────────────── */
export interface RoleSlot {
  role:     string;
  types:    ProductType[];
  required: boolean;
}

export const OUTFIT_TEMPLATES: Record<string, RoleSlot[]> = {
  // Classic top + bottom look
  "two-piece": [
    { role: "top",        types: ["TOP"],                required: true  },
    { role: "bottom",     types: ["BOTTOM"],             required: true  },
    { role: "footwear",   types: ["FOOTWEAR"],           required: true  },
    { role: "bag",        types: ["BAG"],                required: false },
    { role: "sunglasses", types: ["EYEWEAR"],            required: false },
    { role: "necklace",   types: ["JEWELRY"],            required: false },
  ],
  // Dress-based look
  "dress": [
    { role: "dress",      types: ["DRESS"],              required: true  },
    { role: "footwear",   types: ["FOOTWEAR"],           required: true  },
    { role: "bag",        types: ["BAG"],                required: false },
    { role: "sunglasses", types: ["EYEWEAR"],            required: false },
    { role: "necklace",   types: ["JEWELRY"],            required: false },
  ],
};

/* ──────────────────────────────────────────────────────────────
   Scoring helpers
   ────────────────────────────────────────────────────────────── */
export function aestheticAffinity(a: Aesthetic, b: Aesthetic): number {
  return AESTHETIC_AFFINITY[a]?.[b] ?? AESTHETIC_AFFINITY[b]?.[a] ?? 0.3;
}

export function colorAffinity(a: ColorFamily, b: ColorFamily): number {
  return COLOR_AFFINITY[a]?.[b] ?? COLOR_AFFINITY[b]?.[a] ?? 0.5;
}

/** Max affinity across all combos of two aesthetic lists */
export function listAestheticAffinity(as: Aesthetic[], bs: Aesthetic[]): number {
  let best = 0;
  for (const a of as) for (const b of bs) best = Math.max(best, aestheticAffinity(a, b));
  return best;
}
