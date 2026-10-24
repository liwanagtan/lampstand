// Link previews for shared links (docs/SHARING-AND-DAILY-VERSE.md). A chat app fetching a
// Lampstand link gets the app's page with absolute preview tags; a shared verse (/v/GEN.28.15)
// also names its passage. The page itself is the same app either way.
import { referenceFor } from './reference';

/** Whether a request is a page a preview might be made from. */
export function isPreviewPage(url: URL): boolean {
  return url.pathname === '/' || url.pathname.startsWith('/v/');
}

/** The app's page, with its preview tags filled in for this link. */
export async function previewPage(request: Request, assets: Fetcher): Promise<Response> {
  const url = new URL(request.url);
  const served = await assets.fetch(new Request(new URL('/', url), request));
  if (!served.ok || !served.headers.get('content-type')?.includes('text/html')) return served;
  // Say UTF-8 in the header too, so a preview never garbles the "·" in a title.
  const page = new Response(served.body, served);
  page.headers.set('content-type', 'text/html; charset=utf-8');

  const reference = url.pathname.startsWith('/v/')
    ? referenceFor(decodeURIComponent(url.pathname.slice(3)))
    : null;
  const tags: Record<string, string> = {
    'og:url': url.origin + url.pathname,
    'og:image': `${url.origin}/og/lampstand.png`,
    ...(reference && {
      'og:title': `${reference} · Lampstand`,
      'og:description': `Read ${reference} in Lampstand, a quiet place to read the Bible each day.`,
    }),
  };
  return new HTMLRewriter()
    .on('meta[property]', {
      element(el) {
        const value = tags[el.getAttribute('property') ?? ''];
        if (value) el.setAttribute('content', value);
      },
    })
    .on('title', {
      element(el) {
        if (reference) el.setInnerContent(`${reference} · Lampstand`);
      },
    })
    .transform(page);
}
