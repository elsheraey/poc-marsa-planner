import {
  AbsoluteFill,
  Audio,
  Img,
  continueRender,
  delayRender,
  interpolate,
  Sequence,
  staticFile,
  useCurrentFrame,
} from "remotion";
import { useEffect, useState } from "react";
import { loadFont } from "@remotion/google-fonts/Cairo";
// @ts-expect-error — .mjs shared with tts.mjs; no .d.ts but the shape is
// trivial and the Remotion bundler resolves ESM fine.
import { SECTIONS, defaultDurationMs } from "./sections.mjs";
// Timing manifest written by demo/capture.ts — pairs each section id
// with a duration_ms. Captions are NOT read from here (they come from
// SECTIONS above, which is the single source of truth for narration
// text so captions and voiceover never drift).
import manifest from "./walkthrough.manifest.json";

// Cairo is the Marsa brand face. 500 for body / captions, 700 for bar
// copy, 800 for the title + end-card wordmark.
const { fontFamily } = loadFont("normal", {
  weights: ["500", "700", "800"],
  subsets: ["latin"],
  ignoreTooManyRequestsWarning: true,
});

// Marsa brand tokens — kept in sync with frontend/tailwind.config.js.
const BRAND = {
  black: "#000000",
  gold: "#F9AB00",
  goldSoft: "#FDE6B0",
  canvas: "#F5F5F5",
  white: "#FFFFFF",
  ink: "#111111",
  inkMuted: "#6B6B6B",
} as const;

const FPS = 30;

// 1-second title buffer at the head, 2-second end-card buffer at the
// tail. Both get rendered as plain Remotion Sequences around the
// section stack (see Marsa composition below).
const TITLE_FRAMES = Math.round(1 * FPS);
const END_FRAMES = Math.round(2 * FPS);

// ---------------------------------------------------------------------
// Section timing resolution.
//
// `walkthrough.manifest.json` is always written by demo/capture.ts and
// carries the per-section duration_ms (sourced from the voiceover
// manifest when available, else `defaultDurationMs(text)`). If the
// manifest is missing a section (e.g. schema drift) we fall back to
// the same word-count heuristic right here so the Remotion composition
// still renders something sane.
// ---------------------------------------------------------------------
type SectionShape = { id: string; text: string };
type ManifestSection = { id: string; duration_ms: number };
const manifestSections: ManifestSection[] =
  (manifest as { sections?: ManifestSection[] }).sections ?? [];

function resolveSectionDurationMs(s: SectionShape): number {
  const row = manifestSections.find((x) => x.id === s.id);
  if (row && Number.isFinite(row.duration_ms) && row.duration_ms > 0) {
    return row.duration_ms;
  }
  return defaultDurationMs(s.text) as number;
}

const sectionList = (SECTIONS as SectionShape[]).map((s) => ({
  id: s.id,
  caption: s.text,
  duration_ms: resolveSectionDurationMs(s),
}));

const sectionFrames: number[] = sectionList.map((s) =>
  Math.round((s.duration_ms / 1000) * FPS)
);
const cumulativeStart: number[] = sectionFrames.reduce<number[]>(
  (acc, _f, i) => {
    acc.push(i === 0 ? 0 : acc[i - 1] + sectionFrames[i - 1]);
    return acc;
  },
  []
);
const BODY_FRAMES = sectionFrames.reduce((s, f) => s + f, 0);
export const TOTAL_FRAMES = TITLE_FRAMES + BODY_FRAMES + END_FRAMES;

// Scenario-card focus coordinates per report screenshot. The three
// scenario-comparison shots (04_scenario1 / 05_scenario2 /
// 06_scenario3) are the same underlying Report page with the
// matching card promoted to active; Remotion draws a gold ring over
// the focused row so the viewer's eye lands on the right card.
//
// Values are in the 1920×1080 source-pixel space — no scaling needed.
// The y-offsets are tuned per-shot because the moment-of-truth
// headline changes height between "attainable" / "out of reach"
// verdicts, which shifts the three scenario cards below it by ~40 px.
const SCENARIO_RING_COORDS: Record<
  string,
  { x: number; y: number; width: number; height: number }
> = {
  "04_scenario1": { x: 408, y: 514, width: 1112, height: 80 },
  "05_scenario2": { x: 408, y: 560, width: 1112, height: 80 },
  "06_scenario3": { x: 408, y: 648, width: 1112, height: 80 },
};

// ---------------------------------------------------------------------
// SectionScene — renders one still image with a subtle Ken-Burns zoom,
// a lower-third caption bar, and an optional az-gold ring around a
// specific scenario card for sections 04–06.
//
// Section 01_intro is special: while the caption narrates Omar's
// biography, the background crossfades through three UI moments —
// empty login, filled login, and profile step with client data mid-
// entry — so the visuals track the implied workflow rather than
// parking on the Login screen. That branch is handled by
// IntroCrossfadeBackground below; everything else uses the single
// still path.
// ---------------------------------------------------------------------
const SectionScene: React.FC<{
  id: string;
  caption: string;
  index: number;
  duration: number;
}> = ({ id, caption, index, duration }) => {
  const frame = useCurrentFrame();

  // Per-section opacity — 10-frame fade in + fade out so successive
  // sections crossfade into each other cleanly. Holds at 1 in the
  // middle.
  const opacity = interpolate(
    frame,
    [0, 10, duration - 10, duration],
    [0, 1, 1, 0],
    { extrapolateRight: "clamp", extrapolateLeft: "clamp" }
  );

  // Gentle zoom from 1.00 → 1.02 across the section. Keeps long static
  // shots feeling alive without drawing attention away from the UI.
  const scale = interpolate(frame, [0, duration], [1, 1.02], {
    extrapolateRight: "clamp",
  });

  const ringCoords = SCENARIO_RING_COORDS[id];
  const isIntro = id === "01_intro";

  return (
    <AbsoluteFill
      style={{
        backgroundColor: BRAND.canvas,
        fontFamily,
        opacity,
      }}
    >
      {/* Background: the captured PNG(s) scaled subtly for a Ken-Burns
          feel. Intro uses a 3-image crossfade; every other section uses
          the single frame.<id>.png capture. */}
      <AbsoluteFill
        style={{
          transform: `scale(${scale})`,
          transformOrigin: index % 2 === 0 ? "center center" : "center top",
        }}
      >
        {isIntro ? (
          <IntroCrossfadeBackground duration={duration} />
        ) : (
          <Img
            src={staticFile(`frame.${id}.png`)}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              objectPosition: "top",
            }}
          />
        )}
      </AbsoluteFill>

      {/* Scenario-card ring for sections 04/05/06 */}
      {ringCoords && <ScenarioHighlight coords={ringCoords} />}

      {/* Lower-third caption bar */}
      <LowerThirdCaption caption={caption} duration={duration} />
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------
// IntroCrossfadeBackground — three PNGs (login empty → login filled →
// profile inputting) stacked with opacity interpolations so the
// visuals progress alongside the 01_intro narration while the caption
// below stays fixed. Split the section duration into three equal
// thirds; at each boundary, crossfade over CROSSFADE_FRAMES frames so
// the transition reads as a soft dissolve, not a cut.
//
// Shot C (01_intro_c) is a FULL-PAGE capture of the Profile step,
// typically 1920×~2400-2800 px tall. Rather than cover-crop it to
// 1920×1080, we render it inside a 1920×1080 overflow-hidden window
// and animate its `top` offset linearly from 0 → -(imgHeight - 1080)
// across the shot-C slice so the viewer follows the advisor's actual
// scroll from the six required fields at the top down to the
// Advanced-profile dossier below. If the screenshot height is ≤ 1080
// the pan has nothing to traverse and we fall back to a static
// top-aligned render.
// ---------------------------------------------------------------------
const INTRO_C_SRC = "frame.01_intro_c.png";
const CROSSFADE_FRAMES = 15;

const IntroCrossfadeBackground: React.FC<{ duration: number }> = ({
  duration,
}) => {
  const frame = useCurrentFrame();
  const third = duration / 3;
  // Boundary frames between shots A→B and B→C.
  const b1 = third;
  const b2 = 2 * third;
  const half = CROSSFADE_FRAMES / 2;

  // Each shot's opacity ramps in/out over 2*half frames centred on the
  // boundary. Outside its band an opacity of 0 (for B / C) or 1 (for A
  // tail) is held via clamped interpolations.
  const opacityA = interpolate(
    frame,
    [b1 - half, b1 + half],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const opacityB = interpolate(
    frame,
    [b1 - half, b1 + half, b2 - half, b2 + half],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const opacityC = interpolate(
    frame,
    [b2 - half, b2 + half],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <AbsoluteFill>
      <Img
        key="intro_a"
        src={staticFile("frame.01_intro_a.png")}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          objectPosition: "top",
          opacity: opacityA,
        }}
      />
      <Img
        key="intro_b"
        src={staticFile("frame.01_intro_b.png")}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          objectPosition: "top",
          opacity: opacityB,
        }}
      />
      {/* Shot C: scroll-pan over the tall full-page Profile capture.
          Start of shot C (b2 - half) = top of the form (required
          fields visible). End of shot (`duration`) = bottom of the
          form (Advanced-profile dossier filled in). Linear. */}
      <AbsoluteFill style={{ opacity: opacityC }}>
        <IntroCScrollPan
          startFrame={b2 - half}
          endFrame={duration}
          currentFrame={frame}
        />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------
// IntroCScrollPan — renders the tall 01_intro_c.png inside a 1920×1080
// overflow-hidden window with a linearly-interpolated vertical offset.
//
// Uses delayRender + native Image() to measure the intrinsic height of
// the capture at mount time. Until the measurement resolves, we render
// the image top-aligned (position: 0) which matches the pan's starting
// position so there's no visible jump when the real height arrives.
// If the image height is ≤ 1080 (no pan possible) we hold at top.
// ---------------------------------------------------------------------
const IntroCScrollPan: React.FC<{
  startFrame: number;
  endFrame: number;
  currentFrame: number;
}> = ({ startFrame, endFrame, currentFrame }) => {
  const [imgHeight, setImgHeight] = useState<number | null>(null);
  const [handle] = useState(() =>
    delayRender("Measuring intro_c full-page height")
  );

  useEffect(() => {
    const img = new globalThis.Image();
    img.onload = () => {
      // Intrinsic height in source pixels. Width is 1920 by capture
      // convention; we display the image at 100% width so the
      // effective on-screen pixel ratio is 1:1.
      setImgHeight(img.naturalHeight);
      continueRender(handle);
    };
    img.onerror = () => {
      // Fall back to static-top render — no pan, no crash.
      setImgHeight(1080);
      continueRender(handle);
    };
    img.src = staticFile(INTRO_C_SRC);
  }, [handle]);

  // Until the intrinsic height is known, render at top-aligned
  // (top: 0) which is the pan's starting position anyway. No jump.
  const canPan = imgHeight !== null && imgHeight > 1080;
  const maxOffset = canPan ? imgHeight - 1080 : 0;
  const top = canPan
    ? interpolate(
        currentFrame,
        [startFrame, endFrame],
        [0, -maxOffset],
        { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
      )
    : 0;

  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <Img
        src={staticFile(INTRO_C_SRC)}
        style={{
          position: "absolute",
          left: 0,
          top,
          width: "100%",
          height: "auto",
        }}
      />
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------
// ScenarioHighlight — az-gold stroke ring + soft glow around the
// focused scenario card on the 1920×1080 report shot. Fades in with
// the section so it reads as an overlay, not a paint artefact.
// ---------------------------------------------------------------------
const ScenarioHighlight: React.FC<{
  coords: { x: number; y: number; width: number; height: number };
}> = ({ coords }) => {
  const frame = useCurrentFrame();
  const intro = interpolate(frame, [4, 18], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <AbsoluteFill style={{ opacity: intro, pointerEvents: "none" }}>
      <div
        style={{
          position: "absolute",
          left: coords.x,
          top: coords.y,
          width: coords.width,
          height: coords.height,
          border: `4px solid ${BRAND.gold}`,
          borderRadius: 16,
          boxShadow: `0 0 0 6px rgba(249,171,0,0.20), 0 18px 40px rgba(249,171,0,0.28)`,
        }}
      />
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------
// LowerThirdCaption — semi-opaque black bar along the bottom third
// with a 3px az-gold hairline on top. Caption text is Cairo, white,
// ~text-2xl at the 1920×1080 design grid, center-aligned,
// max-width 1400 px. Fades in over 10 frames on section start and
// fades out over 10 frames at section end.
// ---------------------------------------------------------------------
const LowerThirdCaption: React.FC<{
  caption: string;
  duration: number;
}> = ({ caption, duration }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(
    frame,
    [0, 10, duration - 10, duration],
    [0, 1, 1, 0],
    { extrapolateRight: "clamp", extrapolateLeft: "clamp" }
  );
  // 8-px slide-up entrance; resting position is just above the hairline
  // rule so the bar reads as a confident lower-third, not a toast.
  const translate = interpolate(frame, [0, 12], [8, 0], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });
  return (
    <AbsoluteFill
      style={{
        justifyContent: "flex-end",
        alignItems: "center",
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          opacity,
          transform: `translateY(${translate}px)`,
          width: "100%",
          background: "rgba(0,0,0,0.75)",
          borderTop: `3px solid ${BRAND.gold}`,
          padding: "28px 80px 36px 80px",
          display: "flex",
          justifyContent: "center",
          boxShadow: "0 -12px 32px rgba(0,0,0,0.35)",
        }}
      >
        <div
          style={{
            color: BRAND.white,
            fontSize: 38, // ~text-2xl at 1080p scale
            fontWeight: 500,
            lineHeight: 1.3,
            maxWidth: 1400,
            textAlign: "center",
            letterSpacing: -0.2,
          }}
        >
          {caption}
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------
// TitleCard — 1-second opener. Black canvas, Marsa wordmark, hairline
// az-gold underline. Holds for ~20 frames then fades out as the first
// section scene fades in.
// ---------------------------------------------------------------------
const TitleCard: React.FC<{ duration: number }> = ({ duration }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(
    frame,
    [0, 6, duration - 6, duration],
    [0, 1, 1, 0],
    { extrapolateRight: "clamp", extrapolateLeft: "clamp" }
  );
  return (
    <AbsoluteFill
      style={{
        backgroundColor: BRAND.black,
        color: BRAND.white,
        justifyContent: "center",
        alignItems: "center",
        fontFamily,
        opacity,
      }}
    >
      <div style={{ textAlign: "center" }}>
        <div
          style={{
            fontSize: 140,
            fontWeight: 800,
            letterSpacing: -3,
            lineHeight: 1,
          }}
        >
          Marsa
        </div>
        <div
          style={{
            width: 200,
            height: 6,
            background: BRAND.gold,
            borderRadius: 3,
            margin: "22px auto 0 auto",
          }}
        />
      </div>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------
// EndCard — section 09_tag. Full black background, Marsa wordmark in
// Cairo extra-bold 180 px white, az-gold underline mark beneath. The
// wordmark scales from 0.95 → 1.00 over the first 30 frames for a
// subtle settle.
// ---------------------------------------------------------------------
const EndCard: React.FC<{ duration: number }> = ({ duration }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(
    frame,
    [0, 10, duration - 10, duration],
    [0, 1, 1, 0],
    { extrapolateRight: "clamp", extrapolateLeft: "clamp" }
  );
  const scale = interpolate(frame, [0, 30], [0.95, 1], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });
  return (
    <AbsoluteFill
      style={{
        backgroundColor: BRAND.black,
        color: BRAND.white,
        justifyContent: "center",
        alignItems: "center",
        fontFamily,
        opacity,
      }}
    >
      <div
        style={{
          transform: `scale(${scale})`,
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontSize: 180,
            fontWeight: 800,
            letterSpacing: -4,
            lineHeight: 1,
          }}
        >
          Marsa
        </div>
        <div
          style={{
            width: 260,
            height: 8,
            background: BRAND.gold,
            borderRadius: 4,
            margin: "28px auto 0 auto",
          }}
        />
        <div
          style={{
            marginTop: 28,
            fontSize: 30,
            fontWeight: 500,
            color: BRAND.goldSoft,
            letterSpacing: 0.5,
          }}
        >
          Financial planning.
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------
// Root composition — 1-s title card, 9 section scenes back-to-back,
// 2-s end card. The final section (09_tag) is rendered as a pure
// Remotion EndCard (no screenshot needed) per the spec.
// ---------------------------------------------------------------------
type Props = {
  lang?: "en"; // AR deferred — kept for forward-compat.
  // Kept for API parity with the previous composition so callers (render.mjs)
  // that pass `hasVoice` still work. Currently unused — audio is off.
  hasVoice?: boolean;
};

export const Marsa: React.FC<Props> = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.canvas }}>
      {/* Voiceover: concatenated script narration. Starts at the first
          body section (after the title card). The walkthrough manifest's
          per-section durations were swapped to match this audio's timings
          so captions stay synced with the voice. */}
      <Sequence from={TITLE_FRAMES}>
        <Audio src={staticFile("voiceover.en.mp3")} />
      </Sequence>

      {/* 1-s opener title card */}
      <Sequence from={0} durationInFrames={TITLE_FRAMES}>
        <TitleCard duration={TITLE_FRAMES} />
      </Sequence>

      {/* Body: 9 narrated sections */}
      {sectionList.map((s, i) => {
        const from = TITLE_FRAMES + cumulativeStart[i];
        const duration = sectionFrames[i];
        const isTag = s.id === "09_tag";
        return (
          <Sequence key={s.id} from={from} durationInFrames={duration}>
            {isTag ? (
              <EndCardWithCaption caption={s.caption} duration={duration} />
            ) : (
              <SectionScene
                id={s.id}
                caption={s.caption}
                index={i}
                duration={duration}
              />
            )}
          </Sequence>
        );
      })}

      {/* 2-s tail end card (pure brand, no caption) */}
      <Sequence
        from={TITLE_FRAMES + BODY_FRAMES}
        durationInFrames={END_FRAMES}
      >
        <EndCard duration={END_FRAMES} />
      </Sequence>
    </AbsoluteFill>
  );
};

// The tag section gets a caption lower-third over the EndCard too so
// the copy lock-up reads the same as every other section — wordmark
// above, caption below.
const EndCardWithCaption: React.FC<{ caption: string; duration: number }> = ({
  caption,
  duration,
}) => {
  return (
    <AbsoluteFill>
      <EndCard duration={duration} />
      <LowerThirdCaption caption={caption} duration={duration} />
    </AbsoluteFill>
  );
};
