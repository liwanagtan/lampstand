import { Reveal } from '../Reveal';
import type { RenderProps } from '../types';
import s from '../Slide.module.css';

export function StatementSlide({ slide, animate }: RenderProps<'statement'>) {
  return (
    <>
      <div className={`${s.glow} ${s.glowCenter}`} aria-hidden />
      <div className={`${s.content} ${s.center}`}>
        <Reveal as="p" className={s.statement} animate={animate}>
          {slide.text}
        </Reveal>
      </div>
    </>
  );
}
