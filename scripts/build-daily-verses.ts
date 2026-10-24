// The verse of the day for the 8:00 notification (docs/SHARING-AND-DAILY-VERSE.md). The Worker
// can't parse the Bible on each run, so this writes the day-by-day list it sends, in the app's
// own order, with the BSB text (public domain).
// Run after changing src/features/bible-app/dailyVerses.ts:
//   npx tsx --tsconfig tsconfig.app.json scripts/build-daily-verses.ts
import { readFileSync, writeFileSync } from 'node:fs';
import { formatRef, parseRef, toOsis } from '../src/features/bible/ref';
import { SHUFFLED } from '../src/features/bible-app/dailyVerses';

interface BibleFile {
  books: { osis: string; chapters: string[][] }[];
}

const bsb = JSON.parse(readFileSync('public/bibles/bsb.json', 'utf8')) as BibleFile;
const book = new Map(bsb.books.map((b) => [b.osis, b]));

const days = SHUFFLED.map((ref) => {
  const range = parseRef(ref);
  if (!range || range.start.book !== range.end.book || range.start.chapter !== range.end.chapter)
    throw new Error(`Daily verse must sit in one chapter: ${ref}`);
  const chapter = book.get(range.start.book)?.chapters[range.start.chapter - 1];
  const verses = chapter?.slice(range.start.verse - 1, range.end.verse);
  if (!verses?.length || verses.some((v) => !v)) throw new Error(`No BSB text for ${ref}`);
  return { reference: formatRef(range), osis: toOsis(range), text: verses.join(' ') };
});

writeFileSync('worker/daily-verses.json', `${JSON.stringify(days, null, 1)}\n`);
console.log(`worker/daily-verses.json: ${days.length} days`);
