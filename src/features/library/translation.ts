import { resolveTranslation } from '@/features/bible/bibleStore';
import { getSettings } from '@/features/settings/settingsStore';
import type { StoredPresentation, StoredSlide } from '@/schema/presentation';

/** The translation a presentation uses: its own, else the app default (PRD §3 Bible). */
export function presentationTranslation(p: Pick<StoredPresentation, 'translation'>): string {
  const def = getSettings().defaultTranslation;
  return resolveTranslation(p.translation, def)?.code ?? def;
}

export function slideTranslation(slide: StoredSlide, presentationCode: string): string {
  if (slide.type === 'verse' && slide.translation) {
    return resolveTranslation(slide.translation, presentationCode)?.code ?? presentationCode;
  }
  return presentationCode;
}
