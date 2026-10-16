import { useEffect, useRef, useState } from 'react';
import type { HyperframesPlayer } from '@hyperframes/player';
import styles from './Poster.module.css';

/** The Scene's entrance ends here; the player then loops [ENTER, END) seamlessly. */
const ENTER = 2;
const END = 38;
/** The Scene loads only after the poster has been live this long, so quick navigation past
 * the title slide never pays its loading cost; the static poster plays the entrance meanwhile. */
const MOUNT_DELAY = 1800;
const LOAD_TIMEOUT = 4000;

export interface SceneData {
  template: string;
  title: string;
  series?: string;
  date?: string;
  speaker?: string;
  ref?: string;
  excerpt?: string;
  image?: string;
}

interface ScenePlayerProps {
  data: SceneData;
  /** Reduce motion: show the designed final frame without looping. */
  still: boolean;
}

/**
 * Plays the Scene composition (HyperFrames, pinned) over the static poster. It only becomes
 * visible once painted, so a slow or failed load simply leaves the static poster in place.
 */
export function ScenePlayer({ data, still }: ScenePlayerProps) {
  const host = useRef<HTMLDivElement>(null);
  const player = useRef<HyperframesPlayer | null>(null);
  const [visible, setVisible] = useState(false);
  const dataRef = useRef(data);
  const stillRef = useRef(still);
  useEffect(() => {
    dataRef.current = data;
    stillRef.current = still;
  });

  useEffect(() => {
    let cancelled = false;
    function mount(): () => void {
      const el = document.createElement('hyperframes-player') as HyperframesPlayer;
      el.setAttribute('src', `${import.meta.env.BASE_URL ?? '/'}scenes/sermon/index.html`);
      el.setAttribute('muted', '');
      el.setAttribute('assets-loading-ui', 'none');
      el.setAttribute('shader-loading', 'none');
      el.className = styles.player;
      let looping = false;
      let gaveUp = false;
      const fail = setTimeout(() => {
        gaveUp = true;
      }, LOAD_TIMEOUT);

      const onReady = () => el.setRuntimeData('sermon', dataRef.current);
      const onApplied = () => {
        if (gaveUp) return;
        clearTimeout(fail);
        // The static poster has already played the entrance: join the loop where it ends.
        el.seek(ENTER);
        if (stillRef.current) el.pause();
        else el.play();
        requestAnimationFrame(() => setVisible(true));
      };
      const onTime = () => {
        if (!looping && el.currentTime >= ENTER) {
          looping = true;
          el.setAttribute('range-start', String(ENTER));
          el.setAttribute('range-end', String(END));
          el.setAttribute('loop', '');
        }
      };
      el.addEventListener('ready', onReady);
      el.addEventListener('runtimedataapplied', onApplied);
      el.addEventListener('timeupdate', onTime);
      host.current?.appendChild(el);
      player.current = el;
      return () => {
        clearTimeout(fail);
        el.removeEventListener('ready', onReady);
        el.removeEventListener('runtimedataapplied', onApplied);
        el.removeEventListener('timeupdate', onTime);
        el.remove();
        player.current = null;
      };
    }

    let cleanup: (() => void) | undefined;
    // The player is loaded on first use (out of the main bundle), once the poster has settled.
    const timer = setTimeout(() => {
      void import('@hyperframes/player').then(() => {
        if (!cancelled) cleanup = mount();
      });
    }, MOUNT_DELAY);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      cleanup?.();
    };
  }, []);

  // Content changes update the running scene without restarting it.
  const key = JSON.stringify(data);
  useEffect(() => {
    const el = player.current;
    if (el?.ready) el.setRuntimeData('sermon', JSON.parse(key) as SceneData);
  }, [key]);

  return <div ref={host} className={styles.scene} data-visible={visible} aria-hidden />;
}
