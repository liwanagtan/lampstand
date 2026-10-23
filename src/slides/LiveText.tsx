// A verse's text with its extra marks (see liveTextTools.ts): clickable words on Live, and
// underlined study words with the word on screen boxed.
import { verseTokens, type LiveTextTools, type StudyMarks } from './liveTextTools';
import s from './Slide.module.css';

export function LiveText({
  tools,
  marks,
  osis,
  text,
  emphasis,
  emphasisOn,
}: {
  tools: LiveTextTools | null;
  marks: StudyMarks | null;
  osis: string;
  text: string;
  emphasis: readonly string[] | undefined;
  emphasisOn: boolean;
}) {
  const spans = marks?.spansFor(osis, text) ?? null;
  return (
    <>
      {verseTokens(text, emphasis, spans).map((t, i) => {
        const active =
          t.strong !== null && marks?.active?.osis === osis && marks.active.strong === t.strong;
        const className =
          [
            t.emphasis && s.emphasis,
            t.emphasis && emphasisOn && s.emphasisOn,
            t.strong !== null && s.study,
            active && s.studyActive,
            t.word && tools && s.liveWord,
          ]
            .filter(Boolean)
            .join(' ') || undefined;
        return t.word && tools ? (
          <span
            key={i}
            className={className}
            data-live-word={t.text}
            onClick={() => tools.onHighlight(t.text)}
          >
            {t.text}
          </span>
        ) : (
          <span key={i} className={className} data-study={t.strong !== null || undefined}>
            {t.text}
          </span>
        );
      })}
    </>
  );
}
