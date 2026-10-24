/** Preserve previously saved decks when opening the updated app. External v1 imports are refused. */
export function upgradeStoredPresentation(data: unknown): unknown {
  if (!data || typeof data !== 'object') return data;
  const p = data as Record<string, unknown>;
  if (p.schemaVersion !== 1 || !Array.isArray(p.slides)) return data;
  return {
    ...p,
    schemaVersion: 2,
    slides: p.slides.map((value: unknown) => {
      if (!value || typeof value !== 'object') return value;
      const slide = { ...value } as Record<string, unknown>;
      if (slide.type === 'verse') slide.type = 'reading';
      if (slide.type === 'list' && 'build' in slide) {
        slide.reveal = slide.build;
        delete slide.build;
      }
      return slide;
    }),
  };
}
