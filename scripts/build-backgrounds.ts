// Downloads the curated background images (scripts/backgrounds.sources.json), resizes them to
// 1920×1080 and compresses to WebP in public/backgrounds, and writes the manifest and
// LICENSES.md (PRD §13 milestone 5, §14 open questions). Run: npm run backgrounds
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

interface Source {
  id: string;
  description: string;
  title: string;
  author: string;
  license: string;
  page: string;
  thumb: string;
}

export interface BackgroundEntry {
  id: string;
  description: string;
  file: string;
  thumb: string;
  author: string;
  license: string;
  source: string;
}

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const CACHE = join(ROOT, 'scripts/.cache/backgrounds');
const OUT = join(ROOT, 'public/backgrounds');
const sources = JSON.parse(
  readFileSync(join(ROOT, 'scripts/backgrounds.sources.json'), 'utf8'),
) as Source[];

async function main() {
  mkdirSync(CACHE, { recursive: true });
  mkdirSync(OUT, { recursive: true });
  const manifest: BackgroundEntry[] = [];
  for (const s of sources) {
    const raw = join(CACHE, `${s.id}.jpg`);
    if (!existsSync(raw)) {
      console.log(`Downloading ${s.title}`);
      execFileSync('curl', [
        '-sfL',
        '-A',
        'LampstandBuild/1.0 (offline church presentation app)',
        '-o',
        raw,
        s.thumb,
      ]);
      execFileSync('sleep', ['1']);
    }
    const file = `${s.id}.webp`;
    const thumb = `${s.id}.thumb.webp`;
    await sharp(raw)
      .rotate()
      .resize(1920, 1080, { fit: 'cover', position: 'attention' })
      .webp({ quality: 72, effort: 6 })
      .toFile(join(OUT, file));
    await sharp(raw)
      .rotate()
      .resize(384, 216, { fit: 'cover', position: 'attention' })
      .webp({ quality: 70 })
      .toFile(join(OUT, thumb));
    console.log(`  ${file} ${(statSync(join(OUT, file)).size / 1024).toFixed(0)} KB`);
    manifest.push({
      id: s.id,
      description: s.description,
      file,
      thumb,
      author: s.author,
      license: s.license,
      source: s.page,
    });
  }
  writeFileSync(join(OUT, 'index.json'), JSON.stringify(manifest, null, 2) + '\n');
  const lines = [
    '# Background image licenses',
    '',
    'Bundled backgrounds come from Wikimedia Commons. Each is public domain, CC0 or CC BY; CC BY images are credited here and in Settings → About.',
    'Images were resized to 1920×1080 and compressed to WebP.',
    '',
    '| File | Description | Author | License | Source |',
    '| --- | --- | --- | --- | --- |',
    ...manifest.map(
      (m) =>
        `| ${m.file} | ${m.description} | ${m.author || 'Unknown'} | ${m.license} | [${m.source.split('File:')[1] ?? 'link'}](${m.source}) |`,
    ),
    '',
  ];
  writeFileSync(join(OUT, 'LICENSES.md'), lines.join('\n'));
  console.log('Wrote index.json and LICENSES.md');
}

void main();
