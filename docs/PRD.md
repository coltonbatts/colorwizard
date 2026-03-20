# ColorWizard Product Requirements Document

## Product Summary

ColorWizard is a local-first color analysis tool for artists. A user uploads a reference image, clicks on any pixel, and immediately gets useful color information for real-world making:

- The sampled color in HEX, RGB, and HSL
- A perceptual color name
- An oil paint mixing recipe
- Matching DMC embroidery floss colors
- Optional value-mode and grayscale analysis
- Local persistence for pinned/session colors and palettes

The live thin-core experience is centered on a single loop: upload an image, sample a color, and get matching outputs fast. The app is built to keep the heavy work in the browser, minimize friction, and avoid account-gated basics.

## What This App Is

ColorWizard is not a generic design tool and not a full creative suite. It is a specialized color interpreter for people working with physical media and reference images.

The product is best described as:

- A color picker for painters
- A match assistant for embroidery/cross-stitch users
- A local analysis tool for exploring values, chroma, and color relationships

## What It Does

### Core User Flow

1. User opens the app.
2. User uploads or drags in a reference image.
3. User clicks a point in the image.
4. The app samples the pixel color and analyzes it.
5. The sidebar shows results and matching outputs.

### Primary Outputs

- Sampled color values
- Color name lookup
- Oil paint recipe generation
- DMC floss matching
- Value-mode grayscale mapping
- Pinned/session swatches for later reference

### Secondary Tools Present in Code

The codebase also includes support for:

- Calibration
- Measurement and ruler/grid overlays
- Reference image overlays
- Palette persistence and palette management
- Session color strips
- Procreate export
- Feature gating and Stripe checkout plumbing

Some of those features are present in the codebase, but the current thin-core release is intentionally focused on the sampling-and-matching loop.

## Problem Statement

Artists often need to translate a color seen in a photo or reference image into something usable in the physical world. Existing tools are usually split across too many products:

- A color picker tells you the RGB value, but not what paint to mix.
- A paint recipe tool may not support the practical palette a painter owns.
- An embroidery matcher may not connect to the same sampled color workflow.
- Many tools are slow, account-gated, or lock basic exports behind paywalls.

ColorWizard solves this by turning a sampled pixel into practical next-step guidance.

## Goals

### Product Goals

- Make color sampling fast and reliable.
- Convert sampled colors into actionable painter-friendly outputs.
- Keep the core experience free and low-friction.
- Preserve local-first behavior so users do not need to trust a server with their reference images.

### User Goals

- Identify a color from a reference image quickly.
- Get a usable oil paint mixing starting point.
- Find a close DMC floss match.
- Save interesting swatches for later.
- Work on desktop and mobile without a complicated setup.

## Non-Goals

- Full creative project management
- Team collaboration as part of the thin-core release
- A complete replacement for Photoshop, Procreate, or Figma
- Cloud-first image storage
- Social sharing or community feeds
- Enterprise workflow tooling

## Target Users

### Primary

- Painters working from photo references
- Artists mixing physical media
- Cross-stitch and embroidery makers matching thread to image colors

### Secondary

- Illustrators exploring color relationships
- Indie makers building palettes from reference art
- Color-curious hobbyists who want practical output, not theory homework

## User Stories

- As a painter, I want to click a color in a reference photo and get a paint recipe I can actually mix.
- As an embroiderer, I want to see the closest DMC floss matches for a sampled color.
- As an artist, I want to know the color name and value range so I can reason about the image.
- As a mobile user, I want the upload and sampling flow to work without crashes or awkward controls.
- As a repeat user, I want pinned colors and session swatches to persist locally.

## Functional Requirements

### Image Upload

- Support local image upload and drag-and-drop.
- Accept common image formats, including mobile-friendly files.
- Normalize large images to avoid memory issues on constrained devices.
- Preserve orientation and maintain sampling accuracy.

### Image Canvas

- Render the uploaded image in a zoomable, pannable canvas.
- Allow the user to click or tap a pixel to sample it.
- Reset or replace the current image cleanly when a new file is loaded.

### Color Sampling

- Return HEX, RGB, and HSL for the clicked pixel.
- Update the sampled color state immediately after interaction.
- Keep sampling responsive enough to feel instant.

### Color Analysis

- Look up a human-readable color name.
- Compute a painter-oriented value/chroma readout.
- Support value mode for grayscale/value-first workflows.

### Paint Recipe Generation

- Generate a practical oil paint recipe from the sampled color.
- Use a limited palette approach that reflects how painters work.
- Provide a clear mixing starting point rather than a false promise of exact reproduction.

### DMC Matching

- Return the closest DMC floss matches for the sampled color.
- Show a ranked list with useful confidence or similarity context.

### Local Persistence

- Save pinned colors and session colors locally.
- Allow users to revisit or export saved swatches.
- Persist user preferences such as layout and analysis settings where appropriate.

### Mobile Support

- Support touch sampling and mobile navigation.
- Avoid memory crashes on large images.
- Keep controls reachable on smaller screens.

## UX Requirements

- The main call to action should be obvious: upload an image.
- The sampling result should be visible immediately after click/tap.
- The primary outputs should be readable without extra configuration.
- The interface should stay calm and focused, not crowded with unrelated tools.
- Keyboard shortcuts should support power users, but not block casual users.

## Performance Requirements

- Sampling should feel immediate for normal-sized images.
- Large images should be downscaled into a stable working buffer.
- The app should remain usable on mobile Safari.
- Heavy analysis work should stay off the main UI thread where possible.

## Privacy and Data Handling

- Images should remain local by default.
- No account should be required for the core sampling flow.
- No core feature should depend on uploading personal reference images to a remote server.
- Exported palettes or cards should be user-controlled and reversible.

## Monetization / Packaging

The repo contains feature gating and Stripe integration for a Pro tier. The product direction implied by the code is:

- Free tier: core sampling, paint recipes, DMC matching, exports, and local control
- Pro tier: advanced or convenience features layered on top of the core

For the thin-core release, the free core loop should stay fully usable without a payment decision.

## Success Metrics

### Product Metrics

- Image upload success rate
- Sample-to-result completion rate
- DMC match engagement
- Recipe pin/export usage
- Repeat session usage

### Quality Metrics

- No stale image behavior on re-upload
- No mobile memory crashes on large images
- No production console errors in the core flow
- Fast first interaction after image load

## Scope for Current Release

### In Scope

- Upload image
- Sample a color
- Show paint recipe
- Show DMC matches
- Show color name and value information
- Persist pins/session colors locally

### Out of Scope

- Dashboard-centric workflows
- Color theory lab pages
- Trace/AR experiments
- Pricing page as part of the live thin-core app
- Collaboration and cloud sync

## Open Questions

- Should the product stay strictly thin-core, or should the broader palette/calibration/reference tools return in a later phase?
- Should Pro be lifetime, subscription, or both?
- Which advanced features deserve monetization without harming the free core experience?

## Recommended Product Definition

If this product has to be described in one sentence, use this:

**ColorWizard is a local-first color sampler for artists that turns an image click into practical paint and thread matches.**

