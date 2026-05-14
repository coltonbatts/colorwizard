# Mobile Safari Hotfix - Client-Side Exception

**Date:** February 2, 2026  
**Status:** 🔥 Hotfix  
**Severity:** CRITICAL - Production mobile users unable to load app

## Problem

Mobile Safari (iOS Chrome/Safari) shows:
```
Application error: a client-side exception has occurred while loading colorwizard.app
(see the browser console for more information).
```

Desktop works perfectly. Mobile completely broken.

## Root Cause

**Zustand persist middleware** + **localStorage** causing hydration errors on mobile Safari:

1. **localStorage blocking**: Safari private browsing, storage quotas, security restrictions
2. **Corrupt persisted state**: Old state structure incompatible with current code
3. **useMediaQuery SSR mismatch**: `window.matchMedia` called before hydration complete
4. **No error handling**: Errors crash entire app instead of gracefully degrading

## Fix Applied

### 1. Safe Storage Wrapper (`lib/store/useStore.ts`)

```typescript
// Memory fallback for when localStorage is unavailable
const createSafeStorage = () => {
    let memoryStorage: Record<string, string> = {}
    
    const safeStorage = {
        getItem: (name: string): string | null => {
            try {
                if (typeof window === 'undefined') return null
                return window.localStorage.getItem(name) ?? memoryStorage[name] ?? null
            } catch {
                return memoryStorage[name] ?? null
            }
        },
        setItem: (name: string, value: string): void => {
            try {
                if (typeof window !== 'undefined') {
                    window.localStorage.setItem(name, value)
                }
                memoryStorage[name] = value
            } catch {
                memoryStorage[name] = value
            }
        },
        removeItem: (name: string): void => {
            try {
                if (typeof window !== 'undefined') {
                    window.localStorage.removeItem(name)
                }
                delete memoryStorage[name]
            } catch {
                delete memoryStorage[name]
            }
        },
    }
    
    return safeStorage
}
```

**Why:** If localStorage fails (blocked/quota/private browsing), falls back to in-memory storage. App continues to work, just doesn't persist between sessions.

### 2. Error Handling in Persist Middleware

```typescript
{
    name: 'colorwizard-storage',
    storage: createJSONStorage(() => createSafeStorage()),
    onRehydrateStorage: () => (state, error) => {
        if (error) {
            console.warn('Failed to rehydrate store from localStorage:', error)
            // Clear corrupted storage
            try {
                if (typeof window !== 'undefined') {
                    window.localStorage.removeItem('colorwizard-storage')
                }
            } catch (e) {
                // localStorage not available, ignore
            }
        }
    },
}
```

**Why:** If persisted state is corrupt or incompatible, clears it and starts fresh instead of crashing.

### 3. SSR-Safe useMediaQuery (`hooks/useMediaQuery.ts`)

**Before:**
```typescript
const [matches, setMatches] = useState(false)
```

**After:**
```typescript
const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined') return false
    try {
        return window.matchMedia(query).matches
    } catch {
        return false
    }
})
```

**Why:** Initialize with actual media query value on client to prevent hydration mismatch between server (always `false`) and client (could be `true` on mobile).

## Files Changed

1. `lib/store/useStore.ts` - Safe storage + error handling
2. `hooks/useMediaQuery.ts` - SSR-safe initialization

## Testing Required

### Critical Path (Do Immediately)
1. ✅ Desktop Chrome - image upload works
2. ⏳ **iPhone Safari** - app loads, upload works
3. ⏳ **iPhone Chrome** - app loads, upload works
4. ⏳ **Safari Private Browsing** - app loads (doesn't persist, but works)

### Edge Cases
5. ⏳ Upload image on mobile, refresh, check if state persists
6. ⏳ Open app with corrupt localStorage (manually corrupt via dev tools)
7. ⏳ Rapid uploads on mobile (stress test)

## Verification Steps

1. Clear mobile Safari cache: Settings → Safari → Advanced → Website Data → Remove All
2. Load `colorwizard.app` on iPhone
3. Should see landing page (not error)
4. Upload an image
5. Should see canvas + color sampling
6. Refresh page
7. Should load cleanly (image won't persist, that's expected)

## Rollback Plan

If this breaks desktop:
```bash
git revert HEAD
git push origin main
```

Reverts to docs-only state (previous working commit: `a702407`).

## Success Metrics

- [ ] Mobile error rate drops to 0%
- [ ] Desktop remains at 0% errors
- [ ] Mobile upload success rate matches desktop
- [ ] No localStorage errors in Sentry/logs

## Next Steps

After mobile is confirmed working:
1. Monitor Sentry for 24h
2. Check mobile upload metrics
3. If stable, proceed with PR2 (core boundary refactor)

## Notes

- **No code changes to core image pipeline** - this is purely storage/hydration fix
- **Graceful degradation** - app works even if localStorage completely blocked
- **Minimal scope** - only touched store + media query hook
- **Desktop unaffected** - changes only add safety, don't alter behavior
