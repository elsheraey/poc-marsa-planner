/**
 * Single source of truth for the Marsa demo narration + captions.
 *
 * Both `demo/tts.mjs` (voiceover generator) and `demo/src/Marsa.tsx`
 * (Remotion composition) import this file. The on-screen caption text
 * is character-identical to the voiceover text so when a later pass
 * regenerates audio, audio and captions stay in sync with zero manual
 * reconciliation.
 *
 * Format: `.mjs` so both the ESM TypeScript bundler (Remotion) and the
 * Node ESM runner (tts.mjs) can consume it with a plain `import`. Pure
 * data - no side effects.
 */
export const SECTIONS = [
  {
    id: "01_intro",
    text: "Omar is 42. Senior manager at a multinational. Wife, two kids, seven and ten. Around 155,000 pounds come in each month. 3 million already invested, 40,000 saved on top.",
  },
  {
    id: "02_goals",
    text: "Three goals. An apartment in New Cairo by 2028. University for the kids in 2033. Retirement at 60.",
  },
  {
    id: "03_setup",
    text: 'But what Omar wants isn\'t just "which university." It\'s a whole lifestyle. So the advisor runs three scenarios side by side. Each one a different life path.',
  },
  {
    id: "04_scenario1",
    text: 'Scenario one. "Everything I want." AUC for both kids. Retirement at 60 sustaining today\'s lifestyle. Target: 55 million. Marsa: out of reach.',
  },
  {
    id: "05_scenario2",
    text: "Scenario two. Middle path. GUC or BUE. Retirement at 60, slightly leaner. Target: 33 million. Marsa: aspirational. The median just clears.",
  },
  {
    id: "06_scenario3",
    text: "Scenario three. Pragmatic. Cairo University. Retirement pushed to 63. Target: 15 million. Marsa: attainable. The pessimistic path clears.",
  },
  {
    id: "07_inversion",
    text: "Marsa's inversion tells the advisor what changes the verdict. The monthly savings needed. Or the retirement date that closes the gap.",
  },
  {
    id: "08_closing",
    text: "Three paths. Three honest verdicts. One conversation about the trade-off.",
  },
  {
    id: "09_tag",
    text: "Marsa. Egyptian planning, built for the real conversation.",
  },
];

// Caption duration policy - used by both capture.ts (to pace the snap
// loop) and Marsa.tsx (to time each <Sequence>). If a voiceover manifest
// ever lands with per-section MP3 durations we use those; otherwise
// derive from word count.
export function defaultDurationMs(text) {
  const words = text.trim().split(/\s+/).length;
  // 0.42 s/word lines up with Brian's cadence on the pre-lock script
  // (measured: 15.5s / 37 words ≈ 0.42 s/word on section 01_intro).
  const seconds = Math.min(11.0, Math.max(3.5, words * 0.42));
  return Math.round(seconds * 1000);
}
