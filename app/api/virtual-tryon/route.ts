import { NextRequest, NextResponse } from "next/server";
import { getGeminiKey } from "@/utils/geminiKey";
import { getAnthropicClient, hasAnthropicKey } from "@/utils/claudeClient";

/* ─────────────────────────────────────────────────────────────────
   Virtual Try-On — Gemini Image Generation
   ─────────────────────────────────────────────────────────────────
   Takes the user's photo + the current outfit (from session state)
   and generates a realistic image of the user wearing the look.

   - Does NOT touch any existing API (chat / tryon / image-style)
   - Uses Gemini's image-capable model via REST (no SDK conflict)
   - Returns base64 image data the client can render + download
   ───────────────────────────────────────────────────────────────── */

/* Gemini 3.1 Flash Image — newest fast image-gen model. Faster +
   cheaper than 3 Pro Image, similar reference-image fidelity.    */
const GEMINI_MODEL = "gemini-3.1-flash-image";
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

/* ── Allowed image mime types from upload ─────────────────────── */
const ALLOWED_MIMES = new Set(["image/jpeg", "image/png", "image/webp"]);

interface OutfitItemPayload {
  sku?: string;
  name?: string;
  price?: number;
  note?: string;
  url?: string;
  img?: string | null;
  colors?: string[];
  color_family?: string;
}

interface TryOnRequest {
  userPhoto:    string;      // base64 (no data: prefix)
  userMime?:    string;      // image/jpeg | image/png | image/webp
  bodyType?:    string;      // slim | athletic | regular | curvy | plus-size | prefer-not-to-say
  outfit?:      Record<string, OutfitItemPayload>;
}

/* ── Slot-friendly labels ─────────────────────────────────────── */
const SLOT_LABELS: Record<string, string> = {
  top:        "TOP",
  bottom:     "BOTTOM",
  dress:      "DRESS",
  footwear:   "FOOTWEAR",
  bag:        "BAG",
  sunglasses: "SUNGLASSES",
  necklace:   "NECKLACE",
  hat:        "HAT",
  watch:      "WATCH",
};

/* ─────────────────────────────────────────────────────────────────
   PRE-VALIDATION — Claude Vision photo quality gate
   ─────────────────────────────────────────────────────────────────
   Runs BEFORE the (expensive + slow) Gemini call so we don't waste
   ~$0.13 + ~35s rendering an outfit on a blurry/cropped/multi-person
   photo. Returns one tiny user-facing reason (≤6 words) when the
   photo is unsuitable.

   Fail-open philosophy: if Claude is down or unauthorized, we let
   the request through — never block a real user because of our
   infra. Bad photos still hit Gemini, but they hit it rarely.
   ───────────────────────────────────────────────────────────────── */

interface ValidationResult {
  isValid: boolean;
  reason: string;
}

type AnthropicImageMime = "image/jpeg" | "image/png" | "image/webp" | "image/gif";

const VALIDATION_SYSTEM_PROMPT = `You are a strict image-quality validator for a fashion virtual try-on feature.

The user uploads a photo of themselves so an AI can render the same person wearing a chosen outfit. Reject any photo that would produce a poor try-on render.

Evaluate the photo on EVERY criterion below:
1. Face is present and visible
2. Face is sharp and clear (not blurred)
3. Face is large enough to recognize (not tiny in frame)
4. Face is not occluded (no mask, hand, hair, or object covering it)
5. Image is overall sharp (not motion-blurred, not out of focus)
6. Lighting is adequate (not too dark, not blown out, not heavy backlight)
7. Image is not noisy/grainy
8. EXACTLY ONE person is visible in the photo (reject 0 or 2+)
9. At least the upper body (head + torso) is visible; full body preferred
10. Image resolution is sufficient (not tiny / heavily pixelated)

RESPONSE FORMAT — return ONLY a single JSON object, no markdown fences, no commentary:
{ "isValid": true | false, "reason": "<short string>" }

If the photo passes ALL ten checks: { "isValid": true, "reason": "" }

If the photo fails ANY check, pick the SINGLE most impactful issue and return ONE of these exact short phrases (or something equally short):
- "Face not clearly visible"
- "Upload a sharper photo"
- "Image is too blurry"
- "Better lighting needed"
- "Use a single-person photo"
- "Face is partially blocked"
- "Upload a higher quality image"
- "Full body photo preferred"
- "No person detected"
- "Photo too dark"

HARD RULES:
- Reason MUST be 5 words or fewer.
- No explanations, no apologies, no scores, no internal reasoning in the output.
- Output ONLY the JSON object — nothing before or after.`;

async function validatePhotoWithClaude(
  imageBase64: string,
  mimeType: string,
): Promise<ValidationResult> {
  // Fail-open if Claude isn't configured
  if (!hasAnthropicKey()) {
    console.warn("[/api/virtual-tryon] Claude not configured — skipping pre-validation");
    return { isValid: true, reason: "" };
  }

  // Claude vision only supports these MIME types
  const allowed: AnthropicImageMime[] = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  const media = (allowed.includes(mimeType as AnthropicImageMime)
    ? mimeType
    : "image/jpeg") as AnthropicImageMime;

  try {
    const client = getAnthropicClient();
    const response = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 80,
      system: VALIDATION_SYSTEM_PROMPT,
      messages: [{
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: media, data: imageBase64 },
          },
          {
            type: "text",
            text: "Validate this photo for virtual try-on. Return JSON only.",
          },
        ],
      }],
    });

    const text = response.content
      .filter(b => b.type === "text")
      .map(b => (b as { type: "text"; text: string }).text)
      .join("")
      .trim();

    // Strip fences if Claude added any, then extract the first {...}
    const cleaned = text
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/, "");
    const match = cleaned.match(/\{[\s\S]*?\}/);
    if (!match) {
      console.warn("[/api/virtual-tryon] Claude returned non-JSON, failing open:", text.slice(0, 80));
      return { isValid: true, reason: "" };
    }

    let parsed: { isValid?: boolean; reason?: string };
    try {
      parsed = JSON.parse(match[0]);
    } catch {
      return { isValid: true, reason: "" };
    }

    if (typeof parsed.isValid !== "boolean") {
      return { isValid: true, reason: "" };
    }

    // Cap reason to 6 words just in case
    const rawReason = String(parsed.reason ?? "").trim();
    const shortReason = rawReason.split(/\s+/).slice(0, 6).join(" ");

    return {
      isValid: parsed.isValid,
      reason: parsed.isValid ? "" : (shortReason || "Photo not suitable"),
    };
  } catch (e) {
    // Fail-open on any Claude error so the user is never blocked by infra issues
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[/api/virtual-tryon] Claude validation error (failing open):", msg);
    return { isValid: true, reason: "" };
  }
}

/* ─────────────────────────────────────────────────────────────────
   CAPTION GENERATION — Gen-Z social caption for share feature
   ─────────────────────────────────────────────────────────────────
   Tiny Claude Haiku call after Gemini returns an image. Crafts a
   natural-sounding social caption mentioning the look + subtle
   Toastie branding. Fail-soft: returns a sensible fallback caption
   if Claude is unavailable.
   ───────────────────────────────────────────────────────────────── */

const CAPTION_SYSTEM_PROMPT = `You are Toastie, an AI fashion stylist for the brand Burnt Toast.

Write ONE short Gen-Z social media caption (Instagram / WhatsApp status
style) for a user who just generated a virtual try-on photo of an outfit
you helped them build.

OUTPUT RULES:
- 1 to 3 SHORT paragraphs, separated by blank lines.
- Total length: roughly 25 to 55 words.
- Natural, trendy, slightly playful Gen-Z voice. Never corporate.
- Mention "Toastie" subtly ONCE (e.g. "built with Toastie", "styled by Toastie", "Toastie pulled through").
- Mention a couple of outfit pieces by category if relevant (top / bottom / dress / footwear / bag / shades / necklace) — never invent product names.
- Use 1 to 3 emojis TOTAL across the whole caption. Tasteful, not spammy.
- Optionally end with a soft question or hashtag like "Would you wear this? 👀" or "#StyledByToastie".
- NEVER use quotation marks around the whole caption.
- NEVER include markdown, code fences, or explanations — ONLY the caption text.

Inspired tone examples (do NOT copy verbatim):
- "Main character energy unlocked ✨\\n\\nBuilt this look with Toastie and honestly obsessed 😍\\n\\nWould you wear this? 👀"
- "POV: your stylist actually gets you ✨\\n\\nCreated this fit with Toastie and I'm not over it.\\n\\nMinimal effort. Maximum vibe.\\n\\n#StyledByToastie"`;

function buildCaptionUserPrompt(outfit: Record<string, OutfitItemPayload>, bodyType?: string): string {
  const pieces: string[] = [];
  for (const [role, item] of Object.entries(outfit)) {
    if (!item?.name) continue;
    const label = SLOT_LABELS[role] ?? role.toUpperCase();
    const color = item.colors?.[0] ? ` (${item.colors[0]})` : "";
    pieces.push(`${label}: ${item.name}${color}`);
  }
  const body = bodyType && bodyType !== "prefer-not-to-say"
    ? `Body type vibe: ${bodyType.replace(/-/g, " ")}.`
    : "";
  return `Outfit just rendered:
${pieces.join("\n")}
${body}
Write the caption now. Output ONLY the caption.`;
}

function fallbackCaption(outfit: Record<string, OutfitItemPayload>): string {
  const pieces = Object.values(outfit).filter(i => i?.name).slice(0, 2).map(i => i!.name);
  const items = pieces.length ? ` — that ${pieces.join(" + ")} hits different` : "";
  return `Main character energy unlocked ✨\n\nBuilt this look with Toastie${items}.\n\nWould you wear it? 👀`;
}

async function generateCaption(
  outfit: Record<string, OutfitItemPayload>,
  bodyType?: string,
): Promise<string> {
  if (!hasAnthropicKey()) return fallbackCaption(outfit);
  try {
    const client = getAnthropicClient();
    const response = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 200,
      system: CAPTION_SYSTEM_PROMPT,
      messages: [{ role: "user", content: buildCaptionUserPrompt(outfit, bodyType) }],
    });
    const text = response.content
      .filter(b => b.type === "text")
      .map(b => (b as { type: "text"; text: string }).text)
      .join("")
      .trim();
    // Strip any accidental markdown / quotes
    const cleaned = text
      .replace(/^```[a-z]*\s*/i, "")
      .replace(/\s*```$/, "")
      .replace(/^"+|"+$/g, "")
      .trim();
    return cleaned || fallbackCaption(outfit);
  } catch (e) {
    console.error("[/api/virtual-tryon] caption generation failed (fallback):", e instanceof Error ? e.message : e);
    return fallbackCaption(outfit);
  }
}

/* ── Build the rich text prompt from outfit data ───────────────── */
function buildPrompt(outfit: Record<string, OutfitItemPayload>, bodyType?: string): string {
  const slots: string[] = [];
  for (const [role, item] of Object.entries(outfit)) {
    if (!item?.name) continue;
    const label = SLOT_LABELS[role] ?? role.toUpperCase();
    const color = item.colors?.[0] ? `in ${item.colors[0]}` : "";
    const family = item.color_family ? `(${item.color_family} family)` : "";
    const note = item.note ? ` — ${item.note}` : "";
    slots.push(`- ${label}: ${item.name} ${color} ${family}${note}`.replace(/ +/g, " "));
  }

  const bodyTypeLine =
    bodyType && bodyType !== "prefer-not-to-say"
      ? `The person has a ${bodyType.replace(/-/g, " ")} body type — keep proportions natural and accurate to that build.`
      : `Keep the person's existing body proportions exactly as in the input photo.`;

  return `
Generate ONE hyperrealistic full-body fashion editorial photograph of the SAME PERSON from the input photo, now wearing the outfit shown in the reference product images.

═══ ABSOLUTE RULES (NON-NEGOTIABLE) ═══

1. IDENTITY — Keep the person's face, skin tone, hair color, hair style,
   eye color, and overall facial structure 100% identical to the input
   photo. Do not beautify, age, slim, or alter their face. Same person.

2. PRODUCT FIDELITY — Each reference product image is the GROUND TRUTH
   for that garment. Reproduce every product EXACTLY as shown:
   - Same exact color (do not shift hue, do not lighten/darken)
   - Same exact print, pattern, embroidery, or graphic
   - Same exact silhouette, cut, length, and proportion
   - Same exact fabric type and texture
   - Same exact neckline, sleeves, hemline, and details
   Do NOT invent, paraphrase, or stylize the garment. If the reference
   shows a pink knitted top with scalloped neckline, render a pink
   knitted top with scalloped neckline — not "something similar".

3. BODY — ${bodyTypeLine}

4. POSE & FRAMING — Person standing straight, facing the camera,
   natural relaxed pose, arms slightly away from the body, full body
   visible head to toe, 3:4 portrait aspect ratio.

═══ OUTFIT BREAKDOWN (each item has a reference image below) ═══
${slots.join("\n")}

═══ VISUAL STYLE ═══
- Clean editorial fashion photography
- Neutral light-cream studio background (#F1EBDD), seamless
- Soft, even, natural lighting; no harsh shadows
- High resolution, photo-real, magazine-quality
- The outfit must be the visual hero — proportionally accurate

═══ STRICTLY FORBIDDEN ═══
- NO text, watermarks, logos (other than what's on the reference products), captions, or labels
- NO additional people, hands, props, or background objects
- NO altering the person's identity
- NO generic/stock clothing — only what the reference images show
- NO multiple poses or collage; output ONE single image only
`.trim();
}

/* ── Fetch a remote product image and convert to inline base64 ── */
async function fetchInline(url: string): Promise<{ mimeType: string; data: string } | null> {
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    const mimeType = res.headers.get("content-type") ?? "image/jpeg";
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length === 0) return null;
    // Cap upload size per image at ~3 MB to stay well under Gemini limits
    if (buf.length > 3 * 1024 * 1024) return null;
    return { mimeType: mimeType.split(";")[0], data: buf.toString("base64") };
  } catch {
    return null;
  }
}

/* ── POST /api/virtual-tryon ──────────────────────────────────── */
export async function POST(req: NextRequest) {
  const apiKey = getGeminiKey();
  if (!apiKey) {
    console.error(
      "[/api/virtual-tryon] GEMINI_API_KEY missing.",
      `cwd=${process.cwd()}`,
      "Has process.env value?", !!process.env.GEMINI_API_KEY,
    );
    return NextResponse.json(
      {
        error:
          "Gemini API key not loaded. Restart your dev server (Ctrl+C, then npm run dev) so it re-reads .env.local.",
      },
      { status: 500 },
    );
  }

  let body: TryOnRequest;
  try {
    body = (await req.json()) as TryOnRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { userPhoto, userMime, bodyType, outfit } = body;

  // ── Validation ─────────────────────────────────────────────────
  if (!userPhoto || typeof userPhoto !== "string") {
    return NextResponse.json({ error: "Missing user photo." }, { status: 400 });
  }
  const mime = (userMime || "image/jpeg").toLowerCase();
  if (!ALLOWED_MIMES.has(mime)) {
    return NextResponse.json(
      { error: "Unsupported image format. Use JPG, PNG or WEBP." },
      { status: 400 },
    );
  }
  if (!outfit || Object.keys(outfit).length === 0) {
    return NextResponse.json(
      { error: "No outfit provided — finalize a look first." },
      { status: 400 },
    );
  }
  // Cap user photo at ~6 MB base64 (≈4.5 MB raw)
  if (userPhoto.length > 6 * 1024 * 1024) {
    return NextResponse.json({ error: "Photo too large. Max 5 MB." }, { status: 400 });
  }

  // ── PRE-VALIDATION via Claude Vision ──────────────────────────
  // Cheap gate to reject blurry / faceless / multi-person photos
  // BEFORE paying for a ~$0.13 + 35s Gemini render.
  const validation = await validatePhotoWithClaude(userPhoto, mime);
  if (!validation.isValid) {
    return NextResponse.json(
      { error: validation.reason, code: "INVALID_PHOTO" },
      { status: 400 },
    );
  }

  // ── Build prompt + parts ──────────────────────────────────────
  const prompt = buildPrompt(outfit, bodyType);

  const parts: Array<
    | { text: string }
    | { inlineData: { mimeType: string; data: string } }
  > = [];

  parts.push({ text: prompt });

  // 1. User photo first — primary identity reference
  parts.push({ inlineData: { mimeType: mime, data: userPhoto } });

  // 2. Each product image as additional reference (best-effort)
  for (const [role, item] of Object.entries(outfit)) {
    if (!item?.img) continue;
    const inline = await fetchInline(item.img);
    if (inline) {
      parts.push({
        text: `Reference for ${SLOT_LABELS[role] ?? role.toUpperCase()}: ${item.name ?? ""}`,
      });
      parts.push({ inlineData: inline });
    }
  }

  // ── Call Gemini ───────────────────────────────────────────────
  let geminiResponse: Response;
  try {
    geminiResponse = await fetch(GEMINI_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: {
          responseModalities: ["IMAGE", "TEXT"],
          // Lower temperature → stay closer to reference products,
          // less creative drift on fabric, color, and silhouette.
          temperature: 0.35,
        },
      }),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[/api/virtual-tryon] network error:", msg);
    return NextResponse.json(
      { error: "Network error reaching Gemini. Please try again." },
      { status: 502 },
    );
  }

  if (!geminiResponse.ok) {
    const text = await geminiResponse.text().catch(() => "");
    console.error("[/api/virtual-tryon] Gemini error", geminiResponse.status, text.slice(0, 300));
    // Map common upstream errors to friendly UI copy
    let userMessage = "We couldn't generate your try-on image right now. Please try again.";
    if (geminiResponse.status === 429) {
      userMessage = "Gemini hit a rate limit. Wait ~60 seconds and try again, or check your plan at ai.google.dev/gemini-api/docs/rate-limits.";
    } else if (geminiResponse.status === 503) {
      userMessage = `${GEMINI_MODEL} is busy. Please try again in a minute.`;
    } else if (geminiResponse.status === 403) {
      userMessage = `Gemini rejected the request (403). Check that your API key has access to ${GEMINI_MODEL} and billing is enabled.`;
    } else if (geminiResponse.status === 400) {
      userMessage = "Photo or outfit data was rejected by Gemini. Try a different photo.";
    }
    return NextResponse.json({ error: userMessage }, { status: 502 });
  }

  // ── Parse the image out of the response ──────────────────────
  type GeminiPart =
    | { text?: string }
    | { inlineData?: { mimeType?: string; data?: string } }
    | { inline_data?: { mime_type?: string; data?: string } };

  interface GeminiPayload {
    candidates?: Array<{ content?: { parts?: GeminiPart[] } }>;
  }

  let data: GeminiPayload;
  try {
    data = (await geminiResponse.json()) as GeminiPayload;
  } catch {
    return NextResponse.json(
      { error: "Unexpected response from Gemini. Please try again." },
      { status: 502 },
    );
  }

  const partsOut = data?.candidates?.[0]?.content?.parts ?? [];
  let imageBase64: string | undefined;
  let imageMime = "image/png";
  for (const p of partsOut) {
    const inline = ("inlineData" in p ? p.inlineData : undefined)
                ?? ("inline_data" in p ? p.inline_data : undefined);
    if (inline?.data) {
      imageBase64 = inline.data;
      const mt = ("mimeType" in inline ? inline.mimeType : undefined)
              ?? ("mime_type" in inline ? inline.mime_type : undefined);
      imageMime = mt || imageMime;
      break;
    }
  }

  if (!imageBase64) {
    return NextResponse.json(
      { error: "Gemini didn't return an image this time. Try a different photo." },
      { status: 502 },
    );
  }

  // Generate the Gen-Z share caption alongside the image (best-effort)
  const caption = await generateCaption(outfit, bodyType);

  return NextResponse.json({
    image:    `data:${imageMime};base64,${imageBase64}`,
    mimeType: imageMime,
    caption,
  });
}
