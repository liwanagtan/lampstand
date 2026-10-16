// Bible reader state (Bible app): where you are, how it looks, what is selected.
import { create } from 'zustand';
import { BOOK_BY_CODE } from '@/features/bible/books';
import type { RefRange } from '@/features/bible/ref';

const PREFS_KEY = 'lampstand.reader';

export interface ReaderPrefs {
  book: string;
  chapter: number;
  translation: string;
  /** Second translation shown side by side, or null. */
  parallel: string | null;
  size: number;
}

export interface Selection {
  /** First and last selected verse numbers in the current chapter. */
  start: number;
  end: number;
}

interface ReaderState extends ReaderPrefs {
  selection: Selection | null;
  goTo: (book: string, chapter: number, select?: Selection | null) => void;
  setTranslation: (code: string) => void;
  setParallel: (code: string | null) => void;
  setSize: (size: number) => void;
  select: (verse: number, extend: boolean) => void;
  setSelection: (s: Selection | null) => void;
}

export const READER_SIZES = [16, 18, 20, 22, 24, 28, 32];

const DEFAULTS: ReaderPrefs = {
  book: 'JHN',
  chapter: 1,
  translation: 'KJV',
  parallel: null,
  size: 20,
};

function readPrefs(): ReaderPrefs {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    const v = raw ? (JSON.parse(raw) as Partial<ReaderPrefs>) : {};
    const book = v.book && BOOK_BY_CODE.has(v.book) ? v.book : DEFAULTS.book;
    return {
      book,
      chapter: typeof v.chapter === 'number' && v.chapter > 0 ? v.chapter : DEFAULTS.chapter,
      translation: typeof v.translation === 'string' ? v.translation : DEFAULTS.translation,
      parallel: typeof v.parallel === 'string' ? v.parallel : null,
      size: READER_SIZES.includes(v.size ?? 0) ? v.size! : DEFAULTS.size,
    };
  } catch {
    return DEFAULTS;
  }
}

function save(s: ReaderPrefs) {
  try {
    const { book, chapter, translation, parallel, size } = s;
    localStorage.setItem(PREFS_KEY, JSON.stringify({ book, chapter, translation, parallel, size }));
  } catch {
    // Remembering the reading position is a convenience only.
  }
}

export const useReader = create<ReaderState>((set, get) => ({
  ...readPrefs(),
  selection: null,
  goTo: (book, chapter, select = null) => {
    set({ book, chapter, selection: select });
    save(get());
  },
  setTranslation: (translation) => {
    set({ translation, parallel: get().parallel === translation ? null : get().parallel });
    save(get());
  },
  setParallel: (parallel) => {
    set({ parallel });
    save(get());
  },
  setSize: (size) => {
    set({ size });
    save(get());
  },
  select: (verse, extend) => {
    const cur = get().selection;
    if (extend && cur) {
      const anchor = cur.start;
      set({ selection: { start: Math.min(anchor, verse), end: Math.max(anchor, verse) } });
    } else if (cur && cur.start === verse && cur.end === verse) {
      set({ selection: null });
    } else {
      set({ selection: { start: verse, end: verse } });
    }
  },
  setSelection: (selection) => set({ selection }),
}));

export function selectionRange(book: string, chapter: number, s: Selection): RefRange {
  return { start: { book, chapter, verse: s.start }, end: { book, chapter, verse: s.end } };
}
