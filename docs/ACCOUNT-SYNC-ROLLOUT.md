# Accounts, sync, and usage insights

Status: Phases 1–5 are implemented on the staging branch: backups, Google account entry with separate local profiles, guest import by choice, cross-device sync with account deletion, and anonymous usage insights. To turn them on in staging, run `supabase/account-sync.sql`, then `supabase/rls-check.sql`, then `supabase/usage-insights.sql` (and add maintainer emails to `usage_admins`). Google Auth is in Testing mode; only listed test users can sign in. Release to `main` waits for owner approval.

## Product decision

Offer **Continue with Google** and **Continue without an account** at the start of Welcome. A Google login creates or reopens the same Lampstand account; it does not grant Gmail inbox access. Keep guest use while migration and sync are tested. Whether to require an account at a later public launch is a separate decision informed by usage data.

Cloudflare Workers remains the host for the Vite PWA. Use Supabase Auth for Google login and Supabase Postgres for user-owned sync records, while IndexedDB remains the offline working copy. Use two projects if the free-tier limit and operational needs allow: staging and production. Keep Google OAuth secrets in provider configuration, never in the browser or repository. A browser publishable key is permitted only with RLS on every exposed personal table. Confirm current pricing and free-tier pause behavior before provisioning.

## First-run flow

Revised 2026-10-23 (owner): start first, save later.

1. The landing has one job: **Get started**, with a quiet **I have an account** (Google) for returning readers.
2. Welcome asks at most three things: name (taken from Google when signed in), what brings you here, and where to start. A returning signed-in reader on a new device goes to Today once account data has loaded, with retry when offline.
3. After a guest's first finished reading or written entry, Today offers once to keep the journey on every device. Choosing Google there is the choice to import, so guest data comes in without a second question; "Not now" is final, and Settings › Account keeps the option.
4. A guest who signs in from the landing or Settings sees the import summary and chooses. Account data is never overwritten: differing entries and notes are kept twice for review.
5. Settings shows the email, sync status, last sync, export, sign-out and account deletion. Sign-out hides the account's records from a later guest on that device without deleting them.

## Data boundary

| Local source                                                        | Account sync, first release | Rule                                                                                                                 |
| ------------------------------------------------------------------- | --------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `db.plans`                                                          | Yes                         | Merge completed day numbers and completion timestamps; handle resets and deletions explicitly.                       |
| `db.entries`, `db.marks`                                            | Yes                         | Preserve conflicting journal or note versions for review; never discard text because another device edited it later. |
| `db.settings` profile, faith journey, features, reading preferences | Yes                         | Sync user choices, not internal cache/version fields.                                                                |
| Reading resume and reader preferences in localStorage               | Yes                         | Sync meaningful reading location and preference; scroll pixels are device-specific and stay local.                   |
| `db.planDefs` imported plans                                        | Later                       | Keep local until size, ownership, and sharing rules are designed.                                                    |
| Presentations, assets, screen history and controls                  | Later                       | Potentially large and device-specific; outside first account release.                                                |
| Bible translations, `db.verses`, NLT cache, bundled content         | No                          | Never upload licensed or bundled Bible text as personal sync data.                                                   |
| Tips, install/onboarding flags, PWA caches                          | No                          | Device state, not account history.                                                                                   |

Backups remain available even after cloud sync. Phase 1 repairs the existing restore gap for settings and includes reader state in new backups. Older version-1 backups remain importable; existing device reading positions take precedence when importing a backup.

## Sync and privacy design

- Every cloud record has a stable ID, `user_id`, change version or timestamp, and deletion marker. An offline queue retries idempotently after reconnect; a successful upload does not delete the local source.
- Pull and merge before initial push. Union independent Plan day completions. For concurrent journal/note edits, retain both versions and show a review choice. A deletion on one device must propagate without resurrecting an older copy on another.
- RLS restricts select, insert, update, and delete to the signed-in owner. Test user A cannot read or modify user B's rows. Do not place a service-role key in the PWA.
- Personal data is encrypted in transit by HTTPS and protected at the provider; assess whether additional client-side encryption is needed before claiming that Lampstand staff cannot read journal text. The privacy page must state what is stored remotely, who operates it, and how to export and delete it.
- Account deletion removes cloud records and revokes sessions. Offer a separate, clear choice for the downloaded copy on each device. A lost connection or expired session must never make existing local writing disappear.

## Usage insights

Keep traffic analytics separate from user progress. Cloudflare Web Analytics can provide page visits and performance. First-party product events should answer onboarding and reliability questions only. Proposed events: `welcome_started`, `google_chosen`, `guest_chosen`, `welcome_completed`, `guest_import_started/completed/failed`, `plan_started`, `plan_day_completed`, `reading_resumed`, `sync_failed/recovered`, `account_deleted`. Define an active user as a person with a qualifying reading or plan event on a day; report daily/weekly active users and retention by anonymous cohort. A pseudonymous guest ID may be linked on conversion only after clear notice.

Owner decisions (2026-10-23): insights are on by default with a switch in Settings › Privacy; events carry only name, a random device code and the local date; automated browsers and tests are never counted. Journal text is not end-to-end encrypted in the first release, and the privacy page says so.

Do not put name, email, journal text, prayer text, search terms, Bible text, verse references, or full URLs into event payloads. Aggregate counts for reporting; retain raw events only briefly (proposed 30 days) and document the actual period before enabling collection. Keep analytics optional to revise independently from account storage. The current PRD's “no analytics in V1” rule is superseded only when the owner approves this later release and its privacy copy.

## Review gates

1. **Phase 1 — data safety and design:** backup/restore round-trip, data inventory, Welcome copy, sync boundary, and event list reviewed. No backend data created yet.
2. **Phase 2 — Google accounts:** OAuth works on dev, staging, production redirects and installed PWA; no personal sync claims yet.
3. **Phase 3 — Welcome and migration:** guest data is imported by choice; existing account data remains intact; failed import can be retried.
4. **Phase 4 — cross-device sync:** two-device and offline-conflict demonstrations, RLS tests, export/delete drill, and rollback path.
5. **Phase 5 — usage insights:** event payload audit, dashboard, privacy copy, retention check, and guest-vs-Google adoption review.
6. **Release:** validate on `design/responsive-redesign`; merge into `main` only after explicit owner approval. No paid plan or billing method without separate approval.

Supabase references: [Google sign-in](https://supabase.com/docs/guides/auth/social-login/auth-google), [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [pricing](https://supabase.com/pricing). Cloudflare reference: [Web Analytics](https://developers.cloudflare.com/web-analytics/about/).
