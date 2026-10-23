// A verse on the console's Live pane with every word clickable (see liveTextTools.ts).
import { livePieces, type LiveTextTools } from './liveTextTools';
import s from './Slide.module.css';

/** A verse segment on the Live pane: click a word to light it up on the TV, again to turn it off. */
export function LiveText({
  tools,
  text,
  emphasis,
  emphasisOn,
}: {
  tools: LiveTextTools;
  text: string;
  emphasis: readonly string[] | undefined;
  emphasisOn: boolean;
}) {
  return (
    <>
      {livePieces(text, emphasis).map((p, i) => {
        const lit = p.emphasis ? `${s.emphasis} ${emphasisOn ? s.emphasisOn : ''}` : '';
        return p.word ? (
          <span
            key={i}
            className={`${lit} ${s.liveWord}`}
            data-live-word={p.text}
            onClick={() => tools.onHighlight(p.text)}
          >
            {p.text}
          </span>
        ) : (
          <span key={i} className={lit || undefined}>
            {p.text}
          </span>
        );
      })}
    </>
  );
}
