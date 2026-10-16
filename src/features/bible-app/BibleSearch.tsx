import { useEffect, useMemo, useRef, useState } from 'react';
import { BookOpen, Search } from 'lucide-react';
import { Kbd, cx } from '@/design-system/components';
import { getTranslation, useBible } from '@/features/bible/bibleStore';
import { formatRef, fromOsis, parseRefDetailed, type RefRange } from '@/features/bible/ref';
import { searchVerses } from '@/features/bible/search';
import { highlightRuns, type SearchHit } from '@/features/bible/searchCore';
import { verseCountsFor } from '@/features/bible/versification';
import styles from './BibleSearch.module.css';

interface BibleSearchProps {
  translation: string;
  /** Jump to a range (selects it). `code` is set when the query named a translation. */
  onGo: (range: RefRange, code?: string) => void;
}

const isQuoted = (s: string) => /^["“'‘]/.test(s.trim());

/** One box for references ("jn 3 16", "ps 23 web") and words ("still waters"). */
export function BibleSearch({ translation, onGo }: BibleSearchProps) {
  const [value, setValue] = useState('');
  const [open, setOpen] = useState(false);
  const [hits, setHits] = useState<{ q: string; hits: SearchHit[] } | null>(null);
  const [active, setActive] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const codes = useBible((s) => s.translations.map((t) => t.code).join(','));
  const text = value.trim();

  const parsed = useMemo(() => {
    if (!text || isQuoted(text)) return null;
    return parseRefDetailed(text, {
      knownTranslations: codes.split(','),
      verseCounts: verseCountsFor(getTranslation(translation)),
    });
  }, [text, codes, translation]);

  const query =
    text.length >= 3 &&
    (isQuoted(text) || (parsed && !parsed.ok && parsed.problem === 'unrecognized'))
      ? text
      : '';
  useEffect(() => {
    if (!query) return;
    let alive = true;
    const id = setTimeout(() => {
      void searchVerses(translation, query, 20).then(
        (h) => alive && setHits({ q: query, hits: h }),
      );
    }, 90);
    return () => {
      alive = false;
      clearTimeout(id);
    };
  }, [query, translation]);

  const results = hits && hits.q === query ? hits.hits : [];
  const items: { key: string; label: string; detail?: React.ReactNode; go: () => void }[] = [];
  if (parsed?.ok) {
    items.push({
      key: 'ref',
      label: formatRef(parsed.range),
      detail: parsed.translation ? `Open in ${parsed.translation}` : 'Go to passage',
      go: () => onGo(parsed.range, parsed.translation),
    });
  }
  for (const h of results) {
    const r = fromOsis(h.osis);
    if (!r) continue;
    items.push({
      key: h.osis,
      label: formatRef(r),
      detail: highlightRuns(h.text, h.terms).map((run, i) =>
        run.hit ? <mark key={i}>{run.text}</mark> : <span key={i}>{run.text}</span>,
      ),
      go: () => onGo(r),
    });
  }
  const hint =
    parsed && !parsed.ok && parsed.problem !== 'unrecognized' && parsed.problem !== 'empty'
      ? parsed.hint
      : null;

  const pick = (i: number) => {
    const item = items[i];
    if (!item) return;
    item.go();
    setValue('');
    setOpen(false);
    input.current?.blur();
  };

  return (
    <div className={styles.root}>
      <div className={styles.box}>
        <Search size={16} aria-hidden className={styles.icon} />
        <input
          ref={input}
          className={styles.input}
          value={value}
          aria-label="Search the Bible"
          placeholder="Search — jn 3 16, ps 23 web, “still waters”"
          onChange={(e) => {
            setValue(e.target.value);
            setActive(0);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setActive((a) => Math.min(a + 1, items.length - 1));
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              setActive((a) => Math.max(a - 1, 0));
            } else if (e.key === 'Enter') {
              e.preventDefault();
              pick(active);
            } else if (e.key === 'Escape') {
              setValue('');
              input.current?.blur();
            }
            e.stopPropagation();
          }}
        />
        {!value && <Kbd>/</Kbd>}
      </div>
      {open && text && (items.length > 0 || hint || (query && hits?.q === query)) && (
        <ul className={styles.results} role="listbox" aria-label="Search results">
          {hint && <li className={styles.hint}>{hint}</li>}
          {items.map((it, i) => (
            <li key={it.key} role="option" aria-selected={i === active}>
              <button
                type="button"
                className={cx(styles.item, i === active && styles.active)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(i)}
              >
                <BookOpen size={14} aria-hidden className={styles.itemIcon} />
                <span className={styles.itemText}>
                  <span className={styles.ref}>{it.label}</span>
                  {it.detail && <span className={styles.detail}>{it.detail}</span>}
                </span>
              </button>
            </li>
          ))}
          {query && hits?.q === query && results.length === 0 && !parsed?.ok && (
            <li className={styles.hint}>No verses match “{query.replace(/["“”]/g, '')}”.</li>
          )}
        </ul>
      )}
    </div>
  );
}
