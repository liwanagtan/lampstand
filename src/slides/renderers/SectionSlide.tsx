import { Reveal } from '../Reveal';
import type { RenderProps } from '../types';
import s from '../Slide.module.css';

export function SectionSlide({ slide, animate }: RenderProps<'section'>) {
  return (
    <div className={`${s.content} ${s.center} ${s['stack-sm']}`}>
      {slide.label && (
        <Reveal as="p" className={s.eyebrow} animate={animate} by="block">
          {slide.label}
        </Reveal>
      )}
      <Reveal as="h1" className={s.display} animate={animate} delay={slide.label ? 120 : 0}>
        {slide.heading}
      </Reveal>
    </div>
  );
}
