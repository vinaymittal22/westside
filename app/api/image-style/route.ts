import { NextRequest, NextResponse } from "next/server";
import type Anthropic from "@anthropic-ai/sdk";
import { getAnthropicClient, hasAnthropicKey } from "@/utils/claudeClient";
import {
  buildOutfit,
  buildMultipleOutfits,
  browseCategory,
  CATALOGUE,
} from "@/lib/outfitEngine";
import { explainOutfit } from "@/lib/styleExplainer";
import { GeneratedOutfit, OutfitContext, EnrichedProduct } from "@/types/fashion";

/* ────────────────────────────────────────────────────────────────
   Types
   ──────────────────────────────────────────────────────────────── */

interface ImageAnalysis {
  category: string;
  color: string;
  color_family: string;
  pattern: string;
  style_type: string;
  material: string;
  fit: string;
  gender: string;
  season: string;
  aesthetic: string;
  occasion_suggestions: string[];
  description: string;
  stylist_message: string;
}

/* ────────────────────────────────────────────────────────────────
   Compact catalogue summary for Claude context
   (only send what Claude needs to make styling decisions)
   ──────────────────────────────────────────────────────────────── */
function buildCatalogueSummary() {
  return CATALOGUE.map(p => ({
    id: p.id,
    name: p.name,
    category: p.category,
    product_type: p.product_type,
    color: Array.isArray(p.color) ? p.color.join(", ") : (p.color ?? ""),
    color_family: p.color_family,
    aesthetics: p.aesthetics.join(", "),
    price: p.price,
    gender: p.gender ?? "unisex",
    occasion: Array.isArray(p.occasion) ? p.occasion.join(", ") : (p.occasion ?? ""),
  }));
}

/* ────────────────────────────────────────────────────────────────
   Convert engine outfit → chat-renderable shape
   (mirrors the exact same shape as /api/chat outfitToChat)
   ──────────────────────────────────────────────────────────────── */
function emojiFor(role: string): string {
  switch (role) {
    case "top":        return "👚";
    case "bottom":     return "👖";
    case "dress":      return "👗";
    case "footwear":   return "👟";
    case "bag":        return "👜";
    case "sunglasses": return "🕶️";
    case "necklace":   return "📿";
    case "hat":        return "🧢";
    case "watch":      return "⌚";
    default:           return "✨";
  }
}

function outfitToChat(o: GeneratedOutfit) {
  const outfit: Record<string, unknown> = {};
  for (const slot of o.slots) {
    outfit[slot.role] = {
      sku:    slot.product.id,
      name:   slot.product.name,
      price:  slot.product.price,
      note:   slot.reason,
      emoji:  emojiFor(slot.role),
      url:    slot.product.url,
      img:    slot.product.image,
      colors: slot.product.color ?? [],
      color_family: slot.product.color_family,
    };
  }
  return {
    occasion:    o.occasion,
    vibe:        o.vibe_label,
    outfit,
    total:       o.total_price,
    budget_note: o.budget_note,
    style_notes: explainOutfit(o),
  };
}

/* ────────────────────────────────────────────────────────────────
   Claude vision system prompt for image analysis
   ──────────────────────────────────────────────────────────────── */
const IMAGE_ANALYSIS_PROMPT = `You are Toastie — Burnt Toast's AI fashion stylist with expert-level fashion knowledge.

A customer has uploaded an image of a fashion product. Analyze this image deeply and extract every detail a fashion stylist would notice.

Return ONLY valid JSON — no markdown fences, no text outside the JSON object.

{
  "category": "one of: dress, t-shirt, top, blouse, shirt, jeans, pants, shorts, skirt, shoes, sneakers, heels, sandals, bag, handbag, clutch, jewelry, necklace, earrings, bracelet, sunglasses, watch, hat, jacket, hoodie, sweater",
  "color": "primary color name (e.g. black, white, red, navy, sage, cream, multi)",
  "color_family": "one of: neutral, earth, warm-pastel, cool-pastel, bold, jewel-tone, monochrome, multi",
  "pattern": "one of: solid, floral, striped, printed, textured, checked, abstract, graphic, embroidered, sequined, plain",
  "style_type": "one of: casual, streetwear, formal, party, ethnic, luxury, minimalist, oversized, vintage, romantic, preppy, athleisure, boho, smart-casual",
  "material": "best guess: denim, cotton, leather, silk, wool, polyester, linen, knit, chiffon, satin, velvet, canvas, suede, mesh, unknown",
  "fit": "one of: slim, oversized, regular, loose, cropped, fitted, flowy, structured, relaxed",
  "gender": "one of: female, male, unisex",
  "season": "one of: summer, winter, monsoon, all-season, spring, autumn",
  "aesthetic": "one of: y2k-revival, urban-streetwear, smart-casual, minimal-clean, boho-coastal, preppy-collegiate, athleisure, feminine-romantic",
  "occasion_suggestions": ["3-4 occasions this works for, e.g. casual-hangout, date-night, college-fest, party, brunch, office, travel"],
  "description": "One sentence describing the product — be specific about what you see",
  "stylist_message": "2-3 sentences as a personal stylist reacting to this product. Be warm, enthusiastic, genuine. Mention the vibe it gives and what looks you can build around it. Example: 'Oh I love this — this oversized black tee is giving effortless streetwear energy. Let me build you some killer looks around it from our collection.'"
}`;

/* ────────────────────────────────────────────────────────────────
   Map Claude's analysis → OutfitContext for the engine
   ──────────────────────────────────────────────────────────────── */
function analysisToContext(analysis: ImageAnalysis): OutfitContext {
  return {
    occasion: analysis.occasion_suggestions?.[0] ?? "casual",
    vibe:     analysis.aesthetic ?? "smart-casual",
    gender:   (analysis.gender as "female" | "male") ?? "female",
    preferred_colors: analysis.color ? [analysis.color.toLowerCase()] : undefined,
  };
}

/* ────────────────────────────────────────────────────────────────
   Build multiple styled looks from the analysis
   Each look targets a DIFFERENT occasion from the analysis
   ──────────────────────────────────────────────────────────────── */
function buildLooksFromAnalysis(analysis: ImageAnalysis): Array<{
  look_number: number;
  label: string;
  occasion: string;
  vibe: string;
  outfit: Record<string, unknown>;
  total: number;
  budget_note: string;
  style_notes: ReturnType<typeof explainOutfit>;
}> {
  const occasions = analysis.occasion_suggestions?.slice(0, 3) ?? ["casual"];
  const looks: Array<{
    look_number: number;
    label: string;
    occasion: string;
    vibe: string;
    outfit: Record<string, unknown>;
    total: number;
    budget_note: string;
    style_notes: ReturnType<typeof explainOutfit>;
  }> = [];

  for (let i = 0; i < occasions.length; i++) {
    const ctx: OutfitContext = {
      occasion: occasions[i],
      vibe:     analysis.aesthetic,
      gender:   (analysis.gender as "female" | "male") ?? "female",
      preferred_colors: analysis.color ? [analysis.color.toLowerCase()] : undefined,
    };

    const outfit = buildOutfit(ctx);
    if (outfit) {
      const chatOutfit = outfitToChat(outfit);
      looks.push({
        look_number: i + 1,
        label: `${occasions[i].replace(/-/g, " ")} look`.replace(/\b\w/g, c => c.toUpperCase()),
        ...chatOutfit,
      });
    }
  }

  // If we didn't get enough looks from specific occasions, try multi
  if (looks.length < 2) {
    const ctx = analysisToContext(analysis);
    const multiOutfits = buildMultipleOutfits(ctx, 3 - looks.length);
    for (const o of multiOutfits) {
      const chatOutfit = outfitToChat(o);
      looks.push({
        look_number: looks.length + 1,
        label: o.label || `Style Look ${looks.length + 1}`,
        ...chatOutfit,
      });
    }
  }

  return looks;
}

/* ────────────────────────────────────────────────────────────────
   Find similar products in our catalogue to the uploaded image
   ──────────────────────────────────────────────────────────────── */
function findSimilarFromAnalysis(analysis: ImageAnalysis, limit = 6): EnrichedProduct[] {
  // Map analysis category → our product_type
  const categoryMap: Record<string, string> = {
    "dress": "DRESS", "t-shirt": "TOP", "top": "TOP", "blouse": "TOP",
    "shirt": "TOP", "jeans": "BOTTOM", "pants": "BOTTOM", "shorts": "BOTTOM",
    "skirt": "BOTTOM", "shoes": "FOOTWEAR", "sneakers": "FOOTWEAR",
    "heels": "FOOTWEAR", "sandals": "FOOTWEAR", "bag": "BAG", "handbag": "BAG",
    "clutch": "BAG", "jewelry": "JEWELRY", "necklace": "JEWELRY",
    "earrings": "JEWELRY", "bracelet": "JEWELRY", "sunglasses": "EYEWEAR",
    "watch": "WATCH", "hat": "HAT", "jacket": "TOP", "hoodie": "TOP",
    "sweater": "TOP",
  };
  const targetType = categoryMap[analysis.category.toLowerCase()] ?? "";

  return CATALOGUE
    .filter(p => p.product_type === targetType)
    .map(p => {
      let score = 0;
      // Style match (35%)
      if (p.aesthetics.includes(analysis.aesthetic as never)) score += 35;
      else if (p.aesthetics.some(a => analysis.aesthetic.includes(a.split("-")[0]))) score += 15;
      // Color compatibility (25%)
      const pColors = (p.color ?? []).map((c: string) => c.toLowerCase());
      if (pColors.includes(analysis.color.toLowerCase())) score += 25;
      else if (p.color_family === analysis.color_family) score += 12;
      // Occasion relevance (20%)
      const pOccasion = Array.isArray(p.occasion) ? p.occasion : [p.occasion ?? ""];
      if (analysis.occasion_suggestions.some(o => pOccasion.some((po: string) => po.toLowerCase().includes(o)))) score += 20;
      // Gender match (10%)
      if (p.gender === analysis.gender || p.gender === "unisex") score += 10;
      // Popularity/rating (10%)
      score += Math.min(10, (p.rating ?? 0) * 2);
      return { product: p, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(s => s.product);
}

/* ────────────────────────────────────────────────────────────────
   POST /api/image-style
   ──────────────────────────────────────────────────────────────── */
export async function POST(req: NextRequest) {
  if (!hasAnthropicKey()) {
    console.error("[/api/image-style] ANTHROPIC_API_KEY missing");
    return NextResponse.json({
      type: "chat",
      message: "Toastie needs an API key to analyze images — check your .env.local!",
    }, { status: 200 });
  }

  try {
    const body = await req.json();
    const { imageBase64, imageMime, session } = body as {
      imageBase64: string;
      imageMime: string;
      session?: { userProfile?: { gender?: string } };
    };

    if (!imageBase64 || !imageMime) {
      return NextResponse.json({ error: "Missing image data" }, { status: 400 });
    }

    /* Validate mime */
    const ALLOWED = ["image/jpeg", "image/png", "image/gif", "image/webp"] as const;
    type AllowedMime = typeof ALLOWED[number];
    const mimeType: AllowedMime = ALLOWED.includes(imageMime as AllowedMime)
      ? (imageMime as AllowedMime)
      : "image/jpeg";

    const client = getAnthropicClient();

    /* ── Step 1: Claude vision analyses the uploaded image ── */
    const visionResponse = await client.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 800,
      messages: [{
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: mimeType, data: imageBase64 },
          },
          { type: "text", text: IMAGE_ANALYSIS_PROMPT },
        ],
      }],
    });

    const rawVision = visionResponse.content
      .filter(b => b.type === "text")
      .map(b => (b as { type: "text"; text: string }).text)
      .join("");

    /* Parse the analysis JSON */
    const jsonMatch = rawVision.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("[/api/image-style] Failed to parse vision response:", rawVision.slice(0, 200));
      return NextResponse.json({
        type: "chat",
        message: "Couldn't read that image clearly — try uploading a clearer photo of the product!",
        quick_replies: ["📸 Try again", "💃 Show party looks", "👗 Show dresses"],
      }, { status: 200 });
    }

    const analysis: ImageAnalysis = JSON.parse(jsonMatch[0]);

    // Override gender from session if available
    if (session?.userProfile?.gender) {
      analysis.gender = session.userProfile.gender;
    }

    console.log("[/api/image-style] analysis:", {
      category: analysis.category,
      color: analysis.color,
      aesthetic: analysis.aesthetic,
      occasions: analysis.occasion_suggestions,
    });

    /* ── Step 2: Build styled looks from our catalogue ── */
    const looks = buildLooksFromAnalysis(analysis);

    /* ── Step 3: Find similar items in our store ── */
    const similar = findSimilarFromAnalysis(analysis);

    /* ── Step 4: Return structured response ── */
    return NextResponse.json({
      type: "image_looks",
      message: analysis.stylist_message,
      analysis: {
        category:    analysis.category,
        color:       analysis.color,
        pattern:     analysis.pattern,
        style_type:  analysis.style_type,
        material:    analysis.material,
        fit:         analysis.fit,
        gender:      analysis.gender,
        season:      analysis.season,
        aesthetic:   analysis.aesthetic,
        description: analysis.description,
      },
      looks,
      similar_products: similar.map(p => ({
        sku: p.id, name: p.name, price: p.price,
        img: p.image, url: p.url,
        category: p.category, sizes: p.sizes,
        rating: p.rating, isNew: p.isNew,
        colors: p.color ?? [],
        color_family: p.color_family,
      })),
      next_question: "Want me to tweak any of these looks, or style the uploaded piece differently?",
    });

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[/api/image-style] error:", msg);
    return NextResponse.json({
      type: "chat",
      message: "Couldn't analyze that image — try a different photo or ask me to style something!",
      quick_replies: ["📸 Try again", "💃 Party look", "☀️ Casual look", "👗 Browse dresses"],
    }, { status: 200 });
  }
}
