# Redesign (October 2026)

The visual redesign of Lampstand: ink, cream and gold; Plus Jakarta Sans with Fraunces for
Scripture; calm motion. This file tracks what is built, what is left, and the parts of the designs
that are **new features** rather than a restyle, so they are decided on deliberately instead of
slipping in with the styling work.

## Sources

- **Design canvas** — "Lampstand Motion" (claude.ai artifact
  `https://claude.ai/artifact/FwnqNTuTND3gxKbukp5h4q`, private to the owner). Pages: _Motion_
  (Lottie concepts), _Mobile screens_ (23), _Desktop screens_ (24).
- **Design system** — "Lampstand" (claude.ai artifact
  `https://claude.ai/artifact/L9ft5BdkZhnHrjDCLgrKwo`, private). Tokens for light and dark, type
  scale, logos, icons, Lottie files and React reference components. The app's values in
  `src/design-system/tokens.ts` come from it.
- **Brand kit** — `brand/` (logos, colours). **Lottie icons** — `npm run lottie-icons`
  (`scripts/build-lottie-icons.ts` → `public/lottie/icons/`, preview in
  `brand/motion/icons-preview.html`).

## Decisions

- Interface type is Plus Jakarta Sans; Fraunces stays for Scripture and passage names.
- Plan covers keep the licensed photos (the designs' illustrated covers were not adopted).
- Nav icons are Lottie, played with lottie-web's light SVG player loaded after first paint; a static
  icon shows until then; reduce motion shows the last frame.
- Delivered phase by phase, one commit per phase, each checked at phone and laptop sizes and with
  the full e2e suite on a fresh build.

## Phases

| Phase                 | Scope                                                                                                                                                                                            | Status             |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------ |
| 1 Foundations         | Colours, type, radii, spacing, motion tokens; Button, Card, Chip, Toggle, Tabs, Field, Sheet, Dialog                                                                                             | Done (`83f4ee1`)   |
| 2 Navigation          | Phone tab bar and desktop top bar; Lottie nav icons (`NavIcon`)                                                                                                                                  | Done (`88e5633`)   |
| 3 Grow pages          | Today (dawn and evening atmospheres, two columns on laptops), Reflect (dialog on laptops), Plans, category, plan page, plan day (floating Finish bar on phones), day complete (`FlameCompanion`) | Done (this commit) |
| 4 Bible and Search    | Reader toolbar, verse actions, Go to, reading settings, study notes as a side panel on desktop; Search and results                                                                               | To do              |
| 5 Profile and Welcome | Journey, Profile, Settings (sidebar on desktop); the four Welcome steps (split screen on desktop)                                                                                                | To do              |
| 6 Screen              | Library, presenter console, Bible console, editor, import, TV waiting screen (restyle only)                                                                                                      | To do              |

**Resuming:** `npm install`, then `npm run dev`. Before running e2e, run `npm run build`: the
Playwright config serves `npm run preview`, which serves `dist/`, so without a build the tests run
against the previous build.

## New features in the designs (not built — decide before adding)

These appear in the canvas but change what the app does, not just how it looks. None of them was
built during the restyle phases.

### Today

- **"You're caught up" card** in the evening: the flame companion resting, with "Rest well.
  Tomorrow's reading will be ready in the morning." (Desktop _Today · evening_.)
- **"Pick up where you left off"** card on desktop: links back to the last chapter read and the
  journal.
- **Evening devotional emphasis**: in the evening the design leads with Spurgeon's evening reading
  instead of the verse of the day.

### Plans

- **Category page extras**: a "Verses for anxiety" section (topical verses under the plans) and an
  "Also for how you feel" row of related feelings. The page today lists only the plans.
- **Plan day progress**: a thin progress bar under the header and "Matthew 1 of 4" in the phone
  Finish bar, showing which chapter of the day's reading you are on.
- **Day complete**: the design's wording "Day 1 done. Day 2 is ready tomorrow." and a summary pill
  ("1 day this week · 1 of 40") with a **Reflect on today** button. The app keeps "Well done!"
  (an e2e test checks it) and its existing actions.
- **"Plans you finish appear here"** placeholder in Journey's plan list.

### Bible

- **Recently read** chips at the top of Go to.
- **Desktop verse toolbar** under the selected verse (highlight colours, Bookmark, Note, Copy,
  Study) instead of the sheet; and a **Study** action that opens notes for that verse.
- **Study notes as a persistent side panel** on desktop, alongside the text.

### Search

- **Result filters**: All · Verses · Plans · Bible · My journal chips above the results.
- **Journal results section** ("Your journal": matches in what you wrote, searched on the device).

### Profile and Journey

- **Reading calendar**: a month grid of days you read, in Journey.
- **"Open Screen"** link inside the _Teach and present_ card in Profile.

### Welcome

- **Live translation preview**: choosing a translation shows Psalm 119:105 in it.
- **Greeting by name** on step 2 ("Nice to meet you, Sam.").

### Screen

- **Moving preview** on the "Show a presentation" card and the library tiles' slide thumbnails.
- **Overlay mode switcher** shown as a segmented control in the Bible console (the modes exist; the
  control's placement is new).

### Motion

- **Flame companion as a real Lottie file** (one file with markers idle, read, celebrate, rest).
  The app currently draws it with CSS (`src/design-system/FlameCompanion.tsx`).
- **Animated atmospheres** (drifting embers, sweeping rays, breathing sun). The app's dawn and
  embers are static shapes; only day complete has rays, and they do not move.
