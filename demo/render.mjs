#!/usr/bin/env node
/**
 * Render wrapper for the Marsa demo. Detects which binary assets exist in
 * `assets/` and passes matching `hasVideo` / `hasVoice` / `hasMusic`
 * booleans through `--props` to Remotion so the composition doesn't 404
 * on a missing file.
 *
 * Usage:
 *   node render.mjs           # renders EN
 *   node render.mjs ar        # renders AR
 */
import { existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ASSETS = resolve(__dirname, "assets");

const lang = process.argv[2] === "ar" ? "ar" : "en";
const comp = lang === "ar" ? "MarsaAR" : "Marsa";
const outfile = resolve(__dirname, "out", `marsa-walkthrough-${lang}.mp4`);

const props = {
  lang,
  hasVideo: existsSync(resolve(ASSETS, "app-capture.webm")),
  hasVoice: existsSync(resolve(ASSETS, `voiceover.${lang}.mp3`)),
  hasMusic: existsSync(resolve(ASSETS, "music.mp3")),
};

console.log("render: lang=" + lang + " assets=" + JSON.stringify(props));
const start = Date.now();
const res = spawnSync(
  "npx",
  [
    "remotion",
    "render",
    "src/index.ts",
    comp,
    outfile,
    "--props",
    JSON.stringify(props),
  ],
  { stdio: "inherit", cwd: __dirname }
);
const took = ((Date.now() - start) / 1000).toFixed(1);
console.log(`render: ${lang} done in ${took}s — ${outfile}`);
process.exit(res.status ?? 1);
