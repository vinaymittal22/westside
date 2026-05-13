"use client";

import { useState, useRef, useEffect, FormEvent } from "react";
import { Send, Sparkles, User, Mic } from "lucide-react";
import { Message, Product } from "@/types";
import { getAIResponse } from "@/data/chatData";
import { getProductsByTags, products as allProducts } from "@/data/products";
import LoadingDots from "./LoadingDots";
import clsx from "clsx";

/* ─── Quick suggestion chips ─────────────────────────── */
const SUGGESTIONS = [
  { label: "Wedding",  emoji: "💍", query: "I need a wedding outfit" },
  { label: "Party",    emoji: "🎉", query: "Show me party looks for tonight" },
  { label: "Casual",   emoji: "☀️", query: "Casual everyday style picks" },
  { label: "Office",   emoji: "💼", query: "Professional office wear please" },
  { label: "Festival", emoji: "🎵", query: "Festival outfit ideas" },
];

interface Props {
  onProductsChange: (products: Product[]) => void;
}

let _id = 0;
const uid = () => String(++_id);

const WELCOME: Message = {
  id: "welcome",
  role: "assistant",
  content:
    "Hello, darling ✨ I'm your personal AI stylist at WESTSIDE. Tell me the occasion, your mood, or a vibe — and I'll curate the perfect looks just for you.",
  timestamp: new Date(),
};

/* ─── AI Avatar ──────────────────────────────────────── */
function AIAvatar({ size = "md" }: { size?: "sm" | "md" }) {
  const dim = size === "sm" ? "w-8 h-8" : "w-10 h-10";
  const icon = size === "sm" ? 14 : 16;
  return (
    <div className={clsx("flex-shrink-0 relative", dim)}>
      <div
        className={clsx(
          "w-full h-full rounded-full bg-gold-gradient flex items-center justify-center",
          "shadow-[0_0_20px_rgba(196,149,58,0.35)] ring-2 ring-gold-400/20"
        )}
      >
        <Sparkles size={icon} className="text-black" />
      </div>
      {/* online dot */}
      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[#0d0d0d]" />
    </div>
  );
}

/* ─── User Avatar ────────────────────────────────────── */
function UserAvatar() {
  return (
    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#1e1e1e] border border-white/10 flex items-center justify-center">
      <User size={14} className="text-zinc-400" />
    </div>
  );
}

/* ─── Single message bubble ──────────────────────────── */
function ChatBubble({ msg }: { msg: Message }) {
  const isAI = msg.role === "assistant";

  const time = msg.timestamp.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div
      className={clsx(
        "flex gap-3 items-end",
        isAI
          ? "flex-row animate-slide-in-left"
          : "flex-row-reverse animate-slide-in-right"
      )}
      style={{ animationFillMode: "both" }}
    >
      {/* Avatar */}
      {isAI ? <AIAvatar size="sm" /> : <UserAvatar />}

      {/* Bubble + timestamp */}
      <div className={clsx("flex flex-col gap-1 max-w-[78%]", isAI ? "items-start" : "items-end")}>
        <div
          className={clsx(
            "px-5 py-3.5 text-sm leading-relaxed",
            isAI
              ? [
                  "bg-[#161616] border border-white/[0.07]",
                  "text-zinc-200 rounded-3xl rounded-bl-lg",
                  "border-l-2 border-l-gold-500/50",
                  "shadow-[0_4px_24px_rgba(0,0,0,0.4)]",
                ]
              : [
                  "bg-gold-gradient text-black font-medium",
                  "rounded-3xl rounded-br-lg",
                  "shadow-[0_4px_20px_rgba(196,149,58,0.25)]",
                ]
          )}
        >
          {msg.content}
        </div>
        <span className="text-[10px] text-zinc-700 px-1 tracking-wide">{time}</span>
      </div>
    </div>
  );
}

/* ─── Typing indicator bubble ────────────────────────── */
function TypingBubble() {
  return (
    <div className="flex gap-3 items-end animate-fade-in">
      <AIAvatar size="sm" />
      <div className="flex flex-col gap-1 items-start">
        <div className="bg-[#161616] border border-white/[0.07] border-l-2 border-l-gold-500/50 rounded-3xl rounded-bl-lg px-5 py-3.5 shadow-[0_4px_24px_rgba(0,0,0,0.4)]">
          <LoadingDots />
        </div>
        <span className="text-[10px] text-zinc-700 px-1 tracking-wide">WESTSIDE AI is typing…</span>
      </div>
    </div>
  );
}

/* ─── Main component ─────────────────────────────────── */
export default function ChatInterface({ onProductsChange }: Props) {
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [input, setInput]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [focused, setFocused]   = useState(false);
  const bottomRef               = useRef<HTMLDivElement>(null);
  const textareaRef             = useRef<HTMLTextAreaElement>(null);

  /* auto-scroll */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  /* default products on mount */
  useEffect(() => {
    onProductsChange(allProducts.slice(0, 6));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* auto-resize textarea */
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  }, [input]);

  async function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const userMsg: Message = { id: uid(), role: "user", content: trimmed, timestamp: new Date() };
    setMessages((p) => [...p, userMsg]);
    setInput("");
    setLoading(true);

    await new Promise((r) => setTimeout(r, 1300 + Math.random() * 700));

    const { message, tags } = getAIResponse(trimmed);
    const recommended        = getProductsByTags(tags);
    const aiMsg: Message     = { id: uid(), role: "assistant", content: message, timestamp: new Date(), products: recommended };

    setMessages((p) => [...p, aiMsg]);
    onProductsChange(recommended.length ? recommended : allProducts.slice(0, 6));
    setLoading(false);
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    sendMessage(input);
  }

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input); }
  }

  const canSend = input.trim().length > 0 && !loading;

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* ── Chat header ────────────────────────────────── */}
      <div className="flex-shrink-0 px-5 py-4 border-b border-white/[0.06] bg-[#0a0a0a]/80 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <AIAvatar size="md" />
          <div className="flex-1 min-w-0">
            <p className="text-white font-semibold text-sm tracking-wide leading-none mb-1">
              WESTSIDE AI Stylist
            </p>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] text-zinc-500 tracking-widest uppercase font-medium">
                Online · Powered by AI
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gold-400/8 border border-gold-400/15">
            <Sparkles size={10} className="text-gold-400" />
            <span className="text-[10px] text-gold-400 font-semibold tracking-widest uppercase">Live</span>
          </div>
        </div>
      </div>

      {/* ── Messages area ──────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 space-y-5 scroll-smooth">

        {/* Date divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-white/[0.05]" />
          <span className="text-[10px] text-zinc-700 tracking-widest uppercase font-medium">Today</span>
          <div className="flex-1 h-px bg-white/[0.05]" />
        </div>

        {messages.map((msg) => (
          <ChatBubble key={msg.id} msg={msg} />
        ))}

        {loading && <TypingBubble />}

        <div ref={bottomRef} />
      </div>

      {/* ── Sticky bottom area ─────────────────────────── */}
      <div className="flex-shrink-0 border-t border-white/[0.06] bg-[#0a0a0a]/90 backdrop-blur-xl">

        {/* Suggestion chips */}
        <div className="px-4 pt-3 pb-2 flex gap-2 overflow-x-auto scrollbar-hide">
          {SUGGESTIONS.map(({ label, emoji, query }) => (
            <button
              key={label}
              onClick={() => sendMessage(query)}
              disabled={loading}
              className={clsx(
                "flex-shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-full",
                "text-xs font-medium tracking-wide transition-all duration-300",
                "border border-white/10 text-zinc-400",
                "hover:border-gold-400/50 hover:text-gold-400 hover:bg-gold-400/5",
                "active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
              )}
            >
              <span>{emoji}</span>
              <span>{label}</span>
            </button>
          ))}
        </div>

        {/* Input row */}
        <form onSubmit={handleSubmit} className="px-4 pb-4 pt-1">
          <div
            className={clsx(
              "flex items-end gap-3 rounded-2xl px-4 py-3 transition-all duration-300",
              "bg-[#141414] border",
              focused
                ? "border-gold-500/50 shadow-[0_0_0_3px_rgba(196,149,58,0.08)]"
                : "border-white/[0.08]"
            )}
          >
            {/* Sparkles icon */}
            <Sparkles
              size={16}
              className={clsx(
                "flex-shrink-0 mb-0.5 transition-colors duration-300",
                focused ? "text-gold-400" : "text-zinc-700"
              )}
            />

            {/* Textarea */}
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder="Describe your occasion or vibe…"
              rows={1}
              className={clsx(
                "flex-1 bg-transparent text-sm text-white leading-6",
                "placeholder-zinc-600 resize-none outline-none",
                "min-h-[24px] max-h-[120px] py-0"
              )}
              style={{ scrollbarWidth: "none" }}
            />

            {/* Mic button */}
            <button
              type="button"
              className="flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center text-zinc-600 hover:text-zinc-400 transition-colors duration-200 mb-0.5"
            >
              <Mic size={15} />
            </button>

            {/* Send button */}
            <button
              type="submit"
              disabled={!canSend}
              className={clsx(
                "flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center mb-0.5",
                "transition-all duration-300",
                canSend
                  ? "bg-gold-gradient text-black shadow-md shadow-gold-400/20 hover:shadow-gold-400/40 hover:scale-105 active:scale-95"
                  : "bg-white/5 text-zinc-700 cursor-not-allowed"
              )}
            >
              <Send size={14} className={canSend ? "" : "opacity-40"} />
            </button>
          </div>

          <p className="text-center text-[9px] text-zinc-800 mt-2 tracking-[0.2em] uppercase font-medium">
            AI Stylist · WESTSIDE · Responses may vary
          </p>
        </form>
      </div>
    </div>
  );
}
