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
  /** A typed reference that runs on past this chapter (e.g. John 3:36–4:2); marks use all of it. */
  span?: RefRange;
}

/**
 * Tapping verses: tap one to select it, tap another to stretch the selection to it, tap the
 * lone selected verse again to clear. Once a range is chosen, a tap starts over. Shift-click
 * always stretches from where the selection began.
 */
export function nextSelection(
  cur: Selection | null,
  verse: number,
  extend: boolean,
): Selection | null {
  if (cur && extend) {
    return { start: Math.min(cur.start, verse), end: Math.max(cur.start, verse) };
  }
  if (cur && !cur.span && cur.start === cur.end) {
    if (cur.start === verse) return null;
    return { start: Math.min(cur.start, verse), end: Math.max(cur.start, verse) };
  }
  return { start: verse, end: verse };
}

/** The console's click: one verse at a time (it is what goes on screen); Shift stretches. */
export function pickSelection(
  cur: Selection | null,
  verse: number,
  extend: boolean,
): Selection | null {
  if (cur && extend) return nextSelection(cur, verse, true);
  if (cur && cur.start === verse && cur.end === verse) return null;
  return { start: verse, end: verse };
}

interface ReaderState extends ReaderPrefs {
  selection: Selection | null;
  /** Navigation can focus a passage without opening the verse action bar. */
  selectionActionsOpen: boolean;
  recent: { book: string; chapter: number }[];
  goTo: (book: string, chapter: number, select?: Selection | null) => void;
  setTranslation: (code: string) => void;
  setParallel: (code: string | null) => void;
  setSize: (size: number) => void;
  select: (verse: number, extend: boolean) => void;
  setSelection: (s: Selection | null) => void;
  revealSelectionActions: () => void;
}

export const READER_SIZES = [16, 18, 20, 22, 24, 28, 32];

const DEFAULTS: ReaderPrefs = {
  book: 'JHN',
  chapter: 1,
  translation: 'BSB',
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
      translation:
        typeof v.translation === 'string' && !['ASV', 'YLT', 'DBY'].includes(v.translation)
          ? v.translation
          : DEFAULTS.translation,
      parallel:
        typeof v.parallel === 'string' && !['ASV', 'YLT', 'DBY'].includes(v.parallel)
          ? v.parallel
          : null,
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

function recentChapters(): { book: string; chapter: number }[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem('lampstand.recentChapters') ?? '[]');
    return Array.isArray(value)
      ? value
          .filter(
            (x) => x && BOOK_BY_CODE.has(x.book) && Number.isInteger(x.chapter) && x.chapter > 0,
          )
          .slice(0, 6)
      : [];
  } catch {
    return [];
  }
}

export const useReader = create<ReaderState>((set, get) => ({
  ...readPrefs(),
  selection: null,
  selectionActionsOpen: false,
  recent: recentChapters(),
  goTo: (book, chapter, select = null) => {
    const recent = [
      { book, chapter },
      ...get().recent.filter((p) => p.book !== book || p.chapter !== chapter),
    ].slice(0, 6);
    set({ book, chapter, selection: select, selectionActionsOpen: false, recent });
    try {
      localStorage.setItem('lampstand.recentChapters', JSON.stringify(recent));
    } catch {
      /* Reading remains available if storage is full. */
    }
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
    const selection = nextSelection(get().selection, verse, extend);
    set({ selection, selectionActionsOpen: Boolean(selection) });
  },
  setSelection: (selection) => set({ selection, selectionActionsOpen: Boolean(selection) }),
  revealSelectionActions: () => set({ selectionActionsOpen: true }),
}));

export function selectionRange(book: string, chapter: number, s: Selection): RefRange {
  if (s.span) return s.span;
  return { start: { book, chapter, verse: s.start }, end: { book, chapter, verse: s.end } };
}
