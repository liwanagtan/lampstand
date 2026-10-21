import { useReader } from './readerStore';

it('focuses a navigated passage without opening actions until the reader taps it', () => {
  const original = useReader.getState();
  try {
    useReader.getState().goTo('PSA', 34, { start: 8, end: 8 });
    expect(useReader.getState()).toMatchObject({
      selection: { start: 8, end: 8 },
      selectionActionsOpen: false,
    });

    useReader.getState().revealSelectionActions();
    expect(useReader.getState().selectionActionsOpen).toBe(true);

    useReader.getState().goTo('JHN', 3, { start: 16, end: 17 });
    expect(useReader.getState().selectionActionsOpen).toBe(false);
    useReader.getState().select(18, false);
    expect(useReader.getState().selectionActionsOpen).toBe(true);

    useReader.getState().setSelection(null);
    expect(useReader.getState().selectionActionsOpen).toBe(false);
  } finally {
    useReader.setState(original);
    localStorage.removeItem('lampstand.recentChapters');
  }
});
