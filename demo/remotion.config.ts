import { Config } from "@remotion/cli/config";

// JPEG at q90 keeps the render fast and the MP4 under ~40 MB at 1080p/30fps
// while still looking clean — PNG would double the per-frame encode time
// without a visible quality bump for a product walkthrough.
Config.setVideoImageFormat("jpeg");
Config.setJpegQuality(90);

// The compositions load Cairo via @remotion/google-fonts, which needs network
// access from the renderer. Let Remotion auto-download its bundled Chromium
// and FFmpeg on first render.
// Point Remotion's staticFile() at the assets/ directory so the Playwright
// capture, the ElevenLabs MP3s, and the Pixabay music track all resolve
// without an extra copy step. assets/ is gitignored for binaries — see the
// root .gitignore entries under "Demo artifacts (binary)".
Config.setPublicDir("assets");
