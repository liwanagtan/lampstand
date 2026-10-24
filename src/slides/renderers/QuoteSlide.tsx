import { Reveal } from '../Reveal';
import type { RenderProps } from '../types';
import s from '../Slide.module.css';

export function QuoteSlide({ slide, animate }: RenderProps<'quote'>) {
  return (
    <div className={`${s.content} ${s.start} ${s.stack}`}>
      <div className={s.quoteMark} aria-hidden>
        “
      </div>
      <Reveal as="blockquote" className={s.quoteText} animate={animate}>
        {slide.text}
      </Reveal>
      {slide.author && (
        <Reveal as="p" className={s.author} animate={animate} by="block" delay={300}>
          {slide.author}
        </Reveal>
      )}
    </div>
  );
}
