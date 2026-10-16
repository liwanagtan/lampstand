import { toast } from '@/design-system/components';
import { useControl } from './controlStore';
import { openOutput } from './outputWindow';

/** Opens the output on the TV and marks the presentation started. False if Chrome blocked it. */
export async function startOutput(): Promise<boolean> {
  const r = await openOutput();
  if (!r.placed && r.reason === 'blocked') {
    toast({
      title: 'Chrome blocked the output window. Allow pop-ups for Lampstand and try again.',
      tone: 'warning',
    });
    return false;
  }
  useControl.getState().setPresenting(true);
  if (r.placed) {
    toast({ title: `Presentation started on ${r.screenLabel}`, tone: 'success' });
  } else {
    toast({
      title: 'Presentation started',
      description:
        r.reason === 'no-permission'
          ? 'Drag the output to the TV and press F. Allow “window management” to place it automatically next time.'
          : r.reason === 'single-screen'
            ? 'Only one display found. Connect the TV, then drag the output to it and press F.'
            : 'Drag the output to the TV and press F for full screen.',
    });
  }
  return true;
}
