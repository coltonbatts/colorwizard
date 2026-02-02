# Debug Instrumentation Guide

## How to Enable Debug Logging

### Option 1: Query Parameter (Recommended for Testing)

Add `?debug=upload` to any URL:

```
http://localhost:3000?debug=upload
https://colorwizard.app?debug=upload
```

**Advantage:** Can be toggled on/off without rebuilding, works in production.

---

### Option 2: Environment Variable (Build-time)

Add to `.env.local`:

```bash
NEXT_PUBLIC_DEBUG_UPLOAD=true
```

Then restart dev server:

```bash
npm run dev
```

**Advantage:** Always on during development, no need to remember query param.

---

## What Gets Logged

### Upload Flow (`ImageDropzone.tsx`)

```
[DEBUG:Upload] Blob URL created: blob:http://... for file: photo.jpg 2456789 bytes
[DEBUG:Upload] Metadata generated: {
  id: "1738454321-abc123",
  fileName: "photo.jpg",
  uploadedAt: 1738454321000,
  width: 3024,
  height: 4032
}
[DEBUG:Upload] Blob URL revoked (data URL success): blob:http://...
```

**OR** if data URL conversion fails:

```
[DEBUG:Upload] Blob URL kept alive (data URL failed), will revoke in 5s: blob:http://...
[DEBUG:Upload] Blob URL revoked (delayed): blob:http://...
```

---

### Canvas Pipeline (`imagePipeline.ts`)

```
[DEBUG:Pipeline] createSourceBuffer START {
  originalWidth: 4032,
  originalHeight: 3024,
  src: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgA..."
}
[DEBUG:Pipeline] Downscaling to: 2048 x 1536 ratio: 0.508
[DEBUG:Pipeline] createSourceBuffer COMPLETE {
  bufferWidth: 2048,
  bufferHeight: 1536,
  elapsedMs: "123.45"
}
```

---

## Testing with Debug Mode

### Test Scenario: Same File Uploaded Twice

```bash
# Enable debug mode
open http://localhost:3000?debug=upload

# Upload test.jpg
# Expected logs:
[DEBUG:Upload] Metadata generated: { id: "1738454321-abc123", ... }

# Upload test.jpg again
# Expected logs:
[DEBUG:Upload] Metadata generated: { id: "1738454567-def456", ... }
                                            ^^^^^^^^^^^^^^ DIFFERENT!
```

**Verify:** Two different UUIDs confirm each upload is treated as unique.

---

### Test Scenario: Large Image Downscaling

```bash
# Upload 5472x3648 image (20MP)
# Expected logs:
[DEBUG:Pipeline] createSourceBuffer START { originalWidth: 5472, originalHeight: 3648 }
[DEBUG:Pipeline] Downscaling to: 2048 x 1365 ratio: 0.374
[DEBUG:Pipeline] createSourceBuffer COMPLETE { elapsedMs: "234.56" }
```

**Verify:** Image is downscaled to 2048px max dimension.

---

### Test Scenario: Blob URL Lifecycle

```bash
# Upload JPEG (normal)
# Expected logs:
[DEBUG:Upload] Blob URL created: blob:http://localhost:3000/abc-123
[DEBUG:Upload] Blob URL revoked (data URL success): blob:http://localhost:3000/abc-123
```

**Verify:** Blob URL is revoked immediately after data URL conversion succeeds.

```bash
# Simulate data URL failure (very large image that exceeds canvas limit)
# Expected logs:
[DEBUG:Upload] Blob URL created: blob:http://localhost:3000/abc-123
[DEBUG:Upload] Blob URL kept alive (data URL failed), will revoke in 5s: ...
[DEBUG:Upload] Blob URL revoked (delayed): blob:http://localhost:3000/abc-123
```

**Verify:** Blob URL is kept alive for 5s if data URL conversion fails.

---

## Removing Instrumentation (Before Production)

If you want to remove debug logging before production deploy:

### Option 1: Keep It (Recommended)

- Debug logs only appear when `?debug=upload` is in URL
- Zero performance impact in production (checked at runtime)
- Useful for debugging production issues

### Option 2: Strip It (Clean Build)

Search and remove all lines containing:

```typescript
debugLog(...)
```

And remove the `debugLog()` function definition from:
- `components/canvas/ImageDropzone.tsx`
- `lib/imagePipeline.ts`

**Command to find all occurrences:**

```bash
rg "debugLog" --type ts --type tsx
```

---

## Performance Impact

**With Debug Disabled (Default):**
- Impact: <0.1ms per check (URL parse + condition)
- Negligible

**With Debug Enabled:**
- Impact: ~1-2ms per log statement
- Acceptable for debugging

**Production Recommendation:**
- Keep debug code, it's behind a flag
- Does not affect normal users
- Invaluable for debugging production issues

---

## Example Debug Session

### Problem: "Image not updating on re-upload"

**Steps:**

1. Enable debug: `http://localhost:3000?debug=upload`
2. Upload image A
3. Upload image B
4. Check console logs

**Expected:**

```
[DEBUG:Upload] Metadata generated: { id: "123-abc", fileName: "imageA.jpg" }
[Home] Reference image changed, clearing old image... 123-abc
[DEBUG:Upload] Metadata generated: { id: "456-def", fileName: "imageB.jpg" }
[Home] Reference image changed, clearing old image... 456-def
```

**If Missing:**
- No "clearing old image" log → Sync effect not triggered
- Same UUID for both uploads → UUID generation broken
- No metadata logged → Metadata not being passed through

---

## FAQ

**Q: Will debug logs appear in production?**
A: Only if user adds `?debug=upload` to URL. Safe to ship.

**Q: Can I add more debug logs?**
A: Yes! Use the `debugLog()` function in any file that has it defined.

**Q: How do I debug on iPhone Safari?**
A: Use Safari's Web Inspector (connect iPhone to Mac, Safari → Develop → iPhone → ColorWizard)

**Q: What about privacy?**
A: Debug logs don't contain user data, only file names and dimensions.
