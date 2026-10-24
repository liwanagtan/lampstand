---
name: lampstand-slides
description: Turn sermon notes into a Lampstand slide file (.lampstand.json) for the Lampstand church presentation app. Use when someone wants sermon slides, a sermon presentation, or a .lampstand.json file.
---

# Lampstand slides

You turn a pastor's sermon notes into one Lampstand presentation: a JSON file the Lampstand app imports, checks and presents. The app draws the design from a template, so you only write content. You never write scripture text; the app loads it from its Bible database.

Files next to this one:

- `schema.json` — the JSON Schema every file must match. Use only the slide types and fields it defines.
- `example.lampstand.json` — a complete 21-slide sermon, "A Lamp in the Dark". Copy its style.

## Workflow

1. **Gather.** Ask for (or accept) the sermon notes, title, speaker and date. Don't ask again for anything the user already gave you. Lampstand draws every presentation in its one theme (ink, cream and gold), so don't ask about a template and leave `theme` unset.
2. **Outline first.** Propose a short outline: the big idea, the sections and main points, and the main verses. Wait for the user to confirm or adjust it before generating. Skip this step only if the user asks you to.
3. **Generate** one presentation that follows the rules below.
4. **Self-check** before you output (see the checklist).
5. **Output only the JSON** in a single ```json code block, then offer to save it as `<title>.lampstand.json` (for example `a-lamp-in-the-dark.lampstand.json`).

## Rules

- `"schemaVersion": 1` is required and comes first.
- **Never write scripture text.** Use `verse` slides with `ref` only, such as `"ref": "Romans 8:28"` or `"ref": "Psalm 23:1-3"`. One passage per verse slide. Keep each verse slide to 6 verses or fewer; split longer passages into several verse slides.
- Put other verses the pastor will likely mention, but that don't need a slide, in `extraRefs`. The operator gets them in the verse queue.
- Use `emphasis` to highlight a few words that appear in the verse, for example `["so loved"]`. Only use words that are really in the verse.
- **Respect every character limit.** If an idea doesn't fit, split it across slides instead of cramming. Shorter is better on a TV.
- Put speaking prompts, stories and reminders in `notes`, never on the slide.
- **Images:** describe them in `background.description` ("sunrise over hills, soft warm light"). Never invent URLs or file names. Use at most 3 image backgrounds in a presentation.
- **Motion:** leave `transition` unset (fade) on most slides; use `"rise"` for section changes. At most one `build: true` list per main point.
- Aim for **15–25 slides** for a 20–25 minute sermon: about one slide per minute, plus verse slides.
- Plain text only: no Markdown, HTML, emoji or line breaks inside fields.
- Don't add fields that aren't in the schema; unknown fields are rejected.

## Slide types and limits

| Type        | Fields                               | Limits                      | Use                                          |
| ----------- | ------------------------------------ | --------------------------- | -------------------------------------------- |
| `title`     | `heading`, `subtitle?`, `speaker?`   | heading ≤ 60, subtitle ≤ 90 | Opening slide                                |
| `section`   | `label?`, `heading`                  | label ≤ 20, heading ≤ 50    | Divider, e.g. label "Point 1"                |
| `point`     | `heading`, `body?`                   | heading ≤ 60, body ≤ 160    | One main idea                                |
| `list`      | `heading`, `items[]`, `build?`       | 2–5 items, each ≤ 70        | Bullets; `build: true` reveals one per click |
| `verse`     | `ref`, `translation?`, `emphasis?[]` | ≤ 6 verses per slide        | Scripture (text comes from the app)          |
| `quote`     | `text`, `author?`                    | text ≤ 220                  | Quotes, illustrations                        |
| `statement` | `text`                               | ≤ 90                        | One bold line for emphasis                   |
| `image`     | `background` (image), `caption?`     | caption ≤ 90                | Full-bleed visual                            |
| `countdown` | `minutes`, `label?`                  | 1–30 whole minutes          | Before service                               |
| `closing`   | `heading`, `body?`                   | heading ≤ 60, body ≤ 160    | Prayer, response, benediction                |

Every slide may also have `notes`, `transition` (`fade`, `rise`, `push`, `none`) and `background`:

- `{ "type": "template" }` — the template's own background (the default)
- `{ "type": "color", "tone": "base" | "accent" | "deep" }`
- `{ "type": "gradient", "tone": "calm" | "warm" | "dawn" }`
- `{ "type": "image", "description": "…", "motion": "still" | "drift" }`
- `{ "type": "video", "description": "…" }`

Presentation fields: `schemaVersion`, `title` (≤ 80), `speaker?`, `date?` (`YYYY-MM-DD`), `series?`, `theme?`, `translation?` (e.g. `"KJV"`, `"WEB"`), `extraRefs?`, `slides` (1–80).

Translations built into the app: KJV (default), WEB, ASV, YLT, DBY (Darby). Only set `translation` if the pastor asks for one.

## Typical slide pattern

1. `countdown` (optional, before service)
2. `title`
3. `verse` — the main text
4. `point` or `statement` — the big idea
5. For each main point: `section`, then 1–3 of `point` / `list` / `verse` / `quote`
6. `statement` — the application
7. `closing` — response or prayer

## Self-check before output

- [ ] Valid JSON: double quotes, no trailing commas, no comments.
- [ ] `"schemaVersion": 1` is present.
- [ ] Every `ref` is a real Bible reference in the 66-book canon, with chapter and verse numbers that exist.
- [ ] No scripture text anywhere: not in headings, bodies, quotes or notes.
- [ ] Every character limit and list length is respected.
- [ ] Only fields from the schema; every slide has a valid `type`.
- [ ] No more than 3 image backgrounds; no URLs.
- [ ] 15–25 slides for a 20–25 minute sermon (unless the user asked otherwise).
