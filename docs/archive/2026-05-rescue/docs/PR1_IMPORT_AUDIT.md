# PR1 Import Audit - Core Loop Isolation Check

## Analysis of All Imports in PR1 Files

### ✅ File 1: `lib/store/useStore.ts`

**Imports:**
```typescript
import { create } from 'zustand'                                      // ✅ Core (state management)
import { persist } from 'zustand/middleware'                          // ✅ Core (persistence)
import { PinnedColor } from '../types/pinnedColor'                    // ⚠️  UI Feature (not core loop)
import { ValueScaleSettings, DEFAULT_VALUE_SCALE_SETTINGS } from '../types/valueScale'  // ⚠️  Analysis Feature
import { Palette, DEFAULT_PALETTE } from '../types/palette'           // ⚠️  UI Feature
import { ValueScaleResult } from '../valueScale'                      // ⚠️  Analysis Feature
import { CanvasSettings, DEFAULT_CANVAS_SETTINGS } from '../types/canvas'  // ⚠️  UI Settings
import { MeasurementLayer } from '../types/measurement'               // 🔴 EXPERIMENTAL (measurement tools)
import { CalibrationData, TransformState, ... } from '../calibration' // 🔴 EXPERIMENTAL (calibration)
```

**Verdict:** Store is bloated but PR1 doesn't modify bloat imports. **SAFE for PR1.**

**For PR3:** Remove measurement/calibration fields from store.

---

### ✅ File 2: `app/page.tsx`

**Core Loop Imports (✅):**
```typescript
import ImageCanvas from '@/components/ImageCanvas'                    // ✅ Core (canvas render)
import { useStore } from '@/lib/store/useStore'                       // ✅ Core (state)
import { rgbToHex, rgbToHsl } from '@/lib/color/conversions'          // ✅ Core (color utils)
import MatchesTab from '@/components/tabs/MatchesTab'                 // ✅ Core (DMC matching)
import SampleTab from '@/components/tabs/SampleTab'                   // ✅ Core (sampling UI)
```

**Experimental/Bloat Imports (🔴):**
```typescript
import CalibrationModal from '@/components/CalibrationModal'          // 🔴 EXPERIMENTAL
import { useImageAnalyzer } from '@/hooks/useImageAnalyzer'           // ⚠️  For value analysis (not core)
import SurfaceTab from '@/components/tabs/SurfaceTab'                 // 🔴 EXPERIMENTAL
import StructureTab from '@/components/tabs/StructureTab'             // 🔴 EXPERIMENTAL (grid)
import ReferenceTab from '@/components/tabs/ReferenceTab'             // 🔴 EXPERIMENTAL
import AdvancedTab from '@/components/tabs/AdvancedTab'               // ⚠️  Value analysis
import OilMixTab from '@/components/tabs/OilMixTab'                   // ⚠️  Paint mixing (keep?)
import PaletteTab from '@/components/tabs/PaletteTab'                 // ⚠️  Palette management (keep?)
import CheckMyValuesView from '@/components/CheckMyValuesView'        // 🔴 EXPERIMENTAL (dynamic import)
import CheckMyDrawingView from '@/components/CheckMyDrawingView'      // 🔴 EXPERIMENTAL (dynamic import)
```

**Verdict:** `app/page.tsx` imports experimental features but PR1 doesn't modify those code paths. **SAFE for PR1.**

**For PR3:** Remove experimental tabs and modals.

---

### ✅ File 3: `components/ImageCanvas.tsx`

**Core Loop Imports (✅):**
```typescript
import { useStore } from '@/lib/store/useStore'                       // ✅ Core (state)
import { createSourceBuffer } from '@/lib/imagePipeline'              // ✅ Core (image decode)
import { rgbToHsl } from '@/lib/colorUtils'                           // ✅ Core (color conversion)
import { ImageDropzone } from '@/components/canvas'                   // ✅ Core (upload)
```

**Experimental/Bloat Imports (🔴):**
```typescript
import RulerOverlay from '@/components/RulerOverlay'                  // 🔴 EXPERIMENTAL (measurement)
import { CalibrationData } from '@/lib/calibration'                   // 🔴 EXPERIMENTAL
import { MeasurementLayer } from '@/lib/types/measurement'            // 🔴 EXPERIMENTAL
import { GridControlsPanel } from '@/components/canvas'               // 🔴 EXPERIMENTAL (grid)
import { useImageAnalyzer } from '@/hooks/useImageAnalyzer'           // ⚠️  Value analysis
import { BreakdownStep } from '@/components/ProcessSlider'            // 🔴 EXPERIMENTAL (breakdown)
import { ValueScaleSettings, ValueScaleResult } from '@/lib/types/valueScale'  // ⚠️  Analysis
```

**Verdict:** `ImageCanvas.tsx` has experimental imports but they're used for features outside core loop. PR1 only touches `onImageLoad` interface. **SAFE for PR1.**

**For PR2:** Create separate `CoreCanvas.tsx` with only upload → sample functionality.

---

### ✅ File 4: `components/canvas/ImageDropzone.tsx`

**Imports:**
```typescript
import { useCallback, useState, useId } from 'react'                  // ✅ Core (React)
```

**Verdict:** CLEAN. Zero external dependencies. **SAFE.**

---

### ✅ File 5: `lib/imagePipeline.ts`

**Imports:**
```
(none - pure utility)
```

**Verdict:** CLEAN. Zero dependencies. **SAFE.**

---

## Summary

### ✅ PR1 Is Core-Loop Isolated

**All PR1 changes touch only:**
1. Upload flow (`ImageDropzone.tsx`) - ✅ Core
2. Image metadata tracking (`useStore.ts`) - ✅ Core (additive)
3. Sync effect (`app/page.tsx`) - ✅ Core
4. Image decode (`imagePipeline.ts`) - ✅ Core
5. Canvas interface (`ImageCanvas.tsx`) - ✅ Core (1-line change)

**No experimental features modified.**

---

## Suspected Imports for Future PRs

### 🔴 HIGH PRIORITY (Remove in PR3)

**Experimental Features:**
- `@/components/CalibrationModal` - Measurement calibration
- `@/components/RulerOverlay` - Ruler overlay
- `@/lib/calibration` - Calibration logic
- `@/lib/types/measurement` - Measurement types
- `@/components/tabs/SurfaceTab` - Surface overlay
- `@/components/tabs/StructureTab` - Grid system
- `@/components/tabs/ReferenceTab` - Reference overlay
- `@/components/CheckMyValuesView` - Full-screen value view
- `@/components/CheckMyDrawingView` - Full-screen drawing view
- `@/components/ProcessSlider` - Breakdown slider
- `@/components/canvas/GridControlsPanel` - Grid controls

**Total Bloat:** ~12 components + supporting files

---

### ⚠️  MEDIUM PRIORITY (Evaluate in PR3)

**Analysis Features (keep for now, evaluate later):**
- `@/hooks/useImageAnalyzer` - Value/histogram analysis
- `@/lib/valueScale` - Value scale computation
- `@/components/tabs/AdvancedTab` - Advanced color analysis

**UI Features (keep for now):**
- `@/components/tabs/OilMixTab` - Paint mixing (useful?)
- `@/components/tabs/PaletteTab` - Palette management (useful?)
- `@/lib/types/palette` - Palette types

---

## Proposed Alternatives (None Needed)

All imports in PR1 are either:
1. ✅ Core loop dependencies (required)
2. ⚠️  Existing bloat (not touched by PR1)
3. 🔴 Experimental (not touched by PR1)

**No alternatives needed.** PR1 is clean.

---

## Action Items

### Before PR2:
- [ ] Verify PR1 tests pass
- [ ] Confirm no experimental features accidentally activated

### For PR2:
- [ ] Create `/core` structure
- [ ] Move core loop files
- [ ] Update imports

### For PR3:
- [ ] Remove experimental components
- [ ] Remove bloat from store
- [ ] Clean up imports in `app/page.tsx`
- [ ] Slim down `ImageCanvas.tsx` (or create `CoreCanvas.tsx`)

---

**Conclusion:** PR1 is isolated from experimental features. Safe to proceed.
