import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        canvas: {
          DEFAULT: "rgb(var(--color-canvas) / <alpha-value>)",
          muted: "rgb(var(--color-canvas-muted) / <alpha-value>)"
        },
        ink: {
          DEFAULT: "rgb(var(--color-ink) / <alpha-value>)",
          muted: "rgb(var(--color-ink-muted) / <alpha-value>)",
          subtle: "rgb(var(--color-ink-subtle) / <alpha-value>)"
        },
        line: "rgb(var(--color-line) / <alpha-value>)",
        aviation: {
          teal: "rgb(var(--color-aviation-teal) / <alpha-value>)",
          green: "rgb(var(--color-aviation-green) / <alpha-value>)",
          amber: "rgb(var(--color-aviation-amber) / <alpha-value>)",
          red: "rgb(var(--color-aviation-red) / <alpha-value>)",
          blue: "rgb(var(--color-aviation-blue) / <alpha-value>)"
        }
      },
      boxShadow: {
        panel: "0 18px 55px rgba(15, 23, 42, 0.08)",
        control: "0 1px 2px rgba(15, 23, 42, 0.08)"
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "SF Pro Display",
          "SF Pro Text",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif"
        ]
      }
    }
  },
  plugins: []
};

export default config;
