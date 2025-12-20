# Color Wizard 🎨

An interactive web application for sampling colors from images and generating oil paint mixing recipes and DMC embroidery floss color matches. Built with Next.js, TypeScript, and React.

![Color Wizard Demo](https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js)
![React](https://img.shields.io/badge/React-18-blue?style=flat-square&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38bdf8?style=flat-square&logo=tailwind-css)

## Features

### 🖼️ Interactive Image Canvas

- **Drag & Drop or Browse**: Upload images directly or drag them into the canvas
- **Zoom Controls**:
  - Mouse wheel zoom with cursor-centered scaling
  - Zoom buttons (+/-) for precise control
  - Keyboard shortcuts (+ and - keys)
  - Zoom range: 10% to 500%
- **Pan & Navigate**:
  - Hold spacebar and drag to pan around the image
  - Middle mouse button drag support
  - Real-time pan offset display
- **Responsive Design**: Canvas automatically resizes to fit your viewport

### 🎨 Color Analysis

- **Precise Color Sampling**: Click any pixel to extract its exact color
- **Multiple Color Formats**:
  - **HEX**: Standard hexadecimal color codes (e.g., `#FF5733`)
  - **RGB**: Red, Green, Blue values (0-255)
  - **HSL**: Hue (0-360°), Saturation (0-100%), Lightness (0-100%)
- **Visual Color Swatch**: See the sampled color displayed prominently

### 🖌️ Oil Paint Recipe Generator

Unique algorithm that generates realistic oil paint mixing recipes using a **limited palette** of six essential colors:

- **Titanium White** - Cool white base
- **Ivory Black** - Neutral black
- **Yellow Ochre** - Warm, muted yellow
- **Cadmium Red** - Warm, vibrant red
- **Phthalo Green** - Cool, intense green
- **Phthalo Blue** - Cool, intense blue

The algorithm intelligently:

- Analyzes hue, saturation, and lightness values
- Determines appropriate base colors and mixing proportions
- Provides qualitative amounts (mostly, moderate, small amount, tiny touch)
- Includes helpful mixing notes and warnings
- Handles edge cases like near-white, near-black, and desaturated colors

#### 🔬 Spectral.js Paint Mixing

ColorWizard now uses **Spectral.js** for physically-accurate paint mixing based on **Kubelka-Munk theory**. Unlike RGB blending which produces unrealistic results (e.g., red + green = muddy brown instead of yellow), spectral mixing simulates how real pigments absorb and scatter light.

Key features:
- **Perceptual Color Matching**: Uses OKLab color space for Delta E calculations that match human perception
- **Grid Search Solver**: Finds optimal pigment combinations by testing thousands of weight combinations
- **Tinting Strength**: Accounts for highly-tinting pigments like Phthalos that dominate mixes
- **Match Quality**: Shows how close the predicted mix is to your target color (Excellent/Good/Fair/Poor)

**Important Note**: The pigment colors are approximations based on typical hex values. For truly accurate predictions, measured spectral reflectance data from actual paint samples would be needed.

#### 🧪 Mix Lab

An interactive playground for experimenting with spectral paint mixing:
- **6 Sliders**: Adjust the proportion of each palette pigment (0-100)
- **Live Preview**: See the resulting spectral mix update in real-time
- **Auto-Normalization**: Weights are automatically normalized to percentages
- **Compare to Target**: See your mix alongside the sampled target color

### 🧵 DMC Embroidery Floss Color Matching

Find the perfect embroidery thread colors with our comprehensive DMC floss database:

- **Complete DMC Database**: All 454 official DMC embroidery floss colors
- **Accurate Color Matching**: Uses Euclidean distance algorithm in RGB color space
- **Top 5 Matches**: Displays the closest matching floss colors with similarity percentages
- **Detailed Information**: Shows DMC number, color name, hex code, and visual swatch
- **Instant Results**: Real-time color matching as you sample colors from your image

Perfect for:

- Cross-stitch pattern designers
- Embroidery artists matching thread to reference images
- Crafters converting digital designs to physical projects
- Anyone needing precise DMC color recommendations

## Installation

### Prerequisites

- Node.js 20.x or higher
- npm or yarn package manager

### Setup

1. **Clone the repository**

```bash
git clone https://github.com/yourusername/colorwizard.git
cd colorwizard
```

2. **Install dependencies**

```bash
npm install
```

3. **Run the development server**

```bash
npm run dev
```

4. **Open your browser**
Navigate to [http://localhost:3000](http://localhost:3000)

## Usage

### Basic Workflow

1. **Load an Image**
   - Click "Choose Image" or drag and drop an image file
   - Supported formats: JPG, PNG, GIF, WebP, and other browser-supported image formats

2. **Navigate the Image**
   - **Zoom In/Out**: Scroll with your mouse wheel or use the +/- buttons
   - **Pan**: Hold spacebar and drag, or use middle mouse button
   - **Reset View**: Press `0` or click the "Fit" button

3. **Sample a Color**
   - Click anywhere on the image to sample that pixel's color
   - The color panel on the right will update with detailed information

4. **View Paint Recipe & DMC Matches**
   - Scroll down in the color panel to see the oil paint mixing recipe
   - View the top 5 DMC embroidery floss color matches below the paint recipe
   - Each DMC match shows the floss number, name, swatch, and similarity percentage
   - Use the DMC numbers to purchase the exact thread colors for your project

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Spacebar` | Hold to enable pan mode |
| `+` or `=` | Zoom in |
| `-` | Zoom out |
| `0` | Reset view to 100% zoom |

### Mouse Controls

| Action | Result |
|--------|--------|
| Left Click | Sample color at cursor position |
| Middle Click + Drag | Pan around the image |
| Scroll Wheel | Zoom in/out centered on cursor |
| Spacebar + Drag | Pan around the image |

## Project Structure

```
colorwizard/
├── app/
│   ├── layout.tsx          # Root layout component
│   ├── page.tsx            # Main application page
│   └── globals.css         # Global styles
├── components/
│   ├── ImageCanvas.tsx     # Interactive canvas with zoom/pan
│   ├── ColorPanel.tsx      # Color information display
│   ├── PaintRecipe.tsx     # Paint mixing recipe display
│   └── DMCFlossMatch.tsx   # DMC floss color matching display
├── lib/
│   ├── colorMixer.ts       # Paint recipe generation algorithm
│   └── dmcFloss.ts         # DMC floss database and matching algorithm
├── public/                 # Static assets
├── package.json            # Dependencies and scripts
├── tsconfig.json          # TypeScript configuration
├── tailwind.config.ts     # Tailwind CSS configuration
└── next.config.js         # Next.js configuration
```

## Technology Stack

- **Framework**: [Next.js 15](https://nextjs.org/) - React framework with App Router
- **Language**: [TypeScript 5](https://www.typescriptlang.org/) - Type-safe JavaScript
- **UI Library**: [React 18](https://react.dev/) - Component-based UI
- **Styling**: [Tailwind CSS 3.4](https://tailwindcss.com/) - Utility-first CSS
- **Canvas API**: HTML5 Canvas for image manipulation and color sampling

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server on port 3000 |
| `npm run build` | Build production-optimized bundle |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint for code quality checks |
| `npm run test` | Run Vitest unit tests |

## Color Theory & Algorithm

### RGB to HSL Conversion

The application converts RGB (Red, Green, Blue) color values to HSL (Hue, Saturation, Lightness) using a standard algorithm:

- **RGB**: Colors as combinations of red, green, and blue light (0-255)
- **HSL**: Colors in terms of hue (0-360°), saturation (0-100%), and lightness (0-100%)

HSL is more intuitive for color manipulation because it separates color information (hue) from brightness (lightness) and intensity (saturation).

### Paint Mixing Algorithm

The recipe generator uses a sophisticated algorithm that:

1. **Analyzes Lightness**: Determines if the color is very light (>80%), light (>60%), dark (<30%), or very dark (<15%)
2. **Analyzes Saturation**: Categorizes as desaturated (<20%), moderately saturated (20-60%), or highly saturated (>60%)
3. **Identifies Hue Family**: Maps the hue to specific color ranges:
   - Reds: 0-20° and 340-360°
   - Oranges: 20-45°
   - Yellows: 45-75°
   - Yellow-greens: 75-100°
   - Greens: 100-165°
   - Cyans: 165-190°
   - Blues: 190-250°
   - Purples: 250-290°
   - Magentas: 290-340°
4. **Generates Recipe**: Selects appropriate base colors and mixing proportions based on the analysis (Refined for accurate moderate saturation levels across all hues)
5. **Adds Mixing Notes**: Provides warnings about strong tinting colors (phthalos) and helpful tips

### DMC Color Matching Algorithm

The DMC floss matcher uses Euclidean distance in RGB color space to find the closest matching thread colors:

1. **Distance Calculation**: For each of the 454 DMC colors, calculates:

   ```
   distance = √[(R₁-R₂)² + (G₁-G₂)² + (B₁-B₂)²]
   ```

   where (R₁, G₁, B₁) is the sampled color and (R₂, G₂, B₂) is the DMC color

2. **Similarity Scoring**: Converts distance to a percentage match:
   - Maximum possible distance in RGB space: √(255² + 255² + 255²) ≈ 441.67
   - Similarity % = 100 - (distance / maxDistance × 100)

3. **Top Matches**: Sorts all 454 colors by distance and returns the 5 closest matches

4. **Display**: Shows DMC floss number, descriptive name, hex swatch, and similarity percentage

This method provides accurate color matching that considers all three color channels equally, making it ideal for finding visually similar embroidery thread colors.

## Features in Detail

### Image Canvas Component

The `ImageCanvas` component provides a fully-featured image viewer:

- **ResizeObserver Integration**: Automatically adjusts canvas dimensions when the container resizes
- **Transform Matrix**: Uses canvas transformations for smooth zoom and pan operations
- **Fit-to-View**: Initially fits images within the canvas while maintaining aspect ratio
- **Cursor Feedback**: Dynamic cursor changes (crosshair, grab, grabbing) based on current mode
- **Pixel-Perfect Sampling**: Uses `getImageData()` for accurate color extraction at any zoom level

### Color Analysis

The color panel displays:

- Large color swatch showing the sampled color
- HEX code for easy copying
- Individual RGB components
- HSL breakdown with labeled units (degrees, percentages)

### Paint Recipe Display

Each recipe includes:

- **Description**: Brief characterization of the resulting color
- **Color List**: Ordered list of paints with qualitative amounts
- **Mixing Notes**: Special considerations and warnings
- **Palette Reference**: List of all available colors in the limited palette

### DMC Floss Match Display

The DMC floss matcher shows:

- **Color Swatches**: Visual preview of each matched DMC color
- **DMC Numbers**: Official floss numbers (e.g., "310" for Black, "B5200" for Snow White)
- **Descriptive Names**: Full color names (e.g., "Salmon Very Light", "Peacock Blue")
- **Hex Codes**: Precise color values for digital reference
- **Match Percentages**: Similarity scores showing how close each match is (0-100%)
- **Database Info**: Note about the Euclidean distance algorithm used

The component automatically updates with the 5 best matches whenever a new color is sampled, making it easy to find the perfect thread colors for any image.

## Browser Compatibility

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Opera 76+

All modern browsers with HTML5 Canvas support are compatible.

## Performance Considerations

- **Canvas Rendering**: Uses efficient transform-based rendering
- **Image Processing**: Direct pixel data access for fast color sampling
- **React Optimization**: Memoized callbacks and careful effect dependencies
- **Responsive Design**: ResizeObserver ensures optimal canvas sizing

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.

## Acknowledgments

- Color mixing logic inspired by traditional oil painting techniques
- Limited palette approach based on the Zorn palette concept
- Canvas interaction patterns from modern image editing applications
- DMC color data sourced from the [CrossStitchCreator](https://github.com/adrianj/CrossStitchCreator) project

## Roadmap

Future enhancements could include:

- Color palette extraction from entire image
- Export sampled colors and matches to various formats (CSV, JSON, PDF)
- Color harmony suggestions (complementary, analogous, triadic)
- Save/load color collections and favorites
- Additional thread brand support (Anchor, J&P Coats, etc.)
- Watercolor and acrylic paint palette support
- Undo/redo for color sampling history
- Color search by name, HEX code, or DMC number
- Batch processing multiple images
- Print-friendly recipe cards

---

Built with ❤️ using Next.js and TypeScript
