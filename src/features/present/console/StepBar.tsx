import { ChevronRight, Snowflake, X } from 'lucide-react';
import { Button, cx } from '@/design-system/components';
import type { OverlayMode } from '@/schema/common';
import type { StoredSlide } from '@/schema/presentation';
import { useControl } from '../live/controlStore';
import { MODES } from '../overlayModeList';
import { labelFor, useVerses } from '../verses/verseStore';
import { buildItems, slideTitle, type NextBeat } from './slideInfo';
import styles from './PresentConsole.module.css';

/**
 * Under Live, one line about what is inside the slide on the TV and what Next does: a typed
 * verse and its layout, a list building item by item, a passage's pages, or simply the next
 * slide. Frozen, blank and the sermon poster say what the TV is doing and what comes back.
 */
export function StepBar({
  slide,
  slideIndex,
  next,
  pages,
}: {
  slide: StoredSlide | undefined;
  slideIndex: number;
  next: NextBeat | null;
  pages: number;
}) {
  const live = useControl((s) => s.live);
  const frozen = useControl((s) => s.frozen);
  const overlayPages = useControl((s) => s.overlayPageCount);
  const dispatch = useControl((s) => s.dispatch);
  const toggleFreeze = useControl((s) => s.toggleFreeze);
  const toggleScreen = useControl((s) => s.toggleScreen);
  const mode = useVerses((s) => s.mode);
  const setMode = useVerses((s) => s.setMode);
  const here = slide ? `slide ${slideIndex + 1}, ${slideTitle(slide)}` : 'the slides';
  const nextButton = (label: string) => (
    <Button
      variant="gold"
      icon={<ChevronRight size={16} />}
      shortcut="→"
      onClick={() => dispatch({ type: 'next' })}
      disabled={!next}
    >
      {label}
    </Button>
  );

  if (frozen) {
    const held = frozen.live.slideIndex;
    return (
      <div className={styles.stepBar} role="status">
        <Snowflake size={20} className={styles.frozenIcon} aria-hidden />
        <div className={styles.stepText}>
          <strong>The TV is holding slide {held + 1}</strong>
          <span>Keep moving. Unfreeze sends where you are now: {here}.</span>
        </div>
        <Button variant="secondary" shortcut="F" onClick={toggleFreeze} className={styles.unfreeze}>
          Unfreeze
        </Button>
      </div>
    );
  }

  if (live.screen === 'blank' || live.screen === 'sermon') {
    const blank = live.screen === 'blank';
    return (
      <div className={styles.stepBar} role="status">
        <div className={styles.stepText}>
          <strong>{blank ? 'The TV is dark' : 'The sermon poster is on the TV'}</strong>
          <span>Under it: {here}. Next still moves the slides underneath.</span>
        </div>
        <Button
          variant="gold"
          shortcut={blank ? 'B' : 'S'}
          onClick={() => toggleScreen(blank ? 'blank' : 'sermon')}
        >
          Back to slides
        </Button>
      </div>
    );
  }

  if (live.overlay) {
    const o = live.overlay;
    return (
      <div className={styles.stepBar}>
        <div className={styles.stepText}>
          <strong>
            Verse · {labelFor(o.ref, o.translation)} · {o.translation}
            {overlayPages > 1 ? ` · page ${o.page + 1} of ${overlayPages}` : ''}
          </strong>
          <span>{slide ? `Over slide ${slideIndex + 1}, which stays underneath.` : ''}</span>
        </div>
        <Button
          variant="primary"
          icon={<X size={16} />}
          shortcut="Esc"
          onClick={() => dispatch({ type: 'clearOverlay' })}
        >
          Remove verse
        </Button>
        <div className={styles.modes} role="radiogroup" aria-label="How the verse shows">
          {MODES.map((m) => (
            <button
              key={m.mode}
              type="button"
              role="radio"
              aria-checked={mode === m.mode}
              className={cx(styles.mode, mode === m.mode && styles.modeOn)}
              onClick={() => setMode(m.mode as OverlayMode)}
            >
              {m.key} {m.label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (slide?.type === 'countdown') {
    return (
      <div className={styles.stepBar}>
        <div className={styles.stepText}>
          <strong>{live.countdownEndsAt === null ? 'Countdown ready' : 'Countdown started'}</strong>
          <span>
            At zero, “Service begins shortly” stays on screen until you move to the next slide.
          </span>
        </div>
        {live.countdownEndsAt === null && (
          <Button variant="gold" onClick={() => dispatch({ type: 'startCountdown' })}>
            Start countdown
          </Button>
        )}
        {nextButton('Next slide')}
      </div>
    );
  }

  const items = buildItems(slide);
  if (slide?.type === 'list' && items) {
    const shown = live.buildStep;
    return (
      <div className={styles.stepBar}>
        <span className={styles.dots} role="img" aria-label={`${shown} of ${items} on the TV`}>
          {slide.items.map((_, i) => (
            <span key={i} className={cx(styles.dot, i < shown && styles.dotOn)} />
          ))}
        </span>
        <div className={styles.stepText}>
          <strong>
            {shown} of {items} on the TV
          </strong>
          <span>
            {shown < items
              ? `Ready to reveal item ${shown + 1}: ${slide.items[shown]}`
              : next
                ? `All shown. Next: ${next.label}`
                : 'All shown. This is the last slide.'}
          </span>
        </div>
        <Button
          variant="secondary"
          disabled={shown === 0}
          onClick={() => dispatch({ type: 'revealStep', delta: -1 })}
        >
          Hide last
        </Button>
        <Button
          variant="gold"
          shortcut="R"
          disabled={shown >= items}
          onClick={() => dispatch({ type: 'revealStep', delta: 1 })}
        >
          {shown >= items ? 'All shown' : `Show item ${shown + 1}`}
        </Button>
        {nextButton('Next slide')}
      </div>
    );
  }

  if (slide?.type === 'reading' && pages > 1) {
    const page = live.slidePage;
    return (
      <div className={styles.stepBar}>
        <span className={styles.dots} role="img" aria-label={`Page ${page + 1} of ${pages}`}>
          {Array.from({ length: pages }, (_, i) => (
            <span key={i} className={cx(styles.dot, i <= page && styles.dotOn)} />
          ))}
        </span>
        <div className={styles.stepText}>
          <strong>
            Page {page + 1} of {pages}
          </strong>
          <span>{next ? `Next: ${next.label}` : 'This is the last page.'}</span>
        </div>
        <Button
          variant="secondary"
          shortcut="["
          disabled={page === 0}
          onClick={() => dispatch({ type: 'slidePage', delta: -1 })}
        >
          Previous page
        </Button>
        <Button
          variant="gold"
          shortcut="]"
          disabled={page >= pages - 1}
          onClick={() => dispatch({ type: 'slidePage', delta: 1 })}
        >
          Next page
        </Button>
        {nextButton('Next slide')}
      </div>
    );
  }

  return (
    <div className={styles.stepBar}>
      <div className={styles.stepText}>
        <strong>{next ? `Next: ${next.label}` : 'This is the last slide'}</strong>
        <span>Type a verse with / to show one that isn’t in the slides.</span>
      </div>
      {nextButton('Next')}
    </div>
  );
}

/**
 * What the TV shows besides the slides: dark, the sermon poster, frozen. (A typed verse is
 * removed from the step bar, where it is described.)
 */
export function ScreenControls() {
  const screen = useControl((s) => s.live.screen);
  const frozen = useControl((s) => Boolean(s.frozen));
  const toggleScreen = useControl((s) => s.toggleScreen);
  const toggleFreeze = useControl((s) => s.toggleFreeze);
  return (
    <div className={styles.controls} role="toolbar" aria-label="What the TV shows">
      <Button
        variant={screen === 'blank' ? 'gold' : 'secondary'}
        shortcut="B"
        aria-pressed={screen === 'blank'}
        onClick={() => toggleScreen('blank')}
      >
        Blank
      </Button>
      <Button
        variant={screen === 'sermon' ? 'gold' : 'secondary'}
        shortcut="S"
        aria-pressed={screen === 'sermon'}
        onClick={() => toggleScreen('sermon')}
      >
        Sermon poster
      </Button>
      <Button
        variant="secondary"
        shortcut="F"
        aria-pressed={frozen}
        className={cx(frozen && styles.freezeOn)}
        onClick={toggleFreeze}
      >
        {frozen ? 'Unfreeze' : 'Freeze'}
      </Button>
    </div>
  );
}
