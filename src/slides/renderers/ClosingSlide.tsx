import { Reveal } from '../Reveal';
import type { RenderProps } from '../types';
import s from '../Slide.module.css';

export function ClosingSlide({ slide, animate }: RenderProps<'closing'>) {
  return (
    <>
      <div className={`${s.glow} ${s.glowBelow}`} aria-hidden />
      <div className={`${s.content} ${s.center} ${s.stack}`}>
        <Reveal as="h1" className={s.closingTitle} animate={animate}>
          {slide.heading}
        </Reveal>
        {slide.body && (
          <Reveal as="p" className={s.body} animate={animate} by="block" delay={260}>
            {slide.body}
          </Reveal>
        )}
      </div>
    </>
  );
}
