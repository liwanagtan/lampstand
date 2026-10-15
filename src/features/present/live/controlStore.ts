// The control window's live store: the only writer of live state (PRD §4, §14 rules).
import { create } from 'zustand';
import type { OverlayMode } from '@/schema/common';
import type { StoredPresentation } from '@/schema/presentation';
import { openChannel, type Message } from './channel';
import { countPages } from './pageCounts';
import { liveReducer, type LiveAction, type LiveContext } from './reducer';
import { INITIAL_LIVE, type LiveOverlay, type LiveSnapshot, type LiveState } from './types';

export type OutputStatus = 'none' | 'connected' | 'disconnected';

interface ControlState {
  live: LiveState;
  presentation: StoredPresentation | null;
  translation: string;
  logoAssetId: string | null;
  reduceMotion: boolean;
  rev: number;
  changedAt: number;
  /** Slide chosen into Preview; null follows the live slide (shows the next one). */
  previewIndex: number | null;
  output: OutputStatus;
  slidePageCounts: Record<string, number>;
  overlayPageCount: number;
  /** Bumps on each go-live, so the UI can pulse the LIVE border. */
  liveBeat: number;

  load: (args: {
    id: string;
    presentation: StoredPresentation;
    translation: string;
    logoAssetId: string | null;
    theme: LiveState['theme'];
    restore?: LiveState | null;
  }) => void;
  dispatch: (action: LiveAction) => void;
  select: (index: number | null) => void;
  goLive: () => void;
  setPresentation: (p: StoredPresentation) => void;
  setLogo: (id: string | null) => void;
  setReduceMotion: (v: boolean) => void;
  showOverlay: (overlay: Omit<LiveOverlay, 'page'>) => Promise<void>;
  setOverlayMode: (mode: OverlayMode) => Promise<void>;
  setOverlayTranslation: (code: string) => Promise<void>;
  snapshot: () => LiveSnapshot;
  setOutput: (status: OutputStatus) => void;
}

const SESSION_KEY = 'lampstand-live';

export const useControl = create<ControlState>((set, get) => {
  const ctx = (): LiveContext => ({
    presentation: get().presentation,
    slidePages: (slide) => get().slidePageCounts[slide.id] ?? 1,
    overlayPages: () => get().overlayPageCount,
    now: () => Date.now(),
  });

  const apply = (action: LiveAction, extra: Partial<ControlState> = {}) => {
    const prev = get().live;
    const live = liveReducer(prev, action, ctx());
    if (live === prev && Object.keys(extra).length === 0) return;
    const slideChanged = live.slideIndex !== prev.slideIndex;
    set({
      live,
      rev: get().rev + 1,
      changedAt: Date.now(),
      ...(slideChanged ? { previewIndex: null } : {}),
      liveBeat:
        slideChanged || live.overlay?.ref !== prev.overlay?.ref
          ? get().liveBeat + 1
          : get().liveBeat,
      ...extra,
    });
  };

  const refreshOverlayPages = async (overlay: LiveOverlay | null) => {
    if (!overlay) return 1;
    const n = await countPages(overlay.ref, overlay.translation, overlay.mode, get().live.theme);
    set({ overlayPageCount: n });
    return n;
  };

  return {
    live: INITIAL_LIVE,
    presentation: null,
    translation: 'KJV',
    logoAssetId: null,
    reduceMotion: false,
    rev: 0,
    changedAt: 0,
    previewIndex: null,
    output: 'none',
    slidePageCounts: {},
    overlayPageCount: 1,
    liveBeat: 0,

    load: ({ id, presentation, translation, logoAssetId, theme, restore }) => {
      set({ presentation, translation, logoAssetId, previewIndex: null, slidePageCounts: {} });
      if (restore && restore.presentationId === id) {
        set({
          live: {
            ...restore,
            slideIndex: Math.min(restore.slideIndex, presentation.slides.length - 1),
          },
          rev: get().rev + 1,
          changedAt: Date.now(),
        });
      } else {
        apply({ type: 'load', presentationId: id, presentation, theme });
      }
      // Page counts for verse slides, so Next walks through long passages.
      void (async () => {
        const counts: Record<string, number> = {};
        for (const s of presentation.slides) {
          if (s.type !== 'verse') continue;
          counts[s.id] = await countPages(
            s.ref,
            (s.translation ?? translation).toUpperCase(),
            'slide',
            theme,
          );
        }
        set({ slidePageCounts: counts });
      })();
      void refreshOverlayPages(get().live.overlay);
    },

    dispatch: (action) => apply(action),

    select: (index) => set({ previewIndex: index }),

    goLive: () => {
      const { previewIndex, live } = get();
      const target = previewIndex ?? live.slideIndex + 1;
      apply({ type: 'goTo', index: target }, { previewIndex: null });
    },

    setPresentation: (presentation) => {
      set({ presentation, rev: get().rev + 1, changedAt: Date.now() });
    },

    setLogo: (logoAssetId) => set({ logoAssetId, rev: get().rev + 1, changedAt: Date.now() }),

    setReduceMotion: (reduceMotion) =>
      set({ reduceMotion, rev: get().rev + 1, changedAt: Date.now() }),

    showOverlay: async (overlay) => {
      const full = { ...overlay, page: 0 };
      await refreshOverlayPages(full);
      apply({ type: 'showOverlay', overlay: full });
    },

    setOverlayMode: async (mode) => {
      const o = get().live.overlay;
      if (!o) return;
      await refreshOverlayPages({ ...o, mode });
      apply({ type: 'overlayMode', mode });
    },

    setOverlayTranslation: async (code) => {
      const o = get().live.overlay;
      if (!o) return;
      await refreshOverlayPages({ ...o, translation: code, page: 0 });
      apply({ type: 'overlayTranslation', translation: code });
    },

    snapshot: () => {
      const s = get();
      return {
        rev: s.rev,
        live: s.live,
        presentation: s.presentation,
        translation: s.translation,
        logoAssetId: s.logoAssetId,
        reduceMotion: s.reduceMotion,
        changedAt: s.changedAt,
      };
    },

    setOutput: (output) => set({ output }),
  };
});

/** Restores live state after a control-window reload. */
export function readSavedLive(): LiveState | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as LiveState) : null;
  } catch {
    return null;
  }
}

/**
 * Starts broadcasting snapshots and watching the output window. Returns a cleanup.
 * The output only ever receives state; it never changes it.
 */
export function connectControl(): () => void {
  let lastAlive = 0;
  const channel = openChannel((m: Message) => {
    if (m.type === 'hello') {
      lastAlive = Date.now();
      useControl.getState().setOutput('connected');
      channel.post({ type: 'snapshot', snapshot: useControl.getState().snapshot() });
    } else if (m.type === 'alive') {
      lastAlive = Date.now();
      if (useControl.getState().output !== 'connected')
        useControl.getState().setOutput('connected');
    } else if (m.type === 'bye') {
      lastAlive = 0;
      useControl.getState().setOutput('disconnected');
    }
  });

  const unsubscribe = useControl.subscribe((s, prev) => {
    if (s.rev === prev.rev) return;
    channel.post({ type: 'snapshot', snapshot: s.snapshot() });
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(s.live));
    } catch {
      // Storage unavailable: reload recovery is a convenience only.
    }
  });

  // Ask an output that is already open (e.g. after a control reload) to say hello.
  channel.post({ type: 'snapshot', snapshot: useControl.getState().snapshot() });

  const watchdog = setInterval(() => {
    const { output, setOutput } = useControl.getState();
    if (output === 'connected' && Date.now() - lastAlive > 4000) setOutput('disconnected');
  }, 1000);

  const onUnload = () => channel.post({ type: 'closing' });
  window.addEventListener('pagehide', onUnload);

  return () => {
    window.removeEventListener('pagehide', onUnload);
    clearInterval(watchdog);
    unsubscribe();
    channel.close();
  };
}
