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
  await db.plans.put({ planId: 'gospels-40', startedAt: 1, done: [1, 2], updatedAt: 2 });
  await db.journal.put({
    date: '2026-10-16',
    answers: { a: 'Thanks' },
    createdAt: 1,
    updatedAt: 3,
  });
  const text = await (await createBackup()).text();
  await Promise.all([db.marks.clear(), db.plans.clear(), db.journal.clear()]);
  const summary = await restoreBackup(new File([text], 'b.json'));
  expect(summary.study).toBe(3);
  expect((await db.plans.get('gospels-40'))?.done).toEqual([1, 2]);
  expect((await db.journal.get('2026-10-16'))?.answers.a).toBe('Thanks');
});

it('rejects files that are not backups', async () => {
  await expect(restoreBackup(new File(['{"a":1}'], 'x.json'))).rejects.toThrow(
    'not a Lampstand backup',
  );
  await expect(restoreBackup(new File(['nope'], 'x.json'))).rejects.toThrow("isn't a valid backup");
});
