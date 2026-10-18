# Lampstand — Grow-first redesign (PRD addendum)

Oct 17, 2026 · Jonathan Liwanag

> Living version (with the navigation diagram): https://claude.ai/code/artifact/afa243a4-2b73-4236-b51e-b1dafcd337d2

## Summary

Lampstand becomes a companion for daily Bible reading first and a presentation tool second. As the name says, it should work like a lamp stand: it holds up the light so people can read by it.

- **Main feature:** growing daily — the verse of the day, reading plans and a private journal, on top of a focused Bible reader.
- **Still supported:** presenting sermons and Scripture on a TV, moved into its own workspace instead of setting the tone of the app.
- **Who and where:** one person on their own device. No shared church laptop to design around.
- **Data:** everything stays on the device for now. Sign-up, sign-in and per-person profiles that sync come in v2.
- **The bar:** this should read as expert product design, every decision checked against UX laws and principles, not a cookie-cutter app.

This addendum amends the original _Lampstand — PRD & Build Roadmap_ (docs/PRD.md). Where they differ, this document wins; everything not mentioned here stays as the PRD says.

## People and contexts of use

The structure follows the reader's context and mindset, not content types. The same person can be in all three contexts in one week.

| Context               | When and where                                      | Mindset                           | What it needs                                                                                 |
| --------------------- | --------------------------------------------------- | --------------------------------- | --------------------------------------------------------------------------------------------- |
| **Grow daily**        | Morning or evening, on a phone                      | Slow, reflective, private         | Today's verse, a reading for the day, somewhere to reflect, gentle progress                   |
| **Read and study**    | Any time, phone or laptop                           | Focused, uninterrupted            | A reader with nothing in the way, search, two translations side by side, highlights and notes |
| **Teach and present** | A service, a class or a small group, laptop plus TV | Fast and public, so mistakes show | A dense, calm console, big targets, keyboard first                                            |

The current build puts all three behind the Bible tab, which causes three problems:

- **Mode errors:** a Present button sits beside quiet personal reading.
- **Complexity paid by everyone:** the reader carries the presenter's controls (Tesler's law).
- **Three ways to present a verse:** the command bar in a presentation, the TV panel in the Bible tab, and Present on Today. One is enough (Occam's razor).

## Information architecture

> Amended on 2026-10-17 by [Profile, Journey and Search](#profile-journey-and-search-milestones-2021-agreed-2026-10-17): Journal becomes Journey inside Profile, and phones get a Search tab.

The main navigation is flat: **Today · Bible · Plans · Journal · Screen**, plus a **Me** avatar for the profile. The app opens on Today.

- **Phones:** a bottom tab bar, within thumb reach (Fitts's law). Five items is the most a phone tab bar holds comfortably.
- **Laptops:** the same five in the top bar, with Me at the right.
- **No second row of tabs.** Grow's parts are top-level instead of nested under a "Grow" tab. "Grow" becomes the promise in the tagline: _A light for your daily reading._
- **Nav order never changes.** Turning a feature off hides its tab, and the rest keep their places, so spatial memory holds.
- **Places, not actions.** Import leaves the nav and lives inside Screen.

```
Main nav (bottom bar on phones, top bar on laptops)                 Me: profile and settings
├─ Today (home)   verse of the day · today's reading · Reflect panel · This week
├─ Bible          focused reader · search, parallel · marks on the text · Bookmarks menu · Show on screen ─┐
├─ Plans          next reading only · plan reader · Finish button · weekly lessons · import a plan          │
├─ Journal        reflections · notes, highlights · bookmarks · filters, search                             │
└─ Screen         presentations · Show the Bible · library, import (laptop first)  ◄────────────────────────┘
```

Today is home; the only path from personal reading to the TV is the reader's Show on screen action.

| Route                       | Screen                                                                   | Replaces                                    |
| --------------------------- | ------------------------------------------------------------------------ | ------------------------------------------- |
| `/`                         | Today (home)                                                             | Library at `/`, Bible › Today               |
| `/bible`                    | Bible reader                                                             | Bible › Read                                |
| `/plans`, `/plans/:id/:day` | Plans, plan reader                                                       | Bible › Plans                               |
| `/journal`                  | Journal timeline                                                         | Bible › Journal, Bible › Notes & highlights |
| `/screen`                   | Screen home: Show a presentation, Show the Bible, the library and import | Library, Import                             |
| `/screen/:id`               | Presentation console                                                     | `/present/:id`                              |
| `/screen/bible`             | Bible console                                                            | Bible tab TV panel                          |
| `/me`                       | Profile and settings                                                     | Settings                                    |
| `/welcome`                  | First-run onboarding                                                     | new                                         |

Old links (`/bible/today`, `/bible/plans`, `/bible/journal`, `/bible/notes`, `/import`, `/settings`, `/present/:id`) redirect to their new homes, so bookmarks and the installed app keep working.

## Workspaces

Each workspace does one job well; what's already built moves into its new home rather than being rebuilt.

**Today** (home)

- Greeting by name and time of day; the verse of the day over a daily photo with Read in context, Reflect, Show on screen and Copy.
- Today's plan reading, the reflection card, and the "This week" strip (no streaks, no guilt).
- Read in context and Reflect open side panels, so you never leave Today.
- Show on screen becomes Stop showing; a session Today started ends when you leave Today.

**Bible** (focused reader)

- Typography first; toolbars stay quiet until needed.
- Search, book and chapter picker, parallel translation, text size.
- Your highlights, bookmarks and notes drawn on the text; a Bookmarks menu to jump back.
- The TV panel leaves the reader. Since 2026-10-17 the selection bar has no TV action at all: showing scripture on a screen starts in Screen's Bible console.

**Plans**

- Your active plans, each showing only the next reading; browse and import more.
- The plan reader shows just that day's passages, with **Finish** after the last verse.
- Weekly lesson plans unlock a lesson each Sunday.

**Journal** (one timeline)

- Reflections, notes, highlights and bookmarks together, newest first, grouped by month.
- Filters by kind and a search box; new entries choose any verse; entries edit in a side panel.
- Replaces the separate Notes & highlights tab.

**Screen** (laptop first)

- Home: two equal entry points, **Show a presentation** and **Show the Bible**, then the presentation library and import.
- The presentation console is unchanged.
- **Show the Bible** opens the Bible console, with the same layout and keys as the presentation console: Preview and Live, Blank (B), Logo (L), Freeze (F), display modes 1–4. A passage queue replaces the slide strip; search, word highlighting and the background picture come along. Operators learn one console for sermons and classes (Jakob's law applied inside the app).
- Every action that puts something on the TV is called **Show on screen**, so the tab and its actions read as one idea.

## Notes, highlights and bookmarks

Marks are a personal layer over Scripture, not a destination: they belong to the verse, so they appear wherever that verse is drawn.

- **Shown and added everywhere a verse appears:** the Bible reader, a plan's reading, and Today's Read in context panel. A mark added in one place is the same mark in all of them.
- **Browsed in Journal,** with reflections, because together they are your spiritual history. Law of common region: everything I've written or marked lives in one place.
- **Bookmarks are the exception for getting around:** the reader also has a small Bookmarks menu to jump back to a place.
- **Unchanged underneath:** the existing marks storage stays as it is; only where they are browsed moves.

## Onboarding

First run asks what brings the person to Lampstand, and switches on only what they ticked; everything else stays one tap away in Me.

1. **Your name**, so Today can greet you.
2. **What brings you to Lampstand?** (checkboxes, below)
3. **Your Bible translation.**
4. **A plan,** or "just the verse of the day" (only shown when Grow daily is ticked).

Screen copy for step 2:

> **What brings you to Lampstand?** _Choose all that apply. You can change this any time in Me._
>
> ☐ **Grow daily** — A verse to start each day, reading plans that fit your pace, and a private journal for what God is teaching you. _Turns on Today, Plans and Journal._
>
> ☐ **Read and study** — The Bible with nothing in the way: search, compare translations side by side, and highlight, bookmark and take notes as you read. _Turns on the Bible reader, highlights and notes._
>
> ☐ **Teach and present** — Put Scripture and sermon slides on a TV or projector for a service, a class or a small group, from your laptop. _Turns on Screen._

Rules:

- **Checkboxes, none ticked at first;** at least one to continue. Ticking all three is "everything".
- **Titles name what the person wants to do,** not features; each description ends with what it turns on, so nothing is hidden.
- **The Bible is always available,** even with only Teach and present ticked, because presenting needs it. Read and study adds the personal layer on top.
- **The app opens on the first tab still showing:** Today for Grow daily, Screen for presenting only.
- **Switching off hides; data stays.** A journal is still there when Journal is switched back on.

## Me: profile, settings and feature tips

> Amended on 2026-10-17: Me is now **Profile**, with Journey, Profile and Settings tabs (see below).

The Me avatar opens the profile, and Settings moves inside it; Settings leaves the main nav.

| Section                      | Holds                                                                                                                                                                    |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **You**                      | Name and avatar initial; becomes the signed-in account in v2                                                                                                             |
| **What I use Lampstand for** | The same three switches as onboarding, same names and copy; each expands into **Customize** with a switch per part (Today, Plans, Journal; highlights and notes; Screen) |
| **Reading**                  | Bible translation, text size, parallel translation                                                                                                                       |
| **Appearance**               | Light, dark or follow the system; reduce motion                                                                                                                          |
| **Presenting**               | Default slide template, verse display mode, logo for the TV; only shown when Teach and present is on                                                                     |
| **Tips**                     | The Feature tips switch                                                                                                                                                  |
| **Your data**                | Backup and restore, Bibles, storage                                                                                                                                      |
| **About**                    | Version and credits                                                                                                                                                      |

Bundles by default, finer control one level down (progressive disclosure).

**Feature tips** keep people aware of what exists, from time to time, without nagging:

- **At natural moments only,** tied to what the person just did. After a few chapters: "Reading plans can keep you going." After a note: "Your notes collect in Journal." After a highlight: "You can show this on a screen."
- **Also for features that are on but unused,** such as comparing two translations side by side.
- **One tip at a time, at most one a week,** never on first launch, never while presenting.
- **Actions on each tip:** _Turn it on_ (or _Show me_), _Not now_ (may return weeks later), _Don't show this again_.
- **One switch in Me turns all tips off.**

## Design language and UX principles

Each workspace gets its own atmosphere, so the mood tells you where you are; that prevents mode errors as well as looking considered.

| Workspace             | Atmosphere                                                                                         |
| --------------------- | -------------------------------------------------------------------------------------------------- |
| **Today**             | Light that changes through the day, photography, gentle motion, warmth                             |
| **Bible**             | Paper and ink: generous margins, a serif reading face, a quiet interface that fades while you read |
| **Plans and Journal** | Calm and personal, close to Today, with progress made visible                                      |
| **Screen**            | A dark stage console: dense, high contrast, big targets, keyboard first, no ornament               |

One motion language and the logo's flame gold tie them together.

The laws and principles behind the decisions:

| Law or principle                    | Where it shows                                                                                   |
| ----------------------------------- | ------------------------------------------------------------------------------------------------ |
| Hick's law                          | Three to five destinations instead of a crowded nav; onboarding switches on only what was chosen |
| Serial position effect              | Today first in the nav and as home                                                               |
| Jakob's law                         | Familiar shape from Bible apps people already use; one console for every kind of presenting      |
| Fitts's law                         | Bottom tab bar on phones; large targets in the Screen consoles                                   |
| Tesler's law                        | Operators carry the console's complexity; readers carry none                                     |
| Occam's razor                       | One place to present Scripture instead of three                                                  |
| Progressive disclosure              | Use-case switches first, Customize one level down; tips at natural moments                       |
| Law of common region                | All marks and reflections in one Journal timeline                                                |
| Goal-gradient and Zeigarnik effects | Plan progress, an unfinished day stays visible on Today                                          |
| Peak–end rule                       | The Finish moment after a plan reading                                                           |
| Mode errors (Norman)                | Separate workspaces with distinct atmospheres; no TV controls in the reader                      |
| Doherty threshold                   | Screens respond within 400 ms; verse lookups stay under 50 ms as the PRD requires                |

## Data and v2 readiness

Everything stays on the device now, shaped so that accounts later are a sync job, not a rebuild.

- **Now: a local profile record** — name, avatar initial, preferred translation, reading time, the use-case switches and Customize choices, and tip state (what was shown, dismissed or turned off). Today, Me and onboarding read from it.
- **Now: every personal record keeps a stable id and an updated time.** Marks, journal entries, plan progress and imported plans already do.
- **Now: backups include the profile.**
- **v2: soft deletes** — deleted items are marked as deleted rather than erased, so a deletion can sync across devices. Added when sync arrives.
- **v2: sign-up, sign-in, sync and per-person profiles;** the local profile becomes the account.

## Build workflow

Build in six milestones, continuing the PRD's numbering; each ends with a working, demoable app and its done criteria met before the next starts. PRD section 14 applies to each: a short plan confirmed before building, tests plus lint and type check, a summary of what was built and any deviations, one commit per milestone, and a dated line in docs/DECISIONS.md for every choice not covered here.

11. **New structure**
    - Flat nav Today · Bible · Plans · Journal · Screen with Me; bottom tab bar on phones, top bar on laptops.
    - Today becomes home at `/`; Library and Import move into Screen at `/screen`; routes from the Information architecture table.
    - Redirects from every old route.
    - The nav reads feature switches from the start (all on until onboarding exists).
    - _Done when:_ every screen is reachable at its new route, old links land on the right screen, no horizontal scroll at 390 px, and the nav order never changes when a tab is hidden.
12. **Bible as a focused reader**
    - TV panel removed from the reader; one **Show on screen** action on a selection.
    - Marks drawn on the text; a Bookmarks menu.
    - _Done when:_ the reader has no TV controls, Show on screen opens the Bible console with the selected passage, and marks added in the reader appear in the plan reader and Today's context panel.
13. **Bible console in Screen**
    - `/screen/bible` with the presentation console's layout and keys; passage queue instead of the slide strip; search, word highlighting, display modes, background picture.
    - Screen home with two equal entry points (Show a presentation, Show the Bible) plus the library and import.
    - _Done when:_ an operator can run a Bible class end to end on a TV with the same keys as a sermon, and PRD section 7.6 output criteria still pass.
14. **Journal timeline**
    - Reflections, notes, highlights and bookmarks in one timeline with kind filters and search; the Notes & highlights tab is retired.
    - _Done when:_ every existing mark and entry appears in Journal, opening one goes to its verse or editor, and deletes can be undone.
15. **Me and onboarding**
    - Local profile; Me page with all settings sections; use-case switches with Customize.
    - Onboarding at `/welcome` with the copy from the Onboarding section; feature tips with their rules and switch.
    - _Done when:_ a first run with any combination of ticks shows exactly the right tabs and home screen, every setting is reachable in Me, and tips respect the one-a-week and never-while-presenting rules.
16. **Atmospheres and polish**
    - Paper-and-ink Bible, time-of-day Today, dark stage Screen; one motion language.
    - _Done when:_ each workspace is recognisable at a glance in light and dark, contrast passes AA, and Reduce motion is honoured everywhere.

After milestone 16 (and 17–19 below): try it on a phone for a week of daily reading and on a laptop with a TV for one class, then fix what comes up.

### Milestones 17–19 (plans library and multi-verse marks, agreed 2026-10-17)

17. **Plan catalog and format v2**
    - A category catalog as data (`group › category › subcategory`, three levels at most); groups: For how you feel, Guided reading, Grow in faith, Lessons for groups. Empty categories stay hidden until plans arrive.
    - Plan format v2 (v1 files still load): `categories` (several allowed), `audience` (personal or group), `level`, `cover` (a bundled background), `pace` adds `monthly`; per day an optional `devotional` and `prayer`.
    - `skill/lampstand-plans` updated with the catalog and fields; tests check every plan's references and category ids.
    - _Done when:_ v1 and v2 files both validate and import, unknown category ids are refused with a readable message, and the catalog test passes.
18. **Discover plans**
    - Plans = Your plans (next reading only) + Discover: feeling chips, cover rows for guided reading and lessons, Grow in faith categories, search, a pace filter.
    - Category pages and a plan page before starting (what, how long, first reading preview, Start); Reflect on this day opens a journal entry for that reading.
    - About five starter plans in our own words (Anxiety, Hope, Life of Jesus, New to faith › First steps, and one more), each day with a note, prayer and questions.
    - _Done when:_ a person can find a plan by feeling, by group or by search, preview it, start it, and reflect on a day into Journal.
19. **Select and mark several verses**
    - Tap to start a selection, tap another verse to extend it (Shift-click still works); the bar shows "John 3:12–18 · 7 verses" with Clear.
    - Highlights across verses render as one continuous band; a note shows a margin bracket over the verses it covers.
    - Notes and bookmarks across chapters by typed reference (search or a journal entry); reader selection stays within one chapter.
    - _Done when:_ a range can be selected, highlighted and noted on a phone with taps only, and a cross-chapter note made by reference appears in the reader on both chapters.

### Profile, Journey and Search (milestones 20–21, agreed 2026-10-17)

**Profile** replaces Me. The avatar at the top right (and the Profile tab on phones) opens it.

- **Header:** the avatar initial and a greeting by name that fits the moment. "Welcome back, Jonathan" after a few days away; otherwise by time of day ("Good evening, Jonathan"), with a short line about your reading ("2 plans going · 5 days read this month"). Without a name: "Your profile" and a link to add one.
- **Tabs, in this order:** **Journey** (opens first) · **Profile** · **Settings**. An underlined tab row under the header, the same on phones.

| Tab          | Route               | Holds                                                                                                                                                                                                                 |
| ------------ | ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Journey**  | `/profile`          | A summary (days read this month, plans going, plans finished); your plans, in progress and finished; the timeline of reflections, journal entries, notes, highlights and bookmarks with filters, search and New entry |
| **Profile**  | `/profile/you`      | Name and avatar colour, "Reading since …"; What I use Lampstand for with Customize; on phones, a **Present on a screen** card into Screen                                                                             |
| **Settings** | `/profile/settings` | Reading, appearance, presenting, tips, translations, backup and restore, about                                                                                                                                        |

Journal becomes **Journey**: everything you have done with the Bible in one place. Later candidates for Journey (not now): a prayer list with answered prayers, verses you are memorising, "this time last year".

**Navigation**

- **Laptops:** Today · Bible · Plans · Screen in the top bar, then a Search button and the Profile avatar. Journal leaves the bar.
- **Phones:** Today · Bible · Plans · Search · Profile in the tab bar. Screen leaves the phone tab bar and lives in Profile, since presenting happens from a laptop. Someone who only presents (no Today, Plans or journaling) keeps Screen in Search's place.
- **Search** (`/search`): one box over Bible references, Bible words, plans, and your own journal entries, reflections and notes.
- Old links: `/journal` → `/profile`, `/me` → `/profile/you`, `/settings` → `/profile/settings`.

20. **Profile and Journey**
    - Profile with the greeting header and the three tabs; Journal moves in as Journey with the summary and plans; avatar colour and "Reading since"; redirects.
    - _Done when:_ the avatar opens Journey with a greeting by name, every old Journal flow works there, and old links land on the right tab.
21. **Search and navigation**
    - The Search page; the new top bar and phone tab bar; Present on a screen in Profile on phones.
    - _Done when:_ on a phone, Search finds a verse, a plan and one of your notes, and Screen is reachable from Profile.

### Phone-first polish (milestones 22–23, agreed 2026-10-18)

On a phone the person is holding it: touch only, thumb first, no keyboard, mouse or hover.

22. **Phone top bar and touch pass**
    - The top bar keeps the lamp at the left and shows the page at the right; Today and Profile show your greeting there. Deeper pages add a back arrow. Big page headings step aside on phones.
    - Controls at least 40–44px on touch screens; keyboard hints hidden; sheets open from the bottom on phones; Profile's header becomes a compact row.
23. **Bible reader for thumbs**
    - Phones: a floating `‹ John 3 ▾ ›` pill above the tab bar (previous, picker, next) that becomes the selection bar when verses are selected; search and Aa (translation, parallel, text size) in the top bar; the picker (with a Bookmarks tab) and Aa open as bottom sheets. No swipe between chapters, so tapping verses never turns the page.
    - Laptops: one slim bar `‹ John 3 ▾ ›` with search and Aa, quiet while you read.

### Mobile experience (milestones 24–28, 2026-10-18)

Phones only; laptops and tablets stay as they are.

24. **Personal headers and plan filters** — the Bible's top bar and the Plans header speak to you by name; plan search is a big rounded field with Length and For filter chips (menus on laptops, bottom sheets on phones).
25. **Foundations** — notch-safe, keyboard-aware viewport; 16px fields; no tap flash or double-tap delay; press feedback; no sticky hover; toasts under the top bar; dialogs as bottom sheets; full-screen welcome with pinned actions; "this device" in copy.
26. **UI refresh** — plan lists as rows with square covers; edge-to-edge snapping rows; full-bleed plan hero; Journey summary strip; segmented Profile tabs; tighter settings; Today's actions on one row; an active-tab pill.
27. **Gestures and motion** — drag sheets down to close; tap the active tab to return to the top; a small tab icon pop; light haptics for key moments; everything respects Reduce motion.
28. **Page fixes** — Aa in the plan reader; Screen with a way back and a laptop note; TV settings hidden on phones; stacked parallel translation; swipeable Journey filters.

## Decisions and open questions

| Decision             | Choice                                                                                                                                     |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Main feature         | Grow (daily reading); presenting is secondary                                                                                              |
| Devices              | Personal devices only; no shared church laptop                                                                                             |
| Data                 | Local only for now; accounts, sync and per-person profiles in v2                                                                           |
| Navigation           | Laptops: Today · Bible · Plans · Screen, plus Search and Profile. Phones: Today · Bible · Plans · Search · Profile (amended 2026-10-17)    |
| Presenting tab name  | **Screen**; every action that puts something on the TV is **Show on screen** (not "Share", which phones already use for sending to people) |
| Home                 | Today (or the first tab still showing)                                                                                                     |
| Screen size          | Phone first for the personal side; Screen stays laptop first                                                                               |
| Reader to TV         | None in the reader; Screen's Bible console is where scripture goes on a TV (amended 2026-10-17)                                            |
| Presenting Scripture | One dedicated Bible console with the same layout and keys as the presentation console                                                      |
| Notes and highlights | A layer on verses everywhere; browsed in Journey; Bookmarks menu in the reader                                                             |
| Onboarding           | Checkboxes: Grow daily, Read and study, Teach and present; none preselected                                                                |
| Feature switches     | The three use cases, with Customize per part, in Me                                                                                        |
| Settings             | A tab in Profile (Journey · Profile · Settings); Me is renamed Profile                                                                     |
| Feature tips         | From time to time at natural moments; at most one a week; switch in Me                                                                     |

Open questions:

- [ ] Reading time on the profile: just stored for Today's greeting, or used later for reminders (which need notifications)?
- [ ] Should the Library's verse-of-the-day strip move to Screen home, or go away now that Today is home?
