import { isRouteErrorResponse, Link, useRouteError } from 'react-router-dom';
import styles from './RouteError.module.css';

export function RouteError() {
  const error = useRouteError();
  const notFound = isRouteErrorResponse(error) && error.status === 404;
  return (
    <div className={styles.root} role="alert">
      <h1>{notFound ? 'Page not found' : 'Something went wrong'}</h1>
      <p>
        {notFound
          ? 'That page does not exist.'
          : 'This screen hit a problem. Your presentations are safe.'}
      </p>
      <Link to="/">Back to Library</Link>
    </div>
  );
}
