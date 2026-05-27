"""
Architecture flow diagram for the Burnt Toast PPT slide.
Renders a single PNG at 16:9 aspect ratio (1920x1080), large enough
to drop directly into a slide.
"""

import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch, Circle
from matplotlib.lines import Line2D

# ── Colors (Burnt Toast palette) ─────────────────────────────
CREAM      = "#F0EBE0"
CREAM_SOFT = "#F5F1E8"
LINE       = "#D8D2C4"
INK        = "#1A1A1A"
ASH        = "#3A3A3A"
MUTED      = "#8A8782"
ACCENT     = "#B8492C"   # burnt orange
SAGE       = "#748B6A"   # sage green
GOLD       = "#C9962E"

# ── Figure (16:9 @ 200 dpi → 1920x1080) ──────────────────────
fig, ax = plt.subplots(figsize=(16, 9), dpi=200)
fig.patch.set_facecolor(CREAM)
ax.set_facecolor(CREAM)
ax.set_xlim(0, 100)
ax.set_ylim(0, 56)
ax.axis("off")

# ── Title block ──────────────────────────────────────────────
ax.text(50, 52, "Burnt Toast — How Toastie Works",
        ha="center", va="center",
        fontsize=26, fontweight="bold", color=INK,
        family="DejaVu Serif")
ax.text(50, 48, "From your message to a styled outfit, in one flow",
        ha="center", va="center",
        fontsize=13, color=MUTED, style="italic")

# Decorative underline
ax.add_line(Line2D([35, 65], [45, 45], color=ACCENT, linewidth=2))


# ── Helper to draw a step box ────────────────────────────────
def step_box(x, y, w, h, title, subtitle, icon, color, icon_color="white"):
    # Drop shadow
    shadow = FancyBboxPatch((x - w/2 + 0.3, y - h/2 - 0.3), w, h,
                            boxstyle="round,pad=0.02,rounding_size=1.2",
                            linewidth=0, facecolor="#00000018", zorder=1)
    ax.add_patch(shadow)
    # Main card
    box = FancyBboxPatch((x - w/2, y - h/2), w, h,
                        boxstyle="round,pad=0.02,rounding_size=1.2",
                        linewidth=1.5, edgecolor=LINE,
                        facecolor="white", zorder=2)
    ax.add_patch(box)

    # Top color band
    band_h = 1.2
    band = FancyBboxPatch((x - w/2, y + h/2 - band_h), w, band_h,
                          boxstyle="round,pad=0.02,rounding_size=1.2",
                          linewidth=0, facecolor=color, zorder=3)
    ax.add_patch(band)

    # Icon circle
    icon_circle = Circle((x, y + 1.5), 2.4, facecolor=color,
                        edgecolor="white", linewidth=2, zorder=4)
    ax.add_patch(icon_circle)
    ax.text(x, y + 1.5, icon,
            ha="center", va="center",
            fontsize=20, color=icon_color, fontweight="bold", zorder=5)

    # Title
    ax.text(x, y - 2.3, title,
            ha="center", va="center",
            fontsize=11, fontweight="bold", color=INK, zorder=5)
    # Subtitle (wrapped manually)
    ax.text(x, y - 4.2, subtitle,
            ha="center", va="center",
            fontsize=8.5, color=ASH, zorder=5,
            wrap=True)


# ── Helper to draw an arrow between steps ────────────────────
def arrow(x1, x2, y, color=INK, label=None, label_color=MUTED):
    arr = FancyArrowPatch((x1, y), (x2, y),
                          arrowstyle="-|>", mutation_scale=22,
                          color=color, linewidth=2.2, zorder=3)
    ax.add_patch(arr)
    if label:
        midx = (x1 + x2) / 2
        # background pill behind label
        ax.text(midx, y + 1.4, label,
                ha="center", va="center",
                fontsize=8, color=label_color, style="italic",
                fontweight="bold")


# ── Layout — 5 steps along the top row ───────────────────────
box_w, box_h = 14, 13
y_top = 30
positions_x = [10, 30, 50, 70, 90]

step_box(positions_x[0], y_top, box_w, box_h,
         "User",
         "Types a message or\nuploads a product image",
         "1", ACCENT)

step_box(positions_x[1], y_top, box_w, box_h,
         "Next.js Frontend",
         "Captures input + sends\nsession state to the API",
         "2", INK)

step_box(positions_x[2], y_top, box_w, box_h,
         "API Route",
         "Builds the prompt and\ncalls Claude with full context",
         "3", GOLD)

step_box(positions_x[3], y_top, box_w, box_h,
         "Claude Sonnet 4.5",
         "Understands the intent,\nreturns structured JSON",
         "4", SAGE)

step_box(positions_x[4], y_top, box_w, box_h,
         "Outfit Engine",
         "Picks real products\nfrom the catalogue",
         "5", ACCENT)

# Arrows between the 5 top boxes
arrow_labels = [
    "message + session",
    "build prompt",
    "intent (JSON)",
    "scored products",
]
for i in range(4):
    x1 = positions_x[i] + box_w/2 + 0.4
    x2 = positions_x[i+1] - box_w/2 - 0.4
    arrow(x1, x2, y_top, color=INK, label=arrow_labels[i])

# ── Return arrow (curved feedback to User) ───────────────────
from matplotlib.patches import FancyArrowPatch as FAP
return_arrow = FAP(
    (positions_x[4], y_top - box_h/2 - 0.5),
    (positions_x[0], y_top - box_h/2 - 0.5),
    connectionstyle="arc3,rad=-0.18",
    arrowstyle="-|>", mutation_scale=24,
    color=ACCENT, linewidth=2.4, zorder=2, linestyle="-",
)
ax.add_patch(return_arrow)
ax.text(50, 8, "Styled outfit returned to the user",
        ha="center", va="center",
        fontsize=11, color=ACCENT, fontweight="bold", style="italic")

# Small description below the loop
ax.text(50, 4.5,
        "Same flow handles iterative refinements — 'change footwear', 'different bag', 'more streetwear'.",
        ha="center", va="center",
        fontsize=9.5, color=MUTED, style="italic")

# ── Bottom footer brand strip ────────────────────────────────
ax.add_line(Line2D([4, 96], [1.6, 1.6], color=LINE, linewidth=0.8))
ax.text(4, 0.6, "B U R N T   T O A S T",
        ha="left", va="center",
        fontsize=8, color=MUTED, fontweight="bold",
        family="monospace")
ax.text(96, 0.6, "AI Fashion Stylist  •  Claude Sonnet 4.5",
        ha="right", va="center",
        fontsize=8, color=MUTED, family="monospace")

# Save
out = "burnt_toast_architecture.png"
plt.savefig(out, dpi=200, bbox_inches="tight",
            facecolor=CREAM, edgecolor="none", pad_inches=0.15)
print(f"Saved {out}")
