import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        bank: {
          DEFAULT: "#0F766E",
          dark: "#115E59",
          light: "#14B8A6",
        },
        surface: {
          DEFAULT: "#ECFDF5",
          elevated: "#FFFFFF",
        },
        border: "#A7F3D0",
        ink: "#134E4A",
        muted: "#5B7C78",
        success: "#15803D",
        error: "#DC2626",
        warning: "#B45309",
      },
      fontFamily: {
        display: ["Georgia", "Times New Roman", "serif"],
      },
    },
  },
  plugins: [],
};

export default config;
