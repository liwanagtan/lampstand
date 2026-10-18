// Converts public domain source texts into the Lampstand translation format (PRD §6):
//   public/bibles/<code>.json   one file per translation
//   public/bibles/index.json    manifest the first-run loader reads
// Sources are downloaded once into scripts/.cache. Run: npm run bibles
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BOOKS } from '../src/features/bible/books';
import { TranslationFileSchema, type TranslationFile } from '../src/schema/translation';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const CACHE = join(ROOT, 'scripts/.cache');
const OUT = join(ROOT, 'public/bibles');

const SCROLLMAPPER =
  'https://raw.githubusercontent.com/scrollmapper/bible_databases/master/formats/json';

interface Source {
  code: string;
  name: string;
  license: string;
  source: string;
  load: () => string[][][]; // [book][chapter][verse]
  clean?: (text: string) => string;
}

function download(url: string, file: string): string {
  const path = join(CACHE, file);
  if (!existsSync(path)) {
    console.log(`Downloading ${url}`);
    execFileSync('curl', ['-sfL', '-o', path, url]);
  }
  return path;
}

interface ScrollmapperFile {
  books: {
    name: string;
    chapters: { chapter: number; verses: { verse: number; text: string }[] }[];
  }[];
}

function loadScrollmapper(file: string): string[][][] {
  const data = JSON.parse(
    readFileSync(download(`${SCROLLMAPPER}/${file}`, file), 'utf8'),
  ) as ScrollmapperFile;
  if (data.books.length !== 66)
    throw new Error(`${file}: expected 66 books, got ${data.books.length}`);
  return data.books.map((b) =>
    b.chapters.map((c, ci) => {
      if (c.chapter !== ci + 1) throw new Error(`${file}: ${b.name} chapter order`);
      return c.verses.map((v, vi) => {
        if (v.verse !== vi + 1) throw new Error(`${file}: ${b.name} ${c.chapter}:${v.verse} order`);
        return v.text;
      });
    }),
  );
}

function loadEbibleVpl(id: string): string[][][] {
  const dir = join(CACHE, `ebible-${id}`);
  mkdirSync(dir, { recursive: true });
  const zip = download(`https://ebible.org/Scriptures/${id}_vpl.zip`, `${id}_vpl.zip`);
  const txt = join(dir, `${id}_vpl.txt`);
  if (!existsSync(txt)) execFileSync('unzip', ['-o', '-q', zip, `${id}_vpl.txt`, '-d', dir]);
  const byBook = new Map<string, string[][]>();
  for (const line of readFileSync(txt, 'utf8')
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)) {
    if (!line.trim()) continue;
    const m = /^([1-3A-Z]{3}) (\d+):(\d+) (.*)$/.exec(line);
    if (!m) throw new Error(`${id}: unexpected line ${line.slice(0, 60)}`);
    const [, code, c, v, text] = m as unknown as [string, string, string, string, string];
    const chapters = byBook.get(code) ?? [];
    byBook.set(code, chapters);
    const chapter = (chapters[Number(c) - 1] ??= []);
    if (chapter.length > Number(v) - 1) throw new Error(`${id}: ${code} ${c}:${v} out of order`);
    // Verses a translation leaves out (e.g. BSB Matthew 17:21) are kept as empty verses.
    while (chapter.length < Number(v) - 1) chapter.push('');
    chapter.push(text);
  }
  // The VPL text uses BibleWorks book codes (SOL, JOH, …); books come in canonical order.
  const books = [...byBook.values()];
  if (books.length !== 66) throw new Error(`${id}: expected 66 books, got ${books.length}`);
  return books;
}

const PSALM_119_HEADING = /(^|\s)[א-ת] [A-Z]+\.(\s|$)/g;

/** Typographic cleanup only; never changes wording. */
const tidy = (t: string) =>
  t
    .replace(PSALM_119_HEADING, '$1')
    .replace(/\s{2,}/g, ' ')
    .trim();

const SOURCES: Source[] = [
  {
    code: 'BSB',
    name: 'Berean Standard Bible',
    license:
      'Public domain (dedicated April 30, 2023). The Holy Bible, Berean Standard Bible, BSB, is produced in cooperation with Bible Hub, Discovery Bible, OpenBible.com, and the Berean Bible Translation Committee.',
    source: 'eBible.org (engbsb)',
    load: () => loadEbibleVpl('engbsb'),
    clean: tidy,
  },
  {
    code: 'KJV',
    name: 'King James Version',
    license:
      'Public domain (1769 Oxford edition). In the United Kingdom, rights are vested in the Crown.',
    source: 'scrollmapper/bible_databases (KJV.json)',
    load: () => loadScrollmapper('KJV.json'),
    // Square brackets mark words printed in italics.
    clean: (t) => tidy(t.replace(/[[\]]/g, '')),
  },
  {
    code: 'WEB',
    name: 'World English Bible',
    license:
      'Public domain. "World English Bible" is a trademark of eBible.org; the text is included unmodified.',
    source: 'eBible.org (engwebp)',
    load: () => loadEbibleVpl('engwebp'),
  },
  {
    code: 'ASV',
    name: 'American Standard Version (1901)',
    license: 'Public domain',
    source: 'scrollmapper/bible_databases (ASV.json)',
    load: () => loadScrollmapper('ASV.json'),
    clean: (t) => tidy(t.replace(/\[(Selah)\]?/g, '$1')),
  },
  {
    code: 'YLT',
    name: "Young's Literal Translation",
    license: 'Public domain',
    source: 'scrollmapper/bible_databases (YLT.json)',
    load: () => loadScrollmapper('YLT.json'),
    // The source marks opening quotes with a backtick.
    clean: (t) => tidy(t.replace(/`/g, '‘').replace(/'/g, '’').replace(/--/g, '—')),
  },
  {
    code: 'DBY',
    name: 'Darby Translation',
    license: 'Public domain',
    source: 'scrollmapper/bible_databases (Darby.json)',
    load: () => loadScrollmapper('Darby.json'),
    // The source drops the space before "God" and marks supplied words with [ ] and *.
    clean: (t) =>
      tidy(
        t
          .replace(/[[\]*]/g, '')
          .replace(/([a-z])(God)/g, '$1 $2')
          .replace(/\s+([,;:.!?])/g, '$1'),
      ),
  },
];

export interface BibleManifest {
  version: number;
  translations: {
    code: string;
    name: string;
    file: string;
    hash: string;
    bytes: number;
    verses: number;
  }[];
}

function main() {
  mkdirSync(CACHE, { recursive: true });
  mkdirSync(OUT, { recursive: true });
  const only = process.argv.slice(2).map((s) => s.toUpperCase());
  const manifest: BibleManifest = { version: 1, translations: [] };

  for (const src of SOURCES) {
    const outFile = `${src.code.toLowerCase()}.json`;
    const outPath = join(OUT, outFile);
    if (!only.length || only.includes(src.code)) {
      const data = src.load();
      const file: TranslationFile = {
        format: 'lampstand-bible',
        version: 1,
        code: src.code,
        name: src.name,
        language: 'en',
        license: src.license,
        source: src.source,
        books: BOOKS.map((b, i) => ({
          osis: b.code,
          name: b.name,
          chapters: data[i]!.map((ch) => ch.map((v) => (src.clean ? src.clean(v) : v))),
        })),
      };
      TranslationFileSchema.parse(file);
      const empty = file.books.flatMap((b) => b.chapters.flat()).filter((v) => !v.trim()).length;
      // A few verses are omitted on purpose in some translations (e.g. ASV Matthew 17:21).
      if (empty > 30) throw new Error(`${src.code}: ${empty} empty verses`);
      if (empty) console.log(`  ${src.code}: ${empty} verses omitted by this translation`);
      writeFileSync(outPath, JSON.stringify(file));
      console.log(`Wrote ${outFile}`);
    }
    const json = readFileSync(outPath, 'utf8');
    const parsed = JSON.parse(json) as TranslationFile;
    manifest.translations.push({
      code: src.code,
      name: src.name,
      file: outFile,
      hash: createHash('sha256').update(json).digest('hex').slice(0, 16),
      bytes: Buffer.byteLength(json),
      verses: parsed.books.reduce((n, b) => n + b.chapters.reduce((m, c) => m + c.length, 0), 0),
    });
  }
  writeFileSync(join(OUT, 'index.json'), JSON.stringify(manifest, null, 2) + '\n');
  console.log('Wrote index.json');
}

main();
