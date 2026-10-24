// The guided tour (design canvas "Lampstand Guided Tour"): on a phone, right after Welcome,
// Ember offers a one-minute walk through Today, the Bible tab and Profile. Always skippable,
// shown once, and replayable from Settings. Kept in localStorage like onboarding.
import { create } from 'zustand';

const KEY = 'lampstand.tour';

export interface TourStop {
  /** The element to light up: its `data-tour` value. */
  target: string;
  title: string;
  body: string;
}

export const TOUR_STOPS: readonly TourStop[] = [
  {
    target: 'verse',
    title: 'A verse for each morning',
    body: 'Tap it to read the whole chapter, or keep it with you through the day.',
  },
  {
    target: 'plan',
    title: 'Your plan, a day at a time',
    body: 'One reading a day, at your pace. Miss a day and simply carry on.',
  },
  {
    target: 'tab-bible',
    title: 'Read any chapter',
    body: 'Tap a verse to highlight it, write a note, or see the Hebrew and Greek behind a word.',
  },
  {
    target: 'tab-profile',
    title: 'Your journey, kept safe',
    body: 'Every note, highlight and reflection in one place. It stays on this device.',
  },
];

/** `welcome`, then each stop by index, then `done`. */
export type TourStep = 'welcome' | number | 'done';

interface TourState {
  step: TourStep | null;
  /** Bumped by Start reading, so Today opens the verse of the day. */
  readVerse: number;
  start: () => void;
  go: (step: TourStep) => void;
  /** Skip, Not now or Start reading: the tour is over and won't offer itself again. */
  end: (opts?: { read?: boolean }) => void;
}

export const useTour = create<TourState>((set, get) => ({
  step: null,
  readVerse: 0,
  start: () => set({ step: 'welcome' }),
  go: (step) => set({ step }),
  end: (opts) => {
    store('done');
    set({ step: null, readVerse: get().readVerse + (opts?.read ? 1 : 0) });
  },
}));

/** Called when Welcome finishes: the tour offers itself on the next visit to Today. */
export function queueTour(): void {
  store('pending');
}

export function isTourQueued(): boolean {
  try {
    return localStorage.getItem(KEY) === 'pending';
  } catch {
    return false;
  }
}

function store(value: 'pending' | 'done'): void {
  try {
    localStorage.setItem(KEY, value);
  } catch {
    // Nothing to remember it in; at worst the offer shows again.
  }
}
