import { render, screen } from '@testing-library/react';
import sample from '../../tests/fixtures/sample-sermon.lampstand.json';
import { validatePresentation } from '@/schema/validate';
import type { StoredSlide } from '@/schema/presentation';
import { getTemplate } from '@/templates/templates';
import { SlideView } from './SlideView';
import { formatClock } from './clock';

const r = validatePresentation(sample);
if (!r.ok) throw new Error('invalid sample');
const slides = r.presentation.slides;
const find = <T extends StoredSlide['type']>(type: T) =>
  slides.find((s) => s.type === type)! as Extract<StoredSlide, { type: T }>;

function renderSlide(slide: StoredSlide, extra: Partial<Parameters<typeof SlideView>[0]> = {}) {
  return render(
    <div data-testid="stage">
      <SlideView
        slide={slide}
        template={getTemplate('classic')}
        mode="preview"
        translation="KJV"
        {...extra}
      />
    </div>,
  );
}

describe('SlideView', () => {
  it('renders text slides as plain text', () => {
    renderSlide(find('title'));
    expect(screen.getByRole('heading', { name: 'A Lamp in the Dark' })).toBeInTheDocument();
    expect(screen.getByText('Pastor Daniel Cruz')).toBeInTheDocument();
  });

  it('never renders imported text as HTML', () => {
    const slide = { ...find('statement'), text: '<img src=x onerror=alert(1)>Hi' } as StoredSlide;
    const { container } = renderSlide(slide);
    expect(container.querySelector('img')).toBeNull();
    expect(screen.getByText('<img src=x onerror=alert(1)>Hi')).toBeInTheDocument();
  });

  it('reveals build lists one item per step', () => {
    const list = find('list');
    const { container } = renderSlide(list, { buildStep: 1 });
    const items = container.querySelectorAll('li');
    expect(items).toHaveLength(3);
    expect([...items].filter((li) => li.className.includes('hidden'))).toHaveLength(2);
  });

  it('shows all items when not building', () => {
    const { container } = renderSlide(find('list'));
    expect(
      [...container.querySelectorAll('li')].filter((li) => li.className.includes('hidden')),
    ).toHaveLength(0);
  });

  it('renders every slide type in every template without throwing', () => {
    for (const t of ['classic', 'modern', 'warm'] as const) {
      for (const s of slides) {
        const { unmount } = render(
          <SlideView slide={s} template={getTemplate(t)} mode="thumbnail" translation="KJV" />,
        );
        unmount();
      }
    }
  });

  it('falls back to a neutral slide when a renderer throws', () => {
    const broken = { ...find('list'), items: null } as unknown as StoredSlide;
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { container } = renderSlide(broken);
    expect(container.querySelector('svg')).toBeInTheDocument();
    spy.mockRestore();
  });

  it('formats the countdown clock', () => {
    expect(formatClock(5 * 60_000)).toBe('05:00');
    expect(formatClock(61_500)).toBe('01:02');
    expect(formatClock(-10)).toBe('00:00');
  });
});
