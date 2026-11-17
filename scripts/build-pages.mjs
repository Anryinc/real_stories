#!/usr/bin/env node
/**
 * Static sheet for GitHub Pages.
 *
 * Nitro's github-pages preset prerenders the game, then crashes on a second
 * SSR pass. The HTML is still available from the prerender server, mounted at
 * /narechenie/ because that is the project-site base. This writes it to
 * .output/public/index.html and exits 0 when that file is a real page.
 */
import { spawn } from "node:child_process";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { mergeAppEnv, projectRoot, readAppEnv } from "./with-app-env.mjs";

const root = projectRoot();
const outDir = join(root, ".output/public");

function runVite() {
  const env = mergeAppEnv(readAppEnv(root), {
    ...process.env,
    NITRO_PRESET: "github-pages",
    VITE_AUTH_ENABLED: "false",
  });
  return new Promise((resolve) => {
    const child = spawn("npx", ["vite", "build"], { cwd: root, env, stdio: "inherit" });
    child.on("exit", (code) => resolve(code ?? 1));
  });
}

const viteCode = await runVite();
const prerenderUrl = new URL("../node_modules/.nitro/prerender/index.mjs", import.meta.url);
const mod = await import(prerenderUrl.href);
const response = await mod.default.fetch(new Request("http://local/narechenie/"));
const html = await response.text();
if (response.status !== 200 || !html.includes("Наречение") || !html.includes("/narechenie/assets/")) {
  console.error(`[pages] prerender failed (${response.status}, ${html.length} bytes) after vite exit ${viteCode}`);
  process.exit(1);
}

await mkdir(outDir, { recursive: true });
await writeFile(join(outDir, "index.html"), html);
await writeFile(join(outDir, "404.html"), html);
await writeFile(join(outDir, ".nojekyll"), "");
await rm(join(outDir, "index"), { force: true });
console.log(`[pages] wrote ${join(outDir, "index.html")} (${html.length} bytes), vite exit ${viteCode}`);
