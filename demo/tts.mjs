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

const EN_SCRIPT = `Every Egyptian advisor answers the same question from every client: "Can I afford this?" Marsa makes the answer honest.

You enter the client's profile, goals, and scenarios once. Marsa runs ten thousand Monte Carlo paths on real Egyptian market data, inflation-adjusted, and tells the advisor — not just the probability of hitting the goal, but whether the goal is attainable, aspirational, or out of reach.

A six-million-pound house in twenty-thirty, funded by twenty thousand pounds a month, reads "out of reach" — because it is. Marsa tells the advisor what monthly contribution would close the gap, to the thousand pound, in real purchasing power.

Every screen works in Arabic. Every number, every date, every currency — localized, right-to-left, ready for the client meeting.

Marsa is a planning tool, not a robo-advisor. The human advisor owns the recommendation. We give them a better answer, faster.

Marsa. Egyptian planning, built honestly.`;

// Arabic translation by the build script. TRANSLATION-FLAG: reviewed for
// meaning but not native-checked — flagged in the commit message for a
// future native pass before this ships to a real client meeting.
const AR_SCRIPT = `كل مستشار مالي في مصر يجيب على نفس السؤال من كل عميل: "هل أستطيع تحمل هذا؟" مرسى يجعل الإجابة صادقة.

تُدخِل ملف العميل، أهدافه، وسيناريوهاته مرة واحدة. مرسى يُشغِّل عشرة آلاف مسار من محاكاة مونت كارلو على بيانات السوق المصري الحقيقية، مُعدَّلة للتضخم، ويُخبر المستشار ليس فقط احتمال تحقيق الهدف، بل أيضًا إن كان الهدف قابلًا للتحقيق، طموحًا، أم خارج النطاق.

منزل بستة ملايين جنيه في عام ألفين وثلاثين، يُموَّل بعشرين ألف جنيه شهريًا، يُصنَّف "خارج النطاق" — لأنه فعلًا كذلك. مرسى يُخبر المستشار ما المساهمة الشهرية التي تُغلق الفجوة، بدقة آلاف الجنيهات، بالقوة الشرائية الحقيقية.

كل شاشة تعمل بالعربية. كل رقم، كل تاريخ، كل عملة — محلية، من اليمين لليسار، جاهزة لاجتماع العميل.

مرسى هو أداة تخطيط، وليس مستشارًا آليًا. المستشار البشري يملك التوصية. نحن نمنحه إجابة أفضل، وأسرع.

مرسى. تخطيط مصري، بُني بأمانة.`;

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
