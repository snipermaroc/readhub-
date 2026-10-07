import type { Config } from "tailwindcss"

export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: { "2xl": "1536px" },
    },
    extend: {
      fontFamily: {
        headline: ["'Plus Jakarta Sans'", "system-ui", "sans-serif"],
        body: ["Inter", "system-ui", "sans-serif"],
        label: ["Inter", "system-ui", "sans-serif"],
        sans: ["Inter", "system-ui", "sans-serif"],
        display: ["'Plus Jakarta Sans'", "system-ui", "sans-serif"],
      },
      colors: {
        primary: {
          DEFAULT: "#006769",
          hover: "#005052",
          container: "#b4f4e7",
          foreground: "#ffffff",
          "on-container": "#00201a",
        },
        "primary-container": "#b4f4e7",
        "on-primary": "#ffffff",
        "on-primary-container": "#00201a",
        secondary: {
          DEFAULT: "#555d81",
          foreground: "#ffffff",
        },
        surface: {
          DEFAULT: "#f7f9fb",
          container: "#eceef0",
          "container-low": "#f2f4f6",
          "container-high": "#e6e8ea",
          "container-highest": "#e0e3e5",
          "container-lowest": "#ffffff",
        },
        "surface-container": "#eceef0",
        "surface-container-low": "#f2f4f6",
        "surface-container-high": "#e6e8ea",
        "surface-container-highest": "#e0e3e5",
        "surface-container-lowest": "#ffffff",
        "on-surface": "#191c1e",
        "on-surface-variant": "#3b494c",
        outline: "#6b7a7d",
        "outline-variant": "#bac9cd",
        background: "#f7f9fb",
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        foreground: "hsl(var(--foreground))",
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        success: {
          DEFAULT: "#15803d",
          foreground: "#ffffff",
        },
      },
      borderRadius: {
        "2xl": "1rem",
        xl: "0.75rem",
        lg: "0.5rem",
        md: "0.375rem",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config
