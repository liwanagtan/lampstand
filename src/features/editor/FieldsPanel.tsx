import { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ImageIcon, Plus, X } from 'lucide-react';
import { Button, IconButton, Input, Select, Textarea, Toggle } from '@/design-system/components';
import { useBible } from '@/features/bible/bibleStore';
import { parseRefDetailed, formatRef, verseCountInRange } from '@/features/bible/ref';
import { BackgroundPicker } from '@/features/library/BackgroundPicker';
import { LIMITS, type Background, type StoredSlide } from '@/schema/presentation';
import { TRANSITIONS } from '@/schema/common';
import { useEditor } from './editorStore';
import { SLIDE_TYPE_LABELS, slideIssues } from './slideOps';
import styles from './FieldsPanel.module.css';

type Patch = (s: StoredSlide) => StoredSlide;

/** Sets an optional text field; empty text removes it. */
function setOpt<T extends StoredSlide>(slide: T, key: string, value: string): T {
  const next = { ...slide } as Record<string, unknown>;
  if (value === '') delete next[key];
  else next[key] = value;
  return next as T;
}

export function FieldsPanel({ slide }: { slide: StoredSlide }) {
  const update = useEditor((s) => s.updateSlide);
  const set = (key: string, patch: Patch) => update(slide.id, patch, key);
  const issues = slideIssues(slide);

  const text = (
    key: string,
    label: string,
    limit: number,
    opts: { optional?: boolean; multiline?: boolean } = {},
  ) => {
    const value = ((slide as Record<string, unknown>)[key] as string | undefined) ?? '';
    const onChange = (v: string) =>
      set(key, (s) => (opts.optional ? setOpt(s, key, v) : ({ ...s, [key]: v } as StoredSlide)));
    return opts.multiline ? (
      <Textarea
        key={key}
        label={label}
        value={value}
        limit={limit}
        rows={3}
        onChange={(e) => onChange(e.target.value)}
        placeholder={opts.optional ? 'Optional' : undefined}
      />
    ) : (
      <Input
        key={key}
        label={label}
        value={value}
        limit={limit}
        onChange={(e) => onChange(e.target.value)}
        placeholder={opts.optional ? 'Optional' : undefined}
      />
    );
  };

  return (
    <div className={styles.panel}>
      <h2 className={styles.heading}>{SLIDE_TYPE_LABELS[slide.type]} slide</h2>
      {issues.length > 0 && (
        <ul className={styles.issues} role="status">
          {issues.map((m, i) => (
            <li key={i}>{m}</li>
          ))}
        </ul>
      )}

      <section className={styles.group} aria-label="Content">
        {slide.type === 'title' && (
          <>
            {text('heading', 'Heading', LIMITS.title.heading)}
            {text('subtitle', 'Subtitle', LIMITS.title.subtitle, { optional: true })}
            {text('speaker', 'Speaker', LIMITS.title.speaker, { optional: true })}
          </>
        )}
        {slide.type === 'section' && (
          <>
            {text('label', 'Label', LIMITS.section.label, { optional: true })}
            {text('heading', 'Heading', LIMITS.section.heading)}
          </>
        )}
        {(slide.type === 'point' || slide.type === 'closing') && (
          <>
            {text('heading', 'Heading', LIMITS.point.heading)}
            {text('body', 'Body', LIMITS.point.body, { optional: true, multiline: true })}
          </>
        )}
        {slide.type === 'list' && (
          <ListFields
            slide={slide}
            set={set}
            heading={text('heading', 'Heading', LIMITS.list.heading)}
          />
        )}
        {slide.type === 'verse' && <VerseFields slide={slide} set={set} />}
        {slide.type === 'quote' && (
          <>
            {text('text', 'Quote', LIMITS.quote.text, { multiline: true })}
            {text('author', 'Author', LIMITS.quote.author, { optional: true })}
          </>
        )}
        {slide.type === 'statement' &&
          text('text', 'Statement', LIMITS.statement.text, { multiline: true })}
        {slide.type === 'image' &&
          text('caption', 'Caption', LIMITS.image.caption, { optional: true })}
        {slide.type === 'countdown' && (
          <>
            <Input
              label="Minutes"
              type="number"
              min={LIMITS.countdown.minutesMin}
              max={LIMITS.countdown.minutesMax}
              value={String(slide.minutes)}
              onChange={(e) =>
                set(
                  'minutes',
                  (s) =>
                    ({ ...s, minutes: Math.round(Number(e.target.value) || 0) }) as StoredSlide,
                )
              }
              hint="1–30 minutes. The clock starts when the slide goes live."
            />
            {text('label', 'Label', LIMITS.countdown.label, { optional: true })}
          </>
        )}
      </section>

      <section className={styles.group} aria-label="Look">
        <h3 className={styles.subheading}>Look</h3>
        <BackgroundFields slide={slide} set={set} />
        <Select
          label="Transition"
          value={slide.transition ?? 'fade'}
          onChange={(v) =>
            set(
              'transition',
              (s) => ({ ...s, transition: v === 'fade' ? undefined : v }) as StoredSlide,
            )
          }
          options={TRANSITIONS.map((t) => ({
            value: t,
            label: t[0]!.toUpperCase() + t.slice(1) + (t === 'fade' ? ' (default)' : ''),
          }))}
        />
      </section>

      <section className={styles.group} aria-label="Notes">
        <Textarea
          label="Notes"
          hint="For the pastor and operator. Never shown on the TV."
          value={slide.notes ?? ''}
          rows={4}
          limit={LIMITS.notes}
          onChange={(e) => set('notes', (s) => setOpt(s, 'notes', e.target.value))}
        />
      </section>
    </div>
  );
}

function ListFields({
  slide,
  set,
  heading,
}: {
  slide: Extract<StoredSlide, { type: 'list' }>;
  set: (k: string, p: Patch) => void;
  heading: React.ReactNode;
}) {
  const items = slide.items;
  const setItems = (next: string[], key = 'items') =>
    set(key, (s) => ({ ...s, items: next }) as StoredSlide);
  return (
    <>
      {heading}
      <fieldset className={styles.fieldset}>
        <legend className={styles.legend}>
          Items ({items.length} of {LIMITS.list.itemsMax})
        </legend>
        {items.map((item, i) => (
          <div key={i} className={styles.itemRow}>
            <Input
              label={`Item ${i + 1}`}
              hideLabel
              value={item}
              limit={LIMITS.list.item}
              onChange={(e) =>
                setItems(
                  items.map((x, j) => (j === i ? e.target.value : x)),
                  `item-${i}`,
                )
              }
            />
            <IconButton
              label={`Move item ${i + 1} up`}
              icon={<ArrowUp size={16} />}
              size="sm"
              disabled={i === 0}
              onClick={() => setItems(swap(items, i, i - 1))}
            />
            <IconButton
              label={`Move item ${i + 1} down`}
              icon={<ArrowDown size={16} />}
              size="sm"
              disabled={i === items.length - 1}
              onClick={() => setItems(swap(items, i, i + 1))}
            />
            <IconButton
              label={`Remove item ${i + 1}`}
              icon={<X size={16} />}
              size="sm"
              disabled={items.length <= LIMITS.list.itemsMin}
              onClick={() => setItems(items.filter((_, j) => j !== i))}
            />
          </div>
        ))}
        <Button
          size="sm"
          variant="ghost"
          icon={<Plus size={16} />}
          disabled={items.length >= LIMITS.list.itemsMax}
          onClick={() => setItems([...items, 'New item'])}
        >
          Add item
        </Button>
      </fieldset>
      <Toggle
        checked={Boolean(slide.build)}
        onChange={(v) => set('build', (s) => ({ ...s, build: v || undefined }) as StoredSlide)}
        label="Reveal one item per click"
        description="Build the list on Next."
      />
    </>
  );
}

function swap<T>(arr: T[], i: number, j: number): T[] {
  const out = [...arr];
  [out[i], out[j]] = [out[j]!, out[i]!];
  return out;
}

function VerseFields({
  slide,
  set,
}: {
  slide: Extract<StoredSlide, { type: 'verse' }>;
  set: (k: string, p: Patch) => void;
}) {
  const translations = useBible((s) => s.translations);
  const parsed = useMemo(() => parseRefDetailed(slide.ref), [slide.ref]);
  const [emphasis, setEmphasis] = useState('');
  const hint = parsed.ok
    ? `${formatRef(parsed.range)} · ${verseCountInRange(parsed.range)} verse${verseCountInRange(parsed.range) === 1 ? '' : 's'}`
    : undefined;
  return (
    <>
      <Input
        label="Reference"
        value={slide.ref}
        onChange={(e) => set('ref', (s) => ({ ...s, ref: e.target.value }) as StoredSlide)}
        error={parsed.ok ? undefined : parsed.hint}
        hint={hint}
      />
      <Select
        label="Translation"
        value={slide.translation ?? '__default'}
        onChange={(v) =>
          set('translation', (s) => setOpt(s, 'translation', v === '__default' ? '' : v))
        }
        options={[
          { value: '__default', label: 'Presentation default' },
          ...translations.map((t) => ({ value: t.code, label: `${t.code} — ${t.name}` })),
        ]}
      />
      <div className={styles.fieldset}>
        <span className={styles.legend}>Emphasis</span>
        <div className={styles.chips}>
          {(slide.emphasis ?? []).map((e, i) => (
            <span key={i} className={styles.chip}>
              {e}
              <button
                type="button"
                aria-label={`Remove ${e}`}
                onClick={() =>
                  set('emphasis', (s) => {
                    const next = (slide.emphasis ?? []).filter((_, j) => j !== i);
                    return (
                      next.length ? { ...s, emphasis: next } : setOpt(s, 'emphasis', '')
                    ) as StoredSlide;
                  })
                }
              >
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
        <form
          className={styles.itemRow}
          onSubmit={(e) => {
            e.preventDefault();
            const v = emphasis.trim();
            if (!v || (slide.emphasis?.length ?? 0) >= LIMITS.verse.emphasisMax) return;
            set(
              'emphasis',
              (s) => ({ ...s, emphasis: [...(slide.emphasis ?? []), v] }) as StoredSlide,
            );
            setEmphasis('');
          }}
        >
          <Input
            label="Add emphasis"
            hideLabel
            placeholder="Words to highlight, e.g. so loved"
            value={emphasis}
            onChange={(e) => setEmphasis(e.target.value)}
          />
          <Button size="sm" type="submit" disabled={!emphasis.trim()}>
            Add
          </Button>
        </form>
      </div>
    </>
  );
}

type BgKind = Background['type'];

function BackgroundFields({
  slide,
  set,
}: {
  slide: StoredSlide;
  set: (k: string, p: Patch) => void;
}) {
  const [picking, setPicking] = useState(false);
  const bg: Background = slide.background ?? { type: 'template' };
  const requiresMedia = slide.type === 'image';
  const kinds: { value: BgKind; label: string }[] = requiresMedia
    ? [
        { value: 'image', label: 'Image' },
        { value: 'video', label: 'Video' },
      ]
    : [
        { value: 'template', label: 'Template' },
        { value: 'color', label: 'Color' },
        { value: 'gradient', label: 'Gradient' },
        { value: 'image', label: 'Image' },
        { value: 'video', label: 'Video' },
      ];

  const setBg = (next: Background | undefined) =>
    set('background', (s) => {
      const out = { ...s } as Record<string, unknown>;
      if (!next || next.type === 'template') delete out.background;
      else out.background = next;
      return out as StoredSlide;
    });

  const changeKind = (k: BgKind) => {
    const description = 'description' in bg ? bg.description : 'Background';
    if (k === 'template') setBg(undefined);
    else if (k === 'color') setBg({ type: 'color', tone: 'base' });
    else if (k === 'gradient') setBg({ type: 'gradient', tone: 'calm' });
    else if (k === 'image') setBg({ type: 'image', description, motion: 'drift' });
    else setBg({ type: 'video', description });
  };

  return (
    <>
      <Select label="Background" value={bg.type} onChange={changeKind} options={kinds} />
      {bg.type === 'color' && (
        <Select
          label="Tone"
          value={bg.tone}
          onChange={(tone) => setBg({ type: 'color', tone })}
          options={[
            { value: 'base', label: 'Base' },
            { value: 'accent', label: 'Accent' },
            { value: 'deep', label: 'Deep' },
          ]}
        />
      )}
      {bg.type === 'gradient' && (
        <Select
          label="Gradient"
          value={bg.tone}
          onChange={(tone) => setBg({ type: 'gradient', tone })}
          options={[
            { value: 'calm', label: 'Calm' },
            { value: 'warm', label: 'Warm' },
            { value: 'dawn', label: 'Dawn' },
          ]}
        />
      )}
      {(bg.type === 'image' || bg.type === 'video') && (
        <>
          <Input
            label="Description"
            value={bg.description}
            limit={LIMITS.description}
            onChange={(e) => setBg({ ...bg, description: e.target.value })}
          />
          <Button icon={<ImageIcon size={16} />} onClick={() => setPicking(true)}>
            {bg.assetId ? 'Change file…' : 'Choose file…'}
          </Button>
          {bg.type === 'image' && (
            <Toggle
              checked={bg.motion !== 'still'}
              onChange={(v) => setBg({ ...bg, motion: v ? 'drift' : 'still' })}
              label="Slow drift"
              description="Zoom gently while the slide is live."
            />
          )}
          <BackgroundPicker
            open={picking}
            onOpenChange={setPicking}
            description={bg.description}
            onPick={(assetId, kind) =>
              setBg(
                kind === 'video'
                  ? { type: 'video', description: bg.description, assetId }
                  : {
                      type: 'image',
                      description: bg.description,
                      assetId,
                      motion: bg.type === 'image' ? bg.motion : 'drift',
                    },
              )
            }
          />
        </>
      )}
    </>
  );
}
