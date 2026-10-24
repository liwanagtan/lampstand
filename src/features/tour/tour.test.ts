import { beforeEach, describe, expect, it } from 'vitest';
import { isTourQueued, queueTour, useTour } from './tour';

describe('guided tour', () => {
  beforeEach(() => {
    localStorage.clear();
    useTour.setState({ step: null, readVerse: 0 });
  });

  it('offers itself once after Welcome, and not again once ended', () => {
    expect(isTourQueued()).toBe(false);
    queueTour();
    expect(isTourQueued()).toBe(true);
    useTour.getState().start();
    expect(useTour.getState().step).toBe('welcome');
    useTour.getState().end();
    expect(useTour.getState().step).toBeNull();
    expect(isTourQueued()).toBe(false);
  });

  it('asks Today to open the verse only from Start reading', () => {
    useTour.getState().end();
    expect(useTour.getState().readVerse).toBe(0);
    useTour.getState().end({ read: true });
    expect(useTour.getState().readVerse).toBe(1);
  });
});
