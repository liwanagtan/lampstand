import { useEffect, useState } from 'react';
import { Ember } from '@/features/tour/Ember';
import { previewAction, tipLabel, useRunTip } from './runTip';
import { useTips, type TipGuide } from './tipStore';
import { PEEK_MS, type Tip } from './tips';
import styles from './TipHost.module.css';

/**
 * Ember's peek tips, in two stages so a tip never blocks what you are doing: a peek you can ignore
 * (it tucks away after 8 seconds and counts as Not now), then the tip card if you tap it. Show me
 * hands over to Ember guiding toward the real control.
 */
export function TipHost() {
  const tip = useTips((s) => s.current);
  const stage = useTips((s) => s.stage);
  const guiding = useTips((s) => s.guiding);
  const after = useTips((s) => s.after);
  return (
    <>
      {tip && stage === 'peek' && <Peek key={tip.id} tip={tip} />}
      {tip && stage === 'card' && <Card tip={tip} />}
      {tip && stage === 'guide' && guiding && <Guide key={tip.id} how={guiding} />}
      {after && (
        <p key={after} className={styles.after} role="status">
          <Ember pose="joy" size={34} />
          {after}
        </p>
      )}
    </>
  );
}

function Peek({ tip }: { tip: Tip }) {
  const { open, later } = useTips.getState();
  useEffect(() => {
    const t = window.setTimeout(later, PEEK_MS);
    return () => window.clearTimeout(t);
  }, [later]);
  // Above a bar at the bottom (the verse actions), never over it.
  const bar = useRect('[data-tip-avoid]');
  return (
    <div
      className={styles.peek}
      style={bar ? { bottom: window.innerHeight - bar.top + 12 } : undefined}
    >
      <button type="button" className={styles.peekLine} onClick={open}>
        {tip.peek ?? tip.title}
        <span className={styles.countdown} aria-hidden>
          <span style={{ animationDuration: `${PEEK_MS}ms` }} />
        </span>
      </button>
      <Ember pose="look" size={64} className={styles.peekEmber} />
    </div>
  );
}

function Card({ tip }: { tip: Tip }) {
  const { later, off } = useTips.getState();
  const run = useRunTip();
  const action = previewAction(tip);
  const bar = useRect('[data-tip-avoid]');
  return (
    <>
      <button type="button" className={styles.scrim} aria-label="Close tip" onClick={later} />
      {action.kind === 'guide' && <Ring target={action.target} />}
      <section
        className={styles.card}
        role="dialog"
        aria-labelledby="tip-title"
        style={bar ? { bottom: window.innerHeight - bar.top + 12 } : undefined}
      >
        <Ember pose="look" size={70} className={styles.cardEmber} />
        <p className={styles.eyebrow}>A tip from Ember</p>
        <h2 id="tip-title" className={styles.title}>
          {tip.title}
        </h2>
        <p className={styles.text}>{tip.body}</p>
        <div className={styles.actions}>
          <button type="button" className={styles.quiet} onClick={off}>
            No more tips
          </button>
          <span className={styles.grow} />
          <button type="button" className={styles.quiet} onClick={later}>
            Not now
          </button>
          <button type="button" className={styles.primary} onClick={() => void run(tip)} autoFocus>
            {tipLabel(tip)}
          </button>
        </div>
      </section>
    </>
  );
}

/** Ember waits beside the real control, ringed in gold. Nothing is tapped for you. */
function Guide({ how }: { how: TipGuide }) {
  const rect = useRect(`[data-tip-target="${how.target}"]`);
  const { done } = useTips.getState();

  useEffect(() => {
    // Any tap ends the guide; tapping the control itself also says where to find it next time.
    const onDown = (e: PointerEvent) => {
      const el = visible(`[data-tip-target="${how.target}"]`);
      if (el && e.target instanceof Node && el.contains(e.target))
        useTips.getState().sayAfter(how.after);
      done();
    };
    document.addEventListener('pointerdown', onDown, true);
    // The control went away (the bar closed): there is nothing to guide to.
    const gone = window.setTimeout(() => {
      if (!visible(`[data-tip-target="${how.target}"]`)) done();
    }, 600);
    return () => {
      document.removeEventListener('pointerdown', onDown, true);
      window.clearTimeout(gone);
    };
  }, [how, done]);

  if (!rect) return null;
  const above = rect.top > 140;
  return (
    <>
      <Ring target={how.target} />
      <div
        className={styles.hint}
        role="status"
        style={{
          right: Math.max(12, window.innerWidth - rect.right - 8),
          ...(above ? { bottom: window.innerHeight - rect.top + 18 } : { top: rect.bottom + 18 }),
        }}
      >
        <span className={styles.hintLine}>{how.hint}</span>
        <Ember pose="look" size={56} />
      </div>
    </>
  );
}

function Ring({ target }: { target: string }) {
  const rect = useRect(`[data-tip-target="${target}"]`);
  if (!rect) return null;
  return (
    <span
      className={styles.ring}
      aria-hidden
      style={{
        top: rect.top - 4,
        left: rect.left - 4,
        width: rect.width + 8,
        height: rect.height + 8,
      }}
    />
  );
}

/** The first match actually on screen: a page can hold a hidden copy (another layout's). */
function visible(selector: string): Element | undefined {
  return [...document.querySelectorAll(selector)].find((el) => el.getClientRects().length > 0);
}

/** Where an element is on screen, following it as the page moves. */
function useRect(selector: string): DOMRect | null {
  const [rect, setRect] = useState<DOMRect | null>(null);
  useEffect(() => {
    let last = '';
    let frame = requestAnimationFrame(function follow() {
      const r = visible(selector)?.getBoundingClientRect();
      const key = r ? `${r.top},${r.left},${r.width},${r.height}` : '';
      if (key !== last) {
        last = key;
        setRect(r ?? null);
      }
      frame = requestAnimationFrame(follow);
    });
    return () => cancelAnimationFrame(frame);
  }, [selector]);
  return rect;
}
