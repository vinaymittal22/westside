export interface ChatResponse {
  message: string;
  tags: string[];
}

const responses: { keywords: string[]; response: ChatResponse }[] = [
  {
    keywords: ["hello", "hi", "hey", "start", "help"],
    response: {
      message:
        "Welcome to WESTSIDE, darling! ✨ I'm your personal AI stylist. Tell me what you're looking for — a special occasion outfit, everyday essentials, or a complete wardrobe refresh? I'm here to curate the perfect looks for you.",
      tags: ["casual", "luxury", "everyday"],
    },
  },
  {
    keywords: ["wedding", "bridal", "bride", "ceremony", "reception"],
    response: {
      message:
        "A wedding demands nothing short of perfection. Whether you're the bride, a guest, or part of the bridal party, I'm curating pieces that will make this day unforgettable. Our Duchess Satin Gown is sublime, and the Pearl Drop Earrings are the ultimate finishing touch. Every detail matters on this day. 💍",
      tags: ["wedding", "gala", "formal", "dress", "luxury", "evening", "pearls"],
    },
  },
  {
    keywords: ["party", "night out", "club", "celebration", "birthday", "drinks"],
    response: {
      message:
        "Party dressing is all about confidence and impact. I'm pulling statement pieces designed to turn heads the moment you walk in. The Eclipse Slip Dress is made for nights like this — pair it with the Marquise Chain Bag and you're iconic. Let's make tonight unforgettable. 🎉",
      tags: ["evening", "dress", "party", "bag", "chain", "luxury"],
    },
  },
  {
    keywords: ["festival", "music", "outdoor", "boho", "street", "urban", "streetwear"],
    response: {
      message:
        "Festival fashion is where self-expression meets style. I'm curating a look that's bold, free-spirited, and entirely you. The Mercer Streetwear Jacket layered over the Monochrome Linen Set, finished with the Obsidian Runners — effortlessly cool, all day, all night. 🎵",
      tags: ["casual", "streetwear", "festival", "jacket", "sneakers", "everyday"],
    },
  },
  {
    keywords: ["dress", "gown", "formal", "evening", "gala", "dinner"],
    response: {
      message:
        "For an unforgettable evening look, I'm reaching into our most exclusive collections. Whether it's a black-tie gala or an intimate dinner, these pieces are crafted to make you the most captivating person in the room. The velvet gown is particularly exquisite right now — shall I style it with accessories?",
      tags: ["dress", "evening", "formal", "gala"],
    },
  },
  {
    keywords: ["casual", "everyday", "weekend", "relax", "comfortable", "chill", "basic"],
    response: {
      message:
        "Effortless style is the ultimate luxury! For your off-duty wardrobe, I'm pulling pieces that blend comfort with understated elegance. These are the items that look like you tried — but didn't. The linen sets and oversized tees are flying off the shelves.",
      tags: ["casual", "everyday", "weekend", "comfortable"],
    },
  },
  {
    keywords: ["jacket", "coat", "blazer", "winter", "warm", "outerwear", "layer"],
    response: {
      message:
        "A stunning coat is the foundation of a winter wardrobe. I've selected our finest outerwear — from the cashmere masterpiece from Nordvik to the structured power blazer that commands every boardroom. These pieces are investment dressing at its finest.",
      tags: ["jacket", "coat", "outerwear", "winter", "warm"],
    },
  },
  {
    keywords: ["shoes", "sneakers", "boots", "heels", "footwear", "loafers", "mules"],
    response: {
      message:
        "They say you can tell everything about a person by their shoes. Let me introduce you to our footwear edit — from sleek leather loafers for the boardroom to sculptural platform mules for evening. Which occasion are you dressing for?",
      tags: ["shoes", "footwear", "sneakers", "boots"],
    },
  },
  {
    keywords: ["bag", "handbag", "purse", "tote", "clutch", "accessories"],
    response: {
      message:
        "A truly remarkable bag is a piece of art. Our accessories collection features the Marquise Chain Bag — a cult piece — alongside everyday totes in pebbled calfskin. These are the finishing touches that elevate any outfit from beautiful to iconic.",
      tags: ["bag", "handbag", "accessories", "tote"],
    },
  },
  {
    keywords: ["summer", "beach", "tropical", "holiday", "vacation", "sun"],
    response: {
      message:
        "Holiday dressing done right! I'm curating sun-soaked pieces that transition from beach to bar effortlessly. The linen sets are perfect for warm days, and our sunglasses are an essential final touch. Think effortless, think breezy, think WESTSIDE.",
      tags: ["summer", "casual", "linen", "sunglasses", "everyday"],
    },
  },
  {
    keywords: ["luxury", "designer", "premium", "high-end", "exclusive", "finest"],
    response: {
      message:
        "Welcome to the pinnacle of our collection. I'm curating our most exclusive pieces — from Maison Élite's handcrafted chain bag to the Chronos timepiece that whispers wealth rather than shouting it. True luxury is in the details.",
      tags: ["luxury", "gold", "formal", "evening"],
    },
  },
  {
    keywords: ["work", "office", "professional", "business", "corporate", "meeting"],
    response: {
      message:
        "Dress for the position you want, not the one you have. I've selected power pieces that command respect the moment you walk in — our structured blazer is the cornerstone, paired with the silk poplin blouse for an impeccable finish. Boardroom-ready.",
      tags: ["office", "formal", "blazer", "work"],
    },
  },
  {
    keywords: ["sale", "discount", "deal", "offer", "cheap", "budget", "affordable"],
    response: {
      message:
        "Great style shouldn't break the bank! I've found our most stunning pieces currently on sale — luxury without compromise. The Noir Velvet Gown is down 28%, and the Milan Ankle Boot is a remarkable deal right now. Act quickly — these won't last.",
      tags: ["luxury", "evening", "shoes", "dress"],
    },
  },
  {
    keywords: ["new", "latest", "fresh", "recent", "arrival", "just in"],
    response: {
      message:
        "Fresh off the runway! Our newest arrivals just landed and they're already turning heads. The Eclipse Slip Dress, Cloud Cashmere Coat, and the Marquise Chain Bag are the pieces every insider is talking about. First to know, first to wear.",
      tags: ["casual", "luxury", "formal", "accessories"],
    },
  },
  {
    keywords: ["jewelry", "earrings", "necklace", "bracelet", "ring", "watch"],
    response: {
      message:
        "The right jewelry transforms an outfit into an experience. Our fine jewelry edit includes baroque pearl drops that frame the face beautifully and the Chronos timepiece — both from Maison Élite's latest collection. These are heirlooms in the making.",
      tags: ["jewelry", "accessories", "luxury", "evening"],
    },
  },
];

const defaultResponse: ChatResponse = {
  message:
    "Wonderful choice in thinking about your style! Let me curate something special for you. I'd love to know more — are you dressing for a specific occasion, or looking to build your everyday wardrobe? Tell me your aesthetic and I'll find your perfect pieces.",
  tags: ["casual", "luxury", "everyday", "dress"],
};

export function getAIResponse(userMessage: string): ChatResponse {
  const lower = userMessage.toLowerCase();
  for (const { keywords, response } of responses) {
    if (keywords.some((kw) => lower.includes(kw))) {
      return response;
    }
  }
  return defaultResponse;
}
