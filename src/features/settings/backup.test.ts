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
  expect(summary).toEqual({ added: 1, updated: 0, skipped: 0, assets: 1 });
  expect((await db.presentations.get(rec.id))?.title).toBe('A Lamp in the Dark');
  const asset = await db.assets.get('a1');
  expect(new Uint8Array(await asset!.blob.arrayBuffer())).toEqual(new Uint8Array([1, 2, 3]));

  // Restoring again changes nothing.
  expect(await restoreBackup(file)).toEqual({ added: 0, updated: 0, skipped: 1, assets: 0 });
});

it('rejects files that are not backups', async () => {
  await expect(restoreBackup(new File(['{"a":1}'], 'x.json'))).rejects.toThrow(
    'not a Lampstand backup',
  );
  await expect(restoreBackup(new File(['nope'], 'x.json'))).rejects.toThrow("isn't a valid backup");
});
