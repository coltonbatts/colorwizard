# ColorWizard Thin Core Refactor - Quick Start

**Status:** PR1 Code Complete ✅  
**Time:** 2026-02-01  
**Next:** Test & Deploy

---

## 📋 What Was Delivered

### ✅ PHASE 0: Core Loop Map (COMPLETE)

**Created:**
- `docs/PR1_UPLOAD_FIX_PLAN.md` - Detailed root cause analysis and implementation plan
- `docs/qa-thin-core.md` - 10-test QA checklist for manual testing
- `docs/THIN_CORE_RELEASE_DOD.md` - Definition of Done for entire release
- Core loop mapped with exact file paths (inline in this session)

---

### ✅ PR1: Upload/Stale Fix (CODE COMPLETE)

**Problem Fixed:**
- 🐛 Stale image bug (new upload didn't replace old image)
- 🐛 iPhone portrait photos rendering sideways (EXIF orientation)
- 🐛 Same filename uploaded twice appeared to do nothing
- 🐛 Blob URL lifecycle issues

**Files Changed (5 files, ~102 lines):**
1. `lib/store/useStore.ts` - Added image metadata tracking
2. `app/page.tsx` - Fixed sync effect race condition
3. `components/ImageCanvas.tsx` - Updated interface
4. `components/canvas/ImageDropzone.tsx` - UUID generation + lifecycle
5. `lib/imagePipeline.ts` - EXIF orientation fix

**Key Changes:**
- Each upload gets unique UUID
- Sync effect force-clears stale images
- EXIF orientation handled automatically
- Blob URL lifecycle improved

---

## 🚀 Next Steps (FOR YOU)

### 1. Test Locally (5-10 minutes)

```bash
# Start dev server
npm run dev

# Open http://localhost:3000
# Run tests 1-4 from docs/qa-thin-core.md
```

**Critical Test:**
1. Upload image A
2. Upload image B
3. ✅ Verify: B replaces A immediately (no stale image)

---

### 2. Test on iPhone Safari (10 minutes)

**Required:**
- Real iPhone (iOS 16+)
- Take photo with Camera app (HEIC portrait)
- Upload to ColorWizard
- ✅ Verify: Correct orientation

---

### 3. Deploy to Staging

```bash
# Create branch and commit
git checkout -b pr1-upload-fix
git add .
git commit -m "fix: upload stale image bug and EXIF orientation

- Add unique ID tracking to each uploaded image
- Force clear old image when new image ID detected
- Handle EXIF orientation for iPhone portrait photos
- Improve blob URL lifecycle management"

# Push and create PR
git push origin pr1-upload-fix
# Vercel will auto-deploy preview
```

---

### 4. Review Documentation

**Implementation Details:** `docs/PR1_SUMMARY.md`  
**QA Checklist:** `docs/qa-thin-core.md`  
**Release DOD:** `docs/THIN_CORE_RELEASE_DOD.md`

---

## 📁 Document Map

| Document | Purpose | When to Use |
|----------|---------|-------------|
| `PR1_UPLOAD_FIX_PLAN.md` | Root cause analysis & implementation plan | Before coding, for review |
| `PR1_SUMMARY.md` | Implementation summary & verification | After coding, before deploy |
| `qa-thin-core.md` | Manual test checklist (10 tests) | Testing phase |
| `THIN_CORE_RELEASE_DOD.md` | Overall release criteria | Release approval |
| `THIN_CORE_QUICK_START.md` | This file - navigation guide | Start here |

---

## 🔍 Core Loop Reference

**Upload Flow:**
```
User selects file
    ↓
ImageDropzone.loadImage()
    ↓
Generate UUID + metadata
    ↓
Convert to data URL
    ↓
onImageLoad(img, metadata)
    ↓
setImage(img, metadata) → useStore
    ↓
Sync effect in page.tsx
    ↓
Force clear old image if ID changed
    ↓
Load new image
    ↓
createSourceBuffer() (imagePipeline.ts)
    ↓
Canvas renders
    ↓
User clicks to sample
    ↓
sampleColor() reads from sourceBuffer
    ↓
DMC matching
```

**Key Files:**
- `components/canvas/ImageDropzone.tsx` - Upload entry
- `app/page.tsx` - Sync logic
- `lib/store/useStore.ts` - State management
- `lib/imagePipeline.ts` - Image decode/buffer
- `components/ImageCanvas.tsx` - Rendering + sampling
- `lib/dmcFloss.ts` - DMC matching

---

## ⚠️ Known Issues (Not Fixed in PR1)

### To Address in Future PRs

1. **ReferenceImageUploader component**
   - Separate upload component exists
   - Not updated with UUID logic
   - Should be deprecated or merged

2. **Bloat still present**
   - Measurement tools
   - Grid system
   - Value breakdown
   - Experimental views
   - **To remove in PR3**

3. **No folder structure**
   - Core loop files scattered
   - **To organize in PR2**

---

## 📊 Success Metrics

**Must Achieve (PR1):**
- [ ] Stale image bug fixed (test 2 passes)
- [ ] HEIC orientation fixed (test 7 passes)
- [ ] No regressions

**Future Goals (PR2-3):**
- [ ] Core loop in `/core` folder
- [ ] Bundle size reduced 15-20%
- [ ] Experimental features quarantined

---

## 🎯 PR2 & PR3 (Future)

### PR2: Core Boundary Refactor (PLANNED)

**Goal:** Move files to `/core` structure
```
/core/
  /image/   - Upload, decode, buffer
  /canvas/  - Rendering
  /sampling/- Sampling + spectral
  /dmc/     - DMC matching
```

**Scope:** File moves + import updates only

---

### PR3: Prune/Quarantine (PLANNED)

**Targets:**
- Move measurement tools to `/experimental`
- Move grid system to `/experimental`
- Remove unused routes (trace, color-theory)
- Uninstall unused dependencies
- Slim bundle size

**Output:**
- List of removed routes
- List of moved components
- Bundle size reduction metrics

---

## 🚦 Decision Points

### ✅ Proceed to PR2 If:
- All PR1 tests pass
- No critical bugs in 24 hours
- User feedback positive

### ⚠️ Pause and Fix If:
- Any blocker bug found
- Mobile Safari crashes
- Color sampling inaccurate

### 🛑 Rollback If:
- Production incidents
- Data loss
- Critical regression

---

## 💡 Tips for Testing

**Console Logs to Watch:**
```
[ImageDropzone] Final image ready with ID: [UUID]
[Home] Reference image changed, clearing old image...
[useStore] setImage called with: 1920x1080 metadata: {...}
```

**Red Flags:**
- ❌ "Failed to load reference image"
- ❌ Same UUID for different uploads
- ❌ Image not clearing on re-upload

**Green Flags:**
- ✅ New UUID for each upload
- ✅ "Clearing old image" log before new load
- ✅ Image replaces immediately

---

## 📞 Need Help?

**Check These First:**
1. Linter errors: `npm run lint`
2. TypeScript errors: `npm run type-check` (or build)
3. Console errors: Browser DevTools

**Common Issues:**
- **Build fails:** Check TypeScript types
- **Upload broken:** Check file input element
- **Stale image still happening:** Check UUID generation in console

---

## ✅ Ready to Ship Checklist

- [ ] Code changes reviewed
- [ ] Linter errors: 0 ✅
- [ ] TypeScript errors: 0 ✅
- [ ] Local testing passed
- [ ] iPhone Safari tested
- [ ] Staging deployed
- [ ] QA tests 1-7 passed
- [ ] No console errors
- [ ] Performance acceptable

---

**Current Status:** ✅ PR1 Code Complete  
**Next Action:** Test locally, then deploy to staging  
**Time Estimate:** 30 minutes testing + 24 hours monitoring

---

**Questions? Check:**
- `docs/PR1_SUMMARY.md` for implementation details
- `docs/qa-thin-core.md` for test procedures
- `docs/THIN_CORE_RELEASE_DOD.md` for release criteria
