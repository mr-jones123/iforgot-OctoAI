/** @type {import('tailwindcss').Config} */
// Tailwind v3 — do NOT use @tailwindcss/postcss here
module.exports = {
	content: ["./src/renderer/**/*.{ts,tsx,html}"],
	darkMode: "class",
	theme: {
		extend: {
			fontFamily: {
				// Skill rule: Geist + Geist Mono for dashboard/software UIs. No Inter.
				sans: ["Geist", "system-ui", "sans-serif"],
				mono: ["Geist Mono", "JetBrains Mono", "monospace"],
			},
			colors: {
				// Base: Zinc (cool neutral). Single accent: burnt orange — not AI purple, not generic blue.
				accent: {
					DEFAULT: "#e85d2f",
					hover: "#d44f22",
					muted: "#e85d2f1a", // 10% opacity for subtle fills
				},
				// Off-black — NEVER pure #000000
				surface: {
					base: "#09090b", // zinc-950
					raised: "#18181b", // zinc-900
					overlay: "#27272a", // zinc-800
					border: "#3f3f46", // zinc-700
					muted: "#52525b", // zinc-600
				},
				text: {
					primary: "#fafafa", // zinc-50
					secondary: "#a1a1aa", // zinc-400
					tertiary: "#71717a", // zinc-500
				},
			},
			borderRadius: {
				// Skill: rounded-[2.5rem] for major containers
				card: "1rem",
				panel: "1.5rem",
			},
			boxShadow: {
				// Skill: tinted diffusion shadow — never neon outer glows
				card: "0 20px 40px -15px rgba(0,0,0,0.4)",
				// Liquid glass inner refraction border simulation
				glass: "inset 0 1px 0 rgba(255,255,255,0.06)",
			},
			animation: {
				"pulse-slow": "pulse 3s cubic-bezier(0.4,0,0.6,1) infinite",
				shimmer: "shimmer 2s linear infinite",
			},
			keyframes: {
				shimmer: {
					"0%": { backgroundPosition: "-200% 0" },
					"100%": { backgroundPosition: "200% 0" },
				},
			},
		},
	},
	plugins: [],
};
