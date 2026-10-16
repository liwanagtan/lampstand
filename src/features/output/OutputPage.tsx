import { useEffect, useState } from 'react';
import { Maximize } from 'lucide-react';
import { LampMark } from '@/design-system/LampMark';
import { LiveScreen } from '@/features/present/LiveScreen';
import { FeatureBoundary } from '@/design-system/components';
import { openChannel } from '@/features/present/live/channel';
import { BIBLE_ID, type LiveSnapshot } from '@/features/present/live/types';
import { useApplyDocumentTheme } from '@/features/settings/theme';
import { useSettings } from '@/features/settings/settingsStore';
import { preloadAsset } from '@/slides/useAsset';
import { db } from '@/db/db';
import { getPassage } from '@/features/bible/passage';
import { getTranslation } from '@/features/bible/bibleStore';
import { parseRef } from '@/features/bible/ref';
import { slideTranslation } from '@/features/library/translation';
import styles from './OutputPage.module.css';

/**
 * The audience window (PRD §7.6). It only renders the latest snapshot it received and never
 * changes live state. If the control window goes away, the last image stays on the TV.
 */
const WAIT_MS = 2500;

export function OutputPage() {
  useApplyDocumentTheme(true);
  const [snapshot, setSnapshot] = useState<LiveSnapshot | null>(null);
  const [fullscreen, setFullscreen] = useState(() => Boolean(document.fullscreenElement));
  const placed = new URLSearchParams(window.location.search).has('placed');
  // Nothing has arrived for a while: explain, instead of leaving the screen black.
  const [stale, setStale] = useState(false);
  useEffect(() => {
    if (snapshot) return;
    const id = setTimeout(() => setStale(true), WAIT_MS);
    return () => clearTimeout(id);
  }, [snapshot]);

  useEffect(() => {
    document.title = 'Lampstand — Output';
    const channel = openChannel((m) => {
      if (m.type === 'snapshot')
        setSnapshot((prev) =>
          !prev || m.snapshot.rev >= prev.rev || m.snapshot.changedAt > prev.changedAt
            ? m.snapshot
            : prev,
        );
    });
    channel.post({ type: 'hello' });
    const alive = setInterval(() => channel.post({ type: 'alive' }), 1500);
    const bye = () => channel.post({ type: 'bye' });
    window.addEventListener('pagehide', bye);
    return () => {
      window.removeEventListener('pagehide', bye);
      clearInterval(alive);
      bye();
      channel.close();
    };
  }, []);

  useEffect(() => {
    const onChange = () => setFullscreen(Boolean(document.fullscreenElement));
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'f' || e.key === 'F') {
        if (document.fullscreenElement) void document.exitFullscreen();
        else void document.documentElement.requestFullscreen().catch(() => {});
      }
    };
    document.addEventListener('fullscreenchange', onChange);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('fullscreenchange', onChange);
      window.removeEventListener('keydown', onKey);
    };
  }, []);

  // Follow the operator's Reduce motion setting (kept in this window's memory only).
  const operatorReduce = snapshot?.reduceMotion;
  useEffect(() => {
    if (operatorReduce !== undefined) useSettings.setState({ reduceMotion: operatorReduce });
  }, [operatorReduce]);

  // Preload the next slide's background and verses (PRD §7.6).
  useEffect(() => {
    const next = snapshot?.presentation?.slides[snapshot.live.slideIndex + 1];
    if (!next) return;
    const bg = next.background;
    if ((bg?.type === 'image' || bg?.type === 'video') && bg.assetId) preloadAsset(bg.assetId);
    if (next.type === 'verse') {
      const t = getTranslation(slideTranslation(next, snapshot.translation));
      const range = parseRef(next.ref);
      if (t && range) void getPassage(db, t, range).catch(() => {});
    }
  }, [snapshot?.live.slideIndex, snapshot?.presentation, snapshot?.translation]);

  return (
    <div className={styles.root} data-testid="output">
      {snapshot && (snapshot.presentation || snapshot.live.presentationId === BIBLE_ID) ? (
        <FeatureBoundary name="Output" silent>
          <LiveScreen snapshot={snapshot} fit="contain" className={styles.screen} />
        </FeatureBoundary>
      ) : (
        <div className={styles.waiting}>
          {stale && (
            <div className={styles.idle} role="status">
              <LampMark size={56} />
              <h1>This is the TV screen</h1>
              <p>
                Keep Lampstand open in another window and press <strong>Start Presentation</strong>.
                Whatever you send to the screen appears here.
              </p>
              {!window.opener && (
                <p className={styles.idleNote}>
                  If this replaced your Lampstand window, your browser couldn’t open a second one.
                  Use Chrome, and allow pop-ups for Lampstand.
                </p>
              )}
              <a className={styles.idleLink} href={import.meta.env.BASE_URL ?? '/'}>
                Back to Lampstand
              </a>
            </div>
          )}
        </div>
      )}
      {!fullscreen && !placed && (
        <div className={styles.hint} role="note">
          <Maximize size={18} aria-hidden />
          Drag this window to the TV and press <kbd>F</kbd> for full screen.
        </div>
      )}
    </div>
  );
}
