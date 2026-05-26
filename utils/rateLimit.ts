/**
 * Simple in-memory per-IP rate limiter for Next.js API routes.
 *
 * Why this exists:
 *   - /api/chat and /api/image-style hit the Anthropic API on every call.
 *   - Without a limiter, a single bot can burn through our Claude quota
 *     in seconds and rack up a big bill.
 *
 * Limitations:
 *   - In-memory only — resets on every cold start. That's actually fine
 *     for cost-protection because Vercel function instances are short-lived
 *     and the limiter still blocks the obvious abusive patterns.
 *   - For a production-grade limiter (per-user, distributed), use Upstash
 *     Redis (`@upstash/ratelimit`) — easy drop-in replacement.
 */

import type { NextRequest } from "next/server";

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

/**
 * Get the caller's IP from common proxy headers (Vercel, Cloudflare, etc.).
 * Falls back to a constant string so we still rate-limit something even
 * when the IP isn't available.
 */
function getClientIp(req: NextRequest): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip")
      ?? req.headers.get("cf-connecting-ip")
      ?? "unknown";
}

/**
 * Returns null if the request is allowed, or an object describing the
 * limit when it's blocked. Configure per-route by passing different
 * windowMs / max values.
 *
 *   const blocked = checkRateLimit(req, { windowMs: 60_000, max: 30, key: "chat" });
 *   if (blocked) return NextResponse.json({ ... }, { status: 429, headers: ... });
 */
export function checkRateLimit(
  req: NextRequest,
  opts: { windowMs: number; max: number; key: string },
): { retryAfterSec: number } | null {
  const now = Date.now();
  const ip = getClientIp(req);
  const bucketKey = `${opts.key}:${ip}`;
  const bucket = buckets.get(bucketKey);

  if (!bucket || bucket.resetAt < now) {
    buckets.set(bucketKey, { count: 1, resetAt: now + opts.windowMs });
    return null;
  }

  if (bucket.count >= opts.max) {
    return { retryAfterSec: Math.ceil((bucket.resetAt - now) / 1000) };
  }

  bucket.count += 1;
  return null;
}

/**
 * Periodically prune expired buckets so the Map doesn't grow forever
 * on a long-lived server. Cheap operation, runs at most once per minute.
 */
let lastSweep = 0;
export function maybeSweepRateLimitBuckets() {
  const now = Date.now();
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [k, v] of buckets) {
    if (v.resetAt < now) buckets.delete(k);
  }
}
