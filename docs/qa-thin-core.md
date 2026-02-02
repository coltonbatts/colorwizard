# Thin Core QA Checklist

**Purpose:** Verify the essential ColorWizard flow works reliably after refactor.  
**Scope:** Upload → Canvas → Sample → DMC Match only. No experimental features.

---

## Test Devices

**Required:**
- [ ] iPhone Safari (real device preferred, iOS 16+)
- [ ] Desktop Chrome or Safari (macOS/Windows)

**Optional (if available):**
- [ ] iPad Safari
- [ ] Android Chrome

---

## Critical Path Tests

### 1. Upload & Display

**Steps:**
1. Open ColorWizard with no image loaded
2. Click "Choose Image" button
3. Select a JPEG/PNG image

**Expected:**
- [ ] Image displays immediately on canvas
- [ ] No console errors
- [ ] Canvas is responsive (can zoom/pan)

**Mobile Specific:**
- [ ] Upload works from camera roll
- [ ] Image displays in correct orientation (not rotated)
- [ ] No memory crash on iPhone (test with 4000x3000px photo)

---

### 2. Upload Second Image (Stale Image Test)

**Steps:**
1. With first image loaded
2. Click "Choose Image" again
3. Select a **different** image

**Expected:**
- [ ] New image replaces old image immediately
- [ ] No flash of old image
- [ ] Canvas resets zoom/pan appropriately
- [ ] Console shows "[ImageDropzone] Image loaded successfully: [new dimensions]"

**Critical Failure Modes:**
- ❌ Old image still visible
- ❌ New image doesn't render
- ❌ Canvas shows blank/white screen
- ❌ Browser tab crashes (mobile)

---

### 3. Upload Same Image Twice

**Steps:**
1. Upload image A
2. Upload the same image A again (same filename)

**Expected:**
- [ ] Image refreshes/re-renders (even if visually identical)
- [ ] Console logs show new upload event

**Bug to Prevent:**
- ❌ Upload appears to do nothing (file input not reset)

---

### 4. Hard Refresh Behavior

**Steps:**
1. Upload an image
2. Hard refresh browser (Cmd+Shift+R / Ctrl+F5)

**Expected:**
- [ ] Either: Image persists and loads from localStorage
- [ ] Or: Image resets to upload screen
- [ ] Behavior is **consistent** and **predictable**
- [ ] No error state or infinite loading

**Mobile Specific:**
- [ ] Swipe-to-refresh works correctly
- [ ] Background tab resume works correctly

---

### 5. Color Sampling Accuracy

**Steps:**
1. Upload a test image with known colors (use `docs/test-assets/color-grid.png` if available)
2. Click on a red patch (e.g., RGB 255,0,0)
3. Check sampled color in sidebar

**Expected:**
- [ ] Sampled RGB values are **accurate** (within ±2 due to JPEG compression)
- [ ] No desaturation (colors should not look grayer than original)
- [ ] No unexpected hue shifts
- [ ] Hex value displays correctly

**Test Multiple Colors:**
- [ ] Pure red (255,0,0)
- [ ] Pure white (255,255,255)
- [ ] Pure black (0,0,0)
- [ ] Mid-gray (128,128,128)
- [ ] Skin tone (e.g., 240,200,180)

---

### 6. DMC Matching Works End-to-End

**Steps:**
1. Upload an image
2. Click on a color (e.g., blue sky)
3. Navigate to "Matches" tab (or "Threads" on mobile)

**Expected:**
- [ ] DMC floss matches appear immediately
- [ ] Top match has reasonable similarity score (<10 Delta E for common colors)
- [ ] Match cards show thread number, name, color swatch
- [ ] No "undefined" or error messages

**Mobile Specific:**
- [ ] "Threads" quick-access button works (bottom-right)
- [ ] Match cards are readable and tappable

---

### 7. HEIC Upload (iPhone Only)

**Steps:**
1. On iPhone, take a new photo with Camera app (saves as HEIC by default)
2. Upload that photo to ColorWizard

**Expected:**
- [ ] "Converting HEIC..." message appears
- [ ] Conversion completes within 10 seconds
- [ ] Image displays correctly after conversion
- [ ] Colors are accurate (no color space issues)

**If HEIC Fails:**
- [ ] Error message is clear and helpful
- [ ] App doesn't freeze or crash
- [ ] User can try again with JPEG

---

## Performance Checks

### 8. No Memory Leaks

**Steps:**
1. Upload 5 different images in sequence
2. Check Chrome DevTools Memory panel (optional)

**Expected:**
- [ ] Each upload replaces previous image cleanly
- [ ] No gradual slowdown
- [ ] No browser tab crash

---

### 9. Responsive UI

**Steps:**
1. Resize browser window from wide to narrow
2. Test on mobile portrait and landscape

**Expected:**
- [ ] Canvas area remains visible and functional
- [ ] Upload button remains accessible
- [ ] No UI elements overlap or break

---

## Regression Prevention

### 10. No Accidental Image Processing

**Steps:**
1. Upload a high-saturation test image (e.g., pure RGB primaries)
2. Compare displayed image to original file side-by-side

**Expected:**
- [ ] No auto-desaturation
- [ ] No auto-contrast adjustment
- [ ] No sharpening or blur
- [ ] Colors match original exactly (within monitor color space limits)

**Critical:** If this fails, reference image is being altered.

---

## Pass/Fail Criteria

**PASS:** All 10 critical tests pass on both iPhone Safari and Desktop Chrome.  
**FAIL:** Any of tests 1-7 fail, OR test 10 fails (image distortion).

**Blocker Bugs:**
- Stale image on re-upload
- Memory crash on mobile
- Incorrect color sampling
- DMC matching broken

---

## Test Assets Needed

Create if missing:
- `docs/test-assets/color-grid.png` - 6x6 grid of known RGB values
- `docs/test-assets/iphone-portrait.heic` - Sample HEIC file for testing
- `docs/test-assets/large-photo.jpg` - 4000x3000px+ photo for memory testing

---

## Automated Test (Optional)

If time permits, add 1 Playwright test:

```typescript
// tests/e2e/upload-updates-canvas.spec.ts
test('uploading new image updates canvas immediately', async ({ page }) => {
  await page.goto('/');
  
  // Upload first image
  await page.setInputFiles('input[type="file"]', 'test-assets/image1.jpg');
  await expect(page.locator('canvas')).toBeVisible();
  const firstSnapshot = await page.locator('canvas').screenshot();
  
  // Upload second image
  await page.setInputFiles('input[type="file"]', 'test-assets/image2.jpg');
  await page.waitForTimeout(500); // Allow render
  const secondSnapshot = await page.locator('canvas').screenshot();
  
  // Verify images are different
  expect(firstSnapshot).not.toEqual(secondSnapshot);
});
```

---

## Sign-off

**Tester:** _______________  
**Date:** _______________  
**Result:** [ ] PASS [ ] FAIL  
**Notes:**
