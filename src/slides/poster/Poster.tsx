import { useMemo } from 'react';
import { LampMark } from '@/design-system/LampMark';
import type { SlideOf } from '@/schema/presentation';
import type { Template } from '@/templates/templates';
import { usePassage } from '../usePassage';
import { useAsset } from '../useAsset';
import { useReducedMotion } from '@/features/settings/theme';
import { FeatureBoundary } from '@/design-system/components';
import { posterExcerpt, usePosterInfo } from './posterInfo';
import { ScenePlayer, type SceneData } from './ScenePlayer';
import styles from './Poster.module.css';

interface PosterProps {
  slide: SlideOf<'title'>;
  template: Template;
  /** Live on the TV or the Live canvas: may play the animated Scene. */
  live: boolean;
}

/**
 * The sermon poster (Scene): series and date, a large title, a gold rule, the main verse,
 * the speaker and the lamp mark, over the title slide's photo or a designed backdrop.
 */
export function Poster({ slide, template, live }: PosterProps) {
  const info = usePosterInfo();
  const reduced = useReducedMotion();
  const bg = slide.background;
  const asset = useAsset(bg?.type === 'image' ? bg.assetId : undefined);
  const { passage } = usePassage(info?.mainRef, info?.mainTranslation ?? 'KJV');
  const excerpt = posterExcerpt(passage?.verses.find((v) => !v.missing)?.text);
  const ref = info?.mainRef ? (passage ? passage.reference : info.mainRef) : undefined;
  const series = info?.series ?? slide.subtitle;
  const speaker = slide.speaker ?? info?.speaker;
  const photo = asset?.url;

  const data: SceneData = useMemo(
    () => ({
      template: template.id,
      title: slide.heading,
      series,
      date: info?.date,
      speaker,
      ref,
      excerpt,
      image: photo,
    }),
    [template.id, slide.heading, series, info?.date, speaker, ref, excerpt, photo],
  );

  const animate = live && (info?.animated ?? true) && !reduced;
  const long = slide.heading.length > 34;

  return (
    <div
      className={styles.poster}
      data-template={template.id}
      data-photo={Boolean(photo)}
      data-enter={live && !reduced ? 'true' : undefined}
    >
      <div className={styles.bg}>
        {photo ? (
          <img className={styles.photo} src={photo} alt="" />
        ) : (
          <div className={styles.design} />
        )}
      </div>
      <div className={styles.grade} />
      <div className={styles.light} />
      <span className={`${styles.corner} ${styles.tl}`} />
      <span className={`${styles.corner} ${styles.tr}`} />
      <span className={`${styles.corner} ${styles.bl}`} />
      <span className={`${styles.corner} ${styles.br}`} />
      <div className={styles.grid} />
      <div className={styles.leak} />
      <div className={styles.topline}>
        <span className={styles.series}>{series}</span>
        <span>{info?.date}</span>
      </div>
      <div className={styles.content}>
        <div className={styles.main}>
          <h1 className={long ? `${styles.title} ${styles.long}` : styles.title}>
            {slide.heading}
          </h1>
          {(ref || excerpt) && (
            <>
              <div className={styles.rule} />
              {ref && <div className={styles.ref}>{ref}</div>}
              {excerpt && <p className={styles.excerpt}>“{excerpt}”</p>}
            </>
          )}
        </div>
      </div>
      <div className={styles.footer}>
        <span className={styles.speaker}>{speaker}</span>
        <LampMark size={72} className={styles.mark} />
      </div>
      {animate && (
        <FeatureBoundary name="Scene" silent>
          <ScenePlayer data={data} still={false} />
        </FeatureBoundary>
      )}
    </div>
  );
}
