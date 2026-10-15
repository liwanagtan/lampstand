import { keyName } from './useShortcuts';

const ev = (init: KeyboardEventInit) => new KeyboardEvent('keydown', init);

it('names keys consistently', () => {
  expect(keyName(ev({ key: 'ArrowRight' }))).toBe('ArrowRight');
  expect(keyName(ev({ key: 'ArrowRight', altKey: true }))).toBe('Alt+ArrowRight');
  expect(keyName(ev({ key: 'B', shiftKey: true }))).toBe('b');
  expect(keyName(ev({ key: ' ' }))).toBe('Space');
  expect(keyName(ev({ key: 'k', ctrlKey: true }))).toBe('Mod+k');
  expect(keyName(ev({ key: 'Enter', shiftKey: true }))).toBe('Shift+Enter');
  expect(keyName(ev({ key: '?', shiftKey: true }))).toBe('?');
});
