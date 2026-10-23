// Underlines the studyable words of the passage on screen (Show the Bible, Words open). The BSB's
// word links are by character in each whole verse; a long verse can be split across pages, so
// the shown text is found in the whole verse and the links moved to it.
import { useMemo, type ReactNode } from 'react';
import { WORD_STUDY_TRANSLATION, useBookWords, verseWords } from '@/features/bible-app/wordStudy';
import { fromOsis } from '@/features/bible/ref';
import type { LiveWord } from '@/features/present/live/types';
import { StudyMarksContext, type StudyMarks } from './liveTextTools';
import { usePassage } from './usePassage';

export function StudyMarksProvider({
  passageRef,
  translation,
  word,
  children,
}: {
  passageRef: string;
  translation: string;
  word: LiveWord | null | undefined;
  children: ReactNode;
}) {
  const bsb = translation === WORD_STUDY_TRANSLATION;
  const { passage } = usePassage(bsb ? passageRef : null, WORD_STUDY_TRANSLATION);
  const book = bsb ? (fromOsis(passageRef)?.start.book ?? null) : null;
  const words = useBookWords(book);
  const marks = useMemo((): StudyMarks | null => {
    if (!bsb || !words) return null;
    return {
      spansFor: (osis, text) => {
        const whole = passage?.verses.find((v) => v.osis === osis)?.text ?? text;
        const at = whole.indexOf(text);
        if (at < 0) return null;
        const [, c = '0', v = '0'] = osis.split('.');
        return verseWords(words, Number(c), Number(v))
          .filter((s) => s.start >= at && s.start + s.length <= at + text.length)
          .map((s) => ({ ...s, start: s.start - at }));
      },
      active: word ? { osis: word.verse, strong: word.strong } : null,
    };
  }, [bsb, words, passage, word]);
  return <StudyMarksContext.Provider value={marks}>{children}</StudyMarksContext.Provider>;
}
