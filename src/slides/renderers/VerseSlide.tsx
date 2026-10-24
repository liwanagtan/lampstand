import { usePages, usePassage } from '../usePassage';
import { VerseBody } from '../VerseBody';
import type { RenderProps } from '../types';
import s from '../Slide.module.css';

/** A passage on its own slide; a long one turns pages, shown as dots in the corner. */
export function VerseSlide({ slide, template, animate, page, translation }: RenderProps<'verse'>) {
  const { passage, error } = usePassage(slide.ref, translation);
  const pages = usePages(passage, 'slide', template.id);
  const index = Math.min(Math.max(page, 0), Math.max(pages.length - 1, 0));

  if (error) {
    return (
      <div className={`${s.content} ${s.start} ${s['stack-sm']}`}>
        <p className={s.reference}>{slide.ref}</p>
        <p className={`${s.body} ${s.missing}`}>{error}</p>
      </div>
    );
  }
  if (!passage) return null;
  return (
    <>
      <VerseBody
        key={`${passage.osis}-${index}`}
        className={`${s.content} ${s.start} ${s['stack-sm']}`}
        reference={`${passage.reference} · ${passage.translation}`}
        page={pages[index]}
        emphasis={slide.emphasis}
        animate={animate}
      />
      {pages.length > 1 && (
        <div className={s.pageDots} role="img" aria-label={`Page ${index + 1} of ${pages.length}`}>
          {pages.map((_, i) => (
            <span key={i} className={`${s.pageDot} ${i === index ? s.pageDotOn : ''}`} />
          ))}
        </div>
      )}
    </>
  );
}
