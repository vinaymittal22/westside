import { extractOccasion, extractColors } from "./filterProducts";

export interface ParsedIntent {
  occasion?: string;
  gender?: "male" | "female";
  colors?: string[];
  budgetMin?: number;
  budgetMax?: number;
  bodyType?: string;
  colorsSkipped?: boolean;
}

/* ── Budget extraction ────────────────────────────────────────── */
export function parseBudgetFromText(text: string): { min: number; max: number } | null {
  // Normalise: remove ₹ and commas, expand k → 000
  const t = text
    .toLowerCase()
    .replace(/[₹,]/g, "")
    .replace(/(\d+)\s*k\b/g, (_, n) => String(parseInt(n) * 1000));

  // Quick-reply format "0-3000" or "3000-10000"
  const dashMatch = t.match(/^(\d+)\s*[-–]\s*(\d+)$/);
  if (dashMatch) return { min: +dashMatch[1], max: +dashMatch[2] };

  // "between X and Y" / "X to Y"
  const rangeMatch = t.match(/(?:between\s+)?(\d+)\s*(?:to|[-–]|and)\s*(\d+)/);
  if (rangeMatch) return { min: +rangeMatch[1], max: +rangeMatch[2] };

  // "under / below / less than / within / upto / max X"
  const underMatch = t.match(
    /(?:under|below|less\s+than|within|upto|up\s+to|max|maximum|atmost|at\s+most)\s*(\d+)/
  );
  if (underMatch) return { min: 0, max: +underMatch[1] };

  // "above / over / more than / at least / min X"
  const overMatch = t.match(
    /(?:above|over|more\s+than|at\s+least|minimum|min)\s*(\d+)/
  );
  if (overMatch) return { min: +overMatch[1], max: Infinity };

  // Standalone number in a budget context ("5000", "₹5000")
  const standaloneMatch = t.match(/\b(\d{3,6})\b/);
  if (
    standaloneMatch &&
    /(budget|spend|rupees|price|cost|afford|range|rs)/i.test(text)
  ) {
    return { min: 0, max: +standaloneMatch[1] };
  }

  return null;
}

/* ── Gender extraction ────────────────────────────────────────── */
export function parseGender(text: string): "male" | "female" | null {
  const t = text.toLowerCase();
  if (/\b(female|woman|women|girl|lady|ladies|her|she|bride|bridal)\b/.test(t))
    return "female";
  if (/\b(male|man|men|boy|gents|gentleman|his|him|he|groom|husband)\b/.test(t))
    return "male";
  return null;
}

/* ── Body type extraction ─────────────────────────────────────── */
const BODY_ALIASES: [RegExp, string][] = [
  [/\b(slim|thin|lean|slender|petite)\b/, "slim"],
  [/\b(athletic|fit|muscular|toned|sporty)\b/, "athletic"],
  [/\b(regular|average|medium|normal)\b/, "regular"],
  [/\b(curvy|hourglass|voluptuous)\b/, "curvy"],
  [/\b(plus.?size|plus|full.?figured|large|xl|xxl)\b/, "plus-size"],
];

export function parseBodyType(text: string): string | null {
  const t = text.toLowerCase();
  for (const [re, bt] of BODY_ALIASES) {
    if (re.test(t)) return bt;
  }
  return null;
}

/* ── Master intent parser ─────────────────────────────────────── */
export function parseIntent(text: string): ParsedIntent {
  const intent: ParsedIntent = {};

  const occasion = extractOccasion(text);
  if (occasion) intent.occasion = occasion;

  const colors = extractColors(text);
  if (colors.length) intent.colors = colors;
  if (/\b(no\s+preference|any\s+color|any\s+colour|no\s+color|doesn.t\s+matter|anything)\b/i.test(text))
    intent.colorsSkipped = true;

  const budget = parseBudgetFromText(text);
  if (budget) { intent.budgetMin = budget.min; intent.budgetMax = budget.max; }

  const gender = parseGender(text);
  if (gender) intent.gender = gender;

  const bodyType = parseBodyType(text);
  if (bodyType) intent.bodyType = bodyType;

  return intent;
}
