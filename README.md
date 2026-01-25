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

`calibrate` • `sample` • `mix-match` • `export`

</div>

**An oil painter's daily driver for color sampling, mixing recipes, and palette management.**

---

## What It Does

Upload any reference image, click a color, and ColorWizard gives you:

- **Oil paint mixing recipe** using a limited, realistic palette
- **DMC embroidery floss matches** with the 5 closest threads
- **Human-readable color name** from a 30k+ color database
- **Exportable color cards** (PNG) for studio reference

---

## Key Features

**Modern UI/UX**

- **Collapsible Sidebar Sections**: Clean, modular interface using the new `CollapsibleSection` component.
- **Accent-Coded Categories**: Color-coded sections (Blue, Purple, Teal, etc.) for better visual organization.
- **Fast Navigation**: Optimized sidebar for both desktop and tablet use.

**Color Sampling**

- Click-to-sample on any uploaded image
- HEX, RGB, and HSL readouts
- Zoom/pan with keyboard shortcuts and mouse controls

**Value Mode**

- Global toggle accessible from toolbar (or press `V`)
- Converts canvas to grayscale for value checking
- **Opacity Control**: Adjust the value overlay intensity in real-time.
- **Configurable Steps**: Choose between 5, 7, 9, or 11 value intervals.
- **Refined Step Legend**: Modern grid-based preview of luminance values.
- Essential for painters checking value relationships

**Oil Paint Recipes**

- Six-color limited palette (Titanium White, Ivory Black, Yellow Ochre, Cadmium Red, Phthalo Green, Phthalo Blue)
- Brand-aware tube library (Winsor & Newton, Golden, Gamblin)
- Spectral.js mixing engine for realistic blending
- Mix Lab for interactive recipe experiments

**DMC Floss Matching**

- All 454 official DMC embroidery floss colors
- Top 5 matches with similarity percentages
- Perfect for cross-stitch and embroidery projects

**Color Cards**

- Generate studio reference cards for any sampled color
- Export as high-res PNG
- Includes color name, values, and mixing recipe

---

## Getting Started

### Prerequisites

- Node.js 20.x or higher
- npm (comes with Node.js)

### Install

```bash
git clone https://github.com/coltonbatts/colorwizard.git
cd colorwizard
npm install
```

### Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Usage

1. **Load an image**: Click "Choose Image" or drag and drop.
2. **Navigate**: Scroll to zoom, hold spacebar and drag to pan.
3. **Sample a color**: Click anywhere on the image.
4. **View results**: The sidebar shows the paint recipe, DMC matches, and color name.
5. **Export**: Generate a color card and save as PNG.

### Keyboard Shortcuts

| Shortcut   | Action                    |
|------------|---------------------------|
| `Spacebar` | Hold to pan               |
| `+` / `=`  | Zoom in                   |
| `-`        | Zoom out                  |
| `V`        | Toggle Value Mode         |
| `1`-`8`    | Switch sidebar tabs       |
| `9`        | Check My Values view      |
| `0`        | Check My Drawing view     |
| `[` / `]`  | Collapse/expand sidebar   |
| `Shift+S`  | Toggle Simple/Pro mode    |

---

## Tech Stack

| Layer      | Technology           |
|------------|----------------------|
| Framework  | Next.js 15           |
| Language   | TypeScript 5         |
| UI         | React 18             |
| Styling    | Tailwind CSS 3.4     |
| Rendering  | HTML5 Canvas         |
| Mixing     | Spectral.js          |

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

## Roadmap (v1)

- [x] Color sampling with zoom/pan
- [x] Oil paint mixing recipes
- [x] DMC floss matching
- [x] Color naming
- [x] Exportable color cards
- [x] Session palette persistence
- [x] Value Mode for grayscale value checking
- [ ] Palette extraction from full image
- [ ] Export collections to CSV/JSON
- [ ] Watercolor and acrylic palette support

---

## Contributing

Contributions welcome. To get started:

1. Fork the repo
2. Create a feature branch (`git checkout -b feature/your-feature`)
3. Commit your changes
4. Push and open a Pull Request

---

## License

License TBD. See repo for updates.

---

## Acknowledgments

- Paint mixing logic inspired by the Zorn limited palette
- DMC data from [CrossStitchCreator](https://github.com/adrianj/CrossStitchCreator)
- Color names from [meodai/color-names](https://github.com/meodai/color-names)

---

Built for painters, by a painter.
