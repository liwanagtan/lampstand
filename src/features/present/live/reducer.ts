// Pure live-state transitions (PRD §7.4, §7.5). The control store wraps this reducer.
import type { OverlayMode } from '@/schema/common';
import type { Background, StoredPresentation, StoredSlide } from '@/schema/presentation';
import type { LiveOverlay, LiveState, LiveWord } from './types';

export type LiveAction =
  | {
      type: 'load';
      presentationId: string;
      presentation: StoredPresentation;
      theme: LiveState['theme'];
    }
  | { type: 'startCountdown' }
  | { type: 'next' }
  | { type: 'prev' }
  | { type: 'revealStep'; delta: 1 | -1 }
  | { type: 'slidePage'; delta: 1 | -1 }
  | { type: 'goTo'; index: number }
  | { type: 'toggleScreen'; screen: 'blank' | 'logo' | 'sermon' }
  | { type: 'showOverlay'; overlay: Omit<LiveOverlay, 'page'> & { page?: number } }
  | { type: 'clearOverlay' }
  | { type: 'overlayMode'; mode: OverlayMode }
  | { type: 'overlayPage'; delta: 1 | -1 }
  | { type: 'overlayTranslation'; translation: string }
  | { type: 'overlayEmphasis'; emphasis: string[] }
  | { type: 'backdrop'; backdrop: Background | null }
  | { type: 'showWord'; word: LiveWord }
  | { type: 'hideWord' }
  | { type: 'studyWords'; on: boolean }
  | { type: 'theme'; theme: LiveState['theme'] };

export interface LiveContext {
  presentation: StoredPresentation | null;
  /** Number of pages the given slide needs (verse slides); 1 for others. */
  slidePages: (slide: StoredSlide) => number;
  /** Number of pages the current overlay needs. */
  overlayPages: (overlay: LiveOverlay) => number;
  now: () => number;
  presenting?: boolean;
}

const buildItems = (slide: StoredSlide | undefined) =>
  slide?.type === 'list' && slide.reveal ? slide.items.length : 0;

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
          : ctx.presenting
            ? ctx.now() + slide.minutes * 60_000
            : null
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
    case 'startCountdown':
      return slide?.type === 'countdown' && state.countdownEndsAt === null
        ? { ...state, countdownEndsAt: ctx.now() + slide.minutes * 60_000 }
        : state;
    case 'next': {
      if (!slide) return state;
      if (state.slideIndex >= slides.length - 1) return state;
      return enterSlide(state, state.slideIndex + 1, ctx);
    }
    case 'prev': {
      if (!slide) return state;
      if (state.slideIndex <= 0) return state;
      return enterSlide(state, state.slideIndex - 1, ctx, true);
    }
    case 'revealStep':
      return {
        ...state,
        buildStep: Math.max(0, Math.min(buildItems(slide), state.buildStep + action.delta)),
      };
    case 'slidePage':
      return slide?.type === 'reading'
        ? {
            ...state,
            slidePage: Math.max(
              0,
              Math.min(ctx.slidePages(slide) - 1, state.slidePage + action.delta),
            ),
          }
        : state;
    case 'goTo':
      if (action.index < 0 || action.index >= slides.length) return state;
      return enterSlide(
        { ...state, slideIndex: action.index === state.slideIndex ? -1 : state.slideIndex },
        action.index,
        ctx,
      );
    case 'toggleScreen':
      return { ...state, screen: state.screen === action.screen ? 'content' : action.screen };
    // A studied word belongs to the passage on screen: a new passage, or none, puts it away.
    case 'showOverlay':
      return {
        ...state,
        overlay: { ...action.overlay, page: action.overlay.page ?? 0 },
        word: null,
      };
    case 'clearOverlay':
      return state.overlay || state.word ? { ...state, overlay: null, word: null } : state;
    case 'showWord':
      return state.overlay ? { ...state, word: action.word } : state;
    case 'hideWord':
      return state.word ? { ...state, word: null } : state;
    // Words stay marked through new passages until word study is put away.
    case 'studyWords':
      return Boolean(state.studyWords) === action.on
        ? state
        : { ...state, studyWords: action.on, word: action.on ? state.word : null };
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
