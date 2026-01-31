# Color Wizard - Claude Code Kickoff Prompt

## Project Overview

Build a simple web app called **Color Wizard** that helps oil painters translate digital colors into paint mixing recipes.

## Core Functionality

1. **Image Upload**: User drops a PNG/JPEG onto the canvas
2. **Eyedropper Tool**: User can hover/click anywhere on the image to sample colors
3. **Color Analysis Panel**: Side panel displays:
   - The sampled color as a swatch
   - A simple color wheel showing the color's position (hue/saturation/value)
   - An oil paint mixing recipe using a limited palette

## Limited Palette (Zorn + Phthalos)

The app should ONLY generate recipes using these 6 colors:
- **Titanium White** - high value, neutral
- **Ivory Black** - low value, slightly cool/blue undertone
- **Yellow Ochre** - warm, muted yellow, medium-low saturation
- **Cadmium Red** - warm, high saturation red-orange
- **Phthalo Green** - cool, extremely high tinting strength, blue-leaning green
- **Phthalo Blue** - cool, extremely high tinting strength, red-leaning blue

## Color Mixing Logic (Keep it Simple)

Use a ballpark approximation approach:

1. Analyze the sampled color's HSL values
2. Determine the dominant hue family:
   - Warm yellows/oranges → Yellow Ochre + Cad Red base
   - Cool blues → Phthalo Blue + White + Black base
   - Greens → Phthalo Green (use sparingly, it's strong) + Yellow Ochre
   - Reds/pinks → Cad Red + White base
   - Purples → Phthalo Blue + Cad Red
   - Neutrals/browns → Yellow Ochre + Cad Red + Black
   - Grays → Black + White (warm gray: add Yellow Ochre, cool gray: add Phthalo Blue)

3. Adjust for saturation:
   - Low saturation = add more black or mix complements to mute
   - High saturation = use pure pigments with less mixing

4. Adjust for value:
   - High value (light) = add Titanium White
   - Low value (dark) = add Ivory Black or use less white

5. Output as simple ratios like:
   - "Mostly Yellow Ochre + touch of Cad Red + White"
   - "2 parts Phthalo Blue : 1 part White : dash of Black"

## Tech Stack

- **Framework**: Next.js or vanilla React (your choice, keep it simple)
- **Styling**: Tailwind CSS
- **Image handling**: HTML5 Canvas API for pixel sampling
- **No backend needed** - all processing client-side

## UI/UX Requirements

- Dark, minimal UI (dark grays, not pure black)
- Clean typography (Inter or similar)
- Layout: Image canvas on left (70%), analysis panel on right (30%)
- Eyedropper cursor when hovering over image
- Smooth, immediate feedback when sampling colors
- Mobile-friendly is NOT a priority - desktop-first

## File Structure Suggestion

```
color-wizard/
├── app/
│   ├── page.tsx
│   ├── layout.tsx
│   └── globals.css
├── components/
│   ├── ImageCanvas.tsx
│   ├── ColorPanel.tsx
│   ├── ColorWheel.tsx
│   └── PaintRecipe.tsx
├── lib/
│   └── colorMixer.ts  (mixing logic lives here)
├── public/
└── package.json
```

## MVP Scope - What to Build First

1. Basic layout with image drop zone and side panel
2. Image upload and display on canvas
3. Eyedropper that samples color on click
4. Display sampled color as swatch + HSL values
5. Basic paint recipe output (even if the logic is rough)

## What to Skip for Now

- Color wheel visualization (nice to have, not MVP)
- Multiple color palette saving
- Undo/history
- Export functionality
- Any user accounts or persistence

## Starting Point

Initialize a new Next.js project with Tailwind, then build out the components. Start with the image canvas and eyedropper functionality, then add the mixing logic.

---

**Build this as a working prototype. Keep it simple, keep it functional. We can refine the mixing accuracy later.**
