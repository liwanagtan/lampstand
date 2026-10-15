// TV motion (PRD §9 On the TV). GSAP drives text timelines on the slide canvas.
import gsap from 'gsap';
import { CustomEase } from 'gsap/CustomEase';
import { SplitText } from 'gsap/SplitText';
import { motion, motionDetail } from '@/design-system/tokens';

gsap.registerPlugin(SplitText, CustomEase);

const [x1, y1, x2, y2] = motion.reveal.ease;
/** The reveal token's cubic-bezier as a GSAP ease. */
const REVEAL_EASE = CustomEase.create('lampstandReveal', `M0,0 C${x1},${y1} ${x2},${y2} 1,1`);

/** Speed beats polish (PRD §9): an interrupted reveal jumps to its final state. */
function finish(tween: gsap.core.Tween): void {
  tween.progress(1);
  tween.kill();
}

export function isReducedMotion(): boolean {
  return document.documentElement.dataset.reduceMotion === 'true';
}

/** Headings fade up by line. Returns a cleanup that reverts the split. */
export function revealLines(el: HTMLElement, delayMs = 0): () => void {
  if (isReducedMotion()) {
    const tween = gsap.fromTo(
      el,
      { opacity: 0 },
      { opacity: 1, duration: motion.reduced.duration / 1000 },
    );
    return () => finish(tween);
  }
  const split = SplitText.create(el, { type: 'lines', linesClass: 'reveal-line' });
  const tween = gsap.fromTo(
    split.lines,
    { opacity: 0, y: motionDetail.riseDistance },
    {
      opacity: 1,
      y: 0,
      duration: motion.reveal.duration / 1000,
      stagger: motion.reveal.stagger / 1000,
      ease: REVEAL_EASE,
      delay: delayMs / 1000,
    },
  );
  return () => {
    finish(tween);
    split.revert();
  };
}

/** Fades a block up (list build items, verse text). */
export function revealBlock(
  el: HTMLElement,
  delayMs = 0,
  distance: number = motionDetail.riseDistance,
): () => void {
  const reduced = isReducedMotion();
  const tween = gsap.fromTo(
    el,
    { opacity: 0, y: reduced ? 0 : distance },
    {
      opacity: 1,
      y: 0,
      duration: (reduced ? motion.reduced.duration : motion.reveal.duration) / 1000,
      ease: REVEAL_EASE,
      delay: reduced ? 0 : delayMs / 1000,
    },
  );
  return () => finish(tween);
}
