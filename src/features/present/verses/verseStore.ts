// Verse tools state (PRD §7.5): overlay mode, preview verse, queue, history, translation.
import { create } from 'zustand';
import { db } from '@/db/db';
import { getTranslation, useBible } from '@/features/bible/bibleStore';
import { adjacentVerse } from '@/features/bible/navigate';
import { formatRef, fromOsis, parseRefDetailed, toOsis, type RefRange } from '@/features/bible/ref';
import { verseCountsFor } from '@/features/bible/versification';
import { toast } from '@/design-system/components';
import type { OverlayMode } from '@/schema/common';
import type { StoredPresentation } from '@/schema/presentation';
import { useControl } from '../live/controlStore';
import type { LiveOverlay } from '../live/types';

export interface QueueItem {
  key: string;
  /** Canonical range id. */
  ref: string;
  label: string;
  translation?: string;
  emphasis?: string[];
  source: 'slide' | 'extra' | 'manual';
  slideIndex?: number;
}

export interface HistoryItem {
  key: string;
  ref: string;
  label: string;
  translation: string;
  shownAt: number;
}

interface VerseState {
  mode: OverlayMode;
  /** Session translation for verses typed without a code. */
  translation: string;
  /** A verse loaded into Preview (Shift+Enter), waiting for Go live. */
  preview: Omit<LiveOverlay, 'page'> | null;
  queue: QueueItem[];
  history: HistoryItem[];
  shown: Set<string>;

  init: (p: StoredPresentation, translation: string, mode: OverlayMode) => void;
  show: (
    overlay: Omit<LiveOverlay, 'page' | 'mode'> & { mode?: OverlayMode },
    opts?: { live?: boolean },
  ) => Promise<void>;
  goLivePreview: () => Promise<boolean>;
  clearPreview: () => void;
  setMode: (mode: OverlayMode) => void;
  step: (delta: 1 | -1) => Promise<void>;
  cycleTranslation: () => Promise<void>;
  setTranslation: (code: string) => void;
  addToQueue: (ref: string, translation?: string) => void;
}

const counts = (code: string) => verseCountsFor(getTranslation(code));

export function labelFor(ref: string, code: string): string {
  const range = fromOsis(ref);
  return range ? formatRef(range, counts(code)) : ref;
}

function canonical(ref: string, code: string): string | null {
  if (fromOsis(ref)) return ref;
  const r = parseRefDetailed(ref, { verseCounts: counts(code) });
  return r.ok ? toOsis(r.range) : null;
}

let keySeq = 0;
const nextKey = () => `v${++keySeq}`;

export const useVerses = create<VerseState>((set, get) => ({
  mode: 'lowerThird',
  translation: 'KJV',
  preview: null,
  queue: [],
  history: [],
  shown: new Set(),

  init: (p, translation, mode) => {
    const queue: QueueItem[] = [];
    p.slides.forEach((s, i) => {
      if (s.type !== 'verse') return;
      const code = (s.translation ?? translation).toUpperCase();
      const ref = canonical(s.ref, code);
      if (ref) {
        queue.push({
          key: nextKey(),
          ref,
          label: labelFor(ref, code),
          translation: s.translation,
          emphasis: s.emphasis,
          source: 'slide',
          slideIndex: i,
        });
      }
    });
    for (const extra of p.extraRefs ?? []) {
      const ref = canonical(extra, translation);
      if (ref)
        queue.push({ key: nextKey(), ref, label: labelFor(ref, translation), source: 'extra' });
    }
    set({ queue, translation, mode, preview: null, shown: new Set() });
  },

  show: async (o, opts = { live: true }) => {
    const overlay = { ...o, mode: o.mode ?? get().mode, translation: o.translation.toUpperCase() };
    if (!opts.live) {
      set({ preview: overlay });
      useControl.getState().select(null);
      return;
    }
    set({ preview: null });
    await useControl.getState().showOverlay(overlay);
    const item: HistoryItem = {
      key: nextKey(),
      ref: overlay.ref,
      label: labelFor(overlay.ref, overlay.translation),
      translation: overlay.translation,
      shownAt: Date.now(),
    };
    set((s) => ({
      history: [item, ...s.history].slice(0, 200),
      shown: new Set(s.shown).add(overlay.ref),
    }));
    void persistHistory(item);
  },

  goLivePreview: async () => {
    const p = get().preview;
    if (!p) return false;
    await get().show(p, { live: true });
    return true;
  },

  clearPreview: () => set({ preview: null }),

  setMode: (mode) => {
    set({ mode });
    if (useControl.getState().live.overlay) void useControl.getState().setOverlayMode(mode);
    const p = get().preview;
    if (p) set({ preview: { ...p, mode } });
  },

  step: async (delta) => {
    const control = useControl.getState();
    const o = control.live.overlay;
    if (!o) return;
    const pages = control.overlayPageCount;
    if (delta > 0 && o.page < pages - 1) return control.dispatch({ type: 'overlayPage', delta: 1 });
    if (delta < 0 && o.page > 0) return control.dispatch({ type: 'overlayPage', delta: -1 });
    const range = fromOsis(o.ref);
    const next = range && adjacentVerse(range, delta, counts(o.translation));
    if (next) await get().show({ ref: toOsis(next), translation: o.translation, mode: o.mode });
  },

  cycleTranslation: async () => {
    const o = useControl.getState().live.overlay;
    const codes = useBible.getState().translations.map((t) => t.code);
    if (!o || codes.length < 2) return;
    const next = codes[(codes.indexOf(o.translation) + 1) % codes.length]!;
    await useControl.getState().setOverlayTranslation(next);
    const name = getTranslation(next)?.code ?? next;
    toast({ title: `Switched to ${name}`, tone: 'success' });
  },

  setTranslation: (code) => set({ translation: code }),

  addToQueue: (ref, translation) => {
    const code = translation ?? get().translation;
    set((s) => ({
      queue: [
        ...s.queue,
        { key: nextKey(), ref, label: labelFor(ref, code), translation, source: 'manual' },
      ],
    }));
  },
}));

const HISTORY_LIMIT = 200;

async function persistHistory(item: HistoryItem) {
  try {
    await db.history.add({ ref: item.ref, translation: item.translation, shownAt: item.shownAt });
    const count = await db.history.count();
    if (count > HISTORY_LIMIT) {
      const old = await db.history
        .orderBy('shownAt')
        .limit(count - HISTORY_LIMIT)
        .primaryKeys();
      await db.history.bulkDelete(old);
    }
  } catch {
    // History is a convenience; never interrupt the service for it.
  }
}

export function rangeLabel(range: RefRange, code: string): string {
  return formatRef(range, counts(code));
}
