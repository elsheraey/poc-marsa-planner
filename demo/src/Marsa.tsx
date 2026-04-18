import {
  AbsoluteFill,
  Img,
  interpolate,
  Sequence,
  staticFile,
  useCurrentFrame,
} from "remotion";
import { loadFont } from "@remotion/google-fonts/Cairo";
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

// Per-section frame counts derived from the capture manifest. No voice
// this pass — durations come straight from the capture-side minimums
// in demo/capture.ts's SECTIONS table.
type ManifestSection = {
  id: string;
  caption: string;
  duration_ms: number;
};
const sections = (manifest as { sections: ManifestSection[] }).sections;
const sectionFrames: number[] = sections.map((s) =>
  Math.round((s.duration_ms / 1000) * FPS)
);
const cumulativeStart: number[] = sectionFrames.reduce<number[]>(
  (acc, _f, i) => {
    acc.push(i === 0 ? 0 : acc[i - 1] + sectionFrames[i - 1]);
    return acc;
  },
  []
);
export const TOTAL_FRAMES = sectionFrames.reduce((s, f) => s + f, 0);

// Scenario-card focus coordinates per report screenshot. The report's
// moment-of-truth headline card changes height between "attainable" /
// "out of reach" (the latter adds a suggestion line), which shifts the
// three scenario cards below it by ~40 px. We hand-tune per shot so
// the Remotion ring sits tight around the active card in each frame.
//
// Values are in the 1920×1080 source-pixel space — no scaling needed.
const SCENARIO_RING_COORDS: Record<
  string,
  { x: number; y: number; width: number; height: number }
> = {
  "12_auc": { x: 408, y: 514, width: 1112, height: 80 },
  "13_guc": { x: 408, y: 560, width: 1112, height: 80 },
  "14_cairo": { x: 408, y: 648, width: 1112, height: 80 },
};

// ---------------------------------------------------------------------
// SectionScene — renders one still image with a subtle Ken-Burns zoom,
// a lower-third caption bar, and an optional az-gold ring around a
// specific scenario card for sections 12–14.
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

  return (
    <AbsoluteFill
      style={{
        backgroundColor: BRAND.canvas,
        fontFamily,
        opacity,
      }}
    >
      {/* Background: the captured PNG scaled subtly for a Ken-Burns feel */}
      <AbsoluteFill
        style={{
          transform: `scale(${scale})`,
          transformOrigin: index % 2 === 0 ? "center center" : "center top",
        }}
      >
        <Img
          src={staticFile(`frame.${id}.png`)}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: "top",
          }}
        />
      </AbsoluteFill>

      {/* Scenario-card ring + dim on non-focus cards for sections 12/13/14 */}
      {ringCoords && <ScenarioHighlight coords={ringCoords} />}

      {/* Lower-third caption bar */}
      <LowerThirdCaption caption={caption} duration={duration} />
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
// 24 px (~text-2xl at the 1920×1080 design grid), center-aligned,
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
          background: "rgba(0,0,0,0.7)",
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
// EndCard — section 17_tag. Full black background, Marsa wordmark in
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
          Egyptian planning.
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------
// Root composition — 17 section scenes back-to-back, no audio, no
// title buffer. The last section (17_tag) is rendered as a pure
// Remotion EndCard, not the captured PNG — the PNG is kept as a
// fallback if the render ever needs to swap back.
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
      {sections.map((s, i) => {
        const from = cumulativeStart[i];
        const duration = sectionFrames[i];
        const isEnd = s.id === "17_tag";
        return (
          <Sequence key={s.id} from={from} durationInFrames={duration}>
            {isEnd ? (
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
