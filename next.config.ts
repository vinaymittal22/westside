import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* ── Image optimisation ──────────────────────────────────────── */
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
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
      /* Long-cache for Unsplash images */
      {
        source: "/_next/image(.*)",
        headers: [
          { key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" },
        ],
      },
      /* Immutable cache for static JS/CSS chunks */
      {
        source: "/_next/static/(.*)",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
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
