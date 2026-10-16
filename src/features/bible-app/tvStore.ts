// Bible on the TV (Bible app): how verses are shown and the lesson list the operator prepared.
import { create } from 'zustand';
import type { OverlayMode } from '@/schema/common';
import { fromOsis } from '@/features/bible/ref';
import { useControl } from '@/features/present/live/controlStore';

const KEY = 'lampstand.bible-tv';
const MODES: OverlayMode[] = ['lowerThird', 'sidePanel', 'fullScreen', 'popup'];
export const LESSON_MAX = 50;

export interface LessonItem {
  /** Canonical range, e.g. "JHN.3.16-JHN.3.18". */
  ref: string;
  translation: string;
}

interface TvPrefs {
  mode: OverlayMode;
  lesson: LessonItem[];
  /** The TV panel beside the reader is open. */
  panel: boolean;
}

interface TvState extends TvPrefs {
  setMode: (mode: OverlayMode) => void;
  setPanel: (open: boolean) => void;
  addToLesson: (item: LessonItem) => boolean;
  removeFromLesson: (index: number) => void;
  moveInLesson: (index: number, delta: 1 | -1) => void;
  clearLesson: () => void;
}

function read(): TvPrefs {
  const fallback: TvPrefs = { mode: 'fullScreen', lesson: [], panel: false };
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? '{}') as Partial<TvPrefs>;
    return {
      mode: v.mode && MODES.includes(v.mode) ? v.mode : fallback.mode,
      panel: v.panel === true,
      lesson: Array.isArray(v.lesson)
        ? v.lesson
            .filter(
              (i): i is LessonItem =>
                typeof i?.ref === 'string' &&
                typeof i.translation === 'string' &&
                fromOsis(i.ref) !== null,
            )
            .slice(0, LESSON_MAX)
        : [],
    };
  } catch {
    return fallback;
  }
}

export const useTv = create<TvState>((set, get) => {
  const save = () => {
    try {
      const { mode, lesson, panel } = get();
      localStorage.setItem(KEY, JSON.stringify({ mode, lesson, panel }));
    } catch {
      // Remembering the lesson is a convenience only.
    }
  };
  return {
    ...read(),
    setMode: (mode) => {
      set({ mode });
      save();
      if (useControl.getState().live.overlay) void useControl.getState().setOverlayMode(mode);
    },
    setPanel: (panel) => {
      set({ panel });
      save();
    },
    addToLesson: (item) => {
      const { lesson } = get();
      if (lesson.length >= LESSON_MAX) return false;
      if (lesson.some((i) => i.ref === item.ref && i.translation === item.translation))
        return false;
      set({ lesson: [...lesson, item] });
      save();
      return true;
    },
    removeFromLesson: (index) => {
      set({ lesson: get().lesson.filter((_, i) => i !== index) });
      save();
    },
    moveInLesson: (index, delta) => {
      const lesson = [...get().lesson];
      const j = index + delta;
      if (j < 0 || j >= lesson.length) return;
      [lesson[index], lesson[j]] = [lesson[j]!, lesson[index]!];
      set({ lesson });
      save();
    },
    clearLesson: () => {
      set({ lesson: [] });
      save();
    },
  };
});
