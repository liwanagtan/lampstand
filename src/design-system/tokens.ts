// Single source of truth for every design value in the operator app (PRD §8, §9).
// Components reference these through CSS variables (see applyTokens) or the motion presets.

export type ColorScheme = 'light' | 'dark';

export const colors = {
  // Values from the Lampstand design system (claude.ai artifact L9ft5BdkZhnHrjDCLgrKwo):
  // ink, cream and gold. Dark is the evening: ink ground, raised navy surfaces, cream text.
  dark: {
    bg: '#0A0F1C',
    surface: '#161C2B',
    'surface-raised': '#1E2536',
    'surface-sunk': '#0F1524',
    border: '#222A3B',
    'border-strong': '#2A3142',
    text: '#F5F2EA',
    'text-muted': '#A9AEBB',
    'text-faint': '#8A90A0',
    // Logo gold (brand/README.txt) for fills, borders and highlights.
    accent: '#F2B33D',
    'accent-soft': '#FFDB8C',
    'accent-tint': '#2A2416',
    'accent-contrast': '#0A0F1C',
    'accent-text': '#F2B33D',
    // The one dark card per screen (verse of the day, your plan, day complete).
    hero: '#161C2B',
    'hero-text': '#F5F2EA',
    'hero-text-muted': '#A9AEBB',
    dawn: '#16213A',
    live: '#FF5A4E',
    'live-contrast': '#0A0F1C',
    success: '#5CC98A',
    warning: '#F5B74F',
    'focus-ring': 'rgb(245 242 234 / 0.7)',
    overlay: 'rgb(0 0 0 / 0.6)',
    shadow: 'rgb(0 0 0 / 0)',
    // Workspace atmospheres (docs/PRD-ADDENDUM-GROW.md, Design language).
    paper: '#0F1524',
    stage: '#090C11',
    'stage-surface': '#0F1524',
    'stage-raised': '#161C2B',
    'stage-border': '#222A3B',
    'stage-text': '#F5F2EA',
    'stage-text-muted': '#A9AEBB',
  },
  // Light is the morning: cream ground, white cards, ink text.
  light: {
    bg: '#F5F2EA',
    surface: '#FFFFFF',
    'surface-raised': '#F0EBDF',
    'surface-sunk': '#F0EBDF',
    border: '#E4DCC8',
    'border-strong': '#D9D3C4',
    text: '#0A0F1C',
    'text-muted': '#4B5161',
    'text-faint': '#5F6474',
    // Logo gold for fills; it is ~2:1 on light surfaces, so gold text and focus outlines use
    // the same hue darkened to pass AA (≥ 5.6:1 on every light surface).
    accent: '#F2B33D',
    'accent-soft': '#FFDB8C',
    'accent-tint': '#FBEFD3',
    'accent-contrast': '#0A0F1C',
    'accent-text': '#7A5200',
    hero: '#0A0F1C',
    'hero-text': '#F5F2EA',
    'hero-text-muted': '#A9AEBB',
    dawn: '#F7E7C2',
    live: '#C42B30',
    'live-contrast': '#FFFFFF',
    success: '#1C9455',
    warning: '#B26B00',
    'focus-ring': 'rgb(10 15 28 / 0.7)',
    overlay: 'rgb(10 15 28 / 0.45)',
    shadow: 'rgb(10 15 28 / 0.12)',
    paper: '#FBF8F1',
    stage: '#090C11',
    'stage-surface': '#0F1524',
    'stage-raised': '#161C2B',
    'stage-border': '#222A3B',
    'stage-text': '#F5F2EA',
    'stage-text-muted': '#A9AEBB',
  },
} as const;

export type ColorToken = keyof (typeof colors)['dark'];

export const fontSize = {
  11: 11,
  12: 12,
  13: 13,
  14: 14,
  15: 15,
  16: 16,
  18: 18,
  20: 20,
  24: 24,
  32: 32,
  52: 52,
} as const;
export const fontWeight = {
  regular: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
  extrabold: 800,
} as const;
export const space = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
} as const;
/** Pills for controls, 22px cards, 28px hero cards, sheets and dialogs (design system). */
export const radius = { sm: 10, md: 14, lg: 22, xl: 28, pill: 999 } as const;

export const fonts = {
  display: "'Fraunces Variable', 'Fraunces', Georgia, serif",
  ui: "'Plus Jakarta Sans Variable', 'Plus Jakarta Sans', system-ui, sans-serif",
} as const;

export const size = {
  controlHeight: 44, // design system: 44 px touch targets; PRD §8 asked for at least 40
  controlHeightSm: 36,
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
  // Design system (Motion board): calm light, never fireworks.
  tap: { duration: 120, ease: [0.2, 0, 0, 1] },
  state: { duration: 240, ease: [0.2, 0, 0, 1] },
  sheet: { duration: 400, ease: [0.05, 0.7, 0.1, 1] },
  exit: { duration: 200, ease: [0.3, 0, 1, 1] },
  celebrate: { duration: 900, ease: [0.05, 0.7, 0.1, 1] },
  /** One small overshoot (≤ 12 %), once. */
  overshoot: { duration: 640, ease: [0.34, 1.4, 0.64, 1] },
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
      ? '--elevation-1: none; --elevation-2: 0 10px 30px rgb(0 0 0 / 0.5); --elevation-3: 0 30px 80px rgb(0 0 0 / 0.6);'
      : `--elevation-1: 0 1px 2px rgb(10 15 28 / 0.08); --elevation-2: 0 10px 30px rgb(10 15 28 / 0.18); --elevation-3: 0 30px 80px rgb(10 15 28 / 0.35);`,
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
  for (const name of [
    'instant',
    'quick',
    'standard',
    'slide',
    'tap',
    'state',
    'sheet',
    'exit',
    'celebrate',
    'overshoot',
  ] as const) {
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
[data-theme='dark'] {\n  ${cssVars('dark')}\n}
:root, [data-theme='light'] {\n  ${cssVars('light')}\n}
[data-reduce-motion='true'] {\n  --dur-instant: var(--dur-reduced); --dur-quick: var(--dur-reduced); --dur-standard: var(--dur-reduced); --dur-slide: var(--dur-reduced); --dur-reveal: var(--dur-reduced); --dur-state: var(--dur-reduced); --dur-sheet: var(--dur-reduced); --dur-celebrate: var(--dur-reduced); --dur-overshoot: var(--dur-reduced); --press-scale: 1;\n}`;
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
