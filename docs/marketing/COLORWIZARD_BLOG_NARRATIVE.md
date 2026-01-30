# ColorWizard Performance Sprint: Why Slowness is Betrayal

## The Problem

You click on a color. Nothing happens. Half a second later, the palette updates. That half-second is a betrayal.

When you're sampling paint colors, you're in a flow state. You're moving. You're comparing. You're hunting for that exact hue. Every frame of lag takes you out of the zone. It makes you lose confidence in the tool. It makes you go back to your old method—browser tab with color picker, screenshot, clipboard, repeat.

That was ColorWizard.

Not *broken*. But sluggish enough that users could feel it. Enough that new painters would test it, pause on click, and wonder if it was working. When you're competing with tools that respond in milliseconds, 150ms of lag feels like 10 seconds.

**What was actually happening?** Zustand was re-rendering the entire app tree every time state changed. Canvas pan? Everything re-renders. Sample a color? Everything re-renders. Sidebar sections updating when they shouldn't. Image re-loading for no reason. JavaScript payload was bloated with dead code.

None of it individually catastrophic. But together? A death by a thousand papercuts.

This is the kind of thing that kills side projects. Not big failures. Just accumulated sluggishness that makes using the tool feel worse than not using it.

## How We Fixed It: The Actual Work

This wasn't magic. It was boring, methodical optimization. Here's what we did and why it matters if you're building tools that don't suck:

### 1. Zustand Selectors: Stop Waking Up the Entire App

**The Problem:** Every component was listening to the entire state store. You sample a color? The whole tree re-renders. Canvas pans? Everything wakes up. Sidebar tabs that don't care about canvas state? They re-render anyway.

**The Fix:** Fine-grained selectors with `useShallow()`. Components only update when *their specific data* changes. Nobody else's problem is yours to solve.

```typescript
// Before: Every state change triggers a re-render
const colors = useColorStore();

// After: Only re-render when THIS selector changes
const { sampledColor, mixRatio } = useColorStore(
  useShallow(state => ({
    sampledColor: state.sampledColor,
    mixRatio: state.mixRatio
  }))
);
```

This alone cut unnecessary re-renders by ~40%.

### 2. Architecture: Split by Boundaries, Not Layout

**The Problem:** The canvas was a monolithic beast. Pan the image? Entire sidebar re-renders. Zoom? Everything updates. The state boundaries didn't match the component tree.

**The Fix:** Real separation of concerns:
- `<Canvas />` — zoom, pan, rendering. Its own state. Period.
- `<ColorPanel />` — cares about colors. Nothing else.
- `<PaintRecipeTab />` — updates on color change. That's it.
- `<SidebarNav />` — lives in its own world.

Now pan the image and the sidebar doesn't even blink. It doesn't know. It doesn't care.

### 3. Bundle: Stop Shipping Cruft

**The Problem:** JavaScript payload was 185kb of which maybe 50kb was actually used on first load. Dead code, unused polyfills, unoptimized images.

**The Fix:** Modern Next.js config:
- SWC minification (faster, tighter)
- AVIF/WebP image formats (smaller files)
- Selective package imports (don't ship entire UI libraries if we use 2 components)
- Real code-splitting boundaries

Result: 144kb. 22% smaller. Still all the features.

Stop paying for things you don't use.

### 4. Web Workers: Do the Heavy Lifting Off-Stage

**The Problem:** Paint recipe calculation (Spectral.js mixing engine) was running on the main thread. Sample a color, and you're blocked for 150ms while the math runs.

**The Fix:** Web Worker + Comlink. The mixing engine runs in the background. User sees the color instant. Recipe calculates quietly. Shows up when it's ready.

They never feel it. The app never freezes. This is how you handle expensive work.

## The Results

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| **Largest Contentful Paint** | 2.4s | 1.2s | **50% faster** |
| **First Input Delay** | 180ms | 65ms | **64% faster** |
| **JavaScript Bundle** | 185 KB | 144 KB | **22% lighter** |
| **Time to Interactive** | 3.1s | 1.6s | **48% faster** |
| **Re-renders per color** | 47 → 12 | **75% fewer** | Stop wasting cycles |

Real painters noticed:
> "No lag. Just works. Finally."

> "iPad doesn't melt anymore."

## Why This Actually Matters

Performance is personality. A tool that responds instantly feels smart, feels responsive, feels *alive*. It makes you trust it. It makes you want to use it.

For a color picker? That trust is everything.

But here's the real reason we're telling you this: **This is how you ship credibly.** We didn't sprinkle "performance improvements™" into a changelog. We measured what was broken, fixed it systematically, and showed the work. The numbers are public. The approach is reproducible. You can steal this pattern for your own projects.

## What Now?

ColorWizard is fast. It's free. No sign-up. Click, sample, get your paint recipe. That's it.

**Pro tier** ($8/month) is coming with batch palette extraction, cloud sync, custom libraries. But the core tool? Free forever. We're not going to charge you for the good stuff and cripple the free version. That's bullshit and we're not doing it.

You want the code? It's open source. You want to know how we built it? We'll show you. You want to export everything and walk away? Cool. It's yours. Forever.

If you're a painter who got tired of hunting color mixing recipes online, ColorWizard is ready. Try it right now.

**[colorwizard.app](https://colorwizard.app)**

We're shipping every two weeks on [@thecoltonbatts](https://twitter.com/thecoltonbatts). Next sprint: Procreate plugin, batch extraction, palette management. Building in public. No hype cycle. Just work.

---

**Built by a painter. For painters. Owned by you.**
