/* Lampstand reading reminders in the service worker (docs/PRD-ADDENDUM-GROW.md, milestone 29).
   Android, installed app: the periodic background check reminds you once a day, after your
   reading time, if you haven't read yet. A tap on any reminder opens Lampstand. */

const TAG = 'lampstand-reminder';
const pad = (n) => String(n).padStart(2, '0');
const localDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

// The page names the profile it opened (src/db/activeProfile.ts); remind from that one.
async function activeDbName() {
  try {
    const res = await caches.match('/__lampstand/active-db', { cacheName: 'lampstand-profile' });
    const name = res && (await res.text());
    return name && /^lampstand(-account-[\w-]+)?$/.test(name) ? name : 'lampstand';
  } catch {
    return 'lampstand';
  }
}

async function openDb() {
  const name = await activeDbName();
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(name);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
function getAll(db, store) {
  return new Promise((resolve) => {
    try {
      const req = db.transaction(store).objectStore(store).getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    } catch {
      resolve([]);
    }
  });
}
function put(db, store, value) {
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(store, 'readwrite');
      tx.objectStore(store).put(value);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

async function maybeRemind() {
  const db = await openDb();
  const settings = await getAll(db, 'settings');
  const row = settings.find((r) => r.key === 'reminders');
  const r = row && row.value;
  if (!r) return;
  const now = new Date();
  const today = localDate(now);
  const due = [
    { kind: 'morning', value: r },
    { kind: 'reading', value: r.reading },
  ].filter(({ value }) => {
    if (!value?.enabled || value.lastNotified === today) return false;
    const [h, m] = String(value.time || '07:00')
      .split(':')
      .map(Number);
    return (
      Number.isInteger(h) &&
      Number.isInteger(m) &&
      now.getHours() * 60 + now.getMinutes() >= h * 60 + m
    );
  });
  if (!due.length) return;
  const plans = await getAll(db, 'plans');
  const entries = await getAll(db, 'entries');
  const readPlan = plans.some((p) =>
    Object.values(p.doneAt || {}).some((t) => localDate(new Date(t)) === today),
  );
  const wrote = entries.some((e) => e.date === today);
  const updated = { ...r };
  for (const { kind } of due) {
    if (kind === 'morning') updated.lastNotified = today;
    else updated.reading = { ...r.reading, lastNotified: today };
  }
  await put(db, 'settings', { key: 'reminders', value: updated });
  if (readPlan || wrote) return;
  for (const { kind } of due) {
    await self.registration.showNotification('Time for today’s reading', {
      body: 'A few quiet minutes in the Word.',
      tag: `lampstand-${kind}-reminder`,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      data: { url: '/' },
    });
  }
}

self.addEventListener('periodicsync', (event) => {
  if (event.tag === TAG) event.waitUntil(maybeRemind());
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      const open = list.find((c) => 'focus' in c);
      if (open) {
        open.navigate(url);
        return open.focus();
      }
      return self.clients.openWindow(url);
    }),
  );
});
