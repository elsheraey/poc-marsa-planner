#!/usr/bin/env node
/**
 * One-off: generate a sample voiceover for a given voice + label.
 *
 * Usage:  node sample-voice.mjs <voice_id> <label>
 * Writes: demo/assets/voiceover.en.<label>.mp3
 *
 * Reuses the English script + model choice from tts.mjs so A/B samples
 * stay apples-to-apples with the canonical voiceover.en.mp3. Never logs
 * the API key.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ENV_PATH = resolve(__dirname, ".env");
const ASSETS = resolve(__dirname, "assets");
const TTS_SRC = readFileSync(resolve(__dirname, "tts.mjs"), "utf8");

const [, , voiceId, label] = process.argv;
if (!voiceId || !label) {
  console.error("usage: node sample-voice.mjs <voice_id> <label>");
  process.exit(2);
}

const EN_SCRIPT = TTS_SRC.match(/const EN_SCRIPT = `([\s\S]+?)`;/)?.[1];
if (!EN_SCRIPT) {
  throw new Error("could not extract EN_SCRIPT from tts.mjs");
}

const apiKey = (() => {
  const raw = readFileSync(ENV_PATH, "utf8");
  const m = /^ELEVENLABS_API_KEY\s*=\s*(.+?)\s*$/m.exec(raw);
  if (!m) throw new Error("ELEVENLABS_API_KEY not in demo/.env");
  return m[1].replace(/^['"]|['"]$/g, "");
})();

async function generate(model) {
  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
    {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text: EN_SCRIPT,
        model_id: model,
        voice_settings: { stability: 0.45, similarity_boost: 0.85, style: 0.15 },
      }),
    }
  );
  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    throw new Error(`${model} ${res.status}: ${errBody.slice(0, 200)}`);
  }
  return Buffer.from(await res.arrayBuffer());
}

const start = Date.now();
let buf;
try {
  buf = await generate("eleven_v3");
} catch (err) {
  if (/402|payment|paid_plan/i.test(err.message)) {
    console.warn(`sample-voice: v3 refused — falling back to multilingual_v2`);
    buf = await generate("eleven_multilingual_v2");
  } else {
    throw err;
  }
}

const outfile = resolve(ASSETS, `voiceover.en.${label}.mp3`);
writeFileSync(outfile, buf);
console.log(
  `sample-voice: ${label} (${voiceId.slice(0, 6)}…) → ${(buf.length / 1024).toFixed(
    1
  )} KB in ${((Date.now() - start) / 1000).toFixed(1)}s`
);
console.log(`  file: ${outfile}`);
