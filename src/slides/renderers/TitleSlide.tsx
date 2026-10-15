import { Reveal } from '../Reveal';
import type { RenderProps } from '../types';
import s from '../Slide.module.css';

export function TitleSlide({ slide, animate }: RenderProps<'title'>) {
  return (
    <div className={`${s.content} ${s.center} ${s['stack']}`}>
      <Reveal as="h1" className={s.display} animate={animate}>
        {slide.heading}
      </Reveal>
      {slide.subtitle && (
        <Reveal as="p" className={s.body} animate={animate} by="block" delay={220}>
          {slide.subtitle}
        </Reveal>
      )}
      {slide.speaker && (
        <Reveal as="p" className={s.eyebrow} animate={animate} by="block" delay={380}>
          {slide.speaker}
        </Reveal>
      )}
    </div>
  );
}
