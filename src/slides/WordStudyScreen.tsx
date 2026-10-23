import { useWord } from '@/features/bible-app/wordStudy';
import type { LiveWord } from '@/features/present/live/types';
import styles from './WordStudyScreen.module.css';

/**
 * Word study on the TV (Screen › Show the Bible), in the side panel layout: the verse moves to
 * the left (LiveScreen) and this panel slides in on the right with the Hebrew or Greek behind the
 * word, how it sounds, what it means, and how often the Bible uses it.
 */
export function WordStudyScreen({ word }: { word: LiveWord }) {
  const entry = useWord(word.strong);
  const greek = word.strong >= 10000;
  return (
    <div className={styles.panel}>
      <p className={styles.eyebrow}>Word study</p>
      <p className={styles.english}>“{word.text}”</p>
      {entry && (
        <>
          <p className={styles.original} lang={greek ? 'grc' : 'he'} dir={greek ? 'ltr' : 'rtl'}>
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
    </div>
  );
}
