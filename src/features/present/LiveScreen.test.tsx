import type { ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import type { StoredSlide } from '@/schema/presentation';
import { INITIAL_LIVE, type LiveSnapshot } from './live/types';
import { LiveScreen } from './LiveScreen';

// Layout is exercised in Chrome; here render the scaled stage's children without ResizeObserver.
vi.mock('@/slides/SlideStage', () => ({
  SlideStage: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

const description = 'Operator-only missing background';
function snapshot(type: 'title' | 'point' | 'image'): LiveSnapshot {
  const background = { type: 'image' as const, description };
  const slide: StoredSlide =
    type === 'image'
      ? { id: 'one', type, background }
      : { id: 'one', type, heading: 'Audience content', background };
  return {
    rev: 1,
    changedAt: 0,
    live: { ...INITIAL_LIVE, theme: 'lampstand', presentationId: 'test' },
    presentation: { schemaVersion: 2, title: 'Test', slides: [slide] },
    translation: 'KJV',
    logoAssetId: null,
    reduceMotion: true,
    posterAnimated: false,
  };
}

it.each(['title', 'point', 'image'] as const)(
  'keeps %s background notes and dashed borders in operator Live',
  (type) => {
    const { container } = render(<LiveScreen snapshot={snapshot(type)} showMediaPlaceholders />);
    expect(screen.getByText(description)).toBeInTheDocument();
    expect(container.querySelector('.placeholder')).not.toBeNull();
  },
);

it.each(['title', 'point', 'image'] as const)(
  'hides %s background notes and dashed borders on audience output, including its initial preview frame',
  (type) => {
    const { container } = render(<LiveScreen snapshot={snapshot(type)} />);
    expect(screen.queryByText(description)).not.toBeInTheDocument();
    expect(container.querySelector('.placeholder')).toBeNull();
  },
);

it('keeps the sermon poster clean on audience output', () => {
  const value = snapshot('title');
  value.live.screen = 'sermon';
  const { container } = render(<LiveScreen snapshot={value} />);
  expect(screen.queryByText(description)).not.toBeInTheDocument();
  expect(container.querySelector('.placeholder')).toBeNull();
});
