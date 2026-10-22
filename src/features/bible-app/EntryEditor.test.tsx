import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { db } from '@/db/db';
import { EntryEditor } from './EntryEditor';

afterEach(async () => {
  await db.entries.clear();
});

it('saves a pending private reflection when the PWA is hidden', async () => {
  const user = userEvent.setup();
  render(
    <EntryEditor
      entry={{
        id: 'leaving',
        date: '2026-10-22',
        kind: 'reflection',
        ref: 'JHN.1.1',
        title: 'John 1',
        body: '',
        chapterBook: 'JHN',
        chapterNumber: 1,
      }}
    />,
  );
  await user.type(screen.getByRole('textbox', { name: 'Your entry' }), 'A thought before leaving');
  Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
  try {
    document.dispatchEvent(new Event('visibilitychange'));
    await waitFor(async () =>
      expect((await db.entries.get('leaving'))?.body).toBe('A thought before leaving'),
    );
  } finally {
    delete (document as { visibilityState?: string }).visibilityState;
  }
});
