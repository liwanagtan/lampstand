import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { paths } from '@/app/paths';
import { BOOK_BY_CODE } from '@/features/bible/books';
import { formatRef, parseRef } from '@/features/bible/ref';
import { chapterChunks } from '@/features/bible-app/plans';
import { useChapter } from '@/features/bible-app/useChapter';
import { useReader } from '@/features/bible-app/readerStore';
import reading from './reading.json';
import styles from './SalvationPage.module.css';

function ScriptureChapter({ book, chapter, from, to }: { book: string; chapter: number; from: number; to: number }) {
  const translation = useReader((state) => state.translation);
  const passage = useChapter(translation, book, chapter);
  return (
    <div className={styles.chapter}>
      <h4>{BOOK_BY_CODE.get(book)?.refName} {chapter}</h4>
      {passage ? (
        <p className={styles.verses}>
          {passage.verses.filter((verse) => verse.verse >= from && verse.verse <= to && !verse.missing).map((verse) => (
            <span key={verse.osis}><sup>{verse.verse}</sup>{verse.text} </span>
          ))}
        </p>
      ) : <p className={styles.loading}>Loading Scripture…</p>}
    </div>
  );
}

function ScriptureReading({ reference }: { reference: string }) {
  const range = parseRef(reference);
  if (!range) return null;
  return (
    <div className={styles.scripture}>
      <h3>{formatRef(range)}</h3>
      {chapterChunks(range).map((chunk) => <ScriptureChapter key={`${chunk.book}-${chunk.chapter}`} {...chunk} />)}
    </div>
  );
}

/** One continuous foundational reading, separate from plan progress and completion. */
export function SalvationPage() {
  const translation = useReader((state) => state.translation);
  return (
    <article className={styles.page}>
      <Link className={styles.back} to={paths.plans}><ArrowLeft size={18} /> Plans</Link>
      <header className={styles.header}>
        <p className={styles.eyebrow}>Faith foundations · Salvation</p>
        <h1>{reading.title}</h1>
        <p>{reading.introduction}</p>
        <nav aria-label="Salvation reading sections" className={styles.contents}>
          {reading.sections.map((section, index) => (
            <a key={section.title} href={`#salvation-${index + 1}`}>{index + 1}. {section.title}</a>
          ))}
        </nav>
      </header>
      {reading.sections.map((section, index) => (
        <section key={section.title} id={`salvation-${index + 1}`} className={styles.section}>
          <p className={styles.sectionNumber}>Part {index + 1}</p>
          <h2>{section.title}</h2>
          <p className={styles.note}>{section.note}</p>
          <div className={styles.passages} aria-label={`Scripture readings in ${translation}`}>
            {section.readings.map((reference) => <ScriptureReading key={reference} reference={reference} />)}
          </div>
          <div className={styles.body}>
            {section.body.split(/\n\n+/).map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
          </div>
          <div className={styles.reflect}>
            <h3>Consider</h3>
            <ul>{section.questions.map((question) => <li key={question}>{question}</li>)}</ul>
          </div>
          <div className={styles.prayer}><h3>A prayer</h3><p>{section.prayer}</p></div>
        </section>
      ))}
      <footer className={styles.footer}>
        <p>If you have questions or have accepted Jesus Christ as Lord and Saviour, speak with a trusted Christian or pastor. You can return to this reading whenever you need it.</p>
        <Link to={paths.plans}>Explore reading plans <ArrowRight size={18} /></Link>
      </footer>
    </article>
  );
}
