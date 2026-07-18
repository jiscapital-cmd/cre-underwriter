import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        gold: "#FFCC00",
        ink: "#FFCC00", // alias for gold — kept for existing text-ink/bg-ink usages
        panel: "#0A1F3D", // page background — deep navy
        card: "#0F2748", // card/panel background — one step lighter than page
        cardBorder: "rgba(255, 255, 255, 0.08)",
        silver: "#9FB2CC", // secondary text / silver accents
        navy: "#0A1F3D",
      },
    },
  },
  plugins: [],
};
export default config;
