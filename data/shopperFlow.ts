/* ─────────────────────────────────────────────────────────────────
   Predefined conversational AI shopping flow.
   No external API — pure rule-based logic.
───────────────────────────────────────────────────────────────── */

export type FlowStep =
  | "welcome"
  | "occasion"
  | "gender"
  | "budget"
  | "color"
  | "bodyType"
  | "results"
  | "followup";

export interface QuickReply {
  label:  string;
  value:  string;
  emoji?: string;
}

export interface FlowMessage {
  content:      string;
  quickReplies?: QuickReply[];
}

/* ── Step scripts ─────────────────────────────────────────────────── */

export const WELCOME_MSG: FlowMessage = {
  content:
    "Hello! Welcome to WESTSIDE ✨\n\nI'm your personal AI fashion stylist. What are you shopping for today? Tell me the occasion or just describe what you need.",
  quickReplies: [
    { label: "💍 Wedding",     value: "wedding" },
    { label: "🎉 Party",       value: "party" },
    { label: "☀️ Casual",      value: "casual" },
    { label: "💼 Office",      value: "office" },
    { label: "🎵 Festival",    value: "festival" },
    { label: "🌙 Date Night",  value: "date night" },
    { label: "✈️ Vacation",    value: "vacation" },
  ],
};

export function getOccasionConfirm(occasion: string): FlowMessage {
  const lines: Record<string, string> = {
    wedding:      "A wedding outfit — how special! 💍 Let me find the perfect look for you.",
    party:        "Time to stand out! 🎉 Let's find something that turns heads.",
    casual:       "Great — effortless style is always in fashion. ☀️",
    office:       "Power dressing coming right up! 💼",
    festival:     "Festive vibes only! Let's go vibrant and traditional. 🎵",
    "date night": "A special evening calls for a special look. 🌙",
    vacation:     "Holiday mode on! ✈️ Let's find something perfect for your trip.",
  };
  return {
    content:
      (lines[occasion] ?? "Great choice! 😊") +
      "\n\nIs this outfit for…",
    quickReplies: [
      { label: "♀️ Female", value: "female" },
      { label: "♂️ Male",   value: "male" },
    ],
  };
}

export const BUDGET_MSG: FlowMessage = {
  content: "What's your budget range?",
  quickReplies: [
    { label: "💸 Under ₹3,000",         value: "0-3000" },
    { label: "💰 ₹3,000 – ₹10,000",    value: "3000-10000" },
    { label: "💎 ₹10,000 – ₹30,000",   value: "10000-30000" },
    { label: "👑 ₹30,000+",             value: "30000-999999" },
  ],
};

export const COLOR_MSG: FlowMessage = {
  content:
    "Do you have any color preferences? Pick one or more, or type your own.",
  quickReplies: [
    { label: "❤️ Red / Maroon",   value: "red" },
    { label: "💛 Gold / Yellow",  value: "gold" },
    { label: "💙 Blue / Navy",    value: "blue" },
    { label: "🤍 White / Cream",  value: "white" },
    { label: "🖤 Black",          value: "black" },
    { label: "💚 Green / Teal",   value: "green" },
    { label: "🩷 Pink / Rose",    value: "pink" },
    { label: "🌈 Multicolor",     value: "multicolor" },
    { label: "🚫 No preference",  value: "none" },
  ],
};

export const BODY_TYPE_MSG: FlowMessage = {
  content:
    "What body type best describes you? This helps me find the most flattering fits for you.",
  quickReplies: [
    { label: "🕴️ Slim",       value: "slim" },
    { label: "💪 Athletic",   value: "athletic" },
    { label: "👤 Regular",    value: "regular" },
    { label: "🌸 Curvy",      value: "curvy" },
    { label: "✨ Plus-size",  value: "plus-size" },
  ],
};

export function getResultsMsg(count: number, occasion: string, gender: string): FlowMessage {
  if (count === 0) {
    return {
      content:
        "Hmm, I couldn't find an exact match — but let me widen the search a little. Try adjusting your budget or color preference and I'll find something stunning for you!",
      quickReplies: [
        { label: "🔁 Change budget",  value: "change_budget" },
        { label: "🎨 Change color",   value: "change_color" },
        { label: "🔄 Start over",     value: "restart" },
      ],
    };
  }
  return {
    content:
      `Perfect! 🎉 I found **${count} stunning piece${count !== 1 ? "s" : ""}** that match your style. Here are your top picks for a ${gender} ${occasion} look.\n\nWould you like to refine further?`,
    quickReplies: [
      { label: "💸 Different budget",  value: "change_budget" },
      { label: "🎨 Different color",   value: "change_color" },
      { label: "📦 Show all results",  value: "show_all" },
      { label: "🔄 Start over",        value: "restart" },
    ],
  };
}

/* ── Follow-up keyword map ─────────────────────────────────────────── */
export interface FollowupAction {
  type: "change_budget" | "change_color" | "change_body" | "change_occasion" | "restart";
}

export function parseFollowup(text: string): FollowupAction | null {
  const t = text.toLowerCase();
  if (/(cheaper|less|affordable|lower|budget|under)/.test(t))
    return { type: "change_budget" };
  if (/(color|colour|different color|shade)/.test(t))
    return { type: "change_color" };
  if (/(body|fit|size|shape)/.test(t))
    return { type: "change_body" };
  if (/(occasion|event|different|another)/.test(t))
    return { type: "change_occasion" };
  if (/(restart|start over|reset|new)/.test(t))
    return { type: "restart" };
  return null;
}
