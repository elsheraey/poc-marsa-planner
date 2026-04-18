# Marsa demo video

A 90-second Remotion walkthrough of Marsa Planner (title card → live app
capture → recap → URL card), with ElevenLabs narration and royalty-free
music. Renders to `demo/out/marsa-walkthrough-en.mp4` (and `-ar.mp4` if
the AR render is triggered).

## One-shot regenerate

With backend on `:8000` and frontend on `:5173` already running, and
`demo/.env` containing a live `ELEVENLABS_API_KEY=...`:

```sh
cd demo && npm install && npm run capture && npm run tts && npm run music && npm run render
```

The four build steps can also be run individually — see `package.json`.

## What gets committed

Only the source lives in git: `package.json`, `package-lock.json`,
`tsconfig.json`, `remotion.config.ts`, `src/**`, `capture.ts`,
`tts.mjs`, `music.mjs`, `README.md`. Everything binary
(`demo/assets/*.{mp3,webm,mp4}`, `demo/out/`, `demo/node_modules/`,
`demo/.env`) is gitignored at the repo root.

## Pipeline

1. `npm run capture` — headless-ish Chromium walkthrough against
   `http://127.0.0.1:5173`; writes `assets/app-capture.webm`. ~60s.
2. `npm run tts` — posts EN + AR narration to ElevenLabs; writes
   `assets/voiceover.en.mp3` + `voiceover.ar.mp3`. ~20s.
3. `npm run music` — tries a short list of Pixabay CC0 URLs; writes
   `assets/music.mp3`. Graceful fallback if every URL 403s.
4. `npm run render` — Remotion renders `out/marsa-walkthrough-en.mp4`
   (1920x1080, 30fps, 2700 frames = 90s). ~90-150s on a laptop.
5. `npm run render:ar` — optional Arabic render.

## Brand tokens

Matches the product: black `#000000` chrome, gold `#F9AB00` accent,
warm canvas `#F5F5F5`, Cairo typeface. Loaded via
`@remotion/google-fonts/Cairo` inside the composition.

## Assets vs public

Remotion reads `staticFile()` paths from the directory set in
`remotion.config.ts` — we point it at `assets/` so the capture, voice,
and music scripts all write into a single place. The root `.gitignore`
already excludes the binary file types in that folder.
