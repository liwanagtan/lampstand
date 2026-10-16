// Editor state (PRD §7.3): edits, 50-step undo/redo, debounced autosave.
import { create } from 'zustand';
import type { StoredPresentation, StoredSlide } from '@/schema/presentation';
import { setPosterAnimated, updatePresentation } from '@/features/library/presentations';

export const UNDO_LIMIT = 50;
const COALESCE_MS = 800;
const SAVE_DELAY = 400;

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface EditorState {
  id: string | null;
  presentation: StoredPresentation | null;
  selectedId: string | null;
  /** App-side setting for the poster's animated Scene (not part of the file). */
  posterAnimated: boolean;
  past: StoredPresentation[];
  future: StoredPresentation[];
  saveStatus: SaveStatus;
  savedAt: number;
  /** Key of the last edit, so typing in one field becomes one undo step. */
  lastKey: string | null;
  lastAt: number;

  open: (id: string, p: StoredPresentation, posterAnimated?: boolean) => void;
  setPosterAnimated: (v: boolean) => void;
  select: (id: string | null) => void;
  /** Applies an edit. Edits with the same `key` within a short burst merge into one undo step. */
  edit: (fn: (p: StoredPresentation) => StoredPresentation, key?: string) => void;
  updateSlide: (id: string, patch: (s: StoredSlide) => StoredSlide, key?: string) => void;
  undo: () => void;
  redo: () => void;
  flush: () => Promise<void>;
}

let saveTimer: ReturnType<typeof setTimeout> | undefined;
let pendingSave: Promise<void> = Promise.resolve();

export const useEditor = create<EditorState>((set, get) => {
  const scheduleSave = () => {
    clearTimeout(saveTimer);
    set({ saveStatus: 'saving' });
    saveTimer = setTimeout(() => void save(), SAVE_DELAY);
  };

  const save = async () => {
    const { id, presentation } = get();
    if (!id || !presentation) return;
    pendingSave = updatePresentation(id, presentation).then(
      () => set({ saveStatus: 'saved', savedAt: Date.now() }),
      () => set({ saveStatus: 'error' }),
    );
    await pendingSave;
  };

  return {
    id: null,
    presentation: null,
    selectedId: null,
    posterAnimated: true,
    past: [],
    future: [],
    saveStatus: 'idle',
    savedAt: 0,
    lastKey: null,
    lastAt: 0,

    setPosterAnimated: (posterAnimated) => {
      set({ posterAnimated });
      const id = get().id;
      if (id) void setPosterAnimated(id, posterAnimated);
    },

    open: (id, p, posterAnimated = true) =>
      set({
        posterAnimated,
        id,
        presentation: p,
        selectedId: p.slides[0]?.id ?? null,
        past: [],
        future: [],
        saveStatus: 'idle',
        lastKey: null,
      }),

    select: (selectedId) => set({ selectedId, lastKey: null }),

    edit: (fn, key) => {
      const { presentation, past, lastKey, lastAt } = get();
      if (!presentation) return;
      const next = fn(presentation);
      if (next === presentation) return;
      const now = Date.now();
      const merge = key !== undefined && key === lastKey && now - lastAt < COALESCE_MS;
      set({
        presentation: next,
        past: merge ? past : [...past, presentation].slice(-UNDO_LIMIT),
        future: [],
        lastKey: key ?? null,
        lastAt: now,
      });
      scheduleSave();
    },

    updateSlide: (id, patch, key) =>
      get().edit(
        (p) => ({ ...p, slides: p.slides.map((s) => (s.id === id ? patch(s) : s)) }),
        key ? `${id}:${key}` : undefined,
      ),

    undo: () => {
      const { past, presentation, future, selectedId } = get();
      if (!past.length || !presentation) return;
      const prev = past[past.length - 1]!;
      set({
        presentation: prev,
        past: past.slice(0, -1),
        future: [presentation, ...future].slice(0, UNDO_LIMIT),
        lastKey: null,
        selectedId: prev.slides.some((s) => s.id === selectedId)
          ? selectedId
          : (prev.slides[0]?.id ?? null),
      });
      scheduleSave();
    },

    redo: () => {
      const { past, presentation, future, selectedId } = get();
      if (!future.length || !presentation) return;
      const next = future[0]!;
      set({
        presentation: next,
        past: [...past, presentation].slice(-UNDO_LIMIT),
        future: future.slice(1),
        lastKey: null,
        selectedId: next.slides.some((s) => s.id === selectedId)
          ? selectedId
          : (next.slides[0]?.id ?? null),
      });
      scheduleSave();
    },

    flush: async () => {
      if (get().saveStatus === 'saving') {
        clearTimeout(saveTimer);
        await save();
      }
      await pendingSave;
    },
  };
});
