/**
 * Style Explainer — generates "WHY this outfit works" commentary
 * from the engine's picked products. Encodes:
 *   - color theory rules
 *   - silhouette / fit balance rules
 *   - accessory coordination
 *   - aesthetic name mapping (engine vibe → Gen Z trend name)
 *   - day-to-night transition suggestions
 *
 * Pure function, deterministic, no LLM call.
 */

import { Aesthetic, ColorFamily, EnrichedProduct, GeneratedOutfit, OutfitSlot } from "@/types/fashion";

export interface StyleNotes {
  aesthetic_name: string;      // Gen Z trend name (e.g. "Clean Girl Aesthetic")
  vibe_summary:   string;      // 1-sentence vibe punchline
  color_story:    string;      // Why these colors work
  fit_balance:    string;      // Why these silhouettes pair
  accessory_note: string;      // Why accessories complete it
  day_to_night?:  string;      // Optional transition suggestion
}

/* ──────────────────────────────────────────────────────────────
   Engine aesthetic → trending Gen Z name
   ────────────────────────────────────────────────────────────── */
const AESTHETIC_TREND_NAME: Record<Aesthetic, string[]> = {
  "y2k-revival":         ["Y2K Revival", "Coquette Y2K"],
  "urban-streetwear":    ["Streetwear Layering", "Gen Z Streetwear", "Utility Streetwear"],
  "smart-casual":        ["Elevated Basics", "Quiet Luxury", "Smart Casual"],
  "minimal-clean":       ["Clean Girl Aesthetic", "Scandi Minimal", "Pinterest Minimal"],
  "boho-coastal":        ["Coastal Cowgirl", "Boho Coastal"],
  "preppy-collegiate":   ["Old Money Prep", "Tomboy Prep", "Coastal Prep"],
  "athleisure":          ["Athleisure", "Active Edit"],
  "feminine-romantic":   ["Soft Girl"],
};

function pickTrendName(vibe: Aesthetic, seed: number): string {
  const list = AESTHETIC_TREND_NAME[vibe] ?? ["Curated Look"];
  return list[seed % list.length];
}

/* ──────────────────────────────────────────────────────────────
   Color story templates — generated from color_family combos
   ────────────────────────────────────────────────────────────── */
function describeColorStory(slots: OutfitSlot[]): string {
  const families = slots.map(s => s.product.color_family);
  const fSet = new Set(families);

  // Monochrome / single-family
  if (fSet.size === 1) {
    const f = [...fSet][0];
    if (f === "neutral")     return "Monochrome neutral layering — peak quiet luxury, the kind of look that feels expensive without trying.";
    if (f === "earth")       return "All-earth-tone palette — quietly luxurious, very Pinterest, lowkey rich-girl energy.";
    if (f === "warm-pastel") return "Soft warm pastels throughout — coquette dream, ridiculously photogenic.";
    if (f === "bold")        return "Full saturated colour story — bold-on-bold takes guts, and you've got them.";
    if (f === "jewel-tone")  return "Tonal jewel palette — rich, moody, quietly elevated.";
    return "Tonal layering throughout — premium aesthetic, no notes.";
  }

  const has = (f: ColorFamily) => fSet.has(f);

  // Earth + neutral — quiet luxury favorite
  if (has("earth") && has("neutral"))     return "Earth-tones grounded in neutrals — old-money palette, ages like fine wine.";
  // Warm pastel + neutral — clean girl
  if (has("warm-pastel") && has("neutral")) return "Soft pastels on a neutral base — clean girl coded, Pinterest favorite.";
  // Bold + neutral — statement balanced
  if (has("bold") && has("neutral"))      return "One statement colour + clean neutrals — perfect balance, never extra.";
  // Bold + earth — warm story
  if (has("bold") && has("earth"))        return "Bold pop against warm earth tones — fashion-forward, intentionally loud.";
  // Cool pastel + neutral
  if (has("cool-pastel") && has("neutral")) return "Cool pastels on neutrals — fresh, airy, very Scandi minimal.";
  // Jewel + neutral
  if (has("jewel-tone") && has("neutral")) return "Jewel tones grounded in neutrals — moody luxury aesthetic.";
  // Multi/print + anything
  if (has("multi"))                       return "Print as the focal point, neutrals letting it breathe — intentional, never busy.";
  // Monochrome + accent
  if (has("monochrome"))                  return "Monochrome backbone with a colour accent — modern minimal done right.";

  return "Intentional contrast across the palette — confident colour story.";
}

/* ──────────────────────────────────────────────────────────────
   Fit balance — silhouette rules
   ────────────────────────────────────────────────────────────── */
function describeFitBalance(slots: OutfitSlot[]): string {
  const top    = slots.find(s => s.role === "top")?.product;
  const bottom = slots.find(s => s.role === "bottom")?.product;
  const dress  = slots.find(s => s.role === "dress")?.product;

  if (dress) {
    const fit = (dress.fit || "").toLowerCase();
    if (fit.includes("mini") || dress.name.toLowerCase().includes("mini"))
      return "Mini-dress silhouette with a structured footwear base — leg-lengthening and very Pinterest.";
    if (fit.includes("flow") || fit.includes("ruffl"))
      return "Flowing dress softness anchored by structured shoes — feminine but never frilly.";
    return "Dress-led silhouette, accessories doing the elevation work — effortless main character energy.";
  }

  if (!top || !bottom) return "Balanced proportions throughout — the kind of silhouette that just works.";

  const tf = (top.fit || "").toLowerCase();
  const bf = (bottom.fit || "").toLowerCase();

  // Oversized + fitted/structured → the Gen Z rule
  if ((tf.includes("oversized") || tf.includes("boxy") || tf.includes("baggy")) && (bf.includes("fitted") || bf.includes("slim") || bf.includes("regular") || bf.includes("straight")))
    return "Oversized top × fitted bottom — Gen Z's #1 silhouette rule, balances volume so you look intentional, not swallowed.";

  // Fitted top + wide-leg/baggy bottom
  if ((tf.includes("fitted") || tf.includes("slim") || tf.includes("crop")) && (bf.includes("wide") || bf.includes("baggy") || bf.includes("relaxed")))
    return "Fitted top × wide-leg bottom — elongates the body, peak Pinterest aesthetic, lowkey flattering on everyone.";

  // Crop + high-waist
  if ((tf.includes("crop") || top.name.toLowerCase().includes("crop")) && bottom.name.toLowerCase().includes("high"))
    return "Cropped top × high-waist bottom — defines the waist, lengthens the legs, never not flattering.";

  // Both fitted
  if (tf.includes("fitted") && bf.includes("fitted"))
    return "Fitted top and bottom — clean-girl silhouette, sleek and put-together.";

  // Both oversized — only works for streetwear
  if ((tf.includes("oversized") || tf.includes("baggy")) && (bf.includes("baggy") || bf.includes("wide")))
    return "Oversized everything — peak streetwear styling, balanced by sneakers + accessories.";

  return "Top and bottom proportions complement each other — the silhouette just sits right.";
}

/* ──────────────────────────────────────────────────────────────
   Accessory coordination
   ────────────────────────────────────────────────────────────── */
function describeAccessories(slots: OutfitSlot[]): string {
  const footwear  = slots.find(s => s.role === "footwear")?.product;
  const necklace  = slots.find(s => s.role === "necklace")?.product;
  const bag       = slots.find(s => s.role === "bag")?.product;
  const sunglasses = slots.find(s => s.role === "sunglasses")?.product;

  const dominantFamily = pickDominantColorFamily(slots);
  const isWarm = dominantFamily === "earth" || dominantFamily === "warm-pastel";
  const isCool = dominantFamily === "neutral" || dominantFamily === "cool-pastel" || dominantFamily === "jewel-tone" || dominantFamily === "monochrome";

  const parts: string[] = [];

  if (necklace) {
    const nameL = necklace.name.toLowerCase();
    const isGold = nameL.includes("gold") || (necklace.color || []).some(c => /gold/i.test(c));
    const isSilver = nameL.includes("silver") || (necklace.color || []).some(c => /silver/i.test(c));
    if (isGold && isWarm) parts.push("gold jewellery against this warm palette completes the rich-girl finish");
    else if (isSilver && isCool) parts.push("silver pairs perfectly with the cool tonal story");
    else if (isGold) parts.push("gold accent adds warmth without disrupting the palette");
    else parts.push("jewellery placed as a quiet anchor, not the focal point");
  }

  if (footwear) {
    const fnL = footwear.name.toLowerCase();
    if (fnL.includes("sneaker") || fnL.includes("trainer")) {
      if (fnL.includes("chunky") || fnL.includes("platform")) parts.push("chunky sneakers ground the look in Gen Z streetwear");
      else if (fnL.includes("white")) parts.push("white sneakers keep it versatile casual-smart");
      else parts.push("sneakers anchor the look with sporty ease");
    } else if (fnL.includes("sandal")) parts.push("sandals keep it breezy and warm-weather appropriate");
    else if (fnL.includes("loafer")) parts.push("loafers add smart minimal old-money polish");
    else if (fnL.includes("heel") || fnL.includes("pump")) parts.push("heels elevate the whole fit instantly");
    else if (fnL.includes("boot")) parts.push("boots bring edge without overshadowing the look");
  }

  if (bag) {
    const bnL = bag.name.toLowerCase();
    if (bnL.includes("mini")) parts.push("mini bag = peak trendy social look");
    else if (bnL.includes("tote") || bnL.includes("canvas")) parts.push("tote keeps it lifestyle-effortless");
    else if (bnL.includes("crossbody")) parts.push("crossbody bag balances polish with practicality");
    else if (bnL.includes("sequin") || bnL.includes("embellish")) parts.push("statement bag carries the personality of the fit");
  }

  if (sunglasses && parts.length < 4) {
    const snL = sunglasses.name.toLowerCase();
    if (snL.includes("rectang") || snL.includes("slim")) parts.push("slim-frame sunglasses lean Y2K");
    else if (snL.includes("oval") || snL.includes("round")) parts.push("rounded frames soften the look");
  }

  if (parts.length === 0) return "Accessories tie the whole story together with intent.";
  // Capitalise first letter
  let text = parts.join(", ");
  text = text.charAt(0).toUpperCase() + text.slice(1);
  if (!text.endsWith(".")) text += ".";
  return text;
}

function pickDominantColorFamily(slots: OutfitSlot[]): ColorFamily {
  const counts: Partial<Record<ColorFamily, number>> = {};
  for (const s of slots) {
    counts[s.product.color_family] = (counts[s.product.color_family] ?? 0) + 1;
  }
  let best: ColorFamily = "neutral";
  let bestN = 0;
  for (const [f, n] of Object.entries(counts) as [ColorFamily, number][]) {
    if (n > bestN) { best = f; bestN = n; }
  }
  return best;
}

/* ──────────────────────────────────────────────────────────────
   Day-to-night transition tip
   ────────────────────────────────────────────────────────────── */
function describeDayToNight(slots: OutfitSlot[], vibe: Aesthetic): string | undefined {
  const footwear = slots.find(s => s.role === "footwear")?.product;
  const bag = slots.find(s => s.role === "bag")?.product;
  if (!footwear) return undefined;
  const fnL = footwear.name.toLowerCase();

  if (vibe === "smart-casual" || vibe === "minimal-clean") {
    if (fnL.includes("sneaker")) return "Day-to-night: swap sneakers for heeled mules or loafers, switch to a mini bag — dinner-ready in 30 seconds.";
    if (fnL.includes("sandal")) return "Day-to-night: trade sandals for strappy heels and you're date-night coded.";
  }
  if (vibe === "urban-streetwear" || vibe === "athleisure") {
    return "Day-to-night: throw on a leather/denim jacket, swap tote for a crossbody — same fit, evening energy.";
  }
  if (vibe === "y2k-revival" || vibe === "feminine-romantic") {
    return "Day-to-night: this look is already night-coded — just freshen the lip gloss and you're ready to ate.";
  }
  if (vibe === "boho-coastal") {
    return "Day-to-night: knot a slip dress over it for evening, or layer a fitted cardigan — coastal evening unlocked.";
  }
  return undefined;
}

/* ──────────────────────────────────────────────────────────────
   PUBLIC: generate StyleNotes for one outfit
   ────────────────────────────────────────────────────────────── */
export function explainOutfit(outfit: GeneratedOutfit): StyleNotes {
  const seed = parseInt(outfit.id.replace(/\D/g, "").slice(-3) || "1");
  const aestheticName = pickTrendName(outfit.aesthetic, seed);

  const vibeSummary = vibeSummaryFor(outfit.aesthetic);
  const colorStory = describeColorStory(outfit.slots);
  const fitBalance = describeFitBalance(outfit.slots);
  const accessoryNote = describeAccessories(outfit.slots);
  const dayToNight = describeDayToNight(outfit.slots, outfit.aesthetic);

  return {
    aesthetic_name: aestheticName,
    vibe_summary:   vibeSummary,
    color_story:    colorStory,
    fit_balance:    fitBalance,
    accessory_note: accessoryNote,
    day_to_night:   dayToNight,
  };
}

function vibeSummaryFor(v: Aesthetic): string {
  switch (v) {
    case "y2k-revival":       return "Bold, retro, statement-coded. Made for being the moment.";
    case "urban-streetwear":  return "Oversized, layered, effortlessly cool. The kind of fit that does the talking.";
    case "smart-casual":      return "Clean, structured, intentionally polished without trying.";
    case "minimal-clean":     return "Less is more. Pinterest-coded clean girl perfection.";
    case "boho-coastal":      return "Earthy, breezy, vacation-forever vibes.";
    case "preppy-collegiate": return "Tailored, classic, old-money-adjacent.";
    case "athleisure":        return "Sporty-meets-stylish, comfort with intention.";
    case "feminine-romantic": return "Soft, romantic, quietly elevated.";
    default:                  return "Confident, considered, very Pinterest.";
  }
}
