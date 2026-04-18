import {
  AbsoluteFill,
  // Remotion 4.x flags <Audio> as deprecated in favour of <Audio> from
  // the dedicated @remotion/media bundle; the top-level component is
  // still shipped and fully supported — the deprecation is a warning,
  // not an error. Keep using it for now; a migration would pull in a
  // new dep for zero gain on a ~90s render.
  // eslint-disable-next-line @typescript-eslint/no-deprecated
  Audio,
  Img,
  interpolate,
  Sequence,
  staticFile,
  useCurrentFrame,
} from "remotion";
import { loadFont } from "@remotion/google-fonts/Cairo";
import manifest from "./voiceover.manifest.json";

// Load only the weights we render — 500 body, 700 subtitles, 800 head.
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

// Title + end-card buffers. The voiceover starts at frame 0 of section
// 01; we prepend a short title card and append a short end card so the
// rendered MP4 opens and closes on brand, not on a cold UI shot. Both
// buffers play in silence — the voiceover Audio starts at TITLE_FRAMES.
const TITLE_FRAMES = 36; // 1.2s brand card before narration
const END_FRAMES = 48; // 1.6s logo-mark outro after narration

// Derive per-section frame counts + cumulative starts from the TTS
// manifest. `total_ms` is the ffprobe-measured duration of the
// concatenated voiceover, which is what the <Audio> tag plays against.
// The section frame counts sum to `sum_of_sections_ms`, which equals
// `total_ms` modulo sub-frame rounding.
const en = manifest.en;
const sectionFrames: number[] = en.sections.map((s) =>
  Math.round((s.duration_ms / 1000) * FPS)
);
const cumulativeStart: number[] = sectionFrames.reduce<number[]>(
  (acc, f, i) => {
    acc.push(i === 0 ? 0 : acc[i - 1] + sectionFrames[i - 1]);
    return acc;
  },
  []
);
const NARRATION_FRAMES = sectionFrames.reduce((s, f) => s + f, 0);
export const TOTAL_FRAMES = TITLE_FRAMES + NARRATION_FRAMES + END_FRAMES;

// Lower-third copy per section. Empty string = no lower-third (the
// section is carried by the still alone, e.g. intro / goals / closing).
// Gold-underlined black bar at the bottom — matches the brand's
// wayfinding pill treatment used throughout the product.
const LOWER_THIRD: Record<string, { title: string; caption?: string } | null> =
  {
    "01_intro": null,
    "02_goals": { title: "Three goals", caption: "Apartment · University · Retirement" },
    "03_setup": { title: "Three scenarios, side by side" },
    "04_auc": { title: "Scenario one — AUC", caption: "Four million, for both kids" },
    "05_guc": { title: "Scenario two — GUC or BUE", caption: "Three million" },
    "06_cairo": {
      title: "Scenario three — Cairo University",
      caption: "Five hundred thousand",
    },
    "07_inversion": {
      title: "Marsa's inversion",
      caption: "60,000 a month — all three scenarios attainable",
    },
    "08_closing": null,
    "09_tag": null,
  };

type Props = {
  lang?: "en"; // AR is deferred this pass; kept for forward-compat so
  // Root.tsx's MarsaAR composition continues to accept the prop without
  // a schema change when we re-enable Arabic.
  hasVoice?: boolean;
};

// ---------------------------------------------------------------------
// SectionScene — renders one still image with a subtle Ken-Burns zoom
// and a bottom lower-third callout where configured. The image is
// pre-sized at 1920×1080 by the Playwright capture, so it fills the
// frame with `object-fit: cover` without loss.
// ---------------------------------------------------------------------
const SectionScene: React.FC<{
  id: string;
  index: number;
  duration: number;
}> = ({ id, index, duration }) => {
  const frame = useCurrentFrame();
  // Fade in over 12 frames (0.4s) then hold. The previous section's
  // scene unmounts at the same frame as this one mounts, so the
  // crossfade is implicit — Remotion renders both inside their own
  // <Sequence>, but only one is on-screen at a time.
  const opacity = interpolate(frame, [0, 12], [0, 1], {
    extrapolateRight: "clamp",
  });
  // Gentle zoom from 1.00 → 1.025 over the section — the Ken-Burns
  // effect that makes a still feel cinematic without being distracting.
  // 2.5% zoom over 10–15s is the Apple keynote default.
  const scale = interpolate(frame, [0, duration], [1, 1.025], {
    extrapolateRight: "clamp",
  });

  const caption = LOWER_THIRD[id];

  return (
    <AbsoluteFill
      style={{
        backgroundColor: BRAND.canvas,
        fontFamily,
        opacity,
      }}
    >
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
      {caption && <LowerThird title={caption.title} caption={caption.caption} />}
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------
// LowerThird — black bar with a gold 6 px inline-start accent, settled
// 80 px above the bottom of the frame. Fades in at 10 f, holds for the
// full section (caller controls the Sequence window), fades out at the
// last 14 f.
// ---------------------------------------------------------------------
const LowerThird: React.FC<{ title: string; caption?: string }> = ({
  title,
  caption,
}) => {
  const frame = useCurrentFrame();
  // Entrance: slide up 28 px + fade in over 14 f.
  const intro = interpolate(frame, [0, 14], [0, 1], {
    extrapolateRight: "clamp",
  });
  const translate = interpolate(frame, [0, 14], [28, 0], {
    extrapolateRight: "clamp",
  });
  return (
    <AbsoluteFill
      style={{
        justifyContent: "flex-end",
        alignItems: "flex-start",
        padding: 72,
      }}
    >
      <div
        style={{
          opacity: intro,
          transform: `translateY(${translate}px)`,
          background: BRAND.black,
          color: BRAND.white,
          padding: "22px 36px",
          borderRadius: 14,
          borderLeft: `6px solid ${BRAND.gold}`,
          boxShadow: "0 22px 52px rgba(0,0,0,0.45)",
          maxWidth: 960,
        }}
      >
        <div style={{ fontSize: 40, fontWeight: 800, lineHeight: 1.15 }}>
          {title}
        </div>
        {caption && (
          <div
            style={{
              marginTop: 10,
              fontSize: 26,
              fontWeight: 500,
              color: BRAND.goldSoft,
              lineHeight: 1.3,
            }}
          >
            {caption}
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------
// TitleCard — 1.2s brand opener. Fades in over 12 f, holds, fades out.
// ---------------------------------------------------------------------
const TitleCard: React.FC = () => {
  const frame = useCurrentFrame();
  const opacity = interpolate(
    frame,
    [0, 10, TITLE_FRAMES - 8, TITLE_FRAMES],
    [0, 1, 1, 0],
    { extrapolateRight: "clamp" }
  );
  return (
    <AbsoluteFill
      style={{
        backgroundColor: BRAND.black,
        color: BRAND.white,
        justifyContent: "center",
        alignItems: "center",
        fontFamily,
        textAlign: "center",
      }}
    >
      <div style={{ opacity }}>
        <div style={{ fontSize: 200, fontWeight: 800, letterSpacing: -4, lineHeight: 1 }}>
          Marsa
        </div>
        <div
          style={{
            marginTop: 24,
            fontSize: 30,
            fontWeight: 500,
            color: BRAND.gold,
            maxWidth: 1100,
          }}
        >
          Goal-based financial planning for Egyptian wealth advisors.
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------
// EndCard — 1.6s brand outro with the repo URL.
// ---------------------------------------------------------------------
const EndCard: React.FC = () => {
  const frame = useCurrentFrame();
  const opacity = interpolate(
    frame,
    [0, 14, END_FRAMES - 10, END_FRAMES],
    [0, 1, 1, 0],
    { extrapolateRight: "clamp" }
  );
  return (
    <AbsoluteFill
      style={{
        backgroundColor: BRAND.black,
        color: BRAND.white,
        justifyContent: "center",
        alignItems: "center",
        fontFamily,
      }}
    >
      <div style={{ opacity, textAlign: "center" }}>
        <div style={{ fontSize: 44, fontWeight: 500, color: BRAND.goldSoft, marginBottom: 30 }}>
          Marsa. Egyptian planning, built honestly.
        </div>
        <div
          style={{
            fontSize: 36,
            fontWeight: 600,
            color: BRAND.white,
            fontFamily:
              "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace",
          }}
        >
          github.com/elsheraey/marsa-planner
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------
// Root composition — title buffer → N section scenes locked to voice
// durations → end buffer. The concatenated voiceover plays at frame
// TITLE_FRAMES so its start aligns with section 01's visual start.
// ---------------------------------------------------------------------
export const Marsa: React.FC<Props> = ({ hasVoice = true }) => {
  const voiceSrc = hasVoice ? staticFile("voiceover.en.mp3") : null;

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.canvas }}>
      {/* 1.2s title card */}
      <Sequence from={0} durationInFrames={TITLE_FRAMES}>
        <TitleCard />
      </Sequence>

      {/* Each section locked to its voiceover duration. */}
      {en.sections.map((s, i) => {
        const from = TITLE_FRAMES + cumulativeStart[i];
        const duration = sectionFrames[i];
        return (
          <Sequence key={s.id} from={from} durationInFrames={duration}>
            <SectionScene id={s.id} index={i} duration={duration} />
          </Sequence>
        );
      })}

      {/* End card */}
      <Sequence from={TITLE_FRAMES + NARRATION_FRAMES} durationInFrames={END_FRAMES}>
        <EndCard />
      </Sequence>

      {/* Single audio track — the concatenated voiceover. Starts at
          TITLE_FRAMES so its t=0 aligns with section 01's t=0. */}
      {voiceSrc && (
        <Sequence from={TITLE_FRAMES}>
          <Audio src={voiceSrc} />
        </Sequence>
      )}
    </AbsoluteFill>
  );
};
