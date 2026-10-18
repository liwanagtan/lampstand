import { useNavigate } from 'react-router-dom';
import { defaultVerseCounts, type RefRange } from '@/features/bible/ref';
import { useReader } from './readerStore';

/** Opens the reader at a passage, selecting it (or just the chapter, with `select: false`). */
export function useOpenInReader() {
  const navigate = useNavigate();
  return (range: RefRange, select = true) => {
    const { start, end } = range;
    const sameChapter = end.book === start.book && end.chapter === start.chapter;
    const last = defaultVerseCounts(start.book)?.[start.chapter - 1] ?? start.verse;
    // A whole chapter ("ps 23") opens it without selecting every verse.
    if (sameChapter && start.verse === 1 && end.verse === last) select = false;
    // A range past the chapter selects the rest of it and keeps the whole range for marks.
    useReader
      .getState()
      .goTo(
        start.book,
        start.chapter,
        !select
          ? null
          : sameChapter
            ? { start: start.verse, end: end.verse }
            : { start: start.verse, end: last, span: range },
      );
    navigate('/bible');
  };
}
