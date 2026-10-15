import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FeatureBoundary } from './FeatureBoundary';
import { ShortcutHint } from './ShortcutHint';
import { useSettings } from '@/features/settings/settingsStore';

function Boom(): never {
  throw new Error('boom');
}

describe('FeatureBoundary', () => {
  it('contains a failure to its own part of the screen', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <>
        <FeatureBoundary name="The side panel">
          <Boom />
        </FeatureBoundary>
        <p>Still here</p>
      </>,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('The side panel hit a problem');
    expect(screen.getByText('Still here')).toBeInTheDocument();
    spy.mockRestore();
  });

  it('renders nothing when silent', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { container } = render(
      <FeatureBoundary name="Output" silent>
        <Boom />
      </FeatureBoundary>,
    );
    expect(container).toBeEmptyDOMElement();
    spy.mockRestore();
  });
});

describe('ShortcutHint', () => {
  it('shows the shortcut for the first five mouse uses only', async () => {
    useSettings.setState({ shortcutHints: {} });
    render(
      <ShortcutHint id="next" keys="→">
        <button type="button">Next</button>
      </ShortcutHint>,
    );
    const btn = screen.getByRole('button', { name: 'Next' });
    for (let i = 0; i < 5; i++) await userEvent.click(btn);
    expect(useSettings.getState().shortcutHints.next).toBe(5);
    expect(screen.getAllByRole('status').at(-1)).toHaveTextContent('Tip: press →');
    await userEvent.click(btn);
    expect(useSettings.getState().shortcutHints.next).toBe(5);
  });
});
