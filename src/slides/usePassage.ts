import { useEffect, useMemo, useState } from 'react';
import { db } from '@/db/db';
import { getPassage, type Passage } from '@/features/bible/passage';
import { getTranslation, useBible } from '@/features/bible/bibleStore';
import { fromOsis, parseRefDetailed, type RefParseResult } from '@/features/bible/ref';
import { verseCountsFor } from '@/features/bible/versification';
import type { OverlayMode } from '@/schema/common';
import { getTemplate } from '@/templates/templates';
import type { TemplateId } from '@/schema/common';
import { browserMeasure, paginate, verseBox, type Page } from './paginate';

export interface PassageState {
  passage?: Passage;
  error?: string;
  loading: boolean;
}

/** Loads the verses for a human or canonical reference in a translation. */
export function usePassage(ref: string | null | undefined, code: string): PassageState {
  const translations = useBible((s) => s.translations);
  const t = useMemo(
    () => translations.find((x) => x.code === code) ?? getTranslation(code),
    [translations, code],
  );
  const [state, setState] = useState<{ key: string; value: PassageState }>({
    key: '',
    value: { loading: true },
  });
  const key = `${code}|${ref ?? ''}`;
  const parsed = useMemo((): RefParseResult | null => {
    if (!ref || !t) return null;
    const canonical = fromOsis(ref);
    return canonical
      ? { ok: true, range: canonical }
      : parseRefDetailed(ref, { verseCounts: verseCountsFor(t) });
  }, [ref, t]);

  useEffect(() => {
    if (!t || !parsed?.ok) return;
    let alive = true;
    getPassage(db, t, parsed.range).then(
      (passage) => alive && setState({ key, value: { loading: false, passage } }),
      (err: unknown) => alive && setState({ key, value: { loading: false, error: String(err) } }),
    );
    return () => {
      alive = false;
    };
  }, [key, parsed, t]);

  if (!ref) return { loading: false };
  if (!t) return { loading: false, error: `Translation ${code} isn't installed.` };
  if (parsed && !parsed.ok) return { loading: false, error: parsed.hint };
  return state.key === key ? state.value : { loading: true };
}

/** Pages of a passage for a layout, measured with the template's body font. */
export function usePages(
  passage: Passage | undefined,
  mode: OverlayMode | 'slide',
  templateId: TemplateId,
): Page[] {
  const [fontsReady, setFontsReady] = useState(
    () => typeof document === 'undefined' || !document.fonts,
  );
  useEffect(() => {
    if (fontsReady) return;
    let alive = true;
    void document.fonts.ready.then(() => alive && setFontsReady(true));
    return () => {
      alive = false;
    };
  }, [fontsReady]);
  return useMemo(() => {
    if (!passage) return [];
    const t = getTemplate(templateId);
    return paginate(passage.verses, verseBox(mode), browserMeasure(t.body.family, t.body.weight));
    // fontsReady re-measures once the real font metrics are available.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [passage, mode, templateId, fontsReady]);
}
