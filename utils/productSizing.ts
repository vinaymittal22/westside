/**
 * Burnt Toast — Product sizing rules
 *
 * Determines whether a product needs the user to pick a size before
 * adding to cart. Sized categories use Select Size; non-sized categories
 * (bags, sunglasses, jewellery, accessories) skip the size step and use
 * the One-Size placeholder when added to cart.
 *
 * Single source of truth — shared by FashionProductCard, CompactCard,
 * MiniProductCard, and the product detail page so the rule stays
 * consistent everywhere.
 */

/** Categories where the customer must pick a size (XS / S / M / L / XL etc.). */
const SIZED_CATEGORIES = new Set<string>([
  "tops",
  "top",
  "t-shirts",
  "t-shirt",
  "tshirt",
  "tshirts",
  "bottoms",
  "bottom",
  "denims",
  "denim",
  "jeans",
  "pants",
  "trousers",
  "shorts",
  "skirts",
  "skirt",
  "dresses",
  "dress",
  "footwear",
  "shoes",
  "outerwear",
  "jacket",
  "jackets",
]);

/** Placeholder size used for one-size products (bags, jewellery, sunglasses, etc.). */
export const ONE_SIZE = "One Size";

/**
 * True when the product's category requires a size selection before adding to cart.
 * False for bags, sunglasses, jewellery, charms, watches, hats, and other accessories
 * — those add to cart directly with the ONE_SIZE placeholder.
 *
 * Also defensively respects the catalogue's explicit `sizes: ["one size"]` —
 * if a product already declares one-size, we never force a picker.
 */
export function needsSizeSelection(category?: string, sizes?: string[]): boolean {
  // Explicit catalogue signal — one-size products always skip the picker
  if (sizes && sizes.length === 1 && sizes[0]?.trim().toLowerCase() === "one size") {
    return false;
  }
  if (!category) return false;
  return SIZED_CATEGORIES.has(category.trim().toLowerCase());
}

/**
 * Resolve the size string to send to addToCart() when the user has not
 * explicitly picked one (only valid for non-sized categories).
 */
export function resolveDefaultSize(sizes?: string[]): string {
  const first = sizes?.[0]?.trim();
  if (first && first.toLowerCase() === "one size") return first;
  return ONE_SIZE;
}
