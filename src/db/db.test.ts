import { LampstandDB } from './db';

describe('LampstandDB', () => {
  it('opens with all PRD tables', async () => {
    const db = new LampstandDB('test-open');
    await db.open();
    expect(db.tables.map((t) => t.name).sort()).toEqual(
      [
        'assets',
        'history',
        'journal',
        'marks',
        'planDefs',
        'plans',
        'presentations',
        'settings',
        'translations',
        'verses',
      ].sort(),
    );
    db.close();
  });

  it('keys verses by translation code and OSIS id', async () => {
    const db = new LampstandDB('test-verses');
    await db.verses.bulkPut([
      { code: 'KJV', osis: 'JHN.3.16', text: 'For God so loved the world' },
      { code: 'WEB', osis: 'JHN.3.16', text: 'For God so loved the world,' },
    ]);
    expect((await db.verses.get(['KJV', 'JHN.3.16']))?.text).toBe('For God so loved the world');
    expect(await db.verses.where('code').equals('WEB').count()).toBe(1);
    db.close();
  });
});
