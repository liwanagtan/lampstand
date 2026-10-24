# Sharing and the daily verse

Status: built on `design/share` and `design/daily-verse`, 2026-10-24. Staging first; the live site only with the owner's approval (AGENTS.md).

## Sharing

- **Share the verse of the day.** Today's verse card has Share beside Copy. It opens the phone's share sheet with the verse, its reference and a link; where there is no share sheet it copies the same words. Shared text is always a translation that may be passed on (BSB, KJV or WEB); someone reading the NLT shares the BSB, because the NLT licence does not cover passing its text on (`src/features/share/share.ts`).
- **Share Lampstand.** Profile › About you and Settings have Share Lampstand: a line about the app and its link.
- **Verse links.** `/v/GEN.28.15` opens the passage in the reader with the verse chosen. Someone new goes through Welcome first, then lands on the verse (`SharedVersePage.tsx`, `rememberAfterWelcome`).
- **Link previews.** `index.html` carries Open Graph tags and `public/og/lampstand.png` (made by `scripts/build-share-image.mjs`). The Worker runs first for `/` and `/v/*` (`run_worker_first` in `wrangler.jsonc`) to make the tags absolute and, for a verse link, name the passage (`worker/share.ts`).
- **No tracking.** A shared link carries no sender and nothing about who shared it.

## Verse of the day at 8:00

The one Lampstand feature without an account that keeps anything off the device. Opt-in only.

- **Turning it on** (Settings › Reminders › Verse of the day, 8:00 by default, time changeable): the browser asks for notification permission and gives a push address; the app sends that address, the time zone and the time to `POST /api/push/subscribe` (`src/features/reminders/dailyVersePush.ts`). Turning it off deletes the row (`/api/push/unsubscribe`). iPhone allows this only from Lampstand added to the Home Screen (iOS 16.4+); the switch says so.
- **Sending** (`worker/dailyVerse.ts`): a cron trigger every five minutes reads the subscriptions, and for each whose local time has reached its time and hasn't had today's verse, sends one push. At most 40 a run, inside the free plan's 50 outbound requests; more than that in one five-minute window waits for the next run. A push service answering 404/410 means the subscription is gone and the row is deleted; any other failure waits until tomorrow.
- **The verse** is the same as Today's: `worker/daily-verses.json` is the app's own shuffled list with BSB text (public domain), made by `npx tsx --tsconfig tsconfig.app.json scripts/build-daily-verses.ts`. Rebuild it whenever `dailyVerses.ts` changes; `tests/webpush.test.ts` checks the two agree.
- **Push** (`worker/webpush.ts`): VAPID (RFC 8292) and aes128gcm encryption (RFC 8291) with WebCrypto, no dependency. The Worker makes its own VAPID keys on first use and keeps them in its database, so no key is ever copied by hand.
- **Storage:** Cloudflare D1, one database per Worker: `lampstand-push` (live) and `lampstand-push-staging`, bound as `PUSH_DB` in `wrangler.jsonc`. Tables are created on first use. Free plan; nothing here needs a paid one.
- **Phone side:** `public/reminder-sw.js` shows the push and opens Today when tapped.
- **Privacy:** `/privacy` explains what is kept and how it is deleted.
