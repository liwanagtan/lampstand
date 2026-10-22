// @vitest-environment node
import { db } from '@/db/db';
import sample from '../../../tests/fixtures/sample-sermon.lampstand.json';
import { validatePresentation } from '@/schema/validate';
import { createPresentation } from '@/features/library/presentations';
import { createBackup, restoreBackup } from './backup';

it('backs up presentations and assets and restores them into an empty library', async () => {
  const r = validatePresentation(sample);
  if (!r.ok) throw new Error('invalid');
  const rec = await createPresentation(r.presentation);
  await db.assets.put({
    id: 'a1',
    blob: new Blob([new Uint8Array([1, 2, 3])], { type: 'image/webp' }),
    mime: 'image/webp',
    width: 1,
    height: 1,
    size: 3,
    createdAt: 1,
  });

  const blob = await createBackup();
  const text = await blob.text();
  expect(JSON.parse(text)).toMatchObject({ format: 'lampstand-backup', version: 1 });

  await db.presentations.clear();
  await db.assets.clear();
  const file = new File([text], 'backup.json', { type: 'application/json' });
  const summary = await restoreBackup(file);
  expect(summary).toEqual({ added: 1, updated: 0, skipped: 0, assets: 1, study: 0 });
  expect((await db.presentations.get(rec.id))?.title).toBe('A Lamp in the Dark');
  const asset = await db.assets.get('a1');
  expect(new Uint8Array(await asset!.blob.arrayBuffer())).toEqual(new Uint8Array([1, 2, 3]));

  // Restoring again changes nothing.
  expect(await restoreBackup(file)).toEqual({
    added: 0,
    updated: 0,
    skipped: 1,
    assets: 0,
    study: 0,
  });
});

it('backs up Bible marks, plan progress and journal entries', async () => {
  await db.marks.put({
    id: 'b:JHN.3.16',
    kind: 'bookmark',
    ref: 'JHN.3.16',
    book: 'JHN',
    chapter: 3,
    createdAt: 1,
    updatedAt: 1,
  });
  await db.plans.put({ planId: 'gospels-40', startedAt: 1, done: [1, 2], rhythm: 'weekly', pausedAt: 4, updatedAt: 5 });
  await db.entries.put({
    id: 'e-1',
    date: '2026-10-16',
    kind: 'journal',
    body: 'Thanks',
    createdAt: 1,
    updatedAt: 3,
  });
  const text = await (await createBackup()).text();
  await Promise.all([db.marks.clear(), db.plans.clear(), db.entries.clear()]);
  const summary = await restoreBackup(new File([text], 'b.json'));
  expect(summary.study).toBe(3);
  expect(await db.plans.get('gospels-40')).toMatchObject({ done: [1, 2], rhythm: 'weekly', pausedAt: 4 });
  expect((await db.entries.get('e-1'))?.body).toBe('Thanks');
});

it('restores journal days from older backups as entries', async () => {
  await db.entries.clear();
  const old = {
    format: 'lampstand-backup',
    version: 1,
    exportedAt: '2026-10-16T00:00:00Z',
    presentations: [],
    settings: [],
    assets: [],
    journal: [{ date: '2026-10-15', answers: { notice: 'Rest' }, createdAt: 1, updatedAt: 2 }],
  };
  await restoreBackup(new File([JSON.stringify(old)], 'old.json'));
  expect((await db.entries.get('j-2026-10-15'))?.answers).toEqual({ notice: 'Rest' });
});

it('rejects files that are not backups', async () => {
  await expect(restoreBackup(new File(['{"a":1}'], 'x.json'))).rejects.toThrow(
    'not a Lampstand backup',
  );
  await expect(restoreBackup(new File(['nope'], 'x.json'))).rejects.toThrow("isn't a valid backup");
});
