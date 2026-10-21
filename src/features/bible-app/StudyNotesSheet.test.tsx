import { useState } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StudyNotesSheet } from './StudyNotesSheet';
import { STUDY_NOTES_CREDIT } from './studyNotes';

beforeEach(() => {
  vi.stubGlobal('matchMedia', (media: string) => ({
    matches: false,
    media,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
});
afterEach(() => vi.unstubAllGlobals());

function Harness({ inline = false }: { inline?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <MemoryRouter>
      <button onClick={() => setOpen(true)}>Read notes</button>
      <StudyNotesSheet
        open={open}
        onOpenChange={setOpen}
        inline={inline}
        title="John"
        eyebrow="About this book"
        html={['<p>Book introduction.</p>']}
      />
    </MemoryRouter>
  );
}

it('wide study panels keep the reader nonmodal and return focus on Escape', async () => {
  const user = userEvent.setup();
  render(<Harness inline />);
  const trigger = screen.getByRole('button', { name: 'Read notes' });
  await user.click(trigger);
  const panel = screen.getByRole('complementary', { name: 'Study notes' });
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(within(panel).getByText('Book introduction.')).toBeVisible();
  expect(within(panel).getByText(STUDY_NOTES_CREDIT)).toBeVisible();
  await user.keyboard('{Escape}');
  expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
  expect(trigger).toHaveFocus();
});

it('compact study notes remain a closeable dialog with original attribution', async () => {
  const user = userEvent.setup();
  render(<Harness />);
  await user.click(screen.getByRole('button', { name: 'Read notes' }));
  const dialog = screen.getByRole('dialog', { name: 'John' });
  expect(within(dialog).getByText(STUDY_NOTES_CREDIT)).toBeVisible();
  await user.click(within(dialog).getByRole('button', { name: 'Close' }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});
