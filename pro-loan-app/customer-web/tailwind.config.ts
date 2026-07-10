import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#1E3A8A",
          dark: "#172554",
          light: "#3B82F6",
        },
        secondary: "#10B981",
        surface: {
          DEFAULT: "#F1F5F9",
          elevated: "#FFFFFF",
          card: "#F8FAFC",
        },
        border: "#E2E8F0",
        ink: "#1E293B",
        muted: "#64748B",
        accent: "#10B981",
        success: "#22C55E",
        warning: "#F59E0B",
        error: "#EF4444",
        info: "#3B82F6",
      },
      boxShadow: {
        glow: "0 0 32px rgba(16, 185, 129, 0.12)",
        card: "0 4px 24px rgba(15, 23, 42, 0.06)",
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
      },
    },
  },
  plugins: [],
};

export default config;
