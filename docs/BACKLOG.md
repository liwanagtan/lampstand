# What's left to check and refine

As of 23 October 2026, on `design/responsive-redesign` (last commit `3f4dba6`). The full UI/UX review, with screenshots and scores, is the Claude Docs page "Lampstand UI and UX review". Decisions already made are in `docs/DECISIONS.md`.

## 1. Accounts (paused until the app is finished)

Google sign-in is hidden for now (`docs/DECISIONS.md`, 2026-10-23). To turn it back on, add `VITE_ACCOUNTS=on` to `.env.local` (and the hosting environment); the landing, Settings › Account, the save offer, the privacy page's Google section and the account end-to-end tests all come back. Before anyone else uses it:

- [ ] In the **staging** Supabase SQL editor, run in order: `supabase/account-sync.sql`, then `supabase/rls-check.sql` (must end with "All ownership checks passed"), then `supabase/usage-insights.sql`.
- [ ] Add your maintainer email to `usage_admins` so `/insights` opens for you.
- [ ] Add every origin you test on (for example `http://localhost:5311`, staging, production) to Supabase › Authentication › URL Configuration › Redirect URLs.
- [ ] Google Auth is in Testing mode: publish it (and verify with Google if asked) before a public launch.
- [ ] Once on, test: two devices on one account (sync, an offline edit, reconnect); guest to account through "Keep your journey"; deleting an account with and without the device copy.
- [ ] Note: `/insights` needs a signed-in maintainer, so it is unreachable while accounts are off; usage counts are still collected.
- [ ] Optional: enable `pg_cron` so usage totals roll up nightly even when nobody opens `/insights`.
- [ ] None of the SQL has run against a real Postgres yet; `rls-check.sql` is the first real check.

## 2. Real-world test (planned last)

- [ ] A week of daily reading on a phone: plan days, reflections, the Continue bar, resuming mid-chapter.
- [ ] Reminders on a real device (Android installed PWA and iOS), including the evening reminder.
- [ ] Install on Android and iOS; check the installed app signs in with Google and returns correctly.
- [ ] On a phone: the status bar colour (cream app, ink landing and Welcome), the offline notice above the tab bar, and the one-time Add to Home Screen offer on Today after the first plan reading.
- [ ] Teach one class on a TV from a laptop (Screen, Show the Bible, a presentation).
- [ ] The 2-hour soak test on the church laptop (`npm run soak`).

## 3. Design refinements still to do

In rough order of value (from the review's "Still to do").

- [x] Today: labelled Copy on the verse card (done `3f4dba6`). The "Go deeper" card was tried and reverted at the owner's request: Take five minutes and the Classic devotional stay separate, the devotional in its fuller form.
- [x] **Faith Foundations:** now shows for everyone, with a switch in Settings › Reading (2026-10-23). Was: it shows only when the faith journey includes exploring or new to faith. The new Welcome asks one "where to start" question, so fewer people get it; decide whether to show it more widely.
- [x] Day done: two choices and the next reading's title (done `3f4dba6`).
- [x] **Journey for new readers:** (2026-10-23) hide "0 Plans finished" and the month calendar until there is history; lead with the journal and one encouraging line.
- [x] **Settings › Reading:** (2026-10-23) text size still reads "20 px"; use the same growing-letters scale as the Reading sheet.
- [x] **Primary buttons:** gold = next step in the Word, dark = confirm, applied (2026-10-23). Was: decide the rule (proposal: gold means "your next step in the Word", dark means "confirm") and apply it everywhere.
- [x] **Search:** (2026-10-23) one icon per section heading instead of a heart on every result.
- [x] **Welcome:** (2026-10-23) "Exploring who Jesus is" and "Taking my first steps" share the subtitle "Understanding salvation, on Today"; give each its own line.
- [x] **Colour drift:** done with `--palette-*` tokens and a `color-no-hex` rule (2026-10-23). Was: about 122 hard-coded hex colours in CSS; move them to tokens and add a stylelint rule like the type-scale rule.
- [x] **Eyebrows:** (2026-10-23) keep uppercase eyebrows for card labels only; section headings in sentence case.
- [x] **PWA polish:** (2026-10-23; the install offer and status bar still need a check on a real phone) `theme-color` per screen (dark landing and Welcome, cream app); move the "ready to work offline" toast off the top of the screen (it covers headers); offer Add to Home Screen after the first finished reading.
- [x] **Habit:** (2026-10-23) reminder text that names the reading ("Psalm 1 is ready: Rooted like a tree"); a quiet keepsake when a plan is finished.
- [x] **Today on laptop without a plan:** no longer only the verse: Faith Foundations and the Classic devotional now sit in the main column for everyone (2026-10-23). Was: the main column holds only the verse card; consider moving Go deeper up beside it.

## 4. Things to watch

- **Two Escape-related phone tests** (`multi-verse`, `reader-phone`) were flaky under full-suite load until they closed dialogs with the Close button. If they flake again, look at dialog focus timing, not the reader.
- **Read layout verses are `span role="button"`**, not `<button>` (buttons cannot flow as a paragraph). Keyboard users get Enter and Space; check with a screen reader on iOS and Android.
- **Study notes on phones** are reached through the verse's selection bar (Study) and "About {book}"; the margin with its marks stays hidden on phones by design. Confirm readers find them.
- **Type scale ties rounded up** (13 to 14, 15 to 16). If phone text feels large again, revisit specific screens rather than the scale.
- **`npm run lint`** now includes stylelint; there is no CI yet, so it only runs when someone runs it.

## 5. Later (not started)

- STEPBible data (CC BY 4.0) for word studies.
- Imported plans, presentations and assets in account sync (kept on the device for now).
- On-device encryption of journal text (declined for the first release; the privacy page says so).
- A merge to `main` and a production deploy, only with the owner's approval.
