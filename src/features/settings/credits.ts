// Open content Lampstand builds on (docs/DECISIONS.md 2026-10-18). Each borrowed source is
// credited here, in Settings › Credits and licences.

export interface CreditSource {
  name: string;
  what: string;
  by: string;
  license: string;
  url: string;
}

export const OPEN_CONTENT: readonly CreditSource[] = [
  {
    name: 'Berean Standard Bible',
    what: 'A modern, readable translation, built in and the default for new readers.',
    by: 'Bible Hub, Discovery Bible, OpenBible.com and the Berean Bible Translation Committee',
    license: 'Public domain (2023)',
    url: 'https://berean.bible/terms.htm',
  },
  {
    name: 'OpenBible.info Topical Bible',
    what: 'Which passages speak to a topic, ranked by readers — used for “Verses for…” in Search and to choose readings for plans.',
    by: 'OpenBible.info',
    license: 'CC BY 4.0',
    url: 'https://www.openbible.info/topics/',
  },
  {
    name: 'Tyndale Open Study Notes',
    what: 'Book introductions and notes on the verses, in the Bible reader and plan days. Adapted from Tyndale Open Study Notes; the original work by Tyndale House Publishers is available for free at tyndaleopenresources.com. Split by book, markup simplified and cross-references linked into the reader; wording unchanged. The notes quote phrases of the New Living Translation as part of Tyndale’s work.',
    by: 'Tyndale House Publishers (2022)',
    license: 'CC BY-SA 4.0',
    url: 'https://tyndaleopenresources.com',
  },
  {
    name: 'Open Bible Stories',
    what: 'The 50 stories in “The Bible in 50 stories” and “God’s big story”, with their comprehension questions. The original work by unfoldingWord is available from openbiblestories.org. Arranged as reading plans; pictures left out; story text unchanged.',
    by: 'unfoldingWord (stories and questions)',
    license: 'CC BY-SA 4.0',
    url: 'https://openbiblestories.org',
  },
  {
    name: 'Morning and Evening',
    what: 'The classic devotional on Today, a reading each morning and evening. Shown as written; Spurgeon quotes the King James Version in his text.',
    by: 'Charles H. Spurgeon (1865), from the Christian Classics Ethereal Library',
    license: 'Public domain',
    url: 'https://www.ccel.org/s/spurgeon/morn_eve/morn_eve.html',
  },
  {
    name: 'M’Cheyne reading calendar',
    what: 'The classic plan through the Bible in a year (the M’Cheyne plan). Calendar data from The M’Cheyne Plan app by Andrew Burks, under the Apache License 2.0.',
    by: 'Robert Murray M’Cheyne (1842), as published by Andrew Bonar',
    license: 'Public domain (calendar); Apache-2.0 (data)',
    url: 'https://github.com/willswire/mcheyne',
  },
];

export const LAMPSTAND_PLANS =
  'Reading plans marked “Lampstand” are written for the app, in our own words; Scripture always comes from the translation you choose.';
