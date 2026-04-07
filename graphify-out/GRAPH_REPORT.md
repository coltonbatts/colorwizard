# Graph Report - components  (2026-04-06)

## Corpus Check
- 122 files · ~70,902 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 316 nodes · 339 edges · 45 communities detected
- Extraction: 93% EXTRACTED · 7% INFERRED · 0% AMBIGUOUS · INFERRED: 25 edges (avg confidence: 0.5)
- Token cost: 0 input · 0 output

## God Nodes (most connected - your core abstractions)
1. `ImageCanvas.tsx` - 18 edges
2. `ColorDeckPanel.tsx` - 18 edges
3. `Overlay.tsx` - 18 edges
4. `ColorPanel.tsx` - 13 edges
5. `workbenchIcons.tsx` - 13 edges
6. `PhotoshopColorWheel.tsx` - 11 edges
7. `PaintRecipe.tsx` - 11 edges
8. `CompactToolbar.tsx` - 11 edges
9. `ColorCardModal.tsx` - 9 edges
10. `SessionPaletteStrip.tsx` - 8 edges

## Surprising Connections (you probably didn't know these)
- None detected - all connections are within the same source files.

## Communities

### Community 0 - "App Chrome Navigation"
Cohesion: 0.07
Nodes (9): AppHeader.tsx, CollapsibleSidebar.tsx, CompactToolbar.tsx, MobileHeader.tsx, MobileNavigation.tsx, ResizableSidebar.tsx, Wordmark.tsx, workbenchIcons.tsx (+1 more)

### Community 1 - "Image Canvas Engine"
Cohesion: 0.1
Nodes (7): CanvasHUD.tsx, getImageDataAt(), sampleColor(), DebugOverlay.tsx, HighlightOverlay.tsx, ImageCanvas.tsx, ValueOverlay.tsx

### Community 2 - "Color Adjustment Panel"
Cohesion: 0.09
Nodes (11): AdvancedTab.tsx, CollapsibleSection.tsx, ColorHarmonies.tsx, ColorNamingDisplay.tsx, ColorPanel.tsx, DMCFlossMatch.tsx, MatchesTab.tsx, MixLab.tsx (+3 more)

### Community 3 - "Paint Recipe Workflow"
Cohesion: 0.09
Nodes (13): CanvasErrorFallback.tsx, CanvasSection.tsx, ErrorBoundary.tsx, ErrorBoundary, MixedColorPreview.tsx, MobileDashboard.tsx, OilMixTab.tsx, OilPaintTab.tsx (+5 more)

### Community 4 - "Color Deck Cards"
Cohesion: 0.13
Nodes (10): CardMetadataFields.tsx, ColorCardModal.tsx, ColorCardPreview.tsx, ColorDeckPanel.tsx, handleDelete(), handleSaveCopy(), handleStorage(), handleUpdateSelectedCard() (+2 more)

### Community 5 - "Modal Overlay System"
Cohesion: 0.11
Nodes (10): CalibrationModal.tsx, CanvasSettingsModal.tsx, Overlay.tsx, focusFirstElement(), getFocusableElements(), handleKeyDown(), isTopOverlay(), onClose() (+2 more)

### Community 6 - "Tauri Project Shell"
Cohesion: 0.12
Nodes (9): LicenseActivation.tsx, formatKey(), handleChange(), handlePaste(), ProjectGallery.tsx, ProjectLayout.tsx, ProjectProvider.tsx, TauriAppShell.tsx (+1 more)

### Community 7 - "Palette Export Strip"
Cohesion: 0.11
Nodes (8): BrandSelector.tsx, PaletteTab.tsx, ProcreateExportButton.tsx, SessionPaletteStrip.tsx, checkColors(), handleStorageChange(), TubeSelector.tsx, UpgradeModal.tsx

### Community 8 - "Drawing Critique Canvas"
Cohesion: 0.2
Nodes (6): CanvasImage.tsx, CheckMyDrawingView.tsx, DrawingControlPanel.tsx, InfiniteCanvas.tsx, RotationHandle.tsx, TransformHandles.tsx

### Community 9 - "Photoshop Color Wheel"
Cohesion: 0.33
Nodes (9): ColorWheelTab.tsx, PhotoshopColorWheel.tsx, draw(), getTriangleVertices(), handleMouseDown(), handleMouseMove(), notifyChange(), updateHue() (+1 more)

### Community 10 - "Pro Feature Gating"
Cohesion: 0.22
Nodes (5): AISuggestions.tsx, FeatureGate.tsx, ProFeatureSection.tsx, ProFeaturesShowcase.tsx, UpgradePrompt.tsx

### Community 11 - "Sampling Fullscreen Tools"
Cohesion: 0.25
Nodes (2): FullScreenOverlay.tsx, SampleTab.tsx

### Community 12 - "Palette Library Saving"
Cohesion: 0.29
Nodes (6): PaintLibraryTab.tsx, PaletteIndicator.tsx, PaletteSwitcher.tsx, SavePaletteModal.tsx, handleKeyDown(), handleSave()

### Community 13 - "Value Comparison View"
Cohesion: 0.29
Nodes (3): CheckMyValuesTab.tsx, CheckMyValuesView.tsx, ValueCompareCanvas.tsx

### Community 14 - "Color Theory Canvas"
Cohesion: 0.38
Nodes (4): ColorTheoryCanvas.tsx, handleDrop(), handleFileInput(), loadImage()

### Community 15 - "Measurement Ruler Overlay"
Cohesion: 0.33
Nodes (1): RulerOverlay.tsx

### Community 16 - "AR Camera Canvas"
Cohesion: 0.33
Nodes (2): ARCanvas.tsx, CameraView.tsx

### Community 17 - "Color Analysis Views"
Cohesion: 0.33
Nodes (4): ColorAnalysisPanel.tsx, HeroColorCard.tsx, MixLadders.tsx, ValueChromaMap.tsx

### Community 18 - "Shopping List Export"
Cohesion: 0.4
Nodes (1): ShoppingListPanel.tsx

### Community 19 - "Palette Sharing"
Cohesion: 0.67
Nodes (3): SharePaletteButton.tsx, buildPaletteShareText(), handleShare()

### Community 20 - "Reference Uploader"
Cohesion: 0.5
Nodes (1): ReferenceImageUploader.tsx

### Community 21 - "Surface Capture Tab"
Cohesion: 0.67
Nodes (1): SurfaceTab.tsx

### Community 22 - "Reference Transform Tab"
Cohesion: 0.67
Nodes (1): ReferenceTab.tsx

### Community 23 - "Palette Selector"
Cohesion: 1.0
Nodes (1): PaletteSelector.tsx

### Community 24 - "Value Chroma Graph"
Cohesion: 1.0
Nodes (1): ValueChromaGraph.tsx

### Community 25 - "Pinned Colors Panel"
Cohesion: 1.0
Nodes (1): PinnedColorsPanel.tsx

### Community 26 - "Store Bootstrap"
Cohesion: 1.0
Nodes (1): StoreBootstrap.tsx

### Community 27 - "Progress Bar"
Cohesion: 1.0
Nodes (1): ProgressBar.tsx

### Community 28 - "Spinner"
Cohesion: 1.0
Nodes (1): Spinner.tsx

### Community 29 - "Navigator Minimap"
Cohesion: 1.0
Nodes (1): NavigatorMinimap.tsx

### Community 30 - "Saturation Value Panel"
Cohesion: 1.0
Nodes (1): SaturationValuePanel.tsx

### Community 31 - "Chroma Map"
Cohesion: 1.0
Nodes (1): ChromaMap.tsx

### Community 32 - "Color Wheel Display"
Cohesion: 1.0
Nodes (1): ColorWheelDisplay.tsx

### Community 33 - "Advanced Toggle"
Cohesion: 1.0
Nodes (1): SimpleAdvancedToggle.tsx

### Community 34 - "My Cards Panel"
Cohesion: 1.0
Nodes (1): MyCardsPanel.tsx

### Community 35 - "Current Color Badge"
Cohesion: 1.0
Nodes (1): CurrentColorBadge.tsx

### Community 36 - "Highlight Controls"
Cohesion: 1.0
Nodes (1): HighlightControls.tsx

### Community 37 - "Upload Hero"
Cohesion: 1.0
Nodes (1): UploadHero.tsx

### Community 38 - "Structure Tab"
Cohesion: 1.0
Nodes (1): StructureTab.tsx

### Community 39 - "Opacity Slider"
Cohesion: 1.0
Nodes (1): OpacitySlider.tsx

### Community 40 - "Components Index"
Cohesion: 1.0
Nodes (0): 

### Community 41 - "Grid Controls Panel"
Cohesion: 1.0
Nodes (1): GridControlsPanel.tsx

### Community 42 - "Image Dropzone"
Cohesion: 1.0
Nodes (1): ImageDropzone.tsx

### Community 43 - "Zoom Controls Bar"
Cohesion: 1.0
Nodes (1): ZoomControlsBar.tsx

### Community 44 - "Mix Adjustment Guide"
Cohesion: 1.0
Nodes (1): MixAdjustmentGuide.tsx

## Knowledge Gaps
- **39 isolated node(s):** `ResizableSidebar.tsx`, `PaletteSelector.tsx`, `CanvasSettingsModal.tsx`, `SimpleAdvancedToggle.tsx`, `ValueChromaGraph.tsx` (+34 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Palette Selector`** (2 nodes): `PaletteSelector.tsx`, `handleClickOutside()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Value Chroma Graph`** (2 nodes): `ValueChromaGraph.tsx`, `ValueChromaGraph()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Pinned Colors Panel`** (2 nodes): `PinnedColorsPanel.tsx`, `isActive()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Store Bootstrap`** (2 nodes): `StoreBootstrap.tsx`, `StoreBootstrap()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Progress Bar`** (2 nodes): `ProgressBar.tsx`, `ProgressBar()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Spinner`** (2 nodes): `Spinner.tsx`, `Spinner()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Navigator Minimap`** (2 nodes): `NavigatorMinimap.tsx`, `NavigatorMinimap()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Saturation Value Panel`** (2 nodes): `SaturationValuePanel.tsx`, `GradientScale()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Chroma Map`** (2 nodes): `ChromaMap.tsx`, `ChromaMap()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Color Wheel Display`** (2 nodes): `ColorWheelDisplay.tsx`, `ColorWheelDisplay()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Advanced Toggle`** (1 nodes): `SimpleAdvancedToggle.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `My Cards Panel`** (1 nodes): `MyCardsPanel.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Current Color Badge`** (1 nodes): `CurrentColorBadge.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Highlight Controls`** (1 nodes): `HighlightControls.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Upload Hero`** (1 nodes): `UploadHero.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Structure Tab`** (1 nodes): `StructureTab.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Opacity Slider`** (1 nodes): `OpacitySlider.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Components Index`** (1 nodes): `index.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Grid Controls Panel`** (1 nodes): `GridControlsPanel.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Image Dropzone`** (1 nodes): `ImageDropzone.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Zoom Controls Bar`** (1 nodes): `ZoomControlsBar.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Mix Adjustment Guide`** (1 nodes): `MixAdjustmentGuide.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Overlay.tsx` connect `Modal Overlay System` to `App Chrome Navigation`, `Pro Feature Gating`, `Sampling Fullscreen Tools`, `Color Deck Cards`?**
  _High betweenness centrality (0.194) - this node is a cross-community bridge._
- **Why does `ColorPanel.tsx` connect `Color Adjustment Panel` to `Sampling Fullscreen Tools`, `Photoshop Color Wheel`, `Paint Recipe Workflow`, `Color Deck Cards`?**
  _High betweenness centrality (0.142) - this node is a cross-community bridge._
- **Why does `FullScreenOverlay.tsx` connect `Sampling Fullscreen Tools` to `Image Canvas Engine`, `Color Adjustment Panel`, `Modal Overlay System`?**
  _High betweenness centrality (0.129) - this node is a cross-community bridge._
- **What connects `ResizableSidebar.tsx`, `PaletteSelector.tsx`, `CanvasSettingsModal.tsx` to the rest of the system?**
  _39 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `App Chrome Navigation` be split into smaller, more focused modules?**
  _Cohesion score 0.07 - nodes in this community are weakly interconnected._
- **Should `Image Canvas Engine` be split into smaller, more focused modules?**
  _Cohesion score 0.1 - nodes in this community are weakly interconnected._
- **Should `Color Adjustment Panel` be split into smaller, more focused modules?**
  _Cohesion score 0.09 - nodes in this community are weakly interconnected._