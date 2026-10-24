import { LampstandDB } from './db';

describe('LampstandDB', () => {
  it('upgrades saved v1 decks when opening an existing library', async () => {
    const { default: Dexie } = await import('dexie');
    const old = new Dexie('test-slides-v2-upgrade');
    old
      .version(7)
      .stores({ presentations: 'id, title, speaker, createdAt, updatedAt, lastPresentedAt' });
    await old.table('presentations').put({
      id: 'deck',
      title: 'Keep',
      createdAt: 1,
      updatedAt: 2,
      data: {
        schemaVersion: 1,
        title: 'Keep',
        slides: [
          { id: 'reading', type: 'verse', ref: 'John 3:16', notes: 'Keep notes' },
          { id: 'list', type: 'list', heading: 'Keep', items: ['a', 'b'], build: true },
        ],
      },
    });
    old.close();
    const db = new LampstandDB('test-slides-v2-upgrade');
    const record = await db.presentations.get('deck');
    expect(record).toMatchObject({
      updatedAt: 2,
      data: {
        schemaVersion: 2,
        slides: [
          { id: 'reading', type: 'reading', notes: 'Keep notes' },
          { id: 'list', reveal: true },
        ],
      },
    });
    db.close();
    await db.delete();
  });
  it('opens with all PRD tables', async () => {
    const db = new LampstandDB('test-open');
    await db.open();
    expect(db.tables.map((t) => t.name).sort()).toEqual(
      [
        'assets',
        'entries',
        'history',
        'journal',
        'marks',
        'planDefs',
        'plans',
        'presentations',
        'settings',
        'syncBase',
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

  it('indexes reflections by their plan reading and Bible chapter', async () => {
    const db = new LampstandDB('test-reflection-indexes');
    await db.entries.bulkPut([
      {
        id: 'plan',
        date: '2026-10-22',
        kind: 'reflection',
        body: 'A thought',
        planId: 'gospels-40',
        planDay: 2,
        createdAt: 1,
        updatedAt: 1,
      },
      {
        id: 'chapter',
        date: '2026-10-22',
        kind: 'reflection',
        body: 'Another thought',
        chapterBook: 'JHN',
        chapterNumber: 1,
        createdAt: 1,
        updatedAt: 1,
      },
    ]);
    expect((await db.entries.where('[planId+planDay]').equals(['gospels-40', 2]).first())?.id).toBe(
      'plan',
    );
    expect(
      (await db.entries.where('[chapterBook+chapterNumber]').equals(['JHN', 1]).first())?.id,
    ).toBe('chapter');
    db.close();
  });
});

it('moves version-2 journal days into entries', async () => {
  const name = 'test-journal-upgrade';
  const { default: Dexie } = await import('dexie');
  const v2 = new Dexie(name);
  v2.version(2).stores({ journal: 'date, updatedAt' });
  await v2.table('journal').put({
    date: '2026-10-16',
    ref: 'PSA.46.10',
    answers: { notice: 'Be still' },
    createdAt: 1,
    updatedAt: 2,
  });
  v2.close();
  const db = new LampstandDB(name);
  const entries = await db.entries.toArray();
  expect(entries).toEqual([
    expect.objectContaining({ date: '2026-10-16', kind: 'reflection', ref: 'PSA.46.10' }),
  ]);
  expect(entries[0]!.answers).toEqual({ notice: 'Be still' });
  db.close();
});
