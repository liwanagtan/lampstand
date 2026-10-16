import { useNavigate } from 'react-router-dom';
import type { RefRange } from '@/features/bible/ref';
import { useReader } from './readerStore';

/** Opens the reader at a passage, selecting it (or just the chapter, with `select: false`). */
export function useOpenInReader() {
  const navigate = useNavigate();
  return (range: RefRange, select = true) => {
    const { start, end } = range;
    useReader.getState().goTo(
      start.book,
      start.chapter,
      select
        ? {
            start: start.verse,
            end: end.book === start.book && end.chapter === start.chapter ? end.verse : start.verse,
          }
        : null,
    );
    navigate('/bible');
  };
}
