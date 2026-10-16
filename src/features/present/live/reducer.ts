// Pure live-state transitions (PRD §7.4, §7.5). The control store wraps this reducer.
import type { OverlayMode } from '@/schema/common';
import type { Background, StoredPresentation, StoredSlide } from '@/schema/presentation';
import type { LiveOverlay, LiveState } from './types';

export type LiveAction =
  | {
      type: 'load';
      presentationId: string;
      presentation: StoredPresentation;
      theme: LiveState['theme'];
    }
  | { type: 'next' }
  | { type: 'prev' }
  | { type: 'goTo'; index: number }
  | { type: 'toggleScreen'; screen: 'blank' | 'logo' | 'sermon' }
  | { type: 'showOverlay'; overlay: Omit<LiveOverlay, 'page'> & { page?: number } }
  | { type: 'clearOverlay' }
  | { type: 'overlayMode'; mode: OverlayMode }
  | { type: 'overlayPage'; delta: 1 | -1 }
  | { type: 'overlayTranslation'; translation: string }
  | { type: 'overlayEmphasis'; emphasis: string[] }
  | { type: 'backdrop'; backdrop: Background | null }
  | { type: 'theme'; theme: LiveState['theme'] };

export interface LiveContext {
  presentation: StoredPresentation | null;
  /** Number of pages the given slide needs (verse slides); 1 for others. */
  slidePages: (slide: StoredSlide) => number;
  /** Number of pages the current overlay needs. */
  overlayPages: (overlay: LiveOverlay) => number;
  now: () => number;
}

const buildItems = (slide: StoredSlide | undefined) =>
  slide?.type === 'list' && slide.build ? slide.items.length : 0;

function enterSlide(state: LiveState, index: number, ctx: LiveContext, fromEnd = false): LiveState {
  const slides = ctx.presentation?.slides ?? [];
  const clamped = Math.max(0, Math.min(index, slides.length - 1));
  const slide = slides[clamped];
  const sameCountdown =
    state.slideIndex === clamped && slide?.type === 'countdown' && state.countdownEndsAt;
  return {
    ...state,
    slideIndex: clamped,
    buildStep: fromEnd ? buildItems(slide) : 0,
    slidePage: fromEnd && slide ? Math.max(0, ctx.slidePages(slide) - 1) : 0,
    countdownEndsAt:
      slide?.type === 'countdown'
        ? sameCountdown
          ? state.countdownEndsAt
          : ctx.now() + slide.minutes * 60_000
        : null,
  };
}

export function liveReducer(state: LiveState, action: LiveAction, ctx: LiveContext): LiveState {
  const slides = ctx.presentation?.slides ?? [];
  const slide = slides[state.slideIndex];
  switch (action.type) {
    case 'load':
      return enterSlide(
        {
          ...state,
          presentationId: action.presentationId,
          theme: action.theme,
          overlay: null,
          screen: 'content',
          slideIndex: -1,
        },
        0,
        { ...ctx, presentation: action.presentation },
      );
    case 'next': {
      if (!slide) return state;
      if (state.buildStep < buildItems(slide)) return { ...state, buildStep: state.buildStep + 1 };
      if (state.slidePage < ctx.slidePages(slide) - 1)
        return { ...state, slidePage: state.slidePage + 1 };
      if (state.slideIndex >= slides.length - 1) return state;
      return enterSlide(state, state.slideIndex + 1, ctx);
    }
    case 'prev': {
      if (!slide) return state;
      if (buildItems(slide) && state.buildStep > 0)
        return { ...state, buildStep: state.buildStep - 1 };
      if (state.slidePage > 0) return { ...state, slidePage: state.slidePage - 1 };
      if (state.slideIndex <= 0) return state;
      return enterSlide(state, state.slideIndex - 1, ctx, true);
    }
    case 'goTo':
      if (action.index < 0 || action.index >= slides.length) return state;
      return enterSlide(
        { ...state, slideIndex: action.index === state.slideIndex ? -1 : state.slideIndex },
        action.index,
        ctx,
      );
    case 'toggleScreen':
      return { ...state, screen: state.screen === action.screen ? 'content' : action.screen };
    case 'showOverlay':
      return { ...state, overlay: { ...action.overlay, page: action.overlay.page ?? 0 } };
    case 'clearOverlay':
      return state.overlay ? { ...state, overlay: null } : state;
    case 'overlayMode': {
      if (!state.overlay) return state;
      const overlay = { ...state.overlay, mode: action.mode };
      return {
        ...state,
        overlay: { ...overlay, page: Math.min(overlay.page, ctx.overlayPages(overlay) - 1) },
      };
    }
    case 'overlayPage': {
      if (!state.overlay) return state;
      const page = state.overlay.page + action.delta;
      if (page < 0 || page >= ctx.overlayPages(state.overlay)) return state;
      return { ...state, overlay: { ...state.overlay, page } };
    }
    case 'overlayTranslation':
      if (!state.overlay) return state;
      return { ...state, overlay: { ...state.overlay, translation: action.translation, page: 0 } };
    case 'overlayEmphasis':
      if (!state.overlay) return state;
      return {
        ...state,
        overlay: {
          ...state.overlay,
          emphasis: action.emphasis.length ? action.emphasis : undefined,
        },
      };
    case 'backdrop':
      return { ...state, backdrop: action.backdrop };
    case 'theme':
      return { ...state, theme: action.theme };
  }
}
