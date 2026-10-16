// Single source of truth for every design value in the operator app (PRD §8, §9).
// Components reference these through CSS variables (see applyTokens) or the motion presets.

export type ColorScheme = 'light' | 'dark';

export const colors = {
  dark: {
    bg: '#0E1116',
    surface: '#161B22',
    'surface-raised': '#1E2530',
    border: '#2A3240',
    text: '#E8EAED',
    'text-muted': '#9AA3AF',
    // Logo gold (brand/README.txt) for fills, borders and highlights.
    accent: '#F2B33D',
    'accent-contrast': '#1A1305',
    'accent-text': '#F2B33D',
    live: '#E5484D',
    'live-contrast': '#0E1116', // white on this red is 3.91:1; near-black passes AA
    success: '#3DD68C',
    warning: '#F5B74F',
    'focus-ring': 'rgb(242 179 61 / 0.6)',
    overlay: 'rgb(5 7 10 / 0.6)',
    shadow: 'rgb(0 0 0 / 0)',
  },
  light: {
    bg: '#F7F6F3',
    surface: '#FFFFFF',
    'surface-raised': '#EFEDE8',
    border: '#DCD8CF',
    text: '#1A1D23',
    'text-muted': '#5C6370',
    // Logo gold for fills; it is ~2:1 on light surfaces, so gold text and focus outlines use
    // the same hue darkened to pass AA (≥ 4.8:1 on every light surface).
    accent: '#F2B33D',
    'accent-contrast': '#1A1305',
    'accent-text': '#8B5E09',
    live: '#D93036',
    'live-contrast': '#FFFFFF',
    success: '#1C9455', // PRD #1F9D5A is 2.98:1 on surface-raised; darkened to pass 3:1
    warning: '#B26B00',
    'focus-ring': 'rgb(139 94 9 / 0.6)',
    overlay: 'rgb(26 29 35 / 0.35)',
    shadow: 'rgb(26 29 35 / 0.12)',
  },
} as const;

export type ColorToken = keyof (typeof colors)['dark'];

export const fontSize = { 12: 12, 13: 13, 14: 14, 16: 16, 20: 20, 24: 24, 32: 32 } as const;
export const fontWeight = { regular: 400, medium: 500, semibold: 600 } as const;
export const space = { 1: 4, 2: 8, 3: 12, 4: 16, 6: 24, 8: 32, 12: 48, 16: 64 } as const;
export const radius = { sm: 6, md: 10, lg: 16 } as const;

export const fonts = {
  display: "'Fraunces Variable', 'Fraunces', Georgia, serif",
  ui: "'Inter Variable', 'Inter', system-ui, sans-serif",
} as const;

export const size = {
  controlHeight: 40, // PRD §8: 40 px minimum button height in the control screen
  controlHeightSm: 32,
  topbarHeight: 60,
  iconSm: 16,
  iconMd: 20,
  iconStroke: 1.5,
} as const;

/** Motion tokens (PRD §9). Durations in ms, easings as cubic-bezier tuples. */
export const motion = {
  instant: { duration: 80, ease: [0, 0, 0.58, 1] },
  quick: { duration: 140, ease: [0.2, 0, 0, 1] },
  standard: { duration: 220, ease: [0.2, 0, 0, 1] },
  slide: { duration: 500, ease: [0.22, 1, 0.36, 1] },
  reveal: { duration: 700, stagger: 60, ease: [0.22, 1, 0.36, 1] },
  ambient: { duration: 25_000 },
  reduced: { duration: 120 },
  screen: { duration: 400 }, // blank / logo fade on the TV
} as const;

export const motionDetail = {
  verseTextDelay: 150,
  emphasisDelay: 300,
  pressScale: 0.98,
  shakeDistance: 6,
  riseDistance: 24,
  pushDistance: 40,
  overlayRise: 32,
  commandBarScale: 0.98,
  hoverPreviewDelay: 400,
  savedFade: 1500,
  toastDuration: 3000,
  undoWindow: 8000,
  driftScale: 1.06,
} as const;

const bezier = (e: readonly number[]) => `cubic-bezier(${e.join(', ')})`;

function cssVars(scheme: ColorScheme): string {
  const c = colors[scheme];
  const lines = Object.entries(c).map(([k, v]) => `--color-${k}: ${v};`);
  lines.push(
    scheme === 'dark'
      ? '--elevation-1: none; --elevation-2: 0 12px 32px rgb(0 0 0 / 0.45);'
      : `--elevation-1: 0 1px 2px ${c.shadow}, 0 1px 3px ${c.shadow}; --elevation-2: 0 8px 24px ${c.shadow};`,
  );
  lines.push(`color-scheme: ${scheme};`);
  return lines.join('\n  ');
}

function staticVars(): string {
  const out: string[] = [];
  for (const [k, v] of Object.entries(fontSize)) out.push(`--text-${k}: ${v}px;`);
  for (const [k, v] of Object.entries(fontWeight)) out.push(`--weight-${k}: ${v};`);
  for (const [k, v] of Object.entries(space)) out.push(`--space-${k}: ${v}px;`);
  for (const [k, v] of Object.entries(radius)) out.push(`--radius-${k}: ${v}px;`);
  out.push(`--font-display: ${fonts.display};`, `--font-ui: ${fonts.ui};`);
  out.push(
    `--control-height: ${size.controlHeight}px;`,
    `--control-height-sm: ${size.controlHeightSm}px;`,
    `--topbar-height: ${size.topbarHeight}px;`,
  );
  for (const name of ['instant', 'quick', 'standard', 'slide'] as const) {
    out.push(
      `--dur-${name}: ${motion[name].duration}ms;`,
      `--ease-${name}: ${bezier(motion[name].ease)};`,
    );
  }
  out.push(
    `--dur-reveal: ${motion.reveal.duration}ms;`,
    `--ease-reveal: ${bezier(motion.reveal.ease)};`,
    `--dur-reduced: ${motion.reduced.duration}ms;`,
    `--dur-screen: ${motion.screen.duration}ms;`,
    `--press-scale: ${motionDetail.pressScale};`,
  );
  return out.join('\n  ');
}

/** Builds the stylesheet that exposes every token as a CSS variable. */
export function tokensCss(): string {
  return `:root {\n  ${staticVars()}\n}
:root, [data-theme='dark'] {\n  ${cssVars('dark')}\n}
[data-theme='light'] {\n  ${cssVars('light')}\n}
[data-reduce-motion='true'] {\n  --dur-instant: var(--dur-reduced); --dur-quick: var(--dur-reduced); --dur-standard: var(--dur-reduced); --dur-slide: var(--dur-reduced); --dur-reveal: var(--dur-reduced); --press-scale: 1;\n}`;
}

export function applyTokens(doc: Document = document): void {
  const id = 'lampstand-tokens';
  let el = doc.getElementById(id) as HTMLStyleElement | null;
  if (!el) {
    el = doc.createElement('style');
    el.id = id;
    doc.head.prepend(el);
  }
  el.textContent = tokensCss();
}
