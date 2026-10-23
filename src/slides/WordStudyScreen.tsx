import { AnimatePresence, motion } from 'motion/react';
import { useWord, type WordEntry } from '@/features/bible-app/wordStudy';
import type { LiveWord } from '@/features/present/live/types';
import styles from './WordStudyScreen.module.css';

/**
 * Word study on the TV (Screen › Show the Bible), in the side panel layout: the verse moves to
 * the left (LiveScreen) and this panel slides in on the right with the Hebrew or Greek behind the
 * word, how it sounds, what it means, and how often the Bible uses it. Moving to another word,
 * the panel stays and its content changes: the old word fades away, the new one rises in.
 */
export function WordStudyScreen({ word, reduced }: { word: LiveWord; reduced: boolean }) {
  const entry = useWord(word.strong);
  return (
    <div className={styles.panel}>
      <AnimatePresence mode="wait" initial={false}>
        {/* Waits for the entry, so the word and its meaning arrive together. */}
        {entry !== undefined && (
          <motion.div
            key={`${word.verse}|${word.strong}`}
            className={styles.content}
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, y: -12 }}
            transition={{
              duration: reduced ? 0.12 : 0.32,
              ease: [0.22, 1, 0.36, 1],
            }}
          >
            <Content word={word} entry={entry} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Content({ word, entry }: { word: LiveWord; entry: WordEntry | null }) {
  const greek = word.strong >= 10000;
  return (
    <>
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
    </>
  );
}
