import type { Config } from "tailwindcss";
export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        stage: { DEFAULT: "#0b1a30", 2: "#132a4d", 3: "#1b365d" },
        gold: { DEFAULT: "#ffd66b", deep: "#f5b301", ink: "#5a3a00" },
        ink: "#1b365d",
        good: "#1f6f3a",
        bad: "#a1261b",
      },
    },
  },
  plugins: [],
} satisfies Config;
