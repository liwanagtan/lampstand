// Page counts for verse slides and overlays, computed the same way the renderers paginate.
import { db } from '@/db/db';
import { getPassage } from '@/features/bible/passage';
import { getTranslation } from '@/features/bible/bibleStore';
import { fromOsis, parseRefDetailed } from '@/features/bible/ref';
import { verseCountsFor } from '@/features/bible/versification';
import type { OverlayMode, TemplateId } from '@/schema/common';
import { pagesFor } from '@/slides/paginate';

export async function countPages(
  ref: string,
  translationCode: string,
  mode: OverlayMode | 'slide',
  templateId: TemplateId,
  /** Show the Bible's layout: a verse per line, whole verses, the reader's serif. */
  bible = false,
): Promise<number> {
  const t = getTranslation(translationCode);
  if (!t) return 1;
  const range =
    fromOsis(ref) ??
    (() => {
      const r = parseRefDetailed(ref, { verseCounts: verseCountsFor(t) });
      return r.ok ? r.range : null;
    })();
  if (!range) return 1;
  const passage = await getPassage(db, t, range);
  if (typeof document !== 'undefined' && document.fonts) await document.fonts.ready;
  return Math.max(1, pagesFor(passage.verses, mode, templateId, bible).length);
}
