// Templates are token sets applied to the same slide renderers (PRD §8).
import { fonts } from '@/design-system/tokens';
import type { TemplateId } from '@/schema/common';

export interface FontSpec {
  family: string;
  weight: number;
  style?: 'normal' | 'italic';
  letterSpacing?: string;
}

export interface Template {
  id: TemplateId;
  name: string;
  mood: string;
  colors: {
    background: string;
    text: string;
    muted: string;
    accent: string;
    /** Translucent panel behind overlays and captions. */
    panel: string;
    /** Frosted glass behind the lower third and popup verse: the slide shows through. */
    glass: string;
  };
  /** CSS background layers for the template's own background. */
  backdrop: string;
  /** Dark overlay placed over photo and video backgrounds. */
  photoOverlay: string;
  tones: { base: string; accent: string; deep: string };
  gradients: { calm: string; warm: string; dawn: string };
  heading: FontSpec;
  body: FontSpec;
  /** Font for emphasis/quote accents. */
  accentFont: FontSpec;
  texture: 'grain' | 'none' | 'grain-leak';
  /** Modern's slow-moving gradient accent. */
  ambient: boolean;
}

const serif = fonts.display;
const sans = fonts.ui;

export const TEMPLATES: Record<TemplateId, Template> = {
  classic: {
    id: 'classic',
    name: 'Classic',
    mood: 'Reverent, timeless',
    colors: {
      background: '#0B1324',
      text: '#F3EEE3',
      muted: '#C9C2B4',
      accent: '#D9A441',
      panel: 'rgb(8 14 28 / 0.72)',
      glass: 'rgb(10 18 36 / 0.42)',
    },
    backdrop:
      'radial-gradient(120% 90% at 50% 38%, rgb(46 66 110 / 0.55) 0%, rgb(11 19 36 / 0) 62%), radial-gradient(60% 50% at 50% 0%, rgb(217 164 65 / 0.08) 0%, rgb(217 164 65 / 0) 70%), #0B1324',
    photoOverlay: 'linear-gradient(180deg, rgb(11 19 36 / 0.45) 0%, rgb(11 19 36 / 0.72) 100%)',
    tones: { base: '#0B1324', accent: '#3A2A0E', deep: '#060B16' },
    gradients: {
      calm: 'linear-gradient(160deg, #14254A 0%, #0B1324 60%, #070D1A 100%)',
      warm: 'linear-gradient(160deg, #3B2A16 0%, #1A1610 55%, #0B1324 100%)',
      dawn: 'linear-gradient(180deg, #1C2C52 0%, #3A3050 45%, #5A3A2A 100%)',
    },
    heading: { family: serif, weight: 600, letterSpacing: '-0.01em' },
    body: { family: sans, weight: 400 },
    accentFont: { family: serif, weight: 500, style: 'italic' },
    texture: 'grain',
    ambient: false,
  },
  modern: {
    id: 'modern',
    name: 'Modern',
    mood: 'Bold, clean, current',
    colors: {
      background: '#0A0A0B',
      text: '#FFFFFF',
      muted: '#C4C7CE',
      accent: '#7FA5FF',
      panel: 'rgb(10 10 11 / 0.74)',
      glass: 'rgb(12 14 20 / 0.42)',
    },
    backdrop:
      'radial-gradient(70% 60% at 85% 15%, rgb(91 140 255 / 0.22) 0%, rgb(91 140 255 / 0) 70%), radial-gradient(60% 60% at 10% 95%, rgb(91 140 255 / 0.10) 0%, rgb(91 140 255 / 0) 70%), #0A0A0B',
    photoOverlay: 'linear-gradient(180deg, rgb(10 10 11 / 0.5) 0%, rgb(10 10 11 / 0.78) 100%)',
    tones: { base: '#0A0A0B', accent: '#16244A', deep: '#000000' },
    gradients: {
      calm: 'linear-gradient(135deg, #0F1B3D 0%, #0A0A0B 70%)',
      warm: 'linear-gradient(135deg, #2A1530 0%, #0A0A0B 70%)',
      dawn: 'linear-gradient(135deg, #1B2B5E 0%, #3B2559 50%, #0A0A0B 100%)',
    },
    heading: { family: sans, weight: 700, letterSpacing: '-0.03em' },
    body: { family: sans, weight: 500 },
    accentFont: { family: sans, weight: 700 },
    texture: 'none',
    ambient: true,
  },
  warm: {
    id: 'warm',
    name: 'Warm',
    mood: 'Soft, human, photographic',
    colors: {
      background: '#1C1714',
      text: '#F6EFE4',
      muted: '#D8CCBB',
      accent: '#E8956B',
      panel: 'rgb(28 23 20 / 0.74)',
      glass: 'rgb(30 22 18 / 0.42)',
    },
    backdrop:
      'radial-gradient(90% 70% at 20% 10%, rgb(217 119 75 / 0.18) 0%, rgb(217 119 75 / 0) 65%), radial-gradient(80% 80% at 90% 100%, rgb(120 70 40 / 0.25) 0%, rgb(120 70 40 / 0) 70%), #1C1714',
    photoOverlay: 'linear-gradient(180deg, rgb(28 18 12 / 0.55) 0%, rgb(28 18 12 / 0.55) 100%)',
    tones: { base: '#1C1714', accent: '#4A2616', deep: '#120E0C' },
    gradients: {
      calm: 'linear-gradient(160deg, #2A2420 0%, #1C1714 70%)',
      warm: 'linear-gradient(160deg, #4A2A1A 0%, #1C1714 70%)',
      dawn: 'linear-gradient(180deg, #3A2A2E 0%, #6A3A28 55%, #2A1A12 100%)',
    },
    heading: { family: sans, weight: 600, letterSpacing: '-0.015em' },
    body: { family: sans, weight: 400 },
    accentFont: { family: serif, weight: 500, style: 'italic' },
    texture: 'grain-leak',
    ambient: false,
  },
};

export function getTemplate(id: TemplateId | undefined): Template {
  return TEMPLATES[id ?? 'classic'] ?? TEMPLATES.classic;
}

export function templateVars(t: Template): Record<string, string> {
  return {
    '--t-bg': t.colors.background,
    '--t-text': t.colors.text,
    '--t-muted': t.colors.muted,
    '--t-accent': t.colors.accent,
    '--t-panel': t.colors.panel,
    '--t-glass': t.colors.glass,
    '--t-backdrop': t.backdrop,
    '--t-photo-overlay': t.photoOverlay,
    '--t-heading-font': t.heading.family,
    '--t-heading-weight': String(t.heading.weight),
    '--t-heading-style': t.heading.style ?? 'normal',
    '--t-heading-tracking': t.heading.letterSpacing ?? 'normal',
    '--t-body-font': t.body.family,
    '--t-body-weight': String(t.body.weight),
    '--t-accent-font': t.accentFont.family,
    '--t-accent-weight': String(t.accentFont.weight),
    '--t-accent-style': t.accentFont.style ?? 'normal',
  };
}
