/* ── Core product (used by cart + existing components) ────────────── */
export interface Product {
  id: string;
  name: string;
  brand: string;
  price: number;
  originalPrice?: number;
  image: string;
  category: string;
  tags: string[];
  rating: number;
  reviews: number;
  isNew?: boolean;
  isSale?: boolean;
  sizes: string[];
  description: string;
  /* New Indian-fashion fields — optional so old code still compiles */
  gender?: "male" | "female";
  occasion?: string;
  bodyType?: string[];
  fit?: string;
  color?: string[];
  size?: string[];
  fabric?: string;
  season?: string[];
}

/* ── Extended type — all fashion fields required ──────────────────── */
export interface FashionProduct extends Product {
  gender: "male" | "female";
  occasion: string;
  bodyType: string[];
  fit: string;
  color: string[];
  size: string[];
  fabric: string;
  season: string[];
}

/* ── Cart ─────────────────────────────────────────────────────────── */
export interface CartItem extends Product {
  quantity: number;
  selectedSize: string;
}

/* ── Chat ─────────────────────────────────────────────────────────── */
export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  products?: Product[];
}

export type Category =
  | "all"
  | "dresses"
  | "tops"
  | "outerwear"
  | "shoes"
  | "accessories";

export type Occasion =
  | "all"
  | "wedding"
  | "party"
  | "casual"
  | "office"
  | "festival"
  | "date night"
  | "vacation";

export type Gender = "all" | "male" | "female";
