import { contrastRatio } from '@/design-system/contrast';
import { TEMPLATES } from './templates';

describe.each(Object.values(TEMPLATES))('$name template', (t) => {
  it('text and muted text are ≥ 7:1 on the background (PRD §10)', () => {
    expect(contrastRatio(t.colors.text, t.colors.background)).toBeGreaterThanOrEqual(7);
    expect(contrastRatio(t.colors.muted, t.colors.background)).toBeGreaterThanOrEqual(7);
  });

  it('accent text (references, emphasis) is ≥ 7:1 on the background', () => {
    expect(contrastRatio(t.colors.accent, t.colors.background)).toBeGreaterThanOrEqual(7);
  });

  it('solid tones keep text ≥ 7:1', () => {
    for (const tone of Object.values(t.tones)) {
      expect(contrastRatio(t.colors.text, tone)).toBeGreaterThanOrEqual(7);
    }
  });
});
