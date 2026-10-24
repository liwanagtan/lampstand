# Lampstand schema 2 authoring reference

This reference travels with the skill. The repository's full product rules are in `docs/SLIDE-RULES.md`; use the bundled `schema.json` for exact machine-readable fields.

## Presentation and layout limits

Presentation: `title` at most 80 characters; `speaker` at most 60; `date` a real `YYYY-MM-DD` date; optional `series` at most 60; `slides` 1–80. The skill requires pastor and date even though the app schema permits missing metadata. Use `theme: "lampstand"` and `schemaVersion: 2`.

| Type        | Required                 | Optional                  | Limits                                        |
| ----------- | ------------------------ | ------------------------- | --------------------------------------------- |
| `countdown` | `minutes`                | `label`                   | Whole minutes 1–30; label 40                  |
| `title`     | `heading`                | `subtitle`, `speaker`     | Heading 60; subtitle 90; speaker 60           |
| `section`   | `heading`                | `label`                   | Heading 50; label 20                          |
| `point`     | `heading`                | `body`, `verses`          | Heading 60; body 160                          |
| `statement` | `text`                   | `verses`                  | Text 90                                       |
| `list`      | `heading`, `items`       | `reveal`, `verses`        | Heading 60; 2–5 items, each at most 70        |
| `reading`   | `ref`                    | `translation`, `emphasis` | Ref 60; auto-paged, two whole verses per page |
| `quote`     | `text`                   | `author`, `verses`        | Text 220; author 60                           |
| `image`     | Image/video `background` | `caption`                 | Caption 90; media description 200             |
| `closing`   | `heading`                | `body`, `verses`          | Heading 60; body 160                          |

All slides accept optional `notes` (2,000 characters), `transition` (`fade`, `rise`, `push`, `none`) and `background`. An Image must use an image/video background. IDs are assigned by the app; do not generate them unless needed for an explicit editing task.

The first two slides in skill output are always Countdown then Title. Include the pastor in presentation `speaker` and the second slide's `speaker`, with identical wording. Put service `date` at presentation level. The Title is the sermon poster; the poster takes its main reference from the first Reading. Do not rely on its subtitle for essential content when a Reading exists.

## Choosing scripture fields

- `reading.ref`: the main passage the audience reads as part of the slide sequence. Use one continuous passage per Reading. Do not manually generate one slide for each two-verse page; long passages are permitted.
- `verses`: supporting passages associated with Point, Statement, List, Quote or Closing. They wait in the normal queue, not automatically on the audience screen.
- `extraRefs`: up to 40 likely mentions not tied to one particular slide. Each reference is nonempty and at most 60 characters.

An attached reference is `{ "ref": "Proverbs 3:5-6" }`, optionally with `translation` and `emphasis`. An attachment array has 1–3 objects and at most **three individual verses total**, including every verse within a range. For example, a two-verse range plus one single verse is the maximum. Move longer supporting passages into Readings.

Every reference string must identify one passage whose book, chapter and verses exist in the 66-book Bible. Never copy scripture text into any field. If scripture is quoted in the user's manuscript, extract its reference instead.

`emphasis` contains at most six exact phrases, each at most 60 characters, from the requested translation. Do not guess a familiar wording from another translation. Omit emphasis when the matching text cannot be verified.

Translation is optional at presentation, Reading and attachment levels. Codes have 2–8 alphanumeric characters and start with a letter. Omit when no translation was requested; the app resolves its current default. Do not hard-code a supposed global default or promise that every translation is available offline.

Do not generate `panel`. Legacy files may include `side` or `bottom`, but that field does not control the current display. Do not create old `verse` slides or a list `build` field.

## Content and operator behavior

- Point: one clear heading and, if useful, one supporting sentence. Manuscript paragraphs belong in notes.
- Section: a structural divider; a label such as `Point 1` can supply its section numeral.
- Statement: one memorable thought. It uses `text`, not `heading` or `body`.
- Quote: verified wording and attribution. Use Statement for a generated takeaway; do not invent an author or use a Quote for scripture.
- List: parallel phrases or questions in an intentional order. All items display by default. `reveal: true` is opt-in; normally use at most one reveal list per main point. Do not duplicate slides for incremental reveals.
- Closing: a short response, invitation, prayer prompt or next step.

Next changes slides. R / Show item reveals the next list item in sequence. `[` / `]` changes Reading pages. V opens the regular verse queue without showing a verse.

An operator explicitly shows an attached or searched verse in the same regular modes: **1 Side panel (default)**, **2 Lower third**, **3 Full screen**, **4 Popup**. Remove verse / Esc exposes the underlying slide; another attached verse does not appear automatically. These actions do not change the underlying slide position. The operator starts the audience output separately.

The Countdown timer starts when it becomes the current slide in the console, not necessarily when the TV output opens. The Sermon poster button shows the first Title. Authoring JSON does not control screen blanking or freezing.

## Media and styling

Use no explicit background for the theme default, or choose one of:

```json
{ "type": "template" }
```

```json
{ "type": "color", "tone": "base" }
```

```json
{ "type": "gradient", "tone": "calm" }
```

```json
{ "type": "image", "description": "warm light on a quiet footpath", "motion": "still" }
```

```json
{ "type": "video", "description": "gentle movement of light through trees" }
```

Color tones: `base`, `accent`, `deep`. Gradient tones: `calm`, `warm`, `dawn`. Image motion: `still` or `drift`. Descriptions are nonempty and at most 200 characters. The operator selects real media; do not invent an `assetId`, filename or URL. Prefer quiet still imagery and usually no more than three requested image backgrounds.

Only the Lampstand theme is active. Its current headings use Fraunces Regular, with regular Plus Jakarta Sans body text, ink/cream/gold colors and a restrained type scale. Do not add styling fields, logos or decorative rules to the file. The app handles line breaks, font sizes, photos, shadows, motion and visual hierarchy.

Missing-media notes and dashed placeholder borders are visible in the operator's Live pane but hidden from TV/projector output. Never put the media description or operator instructions in audience text.
