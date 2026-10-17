import { Outlet } from 'react-router-dom';
import { useBibleTvSession } from '@/features/bible-app/tvActions';

/** Today, Bible, Plans and Journal: one TV session stays up as you move between them. */
export function PersonalLayout() {
  useBibleTvSession();
  return <Outlet />;
}
