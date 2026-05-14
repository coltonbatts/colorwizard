# Integration Guide: Adding Monetization to Your Features

This guide shows how to add feature gating to existing components.

## Quick Start (5 minutes)

### 1. Gate a Single Feature

```tsx
import { useFeatureAccess } from '@/lib/hooks/useFeatureAccess'
import UpgradePrompt from '@/components/UpgradePrompt'

function AITab() {
  const {
    hasAccess,
    showUpgradePrompt,
    setShowUpgradePrompt,
    handleUpgradeClick,
    isUpgrading,
  } = useFeatureAccess('aiPaletteSuggestions')

  if (!hasAccess) {
    return (
      <>
        <div className="text-center py-8">
          <p className="text-gray-600 mb-4">AI Palette suggestions are a Pro feature.</p>
          <button
            onClick={() => setShowUpgradePrompt(true)}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg"
          >
            Upgrade to Pro
          </button>
        </div>
        
        <UpgradePrompt
          featureName="AI Palette Suggestions"
          isOpen={showUpgradePrompt}
          onClose={() => setShowUpgradePrompt(false)}
          onUpgradeClick={handleUpgradeClick}
          isLoading={isUpgrading}
        />
      </>
    )
  }

  return <YourFeatureComponent />
}
```

### 2. Gate with Disabled UI

```tsx
import FeatureGate from '@/components/FeatureGate'

<FeatureGate 
  feature="exportToFigma"
  fallback={<DisabledExportButton />}
>
  <ExportToFigmaButton />
</FeatureGate>
```

### 3. Gate with Click-to-Upgrade

```tsx
import FeatureGate from '@/components/FeatureGate'

<FeatureGate 
  feature="colorCollaboration"
  showPromptOnClick
>
  <ShareButton />
</FeatureGate>
```

## Pattern Examples

### Pattern 1: Tab Component

Gate an entire tab in the sidebar:

```tsx
function OilMixTab() {
  const { hasAccess, showUpgradePrompt, setShowUpgradePrompt } = 
    useFeatureAccess('aiPaletteSuggestions')

  return (
    <div>
      {!hasAccess && (
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-4">
          <p className="text-sm text-blue-700">
            <strong>Pro Feature:</strong> Unlock AI-powered color suggestions with a Pro upgrade.
          </p>
          <button 
            onClick={() => setShowUpgradePrompt(true)}
            className="text-blue-600 font-medium text-sm mt-2"
          >
            Learn More →
          </button>
        </div>
      )}
      
      {hasAccess && <AIComponent />}
      {/* ... rest of tab */}
    </div>
  )
}
```

### Pattern 2: Feature Section

Section with gated content:

```tsx
import ProFeatureSection from '@/components/ProFeatureSection'

<ProFeatureSection 
  feature="exportToAdobe"
  title="Export to Adobe"
>
  <AdobeExportPanel />
</ProFeatureSection>
```

### Pattern 3: Conditional Button

```tsx
import { useFeatureAccess } from '@/lib/hooks/useFeatureAccess'

function ExportButton() {
  const { hasAccess, promptUpgrade, showUpgradePrompt, setShowUpgradePrompt } = 
    useFeatureAccess('exportToFigma')

  const handleClick = async () => {
    if (!hasAccess) {
      setShowUpgradePrompt(true)
      return
    }
    // Do export
  }

  return (
    <>
      <button onClick={handleClick} disabled={!hasAccess}>
        {hasAccess ? 'Export to Figma' : 'Export (Pro)'}
      </button>
      
      {/* Upgrade modal auto-handled by hook */}
    </>
  )
}
```

### Pattern 4: Badge on Pro Features

```tsx
function AdvancedFilters() {
  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <h3>Advanced Color Filters</h3>
        <span className="bg-gradient-to-r from-blue-500 to-purple-500 text-white text-xs font-bold px-2 py-1 rounded">
          PRO
        </span>
      </div>
      
      <FeatureGate feature="advancedFilters" showPromptOnClick>
        <FilterControls />
      </FeatureGate>
    </div>
  )
}
```

## Feature Names Reference

Use these exact strings in `useFeatureAccess()` and `<FeatureGate>`:

- `aiPaletteSuggestions` - AI color harmony suggestions
- `exportToFigma` - Figma format export
- `exportToAdobe` - Adobe format export
- `exportToFramer` - Framer format export
- `colorCollaboration` - Team sharing & collaboration
- `advancedFilters` - Advanced color filters
- `advancedPresets` - Premium color presets
- `prioritySupport` - Priority support access

## Check User Tier

Get the current user's tier:

```tsx
import { useUserTier } from '@/lib/hooks/useUserTier'

function Component() {
  const { tier, isPro, loading } = useUserTier()

  if (loading) return <Spinner />

  if (isPro) {
    return <ProFeatures />
  }

  return <FreeFeatures />
}
```

## Best Practices

### ✓ Do

- **Show value** before asking for upgrade
  ```tsx
  <p>This feature lets you export to Figma in one click.</p>
  <UpgradeButton />
  ```

- **Use clear labels**
  ```tsx
  <button>Export (Pro) →</button>
  ```

- **Explain what they unlock**
  ```tsx
  <UpgradePrompt featureName="AI Palette Suggestions" />
  ```

- **Make upgrade easy**
  ```tsx
  onClick={() => setShowUpgradePrompt(true)}
  ```

### ✗ Don't

- **Hide features without explanation**
  ```tsx
  // Bad
  {hasAccess && <Feature />}
  ```

- **Block without clear CTA**
  ```tsx
  // Bad
  <div className="opacity-30">
    <Feature />
  </div>
  ```

- **Use wrong feature names**
  ```tsx
  // Bad - typo will break
  useFeatureAccess('figmaExport') // Should be 'exportToFigma'
  ```

## Testing Your Integration

### Test 1: As Free User

1. Sign up / login without upgrading
2. Navigate to your gated feature
3. Upgrade modal should appear
4. Click through to pricing

### Test 2: As Pro User

1. Complete upgrade to Pro
2. Return to gated feature
3. Feature should be fully accessible
4. No upgrade prompts

### Test 3: After Cancellation

1. Upgrade to Pro
2. Cancel in Stripe Dashboard
3. Webhook updates user tier
4. Feature becomes gated again

## Adding New Pro Features

To add a new Pro-only feature:

1. Add to `lib/featureFlags.ts`:
```typescript
export type FeatureName = 
  | 'existingFeature'
  | 'yourNewFeature' // Add here
```

2. Add config to `FEATURES`:
```typescript
yourNewFeature: {
  name: 'yourNewFeature',
  label: 'Your Feature Name',
  description: 'What this feature does',
  freeEnabled: false,
  proEnabled: true,
},
```

3. Use in components:
```typescript
const { hasAccess } = useFeatureAccess('yourNewFeature')
```

## Common Patterns

### Show Pro Badge on Tab

```tsx
// In tab definition
{
  id: 'advancedFilters',
  icon: <Icon />,
  label: 'Advanced Filters',
  badge: '✨ Pro', // Shows badge
  tooltip: 'Advanced color filtering (Pro)',
}
```

### Different UI for Free vs Pro

```tsx
function Component() {
  const { tier } = useUserTier()

  return (
    <div>
      {tier === 'free' ? (
        <FreeModeUI />
      ) : (
        <ProModeUI />
      )}
    </div>
  )
}
```

### Upgrade After Trying

```tsx
function FeatureTrial() {
  const [trialAttempts, setTrialAttempts] = useState(0)
  const { hasAccess, setShowUpgradePrompt } = useFeatureAccess('feature')

  const handleAttempt = () => {
    if (!hasAccess) {
      setTrialAttempts(prev => prev + 1)
      
      // Show upgrade after 3 attempts
      if (trialAttempts >= 3) {
        setShowUpgradePrompt(true)
      }
    }
  }
}
```

## Debugging

Check if feature is gated:

```tsx
import { isFeatureEnabled } from '@/lib/featureFlags'

// In console
isFeatureEnabled('exportToFigma', 'free') // → false
isFeatureEnabled('exportToFigma', 'pro')  // → true
```

Check user tier:

```tsx
const { tier } = useUserTier()
console.log('User tier:', tier)
```

## Need Help?

- See [MONETIZATION_README.md](./MONETIZATION_README.md) for architecture
- See [TESTING_GUIDE.md](./TESTING_GUIDE.md) for testing setup
- Check component examples in `components/ProFeaturesShowcase.tsx`
- Review existing implementations for patterns
