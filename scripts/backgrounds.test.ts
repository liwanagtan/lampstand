import { existsSync, readFileSync, statSync } from 'node:fs';

const manifest = JSON.parse(readFileSync('public/backgrounds/index.json', 'utf8')) as {
  id: string;
  file: string;
  thumb: string;
  license: string;
  author: string;
}[];

it('bundles about 20 compressed, licensed backgrounds', () => {
  expect(manifest.length).toBeGreaterThanOrEqual(18);
  const licenses = readFileSync('public/backgrounds/LICENSES.md', 'utf8');
  for (const m of manifest) {
    expect(existsSync(`public/backgrounds/${m.file}`)).toBe(true);
    expect(existsSync(`public/backgrounds/${m.thumb}`)).toBe(true);
    expect(statSync(`public/backgrounds/${m.file}`).size).toBeLessThan(900 * 1024);
    expect(m.license).toMatch(/^(CC0|Public domain|CC BY \d\.\d)$/);
    expect(licenses).toContain(m.file);
  }
});
