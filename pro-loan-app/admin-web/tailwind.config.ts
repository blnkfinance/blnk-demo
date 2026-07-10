import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#1E3A5F",
          dark: "#152A45",
          light: "#2D5A8E",
        },
        surface: {
          DEFAULT: "#D4DEE8",
          elevated: "#FFFFFF",
        },
        border: "#CBD5E1",
        ink: "#0F172A",
        muted: "#64748B",
        accent: "#3B82F6",
        success: "#16A34A",
        warning: "#D97706",
        error: "#DC2626",
        info: "#3B82F6",
      },
    },
  },
  plugins: [],
};

export default config;
