# New Living Translation in Lampstand

NLT is licensed for Lampstand's noncommercial use through the free API.Bible Starter plan. The selected Bible is the standard New Living Translation (`d6e14a625393b4da-01`), not the Catholic or Anglicised edition. The API key is a Cloudflare Worker secret named `NLT_API_KEY`; never put it in Git, Vite variables, or browser code.

The Worker serves only NLT chapter and search requests. Its edge cache and the reader's IndexedDB cache refresh at least every 14 days, within API.Bible's 30-day limit. NLT needs a connection when a cached chapter expires. BSB, KJV and WEB remain fully offline. The reader displays publisher attribution and Settings lists the full license notice. Browser displays send the API's FUMS token using the official tracker.

For local Worker testing, build the app and run `npx wrangler dev --port 5315` with `NLT_API_KEY` in an ignored `.dev.vars` file. For Cloudflare deployment, set the Worker secret before enabling NLT in production. The free plan has 5,000 API calls per month and no paid overage; monitor its usage. If Lampstand's revenue model changes, review the license before continuing NLT access.

Sources: [API.Bible caching policy](https://care.api.bible/article/401-caching-content), [FUMS guide](https://docs.api.bible/resources/fair-use/), [API.Bible licensing overview](https://care.api.bible/article/396-licensing-policies-quick-reference), and [Tyndale permissions](https://www.tyndale.com/permissions).
