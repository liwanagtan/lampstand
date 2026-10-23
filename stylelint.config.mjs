// Keeps the app's colours on tokens and its type on the seven-step scale (src/design-system/tokens.ts, fontSize).
// Scripture follows the reader's size (em, calc with --reader-size) and fluid display headings
// use clamp(); both stay allowed. The TV output has its own scale and is not checked.
// Colours come from tokens: --color-* follows light and dark, --palette-* stays fixed (tokens.ts).
const COLOURS = 'Use a colour token: var(--color-…) for theme colours, var(--palette-…) for fixed ones.';
const SCALE = 'Use the type scale: var(--text-12|14|16|20|24|32|44), or em for text that follows the reader.';

export default {
  ignoreFiles: [
    'dist/**',
    'src/slides/**',
    'src/templates/**',
    'src/features/output/**',
    'src/features/present/VerseOverlay.module.css',
  ],
  rules: {
    'color-no-hex': [true, { message: COLOURS }],
    'declaration-property-value-disallowed-list': [
      {
        'font-size': ['/^\\s*\\d+(\\.\\d+)?px\\s*$/', '/var\\(--text-(?!(12|14|16|20|24|32|44)\\))/'],
      },
      { message: SCALE },
    ],
  },
};
