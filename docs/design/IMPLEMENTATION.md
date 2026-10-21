# Responsive redesign implementation

21 October 2026 · Branch `design/responsive-redesign` · Do not merge into main without
explicit owner instruction. This completes the six visual redesign phases, including
the remaining Screen workspace. It does not claim completion of deferred product
features or gamification.

## Shared layout rules

| Available width / context | Behaviour                                                                                                     |
| ------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Up to 640px               | Phone navigation, contextual header, bottom sheets, single reading surface, reachable chapter/Finish controls |
| 641–1100px                | Compact labelled top navigation, lamp mark, flexible search; dialogs bounded within the viewport              |
| Above 1100px              | Full desktop top navigation; open Bible study notes dock beside the text without blocking the reader          |
| Profile up to 900px       | Horizontal section navigation instead of a left sidebar                                                       |
| Editor up to 900px        | Thumbnail/canvas row followed by full-width editable fields; no three-column squeeze                          |
| Editor 901–1200px         | Compact thumbnail and field columns with a flexible canvas                                                    |
| Consoles up to 1100px     | Flowing operator workspace with wrapping header and controls; page scroll rather than clipping                |
| Consoles up to 700px      | Preview and Live stack; Screen remains primarily a laptop/TV workflow                                         |
| Input capability          | Coarse-pointer search inputs use at least 44px height and 16px type; touch controls do not rely on hover      |

Breakpoints are based on the content that must fit. Internal page layouts can collapse
before the primary navigation changes. A tablet does not automatically receive a phone
layout just because it supports touch.

## Screen coverage

| Reference screens                                                 | Final implementation                                                                                                                                     |
| ----------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Desktop Today and evening; mobile Today, evening and reflection   | Existing morning/evening atmospheres, reading plans, reflection and activity retained                                                                    |
| Desktop/mobile Welcome states                                     | Split desktop / full-width compact flow, personal greeting, live installed-translation preview, pinned compact actions                                   |
| Bible reader, Go to, reading settings, verse actions, study notes | Paper reading surface, consistent chosen text size, existing selection controls; wide nonmodal study panel, medium dialog and phone sheet                |
| Plans, category and plan page                                     | Existing responsive cards/rows, search and filters; real catalog drives new salvation and audience entry points                                          |
| Plan day and completion                                           | Full note/Scripture/devotional/questions/prayer layout, accessible plan completion progress, reflection, Undo and immediate continuation for daily plans |
| Search and results                                                | Existing reference, word, plan and Journey search styling retained; new filters deferred                                                                 |
| Journey, Profile and Settings                                     | Existing sidebar-to-segments layout retained; translation table has a labelled keyboard-scrollable container                                             |
| Screen library                                                    | Paired entry cards, rounded real slide thumbnails, empty state, responsive toolbar and grid                                                              |
| Import                                                            | Bounded drop area, responsive validation and templates, usable file-picker and error controls                                                            |
| Editor                                                            | Styled header/fields/thumbs/canvas with explicit tablet and compact arrangements                                                                         |
| Presenter console and Bible console                               | Updated typography, rounded Preview/Live frames and controls; existing send/freeze/blank/queue semantics retained                                        |
| TV output                                                         | Updated waiting copy composition and return link; live audience slide layout remains unchanged                                                           |

## Interaction and accessibility

Wide study panels are nonmodal: the reader remains available, opening focuses the panel,
Escape closes it from within, a visible close button is available, and closing restores
the initiating focus where the element still exists. Smaller layouts use the existing
Radix dialog/sheet focus handling. Original study-note HTML and credits are retained.

Reading completion is distinct from scroll position. The progress indicator reports
completed readings in the plan, not inferred attention or a faith score. Daily plans
remain self-paced; scheduled lessons show their actual unlock date. Completing a reading
can open a reflection prefilled with that passage and plan title.

The mobile Scripture size is no longer reduced to 90% of the selected value. Guided
notes and other supporting sections retain their existing relative type hierarchy.
Existing reduced-motion handling, safe-area layout, theme tokens and labelled controls
remain in use. New layout changes add no required animations.

## Validation

- 322 unit/component/content tests passed across 46 test files.
- Lint, TypeScript, production build, and diff whitespace checks pass.
- Added component tests for nonmodal study-panel Escape/focus return and compact-dialog
  dismissal, including preservation of source attribution.
- Added `e2e/redesign.spec.ts` with ten viewport widths (360–1440px), guided completion
  and reflection, wide-to-tablet study transitions, and tablet editor fit.
- Manual fresh-production checks: Welcome greeting and BSB/KJV live preview; wide
  study panel with real notes; complete guided reading, Finish, immediate next reading,
  and correctly prefilled reflection; Screen entry cards.
- Isolated live app frames were visually checked at 360, 390, 641 and 820px, alongside
  the 1280px desktop browser. These are real responsive app frames, not scaled images.
- Full Playwright run was attempted after a fresh production build. Chromium was
  blocked before the first test by macOS sandbox Mach-port permissions. The run stopped
  at that environmental failure; 84 remaining cases did not execute. Browser regression
  and a full light/dark, enlarged-text and software-keyboard sweep are therefore pending.
- The production build retains a bundle-size warning. No dependencies were added.

Run `npm run build && npm run e2e` in a normal local terminal to complete the browser
regression gate. Screenshots and a human-readable handoff are also saved in the chat's
outputs folder. This limitation is recorded explicitly instead of calling the e2e suite
passed or marking every reference pixel-verified.

## Deliberately deferred

Gamification needs its own UI/UX design before implementation. Recently read history,
chapter scroll tracking, extra result filters, activity calendar, automatic recommendations,
new moving previews and a Lottie companion asset are feature work outside the completed
restyle. Do not replace real content with prototype placeholders or turn “tomorrow” copy
into an unintended restriction on reading.
