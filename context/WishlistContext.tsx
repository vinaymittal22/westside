"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  ReactNode,
} from "react";
import { Product } from "@/types";

interface WishlistContextValue {
  items: Product[];
  totalItems: number;
  addItem: (product: Product) => void;
  removeItem: (id: string) => void;
  toggleItem: (product: Product) => void;
  isWishlisted: (id: string) => boolean;
  clearWishlist: () => void;
}

const WishlistContext = createContext<WishlistContextValue | null>(null);
const STORAGE_KEY = "bt_wishlist";

export function WishlistProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Product[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setItems(JSON.parse(stored));
    } catch { /* ignore parse errors */ }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch { /* ignore storage errors */ }
  }, [items, hydrated]);

  const totalItems = items.length;

  const addItem = useCallback((product: Product) => {
    setItems((prev) =>
      prev.some((i) => i.id === product.id) ? prev : [...prev, product]
    );
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const toggleItem = useCallback((product: Product) => {
    setItems((prev) =>
      prev.some((i) => i.id === product.id)
        ? prev.filter((i) => i.id !== product.id)
        : [...prev, product]
    );
  }, []);

  const isWishlisted = useCallback(
    (id: string) => items.some((i) => i.id === id),
    [items]
  );

  const clearWishlist = useCallback(() => setItems([]), []);

  return (
    <WishlistContext.Provider
      value={{ items, totalItems, addItem, removeItem, toggleItem, isWishlisted, clearWishlist }}
    >
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error("useWishlist must be used within WishlistProvider");
  return ctx;
}
