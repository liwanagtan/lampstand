import { useCallback, useMemo, useRef, useState, type DragEvent, type RefObject } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import {
  AlertTriangle,
  CheckCircle2,
  FileJson,
  ImageIcon,
  RotateCcw,
  Save,
  TriangleAlert,
  Upload,
} from 'lucide-react';
import { Page } from '@/app/Page';
import { Button, Card, Chip, Tabs, cx, toast } from '@/design-system/components';
import { revealTransition } from '@/design-system/motion/presets';
import { useBible } from '@/features/bible/bibleStore';
import { useSettings } from '@/features/settings/settingsStore';
import { useReducedMotion } from '@/features/settings/theme';
import { SlideSchema, type StoredPresentation, type StoredSlide } from '@/schema/presentation';
import { TEMPLATE_IDS, type TemplateId } from '@/schema/common';
import {
  formatIssue,
  slidePrefix,
  validatePresentation,
  type ValidationIssue,
  type ValidationResult,
} from '@/schema/validate';
import { getTemplate } from '@/templates/templates';
import { SlideFrame } from '@/slides/SlideView';
import { formatDate } from '@/lib/time';
import { BackgroundPicker } from './BackgroundPicker';
import { createPresentation } from './presentations';
import { presentationTranslation, slideTranslation } from './translation';
import { mediaNeeds } from './importHelpers';
import { PosterContext, posterInfoFor } from '@/slides/poster/posterInfo';
import styles from './ImportPage.module.css';

interface Source {
  name: string;
  text: string;
}

type PreviewItem = { index: number; slide: StoredSlide | null; type?: string };

const MAX_FILE_BYTES = 5 * 1024 * 1024;

/** Renders whatever slides parse on their own, so errors can point at them. */
function partialPreview(text: string): PreviewItem[] {
  try {
    const raw = JSON.parse(text.replace(/^\s*```(?:json)?\s*\n|\n\s*```\s*$/g, '')) as {
      slides?: unknown;
    };
    if (!Array.isArray(raw.slides)) return [];
    return raw.slides.map((s, index) => {
      const r = SlideSchema.safeParse(s);
      const type = (s as { type?: unknown } | null)?.type;
      return {
        index,
        slide: r.success ? ({ ...r.data, id: `preview-${index}` } as StoredSlide) : null,
        type: typeof type === 'string' ? type : undefined,
      };
    });
  } catch {
    return [];
  }
}

export function ImportPage() {
  const navigate = useNavigate();
  const knownTranslations = useBible((s) => s.translations.map((t) => t.code).join(','));
  const defaultTranslation = useSettings((s) => s.defaultTranslation);
  const defaultTheme = useSettings((s) => s.defaultTheme);

  const [source, setSource] = useState<Source | null>(null);
  const [dragging, setDragging] = useState(false);
  const [presentation, setPresentation] = useState<StoredPresentation | null>(null);
  const [templateId, setTemplateId] = useState<TemplateId>(defaultTheme);
  const [kept, setKept] = useState<Set<number>>(new Set());
  const [picking, setPicking] = useState<number | null>(null);
  const [flash, setFlash] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const slideRefs = useRef(new Map<number, HTMLElement>());

  const result: ValidationResult | null = useMemo(
    () =>
      source
        ? validatePresentation(source.text, {
            knownTranslations: knownTranslations.split(',').filter(Boolean),
            defaultTranslation,
          })
        : null,
    [source, knownTranslations, defaultTranslation],
  );

  const load = useCallback(
    (next: Source) => {
      setSource(next);
      const r = validatePresentation(next.text, {
        knownTranslations: knownTranslations.split(',').filter(Boolean),
        defaultTranslation,
      });
      setPresentation(r.ok ? r.presentation : null);
      setKept(new Set());
      if (r.ok) setTemplateId(r.presentation.theme ?? defaultTheme);
    },
    [knownTranslations, defaultTranslation, defaultTheme],
  );

  const readFile = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) {
      toast({ title: 'That file is too large to be a presentation (over 5 MB).', tone: 'warning' });
      return;
    }
    load({ name: file.name, text: await file.text() });
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    void readFile(e.dataTransfer.files[0]);
  };

  const reset = () => {
    setSource(null);
    setPresentation(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  const jumpTo = (index: number) => {
    const el = slideRefs.current.get(index);
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setFlash(null);
    requestAnimationFrame(() => setFlash(index));
  };

  const setAsset = (index: number, assetId: string, kind: 'image' | 'video') => {
    setPresentation((p) => {
      if (!p) return p;
      const slides = p.slides.map((s, i) => {
        if (i !== index) return s;
        const bg = s.background;
        const description = bg && 'description' in bg ? bg.description : 'Background';
        const background =
          kind === 'video'
            ? { type: 'video' as const, description, assetId }
            : {
                type: 'image' as const,
                description,
                assetId,
                motion: bg?.type === 'image' ? bg.motion : undefined,
              };
        return { ...s, background } as StoredSlide;
      });
      return { ...p, slides };
    });
  };

  const save = async () => {
    if (!presentation) return;
    setSaving(true);
    try {
      const record = await createPresentation({ ...presentation, theme: templateId });
      toast({
        title: `Saved “${record.title}” to your library`,
        tone: 'success',
        action: { label: 'Present', onClick: () => navigate(`/present/${record.id}`) },
      });
      navigate('/');
    } catch (err) {
      toast({
        title: `Couldn't save: ${err instanceof Error ? err.message : String(err)}`,
        tone: 'warning',
      });
      setSaving(false);
    }
  };

  if (!source || !result) {
    return (
      <Page
        title="Import"
        description="Upload a presentation file to preview it, then save it to your library."
      >
        <div
          className={cx(styles.drop, dragging && styles.dragging)}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          data-testid="drop-zone"
        >
          <div className={styles.dropIcon}>
            <FileJson size={28} />
          </div>
          <h2 className={styles.dropTitle}>Drop a .lampstand.json file here</h2>
          <p className={styles.muted}>or choose it from this laptop</p>
          <input
            ref={fileRef}
            type="file"
            accept=".json,.lampstand.json,application/json"
            className="visually-hidden"
            aria-label="Choose a presentation file"
            onChange={(e) => void readFile(e.target.files?.[0])}
          />
          <Button
            variant="primary"
            icon={<Upload size={16} />}
            onClick={() => fileRef.current?.click()}
          >
            Choose file
          </Button>
        </div>
      </Page>
    );
  }

  const errors = result.ok ? [] : result.errors;
  const warnings = result.warnings;
  const preview: PreviewItem[] = presentation
    ? presentation.slides.map((slide, index) => ({ index, slide, type: slide.type }))
    : partialPreview(source.text);
  const errorSlides = new Set(
    errors.map((e) => e.slideIndex).filter((i): i is number => i !== undefined),
  );
  const needs = presentation ? mediaNeeds(presentation).filter((n) => !kept.has(n.index)) : [];
  const template = getTemplate(templateId);
  const translation = presentation ? presentationTranslation(presentation) : defaultTranslation;

  return (
    <Page
      title={presentation?.title ?? 'Check your file'}
      description={
        presentation
          ? [
              presentation.speaker,
              formatDate(presentation.date),
              `${presentation.slides.length} slides`,
            ]
              .filter(Boolean)
              .join(' · ')
          : source.name
      }
      actions={
        <>
          <Button variant="ghost" icon={<RotateCcw size={16} />} onClick={reset}>
            Start over
          </Button>
          <Button
            variant="primary"
            icon={<Save size={16} />}
            disabled={!presentation}
            loading={saving}
            onClick={() => void save()}
          >
            Save to library
          </Button>
        </>
      }
    >
      {errors.length > 0 && (
        <IssueList
          tone="error"
          title={
            errors.length === 1
              ? 'This file has 1 problem'
              : `This file has ${errors.length} problems`
          }
          hint="Fix these in Claude (or the file) and import again."
          issues={errors}
          onJump={jumpTo}
        />
      )}
      {presentation && (
        <div className={styles.okBar}>
          <Chip tone="success" icon={<CheckCircle2 size={14} />}>
            Ready to save
          </Chip>
          <Tabs
            className={styles.templates}
            label="Template"
            value={templateId}
            onChange={setTemplateId}
            items={TEMPLATE_IDS.map((id) => ({
              value: id,
              label: getTemplate(id).name,
              content: null,
            }))}
          />
        </div>
      )}
      {warnings.length > 0 && (
        <IssueList tone="warning" title="Worth a look" issues={warnings} onJump={jumpTo} />
      )}
      {needs.length > 0 && (
        <Card className={styles.needs}>
          <h2 className={styles.sectionTitle}>
            <ImageIcon size={18} />{' '}
            {needs.length === 1
              ? '1 slide needs a background'
              : `${needs.length} slides need a background`}
          </h2>
          <ul className={styles.needList}>
            {needs.map((n) => (
              <li key={n.index} className={styles.needItem}>
                <button type="button" className={styles.linkish} onClick={() => jumpTo(n.index)}>
                  {slidePrefix(n.index, n.slide.type)}
                </button>
                <span className={styles.needDesc}>“{n.description}”</span>
                <span className={styles.needActions}>
                  <Button size="sm" variant="secondary" onClick={() => setPicking(n.index)}>
                    Choose…
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setKept((k) => new Set(k).add(n.index))}
                  >
                    Keep template background
                  </Button>
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}
      <PosterContext.Provider
        value={presentation ? posterInfoFor(presentation, translation) : null}
      >
        <PreviewGrid
          items={preview}
          template={template}
          translation={translation}
          errorSlides={errorSlides}
          flash={flash}
          refs={slideRefs}
          onPick={presentation ? (i) => setPicking(i) : undefined}
        />
      </PosterContext.Provider>
      <BackgroundPicker
        open={picking !== null}
        onOpenChange={(o) => !o && setPicking(null)}
        description={
          picking !== null && presentation
            ? (mediaNeeds(presentation).find((n) => n.index === picking)?.description ?? undefined)
            : undefined
        }
        onPick={(assetId, kind) => picking !== null && setAsset(picking, assetId, kind)}
      />
    </Page>
  );
}

function IssueList({
  tone,
  title,
  hint,
  issues,
  onJump,
}: {
  tone: 'error' | 'warning';
  title: string;
  hint?: string;
  issues: ValidationIssue[];
  onJump: (index: number) => void;
}) {
  const Icon = tone === 'error' ? AlertTriangle : TriangleAlert;
  return (
    <Card
      className={cx(styles.issues, tone === 'error' && styles.issuesError)}
      role={tone === 'error' ? 'alert' : undefined}
    >
      <h2 className={styles.sectionTitle}>
        <Icon size={18} className={styles.warnIcon} /> {title}
      </h2>
      {hint && <p className={styles.muted}>{hint}</p>}
      <ul className={styles.issueList}>
        {issues.map((issue, i) => (
          <li key={i}>
            {issue.slideIndex !== undefined ? (
              <button
                type="button"
                className={styles.issue}
                onClick={() => onJump(issue.slideIndex!)}
              >
                {formatIssue(issue)}
              </button>
            ) : (
              <span className={styles.issue}>{formatIssue(issue)}</span>
            )}
          </li>
        ))}
      </ul>
    </Card>
  );
}

function PreviewGrid({
  items,
  template,
  translation,
  errorSlides,
  flash,
  refs,
  onPick,
}: {
  items: PreviewItem[];
  template: ReturnType<typeof getTemplate>;
  translation: string;
  errorSlides: Set<number>;
  flash: number | null;
  refs: RefObject<Map<number, HTMLElement>>;
  onPick?: (index: number) => void;
}) {
  const reduced = useReducedMotion();
  if (items.length === 0) return null;
  return (
    <ul className={styles.grid} aria-label="Slide preview">
      <AnimatePresence initial>
        {items.map((item) => (
          <motion.li
            key={item.index}
            ref={(el) => {
              if (el) refs.current.set(item.index, el);
              else refs.current.delete(item.index);
            }}
            className={cx(
              styles.slide,
              errorSlides.has(item.index) && styles.slideError,
              flash === item.index && styles.flash,
            )}
            initial={{ opacity: 0, y: reduced ? 0 : 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={revealTransition(Math.min(item.index, 20), reduced)}
          >
            {item.slide ? (
              <SlideFrame
                slide={item.slide}
                template={template}
                mode="preview"
                translation={slideTranslation(item.slide, translation)}
                label={`Slide ${item.index + 1}`}
              />
            ) : (
              <div className={styles.broken}>
                <AlertTriangle size={28} />
                <span>{slidePrefix(item.index, item.type)} can’t be shown</span>
              </div>
            )}
            <div className={styles.slideMeta}>
              <span>
                {item.index + 1}. {item.type ?? 'unknown'}
              </span>
              {onPick &&
                item.slide &&
                (item.slide.background?.type === 'image' ||
                  item.slide.background?.type === 'video') && (
                  <button
                    type="button"
                    className={styles.linkish}
                    onClick={() => onPick(item.index)}
                  >
                    {item.slide.background.assetId ? 'Change background' : 'Choose background'}
                  </button>
                )}
            </div>
          </motion.li>
        ))}
      </AnimatePresence>
    </ul>
  );
}
