/* ── Core product (used by cart + existing components) ────────────── */
export interface Product {
  id: string;
  name: string;
  brand: string;
  price: number;
  originalPrice?: number;
  image: string;
  images?: string[];   // all product angles — index 0 = primary
  category: string;
  tags: string[];
  rating: number;
  reviews: number;
  isNew?: boolean;
  isSale?: boolean;
  sizes: string[];
  description: string;
  /* Extended fashion fields — optional so old code still compiles */
  gender?: "male" | "female" | "unisex";
  occasion?: string;
  bodyType?: string[];
  fit?: string;
  color?: string[];
  fabric?: string;
  season?: string[];
  /* Human-curated tags (from xlsx) — when present these override auto-derived */
  curated_aesthetics?: string[];
  curated_occasions?:  string[];
}

/* ── Extended type — all fashion fields required ──────────────────── */
export interface FashionProduct extends Product {
  gender: "male" | "female" | "unisex";
  occasion: string;
  bodyType: string[];
  fit: string;
  color: string[];
  size?: string[];
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
  | "casual"
  | "college"
  | "night-out"
  | "beach"
  | "active"
  | "work";

export type Gender = "all" | "male" | "female" | "unisex";
