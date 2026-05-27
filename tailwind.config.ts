import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#18202f",
        radar: "#0f766e",
        alert: "#e11d48",
        sun: "#f59e0b"
      },
      boxShadow: {
        soft: "0 12px 36px rgba(24, 32, 47, 0.08)"
      }
    }
  },
  plugins: []
};

export default config;
