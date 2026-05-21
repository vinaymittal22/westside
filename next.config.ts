import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* ── Image optimisation ──────────────────────────────────────── */
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "burnt-toast.com" },
      { protocol: "https", hostname: "cdn.shopify.com" },
    ],
    formats: ["image/avif", "image/webp"],
    deviceSizes: [375, 640, 750, 828, 1080, 1200, 1920],
    imageSizes:  [16, 32, 64, 128, 256],
    minimumCacheTTL: 86400, // 24 h
  },

  /* ── Performance ─────────────────────────────────────────────── */
  compress: true,

  /* ── Security headers ────────────────────────────────────────── */
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options",    value: "nosniff" },
          { key: "X-Frame-Options",           value: "DENY" },
          { key: "X-XSS-Protection",          value: "1; mode=block" },
          { key: "Referrer-Policy",           value: "strict-origin-when-cross-origin" },
          {
            key:   "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },

  /* ── Redirects ───────────────────────────────────────────────── */
  async redirects() {
    return [];
  },
};

export default nextConfig;
