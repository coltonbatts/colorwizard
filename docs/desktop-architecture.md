# ColorWizard Desktop — Architecture & Migration Plan

## Vision
ColorWizard Desktop is the $10 Procreate-style companion to ColorWizard Web (free forever). Web is the quick-lookup tool. Desktop is the workspace: projects, persistence, zero network dependency.

---

## WHAT GETS STRIPPED
- Firebase auth (login, user sessions)
- Firestore (remote storage)
- Stripe webhooks (server-side payment flow)
- User tier system (`lib/db/userTier.ts`)
- `firebase`, `@stripe/stripe-js` npm dependencies

## WHAT GETS ADDED
- Tauri plugin-sql (SQLite) for local DB
- Project system (CRUD + gallery)
- `@tauri-apps/plugin-fs` for project file operations
- License key validation (offline, deterministic)
- `.colorwizard` project file format (double-click to open)
- `tauri-plugin-store` for app settings (calibrations, preferences)

---

## PROJECT FILE FORMAT
**Approach: SQLite DB on disk, not a bundle file**

Each project is a folder named by the user, stored in `~/ColorWizard/Projects/`, containing:
- `project.sqlite` — all project data
- `project.json` — metadata (name, created, thumbnail, version)
- `assets/` — reference images, calibration photos

**Why SQLite over JSON:**
- Scales to large palettes and calibration data
- Indexed queries for finding colors fast
- Single file per project, easy to backup/move

**Double-click open:** macOS file association registered in Tauri config. `.colorwizard` is a symlink-style opener that launches the DMG and passes the project path as a CLI arg.

---

## STORAGE LAYER

### Primary DB (SQLite) — Per-project
```
tables:
  palettes        — name, colors (JSON array), created, modified
  color_decks     — hex, rgb, r, g, b, h, s, l, notes
  calibrations    — calibration data (JSON), scale, unit
  canvas_settings — settings blob (JSON)
  sessions        — recent sampled colors, pinned colors
```

### App-level Store (Tauri Store) — Global
```
settings:
  default_paint_library
  calibration_defaults
  ui_preferences
  license_key
  last_opened_project
```

### File System
```
~/ColorWizard/
├── Projects/
│   ├── "Sunset Study"/
│   │   ├── project.json
│   │   ├── project.sqlite
│   │   └── assets/
│   │       ├── ref-001.png
│   │       └── calibration.jpg
│   └── "Mural Palette"/
│       ├── ...
└── Library/
    └── paint_brands/     — bundled paint DBs
```

---

## PROJECT SYSTEM

### Project Lifecycle
1. **Create**: User names a project → folder created, SQLite DB initialized
2. **Open**: Project gallery → click → load SQLite into app state
3. **Save**: Auto-save on changes + manual save (Cmd+S)
4. **Export**: Palettes to ACO/CPL/ASE formats
5. **Delete**: Move to trash, confirm

### Project Gallery Screen
- Thumbnail grid (use first image or generated color swatch)
- Project name + date modified
- Search/filter
- "New Project" button
- Recent projects quick-access

---

## LICENSE KEY SYSTEM

**Model: One-time $10 purchase via Gumroad/LemonSqueezy**
- Purchase email → license key
- User enters key once in desktop app
- Key validated offline (deterministic check, no server call)
- Stored in Tauri Store

**Key format**: `CW-XXXX-XXXX-XXXX` (12 chars, checkable)
**Validation**: CRC/checksum algorithm embedded in binary. No phoning home.

**Why not DRM**: Aligns with anti-SaaS, own-forever philosophy. Users trust tools that work without calling home.

---

## TAURI CHANGES

### Current → Changes
```json
{
  "productName": "ColorWizard",
  "version": "1.0.0",
  "build": {
    "frontendDist": "../out",     // Next.js static export
    "devUrl": "http://localhost:3000"
  },
  "app": {
    "windows": [{
      "label": "main",
      "title": "ColorWizard",
      "width": 1440,
      "height": 960,
      "resizable": true
    }],
    "withGlobalTauri": true  // for window.__TAURI__ access
  }
}
```

### New plugins needed
```toml
# Cargo.toml
[dependencies]
tauri-plugin-sql = "2"
tauri-plugin-fs = "2"
tauri-plugin-store = "2"
tauri-plugin-dialog = "2"
```

### File association
```json
{
  "bundle": {
    "fileAssociations": [{
      "ext": ["colorwizard"],
      "mimeType": "application/x-colorwizard",
      "name": "ColorWizard Project",
      "role": "Editor"
    }]
  }
}
```

---

## BUILD ORDER

| Step | What | Deliverable |
|------|------|-------------|
| 1 | Tauri shell | Working desktop build loading Next.js export |
| 2 | SQLite plugin | Local storage wired, verify CRUD |
| 3 | Project system | Create/save/load projects + gallery UI |
| 4 | Persistence | Palettes/calibrations/settings in SQLite |
| 5 | License key | Offline validation layer |
| 6 | DMG + sign | Apple notarized DMG, ready for Gumroad |

---

## FIREBASE STRATEGY
**Phased removal, not all-at-once:**

1. First: Strip auth from the Tauri build (conditional: if `window.__TAURI__`, skip Firebase init)
2. Second: Migrate Firestore reads to SQLite
3. Third: Delete Firebase imports entirely

This way the web version stays unaffected while we migrate the desktop.

---

## RISK AREAS
- **Firebase in Web Workers**: Verify `comlink` workers don't import Firebase
- **Next.js static export compatibility**: `output: 'export'` — ensure pages don't need server
- **Image loading in Tauri**: `file://` vs `http://` URL handling for assets
- **Performance**: SQLite reads need to not block React render (use Web Worker or Tauri async commands)
- **Tauri v2 API**: Some v1 patterns don't translate directly (e.g., `@tauri-apps/api/dialog` v2 changes)
