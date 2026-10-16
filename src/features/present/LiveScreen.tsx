import { useMemo, useState } from 'react';
import {
  AnimatePresence,
  motion,
  type Transition as MotionTransition,
  type Variants,
} from 'motion/react';
import { motion as tokens, motionDetail } from '@/design-system/tokens';
import { LampMark } from '@/design-system/LampMark';
import { FeatureBoundary } from '@/design-system/components';
import { useReducedMotion } from '@/features/settings/theme';
import { slideTranslation } from '@/features/library/translation';
import type { OverlayMode, Transition } from '@/schema/common';
import { getTemplate } from '@/templates/templates';
import { Backdrop } from '@/slides/Backdrop';
import { SlideStage } from '@/slides/SlideStage';
import { SlideView } from '@/slides/SlideView';
import { useAsset } from '@/slides/useAsset';
import { OVERLAY } from '@/templates/metrics';
import type { LiveSnapshot } from './live/types';
import { VerseOverlay } from './VerseOverlay';
import { PosterContext, posterInfoFor } from '@/slides/poster/posterInfo';
import styles from './LiveScreen.module.css';

const sec = (ms: number) => ms / 1000;
const ease = (e: readonly number[]) => [...e] as [number, number, number, number];

/** Where an overlay enters from and leaves to (PRD §9 Overlays). The popup card scales in CSS. */
function overlayFrom(mode: OverlayMode, reduced: boolean) {
  if (reduced || mode === 'fullScreen') return { opacity: 0 };
  if (mode === 'lowerThird') return { opacity: 0, y: motionDetail.overlayRise };
  return { opacity: 0, x: '12%' };
}

function slideVariants(kind: Transition, direction: 1 | -1, reduced: boolean): Variants {
  if (reduced || kind === 'fade')
    return { enter: { opacity: 0 }, center: { opacity: 1 }, exit: { opacity: 0 } };
  if (kind === 'none')
    return {
      enter: { opacity: 1 },
      center: { opacity: 1 },
      exit: { opacity: 0, transition: { duration: 0 } },
    };
  if (kind === 'rise') {
    return {
      enter: { opacity: 0, y: motionDetail.riseDistance },
      center: { opacity: 1, y: 0 },
      exit: { opacity: 0 },
    };
  }
  const d = motionDetail.pushDistance * direction;
  return {
    enter: { opacity: 0, x: d },
    center: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -d },
  };
}

interface LiveScreenProps {
  snapshot: LiveSnapshot;
  /** 'contain' fills a fullscreen window; 'width' sizes by the pane width. */
  fit?: 'contain' | 'width';
  label?: string;
  className?: string;
}

/**
 * Draws exactly what the audience sees for a snapshot: slide, verse overlay, blank or logo.
 * Used by the output window and the control screen's Live pane.
 */
export function LiveScreen({ snapshot, fit = 'width', label, className }: LiveScreenProps) {
  const reduced = useReducedMotion();
  const { live, presentation } = snapshot;
  const template = getTemplate(live.theme);
  const slide = presentation?.slides[live.slideIndex];
  const overlay = live.overlay;

  // Content that was already live when this screen mounted is drawn in its final state, so a
  // reopened output restores the TV without replaying entrance motion.
  const overlayKey = overlay ? `${overlay.ref}|${overlay.translation}|${overlay.mode}` : null;
  const [initial, setInitial] = useState(() => ({ slide: slide?.id ?? null, overlay: overlayKey }));
  if (initial.slide && slide?.id !== initial.slide) setInitial((i) => ({ ...i, slide: null }));
  if (initial.overlay && overlayKey !== initial.overlay)
    setInitial((i) => ({ ...i, overlay: null }));

  // Direction of travel, for push transitions.
  const [travel, setTravel] = useState({ index: live.slideIndex, dir: 1 as 1 | -1 });
  const direction: 1 | -1 =
    live.slideIndex === travel.index ? travel.dir : live.slideIndex > travel.index ? 1 : -1;
  if (live.slideIndex !== travel.index) setTravel({ index: live.slideIndex, dir: direction });

  const slideTransition: MotionTransition = reduced
    ? { duration: sec(tokens.reduced.duration) }
    : { duration: sec(tokens.slide.duration), ease: ease(tokens.slide.ease) };
  const overlayTransition: MotionTransition = reduced
    ? { duration: sec(tokens.reduced.duration) }
    : { duration: sec(tokens.standard.duration * 2), ease: ease(tokens.slide.ease) };

  const side = overlay?.mode === 'sidePanel';
  const fullOverlay = overlay?.mode === 'fullScreen';
  const translation = snapshot.translation;

  const posterInfo = useMemo(
    () =>
      presentation
        ? posterInfoFor(presentation, translation, snapshot.posterAnimated ?? true)
        : null,
    [presentation, translation, snapshot.posterAnimated],
  );

  return (
    <PosterContext.Provider value={posterInfo}>
      <SlideStage template={template} fit={fit} label={label} className={className}>
        {!presentation && (
          // Bible on the TV: the template's backdrop sits behind the verses.
          <div className={styles.slide}>
            <Backdrop
              background={undefined}
              template={template}
              animate={false}
              showPlaceholder={false}
            />
          </div>
        )}
        <motion.div
          className={styles.slideLayer}
          animate={
            side
              ? { scale: 1 - OVERLAY.sidePanelWidth, opacity: 1 }
              : fullOverlay
                ? { scale: 1, opacity: 0 }
                : { scale: 1, opacity: 1 }
          }
          transition={overlayTransition}
        >
          <AnimatePresence initial={false} custom={direction}>
            {slide && (
              <motion.div
                key={slide.id}
                className={styles.slide}
                variants={slideVariants(slide.transition ?? 'fade', direction, reduced)}
                initial="enter"
                animate="center"
                exit="exit"
                transition={slideTransition}
              >
                <SlideView
                  slide={slide}
                  template={template}
                  mode={slide.id === initial.slide ? 'preview' : 'live'}
                  translation={slideTranslation(slide, translation)}
                  buildStep={live.buildStep}
                  page={live.slidePage}
                  countdownEndsAt={live.countdownEndsAt}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        <AnimatePresence>
          {overlay && (
            <motion.div
              key={`${overlay.mode}`}
              className={styles.overlayLayer}
              initial={overlayFrom(overlay.mode, reduced)}
              animate={{ opacity: 1, x: 0, y: 0 }}
              exit={overlayFrom(overlay.mode, reduced)}
              transition={overlayTransition}
            >
              <FeatureBoundary name="Verse overlay" silent>
                <VerseOverlay
                  key={`${overlay.ref}|${overlay.translation}`}
                  overlay={overlay}
                  template={template}
                  animate={overlayKey !== initial.overlay}
                />
              </FeatureBoundary>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {live.screen !== 'content' && (
            <motion.div
              key={live.screen}
              className={styles.screenLayer}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{
                duration: sec(reduced ? tokens.reduced.duration : tokens.screen.duration),
              }}
            >
              {live.screen === 'logo' && <LogoScreen assetId={snapshot.logoAssetId} />}
              {live.screen === 'sermon' && presentation && (
                <SermonScreen
                  presentation={presentation}
                  template={template}
                  translation={translation}
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </SlideStage>
    </PosterContext.Provider>
  );
}

/** The sermon poster shown by the Sermon button: the presentation's title slide. */
function SermonScreen({
  presentation,
  template,
  translation,
}: {
  presentation: NonNullable<LiveSnapshot['presentation']>;
  template: ReturnType<typeof getTemplate>;
  translation: string;
}) {
  const slide =
    presentation.slides.find((s) => s.type === 'title') ??
    ({
      id: 'sermon-poster',
      type: 'title',
      heading: presentation.title,
      speaker: presentation.speaker,
    } as const);
  return (
    <div className={styles.sermon}>
      <SlideView slide={slide} template={template} mode="live" translation={translation} />
    </div>
  );
}

function LogoScreen({ assetId }: { assetId: string | null }) {
  const asset = useAsset(assetId);
  if (assetId && asset) {
    return <img className={styles.logoImage} src={asset.url} alt="" />;
  }
  return (
    <div className={styles.defaultLogo}>
      <LampMark size={220} />
      <span>Lampstand</span>
    </div>
  );
}
