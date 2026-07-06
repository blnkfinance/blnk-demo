import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

const config: Config = {
  darkMode: ["class"],
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      fontSize: {
        xs: "12px",
        sm: "14px",
        xl: "20px",
        "2xl": "24px",
      },
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        border: "hsl(var(--border))",
        "modal-overlay": "rgba(3, 7, 17, 0.05)",
        platform: {
          primary: {
            text: "var(--platform-primary-text)",
          },
          hover: {
            bg: "var(--platform-hover-bg)",
          },
          muted: "var(--platform-muted)",
          stroke: "var(--platform-stroke)",
          nav: {
            bg: "var(--platform-nav-bg)",
            text: {
              DEFAULT: "var(--platform-nav-text)",
              selected: "var(--platform-nav-text-selected)",
            },
          },
          main: {
            bg: "var(--platform-main-bg)",
          },
          bg: "var(--platform-bg)",
          "custom-green": "var(--platform-custom-green)",
          "custom-purple-void": "var(--platform-custom-purple-void)",
          "custom-red": "var(--platform-custom-red)",
          input: {
            "main-bg": "var(--platform-input-main-bg)",
            border: "var(--platform-input-border)",
            "border-hover": "var(--platform-input-border-hover)",
            "border-focus": "var(--platform-input-border-focus)",
          },
          "muted-secondary": "var(--platform-muted-secondary)",
          brand: {
            primary: "var(--platform-brand-primary)",
            "primary-muted": "var(--platform-brand-primary-muted)",
          },
          button: {
            "main-bg": "var(--platform-button-main-bg)",
            "text-color": "var(--platform-button-text-color)",
            "text-button": "var(--platform-button-text-button)",
          },
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        sans: [
          '"Inter Variable"',
          '"Inter Fallback"',
          "Helvetica",
          "sans-serif",
        ],
        pastiche: ['"Pastiche Grotesque"', "sans-serif"],
      },
    },
  },
  plugins: [tailwindcssAnimate],
};

export default config;
