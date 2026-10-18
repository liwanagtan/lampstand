// One search over the Bible, plans and your journey — the Search page and the laptop top bar
// share it (docs/PRD-ADDENDUM-GROW.md, milestones 21 and 29).
import { useEffect, useMemo, useState } from 'react';
import { getTranslation, useBible } from '@/features/bible/bibleStore';
import { parseRefDetailed } from '@/features/bible/ref';
import { searchVerses } from '@/features/bible/search';
import type { SearchHit } from '@/features/bible/searchCore';
import { verseCountsFor } from '@/features/bible/versification';
import { searchPlans } from '@/features/bible-app/discover';
import { useEntries } from '@/features/bible-app/journal';
import { buildTimeline, searchTimeline } from '@/features/bible-app/journalTimeline';
import { useAllMarks } from '@/features/bible-app/marks';
import { usePlans } from '@/features/bible-app/plans';
import { useReader } from '@/features/bible-app/readerStore';
import { useSettings } from '@/features/settings/settingsStore';

export interface SearchLimits {
  verses: number;
  plans: number;
  journey: number;
}

export function useUniversalSearch(value: string, limits: SearchLimits) {
  const text = value.trim();
  const translation = useReader((s) => s.translation);
  const codes = useBible((s) => s.translations.map((t) => t.code).join(','));
  const features = useSettings((s) => s.features);
  const plans = usePlans();
  const entries = useEntries();
  const marks = useAllMarks();
  const [hits, setHits] = useState<{ q: string; hits: SearchHit[] } | null>(null);

  const parsed = useMemo(() => {
    if (!text) return null;
    return parseRefDetailed(text, {
      knownTranslations: codes.split(','),
      verseCounts: verseCountsFor(getTranslation(translation)),
    });
  }, [text, codes, translation]);
  const isRef = Boolean(parsed?.ok);
  const wordQuery = text.length >= 3 && !isRef ? text.replace(/["“”‘’]/g, '') : '';

  useEffect(() => {
    if (!wordQuery) return;
    let alive = true;
    const id = setTimeout(() => {
      void searchVerses(translation, wordQuery, limits.verses).then(
        (h) => alive && setHits({ q: wordQuery, hits: h }),
      );
    }, 120);
    return () => {
      alive = false;
      clearTimeout(id);
    };
  }, [wordQuery, translation, limits.verses]);

  const verses = wordQuery && hits?.q === wordQuery ? hits.hits : [];
  const planHits =
    features.plans && text.length >= 2
      ? searchPlans(plans ?? [], text, 'all').slice(0, limits.plans)
      : [];
  const timeline = useMemo(
    () => buildTimeline(entries ?? [], features.marks ? (marks ?? []) : []),
    [entries, marks, features.marks],
  );
  const journey = text.length >= 2 ? searchTimeline(timeline, text).slice(0, limits.journey) : [];
  const settled = !wordQuery || hits?.q === wordQuery;
  const nothing =
    text.length >= 3 && !isRef && settled && !verses.length && !planHits.length && !journey.length;

  return { text, translation, parsed, verses, planHits, journey, nothing };
}
