# Decisions

Dated choices not covered by the PRD (docs/PRD.md §14).

- 2026-10-16 — Package manager: npm (pnpm not installed on the dev machine).
- 2026-10-16 — Styling: CSS Modules + CSS variables, not Tailwind. `src/design-system/tokens.ts` is the single source of truth and injects all tokens as CSS variables at startup (`applyTokens`).
- 2026-10-16 — Fonts: `@fontsource-variable/inter` and `@fontsource-variable/fraunces` (OFL), bundled by Vite so nothing is fetched at runtime.
- 2026-10-16 — Versions: React 19, React Router 7, Vite 8, Zod 4, Dexie 4, TypeScript 5.9 (TS 7 skipped until typescript-eslint supports it), ESLint 9.
- 2026-10-16 — Contrast fixes to PRD tokens (contrast test failed on PRD values): light `success` #1F9D5A → #1C9455 (was 2.98:1 on surface-raised); text on the light accent fill and on the dark live fill uses near-black (`accent-contrast`, `live-contrast`) because white measured 4.03:1 and 3.91:1.
- 2026-10-16 — Accent, live, success and warning are UI colors (≥ 3:1). Body text always uses `text` or `text-muted` (≥ 4.5:1 on all surfaces).
- 2026-10-16 — "Control screen defaults to Dark": the Present screen resolves the System appearance to Dark; an explicit Light choice is respected.
- 2026-10-16 — Default app appearance is System.
- 2026-10-16 — Canonical book codes are the three-letter USFM/Paratext codes the PRD uses (JHN, PSA, 1CO). `src/features/bible/books.ts` maps them to the parser's OSIS names (John, Ps, 1Cor).
- 2026-10-16 — Translation codes in the command bar ("jn 3 16 web") are peeled off before parsing, because the reference parser only knows a few codes (ASV, KJV). "darby" is accepted as an alias for DBY.
- 2026-10-16 — Stored presentations keep the human `ref`; the canonical range is computed with `parseRef` when needed (memoised), so exported files stay valid against the strict schema.
- 2026-10-16 — "≤ 6 verses per slide" is a warning on import, not an error, since the renderer paginates long passages (PRD §5 says passages are never truncated).
- 2026-10-16 — A reference with several passages ("John 3:16, 18") is rejected for verse slides; one passage per slide.
- 2026-10-16 — Field limits not given in the PRD: title ≤ 80, speaker/series ≤ 60, notes ≤ 2000, image description ≤ 200, quote author ≤ 60, countdown label ≤ 40, list heading ≤ 60, up to 6 emphasis phrases, up to 40 extraRefs.
- 2026-10-16 — Import accepts JSON wrapped in a ```json code fence, since that is how the skill outputs it.
- 2026-10-16 — Bible sources: KJV, ASV, YLT and Darby from scrollmapper/bible_databases (formats/json); WEB from eBible.org (engwebp, Protestant canon) because scrollmapper has no WEB. All five are public domain; the license is recorded in each file.
- 2026-10-16 — WEB text is bundled unmodified: its license asks that changed text not be called the World English Bible. Other translations get typographic cleanup only (Darby's missing space before "God" and its [ ] / * markers, YLT backtick quotes and "--", KJV italics brackets, ASV "[Selah", Psalm 119 Hebrew letter headings).
- 2026-10-16 — Verses a translation omits (e.g. ASV Matthew 17:21) are stored as empty strings and shown as "not included in this translation". WEB's Romans doxology sits at 14:24–26 rather than 16:25–27.
- 2026-10-16 — Generated public/bibles/*.json (~21 MB) is committed so the app builds and runs without network. `npm run bibles` regenerates it from scripts/.cache.
- 2026-10-16 — A bundled translation reloads only when its content hash in public/bibles/index.json changes.
- 2026-10-16 — Word search runs in a Web Worker (MiniSearch, common English stop words dropped, prefix match on the last word, light fuzziness for long words, exact phrases ranked first) so building the index never blocks the control screen. At most two translations are indexed in memory.
