import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          blue: "#12328c",
          gold: "#f4b400",
          red: "#b3101c",
        },
      },
    },
  },
  plugins: [],
};
export default config;
