import { handlePush, sendDueVerses, type PushEnv } from './dailyVerse';
import { isPreviewPage, previewPage } from './share';

const NLT_BIBLE_ID = 'd6e14a625393b4da-01';
const UPSTREAM = `https://rest.api.bible/v1/bibles/${NLT_BIBLE_ID}`;
const CACHE_SECONDS = 14 * 24 * 60 * 60;
const BOOK = /^[1-3]?[A-Z]{2,3}$/;

type WorkerEnv = Env & PushEnv & { NLT_API_KEY?: string };

export default {
  async scheduled(_controller: ScheduledController, env: WorkerEnv): Promise<void> {
    await sendDueVerses(env);
  },

  async fetch(request: Request, env: WorkerEnv, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    if (request.method === 'GET' && isPreviewPage(url)) return previewPage(request, env.ASSETS);
    if (url.pathname.startsWith('/api/push/')) return handlePush(request, env);
    if (!url.pathname.startsWith('/api/nlt/')) return env.ASSETS.fetch(request);
    if (request.method !== 'GET') return new Response('Method not allowed', { status: 405 });
    if (!env.NLT_API_KEY) return Response.json({ available: false }, { status: 503 });

    if (url.pathname === '/api/nlt/status') {
      return Response.json({ available: true, bibleId: NLT_BIBLE_ID });
    }

    const chapter = /^\/api\/nlt\/chapter\/([^/]+)\/(\d{1,3})$/.exec(url.pathname);
    const search = url.pathname === '/api/nlt/search';
    let upstreamPath: string;
    if (chapter && BOOK.test(chapter[1]!) && Number(chapter[2]) >= 1 && Number(chapter[2]) <= 150) {
      upstreamPath = `/chapters/${chapter[1]}.${Number(chapter[2])}?content-type=json&include-notes=false&include-titles=false&include-chapter-numbers=false&include-verse-numbers=false`;
    } else if (search) {
      const query = url.searchParams.get('q')?.trim();
      if (!query || query.length > 120) return new Response('Invalid query', { status: 400 });
      upstreamPath = `/search?query=${encodeURIComponent(query)}&limit=30`;
    } else {
      return new Response('Not found', { status: 404 });
    }

    const upstreamUrl = `${UPSTREAM}${upstreamPath}`;
    const cache = caches.default;
    const cacheKey = new Request(upstreamUrl);
    const cached = await cache.match(cacheKey);
    if (cached) return cached;

    const response = await fetch(upstreamUrl, { headers: { 'api-key': env.NLT_API_KEY } });
    if (!response.ok) {
      console.error(JSON.stringify({ event: 'nlt-upstream-error', status: response.status }));
      return Response.json({ error: 'NLT is temporarily unavailable.' }, { status: 502 });
    }
    const result = new Response(response.body, {
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': `public, max-age=${CACHE_SECONDS}`,
      },
    });
    ctx.waitUntil(cache.put(cacheKey, result.clone()));
    return result;
  },
} satisfies ExportedHandler<WorkerEnv>;
