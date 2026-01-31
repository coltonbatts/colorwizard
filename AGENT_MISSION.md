# MISSION: OPERATIONAL COLOR WIZARD (Swarm Directive)

**Goal:** Transform the Color Wizard web app from a prototype into a production-ready AR Tracing and Color Matching powerhouse.

---

## 🎭 The Aesthetic: "Leica Precision"

- **Colors:** Deep blacks, subtle grays, vibrant primary accents.
- **Vibe:** Minimalist, high-performance, professional tool—not a toy.
- **UX:** Zero friction. 60fps animations. Snappy transitions.

## 🛠 Technical Hard-Constraints

1. **Canvas Performance:**
    - Perform ALL AR transformations using `ctx.setTransform()` or CSS `matrix3d`.
    - Redraw loops MUST be optimized via `requestAnimationFrame`.
2. **State Management:**
    - Use **Zustand** for global transformation state. Do NOT prop-drill camera matrices.
3. **Stability First:**
    - Implement `DeviceOrientation` listeners to warn users of shaky hands.
    - Lock White Balance/Exposure on the camera feed to prevent "color drift."
4. **Privacy:**
    - No image data ever leaves the client. Processing is local-only.

## 🚀 Swarm Priority Targets (TONIGHT)

1. **Perspective Engine:** Connect `lib/perspectiveWarp.ts` to the `ARCanvas` component.
2. **Gesture Suite:** Implement a unified gesture hook supporting pinch-zoom, 2-finger rotate, and skewing.
3. **Pro Gating:** Wire up `FeatureGate.tsx` to the Stripe lifetime purchase state.
4. **Value Mode:** Implement a grayscale histogram overlay to help artists check their tonal values.

---

**Execution Note:** You are building a disruptor. We are coming after apps that charge monthly. We charge $1. It works forever. Make it feel that way.

**Status:** ALL SYSTEMS GO. 🚀
