import { Composition } from "remotion";
import { Marsa } from "./Marsa";

// 2700 frames @ 30fps = 90 seconds. The English composition is the primary
// deliverable; the Arabic one is rendered on a second pass if time allows.
// Both share the same component — `lang` is read via `getInputProps()` and
// flips the locale, the voiceover source, and the text direction.
export const Root: React.FC = () => {
  return (
    <>
      <Composition
        id="Marsa"
        component={Marsa}
        durationInFrames={2700}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{ lang: "en" as const }}
      />
      <Composition
        id="MarsaAR"
        component={Marsa}
        durationInFrames={2700}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{ lang: "ar" as const }}
      />
    </>
  );
};
