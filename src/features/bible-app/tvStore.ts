// Bible on the TV (Bible app): how verses are shown and the lesson list the operator prepared.
import { create } from 'zustand';
import type { OverlayMode } from '@/schema/common';
import type { Background } from '@/schema/presentation';
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
  /** Picture behind the verses on the TV, or null for the theme's own backdrop. */
  background: Extract<Background, { type: 'image' | 'video' }> | null;
}

interface TvState extends TvPrefs {
  setMode: (mode: OverlayMode) => void;
  setPanel: (open: boolean) => void;
  setBackground: (assetId: string | null, kind?: 'image' | 'video') => void;
  addToLesson: (item: LessonItem) => boolean;
  removeFromLesson: (index: number) => void;
  moveInLesson: (index: number, delta: 1 | -1) => void;
  clearLesson: () => void;
}

function read(): TvPrefs {
  const fallback: TvPrefs = { mode: 'fullScreen', lesson: [], panel: false, background: null };
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? '{}') as Partial<TvPrefs>;
    return {
      mode: v.mode && MODES.includes(v.mode) ? v.mode : fallback.mode,
      panel: v.panel === true,
      background:
        (v.background?.type === 'image' || v.background?.type === 'video') &&
        typeof v.background.assetId === 'string'
          ? v.background
          : null,
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
      const { mode, lesson, panel, background } = get();
      localStorage.setItem(KEY, JSON.stringify({ mode, lesson, panel, background }));
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
    setBackground: (assetId, kind = 'image') => {
      const background: TvPrefs['background'] = assetId
        ? kind === 'video'
          ? { type: 'video', description: 'Bible background', assetId }
          : { type: 'image', description: 'Bible background', assetId, motion: 'drift' }
        : null;
      set({ background });
      save();
      useControl.getState().dispatch({ type: 'backdrop', backdrop: background });
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
