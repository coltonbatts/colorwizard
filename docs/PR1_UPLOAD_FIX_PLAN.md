# PR1: Upload/Stale Fix - Implementation Plan

**Goal:** Fix stale image behavior and mobile upload reliability.  
**Scope:** 4 files, core upload flow only.  
**Risk Level:** Low (additive changes, no breaking refactors)

---

## Root Cause Analysis

### Bug #1: Stale Image on Re-Upload

**Location:** `app/page.tsx` lines 141-160

**Problem:**
```typescript
useEffect(() => {
  if (referenceImage && !image && referenceImage !== lastProcessedRef.current) {
    // Load image...
  }
}, [referenceImage, image, setImage])
```

**Issue:** The guard `!image` prevents sync if an image is already loaded.

**Scenario:**
1. User uploads image A → `image` is set, `referenceImage` is set
2. User uploads image B → `referenceImage` updates to B
3. Effect sees `referenceImage && !image` = FALSE (image A still in state)
4. Image A remains visible, B is never loaded

**Fix:** Force clear `image` when `referenceImage` changes to a new value.

---

### Bug #2: No Unique Image ID

**Location:** `ImageDropzone.tsx` lines 260-297

**Problem:** No way to detect if uploaded image is truly new vs. cached.

**Issue:** 
- Same filename uploaded twice may not trigger re-render
- Object URLs get revoked but no new object URL created
- No tracking of upload timestamp or unique ID

**Fix:** Add UUID to each uploaded image, store in metadata.

---

### Bug #3: Missing EXIF Orientation

**Location:** `lib/imagePipeline.ts` line 46

**Problem:** `createImageBitmap()` call doesn't handle EXIF orientation.

**Issue:**
- iPhone portrait photos have EXIF rotation metadata
- Without handling, photos render sideways
- Mobile Safari needs explicit `imageOrientation: 'from-image'` option

**Fix:** Add orientation option to `createImageBitmap()`.

---

### Bug #4: Data URL Fallback Failure

**Location:** `ImageDropzone.tsx` lines 277-291

**Problem:** If `canvas.toDataURL()` fails, silently uses blob URL which will be revoked.

**Issue:**
```typescript
try {
  const dataUrl = canvas.toDataURL('image/png');
  img.src = dataUrl;
} catch (e) {
  console.warn('[ImageDropzone] Failed to convert to data URL:', e);
  // Still uses blob URL which will be revoked later!
}
```

**Fix:** Ensure blob URL is NOT revoked if data URL conversion fails.

---

## Implementation Changes

### Change 1: Add Image Metadata to Store

**File:** `lib/store/useStore.ts`

**Add new state fields (after line 39):**

```typescript
interface ImageMetadata {
  id: string // UUID for uniqueness
  fileName: string
  uploadedAt: number // timestamp
  width: number
  height: number
}

interface ColorState {
  // ... existing fields ...
  image: HTMLImageElement | null
  imageMetadata: ImageMetadata | null // NEW
  referenceImage: string | null
  referenceImageMetadata: ImageMetadata | null // NEW
```

**Add new actions (after line 113):**

```typescript
setImage: (image: HTMLImageElement | null, metadata?: ImageMetadata | null) => void
setReferenceImage: (image: string | null, metadata?: ImageMetadata | null) => void
```

**Update implementation (in create block, around line 200+):**

```typescript
setImage: (image, metadata = null) => {
  set({ image, imageMetadata: metadata })
},
setReferenceImage: (image, metadata = null) => {
  set({ referenceImage: image, referenceImageMetadata: metadata })
},
```

**Why Safe:**
- Additive fields (no breaking changes)
- Metadata is optional (backwards compatible)
- Existing code continues to work without metadata

---

### Change 2: Fix Sync Effect in Page

**File:** `app/page.tsx`

**Replace lines 138-160 with:**

```typescript
const lastProcessedRef = useRef<string | null>(null)

// Synchronize persistent referenceImage string to runtime HTMLImageElement
useEffect(() => {
  const currentId = referenceImageMetadata?.id || referenceImage

  // Force clear image if referenceImage changed to new ID
  if (currentId && currentId !== lastProcessedRef.current) {
    console.log('[Home] Reference image changed, clearing old image...')
    setImage(null) // Clear stale image first
  }

  if (referenceImage && !image && currentId !== lastProcessedRef.current) {
    console.log('[Home] Loading reference image from string...', currentId)
    lastProcessedRef.current = currentId

    const img = new Image()
    img.crossOrigin = "anonymous"
    img.src = referenceImage
    img.onload = () => {
      console.log('[Home] Reference image loaded successfully')
      setImage(img, referenceImageMetadata) // Pass metadata through
    }
    img.onerror = (e) => {
      console.error('[Home] Failed to load reference image:', e)
      lastProcessedRef.current = null
    }
  } else if (!referenceImage) {
    lastProcessedRef.current = null
  }
}, [referenceImage, referenceImageMetadata, image, setImage])
```

**Key Changes:**
1. Added `referenceImageMetadata` to dependencies
2. Force clear `image` when `referenceImage` ID changes
3. Pass metadata through `setImage()` call

**Why Safe:**
- Still handles all existing cases
- Adds explicit clearing step before re-load
- Preserves existing error handling

---

### Change 3: Add UUID to Upload Flow

**File:** `components/canvas/ImageDropzone.tsx`

**Add import at top:**

```typescript
import { useCallback, useState, useId } from 'react';

// Add UUID helper
function generateUUID(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}
```

**Update `loadImage()` function (lines 260-297):**

```typescript
img.onload = () => {
  console.log('[ImageDropzone] Image loaded successfully:', img.width, 'x', img.height);
  
  // Generate unique ID for this upload
  const imageId = generateUUID()
  const metadata = {
    id: imageId,
    fileName: processedFile.name,
    uploadedAt: Date.now(),
    width: img.width,
    height: img.height,
  }
  
  // Convert to data URL to preserve image source (blob URLs get revoked)
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d');
  
  let finalSrc = objectUrl // Fallback to blob URL
  let blobUrlRevoked = false
  
  if (ctx) {
    ctx.drawImage(img, 0, 0);
    try {
      const dataUrl = canvas.toDataURL('image/png');
      img.src = dataUrl;
      finalSrc = dataUrl
      console.log('[ImageDropzone] Converted image to data URL');
      
      // Only revoke blob URL if data URL succeeded
      URL.revokeObjectURL(objectUrl);
      blobUrlRevoked = true
    } catch (e) {
      console.warn('[ImageDropzone] Failed to convert to data URL, keeping blob URL:', e);
      // Don't revoke blob URL since we're still using it
    }
  }
  
  // Create new image element with final src
  const finalImg = new Image()
  finalImg.src = finalSrc
  finalImg.onload = () => {
    onImageLoad(finalImg, metadata) // Pass metadata to callback
    
    // Revoke blob URL if not already done
    if (!blobUrlRevoked) {
      // Keep blob URL alive longer if data URL conversion failed
      setTimeout(() => URL.revokeObjectURL(objectUrl), 5000)
    }
  }
};
```

**Update component interface:**

```typescript
interface ImageDropzoneProps {
  /** Called when an image is successfully loaded */
  onImageLoad: (img: HTMLImageElement, metadata?: any) => void;
}
```

**Why Safe:**
- UUID generation is simple and reliable
- Blob URL lifecycle now explicitly managed
- Fallback path for data URL failure
- Backwards compatible (metadata optional)

---

### Change 4: Fix EXIF Orientation

**File:** `lib/imagePipeline.ts`

**Update `createSourceBuffer()` function (lines 43-58):**

```typescript
try {
  // Optimization: Use createImageBitmap if available (modern browsers)
  // This handles downscaling much more efficiently than drawImage on a massive source
  if ('createImageBitmap' in window) {
    const bitmap = await createImageBitmap(image, {
      resizeWidth: width,
      resizeHeight: height,
      resizeQuality: 'high',
      imageOrientation: 'from-image' // NEW: Handle EXIF orientation
    });
    ctx.drawImage(bitmap, 0, 0);
    bitmap.close(); // Important: release memory immediately
  } else {
    // Fallback for older browsers
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(image, 0, 0, width, height);
  }
} catch (err) {
  console.warn('[imagePipeline] createImageBitmap failed, falling back to drawImage', err);
  // Fallback if bitmap creation fails
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(image, 0, 0, width, height);
}
```

**Why Safe:**
- `imageOrientation: 'from-image'` is supported in all modern browsers
- Falls back gracefully if not supported
- No breaking changes to API

---

### Change 5: Update ImageCanvas Integration

**File:** `components/ImageCanvas.tsx`

**Update `onImageLoad` prop usage (where it's called):**

Search for where `onImageLoad` is called and ensure metadata is passed through.

**Expected caller:** `app/page.tsx` line 501

**Update prop interface (lines 46-48):**

```typescript
interface ImageCanvasProps {
  image: HTMLImageElement | null
  onImageLoad: (img: HTMLImageElement, metadata?: any) => void // Add optional metadata param
  // ... rest of props
}
```

**Update callback in `app/page.tsx` (around line 501):**

```typescript
<ImageCanvas
  image={image}
  onImageLoad={(img, metadata) => {
    setImage(img, metadata) // Pass metadata to store
    if (metadata) {
      // Also persist to referenceImage for localStorage
      const dataUrl = img.src
      setReferenceImage(dataUrl, metadata)
    }
  }}
  // ... rest of props
/>
```

**Why Safe:**
- Metadata parameter is optional
- Existing code works without modification
- Only activated when metadata is provided

---

## Testing Plan

### Manual Test Checklist (from QA doc)

**Must Pass:**
- [ ] Test 1: Upload & Display (both devices)
- [ ] Test 2: Upload Second Image (stale image test) ← PRIMARY TARGET
- [ ] Test 3: Upload Same Image Twice
- [ ] Test 4: Hard Refresh Behavior
- [ ] Test 7: HEIC Upload (iPhone only) ← ORIENTATION FIX

### Verification Steps

**Before merge:**

1. **Local Testing:**
   - Run on `localhost:3000`
   - Test upload sequence: A → B → A → C
   - Verify console logs show new IDs for each upload
   - Check mobile Safari on real iPhone

2. **Staging Deployment:**
   - Deploy to Vercel preview
   - Test on real iPhone Safari
   - Test HEIC upload with portrait photo
   - Verify no console errors

3. **Backwards Compatibility:**
   - Clear localStorage
   - Verify old sessions still work
   - Upload new image, refresh, verify persistence

---

## Rollback Plan

**If PR1 causes issues:**

1. **Immediate:** Revert PR via GitHub
2. **Deploy:** Trigger Vercel rollback to previous deployment
3. **Investigate:** Check localStorage schema compatibility
4. **Fix Forward:** Address issue in PR1.1 hotfix

**Safe because:**
- All changes are additive (no schema breaking)
- Old metadata-less flow still works
- localStorage migration is graceful (undefined → null)

---

## Definition of Done

- [ ] All 4 code changes implemented
- [ ] Tests 1-4, 7 from QA doc pass on iPhone and Desktop
- [ ] No console errors on clean session
- [ ] Code reviewed by at least one other person
- [ ] Deployed to staging and manually tested
- [ ] Performance impact: <50ms added to upload flow
- [ ] Bundle size impact: <5KB (UUID helper is tiny)

---

## Estimated Impact

**Lines Changed:** ~120 lines across 4 files  
**Risk Level:** Low  
**User Impact:** High (fixes major UX bug)  
**Time to Implement:** 2-3 hours  
**Time to Test:** 1 hour  

**Next Steps After Merge:**
- Monitor error logs for 24 hours
- Collect user feedback
- Proceed to PR2 (core boundary refactor)
