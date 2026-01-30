# ColorWizard 🎨

<div align="center">

```
 ██████╗  ██████╗ ██╗      ██████╗ ██████╗ ██╗    ██╗██╗███████╗ █████╗ ██████╗ ██████╗
██╔════╝ ██╔═══██╗██║     ██╔═══██╗██╔══██╗██║    ██║██║╚══███╔╝██╔══██╗██╔══██╗██╔══██╗
██║      ██║   ██║██║     ██║   ██║██████╔╝██║ █╗ ██║██║  ███╔╝ ███████║██████╔╝██║  ██║
██║      ██║   ██║██║     ██║   ██║██╔══██╗██║███╗██║██║ ███╔╝  ██╔══██║██╔══██╗██║  ██║
╚██████╗ ╚██████╔╝███████╗╚██████╔╝██║  ██║╚███╔███╔╝██║███████╗██║  ██║██║  ██║██████╔╝
 ╚═════╝  ╚═════╝ ╚══════╝ ╚═════╝ ╚═╝  ╚═╝ ╚══╝╚══╝ ╚═╝╚══════╝╚═╝  ╚═╝╚═╝  ╚═╝╚═════╝
```

**Built for painters, by a builder.**

</div>

---

## What Is ColorWizard?

ColorWizard is a free color sampling tool that generates **oil paint mixing recipes** from any reference image. Upload a photo, click a color, get the exact paint mixture.

**Real use:** Designers matching brand colors. Painters sampling reference images. Illustrators experimenting. Fiber artists finding embroidery thread matches.

**Live at:** [colorwizard.app](https://colorwizard.app) | **Free tier:** unlimited sampling | **Pro tier:** cloud sync + batch extraction (coming soon)

---

## Why It Exists

Most tools either:
- Give you RGB/HEX (useless for oil painters)
- Suggest pre-made palettes (not your actual colors)
- Require sign-up and emails (friction)

ColorWizard does one thing well: **Click a color, get the recipe.**

No sign-up. No ads. No nonsense.

---

## Key Features

### ⚡ Real-Time Paint Recipes
- Uses actual paint physics (Spectral.js mixing engine)
- Six-color limited palette (Titanium White, Ivory Black, Yellow Ochre, Cadmium Red, Phthalo Green, Phthalo Blue)
- Realistic mixing ratios based on pigment absorption
- Export reference cards as PNG

### 🧵 DMC Floss Matching
- 454 official embroidery colors
- Find the 5 closest thread matches
- Perfect for cross-stitch and embroidery projects

### 🎨 Color Naming
- 31,000+ color names from professional databases
- Know what shade you're mixing
- Learn color relationships

### 📸 Smart Color Sampling
- Click to sample from any uploaded image
- Zoom and pan with smooth controls
- Keyboard shortcuts for power users
- Mobile & iPad optimized

### 💾 Instant Export
- Generate color cards as PNG (includes recipe, name, values)
- Export color swatches for studio reference

### ✅ Zero Friction
- No login required
- No email upfront
- No tracking
- Processes locally in your browser
- Works offline

---

## Performance (v1.0 Improvements)

We spent a sprint optimizing. Here's what changed:

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| **Largest Contentful Paint (LCP)** | 2.4s | 1.2s | **50% faster** ⚡ |
| **First Input Delay (FID)** | 180ms | 65ms | **64% faster** |
| **JavaScript Bundle** | 185 KB | 144 KB | **22% smaller** |
| **Time to Interactive** | 3.1s | 1.6s | **48% faster** |
| **Re-renders on Color Sample** | 47 | 12 | **75% reduction** |

**Read the breakdown:** [ColorWizard Performance Sprint: How We 2x'd Speed](https://coltonbatts.com/blog/colorwizard-performance-sprint)

### How We Did It:
1. **Zustand selectors** — Fine-grained state updates (40% fewer re-renders)
2. **Component splitting** — Canvas, colors, recipes isolated
3. **Web Workers** — Paint mixing calculation offloaded from main thread
4. **Next.js optimization** — Modern bundling and image formats
5. **Profiling** — Measured everything, optimized relentlessly

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Framework** | Next.js 15 |
| **Language** | TypeScript 5 |
| **UI Library** | React 18 |
| **Styling** | Tailwind CSS 3.4 |
| **State** | Zustand (fine-grained selectors) |
| **Rendering** | HTML5 Canvas |
| **Paint Physics** | Spectral.js |
| **Worker Communication** | Comlink |
| **Testing** | Vitest |

---

## Getting Started

### For Users
- **Live:** [colorwizard.app](https://colorwizard.app)
- Try the free tier. No email needed.
- Click "Pro" to join the early access waitlist.

### For Developers
```bash
# Clone
git clone https://github.com/coltonbatts/colorwizard.git
cd colorwizard

# Install
npm install

# Run dev server
npm run dev
# → http://localhost:3000

# Build for production
npm run build
npm start

# Run tests
npm test

# Lint
npm run lint
```

---

## How to Use

1. **Upload an image** — Drag & drop or click to choose
2. **Sample a color** — Click anywhere on the image
3. **View the recipe** — Sidebar shows paint mix (with percentages)
4. **Export** — Generate a color card PNG for studio reference

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Spacebar` | Hold to pan image |
| `+` / `=` | Zoom in |
| `-` | Zoom out |
| `V` | Toggle Value Mode (grayscale) |
| `[` / `]` | Collapse/expand sidebar |
| `Shift+S` | Toggle Simple/Pro UI |

---

## Roadmap (v1.x)

**Released (v1.0):**
- ✅ Color sampling with zoom/pan
- ✅ Oil paint mixing recipes
- ✅ DMC floss matching
- ✅ Color naming
- ✅ Export color cards
- ✅ Performance optimization (50% faster)
- ✅ Free tier + Pro waitlist

**Coming Soon:**
- [ ] Batch palette extraction (upload image, extract all colors)
- [ ] Cloud palette sync (mix on desktop, access on iPad)
- [ ] Custom paint libraries (Acrylics, Watercolor)
- [ ] Procreate integration
- [ ] Export collections to CSV/JSON

---

## Why ColorWizard Matters

Performance isn't a feature—it's part of the product. When a tool responds instantly, it feels smart. It feels trustworthy. For a color sampling tool, that's everything.

But more importantly: **this is how you ship credibly.** We measured what was slow, fixed it systematically, and shipped the metrics. Other builders can learn from this approach.

ColorWizard is proof that:
1. Small, focused tools can still be powerful
2. Performance matters (even for design tools)
3. Shipping fast + learning in public builds an audience
4. Free tier + paid tier works for creative tools

---

## Contributing

Contributions welcome. To get started:

1. Fork the repo
2. Create a feature branch (`git checkout -b feature/your-feature`)
3. Commit your changes
4. Push and open a Pull Request

See [DEV_WORKFLOW.md](./docs/DEV_WORKFLOW.md) for detailed contribution guidelines.

---

## Privacy & Data

- **No tracking.** ColorWizard doesn't use analytics by default.
- **Local processing.** Images are never sent to servers.
- **No email collection.** Free tier requires zero signup.
- **No ads.** No data sales. Just a tool.

---

## Pricing

**Free Tier**
- Unlimited color sampling
- Paint mixing recipes
- DMC floss matching
- Export color cards
- Forever free

**Pro Tier** (coming soon)
- Everything in Free +
- Batch palette extraction
- Cloud sync across devices
- Custom paint libraries
- Priority feature requests
- **$8/month or $70/year**

---

## Support & Feedback

- **Found a bug?** [Open an issue](https://github.com/coltonbatts/colorwizard/issues)
- **Feature request?** Email feedback@colorwizard.app
- **Want to help?** [Email Colton](mailto:colton@colorwizard.app)
- **Follow the build:** [@thecoltonbatts](https://twitter.com/thecoltonbatts)

---

## Credits & Acknowledgments

- **Paint mixing logic:** Inspired by the Zorn limited palette and spectral-based color mixing research
- **DMC data:** [CrossStitchCreator](https://github.com/adrianj/CrossStitchCreator)
- **Color names:** [meodai/color-names](https://github.com/meodai/color-names)
- **Spectral mixing:** [Spectral.js](https://github.com/chir.ag/spectral)

---

## License

MIT License. See [LICENSE](./LICENSE) for details.

---

<div align="center">

**Built by [@thecoltonbatts](https://twitter.com/thecoltonbatts)**

Shipping fast. Measuring everything. Learning in public.

[Try ColorWizard Free →](https://colorwizard.app)

</div>
