# AR Tracing MVP Specification (v1)

## 1. Product Concept: "The Digital Camera Lucida"

**Core Value:** Allow artists to accurately trace a digital reference onto physical paper using their phone screen as a pass-through viewfinder.

**Constraint:** The device must remain **stationary** (on a stand, tripod, or balanced on a glass).
**Why:** True 3D world-locked AR (SLAM) is unreliable in web browsers without heavy frameworks (8th Wall) or specific hardware support. The "Stationary Ghost" method is robust, high-precision, and simpler to build.

## 2. User Flow

1.  **Select Reference:** User picks an image from their library or uploads one.
2.  **Calibrate/Position (Setup Mode):**
    -   User places phone on a stand parallel to the paper.
    -   Camera feed is visible.
    -   Reference image overlay is visible (default 50% opacity).
    -   **Action:** User manipulates the *Reference Image* (Pan, Zoom, Rotate) to align it with their paper/canvas.
3.  **Lock & Trace (Work Mode):**
    -   User hits "Lock".
    -   Touch gestures are disabled (preventing accidental shifts).
    -   UI changes to "Tool Mode" (Opacity, Flash, Filters).
    -   User traces by looking at the screen and moving their hand behind the phone.

## 3. UI Controls & Features

### A. The Canvas (Viewport)
-   **Layer 0 (Bottom):** Camera Feed (high resolution, low latency).
-   **Layer 1 (Middle):** Reference Image (User transformable).
-   **Layer 2 (Top):** UI Overlays (Grids, Tools).

### B. Controls (Setup Mode)
-   **Transform Gestures:**
    -   One finger drag: Pan image.
    -   Two finger pinch: Zoom image.
    -   Two finger rotate: Rotate image.
-   **"Fit to Paper"**: Button to reset image to maximize visibility.
-   **Lock Button**: Prominent button to switch to Trace Mode.

### C. Controls (Trace Mode)
-   **Opacity Slider:** 0% (Camera only) to 100% (Image only). Crucial for checking details.
-   **Flicker Tool (The "Premium" Feature):**
    -   A button that, when held, rapidly toggles opacity between 0% and 100%.
    -   **Why:** Allows the eye to detect subtle differences between the reference and the user's drawing (blink comparator technique).
-   **Flashlight (Torch):** Toggle device flash (essential for shadowing issues).
-   **Filters (MVP):**
    -   *Grayscale*: Easier to see values.
    -   *Edge Detect (Sobel)*: Highlights lines to trace.
-   **Unlock**: Return to Setup Mode.

## 4. Technical Requirements

### A. Camera & Permissions
-   Use `navigator.mediaDevices.getUserMedia`.
-   Constraint: `video: { facingMode: "environment", width: { ideal: 4096 } }` (Request 4K, accept lower).
-   **Critical:** Handle permission denials gracefully with instructions.

### B. Image Transformations
-   **Current Gap:** The existing `ARCanvas` logic fits the image to the screen but doesn't support user transforms.
-   **Solution:** Implement a transformation matrix state `{ x, y, scale, rotation }` for the reference image layer.
-   **Input:** Use a gesture library (e.g., `use-gesture`) to update the matrix.

### C. System Wake Lock
-   Tracing takes time. The screen must not sleep.
-   Use `navigator.wakeLock.request('screen')`.
-   Re-request lock if visibility changes (tab switching).

### D. Anchoring Assumptions
-   **Assumption:** The phone does not move relative to the paper.
-   **Validation:** If the user moves the phone, the alignment breaks.
-   **Mitigation:** Display a "Do not move device" toast on entry.

## 5. Calibration Flow (MVP)

*Goal: Ensure the image is the size the user wants.*

**Manual Scaling (The "Good Enough" MVP):**
-   User draws two dots on their paper (e.g., 5 inches apart).
-   User pinches the reference image on screen until the image features align with those dots.
-   *No complex computer vision required for v1.*

## 6. Failure Modes & Acceptance Criteria

### Failure Modes
1.  **"Drift":** User bumps the stand.
    -   *Recovery:* User hits "Unlock", readjusts image, hits "Lock".
2.  **Auto-Exposure/Focus hunting:** Camera keeps changing brightness/focus.
    -   *Fix:* If supported (`ImageCapture` API), lock focus/exposure. Else, advise user to use consistent lighting.
3.  **Safari Mobile Bar:** The address bar moves/hides, resizing the canvas.
    -   *Fix:* Use `dvh` (Dynamic Viewport Height) units and listen for resize events to adjust canvas size without resetting the image transform.

### Acceptance Criteria (v1)
-   [ ] User can upload an image.
-   [ ] User can see camera feed + image overlay.
-   [ ] User can Pan/Zoom/Rotate the overlay image independent of the camera.
-   [ ] "Lock" button disables gestures.
-   [ ] "Torch" toggles the flash (where supported).
-   [ ] "Ghost" Opacity slider works smoothly.
-   [ ] Application prevents screen sleep while in Trace Mode.

## 7. Next Steps (Implementation Guide)

1.  **Refactor `ARCanvas.tsx`**:
    -   Remove the auto-fit logic in favor of a user-controlled transform state.
    -   Install `react-use-gesture` or similar for handling multi-touch (pinch/rotate).
2.  **Add `WakeLock`**:
    -   Implement a hook (e.g., `useWakeLock`) to keep the screen on during tracing.
3.  **Implement Trace Mode UI**:
    -   Build the "Lock/Unlock" toggle.
    -   Build the "Flicker" button.
4.  **Test on Device**:
    -   Validate camera permissions and orientation on iOS/Android immediately.

## 8. Future (v1.x+)
-   **Optical Anchoring:** Use a physical marker (QR code) on paper to track phone movement and counter-move the image layer.
-   **Perspective Correction:** "Keystone" tool to fix angled phone placement.
