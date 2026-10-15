import { Reveal } from '../Reveal';
import type { RenderProps } from '../types';
import s from '../Slide.module.css';

export function ListSlide({ slide, animate, buildStep }: RenderProps<'list'>) {
  const shown = slide.build && buildStep !== undefined ? buildStep : slide.items.length;
  return (
    <div className={`${s.content} ${s.start} ${s['stack-lg']}`}>
      <Reveal as="h1" className={s.subheading} animate={animate && (!slide.build || shown === 0)}>
        {slide.heading}
      </Reveal>
      <ul className={s.list}>
        {slide.items.map((item, i) => {
          const visible = i < shown;
          // On a build, only the newest item animates; earlier ones stay put.
          const animateItem = animate && visible && (slide.build ? i === shown - 1 : true);
          return (
            <li key={`${i}-${visible}`} className={`${s.listItem} ${visible ? '' : s.hidden}`}>
              <span className={s.marker} aria-hidden />
              <Reveal
                as="span"
                animate={animateItem}
                by="block"
                delay={slide.build ? 0 : 200 + i * 80}
              >
                {item}
              </Reveal>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
