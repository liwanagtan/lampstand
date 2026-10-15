// The 66-book Protestant canon (PRD §6). `code` is the canonical id used in Lampstand
// (JHN.3.16); `osis` is the book id produced by bible-passage-reference-parser.

export interface Book {
  code: string;
  osis: string;
  name: string;
  /** Name used when formatting a single reference, e.g. "Psalm 23". */
  refName: string;
  testament: 'OT' | 'NT';
}

const OT: [string, string, string, string?][] = [
  ['GEN', 'Gen', 'Genesis'],
  ['EXO', 'Exod', 'Exodus'],
  ['LEV', 'Lev', 'Leviticus'],
  ['NUM', 'Num', 'Numbers'],
  ['DEU', 'Deut', 'Deuteronomy'],
  ['JOS', 'Josh', 'Joshua'],
  ['JDG', 'Judg', 'Judges'],
  ['RUT', 'Ruth', 'Ruth'],
  ['1SA', '1Sam', '1 Samuel'],
  ['2SA', '2Sam', '2 Samuel'],
  ['1KI', '1Kgs', '1 Kings'],
  ['2KI', '2Kgs', '2 Kings'],
  ['1CH', '1Chr', '1 Chronicles'],
  ['2CH', '2Chr', '2 Chronicles'],
  ['EZR', 'Ezra', 'Ezra'],
  ['NEH', 'Neh', 'Nehemiah'],
  ['EST', 'Esth', 'Esther'],
  ['JOB', 'Job', 'Job'],
  ['PSA', 'Ps', 'Psalms', 'Psalm'],
  ['PRO', 'Prov', 'Proverbs'],
  ['ECC', 'Eccl', 'Ecclesiastes'],
  ['SNG', 'Song', 'Song of Solomon'],
  ['ISA', 'Isa', 'Isaiah'],
  ['JER', 'Jer', 'Jeremiah'],
  ['LAM', 'Lam', 'Lamentations'],
  ['EZK', 'Ezek', 'Ezekiel'],
  ['DAN', 'Dan', 'Daniel'],
  ['HOS', 'Hos', 'Hosea'],
  ['JOL', 'Joel', 'Joel'],
  ['AMO', 'Amos', 'Amos'],
  ['OBA', 'Obad', 'Obadiah'],
  ['JON', 'Jonah', 'Jonah'],
  ['MIC', 'Mic', 'Micah'],
  ['NAM', 'Nah', 'Nahum'],
  ['HAB', 'Hab', 'Habakkuk'],
  ['ZEP', 'Zeph', 'Zephaniah'],
  ['HAG', 'Hag', 'Haggai'],
  ['ZEC', 'Zech', 'Zechariah'],
  ['MAL', 'Mal', 'Malachi'],
];

const NT: [string, string, string, string?][] = [
  ['MAT', 'Matt', 'Matthew'],
  ['MRK', 'Mark', 'Mark'],
  ['LUK', 'Luke', 'Luke'],
  ['JHN', 'John', 'John'],
  ['ACT', 'Acts', 'Acts'],
  ['ROM', 'Rom', 'Romans'],
  ['1CO', '1Cor', '1 Corinthians'],
  ['2CO', '2Cor', '2 Corinthians'],
  ['GAL', 'Gal', 'Galatians'],
  ['EPH', 'Eph', 'Ephesians'],
  ['PHP', 'Phil', 'Philippians'],
  ['COL', 'Col', 'Colossians'],
  ['1TH', '1Thess', '1 Thessalonians'],
  ['2TH', '2Thess', '2 Thessalonians'],
  ['1TI', '1Tim', '1 Timothy'],
  ['2TI', '2Tim', '2 Timothy'],
  ['TIT', 'Titus', 'Titus'],
  ['PHM', 'Phlm', 'Philemon'],
  ['HEB', 'Heb', 'Hebrews'],
  ['JAS', 'Jas', 'James'],
  ['1PE', '1Pet', '1 Peter'],
  ['2PE', '2Pet', '2 Peter'],
  ['1JN', '1John', '1 John'],
  ['2JN', '2John', '2 John'],
  ['3JN', '3John', '3 John'],
  ['JUD', 'Jude', 'Jude'],
  ['REV', 'Rev', 'Revelation'],
];

const toBook =
  (testament: Book['testament']) =>
  ([code, osis, name, refName]: [string, string, string, string?]): Book => ({
    code,
    osis,
    name,
    refName: refName ?? name,
    testament,
  });

export const BOOKS: readonly Book[] = [...OT.map(toBook('OT')), ...NT.map(toBook('NT'))];

export const BOOK_BY_CODE = new Map(BOOKS.map((b) => [b.code, b]));
export const BOOK_BY_OSIS = new Map(BOOKS.map((b) => [b.osis, b]));
export const BOOK_INDEX = new Map(BOOKS.map((b, i) => [b.code, i]));
