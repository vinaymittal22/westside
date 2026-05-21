"use client";

import { useState, useRef, useEffect } from "react";
import { X, RefreshCw } from "lucide-react";
import { products as allProducts } from "@/data/products";

/* ── Palette — matches LookbookChat ────────────────────────────── */
const BG     = "#FFFFFF";
const CARD   = "#F7F7F7";
const BORDER = "#E8E8E8";
const TEXT   = "#111111";
const MUTED  = "#888888";

/* ── Public interface used by LookbookChat ──────────────────────── */
export interface TryOnOutfit {
  sku:     string;
  name:    string;
  price:   number;
  note:    string;
  emoji:   string;
  url:     string;
  img?:    string | null;
  section: string;
}

/* ── Simplified result — no long paragraphs ─────────────────────── */
interface TryOnResult {
  confidence_score:   number;
  toast_verdict:      string;
  colour_verdict:     string;
  styling_tips:       string[];
  alternative_sku:    string | null;
  alternative_reason: string | null;
}

/* ── Score ring ─────────────────────────────────────────────────── */
function ScoreRing({ score }: { score: number }) {
  const r    = 22;
  const circ = 2 * Math.PI * r;
  const off  = circ - (Math.min(100, Math.max(0, score)) / 100) * circ;
  const col  = score >= 80 ? "#16a34a" : score >= 60 ? "#d97706" : "#dc2626";
  return (
    <div style={{ position: "relative", width: 52, height: 52, flexShrink: 0 }}>
      <svg width="52" height="52" style={{ transform: "rotate(-90deg)" }}>
        <circle cx="26" cy="26" r={r} fill="none" stroke={BORDER} strokeWidth="4" />
        <circle cx="26" cy="26" r={r} fill="none" stroke={col} strokeWidth="4"
          strokeDasharray={circ} strokeDashoffset={off} strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.8s ease" }} />
      </svg>
      <div style={{
        position: "absolute", inset: 0,
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
      }}>
        <span style={{ color: col, fontSize: 13, fontWeight: 900, fontFamily: "monospace", lineHeight: 1 }}>{score}</span>
        <span style={{ color: MUTED, fontSize: 7, fontFamily: "monospace" }}>FIT</span>
      </div>
    </div>
  );
}

/* ── FileReader helpers ─────────────────────────────────────────── */
function toBase64(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload  = () => res((r.result as string).split(",")[1]);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}
function getPreview(file: File): Promise<string> {
  return new Promise(res => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.readAsDataURL(file);
  });
}

/* ── Reusable portrait photo box ────────────────────────────────── */
function PhotoBox({
  src, alt, label, badge, onRemove,
}: {
  src: string; alt: string; label: string;
  badge?: string; onRemove?: () => void;
}) {
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
      <div style={{
        color: MUTED, fontSize: 8,
        fontFamily: "'Courier New',monospace", letterSpacing: 1.5,
      }}>{label}</div>
      <div style={{ position: "relative" }}>
        {/* Portrait wrapper — 3:4 */}
        <div style={{
          position: "relative", width: "100%", paddingBottom: "133%",
          background: CARD, borderRadius: 10, overflow: "hidden",
          border: `1px solid ${BORDER}`,
        }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt={alt} style={{
            position: "absolute", inset: 0,
            width: "100%", height: "100%",
            objectFit: "cover", objectPosition: "top center",
            display: "block",
          }} />
        </div>
        {/* Remove button */}
        {onRemove && (
          <button
            onClick={e => { e.stopPropagation(); onRemove(); }}
            style={{
              position: "absolute", top: -6, right: -6,
              width: 20, height: 20, borderRadius: "50%",
              background: TEXT, border: "none", color: "#fff",
              fontSize: 10, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >✕</button>
        )}
        {/* Optional badge */}
        {badge && (
          <div style={{
            position: "absolute", bottom: 6, left: 6, right: 6,
            background: "rgba(0,0,0,0.7)", color: "#fff",
            fontSize: 8, fontWeight: 700,
            fontFamily: "'Courier New',monospace", letterSpacing: 1,
            borderRadius: 4, padding: "3px 6px", textAlign: "center",
          }}>{badge}</div>
        )}
      </div>
    </div>
  );
}

/* ── Main component ─────────────────────────────────────────────── */
export default function TryOnPanel({
  outfit, onClose,
}: {
  outfit: TryOnOutfit;
  onClose: () => void;
}) {
  const [userPhoto,  setUserPhoto]  = useState<string | null>(null);
  const [userBase64, setUserBase64] = useState<string | null>(null);
  const [userMime,   setUserMime]   = useState<string>("image/jpeg");
  const [result,     setResult]     = useState<TryOnResult | null>(null);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState<string | null>(null);
  const [dragging,   setDragging]   = useState(false);

  const fileRef   = useRef<HTMLInputElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (result && resultRef.current) {
      resultRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [result]);

  const handleFile = async (file: File | null | undefined) => {
    if (!file?.type.startsWith("image/")) return;
    const [b64, preview] = await Promise.all([toBase64(file), getPreview(file)]);
    setUserBase64(b64);
    setUserPhoto(preview);
    setUserMime(file.type);
    setResult(null);
    setError(null);
  };

  const runTryOn = async () => {
    if (!userBase64) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/tryon", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: userBase64,
          imageMime:   userMime,
          outfit: {
            sku:     outfit.sku,
            name:    outfit.name,
            price:   outfit.price,
            note:    outfit.note,
            section: outfit.section,
          },
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResult(data.result as TryOnResult);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong — try again.");
    }
    setLoading(false);
  };

  const reset = () => {
    setResult(null);
    setUserPhoto(null);
    setUserBase64(null);
    setError(null);
  };

  /* Alternative product from DB */
  const alt = result?.alternative_sku
    ? allProducts.find(p => p.id === result.alternative_sku)
    : null;

  /* Product image from DB (prefer DB image over outfit.img passed in) */
  const dbProduct  = allProducts.find(p => p.id === outfit.sku);
  const productImg = dbProduct?.image ?? outfit.img ?? null;

  return (
    <div
      onClick={e => e.stopPropagation()}   /* prevent card-click from firing */
      style={{
        background:    BG,
        border:        `1px solid ${TEXT}`,
        borderTop:     `3px solid ${TEXT}`,
        borderRadius:  "0 0 12px 12px",
        padding:       "14px",
        display:       "flex",
        flexDirection: "column",
        gap:           12,
      }}
    >
      {/* ── Header ────────────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{
            background: TEXT, color: "#fff",
            fontSize: 8, fontWeight: 900,
            fontFamily: "'Courier New',monospace", letterSpacing: 1.5,
            padding: "3px 8px", borderRadius: 3,
          }}>✨ VIRTUAL TRY-ON</span>
          <span style={{ color: MUTED, fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {outfit.name}
          </span>
        </div>
        <button
          onClick={e => { e.stopPropagation(); onClose(); }}
          style={{
            background: "transparent", border: "none",
            color: MUTED, cursor: "pointer", padding: 2, flexShrink: 0,
            display: "flex", alignItems: "center",
          }}
        >
          <X size={14} />
        </button>
      </div>

      {/* ── STATE 1: Upload zone (no photo yet) ───────────────────── */}
      {!userPhoto && !loading && (
        <div
          onClick={() => fileRef.current?.click()}
          onDragOver={e  => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={e => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files?.[0]); }}
          style={{
            border:       `2px dashed ${dragging ? TEXT : BORDER}`,
            borderRadius: 10, padding: "20px 14px",
            textAlign:    "center", cursor: "pointer",
            background:   dragging ? "#f0f0f0" : CARD,
            transition:   "all 0.15s",
          }}
        >
          {/* Show actual product image in the upload zone */}
          {productImg ? (
            <div style={{
              width: 80, margin: "0 auto 10px",
              aspectRatio: "3/4", borderRadius: 8, overflow: "hidden",
              border: `1px solid ${BORDER}`,
            }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={productImg} alt={outfit.name}
                style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }} />
            </div>
          ) : (
            <div style={{ fontSize: 32, marginBottom: 10 }}>{outfit.emoji}</div>
          )}
          <div style={{ color: TEXT, fontSize: 12, fontWeight: 700, marginBottom: 3 }}>
            Upload your photo to try on
          </div>
          <div style={{ color: TEXT, fontSize: 13, fontWeight: 900, fontFamily: "'Courier New',monospace", marginBottom: 6 }}>
            {outfit.name} — ₹{outfit.price}
          </div>
          <div style={{ color: MUTED, fontSize: 10, lineHeight: 1.5, marginBottom: 12 }}>
            Full-body photo facing forward works best
          </div>
          <span style={{
            display: "inline-block",
            background: TEXT, color: "#fff",
            padding: "7px 18px", borderRadius: 6,
            fontSize: 10, fontWeight: 900,
            fontFamily: "'Courier New',monospace", letterSpacing: 1,
          }}>📂 CHOOSE PHOTO</span>
        </div>
      )}

      {/* ── STATE 2: Photo ready — show side-by-side + CTA ────────── */}
      {userPhoto && !result && !loading && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>

          {/* Both images side by side */}
          <div style={{ display: "flex", gap: 8 }}>
            <PhotoBox
              src={userPhoto}
              alt="Your photo"
              label="YOUR PHOTO"
              onRemove={reset}
            />
            {productImg ? (
              <PhotoBox
                src={productImg}
                alt={outfit.name}
                label="TRYING ON"
                badge={`${outfit.name} · ₹${outfit.price}`}
              />
            ) : (
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
                <div style={{ color: MUTED, fontSize: 8, fontFamily: "'Courier New',monospace", letterSpacing: 1.5 }}>TRYING ON</div>
                <div style={{
                  flex: 1, background: CARD, borderRadius: 10,
                  border: `1px solid ${BORDER}`, aspectRatio: "3/4",
                  display: "flex", flexDirection: "column",
                  alignItems: "center", justifyContent: "center", gap: 6,
                }}>
                  <span style={{ fontSize: 32 }}>{outfit.emoji}</span>
                  <span style={{ color: TEXT, fontSize: 10, fontFamily: "'Courier New',monospace", fontWeight: 900 }}>
                    ₹{outfit.price}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Analyse button */}
          <button
            onClick={e => { e.stopPropagation(); runTryOn(); }}
            style={{
              background: TEXT, color: "#fff",
              border: "none", borderRadius: 8,
              padding: "11px 0", fontSize: 12, fontWeight: 900,
              cursor: "pointer", width: "100%",
              fontFamily: "'Courier New',monospace", letterSpacing: 0.5,
              transition: "opacity 0.2s",
            }}
          >
            ✨ SEE HOW IT FITS ME
          </button>

          {error && (
            <div style={{
              color: "#dc2626", fontSize: 10, lineHeight: 1.5,
              background: "#fef2f2", border: "1px solid #fecaca",
              borderRadius: 6, padding: "8px 10px",
            }}>{error}</div>
          )}
        </div>
      )}

      {/* ── STATE 3: Loading ──────────────────────────────────────── */}
      {loading && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {/* Keep both images visible while loading */}
          {userPhoto && (
            <div style={{ display: "flex", gap: 8, opacity: 0.5 }}>
              <PhotoBox src={userPhoto} alt="Your photo" label="YOUR PHOTO" />
              {productImg && (
                <PhotoBox src={productImg} alt={outfit.name} label="TRYING ON" />
              )}
            </div>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0" }}>
            {[0, 1, 2].map(n => (
              <div key={n} style={{
                width: 7, height: 7, background: TEXT, borderRadius: "50%",
                animation: "btTryPulse 1.2s infinite",
                animationDelay: `${n * 0.2}s`,
              }} />
            ))}
            <span style={{ color: MUTED, fontSize: 11, fontFamily: "'Courier New',monospace" }}>
              Toastie is analysing your look...
            </span>
          </div>
        </div>
      )}

      {/* ── STATE 4: Result ───────────────────────────────────────── */}
      {result && userPhoto && (
        <div ref={resultRef} style={{ display: "flex", flexDirection: "column", gap: 10 }}>

          {/* ① Both photos LARGE side by side — the main visual */}
          <div style={{ display: "flex", gap: 8 }}>
            <PhotoBox
              src={userPhoto}
              alt="Your photo"
              label="YOUR PHOTO"
            />
            {productImg ? (
              <PhotoBox
                src={productImg}
                alt={outfit.name}
                label="WEARING THIS"
                badge={`${outfit.name} · ₹${outfit.price}`}
              />
            ) : (
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
                <div style={{ color: MUTED, fontSize: 8, fontFamily: "'Courier New',monospace", letterSpacing: 1.5 }}>WEARING THIS</div>
                <div style={{
                  flex: 1, background: CARD, borderRadius: 10,
                  border: `1px solid ${BORDER}`, minHeight: 100,
                  display: "flex", flexDirection: "column",
                  alignItems: "center", justifyContent: "center", gap: 6,
                }}>
                  <span style={{ fontSize: 32 }}>{outfit.emoji}</span>
                  <span style={{ color: TEXT, fontSize: 10, fontFamily: "'Courier New',monospace", fontWeight: 900 }}>₹{outfit.price}</span>
                </div>
              </div>
            )}
          </div>

          {/* ② Score ring + Toast verdict */}
          <div style={{
            background: CARD, border: `1px solid ${BORDER}`,
            borderRadius: 10, padding: "10px 12px",
            display: "flex", gap: 12, alignItems: "center",
          }}>
            <ScoreRing score={result.confidence_score} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                background: TEXT, color: "#fff",
                fontSize: 7, fontWeight: 900,
                padding: "2px 6px", borderRadius: 2,
                fontFamily: "'Courier New',monospace", letterSpacing: 1.5,
                display: "inline-block", marginBottom: 5,
              }}>TOAST VERDICT</div>
              <div style={{
                color: TEXT, fontSize: 11, fontStyle: "italic",
                lineHeight: 1.55, wordBreak: "break-word",
              }}>
                &quot;{result.toast_verdict}&quot;
              </div>
            </div>
          </div>

          {/* ③ Colour note (1 line, minimal) */}
          {result.colour_verdict && (
            <div style={{
              background: CARD, borderLeft: `3px solid ${TEXT}`,
              borderRadius: "0 6px 6px 0",
              padding: "8px 10px",
            }}>
              <div style={{
                color: MUTED, fontSize: 7,
                fontFamily: "'Courier New',monospace", letterSpacing: 1.5, marginBottom: 3,
              }}>COLOUR MATCH</div>
              <div style={{ color: TEXT, fontSize: 10, lineHeight: 1.55 }}>
                {result.colour_verdict}
              </div>
            </div>
          )}

          {/* ④ 3 styling tips — compact bullets */}
          {result.styling_tips?.length > 0 && (
            <div style={{
              background: CARD, border: `1px solid ${BORDER}`,
              borderRadius: 8, padding: "10px 12px",
            }}>
              <div style={{
                color: MUTED, fontSize: 7,
                fontFamily: "'Courier New',monospace", letterSpacing: 1.5, marginBottom: 7,
              }}>STYLE TIPS</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                {result.styling_tips.slice(0, 3).map((tip, i) => (
                  <div key={i} style={{ display: "flex", gap: 6, alignItems: "flex-start" }}>
                    <span style={{
                      color: "#fff", background: TEXT,
                      fontSize: 8, fontWeight: 900, flexShrink: 0,
                      width: 14, height: 14, borderRadius: "50%",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      marginTop: 1,
                    }}>{i + 1}</span>
                    <span style={{ color: TEXT, fontSize: 10, lineHeight: 1.55 }}>{tip}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ⑤ Alternative recommendation */}
          {alt && result.alternative_reason && (
            <div style={{
              background: "#f8f4ff", border: "1px solid #e0d5f7",
              borderRadius: 8, padding: "10px 12px",
              display: "flex", gap: 10, alignItems: "center",
            }}>
              <div style={{ flexShrink: 0, width: 44, height: 58, borderRadius: 6, overflow: "hidden", border: "1px solid #e0d5f7" }}>
                {alt.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={alt.image} alt={alt.name}
                    style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }} />
                ) : (
                  <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
                    {alt.category === "Tops" ? "👕" : "👖"}
                  </div>
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: "#7c6fcd", fontSize: 7, fontFamily: "'Courier New',monospace", letterSpacing: 1.5, marginBottom: 3 }}>
                  AI ALSO RECOMMENDS
                </div>
                <div style={{ color: TEXT, fontSize: 11, fontWeight: 700 }}>{alt.name}</div>
                <div style={{ color: "#7c6fcd", fontSize: 10, fontFamily: "'Courier New',monospace" }}>₹{alt.price}</div>
                <div style={{ color: MUTED, fontSize: 9, marginTop: 2, lineHeight: 1.4 }}>{result.alternative_reason}</div>
              </div>
              <a
                href={`/product/${alt.id}`}
                onClick={e => e.stopPropagation()}
                style={{
                  background: "#7c6fcd", color: "#fff",
                  borderRadius: 5, padding: "6px 10px",
                  fontSize: 9, fontFamily: "'Courier New',monospace", fontWeight: 700,
                  textDecoration: "none", flexShrink: 0, whiteSpace: "nowrap",
                }}
              >SHOP →</a>
            </div>
          )}

          {/* ⑥ Action row */}
          <div style={{ display: "flex", gap: 8 }}>
            <a
              href={outfit.url}
              target="_blank"
              rel="noreferrer"
              onClick={e => e.stopPropagation()}
              style={{
                flex: 1, display: "block",
                background: TEXT, color: "#fff",
                borderRadius: 8, padding: "10px 0",
                textAlign: "center", textDecoration: "none",
                fontSize: 11, fontWeight: 900,
                fontFamily: "'Courier New',monospace", letterSpacing: 0.5,
              }}
            >
              🛒 SHOP NOW — ₹{outfit.price}
            </a>
            <button
              onClick={e => { e.stopPropagation(); reset(); }}
              style={{
                background: "transparent", color: MUTED,
                border: `1px solid ${BORDER}`, borderRadius: 8,
                padding: "10px 12px", fontSize: 11, cursor: "pointer",
                display: "flex", alignItems: "center", gap: 4,
              }}
            >
              <RefreshCw size={11} /> Retry
            </button>
          </div>
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={e => {
          handleFile(e.target.files?.[0]);
          if (e.target) e.target.value = "";
        }}
      />
    </div>
  );
}
