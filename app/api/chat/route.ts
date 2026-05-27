import { NextRequest, NextResponse } from "next/server";
import type Anthropic from "@anthropic-ai/sdk";
import { getAnthropicClient, hasAnthropicKey, SYSTEM_PROMPT } from "@/utils/claudeClient";
import {
  buildOutfit,
  buildMultipleOutfits,
  browseCategory,
  completeLook,
  findAnchorByColorAndCategory,
  findSimilar,
  getReplaceAlternatives,
  CATALOGUE_BY_ID,
} from "@/lib/outfitEngine";
import { explainOutfit } from "@/lib/styleExplainer";
import { GeneratedOutfit, OutfitContext } from "@/types/fashion";
import { checkRateLimit, maybeSweepRateLimitBuckets } from "@/utils/rateLimit";

/* ────────────────────────────────────────────────────────────────
   Types
   ──────────────────────────────────────────────────────────────── */
export interface AnthropicMessage { role: "user" | "assistant"; content: string; }

interface ClaudeIntent {
  intent: "chat" | "outfit" | "multi" | "browse" | "complete_look" | "replace_options";
  message: string;
  quick_replies?: string[];
  next_question?: string;
  params?: {
    occasion?: string;
    vibe?: string;
    gender?: string;
    budget?: number;
    count?: number;
    category?: string;
    anchor_sku?: string;
    color?: string;
    anchor_category?: string;
    replace_slot?: string;
  };
}

interface SessionState {
  currentOutfit?: Record<string, { sku: string; name?: string; price?: number }>;
  userProfile?: {
    gender?: string;
    occasion?: string;
    vibe?: string;
    color?: string;
    budget?: number;
  };
  rejectedSkus?: string[];
  likedSkus?: string[];
  /**
   * Set when the user uploaded an image and we're styling AROUND that
   * anchor item. While present:
   *  - Outfit results NEVER include slots in `excluded_roles`.
   *  - Replacement / multi / complete_look respect the anchor.
   * Cleared by the client when the user starts a new chat or asks for
   * a complete fresh outfit.
   */
  anchor?: {
    type: string;            // e.g. "DRESS", "TOP"
    role: string;            // e.g. "dress", "top"
    excluded_roles: string[]; // e.g. ["dress", "top", "bottom"]
    description?: string;
  };
  /** Full image analysis from the uploaded anchor product — persists across turns. */
  imageContext?: {
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
  } | null;
  /** "image_styling" when user is in anchor-product mode, null for normal chat. */
  mode?: "image_styling" | null;
}

/* ────────────────────────────────────────────────────────────────
   Convert an engine outfit → chat-renderable shape
   (matches the existing LookbookChat renderer)
   ──────────────────────────────────────────────────────────────── */
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

/**
 * Strip any slot from an outfitToChat() result whose role matches the
 * anchor's excluded_roles. Used when the user uploaded an anchor item
 * (e.g. a dress) — we never want to recommend another item in the
 * same category as the anchor.
 *
 * Also recomputes `total`. `style_notes` is a summary object (not per-slot)
 * so we leave it alone — it still describes the overall vibe.
 */
function applyAnchorFilter<T extends {
  outfit: Record<string, unknown>;
  total?: number;
}>(
  result: T,
  anchor?: { excluded_roles?: string[] } | null,
): T {
  if (!anchor?.excluded_roles?.length) return result;
  const excluded = new Set(anchor.excluded_roles);

  const filteredOutfit: Record<string, unknown> = {};
  let total = 0;
  for (const [role, item] of Object.entries(result.outfit)) {
    if (excluded.has(role)) continue;
    filteredOutfit[role] = item;
    const price = (item as { price?: number })?.price ?? 0;
    total += price;
  }

  return {
    ...result,
    outfit: filteredOutfit,
    total,
  };
}

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

/* ────────────────────────────────────────────────────────────────
   Build the session-memory context block that gets appended to
   Claude's system prompt. Lets Claude know what's already on
   screen + what the user already said, so it can:
     • detect replacement intents ("change the top")
     • not re-ask info that's already known
     • respect the user's running profile
   ──────────────────────────────────────────────────────────────── */
function buildSessionContextMessage(session: SessionState): string {
  const lines: string[] = [];
  const profile = session.userProfile ?? {};
  const outfit = session.currentOutfit ?? {};
  const rejected = session.rejectedSkus ?? [];
  const liked = session.likedSkus ?? [];

  const anchor = session.anchor;
  const hasAnyState = Object.keys(profile).length > 0
    || Object.keys(outfit).length > 0
    || rejected.length > 0
    || liked.length > 0
    || !!anchor;
  if (!hasAnyState) return "";

  lines.push("═══════════════════════════════════════════════════════════════");
  lines.push("CURRENT SESSION MEMORY (DO NOT RE-ASK THIS — IT'S ALREADY KNOWN)");
  lines.push("═══════════════════════════════════════════════════════════════");

  if (anchor) {
    lines.push("ANCHOR ITEM (USER ALREADY OWNS / UPLOADED THIS):");
    lines.push(`  • Category: ${anchor.type} (role: ${anchor.role})`);
    if (anchor.description) lines.push(`  • Description: ${anchor.description}`);
    lines.push(`  • Excluded roles (NEVER recommend these): ${anchor.excluded_roles.join(", ")}`);
    lines.push("RULES WHILE ANCHOR IS ACTIVE:");
    lines.push("  - We are COMPLETING an outfit AROUND the user's anchor item.");
    lines.push("  - DO NOT recommend another item in the same category as the anchor.");
    lines.push("  - If user asks to swap a slot (footwear/bag/etc.), only swap THAT slot.");
    lines.push("  - If user explicitly asks for a 'complete fresh outfit' or 'forget the dress' / 'show me top + bottom', that means they want to clear the anchor — answer naturally and let the system handle it.");
    lines.push("");
  }

  const imgCtx = session.imageContext;
  if (imgCtx) {
    lines.push("ACTIVE PRODUCT CONTEXT (user is styling THIS specific item):");
    lines.push(`  - Category: ${imgCtx.category}`);
    lines.push(`  - Color: ${imgCtx.color}${imgCtx.color_family ? ` (${imgCtx.color_family})` : ""}`);
    lines.push(`  - Pattern: ${imgCtx.pattern}`);
    lines.push(`  - Style: ${imgCtx.style_type}`);
    lines.push(`  - Aesthetic: ${imgCtx.aesthetic}`);
    lines.push(`  - Fit: ${imgCtx.fit}`);
    lines.push(`  - Material: ${imgCtx.material}`);
    lines.push(`  - Season: ${imgCtx.season}`);
    lines.push(`  - Gender: ${imgCtx.gender}`);
    lines.push(`  - Description: ${imgCtx.description}`);
    lines.push("");
    lines.push("CRITICAL: The user's questions refer to THIS item unless they explicitly");
    lines.push("mention a different product. NEVER ask the user to describe or share the");
    lines.push("item — you already have it. NEVER say 'I haven't seen the dress' or 'I");
    lines.push("can't see the image' — the product details above ARE the image content.");
    lines.push("When the user asks 'what shoes go with this' or 'show me a bag for this',");
    lines.push("they mean THIS uploaded item. Coordinate recommendations with its color,");
    lines.push("style, and aesthetic.");
    lines.push("");
  }

  if (session.mode === "image_styling") {
    lines.push("MODE: IMAGE_STYLING (active until user clears or uploads new image)");
    lines.push("  All outfit building must respect the anchor + image context above.");
    lines.push("");
  }

  if (Object.keys(profile).length > 0) {
    lines.push("USER PROFILE:");
    if (profile.gender)   lines.push(`  • Shopping for: ${profile.gender}`);
    if (profile.occasion) lines.push(`  • Occasion: ${profile.occasion}`);
    if (profile.vibe)     lines.push(`  • Vibe: ${profile.vibe}`);
    if (profile.color)    lines.push(`  • Color preference: ${profile.color}`);
    if (profile.budget)   lines.push(`  • Budget: ₹${profile.budget}`);
  }

  if (Object.keys(outfit).length > 0) {
    lines.push("CURRENT OUTFIT ON SCREEN:");
    for (const [role, item] of Object.entries(outfit)) {
      if (item?.sku) lines.push(`  • ${role}: ${item.name ?? "(item)"} [SKU ${item.sku}]`);
    }
    lines.push("");
    lines.push("REPLACEMENT DETECTION:");
    lines.push("If user wants to change ONLY ONE slot of the outfit, set params.replace_slot");
    lines.push("to the role they want changed. Examples:");
    lines.push("  'change the top' / 'different top' / 'another top'    → replace_slot: 'top'");
    lines.push("  'don't like the shoes' / 'different sneakers'         → replace_slot: 'footwear'");
    lines.push("  'change the bag' / 'show another bag'                 → replace_slot: 'bag'");
    lines.push("  'different necklace' / 'another accessory'            → replace_slot: 'necklace'");
    lines.push("  'show me 3 different tops' (variety)                  → intent='multi', replace_slot: 'top'");
    lines.push("Inherit occasion/vibe/gender from the profile above — DON'T re-ask.");
    lines.push("Acknowledge what stays: \"Keeping your [bottom + footwear + bag], here's a new top.\"");
  }

  if (rejected.length > 0) {
    lines.push(`REJECTED SKUs (DON'T re-suggest): ${rejected.join(", ")}`);
  }
  if (liked.length > 0) {
    lines.push(`LIKED SKUs (boost similar): ${liked.join(", ")}`);
  }

  lines.push("═══════════════════════════════════════════════════════════════");
  return lines.join("\n");
}

/* ────────────────────────────────────────────────────────────────
   Parse Claude's intent response safely
   ──────────────────────────────────────────────────────────────── */
/**
 * Try hard to extract a valid intent JSON object from Claude's response.
 * Handles: bare JSON, fenced code blocks, prose+JSON, JSON+prose, and
 * multiple `{...}` blocks (uses the first parseable one with an `intent`).
 */
function parseIntent(raw: string): ClaudeIntent | null {
  if (!raw || typeof raw !== "string") return null;

  // Strip markdown fences anywhere in the text
  const cleaned = raw
    .replace(/```(?:json)?\s*/gi, "")
    .replace(/```/g, "")
    .trim();

  // Find every {...} candidate (greedy, balanced-ish)
  // Try the largest first (most likely the full intent object).
  const candidates: string[] = [];
  // largest match first
  const greedy = cleaned.match(/\{[\s\S]*\}/);
  if (greedy) candidates.push(greedy[0]);
  // also try smaller blocks in case the response has multiple JSON-like fragments
  const allBlocks = cleaned.match(/\{[^{}]*"intent"[^{}]*\}/g) ?? [];
  candidates.push(...allBlocks);

  for (const candidate of candidates) {
    try {
      const obj = JSON.parse(candidate);
      if (obj && typeof obj.intent === "string") {
        return obj as ClaudeIntent;
      }
    } catch {
      // try next candidate
    }
  }

  return null;
}

/**
 * Check whether the raw text looks like a normal conversational reply
 * (not JSON, not garbled). If so, we can surface it directly as a chat
 * bubble instead of showing the generic "had a moment" fallback.
 */
function looksLikeConversation(raw: string): boolean {
  if (!raw || typeof raw !== "string") return false;
  const trimmed = raw.trim();
  if (trimmed.length < 2 || trimmed.length > 800) return false;
  // Reject obvious JSON garbage
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) return false;
  // Must contain some letters
  if (!/[a-zA-Z]/.test(trimmed)) return false;
  return true;
}

/* ────────────────────────────────────────────────────────────────
   Fallback if Claude or engine fails
   Used for unrecoverable internal errors (missing SKU, invalid action
   payload, etc.). Conversational text and unknown intents are now
   handled by separate, friendlier recovery paths in the POST handler.
   ──────────────────────────────────────────────────────────────── */
function fallback(reason?: string) {
  console.error("[/api/chat] fallback:", reason);
  return {
    type: "chat",
    message: "Hmm, that didn't go through. Want to try a different vibe or occasion?",
    quick_replies: ["☀️ Casual day", "💃 Party night", "💼 Office", "👗 Show me dresses", "👟 Show me footwear"],
  };
}

/* ────────────────────────────────────────────────────────────────
   Resolve Claude intent → final structured response via the engine
   ──────────────────────────────────────────────────────────────── */
function resolveIntent(intent: ClaudeIntent, session?: SessionState) {
  const params = intent.params ?? {};
  const colorPref = params.color ? [params.color.toLowerCase()] : undefined;

  // If user said e.g. "white dress" — find the actual white dress and use it as anchor
  let resolvedAnchorSku = params.anchor_sku;
  if (!resolvedAnchorSku && params.color && params.anchor_category) {
    const anchor = findAnchorByColorAndCategory(
      params.anchor_category,
      params.color,
      params.gender ?? session?.userProfile?.gender,
    );
    if (anchor) resolvedAnchorSku = anchor.id;
  }

  // ─── Build lock_slots from currentOutfit when replace_slot is set ───
  // e.g. user says "change the top" → Claude returns replace_slot="top"
  //      → we auto-lock every OTHER slot from currentOutfit so engine only
  //        swaps the requested slot, keeping the rest of the look intact.
  let lockSlots: Record<string, string> | undefined;
  if (params.replace_slot && session?.currentOutfit) {
    lockSlots = {};
    for (const [role, item] of Object.entries(session.currentOutfit)) {
      if (role !== params.replace_slot && item?.sku) {
        lockSlots[role] = item.sku;
      }
    }
  }

  // ─── Inherit session profile when params don't specify ───
  const sessionGender = (session?.userProfile?.gender as "female" | "male" | undefined);
  const sessionOccasion = session?.userProfile?.occasion;
  const sessionVibe = session?.userProfile?.vibe;
  const sessionBudget = session?.userProfile?.budget;

  // ─── When imageContext is active, use its color/aesthetic as defaults ───
  const imgCtx = session?.imageContext;
  const effectiveColorPref = colorPref
    ?? (imgCtx?.color ? [imgCtx.color.toLowerCase()] : undefined);
  const effectiveVibe = params.vibe?.toLowerCase()
    ?? sessionVibe
    ?? imgCtx?.aesthetic;

  // ─── Footwear subtype filter ─────────────────────────────────────────────
  // Claude returns slot_filter when user explicitly asks for a specific
  // footwear subtype ("show more sneakers" → slot_filter="sneaker").
  // Map the curator keyword to a regex string applied inside the engine.
  const FOOTWEAR_SUBTYPE_MAP: Record<string, string> = {
    "sneaker":     "sneaker|trainer",
    "sandal":      "sandal",
    "flat sandal": "flat sandal|flat",
    "loafer":      "loafer",
    "heel":        "heel",
    "boot":        "boot",
    "mary jane":   "mary jane",
    "ballerina":   "ballerina|ballet",
    "mule":        "mule",
    "platform":    "platform",
  };
  const rawSlotFilter = (params as Record<string, unknown>).slot_filter as string | undefined;
  const nameFilter = rawSlotFilter
    ? (FOOTWEAR_SUBTYPE_MAP[rawSlotFilter.toLowerCase()] ?? rawSlotFilter.toLowerCase())
    : undefined;

  const ctx: OutfitContext = {
    occasion:         params.occasion?.toLowerCase() ?? sessionOccasion,
    vibe:             effectiveVibe,
    gender:           (params.gender as "female" | "male" | undefined) ?? sessionGender ?? "female",
    budget:           params.budget ?? sessionBudget,
    anchor_sku:       resolvedAnchorSku,
    preferred_colors: effectiveColorPref,
    lock_slots:       lockSlots,
    rejected_skus:    session?.rejectedSkus,
    replace_slot:     params.replace_slot,
    name_filter:      nameFilter,
  };

  switch (intent.intent) {
    case "chat":
      return {
        type: "chat",
        message: intent.message,
        quick_replies: intent.quick_replies ?? [],
      };

    case "outfit": {
      const out = buildOutfit(ctx);
      if (!out) {
        return {
          type: "chat",
          message: ctx.gender === "male"
            ? "Bestie, our men's drop is still cooking 👨‍🍳 — only got jeans + footwear right now. Want me to show you what we DO have, or build something unisex?"
            : "Couldn't build that exact look fr. Try a different occasion or vibe? Or just say 'show me dresses' / 'show me tops' to browse.",
          quick_replies: ["👟 Show Footwear", "👗 Show Dresses", "☀️ Casual Look", "💃 Party Look"],
        };
      }
      return {
        type: "outfit",
        message: intent.message,
        ...applyAnchorFilter(outfitToChat(out), session?.anchor),
        next_question: intent.next_question,
      };
    }

    case "multi": {
      const count = params.count ?? 3;
      const outs = buildMultipleOutfits(ctx, count);
      if (outs.length === 0) {
        return {
          type: "chat",
          message: "Couldn't find enough options for that fr. Try a different occasion?",
          quick_replies: ["☀️ Casual Look", "💃 Party Night", "💼 Work Day", "👗 Show Dresses"],
        };
      }
      return {
        type: "multi",
        message: intent.message,
        looks: outs.map((o, i) => ({
          look_number: i + 1,
          label: o.label,
          ...applyAnchorFilter(outfitToChat(o), session?.anchor),
        })),
        next_question: intent.next_question,
      };
    }

    case "browse": {
      const cat = params.category ?? "all";
      const gender = params.gender ?? "female";
      const requestedColor = params.color?.toLowerCase();
      // Strict color filter first
      let prods = browseCategory(cat, {
        gender,
        colors: requestedColor ? [requestedColor] : undefined,
        limit: 12,
      });

      // HONESTY: if user asked for a color and we have zero, tell them the truth
      // and show the closest alternatives (same category, any color)
      if (requestedColor && prods.length === 0) {
        const fallback = browseCategory(cat, { gender, limit: 8 });
        return {
          type: "products",
          message: `No cap — we don't have any ${requestedColor} ${cat.toLowerCase()} in the Spring 26 drop rn 😅 But here's what IS bussin in ${cat.toLowerCase()}:`,
          category: cat,
          gender,
          products: fallback.map(p => ({
            sku: p.id, name: p.name, price: p.price,
            img: p.image, url: p.url,
            category: p.category, sizes: p.sizes,
            rating: p.rating, isNew: p.isNew,
            colors: p.color ?? [],
            color_family: p.color_family,
          })),
          next_question: "Want me to switch to a different color?",
        };
      }

      // Adjust message if Claude wrote color-specific copy but we found matches
      const messageOk = !requestedColor || prods.every(p => p.color?.some(c => c.toLowerCase().includes(requestedColor)));
      const finalMessage = messageOk
        ? intent.message
        : `Here's what we have in ${requestedColor} ${cat.toLowerCase()} — straight heat 🔥`;

      return {
        type: "products",
        message: finalMessage,
        category: cat,
        gender,
        products: prods.map(p => ({
          sku: p.id, name: p.name, price: p.price,
          img: p.image, url: p.url,
          category: p.category, sizes: p.sizes,
          rating: p.rating, isNew: p.isNew,
          colors: p.color ?? [],
          color_family: p.color_family,
        })),
        next_question: intent.next_question,
      };
    }

    case "replace_options": {
      // Returns 3-4 ALTERNATIVE product cards for one slot, while showing
      // the user's current outfit as locked context. User taps an option
      // to commit the swap (handled separately via confirm_replacement).
      const replaceSlot = params.replace_slot;
      // Guard: no replace_slot OR no current outfit yet → friendly fallback
      const hasOutfit = session?.currentOutfit && Object.keys(session.currentOutfit).length > 0;
      if (!replaceSlot) {
        return {
          type: "chat",
          message: "What would you like to change?",
          quick_replies: ["Top 👕", "Bottom 👖", "Shoes 👟", "Bag 👜", "Accessories ✨"],
        };
      }
      if (!hasOutfit || !session.currentOutfit) {
        return {
          type: "chat",
          message: "Let's build a full look first ✨ Then you can swap any piece — top, bottom, shoes, bag, anything.",
          quick_replies: ["☀️ Casual day", "🌙 Date night", "💃 Party fit", "💼 Office wear", "👗 Show dresses"],
        };
      }
      const outfitState = session.currentOutfit;
      // Build lock_slots covering everything EXCEPT the slot being replaced
      const altLockSlots: Record<string, string> = {};
      for (const [role, item] of Object.entries(outfitState)) {
        if (role !== replaceSlot && item?.sku) altLockSlots[role] = item.sku;
      }
      const altCtx: OutfitContext = {
        ...ctx,
        lock_slots: { ...altLockSlots, [replaceSlot]: outfitState[replaceSlot]?.sku ?? "" },
        replace_slot: replaceSlot,
      };
      const alts = getReplaceAlternatives(altCtx, replaceSlot, 4);
      if (alts.length === 0) {
        return {
          type: "chat",
          message: `No other ${replaceSlot} options match your current look fr. Want to switch up the vibe instead?`,
          quick_replies: ["Different vibe ✨", "Show me dresses 👗", "Browse more 🔍"],
        };
      }
      // Snapshot of locked items so client can render "keeping these" context
      const lockedDisplay: Record<string, { sku: string; name?: string; price?: number; img?: string }> = {};
      for (const [role, item] of Object.entries(outfitState)) {
        if (role !== replaceSlot && item?.sku) lockedDisplay[role] = item;
      }
      return {
        type: "replace_options",
        message: intent.message,
        replace_slot: replaceSlot,
        locked_outfit: lockedDisplay,
        options: alts.map(p => ({
          sku: p.id, name: p.name, price: p.price,
          img: p.image, url: p.url,
          category: p.category, sizes: p.sizes,
          rating: p.rating, isNew: p.isNew,
          colors: p.color ?? [],
          color_family: p.color_family,
        })),
        next_question: intent.next_question,
      };
    }

    case "complete_look": {
      if (!params.anchor_sku || !CATALOGUE_BY_ID[params.anchor_sku]) {
        return fallback("complete_look without valid anchor_sku");
      }
      const out = completeLook(params.anchor_sku, ctx);
      if (!out) return fallback("completeLook returned null");
      return {
        type: "outfit",
        message: intent.message,
        ...applyAnchorFilter(outfitToChat(out), session?.anchor),
        next_question: intent.next_question,
      };
    }

    default: {
      // Unknown intent — if Claude still gave us a message, use it
      // instead of the generic "had a moment" reply.
      console.warn("[/api/chat] unknown intent:", (intent as { intent: string }).intent);
      const fallbackMessage = intent.message?.trim()
        || "Let me try that another way — what occasion or vibe are you after?";
      return {
        type: "chat",
        message: fallbackMessage,
        quick_replies: intent.quick_replies?.length
          ? intent.quick_replies
          : ["☀️ Casual day", "💃 Party night", "💼 Office", "👗 Show me dresses"],
      };
    }
  }
}

/* ────────────────────────────────────────────────────────────────
   POST /api/chat
   ──────────────────────────────────────────────────────────────── */
export async function POST(req: NextRequest) {
  // ── RATE LIMIT: 30 chat requests per minute per IP ──
  // Protects against runaway scripts and bots burning Claude credits.
  maybeSweepRateLimitBuckets();
  const limited = checkRateLimit(req, { windowMs: 60_000, max: 30, key: "chat" });
  if (limited) {
    return NextResponse.json({
      type: "chat",
      message: "Slow down a sec — too many requests. Try again in a moment.",
    }, { status: 429, headers: { "Retry-After": String(limited.retryAfterSec) } });
  }

  if (!hasAnthropicKey()) {
    console.error("[/api/chat] ANTHROPIC_API_KEY missing (env + .env.local both empty)");
    return NextResponse.json(fallback("no api key"), { status: 200 });
  }

  try {
    const body = await req.json();
    const {
      message,
      history = [],
      session = {},
      cartSkus = [],
      action,
      action_params,
    }: {
      message: string;
      history: AnthropicMessage[];
      session?: SessionState;
      cartSkus?: string[];
      action?: string;
      action_params?: Record<string, unknown>;
    } = body;

    // ── INPUT VALIDATION — prevent abuse / cost bombs ──
    const MAX_MESSAGE_CHARS = 2000;
    const MAX_HISTORY_ITEMS = 20;
    if (typeof message !== "string") {
      return NextResponse.json({ error: "message must be a string" }, { status: 400 });
    }
    if (message.length > MAX_MESSAGE_CHARS) {
      return NextResponse.json({
        type: "chat",
        message: "Your message is too long — try keeping it under 2000 characters.",
      }, { status: 200 });
    }
    if (!Array.isArray(history) || history.length > MAX_HISTORY_ITEMS) {
      return NextResponse.json({ error: "history malformed or too long" }, { status: 400 });
    }

    // Shape-only diagnostic log — never log the user's text or the
    // full image context (PII / privacy).
    if (process.env.NODE_ENV !== "production") {
      console.log("[/api/chat] received", {
        hasImageContext: !!session.imageContext,
        hasAnchor:       !!session.anchor,
        mode:            session.mode ?? null,
        msgLen:          typeof message === "string" ? message.length : 0,
        hasAction:       !!action,
      });
    }

    // ─── FAST PATH: user expresses purchase intent ("add to cart" / "checkout" /
    //     "buy this" / "place order" / "pay now" / "I'll take it").
    //     We intercept BEFORE calling Claude so the LLM cannot hallucinate
    //     fake prices or fake confirmations. We re-render the EXACT outfit
    //     currently in session.currentOutfit using REAL catalogue data, with
    //     Select-Size buttons readily available on each card. Quick replies
    //     are styling-only — never cart/checkout/payment actions.
    // ─── FAST PATH: user wants to REMOVE one item from the current look.
    //     e.g. "remove the bag", "drop the sunglasses", "i don't need shoes",
    //          "delete necklace", "take off the hat", "no bag".
    //     We map the mentioned word/category to a slot role, strip it from
    //     session.currentOutfit, and return the updated outfit with a short
    //     confirmation. Deterministic — never calls the LLM.
    const REMOVE_INTENT_RE = /\b(remove|drop|delete|take\s+off|take\s+out|get\s+rid\s+of|don'?t\s+(?:need|want)|no\s+more|don'?t\s+like|skip)\b/i;
    // Empty-session removal request → never call the LLM (it will happily
    // pretend it dropped something). Friendly deterministic reply instead.
    if (typeof message === "string" && REMOVE_INTENT_RE.test(message)
        && (!session.currentOutfit || Object.keys(session.currentOutfit).length === 0)) {
      return NextResponse.json({
        type: "chat",
        message: "There's nothing to remove yet ✨ Let me style a look first — what's the occasion?",
        quick_replies: ["☀️ Casual", "🌙 Date night", "💃 Party", "💼 Office", "👗 Dresses"],
      }, { status: 200 });
    }
    if (typeof message === "string" && REMOVE_INTENT_RE.test(message)
        && session.currentOutfit && Object.keys(session.currentOutfit).length > 0) {
      // Word → slot role lookup. Order matters slightly (longer phrases first).
      const SLOT_KEYWORD_MAP: Array<[RegExp, string]> = [
        [/\b(sunglass(?:es)?|shades|eyewear)\b/i,                                              "sunglasses"],
        [/\b(jewell?ery|necklace|bracelet|earring(?:s)?|charm(?:s)?|ring(?:s)?)\b/i,           "necklace"],
        [/\b(footwear|shoes?|sneaker(?:s)?|sandal(?:s)?|heel(?:s)?|boot(?:s)?|loafer(?:s)?)\b/i, "footwear"],
        [/\b(handbag|bag(?:s)?|tote|clutch|purse)\b/i,                                          "bag"],
        [/\b(dress(?:es)?)\b/i,                                                                  "dress"],
        [/\b(top(?:s)?|tee(?:s)?|t-?shirt(?:s)?|blouse|shirt(?:s)?)\b/i,                         "top"],
        [/\b(bottom(?:s)?|pants?|trousers?|jeans?|skirt(?:s)?|shorts?)\b/i,                     "bottom"],
        [/\b(hat(?:s)?|cap(?:s)?|beanie)\b/i,                                                    "hat"],
        [/\b(watch(?:es)?)\b/i,                                                                  "watch"],
      ];

      let targetRole: string | null = null;
      for (const [re, role] of SLOT_KEYWORD_MAP) {
        if (re.test(message) && session.currentOutfit[role]) {
          targetRole = role;
          break;
        }
      }

      if (targetRole) {
        // Build the new outfit MINUS the removed slot
        const updatedOutfit: Record<string, unknown> = {};
        let total = 0;
        for (const [role, item] of Object.entries(session.currentOutfit)) {
          if (role === targetRole || !item?.sku) continue;
          const product = CATALOGUE_BY_ID[item.sku];
          if (!product) continue;
          updatedOutfit[role] = {
            sku:          product.id,
            name:         product.name,
            price:        product.price,
            note:         "",
            emoji:        emojiFor(role),
            url:          product.url,
            img:          product.image,
            colors:       product.color ?? [],
            color_family: product.color_family,
          };
          total += product.price;
        }

        const removedName = session.currentOutfit[targetRole]?.name ?? targetRole;
        const totalStr = total.toLocaleString("en-IN");

        // If all slots removed → return chat type with the clear-look message
        if (Object.keys(updatedOutfit).length === 0) {
          return NextResponse.json({
            type: "chat",
            message: `Look cleared! Want me to style something new? ✨`,
            quick_replies: ["☀️ Casual", "🌙 Date night", "💃 Party", "💼 Office", "👗 Dresses"],
          }, { status: 200 });
        }

        return NextResponse.json({
          type: "outfit",
          message: `Dropped the ${targetRole === "necklace" ? "jewellery" : targetRole}! Your look is now ₹${totalStr} ✨`,
          occasion:    session.userProfile?.occasion ?? "",
          vibe:        session.userProfile?.vibe ?? "",
          outfit:      updatedOutfit,
          total,
          budget_note: `Updated total: ₹${totalStr}`,
          style_notes: null,
          next_question: `Want me to swap in something else, or shop what's left?`,
          quick_replies: [`Add ${targetRole === "necklace" ? "jewellery" : targetRole} back ✨`, "Different vibe 🎨", "Show me more"],
          // Suppress the user-side bubble — Toastie's confirmation already explains what happened.
          // (Frontend ignores this field if unknown — safe additive change.)
          _removed_slot: targetRole,
          _removed_name: removedName,
        }, { status: 200 });
      }
      // No matched slot → fall through to LLM
    }

    const PURCHASE_INTENT_RE = /\b(add(?:\s+(?:this|them|it|these))?\s+(?:to|in|in\s+my|to\s+my)\s+cart|buy(?:\s+(?:this|now|it))?|check\s*out|place\s+(?:the\s+)?order|pay\s+now|i'?ll\s+take\s+(?:it|this|them)|i\s+want\s+this\s+look|(?:i\s+(?:have\s+)?)?selected.*(?:add|cart))\b/i;
    const isPurchaseIntent = typeof message === "string" && PURCHASE_INTENT_RE.test(message);
    // Purchase intent but NO outfit in session → deterministic friendly reply.
    // We never let this case reach the LLM because the LLM (under prompt cache
    // pressure) sometimes invents "tap select size on each card above" even
    // when no cards exist. Backend handles it predictably instead.
    if (isPurchaseIntent && (!session.currentOutfit || Object.keys(session.currentOutfit).length === 0)) {
      return NextResponse.json({
        type: "chat",
        message: "Let's build a look first ✨ Tell me the occasion and I'll style something for you to add to cart.",
        quick_replies: ["☀️ Casual", "🌙 Date night", "💃 Party", "💼 Office", "👗 Dresses"],
      }, { status: 200 });
    }
    if (isPurchaseIntent && session.currentOutfit && Object.keys(session.currentOutfit).length > 0) {
      const outfitState = session.currentOutfit;
      const cartSkuSet = new Set((cartSkus ?? []).map(s => String(s)));

      // Categorise each outfit slot by cart status
      const outfitDisplay: Record<string, unknown> = {};
      const skusInCart: string[] = [];
      const skusPending: string[] = [];
      let total = 0;

      for (const [role, item] of Object.entries(outfitState)) {
        if (!item?.sku) continue;
        const product = CATALOGUE_BY_ID[item.sku];
        if (!product) continue;
        const inCart = cartSkuSet.has(product.id);
        outfitDisplay[role] = {
          sku:          product.id,
          name:         product.name,
          price:        product.price,
          note:         inCart ? "✓ Already in your cart" : "Pick a size to add to cart",
          emoji:        emojiFor(role),
          url:          product.url,
          img:          product.image,
          colors:       product.color ?? [],
          color_family: product.color_family,
        };
        if (inCart) skusInCart.push(product.id);
        else        skusPending.push(product.id);
        total += product.price;
      }

      if (Object.keys(outfitDisplay).length === 0) {
        return NextResponse.json({
          type: "chat",
          message: "Let's build a look first ✨ Tell me the occasion and I'll style it for you.",
          quick_replies: ["☀️ Casual", "🌙 Date night", "💃 Party", "💼 Office", "👗 Dresses"],
        }, { status: 200 });
      }

      // Pick a message + quick replies based on cart state
      const totalSlots   = skusInCart.length + skusPending.length;
      const allInCart    = skusPending.length === 0 && skusInCart.length > 0;
      const someInCart   = skusInCart.length > 0 && skusPending.length > 0;

      let message_ = "Your look is ready ✨ Tap 'Select Size' on each card to add the pieces to your cart 🛍️";
      let nextQ    = "Want me to style another look while you pick sizes? ✨";
      let quickReplies: string[] = ["Style another look ✨", "Different vibe 🎨", "Show me more"];

      if (allInCart) {
        const pieceWord = totalSlots === 1 ? "piece is" : "pieces are";
        message_ = `All ${totalSlots} ${pieceWord} in your cart ✓ Head to your cart 🛍️ when you're ready to check out — or want me to style another look?`;
        nextQ    = "Style another look while you shop? ✨";
        quickReplies = ["Style another look ✨", "Different vibe 🎨", "Start fresh 🧺"];
      } else if (someInCart) {
        const pendingCount = skusPending.length;
        message_ = `${skusInCart.length} ${skusInCart.length === 1 ? "piece is" : "pieces are"} already in your cart ✓ Tap 'Select Size' on the remaining ${pendingCount} to add ${pendingCount === 1 ? "it" : "them"} 🛍️`;
        nextQ    = "Want me to style another look in the meantime? ✨";
        quickReplies = ["Style another look ✨", "Different vibe 🎨", "Show me more"];
      }

      return NextResponse.json({
        type: "outfit",
        message: message_,
        occasion:    session.userProfile?.occasion ?? "",
        vibe:        session.userProfile?.vibe ?? "",
        outfit:      outfitDisplay,
        total,
        budget_note: `Complete-the-look total: ₹${total.toLocaleString("en-IN")}`,
        style_notes: null,
        next_question: nextQ,
        quick_replies: quickReplies,
      }, { status: 200 });
    }

    // ─── FAST PATH: client confirms a slot swap by tapping an option card
    //     → skip Claude entirely; just swap that ONE slot in the existing outfit.
    //     NEVER regenerate the full outfit — keep every other slot exactly as-is.
    if (action === "confirm_replacement") {
      const sel = action_params as { replace_slot: string; selected_sku: string };
      if (!sel?.replace_slot || !sel?.selected_sku || !session.currentOutfit) {
        return NextResponse.json(fallback("invalid confirm_replacement payload"), { status: 200 });
      }

      // Look up the selected product from the catalogue
      const newProduct = CATALOGUE_BY_ID[sel.selected_sku];
      if (!newProduct) {
        return NextResponse.json(fallback("selected SKU not found in catalogue"), { status: 200 });
      }

      // Build the updated outfit by keeping every existing slot and only
      // replacing the one the user tapped. No engine call, no regeneration.
      const existingOutfit = { ...session.currentOutfit };
      const updatedOutfitDisplay: Record<string, unknown> = {};
      let total = 0;

      for (const [role, item] of Object.entries(existingOutfit)) {
        if (role === sel.replace_slot) {
          // This is the slot being swapped — use the new product
          updatedOutfitDisplay[role] = {
            sku:          newProduct.id,
            name:         newProduct.name,
            price:        newProduct.price,
            note:         "Your pick",
            emoji:        emojiFor(role),
            url:          newProduct.url,
            img:          newProduct.image,
            colors:       newProduct.color ?? [],
            color_family: newProduct.color_family,
          };
          total += newProduct.price;
        } else if (item?.sku) {
          // Keep this slot exactly as-is — look up full product details
          const existingProduct = CATALOGUE_BY_ID[item.sku];
          if (existingProduct) {
            updatedOutfitDisplay[role] = {
              sku:          existingProduct.id,
              name:         existingProduct.name,
              price:        existingProduct.price,
              note:         item.name ? `Keeping: ${item.name}` : "",
              emoji:        emojiFor(role),
              url:          existingProduct.url,
              img:          existingProduct.image,
              colors:       existingProduct.color ?? [],
              color_family: existingProduct.color_family,
            };
            total += existingProduct.price;
          }
        }
      }

      // If the replace_slot wasn't in the existing outfit (edge case), add it
      if (!existingOutfit[sel.replace_slot]) {
        updatedOutfitDisplay[sel.replace_slot] = {
          sku:          newProduct.id,
          name:         newProduct.name,
          price:        newProduct.price,
          note:         "Your pick",
          emoji:        emojiFor(sel.replace_slot),
          url:          newProduct.url,
          img:          newProduct.image,
          colors:       newProduct.color ?? [],
          color_family: newProduct.color_family,
        };
        total += newProduct.price;
      }

      return NextResponse.json({
        type: "outfit",
        message: "Locked in 🔥 Your updated look:",
        occasion: session.userProfile?.occasion ?? "",
        vibe:     session.userProfile?.vibe ?? "",
        outfit:   updatedOutfitDisplay,
        total,
        budget_note: `Complete-the-look total: ₹${total.toLocaleString("en-IN")}`,
        style_notes: null,
        next_question: "Refine anything else, or shop the look?",
      });
    }

    // ─── FAST PATH: user disliked or wants similar — handled instantly ───
    if (action === "show_similar") {
      const sel = action_params as { sku: string };
      if (!sel?.sku) return NextResponse.json(fallback("missing sku"), { status: 200 });
      const sims = findSimilar(sel.sku, 6);
      return NextResponse.json({
        type: "products",
        message: "Here are similar vibes ✨",
        category: "all",
        gender: session.userProfile?.gender ?? "female",
        products: sims.map(p => ({
          sku: p.id, name: p.name, price: p.price,
          img: p.image, url: p.url,
          category: p.category, sizes: p.sizes,
          rating: p.rating, isNew: p.isNew,
          colors: p.color ?? [],
          color_family: p.color_family,
        })),
        next_question: "See one you like?",
      });
    }

    if (!message?.trim()) return NextResponse.json({ error: "Empty message" }, { status: 400 });

    const client = getAnthropicClient();

    // ─── Build a session-context system message so Claude knows what's
    //     already on screen and what the user already told us ───
    const sessionContext = buildSessionContextMessage(session);

    const messages: AnthropicMessage[] = [
      ...history,
      { role: "user", content: message.trim() },
    ];

    // Build the system prompt as an array of blocks.
    // Block 1 (SYSTEM_PROMPT) is identical on every request → cache it.
    // Block 2 (sessionContext) is dynamic per session → do NOT cache.
    const systemBlocks: Anthropic.TextBlockParam[] = [
      {
        type: "text",
        text: SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" },
      },
    ];
    if (sessionContext) {
      systemBlocks.push({ type: "text", text: sessionContext });
    }

    // Helper: single call to Claude (used twice for empty-response retry)
    const askClaude = async () => {
      const r = await client.messages.create({
        model: "claude-sonnet-4-5",
        system: systemBlocks,
        messages,
        max_tokens: 600,
      });
      const text = r.content
        .filter(b => b.type === "text")
        .map(b => (b as { type: "text"; text: string }).text)
        .join("") ?? "";
      return { response: r, rawText: text };
    };

    // First attempt
    let { response, rawText } = await askClaude();

    // Retry ONCE if Claude returned an empty body (rare but it happens
    // — usually a transient platform hiccup).
    if (!rawText) {
      console.warn("[/api/chat] empty response; retrying once...");
      ({ response, rawText } = await askClaude());
    }

    // Cache verification logging — confirms caching is actually working.
    const usage = response.usage as typeof response.usage & {
      cache_creation_input_tokens?: number;
      cache_read_input_tokens?: number;
    };
    console.log("[/api/chat] cache stats", {
      input_tokens: usage.input_tokens,
      cache_creation_input_tokens: usage.cache_creation_input_tokens ?? 0,
      cache_read_input_tokens: usage.cache_read_input_tokens ?? 0,
      output_tokens: usage.output_tokens,
    });

    // If still empty after retry → friendly recovery
    if (!rawText) {
      console.error("[/api/chat] empty response after retry");
      return NextResponse.json({
        type: "chat",
        message: "Hmm, didn't catch that. Could you rephrase — what occasion or vibe are you styling for?",
        quick_replies: ["☀️ Casual day", "💃 Party night", "💼 Office", "👗 Show me dresses"],
      }, { status: 200 });
    }

    const intent = parseIntent(rawText);

    // ── RECOVERY 1: Claude returned conversational text without JSON ──
    // Don't drop to the generic "had a moment" message — just SHOW
    // Claude's actual reply as a chat bubble. The user got a real answer,
    // they just didn't get a structured outfit (which is fine for
    // conversational/clarifying turns).
    if (!intent) {
      console.warn("[/api/chat] intent parse failed; falling back to conversational reply. Raw text:", rawText.slice(0, 300));
      if (looksLikeConversation(rawText)) {
        return NextResponse.json({
          type: "chat",
          message: rawText.trim(),
          quick_replies: ["☀️ Casual day", "💃 Party night", "💼 Office", "👗 Show me dresses"],
        }, { status: 200 });
      }
      // Garbled output → friendly fallback (still better than "had a moment")
      return NextResponse.json({
        type: "chat",
        message: "Let me try again — what occasion or vibe are you styling for?",
        quick_replies: ["☀️ Casual day", "💃 Party night", "💼 Office", "👗 Show me dresses"],
      }, { status: 200 });
    }

    const resolved = resolveIntent(intent, session);
    return NextResponse.json({ ...resolved, _raw: rawText });

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[/api/chat] error:", msg);
    // Friendlier user-facing message for transient API/network failures.
    // We DON'T expose internal error details to the client — they're
    // logged server-side only.
    return NextResponse.json({
      type: "chat",
      message: "Connection hiccup — give that another try in a sec.",
      quick_replies: ["☀️ Casual day", "💃 Party night", "💼 Office", "👗 Show me dresses"],
    }, { status: 200 });
  }
}
