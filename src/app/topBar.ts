// The phone top bar shows the page you are on (docs/PRD-ADDENDUM-GROW.md, milestone 22).
import { useEffect, type ReactNode } from 'react';
import { create } from 'zustand';

export interface TopBarState {
  title: ReactNode;
  /** Where the back arrow goes; none shows the lamp mark instead. */
  back: string | null;
  /** Page controls at the right of the bar. */
  actions: ReactNode;
}

const EMPTY: TopBarState = { title: null, back: null, actions: null };

export const useTopBar = create<TopBarState>(() => EMPTY);

/** Puts this page's title (and back arrow, and controls) in the phone top bar while shown. */
export function usePhoneTitle(
  title: ReactNode,
  options: { back?: string | null; actions?: ReactNode } = {},
): void {
  const { back = null, actions = null } = options;
  useEffect(() => {
    useTopBar.setState({ title, back, actions });
  });
  useEffect(() => () => useTopBar.setState(EMPTY), []);
}
