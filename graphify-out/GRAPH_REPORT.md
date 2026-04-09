# Graph Report - /Users/coltonbatts/dev/github.com/coltonbatts/colorwizard  (2026-04-09)

## Corpus Check
- Large corpus: 321 files · ~219,419 words. Semantic extraction will be expensive (many Claude tokens). Consider running on a subfolder, or use --no-semantic to run AST-only.

## Summary
- 1155 nodes · 1591 edges · 125 communities detected
- Extraction: 83% EXTRACTED · 17% INFERRED · 0% AMBIGUOUS · INFERRED: 278 edges (avg confidence: 0.56)
- Token cost: 0 input · 0 output

## God Nodes (most connected - your core abstractions)
1. `page.tsx` - 39 edges
2. `ImageCanvas.tsx` - 32 edges
3. `TauriPersistence.tsx` - 25 edges
4. `ColorDeckPanel.tsx` - 23 edges
5. `ColorPanel.tsx` - 23 edges
6. `ProjectGallery.tsx` - 19 edges
7. `invoke()` - 17 edges
8. `PaintRecipe.tsx` - 16 edges
9. `CompactToolbar.tsx` - 16 edges
10. `SampleTab.tsx` - 16 edges

## Surprising Connections (you probably didn't know these)
- `Local-First Product Principle` --rationale_for--> `ColorWizard Product`  [INFERRED]
  docs/PRD.md → README.md
- `Privacy: Images Never Leave Client` --rationale_for--> `ColorWizard Product`  [INFERRED]
  docs/PRD.md → README.md
- `Tech Debt: Server Auth Placeholder (demo-user)` --conceptually_related_to--> `Security Risk: Placeholder Server Auth`  [INFERRED]
  TECH_DEBT_NOTES.md → REVIEW_PACKET.md
- `Core Sampling Loop (upload → click → outputs)` --conceptually_related_to--> `Color Sampling Flow`  [INFERRED]
  docs/PRD.md → REPO_MAP.md
- `Graphify Knowledge Graph (graphify-out/)` --conceptually_related_to--> `LLM Packing Guide and Read Order`  [INFERRED]
  AGENTS.md → PACK_FOR_LLM.md

## Hyperedges (group relationships)
- **Active Thin Core Loop (Upload → Sample → Outputs)** — review_packet_app_page, review_packet_imagecanvas, review_packet_sampletab, review_packet_matchestab, review_packet_paintrecipe, review_packet_useimageanalyzer, review_packet_solverecipe, review_packet_dmcfloss, review_packet_colornaming [EXTRACTED 1.00]
- **Zustand Persistent State Stores** — review_packet_canvasstore, review_packet_sessionstore, review_packet_calibrationstore, review_packet_layoutstore, review_packet_palettestore, review_packet_paintpalettestore [EXTRACTED 1.00]
- **Spectral Paint Recipe Subsystem (Kubelka-Munk)** — review_packet_solverecipe, review_packet_solver_worker, review_packet_spectral_adapter, review_packet_spectral_palette [EXTRACTED 1.00]
- **Auth/Billing Security Risk Cluster** — review_packet_auth_server, review_packet_usefeatureaccess, review_packet_stripe_checkout, review_packet_user_tier, review_packet_ai_suggestions, review_packet_firebase, review_packet_usertier_db [EXTRACTED 1.00]
- **Thin Core Release Roadmap (PR0→PR1→PR2→PR3)** — thin_core_dod_pr0, thin_core_dod_pr1, thin_core_dod_pr2, thin_core_dod_pr3, pr1_deliverables_upload_fix, pr2_plan_core_structure [EXTRACTED 1.00]
- **Deployment Infrastructure (Vercel + Firebase + Stripe + Email)** — deployment_vercel, deployment_firebase, deployment_stripe, deployment_email [EXTRACTED 1.00]
- **Web vs Desktop Split Architecture** — readme_tauri_desktop, readme_static_export, readme_open_source_mode, desktop_arch_tauri, desktop_arch_firebase_removal [EXTRACTED 1.00]
- **PR1 Upload Fix - Files Changed** — file_use_store_ts, file_app_page_tsx, file_image_dropzone_tsx, file_image_pipeline_ts, file_image_canvas_tsx [EXTRACTED 1.00]
- **Stripe/Payment Operations Documents** — release_checklist_doc, rollback_plan_doc, operational_notes_doc, stripe_production_doc, deployment_checklist_doc [INFERRED 0.85]
- **Desktop Pro Release Artifacts** — prd_colorwizard_pro_doc, macos_release_doc, concept_tauri_desktop_shell, concept_notarization_tauri, concept_project_persistence [INFERRED 0.85]
- **Design Token System** — concept_paper_tokens, concept_ink_tokens, concept_signal_tokens, concept_design_language_warm_paper [EXTRACTED 1.00]
- **Marketing Bundle Core Deliverables** — blog_narrative, twitter_thread, landing_page_copy, readme_updated, pro_waitlist_email, quick_launch [EXTRACTED 1.00]
- **Phase 2A Payment Stage (Stripe + Pro Features)** — stripe_setup, posthog_stripe_setup, concept_stripe_webhook, concept_firebase, concept_pro_tier [EXTRACTED 1.00]
- **Analytics and Revenue Tracking Stack** — concept_posthog, concept_stripe, concept_firebase, concept_stripe_webhook [INFERRED 0.85]
- **ColorWizard Marketing Asset Bundle (9 Files)** — marketing_complete_blog_narrative, marketing_complete_twitter_thread, marketing_complete_founder_positioning, marketing_complete_readme_updated, marketing_complete_landing_page_copy, marketing_complete_pro_waitlist_email, marketing_complete_growth_delivery, marketing_complete_quick_launch, marketing_complete_marketing_index [EXTRACTED 1.00]
- **6-Email Pro Conversion Sequence** — waitlist_email_email1_welcome, waitlist_email_email2_checkin, waitlist_email_email3_cloud_sync, waitlist_email_email4_trial_end, waitlist_email_email5_converted, waitlist_email_email6_monthly_digest [EXTRACTED 1.00]
- **Phase 2A Technical Infrastructure (Stripe + PostHog + UTM)** — phase2a_stripe_integration, phase2a_posthog_setup, phase2a_utm_tracking, phase2a_stripe_webhook, phase2a_checkout_endpoint, phase2a_use_analytics_hook [EXTRACTED 1.00]
- **Twitter Thread Campaign (3 Threads with UTM Links)** — twitter_threads_thread1_founder, twitter_threads_thread2_value, twitter_threads_thread3_feature, utm_guide_twitter_utms, utm_tracking_preset_campaigns [EXTRACTED 1.00]
- **ColorWizard Spectral Palette Pigments (6 Colors)** — pdf_cadmium_red, pdf_phthalo_green, pdf_phthalo_blue, pdf_yellow_ochre, pdf_titanium_white, pdf_ivory_black [INFERRED 0.85]
- **Three-Wheel Chroma System (High/Medium/Low)** — pdf_high_chroma_wheel, pdf_medium_chroma_wheel, pdf_low_chroma_wheel, pdf_hue_chroma_value [EXTRACTED 1.00]
- **ColorWizard Visual Identity Elements** — favicon_colorwizard_icon, concept_wizard_hat, concept_color_palette_bar, concept_brand_identity [INFERRED 0.85]
- **ColorWizard Complete Icon Asset Set** — icon_png, icon_square30, icon_square150, icon_storelogo, icon_square107, icon_square89, icon_square310, icon_square142, icon_128, icon_square284, icon_32, icon_square44, icon_square71, icon_128_2x [EXTRACTED 1.00]
- **Windows Store Icon Variants** — icon_square30, icon_square44, icon_square71, icon_square89, icon_square107, icon_square142, icon_square150, icon_square284, icon_square310, icon_storelogo [EXTRACTED 1.00]
- **macOS/Linux Icon Variants** — icon_32, icon_128, icon_128_2x, icon_png [INFERRED 0.85]

## Communities

### Community 0 - "Canvas Core"
Cohesion: 0.03
Nodes (29): CanvasErrorFallback.tsx, CanvasHUD.tsx, CanvasSettingsModal.tsx, DebugOverlay.tsx, DMCFlossMatch.tsx, HighlightControls.tsx, HighlightOverlay.tsx, ImageCanvas.tsx (+21 more)

### Community 1 - "Project & Card System"
Cohesion: 0.04
Nodes (39): CardMetadataFields.tsx, CollapsibleSection.tsx, createColorCard(), getRecipeSourceLabel(), mapHeuristicRecipeIngredients(), mapPaintMatchesFromIngredients(), ColorCardModal.tsx, ColorCardPreview.tsx (+31 more)

### Community 2 - "Spectral Color Engine"
Cohesion: 0.04
Nodes (39): createColor(), deltaEFromSpectral(), deltaEOK(), getPaletteColors(), getSpectral(), getSpectralColor(), getSpectralSync(), isSpectralAvailable() (+31 more)

### Community 3 - "Architecture & Concepts"
Cohesion: 0.03
Nodes (67): Graphify Knowledge Graph (graphify-out/), HTML5 Canvas Transform Matrix (zoom/pan), Kubelka-Munk Spectral Theory, OKLab DeltaE Perceptual Comparison, Two Recipe Systems (Traditional vs Spectral), Firebase (Auth + Firestore), Desktop: Firebase/Stripe Removal Plan, Offline License Key Validation (CW-XXXX-XXXX-XXXX) (+59 more)

### Community 4 - "Desktop Runtime"
Cohesion: 0.04
Nodes (43): DesktopRuntimeMount.tsx, DesktopWorkspaceEmpty.tsx, getInvoke(), isDesktopApp(), layout.tsx, LicenseActivation.tsx, formatKey(), handleChange() (+35 more)

### Community 5 - "Accessibility & Contrast"
Cohesion: 0.05
Nodes (17): getBestContrast(), getContrastRatio(), authContext.tsx, getFirebaseApp(), getFirebaseAuth(), getFirestoreDb(), FirebaseAuthProvider.tsx, Overlay.tsx (+9 more)

### Community 6 - "Color Conversion & AI"
Cohesion: 0.07
Nodes (16): AISuggestions.tsx, hexToHsb(), hexToRgb(), rgbToHsb(), validateHex(), hasAccessToProFeature(), isProOnlyFeature(), FeatureGate.tsx (+8 more)

### Community 7 - "Canvas Calibration"
Cohesion: 0.06
Nodes (14): canvasToScreen(), createCalibration(), getZoomFingerprint(), imageToScreen(), isCalibrationStale(), screenToCanvas(), screenToImage(), CalibrationModal.tsx (+6 more)

### Community 8 - "Image Worker Pipeline"
Cohesion: 0.08
Nodes (15): deltaE(), generateHighlightOverlay(), generateValueMapData(), getRelativeLuminance(), getStepIndex(), processImageData(), rgbToLab(), stepToGray() (+7 more)

### Community 9 - "Color Theory & Harmonies"
Cohesion: 0.1
Nodes (17): ColorHarmonies.tsx, findClosestSegment(), getAnalogous(), getColorHarmonies(), getColorTemperature(), getComplementary(), getMixingGuidance(), getSegmentIndex() (+9 more)

### Community 10 - "UI Layout & Navigation"
Cohesion: 0.08
Nodes (7): CollapsibleSidebar.tsx, CompactToolbar.tsx, MobileHeader.tsx, MobileNavigation.tsx, Wordmark.tsx, workbenchIcons.tsx, WorkbenchModeRail.tsx

### Community 11 - "Color Theory Knowledge"
Cohesion: 0.11
Nodes (29): Additive Color Mixing (RGB: Lights, LED, LCD Screens), Cadmium Red PR108 / Pyrrole Red PR254, Color Theory for Artists: The Optimal Color Wheel System for Painting, Florent Farges Atelier Art Resources, High Chroma Color Wheel, HCV Color Model: Hue, Chroma, Value, Ivory Black PBk9 / Paynes Grey, Low Chroma Color Wheel (+21 more)

### Community 12 - "Error Handling"
Cohesion: 0.1
Nodes (18): ErrorBoundary.tsx, ErrorBoundary, OilMixTab.tsx, PaintLibraryTab.tsx, PaletteIndicator.tsx, PaletteSwitcher.tsx, PhotoshopColorWheel.tsx, draw() (+10 more)

### Community 13 - "Paint Catalog"
Cohesion: 0.13
Nodes (17): filterPaints(), getBrand(), getBrands(), getCatalog(), getLines(), getPaint(), getPaintBySlug(), getPaints() (+9 more)

### Community 14 - "Color Naming & Sampling"
Cohesion: 0.09
Nodes (8): ColorNamingDisplay.tsx, getImageDataAt(), sampleColor(), colorsToRgb(), hexToRgb(), generateShoppingList(), getImageData(), medianCut()

### Community 15 - "Feature Gating & Pro"
Cohesion: 0.1
Nodes (17): AR Tracing Feature Goal, components/FeatureGate.tsx, lib/perspectiveWarp.ts (Perspective Engine), Stripe Checkout + Webhooks, Stripe Checkout QA Flow ($1 Lifetime), Webhook Idempotency Check, pro_lifetime Tier State, lib/grid/doodleGenerator.ts (Planned) (+9 more)

### Community 16 - "Marketing Content"
Cohesion: 0.11
Nodes (24): ColorWizard Free Tier vs Pro Tier Business Model, Marketing Narrative Arc: Problem→Solution→Results→Positioning→Monetization, ColorWizard Blog Narrative: Performance Sprint, ColorWizard Growth Marketing Mission Complete, Colton Founder Positioning Update, ColorWizard Growth Delivery Summary, ColorWizard Growth Funnel: Blog→Twitter→Landing→Email→Pro, ColorWizard Landing Page Copy (+16 more)

### Community 17 - "Tauri Rust Backend"
Cohesion: 0.18
Nodes (22): app_db_file(), cw_create_project(), cw_delete_project(), cw_get_app_setting(), cw_get_project(), cw_init_database(), cw_list_projects(), cw_load_palettes() (+14 more)

### Community 18 - "Drawing Canvas"
Cohesion: 0.09
Nodes (7): CanvasImage.tsx, DrawingControlPanel.tsx, InfiniteCanvas.tsx, computeMatrix3d(), solve(), RotationHandle.tsx, TransformHandles.tsx

### Community 19 - "Paint Library Import"
Cohesion: 0.12
Nodes (5): ArtistPigmentsImporter, CSVPaintImporter, parseCSV(), toTitleCase(), JSONPaintImporter

### Community 20 - "Dashboard & Analytics Scripts"
Cohesion: 0.13
Nodes (14): generate_report(), get_week_dates(), main(), PostHogClient, pull_metrics(), Stripe API client for fetching payment data, Fetch successful charges in date range, Fetch all customers (for tracking who upgraded) (+6 more)

### Community 21 - "Brand & App Icons"
Cohesion: 0.14
Nodes (17): ColorWizard Brand Identity, Tauri Desktop App, Windows Store Icon Set, ColorWizard Icon 128x128, ColorWizard Icon 128x128@2x (Retina), ColorWizard Icon 32x32, ColorWizard App Icon (Master), ColorWizard Icon Square 107x107 (+9 more)

### Community 22 - "Product Story"
Cohesion: 0.14
Nodes (16): ColorWizard Performance Sprint Blog Narrative, ColorWizard Application, Colton Batts (Founder), DMC Floss Embroidery Color Matching, ColorWizard Performance Sprint v1.0, Spectral Paint Mixing Engine, Web Workers for Background Computation, Zustand Fine-Grained Selectors Pattern (+8 more)

### Community 23 - "Grayscale Processing"
Cohesion: 0.2
Nodes (8): createGrayscaleCanvas(), extractGrayscaleValues(), imageDataToGrayscale(), rgbToGrayscale(), ValueCompareCanvas.tsx, createZebraOverlayCanvas(), hexToRgb(), renderZebraStripes()

### Community 24 - "Build-in-Public & Analytics"
Cohesion: 0.18
Nodes (15): Build in Public Philosophy, Firebase Authentication and Database, ColorWizard Free Tier, PostHog Analytics Platform, ColorWizard Pro Tier, Stripe Payment Platform, Stripe Webhook Handler, ColorWizard Growth Sprint Phase 2A Deployment Guide (+7 more)

### Community 25 - "Monetization Flow"
Cohesion: 0.16
Nodes (14): Stripe Checkout Session Endpoint (/api/stripe/checkout/route.ts), Phase 2A Deployment Guide (Vercel), PostHog Analytics Setup with Custom Events, ProUpgradeButton Component, Python Dashboard Auto-Pull Script (PostHog + Stripe), Stripe Payment Integration Setup, Stripe Webhook Handler Route (/api/stripe/webhook/route.ts), Phase 2A Twitter Thread Drafts (4 Threads) (+6 more)

### Community 26 - "Mobile Bug Fixes"
Cohesion: 0.24
Nodes (12): Blob URL Lifecycle Management, Dynamic Viewport Height (dvh) Units, EXIF Orientation Fix (iPhone Portrait), Image Metadata with UUID Tracking, Mobile Safari Flexbox Height Issue, Stale Image Bug on Re-Upload, Mobile Image Loading Fix, PR1 Upload Fix Summary (+4 more)

### Community 27 - "Email Service"
Cohesion: 0.25
Nodes (5): getProvider(), sendEmail(), sendViaResend(), sendViaSendGrid(), sendViaTest()

### Community 28 - "Payment & Auth Backend"
Cohesion: 0.42
Nodes (10): Firebase Firestore User Tier Storage, Pro Lifetime Tier, Stripe Monetization ($1 Lifetime), Vercel Deployment, Stripe Webhook checkout.session.completed, Stripe Deployment Checklist, Operational Notes, ColorWizard Release Checklist (+2 more)

### Community 29 - "macOS Release"
Cohesion: 0.31
Nodes (9): ColorWizard Pro Desktop App, Developer ID Application Certificate, macOS Notarization and Code Signing, Desktop Project Persistence Model, Tauri Desktop Shell, macOS Release Prep Guide, ColorWizard Pro PRD, Rationale: Offline-First Desktop vs Free Web (+1 more)

### Community 30 - "Module 30"
Cohesion: 0.32
Nodes (8): Warm Paper Workbench Design Language, EB Garamond Display Typeface, Ink Color Tokens, JetBrains Mono Typeface, Paper Color Tokens, Signal/Subsignal Accent Tokens, ColorWizard Pro Design Canon, Rationale: Warm Paper Design vs SaaS Dashboard

### Community 31 - "Module 31"
Cohesion: 0.38
Nodes (3): compute_checksum(), simple_hash(), validate_license_key()

### Community 32 - "Module 32"
Cohesion: 0.5
Nodes (5): AR Tracing MVP Specification, AR Tracing / Digital Camera Lucida, Stationary Ghost AR Method, Screen WakeLock API, Rationale: Stationary Ghost over SLAM AR

### Community 33 - "Module 33"
Cohesion: 0.5
Nodes (5): Weekly Report Auto-Generation Script (TypeScript), Firebase UTM Tracking: createUserWithTracking, PostHog Analytics Integration, Stripe Dashboard Revenue Tracking, ColorWizard Weekly Analytics Dashboard Template

### Community 34 - "Module 34"
Cohesion: 0.5
Nodes (0): 

### Community 35 - "Module 35"
Cohesion: 1.0
Nodes (3): getAdminApp(), getUserIdFromRequest(), verifyIdToken()

### Community 36 - "Module 36"
Cohesion: 0.5
Nodes (4): Core Upload->Sample->Match Loop, Experimental Features Quarantine, Thin Core Refactor (PR1/PR2/PR3), Thin Core Refactor Quick Start

### Community 37 - "Module 37"
Cohesion: 0.5
Nodes (4): Safe Storage Wrapper (localStorage fallback), Zustand Persist Middleware, Mobile Safari Hotfix, Rationale: In-Memory Storage Fallback for Safari Private Browsing

### Community 38 - "Module 38"
Cohesion: 0.83
Nodes (4): ColorWizard Brand Identity, Color Palette Bar, Wizard Hat Symbol, ColorWizard Favicon

### Community 39 - "Module 39"
Cohesion: 0.67
Nodes (3): Static Data Pipeline (generate-static-data.mjs), scripts/source/dmcFloss.source.txt, public/data/dmc-floss.json

### Community 40 - "Module 40"
Cohesion: 1.0
Nodes (1): ProgressBar.tsx

### Community 41 - "Module 41"
Cohesion: 1.0
Nodes (1): Spinner.tsx

### Community 42 - "Module 42"
Cohesion: 1.0
Nodes (0): 

### Community 43 - "Module 43"
Cohesion: 1.0
Nodes (0): 

### Community 44 - "Module 44"
Cohesion: 1.0
Nodes (0): 

### Community 45 - "Module 45"
Cohesion: 1.0
Nodes (0): 

### Community 46 - "Module 46"
Cohesion: 1.0
Nodes (0): 

### Community 47 - "Module 47"
Cohesion: 1.0
Nodes (0): 

### Community 48 - "Module 48"
Cohesion: 1.0
Nodes (0): 

### Community 49 - "Module 49"
Cohesion: 1.0
Nodes (1): Color

### Community 50 - "Module 50"
Cohesion: 1.0
Nodes (2): Vercel Deployment, Vercel Auto-Deploy on Push to main

### Community 51 - "Module 51"
Cohesion: 1.0
Nodes (2): DMC Embroidery Floss Color Database (454 colors), DMC Floss Source Data

### Community 52 - "Module 52"
Cohesion: 1.0
Nodes (2): Feature Backlog, Curated Doodle Packs Feature (Backlog)

### Community 53 - "Module 53"
Cohesion: 1.0
Nodes (2): Phase 2A UTM Tracking Structure, UTM Preset Campaigns: Twitter, Reddit, Newsletter, Blog

### Community 54 - "Module 54"
Cohesion: 1.0
Nodes (0): 

### Community 55 - "Module 55"
Cohesion: 1.0
Nodes (0): 

### Community 56 - "Module 56"
Cohesion: 1.0
Nodes (0): 

### Community 57 - "Module 57"
Cohesion: 1.0
Nodes (0): 

### Community 58 - "Module 58"
Cohesion: 1.0
Nodes (0): 

### Community 59 - "Module 59"
Cohesion: 1.0
Nodes (0): 

### Community 60 - "Module 60"
Cohesion: 1.0
Nodes (1): error.tsx

### Community 61 - "Module 61"
Cohesion: 1.0
Nodes (1): CurrentColorBadge.tsx

### Community 62 - "Module 62"
Cohesion: 1.0
Nodes (1): OpacitySlider.tsx

### Community 63 - "Module 63"
Cohesion: 1.0
Nodes (1): GridControlsPanel.tsx

### Community 64 - "Module 64"
Cohesion: 1.0
Nodes (1): ImageDropzone.tsx

### Community 65 - "Module 65"
Cohesion: 1.0
Nodes (1): ZoomControlsBar.tsx

### Community 66 - "Module 66"
Cohesion: 1.0
Nodes (0): 

### Community 67 - "Module 67"
Cohesion: 1.0
Nodes (1): Node.js Runtime

### Community 68 - "Module 68"
Cohesion: 1.0
Nodes (1): npm Package Manager

### Community 69 - "Module 69"
Cohesion: 1.0
Nodes (1): Vercel CLI

### Community 70 - "Module 70"
Cohesion: 1.0
Nodes (1): Stripe CLI

### Community 71 - "Module 71"
Cohesion: 1.0
Nodes (1): ngrok Webhook Tunnel

### Community 72 - "Module 72"
Cohesion: 1.0
Nodes (1): GitHub CLI

### Community 73 - "Module 73"
Cohesion: 1.0
Nodes (0): 

### Community 74 - "Module 74"
Cohesion: 1.0
Nodes (0): 

### Community 75 - "Module 75"
Cohesion: 1.0
Nodes (0): 

### Community 76 - "Module 76"
Cohesion: 1.0
Nodes (0): 

### Community 77 - "Module 77"
Cohesion: 1.0
Nodes (1): components/ColorDeckPanel.tsx

### Community 78 - "Module 78"
Cohesion: 1.0
Nodes (1): Tech Debt: Unreachable Dead Code Surface

### Community 79 - "Module 79"
Cohesion: 1.0
Nodes (1): Tech Debt: Tooling Drift (tsc/vitest/swc)

### Community 80 - "Module 80"
Cohesion: 1.0
Nodes (1): Email Service (Resend/SendGrid)

### Community 81 - "Module 81"
Cohesion: 1.0
Nodes (1): Firebase Environment Variables (6 vars)

### Community 82 - "Module 82"
Cohesion: 1.0
Nodes (0): 

### Community 83 - "Module 83"
Cohesion: 1.0
Nodes (1): components/ColorDeckPanel.tsx

### Community 84 - "Module 84"
Cohesion: 1.0
Nodes (1): CLAUDE.md Dev Commands Reference

### Community 85 - "Module 85"
Cohesion: 1.0
Nodes (1): Debug Upload Flag (?debug=upload)

### Community 86 - "Module 86"
Cohesion: 1.0
Nodes (1): GitHub as Single Source of Truth

### Community 87 - "Module 87"
Cohesion: 1.0
Nodes (1): First Week Beta Launch Plan

### Community 88 - "Module 88"
Cohesion: 1.0
Nodes (1): Documentation README Overview

### Community 89 - "Module 89"
Cohesion: 1.0
Nodes (1): PR1 Import Audit

### Community 90 - "Module 90"
Cohesion: 1.0
Nodes (1): Debug Instrumentation Guide

### Community 91 - "Module 91"
Cohesion: 1.0
Nodes (1): Knowledge Guide

### Community 92 - "Module 92"
Cohesion: 1.0
Nodes (1): Quick Start Summary

### Community 93 - "Module 93"
Cohesion: 1.0
Nodes (1): Knowledge Graph Report

### Community 94 - "Module 94"
Cohesion: 1.0
Nodes (1): Debug Logging via Query Parameter Flag

### Community 95 - "Module 95"
Cohesion: 1.0
Nodes (1): Knowledge Graph Communities (46 detected)

### Community 96 - "Module 96"
Cohesion: 1.0
Nodes (1): app/page.tsx

### Community 97 - "Module 97"
Cohesion: 1.0
Nodes (1): components/canvas/ImageDropzone.tsx

### Community 98 - "Module 98"
Cohesion: 1.0
Nodes (0): 

### Community 99 - "Module 99"
Cohesion: 1.0
Nodes (0): 

### Community 100 - "Module 100"
Cohesion: 1.0
Nodes (1): components/ImageCanvas.tsx

### Community 101 - "Module 101"
Cohesion: 1.0
Nodes (1): app/globals.css

### Community 102 - "Module 102"
Cohesion: 1.0
Nodes (0): 

### Community 103 - "Module 103"
Cohesion: 1.0
Nodes (1): components/ARCanvas.tsx

### Community 104 - "Module 104"
Cohesion: 1.0
Nodes (1): CalibrationModal (Experimental)

### Community 105 - "Module 105"
Cohesion: 1.0
Nodes (1): RulerOverlay (Experimental)

### Community 106 - "Module 106"
Cohesion: 1.0
Nodes (1): StructureTab (Experimental Grid)

### Community 107 - "Module 107"
Cohesion: 1.0
Nodes (1): SurfaceTab (Experimental)

### Community 108 - "Module 108"
Cohesion: 1.0
Nodes (1): ColorWizard Weekly Dashboard Template

### Community 109 - "Module 109"
Cohesion: 1.0
Nodes (1): ColorWizard Growth Sprint Phase 2A Deliverables

### Community 110 - "Module 110"
Cohesion: 1.0
Nodes (1): ColorWizard README with Founder Story

### Community 111 - "Module 111"
Cohesion: 1.0
Nodes (1): ColorWizard Twitter Thread (Ready to Post)

### Community 112 - "Module 112"
Cohesion: 1.0
Nodes (1): ColorWizard Performance Sprint Blog Post

### Community 113 - "Module 113"
Cohesion: 1.0
Nodes (1): ColorWizard Landing Page Raw Copy

### Community 114 - "Module 114"
Cohesion: 1.0
Nodes (1): ColorWizard Strategic Pivot Deliverables Summary

### Community 115 - "Module 115"
Cohesion: 1.0
Nodes (1): ColorWizard Twitter Thread Drafts

### Community 116 - "Module 116"
Cohesion: 1.0
Nodes (1): UTM Parameter Tracking Structure

### Community 117 - "Module 117"
Cohesion: 1.0
Nodes (1): Anti-Corporate Builder Voice

### Community 118 - "Module 118"
Cohesion: 1.0
Nodes (1): Vendor Lock-in as Pain Point

### Community 119 - "Module 119"
Cohesion: 1.0
Nodes (1): Rationale: No Paid Marketing Strategy

### Community 120 - "Module 120"
Cohesion: 1.0
Nodes (1): Phase 2A Weekly Dashboard Template

### Community 121 - "Module 121"
Cohesion: 1.0
Nodes (1): Visual Assets Needed: Hero Image, Performance Chart, Feature Icons

### Community 122 - "Module 122"
Cohesion: 1.0
Nodes (1): Analytics Setup: Plausible or GA4

### Community 123 - "Module 123"
Cohesion: 1.0
Nodes (1): Short Link Strategy: bit.ly with UTM Preservation

### Community 124 - "Module 124"
Cohesion: 1.0
Nodes (1): Twitter Reply Templates for Pricing/AI/Plugin Questions

## Knowledge Gaps
- **176 isolated node(s):** `error.tsx`, `PostHog API client for fetching analytics`, `Fetch events from PostHog`, `Stripe API client for fetching payment data`, `Fetch successful charges in date range` (+171 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Module 40`** (2 nodes): `ProgressBar.tsx`, `ProgressBar()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 41`** (2 nodes): `Spinner.tsx`, `Spinner()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 42`** (2 nodes): `useCanvasTransform.ts`, `useCanvasTransform()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 43`** (2 nodes): `useUndoRedo.ts`, `useUndoRedo()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 44`** (2 nodes): `useFileLoader.ts`, `useFileLoader()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 45`** (2 nodes): `build.rs`, `main()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 46`** (2 nodes): `lib.rs`, `run()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 47`** (2 nodes): `main.rs`, `main()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 48`** (2 nodes): `useCamera.ts`, `useCamera()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 49`** (2 nodes): `spectral.d.ts`, `Color`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 50`** (2 nodes): `Vercel Deployment`, `Vercel Auto-Deploy on Push to main`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 51`** (2 nodes): `DMC Embroidery Floss Color Database (454 colors)`, `DMC Floss Source Data`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 52`** (2 nodes): `Feature Backlog`, `Curated Doodle Packs Feature (Backlog)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 53`** (2 nodes): `Phase 2A UTM Tracking Structure`, `UTM Preset Campaigns: Twitter, Reddit, Newsletter, Blog`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 54`** (1 nodes): `next.config.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 55`** (1 nodes): `next-env.d.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 56`** (1 nodes): `tailwind.config.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 57`** (1 nodes): `vitest.config.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 58`** (1 nodes): `postcss.config.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 59`** (1 nodes): `vitest.setup.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 60`** (1 nodes): `error.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 61`** (1 nodes): `CurrentColorBadge.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 62`** (1 nodes): `OpacitySlider.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 63`** (1 nodes): `GridControlsPanel.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 64`** (1 nodes): `ImageDropzone.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 65`** (1 nodes): `ZoomControlsBar.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 66`** (1 nodes): `stripe-config.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 67`** (1 nodes): `Node.js Runtime`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 68`** (1 nodes): `npm Package Manager`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 69`** (1 nodes): `Vercel CLI`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 70`** (1 nodes): `Stripe CLI`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 71`** (1 nodes): `ngrok Webhook Tunnel`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 72`** (1 nodes): `GitHub CLI`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 73`** (1 nodes): `lib/store/useCalibrationStore.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 74`** (1 nodes): `lib/store/useLayoutStore.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 75`** (1 nodes): `lib/store/usePaletteStore.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 76`** (1 nodes): `lib/store/usePaintPaletteStore.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 77`** (1 nodes): `components/ColorDeckPanel.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 78`** (1 nodes): `Tech Debt: Unreachable Dead Code Surface`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 79`** (1 nodes): `Tech Debt: Tooling Drift (tsc/vitest/swc)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 80`** (1 nodes): `Email Service (Resend/SendGrid)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 81`** (1 nodes): `Firebase Environment Variables (6 vars)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 82`** (1 nodes): `lib/colorArtifacts.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 83`** (1 nodes): `components/ColorDeckPanel.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 84`** (1 nodes): `CLAUDE.md Dev Commands Reference`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 85`** (1 nodes): `Debug Upload Flag (?debug=upload)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 86`** (1 nodes): `GitHub as Single Source of Truth`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 87`** (1 nodes): `First Week Beta Launch Plan`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 88`** (1 nodes): `Documentation README Overview`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 89`** (1 nodes): `PR1 Import Audit`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 90`** (1 nodes): `Debug Instrumentation Guide`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 91`** (1 nodes): `Knowledge Guide`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 92`** (1 nodes): `Quick Start Summary`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 93`** (1 nodes): `Knowledge Graph Report`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 94`** (1 nodes): `Debug Logging via Query Parameter Flag`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 95`** (1 nodes): `Knowledge Graph Communities (46 detected)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 96`** (1 nodes): `app/page.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 97`** (1 nodes): `components/canvas/ImageDropzone.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 98`** (1 nodes): `lib/imagePipeline.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 99`** (1 nodes): `lib/store/useStore.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 100`** (1 nodes): `components/ImageCanvas.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 101`** (1 nodes): `app/globals.css`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 102`** (1 nodes): `hooks/useMediaQuery.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 103`** (1 nodes): `components/ARCanvas.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 104`** (1 nodes): `CalibrationModal (Experimental)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 105`** (1 nodes): `RulerOverlay (Experimental)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 106`** (1 nodes): `StructureTab (Experimental Grid)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 107`** (1 nodes): `SurfaceTab (Experimental)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 108`** (1 nodes): `ColorWizard Weekly Dashboard Template`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 109`** (1 nodes): `ColorWizard Growth Sprint Phase 2A Deliverables`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 110`** (1 nodes): `ColorWizard README with Founder Story`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 111`** (1 nodes): `ColorWizard Twitter Thread (Ready to Post)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 112`** (1 nodes): `ColorWizard Performance Sprint Blog Post`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 113`** (1 nodes): `ColorWizard Landing Page Raw Copy`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 114`** (1 nodes): `ColorWizard Strategic Pivot Deliverables Summary`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 115`** (1 nodes): `ColorWizard Twitter Thread Drafts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 116`** (1 nodes): `UTM Parameter Tracking Structure`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 117`** (1 nodes): `Anti-Corporate Builder Voice`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 118`** (1 nodes): `Vendor Lock-in as Pain Point`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 119`** (1 nodes): `Rationale: No Paid Marketing Strategy`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 120`** (1 nodes): `Phase 2A Weekly Dashboard Template`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 121`** (1 nodes): `Visual Assets Needed: Hero Image, Performance Chart, Feature Icons`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 122`** (1 nodes): `Analytics Setup: Plausible or GA4`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 123`** (1 nodes): `Short Link Strategy: bit.ly with UTM Preservation`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 124`** (1 nodes): `Twitter Reply Templates for Pricing/AI/Plugin Questions`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `page.tsx` connect `Canvas Core` to `Project & Card System`, `Accessibility & Contrast`, `Color Conversion & AI`, `Canvas Calibration`, `Image Worker Pipeline`, `UI Layout & Navigation`, `Error Handling`, `Color Naming & Sampling`?**
  _High betweenness centrality (0.087) - this node is a cross-community bridge._
- **Why does `TauriPersistence.tsx` connect `Canvas Core` to `Project & Card System`, `Spectral Color Engine`, `Desktop Runtime`, `Canvas Calibration`, `Image Worker Pipeline`, `Error Handling`?**
  _High betweenness centrality (0.058) - this node is a cross-community bridge._
- **Why does `ImageCanvas.tsx` connect `Canvas Core` to `Project & Card System`, `Spectral Color Engine`, `Canvas Calibration`, `Image Worker Pipeline`, `Color Naming & Sampling`?**
  _High betweenness centrality (0.042) - this node is a cross-community bridge._
- **What connects `error.tsx`, `PostHog API client for fetching analytics`, `Fetch events from PostHog` to the rest of the system?**
  _176 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Canvas Core` be split into smaller, more focused modules?**
  _Cohesion score 0.03 - nodes in this community are weakly interconnected._
- **Should `Project & Card System` be split into smaller, more focused modules?**
  _Cohesion score 0.04 - nodes in this community are weakly interconnected._
- **Should `Spectral Color Engine` be split into smaller, more focused modules?**
  _Cohesion score 0.04 - nodes in this community are weakly interconnected._