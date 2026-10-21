import { Link } from 'react-router-dom';
import { LampLockup } from '@/design-system/LampMark';
import styles from './PublicInfoPage.module.css';

/** Public information is available before onboarding or installing the app. */
export function PublicInfoPage() {
  return (
    <main className={styles.page}>
      <div className={styles.content}>
        <Link to="/" className={styles.brand} aria-label="Lampstand home">
          <LampLockup size={30} title="Lampstand" />
        </Link>
        <h1>Privacy, data and support</h1>
        <p>
          Lampstand is a reading companion that works on your device. You can use it without
          creating an account.
        </p>

        <h2>Your reading data</h2>
        <p>
          Your name, faith journey choices, reading progress, journal entries, notes,
          highlights, bookmarks, preferences and presentations are stored in this browser on
          this device. Lampstand does not currently sync them to an account or another device.
          Anyone who can access this browser profile may be able to access that data.
        </p>
        <p>
          Profile → Settings → Data lets you export a backup and import it on another device.
          A backup is an ordinary file under your control, so keep it somewhere private.
          Clearing this site’s browser data removes local app data; a downloaded backup remains
          wherever you saved it.
        </p>

        <h2>When you are online</h2>
        <p>
          Your browser contacts the hosting provider to load Lampstand and its bundled reading
          content. As with other websites, the provider may receive technical request data such
          as an IP address and browser information. Following a source or support link opens an
          external site with its own practices. Optional reminders use your device’s browser
          notification permission.
        </p>

        <h2>Content and support</h2>
        <p>
          Bible translations, study notes, stories, photos and other source material are
          identified in Profile → Settings → Credits and licences. For help or to report a
          problem, use the{' '}
          <a href="https://github.com/liwanagtan/lampstand/issues/new" target="_blank" rel="noreferrer">
            Lampstand support issue page
          </a>
          . A GitHub account is required to submit an issue. Please do not post private journal
          entries or personal details in a public issue.
        </p>
      </div>
    </main>
  );
}
