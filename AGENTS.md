# Working on Lampstand

## Branch policy

- `main` is the protected release branch. Do not commit directly to it, merge into it, or push changes to it unless the owner explicitly asks for that action.
- `staging` is the long-lived staging branch: what is tested before a release. It is never deleted, and it stays in step with `main` after each release.
- Work happens on topic branches named `design/<topic>` (for example `design/guided-tour`), each made from `staging`. Make and test the work there.
- When a topic is ready and the owner asks, merge it into `staging`. A finished topic branch may be deleted once it is merged.
- Before editing, check the current branch and worktree status. If the checkout is on `main` or `staging`, switch to the topic branch for the work (or ask which one) instead of editing there, unless the owner asks for a change on that branch.
- A request to commit or push means commit and push the current branch only. It does not authorize a merge into `staging` or `main`, or a production deployment.
- When the owner authorizes a release, review and validate `staging`, then merge it (or open a pull request) into `main` as requested. Do not infer merge approval from content review, staging approval, or a request to publish a branch.

## Deployments

Cloudflare Workers Builds deploys two sites from this repository (details in [docs/PUBLISH-LIVE.md](docs/PUBLISH-LIVE.md)):

- **Production:** Worker `lampstand` at lampstand.jonathanulandayliwanag.workers.dev, built from `main` with `npx wrangler deploy`. Every change that reaches `main` is a production release, so the branch rules above for `main` apply to it.
- **Staging:** Worker `lampstand-staging` at lampstand-staging.jonathanulandayliwanag.workers.dev, built from `staging` with `npx wrangler deploy --env staging` (the `env.staging` section of `wrangler.jsonc`). Check merged work here before a release.
- `design/<topic>` branches deploy nowhere. Test them locally.
- Secrets are per Worker and never go in Git: each site has its own `NLT_API_KEY`. The owner enters secret values; agents never do.
- Do not change Cloudflare build settings, branches or deploy commands, and never touch billing or payments, unless the owner asks.
