# ColorWizard — Updated README with Founder Story

## Hero Section

```
 ██████╗  ██████╗ ██╗      ██████╗ ██████╗ ██╗    ██╗██╗███████╗ █████╗ ██████╗ ██████╗
██╔════╝ ██╔═══██╗██║     ██╔═══██╗██╔══██╗██║    ██║██║╚══███╔╝██╔══██╗██╔══██╗██╔══██╗
██║      ██║   ██║██║     ██║   ██║██████╔╝██║ █╗ ██║██║  ███╔╝ ███████║██████╔╝██║  ██║
██║      ██║   ██║██║     ██║   ██║██╔══██╗██║███╗██║██║ ███╔╝  ██╔══██║██╔══██╗██║  ██║
╚██████╗ ╚██████╔╝███████╗╚██████╔╝██║  ██║╚███╔███╔╝██║███████╗██║  ██║██║  ██║██████╔╝
 ╚═════╝  ╚═════╝ ╚══════╝ ╚═════╝ ╚═╝  ╚═╝ ╚══╝╚══╝ ╚═╝╚══════╝╚═╝  ╚═╝╚═╝  ╚═╝╚═════╝
```

### A Color Picker Built for Painters. Not Locked. Not Crippled. Not Owned by Anyone But You

**Free. Open source. No paywalls for the good stuff.**

---

## Desktop & offline packaging (ADR)

**Decision:** Ship the desktop app (**Option A**) by bundling the production Next.js server (`next start` or standalone output) as a **local sidecar**; Tauri’s webview loads `http://127.0.0.1:<port>`. This keeps the first macOS DMG achievable with minimal Next.js refactor.

**Trade-off:** Larger install size (includes Node). A later milestone may pursue **Option B** (static export, no Route Handlers at runtime).

**Offline web baseline:** Display type uses self-hosted **@fontsource** (no `fonts.googleapis.com` at runtime). AI palette suggestions are generated in **`lib/ai/suggestions.ts`** on the client so the panel works without `/api/ai/suggestions`. Palette export uses **PNG download + clipboard** and optional **`navigator.share`** (no Twitter or marketing URLs).

**Client hardening:** With `OPEN_SOURCE_MODE`, `AuthProvider` does not load the Firebase Auth chunk (lazy path exists only for paid/cloud builds). `/api/health` does not touch Firestore.

**Tauri dev (desktop shell):** Requires [Rust](https://www.rust-lang.org/tools/install). Free TCP **3000** for Next (Tauri’s `devUrl` is fixed to `http://localhost:3000`). Then:

```bash
npm install
npm run tauri:dev
```

This runs `next dev -p 3000` and opens the native window. Turn off Wi‑Fi to validate offline UI; the dev server is still local loopback.

**Follow-ups:** macOS codesigning/notarization; Windows packaging; static-export migration; packaged `tauri build` needs a real `out/` or standalone Next sidecar; remove `firebase` / `stripe` packages once server routes and imports are gone.

---

## Why This Exists

I was a motion designer for 10+ years. Worked with Google, Kate Spade, Under Armour. Made nice videos. Got paid. Then I realized something: I was solving the wrong problem.

The real problem wasn't making prettier motion graphics. The real problem was that creatives are trapped.

Trapped by Photoshop subscriptions. Trapped by Figma paywalls. Trapped by tools that charge $20/month for features that should be free. Trapped by software that owns your data.

So I built the opposite.

ColorWizard is a color picker for painters. You upload an image, click a color, get the paint recipe. No email. No account. No tracking. Your data stays on your machine. Forever.

It's fast (50% faster than v1). It's free. It's open source. It's the tool I wanted to exist.

---

## What It Does

Upload any reference image. Click a color. Get:

- **Oil paint recipe** — mixing ratios using a 6-color limited palette (how real painters work)
- **Embroidery matches** — top 5 DMC floss threads that match
- **Color name** — what it's called in 30k+ actual color names
- **Reference card** — PNG export for your studio
- **Zero tracking** — your images never leave your machine
- **Forever free** — core features never get paywalled

---

## The Numbers

| Metric | Before | After | Why It Matters |
|--------|--------|-------|---|
| **Largest Contentful Paint** | 2.4s | 1.2s | Half the time to see the tool |
| **First Input Delay** | 180ms | 65ms | Click feels instant |
| **JS Bundle** | 185kb | 144kb | Faster load, less wasted data |
| **Time to Interactive** | 3.1s | 1.6s | Start using it sooner |

Real painter feedback: "No lag. Just works."

---

## Features

**Speed**

- Click-to-color is instant (Web Workers handle the heavy math)
- Zoom/pan with keyboard + mouse
- Optimized rendering (Zustand selectors, component splitting)

**Color Sampling**

- HEX, RGB, HSL readouts
- Zoom and pan with smooth scrolling
- Support for drag-and-drop images

**Value Mode**

- Press V to check grayscale values (essential for painting)
- Adjustable overlay opacity
- 5/7/9/11 value interval options

**Oil Paint Recipes**

- 6-color realistic palette (Titanium White, Ivory Black, Yellow Ochre, Cadmium Red, Phthalo Green, Phthalo Blue)
- Brand support (Winsor & Newton, Golden, Gamblin)
- Spectral.js mixing engine
- Interactive mix lab for experimentation

**Embroidery Floss**

- All 454 DMC threads
- Top 5 matches for any color
- Cross-stitch reference

**Privacy**

- Your images? Never uploaded. Stay on your machine.
- Your colors? Not tracked. Not stored. Not sold.
- Export anytime. Nothing is locked.

**Keyboard Shortcuts**

- Spacebar: pan
- +/-: zoom
- V: value mode
- 1-9: sidebar tabs (Surface, Structure, Reference, Sample, etc.)
- 0: Library
- Alt + 9: Check My Values (Overlay)
- Alt + 0: Check My Drawing (Perspective Warp)
- [/]: collapse sidebar

**Accessibility**

- WCAG contrast ratios on every swatch
- Screen reader ready
- Keyboard navigable

---

## Get It Running

```bash
git clone https://github.com/coltonbatts/colorwizard.git
cd colorwizard
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## How to Use

1. **Load an image** — Drag, drop, or click
2. **Click a color** — Anywhere on the canvas
3. **Get results** — Paint recipe + color name + embroidery matches
4. **Export** — Reference card as PNG
5. **Close browser** — Everything's done. Nothing gets stored.

---

## Tech Stack

Next.js 15 · React 18 · TypeScript · Tailwind CSS · Canvas API · Spectral.js · Web Workers · Zustand

---

## Roadmap

- [ ] Procreate plugin (sample colors directly in Procreate)
- [ ] Batch palette extraction (upload image, get 5 colors)
- [ ] Cloud palette sync (optional, Pro tier)
- [ ] Watercolor & acrylic palettes
- [ ] Custom paint library support

---

## Pricing

### Free Tier

- Unlimited color sampling
- Paint recipes
- DMC floss matching
- Color naming
- Export everything
- Forever

### Pro Tier ($1 one-time purchase, lifetime access)

- **Surface Handling** — Import and persist your own surface photos locally
- **Structure Tools** — Square grid overlays with adjustable spacing and opacity
- **Reference Overlay** — Import reference photos with Move, Scale, Rotate, and Opacity controls
- **Batch palette extraction** (Coming soon)
- **Cloud palette sync** (Coming soon)
- **Custom paint libraries** (Coming soon)
- **Procreate plugin** (Coming soon)

**The core tool is free forever.** We're not hiding the good stuff. If you just need to sample colors and get recipes, you never have to pay.

---

## Philosophy

**Open Source ≠ Theater**

This isn't some corporate "we're so open source" marketing campaign. The code is real. You can fork it. You can build on it. You can run it locally forever.

**Privacy ≠ Buzzword**

Your images don't get uploaded. We're not analyzing them. We're not training models on them. They never leave your machine. Period.

**Free ≠ Crippled**

The core features—color sampling, paint recipes, exports—are free. Forever. Not a "free trial." Not a "limited version." Actually free.

**Performance ≠ Optional**

A slow tool is a betrayal. We spent a sprint optimizing every interaction. 50% faster. It's not a feature. It's respect for your time.

---

## Contributing

This is open source. Fork it. Improve it. Send a PR. We'll look at it.

Ideas for contributions:

- New palette types (pastel, watercolor, etc.)
- Export formats (CSV, Figma plugins, etc.)
- UI/UX improvements
- Performance optimizations
- Translations
- Documentation

---

## Built By

[@thecoltonbatts](https://twitter.com/thecoltonbatts) — motion designer turned tool builder

I spent 10 years making beautiful things for clients. Then I realized the better work was building tools so other people could make beautiful things without getting trapped.

This is that tool.

---

## Get Started

**[Try ColorWizard Free →](https://colorwizard.app)**

No email. No sign-up. Click, sample, paint.

Following the build on Twitter: [@thecoltonbatts](https://twitter.com/thecoltonbatts)

---

**Built by a painter. For painters. Owned by you.**
