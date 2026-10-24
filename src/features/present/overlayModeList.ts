import type { OverlayMode } from '@/schema/common';

export const MODES: { mode: OverlayMode; label: string; key: string }[] = [
  { mode: 'sidePanel', label: 'Side panel', key: '1' },
  { mode: 'lowerThird', label: 'Lower third', key: '2' },
  { mode: 'fullScreen', label: 'Full screen', key: '3' },
  { mode: 'popup', label: 'Popup', key: '4' },
];
