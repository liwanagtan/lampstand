import { resolveScheme } from './theme';

it('keeps light appearance for saved modes and either OS preference while dark mode is paused', () => {
  for (const mode of ['light', 'dark', 'system'] as const)
    for (const systemDark of [true, false]) expect(resolveScheme(mode, systemDark)).toBe('light');
});

it('ignores a previously saved dark preference and prevents writing it again', async () => {
  const { db } = await import('@/db/db');
  const { useSettings } = await import('./settingsStore');
  await db.settings.put({ key: 'uiMode', value: 'dark' });
  await useSettings.getState().load();
  expect(useSettings.getState().uiMode).toBe('light');
  await useSettings.getState().set('uiMode', 'dark');
  expect(useSettings.getState().uiMode).toBe('light');
  expect((await db.settings.get('uiMode'))?.value).toBe('light');
});
