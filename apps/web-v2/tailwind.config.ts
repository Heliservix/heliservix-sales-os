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
        brand: {
          blue: "rgb(var(--color-brand-primary-blue) / <alpha-value>)",
          navy: "rgb(var(--color-brand-dark-navy) / <alpha-value>)",
          lightBlue: "rgb(var(--color-brand-light-blue) / <alpha-value>)",
          white: "rgb(var(--color-brand-white) / <alpha-value>)",
          lightGray: "rgb(var(--color-brand-light-gray) / <alpha-value>)"
        },
        status: {
          green: "rgb(var(--color-status-green) / <alpha-value>)",
          yellow: "rgb(var(--color-status-yellow) / <alpha-value>)",
          red: "rgb(var(--color-status-red) / <alpha-value>)"
        },
        aviation: {
          teal: "rgb(var(--color-aviation-teal) / <alpha-value>)",
          green: "rgb(var(--color-aviation-green) / <alpha-value>)",
          amber: "rgb(var(--color-aviation-amber) / <alpha-value>)",
          red: "rgb(var(--color-aviation-red) / <alpha-value>)",
          blue: "rgb(var(--color-aviation-blue) / <alpha-value>)"
        }
      },
      boxShadow: {
        panel: "0 18px 55px rgba(6, 27, 46, 0.08)",
        control: "0 1px 2px rgba(15, 23, 42, 0.08)"
      },
      fontFamily: {
        sans: [
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          "SF Pro Display",
          "SF Pro Text",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif"
        ],
        mono: [
          "JetBrains Mono",
          "SFMono-Regular",
          "Menlo",
          "Monaco",
          "Consolas",
          "Liberation Mono",
          "monospace"
        ]
      }
    }
  },
  plugins: []
};

export default config;
