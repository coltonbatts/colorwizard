# How We Built ColorWizard to Be 50% Faster — And Why Slowness Is a Betrayal

**by Colton Batts**

A color picker should feel instant. Click the image, get your paint recipe. Done.

ColorWizard wasn't. Not catastrophically broken, but sluggish enough that new users would pause on click and wonder if it was working. Enough that when you're sampling colors for a painting, that half-second gap pulls you out of the flow. When you're competing with Photoshop and Figma—tools that respond in milliseconds—150ms of lag feels like 10 seconds.

So we fixed it. 50% faster. Here's how, and why it actually matters.

## The Problem Nobody Talks About

Performance isn't a feature you market. It's invisible until it's broken. But when a tool feels sluggish, you lose trust. You go back to your old method (browser tab, screenshot, clipboard, repeat). The tool dies not with a bang, but with a "this thing is slow."

ColorWizard was re-rendering like a broken browser. Every state change triggered the entire app tree. Pan the canvas? Everything re-renders. Sample a color? Everything updates. The sidebar didn't need to know the canvas panned, but it found out anyway. Zustand was waking up the entire store on every change.

Nothing individually catastrophic. But together? A thousand papercuts that made the product feel untrustworthy.

## Four Fixes That Shipped

### 1. Stop Waking Up The Entire App (Zustand Selectors)

**The issue:** Every component was listening to the full state store. One color sample = 47+ re-renders across the app.

**The fix:** Fine-grained selectors with `useShallow()`. Components now only update when *their specific data* changes.

```tsx
// Before: Every state change = re-render
const colors = useColorStore();

// After: Only re-render if THIS data changes
const { sampledColor, mixRatio } = useColorStore(
  useShallow(state => ({
    sampledColor: state.sampledColor,
    mixRatio: state.mixRatio
  }))
);
```

**Result:** 40% fewer re-renders. Instant difference.

### 2. Split By State Boundaries, Not Layout

Monolithic components are the enemy. The canvas component handled zoom, pan, and rendering, but the sidebar didn't know that and re-rendered anyway.

We split along *state boundaries*:
- Canvas owns canvas state (zoom, pan, image)
- Color panel owns color state
- Paint recipes own recipe state
- Navigation lives in its own world

Now when you pan, only the canvas updates. The sidebar doesn't blink.

**Result:** 75% fewer unnecessary re-renders. Pan feels instant.

### 3. Stop Shipping Dead Code

JavaScript payload was 185kb. We traced what was actually used on first load: maybe 50kb. The rest was dead code, unused polyfills, bloated imports.

We updated `next.config.js`:
- SWC minification (faster, tighter)
- Modern image formats (AVIF/WebP instead of JPEG)
- Selective package imports (don't ship entire UI libraries for 2 components)
- Real code-splitting boundaries

**Result:** 144kb. 22% smaller. Still all the features.

### 4. Move Heavy Work Off the Main Thread

Paint recipe calculation (Spectral.js mixing engine) was blocking interactions. Sample a color, and the main thread was locked for 150ms doing math.

We moved it to a Web Worker via Comlink. User sees the color instantly. Recipe calculates in the background. Shows up when it's ready. They never feel it.

**Result:** UI stays responsive. User never sees the work happening.

## The Numbers

| Metric | Before | After | Win |
|--------|--------|-------|-----|
| **Largest Contentful Paint** | 2.4s | 1.2s | 50% faster |
| **First Input Delay** | 180ms | 65ms | 64% faster |
| **JavaScript Bundle** | 185kb | 144kb | 22% lighter |
| **Time to Interactive** | 3.1s | 1.6s | 48% faster |
| **Re-renders per sample** | 47 | 12 | 75% fewer |

Real user feedback: "It just feels right now. No lag."

## Why This Matters

Performance is credibility. When a tool responds instantly, you trust it. You feel in sync with it. You keep using it.

But here's the real point: **This is how you ship credibly.** We didn't sprinkle "performance improvements™" into a changelog and hope nobody asked for details. We measured what was broken, identified *why*, fixed it systematically, and shipped the metrics.

You can steal this playbook. Measure. Identify bottlenecks. Fix them methodically. Show your work.

## Open Source, Not Locked In

ColorWizard is free. No sign-up required. No email. Your data stays on your machine—we never see it, never store it.

Pro tier ($8/month) adds batch extraction, cloud sync, custom libraries. But the core tool? Free forever. We're not hiding the good stuff behind a paywall. We're not trapping you. Export your palettes anytime. Use them anywhere.

The code's open source. Read it. Fork it. Build on it. This is what happens when a painter and an engineer decide to build something together instead of letting corporate interests dictate the roadmap.

## The Real Work

Performance optimization sounds boring. It's not. It's about respect—respect for your time, respect for your flow state, respect for the creative work you're doing.

A tool that's 50% faster isn't just faster. It feels intelligent. It feels like you and the software are in sync. That's where the magic happens.

We shipped credibly. Measured. Fixed. Showed the work. That's the playbook.

Try ColorWizard free at [colorwizard.app](https://colorwizard.app). Click, sample, paint. No BS. No email required.

---

**Built by [@thecoltonbatts](https://twitter.com/thecoltonbatts) | Open source | For painters, by a painter**
