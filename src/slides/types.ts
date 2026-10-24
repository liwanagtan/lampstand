import type { SlideOf, SlideType } from '@/schema/presentation';
import type { Template } from '@/templates/templates';

export type SlideMode = 'thumbnail' | 'preview' | 'live' | 'editor';

export interface RenderProps<T extends SlideType = SlideType> {
  slide: SlideOf<T>;
  template: Template;
  /** Run entrance motion (live output only). */
  animate: boolean;
  mode: SlideMode;
  /** Items revealed so far on a build list; undefined shows all. */
  buildStep?: number;
  /** Page of a long passage. */
  page: number;
  translation: string;
  countdownEndsAt?: number | null;
  /** Missing-media guidance is for operator surfaces only, never the audience output. */
  showMediaPlaceholders?: boolean;
}
