#!/usr/bin/env node
/**
 * ElevenLabs text-to-speech generator for the Marsa demo video.
 *
 * Reads ELEVENLABS_API_KEY from demo/.env (simple line-split — no dotenv
 * dep), then POSTs the English narration script to the ElevenLabs v3
 * model. Saves:
 *   - demo/assets/voiceover.en.<section_id>.mp3  (one per section)
 *   - demo/assets/voiceover.en.mp3               (concatenated whole,
 *                                                 legacy consumer)
 *   - demo/assets/voiceover.manifest.json        (per-section ms + total)
 *
 * The section split is what lets the Remotion composition lock
 * screenshot visuals to each spoken beat (see demo/src/Marsa.tsx).
 * `EN_SCRIPT` is kept as the concatenated whole for backward compat; it
 * is derived from `SECTIONS` so the two can never drift.
 *
 * Arabic is deferred this pass (render:ar is not invoked); AR_SCRIPT is
 * retained as a comment-locked reference for the next Arabic-enabled
 * cut.
 *
 * Character budget: ~1100 chars for EN. Splitting into 9 sections does
 * not increase billable chars — total remains ~1100 / 10,000 free tier.
 *
 * SAFETY: the API key is never echoed to stdout, never written to any
 * file outside demo/.env, never logged as part of an error. If a request
 * fails the error body is surfaced, but the Authorization header is not.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, statSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";
import { SECTIONS as SHARED_SECTIONS } from "./src/sections.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ASSETS = resolve(__dirname, "assets");
const ENV_PATH = resolve(__dirname, ".env");

// Voice IDs.
//   EN — Brian ("Deep, Resonant and Comforting"). Chose this over Sarah /
//        Eric after A/B — Brian's register lands the gravitas the
//        financial-planning narration wants. Free-tier-accessible.
const EN_VOICE = "nPczCjzI2devNBz1zQrb"; // Brian

// Model selection. v3 gives Brian more natural pacing on the English
// narration; on free-tier 402s we fall back to multilingual_v2 so the
// pipeline still lands usable MP3s.
const EN_MODEL = "eleven_v3";

// ---------------------------------------------------------------------
// Section-keyed English script — re-exported from the shared source of
// truth (demo/src/sections.mjs) so captions and voiceover are one
// string each. Any edit to the narration lives there; both this module
// and the Remotion composition read the same array.
//
// Each entry ends on a natural breath point so the screenshot cut
// between sections is also an audible silence (≈60–120 ms). The
// Remotion composition measures each MP3's duration via ffprobe and
// uses the cumulative start frames as <Sequence from=...> offsets, so
// each section's visual swaps exactly when its sentence ends.
// ---------------------------------------------------------------------
export const SECTIONS = SHARED_SECTIONS;

// Derived — concatenated whole, preserved for any legacy consumer that
// still expects a single block of narration. Blank line between sections
// gives the TTS engine a small pause when the whole-script variant is
// synthesised (not used by the current pipeline, but kept so a future
// fallback render can drop back to a single MP3).
export const EN_SCRIPT = SECTIONS.map((s) => s.text).join("\n\n");

// Arabic — deferred this pass. Left here (commented) so the next
// Arabic-enabled cut can be slotted in without re-translating. The
// translation below has been reviewed for meaning but not native-
// checked; flagged TRANSLATION-FLAG in the previous commit history for
// a future native pass before this ships to a real client meeting.
// eslint-disable-next-line no-unused-vars
const AR_SCRIPT_DEFERRED = `عمر عمره 42 عامًا. مدير أول في شركة متعددة الجنسيات. متزوج ولديه طفلان في السابعة والعاشرة. دخل الأسرة حوالي 155 ألف جنيه شهريًا. لديه 3 ملايين جنيه مستثمرة، ويدّخر 40 ألف جنيه شهريًا.

ثلاثة أهداف. شقة في القاهرة الجديدة بحلول 2028. تعليم جامعي للطفلين في 2033. التقاعد في سن الستين.

لكن "الجامعة" تعني أشياءً مختلفة. الجامعة الأمريكية. أو جامعات خاصة من الدرجة المتوسطة مثل الألمانية والبريطانية. أو جامعة القاهرة الحكومية. الأرقام ليست متساوية. لذا يُشغِّل المستشار ثلاثة سيناريوهات جنبًا إلى جنب.

السيناريو الأول — الجامعة الأمريكية. أربعة ملايين جنيه للطفلين. مرسى: خارج النطاق. التقاعد يبعد تسعة ملايين عما يحتاجه عمر.

السيناريو الثاني — الألمانية أو البريطانية. ثلاثة ملايين. ما زال خارج النطاق. يبعد سبعة ملايين.

السيناريو الثالث — جامعة القاهرة. خمسمائة ألف جنيه. مرسى: طموح. الوسيط يتخطى الهدف بالكاد؛ السيناريو المتشائم يقصر بمليونين.

اقتراح مرسى: لو ادّخر عمر 60 ألف جنيه شهريًا بدلًا من 40 ألفًا، السيناريوهات الثلاثة تصبح قابلة للتحقيق. أو يُؤجِّل التقاعد إلى 63.

ثلاثة خيارات. محادثة صادقة واحدة حول ما تحتاجه خطته فعلًا.

مرسى. تخطيط مصري، مبني للمحادثة الحقيقية.`;

// ffprobe ships inside Remotion's compositor binary — no extra dep.
const FFPROBE = resolve(
  __dirname,
  "node_modules/@remotion/compositor-linux-x64-gnu/ffprobe"
);
const FFMPEG = resolve(
  __dirname,
  "node_modules/@remotion/compositor-linux-x64-gnu/ffmpeg"
);

function readApiKey() {
  if (!existsSync(ENV_PATH)) {
    throw new Error(`demo/.env missing at ${ENV_PATH}`);
  }
  const raw = readFileSync(ENV_PATH, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const m = /^\s*ELEVENLABS_API_KEY\s*=\s*(.+?)\s*$/.exec(line);
    if (m) {
      // Strip a matched pair of leading+trailing quotes (' or ") from the
      // value. Uses a single regex capture so escaping rules stay trivial
      // and replaceAll isn't applicable (anchors ^/$ only match once).
      const stripped = /^(['"])(.*)\1$/.exec(m[1]);
      return stripped ? stripped[2] : m[1];
    }
  }
  throw new Error("ELEVENLABS_API_KEY not found in demo/.env");
}

async function tts({ apiKey, voiceId, modelId, text, outfile }) {
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
      "Content-Type": "application/json",
      Accept: "audio/mpeg",
    },
    body: JSON.stringify({
      text,
      model_id: modelId,
      voice_settings: { stability: 0.45, similarity_boost: 0.85, style: 0.15 },
    }),
  });
  if (!res.ok) {
    // NEVER leak the Authorization header; the error body is enough.
    const errBody = await res.text().catch(() => "");
    throw new Error(
      `tts ${voiceId} [${modelId}]: ${res.status} ${res.statusText} ${errBody.slice(0, 200)}`
    );
  }
  const buf = Buffer.from(await res.arrayBuffer());
  writeFileSync(outfile, buf);
  const charsRemaining = res.headers.get("character-count-remaining");
  return {
    bytes: buf.length,
    chars: text.length,
    remaining: charsRemaining,
  };
}

// Query ffprobe for the duration in milliseconds. Rounding to the
// nearest ms is enough for frame alignment at 30fps (33 ms/frame).
function probeDurationMs(path) {
  if (!existsSync(FFPROBE)) {
    throw new Error(`ffprobe not found at ${FFPROBE}`);
  }
  const res = spawnSync(
    FFPROBE,
    [
      "-v",
      "error",
      "-show_entries",
      "format=duration",
      "-of",
      "default=noprint_wrappers=1:nokey=1",
      path,
    ],
    { encoding: "utf8" }
  );
  if (res.status !== 0) {
    throw new Error(`ffprobe failed on ${path}: ${res.stderr}`);
  }
  const secs = Number.parseFloat(res.stdout.trim());
  if (!Number.isFinite(secs)) {
    throw new TypeError(`ffprobe returned non-numeric duration for ${path}: ${res.stdout}`);
  }
  return Math.round(secs * 1000);
}

// Concatenate the per-section MP3s into a single whole-narration track
// via ffmpeg's `concat` demuxer. This is what the Remotion composition
// wires as a single <Audio>; section visuals use the manifest's
// cumulative offsets so sync is exact.
function concatMp3s(sectionPaths, outPath) {
  const listPath = resolve(ASSETS, "_concat.list");
  // Escape single quotes for ffmpeg's concat list format: `'` → `'\''`.
  const escape = (p) => p.replaceAll("'", String.raw`'\''`);
  const body = sectionPaths.map((p) => `file '${escape(p)}'`).join("\n");
  writeFileSync(listPath, body + "\n");
  const res = spawnSync(
    FFMPEG,
    [
      "-y",
      "-f",
      "concat",
      "-safe",
      "0",
      "-i",
      listPath,
      "-c",
      "copy",
      outPath,
    ],
    { encoding: "utf8" }
  );
  if (res.status !== 0) {
    throw new Error(`ffmpeg concat failed: ${res.stderr}`);
  }
}

// Tiered model fallback. `eleven_v3` is the best-sounding model but is
// rate- and quota-bounded on the free tier; `eleven_turbo_v2_5` uses
// ~0.5x credits and is the cheapest usable option; `eleven_multilingual_v2`
// is the pre-v3 default. The fallback hops forward on any of:
//   - 402 paid_plan_required (v3 not in tier)
//   - 401 quota_exceeded (monthly budget blown; only cheaper models help)
//   - 429 rate limited on the specific model
// so a partial-quota month still lands all 9 sections.
const MODEL_CHAIN = [EN_MODEL, "eleven_turbo_v2_5", "eleven_multilingual_v2"];
const FALLBACK_RE =
  /402|paid_plan_required|payment_required|quota_exceeded|429|rate_limit/i;

// Reuse path — returns a section output when the MP3 is already on disk
// (idempotent across partial-quota re-runs), else null so the caller
// synthesises it.
function reuseSection(s, outfile) {
  if (!existsSync(outfile)) return null;
  const ms = probeDurationMs(outfile);
  const bytes = statSync(outfile).size;
  console.log(
    `tts: ${s.id} reused — ${(bytes / 1024).toFixed(1)} KB · ${ms} ms (on-disk, no API call)`
  );
  return {
    id: s.id,
    file: `voiceover.en.${s.id}.mp3`,
    duration_ms: ms,
    bytes,
    chars: s.text.length,
    reused: true,
  };
}

// Try each model in MODEL_CHAIN; return { res, modelUsed } on success
// or throw after exhausting the chain.
async function synthesiseSection({ apiKey, s, outfile }) {
  for (const modelId of MODEL_CHAIN) {
    try {
      const res = await tts({
        apiKey,
        voiceId: EN_VOICE,
        modelId,
        text: s.text,
        outfile,
      });
      return { res, modelUsed: modelId };
    } catch (err) {
      if (FALLBACK_RE.test(err.message)) {
        console.warn(
          `tts: ${s.id} ${modelId} refused (${err.message.slice(0, 80)}…) — trying next model`
        );
        continue;
      }
      throw err;
    }
  }
  throw new Error(`tts: ${s.id} all models exhausted`);
}

async function main() {
  mkdirSync(ASSETS, { recursive: true });
  const apiKey = readApiKey();
  const totalStart = Date.now();

  console.log(
    `tts: EN → Brian (${EN_VOICE.slice(0, 6)}…) · model ${EN_MODEL} · ${SECTIONS.length} sections`
  );

  const sectionOutputs = [];
  let totalChars = 0;
  let lastRemaining = null;
  for (const s of SECTIONS) {
    const outfile = resolve(ASSETS, `voiceover.en.${s.id}.mp3`);
    const reused = reuseSection(s, outfile);
    if (reused) {
      sectionOutputs.push(reused);
      continue;
    }
    const sStart = Date.now();
    const { res, modelUsed } = await synthesiseSection({ apiKey, s, outfile });
    const ms = probeDurationMs(outfile);
    sectionOutputs.push({
      id: s.id,
      file: `voiceover.en.${s.id}.mp3`,
      duration_ms: ms,
      bytes: res.bytes,
      chars: res.chars,
    });
    totalChars += res.chars;
    if (res.remaining) lastRemaining = res.remaining;
    console.log(
      `tts: ${s.id} ok — ${(res.bytes / 1024).toFixed(1)} KB · ${ms} ms · ${res.chars} chars · model ${modelUsed} · ${((Date.now() - sStart) / 1000).toFixed(1)}s`
    );
  }

  // Concatenated whole — both for the Remotion composition's <Audio>
  // (one track that plays continuously) and as the legacy
  // voiceover.en.mp3 filename.
  const concatPath = resolve(ASSETS, "voiceover.en.mp3");
  concatMp3s(
    sectionOutputs.map((s) => resolve(ASSETS, s.file)),
    concatPath
  );
  const totalMs = probeDurationMs(concatPath);
  console.log(`tts: concat ok — voiceover.en.mp3 · ${totalMs} ms`);

  // Manifest — what Remotion reads to derive frame offsets. `total_ms`
  // is the ffprobe-measured duration of the concatenated track, not the
  // sum of section durations (those differ by the concat demuxer's
  // frame-boundary rounding by a few ms — the concat measurement is the
  // one the <Audio> plays against, so it's the one we trust).
  const manifest = {
    en: {
      voice: EN_VOICE,
      model: EN_MODEL,
      total_ms: totalMs,
      sum_of_sections_ms: sectionOutputs.reduce((s, x) => s + x.duration_ms, 0),
      sections: sectionOutputs.map(({ id, file, duration_ms }) => ({
        id,
        file,
        duration_ms,
      })),
    },
  };
  const manifestPath = resolve(ASSETS, "voiceover.manifest.json");
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  // Also drop a copy inside src/ so the Remotion composition can `import`
  // it statically (ESM JSON imports). Both are gitignored — the src/ one
  // is listed under `demo/src/voiceover.manifest.json` in .gitignore.
  const manifestSrcPath = resolve(__dirname, "src", "voiceover.manifest.json");
  writeFileSync(manifestSrcPath, JSON.stringify(manifest, null, 2));

  const total = ((Date.now() - totalStart) / 1000).toFixed(1);
  console.log(
    `tts: done in ${total}s — voice ${EN_VOICE}, total ${totalChars} chars, ${totalMs} ms`
  );
  // Machine-readable final line (grep-target for the caller).
  console.log(
    JSON.stringify({
      en_voice: EN_VOICE,
      en_chars: totalChars,
      total_ms: totalMs,
      remaining: lastRemaining,
    })
  );
}

// Only auto-run when invoked directly (`node tts.mjs`); skip when
// imported so callers (e.g. capture.ts reading SECTIONS) don't trigger
// a synthesis pass. Uses top-level await so a thrown error surfaces via
// the process exit code without a promise-chain .catch.
const invokedAsScript =
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href;
if (invokedAsScript) {
  try {
    await main();
  } catch (err) {
    // err.message is safe — we never include the API key in error bodies.
    console.error("tts: fatal —", err.message);
    process.exit(1);
  }
}
