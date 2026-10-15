import { resolveScheme } from './theme';

describe('resolveScheme', () => {
  it('follows explicit modes', () => {
    expect(resolveScheme('light', true)).toBe('light');
    expect(resolveScheme('dark', false)).toBe('dark');
  });
  it('follows the OS for system', () => {
    expect(resolveScheme('system', true)).toBe('dark');
    expect(resolveScheme('system', false)).toBe('light');
  });
});
