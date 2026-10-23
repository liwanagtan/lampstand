import { Link } from 'react-router-dom';
import { LampLockup } from '@/design-system/LampMark';
import { accountsConfigured } from '@/features/account/client';
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
          Your name, faith journey choices, reading progress, journal entries, notes, highlights,
          bookmarks, preferences and slides are stored in this browser on this device.
          Without an account, nothing leaves the device. Anyone who can access this browser profile
          may be able to access that data.
        </p>
        <p>
          Profile → Settings → Data lets you export a backup and import it on another device. A
          backup is an ordinary file under your control, so keep it somewhere private. Clearing this
          site’s browser data removes local app data; a downloaded backup remains wherever you saved
          it.
        </p>

        {/* Shown once Google sign-in is switched on (src/features/account/client.ts). */}
        {accountsConfigured && (
          <>
            <h2>If you sign in with Google</h2>
            <p>
              Google tells Lampstand your name and email address so the same account opens on each
              of your devices. Lampstand does not get access to your Gmail, contacts or files.
            </p>
            <p>
              While you are signed in, your profile name and faith journey, plan progress, journal
              entries, notes, highlights, bookmarks, preferences and the place you were reading are
              copied to Lampstand’s account database so they appear on your other devices. It is run
              by Supabase on Lampstand’s behalf. Bible text, slides, pictures and reminder
              times stay on each device. Records are sent over an encrypted connection and each
              account can read only its own records, but they are not encrypted on your device
              first, so the people who run Lampstand could technically read them. They do not look
              at them except to fix a problem you report.
            </p>
            <p>
              Profile → Settings → Account lets you export a copy and delete your account. Deleting
              it removes your sign-in and every synced record from the server; you choose whether to
              keep the copy on the device you are using. Signing out keeps that account’s records on
              the device, hidden from anyone using Lampstand there without signing in.
            </p>
          </>
        )}

        <h2>Usage counts</h2>
        <p>
          To learn whether Lampstand helps people keep reading, the app sends a few anonymous
          events, such as “setup finished”, “plan started” or “plan day completed”, with a random
          device code and the date. They never include your name, email, what you write, what you
          search, verses or Bible text, or page addresses. Raw events are deleted after 30 days;
          only daily totals are kept. You can turn this off in Profile → Settings → Privacy.
        </p>

        <h2>When you are online</h2>
        <p>
          Your browser contacts the hosting provider to load Lampstand and its bundled reading
          content. As with other websites, the provider may receive technical request data such as
          an IP address and browser information. Following a source or support link opens an
          external site with its own practices. Optional reminders use your device’s browser
          notification permission.
        </p>

        <h2>Content and support</h2>
        <p>
          Bible translations, study notes, stories, photos and other source material are identified
          in Profile → Settings → Credits and licences. For help or to report a problem, use the{' '}
          <a
            href="https://github.com/liwanagtan/lampstand/issues/new"
            target="_blank"
            rel="noreferrer"
          >
            Lampstand support issue page
          </a>
          . A GitHub account is required to submit an issue. Please do not post private journal
          entries or personal details in a public issue.
        </p>
      </div>
    </main>
  );
}
