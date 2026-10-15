import { Reveal } from '../Reveal';
import type { RenderProps } from '../types';
import s from '../Slide.module.css';

export function ClosingSlide({ slide, animate }: RenderProps<'closing'>) {
  return (
    <div className={`${s.content} ${s.center} ${s['stack']}`}>
      <div className={s.rule} />
      <Reveal as="h1" className={s.display} animate={animate}>
        {slide.heading}
      </Reveal>
      {slide.body && (
        <Reveal as="p" className={s.body} animate={animate} by="block" delay={260}>
          {slide.body}
        </Reveal>
      )}
    </div>
  );
}
