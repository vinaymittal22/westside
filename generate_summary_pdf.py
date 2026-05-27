"""Generate a technical-summary PDF for the Burnt Toast project."""

from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, PageBreak,
    Table, TableStyle, KeepTogether, HRFlowable,
)

OUTPUT = "Burnt_Toast_Technical_Summary.pdf"

# ── Colors (matching the Burnt Toast palette) ──────────────────
INK    = colors.HexColor("#1A1A1A")
ASH    = colors.HexColor("#3A3A3A")
MUTED  = colors.HexColor("#8A8782")
LINE   = colors.HexColor("#D8D2C4")
CREAM  = colors.HexColor("#F5F1E8")
ACCENT = colors.HexColor("#B8492C")
SAGE   = colors.HexColor("#748B6A")
CODE_BG = colors.HexColor("#F0EBE0")

# ── Styles ─────────────────────────────────────────────────────
styles = getSampleStyleSheet()

title_style = ParagraphStyle(
    "Title", parent=styles["Title"],
    fontName="Helvetica-Bold", fontSize=28, leading=34,
    alignment=TA_CENTER, textColor=INK, spaceAfter=8,
)
subtitle_style = ParagraphStyle(
    "Subtitle", parent=styles["Normal"],
    fontName="Helvetica-Oblique", fontSize=14, leading=18,
    alignment=TA_CENTER, textColor=MUTED, spaceAfter=20,
)
h1_style = ParagraphStyle(
    "H1", parent=styles["Heading1"],
    fontName="Helvetica-Bold", fontSize=18, leading=22,
    textColor=INK, spaceBefore=18, spaceAfter=10,
    borderPadding=(0, 0, 6, 0),
)
h2_style = ParagraphStyle(
    "H2", parent=styles["Heading2"],
    fontName="Helvetica-Bold", fontSize=13, leading=17,
    textColor=ACCENT, spaceBefore=12, spaceAfter=6,
)
body_style = ParagraphStyle(
    "Body", parent=styles["Normal"],
    fontName="Helvetica", fontSize=10.5, leading=15,
    textColor=ASH, alignment=TA_JUSTIFY, spaceAfter=8,
)
bullet_style = ParagraphStyle(
    "Bullet", parent=body_style,
    leftIndent=14, bulletIndent=2, spaceAfter=4,
)
code_style = ParagraphStyle(
    "Code", parent=styles["Code"],
    fontName="Courier", fontSize=8.5, leading=11,
    textColor=INK, backColor=CODE_BG,
    leftIndent=8, rightIndent=8,
    borderPadding=8, borderColor=LINE, borderWidth=0.5,
    spaceBefore=4, spaceAfter=10,
)
caption_style = ParagraphStyle(
    "Caption", parent=styles["Normal"],
    fontName="Helvetica-Oblique", fontSize=9, leading=12,
    textColor=MUTED, alignment=TA_CENTER, spaceAfter=12,
)

# ── Helpers ────────────────────────────────────────────────────
def H1(text):
    return [Paragraph(text, h1_style),
            HRFlowable(width="100%", thickness=0.8, color=LINE, spaceAfter=8)]

def H2(text):
    return [Paragraph(text, h2_style)]

def P(text):
    return Paragraph(text, body_style)

def B(text):
    return Paragraph(f"•&nbsp;&nbsp;{text}", bullet_style)

def code_block(text):
    safe = (text.replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\n", "<br/>")
                .replace(" ", "&nbsp;"))
    return Paragraph(safe, code_style)

def styled_table(data, col_widths=None, header_bg=INK, header_fg=colors.white):
    t = Table(data, colWidths=col_widths, hAlign="LEFT", repeatRows=1)
    t.setStyle(TableStyle([
        ("BACKGROUND",   (0,0), (-1,0), header_bg),
        ("TEXTCOLOR",    (0,0), (-1,0), header_fg),
        ("FONTNAME",     (0,0), (-1,0), "Helvetica-Bold"),
        ("FONTSIZE",     (0,0), (-1,-1), 9),
        ("LEADING",      (0,0), (-1,-1), 12),
        ("ALIGN",        (0,0), (-1,-1), "LEFT"),
        ("VALIGN",       (0,0), (-1,-1), "TOP"),
        ("TOPPADDING",   (0,0), (-1,-1), 6),
        ("BOTTOMPADDING",(0,0), (-1,-1), 6),
        ("LEFTPADDING",  (0,0), (-1,-1), 8),
        ("RIGHTPADDING", (0,0), (-1,-1), 8),
        ("ROWBACKGROUNDS", (0,1), (-1,-1), [colors.white, CREAM]),
        ("LINEBELOW",    (0,0), (-1,0), 0.8, LINE),
        ("LINEBELOW",    (0,-1), (-1,-1), 0.5, LINE),
        ("FONTNAME",     (0,1), (-1,-1), "Helvetica"),
        ("TEXTCOLOR",    (0,1), (-1,-1), ASH),
    ]))
    return t

# ── Build the story ────────────────────────────────────────────
story = []

# ── Cover ──────────────────────────────────────────────────────
story.append(Spacer(1, 60*mm))
story.append(Paragraph("Burnt Toast", title_style))
story.append(Paragraph("AI-Powered Fashion Stylist — Technical Summary", subtitle_style))
story.append(Spacer(1, 8*mm))
story.append(HRFlowable(width="40%", thickness=1.5, color=ACCENT,
                        hAlign="CENTER", spaceBefore=4, spaceAfter=14))

cover_meta = [
    ["Project",      "Burnt Toast — Next.js 16 AI Fashion E-commerce"],
    ["Live URL",     "https://westside-ten.vercel.app/chat"],
    ["Repository",   "https://github.com/vinaymittal22/westside.git"],
    ["AI Provider",  "Anthropic Claude (claude-sonnet-4-5)"],
    ["SDK",          "@anthropic-ai/sdk v0.95.2"],
    ["Stack",        "Next.js 16.2.6, React 19, TypeScript, Tailwind CSS 3.4"],
    ["Document",     "Technical architecture, bug-fix log, current state"],
]
story.append(styled_table(cover_meta, col_widths=[40*mm, 110*mm]))
story.append(Spacer(1, 30*mm))
story.append(Paragraph(
    "This document covers the architecture, AI design decisions, engineering "
    "fixes, and current production readiness of the Burnt Toast application.",
    caption_style,
))
story.append(PageBreak())

# ── 1. Project Overview ───────────────────────────────────────
story += H1("1. Project Overview")
story.append(P(
    "<b>Burnt Toast</b> is a Next.js 16 fashion e-commerce web application "
    "with an AI-powered chatbot stylist named <b>Toastie</b>. The app "
    "combines a Shopify-style storefront (browse, cart, wishlist, product "
    "detail pages) with a multimodal conversational shopping assistant that "
    "understands text and images, builds complete outfits, and lets users "
    "iteratively refine looks."
))
story.append(P(
    "The chatbot can analyse uploaded product photos via Claude Vision, "
    "treat the uploaded item as an anchor, and complete the rest of the "
    "outfit around it — bottoms, footwear, bags, and accessories — without "
    "ever recommending another item in the same category as the anchor."
))

# ── 2. Tech Stack ─────────────────────────────────────────────
story += H1("2. Tech Stack")
tech = [
    ["Layer",       "Technology"],
    ["Framework",   "Next.js 16.2.6 (App Router, Turbopack)"],
    ["Runtime",     "React 19"],
    ["Language",    "TypeScript (strict mode)"],
    ["Styling",     "Tailwind CSS 3.4, inline styles, globals.css"],
    ["AI Provider", "Anthropic Claude (@anthropic-ai/sdk v0.95.2)"],
    ["AI Model",    "claude-sonnet-4-5 for chat intent parsing and vision"],
    ["State",       "React useState / useRef (no Redux/Zustand)"],
    ["Persistence", "localStorage for chat history"],
    ["Icons",       "lucide-react"],
    ["Catalogue",   "Static TypeScript data files"],
    ["Deployment",  "Vercel"],
]
story.append(styled_table(tech, col_widths=[40*mm, 120*mm]))

# ── 3. Application Structure ─────────────────────────────────
story += H1("3. Application Structure")
story.append(code_block("""app/
  api/
    chat/route.ts            <- main text chat endpoint
    image-style/route.ts     <- image vision + outfit completion endpoint
    tryon/route.ts           <- virtual try-on
  chat/page.tsx              <- chat UI wrapper
  product/[id]/page.tsx      <- product detail page
  cart/, wishlist/, /        <- storefront pages

components/
  LookbookChat.tsx           <- 2,700+ line main chat component
  Navbar.tsx                 <- global navbar (links to /chat)
  cards, modals, etc.

lib/
  outfitEngine.ts            <- rule-based outfit builder + catalogue index
  styleTaxonomy.ts           <- aesthetic affinity matrices + templates
  styleExplainer.ts          <- turns engine output into stylist commentary
  productUrl.ts              <- maps SKUs to Shopify URLs

types/
  fashion.ts                 <- EnrichedProduct, OutfitContext, GeneratedOutfit

utils/
  claudeClient.ts            <- Anthropic SDK wrapper + 426-line SYSTEM_PROMPT"""))

# ── 4. Core User Flow ─────────────────────────────────────────
story += H1("4. Core User Flow")
for b in [
    "User opens <b>/chat</b> and sees an empty welcome screen with suggestion chips.",
    "User can: type a text query (\"college fest fit under ₹3000\"), upload a product image, or click a chip (occasion, vibe).",
    "Toastie returns a complete styled outfit with top/bottom/footwear/bag/accessories.",
    "User can iteratively refine: \"change footwear\", \"different bag\", \"more streetwear\", \"under ₹4000\".",
    "User can add full looks or individual items to the cart and check out.",
]:
    story.append(B(b))

# ── 5. The AI Layer ───────────────────────────────────────────
story += H1("5. The AI Layer — How Toastie Thinks")

story += H2("5.1 Two-stage architecture")
story.append(P(
    "Every text turn goes through two distinct steps. <b>Stage 1</b> is "
    "intent parsing by Claude Sonnet 4.5 — the user message plus the "
    "session context is sent with a 426-line SYSTEM_PROMPT, and Claude "
    "returns a structured JSON intent. <b>Stage 2</b> is the deterministic "
    "outfit engine in <i>lib/outfitEngine.ts</i> which scores every "
    "catalogue product against the intent and returns the highest-scoring "
    "products per slot."
))
story.append(P(
    "This split keeps creative phrasing in the LLM and deterministic "
    "product selection in code, so the same query returns consistent "
    "products and never hallucinates SKUs."
))
story.append(code_block("""{
  "intent": "outfit | multi | browse | replace_options | complete_look | chat",
  "message": "punchy reply text",
  "params": {
    "occasion": "date-night",
    "vibe": "minimal-clean",
    "gender": "female",
    "budget": 4000,
    "replace_slot": "footwear",
    "color": "black",
    "anchor_sku": "301062271",
    "count": 3
  },
  "quick_replies": [...],
  "next_question": "..."
}"""))

story += H2("5.2 Prompt caching (Anthropic ephemeral cache)")
story.append(P(
    "The 426-line SYSTEM_PROMPT is identical on every request, so it is "
    "wrapped in a TextBlockParam with <i>cache_control: ephemeral</i>. "
    "This drops Claude API cost by approximately 90% on cache hits. "
    "Turn 1 creates ~4,669 cached tokens; turns 2+ read those tokens at "
    "10% cost. Cache statistics are logged on every response."
))
story.append(code_block("""const systemBlocks: Anthropic.TextBlockParam[] = [
  { type: "text", text: SYSTEM_PROMPT,
    cache_control: { type: "ephemeral" } },
  { type: "text", text: sessionContext },  // dynamic, not cached
];"""))

story += H2("5.3 Multimodal — Claude Vision")
story.append(P(
    "For image uploads, <i>/api/image-style</i> sends a base64 JPEG/PNG "
    "plus a structured prompt to claude-sonnet-4-5 and receives a JSON "
    "analysis of the product including category, color, pattern, style "
    "type, material, fit, gender, season, aesthetic, occasion suggestions, "
    "a one-line description, a stylist message, and an optional "
    "<i>user_intent_slot</i> field when the customer asked about a "
    "specific slot."
))

# ── 6. Outfit Engine ──────────────────────────────────────────
story += H1("6. Outfit Engine Internals")

story += H2("6.1 Catalogue")
for b in [
    "<b>CATALOGUE</b>: enriched product array with normalized fields (product_type, aesthetics[], color_family, formality 1-5, boldness 1-5, occasion[], gender).",
    "<b>CATALOGUE_BY_ID</b>: O(1) SKU lookup.",
]:
    story.append(B(b))

story += H2("6.2 Templates")
for b in [
    "<b>Two-piece</b>: top + bottom + footwear + bag + sunglasses + necklace",
    "<b>Dress</b>: dress + footwear + bag + sunglasses + necklace",
    "Each slot has a RoleSlot with allowed product types and required/optional flags.",
]:
    story.append(B(b))

story += H2("6.3 Scoring formula")
story.append(code_block("""score =
    aestheticAffinity(product, context_vibe)     * w_aesthetic
  + colorHarmony(product, otherSlotColors)       * w_color
  + occasionMatch(product, context_occasion)     * w_occasion
  + formalityFit(product, context_occasion)      * w_formality
  + coOccurrence(product, otherSlots)            * w_cooccur
  - (rejected_skus.includes(product.id) ? Infinity : 0)"""))
story.append(P(
    "Aesthetic affinity is a static matrix (e.g. \"y2k-revival\" pairs "
    "strongly with \"urban-streetwear\" but weakly with "
    "\"preppy-collegiate\"). Color harmony is a separate matrix (neutrals "
    "pair with everything; jewel-tones avoid warm-pastels)."
))

story += H2("6.4 Entry points")
for b in [
    "<b>buildOutfit(ctx)</b> — returns one outfit",
    "<b>buildMultipleOutfits(ctx, n)</b> — returns n looks with item variety enforced via rejection",
    "<b>completeLook(anchorSku, ctx)</b> — builds around a fixed anchor",
    "<b>browseCategory(cat, filters)</b> — for \"show me dresses\" requests",
    "<b>getReplaceAlternatives(ctx, slot, n)</b> — 3-4 alternatives for one slot",
    "<b>findSimilar(sku, n)</b> — vector-similarity by aesthetic + color",
]:
    story.append(B(b))

# ── 7. Session State ─────────────────────────────────────────
story += H1("7. Session State Model")
story.append(P(
    "A single SessionState object lives in the chat component and is sent "
    "with every API request. It is preserved across turns so the LLM "
    "never has to \"remember\" anything — it is all explicit in the "
    "request body."
))
story.append(code_block("""interface SessionState {
  currentOutfit: Record<string, { sku, name, price }>;
  userProfile:   { gender, occasion, vibe, color, budget };
  rejectedSkus:  string[];
  likedSkus:     string[];
  anchor:        { type, role, excluded_roles, description } | null;
  imageContext:  { full ImageAnalysis } | null;
  mode:          "image_styling" | null;
}"""))
story.append(P(
    "<i>deriveSessionUpdate(parsed, prev)</i> mutates the state after "
    "every assistant response while preserving anchor, imageContext, and "
    "mode so they survive across turns."
))

# ── 8. Anchor Mode ──────────────────────────────────────────
story += H1("8. Anchor Mode — Complete-the-Look Logic")
story.append(P(
    "When a user uploads a product image, <i>/api/image-style</i> "
    "analyses it, identifies the anchor's product_type (e.g. DRESS), and "
    "computes which slots to never recommend:"
))
excl = [
    ["Anchor product_type", "Excluded roles"],
    ["TOP",      "[\"top\"]"],
    ["BOTTOM",   "[\"bottom\"]"],
    ["DRESS",    "[\"dress\", \"top\", \"bottom\"]"],
    ["FOOTWEAR", "[\"footwear\"]"],
    ["BAG",      "[\"bag\"]"],
    ["JEWELRY",  "[\"necklace\"]"],
    ["EYEWEAR",  "[\"sunglasses\"]"],
    ["WATCH",    "[\"watch\"]"],
    ["HAT",      "[\"hat\"]"],
]
story.append(styled_table(excl, col_widths=[55*mm, 80*mm]))
story.append(Spacer(1, 4*mm))
story.append(P(
    "The engine builds 3 looks for the top 3 occasion suggestions, and "
    "<b>applyAnchorFilter()</b> post-processes every outfit to strip "
    "same-category slots. The anchor and image context persist into "
    "<i>/api/chat</i> so every follow-up turn (\"change footwear\", "
    "\"more classy\") respects it. A yellow \"Clear &amp; full outfit\" "
    "pill appears above the input bar whenever an anchor is active so the "
    "user can opt out."
))

# ── 9. Replacement Flow ─────────────────────────────────────
story += H1("9. Replacement Flow — Atomic Slot Swap")
story.append(P(
    "When the user says \"change footwear\":"
))
for b in [
    "Claude returns <i>intent: \"replace_options\", params: { replace_slot: \"footwear\" }</i>",
    "Engine calls <b>getReplaceAlternatives()</b>, returning 3-4 footwear options scored against the rest of the outfit.",
    "User sees a ReplaceOptionsRenderer with \"KEEPING bag + sunglasses + necklace\" tags + 4 footwear cards.",
    "User taps a card → frontend fires <i>confirm_replacement</i> action.",
    "<b>Critical fix:</b> the API does NOT call buildOutfit() (which would regenerate a full new outfit). Instead, it directly looks up the selected product in CATALOGUE_BY_ID and swaps it into the existing outfit dict, preserving every other item exactly.",
    "Anchor mode is still respected.",
]:
    story.append(B(b))

# ── 10. Multimodal Routing ─────────────────────────────────
story += H1("10. Multimodal Routing — Image + Text Simultaneously")
story.append(P(
    "<b>Before the fix:</b> text typed while an image was staged was "
    "routed to <i>/api/chat</i> (which had no vision). Toastie would "
    "reply \"I haven't seen the dress yet.\""
))
story.append(P("<b>After the fix:</b> in the send() handler, before fetching /api/chat:"))
story.append(code_block("""if (imageFile && !session.imageContext && !opts?.action) {
  return sendImage();   // routes to /api/image-style with userMessage
}"""))
story.append(P(
    "<b>sendImage()</b> packages the image and the typed text as "
    "<i>userMessage</i> in the request body. Claude Vision sees both, "
    "identifies the user's intent (e.g. \"what shoes go with this?\" "
    "→ <i>user_intent_slot: \"footwear\"</i>), and writes a "
    "stylist_message that directly answers the question instead of "
    "giving a generic outfit intro."
))
story.append(P(
    "Once imageContext is active, all follow-up text goes to <i>/api/chat</i>. "
    "The system prompt now includes an <b>ACTIVE PRODUCT CONTEXT</b> "
    "block listing the anchor's color, pattern, style, fit, material, "
    "aesthetic, and season — so Claude can never reply \"I haven't "
    "seen the dress\" again."
))

# ── 11. Broken-Image Handling ─────────────────────────────
story += H1("11. Broken-Image Handling")
story.append(P(
    "The Burnt Toast Shopify CDN has some SKUs whose auto-generated "
    "image URLs 404. Since URLs are generated at build time from SKU+slug "
    "patterns, there is no static list of broken ones."
))
story.append(P("<b>Runtime solution:</b>"))
for b in [
    "Module-level <i>brokenSkus: Set&lt;string&gt;</i> in LookbookChat.tsx",
    "<b>useBrokenSkus()</b> hook subscribes components to the set.",
    "Every product &lt;img onError&gt; calls <b>markSkuBroken(sku)</b> → re-renders everything.",
    "<b>isHiddenProduct(sku, img)</b> returns true for SKUs in the broken set OR for empty/non-HTTP URLs.",
    "Every renderer (OutfitBlock, ProductsRenderer, ReplaceOptionsRenderer) pre-filters its array.",
    "Every card (CompactCard, MiniProductCard, ReplaceOptionCard) returns null if its SKU is hidden.",
    "OutfitBlock's displayed total is recomputed from visible items only.",
]:
    story.append(B(b))
story.append(P(
    "Net effect: a broken product flashes once, then disappears for the "
    "rest of the session."
))

# ── 12. Frontend Component Map ────────────────────────────
story += H1("12. Frontend — LookbookChat.tsx Component Map")
fe = [
    ["Subcomponent",            "Purpose"],
    ["OutfitBlock",             "Full outfit card with all slots + total + ADD LOOK button"],
    ["CompactCard",             "One outfit slot — image, name, price, color swatch, size picker"],
    ["MiniProductCard",         "Standalone catalogue card (products grid)"],
    ["ReplaceOptionCard",       "Alternative product in the replacement flow"],
    ["ImageLooksRenderer",      "Image analysis badges + anchor info + 3 complete-the-look cards"],
    ["MultiRenderer",           "\"Here are 3 looks\" carousel"],
    ["ProductsRenderer",        "Browse results (\"show me dresses\")"],
    ["ReplaceOptionsRenderer",  "\"Keeping X — pick a new Y\" UI"],
    ["AnalysisBadges",          "T-SHIRT / BROWN / CASUAL / COTTON pills"],
    ["FollowUpChips",           "Suggested follow-up prompts"],
    ["ResponseRenderer",        "Dispatcher that picks the right renderer based on parsed.type"],
]
story.append(styled_table(fe, col_widths=[55*mm, 105*mm]))

# ── 13. Layout & Responsiveness ───────────────────────────
story += H1("13. Layout & Responsiveness")
story.append(P("Three sticky-element layout, viewport-constrained:"))
story.append(code_block("""+-------------------------+  <- Root: height: 100dvh, overflow: hidden
|  HEADER (flexShrink: 0) |
+-------------------------+
|  CHAT SCROLL            |  <- flex: 1, overflowY: auto
|  (the only scroll area) |
+-------------------------+
|  INPUT BAR              |  <- position: fixed, bottom: 0, z-index: 1000
+-------------------------+"""))
for b in [
    "<b>100dvh</b> (dynamic viewport height) handles the mobile browser address bar correctly.",
    "<b>min-height: 0</b> on all flex containers so children actually shrink.",
    "Input bar is <b>position: fixed</b> to stay visible on any scroll depth.",
    "iOS <i>env(safe-area-inset-bottom)</i> padding on mobile for the home indicator.",
    "Sidebar slides in from the left on mobile (&lt;768px), statically docked on desktop.",
]:
    story.append(B(b))

# ── 14. Major Bugs Fixed ─────────────────────────────────
story += H1("14. Major Bugs Fixed (Engineering Timeline)")
bugs = [
    ["#",  "Issue",                                            "Fix"],
    ["1",  "Anthropic prompt caching not enabled",            "Wrapped SYSTEM_PROMPT in cached TextBlockParam"],
    ["2",  "Wrong model (claude-haiku-4-5)",                  "Upgraded to claude-sonnet-4-5"],
    ["3",  "954 lines of dead code in 6 files",               "Deleted after grep import audit"],
    ["4",  "Image uploads ignored entirely",                  "Built /api/image-style from scratch"],
    ["5",  "Anchor mode broken (no image awareness in chat)", "Added anchor to session, anchor filter in engine"],
    ["6",  "Gender prompt appeared even with model in photo", "Vision prompt: use model's gender when visible"],
    ["7",  "Gender override re-routed to wrong endpoint",     "lastUploadedRef + handleQuickReply router"],
    ["8",  "Anchor lost on every chat turn",                  "deriveSessionUpdate now preserves anchor"],
    ["9",  "Picking a footwear regenerated entire outfit",    "confirm_replacement rewritten as direct slot swap"],
    ["10", "Input bar scrolled away on long chats",           "position: fixed + bottom padding on scroll area"],
    ["11", "\"Ask Toastie\" navbar wasn't clickable",         "Wrapped in <Link href='/chat'>"],
    ["12", "Text-typed-with-image went to text-only chat",    "Frontend routing guard in send()"],
    ["13", "imageContext never reached /api/chat prompt",     "ACTIVE PRODUCT CONTEXT block in session context"],
    ["14", "Broken product images shown in chat",             "Runtime broken-SKU detection + universal filter"],
]
story.append(styled_table(bugs, col_widths=[8*mm, 75*mm, 77*mm]))

# ── 15. Verification Workflow ───────────────────────────
story += H1("15. Verification Workflow")
story.append(P("For every change in the session, the workflow has been:"))
for i, b in enumerate([
    "<b>TypeScript check:</b> <i>./node_modules/.bin/tsc --noEmit</i>",
    "<b>Production build:</b> <i>npm run build</i> (Next.js 16 + Turbopack)",
    "<b>Smoke test:</b> cURL against the running dev server for API changes; manual UI test for component changes.",
    "<b>Commit</b> with a descriptive message.",
    "<b>Push</b> to main.",
], start=1):
    story.append(Paragraph(f"{i}.&nbsp;&nbsp;{b}", bullet_style))
story.append(P("All commits include a <i>Co-Authored-By: Claude</i> trailer."))

# ── 16. Production Ready ────────────────────────────────
story += H1("16. What's Production-Ready Now")
ready = [
    "Sonnet 4.5 powering both chat and vision",
    "Anthropic prompt caching cutting cost by ~90%",
    "Multimodal: image + text simultaneously, persistent across the conversation",
    "Anchor-mode outfit completion never recommends the same category as the uploaded item",
    "Atomic slot replacement preserves the rest of the outfit",
    "Broken images invisible to the user",
    "Fixed-position input bar on all viewport sizes",
    "Responsive on mobile (down to 320px) and desktop (up to 4K)",
    "Chat history persistence in localStorage",
    "Diagnostic logging in place for the multimodal flow (frontend + both API routes)",
    "Type-clean (strict TypeScript, zero errors)",
    "Builds clean (Next.js production build passes)",
]
for b in ready:
    story.append(Paragraph(f'<font color="#748B6A"><b>✓</b></font>&nbsp;&nbsp;{b}', bullet_style))

# ── 17. Next Steps ─────────────────────────────────────
story += H1("17. Pragmatic Next Steps")
for b in [
    "Remove the diagnostic [DIAG ...] logs once the multimodal fix is verified in production.",
    "Pre-validate the catalogue's image URLs in a build step instead of relying on runtime onError.",
    "Add end-to-end tests (Playwright) for the image-upload + follow-up text flow.",
    "Streaming responses (Claude <i>stream: true</i>) for perceived latency.",
    "Server-side session storage (currently lives only in client state).",
    "Authenticated user accounts so chat history is portable across devices.",
]:
    story.append(B(b))

# ── Footer ─────────────────────────────────────────────
story.append(Spacer(1, 16*mm))
story.append(HRFlowable(width="100%", thickness=0.5, color=LINE))
story.append(Spacer(1, 6*mm))
story.append(Paragraph(
    "Burnt Toast — Technical Summary &nbsp;•&nbsp; Generated for "
    "technical handover &nbsp;•&nbsp; All architectural decisions, bug "
    "fixes, and verification steps are reflected in the project's git history.",
    caption_style,
))

# ── Page numbering ─────────────────────────────────────
def add_page_numbers(canvas, doc):
    canvas.saveState()
    canvas.setFont("Helvetica", 8)
    canvas.setFillColor(MUTED)
    page_str = f"{doc.page}"
    canvas.drawRightString(200*mm, 12*mm, page_str)
    canvas.drawString(15*mm, 12*mm, "Burnt Toast — Technical Summary")
    canvas.restoreState()

# ── Build ───────────────────────────────────────────────
doc = SimpleDocTemplate(
    OUTPUT, pagesize=A4,
    leftMargin=18*mm, rightMargin=18*mm,
    topMargin=18*mm, bottomMargin=22*mm,
    title="Burnt Toast Technical Summary",
    author="Burnt Toast Engineering",
)
doc.build(story, onFirstPage=add_page_numbers, onLaterPages=add_page_numbers)
print(f"Wrote {OUTPUT}")
