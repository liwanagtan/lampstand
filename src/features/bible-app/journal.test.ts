import { db } from '@/db/db';
import { hasContent, saveEntry } from './journal';

describe('devotion journal', () => {
  beforeEach(() => db.journal.clear());

  it('saves, updates and removes an empty entry', async () => {
    await saveEntry('2026-10-16', { notice: 'Be still' }, 'PSA.46.10');
    const first = (await db.journal.get('2026-10-16'))!;
    expect(first).toMatchObject({ ref: 'PSA.46.10', answers: { notice: 'Be still' } });
    await saveEntry('2026-10-16', { notice: 'Be still', thanks: 'Rest' }, 'JHN.1.1');
    const second = (await db.journal.get('2026-10-16'))!;
    // The verse an entry was written on stays with it.
    expect(second.ref).toBe('PSA.46.10');
    expect(second.createdAt).toBe(first.createdAt);
    expect(hasContent(second)).toBe(true);
    await saveEntry('2026-10-16', { notice: '  ', thanks: '' });
    expect(await db.journal.get('2026-10-16')).toBeUndefined();
  });
});
