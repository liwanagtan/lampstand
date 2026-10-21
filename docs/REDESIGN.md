# Redesign (October 2026)

The visual redesign of Lampstand: ink, cream and gold; Plus Jakarta Sans with Fraunces for
Scripture; calm motion. This file tracks what is built, what is left, and the parts of the designs
that are **new features** rather than a restyle, so they are decided on deliberately instead of
slipping in with the styling work.

## Active design branch — 21 October 2026

Work continues on `design/responsive-redesign`, starting from checkpoint `dbec524`.
Do not merge this branch into main until the owner explicitly requests it.

The supplied HTML exports cover 24 desktop screens and 23 mobile screens. See
[screen review](design/SCREEN-REVIEW.md) and [inventory](design/screen-inventory.json).
They are design references, including placeholders, not production content or a
complete specification of tablet and keyboard behaviour.

Implementation is complete for the six restyle phases. The completion pass adds:

- Compact tablet navigation and the same chosen Scripture size on every device.
- Nonmodal Bible study notes beside the reader above 1100px; bounded tablet dialogs
  and phone bottom sheets below that width, retaining source text and attribution.
- Complete guided reading sections, accessible plan progress, self-paced continuation,
  and reflection directly from completion.
- A live translation preview and personal greeting in Welcome.
- Screen entry cards, library, import, editor, both consoles, overlay controls, and TV
  waiting screen restyled with ink/cream/gold tokens and responsive layouts.
- Scroll-contained translation tables and keyboard-accessible study panel dismissal.

See [implementation and verification](design/IMPLEMENTATION.md) for layout rules,
screen coverage, and the remaining browser-test limitation. The
[gamification UX brief](GAMIFICATION-UX-BRIEF.md) remains a separate design workstream.
No goals, rewards, streaks, or competitive scoring have been implemented.

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

| Phase                 | Scope                                                                                                                                                                                            | Status                                  |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------- |
| 1 Foundations         | Colours, type, radii, spacing, motion tokens; Button, Card, Chip, Toggle, Tabs, Field, Sheet, Dialog                                                                                             | Done (`83f4ee1`)                        |
| 2 Navigation          | Phone tab bar and desktop top bar; Lottie nav icons (`NavIcon`)                                                                                                                                  | Done (`88e5633`)                        |
| 3 Grow pages          | Today (dawn and evening atmospheres, two columns on laptops), Reflect (dialog on laptops), Plans, category, plan page, plan day (floating Finish bar on phones), day complete (`FlameCompanion`) | Done (`3386756`)                        |
| 4 Bible and Search    | Reader on paper, verse actions (ink bar on laptops, white sheet on phones), the five design highlight colours, ink chapter pill on phones, Go to, study notes; Search and results                | Done (`3ca4ae4`)                        |
| 5 Profile and Welcome | Journey, Profile, Settings (sidebar on desktop); the four Welcome steps (split screen on desktop)                                                                                                | Implemented; browser regression pending |
| 6 Screen              | Library, presenter console, Bible console, editor, import, TV waiting screen (restyle only)                                                                                                      | Implemented; browser regression pending |

**Resuming:** `npm install`, then `npm run dev`. Before running e2e, run `npm run build`: the
Playwright config serves `npm run preview`, which serves `dist/`, so without a build the tests run
against the previous build.

## Behaviour decisions and deferred enhancements

Completed in the final pass: persistent wide-screen study notes, completion reflection,
plan-level progress, Welcome's live translation preview, and greeting by name. Journey
search already existed before this pass. Daily plans remain self-paced: “ready tomorrow”
copy is not adopted. Weekly and monthly lesson availability still follows real schedules.

The following are enhancements rather than required restyling and remain outside this
release: recently-read history, chapter-by-chapter scroll tracking, topical verses on
category pages, additional search-result filters, the Journey calendar, automatic
next-plan recommendations, moving library entry previews, and a newly authored Lottie
companion. Existing CSS companion animations and licensed photo covers are preserved.
The current Today ordering and activity definitions are preserved rather than changed
into an implicit daily gate or a gamification system.

Do not merge the design branch into main without the owner's explicit instruction.
