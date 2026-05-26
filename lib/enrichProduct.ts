/**
 * Takes a raw FashionProduct from data/catalogue.ts and infers
 * product_type, aesthetics[], color_family, formality, boldness
 * from its existing tags / category / name / colors.
 *
 * This is the bridge between hand-written catalogue data and the
 * style engine — no manual re-tagging of 50+ products needed.
 */

import { FashionProduct } from "@/types";
import { Aesthetic, ColorFamily, EnrichedProduct, ProductType } from "@/types/fashion";
import { productUrl } from "./productUrl";

/* ──────────────────────────────────────────────────────────────
   1. product_type from category + name + tags
   Uses tag-set matching (exact word match) not substring regex to avoid
   false positives like "spring26" matching /ring/.
   ────────────────────────────────────────────────────────────── */
const JEWELRY_TAGS = new Set([
  "necklace","necklaces","pendant","pendants","chain","chains",
  "earring","earrings","ring","rings","bracelet","bracelets",
  "jewelry","jewel","jewels","cuff","cuffs","charm","charms",
  "keychain","keychains","cordbelt","stud","studs",
]);
const EYEWEAR_TAGS = new Set(["sunglass","sunglasses","eyewear","shades","glasses"]);
const HAT_TAGS     = new Set(["hat","hats","cap","caps","beanie","beanies","headband","hatshair"]);
const WATCH_TAGS   = new Set(["watch","watches"]);
const BAG_TAGS     = new Set(["bag","bags","tote","totes","backpack","backpacks","pouch","pouches","crossbodybag","clutch","clutches","shoulderbag","handbag"]);
const SOCKS_KEYWORDS = ["sock","socks"];

function hasAnyTag(tags: string[], set: Set<string>): boolean {
  return tags.some(t => set.has(t.toLowerCase()));
}

function inferProductType(p: FashionProduct): ProductType {
  const cat = p.category.toLowerCase();
  const name = p.name.toLowerCase();
  const tags = (p.tags ?? []).map(t => t.toLowerCase());

  if (cat === "dresses" || /\bdress\b/.test(name)) return "DRESS";
  if (cat === "footwear" || /\b(sneaker|sandal|loafer|trainer|shoe|heel|boot)/.test(name)) return "FOOTWEAR";

  // Explicit "Bags" category (used in curated catalogue) — classify before accessories fallback
  if (cat === "bags" || /\bbag\b|\btote\b|\bbackpack\b|\bpouch\b|\bclutch\b/.test(name)) return "BAG";

  // "Jeans" and "Pants" categories (used in curated catalogue) — same as Bottoms/Denims
  if (cat === "jeans" || cat === "pants") return "BOTTOM";

  if (cat === "accessories") {
    // socks have no slot in any outfit template → flag as BAG (gets filtered downstream)
    if (SOCKS_KEYWORDS.some(k => name.includes(k))) return "BAG";
    if (hasAnyTag(tags, EYEWEAR_TAGS) || /\bsunglass|\beyewear|\bshades\b/.test(name)) return "EYEWEAR";
    if (hasAnyTag(tags, HAT_TAGS) || /\bhat\b|\bcap\b|\bbeanie\b|\bheadband\b/.test(name)) return "HAT";
    if (hasAnyTag(tags, WATCH_TAGS) || /\bwatch\b/.test(name)) return "WATCH";
    if (hasAnyTag(tags, JEWELRY_TAGS) || /\bnecklace\b|\bbracelet\b|\bearring|\bring\b|\bjewel/.test(name)) return "JEWELRY";
    if (hasAnyTag(tags, BAG_TAGS) || /\bbag\b|\btote\b|\bbackpack\b|\bpouch\b|\bclutch\b/.test(name)) return "BAG";
    return "BAG"; // default fallback
  }
  if (cat === "bottoms" || cat === "denims" || cat === "skirts" ||
      /pant|jean|skirt|short|trouser/.test(name)) return "BOTTOM";
  if (cat === "t-shirts" || cat === "tops" ||
      /tee|shirt|top|blouse|cardigan|sweater|sweatshirt|crop|jacket|coat|hoodie|knit|vest/.test(name)) return "TOP";
  return "TOP";
}

/* ──────────────────────────────────────────────────────────────
   2. aesthetics[] from tags (multi-label, max 3)
   ────────────────────────────────────────────────────────────── */
const TAG_TO_AESTHETIC: Array<[RegExp, Aesthetic, number]> = [
  // [matcher, aesthetic, confidence weight]
  [/y2k|retro|sequin|metallic/i,                          "y2k-revival",       1.0],
  [/bold|statement|playful/i,                             "y2k-revival",       0.7],
  [/streetwear|oversized|baggy|graphic\s*tee|graphictee/i, "urban-streetwear",  1.0],
  [/relaxed|loose|wide-leg|widelegjean|woven|cherry/i,    "urban-streetwear",  0.6],
  [/smartcasual|smart\s*casual|chic|elegant|classic|tailored/i, "smart-casual", 1.0],
  [/minimal|clean|solid\b|fitted|v-neck|round-neck/i,     "minimal-clean",     0.8],
  [/boho|crochet|tassel|fringe|woven|earthy/i,            "boho-coastal",      1.0],
  [/coast|beach|breezy|summer/i,                          "boho-coastal",      0.5],
  [/preppy|polo|pleated|check|plaid|collar|cardigan/i,    "preppy-collegiate", 1.0],
  [/sport|athleisure|athletic|trainer|mesh|technical/i,   "athleisure",        1.0],
  [/perforated|lace-up|sneaker/i,                         "athleisure",        0.5],
  [/feminine|ruffl|lace|schiffli|embroidered|tie-up|sweetheart|bow|charm/i, "feminine-romantic", 1.0],
  [/pink|pastel|blush|peach|romantic/i,                   "feminine-romantic", 0.5],
];

function inferAesthetics(p: FashionProduct): Aesthetic[] {
  const text = [
    p.name, p.category, p.fabric ?? "", p.fit ?? "",
    ...(p.tags ?? []),
    ...(p.color ?? []),
    p.description,
  ].join(" ").toLowerCase();

  const scores: Partial<Record<Aesthetic, number>> = {};
  for (const [matcher, aesthetic, weight] of TAG_TO_AESTHETIC) {
    if (matcher.test(text)) {
      scores[aesthetic] = (scores[aesthetic] ?? 0) + weight;
    }
  }

  // sort by score desc, take top 3
  const ranked = Object.entries(scores).sort(([, a], [, b]) => (b ?? 0) - (a ?? 0));
  const top = ranked.slice(0, 3).map(([k]) => k as Aesthetic);

  // safe default if nothing matched
  if (top.length === 0) return ["urban-streetwear", "minimal-clean"];
  return top;
}

/* ──────────────────────────────────────────────────────────────
   3. color_family from colors[] + tags
   ────────────────────────────────────────────────────────────── */
const COLOR_FAMILY_MAP: Array<[RegExp, ColorFamily]> = [
  [/white|black|grey|gray|cream|stone|ivory|silver/i, "neutral"],
  [/brown|khaki|sage|olive|chocolate|tan|camel|beige/i, "earth"],
  [/pink|blush|peach|coral|salmon|wine\s*pink|winepink/i, "warm-pastel"],
  [/mint|sky|lilac|lavender|periwinkle/i, "cool-pastel"],
  [/red|yellow|orange|electric|neon|fuschia|magenta/i, "bold"],
  [/navy|indigo|emerald|sapphire|burgundy|maroon|jewel/i, "jewel-tone"],
  [/multi|print|graphic|floral|striped|check|pattern/i, "multi"],
];

function inferColorFamily(p: FashionProduct): ColorFamily {
  const text = [
    ...(p.color ?? []),
    ...(p.tags ?? []),
    p.name,
  ].join(" ").toLowerCase();

  // mono check first
  if (/black/.test(text) && /white/.test(text)) return "monochrome";
  for (const [matcher, family] of COLOR_FAMILY_MAP) {
    if (matcher.test(text)) return family;
  }
  return "neutral";
}

/* ──────────────────────────────────────────────────────────────
   4. formality 1-5 from tags / category
   ────────────────────────────────────────────────────────────── */
function inferFormality(p: FashionProduct, type: ProductType, aesthetics: Aesthetic[]): 1 | 2 | 3 | 4 | 5 {
  const text = [p.name, p.fit ?? "", ...(p.tags ?? []), ...(p.occasion ? [p.occasion] : [])].join(" ").toLowerCase();
  if (/active|gym|sport|train/.test(text)) return 1;
  if (aesthetics.includes("athleisure")) return 2;
  if (/baggy|oversized|graphic|baby\s*tee|babytee|sweatshirt|tee\b/.test(text)) return 2;
  if (aesthetics.includes("smart-casual") || /chic|elegant|tailored|blouse/.test(text)) return 4;
  if (aesthetics.includes("y2k-revival") && /party|sequin/.test(text)) return 4;
  if (type === "DRESS") return 3;
  if (type === "JEWELRY" || type === "EYEWEAR") return 3;
  return 3;
}

/* ──────────────────────────────────────────────────────────────
   5. boldness 1-5
   ────────────────────────────────────────────────────────────── */
function inferBoldness(p: FashionProduct, colorFamily: ColorFamily, aesthetics: Aesthetic[]): 1 | 2 | 3 | 4 | 5 {
  const text = [p.name, ...(p.tags ?? [])].join(" ").toLowerCase();
  if (/sequin|metallic|statement/.test(text)) return 5;
  if (/embroidered|embellished|graphic|cherry|print|sweetheart/.test(text)) return 4;
  if (colorFamily === "bold" || colorFamily === "multi") return 4;
  if (aesthetics.includes("y2k-revival")) return 4;
  if (colorFamily === "neutral" || colorFamily === "monochrome") return 2;
  if (colorFamily === "earth") return 2;
  return 3;
}

/* ──────────────────────────────────────────────────────────────
   Main enrich function — pure, deterministic.
   curated_aesthetics from the xlsx (if present) OVERRIDE auto-derived
   aesthetics, because human curator judgment > regex pattern matching.
   ────────────────────────────────────────────────────────────── */
export function enrichProduct(p: FashionProduct): EnrichedProduct {
  const product_type = inferProductType(p);
  const autoAesthetics = inferAesthetics(p);
  // Use curator's aesthetics if present, fall back to auto-derived
  const aesthetics: Aesthetic[] =
    (p.curated_aesthetics && p.curated_aesthetics.length > 0)
      ? (p.curated_aesthetics.filter(a => (a as Aesthetic) !== undefined) as Aesthetic[])
      : autoAesthetics;
  const color_family = inferColorFamily(p);
  const formality    = inferFormality(p, product_type, aesthetics);
  const boldness     = inferBoldness(p, color_family, aesthetics);
  return {
    ...p,
    product_type,
    aesthetics,
    color_family,
    formality,
    boldness,
    url: productUrl(p),
  };
}
