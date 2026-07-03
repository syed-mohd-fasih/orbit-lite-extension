/**
 * Build script — bundles each extension entry point into dist/ and copies the
 * static assets (manifest, popup html/css). Run `node build.mjs` or `--watch`.
 *
 *   src/content/index.ts   -> dist/content.js   (injected into portal pages)
 *   src/background/index.ts -> dist/background.js (service worker)
 *   src/popup/index.ts     -> dist/popup.js      (popup UI)
 *
 * Load unpacked from the dist/ folder in chrome://extensions.
 */
import * as esbuild from "esbuild";
import { cp, mkdir } from "node:fs/promises";

const watch = process.argv.includes("--watch");

const options = {
	entryPoints: {
		content: "src/content/index.ts",
		background: "src/background/index.ts",
		popup: "src/popup/index.ts",
	},
	outdir: "dist",
	bundle: true,
	format: "iife", // extension scripts run as plain scripts, not ES modules
	target: "chrome110",
	sourcemap: true,
	logLevel: "info",
};

async function copyStatic() {
	await mkdir("dist", { recursive: true });
	await cp("manifest.json", "dist/manifest.json");
	await cp("src/popup/popup.html", "dist/popup.html");
	await cp("src/popup/popup.css", "dist/popup.css");
	await cp("icons", "dist/icons", { recursive: true }).catch(() => {});
}

await copyStatic();

if (watch) {
	const ctx = await esbuild.context(options);
	await ctx.watch();
	console.log("watching…");
} else {
	await esbuild.build(options);
	console.log("build complete → dist/");
}
