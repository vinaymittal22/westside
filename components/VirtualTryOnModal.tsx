"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Image from "next/image";
import {
  X, Download, RefreshCw, Upload, Sparkles, AlertCircle,
  Share2, Copy, Check, MessageCircle, Instagram, ChevronLeft, ChevronRight,
} from "lucide-react";

/* ── Palette mirrors LookbookChat editorial theme ───────────────── */
const BG          = "#F1EBDD";
const CARD        = "#FFFFFF";
const SOFT        = "#F5F1E8";
const BORDER      = "#E5DFD0";
const TEXT        = "#1A1A1A";
const MUTED       = "#8A8782";
const SAGE_DEEP   = "#748B6A";

const FONT_DISPLAY = "'DM Serif Display', Georgia, serif";
const FONT_MONO    = "'JetBrains Mono', 'Courier New', monospace";
const FONT_BODY    = "'Inter', system-ui, sans-serif";

const MAX_SIZE_MB = 5;
const ALLOWED = ["image/jpeg", "image/png", "image/webp"];

const BODY_TYPES = [
  { value: "slim",                label: "Slim" },
  { value: "athletic",            label: "Athletic" },
  { value: "regular",             label: "Regular" },
  { value: "curvy",               label: "Curvy" },
  { value: "plus-size",           label: "Plus size" },
  { value: "prefer-not-to-say",   label: "Prefer not to say" },
];

/* ── Public types ───────────────────────────────────────────────── */
export interface TryOnOutfitItem {
  sku?: string;
  name?: string;
  price?: number;
  note?: string;
  url?: string;
  img?: string | null;
  colors?: string[];
  color_family?: string;
}
export type TryOnOutfitMap = Record<string, TryOnOutfitItem>;

/* Future-compatible shape per the brief */
export interface TryOnEntry {
  version:   number;
  imageUrl:  string;   // data: URL
  caption:   string;
  createdAt: string;   // ISO timestamp
}

interface Props {
  open:    boolean;
  outfit:  TryOnOutfitMap;
  images:  TryOnEntry[];                         // history (max 2) — provided by parent
  onClose: () => void;
  onNewImage: (entry: { imageUrl: string; caption: string }) => void;
}

/* ── Helpers ────────────────────────────────────────────────────── */
function fileToBase64(file: File): Promise<{ base64: string; preview: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(",")[1] ?? "";
      resolve({ base64, preview: result });
    };
    reader.readAsDataURL(file);
  });
}

async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const res = await fetch(dataUrl);
  return res.blob();
}

function downloadDataUrl(dataUrl: string, filename: string) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

/* ─────────────────────────────────────────────────────────────────
   Main component
   ───────────────────────────────────────────────────────────────── */
export default function VirtualTryOnModal({ open, outfit, images, onClose, onNewImage }: Props) {
  // ── Generation form state ────────────────────────────────────
  const [photoBase64, setPhotoBase64]   = useState<string | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoMime, setPhotoMime]       = useState<string>("image/jpeg");
  const [bodyType, setBodyType]         = useState<string>("regular");
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState<string | null>(null);
  const [invalidPhoto, setInvalidPhoto] = useState(false);
  const [dragOver, setDragOver]         = useState(false);

  // ── View-mode state ──────────────────────────────────────────
  // mode: "view" = showing existing history; "input" = upload + generate
  const [mode, setMode] = useState<"view" | "input">("input");
  const [versionIdx, setVersionIdx] = useState(0);   // which image in history we're viewing
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [copied, setCopied] = useState<"" | "image" | "caption">("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  const hasHistory     = images.length > 0;
  const currentImage   = hasHistory ? images[Math.min(versionIdx, images.length - 1)] : null;
  const canNativeShare = typeof navigator !== "undefined" && typeof navigator.share === "function";

  /* Close on Esc */
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  /* Lock body scroll while open */
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  /* On open: pick the mode based on existing history. On close: soft reset. */
  useEffect(() => {
    if (open) {
      setMode(hasHistory ? "view" : "input");
      setVersionIdx(Math.max(0, images.length - 1));
      setError(null);
      setInvalidPhoto(false);
      setShowShareMenu(false);
      setCopied("");
    } else {
      const t = setTimeout(() => {
        setPhotoBase64(null);
        setPhotoPreview(null);
        setLoading(false);
        setDragOver(false);
        setShowShareMenu(false);
      }, 250);
      return () => clearTimeout(t);
    }
  // re-evaluate when open toggles or when the outfit's history shape changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  /* When images array changes (new generation arrived), jump to the newest entry */
  useEffect(() => {
    if (images.length > 0) setVersionIdx(images.length - 1);
  }, [images.length]);

  /* ── Photo upload ────────────────────────────────────────────── */
  const handleFile = useCallback(async (file: File | undefined | null) => {
    if (!file) return;
    if (!ALLOWED.includes(file.type)) {
      setError("Please upload a JPG, PNG or WEBP image.");
      return;
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(`Image is too large. Max ${MAX_SIZE_MB} MB.`);
      return;
    }
    setError(null);
    setInvalidPhoto(false);
    try {
      const { base64, preview } = await fileToBase64(file);
      setPhotoBase64(base64);
      setPhotoPreview(preview);
      setPhotoMime(file.type);
    } catch {
      setError("Could not read that file. Try another image.");
    }
  }, []);

  /* ── Generate / regenerate ──────────────────────────────────── */
  const handleGenerate = useCallback(async () => {
    if (!photoBase64) {
      setError("Please upload a photo first.");
      return;
    }
    if (loading) return;
    setLoading(true);
    setError(null);
    setInvalidPhoto(false);

    try {
      const res = await fetch("/api/virtual-tryon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userPhoto: photoBase64,
          userMime:  photoMime,
          bodyType,
          outfit,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        const err = new Error(data.error || "Generation failed.");
        if (data.code === "INVALID_PHOTO") {
          (err as Error & { invalidPhoto?: boolean }).invalidPhoto = true;
        }
        throw err;
      }
      const imageUrl = data.image as string;
      const caption  = (data.caption as string) || "Built this look with Toastie ✨";
      onNewImage({ imageUrl, caption });
      // Slide to view mode showing the new image
      setMode("view");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Something went wrong — please try again.";
      setError(msg);
      const wasInvalid = !!(e as Error & { invalidPhoto?: boolean }).invalidPhoto;
      setInvalidPhoto(wasInvalid);
    } finally {
      setLoading(false);
    }
  }, [photoBase64, photoMime, bodyType, outfit, loading, onNewImage]);

  const handleRegenerate = useCallback(() => {
    if (loading) return;
    // If we already have a photo in memory, regenerate directly.
    // Otherwise, drop to input mode so user can upload again.
    if (photoBase64) {
      handleGenerate();
    } else {
      setMode("input");
      setError(null);
    }
  }, [photoBase64, handleGenerate, loading]);

  /* ── Download ─────────────────────────────────────────────── */
  const handleDownload = useCallback(() => {
    if (!currentImage) return;
    const stamp = new Date(currentImage.createdAt || Date.now())
      .toISOString().replace(/[:.]/g, "-");
    downloadDataUrl(currentImage.imageUrl, `burnt-toast-tryon-v${currentImage.version}-${stamp}.png`);
  }, [currentImage]);

  /* ── Share actions ────────────────────────────────────────── */
  const handleNativeShare = useCallback(async () => {
    if (!currentImage) return;
    try {
      const blob = await dataUrlToBlob(currentImage.imageUrl);
      const file = new File([blob], "burnt-toast-tryon.png", { type: blob.type });
      const sharePayload: ShareData = {
        title: "My Burnt Toast try-on",
        text:  currentImage.caption,
      };
      if (typeof navigator !== "undefined" && "canShare" in navigator
        && (navigator as Navigator & { canShare?: (d: ShareData) => boolean }).canShare?.({ files: [file] })) {
        sharePayload.files = [file];
      }
      await navigator.share(sharePayload);
    } catch {
      // user dismissed or share failed silently
    }
  }, [currentImage]);

  const handleShareWhatsApp = useCallback(() => {
    if (!currentImage) return;
    const url = `https://wa.me/?text=${encodeURIComponent(currentImage.caption)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }, [currentImage]);

  const handleShareInstagram = useCallback(async () => {
    if (!currentImage) return;
    // Instagram has no public web share intent. We help the user:
    // 1) download the image, 2) copy the caption, 3) open Instagram.
    handleDownload();
    try {
      await navigator.clipboard.writeText(currentImage.caption);
      setCopied("caption");
      setTimeout(() => setCopied(""), 2000);
    } catch {}
    // Best-effort deep link / web open
    const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
    const isMobile = /Android|iPhone|iPad|iPod/i.test(ua);
    if (isMobile) {
      // Try the IG mobile deep link
      window.location.href = "instagram://camera";
      // Fallback after a moment in case the app isn't installed
      setTimeout(() => window.open("https://www.instagram.com", "_blank"), 800);
    } else {
      window.open("https://www.instagram.com", "_blank", "noopener,noreferrer");
    }
  }, [currentImage, handleDownload]);

  const handleCopyImage = useCallback(async () => {
    if (!currentImage) return;
    try {
      const blob = await dataUrlToBlob(currentImage.imageUrl);
      // ClipboardItem requires the image mime type. PNG is widely supported.
      const item = new ClipboardItem({ [blob.type]: blob });
      await navigator.clipboard.write([item]);
      setCopied("image");
      setTimeout(() => setCopied(""), 2000);
    } catch {
      setError("Couldn't copy image — try downloading instead.");
    }
  }, [currentImage]);

  const handleCopyCaption = useCallback(async () => {
    if (!currentImage) return;
    try {
      await navigator.clipboard.writeText(currentImage.caption);
      setCopied("caption");
      setTimeout(() => setCopied(""), 2000);
    } catch {
      setError("Couldn't copy caption.");
    }
  }, [currentImage]);

  if (!open) return null;

  const itemCount = Object.values(outfit).filter(i => i?.name).length;

  /* ────────────────────────────────────────────────────────────── */
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Virtual Try-On"
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 80,
        background: "rgba(20,18,14,0.55)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "20px 14px",
        animation: "btFadeIn 180ms ease",
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="bt-tryon-modal"
        style={{
          background: BG,
          border: `1px solid ${BORDER}`,
          borderRadius: 20,
          width: "100%", maxWidth: 580,
          maxHeight: "94vh",
          overflowY: "auto",
          boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
          position: "relative",
          fontFamily: FONT_BODY,
        }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          aria-label="Close"
          style={{
            position: "absolute", top: 14, right: 14, zIndex: 4,
            width: 34, height: 34, borderRadius: "50%",
            background: CARD, border: `1px solid ${BORDER}`,
            cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <X size={16} stroke={TEXT} />
        </button>

        <div style={{ padding: "26px 22px 22px" }}>

          {/* Header */}
          <div style={{ textAlign: "center", marginBottom: 18 }}>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "4px 12px", borderRadius: 999,
              background: CARD, border: `1px solid ${BORDER}`,
              color: TEXT,
              fontFamily: FONT_MONO, fontSize: 9, letterSpacing: 2.5, fontWeight: 600,
              marginBottom: 12,
            }}>
              <Sparkles size={11} /> VIRTUAL TRY-ON
            </div>
            <h2 style={{
              fontFamily: FONT_DISPLAY, color: TEXT,
              fontSize: 26, lineHeight: 1.1,
              margin: "0 0 6px",
            }}>
              {mode === "view"
                ? <>Your <em style={{ fontStyle: "italic" }}>Try-On</em></>
                : <>See Yourself In <em style={{ fontStyle: "italic" }}>This Look</em></>}
            </h2>
            <p style={{
              color: MUTED, fontSize: 12.5, lineHeight: 1.5,
              margin: "0 auto", maxWidth: 380,
            }}>
              {mode === "view"
                ? <>Saved on your device · {images.length}/2 version{images.length !== 1 ? "s" : ""}</>
                : <>Upload a photo and let Toastie visualize this outfit on you.
                    {itemCount > 0 && <> · <span style={{ color: TEXT, fontWeight: 500 }}>{itemCount} item{itemCount !== 1 ? "s" : ""}</span></>}
                  </>}
            </p>
          </div>

          {/* ═══ LOADING VIEW ════════════════════════════════════ */}
          {loading && (
            <div style={{
              padding: "30px 14px", textAlign: "center",
              display: "flex", flexDirection: "column", alignItems: "center", gap: 14,
            }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {[0, 1, 2].map(n => (
                  <span key={n} style={{
                    width: 9, height: 9, borderRadius: "50%", background: TEXT,
                    animation: "btTryPulse 1.2s infinite",
                    animationDelay: `${n * 0.2}s`,
                    display: "inline-block",
                  }} />
                ))}
              </div>
              <div style={{
                fontFamily: FONT_DISPLAY, fontSize: 22, fontStyle: "italic", color: TEXT,
              }}>
                Creating your virtual try-on…
              </div>
              <div style={{
                fontFamily: FONT_MONO, fontSize: 10, color: MUTED, letterSpacing: 2,
              }}>
                THIS USUALLY TAKES 25–45 SECONDS
              </div>
            </div>
          )}

          {/* ═══ VIEW MODE — gallery + share ════════════════════ */}
          {!loading && mode === "view" && currentImage && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

              {/* Big image preview */}
              <div style={{
                position: "relative",
                borderRadius: 14,
                overflow: "hidden",
                border: `1px solid ${BORDER}`,
                background: SOFT,
                aspectRatio: "3/4",
                maxWidth: 460, margin: "0 auto",
                width: "100%",
              }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={currentImage.imageUrl}
                  alt={`Virtual try-on version ${currentImage.version}`}
                  style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }}
                />
                {/* Version pill */}
                <div style={{
                  position: "absolute", top: 10, left: 10,
                  padding: "4px 10px", borderRadius: 999,
                  background: "rgba(26,26,26,0.78)", color: "#fff",
                  fontFamily: FONT_MONO, fontSize: 9, letterSpacing: 1.8, fontWeight: 600,
                  backdropFilter: "blur(4px)",
                }}>
                  V{currentImage.version}
                </div>

                {/* Prev/next arrows when 2 versions exist */}
                {images.length > 1 && (
                  <>
                    <button
                      onClick={() => setVersionIdx(i => Math.max(0, i - 1))}
                      disabled={versionIdx === 0}
                      aria-label="Previous version"
                      style={{
                        position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)",
                        width: 32, height: 32, borderRadius: "50%",
                        background: "rgba(255,255,255,0.92)", border: `1px solid ${BORDER}`,
                        cursor: versionIdx === 0 ? "not-allowed" : "pointer",
                        opacity: versionIdx === 0 ? 0.4 : 1,
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}
                    >
                      <ChevronLeft size={16} stroke={TEXT} />
                    </button>
                    <button
                      onClick={() => setVersionIdx(i => Math.min(images.length - 1, i + 1))}
                      disabled={versionIdx >= images.length - 1}
                      aria-label="Next version"
                      style={{
                        position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
                        width: 32, height: 32, borderRadius: "50%",
                        background: "rgba(255,255,255,0.92)", border: `1px solid ${BORDER}`,
                        cursor: versionIdx >= images.length - 1 ? "not-allowed" : "pointer",
                        opacity: versionIdx >= images.length - 1 ? 0.4 : 1,
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}
                    >
                      <ChevronRight size={16} stroke={TEXT} />
                    </button>
                  </>
                )}
              </div>

              {/* Version switcher tabs */}
              {images.length > 1 && (
                <div style={{
                  display: "flex", gap: 6, justifyContent: "center",
                }}>
                  {images.map((entry, i) => (
                    <button
                      key={entry.createdAt + i}
                      onClick={() => setVersionIdx(i)}
                      style={{
                        padding: "6px 14px", borderRadius: 999,
                        background: i === versionIdx ? TEXT : "transparent",
                        color: i === versionIdx ? BG : TEXT,
                        border: `1px solid ${i === versionIdx ? TEXT : BORDER}`,
                        fontFamily: FONT_MONO, fontSize: 10, letterSpacing: 1.8, fontWeight: 600,
                        cursor: "pointer", transition: "all 150ms ease",
                      }}
                    >
                      VERSION {entry.version}
                    </button>
                  ))}
                </div>
              )}

              {/* Caption block */}
              <div style={{
                background: CARD, border: `1px solid ${BORDER}`,
                borderRadius: 12, padding: "12px 14px",
                color: TEXT, fontSize: 13, lineHeight: 1.55,
                whiteSpace: "pre-line",
              }}>
                {currentImage.caption}
              </div>

              {/* Action row */}
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <button
                  onClick={() => setShowShareMenu(s => !s)}
                  style={{
                    flex: 1, minWidth: 110,
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                    padding: "11px 14px", borderRadius: 999,
                    background: TEXT, border: "none", color: BG,
                    fontFamily: FONT_MONO, fontSize: 11, letterSpacing: 1.6, fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  <Share2 size={13} /> SHARE
                </button>
                <button
                  onClick={handleDownload}
                  style={{
                    flex: 1, minWidth: 110,
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                    padding: "11px 14px", borderRadius: 999,
                    background: "transparent", border: `1px solid ${TEXT}`, color: TEXT,
                    fontFamily: FONT_MONO, fontSize: 11, letterSpacing: 1.6, fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  <Download size={13} /> DOWNLOAD
                </button>
                <button
                  onClick={handleRegenerate}
                  disabled={loading}
                  style={{
                    flex: 1, minWidth: 110,
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                    padding: "11px 14px", borderRadius: 999,
                    background: "transparent", border: `1px solid ${BORDER}`, color: TEXT,
                    fontFamily: FONT_MONO, fontSize: 11, letterSpacing: 1.6, fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  <RefreshCw size={13} /> REGENERATE
                </button>
                <button
                  onClick={onClose}
                  style={{
                    width: "100%",
                    padding: "9px 14px", borderRadius: 999,
                    background: "transparent", border: `1px solid ${BORDER}`, color: MUTED,
                    fontFamily: FONT_MONO, fontSize: 10, letterSpacing: 1.8, fontWeight: 600,
                    cursor: "pointer", marginTop: 2,
                  }}
                >
                  CLOSE
                </button>
              </div>

              {/* Share menu — appears below action row */}
              {showShareMenu && (
                <div style={{
                  marginTop: 4,
                  background: CARD, border: `1px solid ${BORDER}`,
                  borderRadius: 14, padding: 8,
                  display: "flex", flexDirection: "column", gap: 2,
                  animation: "btAlertPop 200ms ease",
                }}>
                  {canNativeShare && (
                    <ShareRow
                      onClick={handleNativeShare}
                      icon={<Share2 size={15} stroke={TEXT} />}
                      label="Share via device"
                      sub="Use any installed app"
                    />
                  )}
                  <ShareRow
                    onClick={handleShareInstagram}
                    icon={<Instagram size={15} stroke="#E4405F" />}
                    label="Share to Instagram"
                    sub="Image downloads + caption copies"
                  />
                  <ShareRow
                    onClick={handleShareWhatsApp}
                    icon={<MessageCircle size={15} stroke="#25D366" />}
                    label="Share to WhatsApp"
                    sub="Opens WhatsApp with caption"
                  />
                  <ShareRow
                    onClick={handleCopyImage}
                    icon={copied === "image" ? <Check size={15} stroke={SAGE_DEEP} /> : <Copy size={15} stroke={TEXT} />}
                    label={copied === "image" ? "Image copied!" : "Copy image"}
                    sub="Paste in any app"
                  />
                  <ShareRow
                    onClick={handleCopyCaption}
                    icon={copied === "caption" ? <Check size={15} stroke={SAGE_DEEP} /> : <Copy size={15} stroke={TEXT} />}
                    label={copied === "caption" ? "Caption copied!" : "Copy caption"}
                    sub="Paste into your post"
                  />
                </div>
              )}

              {/* Error in view mode (e.g. share failure) */}
              {error && (
                <div role="alert" style={{
                  display: "flex", alignItems: "center", gap: 8,
                  background: "#fef2f2", border: "1px solid #fecaca",
                  borderRadius: 10, padding: "8px 12px",
                  color: "#b91c1c", fontSize: 12,
                }}>
                  <AlertCircle size={14} stroke="#b91c1c" />
                  <span>{error}</span>
                </div>
              )}
            </div>
          )}

          {/* ═══ INPUT MODE — upload + body type + generate ════ */}
          {!loading && mode === "input" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>

              {/* Back to view if history exists */}
              {hasHistory && (
                <button
                  onClick={() => setMode("view")}
                  style={{
                    alignSelf: "flex-start",
                    display: "inline-flex", alignItems: "center", gap: 6,
                    background: "transparent", border: "none",
                    color: MUTED, cursor: "pointer", padding: 0,
                    fontFamily: FONT_MONO, fontSize: 10, letterSpacing: 1.5,
                  }}
                >
                  <ChevronLeft size={13} /> BACK TO TRY-ON
                </button>
              )}

              {/* Photo upload */}
              <div>
                <div style={{
                  fontFamily: FONT_MONO, fontSize: 10, letterSpacing: 2.5, fontWeight: 600,
                  color: MUTED, marginBottom: 8,
                }}>
                  YOUR PHOTO
                </div>

                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={e => {
                    e.preventDefault(); setDragOver(false);
                    handleFile(e.dataTransfer.files?.[0]);
                  }}
                  style={{
                    background: dragOver ? SOFT : CARD,
                    border: `1.5px dashed ${dragOver ? TEXT : BORDER}`,
                    borderRadius: 14,
                    padding: 16,
                    cursor: "pointer",
                    transition: "all 180ms ease",
                    display: "flex", alignItems: "center", gap: 14,
                    minHeight: 110,
                  }}
                >
                  {photoPreview ? (
                    <>
                      <div style={{
                        position: "relative",
                        width: 74, height: 96,
                        borderRadius: 10, overflow: "hidden",
                        flexShrink: 0, background: SOFT,
                        border: `1px solid ${BORDER}`,
                      }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={photoPreview} alt="Your upload" style={{
                          width: "100%", height: "100%", objectFit: "cover",
                        }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 500, color: TEXT }}>Photo uploaded ✓</div>
                        <div style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>
                          Click to change · JPG, PNG, WEBP · max {MAX_SIZE_MB} MB
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div style={{
                        width: 56, height: 56, borderRadius: 14,
                        background: SOFT, border: `1px solid ${BORDER}`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        flexShrink: 0,
                      }}>
                        <Upload size={20} stroke={TEXT} />
                      </div>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 500, color: TEXT, marginBottom: 2 }}>
                          Tap or drop a photo here
                        </div>
                        <div style={{ fontSize: 12, color: MUTED, lineHeight: 1.4 }}>
                          Full-body forward-facing photo · JPG / PNG / WEBP · max {MAX_SIZE_MB} MB
                        </div>
                      </div>
                    </>
                  )}
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  hidden
                  onChange={e => {
                    handleFile(e.target.files?.[0]);
                    if (e.target) e.target.value = "";
                  }}
                />
              </div>

              {/* Body type */}
              <div>
                <label htmlFor="bt-body-type" style={{
                  display: "block",
                  fontFamily: FONT_MONO, fontSize: 10, letterSpacing: 2.5, fontWeight: 600,
                  color: MUTED, marginBottom: 8,
                }}>
                  BODY TYPE
                </label>
                <select
                  id="bt-body-type"
                  value={bodyType}
                  onChange={e => setBodyType(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "12px 14px",
                    borderRadius: 12,
                    background: CARD,
                    border: `1px solid ${BORDER}`,
                    color: TEXT,
                    fontSize: 14, fontFamily: FONT_BODY,
                    appearance: "none",
                    cursor: "pointer",
                  }}
                >
                  {BODY_TYPES.map(b => (
                    <option key={b.value} value={b.value}>{b.label}</option>
                  ))}
                </select>
              </div>

              {/* Error */}
              {error && (
                <div role="alert" style={{
                  display: "flex", alignItems: "center", gap: 10,
                  background: invalidPhoto ? "#FFFAF0" : "#fef2f2",
                  border: `1px solid ${invalidPhoto ? "#F0C97D" : "#fecaca"}`,
                  borderRadius: 12,
                  padding: invalidPhoto ? "12px 14px" : "10px 12px",
                  color: invalidPhoto ? "#8A5A00" : "#b91c1c",
                  fontSize: invalidPhoto ? 13 : 12,
                  lineHeight: 1.4,
                  fontWeight: invalidPhoto ? 600 : 400,
                  boxShadow: invalidPhoto ? "0 4px 14px rgba(0,0,0,0.06)" : "none",
                  animation: invalidPhoto ? "btAlertPop 220ms ease" : undefined,
                }}>
                  <AlertCircle size={invalidPhoto ? 18 : 14} stroke={invalidPhoto ? "#8A5A00" : "#b91c1c"} style={{ flexShrink: 0 }} />
                  <span>{error}</span>
                </div>
              )}

              {/* Generate button */}
              <button
                onClick={handleGenerate}
                disabled={!photoBase64 || loading}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  width: "100%",
                  padding: "14px 16px",
                  borderRadius: 999,
                  background: !photoBase64 ? "#C9C2B0" : TEXT,
                  color: BG,
                  border: "none",
                  fontFamily: FONT_MONO,
                  fontSize: 12, letterSpacing: 2, fontWeight: 600,
                  cursor: !photoBase64 ? "not-allowed" : "pointer",
                  transition: "background 180ms ease, transform 180ms ease",
                  marginTop: 2,
                }}
              >
                <Sparkles size={14} /> {hasHistory ? "REGENERATE TRY-ON" : "GENERATE TRY-ON"}
              </button>

              <div style={{
                display: "flex", alignItems: "center", gap: 6, justifyContent: "center",
                color: MUTED, fontSize: 10, fontFamily: FONT_MONO, letterSpacing: 2,
              }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: SAGE_DEEP, display: "inline-block" }} />
                POWERED BY GEMINI
              </div>

              {/* Tiny outfit preview strip */}
              {itemCount > 0 && (
                <div style={{
                  display: "flex", gap: 6, overflowX: "auto", paddingBottom: 4,
                }}>
                  {Object.values(outfit)
                    .filter(i => i?.img)
                    .slice(0, 6)
                    .map((it, i) => (
                      <div key={i} style={{
                        position: "relative",
                        width: 44, height: 44, borderRadius: 8,
                        overflow: "hidden", flexShrink: 0,
                        border: `1px solid ${BORDER}`, background: SOFT,
                      }}>
                        <Image
                          src={it.img!}
                          alt={it.name ?? ""}
                          fill
                          sizes="44px"
                          style={{ objectFit: "cover", objectPosition: "top" }}
                          unoptimized
                        />
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <style jsx global>{`
        @keyframes btFadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes btTryPulse {
          0%, 60%, 100% { transform: scale(1);   opacity: 0.4 }
          30%           { transform: scale(1.4); opacity: 1   }
        }
        @keyframes btAlertPop {
          0%   { opacity: 0; transform: translateY(-4px) scale(0.97) }
          60%  { opacity: 1; transform: translateY(0)    scale(1.01) }
          100% { opacity: 1; transform: translateY(0)    scale(1)    }
        }
      `}</style>
    </div>
  );
}

/* ── Share menu row ─────────────────────────────────────────── */
function ShareRow({
  onClick, icon, label, sub,
}: {
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  sub: string;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", gap: 12,
        background: "transparent", border: "none",
        padding: "9px 10px", borderRadius: 10,
        cursor: "pointer", textAlign: "left",
        transition: "background 150ms ease",
      }}
      onMouseEnter={e => { e.currentTarget.style.background = SOFT; }}
      onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
    >
      <div style={{
        width: 32, height: 32, borderRadius: 10,
        background: SOFT, border: `1px solid ${BORDER}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0,
      }}>
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: TEXT }}>{label}</div>
        <div style={{ fontSize: 11, color: MUTED, marginTop: 1 }}>{sub}</div>
      </div>
    </button>
  );
}
