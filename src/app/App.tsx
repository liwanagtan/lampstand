import { RouterProvider } from 'react-router-dom';
import { Toaster, TooltipProvider } from '@/design-system/components';
import { BibleGate } from '@/features/bible/BibleGate';
import { router } from './router';

export function App() {
  return (
    <TooltipProvider delayDuration={400} skipDelayDuration={200}>
      <BibleGate>
        <RouterProvider router={router} />
      </BibleGate>
      <Toaster />
    </TooltipProvider>
  );
}
