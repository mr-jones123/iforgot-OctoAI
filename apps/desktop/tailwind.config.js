/** @type {import('tailwindcss').Config} */
// Tailwind v3 -- do NOT use @tailwindcss/postcss here
module.exports = {
	content: ["./src/renderer/**/*.{ts,tsx,html}"],
	darkMode: "class",
	theme: {
		extend: {
			fontFamily: {
				// Geist + Geist Mono for dashboard/software UIs. No Inter.
				sans: ["Geist", "system-ui", "sans-serif"],
				mono: ["Geist Mono", "JetBrains Mono", "monospace"],
			},
			colors: {
				// OctoAI palette: indigo-tinted near-black. Single accent: bright near-white CTA.
				// Derived from oklch(0.13 0.012 280) body + oklch(0.24 0.025 285) surfaces.
				accent: {
					DEFAULT: "#e2e8f8",
					hover: "#ffffff",
					muted: "rgba(226,232,248,0.10)",
				},
				surface: {
					base: "#0d0d14",
					raised: "#13131f",
					overlay: "#1c1c2e",
					border: "#2a2a40",
					muted: "#3d3d5c",
				},
				text: {
					primary: "#f0f0fa",
					secondary: "#9898b8",
					tertiary: "#5a5a7a",
				},
			},
			borderRadius: {
				card: "1rem",
				panel: "1.5rem",
			},
			boxShadow: {
				card: "0 20px 40px -15px rgba(0,0,0,0.5)",
				glass: "inset 0 1px 0 rgba(255,255,255,0.06)",
			},
			animation: {
				"pulse-slow": "pulse 3s cubic-bezier(0.4,0,0.6,1) infinite",
				shimmer: "shimmer 2s linear infinite",
				"grid-fade": "grid-fade 8s ease-in-out infinite alternate",
				float: "float 6s ease-in-out infinite",
			},
			keyframes: {
				shimmer: {
					"0%": { backgroundPosition: "-200% 0" },
					"100%": { backgroundPosition: "200% 0" },
				},
				"grid-fade": {
					"0%": { opacity: "0.3" },
					"100%": { opacity: "0.6" },
				},
				float: {
					"0%, 100%": { transform: "translateY(0px)" },
					"50%": { transform: "translateY(-8px)" },
				},
			},
		},
	},
	plugins: [],
};
