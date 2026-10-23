// A verse on the console's Live pane with its words clickable (see liveTextTools.ts).
import { livePieces, type LiveTextTools } from './liveTextTools';
import s from './Slide.module.css';

/** A verse segment on the Live pane, with its words clickable. */
export function LiveText({
  tools,
  osis,
  text,
  emphasis,
  emphasisOn,
}: {
  tools: LiveTextTools;
  osis: string;
  text: string;
  emphasis: readonly string[] | undefined;
  emphasisOn: boolean;
}) {
  const spans = tools.mode === 'words' ? tools.wordsFor(osis, text) : null;
  return (
    <>
      {livePieces(text, emphasis, tools.mode, spans).map((p, i) => {
        const lit = p.emphasis ? `${s.emphasis} ${emphasisOn ? s.emphasisOn : ''}` : '';
        if (p.word)
          return (
            <span
              key={i}
              className={`${lit} ${s.liveWord}`}
              data-live-word={p.text}
              onClick={() => tools.onHighlight(p.text)}
            >
              {p.text}
            </span>
          );
        if (p.strong !== undefined) {
          const strong = p.strong;
          return (
            <span
              key={i}
              className={`${lit} ${s.liveWord} ${s.liveStudy}`}
              data-live-study={p.text}
              data-active={
                (tools.active?.osis === osis && tools.active.strong === strong) || undefined
              }
              onClick={() => tools.onWord(osis, strong, p.text)}
            >
              {p.text}
            </span>
          );
        }
        return (
          <span key={i} className={lit || undefined}>
            {p.text}
          </span>
        );
      })}
    </>
  );
}
