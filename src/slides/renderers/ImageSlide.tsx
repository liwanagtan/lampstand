import { Reveal } from '../Reveal';
import type { RenderProps } from '../types';
import s from '../Slide.module.css';

export function ImageSlide({ slide, animate }: RenderProps<'image'>) {
  if (!slide.caption) return null;
  return (
    <div className={s.captionBand}>
      <Reveal as="p" className={s.captionText} animate={animate} by="block" delay={300}>
        {slide.caption}
      </Reveal>
    </div>
  );
}
