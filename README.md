<div align="center">

# ColorWizard 🎨

<pre>
 ██████╗  ██████╗ ██╗      ██████╗ ██████╗ ██╗    ██╗██╗███████╗ █████╗ ██████╗ ██████╗
██╔════╝ ██╔═══██╗██║     ██╔═══██╗██╔══██╗██║    ██║██║╚══███╔╝██╔══██╗██╔══██╗██╔══██╗
██║      ██║   ██║██║     ██║   ██║██████╔╝██║ █╗ ██║██║  ███╔╝ ███████║██████╔╝██║  ██║
██║      ██║   ██║██║     ██║   ██║██╔══██╗██║███╗██║██║ ███╔╝  ██╔══██║██╔══██╗██║  ██║
╚██████╗ ╚██████╔╝███████╗╚██████╔╝██║  ██║╚███╔███╔╝██║███████╗██║  ██║██║  ██║██████╔╝
 ╚═════╝  ╚═════╝ ╚══════╝ ╚═════╝ ╚═╝  ╚═╝ ╚══╝╚══╝ ╚═╝╚══════╝╚═╝  ╚═╝╚═╝  ╚═╝╚═════╝
</pre>

### A Color Picker Built for Painters. Not Locked. Not Crippled. Not Owned by Anyone But You

</div>

---

## What It Actually Does

Upload an image. Click a color. Get:

- **Oil paint recipe** — realistic mixing ratios from a 6-color limited palette
- **Embroidery matches** — top 5 DMC floss threads that match
- **Color name** — what it's called in 30k+ actual color names
- **Export cards** — studio reference cards, PNG, yours to keep
- **AR Tracing** — project reference images onto your canvas with your camera (NEW!)
- **Zero account** — no email, no sign-up, no tracking
- **Your data** — stays on your machine. We don't see it. We don't store it.

---

## Features

### Color Tools

**Speed**

- 50% faster than v1. No bullshit. No lag. Click-to-color is instant.

**Color Sampling**

- Click any pixel. Get HEX, RGB, HSL instantly.
- Zoom/pan with keyboard + mouse. Smooth scrolling.

**Value Mode**

- Press V to check values in grayscale. Essential for painters.
- Adjustable overlay opacity. Choose 5/7/9/11 value steps.

**Oil Paint Recipes**

- 6-color limited palette (realistic, actually used by painters)
- Real paint brands supported: Winsor & Newton, Golden, Gamblin
- Spectral.js mixing engine (not magic, just accurate)
- Interactive mix lab for experimentation

**Embroidery Floss Matching**

- All 454 DMC threads. Top 5 matches for any color.
- Use it for cross-stitch. Use it as a reference. Just works.

**Keyboard Shortcuts**

- Spacebar: pan. +/-: zoom. V: value mode. 1-8: sidebar tabs. [/]: collapse sidebar.

**Privacy**

- Your images? Stay on your machine. We never see them.
- Your colors? Not tracked. Not sent to a server. Not sold.
- Export anything, anytime. It's yours.

**Accessibility**

- WCAG contrast ratios on every swatch. Screen reader ready. Keyboard navigable.

### AR Tracing (NEW!)

**Free Features**

- Camera-based AR projection of reference images
- Opacity control (0-100%) for perfect tracing
- Grid overlays (rule of thirds, golden ratio)
- Upload up to 5 reference images

**Pro Features ($1 one-time, lifetime access)**

- Unlimited reference image storage
- Value breakdown mode (light/mid/dark layers)
- Advanced AR tracking with stabilization
- High-resolution export (PNG, JPG, SVG)
- Time-lapse recording

**Why $1?**

- No subscription. Pay once, own forever.
- Competes with DaVinci Eye ($30/year) at 1/30th the price.
- Web-based: works on phones, tablets, and desktops.

Visit `/trace` to try it out!

---

## Get It Running

```bash
git clone https://github.com/coltonbatts/colorwizard.git
cd colorwizard
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). It's ready.

### Actually Using It

1. Load an image (drag + drop or click)
2. Click a color
3. Get your recipe
4. Export the card if you need it
5. Close the browser if you want (nothing gets stored on our servers anyway)

### Shortcuts That Matter

| Key        | What                 |
|------------|----------------------|
| Spacebar   | Hold to pan          |
| `+` / `-`  | Zoom                 |
| `V`        | Toggle value mode    |
| `1`-`8`    | Sidebar tabs         |
| `[` / `]`  | Hide/show sidebar    |

---

## Built With

Next.js 15 · React 18 · TypeScript · Tailwind · Canvas API · Spectral.js · Web Workers

---

## Scripts

| Command           | Description              |
|-------------------|--------------------------|
| `npm run dev`     | Start dev server         |
| `npm run build`   | Build for production     |
| `npm run start`   | Run production build     |
| `npm run lint`    | Run ESLint               |
| `npm run test`    | Run Vitest tests         |

---

## Coming Next

- [ ] Procreate plugin (sample colors directly in Procreate)
- [ ] Batch palette extraction (upload image, get 5 colors)
- [ ] Cloud sync (optional, Pro tier)
- [ ] Watercolor & acrylic palettes
- [ ] Custom paint library support
- [ ] CSV/JSON export for collections

---

## Contributing

Fork it. Improve it. Send a PR. We'll look at it.

---

## License

TBD (figure it out soon).

---

## Built By

[@thecoltonbatts](https://twitter.com/thecoltonbatts) — painter first, coder second.

**Data credits:** Zorn limited palette · [DMC thread data](https://github.com/adrianj/CrossStitchCreator) · [Color names](https://github.com/meodai/color-names)
