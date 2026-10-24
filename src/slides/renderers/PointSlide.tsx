import { Reveal } from '../Reveal';
import type { RenderProps } from '../types';
import s from '../Slide.module.css';

/** One main idea: a large line and a quieter sentence beneath. */
export function PointSlide({ slide, animate }: RenderProps<'point'>) {
  return (
    <div className={`${s.content} ${s.start} ${s.stack}`}>
      <Reveal as="h1" className={s.heading} animate={animate}>
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
