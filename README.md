# ColorWizard

ColorWizard is a local-first color instrument for artists. Open a picture, click any color, and see what it is, how to mix it in paint, and which DMC thread matches.

## The simple version (the default on the web)

`/` opens the simple version (`components/simple/`). It is one screen:

- **Open** a picture (button, ⌘O, drag and drop, or paste).
- **Click** to read a color. A loupe magnifies the pixels under the pointer.
- **Move around like a viewfinder:** scroll (Magic Mouse, wheel) or pinch to zoom at the pointer, drag to move, `+` / `−` / `0` to zoom and fit. On touch, tap to sample, and press and hold to pick with the loupe.
- **Full detail:** photos keep up to 4096 px (a whole 12 MP phone photo; 3072 on iPhone and iPad), and zoom goes to 6400%. Past 400% pixels render crisp and a click reads exactly the pixel under it.
- **One color, fully described:** name, hex, value, temperature, chroma, then **Paint** (spectral mix from the six-color palette) and **Thread** (closest DMC floss, nearby alternatives, and the family's light-to-dark shades). Every swatch opens as a color of its own.
- **Value** shows the picture in grayscale (V).
- **Save** keeps colors in this browser.

The full painter workbench described below is unchanged and lives at `/workbench`. The desktop app still opens on the workbench, because its project gallery, licensing, and saving are wired to it. The pre-simple `main` is preserved on the `workbench-classic` branch.

## The full workbench

![ColorWizard sample workbench](artifacts/ui-redesign/after/sample-1440x900.png)

The core journey is intentionally small:

1. **Open** a reference image.
2. **Sample** a color directly from the canvas.
3. **Understand** its value, temperature, and chroma.
4. **Act** by mixing paint, matching threads, or saving the color.

Images stay on your device. The core workflow does not require an account or cloud upload.

## Instrument Workbench Milestone

The current workbench is painter-first. The canvas and one persistent result inspector are the visual center of the application, with technical depth available progressively instead of rendered as a dashboard by default.

- Sampling is the default canvas behavior; paint mixing is the immediate result, not a separate mode.
- One canonical inspector combines color character, target versus predicted color, model fit, pigment ratios, a proportional mix strand, and the next mixing instruction.
- Advanced mixing guidance expands in place. Paint Library, overlays, Structure, Surface, calibration, settings, and saved work live under Studio Tools.
- Threads and Stitch are preserved inside an intentionally entered Embroidery workflow.
- Mobile uses a canvas-first result sheet with collapsed, medium, and expanded states.
- A new mobile sample opens the result sheet to medium automatically.
- The desktop project gallery is organized around New, Recent, Pinned, Palettes, and Settings.
- Browser and Tauri states share one warm-paper, black-stage, sample-driven visual system.

![ColorWizard Mix Lab](artifacts/ui-redesign/after/mix-1440x900.png)

## What It Does

- Samples colors from local reference images.
- Shows HEX, RGB, HSL, perceptual name, value, chroma, and temperature readouts.
- Generates practical paint starting mixes for a limited palette.
- Finds close DMC embroidery floss matches.
- Supports value mode for grayscale/value-first painting decisions.
- Saves pinned/session colors locally.
- Provides Stitch planning and supporting studio tools through progressive disclosure.
- Includes a project gallery, local persistence, export, and licensing workflows in the desktop app.
- Runs in the browser and as a Tauri desktop app.

## Product Direction

ColorWizard is not a full creative suite. It is a focused bridge between reference images and physical making: **Open → Sample → Understand → Act**.

The default workbench exposes only the reference canvas, result inspector, Replace Photo, Fit, Value View, Save Color, Change Paints, and Studio Tools. Secondary painter capabilities and the separate Embroidery workflow remain available without competing with the core loop.

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
npm run validate:paints
npm run build
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

In scope for the core instrument:

- Image upload
- Canvas sampling
- Practical paint starting mix
- DMC thread matches
- Value mode
- Local pinned/session colors
- Stitch planning
- Paint library and palette management
- Desktop projects, persistence, and export

Out of scope for the core instrument:

- Cloud-first project storage
- Social sharing
- Collaboration
- A full Photoshop/Procreate/Figma replacement
- Exact paint simulation claims

## Verification

The redesign is exercised at 1440×900, 1366×768, 768×1024, and 390×844. The automated suite covers the desktop and mobile Open → Sample → Mix → Value → Threads flow, alongside the color-science and persistence unit tests.

Before/after and responsive captures are stored in [`artifacts/ui-redesign`](artifacts/ui-redesign).

## Roadmap

- Deepen saved-color and export workflows without crowding the core journey.
- Continue refining iPad, easel, and couch use.
- Expand paint libraries and medium-specific palettes.
- Grow browser coverage around desktop persistence and advanced studio tools.

## Contributing

Keep changes sympathetic to the product shape: local-first, artist-facing, visual, and focused. Avoid adding broad suite-style features unless they strengthen Open → Sample → Understand → Act.
