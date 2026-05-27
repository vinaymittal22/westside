import { NextRequest, NextResponse } from "next/server";
import { getAnthropicClient, hasAnthropicKey } from "@/utils/claudeClient";
import {
  buildOutfit,
  CATALOGUE,
} from "@/lib/outfitEngine";
import { explainOutfit } from "@/lib/styleExplainer";
import { GeneratedOutfit, OutfitContext, EnrichedProduct, ProductType } from "@/types/fashion";
import { checkRateLimit, maybeSweepRateLimitBuckets } from "@/utils/rateLimit";

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
  /** Optional: parsed from userMessage. e.g. "footwear", "bag", "accessories", "full_outfit". */
  user_intent_slot?: string | null;
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
   Map uploaded product category → product_type used by the engine
   ──────────────────────────────────────────────────────────────── */
const CATEGORY_TO_TYPE: Record<string, ProductType> = {
  "dress": "DRESS", "t-shirt": "TOP", "top": "TOP", "blouse": "TOP",
  "shirt": "TOP", "jeans": "BOTTOM", "pants": "BOTTOM", "shorts": "BOTTOM",
  "skirt": "BOTTOM", "shoes": "FOOTWEAR", "sneakers": "FOOTWEAR",
  "heels": "FOOTWEAR", "sandals": "FOOTWEAR", "bag": "BAG", "handbag": "BAG",
  "clutch": "BAG", "jewelry": "JEWELRY", "necklace": "JEWELRY",
  "earrings": "JEWELRY", "bracelet": "JEWELRY", "sunglasses": "EYEWEAR",
  "watch": "WATCH", "hat": "HAT", "jacket": "TOP", "hoodie": "TOP",
  "sweater": "TOP",
};

/* ────────────────────────────────────────────────────────────────
   Map product_type → the outfit slot role(s) it occupies
   Used to know which roles the anchor item fills and which
   roles need to be COMPLETED from the store.
   ──────────────────────────────────────────────────────────────── */
const TYPE_TO_ROLE: Record<string, string> = {
  "TOP":      "top",
  "BOTTOM":   "bottom",
  "DRESS":    "dress",
  "FOOTWEAR": "footwear",
  "BAG":      "bag",
  "JEWELRY":  "necklace",
  "EYEWEAR":  "sunglasses",
  "WATCH":    "watch",
  "HAT":      "hat",
};

/* ────────────────────────────────────────────────────────────────
   Roles that the anchor category EXCLUDES from recommendations.
   e.g. if the anchor is a TOP → don't recommend another top.
   If anchor is a DRESS → don't recommend top OR bottom (dress covers both).
   ──────────────────────────────────────────────────────────────── */
function getExcludedRoles(anchorType: ProductType): string[] {
  switch (anchorType) {
    case "TOP":      return ["top"];
    case "BOTTOM":   return ["bottom"];
    case "DRESS":    return ["dress", "top", "bottom"];
    case "FOOTWEAR": return ["footwear"];
    case "BAG":      return ["bag"];
    case "JEWELRY":  return ["necklace"];
    case "EYEWEAR":  return ["sunglasses"];
    case "WATCH":    return ["watch"];
    case "HAT":      return ["hat"];
    default:         return [];
  }
}

/* ────────────────────────────────────────────────────────────────
   Determine which outfit template to use based on anchor type.
   If the anchor IS a dress → use the dress template (no top/bottom).
   If the anchor IS a top → use two-piece but the engine fills only
     the NON-anchor slots.
   ──────────────────────────────────────────────────────────────── */
function getTemplateForAnchor(anchorType: ProductType): string {
  return anchorType === "DRESS" ? "dress" : "two-piece";
}

/* ────────────────────────────────────────────────────────────────
   Build outfit-completion looks around the anchor product.

   CRITICAL: The uploaded image IS the anchor. We find the
   best matching product in our catalogue as a stand-in (since
   the uploaded item may not be in our store), then build
   complete outfits AROUND it — never recommending items from
   the same category as the anchor.
   ──────────────────────────────────────────────────────────────── */
function buildCompletionLooks(analysis: ImageAnalysis): Array<{
  look_number: number;
  label: string;
  anchor_role: string;
  excluded_roles: string[];
  occasion: string;
  vibe: string;
  outfit: Record<string, unknown>;
  total: number;
  budget_note: string;
  style_notes: ReturnType<typeof explainOutfit>;
}> {
  const anchorType = CATEGORY_TO_TYPE[analysis.category.toLowerCase()] ?? "TOP";
  const anchorRole = TYPE_TO_ROLE[anchorType] ?? "top";
  const excludedRoles = getExcludedRoles(anchorType);
  const occasions = analysis.occasion_suggestions?.slice(0, 3) ?? ["casual"];

  const looks: Array<{
    look_number: number;
    label: string;
    anchor_role: string;
    excluded_roles: string[];
    occasion: string;
    vibe: string;
    outfit: Record<string, unknown>;
    total: number;
    budget_note: string;
    style_notes: ReturnType<typeof explainOutfit>;
  }> = [];

  // Track used product IDs across looks to get variety
  const usedAcrossLooks = new Set<string>();

  for (let i = 0; i < occasions.length; i++) {
    const ctx: OutfitContext = {
      occasion: occasions[i],
      vibe:     analysis.aesthetic,
      gender:   (analysis.gender as "female" | "male") ?? "female",
      preferred_colors: analysis.color ? [analysis.color.toLowerCase()] : undefined,
      rejected_skus: Array.from(usedAcrossLooks),
    };

    const outfit = buildOutfit(ctx);
    if (!outfit) continue;

    // Post-process: REMOVE any slot that matches the anchor's excluded roles.
    // The user already owns/selected that item — don't recommend same category.
    const filteredSlots = outfit.slots.filter(
      slot => !excludedRoles.includes(slot.role)
    );

    if (filteredSlots.length === 0) continue;

    // Track used IDs for variety in next look
    for (const slot of filteredSlots) usedAcrossLooks.add(slot.product.id);

    // Build the chat-renderable outfit from filtered slots only
    const outfitObj: Record<string, unknown> = {};
    let total = 0;
    for (const slot of filteredSlots) {
      outfitObj[slot.role] = {
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
      total += slot.product.price;
    }

    const occasionLabel = occasions[i].replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());

    looks.push({
      look_number: i + 1,
      label: `${occasionLabel} Look`,
      anchor_role: anchorRole,
      excluded_roles: excludedRoles,
      occasion: outfit.occasion,
      vibe: outfit.vibe_label,
      outfit: outfitObj,
      total,
      budget_note: `Complete-the-look additions for ₹${total.toLocaleString("en-IN")}`,
      style_notes: explainOutfit(outfit),
    });
  }

  return looks;
}

/* ────────────────────────────────────────────────────────────────
   Claude vision system prompt — ANCHOR PRODUCT analysis
   The prompt emphasizes that we're analyzing the user's OWN item
   and will build outfits AROUND it.
   ──────────────────────────────────────────────────────────────── */
const IMAGE_ANALYSIS_PROMPT = `You are Toastie — Burnt Toast's AI fashion stylist with expert-level fashion knowledge.

A customer has uploaded an image of a fashion product THEY OWN or want to style around.
This is their ANCHOR ITEM — you will build complete outfits around it.

Analyze this product image deeply. Extract every detail a fashion stylist would notice.

GENDER DETECTION RULES (be decisive — avoid "unisex" whenever possible):
1. If a PERSON is visible wearing/modeling the product, use THEIR apparent gender. A woman modeling a tee → "female". A man modeling a tee → "male". This is the strongest signal.
2. If no person is visible, use the product cut/design:
   - Women's silhouette (fitted bust, cropped, flared, feminine cut, dress, skirt, crop top, blouse) → "female"
   - Men's silhouette (boxy fit, men's collar, men's polo, men's formal shirt) → "male"
3. ONLY return "unisex" when it's a flat-lay/product-only shot of a truly genderless item (plain sneakers with no styling cues, basic bag, sunglasses with no gendered design).
4. When a person is shown wearing the item, NEVER return "unisex" — use their gender.

Return ONLY valid JSON — no markdown fences, no text outside the JSON object.

{
  "category": "one of: dress, t-shirt, top, blouse, shirt, jeans, pants, shorts, skirt, shoes, sneakers, heels, sandals, bag, handbag, clutch, jewelry, necklace, earrings, bracelet, sunglasses, watch, hat, jacket, hoodie, sweater",
  "color": "primary color name (e.g. black, white, red, navy, sage, cream, brown, multi)",
  "color_family": "one of: neutral, earth, warm-pastel, cool-pastel, bold, jewel-tone, monochrome, multi",
  "pattern": "one of: solid, floral, striped, printed, textured, checked, abstract, graphic, embroidered, sequined, plain",
  "style_type": "one of: casual, streetwear, formal, party, ethnic, luxury, minimalist, oversized, vintage, romantic, preppy, athleisure, boho, smart-casual",
  "material": "best guess: denim, cotton, leather, silk, wool, polyester, linen, knit, chiffon, satin, velvet, canvas, suede, mesh, unknown",
  "fit": "one of: slim, oversized, regular, loose, cropped, fitted, flowy, structured, relaxed",
  "gender": "one of: female, male, unisex — use the model's gender if a person is visible; otherwise infer from product cut. Reserve unisex ONLY for flat-lay genderless items.",
  "season": "one of: summer, winter, monsoon, all-season, spring, autumn",
  "aesthetic": "one of: y2k-revival, urban-streetwear, smart-casual, minimal-clean, boho-coastal, preppy-collegiate, athleisure, feminine-romantic",
  "occasion_suggestions": ["3-4 occasions this pairs well with, e.g. casual-hangout, date-night, college-fest, party, brunch, office, travel"],
  "description": "One sentence describing the exact product — be specific about what you see",
  "stylist_message": "ONE short casual line, max 15 words — like a warm shopkeeper spotting the piece. Mention the product type + one vibe/color word. Examples: 'Love this white cottagecore dress! Styling it now ✨' or 'Cute flowy dress — here's what I'd pair with it 💛' or 'This romantic white number? I've got the perfect pieces 🤍'. No technical breakdown. No multiple sentences.",
  "user_intent_slot": "null OR one of: footwear, bag, necklace, sunglasses, hat, watch, full_outfit — derived from the customer's text question. Use null if no specific slot was asked about."
}`;

/* ────────────────────────────────────────────────────────────────
   POST /api/image-style
   ──────────────────────────────────────────────────────────────── */
export async function POST(req: NextRequest) {
  // ── RATE LIMIT: 10 vision requests per minute per IP ──
  // Vision calls are more expensive than text-only chat, so a stricter limit.
  maybeSweepRateLimitBuckets();
  const limited = checkRateLimit(req, { windowMs: 60_000, max: 10, key: "image-style" });
  if (limited) {
    return NextResponse.json({
      type: "chat",
      message: "Whoa — that's a lot of image uploads. Wait a moment and try again.",
    }, { status: 429, headers: { "Retry-After": String(limited.retryAfterSec) } });
  }

  if (!hasAnthropicKey()) {
    console.error("[/api/image-style] ANTHROPIC_API_KEY missing");
    return NextResponse.json({
      type: "chat",
      message: "Toastie needs an API key to analyze images — check your .env.local!",
    }, { status: 200 });
  }

  try {
    const body = await req.json();
    const { imageBase64, imageMime, session, genderOverride, userMessage } = body as {
      imageBase64: string;
      imageMime: string;
      session?: { userProfile?: { gender?: string } };
      genderOverride?: "female" | "male";
      userMessage?: string;   // e.g. "style this for date night" or "make it under ₹4000"
    };

    // Shape-only diagnostic log — never log the actual text the user typed.
    if (process.env.NODE_ENV !== "production") {
      console.log("[/api/image-style] received", {
        hasImage:         !!imageBase64,
        imageMime,
        imageBase64Len:   imageBase64?.length ?? 0,
        hasUserMessage:   !!userMessage,
        userMessageLen:   userMessage?.length ?? 0,
        hasGenderOverride: !!genderOverride,
      });
    }

    if (!imageBase64 || !imageMime) {
      return NextResponse.json({ error: "Missing image data" }, { status: 400 });
    }

    // ── INPUT VALIDATION — prevent abuse / cost bombs ──
    // 13.5 MB of base64 ≈ 10 MB binary. Same limit as the frontend's
    // file picker, enforced again here in case someone bypasses the UI.
    const MAX_BASE64_BYTES = 13.5 * 1024 * 1024;
    const MAX_USER_MESSAGE_CHARS = 2000;
    if (typeof imageBase64 !== "string" || imageBase64.length > MAX_BASE64_BYTES) {
      return NextResponse.json({ error: "Image too large (max 10MB)" }, { status: 413 });
    }
    if (userMessage && (typeof userMessage !== "string" || userMessage.length > MAX_USER_MESSAGE_CHARS)) {
      return NextResponse.json({ error: "userMessage too long" }, { status: 400 });
    }

    /* Validate mime */
    const ALLOWED = ["image/jpeg", "image/png", "image/gif", "image/webp"] as const;
    type AllowedMime = typeof ALLOWED[number];
    const mimeType: AllowedMime = ALLOWED.includes(imageMime as AllowedMime)
      ? (imageMime as AllowedMime)
      : "image/jpeg";

    const client = getAnthropicClient();

    /* ── Step 1: Claude vision analyses the uploaded ANCHOR product ── */
    // If user also typed text (e.g. "what shoes go with this?"), append it
    // so Claude can tailor occasion_suggestions, stylist_message, and
    // identify which specific outfit slot the user is asking about.
    let visionPrompt = IMAGE_ANALYSIS_PROMPT;
    if (userMessage) {
      visionPrompt += `

The customer also said: "${userMessage}"

USE THIS TEXT TO TAILOR YOUR RESPONSE:
1. If they asked about a SPECIFIC slot (e.g. "what shoes go with this?", "which bag?", "what jewelry?"), set "user_intent_slot" to the exact slot keyword: "footwear", "bag", "necklace", "sunglasses", "hat", "watch", or "full_outfit".
2. If they mentioned an occasion (e.g. "date night", "office", "brunch"), prioritize it FIRST in occasion_suggestions.
3. If they mentioned a budget (e.g. "under ₹4000"), acknowledge it in stylist_message.
4. Make the stylist_message DIRECTLY ANSWER the user's question — don't just describe the product. For example, if they asked "what shoes go with this dress?", say "For this yellow dress, I'd pair it with [type of shoes] — [reason]. Here are some great options from our collection."
5. NEVER tell the user you can't see the dress or ask them to describe it — you can see it clearly in the image.`;
    }

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
          { type: "text", text: visionPrompt },
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

    // Apply explicit gender override (from user clicking Women/Men quick reply)
    if (genderOverride === "female" || genderOverride === "male") {
      analysis.gender = genderOverride;
    }
    // Otherwise fall back to session gender if analysis is unisex
    else if (session?.userProfile?.gender && analysis.gender === "unisex") {
      analysis.gender = session.userProfile.gender;
    }

    const anchorType = CATEGORY_TO_TYPE[analysis.category.toLowerCase()] ?? "TOP";
    const anchorRole = TYPE_TO_ROLE[anchorType] ?? "top";
    const excludedRoles = getExcludedRoles(anchorType);

    console.log("[/api/image-style] anchor analysis:", {
      category: analysis.category,
      product_type: anchorType,
      anchor_role: anchorRole,
      excluded_roles: excludedRoles,
      color: analysis.color,
      gender: analysis.gender,
      aesthetic: analysis.aesthetic,
      occasions: analysis.occasion_suggestions,
    });

    /* ── Step 2: If gender is unisex and not overridden, ask user ── */
    if (analysis.gender === "unisex") {
      return NextResponse.json({
        type: "image_looks",
        message: analysis.stylist_message,
        needs_gender: true,
        analysis: {
          category:     analysis.category,
          color:        analysis.color,
          color_family: analysis.color_family,
          pattern:      analysis.pattern,
          style_type:   analysis.style_type,
          material:     analysis.material,
          fit:          analysis.fit,
          gender:       analysis.gender,
          season:       analysis.season,
          aesthetic:    analysis.aesthetic,
          description:  analysis.description,
        },
        anchor_info: {
          role: anchorRole,
          type: anchorType,
          excluded_roles: excludedRoles,
        },
        looks: [],
        next_question: "This product works for all genders — are we styling it for men or women?",
        quick_replies: ["Women 👗", "Men 👔"],
      });
    }

    /* ── Step 3: Build completion looks AROUND the anchor ── */
    const looks = buildCompletionLooks(analysis);

    /* ── Step 4: Return structured response ── */
    return NextResponse.json({
      type: "image_looks",
      message: analysis.stylist_message,
      analysis: {
        category:     analysis.category,
        color:        analysis.color,
        color_family: analysis.color_family,
        pattern:      analysis.pattern,
        style_type:   analysis.style_type,
        material:     analysis.material,
        fit:          analysis.fit,
        gender:       analysis.gender,
        season:       analysis.season,
        aesthetic:    analysis.aesthetic,
        description:  analysis.description,
      },
      anchor_info: {
        role: anchorRole,
        type: anchorType,
        excluded_roles: excludedRoles,
      },
      looks,
      next_question: userMessage
        ? `Styled around your request! Want to tweak any of these, or try a different vibe?`
        : "Want me to tweak any of these looks, or try a different vibe around your piece?",
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
