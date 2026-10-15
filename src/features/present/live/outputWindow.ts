// Opening the output window on the TV (PRD §4 Windows: Placement).

export type PlacementResult =
  | { placed: true; screenLabel: string }
  | { placed: false; reason: 'blocked' | 'no-permission' | 'single-screen' | 'unsupported' };

let outputWindow: Window | null = null;

export function outputUrl(): string {
  return `${import.meta.env.BASE_URL ?? '/'}output`;
}

interface ScreenDetailed extends Screen {
  availLeft: number;
  availTop: number;
  left: number;
  top: number;
  isPrimary: boolean;
  label: string;
}

interface ScreenDetails {
  screens: ScreenDetailed[];
  currentScreen: ScreenDetailed;
}

type WindowWithScreens = Window & { getScreenDetails?: () => Promise<ScreenDetails> };

/**
 * Opens (or focuses) the output. With Window Management permission it opens a fullscreen
 * popup on the non-primary display; otherwise a normal popup with drag-to-TV instructions.
 */
export async function openOutput(): Promise<PlacementResult> {
  if (outputWindow && !outputWindow.closed) {
    outputWindow.focus();
    return { placed: true, screenLabel: 'TV' };
  }
  const w = window as WindowWithScreens;
  let target: ScreenDetailed | undefined;
  let reason: Extract<PlacementResult, { placed: false }>['reason'] = 'unsupported';
  if (typeof w.getScreenDetails === 'function') {
    try {
      const details = await w.getScreenDetails();
      target =
        details.screens.find((s) => !s.isPrimary && s !== details.currentScreen) ??
        details.screens.find((s) => s !== details.currentScreen);
      if (!target) reason = 'single-screen';
    } catch {
      reason = 'no-permission';
    }
  }

  if (target) {
    const features = [
      'popup',
      'fullscreen',
      `left=${target.availLeft}`,
      `top=${target.availTop}`,
      `width=${target.width}`,
      `height=${target.height}`,
    ].join(',');
    outputWindow = window.open(`${outputUrl()}?placed=1`, 'lampstand-output', features);
    if (outputWindow) return { placed: true, screenLabel: target.label || 'second display' };
    return { placed: false, reason: 'blocked' };
  }

  outputWindow = window.open(outputUrl(), 'lampstand-output', 'popup,width=960,height=540');
  if (!outputWindow) return { placed: false, reason: 'blocked' };
  return { placed: false, reason };
}

export function isOutputOpen(): boolean {
  return Boolean(outputWindow && !outputWindow.closed);
}

export function closeOutput(): void {
  outputWindow?.close();
  outputWindow = null;
}
