import { Reveal } from '../Reveal';
import type { RenderProps } from '../types';
import s from '../Slide.module.css';

/** "Point 2" → "2": the numeral behind a section title, when its label carries one. */
function sectionNumeral(label: string | undefined): string | null {
  return label ? (/(\d+)\s*$/.exec(label)?.[1] ?? null) : null;
}

export function SectionSlide({ slide, animate }: RenderProps<'section'>) {
  const numeral = sectionNumeral(slide.label);
  return (
    <>
      <div className={`${s.glow} ${s.glowSide}`} aria-hidden />
      {numeral && (
        <div className={s.numeral} aria-hidden>
          {numeral}
        </div>
      )}
      <div className={`${s.content} ${s.start} ${s['stack-sm']}`}>
        {slide.label && (
          <Reveal as="p" className={s.eyebrow} animate={animate} by="block">
            {slide.label}
          </Reveal>
        )}
        <Reveal as="h1" className={s.display} animate={animate} delay={slide.label ? 120 : 0}>
          {slide.heading}
        </Reveal>
      </div>
    </>
  );
}
