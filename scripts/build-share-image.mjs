// The link-preview image (docs/SHARING-AND-DAILY-VERSE.md): what a shared Lampstand link shows
// in WhatsApp, Messenger or iMessage. Run once after changing it: node scripts/build-share-image.mjs
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';

const W = 1200;
const H = 630;
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <radialGradient id="glow" cx="0.78" cy="0.42" r="0.5">
      <stop offset="0" stop-color="#F2B33D" stop-opacity="0.35"/>
      <stop offset="1" stop-color="#F2B33D" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="#0A0F1C"/>
  <rect width="${W}" height="${H}" fill="url(#glow)"/>
  <g transform="translate(820 150) scale(5.2)">
    <path d="M32 2 C42 14 46 23 46 30 A14 14 0 0 1 18 30 C18 23 22 14 32 2 Z" fill="#F2B33D"/>
    <path d="M2 44 L28 50 L28 62 L2 56 Z" fill="#F5F2EA"/>
    <path d="M62 44 L36 50 L36 62 L62 56 Z" fill="#F5F2EA"/>
  </g>
  <text x="96" y="268" font-family="Georgia, 'Times New Roman', serif" font-size="96" font-weight="700" fill="#F5F2EA">Lampstand</text>
  <text x="96" y="352" font-family="'Segoe UI', Arial, sans-serif" font-size="38" fill="#C9CDD6">A quiet place to read the</text>
  <text x="96" y="402" font-family="'Segoe UI', Arial, sans-serif" font-size="38" fill="#C9CDD6">Bible each day.</text>
  <text x="96" y="510" font-family="'Segoe UI', Arial, sans-serif" font-size="28" font-weight="700" fill="#F2B33D">Free · No ads · Works offline</text>
</svg>`;

mkdirSync('public/og', { recursive: true });
await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile('public/og/lampstand.png');
console.log('public/og/lampstand.png');
