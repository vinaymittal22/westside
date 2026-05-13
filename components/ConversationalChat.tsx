"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Sparkles, Send, User, RotateCcw, ShoppingBag, AlertCircle } from "lucide-react";
import Image from "next/image";
import clsx from "clsx";

import { QuickReply } from "@/data/shopperFlow";
import { filterProducts, FilterState } from "@/utils/filterProducts";
import { products } from "@/data/products";
import { FashionProduct } from "@/types";
import { AnthropicMessage, ExtractedFilters, ChatAPIResponse } from "@/app/api/chat/route";

/* ── Types ─────────────────────────────────────────────────────── */
interface ChatMessage {
  id:           string;
  role:         "ai" | "user";
  content:      string;
  quickReplies?: QuickReply[];
  products?:    FashionProduct[];
  timestamp:    Date;
  isError?:     boolean;
}

/* Accumulated filter profile — union of all Claude extractions so far */
interface LiveProfile {
  gender:    "male" | "female" | "all";
  occasion:  string;
  colors:    string[];
  budgetMin: number;
  budgetMax: number;
  bodyType:  string;
}

const DEFAULT_PROFILE: LiveProfile = {
  gender:    "all",
  occasion:  "all",
  colors:    [],
  budgetMin: 0,
  budgetMax: Infinity,
  bodyType:  "all",
};

interface Props {
  onProductsChange?: (products: FashionProduct[]) => void;
}

/* ── Helpers ────────────────────────────────────────────────────── */
function uid() {
  return Math.random().toString(36).slice(2, 9);
}

/**
 * Merge the latest Gemini-extracted filters into the running profile.
 * Null values from Gemini mean "not mentioned this turn" → keep previous.
 */
function mergeFilters(prev: LiveProfile, extracted: ExtractedFilters): LiveProfile {
  return {
    gender:    extracted.gender    ?? (prev.gender    !== "all" ? prev.gender    : "all"),
    occasion:  extracted.occasion  ?? (prev.occasion  !== "all" ? prev.occasion  : "all"),
    colors:    extracted.colors?.length  ? extracted.colors    : prev.colors,
    budgetMin: extracted.budgetMin > 0   ? extracted.budgetMin : prev.budgetMin,
    budgetMax: extracted.budgetMax !== null
      ? extracted.budgetMax
      : prev.budgetMax,
    bodyType:  extracted.bodyType  ?? (prev.bodyType  !== "all" ? prev.bodyType  : "all"),
  };
}

function buildFilterState(p: LiveProfile): FilterState {
  return {
    gender:    p.gender,
    occasion:  p.occasion,
    colors:    p.colors,
    bodyType:  p.bodyType,
    budgetMin: p.budgetMin,
    budgetMax: p.budgetMax === Infinity ? Infinity : p.budgetMax,
  };
}

/* Convert plain string quick replies from Gemini into QuickReply objects */
function toQuickReplies(strs: string[]): QuickReply[] {
  return strs.map((s) => ({ label: s, value: s }));
}

/* ── Sub-components ─────────────────────────────────────────────── */
function AIAvatar() {
  return (
    <div className="relative flex-shrink-0">
      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center shadow-lg shadow-gold-500/30">
        <Sparkles className="w-4 h-4 text-black" />
      </div>
      <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-[#0a0a0a]" />
    </div>
  );
}

function UserAvatar() {
  return (
    <div className="w-9 h-9 rounded-full bg-dark-200 border border-white/10 flex items-center justify-center flex-shrink-0">
      <User className="w-4 h-4 text-zinc-400" />
    </div>
  );
}

function LoadingDots() {
  return (
    <span className="flex gap-1 items-center h-4">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-gold-400 animate-dot-bounce"
          style={{ animationDelay: `${i * 0.18}s` }}
        />
      ))}
    </span>
  );
}

function ProductMiniCard({ product }: { product: FashionProduct }) {
  return (
    <div className="flex gap-3 bg-white/5 rounded-2xl p-3 border border-white/10 hover:border-gold-500/40 transition-colors">
      <div className="relative w-16 h-20 rounded-xl overflow-hidden flex-shrink-0">
        <Image src={product.image} alt={product.name} fill className="object-cover" sizes="64px" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-white truncate leading-tight">{product.name}</p>
        <p className="text-xs text-zinc-500 mt-0.5 capitalize">{product.occasion} · {product.gender}</p>
        <p className="text-sm font-bold text-gold-400 mt-1">
          ₹{product.price.toLocaleString("en-IN")}
        </p>
        {product.isSale && product.originalPrice && (
          <p className="text-xs text-zinc-600 line-through">
            ₹{product.originalPrice.toLocaleString("en-IN")}
          </p>
        )}
      </div>
    </div>
  );
}

/* Render basic **bold** markdown in text */
function RichText({ text }: { text: string }) {
  return (
    <>
      {text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
        part.startsWith("**") && part.endsWith("**") ? (
          <strong key={i}>{part.slice(2, -2)}</strong>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

/* ── Main component ─────────────────────────────────────────────── */
export default function ConversationalChat({ onProductsChange }: Props) {
  const [messages,   setMessages]   = useState<ChatMessage[]>([]);
  const [profile,    setProfile]    = useState<LiveProfile>(DEFAULT_PROFILE);
  const [isTyping,   setIsTyping]   = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [isComplete, setIsComplete] = useState(false);

  /*
   * FIX 1 — useRef instead of useState for conversation history.
   *
   * React state updates are async: if the user clicks a quick-reply button
   * immediately after the AI responds, the useCallback closure still holds
   * the OLD (empty) geminiHistory value and sends [] to Gemini → Gemini has
   * no context → it repeats the same question.
   *
   * A ref is updated synchronously, so handleInput always reads the latest
   * history regardless of React's render cycle.
   */
  const geminiHistoryRef = useRef<AnthropicMessage[]>([]);

  const bottomRef      = useRef<HTMLDivElement>(null);
  const textareaRef    = useRef<HTMLTextAreaElement>(null);
  const initializedRef = useRef(false);
  const profileRef     = useRef<LiveProfile>(DEFAULT_PROFILE); // same pattern for profile

  /* ── Auto-scroll ──────────────────────────────────────────────── */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  /* ── Run product filter & update side panel ───────────────────── */
  const runFilter = useCallback(
    (p: LiveProfile): FashionProduct[] => {
      if (p.occasion === "all" && p.gender === "all") return [];
      const matched = filterProducts(products as FashionProduct[], buildFilterState(p));
      if (onProductsChange) onProductsChange(matched);
      return matched;
    },
    [onProductsChange]
  );

  /* ── Add AI bubble to chat ────────────────────────────────────── */
  const addAIMessage = useCallback(
    (
      content: string,
      quickReplies?: QuickReply[],
      attachedProducts?: FashionProduct[],
      isError = false
    ) => {
      setMessages((prev) => [
        ...prev,
        {
          id: uid(),
          role: "ai",
          content,
          quickReplies,
          products: attachedProducts,
          timestamp: new Date(),
          isError,
        },
      ]);
    },
    []
  );

  /* ── Welcome message on mount ─────────────────────────────────── */
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      addAIMessage(
        "Hello! Welcome to WESTSIDE ✨\n\nI'm your personal AI fashion stylist, powered by Claude. Tell me what you're looking for — describe the occasion, colour, budget, anything — and I'll find the perfect look for you.\n\nWhat are you shopping for today?",
        [
          { label: "💍 Wedding",    value: "Wedding" },
          { label: "🎉 Party",      value: "Party" },
          { label: "☀️ Casual",     value: "Casual" },
          { label: "💼 Office",     value: "Office" },
          { label: "🎵 Festival",   value: "Festival" },
          { label: "🌙 Date Night", value: "Date Night" },
          { label: "✈️ Vacation",   value: "Vacation" },
        ]
      );
    }, 800);
  }, [addAIMessage]);

  /* ── Core: send message to Claude API ──────────────────────────── */
  const handleInput = useCallback(
    async (text: string) => {
      if (!text.trim() || isTyping) return;
      const trimmed = text.trim();

      /* Add user bubble immediately */
      setMessages((prev) => [
        ...prev,
        { id: uid(), role: "user", content: trimmed, timestamp: new Date() },
      ]);
      setInputValue("");
      if (textareaRef.current) textareaRef.current.style.height = "auto";

      setIsTyping(true);

      /*
       * FIX 1 — read history from ref (always up-to-date, never stale).
       * Reading from state here would give the value at the time this
       * useCallback was last recreated, not the current value.
       */
      const currentHistory = geminiHistoryRef.current;

      try {
        /*
         * The API route uses generateContent({ contents: [...history, userMsg] })
         * We send the history BEFORE the current turn; the route appends the
         * current user message itself to form the full contents array.
         */
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: trimmed,
            history: currentHistory,
          }),
        });

        if (!res.ok) throw new Error(`API ${res.status}`);

        const data: ChatAPIResponse & { _raw?: string } = await res.json();

        /* Merge extracted filters — read latest profile from ref too */
        const newProfile = mergeFilters(profileRef.current, data.filters);
        profileRef.current = newProfile;   // update ref synchronously
        setProfile(newProfile);            // trigger re-render for UI chips

        /* Run filter whenever we have at least one useful dimension */
        let matchedProducts: FashionProduct[] = [];
        if (newProfile.occasion !== "all" || newProfile.gender !== "all") {
          matchedProducts = runFilter(newProfile);
        }

        /*
         * Store Claude's ORIGINAL JSON output in the assistant history turn,
         * not just the extracted message text.
         *
         * Claude is instructed via system prompt to always reply in JSON, so
         * every assistant turn IS a JSON string. Storing the JSON in history
         * keeps the format consistent — Claude sees its own prior output in
         * the exact format it produced, maintaining full conversational context.
         */
        const modelHistoryText =
          data._raw ??                // prefer the exact string Gemini generated
          JSON.stringify({            // fallback: re-serialise the parsed object
            message: data.message,
            filters: data.filters,
            isComplete: data.isComplete,
            quickReplies: data.quickReplies,
          });

        /* Update history ref synchronously (FIX 1 continued) */
        geminiHistoryRef.current = [
          ...currentHistory,
          { role: "user",      content: trimmed },
          { role: "assistant", content: modelHistoryText },
        ];

        if (data.isComplete) setIsComplete(true);

        const qrs = toQuickReplies(data.quickReplies ?? []);
        const showProducts = data.isComplete && matchedProducts.length > 0;

        setIsTyping(false);
        addAIMessage(
          data.message,
          qrs.length > 0 ? qrs : undefined,
          showProducts ? matchedProducts.slice(0, 4) : undefined
        );
      } catch (err) {
        console.error("Claude API error:", err);
        setIsTyping(false);
        addAIMessage(
          "I had a brief connection hiccup — could you say that again? I'm all ears! ✨",
          undefined,
          undefined,
          true
        );
        /* Don't touch history on error — user retries with same context */
      }
    },
    [isTyping, runFilter, addAIMessage]   // removed geminiHistory & profile — using refs now
  );

  /* ── Quick reply click ────────────────────────────────────────── */
  const handleQuickReply = (value: string) => {
    handleInput(value);
  };

  /* ── Textarea helpers ─────────────────────────────────────────── */
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleInput(inputValue);
    }
  };

  /* ── Reset conversation ───────────────────────────────────────── */
  const handleReset = () => {
    setMessages([]);
    geminiHistoryRef.current = [];   // clear ref
    profileRef.current = DEFAULT_PROFILE;
    setProfile(DEFAULT_PROFILE);
    setIsComplete(false);
    if (onProductsChange) onProductsChange([]);
    initializedRef.current = false;

    setTimeout(() => {
      initializedRef.current = true;
      setIsTyping(true);
      setTimeout(() => {
        setIsTyping(false);
        addAIMessage(
          "Fresh start! ✨ I'm ready to find you something amazing. What are you shopping for today?",
          [
            { label: "💍 Wedding",    value: "Wedding" },
            { label: "🎉 Party",      value: "Party" },
            { label: "☀️ Casual",     value: "Casual" },
            { label: "💼 Office",     value: "Office" },
            { label: "🎵 Festival",   value: "Festival" },
            { label: "🌙 Date Night", value: "Date Night" },
            { label: "✈️ Vacation",   value: "Vacation" },
          ]
        );
      }, 700);
    }, 100);
  };

  /* ── Progress indicator (reads from state for reactivity) ──────── */
  const filledFields = [
    profile.occasion  !== "all",
    profile.gender    !== "all",
    profile.budgetMax !== Infinity,
    profile.colors.length > 0,
    profile.bodyType  !== "all",
  ].filter(Boolean).length;
  const progressPct = Math.round((filledFields / 5) * 100);

  /* ── Render ───────────────────────────────────────────────────── */
  return (
    <div className="flex flex-col h-full bg-[#0a0a0a]">

      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex-shrink-0 px-4 py-3 border-b border-white/5 bg-[#0f0f0f]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AIAvatar />
            <div>
              <p className="text-sm font-semibold text-white tracking-wide">WESTSIDE AI Stylist</p>
              <p className="text-xs text-emerald-400 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
                Powered by Claude
              </p>
            </div>
          </div>
          <button
            onClick={handleReset}
            className="p-2 rounded-xl text-zinc-500 hover:text-white hover:bg-white/5 transition-colors"
            title="Start over"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        {/* Live profile tags */}
        {filledFields > 0 && (
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs text-zinc-600 mb-1.5">
              <span>Style profile</span>
              <span>{progressPct}% complete</span>
            </div>
            <div className="h-0.5 bg-white/5 rounded-full overflow-hidden mb-2">
              <div
                className="h-full bg-gradient-to-r from-gold-500 to-gold-400 rounded-full transition-all duration-700"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            {/* Profile chips */}
            <div className="flex flex-wrap gap-1.5">
              {profile.occasion  !== "all"      && <Chip label={profile.occasion} />}
              {profile.gender    !== "all"      && <Chip label={profile.gender} />}
              {profile.budgetMax !== Infinity   && <Chip label={`≤ ₹${profile.budgetMax.toLocaleString("en-IN")}`} />}
              {profile.colors.map((c) =>          <Chip key={c} label={c} />)}
              {profile.bodyType  !== "all"      && <Chip label={profile.bodyType} />}
            </div>
          </div>
        )}
      </div>

      {/* ── Messages ───────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={clsx(
              "flex gap-3",
              msg.role === "user"
                ? "flex-row-reverse animate-slide-in-right"
                : "animate-slide-in-left"
            )}
          >
            {msg.role === "ai" ? <AIAvatar /> : <UserAvatar />}

            <div className={clsx("flex flex-col gap-3 max-w-[80%]", msg.role === "user" && "items-end")}>
              {/* Bubble */}
              <div
                className={clsx(
                  "px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap",
                  msg.role === "ai"
                    ? clsx(
                        "text-zinc-200 rounded-3xl rounded-bl-lg",
                        msg.isError
                          ? "bg-red-950/40 border border-red-500/20 border-l-2 border-l-red-500/50"
                          : "bg-[#161616] border border-white/8 border-l-2 border-l-gold-500/50"
                      )
                    : "bg-gradient-to-br from-gold-500 to-gold-600 text-black font-medium rounded-3xl rounded-br-lg"
                )}
              >
                {msg.isError && (
                  <AlertCircle className="w-3.5 h-3.5 text-red-400 inline mr-1.5 mb-0.5" />
                )}
                <RichText text={msg.content} />
              </div>

              {/* Mini product cards */}
              {msg.products && msg.products.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-sm">
                  {msg.products.slice(0, 4).map((p) => (
                    <ProductMiniCard key={p.id} product={p} />
                  ))}
                  {msg.products.length > 4 && (
                    <div className="sm:col-span-2 text-center">
                      <p className="text-xs text-zinc-600 flex items-center justify-center gap-1">
                        <ShoppingBag className="w-3 h-3" />
                        +{msg.products.length - 4} more in the panel →
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Quick replies */}
              {msg.quickReplies && msg.quickReplies.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {msg.quickReplies.map((qr) => (
                    <button
                      key={qr.value}
                      onClick={() => handleQuickReply(qr.value)}
                      className="px-3 py-1.5 text-xs rounded-full border border-white/10 bg-white/5 text-zinc-300 hover:bg-gold-500/15 hover:border-gold-500/50 hover:text-gold-300 transition-all duration-200 active:scale-95"
                    >
                      {qr.label}
                    </button>
                  ))}
                </div>
              )}

              {/* Timestamp */}
              <p className="text-xs text-zinc-700">
                {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {isTyping && (
          <div className="flex gap-3 animate-slide-in-left">
            <AIAvatar />
            <div className="px-4 py-3 bg-[#161616] border border-white/8 border-l-2 border-l-gold-500/50 rounded-3xl rounded-bl-lg flex items-center gap-2">
              <LoadingDots />
              <span className="text-xs text-zinc-600">Claude is styling…</span>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* ── Input area ─────────────────────────────────────────── */}
      <div className="flex-shrink-0 px-4 py-4 border-t border-white/5 bg-[#0f0f0f]">
        <p className="text-[10px] text-zinc-700 mb-3 text-center tracking-wider">
          Try:{" "}
          <span className="text-zinc-500">
            "I need a black party dress under ₹5,000 for a slim female"
          </span>
        </p>
        <div className="flex items-end gap-3">
          <textarea
            ref={textareaRef}
            rows={1}
            value={inputValue}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
            placeholder="Describe what you're looking for…"
            className="flex-1 resize-none bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-gold-500/60 focus:bg-white/[0.07] transition-all min-h-[46px] max-h-[120px] leading-relaxed"
          />
          <button
            onClick={() => handleInput(inputValue)}
            disabled={!inputValue.trim() || isTyping}
            className="w-11 h-11 rounded-2xl bg-gradient-to-br from-gold-500 to-gold-600 flex items-center justify-center text-black hover:from-gold-400 hover:to-gold-500 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 shadow-lg shadow-gold-500/20 flex-shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        <p className="text-xs text-zinc-700 text-center mt-2">
          Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}

/* ── Chip component ─────────────────────────────────────────────── */
function Chip({ label }: { label: string }) {
  return (
    <span className="px-2 py-0.5 text-[10px] rounded-full bg-gold-500/10 border border-gold-500/25 text-gold-400 capitalize tracking-wide">
      {label}
    </span>
  );
}
