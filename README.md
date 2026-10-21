# Lampstand

A light for your daily reading: a companion for growing in the Word every day, with a focused Bible reader — and, when you teach or lead worship, Scripture and sermon slides on a TV.

> "Thy word is a lamp unto my feet" (Psalm 119:105)

- **Today · Bible · Plans · Journal · Screen**, plus **Me** for your profile and settings. First run asks what brings you to Lampstand and switches on only that; everything else is one tap away in Me.
- **Today:** the verse of the day, today's plan reading, a reflection, and your week.
- **Bible:** a focused reader with search, two translations side by side, and your highlights, bookmarks and notes.
- **Plans:** daily reading plans and weekly Sunday-school lessons, one reading at a time with a Finish button; import more as `.lampstand-plan.json` (skill in `skill/lampstand-plans`).
- **Journal:** reflections, notes, highlights and bookmarks in one searchable timeline.
- **Screen:** present sermon slides or the Bible — control screen on the laptop, **output** full screen on the TV, synced in the browser.
- **Verse command bar:** press `/`, type `jn 3 16`, press Enter — the verse appears over the current slide; Esc clears it.
- **Five public domain translations** built in (KJV, WEB, ASV, YLT, Darby), with word search.
- **Slides made in Claude** with the skill in `skill/lampstand-slides`, imported as `.lampstand.json`.
- **Brand:** the logo kit (mark, lockups, wordmark, app icons, colours and usage rules) lives in `brand/`; see `brand/README.txt`. The app draws the logo from `src/design-system/LampMark.tsx`, and the favicon and PWA icons in `public/` come from `brand/app-icon/`.
- **Installable PWA:** Profile → Settings offers installation when the browser supports an install prompt, with home-screen instructions otherwise. The production app precaches reading content for offline use; personal data stays on the device.

Docs: [docs/PRD.md](docs/PRD.md) (spec) · [docs/PRD-ADDENDUM-GROW.md](docs/PRD-ADDENDUM-GROW.md) (Grow-first redesign) · [docs/SETUP.md](docs/SETUP.md) (operator setup) · [docs/DECISIONS.md](docs/DECISIONS.md) (choices made during the build).

Content: [library coverage and pathways](docs/CONTENT-LIBRARY.md) · [editorial and salvation standards](docs/CONTENT-EDITORIAL.md) · [gamification UX brief](docs/GAMIFICATION-UX-BRIEF.md) (design pending). The library includes 48 plans, with age and life-stage collections under Grow in faith. New content is implemented locally for owner theological review.

## Develop

Requires Node 22+ and Chrome.

```bash
npm install
npm run dev          # http://localhost:5310
```

| Script                              | What it does                                                                      |
| ----------------------------------- | --------------------------------------------------------------------------------- |
| `npm run ci`                        | Lint, type check, unit tests, production build, Playwright end-to-end tests       |
| `npm run build` / `npm run preview` | Production build (with service worker) and a local server on :4173                |
| `npm test`                          | Vitest unit and component tests                                                   |
| `npm run e2e`                       | Playwright tests against the production build                                     |
| `npm run soak`                      | 2-hour soak test (`SOAK_MINUTES=10 npm run soak` for a short run)                 |
| `npm run bibles`                    | Rebuild `public/bibles/*.json` from the sources (downloads into `scripts/.cache`) |
| `npm run backgrounds`               | Rebuild the bundled background library in `public/backgrounds`                    |
| `npm run schema`                    | Regenerate `skill/lampstand-slides/schema.json` from the Zod schema               |

## Install and use offline

Run `npm run build` and `npm run preview`, then open the preview address in a browser. In Profile → Settings, choose **Install Lampstand** when offered. On iPhone or iPad, open the app in Safari and use **Share → Add to Home Screen**. A deployed PWA needs HTTPS; localhost works for local testing. The development server on port 5310 does not register the service worker.

Wait for the Bible preparation step to finish before disconnecting. After that, Today, Plans, the Bible reader and saved data are available offline. Profile → Settings → Data exports a backup for moving to another device; installation does not sync data between devices. Updates are offered with a Restart action and wait until a presentation is finished.

## Project layout

```
src/
  app/            routes, layout, service worker registration
  features/
    library/      presentation list, import, backgrounds
    editor/       slide editing
    present/      control screen, live state, command bar, queue, history
    output/       audience renderer
    bible/        data loading, parser, lookup, search
    settings/
  slides/         slide-type renderers shared by editor, preview, output
  templates/      classic, modern, warm token sets
  design-system/  tokens, primitives, motion presets
  schema/         Zod schemas (slides, translations), validation, migrations
  db/             Dexie database
public/bibles/    bundled translation files
public/backgrounds/  bundled background photos (see LICENSES.md)
skill/            the Claude skill (SKILL.md, schema, example)
```
