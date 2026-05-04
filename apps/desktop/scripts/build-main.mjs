import { build, context } from "esbuild";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const isWatch = process.argv.includes("--watch");

const config = {
	entryPoints: [
		resolve(root, "src/main/index.ts"),
		resolve(root, "src/main/preload.ts"),
	],
	bundle: true,
	platform: "node",
	target: "node20",
	format: "cjs",
	outdir: resolve(root, "dist/main"),
	external: [
		"electron", // provided by Electron runtime
		"node-pty", // native — must not be bundled
		"better-sqlite3",
	],
	alias: {
		"@riza/shared": resolve(root, "../../packages/shared/src/index.ts"),
	},
	sourcemap: true,
	logLevel: "info",
};

if (isWatch) {
	const ctx = await context(config);
	await ctx.watch();
	console.log("[main] watching for changes...");
} else {
	await build(config);
}
