import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/sections/**/*.{ts,tsx}",
    "./src/layouts/**/*.{ts,tsx}"
  ],
  theme: {
    container: {
      center: true,
      padding: "1rem",
      screens: {
        "2xl": "1180px"
      }
    },
    extend: {
      colors: {
        background: "#FFFDFC",
        foreground: "#2B2B2B",
        primary: {
          DEFAULT: "#E26D7C",
          foreground: "#FFFDFC"
        },
        secondary: {
          DEFAULT: "#FFE8E2",
          foreground: "#2B2B2B"
        },
        accent: {
          DEFAULT: "#7B4BFF",
          foreground: "#FFFDFC"
        },
        glow: {
          DEFAULT: "#FFB3C1"
        },
        muted: {
          DEFAULT: "#FFF4F1",
          foreground: "#6B6B6B"
        },
        border: "#F1D8D1",
        card: "#FFFFFF",
        input: "#F1D8D1",
        ring: "#E26D7C"
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "system-ui", "sans-serif"],
        display: ["var(--font-playfair)", "Georgia", "serif"]
      },
      boxShadow: {
        soft: "0 18px 55px rgba(43, 43, 43, 0.08)",
        blush: "0 22px 70px rgba(226, 109, 124, 0.22)",
        glow: "0 22px 80px rgba(123, 75, 255, 0.18)"
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.25rem",
        "3xl": "1.75rem"
      },
      keyframes: {
        floatSoft: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" }
        },
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(14px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        }
      },
      animation: {
        "float-soft": "floatSoft 7s ease-in-out infinite",
        "fade-up": "fadeUp 700ms ease-out both"
      }
    }
  },
  plugins: []
};

export default config;
