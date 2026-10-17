import { useMemo } from 'react';
import { useEntries } from '@/features/bible-app/journal';
import { useAllMarks } from '@/features/bible-app/marks';
import { usePlanProgress, usePlans } from '@/features/bible-app/plans';
import { journeyStats, type JourneyStats } from './journey';

/** The Journey summary, live; undefined while loading. */
export function useJourneyStats(): JourneyStats | undefined {
  const plans = usePlans();
  const progress = usePlanProgress();
  const entries = useEntries();
  const marks = useAllMarks();
  return useMemo(
    () =>
      plans && progress && entries && marks
        ? journeyStats({ plans, progress, entries, marks, now: new Date() })
        : undefined,
    [plans, progress, entries, marks],
  );
}
