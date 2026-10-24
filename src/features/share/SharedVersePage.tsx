import { Navigate, useParams } from 'react-router-dom';
import { paths } from '@/app/paths';
import { defaultVerseCounts, fromOsis } from '@/features/bible/ref';
import { useReader } from '@/features/bible-app/readerStore';

/** A shared verse link (/v/GEN.28.15): opens the passage in the reader, the verse chosen. */
export function SharedVersePage() {
  const { osis = '' } = useParams();
  const range = fromOsis(osis);
  if (range) {
    const sameChapter =
      range.end.book === range.start.book && range.end.chapter === range.start.chapter;
    const last = defaultVerseCounts(range.start.book)?.[range.start.chapter - 1] ?? range.end.verse;
    useReader
      .getState()
      .goTo(
        range.start.book,
        range.start.chapter,
        sameChapter
          ? { start: range.start.verse, end: range.end.verse }
          : { start: range.start.verse, end: last, span: range },
      );
  }
  return <Navigate to={paths.bible} replace />;
}
