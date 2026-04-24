# ColorWizard

ColorWizard is a local-first color assistant for artists. Upload a reference image, sample a color, and get a practical paint starting mix plus close DMC thread matches.

The core loop is intentionally small:

1. Upload a reference image.
2. Tap or click the image to sample a color.
3. Use the starting paint mix as a bench mix, then adjust by eye.
4. Check DMC thread matches for embroidery and cross-stitch work.
5. Pin or save useful colors locally.

Images stay on your device. The core workflow does not require an account or cloud upload.

## What It Does

- Samples colors from local reference images.
- Shows HEX, RGB, HSL, perceptual name, value, chroma, and temperature readouts.
- Generates practical paint starting mixes for a limited palette.
- Finds close DMC embroidery floss matches.
- Supports value mode for grayscale/value-first painting decisions.
- Saves pinned/session colors locally.
- Runs in the browser and as a Tauri desktop app.

## Product Direction

ColorWizard is not a full creative suite. It is a focused bridge between reference images and physical making.

The desktop rail keeps the core flow first: Sample and Threads. Studio tools such as mix exploration, library, reference, structure, and surface controls are available, but they should not compete with upload -> sample -> mix/matches.

Paint mixes are starting points, not exact physical simulations. Paint brand, pigment load, surface, lighting, and technique still matter.

## Privacy

- Reference images are processed locally in the browser or desktop app.
- Core sampling, matching, and saving do not require uploading images.
- Pinned colors and local cards remain under user control.

## Tech Stack

- Next.js 15
- React 18
- TypeScript
- Tailwind CSS
- Zustand
- Canvas API
- Web Workers
- Spectral.js
- Tauri for desktop packaging

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

If port 3000 is already in use, Next.js will choose another local port.

## Useful Commands

```bash
npm run lint
npx tsc --noEmit
npm test -- --run
```

Core browser smoke check:

```bash
COLORWIZARD_URL=http://localhost:3000 npm run smoke:core
```

The smoke check exercises upload, sample, paint mix, value mode, and Threads/DMC on desktop and mobile viewports. It expects a local dev server to already be running and requires Playwright to be available in the local environment.

## Desktop App

Tauri development:

```bash
npm run tauri:dev
```

Build a macOS DMG:

```bash
npm run tauri:build:dmg
```

The desktop app uses a static Next.js export for packaging. Code signing and notarization are still required for normal macOS distribution outside the App Store.

## Current Scope

In scope for the thin core:

- Image upload
- Canvas sampling
- Practical paint starting mix
- DMC thread matches
- Value mode
- Local pinned/session colors

Out of scope for the thin core:

- Cloud-first project storage
- Social sharing
- Collaboration
- A full Photoshop/Procreate/Figma replacement
- Exact paint simulation claims

## Roadmap

- Tighten automated browser coverage for the thin-core workflow.
- Continue simplifying mobile couch/easel/iPad sampling.
- Add clearer saved-card and export flows.
- Improve paint-library ergonomics without crowding the core loop.
- Expand medium-specific palettes after the core flow stays reliable.

## Contributing

Keep changes sympathetic to the product shape: local-first, artist-facing, and focused. Avoid adding broad suite-style features unless they support the core sample -> mix/matches workflow.
