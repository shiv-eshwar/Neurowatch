import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#0E1014",
        paper: "#F4EDE1",
        mist: "#BEB7AB",
        line: "rgba(255,255,255,0.08)"
      },
      fontFamily: {
        display: ["var(--font-fraunces)"],
        body: ["var(--font-geist-sans)"],
        mono: ["var(--font-geist-mono)"]
      },
      boxShadow: {
        halo: "0 30px 80px rgba(0, 0, 0, 0.28)"
      },
      backgroundImage: {
        grain:
          "radial-gradient(circle at 10% 20%, rgba(255,255,255,0.04), transparent 30%), radial-gradient(circle at 80% 30%, rgba(255,255,255,0.03), transparent 24%), radial-gradient(circle at 40% 75%, rgba(255,255,255,0.02), transparent 32%)"
      }
    }
  },
  plugins: []
};

export default config;
