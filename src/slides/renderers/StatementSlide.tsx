import { Reveal } from '../Reveal';
import type { RenderProps } from '../types';
import s from '../Slide.module.css';

export function StatementSlide({ slide, animate }: RenderProps<'statement'>) {
  return (
    <div className={`${s.content} ${s.center}`}>
      <Reveal as="p" className={s.heading} animate={animate}>
        {slide.text}
      </Reveal>
    </div>
  );
}
