import { NextRequest, NextResponse } from "next/server";
import { getAnthropicClient, SYSTEM_PROMPT } from "@/utils/claudeClient";

/* ── Types ─────────────────────────────────────────────────────── */
export interface AnthropicMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ExtractedFilters {
  gender:    "female" | "male" | null;
  occasion:  string | null;
  colors:    string[];
  budgetMin: number;
  budgetMax: number | null;
  bodyType:  string | null;
}

export interface ChatAPIResponse {
  message:      string;
  filters:      ExtractedFilters;
  isComplete:   boolean;
  quickReplies: string[];
}

/* ── Default / fallback ─────────────────────────────────────────── */
const DEFAULT_FILTERS: ExtractedFilters = {
  gender:    null,
  occasion:  null,
  colors:    [],
  budgetMin: 0,
  budgetMax: null,
  bodyType:  null,
};

function fallbackResponse(): ChatAPIResponse {
  return {
    message:
      "I'd love to help you find the perfect outfit! Could you tell me what occasion you're shopping for? (Wedding, Party, Casual, Office, Festival, Date Night, or Vacation)",
    filters:      DEFAULT_FILTERS,
    isComplete:   false,
    quickReplies: ["💍 Wedding", "🎉 Party", "☀️ Casual", "💼 Office", "🎵 Festival"],
  };
}

/* ── Parse Claude response safely ───────────────────────────────── */
function parseResponse(raw: string): ChatAPIResponse {
  try {
    // Strip markdown code fences if Claude wraps the JSON
    const cleaned = raw
      .trim()
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/, "")
      .trim();

    const parsed = JSON.parse(cleaned);

    const f = parsed.filters ?? {};
    const filters: ExtractedFilters = {
      gender:    f.gender    ?? null,
      occasion:  f.occasion  ?? null,
      colors:    Array.isArray(f.colors) ? f.colors : [],
      budgetMin: typeof f.budgetMin === "number" ? f.budgetMin : 0,
      budgetMax: typeof f.budgetMax === "number" ? f.budgetMax : null,
      bodyType:  f.bodyType  ?? null,
    };

    return {
      message:      String(parsed.message ?? ""),
      filters,
      isComplete:   Boolean(parsed.isComplete),
      quickReplies: Array.isArray(parsed.quickReplies) ? parsed.quickReplies : [],
    };
  } catch {
    // Claude replied with non-JSON plain text — surface it gracefully
    return {
      message:      raw.slice(0, 800),
      filters:      DEFAULT_FILTERS,
      isComplete:   false,
      quickReplies: [],
    };
  }
}

/* ── POST /api/chat ─────────────────────────────────────────────── */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      message,
      history = [],
    }: { message: string; history: AnthropicMessage[] } = body;

    if (!message?.trim()) {
      return NextResponse.json({ error: "Empty message" }, { status: 400 });
    }

    const client = getAnthropicClient();

    /*
     * Build the full messages array:
     * All previous turns (history) + the new user turn.
     *
     * Claude's messages API is stateless and simple:
     *   - role: "user" | "assistant"
     *   - content: string
     *
     * The system prompt is passed separately — it never appears in messages[].
     * This keeps conversation context perfectly intact across turns.
     */
    const messages: AnthropicMessage[] = [
      ...history,
      { role: "user", content: message.trim() },
    ];

    const response = await client.messages.create({
      model:      "claude-opus-4-7",
      system:     SYSTEM_PROMPT,
      messages,
      max_tokens: 1024,
    });

    // Extract the text content from Claude's response
    const rawText =
      response.content
        .filter((block) => block.type === "text")
        .map((block) => (block as { type: "text"; text: string }).text)
        .join("") ?? "";

    const parsed = parseResponse(rawText);

    /*
     * Return _raw so the client can store the exact JSON Claude produced
     * in the assistant turn of the conversation history.
     * This keeps the model's context perfectly consistent across turns.
     */
    return NextResponse.json({ ...parsed, _raw: rawText });
  } catch (error: unknown) {
    console.error("[/api/chat] Claude error:", error);
    return NextResponse.json(fallbackResponse(), { status: 200 });
  }
}
