import type { ReactNode } from 'react';
import { useWord } from '@/features/bible-app/wordStudy';
import type { LiveWord } from '@/features/present/live/types';
import type { Background } from '@/schema/presentation';
import type { Template } from '@/templates/templates';
import { Backdrop } from './Backdrop';
import { usePassage } from './usePassage';
import styles from './WordStudyScreen.module.css';

/** Verse size on the canvas by length: short verses large, long ones still on one screen. */
function verseSize(chars: number): number {
  if (chars <= 90) return 68;
  if (chars <= 160) return 58;
  if (chars <= 260) return 50;
  if (chars <= 380) return 42;
  return 36;
}

/** The verse with the studied word picked out (whole word, any case); as is when it isn't there. */
function pickOut(text: string, word: string): ReactNode {
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const m = new RegExp(`(?<![A-Za-z])${escaped}(?![A-Za-z])`, 'i').exec(text);
  if (!m) return text;
  return (
    <>
      {text.slice(0, m.index)}
      <mark className={styles.mark}>{m[0]}</mark>
      {text.slice(m.index + m[0].length)}
    </>
  );
}

/**
 * Word study on the TV (Screen › Show the Bible): the verse on the left with the word picked
 * out, and on the right the Hebrew or Greek behind it, how it sounds, what it means, and how
 * often the Bible uses it. Sized to read from the back of a room.
 */
export function WordStudyScreen({
  word,
  translation,
  template,
  background,
  animate,
}: {
  word: LiveWord;
  /** The translation on screen; the word comes from the BSB and is picked out where it matches. */
  translation: string;
  template: Template;
  background?: Background;
  animate: boolean;
}) {
  const entry = useWord(word.strong);
  const { passage } = usePassage(word.verse, translation);
  const verse = passage?.verses.find((v) => !v.missing);
  const greek = word.strong >= 10000;
  const size = verseSize(verse?.text.length ?? 0);

  return (
    <div className={styles.root}>
      <Backdrop
        background={background}
        template={template}
        animate={animate}
        showPlaceholder={false}
      />
      <div className={styles.scrim} aria-hidden />
      <div className={styles.layout} data-animate={animate || undefined}>
        <section className={styles.verse}>
          {passage && (
            <p className={styles.ref}>
              {passage.reference}
              <span className={styles.code}>{passage.translation}</span>
            </p>
          )}
          {verse && (
            <p className={styles.text} style={{ fontSize: size }}>
              {pickOut(verse.text, word.text)}
            </p>
          )}
        </section>
        <section className={styles.card}>
          <p className={styles.eyebrow}>Word study</p>
          <p className={styles.english}>“{word.text}”</p>
          {entry && (
            <>
              <p
                className={styles.original}
                lang={greek ? 'grc' : 'he'}
                dir={greek ? 'ltr' : 'rtl'}
              >
                {entry.w}
              </p>
              <p className={styles.sound}>
                <span className={styles.translit}>{entry.t}</span>
                <span>{[greek ? 'Greek' : 'Hebrew', entry.p].filter(Boolean).join(' · ')}</span>
              </p>
              <p className={styles.gloss}>{entry.g}</p>
              {entry.m.length > 0 && (
                <ul className={styles.meanings}>
                  {entry.m.slice(0, 2).map((m, i) => (
                    <li key={i}>{m}</li>
                  ))}
                </ul>
              )}
              <p className={styles.uses}>
                Used in {entry.r.length} {entry.r.length === 1 ? 'verse' : 'verses'}
              </p>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
