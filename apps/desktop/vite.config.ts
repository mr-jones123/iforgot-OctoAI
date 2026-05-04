import react from "@vitejs/plugin-react-swc";
import path from "path";
import { defineConfig } from "vite";

export default defineConfig({
	plugins: [react()],
	root: "src/renderer",
	base: "./",
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "src/renderer"),
			"@riza/shared": path.resolve(
				__dirname,
				"../../packages/shared/src/index.ts",
			),
		},
	},
	build: {
		outDir: path.resolve(__dirname, "dist/renderer"),
		emptyOutDir: true,
	},
	server: {
		port: 5173,
	},
});
