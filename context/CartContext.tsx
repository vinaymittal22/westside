"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  ReactNode,
} from "react";
import { CartItem, Product } from "@/types";

interface CartContextValue {
  items: CartItem[];
  totalItems: number;
  totalPrice: number;
  addItem: (product: Product, size: string) => void;
  removeItem: (id: string, size: string) => void;
  updateQuantity: (id: string, size: string, quantity: number) => void;
  clearCart: () => void;
  isInCart: (id: string) => boolean;
}

const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = "bt_cart";

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  /* Load from localStorage once on mount */
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setItems(JSON.parse(stored));
    } catch { /* ignore parse errors */ }
    setHydrated(true);
  }, []);

  /* Persist on every change */
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch { /* ignore storage quota errors */ }
  }, [items, hydrated]);

  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
  const totalPrice = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  const addItem = useCallback((product: Product, size: string) => {
    setItems((prev) => {
      const existing = prev.find(
        (i) => i.id === product.id && i.selectedSize === size
      );
      if (existing) {
        return prev.map((i) =>
          i.id === product.id && i.selectedSize === size
            ? { ...i, quantity: i.quantity + 1 }
            : i
        );
      }
      return [...prev, { ...product, quantity: 1, selectedSize: size }];
    });
  }, []);

  const removeItem = useCallback((id: string, size: string) => {
    setItems((prev) =>
      prev.filter((i) => !(i.id === id && i.selectedSize === size))
    );
  }, []);

  const updateQuantity = useCallback(
    (id: string, size: string, quantity: number) => {
      if (quantity <= 0) {
        setItems((prev) =>
          prev.filter((i) => !(i.id === id && i.selectedSize === size))
        );
        return;
      }
      setItems((prev) =>
        prev.map((i) =>
          i.id === id && i.selectedSize === size ? { ...i, quantity } : i
        )
      );
    },
    []
  );

  const clearCart = useCallback(() => setItems([]), []);

  const isInCart = useCallback(
    (id: string) => items.some((i) => i.id === id),
    [items]
  );

  return (
    <CartContext.Provider
      value={{
        items,
        totalItems,
        totalPrice,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        isInCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
