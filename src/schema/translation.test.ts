import { TranslationFileSchema } from './translation';

const valid = {
  format: 'lampstand-bible',
  version: 1,
  code: 'KJV',
  name: 'King James Version',
  language: 'en',
  license: 'Public domain',
  books: [
    {
      osis: 'GEN',
      name: 'Genesis',
      chapters: [['In the beginning God created the heaven and the earth.']],
    },
  ],
};

describe('TranslationFileSchema', () => {
  it('accepts the PRD example shape', () => {
    expect(TranslationFileSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects unknown book codes, bad codes and missing license', () => {
    expect(
      TranslationFileSchema.safeParse({ ...valid, books: [{ ...valid.books[0], osis: 'Gen' }] })
        .success,
    ).toBe(false);
    expect(TranslationFileSchema.safeParse({ ...valid, code: 'kjv' }).success).toBe(false);
    expect(TranslationFileSchema.safeParse({ ...valid, license: '' }).success).toBe(false);
    expect(TranslationFileSchema.safeParse({ ...valid, format: 'other' }).success).toBe(false);
  });
});
