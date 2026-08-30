import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: "#f6f7f9",
        panel: "#ffffff",
        line: "#e4e7ec",
        ink: {
          DEFAULT: "#101828",
          soft: "#475467",
          faint: "#98a2b3",
        },
        shell: {
          DEFAULT: "#101822",
          soft: "#1b2530",
          line: "#2a3542",
          text: "#9aa7b5",
        },
        brand: {
          DEFAULT: "#0f7a4a",
          soft: "#e7f4ed",
          dark: "#0a5c37",
        },
        warn: "#b54708",
        danger: "#b42318",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(16,24,40,0.05), 0 1px 3px rgba(16,24,40,0.04)",
      },
    },
  },
  plugins: [],
};

export default config;
