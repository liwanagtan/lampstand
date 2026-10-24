# Sharing and the daily verse

Status: built on `design/share` and `design/daily-verse`, 2026-10-24. Staging first; the live site only with the owner's approval (AGENTS.md).

## Sharing

- **Share the verse of the day.** Today's verse card has Share beside Copy. It opens the phone's share sheet with the verse, its reference and a link; where there is no share sheet it copies the same words. Shared text is always a translation that may be passed on (BSB, KJV or WEB); someone reading the NLT shares the BSB, because the NLT licence does not cover passing its text on (`src/features/share/share.ts`).
- **Share Lampstand.** Profile › About you and Settings have Share Lampstand: a line about the app and its link.
- **Verse links.** `/v/GEN.28.15` opens the passage in the reader with the verse chosen. Someone new goes through Welcome first, then lands on the verse (`SharedVersePage.tsx`, `rememberAfterWelcome`).
- **Link previews.** `index.html` carries Open Graph tags and `public/og/lampstand.png` (made by `scripts/build-share-image.mjs`). The Worker runs first for `/` and `/v/*` (`run_worker_first` in `wrangler.jsonc`) to make the tags absolute and, for a verse link, name the passage (`worker/share.ts`).
- **No tracking.** A shared link carries no sender and nothing about who shared it.

## Verse of the day at 8:00

See the section below once built; it is the only Lampstand feature that keeps anything off the device.
