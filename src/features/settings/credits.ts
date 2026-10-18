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
