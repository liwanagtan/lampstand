// A verse's text with its extra marks (see liveTextTools.ts): clickable words on Live, and
// underlined study words with the word on screen boxed.
import type { ReactNode } from 'react';
import { verseTokens, type LiveTextTools, type StudyMarks, type Token } from './liveTextTools';
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
  const tokens = verseTokens(text, emphasis, spans);

  const piece = (t: Token, key: number, inStudy: boolean) => {
    const lit = [t.emphasis && s.emphasis, t.emphasis && emphasisOn && s.emphasisOn];
    // Inside a study word, a click studies it (the group handles it); elsewhere it highlights.
    const clickable = t.word && tools?.onHighlight && !(inStudy && tools.onStudy);
    const className = [...lit, clickable && s.liveWord].filter(Boolean).join(' ') || undefined;
    return clickable ? (
      <span
        key={key}
        className={className}
        data-live-word={t.text}
        onClick={() => tools!.onHighlight!(t.text)}
      >
        {t.text}
      </span>
    ) : (
      <span key={key} className={className}>
        {t.text}
      </span>
    );
  };

  // A study word ("one and only") is one element, so its underline and box run unbroken.
  const out: ReactNode[] = [];
  for (let i = 0; i < tokens.length;) {
    const strong = tokens[i]!.strong;
    if (strong === null) {
      out.push(piece(tokens[i]!, i, false));
      i++;
      continue;
    }
    let j = i;
    while (j < tokens.length && tokens[j]!.strong === strong) j++;
    const group = tokens.slice(i, j);
    const words = group.map((t) => t.text).join('');
    const active = marks?.active?.osis === osis && marks.active.strong === strong;
    const study = tools?.onStudy;
    out.push(
      <span
        key={`s${i}`}
        className={[s.study, active && s.studyActive, study && s.liveWord]
          .filter(Boolean)
          .join(' ')}
        data-study
        data-live-study={study ? words : undefined}
        onClick={study ? () => study(osis, strong, words) : undefined}
      >
        {group.map((t, k) => piece(t, i + k, true))}
      </span>,
    );
    i = j;
  }
  return <>{out}</>;
}
