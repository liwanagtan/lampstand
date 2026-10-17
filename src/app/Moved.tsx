import { Navigate, useParams } from 'react-router-dom';

/** An old link that moved: sends it to its new home, keeping its parameters. */
export function Moved({ to }: { to: (p: Record<string, string | undefined>) => string }) {
  const params = useParams();
  return <Navigate to={to(params)} replace />;
}
