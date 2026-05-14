# Thin Core Release - Definition of Done

**Release Goal:** Ship a stable, minimal ColorWizard focused only on the essential core loop.

---

## Phase Status

### ✅ PR0: Core Loop Map + QA Doc (COMPLETE)

**Deliverables:**
- [x] Core loop mapped with exact file paths (`docs/PR1_UPLOAD_FIX_PLAN.md`)
- [x] 10 failure points identified
- [x] QA test plan created (`docs/qa-thin-core.md`)
- [x] Bloat areas catalogued

---

### 🚧 PR1: Upload/Stale Fix (IN PROGRESS - CODE COMPLETE)

**Code Changes:**
- [x] Add `ImageMetadata` type to store (with UUID)
- [x] Update `setImage()` to accept metadata
- [x] Update `setReferenceImage()` to accept metadata
- [x] Fix sync effect in `app/page.tsx` (force clear stale images)
- [x] Add UUID generation to `ImageDropzone.tsx`
- [x] Improve blob URL lifecycle management
- [x] Add EXIF orientation handling to `imagePipeline.ts`

**Files Changed (7 files):**
1. ✅ `lib/store/useStore.ts` - Added metadata tracking
2. ✅ `app/page.tsx` - Fixed stale image sync effect
3. ✅ `components/ImageCanvas.tsx` - Updated interface for metadata
4. ✅ `components/canvas/ImageDropzone.tsx` - UUID generation + lifecycle
5. ✅ `lib/imagePipeline.ts` - EXIF orientation fix

**Testing Required:**
- [ ] Test 1: Upload & Display (iPhone + Desktop)
- [ ] Test 2: Upload Second Image (PRIMARY - stale image bug)
- [ ] Test 3: Upload Same Image Twice
- [ ] Test 4: Hard Refresh Behavior
- [ ] Test 7: HEIC Upload (iPhone with portrait photo)
- [ ] No console errors
- [ ] No linter errors ✅ (verified)

**Deployment:**
- [ ] Deploy to Vercel preview
- [ ] Test on real iPhone Safari
- [ ] Monitor for 24 hours
- [ ] Merge to main

---

### 📋 PR2: Core Boundary Refactor (PLANNED)

**Goal:** Organize code into `/core` structure for clear boundaries.

**Structure to Create:**
```
/core/
  /image/     - Upload, decode, buffer creation
  /canvas/    - Rendering pipeline
  /sampling/  - Color sampling + spectral
  /dmc/       - DMC matching + data
/ui/          - Thin UI components
/experimental/- Quarantined features
```

**Scope:**
- Pure file moves + import updates
- No logic changes
- TypeScript will catch all broken imports

**Definition of Done:**
- [ ] All core loop files moved to `/core`
- [ ] All imports updated
- [ ] Build succeeds with no errors
- [ ] All tests pass (if any)
- [ ] QA tests 1-7 still pass

---

### 📋 PR3: Prune/Quarantine + Dep Cleanup (PLANNED)

**Goal:** Remove bloat and slim bundle size.

**Targets to Quarantine/Delete:**

**Routes to Remove:**
- [ ] `/trace` (experimental AR tracing)
- [ ] `/color-theory` (educational content, not core)
- [ ] `/dashboard` (not used in main flow)
- [ ] `/pricing` (keep for marketing, but not core app)

**Components to Quarantine:**
- [ ] Measurement tools (ruler, calibration)
- [ ] Grid system (doodle grid)
- [ ] Value breakdown slider
- [ ] CheckMyValuesView (full-screen experimental)
- [ ] CheckMyDrawingView (full-screen experimental)
- [ ] Surface/Structure/Reference tabs (not core)

**Store Fields to Deprecate:**
- [ ] `measureMode`, `measurePointA`, `measurePointB`
- [ ] `calibration`, `calibrationStale`
- [ ] `rulerGridEnabled`, `rulerGridSpacing`
- [ ] `surfaceImage`, `surfaceBounds`
- [ ] `breakdownValue`

**Dependencies to Remove:**
- [ ] Review `package.json` for unused deps
- [ ] Remove worker-related packages if not needed
- [ ] Check for unused utility libraries

**Success Metrics:**
- [ ] Routes removed (document which ones)
- [ ] Components moved to `/experimental`
- [ ] Bundle size reduction: Target 15-20% reduction
- [ ] Build time improvement
- [ ] QA tests 1-7 still pass

---

## Overall Release Criteria

### Must Pass (Blockers)

**Functionality:**
- [ ] Upload works on iPhone Safari (real device)
- [ ] Upload works on Desktop Chrome/Safari
- [ ] HEIC conversion works (iPhone default format)
- [ ] New upload replaces old image immediately (no stale image)
- [ ] Color sampling is accurate (±2 RGB values)
- [ ] DMC matching works end-to-end

**Performance:**
- [ ] No memory crashes on mobile (test with 4000x3000px photo)
- [ ] Upload flow completes in <2 seconds (normal network)
- [ ] Canvas rendering is smooth (60fps)

**Quality:**
- [ ] No console errors in production
- [ ] No linter errors
- [ ] No TypeScript errors
- [ ] Lighthouse score: >90 Performance, >95 Accessibility

### Should Pass (Important but not blockers)

**UX:**
- [ ] Upload button clearly visible on mobile
- [ ] Sample color by tapping image (mobile)
- [ ] DMC matches appear immediately after sampling
- [ ] Back button works correctly (browser history)

**Robustness:**
- [ ] Same image uploaded twice triggers refresh
- [ ] Hard refresh behavior is predictable
- [ ] Orientation handled correctly (iPhone portrait photos)
- [ ] Large images (>4000px) downscale gracefully

---

## Verification Checklist

### Pre-Deployment

- [ ] All PR1 code changes reviewed
- [ ] QA tests 1-7 executed locally
- [ ] No regressions in existing features
- [ ] Bundle size analyzed (check for bloat)

### Post-Deployment (Staging)

- [ ] Deploy to Vercel preview URL
- [ ] Test on iPhone Safari (iOS 16+)
- [ ] Test on Desktop Chrome
- [ ] Test HEIC upload (real iPhone photo)
- [ ] Monitor Vercel analytics for errors

### Post-Deployment (Production)

- [ ] Monitor error logs for 24 hours
- [ ] Check user feedback/support tickets
- [ ] Verify localStorage migrations work
- [ ] No increase in error rates

---

## Rollback Plan

**If Critical Bug Found:**

1. **Immediate:** Revert PR1 via GitHub
2. **Deploy:** Trigger Vercel rollback to previous
3. **Investigate:** Check logs, localStorage issues
4. **Fix Forward:** Address in PR1.1 hotfix

**Safe Rollback Because:**
- Changes are additive (no schema breaking)
- Old metadata-less flow still works
- localStorage handles undefined → null gracefully

---

## Success Metrics

**Primary Goal:** Fix stale image bug
- [ ] 0 reports of "upload doesn't update image"
- [ ] Upload success rate: >99%

**Secondary Goals:**
- [ ] Mobile upload reliability: >95%
- [ ] HEIC conversion success rate: >90%
- [ ] User-reported bugs: <5 in first week

**Code Health:**
- [ ] Core loop files: <1500 LOC total
- [ ] Dependency count reduced by 10%
- [ ] Build time: <30 seconds

---

## Sign-off

### PR1 Approval

**Developer:** _______________  
**Date:** _______________  
**Code Review:** [ ] APPROVED [ ] CHANGES REQUESTED

**QA Tester:** _______________  
**Date:** _______________  
**QA Result:** [ ] PASS [ ] FAIL

### Release Approval

**Product Owner:** _______________  
**Date:** _______________  
**Release Decision:** [ ] GO [ ] NO-GO

---

## Next Steps After Release

1. **Monitor:** Watch error logs for 48 hours
2. **Collect:** User feedback and support tickets
3. **Measure:** Bundle size, performance metrics
4. **Plan:** PR2 (core boundary refactor)
5. **Communicate:** Release notes to users

---

## Notes

- Thin Core is an **incremental release strategy**
- Each PR is independently shippable
- Can pause/resume between PRs based on feedback
- Focus: Stability over features
