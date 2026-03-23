import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        sidebar: {
          bg: "#1a1a2e",
          hover: "#16213e",
          active: "#0f3460",
          text: "#e2e8f0",
        },
      },
    },
  },
  plugins: [],
};

export default config;
