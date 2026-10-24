import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react';
import { useLocation } from 'react-router-dom';
import { useIsPhone } from '@/app/useIsPhone';
import { useSettings } from '@/features/settings/settingsStore';
import { useReducedMotion } from '@/features/settings/theme';
import { Ember } from './Ember';
import { isTourQueued, TOUR_STOPS, useTour, type TourStop } from './tour';
import styles from './GuidedTour.module.css';

const PAD = 8;
/** Smaller than this is a placeholder (no plan yet), not something to show. */
const MIN_HEIGHT = 40;
/** Room the step card needs below a spotlight, Ember included; with less it sits at the bottom. */
const CARD_ROOM = 280;

/**
 * The phone tour: Ember says hello over Today, the spotlight walks through the verse of the day,
 * your plan, the Bible tab and Profile, then All set. Skip is always on screen; nothing behind
 * the tour can be tapped until it ends.
 */
export function GuidedTour() {
  const phone = useIsPhone();
  const { pathname } = useLocation();
  const step = useTour((s) => s.step);
  const { go, end } = useTour.getState();
  const reduced = useReducedMotion();
  const name = useSettings((s) => s.profile.name.trim().split(/\s+/)[0] ?? '');
  const [stops, setStops] = useState<readonly TourStop[]>(TOUR_STOPS);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const primary = useRef<HTMLButtonElement>(null);
  const showing = phone && pathname === '/' && step !== null;

  useEffect(() => {
    if (phone && pathname === '/' && useTour.getState().step === null && isTourQueued())
      useTour.getState().start();
  }, [phone, pathname]);

  // Only the parts this person has: a hidden tab or an empty plan slot is no stop.
  const begin = () => {
    const here = TOUR_STOPS.filter(
      (s) =>
        (document.querySelector(`[data-tour="${s.target}"]`)?.getBoundingClientRect().height ??
          0) >= MIN_HEIGHT,
    );
    setStops(here);
    go(here.length ? 0 : 'done');
  };

  const stop = typeof step === 'number' ? stops[step] : undefined;

  useLayoutEffect(() => {
    if (!showing || !stop) return;
    const el = document.querySelector(`[data-tour="${stop.target}"]`);
    if (!el) return;
    if (!stop.target.startsWith('tab-'))
      el.scrollIntoView({ block: 'start', behavior: reduced ? 'auto' : 'smooth' });
    // Follow the element every frame: it moves while the page scrolls, and the page can't be
    // touched during the tour, so this is the whole cost.
    let last = '';
    let frame = requestAnimationFrame(function follow() {
      const r = el.getBoundingClientRect();
      const key = `${r.top},${r.left},${r.width},${r.height}`;
      if (key !== last) {
        last = key;
        setRect(r);
      }
      frame = requestAnimationFrame(follow);
    });
    return () => cancelAnimationFrame(frame);
  }, [showing, stop, reduced]);

  useEffect(() => {
    if (showing) primary.current?.focus({ preventScroll: true });
  }, [showing, step]);

  if (!showing) return null;

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') end();
  };

  if (step === 'welcome')
    return (
      <div className={styles.layer} onKeyDown={onKeyDown}>
        <div className={styles.scrim} />
        <section
          className={styles.sheet}
          role="dialog"
          aria-modal="true"
          aria-labelledby="tour-hello"
        >
          <Ember pose="hello" size={150} className={styles.sheetEmber} />
          <p className={styles.eyebrow}>Welcome to Lampstand</p>
          <h2 id="tour-hello" className={styles.sheetTitle}>
            {name ? `Hello, ${name}. I’m Ember.` : 'Hello. I’m Ember.'}
          </h2>
          <p className={styles.text}>
            Can I show you around? It takes about a minute, and you can stop any time.
          </p>
          <button ref={primary} type="button" className={styles.primaryWide} onClick={begin}>
            Show me around
          </button>
          <button type="button" className={styles.quietWide} onClick={() => end()}>
            Not now
          </button>
        </section>
      </div>
    );

  if (step === 'done')
    return (
      <div className={styles.layer} onKeyDown={onKeyDown}>
        <section
          className={styles.done}
          role="dialog"
          aria-modal="true"
          aria-labelledby="tour-done"
        >
          <Ember pose="joy" size={200} className={styles.pop} />
          <p className={styles.doneEyebrow}>You’re all set</p>
          <h2 id="tour-done" className={styles.doneTitle}>
            Today’s verse is waiting
          </h2>
          <p className={styles.doneText}>
            I’ll stay out of the way. Find this tour again in Profile › Settings.
          </p>
          <button
            ref={primary}
            type="button"
            className={styles.primaryWide}
            onClick={() => end({ read: true })}
          >
            Start reading
          </button>
        </section>
      </div>
    );

  const index = step as number;
  const last = index === stops.length - 1;
  const below = rect ? rect.top + rect.height / 2 < window.innerHeight / 2 : true;
  const tab = stop?.target.startsWith('tab-');

  return (
    <div className={styles.layer} onKeyDown={onKeyDown}>
      <div className={styles.blocker} />
      {rect && (
        <div
          className={styles.spot}
          style={{
            top: rect.top - PAD,
            left: rect.left - PAD,
            width: rect.width + PAD * 2,
            height: rect.height + PAD * 2,
            borderRadius: tab ? 20 : 28,
          }}
        />
      )}
      <button type="button" className={styles.skip} onClick={() => end()}>
        Skip tour
      </button>
      {stop && rect && (
        <section
          key={index}
          className={styles.bubble}
          style={
            !below
              ? { bottom: window.innerHeight - rect.top + PAD + 16 }
              : window.innerHeight - rect.bottom >= CARD_ROOM
                ? { top: rect.bottom + PAD + 52 }
                : { bottom: 'calc(var(--space-4) + env(safe-area-inset-bottom))' }
          }
          role="dialog"
          aria-modal="true"
          aria-labelledby="tour-stop"
          aria-describedby="tour-stop-body"
        >
          <Ember pose="look" size={76} className={styles.bubbleEmber} />
          <p className={styles.eyebrow}>
            Step {index + 1} of {stops.length}
          </p>
          <h2 id="tour-stop" className={styles.bubbleTitle}>
            {stop.title}
          </h2>
          <p id="tour-stop-body" className={styles.text}>
            {stop.body}
          </p>
          <div className={styles.row}>
            <span className={styles.dots} aria-hidden>
              {stops.map((s, i) => (
                <span key={s.target} className={styles.dot} data-on={i === index || undefined} />
              ))}
            </span>
            <button
              type="button"
              className={styles.quiet}
              onClick={() => go(index === 0 ? 'welcome' : index - 1)}
            >
              Back
            </button>
            <button
              ref={primary}
              type="button"
              className={styles.primary}
              onClick={() => go(last ? 'done' : index + 1)}
            >
              {last ? 'Finish' : 'Next'}
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
