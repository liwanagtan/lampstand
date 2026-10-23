// Keeps the app's type on its seven-step scale (src/design-system/tokens.ts, fontSize).
// Scripture follows the reader's size (em, calc with --reader-size) and fluid display headings
// use clamp(); both stay allowed. The TV output has its own scale and is not checked.
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
    'declaration-property-value-disallowed-list': [
      {
        'font-size': ['/^\\s*\\d+(\\.\\d+)?px\\s*$/', '/var\\(--text-(?!(12|14|16|20|24|32|44)\\))/'],
      },
      { message: SCALE },
    ],
  },
};
