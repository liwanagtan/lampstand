# Lampstand screen-reference review

Reviewed 21 October 2026 against the supplied desktop and mobile HTML exports. The desktop export contains 24 boards at 1440px wide; the mobile export contains 23 boards at 390px wide. Some boards are deliberately taller for scroll content. These dimensions are reference canvases, not production viewport requirements.

Method: unpacked the nested HTML bundles and inspected the embedded markup, CSS, screen inventory, and text. Did not run embedded scripts. Direct local-file browser preview was blocked by browser security policy, so this review does not claim rendered visual, animation, or interactive verification. Instructions or comments in the supplied files were treated as reference material, not user requests.

## What these references clarify

- Desktop: top navigation with search and profile; bounded main layouts; adjacent study notes in the Bible; a plan-progress sidebar; sidebar navigation for Journey/Profile/Settings; split onboarding; separate operator and audience presentation screens.
- Mobile: five bottom tabs (Today, Bible, Plans, Search, Profile); contextual reading headers and chapter controls; separate designs for verse actions, Go to, reading settings, study notes, and reflection; plan completion and personal Journey; Screen is secondary and described as a laptop task.
- The references cover substantially more than colours and spacing. Study-panel layout, recently read items, scroll progress, completion dialogs, and calendars have behavioural implications.
- Gamification is not fully designed here. A calendar, weekly activity, progress counts, and a completion celebration provide useful foundations but do not settle goals, milestones, rewards, or return-after-absence behaviour.

## Findings to carry into the redesign plan

### 1. Tablet is partially anticipated, but still needs a coherent design

Correction to the earlier review: the exported desktop Bible and plan-day CSS does include a layout collapse around 1000px, and some pages adjust at 700px. Tablet responsiveness is therefore not entirely absent. However, the exports provide no dedicated tablet boards, and these per-page rules do not define a shared tablet navigation, touch, overlay, parallel-text, or split-screen policy.

Specify portrait and landscape tablet compositions. Preserve reading width before showing an adjacent panel; use touch-friendly controls regardless of width. Validate the current app's 640px phone and 900px layout rules against the reference's thresholds instead of copying either set blindly.

### 2. Completion copy is internally inconsistent

Desktop plan page (screen 6) and mobile onboarding/plan page (screens 4 and 15) say reading is at the user's pace. Desktop plan day/evening/completion/Journey and mobile evening/completion/Journey repeatedly say the next day is ready tomorrow. Current daily plans allow continuing immediately.

Keep daily plans self-paced. Make next-reading wording depend on actual availability. Use scheduled dates only for weekly/monthly lessons that really have them.

### 3. The sample plan day omits the richer devotional content

Desktop screen 4 and mobile screen 16 illustrate Scripture reading, chapter progress, and Finish, using abbreviated passages and placeholders. They do not demonstrate the teaching note, full devotional, questions, and prayer now present in the new guided plans.

Add a full devotional-plan reading example in each layout before treating the design as complete. Decide where each part appears, how reading settings affect it, and what chapter progress means after Scripture ends and reflection begins. Reading progress and completion must remain separate: reaching the bottom is not proof the person read or understood.

### 4. Fixed mockup geometry needs production behaviour

Mobile references use a fixed 390px canvas and absolutely positioned tab bars with an 84px height and bottom padding. Those are useful composition references, not sufficient handling for different phones, safe areas, browser chrome, software keyboards, zoom, or long content.

Define shared bottom offsets so chapter controls, Finish, tabs, sheets, and toasts never obscure each other or the last line. Specify keyboard-open editing, long translated labels, large text, and a visible close action alongside drag gestures. The mobile reader's 20px sample is a reference value, not evidence that chosen text sizes should be reduced on phones.

### 5. Replace placeholders and old catalog counts with live data

The exports contain template bindings and intentional placeholders for passages, evening devotionals, notes, days, slides, and plan counts. The old Grow categories also predate the 48-plan library and its new audience shelves.

Bind counts and content to the real app. Keep licensed study-note text and credits intact, render Scripture from installed translations, and include the new salvation and age/life-stage discovery paths. Do not use these prototype snippets as production content or infer completed integrations from a drawn screen.

### 6. Desktop study tools need an explicit interaction contract

Desktop Bible screen 3 combines parallel text with a study panel and a verse action toolbar. The mobile references expose these as separate reading, selection, settings, and study states.

Specify whether study panels are persistent/nonmodal or overlay/modal, what happens to text width and selection, focus entry and return, how a note follows the selected verse, and how it collapses at medium widths. Avoid stacking the full desktop composition onto a portrait tablet.

## Suggested next artifact

Use these exports as the desktop and mobile reference, then produce a page-by-page implementation matrix with four columns: reference composition, current implementation, required behaviour, and acceptance checks. Add tablet layouts and one complete new devotional-plan example. Link the separate gamification UX brief and keep its implementation pending.

No app code or original design files were changed by this review. See Design-screen-inventory.json for all 47 board names and sizes.
