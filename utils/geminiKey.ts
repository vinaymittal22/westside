import fs from "fs";
import path from "path";

/* ── Manual .env.local fallback loader for GEMINI_API_KEY ──────────
   Next.js 16 + Turbopack has a known bug where process.env values
   from .env.local aren't always exposed to server routes. This
   reads the file directly as a backup, same pattern used for
   ANTHROPIC_API_KEY in utils/claudeClient.ts.
   ─────────────────────────────────────────────────────────────── */
function loadEnvFallback(key: string): string | undefined {
  if (process.env[key]) return process.env[key];
  try {
    const envPath = path.join(process.cwd(), ".env.local");
    if (!fs.existsSync(envPath)) return undefined;
    const content = fs.readFileSync(envPath, "utf-8");
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const k = trimmed.slice(0, eq).trim();
      let v = trimmed.slice(eq + 1).trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      if (k === key) {
        process.env[key] = v;
        return v;
      }
    }
  } catch (e) {
    console.error("[geminiKey] env fallback read failed:", e);
  }
  return undefined;
}

export function getGeminiKey(): string | undefined {
  return loadEnvFallback("GEMINI_API_KEY");
}

export function hasGeminiKey(): boolean {
  return !!loadEnvFallback("GEMINI_API_KEY");
}
