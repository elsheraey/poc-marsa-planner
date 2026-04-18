import { Composition } from "remotion";
import { Marsa, TOTAL_FRAMES } from "./Marsa";

// The English composition is the primary deliverable this pass. Arabic
// is deferred — the MarsaAR composition has been removed from Root so
// `remotion render` / `remotion compositions` only advertise the
// English cut. When Arabic comes back online, re-add a MarsaAR
// Composition alongside this one and pass `lang="ar"` through.
//
// `durationInFrames` is driven by the TTS manifest via TOTAL_FRAMES:
// title-card buffer + Σ(section_ms → frames) + end-card buffer. This
// keeps the video length locked to the voiceover — the MP4's last
// frame is also the last frame of audio plus the END_FRAMES outro.
export const Root: React.FC = () => {
  return (
    <Composition
      id="Marsa"
      component={Marsa}
      durationInFrames={TOTAL_FRAMES}
      fps={30}
      width={1920}
      height={1080}
      defaultProps={{ hasVoice: true }}
    />
  );
};
