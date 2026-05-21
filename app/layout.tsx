import type { Metadata } from "next";
import "./globals.css";
import { CartProvider } from "@/context/CartContext";
import { WishlistProvider } from "@/context/WishlistContext";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "Burnt Toast — AI Style Companion",
  description:
    "Shop Burnt Toast with Toastie, your AI style companion. Real looks for real moments — casual, college, nights out & more.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body className="antialiased" style={{ background: "var(--cream)", color: "var(--ink)" }}>
        <CartProvider>
          <WishlistProvider>
            <Navbar />
            <main>{children}</main>
          </WishlistProvider>
        </CartProvider>
      </body>
    </html>
  );
}
