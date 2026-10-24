import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import sermon from '../../../../tests/fixtures/rich-toward-god.lampstand.json';
import { validatePresentation } from '@/schema/validate';
import { INITIAL_LIVE } from '../live/types';
import { useControl } from '../live/controlStore';
import { useVerses } from './verseStore';
import { QueuePanel } from './VersePanels';

vi.mock('../live/pageCounts', () => ({ countPages: async () => 1 }));

const result = validatePresentation(sermon);
if (!result.ok) throw new Error('Invalid test sermon');
const presentation = result.presentation;

beforeEach(() => {
  useControl.setState({
    live: { ...INITIAL_LIVE, presentationId: 'test', slideIndex: 6 },
    presentation,
  });
  useVerses.getState().init(presentation, 'KJV', 'popup');
});

it('queues attachments without showing anything, and puts this slide first without duplicates', () => {
  render(<QueuePanel translation="KJV" />);
  const current = screen.getByRole('list', { name: 'For this slide' });
  expect(screen.getAllByRole('list')[0]).toBe(current);
  expect(within(current).getAllByRole('button')).toHaveLength(1);
  expect(current).toHaveTextContent('Psalm 24:1');
  expect(screen.getByRole('list', { name: 'Other slide verses' })).not.toHaveTextContent(
    'Psalm 24:1',
  );
  expect(useControl.getState().live.overlay).toBeNull();
  act(() => useControl.getState().dispatch({ type: 'goTo', index: 15 }));
  expect(current).toHaveTextContent('2 Corinthians 8:9');
  expect(current).not.toHaveTextContent('Psalm 24:1');
  expect(useControl.getState().live.overlay).toBeNull();
});

it('shows an attachment in the chosen regular mode and removes it without altering the slide', async () => {
  render(<QueuePanel translation="KJV" />);
  fireEvent.click(within(screen.getByRole('list', { name: 'For this slide' })).getByRole('button'));
  await waitFor(() =>
    expect(useControl.getState().live.overlay).toMatchObject({
      ref: 'PSA.24.1',
      mode: 'popup',
      translation: 'KJV',
    }),
  );
  expect(useControl.getState().live.slideIndex).toBe(6);
  act(() => useControl.getState().dispatch({ type: 'clearOverlay' }));
  expect(useControl.getState().live).toMatchObject({ overlay: null, slideIndex: 6 });
});
