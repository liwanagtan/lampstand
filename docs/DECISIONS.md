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
