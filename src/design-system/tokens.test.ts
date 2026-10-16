import { colors, tokensCss } from './tokens';
import { contrastRatio } from './contrast';

const surfaces = ['bg', 'surface', 'surface-raised'] as const;

describe.each(['dark', 'light'] as const)('%s tokens meet WCAG AA', (scheme) => {
  const c = colors[scheme];

  it.each(surfaces)('text and muted text on %s are ≥ 4.5:1', (s) => {
    expect(contrastRatio(c.text, c[s])).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(c['text-muted'], c[s])).toBeGreaterThanOrEqual(4.5);
  });

  it.each(surfaces)('UI colors on %s are ≥ 3:1', (s) => {
    // The logo-gold fill always carries accent-contrast text (checked below); gold used on its
    // own as text, icons or outlines is accent-text.
    for (const ui of ['accent-text', 'live', 'success', 'warning'] as const) {
      expect(contrastRatio(c[ui], c[s])).toBeGreaterThanOrEqual(3);
    }
  });

  it.each(surfaces)('gold text on %s is ≥ 4.5:1', (s) => {
    expect(contrastRatio(c['accent-text'], c[s])).toBeGreaterThanOrEqual(4.5);
  });

  it('accent is the logo gold', () => {
    expect(c.accent).toBe('#F2B33D');
  });

  it('text on accent and live fills is ≥ 4.5:1', () => {
    expect(contrastRatio(c['accent-contrast'], c.accent)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(c['live-contrast'], c.live)).toBeGreaterThanOrEqual(4.5);
  });
});

it('exposes tokens as CSS variables', () => {
  const css = tokensCss();
  expect(css).toContain('--color-bg: #0E1116');
  expect(css).toContain('--color-bg: #F7F6F3');
  expect(css).toContain('--space-4: 16px');
  expect(css).toContain('--dur-standard: 220ms');
});
