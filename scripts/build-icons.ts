// Renders the app icons (PWA manifest, desktop shortcut) from the brand mark. Run: npm run icons
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const OUT = fileURLToPath(new URL('../public/icons/', import.meta.url));
const mark = (bg: string, fg: string, pad: number) => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="${pad ? 0 : 112}" fill="${bg}"/>
  <g transform="translate(${pad},${pad}) scale(${(512 - pad * 2) / 32})">
    <rect x="3" y="3" width="26" height="26" rx="8" fill="none" stroke="${fg}" stroke-width="1.6"/>
    <path d="M16 7.2c3.3 3.8 5.5 6.8 5.5 10.1a5.5 5.5 0 0 1-11 0c0-2.1.9-3.9 2.4-5.4.2 1.7.9 2.8 2 3.3-.5-2.9.2-5.4 1.1-8Z" fill="${fg}"/>
    <path d="M11.5 24.6h9" stroke="${fg}" stroke-width="1.6" stroke-linecap="round"/>
  </g>
</svg>`;

async function main() {
  mkdirSync(OUT, { recursive: true });
  const any = Buffer.from(mark('#0E1116', '#D9A441', 64));
  const maskable = Buffer.from(mark('#0E1116', '#D9A441', 112));
  for (const size of [192, 512]) {
    await sharp(any).resize(size, size).png().toFile(`${OUT}icon-${size}.png`);
    await sharp(maskable).resize(size, size).png().toFile(`${OUT}maskable-${size}.png`);
  }
  await sharp(any).resize(180, 180).png().toFile(`${OUT}apple-touch-icon.png`);
  console.log('Wrote icons');
}

void main();
