/**
 * Build a burnt-toast.com product URL from a catalogue product.
 * Shopify URL pattern is:  /products/{slug}-{sku}
 * If the slug doesn't match exactly Shopify still resolves on SKU.
 */

const KNOWN_URLS: Record<string, string> = {
  // The original 6 chatbot SKUs have specific Shopify slugs we already know
  "301062271": "https://burnt-toast.com/products/knitted-top-301062271",
  "301044186": "https://burnt-toast.com/products/baggy-pants-301044186",
  "301055053": "https://burnt-toast.com/products/flat-sandals-301055053",
  "301055068": "https://burnt-toast.com/products/beaded-mini-bag-301055068",
  "301026609": "https://burnt-toast.com/products/metal-sunglasses-light-brown-301026609",
  "301039760": "https://burnt-toast.com/products/necklace-301039760",
};

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function productUrl(p: { id: string; name: string }): string {
  if (KNOWN_URLS[p.id]) return KNOWN_URLS[p.id];
  return `https://burnt-toast.com/products/${slugify(p.name)}-${p.id}`;
}
