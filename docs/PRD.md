# Lampstand — PRD & Build Roadmap

> **Amended 2026-10-17:** see [PRD-ADDENDUM-GROW.md](PRD-ADDENDUM-GROW.md) — Grow (daily reading) becomes the main feature, a new navigation (Today · Bible · Plans · Journal · Screen + Me), and milestones 11–16. Where they differ, the addendum wins.

2026-10-16 · Jonathan Liwanag

## 1. Overview

Lampstand is an offline, web-based church presentation app: AI-prepared sermon slides on a projector, with instant Bible verse lookup that never interrupts the slides.

**Problem.** During sermons, the operator leaves the slides to search a Bible app, shows the verse, then navigates back. The congregation watches every step, and verses arrive late.

**Solution.** The operator works on a private control screen. Slides play on the TV. Verses are found with a keyboard command bar and appear as overlays on top of the current slide, then clear with one key.

**Name meaning.** "Thy word is a lamp unto my feet" (Psalm 119:105). The brand is independent of any one church.

### Goals for V1

1. The operator can show any verse within 3 seconds of hearing the reference.
2. The audience never sees searching, menus, or the operator's desktop.
3. A 20–25 minute sermon presentation can be created in Claude and imported in under 2 minutes.
4. The app runs a full service offline on an 8 GB Windows laptop with no crashes or stutter.
5. It looks and feels like professionally built software: modern, calm, polished.

### Success test

Three consecutive Sunday services run with Lampstand alongside the old setup as backup, with the backup never needed.

## 2. Users and environment

The primary user is a volunteer operator under live pressure; every design decision favors speed and clarity for them.

| User              | Role                                  | Needs                                                              |
| ----------------- | ------------------------------------- | ------------------------------------------------------------------ |
| Operator          | Runs slides and verses during service | Fast verse lookup, unmistakable live state, keyboard-first control |
| Pastor / preparer | Prepares sermon slides in Claude      | Simple workflow from notes to slides, consistent look              |
| Congregation      | Watches the TV                        | Readable, calm, uninterrupted visuals                              |

### Hardware and setup

- **Laptop:** Windows, 8 GB RAM, fairly new but modest CPU and GPU.
- **Browser:** Google Chrome (latest stable).
- **Display:** TVs connected as an extended display, 16:9, assume 1920×1080.
- **TV overscan:** TVs may crop edges. Templates keep all text inside a 5% safe area. Setup docs tell users to set the TV picture size to "Just Scan" or "Screen Fit".
- **Network:** none required during service.
- **Accounts:** none in V1. Anyone using the laptop can import and present.
- **Language:** English UI and content.

## 3. Scope

V1 is a local, offline presenter with verse tools and five free translations; sharing, export and hosting of sermons wait for V2.

### V1 features

**Presentations**

1. Import a slide file (`.lampstand.json`) made with the Claude skill
2. Paste JSON as an alternative to uploading
3. Validation with plain-language error messages
4. Preview before saving
5. Simple editor: fix text, reorder, duplicate, delete slides
6. Three templates: Classic, Modern, Warm
7. Local presentation library

**Live presenting**

8. Control screen on the laptop
9. Output window on the TV
10. Preview before going live
11. Verse command bar (`jn 3 16`, Enter to show, Esc to clear)
12. Verse overlays: lower third, side panel, full screen
13. Next/previous verse
14. Verse history
15. Sermon verse queue
16. Blank screen and logo screen
17. Countdown slide before service

**Bible**

18. Built-in translations: KJV (default), WEB, ASV, YLT, Darby
19. Default translation in settings
20. Per-presentation translation
21. Per-verse translation in the command bar (`jn 3 16 web`)
22. Quick-switch translation on a live verse
23. Import a translation file
24. Fully offline

**App**

25. Light and dark mode for the app interface
26. Installable as an offline Chrome app (PWA) with a desktop icon

**Outside the app**

27. Claude skill: sermon notes to slide JSON

### V2 (not built now)

- Sermon sharing pages and public links
- PDF export
- Video export (timeline plus audio)
- Sermon archive and search by verse, speaker, series
- Sign-in and accounts
- Cloud hosting and sync
- Tagalog translations
- Song lyrics
- Phone remote control

## 4. Tech stack and architecture

Lampstand is a client-only React PWA running in Chrome: one control window and one output window, synced in the browser, with all data in IndexedDB.

### Stack

| Area              | Choice                                                    | Notes                                                |
| ----------------- | --------------------------------------------------------- | ---------------------------------------------------- |
| Language          | TypeScript (strict)                                       | No `any` in app code                                 |
| Framework         | React 18+ with Vite                                       | Function components and hooks                        |
| Routing           | React Router                                              | Library, Editor, Present, Output, Settings           |
| State             | Zustand                                                   | Single live-state store owned by the control window  |
| Styling           | CSS Modules or Tailwind with CSS variables for tokens     | Tokens are the single source of truth                |
| UI primitives     | Radix UI                                                  | Accessible dialogs, menus, tooltips, toggles         |
| Animation         | Motion (motion.dev) for UI; GSAP for slide text timelines | Animate only `transform` and `opacity`               |
| Icons             | Lucide                                                    | One icon set everywhere                              |
| Fonts             | Self-hosted Google Fonts (OFL), bundled for offline       | No runtime font fetching                             |
| Storage           | IndexedDB via Dexie                                       | Presentations, images, translations, settings        |
| Validation        | Zod                                                       | Slide schema and translation schema                  |
| Reference parsing | `bible-passage-reference-parser` (OpenBible.info)         | English                                              |
| Text search       | MiniSearch                                                | Verse word search, built from the active translation |
| Command palette   | `cmdk`                                                    | Verse command bar and app commands                   |
| PWA / offline     | `vite-plugin-pwa` (Workbox)                               | Precache app shell, fonts, Bible data                |
| Testing           | Vitest, React Testing Library, Playwright                 | Unit, component, end-to-end                          |
| Lint / format     | ESLint, Prettier                                          |                                                      |

No backend, no accounts, no network calls at runtime in V1.

### Windows

- **Control window** (`/present/:id`): the operator's screen. Owns all live state.
- **Output window** (`/output`): opened by the control window with `window.open`. Render-only; it never changes state.
- **Placement:** use the Window Management API (`window.getScreenDetails()`) to list screens and place the output on the non-primary display, then `requestFullscreen()` on it. Fall back to instructions ("drag this window to the TV and press F") if permission is denied.
- **Sync:** `BroadcastChannel('lampstand-live')`. The control window sends the full live-state snapshot on every change; the output renders it.
- **Recovery:** on load, the output sends `hello`; the control window replies with the current snapshot. If the output closes, the control window shows a clear "Output disconnected — Reopen" banner.

### Live state (shape)

```ts
type LiveState = {
  presentationId: string | null;
  slideIndex: number;
  buildStep: number; // revealed bullet count on build slides
  overlay: null | {
    ref: string; // e.g. "JHN.3.16-JHN.3.18"
    translation: string; // e.g. "KJV"
    mode: 'lowerThird' | 'sidePanel' | 'fullScreen';
    page: number; // for long passages split across pages
  };
  screen: 'content' | 'blank' | 'logo';
  theme: 'classic' | 'modern' | 'warm';
};
```

### Project structure

```
src/
  app/            routes, layout, providers
  features/
    library/      presentation list, import
    editor/       slide editing
    present/      control screen, command bar, queue, history
    output/       audience renderer
    bible/        data loading, parser, lookup, search
    settings/
  slides/         slide-type renderers shared by editor, preview, output
  templates/      classic, modern, warm token sets
  design-system/  tokens, primitives, motion presets
  schema/         Zod schemas (slides, translations)
  db/             Dexie database and migrations
public/bibles/    bundled translation files
skill/            the Claude skill (SKILL.md, schema, example)
```

The same slide renderers draw every slide in the editor, preview, thumbnails and output, so what the operator previews is exactly what the audience sees.

## 5. Data model and slide schema (v1)

A presentation is one versioned JSON file of typed slides; it stores verse references, never verse text, and the app renders the look from the chosen template.

### File

- Extension: `.lampstand.json`
- Encoding: UTF-8
- Validated with Zod on import. The same schema is exported as JSON Schema into `skill/schema.json` so the skill and the app never drift.
- `schemaVersion` is required. The app keeps migration functions for every older version.

### Presentation

```ts
type Presentation = {
  schemaVersion: 1;
  title: string; // ≤ 80 chars
  speaker?: string;
  date?: string; // ISO date, e.g. "2026-10-18"
  series?: string;
  theme?: 'classic' | 'modern' | 'warm'; // default from settings
  translation?: string; // e.g. "KJV"; default from settings
  extraRefs?: string[]; // verses likely mentioned but not on a slide → preload into the verse queue
  slides: Slide[]; // 1–80 slides
};
```

### Common slide fields

```ts
type SlideBase = {
  id?: string; // generated on import if missing
  notes?: string; // operator/pastor notes, never shown on the TV
  transition?: 'fade' | 'rise' | 'push' | 'none'; // default 'fade'
  background?: Background; // default from template
};

type Background =
  | { type: 'template' }
  | { type: 'color'; tone: 'base' | 'accent' | 'deep' } // template tones, not hex
  | { type: 'gradient'; tone: 'calm' | 'warm' | 'dawn' }
  | { type: 'image'; description: string; assetId?: string; motion?: 'still' | 'drift' }
  | { type: 'video'; description: string; assetId?: string };
```

The skill writes `description` only. On import, slides needing an image or video show a placeholder; the operator picks a file from the laptop or from the bundled background library. `assetId` points to the stored file in IndexedDB.

### Slide types

| Type        | Fields                               | Limits                       | Use                                            |
| ----------- | ------------------------------------ | ---------------------------- | ---------------------------------------------- |
| `title`     | `heading`, `subtitle?`, `speaker?`   | heading ≤ 60, subtitle ≤ 90  | Opening slide                                  |
| `section`   | `label?`, `heading`                  | label ≤ 20, heading ≤ 50     | Divider, e.g. "Point 1"                        |
| `point`     | `heading`, `body?`                   | heading ≤ 60, body ≤ 160     | One main idea                                  |
| `list`      | `heading`, `items[]`, `build?`       | 2–5 items, each ≤ 70         | Bullets; `build: true` reveals one per click   |
| `verse`     | `ref`, `translation?`, `emphasis?[]` | passage ≤ 6 verses per slide | Scripture; text pulled from the Bible database |
| `quote`     | `text`, `author?`                    | text ≤ 220                   | Quotes, illustrations                          |
| `statement` | `text`                               | ≤ 90                         | One bold line for emphasis                     |
| `image`     | `background` (image), `caption?`     | caption ≤ 90                 | Full-bleed visual                              |
| `countdown` | `minutes`, `label?`                  | 1–30 min                     | Before service                                 |
| `closing`   | `heading`, `body?`                   | heading ≤ 60, body ≤ 160     | Prayer, response, benediction                  |

- `ref` is human-readable ("John 3:16-18", "Ps 23") and parsed on import into a canonical range (`JHN.3.16-JHN.3.18`). Unparseable references fail validation with the slide number.
- `emphasis` lists words or short phrases inside the verse to highlight, e.g. `["so loved"]`.
- Passages longer than the per-slide limit are split into pages automatically by the renderer, never truncated.
- Unknown fields are rejected so typos surface early.

### Stored records (Dexie)

| Table           | Key           | Contents                                                                             |
| --------------- | ------------- | ------------------------------------------------------------------------------------ |
| `presentations` | `id`          | Parsed presentation, `createdAt`, `updatedAt`, `lastPresentedAt`                     |
| `assets`        | `id`          | Image or video blob, MIME type, dimensions, compressed size                          |
| `translations`  | `code`        | Metadata (name, license, source)                                                     |
| `verses`        | `[code+osis]` | Verse text per translation, keyed `KJV + JHN.3.16`                                   |
| `settings`      | `key`         | Default translation, theme, overlay mode, UI mode (light/dark/system), reduce motion |
| `history`       | auto          | Verses shown, with time and translation (last 200)                                   |

### Translation file format

Used for bundled translations and for "Import translation".

```json
{
  "format": "lampstand-bible",
  "version": 1,
  "code": "KJV",
  "name": "King James Version",
  "language": "en",
  "license": "Public domain",
  "books": [
    {
      "osis": "GEN",
      "name": "Genesis",
      "chapters": [["In the beginning God created the heaven and the earth.", "..."]]
    }
  ]
}
```

`chapters` is an array of chapters, each an array of verse strings in order (verse 1 at index 0).

## 6. Bible data

Five public domain English translations ship with the app, converted at build time into the Lampstand translation format and loaded into IndexedDB on first run.

### Bundled translations

| Code | Name                             | Status  |
| ---- | -------------------------------- | ------- |
| KJV  | King James Version               | Default |
| WEB  | World English Bible              | Bundled |
| ASV  | American Standard Version (1901) | Bundled |
| YLT  | Young's Literal Translation      | Bundled |
| DBY  | Darby Translation                | Bundled |

- **Source:** `scrollmapper/bible_databases` on GitHub; eBible.org for anything missing. Confirm each translation's public domain status before bundling and record it in the file's `license` field.
- **Conversion:** a script in `scripts/build-bibles.ts` converts source files to `public/bibles/<code>.json`. Include the 66-book Protestant canon only.
- **First run:** a progress screen loads translations into IndexedDB, then never again. Show "Preparing Bibles… 3 of 5".
- **Licensed translations** (NIV, NKJV, ESV, NLT, NASB) are not bundled. Users with permission can add them through Import translation.

### References

- Canonical IDs use OSIS-style book codes: `JHN.3.16`, ranges `JHN.3.16-JHN.3.18`.
- Parsing uses `bible-passage-reference-parser` (English). Wrap it in `parseRef(input): RefRange | null`.
- Accepted inputs include: `jn 3 16`, `john 3:16`, `Jn3:16-18`, `1 cor 13 4-7`, `1co13:4`, `ps 23`, `rom 8:28, 31`.
- A whole chapter (`ps 23`) is allowed and paginated.
- Unknown verse numbers (e.g. `jn 3 99`) return a clear "John 3 has 36 verses" hint.

### Command bar input grammar

```
<reference> [translation code]

jn 3 16          → John 3:16, default translation
jn 3 16 web      → John 3:16, WEB
ps 23 1-3 asv    → Psalm 23:1-3, ASV
"so loved"       → word search (quoted, or no reference match)
```

### Word search

- MiniSearch index over the active translation, built lazily on first search and cached.
- Results show reference plus a highlighted snippet; Enter previews the verse.
- Target: results in under 150 ms on the church laptop.

### Pagination of long passages

- A page holds at most the number of words that fits the current overlay mode at minimum type size (calculate from layout, not a fixed verse count).
- Never split a verse mid-sentence when avoidable; split at verse boundaries first.
- Show page position on the output subtly ("2 / 3") and in the control screen.

## 7. Functional requirements

Each area lists what it must do and how we know it is done.

### 7.1 Library

- Grid of presentations with thumbnail (first slide), title, speaker, date, last presented.
- Sort by date or last presented; search by title or speaker.
- Actions: Present, Edit, Duplicate, Delete (with undo toast), Export JSON (download the file back).
- Empty state explains the Claude skill and offers Import.

**Done when:** 50 presentations load and scroll smoothly; delete can be undone for 8 seconds.

### 7.2 Import

- Drop a file, choose a file, or paste JSON.
- Validate with Zod and the reference parser. Errors are listed by slide: _"Slide 7 (verse): 'Jhn 3:16' isn't a recognized reference."_ Clicking an error jumps to that slide in the preview.
- Valid file → preview all slides in the selected template, with a template switcher.
- Slides with image or video placeholders are flagged; operator picks a file or a bundled background, or keeps the template background.
- Images are resized to max 1920 px wide and compressed to WebP on import.
- Save adds the presentation to the library.

**Done when:** the sample sermon imports with zero errors; a file with 3 deliberate errors shows all 3 with slide numbers; malformed JSON shows one friendly message, not a stack trace.

### 7.3 Editor

- Slide strip on the left, large slide canvas, fields panel on the right for the selected slide's fields.
- Edit text fields inline with character limits shown as you near them.
- Reorder by drag, duplicate, delete, add slide of any type.
- Change slide type where fields are compatible.
- Presentation settings: title, speaker, date, theme, translation.
- Autosave with a quiet "Saved" indicator; undo/redo (Ctrl+Z / Ctrl+Shift+Z).

**Done when:** every edit persists after a reload; undo restores the previous state for 50 steps.

### 7.4 Present — control screen

Layout (1366×768 minimum):

- **Top:** verse command bar (always available with `/`), translation chip, output status.
- **Center:** Preview pane (left) and Live pane (right). The Live pane has a red border and a "LIVE" label.
- **Right rail:** tabs for Verse queue, History, Notes.
- **Bottom:** slide strip with the current slide highlighted and auto-scrolled into view.

Behavior:

- "Open output" places the output on the TV (see section 4).
- Next/previous slide goes live immediately. Clicking a thumbnail selects it into Preview; Enter or "Go live" sends it.
- Build slides reveal one item per Next press before advancing.
- Blank (B) and Logo (L) toggle over anything; pressing again returns.
- Slide notes for the current slide show in the Notes tab.

**Done when:** the output never shows anything the operator did not send; closing and reopening the output restores exactly the live state.

### 7.5 Verse tools

- Command bar parses as you type and shows the formatted reference and the first line of text.
- Enter shows the verse live as an overlay in the default overlay mode; Shift+Enter loads it into Preview only.
- Overlay modes: lower third, side panel, full screen. Switch live with 1 / 2 / 3.
- Esc clears the overlay; the slide underneath is unchanged.
- Alt+→ / Alt+← moves to next/previous verse (or next page of a long passage).
- T cycles translation on the live verse.
- Verse queue: verse slides and `extraRefs` of the current presentation, in order, plus verses added manually. Click to show; shown items are checked.
- History: every verse shown this session, newest first; click to reshow.

**Done when:** from the moment the operator presses `/`, typing `jn 3 16` and Enter puts John 3:16 on the TV in under 3 seconds total, with the slide still visible in lower-third and side-panel modes.

### 7.6 Output window

- Fullscreen, cursor hidden, no UI chrome.
- Renders: current slide, overlay, blank or logo screen, countdown.
- Preloads the next slide and its images.
- Keeps the 5% safe area for all text.

### 7.7 Settings

- Default translation, default theme, default overlay mode.
- App appearance: Light, Dark, System.
- Reduce motion (on/off; also respects the OS setting).
- Logo screen image (upload).
- Manage translations: list, import, remove imported ones.
- Data: export all presentations as a backup file; import a backup.

### 7.8 Keyboard shortcuts

| Key                  | Action                                 |
| -------------------- | -------------------------------------- |
| → / Space / PageDown | Next slide or build step               |
| ← / PageUp           | Previous slide                         |
| `/`                  | Focus verse command bar                |
| Enter (in bar)       | Show verse live                        |
| Shift+Enter (in bar) | Preview verse only                     |
| Esc                  | Clear overlay (or close bar)           |
| 1 / 2 / 3            | Lower third / side panel / full screen |
| Alt+→ / Alt+←        | Next / previous verse or page          |
| T                    | Cycle translation on live verse        |
| B                    | Blank screen toggle                    |
| L                    | Logo screen toggle                     |
| Ctrl+K               | App command palette                    |
| ?                    | Show shortcut sheet                    |

Presentation clickers send PageDown/PageUp or arrow keys and must work with no setup.

## 8. Design system and brand

The brand direction is **Calm Light**: deep navy and near-black with a warm gold accent, an elegant serif with a clean sans, reverent but modern. All values live in tokens; components never hard-code colors, sizes or durations.

### Brand

- **Name:** Lampstand
- **Mark:** a simple lamp flame inside a soft rounded shape, single color, works at 16 px (favicon) and on the logo screen.
- **Voice:** calm, clear, helpful. "Verse not found — John 3 has 36 verses" rather than "Error 404".
- **Fonts (self-hosted, OFL):** Fraunces (display serif), Inter (UI and body sans).

### App UI tokens (light and dark)

The app follows Light, Dark or System. The control screen defaults to Dark because booths are dim.

| Token            | Dark           | Light          |
| ---------------- | -------------- | -------------- |
| `bg`             | #0E1116        | #F7F6F3        |
| `surface`        | #161B22        | #FFFFFF        |
| `surface-raised` | #1E2530        | #EFEDE8        |
| `border`         | #2A3240        | #DCD8CF        |
| `text`           | #E8EAED        | #1A1D23        |
| `text-muted`     | #9AA3AF        | #5C6370        |
| `accent` (gold)  | #D9A441        | #A9741F        |
| `live` (red)     | #E5484D        | #D93036        |
| `success`        | #3DD68C        | #1F9D5A        |
| `warning`        | #F5B74F        | #B26B00        |
| `focus-ring`     | #D9A441 at 60% | #A9741F at 60% |

All text and UI color pairs meet WCAG AA (4.5:1 for text, 3:1 for UI). Verify with a contrast check in tests.

- **Type scale (UI):** 12, 13, 14, 16, 20, 24, 32 px; Inter 400/500/600.
- **Spacing:** 4 px base: 4, 8, 12, 16, 24, 32, 48, 64.
- **Radius:** 6 (inputs, chips), 10 (cards, panes), 16 (dialogs).
- **Elevation:** two subtle shadow levels; in dark mode, elevation is shown by lighter surfaces instead of shadows.
- **Icons:** Lucide, 16 and 20 px, 1.5 stroke.

### Slide templates

Templates are token sets applied to the same slide renderers. Sizes are for a 1920×1080 canvas; the canvas scales to any 16:9 output.

| Token        | Classic                                  | Modern                                                | Warm                                                         |
| ------------ | ---------------------------------------- | ----------------------------------------------------- | ------------------------------------------------------------ |
| Mood         | Reverent, timeless                       | Bold, clean, current                                  | Soft, human, photographic                                    |
| Background   | Deep navy #0B1324 with faint radial glow | Near-black #0A0A0B with a slow-moving gradient accent | Photo with a 55% dark warm overlay, or warm charcoal #1C1714 |
| Text         | Ivory #F3EEE3                            | White #FFFFFF                                         | Cream #F6EFE4                                                |
| Accent       | Gold #D9A441                             | Electric blue #5B8CFF                                 | Terracotta #D9774B                                           |
| Heading font | Fraunces 600                             | Inter 700, tight tracking                             | Fraunces 500 italic for accents, Inter for body              |
| Body font    | Inter 400                                | Inter 500                                             | Inter 400                                                    |
| Texture      | Subtle grain                             | None                                                  | Grain and light leak                                         |

**Slide type sizes (all templates):** display 112, heading 88, subheading 64, body 48, verse text 52, caption 32. Nothing on the TV smaller than 32; body text never below 40.

**Layout rules:**

- 5% safe area on every edge (96 px left/right, 54 px top/bottom).
- Max line length about 34 words for verse text; about 12 words for headings.
- Verse slides: reference in accent color above the text; text in the body font with generous line height (1.35).
- One focal point per slide.

### Verse overlays

| Mode        | Layout                                                                 | Slide underneath       |
| ----------- | ---------------------------------------------------------------------- | ---------------------- |
| Lower third | Bottom band, 34% of the height, translucent dark panel with 24 px blur | Visible above the band |
| Side panel  | Right 42% of the width; slide scales to the left 58%                   | Visible, scaled        |
| Full screen | Verse slide layout replaces the slide                                  | Hidden until cleared   |

Overlays always use the active template's fonts and accent.

### Operator screen principles

- Dark by default, calm, low glare.
- The Live pane is the only element that uses the `live` red.
- Large click targets: 40 px minimum height for buttons in the control screen.
- Everything reachable by keyboard; visible focus rings.
- Status always visible: output connected or disconnected, current translation, overlay mode.

## 9. Motion and micro-interactions

Motion is a system of a few tokens used everywhere: it confirms actions, explains changes, and never slows the operator down.

### Principles

1. Every action responds within 100 ms.
2. Motion shows where things came from and where they went.
3. Calm: ease-out curves, no bounce, no wobble, no spins.
4. Speed beats polish: rapid key presses skip to the final state instead of queuing animations.
5. One motion idea per slide.
6. Animate only `transform` and `opacity`.
7. Reduce motion replaces movement with short crossfades (120 ms) everywhere.

### Motion tokens

| Token      | Duration              | Easing                         | Use                                 |
| ---------- | --------------------- | ------------------------------ | ----------------------------------- |
| `instant`  | 80 ms                 | ease-out                       | Press states, toggles               |
| `quick`    | 140 ms                | cubic-bezier(0.2, 0, 0, 1)     | Hovers, menus, tooltips, toasts     |
| `standard` | 220 ms                | cubic-bezier(0.2, 0, 0, 1)     | Panels, pane changes, overlay UI    |
| `slide`    | 500 ms                | cubic-bezier(0.22, 1, 0.36, 1) | Slide transitions                   |
| `reveal`   | 700 ms, 60 ms stagger | cubic-bezier(0.22, 1, 0.36, 1) | Text reveals on the TV              |
| `ambient`  | 20–30 s loop          | linear / sine                  | Background drift, gradient movement |

### On the TV

- **Transitions:** `fade` (crossfade), `rise` (incoming slide rises 24 px while fading in), `push` (horizontal 40 px offset with fade), `none`.
- **Text reveal:** headings fade up by line; list builds fade up one item per step.
- **Verse moment:** reference appears first, text eases in 150 ms later; `emphasis` words shift to the accent color 300 ms after the text lands.
- **Overlays:** lower third slides up 32 px with fade; side panel slides in from the right while the slide scales to 58%; full screen crossfades. Clearing reverses the motion.
- **Backgrounds:** `drift` images zoom from 1.00 to 1.06 over 25 s; Modern's gradient shifts slowly; video backgrounds loop muted.
- **Blank / logo:** 400 ms fade to black or to logo.

### In the operator app

**Going live**

- Sending a slide or verse: the Preview thumbnail animates into the Live pane (shared-element style, `standard`), and the LIVE border pulses once.
- Clearing a verse: it fades out of the Live pane at the same moment as on the TV.

**Command bar**

- Opens with a 140 ms scale-and-fade from 98% to 100%.
- Results update on every keystroke; top match highlighted.
- Recognized references reformat in a preview line: `jn 3 16` → **John 3:16 · KJV**.
- Invalid reference: a single 6 px horizontal shake and an inline hint, no dialog.

**Slides and lists**

- Current slide in the strip has a soft accent glow; the strip scrolls smoothly to keep it centered.
- Hovering a thumbnail for 400 ms shows a larger preview.
- Drag to reorder with live reflow of neighbors.
- Queue items check off with a short stroke animation when shown.

**Import and editing**

- Drop zone highlights on drag-over; slides cascade into the preview as they validate.
- Errors link to their slide, which flashes a warning outline.
- Autosave shows a "Saved" check that fades after 1.5 s.

**General states**

- Every button: hover, pressed (scale 0.98), focus ring, disabled, loading.
- Toasts slide in from the bottom right and dismiss after 3 s ("Switched to WEB").
- Keyboard shortcut hints appear briefly beside actions for the first 5 uses, then stop.
- Empty, loading and error states are designed for every screen; skeletons for lists, never spinners on the TV.

## 10. Non-functional requirements

Reliability during a live service outranks every feature; when in doubt, choose the simpler, sturdier option.

### Performance (on the 8 GB Windows laptop)

| Measure                                | Target                                       |
| -------------------------------------- | -------------------------------------------- |
| App cold start to library              | < 2 s                                        |
| Verse lookup (keypress to result)      | < 50 ms                                      |
| Word search results                    | < 150 ms                                     |
| Go live (keypress to TV change starts) | < 100 ms                                     |
| Slide transitions                      | Steady 60 fps                                |
| Memory, control + output windows       | < 600 MB combined during a 90-minute service |
| First-run Bible setup                  | < 30 s for 5 translations                    |

### Offline

- After first install, the app works with the network unplugged: app shell, fonts, icons, Bible data and user assets are all local.
- No runtime requests to external domains. Add a test that fails if any request leaves `localhost` during an end-to-end run.
- Request persistent storage (`navigator.storage.persist()`) so Chrome does not evict data.

### Reliability

- The output window renders from the last snapshot it received; if the control window crashes, the TV keeps the last image, never an error.
- All user data writes are transactional; a crash never corrupts a presentation.
- Error boundaries around every feature; a broken slide renders a neutral fallback slide on the TV, never a blank or broken layout.
- Settings → Data → Backup exports everything to one file.
- Run a 2-hour soak test (auto-advancing slides and verses) with no memory growth beyond 10%.

### Accessibility

- WCAG 2.2 AA for the operator app: contrast, keyboard access, focus visible, labels for screen readers.
- Reduce motion respected from the OS and from Settings.
- TV output contrast at least 7:1 for text on its background (projector and TV wash-out).

### Security and privacy

- Imported JSON is data only; no HTML or scripts from files are ever executed or rendered as HTML.
- Text fields render as plain text (escape everything).
- No analytics, telemetry or tracking in V1. Superseded 2026-10-23 by owner approval: anonymous usage counts, on by default with an off switch (docs/ACCOUNT-SYNC-ROLLOUT.md, Usage insights).

### Quality

- TypeScript strict, ESLint clean, Prettier formatted.
- Unit tests for the schema, reference parser wrapper, pagination, and live-state reducer.
- Playwright tests for: import sample sermon, present with two windows, show/clear verses, switch translations, offline run.

## 11. Claude skill: sermon notes to slides

Slides are generated outside the app by a Claude skill that turns sermon notes into a valid `.lampstand.json` file; the app only imports, validates and presents.

### Location in the repo

```
skill/lampstand-slides/
  SKILL.md          instructions (below)
  schema.json       JSON Schema exported from the Zod schema
  example.lampstand.json   the sample sermon (section 12)
```

A build script regenerates `schema.json` from Zod so it never drifts. Keep `SKILL.md` plain Markdown so the same instructions can be reused in other tools such as Codex.

### SKILL.md must instruct Claude to

1. Ask for or accept the sermon notes, title, speaker, date and preferred template (default Classic).
2. Propose a short outline first (sections and main points) and confirm it before generating, unless the user asks to skip.
3. Generate one presentation using only the slide types and fields in `schema.json`.
4. **Never write scripture text.** Use `verse` slides with `ref` only ("Romans 8:28"). Put other verses the pastor will likely mention in `extraRefs`.
5. Respect every character limit; split long ideas across slides instead of cramming.
6. Aim for 15–25 slides for a 20–25 minute sermon; about one slide per minute plus verse slides.
7. Use motion sparingly: default `fade`; `rise` for section changes; no more than 3 image backgrounds; at most one `build` list per main point.
8. Describe images in `background.description` ("sunrise over hills, soft warm light"); never invent URLs.
9. Put speaking prompts in `notes`, not on the slide.
10. Output only the JSON in one code block, then offer to save it as `<title>.lampstand.json`.
11. Before output, self-check: valid JSON, `schemaVersion: 1`, every `ref` a real reference, every limit respected.

### Typical slide pattern for a sermon

1. `title`
2. `verse` (main text)
3. `point` or `statement` (big idea)
4. For each main point: `section`, then 1–3 of `point` / `list` / `verse` / `quote`
5. `statement` (application)
6. `closing` (response or prayer)

## 12. Sample sermon fixture

A made-up 20–25 minute sermon, "A Lamp in the Dark," with 21 slides; save it as `skill/lampstand-slides/example.lampstand.json` and `tests/fixtures/sample-sermon.lampstand.json`. It exercises every slide type, builds, emphasis, backgrounds and `extraRefs`.

```json
{
  "schemaVersion": 1,
  "title": "A Lamp in the Dark",
  "speaker": "Pastor Daniel Cruz",
  "date": "2026-10-18",
  "series": "The Living Word",
  "theme": "classic",
  "translation": "KJV",
  "extraRefs": ["2 Timothy 3:16", "Hebrews 4:12", "John 8:12", "Matthew 5:14-16"],
  "slides": [
    { "type": "countdown", "minutes": 5, "label": "Service begins soon" },
    {
      "type": "title",
      "heading": "A Lamp in the Dark",
      "subtitle": "The Living Word · Part 1",
      "speaker": "Pastor Daniel Cruz",
      "background": {
        "type": "image",
        "description": "single oil lamp glowing in a dark room, warm light",
        "motion": "drift"
      }
    },
    {
      "type": "verse",
      "ref": "Psalm 119:105",
      "emphasis": ["lamp", "light"],
      "transition": "rise",
      "notes": "Read slowly. Ask: when was the last time you walked in real darkness?"
    },
    {
      "type": "statement",
      "text": "God does not show us the whole road. He gives us enough light for the next step."
    },

    { "type": "section", "label": "Point 1", "heading": "The Word reveals", "transition": "rise" },
    {
      "type": "point",
      "heading": "Light shows what is really there",
      "body": "Scripture uncovers the truth about God, the world, and our own hearts."
    },
    { "type": "verse", "ref": "John 1:5", "emphasis": ["light shineth in darkness"] },
    { "type": "verse", "ref": "Hebrews 4:12" },

    { "type": "section", "label": "Point 2", "heading": "The Word guides", "transition": "rise" },
    { "type": "verse", "ref": "Proverbs 3:5-6", "emphasis": ["direct thy paths"] },
    {
      "type": "list",
      "heading": "How the Word guides us",
      "build": true,
      "items": [
        "It warns us before we fall",
        "It corrects us when we wander",
        "It points us back to Christ"
      ]
    },
    { "type": "verse", "ref": "Isaiah 30:21" },
    {
      "type": "image",
      "caption": "One step at a time",
      "background": {
        "type": "image",
        "description": "narrow mountain path at dusk lit by a lantern",
        "motion": "drift"
      }
    },

    { "type": "section", "label": "Point 3", "heading": "The Word sustains", "transition": "rise" },
    { "type": "verse", "ref": "Matthew 4:4", "emphasis": ["every word"] },
    {
      "type": "quote",
      "text": "Visit many good books, but live in the Bible.",
      "author": "Charles Spurgeon"
    },
    { "type": "verse", "ref": "Isaiah 40:8", "emphasis": ["for ever"] },

    {
      "type": "statement",
      "text": "This week, open the Word before you open your phone.",
      "background": { "type": "gradient", "tone": "dawn" }
    },
    {
      "type": "list",
      "heading": "This week",
      "build": true,
      "items": [
        "Read one chapter each morning",
        "Write down one verse to carry",
        "Share it with one person"
      ]
    },
    { "type": "verse", "ref": "Psalm 119:105" },
    {
      "type": "closing",
      "heading": "Let us pray",
      "body": "Lord, be the light for our next step.",
      "notes": "Invite the worship team up during the prayer."
    }
  ]
}
```

## 13. Build roadmap

Build in 10 milestones, in order; each ends with a working, demoable app and its done criteria met before the next starts.

1. **Foundation**
   - Vite + React + TypeScript strict, ESLint, Prettier, Vitest, Playwright.
   - Folder structure from section 4; Dexie database with empty tables.
   - Design tokens (section 8) as CSS variables; light/dark/system switching.
   - App shell: sidebar navigation (Library, Settings), routes stubbed.
   - _Done when:_ app runs, theme toggle works, tests run in CI script.
2. **Design system primitives**
   - Button, IconButton, Input, Textarea, Select, Toggle, Tabs, Dialog, Menu, Tooltip, Toast, Chip, Card, Skeleton, Empty state.
   - Motion tokens and presets (section 9); reduce-motion support.
   - A `/dev/components` page showing every component and state in light and dark.
   - _Done when:_ every component has hover, pressed, focus, disabled and loading states and passes AA contrast.
3. **Schema and skill**
   - Zod schemas for presentation, slides and translation (section 5); JSON Schema export script.
   - Reference parsing wrapper and validation errors by slide.
   - `skill/lampstand-slides/` with SKILL.md, schema.json and the sample sermon.
   - _Done when:_ sample sermon validates; unit tests cover each slide type and each error case.
4. **Bible data**
   - Conversion script for the five translations; bundled JSON files.
   - First-run loader with progress; lookup by range; word search with MiniSearch.
   - Import translation from file.
   - _Done when:_ every book/chapter/verse resolves in all five; lookup < 50 ms; search < 150 ms.
5. **Slide renderers and templates**
   - Renderers for all 10 slide types on a scalable 1920×1080 canvas.
   - Classic, Modern and Warm templates; backgrounds; safe area; verse pagination.
   - Bundled background image library (about 20 free-license images, compressed).
   - _Done when:_ the sample sermon looks right in all three templates at 1366×768 and 1920×1080.
6. **Library and import**
   - Library grid, search, sort, duplicate, delete with undo, export JSON.
   - Import by drop, file or paste; error list linking to slides; preview with template switcher; asset placeholders and image compression.
   - _Done when:_ section 7.1 and 7.2 criteria pass.
7. **Live presenter**
   - Control screen layout; output window via Window Management API; BroadcastChannel sync and recovery.
   - Preview/Live, slide strip, builds, transitions, blank and logo, countdown, notes tab.
   - _Done when:_ section 7.4 and 7.6 criteria pass with the laptop connected to a TV.
8. **Verse tools**
   - Command bar (`cmdk`), three overlay modes, next/previous verse, translation switching, verse queue, history.
   - All shortcuts in section 7.8, plus the shortcut sheet.
   - _Done when:_ section 7.5 criteria pass, including the 3-second test.
9. **Editor and settings**
   - Editor from section 7.3; Settings from section 7.7; backup export and import.
   - _Done when:_ section 7.3 and 7.7 criteria pass.
10. **Offline, polish and hardening**
    - PWA install with `vite-plugin-pwa`; persistent storage; zero-network test.
    - Micro-interaction pass across every screen (section 9); empty, loading and error states.
    - Performance and 2-hour soak tests (section 10).
    - _Done when:_ all section 10 targets pass on the church laptop.

After milestone 10: a **Sunday trial**, three services running Lampstand with the old setup as backup, then fix what the operator reports.

## 14. Instructions for Claude Code

Work one milestone at a time from section 13, and stop for review at the end of each.

### How to work

1. Read this whole document before writing code. Save it in the repo as `docs/PRD.md`.
2. At the start of each milestone, write a short plan (files to create, decisions) and confirm it before building.
3. Build the milestone, write its tests, and run lint, type check and tests before calling it done.
4. End each milestone with a summary: what was built, how to try it, any deviations from this document and why.
5. Commit per milestone with a clear message.
6. Keep `docs/DECISIONS.md` with a dated line for every choice not covered here.

### Rules

- Follow the stack in section 4; do not add libraries without stating why.
- Never hard-code colors, sizes or durations; use tokens.
- One slide renderer per type, shared by editor, preview, thumbnails and output.
- The output window only renders state; it never changes it.
- Never render imported text as HTML.
- Never ship scripture text that wasn't loaded from a translation file.
- No network requests at runtime.
- Ask before changing the slide schema; any change bumps `schemaVersion` and adds a migration.

### Out of scope for V1

Sharing pages, public links, PDF export, video export, archive search, accounts, cloud sync or hosting of sermons, Tagalog translations, song lyrics, phone remote, PowerPoint import, raw HTML slides, AI calls inside the app.

### Open questions

- Final logo mark design (placeholder flame icon until then).
- Exact free-license source for the bundled background images (Unsplash or Pexels; record each image's license in `public/backgrounds/LICENSES.md`).
