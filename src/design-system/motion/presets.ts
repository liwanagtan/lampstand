import type { Transition, Variants } from 'motion/react';
import { motion as m, motionDetail } from '../tokens';

type Token = 'instant' | 'quick' | 'standard' | 'slide';

const sec = (ms: number) => ms / 1000;

/** A Motion transition built from a motion token; collapses to a short crossfade when reduced. */
export function transition(token: Token, reduced = false): Transition {
  if (reduced) return { duration: sec(m.reduced.duration), ease: 'easeOut' };
  const t = m[token];
  return { duration: sec(t.duration), ease: [...t.ease] as [number, number, number, number] };
}

export function revealTransition(index: number, reduced = false): Transition {
  if (reduced) return { duration: sec(m.reduced.duration) };
  return {
    duration: sec(m.reveal.duration),
    delay: sec(m.reveal.stagger * index),
    ease: [...m.reveal.ease] as [number, number, number, number],
  };
}

/** Fade + small vertical offset; movement is dropped under reduced motion. */
export function fadeUp(distance: number, reduced = false): Variants {
  return {
    hidden: { opacity: 0, y: reduced ? 0 : distance },
    visible: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: reduced ? 0 : distance / 2 },
  };
}

export const presets = {
  pop: (reduced = false): Variants => ({
    hidden: { opacity: 0, scale: reduced ? 1 : motionDetail.commandBarScale },
    visible: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: reduced ? 1 : motionDetail.commandBarScale },
  }),
  toast: (reduced = false): Variants => fadeUp(16, reduced),
  shake: (reduced = false) =>
    reduced
      ? {}
      : {
          x: [0, -motionDetail.shakeDistance, motionDetail.shakeDistance, -3, 3, 0],
          transition: { duration: sec(m.standard.duration * 1.6) },
        },
};
