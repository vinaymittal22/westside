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
function parseIntent(raw: string): ClaudeIntent | null {
  try {
    const cleaned = raw
      .trim()
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/, "")
      .trim();
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) return null;
    const obj = JSON.parse(match[0]);
    if (!obj.intent) return null;
    return obj as ClaudeIntent;
  } catch {
    return null;
  }
}

/* ────────────────────────────────────────────────────────────────
   Fallback if Claude or engine fails
   ──────────────────────────────────────────────────────────────── */
function fallback(reason?: string) {
  console.error("[/api/chat] fallback:", reason);
  return {
    type: "chat",
    message: "Toastie had a moment fr — try asking again! What occasion are we styling?",
    quick_replies: ["☀️ Casual Hangout", "💃 Party Night", "💼 Work Day", "👗 Show Me Dresses", "👟 Show Me Footwear"],
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

  const ctx: OutfitContext = {
    occasion:         params.occasion?.toLowerCase() ?? sessionOccasion,
    vibe:             params.vibe?.toLowerCase() ?? sessionVibe,
    gender:           (params.gender as "female" | "male" | undefined) ?? sessionGender ?? "female",
    budget:           params.budget ?? sessionBudget,
    anchor_sku:       resolvedAnchorSku,
    preferred_colors: colorPref,
    lock_slots:       lockSlots,
    rejected_skus:    session?.rejectedSkus,
    replace_slot:     params.replace_slot,
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

    default:
      return fallback(`unknown intent: ${(intent as { intent: string }).intent}`);
  }
}

/* ────────────────────────────────────────────────────────────────
   POST /api/chat
   ──────────────────────────────────────────────────────────────── */
export async function POST(req: NextRequest) {
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
      action,
      action_params,
    }: {
      message: string;
      history: AnthropicMessage[];
      session?: SessionState;
      action?: string;
      action_params?: Record<string, unknown>;
    } = body;

    // ─── FAST PATH: client confirms a slot swap by tapping an option card
    //     → skip Claude entirely, rebuild outfit with all slots locked
    if (action === "confirm_replacement") {
      const sel = action_params as { replace_slot: string; selected_sku: string };
      if (!sel?.replace_slot || !sel?.selected_sku || !session.currentOutfit) {
        return NextResponse.json(fallback("invalid confirm_replacement payload"), { status: 200 });
      }
      const lockSlots: Record<string, string> = {};
      for (const [role, item] of Object.entries(session.currentOutfit)) {
        if (role !== sel.replace_slot && item?.sku) lockSlots[role] = item.sku;
      }
      lockSlots[sel.replace_slot] = sel.selected_sku;
      const updated = buildOutfit({
        occasion: session.userProfile?.occasion,
        vibe:     session.userProfile?.vibe,
        gender:   (session.userProfile?.gender as "female" | "male" | undefined) ?? "female",
        lock_slots: lockSlots,
        rejected_skus: session.rejectedSkus,
      });
      if (!updated) return NextResponse.json(fallback("buildOutfit null on confirm"), { status: 200 });
      // If user is in anchor mode (uploaded an item), strip out same-category
      // slots the engine may have auto-filled (e.g. a top/bottom alongside their dress).
      return NextResponse.json({
        type: "outfit",
        message: "Locked in 🔥 Your updated look:",
        ...applyAnchorFilter(outfitToChat(updated), session.anchor),
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

    const response = await client.messages.create({
      model: "claude-sonnet-4-5",
      system: systemBlocks,
      messages,
      max_tokens: 600,
    });

    // Cache verification logging — confirms caching is actually working.
    // Read these on every response for the first few days, then remove or downgrade to debug-only.
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

    const rawText = response.content
      .filter(b => b.type === "text")
      .map(b => (b as { type: "text"; text: string }).text)
      .join("") ?? "";

    if (!rawText) return NextResponse.json(fallback("empty Claude response"), { status: 200 });

    const intent = parseIntent(rawText);
    if (!intent) return NextResponse.json(fallback("intent parse failed"), { status: 200 });

    const resolved = resolveIntent(intent, session);
    return NextResponse.json({ ...resolved, _raw: rawText });

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[/api/chat] error:", msg);
    return NextResponse.json({ ...fallback(msg), _debugError: msg }, { status: 200 });
  }
}
