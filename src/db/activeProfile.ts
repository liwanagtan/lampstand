// The reminder service worker cannot see which profile the page opened, so the page names the
// active database in a small cache entry that public/reminder-sw.js reads.
export const ACTIVE_DB_CACHE = 'lampstand-profile';
export const ACTIVE_DB_URL = '/__lampstand/active-db';

export async function publishActiveDatabase(name: string): Promise<void> {
  try {
    const cache = await caches.open(ACTIVE_DB_CACHE);
    await cache.put(ACTIVE_DB_URL, new Response(name, { headers: { 'Content-Type': 'text/plain' } }));
  } catch {
    // Without Cache Storage the worker keeps reminding from the guest profile.
  }
}
