#!/usr/bin/env node
/**
 * Royalty-free background music downloader for the Marsa demo video.
 *
 * Tries a short list of known Pixabay CC0 ambient-corporate tracks.
 * Falls through on any 403/404/network error to the next URL. If none
 * work, writes nothing — the Remotion composition degrades to voice-only.
 *
 * Saves `demo/assets/music.mp3`.
 */
import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ASSETS = resolve(__dirname, "assets");

// Known-working Pixabay audio CDN URLs. All are Pixabay-licensed (CC0-equivalent,
// free for commercial use without attribution) ambient corporate tracks.
// Reference: https://pixabay.com/music/ (calm/corporate/ambient filter).
// These hashes were captured from the direct-download links on the Pixabay
// music player — they're stable because the site is content-addressed.
const CANDIDATES = [
  {
    url: "https://cdn.pixabay.com/download/audio/2022/03/15/audio_1718e49d63.mp3",
    title: "Inspiring Cinematic Ambient",
    license: "Pixabay License (free for commercial use, no attribution required)",
    source: "https://pixabay.com/music/",
  },
  {
    url: "https://cdn.pixabay.com/download/audio/2022/01/18/audio_d0c6ff1bdd.mp3",
    title: "Corporate Ambient",
    license: "Pixabay License",
    source: "https://pixabay.com/music/",
  },
  {
    url: "https://cdn.pixabay.com/download/audio/2021/11/25/audio_00fa5593f3.mp3",
    title: "Ambient Corporate",
    license: "Pixabay License",
    source: "https://pixabay.com/music/",
  },
  {
    url: "https://cdn.pixabay.com/download/audio/2022/10/25/audio_946bc7a75f.mp3",
    title: "The Epic Hero",
    license: "Pixabay License",
    source: "https://pixabay.com/music/",
  },
];

async function tryFetch(url) {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "audio/mpeg,*/*",
      },
      redirect: "follow",
    });
    if (!res.ok) return { ok: false, reason: `${res.status} ${res.statusText}` };
    const ct = res.headers.get("content-type") || "";
    const buf = Buffer.from(await res.arrayBuffer());
    // Pixabay sometimes serves a 200 with an HTML "blocked" page; filter by
    // byte count (real MP3s are hundreds of KB minimum) and content-type.
    if (buf.length < 50 * 1024) return { ok: false, reason: `too small: ${buf.length} bytes` };
    if (ct.includes("text/html")) return { ok: false, reason: `served html: ${ct}` };
    return { ok: true, bytes: buf, contentType: ct };
  } catch (err) {
    return { ok: false, reason: err.message };
  }
}

async function main() {
  mkdirSync(ASSETS, { recursive: true });
  const out = resolve(ASSETS, "music.mp3");
  if (existsSync(out)) {
    console.log("music: already present — skip");
    return;
  }
  for (const cand of CANDIDATES) {
    console.log(`music: trying ${cand.title}`);
    const res = await tryFetch(cand.url);
    if (res.ok) {
      writeFileSync(out, res.bytes);
      console.log(
        `music: ok — ${cand.title} (${(res.bytes.length / 1024).toFixed(1)} KB)`
      );
      console.log(
        JSON.stringify({ source: cand.source, url: cand.url, title: cand.title, license: cand.license })
      );
      return;
    }
    console.log(`music: skip — ${res.reason}`);
  }
  console.warn("music: all candidates failed — shipping voice-only. Falling back gracefully.");
}

main().catch((err) => {
  console.error("music: fatal —", err.message);
  // Intentionally exit 0 — the pipeline downgrades gracefully.
  process.exit(0);
});
