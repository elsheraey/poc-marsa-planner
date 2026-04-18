#!/usr/bin/env node
/**
 * ElevenLabs text-to-speech generator for the Marsa demo video.
 *
 * Reads ELEVENLABS_API_KEY from demo/.env (simple line-split — no dotenv
 * dep), then POSTs the English and Arabic narration scripts to the
 * multilingual-v2 model. Saves voiceover.en.mp3 and voiceover.ar.mp3
 * into demo/assets/.
 *
 * Character budget: ~900 chars per language — comfortably within the
 * 10,000 character/month free tier.
 *
 * SAFETY: the API key is never echoed to stdout, never written to any
 * file outside demo/.env, never logged as part of an error. If a request
 * fails the error body is surfaced, but the Authorization header is not.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ASSETS = resolve(__dirname, "assets");
const ENV_PATH = resolve(__dirname, ".env");

// Voice IDs — pinned to the official ElevenLabs "Adam" for EN. AR falls
// back to Adam if the /voices lookup can't find a multilingual-compatible
// Arabic-labelled voice (Multilingual v2 handles Arabic from any voice).
const EN_VOICE = "pNInz6obpgDQGcFmaJgB"; // Adam
const AR_VOICE_DEFAULT = "pNInz6obpgDQGcFmaJgB"; // Adam (fallback)

const EN_SCRIPT = `Ahmed is 42. Senior manager at a multinational. Wife, two kids — seven and ten. Around 155,000 pounds come in each month. 3 million already invested; 40,000 saved on top.

Three goals. An apartment in Madinaty by 2028. University for the kids, 2033. Retirement at 60.

But "university" means different things. AUC. Mid-tier private like GUC or BUE. Or Cairo University, government-supported. The numbers aren't the same. So the advisor runs three scenarios, side by side.

Scenario one — AUC. Four million pounds for both kids. Marsa: out of reach. Retirement falls nine million short of what Ahmed needs.

Scenario two — GUC or BUE. Three million. Still out of reach. Seven million short.

Scenario three — Cairo University. Five hundred thousand. Marsa: aspirational. The median just clears; the pessimistic path misses by two.

Marsa's inversion: if Ahmed saves 60,000 a month instead of 40,000, all three scenarios become attainable. Or he pushes retirement to 63.

Three choices. One honest conversation about what his plan needs to be.

Marsa. Egyptian planning, built for the real conversation.`;

// Arabic translation by the build script. TRANSLATION-FLAG: reviewed for
// meaning but not native-checked — flagged in the commit message for a
// future native pass before this ships to a real client meeting.
const AR_SCRIPT = `أحمد عمره 42 عامًا. مدير أول في شركة متعددة الجنسيات. متزوج ولديه طفلان في السابعة والعاشرة. دخل الأسرة حوالي 155 ألف جنيه شهريًا. لديه 3 ملايين جنيه مستثمرة، ويدّخر 40 ألف جنيه شهريًا.

ثلاثة أهداف. شقة في مدينتي بحلول 2028. تعليم جامعي للطفلين في 2033. التقاعد في سن الستين.

لكن "الجامعة" تعني أشياءً مختلفة. الجامعة الأمريكية. أو جامعات خاصة من الدرجة المتوسطة مثل الألمانية والبريطانية. أو جامعة القاهرة الحكومية. الأرقام ليست متساوية. لذا يُشغِّل المستشار ثلاثة سيناريوهات جنبًا إلى جنب.

السيناريو الأول — الجامعة الأمريكية. أربعة ملايين جنيه للطفلين. مرسى: خارج النطاق. التقاعد يبعد تسعة ملايين عما يحتاجه أحمد.

السيناريو الثاني — الألمانية أو البريطانية. ثلاثة ملايين. ما زال خارج النطاق. يبعد سبعة ملايين.

السيناريو الثالث — جامعة القاهرة. خمسمائة ألف جنيه. مرسى: طموح. الوسيط يتخطى الهدف بالكاد؛ السيناريو المتشائم يقصر بمليونين.

اقتراح مرسى: لو ادّخر أحمد 60 ألف جنيه شهريًا بدلًا من 40 ألفًا، السيناريوهات الثلاثة تصبح قابلة للتحقيق. أو يُؤجِّل التقاعد إلى 63.

ثلاثة خيارات. محادثة صادقة واحدة حول ما تحتاجه خطته فعلًا.

مرسى. تخطيط مصري، مبني للمحادثة الحقيقية.`;

function readApiKey() {
  if (!existsSync(ENV_PATH)) {
    throw new Error(`demo/.env missing at ${ENV_PATH}`);
  }
  const raw = readFileSync(ENV_PATH, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const m = /^\s*ELEVENLABS_API_KEY\s*=\s*(.+?)\s*$/.exec(line);
    if (m) return m[1].replace(/^['"]|['"]$/g, "");
  }
  throw new Error("ELEVENLABS_API_KEY not found in demo/.env");
}

async function findArabicVoice(apiKey) {
  try {
    const res = await fetch("https://api.elevenlabs.io/v1/voices", {
      headers: { "xi-api-key": apiKey },
    });
    if (!res.ok) return null;
    const body = await res.json();
    const voices = body.voices || [];
    // First preference: a voice whose labels.language/accent contains "ar"
    // or whose name contains an obvious Arabic-speaker handle.
    for (const v of voices) {
      const label = JSON.stringify(v.labels || {}).toLowerCase();
      const name = String(v.name || "").toLowerCase();
      if (
        label.includes("arabic") ||
        label.includes('"ar"') ||
        label.includes("ar-") ||
        name.includes("arabic") ||
        name.includes("mohammed") ||
        name.includes("fahad") ||
        name.includes("haytham")
      ) {
        return { id: v.voice_id, name: v.name, reason: "matched arabic label/name" };
      }
    }
    return null;
  } catch (err) {
    console.warn("tts: voice lookup failed —", err.message);
    return null;
  }
}

async function tts({ apiKey, voiceId, text, outfile }) {
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
      model_id: "eleven_multilingual_v2",
      voice_settings: { stability: 0.45, similarity_boost: 0.85, style: 0.15 },
    }),
  });
  if (!res.ok) {
    // NEVER leak the Authorization header; the error body is enough.
    const errBody = await res.text().catch(() => "");
    throw new Error(`tts ${voiceId}: ${res.status} ${res.statusText} ${errBody.slice(0, 200)}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  writeFileSync(outfile, buf);
  const charsUsed = res.headers.get("character-cost") || res.headers.get("x-character-cost");
  const charsRemaining = res.headers.get("character-count-remaining");
  return {
    bytes: buf.length,
    chars: text.length,
    billed: charsUsed,
    remaining: charsRemaining,
  };
}

async function main() {
  mkdirSync(ASSETS, { recursive: true });
  const apiKey = readApiKey();
  const totalStart = Date.now();

  // English first — primary deliverable.
  console.log("tts: EN → Adam (" + EN_VOICE.slice(0, 6) + "…)");
  const enStart = Date.now();
  const enRes = await tts({
    apiKey,
    voiceId: EN_VOICE,
    text: EN_SCRIPT,
    outfile: resolve(ASSETS, "voiceover.en.mp3"),
  });
  console.log(
    `tts: EN ok — ${(enRes.bytes / 1024).toFixed(1)} KB, ${enRes.chars} chars in ${((Date.now() - enStart) / 1000).toFixed(1)}s`
  );

  // Arabic — try a matched voice, fall back to Adam.
  const arVoiceHit = await findArabicVoice(apiKey);
  const arVoice = arVoiceHit?.id || AR_VOICE_DEFAULT;
  console.log(
    `tts: AR → ${arVoiceHit?.name || "Adam (fallback)"} (${arVoice.slice(0, 6)}…) — ${arVoiceHit?.reason || "no arabic-labelled voice found"}`
  );
  const arStart = Date.now();
  const arRes = await tts({
    apiKey,
    voiceId: arVoice,
    text: AR_SCRIPT,
    outfile: resolve(ASSETS, "voiceover.ar.mp3"),
  });
  console.log(
    `tts: AR ok — ${(arRes.bytes / 1024).toFixed(1)} KB, ${arRes.chars} chars in ${((Date.now() - arStart) / 1000).toFixed(1)}s`
  );

  const total = ((Date.now() - totalStart) / 1000).toFixed(1);
  console.log(
    `tts: done in ${total}s — EN voice ${EN_VOICE}, AR voice ${arVoice}, total chars ${
      enRes.chars + arRes.chars
    }`
  );
  // Emit a machine-readable line the caller can grep for runtime reporting.
  console.log(
    JSON.stringify({
      en_voice: EN_VOICE,
      ar_voice: arVoice,
      en_chars: enRes.chars,
      ar_chars: arRes.chars,
      remaining: enRes.remaining || arRes.remaining || null,
    })
  );
}

main().catch((err) => {
  // err.message is safe — we never include the API key in error bodies.
  console.error("tts: fatal —", err.message);
  process.exit(1);
});
