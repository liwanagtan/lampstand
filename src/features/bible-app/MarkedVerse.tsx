import { Bookmark, StickyNote } from 'lucide-react';
import type { PassageVerse } from '@/features/bible/passage';
import type { ChapterMarks } from './marks';
import styles from './MarkedVerse.module.css';

/**
 * One verse's text with your marks drawn on it: highlight colour, bookmark ribbon, note.
 * Marks belong to the verse, so they look the same wherever the verse appears.
 */
export function MarkedVerseText({ verse, marks }: { verse: PassageVerse; marks: ChapterMarks }) {
  const color = marks.highlights.get(verse.verse);
  const bookmarked = marks.bookmarks.has(verse.verse);
  const notes = marks.notes.get(verse.verse);
  return (
    <>
      {color ? (
        <mark className={styles.hl} data-color={color}>
          {verse.text}
        </mark>
      ) : (
        verse.text
      )}
      {bookmarked && (
        <Bookmark size={12} fill="currentColor" className={styles.icon} aria-label="Bookmarked" />
      )}
      {notes?.map((n) => (
        <StickyNote
          key={n.id}
          size={12}
          className={styles.icon}
          role="img"
          aria-label={`Note: ${n.text ?? ''}`}
        >
          <title>{n.text}</title>
        </StickyNote>
      ))}
    </>
  );
}
