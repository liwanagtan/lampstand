import type { StoredPresentation } from '@/schema/presentation';

/** Slides that ask for an image or video the operator hasn't chosen yet. */
export function mediaNeeds(p: StoredPresentation) {
  return p.slides.flatMap((s, index) => {
    const bg = s.background;
    if ((bg?.type === 'image' || bg?.type === 'video') && !bg.assetId) {
      return [{ index, slide: s, kind: bg.type, description: bg.description }];
    }
    return [];
  });
}
