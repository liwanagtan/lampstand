import { RouterProvider } from 'react-router-dom';
import { Toaster, TooltipProvider } from '@/design-system/components';
import { router } from './router';

export function App() {
  return (
    <TooltipProvider delayDuration={400} skipDelayDuration={200}>
      <RouterProvider router={router} />
      <Toaster />
    </TooltipProvider>
  );
}
