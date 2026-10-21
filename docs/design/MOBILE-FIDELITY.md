# Mobile implementation against the supplied HTML

21 October 2026. Branch: `design/responsive-redesign`. The supplied mobile HTML is the layout specification. This correction replaces the previous shared-header approach; it does not introduce a new mobile design. Main has not been merged.

## Screen coverage

| Reference       | Implementation                                                                                                                                                                            |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1–4 Welcome     | Page-owned step row, no brand header; centered opening mark and name field; stacked use cards; translation preview and choices; starter-plan choices; bottom actions.                     |
| 5 Today         | Date and greeting, ink verse card without a photo, week, white active-plan card, side-by-side companion/reflection, classic devotional.                                                   |
| 6 Evening       | Completed-reading summary, week and evening devotional after an evening reading. Real availability determines next-reading wording.                                                       |
| 7 Reflect       | Scripture quote, autosaved writing, guided prompts and Done action.                                                                                                                       |
| 8 Bible         | Local chapter heading, BSB and Aa controls, About chip, inline verse numbers, chapter pill, five tabs.                                                                                    |
| 9 Verse actions | Existing selection/highlight/bookmark/note/copy/study controls retained in the mobile selection sheet.                                                                                    |
| 10 Go to        | Books/Bookmarks, recent chapters, testament sections, inline chapter choices. Recent chapters are real local history.                                                                     |
| 11 Reading      | Translation chips and name, side-by-side selection, text-size control, sample and study-notes switch.                                                                                     |
| 12 Study        | This verse/About controls, original note wording and attribution.                                                                                                                         |
| 13 Plans        | Page greeting, dark active-plan hero and progress ring, Discover filters, feeling chips, cover row, growth tiles, group lesson rows.                                                      |
| 14 Category     | Breadcrumb/title/description, full-width plan cards, relevant Scripture cards, related feeling chips.                                                                                     |
| 15 Plan detail  | Full-width 300px cover, contextual back action, rounded paper title panel, tags, white progress card, first four day rows and Show all.                                                   |
| 16 Plan reading | Local back/title/translation row, thin progress, day and passage headings, chapter labels, separate verse paragraphs, fixed Finish control and current chapter label; bottom tabs absent. |
| 17 Completion   | Full-screen ink state, companion, gold plan eyebrow, day-done heading, progress and bottom actions; bottom tabs absent.                                                                   |
| 18–19 Search    | Own title, search field, suggestion rows, privacy copy, result filter chips and live results.                                                                                             |
| 20 Journey      | 64px avatar, segmented navigation, three white stats, real activity calendar, compact plan rows and journal.                                                                              |
| 21 Profile      | Name field, separate use cards and Open Screen inside Teach and present.                                                                                                                  |
| 22 Settings     | Headings outside grouped rows; reading, reminders, appearance, tips, translations/data and About. Translation tables and credits open from detail rows.                                   |
| 23 Screen       | Contextual Profile back link, own heading/guidance, 130px preview, dark entry cards, compact empty-library state.                                                                         |

## Verification and limits

Read all 23 unpacked reference screens. Manually inspected the running mobile app in the in-app browser, including Today, Bible, Reading, Plans, plan detail, plan reading/completion, Search, Journey, Profile, Settings, Screen and Welcome. These checks exposed and corrected layout differences; they are not a claim of pixel-diff verification at every viewport. The original HTML browser preview was unavailable, so reference comparisons used the exported markup and CSS.

Chromium's automated runner fails at launch with macOS Mach-port sandbox permission error 1100. The 360/390/430/640 navigation regression cases therefore have not passed. Full automated browser, software-keyboard, enlarged-text and tablet/desktop regression checks remain unverified in this environment.

Production content and counts come from real data. Prototype placeholder Scripture is not copied into production. Daily plans remain self-paced, so availability copy does not falsely promise a next-day lock. Gamification beyond the supplied activity display remains awaiting its own UI/UX.
