import { referenceFor } from '../../../worker/reference';
import { shareTranslation, verseLink, verseShareText } from './share';

describe('sharing', () => {
  it('shares only translations that may be passed on', () => {
    expect(shareTranslation('KJV')).toBe('KJV');
    expect(shareTranslation('BSB')).toBe('BSB');
    expect(shareTranslation('NLT')).toBe('BSB');
    expect(shareTranslation('MINE')).toBe('BSB');
  });

  it('links to the passage and words it plainly', () => {
    expect(verseLink('GEN.28.15', 'https://example.org')).toBe('https://example.org/v/GEN.28.15');
    expect(verseShareText('Look, I am with you.', 'Genesis 28:15', 'BSB')).toBe(
      '“Look, I am with you.”\nGenesis 28:15 (BSB)',
    );
  });

  it('names a shared passage for its link preview', () => {
    expect(referenceFor('GEN.28.15')).toBe('Genesis 28:15');
    expect(referenceFor('PSA.23.1-PSA.23.3')).toBe('Psalm 23:1–3');
    expect(referenceFor('JHN.3')).toBe('John 3');
    expect(referenceFor('nonsense')).toBeNull();
  });
});
