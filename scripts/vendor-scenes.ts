// Copies what Scene compositions need into public/scenes so they play offline (PRD §10):
// the pinned HyperFrames runtime, GSAP, and the two brand fonts. Run: npm run scenes
import { copyFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const copies: [string, string][] = [
  ['node_modules/@hyperframes/core/dist/hyperframe.runtime.iife.js', 'public/scenes/vendor/hyperframe.runtime.iife.js'],
  ['node_modules/gsap/dist/gsap.min.js', 'public/scenes/vendor/gsap.min.js'],
  ['node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2', 'public/scenes/fonts/inter.woff2'],
  ['node_modules/@fontsource-variable/fraunces/files/fraunces-latin-wght-normal.woff2', 'public/scenes/fonts/fraunces.woff2'],
  ['node_modules/@fontsource-variable/fraunces/files/fraunces-latin-wght-italic.woff2', 'public/scenes/fonts/fraunces-italic.woff2'],
];
mkdirSync(root + 'public/scenes/vendor', { recursive: true });
mkdirSync(root + 'public/scenes/fonts', { recursive: true });
for (const [from, to] of copies) {
  copyFileSync(root + from, root + to);
  console.log(`Copied ${to}`);
}
