import { Poster } from '../poster/Poster';
import type { RenderProps } from '../types';

/** The title slide is the sermon poster (Scene); it animates only when live. */
export function TitleSlide({ slide, template, mode }: RenderProps<'title'>) {
  return <Poster slide={slide} template={template} live={mode === 'live'} />;
}
