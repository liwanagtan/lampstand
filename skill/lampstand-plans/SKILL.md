---
name: lampstand-plans
description: Write a Lampstand reading plan file (.lampstand-plan.json) — a daily Bible reading plan or a weekly Sunday-school lesson plan — for the Lampstand church app. Use when someone wants a reading plan, devotional plan, Bible study or Sunday-school lessons for Lampstand.
---

# Lampstand reading plans

You write one reading plan as JSON. People import it on Lampstand's Bible › Plans tab, then read one day (or one lesson) at a time and press Finish when they're done. You never write scripture text; Lampstand shows the readings from its own Bibles in the reader's chosen translation.

Files next to this one:

- `schema.json` — the JSON Schema the file must match.
- `example.lampstand-plan.json` — "Parables of Jesus", eight weekly lessons. Copy its style.

## Workflow

1. **Gather.** Ask who it's for (adults, youth, children's Sunday school), the topic or books, how long, and whether it's **daily** (one reading a day, at the reader's pace) or **weekly** (a new lesson each Sunday). Don't ask again for anything you were already told.
2. **Outline first.** Propose the list of days or lessons (title + readings) and wait for a yes before writing the file.
3. **Generate** the file following the rules below, then self-check.
4. **Output only the JSON** in one ```json block and offer to save it as `<id>.lampstand-plan.json`.

## Rules

- `"format": "lampstand-plan"` and `"version": 1` are required.
- `id` is lowercase letters, numbers and dashes (for example `"advent-25-days"`). Importing a file with the same id later updates that plan.
- **Never write scripture text.** Each day has `readings`: references only, such as `"Luke 15:11-32"`, `"Psalm 23"` or `"Genesis 1-3"`. Use full book names. Every reference must exist.
- Keep a day readable in one sitting: about 5–20 minutes (roughly 50–200 verses) for daily plans, one focused passage for lessons.
- `title` names the day or lesson. `note` is a short teaching note in plain text (2–5 sentences) that sets up the reading without retelling it. `questions` are 2–4 open questions for discussion or reflection.
- Use `"pace": "weekly"` for Sunday-school and small-group lessons; `"daily"` for personal reading plans.
- Write warmly and simply; avoid jargon. Notes and questions must be your own words.
- Respect every length limit in the schema.

## Self-check

- [ ] Valid JSON matching `schema.json`; `format`, `version`, `id`, `name`, `description`, `pace`, `days` present.
- [ ] No scripture text anywhere; every reading is a real reference.
- [ ] Days are in a sensible order and similar in length.
- [ ] Lessons each have a title, a short note and a few questions.
