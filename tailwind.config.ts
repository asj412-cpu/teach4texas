import type { Config } from "tailwindcss";

export default {
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
        t4t: {
          navy: "#1B365D",
          burnt: "#BF5700",
          green: "#548235",
          gold: "#BF8700",
          white: "#FFFFFF",
          lightBlue: "#E6F0FA",
          lightGray: "#F8F9FA",
          darkText: "#2D2D2D",
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
