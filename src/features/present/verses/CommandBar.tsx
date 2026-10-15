import { useEffect, useMemo, useRef, useState } from 'react';
import { Command } from 'cmdk';
import { AnimatePresence, motion, useAnimationControls } from 'motion/react';
import { BookOpen, CornerDownLeft, ListPlus, Search, TriangleAlert } from 'lucide-react';
import { db } from '@/db/db';
import { Kbd } from '@/design-system/components';
import { presets, transition } from '@/design-system/motion/presets';
import { getTranslation, useBible } from '@/features/bible/bibleStore';
import { getPassage, type Passage } from '@/features/bible/passage';
import { parseRefDetailed, toOsis, type RefParseResult } from '@/features/bible/ref';
import { searchVerses } from '@/features/bible/search';
import { highlightRuns, type SearchHit } from '@/features/bible/searchCore';
import { verseCountsFor } from '@/features/bible/versification';
import { useReducedMotion } from '@/features/settings/theme';
import { registerCommandBar } from './commandBarFocus';
import { labelFor, useVerses } from './verseStore';
import styles from './CommandBar.module.css';

const isQuoted = (s: string) => /^["“'‘]/.test(s.trim());

/** The verse command bar (PRD §6 grammar, §7.5): "jn 3 16", "ps 23 1-3 asv", "\"so loved\"". */
export function CommandBar() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState('');
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState('');
  const [passage, setPassage] = useState<{ key: string; passage: Passage } | null>(null);
  const [hits, setHits] = useState<{ query: string; code: string; hits: SearchHit[] } | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const reduced = useReducedMotion();
  const shake = useAnimationControls();
  const translations = useBible((s) => s.translations);
  const sessionCode = useVerses((s) => s.translation);
  const show = useVerses((s) => s.show);
  const addToQueue = useVerses((s) => s.addToQueue);

  useEffect(() => {
    registerCommandBar(() => inputRef.current?.focus());
    return () => registerCommandBar(null);
  }, []);

  const codes = useMemo(() => translations.map((t) => t.code), [translations]);
  const text = value.trim();

  const parsed: (RefParseResult & { code: string }) | null = useMemo(() => {
    if (!text || isQuoted(text)) return null;
    const r = parseRefDetailed(text, {
      knownTranslations: codes,
      verseCounts: verseCountsFor(getTranslation(sessionCode)),
    });
    const code = (r.ok && r.translation) || sessionCode;
    // Re-check against the chosen translation's own versification.
    const again =
      r.ok && r.translation
        ? parseRefDetailed(text, {
            knownTranslations: codes,
            verseCounts: verseCountsFor(getTranslation(code)),
          })
        : r;
    return { ...again, code };
  }, [text, codes, sessionCode]);

  const refKey = parsed?.ok ? `${parsed.code}|${toOsis(parsed.range)}` : null;

  // First line of the matched passage.
  useEffect(() => {
    if (!parsed?.ok || !refKey) return;
    const t = getTranslation(parsed.code);
    if (!t) return;
    let alive = true;
    void getPassage(db, t, parsed.range).then(
      (p) => alive && setPassage({ key: refKey, passage: p }),
    );
    return () => {
      alive = false;
    };
  }, [refKey, parsed]);

  // Word search when the text is quoted or isn't a reference.
  const searchQuery =
    text.length >= 3 &&
    (isQuoted(text) || (parsed && !parsed.ok && parsed.problem === 'unrecognized'))
      ? text
      : '';
  useEffect(() => {
    if (!searchQuery) return;
    let alive = true;
    const id = setTimeout(() => {
      void searchVerses(sessionCode, searchQuery, 12).then(
        (h) => alive && setHits({ query: searchQuery, code: sessionCode, hits: h }),
      );
    }, 90);
    return () => {
      alive = false;
      clearTimeout(id);
    };
  }, [searchQuery, sessionCode]);

  const currentPassage = passage && passage.key === refKey ? passage.passage : null;
  const currentHits =
    hits && hits.query === searchQuery && hits.code === sessionCode ? hits.hits : [];
  const refProblem =
    parsed && !parsed.ok && parsed.problem !== 'unrecognized' && parsed.problem !== 'empty'
      ? parsed.hint
      : null;
  const refValue = refKey ? `ref:${refKey}` : '';

  const reset = () => {
    setValue('');
    setHint(null);
    setHits(null);
  };

  const close = () => {
    reset();
    setOpen(false);
    inputRef.current?.blur();
  };

  const fail = (message: string) => {
    setHint(message);
    if (!reduced) void shake.start(presets.shake(false));
  };

  const run = async (item: string, opts: { live: boolean; queue?: boolean }) => {
    if (item.startsWith('ref:') && parsed?.ok) {
      const overlay = { ref: toOsis(parsed.range), translation: parsed.code };
      if (opts.queue) {
        addToQueue(overlay.ref, parsed.translation);
        close();
        return;
      }
      close();
      await show(overlay, { live: opts.live });
      return;
    }
    if (item.startsWith('hit:')) {
      const osis = item.slice(4);
      if (opts.queue) {
        addToQueue(osis);
        close();
        return;
      }
      close();
      // Word search results load into Preview (PRD §6 Word search).
      await show({ ref: osis, translation: sessionCode }, { live: false });
      return;
    }
    fail(
      refProblem ??
        (text
          ? `“${text}” isn’t a reference. Put words in quotes to search.`
          : 'Type a reference like jn 3 16.'),
    );
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      if (value) reset();
      else close();
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      const item = selected || refValue || (currentHits[0] ? `hit:${currentHits[0].osis}` : '');
      void run(item, { live: !e.shiftKey, queue: e.metaKey || e.ctrlKey || e.altKey });
    }
  };

  const showList = open && text.length > 0;

  return (
    <motion.div className={styles.root} animate={shake}>
      <Command
        shouldFilter={false}
        label="Verse command bar"
        value={selected}
        onValueChange={setSelected}
        loop
        className={styles.command}
      >
        <div className={styles.inputWrap}>
          <Search size={16} className={styles.icon} aria-hidden />
          <Command.Input
            ref={inputRef}
            value={value}
            onValueChange={(v) => {
              setValue(v);
              setHint(null);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => setOpen(false)}
            onKeyDown={onKeyDown}
            placeholder="Show a verse — jn 3 16, ps 23 web, “so loved”"
            className={styles.input}
            aria-label="Verse command bar"
          />
          {!value && <Kbd>/</Kbd>}
        </div>
        <AnimatePresence>
          {showList && (
            <motion.div
              className={styles.popover}
              variants={presets.pop(reduced)}
              initial="hidden"
              animate="visible"
              exit="exit"
              transition={transition('quick', reduced)}
              onMouseDown={(e) => e.preventDefault()}
            >
              <Command.List className={styles.list}>
                {(hint || refProblem) && (
                  <div className={styles.hint} role="alert">
                    <TriangleAlert size={16} aria-hidden /> {hint ?? refProblem}
                  </div>
                )}
                {parsed?.ok && (
                  <Command.Item
                    value={refValue}
                    onSelect={() => void run(refValue, { live: true })}
                    className={styles.item}
                  >
                    <BookOpen size={16} className={styles.itemIcon} aria-hidden />
                    <div className={styles.itemText}>
                      <span className={styles.ref}>
                        {currentPassage?.reference ?? labelFor(toOsis(parsed.range), parsed.code)} ·{' '}
                        {parsed.code}
                      </span>
                      <span className={styles.preview}>
                        {currentPassage
                          ? (currentPassage.verses.find((v) => !v.missing)?.text ??
                            'Not included in this translation.')
                          : '…'}
                      </span>
                    </div>
                    <span className={styles.keys}>
                      <CornerDownLeft size={14} aria-hidden /> live · ⇧ preview
                    </span>
                  </Command.Item>
                )}
                {currentHits.length > 0 && (
                  <Command.Group heading={`Matches in ${sessionCode}`} className={styles.group}>
                    {currentHits.map((h) => (
                      <Command.Item
                        key={h.osis}
                        value={`hit:${h.osis}`}
                        onSelect={() => void run(`hit:${h.osis}`, { live: false })}
                        className={styles.item}
                      >
                        <Search size={16} className={styles.itemIcon} aria-hidden />
                        <div className={styles.itemText}>
                          <span className={styles.ref}>{labelFor(h.osis, sessionCode)}</span>
                          <span className={styles.preview}>
                            {highlightRuns(h.text, h.terms).map((r, i) =>
                              r.hit ? <mark key={i}>{r.text}</mark> : <span key={i}>{r.text}</span>,
                            )}
                          </span>
                        </div>
                      </Command.Item>
                    ))}
                  </Command.Group>
                )}
                {!parsed?.ok &&
                  searchQuery &&
                  currentHits.length === 0 &&
                  hits?.query === searchQuery && (
                    <Command.Empty className={styles.empty}>
                      No verses match “{searchQuery.replace(/["“”]/g, '')}”.
                    </Command.Empty>
                  )}
                <div className={styles.footer}>
                  <span>
                    <Kbd>Enter</Kbd> show
                  </span>
                  <span>
                    <Kbd>Shift+Enter</Kbd> preview
                  </span>
                  <span>
                    <ListPlus size={14} aria-hidden /> <Kbd>Ctrl+Enter</Kbd> queue
                  </span>
                  <span>
                    <Kbd>Esc</Kbd> close
                  </span>
                </div>
              </Command.List>
            </motion.div>
          )}
        </AnimatePresence>
      </Command>
    </motion.div>
  );
}
