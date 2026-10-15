// Translation file format (PRD §5). Used for bundled translations and "Import translation".
import { z } from 'zod';
import { BOOK_BY_CODE } from '@/features/bible/books';

export const TranslationFileSchema = z.strictObject({
  format: z.literal('lampstand-bible', { error: 'This is not a Lampstand translation file.' }),
  version: z.literal(1, { error: 'Unsupported translation file version.' }),
  code: z
    .string()
    .regex(/^[A-Z][A-Z0-9]{1,7}$/, {
      error: 'Code must be 2–8 capital letters or digits, e.g. "KJV".',
    }),
  name: z.string().trim().min(1).max(80),
  language: z.string().min(2).max(10),
  license: z.string().trim().min(1, { error: 'License is required.' }).max(400),
  source: z.string().max(400).optional(),
  books: z
    .array(
      z.strictObject({
        osis: z.string().refine((c) => BOOK_BY_CODE.has(c), {
          error: (iss) => `"${String(iss.input)}" isn't one of the 66 book codes (e.g. GEN, JHN).`,
        }),
        name: z.string().trim().min(1).max(60),
        chapters: z.array(z.array(z.string())).min(1),
      }),
    )
    .min(1),
});

export type TranslationFile = z.infer<typeof TranslationFileSchema>;
