# Lampstand

Offline, web-based church presentation app: AI-prepared sermon slides on a projector, with instant Bible verse lookup that never interrupts the slides.

> "Thy word is a lamp unto my feet" (Psalm 119:105)

- **Control screen** on the laptop, **output** full screen on the TV, synced in the browser.
- **Verse command bar:** press `/`, type `jn 3 16`, press Enter — the verse appears over the current slide; Esc clears it.
- **Five public domain translations** built in (KJV, WEB, ASV, YLT, Darby), with word search.
- **Slides made in Claude** with the skill in `skill/lampstand-slides`, imported as `.lampstand.json`.
- **Fully offline** after the first visit; installable as a Chrome app. No accounts, no network calls at runtime.

Docs: [docs/PRD.md](docs/PRD.md) (spec) · [docs/SETUP.md](docs/SETUP.md) (operator setup) · [docs/DECISIONS.md](docs/DECISIONS.md) (choices made during the build).

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
| `npm run icons`                     | Regenerate the app icons                                                          |

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
