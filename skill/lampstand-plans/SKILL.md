---
name: lampstand-plans
description: Write a Lampstand reading plan file (.lampstand-plan.json) — a daily Bible reading plan or a weekly Sunday-school lesson plan — for the Lampstand church app. Use when someone wants a reading plan, devotional plan, Bible study or Sunday-school lessons for Lampstand.
---

# Lampstand reading plans

You write one reading plan as JSON. People import it on Lampstand's Plans tab, then read one day (or one lesson) at a time and press Finish when they're done. You never write scripture text; Lampstand shows the readings from its own Bibles in the reader's chosen translation.

Files next to this one:

- `schema.json` — the JSON Schema the file must match (format version 2).
- `catalog.json` — every category a plan can belong to: four groups (For how you feel, Guided reading, Grow in faith, Lessons for groups), their categories and subcategories.
- `example.lampstand-plan.json` — "Parables of Jesus", eight weekly lessons. Copy its style.

## Workflow

1. **Gather.** Ask who it's for (adults, youth, children's Sunday school), the topic or books, how long, and whether it's **daily** (one reading a day, at the reader's pace), **weekly** (a new lesson each Sunday) or **monthly** (a new lesson each month). Don't ask again for anything you were already told.
2. **Outline first.** Propose the list of days or lessons (title + readings) and wait for a yes before writing the file.
3. **Generate** the file following the rules below, then self-check.
4. **Output only the JSON** in one ```json block and offer to save it as `<id>.lampstand-plan.json`.

## Rules

- `"format": "lampstand-plan"` and `"version": 2` are required.
- `categories`: 1–3 ids from `catalog.json` where the plan belongs (a category or a subcategory, never a whole group). A plan on worry might be `["worry", "peace"]`; a new believer's first week `["first-steps"]`. Never invent an id.
- `audience`: `"personal"` for individual reading, `"group"` for a class or small group. `level` is optional (for example `"New to faith"`).
- `cover`: optional; one of Lampstand's bundled photos: `sunrise-hills`, `sunrise-clouds`, `park-path`, `forest-light`, `forest-sun`, `milky-way`, `sand-dune`, `misty-lake`, `mountain-lake`, `golden-hills`, `green-hills`, `peak-clouds`, `cloudscape`, `sea-sunset`, `autumn-forest`, `lone-tree`, `lake-mountains`, `river-sunrise`, `misty-valley`, `waterfall`. Pick one whose mood fits the plan.
- `id` is lowercase letters, numbers and dashes (for example `"advent-25-days"`). Importing a file with the same id later updates that plan.
- **Never write scripture text.** Each day has `readings`: references only, such as `"Luke 15:11-32"`, `"Psalm 23"` or `"Genesis 1-3"`. Use full book names. Every reference must exist.
- Keep a day readable in one sitting: about 5–20 minutes (roughly 50–200 verses) for daily plans, one focused passage for lessons.
- `title` names the day or lesson. `note` is a short teaching note in plain text (2–5 sentences) that sets up the reading without retelling it. `questions` are 2–4 open questions for discussion or reflection.
- For topical plans (For how you feel), each day may add a `devotional` (2–4 short paragraphs, separated by a blank line, that help the reader apply the passage honestly and gently) and a `prayer` (2–4 sentences, first person). Never quote scripture text in them; refer to the reading instead.
- Use `"pace": "weekly"` (or `"monthly"`) for Sunday-school and small-group lessons; `"daily"` for personal reading plans.
- Write warmly and simply; avoid jargon. Notes and questions must be your own words.
- Respect every length limit in the schema.

## Self-check

- [ ] Valid JSON matching `schema.json`; `format`, `version` (2), `id`, `name`, `description`, `pace`, `categories`, `days` present.
- [ ] Every category id exists in `catalog.json`.
- [ ] No scripture text anywhere; every reading is a real reference.
- [ ] Days are in a sensible order and similar in length.
- [ ] Lessons each have a title, a short note and a few questions.
