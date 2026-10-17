import { Navigate } from 'react-router-dom';
import { TodayPage } from '@/features/bible-app/TodayPage';
import { useSettings } from '@/features/settings/settingsStore';
import { homePath } from './features';
import { paths } from './paths';

/** `/`: Today, or the first destination still showing when Today is switched off. */
export function HomeRoute() {
  const features = useSettings((s) => s.features);
  const home = homePath(features);
  if (home !== paths.today) return <Navigate to={home} replace />;
  return <TodayPage />;
}
