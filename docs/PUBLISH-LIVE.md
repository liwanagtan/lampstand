# Publishing Lampstand

Status: **live on Cloudflare Workers** at https://lampstand.jonathanulandayliwanag.workers.dev, with a staging site at https://lampstand-staging.jonathanulandayliwanag.workers.dev. The owner’s theological review in [content/LAUNCH-REVIEW.md](content/LAUNCH-REVIEW.md) remains pending; public deployment does not imply content approval.

Cloudflare Workers Builds is connected to `liwanagtan/lampstand`. `main` is the production branch, builds are enabled, the build command is `npm run build`, and the deploy command is `npx wrangler deploy`. The first deployment succeeded on 2026-10-22. Cloudflare auto-configured Wrangler for the Vite app during that build, including SPA fallback; the repository does not yet contain a checked-in Wrangler configuration. The live site and manifest opened in Chrome, first-run Bible preparation completed, and a direct `/salvation` visit loaded the app and redirected to onboarding for a new user. The full release checklist below still needs to be completed.

## Two deployments

| | Live | Staging |
| --- | --- | --- |
| Worker | `lampstand` | `lampstand-staging` |
| Address | lampstand.jonathanulandayliwanag.workers.dev | lampstand-staging.jonathanulandayliwanag.workers.dev |
| Builds from | `main` | `staging` |
| Deploy command | `npx wrangler deploy` | `npx wrangler deploy --env staging` |
| Other branches | preview builds | none |

Both use the same repository, build command (`npm run build`) and build token. The staging deployment is the `env.staging` section of `wrangler.jsonc` (added 2026-10-24). Secrets are not shared between Workers: `lampstand-staging` needs its own `NLT_API_KEY` (Settings › Variables and secrets), or NLT says it is unavailable there. Each address keeps its own browser data, so staging and live never share a reader’s highlights, plans or slides. When accounts return, point staging at the staging Supabase project and add the staging address to Supabase’s redirect URLs.

## Hosting choice

Use **Cloudflare Workers Static Assets** for this Vite client-rendered app. It currently needs no hosted application database: profile, journal, notes, plans, and presentations live in the browser’s local storage/IndexedDB. Keep the production app at the domain root because the PWA manifest, service worker, and bundled content use root paths. Configure single-page-application fallback so a direct visit to `/plans`, `/salvation`, or `/profile/settings` serves `index.html`; keep actual assets such as `/sw.js`, `/bibles/*.json`, and `/scenes/*` as files. [Cloudflare SPA routing](https://developers.cloudflare.com/workers/static-assets/routing/single-page-application/)

The current build is about 46 MB in 227 files; the largest file is about 4.2 MB. Cloudflare’s current Workers Static Assets limit is 20,000 files per version on Free and 25 MiB per file. Recheck limits and the build before deploying. [Cloudflare limits](https://developers.cloudflare.com/workers/platform/limits/)

## Release sequence

1. **Cloudflare connection — done.** The owner connected the GitHub repository and deployed Worker `lampstand` on the free `workers.dev` address. Verify that future pushes to `main` deploy automatically and that pushes to `staging` and `design/*` branches create previews, never production changes. [Build branches](https://developers.cloudflare.com/workers/ci-cd/builds/build-branches/)
2. **Make deployment reproducible.** Check in an explicit Wrangler configuration on `staging` with `dist/` as the asset directory and `single-page-application` fallback. Keep `npm run build` and the existing typecheck, lint, and tests in release checks. Merge the config into `main` only with the owner’s approval under [AGENTS.md](../AGENTS.md).
3. **Test a preview.** Verify first-run onboarding, Today, Plans, Salvation, direct deep links, every bundled Bible translation, Screen presentation, installability, offline reading, and the update prompt. On mobile, test Safari and Chrome installation and a full reading after disconnecting. Check that imported presentations and journal entries remain only on the device, and that export/import works.
4. **Finish the content gate.** The owner reviews the Salvation reading and the other items in [content/LAUNCH-REVIEW.md](content/LAUNCH-REVIEW.md). Verify translation, photo, study-note, story, and devotional attribution in Settings → Credits and licences. Do not describe content as pastor-approved until that review is complete.
5. **Review public basics.** Confirm the `/privacy` copy, the GitHub issue-based support path, the app name and icons, and the public URL shown to users. A GitHub account is currently needed to submit a support issue. Decide whether that is sufficient for launch.
6. **Production smoke test.** On the live URL, test HTTPS, direct links, service-worker scope and updates, and the public support/privacy routes. The initial Chrome check confirmed onboarding, a direct `/salvation` load, and the manifest; installation, offline mode, other deep links, and cross-browser checks remain. Connect an owner-approved domain only if one is desired and available without an unapproved payment. [Custom Domains](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/)
7. **After launch.** Check Cloudflare deployment status and browser error reports, keep a rollback version available, and make a small test update to verify the release process. Give users a clear backup reminder because local data does not sync across devices.

## Branch flow

Work happens on `design/<topic>` branches made from `staging`, the long-lived staging branch. A topic merged into `staging` deploys the staging site; check it there. `main` is the production release branch: merging `staging` into `main`, only with the owner’s approval as required by [AGENTS.md](../AGENTS.md), deploys the live site. A design push must never deploy to the live address.

