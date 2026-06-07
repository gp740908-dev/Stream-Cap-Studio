import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      // ─── StreamCap Studio Design Tokens ──────────────────────────────────
      colors: {
        // Backgrounds — deep dark, layered
        background: {
          DEFAULT: "#0a0a0a",
          surface: "#111111",
          elevated: "#1a1a1a",
          border: "#242424",
        },
        // Text hierarchy
        foreground: {
          DEFAULT: "#e8e8e8",
          muted: "#888888",
          subtle: "#555555",
        },
        // Accent — single amber
        accent: {
          DEFAULT: "#F59E0B",
          hover: "#D97706",
          muted: "rgba(245, 158, 11, 0.12)",
        },
        // Status colors
        status: {
          queued: "#555555",
          recording: "#EF4444",
          processing: "#3B82F6",
          done: "#22C55E",
          failed: "#EF4444",
          cancelled: "#6B7280",
        },
        // shadcn/ui compatibility
        border: "#242424",
        input: "#1a1a1a",
        ring: "#F59E0B",
        primary: {
          DEFAULT: "#F59E0B",
          foreground: "#000000",
        },
        secondary: {
          DEFAULT: "#1a1a1a",
          foreground: "#e8e8e8",
        },
        muted: {
          DEFAULT: "#111111",
          foreground: "#888888",
        },
        destructive: {
          DEFAULT: "#EF4444",
          foreground: "#ffffff",
        },
        card: {
          DEFAULT: "#111111",
          foreground: "#e8e8e8",
        },
        popover: {
          DEFAULT: "#1a1a1a",
          foreground: "#e8e8e8",
        },
      },
      fontFamily: {
        // DM Sans for UI text
        sans: ["DM Sans", "system-ui", "sans-serif"],
        // Geist Mono for data/numbers/code
        mono: ["Geist Mono", "JetBrains Mono", "Fira Code", "monospace"],
      },
      borderRadius: {
        lg: "6px",
        md: "4px",
        sm: "3px",
      },
      keyframes: {
        "pulse-amber": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.4" },
        },
        "fade-in": {
          from: { opacity: "0", transform: "translateY(4px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "pulse-amber": "pulse-amber 2s ease-in-out infinite",
        "fade-in": "fade-in 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
