# Mobile Image Loading Fix - February 2026

## Problem Summary

On mobile Safari (and mobile breakpoints in general), after uploading an image, users saw a white screen with only the "New Image" button visible. The image would not render, even though:
- The image was successfully loaded into state
- Controls and UI elements were visible
- Color data was being processed

## Root Causes Identified

### 1. Container Height = 0
**Issue**: The canvas container had width (699px) but height was 0, preventing `imageDrawInfo` from being calculated.

**Why it happened**: 
- The flex container chain from `.mobile-preview-area` → `div.flex-1` → `div.flex-1.relative` → `.canvas-viewport` wasn't providing height
- Mobile Safari's flexbox behavior differs from desktop
- Toolbar and controls were taking space, leaving 0 height for the canvas container

**Fix**: Added explicit height using `calc(70dvh - 120px)` to account for toolbar/controls:
```css
.mobile-preview-area > div.flex-1 > div.flex-1 > div.flex-1.relative {
    height: calc(70dvh - 120px) !important;
    min-height: calc(70dvh - 120px) !important;
}
```

### 2. Blob URL Revocation
**Issue**: Object URLs were revoked immediately after image load, making `image.src` invalid for fallback rendering.

**Why it happened**: 
- `URL.revokeObjectURL()` was called in `cleanup()` immediately after `onImageLoad`
- The fallback image tried to use `image.src` but it was already revoked
- Mobile Safari is stricter about blob URL lifecycle

**Fix**: Convert images to data URLs before storing:
```typescript
const canvas = document.createElement('canvas')
canvas.width = img.width
canvas.height = img.height
const ctx = canvas.getContext('2d')
ctx.drawImage(img, 0, 0)
const dataUrl = canvas.toDataURL('image/png')
img.src = dataUrl  // Now persistent
```

### 3. Preview Area Too Small
**Issue**: Preview area was only 65vh, user requested minimum 70vh.

**Fix**: Updated CSS variable and max-height:
```css
--mobile-preview-height: 70vh;
.mobile-preview-area {
    min-height: 70dvh;
    max-height: 70dvh;
}
```

### 4. Dimension Initialization Race Condition
**Issue**: `imageDrawInfo` wasn't being set because dimensions were 0 when calculated.

**Fix**: 
- Added fallback image that displays while dimensions initialize
- Added retry mechanism with exponential backoff
- Added force-init useEffect that checks parent container height if child is 0

## Files Changed

1. **`app/globals.css`**
   - Updated `.mobile-preview-area` to use 70vh instead of 65vh
   - Added explicit height rules for flex container chain
   - Added `calc(70dvh - 120px)` for canvas container

2. **`components/ImageCanvas.tsx`**
   - Convert blob URLs to data URLs before storing
   - Added fallback image display when `imageDrawInfo` isn't ready
   - Added retry logic for dimension initialization
   - Added debug panel (toggleable with `DEBUG_PANEL_ENABLED`)

3. **`components/canvas/ImageDropzone.tsx`**
   - Convert blob URLs to data URLs

4. **`app/page.tsx`**
   - Added explicit height style to canvas container div

## Prevention Guidelines

### ✅ DO:
1. **Always test on mobile breakpoints** - Desktop flexbox behavior differs from mobile
2. **Use explicit heights for flex containers on mobile** - Don't rely on `flex: 1` alone
3. **Convert blob URLs to data URLs** - If you need to persist image sources
4. **Add fallback rendering** - Show image directly while canvas initializes
5. **Use `calc()` for heights** - Account for toolbars/controls when setting container heights
6. **Test container dimensions** - Log `getBoundingClientRect()` to verify heights aren't 0

### ❌ DON'T:
1. **Don't revoke blob URLs immediately** - Wait until you have a persistent source
2. **Don't assume flex containers will have height** - Mobile Safari needs explicit heights
3. **Don't skip mobile testing** - What works on desktop may fail on mobile
4. **Don't use `min-h-0` without explicit height** - It can collapse to 0 on mobile

## Debug Tools Added

A toggleable debug panel was added to `ImageCanvas.tsx`:
- Set `DEBUG_PANEL_ENABLED = true` to enable
- Shows real-time logs of image loading, dimension initialization, and errors
- Scrollable panel in bottom-right corner
- Useful for diagnosing mobile layout issues

## Testing Checklist

When working on mobile layout changes:

- [ ] Test at smallest mobile breakpoint (iPhone SE - 375px)
- [ ] Verify container heights are > 0 (check `getBoundingClientRect()`)
- [ ] Test image upload flow end-to-end
- [ ] Verify fallback image shows if canvas isn't ready
- [ ] Check that `imageDrawInfo` is set after image loads
- [ ] Verify canvas actually renders (not just white screen)
- [ ] Test on real mobile Safari device if possible

## Related Issues

- Mobile Safari flexbox height behavior
- Blob URL lifecycle management
- Canvas initialization timing
- Mobile-first responsive design

## Date Fixed
February 1, 2026

## Key Takeaway

**Mobile Safari requires explicit heights for flex containers. Always use `calc()` or explicit pixel values for mobile, don't rely on flexbox alone.**
