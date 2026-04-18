import {
  AbsoluteFill,
  // Remotion 4.x flags <Audio> as deprecated in favour of <Audio> from the
  // dedicated @remotion/media bundle; the top-level component is still
  // shipped and fully supported — the deprecation is a warning, not an
  // error. Keep using it for now; a migration would pull in a new dep for
  // zero gain on a 90s render.
  // eslint-disable-next-line @typescript-eslint/no-deprecated
  Audio,
  interpolate,
  OffthreadVideo,
  Sequence,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { loadFont } from "@remotion/google-fonts/Cairo";

// Load only the weights we actually render (500 body, 700/800 headlines) in
// both Latin and Arabic subsets. Without these options the loader pulls all
// 9 weights × both subsets = 24 network requests per render tab, which the
// Remotion runtime warns about.
const { fontFamily } = loadFont("normal", {
  weights: ["500", "700", "800"],
  subsets: ["latin", "arabic"],
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

type Props = {
  lang: "en" | "ar";
  // Asset availability flags — populated by the render wrapper from the
  // contents of `demo/assets/`. `staticFile()` only returns a URL string;
  // it has no existence check, so a missing file would 404 at render time.
  // The wrapper passes these booleans via `--props` so the <Audio> / video
  // components are conditionally rendered. Defaults to `true` for the
  // primary assets so a direct `remotion render` without the wrapper still
  // works when all files are present.
  hasVideo?: boolean;
  hasVoice?: boolean;
  hasMusic?: boolean;
};

// ---------------------------------------------------------------------------
// Scene 1 — Title card (0-3s / 0-90f). Black background, giant Cairo wordmark
// that fades in and settles with a small spring-driven scale-up.
// ---------------------------------------------------------------------------
const TitleCard: React.FC<{ lang: "en" | "ar" }> = ({ lang }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const opacity = interpolate(frame, [0, 18], [0, 1], { extrapolateRight: "clamp" });
  const scale = spring({ frame, fps, config: { damping: 200 } }) * 0.05 + 0.95;

  const subtitle =
    lang === "ar"
      ? "تخطيط مالي قائم على الأهداف لمستشاري الثروة في مصر."
      : "Goal-based financial planning for Egyptian wealth advisors.";

  return (
    <AbsoluteFill
      style={{
        backgroundColor: BRAND.black,
        color: BRAND.white,
        justifyContent: "center",
        alignItems: "center",
        fontFamily,
        direction: lang === "ar" ? "rtl" : "ltr",
        textAlign: "center",
      }}
    >
      <div style={{ opacity, transform: `scale(${scale})` }}>
        <div
          style={{
            fontSize: 220,
            fontWeight: 800,
            letterSpacing: -4,
            lineHeight: 1,
          }}
        >
          {lang === "ar" ? "مرسى" : "Marsa"}
        </div>
        <div
          style={{
            marginTop: 28,
            fontSize: 36,
            fontWeight: 500,
            color: BRAND.gold,
            maxWidth: 1200,
          }}
        >
          {subtitle}
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------
// Scene 2 — App capture. Single OffthreadVideo covering the middle of the
// timeline. The capture script produces ~60-75s of usable footage; we play
// it at normal speed and trust the scenes to fill ~65s.
//
// Lower-third callouts are layered as <Sequence> wrappers so they only
// render during a specific window.
// ---------------------------------------------------------------------------
const LowerThird: React.FC<{ lang: "en" | "ar"; title: string; caption?: string }> = ({
  lang,
  title,
  caption,
}) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 12, 120, 135], [0, 1, 1, 0], {
    extrapolateRight: "clamp",
  });
  const translate = interpolate(frame, [0, 14], [40, 0], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill
      style={{
        justifyContent: "flex-end",
        alignItems: lang === "ar" ? "flex-end" : "flex-start",
        padding: 80,
        direction: lang === "ar" ? "rtl" : "ltr",
        fontFamily,
      }}
    >
      <div
        style={{
          opacity,
          transform: `translateY(${translate}px)`,
          background: BRAND.black,
          color: BRAND.white,
          padding: "20px 32px",
          borderRadius: 14,
          borderInlineStart: `6px solid ${BRAND.gold}`,
          boxShadow: "0 18px 48px rgba(0,0,0,0.35)",
          maxWidth: 900,
        }}
      >
        <div style={{ fontSize: 32, fontWeight: 700, lineHeight: 1.2 }}>{title}</div>
        {caption && (
          <div
            style={{
              marginTop: 8,
              fontSize: 22,
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

// ---------------------------------------------------------------------------
// Scene 3 — Recap card. Animated bullet list against black.
// ---------------------------------------------------------------------------
const RecapCard: React.FC<{ lang: "en" | "ar" }> = ({ lang }) => {
  const frame = useCurrentFrame();

  const bullets =
    lang === "ar"
      ? [
          "عشرة آلاف مسار مونت كارلو",
          "بيانات السوق المصري الحقيقية (EGX30، CBE، CAPMAS)",
          "معدّل التضخم، مع تصنيف إمكانية التحقيق",
          "عربية أصيلة، جاهزة من اليوم الأول",
        ]
      : [
          "10,000-path Monte Carlo",
          "Real Egyptian market data (EGX30, CBE, CAPMAS)",
          "Inflation-adjusted, attainability-classified",
          "Arabic-native",
        ];

  const title = lang === "ar" ? "لماذا مرسى" : "Why Marsa";

  return (
    <AbsoluteFill
      style={{
        backgroundColor: BRAND.black,
        color: BRAND.white,
        padding: "120px 180px",
        fontFamily,
        direction: lang === "ar" ? "rtl" : "ltr",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          fontSize: 68,
          fontWeight: 800,
          letterSpacing: -2,
          marginBottom: 48,
          color: BRAND.gold,
        }}
      >
        {title}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        {bullets.map((b, i) => {
          const start = i * 15;
          const o = interpolate(frame, [start, start + 12], [0, 1], {
            extrapolateRight: "clamp",
          });
          const x = interpolate(frame, [start, start + 15], [30, 0], {
            extrapolateRight: "clamp",
          });
          return (
            <div
              key={i}
              style={{
                opacity: o,
                transform: `translateX(${lang === "ar" ? -x : x}px)`,
                fontSize: 42,
                fontWeight: 500,
                display: "flex",
                alignItems: "center",
                gap: 24,
              }}
            >
              <span
                style={{
                  width: 16,
                  height: 16,
                  background: BRAND.gold,
                  borderRadius: 4,
                  flexShrink: 0,
                }}
              />
              {b}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------
// Scene 4 — URL end card. Monospace repo URL fades in, then out.
// ---------------------------------------------------------------------------
const UrlCard: React.FC<{ lang: "en" | "ar" }> = ({ lang }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 20, 120, 150], [0, 1, 1, 0], {
    extrapolateRight: "clamp",
  });
  const tagline =
    lang === "ar" ? "مرسى — تخطيط مصري، بُني بأمانة." : "Marsa. Egyptian planning, built honestly.";
  return (
    <AbsoluteFill
      style={{
        backgroundColor: BRAND.black,
        color: BRAND.white,
        justifyContent: "center",
        alignItems: "center",
        fontFamily,
        direction: lang === "ar" ? "rtl" : "ltr",
      }}
    >
      <div style={{ opacity, textAlign: "center" }}>
        <div style={{ fontSize: 48, fontWeight: 500, color: BRAND.goldSoft, marginBottom: 36 }}>
          {tagline}
        </div>
        <div
          style={{
            fontSize: 42,
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

// ---------------------------------------------------------------------------
// Root composition
// ---------------------------------------------------------------------------
export const Marsa: React.FC<Props> = ({
  lang,
  hasVideo = true,
  hasVoice = true,
  hasMusic = false,
}) => {
  const videoSrc = hasVideo ? staticFile("app-capture.webm") : null;
  const voiceSrc = hasVoice ? staticFile(`voiceover.${lang}.mp3`) : null;
  const musicSrc = hasMusic ? staticFile("music.mp3") : null;

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.canvas }}>
      {/* 0–3s: title card */}
      <Sequence from={0} durationInFrames={90}>
        <TitleCard lang={lang} />
      </Sequence>

      {/* 3–47s: app capture (1320 frames = 44s). Starts from frame 15 of
          the source so the first register-page paint isn't pre-stabilized. */}
      <Sequence from={90} durationInFrames={1320}>
        <AbsoluteFill style={{ backgroundColor: BRAND.canvas }}>
          {videoSrc ? (
            <OffthreadVideo
              src={videoSrc}
              style={{
                width: "92%",
                height: "92%",
                margin: "4% auto",
                borderRadius: 18,
                boxShadow: "0 30px 60px rgba(0,0,0,0.25)",
                objectFit: "cover",
              }}
              startFrom={15}
            />
          ) : (
            <AbsoluteFill
              style={{
                justifyContent: "center",
                alignItems: "center",
                color: BRAND.inkMuted,
                fontFamily,
                fontSize: 28,
              }}
            >
              (app-capture.webm missing — re-run `npm run capture`)
            </AbsoluteFill>
          )}
        </AbsoluteFill>
      </Sequence>

      {/* ~18s mark — lower-third: honesty about out-of-reach */}
      <Sequence from={540} durationInFrames={180}>
        <LowerThird
          lang={lang}
          title={
            lang === "ar"
              ? "خارج النطاق — احتمال 0٪ بالقيمة الحقيقية"
              : "Out of Reach — 0% probability in real terms"
          }
          caption={
            lang === "ar"
              ? "مرسى يقول الحقيقة، ثم يقترح المساهمة الشهرية التي تغلق الفجوة."
              : "Marsa tells the truth, then suggests the monthly contribution that closes the gap."
          }
        />
      </Sequence>

      {/* ~40s mark — lower-third: Arabic/RTL readiness */}
      <Sequence from={1200} durationInFrames={180}>
        <LowerThird
          lang={lang}
          title={
            lang === "ar"
              ? "العربية — من اليمين لليسار، بخط القاهرة، بأرقام محلية"
              : "Arabic — RTL, Cairo, every number localized"
          }
          caption={
            lang === "ar"
              ? "كل شاشة، كل تاريخ، كل عملة — جاهزة لاجتماع العميل."
              : "Every screen, every date, every currency — ready for the client meeting."
          }
        />
      </Sequence>

      {/* 47–80s: recap bullets — expanded to fill the remaining voiceover */}
      <Sequence from={1410} durationInFrames={990}>
        <RecapCard lang={lang} />
      </Sequence>

      {/* 80–90s: URL end card */}
      <Sequence from={2400} durationInFrames={300}>
        <UrlCard lang={lang} />
      </Sequence>

      {/* Audio layers — voice over full length, music ducked underneath */}
      {voiceSrc && <Audio src={voiceSrc} />}
      {musicSrc && <Audio src={musicSrc} volume={0.12} />}
    </AbsoluteFill>
  );
};
