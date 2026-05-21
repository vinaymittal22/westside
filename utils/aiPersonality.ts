/* ─────────────────────────────────────────────────────────────────
   AI Stylist Personality — premium, human, fashion-forward.
   All responses are hand-crafted to sound like a real stylist.
───────────────────────────────────────────────────────────────── */

/* ── Occasion openers ─────────────────────────────────────────── */
const OCCASION_OPENERS: Record<string, string[]> = {
  wedding: [
    "Weddings deserve outfits that become memories — let me find something truly breathtaking for you. 💍",
    "A wedding calls for a look that's elegant, respectful, and completely you. I love curating these! ✨",
    "Wedding fashion is an art — the perfect balance of tradition, personality, and elegance. Let's nail it together.",
  ],
  party: [
    "Party dressing is where fashion gets to have real fun! Let's find something that commands that dance floor. 🎉",
    "A killer party outfit is one part confidence, one part perfect fit. I've got the second part covered. ✨",
    "Nothing beats walking into a party knowing your outfit is doing all the talking for you. Let's get you there!",
  ],
  casual: [
    "Effortless style is actually the hardest to master — but I've got you. Let's build something you'll reach for again and again. ☀️",
    "Casual doesn't mean boring — it means comfort meeting intention. Let me show you the difference.",
    "The best casual looks feel like you didn't try, but you absolutely did. That's the goal.",
  ],
  office: [
    "Power dressing is a mindset — the right outfit changes how you walk into a room. 💼 Let's find that look.",
    "Office wear shouldn't be a compromise between style and professionalism. Let me prove it.",
    "Great office fashion commands the room without saying a word. Let's find that authority piece for you.",
  ],
  festival: [
    "Festival fashion is where tradition meets personality — one of my favourite categories to style! 🎵",
    "Festive dressing is about colour, joy, and celebrating your heritage with flair. Let's go all out!",
    "A festival look should make you feel like the celebration itself — vibrant, joyful, and completely you.",
  ],
  "date night": [
    "A date night look should make you feel magnetic — effortlessly beautiful and completely confident. 🌙",
    "Dressing for a date is really dressing for yourself first. When you feel amazing, it shows. Let me help.",
    "The best date night outfit is one that makes you forget you're even wearing anything — you just feel incredible.",
  ],
  vacation: [
    "Vacation fashion is my guilty pleasure — comfort and style, zero compromises. Let's build your holiday wardrobe! ✈️",
    "Holiday dressing means looking effortless in every photo while actually being comfortable. I've cracked the code.",
    "Travel fashion should work hard for you — versatile, stylish, and completely you. Let's do this.",
  ],
};

/* ── Color advice per occasion ────────────────────────────────── */
const COLOR_ADVICE: Record<string, Record<string, string>> = {
  black: {
    wedding:
      "Black at a wedding is bold and sophisticated — pair it with gold jewellery and you'll be *the* statement guest. 🖤✨",
    party:
      "Black for a party is a classic for a reason — sleek, sharp, and it photographs like an absolute dream. 🖤",
    casual:
      "Black keeps things effortlessly chic for everyday wear — it's the backbone of any great wardrobe.",
    office:
      "Black in the office signals quiet authority. You'll look like you mean business without even saying a word. 💼",
    festival:
      "Black at a festival? Bold choice — let the embroidery, mirror work, and jewellery do the storytelling. Very editorial.",
    "date night":
      "Black for a date is timeless, elegant, and always impressive. An absolute classic for good reason. 🖤",
    vacation:
      "Black travels beautifully — versatile, doesn't show creases, and always looks intentional. Smart pick. ✈️",
  },
  red: {
    wedding:
      "Red is auspicious and absolutely radiant for Indian weddings — traditional, bold, and utterly stunning. ❤️",
    party:
      "Red turns every entrance into a moment. Bold, passionate, unforgettable — this is going to look incredible. 🔴",
    casual:
      "A pop of red in a casual look is such a confidence boost. Vibrant, stylish, and effortlessly cool.",
    office:
      "Red in the office says 'I'm here, and I'm confident' — perfect for those days when you need to own the room. 💪",
    festival:
      "Red for a festival? Absolutely perfect — vibrant, traditional, and joyful. This is going to photograph beautifully! 🎉",
    "date night":
      "Red for a date is a power move — romantic, bold, and genuinely impossible to forget. ❤️",
    vacation:
      "Red in vacation photos? It pops against beaches, landscapes, city streets — everything. Great instinct!",
  },
  gold: {
    wedding:
      "Gold for a wedding is pure magic — it catches light beautifully and photographs like a dream. ✨",
    party:
      "Gold at a party? You'll be the most luminous person in the room. I love this choice. ✨",
    festival:
      "Gold is made for festivals — it honours tradition while looking absolutely regal. A perfect pick. 🌟",
    "date night":
      "Gold for a date is glamorous and warm — there's something about gold that just glows from within. 💛",
  },
  blue: {
    wedding:
      "Blue at a wedding is elegant and calm — it's an underrated choice that photographs beautifully. 💙",
    office:
      "Navy or royal blue in the office is the power move that never gets old. Polished, sharp, classic. 💼",
    casual:
      "Blue is easy, fresh, and goes with almost everything — casual dressing done effortlessly.",
    vacation:
      "Blue tones for travel are a dream — think coastal chic and ocean vibes. ✈️",
  },
  white: {
    wedding:
      "Ivory or cream for a wedding guest is pure elegance — add colourful accessories and it becomes a whole look. 🤍",
    casual:
      "White is clean, crisp, and makes everything look put-together. A wardrobe essential that never fails.",
    office:
      "White in the office looks professional and polished — very boardroom-ready. Sharp and clean. 💼",
    vacation:
      "White on vacation is iconic — Mediterranean style, resort chic, effortlessly elegant. ✈️",
  },
  pink: {
    wedding:
      "Pink for a wedding is romantic and feminine — from soft blush to vibrant fuchsia, it always works beautifully. 🩷",
    party:
      "Pink at a party is playful and joyful — it photographs beautifully and keeps the energy light. 🩷",
    casual:
      "Pink adds such a cheerful, feminine energy to everyday dressing. I love this choice.",
    "date night":
      "Pink for a date is flirty and charming without trying too hard — a perfect, effortless pick. 🩷",
  },
  green: {
    wedding:
      "Green at a wedding — especially sage or emerald — is refreshing and elegant. Very editorial and current. 💚",
    casual:
      "Green is having such a fashion moment right now — earthy tones feel incredibly modern and grounded.",
    festival:
      "Green for a festival has this beautiful natural, earthy energy. Vibrant yet rooted. I love it.",
    vacation:
      "Green blends with landscapes and nature beautifully — always looks intentional in travel photos. 💚",
  },
  purple: {
    wedding:
      "Purple at a wedding is regal and luxurious — lavender for day, deep violet for evening. Stunning choice. 💜",
    party:
      "Purple at a party is bold and distinctive — you'll stand out in the best possible way. 💜",
    festival:
      "Purple for a festival has this mystical, celebratory quality that's absolutely gorgeous. ✨",
  },
};

/* ── Body type fashion tips ───────────────────────────────────── */
const BODY_TYPE_TIPS: Record<string, string> = {
  slim:
    "For a slim frame, structured silhouettes and layered looks create beautiful depth and dimension. ✨",
  athletic:
    "Your athletic build is perfect for sharp tailoring — pieces that define the shoulder and move with your body.",
  regular:
    "A regular frame is incredibly versatile — most silhouettes work beautifully, which means lots of great options ahead!",
  curvy:
    "For a curvy figure, we'll focus on pieces that celebrate your shape — defined waists, flowing fabrics, and wrap styles that flatter. 🌸",
  "plus-size":
    "Fashion should celebrate every body — I'll find pieces with beautiful drape and flattering cuts that make you feel truly amazing. ✨",
};

/* ── Budget personality lines ─────────────────────────────────── */
export function getBudgetLine(max: number): string {
  if (max === Infinity)
    return "With an open budget, I can show you truly investment-worthy pieces — the kind that stay in your wardrobe for a lifetime. 💎";
  if (max >= 30000)
    return `With a ₹${max.toLocaleString("en-IN")} budget, we're in premium territory — expect exquisite craftsmanship and luxurious fabrics. 💎`;
  if (max >= 10000)
    return `Your ₹${max.toLocaleString("en-IN")} budget opens up some beautiful options — quality pieces that look far more expensive than they are. 💰`;
  if (max >= 3000)
    return `With ₹${max.toLocaleString("en-IN")}, I can find you stylish, well-made pieces that punch well above their price point. ✨`;
  return `Even within ₹${max.toLocaleString("en-IN")}, great style is absolutely achievable — I'll find you the best of what's available. 💸`;
}

/* ── Public API ───────────────────────────────────────────────── */

export function getOccasionOpener(occasion: string): string {
  const pool = OCCASION_OPENERS[occasion] ?? [
    `Styling for a ${occasion}? Wonderful — let me put together something perfect for you. ✨`,
  ];
  return pool[Math.floor(Math.random() * pool.length)];
}

export function getColorAdvice(colors: string[], occasion: string): string {
  if (!colors.length) return "";
  const primary = colors[0];
  const extra =
    colors.length > 1 ? ` I'll also weave in ${colors.slice(1).join(" & ")} accents where they work.` : "";
  const advice =
    COLOR_ADVICE[primary]?.[occasion] ??
    COLOR_ADVICE[primary]?.["wedding"] ?? // fallback to wedding (usually most formal)
    `${colors.join(" & ")} is a gorgeous choice — I'll find pieces that make this colour truly shine. ✨`;
  return advice + extra;
}

export function getBodyTypeTip(bodyType: string): string {
  return BODY_TYPE_TIPS[bodyType] ?? "I'll make sure to find pieces that flatter your frame beautifully. ✨";
}

export function generateResultNarrative(
  count: number,
  context: {
    occasion: string;
    gender: string;
    colors: string[];
    budgetMax: number;
    bodyType: string;
  }
): string {
  if (count === 0) {
    return (
      "Hmm, I couldn't find an exact match for everything — but I'm not giving up! " +
      "Try widening your budget slightly or being open to a different colour, and I'll find something stunning for you. 🔍"
    );
  }

  const occasion = context.occasion !== "all" ? context.occasion : "your occasion";
  const pronoun =
    context.gender === "female" ? "her" : context.gender === "male" ? "him" : "you";
  const colorNote =
    context.colors.length
      ? ` I've prioritised **${context.colors.join(" & ")}** tones as per your preference.`
      : "";
  const budgetNote =
    context.budgetMax !== Infinity
      ? ` Everything stays within your ₹${context.budgetMax.toLocaleString("en-IN")} budget.`
      : "";

  const narratives = [
    `I found **${count} stunning piece${count !== 1 ? "s" : ""}** that I know will work beautifully for ${pronoun}.${colorNote}${budgetNote} Here are my personal top picks — the full collection is below. 👇`,
    `Lovely! **${count} piece${count !== 1 ? "s" : ""}** made the cut for your ${occasion} look.${colorNote}${budgetNote} These are my finest recommendations — browse the rest in the collection below. ✨`,
    `I've curated **${count} look${count !== 1 ? "s" : ""}** that I genuinely believe will make you feel amazing.${colorNote}${budgetNote} Trust the edit — my top picks are here, full collection below. 💫`,
  ];

  return narratives[count % narratives.length];
}

/* ── Conversational prompts ───────────────────────────────────── */
export function getGenderPrompt(): string {
  const pool = [
    "And who are we styling today?",
    "Wonderful! Is this look for…",
    "Great choice — is this outfit for…",
  ];
  return pool[Math.floor(Math.random() * pool.length)];
}

export function getBudgetPrompt(gender: string): string {
  const pronoun =
    gender === "female" ? "her" : gender === "male" ? "him" : "you";
  const pool = [
    `What's the budget we're working with for ${pronoun}?`,
    "Let's talk budget — how much are you looking to invest in this look?",
    "What's the price range you're comfortable with?",
  ];
  return pool[Math.floor(Math.random() * pool.length)];
}

export function getColorPrompt(occasion: string): string {
  const pool = [
    "Do you have a colour in mind? This can really define the whole look.",
    "Colour is where personality meets fashion — any preferences, or shall I surprise you?",
    "Any colour preferences? Or are you open to my recommendations?",
  ];
  return pool[Math.floor(Math.random() * pool.length)];
}

export function getBodyTypePrompt(): string {
  const pool = [
    "One last thing — what body type best describes you? This helps me find the most flattering silhouettes.",
    "Almost there! Which body type do you identify with? It helps me get the cuts and fits exactly right.",
    "To make sure everything flatters you perfectly — which body type resonates with you?",
  ];
  return pool[Math.floor(Math.random() * pool.length)];
}

export function getFollowupLine(): string {
  const pool = [
    "I'm still here — want me to tweak the budget, switch up the colour, or explore a completely different occasion?",
    "Happy to refine this further! Should we adjust the budget, explore different colours, or start fresh?",
    "Tell me what feels off — budget, colour, body type — and I'll rework the picks for you. ✨",
  ];
  return pool[Math.floor(Math.random() * pool.length)];
}
