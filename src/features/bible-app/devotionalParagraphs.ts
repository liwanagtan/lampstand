/** Add reading breaks to long source paragraphs without editing their words or punctuation. */
export function devotionalParagraphs(body: readonly string[]): string[] {
  const segmenter = new Intl.Segmenter('en', { granularity: 'sentence' });
  return body.flatMap((source) => {
    if (source.trim().split(/\s+/).length <= 100) return [source];
    const paragraphs: string[] = [];
    let current = '';
    let words = 0;
    for (const { segment } of segmenter.segment(source)) {
      current += segment;
      words += segment.trim().split(/\s+/).length;
      if (words >= 75) {
        paragraphs.push(current.trim());
        current = '';
        words = 0;
      }
    }
    if (current.trim()) {
      if (words < 25 && paragraphs.length)
        paragraphs[paragraphs.length - 1] += ` ${current.trim()}`;
      else paragraphs.push(current.trim());
    }
    return paragraphs;
  });
}
