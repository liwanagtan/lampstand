# Word study

Reading the BSB, select a verse (or several) and their studyable words get dotted underlines straight away; a tap anywhere else in a verse works as a verse tap, as before. In other translations, tap **Words** in the selection bar instead: the panel shows the first selected verse in the BSB. Tap an underlined word to see the Hebrew or Greek word behind it, its transliteration, part of speech, a gloss and a few short senses, and every verse that uses it. The word stays highlighted in each listed verse, and a listed verse opens inside the panel with **Back** to return. Escape closes it.

## On the TV (Screen › Show the Bible)

For lessons, Sunday school and lectures. The console's side panel is the chapter alone; the tools act on the **Live** pane itself, which shows exactly what the TV shows. A switch in Live's header says what a click on a word does:

- **Highlight** (the default): click words on Live to light them up on the TV; click again to turn one off (up to 12).
- **Words**: the studyable words on Live get dotted underlines; click one and the TV changes to word study: the verse on the left in the translation on screen, with the word picked out, and on the right a card with the original word, how it sounds, Hebrew or Greek and part of speech, the gloss, two short senses and how many verses use it. Under the dock, notes for the teacher show the same entry with every verse that uses the word, each with **Show** to put it on the TV, and "Words as a list" for the keyboard. Word links follow the BSB's wording, so with another translation on the TV the notes offer **Show … in BSB** instead.

Two modes, rather than one click doing both, so a click can't switch the TV to word study by accident. Clicks on Live are off while the output is frozen. **Background** is in the dock beside Blank and Logo (**G**).

- **Hide word** (or **W**) takes the card away so the class can be asked first; **Show word again** (or **W**) brings it back.
- **Previous** and **Next word** step through the passage's words.
- **Esc** puts away the word first, then the verse. A new passage puts the word away too.
- The word is part of the live state (`LiveState.word`), so a reopened output window shows it, and **Blank** and **Logo** cover it.

The TV layout is `src/slides/WordStudyScreen.tsx`; clickable words on Live are `src/slides/LiveText.tsx` (only the console provides `LiveTextContext`, so the TV draws them plain); the teacher's notes are `src/features/bible-console/WordStudyTools.tsx`.

## Sources and licences

| Source                                                                                                                        | Used for                                                                                                | Licence                                                    |
| ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| Berean Standard Bible word tables (`bsb_tables.tsv`, berean.bible/downloads.htm)                                              | Which English words link to which Hebrew or Greek word (Strong's number), and the "Used in" verse lists | Public domain since 30 April 2023 (berean.bible/terms.htm) |
| STEP Bible TBESH and TBESG, Translators Brief lexicons of Extended Strongs (github.com/STEPBible/STEPBible-Data, `Lexicons/`) | The original word, transliteration, part of speech, gloss and senses                                    | CC BY 4.0, credit "STEP Bible" linked to www.STEPBible.org |

The credit appears in the panel itself and in Settings › Credits and licences. We shorten the lexicon entries (the licence asks us to say so): the word, a gloss and up to four short senses. Greek entries are cut to their numbered senses, without references or grammar notes.

## How it is built

`npx tsx scripts/build-wordstudy.ts` reads the two sources from `scripts/.cache/bsb` and `scripts/.cache/stepbible` (download them from the links above) and the app's own `public/bibles/bsb.json`, then writes `public/words/`:

- `{BOOK}.json`: for each verse, the linked words as `[start, length, strong, …]` character offsets into the app's BSB text.
- `lex/H52.json` and similar: lexicon entries for 100 Strong's numbers each (H5200–H5299), with the verses that use each word.

Strong's numbers are stored as integers: Hebrew as is (H5216 → 5216), Greek plus 10000 (G3056 → 13056). Verses are `bookIndex × 1,000,000 + chapter × 1000 + verse` (`src/features/bible-app/wordStudyCodes.ts`).

The BSB tables link English _phrases_ ("is a lamp") to one original word. We underline only the meaningful word ("lamp"): small words at either end are trimmed, and particles, prepositions, conjunctions and articles aren't linked. About 280,000 words are linked; about 670 phrases (0.2%) aren't found in the app's text and are skipped.

The data is about 7 MB. Like the study notes, it isn't precached: each file downloads when first needed and the service worker keeps it for offline use (`vite.config.ts`, cache `word-study`).

## Translations

Only the BSB has word links. Reading the BSB, the underlines are in the reader's own text. Reading another translation, the panel shows the verse in the BSB with its underlines, labelled "Words from the Berean Standard Bible", so every reader can study words.

## Accessibility

A verse is normally one button (`span role="button"` in Read, `<button>` in Study). While its words are underlined they are the buttons instead, so buttons never nest; keyboard users Tab between words and press Enter or Space, and use the selection bar (or Escape) for the verse itself. A pointer tap between the words still reaches the verse. Each word's tap area reaches into the line spacing (at least 44 px tall on touch screens) without moving the text.

## Setting

Word study follows the **Study notes and word study** switch (Settings › Reading, and the Reading sheet on phones).
