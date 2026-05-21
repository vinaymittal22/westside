import { NextRequest, NextResponse } from "next/server";
import { getAnthropicClient } from "@/utils/claudeClient";
import { products } from "@/data/products";

/* ── Catalogue for alternative suggestions ──────────────────────── */
const CATALOGUE_SUMMARY = products.map(p => ({
  sku:      p.id,
  name:     p.name,
  category: p.category,
  color:    Array.isArray(p.color) ? p.color[0] : (p.color ?? ""),
  price:    p.price,
}));

/* ── Concise vision prompt — no long paragraphs ─────────────────── */
const TRYON_PROMPT = `You are TOAST AI for Burnt Toast fashion brand.

A customer uploaded their photo to virtually try on this product:
{OUTFIT_JSON}

Look at the customer's photo and analyse: their body type, skin tone, and current style. Then judge how well this product suits them.

CATALOGUE (for alternative picks):
{CATALOGUE_JSON}

Return ONLY this JSON — no text outside, no markdown fences:
{
  "confidence_score": 85,
  "toast_verdict": "One punchy Gen Z sentence — fun, honest, energetic, max 15 words",
  "colour_verdict": "One sentence only about colour compatibility with their skin tone",
  "styling_tips": [
    "Short actionable tip 1",
    "Short actionable tip 2",
    "Short actionable tip 3"
  ],
  "alternative_sku": "SKU string if a different product suits them better, otherwise null",
  "alternative_reason": "One short sentence why the alternative is better, otherwise null"
}`;

/* ── POST /api/tryon ────────────────────────────────────────────── */
export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "API key not configured" }, { status: 500 });
  }

  try {
    const body = await req.json();
    const { imageBase64, imageMime, outfit } = body as {
      imageBase64: string;
      imageMime:   string;
      outfit: {
        sku:     string;
        name:    string;
        price:   number;
        note:    string;
        section: string;
      };
    };

    if (!imageBase64 || !imageMime || !outfit) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    /* Validate / normalise mime type */
    const ALLOWED = ["image/jpeg", "image/png", "image/gif", "image/webp"] as const;
    type AllowedMime = typeof ALLOWED[number];
    const mimeType: AllowedMime = ALLOWED.includes(imageMime as AllowedMime)
      ? (imageMime as AllowedMime)
      : "image/jpeg";

    const prompt = TRYON_PROMPT
      .replace("{OUTFIT_JSON}", JSON.stringify(outfit))
      .replace("{CATALOGUE_JSON}", JSON.stringify(CATALOGUE_SUMMARY));

    const client = getAnthropicClient();

    const response = await client.messages.create({
      model:      "claude-sonnet-4-5",
      max_tokens: 600,
      messages: [{
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: mimeType, data: imageBase64 } },
          { type: "text", text: prompt },
        ],
      }],
    });

    const rawText = response.content
      .filter(b => b.type === "text")
      .map(b => (b as { type: "text"; text: string }).text)
      .join("");

    const jsonStr = rawText.match(/\{[\s\S]*\}/)?.[0] ?? rawText;
    const result  = JSON.parse(jsonStr);

    return NextResponse.json({ result });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[/api/tryon] Error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
