import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./context/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        gold: {
          50:  "#fdf8ee",
          300: "#f0c060",
          400: "#d4a840",
          500: "#c4953a",
          600: "#a07828",
        },
        dark: {
          50:  "#1a1a1a",
          100: "#141414",
          200: "#111111",
          300: "#0d0d0d",
          400: "#080808",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "sans-serif"],
        display: ["var(--font-playfair)", "Georgia", "serif"],
      },
      animation: {
        "fade-in":       "fadeIn 0.5s ease-out forwards",
        "slide-up":      "slideUp 0.5s ease-out forwards",
        "slide-in-left": "slideInLeft 0.4s cubic-bezier(0.16,1,0.3,1) forwards",
        "slide-in-right":"slideInRight 0.4s cubic-bezier(0.16,1,0.3,1) forwards",
        "shimmer":       "shimmer 1.8s infinite linear",
        "pulse-gold":    "pulseGold 2s ease-in-out infinite",
        "float":         "float 3s ease-in-out infinite",
        "dot-bounce":    "dotBounce 1.3s ease-in-out infinite",
        "scale-in":      "scaleIn 0.3s cubic-bezier(0.16,1,0.3,1) forwards",
      },
      keyframes: {
        fadeIn: {
          from: { opacity: "0" },
          to:   { opacity: "1" },
        },
        slideUp: {
          from: { opacity: "0", transform: "translateY(24px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        slideInLeft: {
          from: { opacity: "0", transform: "translateX(-20px)" },
          to:   { opacity: "1", transform: "translateX(0)" },
        },
        slideInRight: {
          from: { opacity: "0", transform: "translateX(20px)" },
          to:   { opacity: "1", transform: "translateX(0)" },
        },
        shimmer: {
          "0%":   { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition:  "200% 0" },
        },
        pulseGold: {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(196,149,58,0.4)" },
          "50%":      { boxShadow: "0 0 0 12px rgba(196,149,58,0)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%":      { transform: "translateY(-8px)" },
        },
        dotBounce: {
          "0%, 60%, 100%": { transform: "translateY(0)", opacity: "0.35" },
          "30%":           { transform: "translateY(-7px)", opacity: "1" },
        },
        scaleIn: {
          from: { opacity: "0", transform: "scale(0.92)" },
          to:   { opacity: "1", transform: "scale(1)" },
        },
      },
      backgroundImage: {
        "gold-gradient": "linear-gradient(135deg, #c4953a 0%, #f0c060 50%, #c4953a 100%)",
        "dark-gradient": "linear-gradient(180deg, #0d0d0d 0%, #141414 100%)",
        "card-gradient": "linear-gradient(180deg, transparent 50%, rgba(0,0,0,0.9) 100%)",
      },
    },
  },
  plugins: [],
};

export default config;
