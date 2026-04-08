# ColorWizard Pro — Product Requirements Document

Implementation-focused scope for the **paid macOS desktop app**. For the overall product and thin-core web experience, see [`PRD.md`](./PRD.md).

---

## 1. Product Vision (short, clear, non-marketing)

**ColorWizard Pro** is a **paid, offline-first macOS desktop app** for serious color work on reference images: sampling, palettes, paint recipes, and project continuity—without depending on a browser tab or the public web app.

**It is:**

- A **document-based creative utility** (projects you open, work in, and return to).
- **Local-first**: your images and project state live on disk; the app is usable without network once installed and licensed.
- **The same core color engine as the web app**, exposed through a **desktop-appropriate shell** (not a marketing site).

**It is not:**

- A replacement or redesign of **ColorWizard.App (web)**. Web stays as-is: free, lightweight, exploratory.
- A cloud sync product, a social platform, or a full painting/illustration app.
- An excuse for a large platform split: **one repo, one codebase**, with desktop-specific paths and Tauri where needed.

**Pricing intent:** **$10 one-time** = “I own a focused tool on my machine,” not a subscription suite.

---

## 2. Target User

**Primary:**  
Hobbyist and semi-pro **painters, miniaturists, textile/stitch artists, and digital artists** who repeatedly **match colors from photos** (references, client shots, their own WIP photos) to **named colors, floss, or paint mixes**—often at a desk, often for **sessions longer than a casual browser visit**.

**Secondary:**  
Educators or students who want the same workflows **offline** or in **labs/studios with poor connectivity**.

**Explicitly not the core bet:**  
Casual one-off hex pickers (that’s the web app), enterprise teams, or users who need real-time collaboration.

**User job-to-be-done (one line):**  
“Open **my** reference, pin and compare colors, get trustworthy recipes/names, and **come back tomorrow** without redoing setup.”

---

## 3. Core Experience

Describe the product as a **loop**, not a URL.

1. **Launch**  
   User starts ColorWizard Pro from **Dock / Spotlight / Finder**. No “welcome to our website.” Optional: resume **last project** or show **project gallery** (recent + create new).

2. **Open or create project**  
   - **New project**: name it, optionally set defaults (e.g. calibration, preferred recipe mode—only if already in product).  
   - **Open project**: from gallery or **File → Open** (see §6).  
   User expectation: a **project is a durable container**, not “whatever was in localStorage last time.”

3. **Work**  
   - Import or reference **one or more images** per project (within current architecture—don’t invent multi-user cloud assets).  
   - Same **core interactions** as today: canvas, sampling, highlights, palettes, recipes—**without changing reference image processing semantics** (no surprise filters/corrections).  
   - State that should survive: open image(s), zoom/pan if you already persist it, pinned colors, relevant sidebar/tab state **as defined in implementation**, calibration if applicable.

4. **Save**  
   - **Explicit save** and/or **autosave to project** (pick one clear model in implementation; user-facing copy must match—see §7).  
   - **Cmd+S** does something predictable (save project, not “save web page”).

5. **Export**  
   - Export artifacts that justify desktop: e.g. palette export, recipe summary, or image export—**only what’s already aligned with the app’s value**; don’t add random formats for scope creep.

**Success criterion:** A user can say, “I **opened my file**, worked, **quit**, reopened—**my stuff was there**,” without thinking about “the site.”

---

## 4. Key Differentiators vs Web

| Area | ColorWizard.App (web) | ColorWizard Pro (desktop) |
|------|------------------------|----------------------------|
| **Distribution / cost** | Free, public, always online | Paid, **offline-first**, Mac-native shell |
| **Unit of work** | Ephemeral session / browser | **Named project** on disk |
| **Files** | Upload in tab; tied to session | **Open/save project**, imports feel like **documents** |
| **Trust & focus** | Lightweight exploration | **Dedicated window**, no tab chrome, **serious session** |
| **Account / cloud** | May include auth/cloud features per existing web build | **Purchase + license** path; **no dependency** on web session for core workflow |
| **Scope** | **Locked**—no expansion in this PRD | Depth on **persistence, file UX, native affordances** |

**Non-differentiator (intentionally):** Core color science, canvas sampling behavior, and “what the colors mean” should stay **consistent** with web unless desktop adds **organization/persistence** only.

---

## 5. Feature Priorities

### V1 — Must ship to feel like a real Mac app

- **License gate** for Pro: purchase validates; **clear offline behavior** after activation (what works without network).
- **Project lifecycle**: create, list, open, delete (with confirm); **last-opened project** optional but high leverage.
- **Persistence**: project contents saved to **user-meaningful storage** (folder or package—see §7); survives quit/relaunch.
- **Native file/menu basics**: **File** menu (New/Open/Save/Save As… as applicable), **Quit**, window close behavior documented.
- **Keyboard shortcuts** for save/open/quit and core actions where macOS users expect them.
- **Desktop shell**: dedicated chrome (e.g. `TauriAppShell` / gallery path)—no pretending to be the marketing site.
- **Import paths**: picking files via **system file picker** (not only drag-drop if that’s fragile on Mac).
- **Error surfaces**: disk full, permission denied, corrupt project—**human-readable**, no raw stack traces as UX.

### V2 — Important, not required for first paid release

- **Export** polish: consistent naming, default export location, optional “Export…” in File menu.
- **Recent files** list (OS-level or in-app) synced with reality of where projects live.
- **Autosave** with clear status (“Saved” / “Saving…” / conflict handling).
- **Deep link** from Finder (double-click project file) if the on-disk format supports it.
- **Settings** window for desktop-only prefs (directories, default export format, etc.).
- **Spotlight-quality** onboarding: minimal, skippable—**not** a tutorial product.

### Nice-to-have

- **iCloud / backup** guidance (user docs only; not building sync).
- **Touch Bar / Stage Manager** niceties if cost is low.
- **Apple Shortcuts** or quick actions.
- **Windows** port (only if explicitly prioritized; **out of scope** for this PRD’s “Pro” definition).

---

## 6. Native Mac Expectations

**Menu bar**

- App menu: **About**, **Settings…** (if present), **Hide**, **Quit ColorWizard**.
- **File**: New Project, Open…, Close Window, Save, Save As…, Import… (if separate), Export… (V2 ok).
- **Edit**: Undo/Redo **if the app actually supports them** in desktop contexts; otherwise don’t fake it.
- **Window**: Minimize, Zoom, **bring all to front** (standard patterns).
- **Help**: link to support/docs page is fine; no requirement for in-app webapp redesign.

**File handling**

- Projects are **first-class**: user can **choose location** for new projects if the format is a package/folder (recommended for trust).
- **Duplicate**, **Rename** via Finder should not break projects (within reason—document constraints if any).

**Window behavior**

- Single main window **V1 acceptable**; if multiple windows exist later, define which owns which project.
- **Native traffic lights**; restorable size/position where Tauri/AppKit allows.

**Shortcuts (baseline)**

- **Cmd+Q**, **Cmd+W** (close window), **Cmd+O**, **Cmd+S**, **Cmd+N** mapped to **real actions** or intentionally disabled with no misleading binding.
- **Cmd+,** for Settings when V2+ settings exist.

**Platform polish**

- **Retina**: canvas and UI sharp; respect **devicePixelRatio** (existing codebase priority).
- **Sandbox / permissions**: if Mac sandbox applies, document which folders users must grant.

---

## 7. Data & Persistence Model

**User mental model**  
“A **project** is my workspace: it remembers my images and the color work I did.”

**Implementation alignment (non-prescriptive but binding)**  
- Persist via **existing desktop stack** (e.g. SQLite + files under a project root, or equivalent already in use with `initDatabase` / project APIs in `lib/desktop/tauriClient.ts`)—**do not** introduce a second persistence system without explicit approval.
- **On disk**: user should be able to **name**, **find**, and **back up** projects (folder in Documents, or `.colorwizard`-style package—**pick one** and document it in app copy).

**Rules**

- **Reference images**: stored **by copy** into project storage or referenced by path—**decide explicitly** and state in UI (“Copy into project” vs “Link to file”) to avoid broken projects when users move files.
- **Autosave vs manual**: if both, **one source of truth** in UI (e.g. auto + Cmd+S = flush).
- **Migration**: version field in project DB/file; **forward-only** migrations with clear “project was upgraded” if needed.

**Out of scope here:** Server-side project storage, multi-device sync, collaboration.

---

## 8. UX Principles

**Feel**

- **Calm and dense**: information-rich like a pro tool, not a landing page.
- **Immediate**: after license, **straight to gallery or last project**—minimal gates.
- **Trustworthy**: saving works; destructive actions **confirm**; no silent data loss.

**Avoid**

- **Web patterns** that break Mac illusions: full-page “install Chrome” vibes, browser-only share sheets as primary flow, infinite scroll for **project management**.
- **Scope drift**: new “modes” (AI repaint, social feeds, cloud drives) that don’t serve **offline project color work**.
- **Changing web** ColorWizard.App to match Pro, or **duplicating** web-only growth experiments inside Pro’s locked surface.

---

## 9. Out of Scope

- **Any redesign, new features, or structural changes to ColorWizard.App (web)** beyond what’s required to **not break** shared code paths (e.g. `OPEN_SOURCE_MODE` / conditional imports).
- **Multi-repo or monorepo split** “for clarity.”
- **Large architectural rewrites** of canvas, spectral engine, or state stores **unless** required for **correct persistence or native file UX**.
- **Subscription billing**, team seats, or usage metering (unless product direction changes explicitly).
- **Built-in cloud sync**, accounts-for-sync, or real-time collaboration.
- **Mobile** (iOS) Pro in this PRD.
- **Marketing site**, SEO, or blog as part of “Pro v1.”
- **Automatic image enhancement** of the reference (filters, auto white balance, etc.)—conflicts with existing product rules.

---

## Implementation guardrails

- **Before adding a feature**, ask: *Does this require network? Does it belong in a **project**? Would a Mac user expect it in **File** or **Edit**?* If it’s “nice for the website,” **defer or reject**.
- **Shared UI** is OK; **shared behavior** for core color tools is OK; **Pro-only** should mean **shell, persistence, licensing, file/project workflow**, not a forked color pipeline.

---

**Summary:** ColorWizard Pro is a **licensed, offline-first, project-based macOS app** in the **existing Tauri + exported Next.js** codebase, with **native file and window behavior** as the main justification for **$10**—while **ColorWizard.App stays locked** as the free web companion.

Related: [`desktop-architecture.md`](./desktop-architecture.md), [`macos-release.md`](./macos-release.md).
