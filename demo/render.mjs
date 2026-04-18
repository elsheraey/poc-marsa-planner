#!/usr/bin/env node
/**
 * Render wrapper for the Marsa demo. Detects which binary assets exist in
 * `assets/` and passes matching `hasVoice` boolean through `--props` to
 * Remotion so the composition doesn't 404 on a missing file.
 *
 * Arabic is deferred this pass — `node render.mjs ar` prints a
 * one-line notice and exits 0 so callers that chain render:ar don't
 * break. The English cut is the only production output right now.
 *
 * Usage:
 *   node render.mjs           # renders EN
 *   node render.mjs ar        # prints "AR deferred" and exits 0
 */
import { existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ASSETS = resolve(__dirname, "assets");

const lang = process.argv[2] === "ar" ? "ar" : "en";
if (lang === "ar") {
  console.log(
    "render: AR is deferred this pass — only the English Marsa composition " +
      "is wired in Root.tsx. Re-enable by restoring the MarsaAR Composition."
  );
  process.exit(0);
}

const outfile = resolve(__dirname, "out", "marsa-walkthrough-en.mp4");
const props = {
  hasVoice: existsSync(resolve(ASSETS, "voiceover.en.mp3")),
};

console.log("render: lang=en assets=" + JSON.stringify(props));
const start = Date.now();
const res = spawnSync(
  "npx",
  [
    "remotion",
    "render",
    "src/index.ts",
    "Marsa",
    outfile,
    "--props",
    JSON.stringify(props),
  ],
  { stdio: "inherit", cwd: __dirname }
);
const took = ((Date.now() - start) / 1000).toFixed(1);
console.log(`render: en done in ${took}s — ${outfile}`);
process.exit(res.status ?? 1);
