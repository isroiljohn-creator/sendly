import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        bf: {
          page: "#E8E8E8",
          card: "#FFFFFF",
          dark: "#000000",
          accent: "#C7F33C",
          "accent-dark": "#1A2906",
          "accent-light": "#9BC92E",
          subtle: "#F0F0F0",
          hover: "#F9F9F7",
          text: "#000000",
          "text-secondary": "#595959",
          "text-tertiary": "#707070",
          green: "#16A34A",
          red: "#DC2626",
        },
      },
      borderRadius: {
        'card': '28px',
        'inner': '14px',
        'inner-lg': '20px',
        'btn': '100px',
        'btn-block': '14px',
        'form': '14px',
      },
      fontFamily: {
        sans: ["var(--font-inter)", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
