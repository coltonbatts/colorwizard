# PR2: Core Boundary Refactor - Exact Move Plan

**Goal:** Organize core loop files into `/core` structure for clear boundaries.  
**Scope:** File moves + import updates only. Zero logic changes.  
**Risk:** Low (TypeScript catches all broken imports)

---

## Target Structure

```
/core/
  /image/
    - upload.ts           (ImageDropzone logic)
    - pipeline.ts         (decode, buffer creation)
    - types.ts            (ImageMetadata, etc.)
  /canvas/
    - renderer.ts         (canvas draw logic)
    - sampling.ts         (color sampling from canvas)
  /color/
    - conversions.ts      (RGB/HSL/Lab conversions)
    - matching.ts         (Delta E, color distance)
  /dmc/
    - data.ts             (454 DMC thread colors)
    - matcher.ts          (DMC matching logic)
  /store/
    - types.ts            (core state types only)
    - actions.ts          (core actions only)
    - index.ts            (re-exports for backwards compat)

/ui/
  - ImageCanvas.tsx       (thin wrapper calling core)
  - ImageDropzone.tsx     (UI component)
  - MatchesTab.tsx        (DMC matches UI)
  - SampleTab.tsx         (sampling UI)

/experimental/
  (quarantine zone - future PR3)
```

---

## Exact Git Commands

### Step 1: Create Directory Structure

```bash
mkdir -p core/image
mkdir -p core/canvas
mkdir -p core/color
mkdir -p core/dmc
mkdir -p core/store
mkdir -p ui
mkdir -p experimental
```

---

### Step 2: Move Image Processing Files

```bash
# Move image pipeline (already in lib/)
git mv lib/imagePipeline.ts core/image/pipeline.ts

# Move camera utilities (if used)
git mv lib/camera core/image/camera

# Extract ImageDropzone logic to core (keep UI component separate)
# (manual: extract loadImage() logic to core/image/upload.ts)
# (keep ImageDropzone.tsx as thin UI wrapper)
```

**After move, create:**
- `core/image/types.ts` - Move `ImageMetadata` interface here
- `core/image/upload.ts` - Extract upload logic from `ImageDropzone.tsx`

---

### Step 3: Move Color Utilities

```bash
# Move color conversion utilities
git mv lib/color core/color
# Result:
#   core/color/conversions.ts
#   core/color/types.ts

# Move color matching utilities
git mv lib/colorUtils.ts core/color/matching.ts

# Move spectral (if keeping for core)
git mv lib/spectral core/color/spectral
```

---

### Step 4: Move DMC Matching

```bash
# Move DMC floss data and matching
git mv lib/dmcFloss.ts core/dmc/data.ts
git mv lib/dmcFloss.test.ts core/dmc/data.test.ts
```

**After move, create:**
- `core/dmc/matcher.ts` - Extract matching logic from data.ts
- `core/dmc/index.ts` - Re-export for backwards compat

---

### Step 5: Move Canvas Rendering

```bash
# Move canvas rendering utilities
git mv lib/canvasRendering.ts core/canvas/renderer.ts

# Move canvas measurement (if keeping)
git mv lib/canvasMeasurement.test.ts core/canvas/measurement.test.ts
```

**After move, extract from `ImageCanvas.tsx`:**
- `core/canvas/sampling.ts` - Extract `sampleColor()` logic
- `core/canvas/transforms.ts` - Extract zoom/pan logic (if keeping)

---

### Step 6: Refactor Store (Careful!)

```bash
# Keep store in place for now, but create core subset
# (manual step - extract core fields only)
```

**Create new files:**
- `core/store/types.ts` - Core state types only:
  ```typescript
  interface CoreState {
    image: HTMLImageElement | null
    imageMetadata: ImageMetadata | null
    sampledColor: ColorData | null
  }
  ```
- `core/store/actions.ts` - Core actions only:
  ```typescript
  setImage(image, metadata)
  setSampledColor(color)
  ```

**Keep existing `lib/store/useStore.ts` but deprecate non-core fields in PR3.**

---

### Step 7: Move UI Components

```bash
# Move core UI components to /ui
git mv components/ImageCanvas.tsx ui/ImageCanvas.tsx
git mv components/canvas/ImageDropzone.tsx ui/ImageDropzone.tsx
git mv components/tabs/MatchesTab.tsx ui/MatchesTab.tsx
git mv components/tabs/SampleTab.tsx ui/SampleTab.tsx
git mv components/DMCFlossMatch.tsx ui/DMCFlossMatch.tsx
```

---

### Step 8: Update Imports (Automated)

After moves, update all imports:

```bash
# Find all files importing from old paths
rg "from '@/lib/imagePipeline'" --files-with-matches | \
  xargs sed -i '' "s|from '@/lib/imagePipeline'|from '@/core/image/pipeline'|g"

rg "from '@/lib/colorUtils'" --files-with-matches | \
  xargs sed -i '' "s|from '@/lib/colorUtils'|from '@/core/color/matching'|g"

rg "from '@/lib/dmcFloss'" --files-with-matches | \
  xargs sed -i '' "s|from '@/lib/dmcFloss'|from '@/core/dmc'|g"

rg "from '@/components/ImageCanvas'" --files-with-matches | \
  xargs sed -i '' "s|from '@/components/ImageCanvas'|from '@/ui/ImageCanvas'|g"

# ... continue for each moved file
```

**Or use TypeScript language server:**
- VSCode/Cursor will auto-update imports
- Run `npm run type-check` to verify

---

## Simplified Alternative (Recommended)

**If full refactor is too risky, do minimal moves:**

### Minimal PR2: Just Core Loop Files

```bash
# Create core structure
mkdir -p core/image
mkdir -p core/dmc
mkdir -p core/color

# Move only core loop essentials
git mv lib/imagePipeline.ts core/image/pipeline.ts
git mv lib/dmcFloss.ts core/dmc/data.ts
git mv lib/color/conversions.ts core/color/conversions.ts
git mv lib/colorUtils.ts core/color/matching.ts

# Update imports (3-4 files max)
# Update:
#   - components/ImageCanvas.tsx
#   - components/canvas/ImageDropzone.tsx
#   - app/page.tsx
#   - components/tabs/MatchesTab.tsx
```

**Advantages:**
- Lower risk (only 4-5 file moves)
- Clear boundary established
- Can iterate in future PRs

---

## Import Update Checklist

After running `git mv` commands, update imports in:

### High Priority (Core Loop)
- [ ] `app/page.tsx` - Update imagePipeline import
- [ ] `components/ImageCanvas.tsx` - Update imagePipeline, colorUtils imports
- [ ] `components/canvas/ImageDropzone.tsx` - (no imports to update)
- [ ] `components/tabs/MatchesTab.tsx` - Update dmcFloss import
- [ ] `components/DMCFlossMatch.tsx` - Update dmcFloss, colorUtils imports

### Medium Priority (Other Components)
- [ ] `lib/store/useStore.ts` - Update type imports (if moved)
- [ ] `hooks/useImageAnalyzer.ts` - Update colorUtils import
- [ ] All other tab components using color utilities

### Low Priority (Tests)
- [ ] `lib/dmcFloss.test.ts` - Update import path
- [ ] Any other tests importing moved files

---

## Verification Steps

### 1. TypeScript Check
```bash
npm run type-check
# Expected: 0 errors
```

### 2. Build Check
```bash
npm run build
# Expected: Build succeeds
```

### 3. Runtime Check
```bash
npm run dev
# Test: Upload → Sample → DMC Match
# Expected: All works as before
```

### 4. Import Map Verification
```bash
# Verify no old paths remain
rg "from '@/lib/imagePipeline'" --type ts --type tsx
rg "from '@/lib/dmcFloss'" --type ts --type tsx
rg "from '@/lib/colorUtils'" --type ts --type tsx

# Expected: 0 matches (all updated)
```

---

## Rollback Plan

If imports break:

```bash
# Revert all moves
git revert HEAD

# Or manually undo
git mv core/image/pipeline.ts lib/imagePipeline.ts
git mv core/dmc/data.ts lib/dmcFloss.ts
# ... etc
```

---

## Recommended Approach

### Option A: Minimal Moves (Safest)

**Move only 4 files:**
1. `lib/imagePipeline.ts` → `core/image/pipeline.ts`
2. `lib/dmcFloss.ts` → `core/dmc/data.ts`
3. `lib/color/conversions.ts` → `core/color/conversions.ts`
4. `lib/colorUtils.ts` → `core/color/matching.ts`

**Update ~10 import statements.**

**Time:** 30 minutes  
**Risk:** Very Low

---

### Option B: Full Core Refactor (Comprehensive)

**Move 15+ files:**
- All image processing
- All color utilities
- All DMC matching
- Core UI components

**Update ~50+ import statements.**

**Time:** 2-3 hours  
**Risk:** Medium (more surface area for breakage)

---

## Decision Point

**After PR1 ships successfully:**

1. **If PR1 had issues:** Do Minimal PR2 (Option A)
2. **If PR1 was smooth:** Consider Full PR2 (Option B)
3. **If timeline pressure:** Skip PR2, go straight to PR3 (bloat removal)

**My Recommendation:** Start with Minimal PR2 (Option A), can always expand later.

---

## Expected Outcome

**After PR2:**
- ✅ Core loop files in `/core` folder
- ✅ Clear separation of concerns
- ✅ Easier to identify bloat (everything NOT in `/core`)
- ✅ Zero functional changes
- ✅ All tests pass
- ✅ TypeScript happy

**Bundle size:** No change (just file moves)  
**Risk:** Low (TypeScript catches breaks)  
**Time:** 30 min - 3 hours (depending on scope)

---

## Next Steps After PR2

1. Verify core loop still works (QA tests 1-7)
2. Document new folder structure
3. Update README with new import paths
4. Proceed to PR3 (bloat removal)

---

**Recommendation:** Start with **Minimal PR2 (Option A)** after PR1 ships.
