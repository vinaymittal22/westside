# Security Audit — Burnt Toast

## URGENT: Rotate your Anthropic API key

The previous key (`sk-ant-api03-Upkur…cbZDxQAA`) was shared in plain
text in a conversation and should be considered compromised. Even
though it never reached git history, exposed keys can be scraped by
bots.

**To rotate:**

1. Go to https://console.anthropic.com/settings/keys
2. Click **Create Key** → name it e.g. `burnt-toast-prod`
3. Copy the new key (you'll only see it once)
4. Update locally: edit `.env.local` and replace the old `ANTHROPIC_API_KEY` value
5. Update on Vercel: Project → Settings → Environment Variables → edit `ANTHROPIC_API_KEY`
6. Redeploy: Vercel → Deployments → "..." menu → Redeploy
7. Back in Anthropic Console, **delete the old key** so the leaked one stops working

## Threat model

The app exposes two paid API endpoints to the public internet:
- `POST /api/chat` — text chat (uses Claude Sonnet 4.5)
- `POST /api/image-style` — image vision (also Sonnet, more expensive per call)

Without protection, a malicious script can call these in a loop and
drain your Anthropic credits within minutes.

## What's already secure

| Area | Status | Notes |
|---|---|---|
| API key storage | ✅ | Server-side only (`process.env.ANTHROPIC_API_KEY`). Never sent to the browser. |
| `.gitignore` | ✅ | Excludes `.env`, `.env.local`, `.env.*.local`. |
| Git history | ✅ | Verified clean with `git log -S "sk-ant"` — no key ever committed. |
| Frontend image size cap | ✅ | 10 MB max before upload. |
| Server image size cap | ✅ | Re-validated server-side (~13.5 MB base64 ≈ 10 MB binary). |
| Server message length cap | ✅ | 2000-char max enforced in `/api/chat`. |
| Server history length cap | ✅ | 20 items max in `/api/chat`. |
| Rate limiting `/api/chat` | ✅ | 30 requests / minute / IP. |
| Rate limiting `/api/image-style` | ✅ | 10 requests / minute / IP. |
| Internal error masking | ✅ | `_debugError` removed from responses. Stack traces / messages stay in server logs only. |
| PII logging | ✅ | Logs are shape-only in production (`msgLen`, `hasImage`, never the raw text). |
| System prompt leakage | ✅ | Diagnostic log that printed the full 426-line prompt to Vercel logs is removed. |
| Catalogue data | ✅ | Read-only static data; no SQL injection surface. |
| CSRF | ✅ | Pure JSON APIs, no cookie-auth, no state-mutating GET. |
| Anthropic SDK CORS | ✅ | Server-side call; client never talks to Anthropic directly. |

## Recommended next steps (not implemented yet)

1. **Distributed rate limiting** — current limiter is in-memory and per-Vercel-instance.
   Drop in `@upstash/ratelimit` + Upstash Redis for cross-instance limits.
   See https://upstash.com/docs/oss/sdks/ts/ratelimit/overview
2. **Bot detection** — add Vercel's free Bot Management or Cloudflare Turnstile
   on the `/chat` page to block headless browsers.
3. **Per-session quotas** — if you add auth, limit each user to e.g.
   100 chat turns and 20 image uploads per day.
4. **Anthropic usage alerts** — Anthropic Console → Settings → Usage
   limits. Set a monthly cap and email alert at 50% / 80% / 100%.
5. **Image content moderation** — currently the user can upload any
   image. Anthropic's vision model refuses obviously unsafe content
   but pre-filtering with a smaller classifier is cheaper.
6. **HTTPS-only cookies / HSTS** — handled by Vercel by default; no
   action needed unless self-hosting.

## How to handle a future key leak

1. Rotate immediately (see top of this doc).
2. Check Anthropic Console → Usage for unexpected spikes.
3. If usage is abnormal, contact Anthropic support — they can
   sometimes refund leaked-key abuse.
4. Audit git history with: `git log --all -p | grep -i "sk-ant"`.
5. If a key was committed, scrub history with `git filter-repo` or
   BFG Repo-Cleaner, force-push, AND rotate the key (rewriting history
   doesn't help if anyone cloned the repo).

## Limits summary

| Endpoint | Rate limit | Body size limit |
|---|---|---|
| `/api/chat` | 30 req / 60s / IP | 2000 char message, 20 history items |
| `/api/image-style` | 10 req / 60s / IP | ~13.5 MB base64 (≈ 10 MB binary) |
| `/api/tryon` | (no limit yet — add if used in production) | Inherits Next.js default |

Frontend `<input type="file">` is capped at 10 MB before the request
is ever sent.
