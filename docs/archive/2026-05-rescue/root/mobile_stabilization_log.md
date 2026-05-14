# Mobile Stabilization Log

## Baseline Assessment (2026-02-01)

### iOS Safari Symptoms

- **(A) Blank/Failed Upload**: Likely caused by large image dimensions (> 4000px) exceeding iOS Safari canvas memory limits during decode or draw.
- **(B) Distortion/Warping**: Potential aspect ratio mismatches in `calculateFit` or drawing logic. Current `calculateFit` has an integrity check but if the container dimensions are wrong, it might fail.
- **(C) Viewport/Canvas Sizing**: Fixed recent issue "stabilize mobile canvas viewport" on HEAD, but still needs verification.

### Code Path Map

- **File Input/Upload**: `ReferenceImageUploader.tsx -> handleFileSelect`. Uses `FileReader.readAsDataURL`. HEIC conversion via `heic2any`.
- **Image Decode**: `app/page.tsx` useEffect creates `new Image()` and sets `src`.
- **Drawing Image**: `ImageCanvas.tsx -> drawCanvas`. Uses `ctx.drawImage(image, x, y, width, height)`.
- **Transforms**: `ImageCanvas.tsx` handles zoom/pan via `ctx.translate` and `ctx.scale`.
- **Analysis**: `hooks/useImageAnalyzer.ts` downscales to 1000px for buffers.
- **Sampling**: `ImageCanvas.tsx -> sampleColor`. Reads directly from the display canvas via `ctx.getImageData`.

### Root Cause Hypotheses

1. **Memory**: Main `ImageCanvas` draws the original `HTMLImageElement` without a cap. High-res photos (e.g. 12MP) will hit memory limits on iOS Safari.
2. **Visual Integrity**: Sampling from a scaled/filtered canvas introduces interpolation artifacts or shifts if `isGrayscale` is on.
3. **Orientation**: Relying on browser built-in EXIF handling might be inconsistent across older iOS versions.

## Proposed Stabilized Pipeline

1. **Capped Source Buffer**: Always decode and draw to an offscreen "source buffer" (e.g. max 2048px). Use this for both sampling and as the drawing source for the display canvas.
2. **Display via Source Buffer**: Display canvas draws from the source buffer, not the raw `Image`.
3. **Explicit Sampling**: `sampleColor` reads from the source buffer, ensuring 1:1 pixel accuracy (within capped resolution) regardless of display zoom/filters.
4. **Canvas Lifecycle**: Explicitly manage canvas teardown on image change.
