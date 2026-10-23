// Bible on the TV (Bible app): actions shared by the reader, the TV panel and the Notes page.
import { useEffect } from 'react';
import { getTranslation } from '@/features/bible/bibleStore';
import { adjacentVerse } from '@/features/bible/navigate';
import { fromOsis, toOsis } from '@/features/bible/ref';
import { verseCountsFor } from '@/features/bible/versification';
import { connectControl, readSavedLive, useControl } from '@/features/present/live/controlStore';
import { startOutput } from '@/features/present/live/startOutput';
import { useSettings } from '@/features/settings/settingsStore';
import { useReader } from './readerStore';
import { useTv } from './tvStore';

const counts = (code: string) => verseCountsFor(getTranslation(code));

/** Shows a passage on the TV, starting the presentation first if needed. */
export async function showOnTv(
  ref: string,
  translation: string,
  mode = useTv.getState().mode,
  look?: 'card',
  /**
   * Open the TV first if it isn't (Today's one-click Show on TV). Show the Bible doesn't: there
   * Start Presentation opens the TV, and until then a passage just goes to Live.
   */
  start = true,
): Promise<void> {
  const control = useControl.getState();
  if (start && !control.presenting && !(await startOutput())) return;
  useTv.getState().setPanel(true);
  const { live } = useControl.getState();
  if (live.screen !== 'content') useControl.getState().toggleScreen(live.screen);
  await useControl.getState().showOverlay({ ref, translation, mode, ...(look ? { look } : {}) });
}

/** Next/previous on the TV: the next page of a long passage, then the next verse. */
export async function stepTv(delta: 1 | -1): Promise<void> {
  const control = useControl.getState();
  const o = control.live.overlay;
  if (!o) return;
  if (delta > 0 && o.page < control.overlayPageCount - 1)
    return control.dispatch({ type: 'overlayPage', delta: 1 });
  if (delta < 0 && o.page > 0) return control.dispatch({ type: 'overlayPage', delta: -1 });
  const range = fromOsis(o.ref);
  const next = range && adjacentVerse(range, delta, counts(o.translation));
  if (!next) return;
  // The next verse keeps the way the passage is shown.
  await showOnTv(toOsis(next), o.translation, o.mode, o.look, false);
  // The reader follows the TV, so the operator always sees what is up.
  const v = next.start.verse;
  useReader.getState().goTo(next.start.book, next.start.chapter, { start: v, end: v });
}

/** Keeps the TV connected while any Bible page is open. */
export function useBibleTvSession(): void {
  const defaultTheme = useSettings((s) => s.defaultTheme);
  const logoAssetId = useSettings((s) => s.logoAssetId);
  const reduceMotion = useSettings((s) => s.reduceMotion);
  useEffect(() => connectControl(), []);
  useEffect(() => {
    useControl.getState().loadBible({
      translation: useReader.getState().translation,
      logoAssetId: useSettings.getState().logoAssetId,
      theme: defaultTheme,
      backdrop: useTv.getState().background,
      restore: readSavedLive(),
    });
  }, [defaultTheme]);
  useEffect(() => useControl.getState().setLogo(logoAssetId), [logoAssetId]);
  useEffect(() => useControl.getState().setReduceMotion(reduceMotion), [reduceMotion]);
}
