import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AnimatePresence, motion, Reorder, useDragControls } from 'motion/react';
import {
  ArrowLeft,
  Check,
  Copy,
  GripVertical,
  MoreHorizontal,
  Play,
  Plus,
  Redo2,
  Settings2,
  Shapes,
  Trash2,
  TriangleAlert,
  Undo2,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import {
  Button,
  Dialog,
  EmptyState,
  IconButton,
  Input,
  Menu,
  Select,
  Tooltip,
  cx,
} from '@/design-system/components';
import { motionDetail } from '@/design-system/tokens';
import { useBible } from '@/features/bible/bibleStore';
import { getPresentation } from '@/features/library/presentations';
import { presentationTranslation, slideTranslation } from '@/features/library/translation';
import { useSettings } from '@/features/settings/settingsStore';
import { useReducedMotion } from '@/features/settings/theme';
import { useShortcuts } from '@/features/present/useShortcuts';
import {
  LIMITS,
  SLIDE_TYPES,
  type StoredPresentation,
  type StoredSlide,
} from '@/schema/presentation';
import { TEMPLATE_IDS } from '@/schema/common';
import { getTemplate } from '@/templates/templates';
import { SlideFrame } from '@/slides/SlideView';
import { useEditor } from './editorStore';
import { FieldsPanel } from './FieldsPanel';
import {
  SLIDE_TYPE_LABELS,
  compatibleTypes,
  convertSlide,
  deleteSlide,
  duplicateSlide,
  insertAfter,
  moveSlide,
  newSlide,
  reorderSlides,
  slideIssues,
} from './slideOps';
import styles from './EditorPage.module.css';

export function EditorPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [state, setState] = useState<'loading' | 'ready' | 'missing'>('loading');

  useEffect(() => {
    let alive = true;
    void getPresentation(id).then((r) => {
      if (!alive) return;
      if (!r) return setState('missing');
      useEditor.getState().open(id, r.data);
      setState('ready');
    });
    return () => {
      alive = false;
      void useEditor.getState().flush();
    };
  }, [id]);

  if (state === 'missing') {
    return (
      <EmptyState
        title="Presentation not found"
        actions={<Button onClick={() => navigate('/')}>Back to Library</Button>}
      >
        It may have been deleted.
      </EmptyState>
    );
  }
  if (state === 'loading') return <div aria-busy="true" />;
  return <Editor id={id} />;
}

function Editor({ id }: { id: string }) {
  const navigate = useNavigate();
  const presentation = useEditor((s) => s.presentation)!;
  const selectedId = useEditor((s) => s.selectedId);
  const select = useEditor((s) => s.select);
  const edit = useEditor((s) => s.edit);
  const undo = useEditor((s) => s.undo);
  const redo = useEditor((s) => s.redo);
  const canUndo = useEditor((s) => s.past.length > 0);
  const canRedo = useEditor((s) => s.future.length > 0);
  const defaultTheme = useSettings((s) => s.defaultTheme);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const template = getTemplate(presentation.theme ?? defaultTheme);
  const translation = presentationTranslation(presentation);
  const slides = presentation.slides;
  const selected = slides.find((s) => s.id === selectedId) ?? slides[0]!;
  const index = slides.indexOf(selected);

  useShortcuts(
    {
      'Mod+z': undo,
      'Mod+Shift+z': redo,
      'Mod+y': redo,
    },
    ['Mod+z', 'Mod+Shift+z', 'Mod+y'],
  );

  const add = (type: StoredSlide['type']) => {
    const slide = newSlide(type);
    edit((p) => insertAfter(p, selected.id, slide));
    select(slide.id);
  };

  return (
    <div className={styles.shell}>
      <header className={styles.top}>
        <IconButton
          label="Back to Library"
          icon={<ArrowLeft size={20} />}
          onClick={() => navigate('/')}
        />
        <div className={styles.titleBlock}>
          <h1 className={styles.title}>{presentation.title}</h1>
          <SavedIndicator />
        </div>
        <div className={styles.actions}>
          <Tooltip content="Undo" shortcut="Ctrl+Z">
            <IconButton
              label="Undo"
              icon={<Undo2 size={18} />}
              onClick={undo}
              disabled={!canUndo}
            />
          </Tooltip>
          <Tooltip content="Redo" shortcut="Ctrl+Shift+Z">
            <IconButton
              label="Redo"
              icon={<Redo2 size={18} />}
              onClick={redo}
              disabled={!canRedo}
            />
          </Tooltip>
          <Button icon={<Settings2 size={16} />} onClick={() => setSettingsOpen(true)}>
            Presentation settings
          </Button>
          <Button
            variant="primary"
            icon={<Play size={16} />}
            onClick={async () => {
              await useEditor.getState().flush();
              navigate(`/present/${id}`);
            }}
          >
            Present
          </Button>
        </div>
      </header>

      <div className={styles.body}>
        <SlideList
          slides={slides}
          selectedId={selected.id}
          template={template}
          translation={translation}
          onSelect={select}
          onReorder={(ids) => edit((p) => reorderSlides(p, ids), 'reorder')}
          onAdd={add}
        />

        <main className={styles.canvas} aria-label="Slide canvas">
          <div className={styles.canvasInner}>
            <SlideFrame
              key={selected.id}
              slide={selected}
              template={template}
              mode="editor"
              translation={slideTranslation(selected, translation)}
              label={`Slide ${index + 1}`}
              fit="contain"
              className={styles.frame}
            />
          </div>
          <SlideToolbar slide={selected} index={index} total={slides.length} />
        </main>

        <aside className={styles.fields} aria-label="Slide fields">
          <FieldsPanel key={selected.id} slide={selected} />
        </aside>
      </div>

      <PresentationSettings
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        presentation={presentation}
      />
    </div>
  );
}

function SavedIndicator() {
  const status = useEditor((s) => s.saveStatus);
  const savedAt = useEditor((s) => s.savedAt);
  const reduced = useReducedMotion();
  const [visible, setVisible] = useState<number | null>(null);
  useEffect(() => {
    if (status !== 'saved') return;
    const show = setTimeout(() => setVisible(savedAt), 0);
    const hide = setTimeout(() => setVisible(null), motionDetail.savedFade);
    return () => {
      clearTimeout(show);
      clearTimeout(hide);
    };
  }, [status, savedAt]);
  return (
    <span className={styles.saved} aria-live="polite">
      {status === 'error' ? (
        <span className={styles.saveError}>
          <TriangleAlert size={14} /> Couldn’t save — your edits are kept here; try again.
        </span>
      ) : (
        <AnimatePresence>
          {visible !== null && (
            <motion.span
              key={visible}
              className={styles.savedOk}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reduced ? 0.12 : 0.3 }}
            >
              <Check size={14} /> Saved
            </motion.span>
          )}
        </AnimatePresence>
      )}
    </span>
  );
}

function SlideList({
  slides,
  selectedId,
  template,
  translation,
  onSelect,
  onReorder,
  onAdd,
}: {
  slides: StoredSlide[];
  selectedId: string;
  template: ReturnType<typeof getTemplate>;
  translation: string;
  onSelect: (id: string) => void;
  onReorder: (ids: string[]) => void;
  onAdd: (type: StoredSlide['type']) => void;
}) {
  const [order, setOrder] = useState<string[] | null>(null);
  const ids = order ?? slides.map((s) => s.id);
  const byId = new Map(slides.map((s) => [s.id, s]));
  return (
    <nav className={styles.list} aria-label="Slides">
      <Reorder.Group
        axis="y"
        values={ids}
        onReorder={setOrder}
        className={styles.listItems}
        as="ol"
      >
        {ids.map((sid, i) => {
          const s = byId.get(sid);
          if (!s) return null;
          return (
            <SlideListItem
              key={sid}
              slide={s}
              index={i}
              selected={sid === selectedId}
              template={template}
              translation={translation}
              onSelect={() => onSelect(sid)}
              onDragEnd={() => {
                if (order) onReorder(order);
                setOrder(null);
              }}
            />
          );
        })}
      </Reorder.Group>
      <div className={styles.addRow}>
        <Menu
          label="Add slide"
          align="start"
          trigger={
            <Button variant="outline" icon={<Plus size={16} />} className={styles.addButton}>
              Add slide
            </Button>
          }
          items={SLIDE_TYPES.map((t) => ({
            label: SLIDE_TYPE_LABELS[t],
            onSelect: () => onAdd(t),
          }))}
        />
      </div>
    </nav>
  );
}

function SlideListItem({
  slide,
  index,
  selected,
  template,
  translation,
  onSelect,
  onDragEnd,
}: {
  slide: StoredSlide;
  index: number;
  selected: boolean;
  template: ReturnType<typeof getTemplate>;
  translation: string;
  onSelect: () => void;
  onDragEnd: () => void;
}) {
  const controls = useDragControls();
  const issues = slideIssues(slide);
  return (
    <Reorder.Item
      value={slide.id}
      dragListener={false}
      dragControls={controls}
      onDragEnd={onDragEnd}
      className={cx(styles.item, selected && styles.itemSelected)}
      as="li"
    >
      <span
        className={styles.grip}
        onPointerDown={(e) => controls.start(e)}
        aria-hidden
        title="Drag to reorder"
      >
        <GripVertical size={14} />
      </span>
      <span className={styles.num}>{index + 1}</span>
      <button
        type="button"
        className={styles.thumbButton}
        aria-current={selected ? 'true' : undefined}
        aria-label={`Slide ${index + 1}, ${slide.type}${issues.length ? ', has problems' : ''}`}
        onClick={onSelect}
      >
        <SlideFrame
          slide={slide}
          template={template}
          mode="thumbnail"
          translation={slideTranslation(slide, translation)}
        />
        {issues.length > 0 && (
          <span className={styles.badge} title={issues.join('\n')}>
            <TriangleAlert size={12} />
          </span>
        )}
      </button>
    </Reorder.Item>
  );
}

function SlideToolbar({
  slide,
  index,
  total,
}: {
  slide: StoredSlide;
  index: number;
  total: number;
}) {
  const edit = useEditor((s) => s.edit);
  const select = useEditor((s) => s.select);
  const types = compatibleTypes(slide);
  return (
    <div className={styles.toolbar}>
      <span className={styles.position}>
        Slide {index + 1} of {total} · {SLIDE_TYPE_LABELS[slide.type]}
      </span>
      <div className={styles.toolbarActions}>
        <IconButton
          label="Move up"
          icon={<ArrowUp size={18} />}
          disabled={index === 0}
          onClick={() => edit((p) => moveSlide(p, slide.id, -1))}
        />
        <IconButton
          label="Move down"
          icon={<ArrowDown size={18} />}
          disabled={index === total - 1}
          onClick={() => edit((p) => moveSlide(p, slide.id, 1))}
        />
        <Menu
          label="Change slide type"
          trigger={
            <Button variant="ghost" icon={<Shapes size={16} />} disabled={types.length === 0}>
              Change type
            </Button>
          }
          items={types.map((t) => ({
            label: SLIDE_TYPE_LABELS[t],
            onSelect: () => {
              const next = convertSlide(slide, t);
              if (next)
                edit((p) => ({
                  ...p,
                  slides: p.slides.map((s) => (s.id === slide.id ? next : s)),
                }));
            },
          }))}
        />
        <Button
          variant="ghost"
          icon={<Copy size={16} />}
          onClick={() => {
            let newId = '';
            edit((p) => {
              const r = duplicateSlide(p, slide.id);
              newId = r.id;
              return r.presentation;
            });
            if (newId) select(newId);
          }}
        >
          Duplicate
        </Button>
        <Menu
          label="More"
          trigger={<IconButton label="More slide actions" icon={<MoreHorizontal size={18} />} />}
          items={[
            {
              label: 'Delete slide',
              icon: <Trash2 size={16} />,
              disabled: total <= 1,
              onSelect: () => {
                let next: string | null = null;
                edit((p) => {
                  const r = deleteSlide(p, slide.id);
                  next = r.select;
                  return r.presentation;
                });
                select(next);
              },
            },
          ]}
        />
      </div>
    </div>
  );
}

const DEFAULT = '__default';

function PresentationSettings({
  open,
  onOpenChange,
  presentation,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  presentation: StoredPresentation;
}) {
  const edit = useEditor((s) => s.edit);
  const translations = useBible((s) => s.translations);
  const set = (key: keyof StoredPresentation, raw: string) =>
    edit((p) => {
      const value = raw === DEFAULT ? '' : raw;
      const out = { ...p } as Record<string, unknown>;
      if (value === '' && key !== 'title') delete out[key];
      else out[key] = value;
      return out as StoredPresentation;
    }, `meta:${key}`);
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Presentation settings"
      footer={
        <Button variant="primary" onClick={() => onOpenChange(false)}>
          Done
        </Button>
      }
    >
      <div className={styles.settingsGrid}>
        <Input
          label="Title"
          value={presentation.title}
          limit={LIMITS.presentation.title}
          onChange={(e) => set('title', e.target.value)}
        />
        <Input
          label="Speaker"
          value={presentation.speaker ?? ''}
          limit={LIMITS.presentation.speaker}
          onChange={(e) => set('speaker', e.target.value)}
          placeholder="Optional"
        />
        <Input
          label="Date"
          type="date"
          value={presentation.date ?? ''}
          onChange={(e) => set('date', e.target.value)}
        />
        <Input
          label="Series"
          value={presentation.series ?? ''}
          limit={LIMITS.presentation.series}
          onChange={(e) => set('series', e.target.value)}
          placeholder="Optional"
        />
        <Select
          label="Theme"
          value={presentation.theme ?? DEFAULT}
          onChange={(v) => set('theme', v)}
          options={[
            { value: DEFAULT, label: 'App default' },
            ...TEMPLATE_IDS.map((t) => ({ value: t, label: getTemplate(t).name })),
          ]}
        />
        <Select
          label="Translation"
          value={presentation.translation ?? DEFAULT}
          onChange={(v) => set('translation', v)}
          options={[
            { value: DEFAULT, label: 'App default' },
            ...translations.map((t) => ({ value: t.code, label: `${t.code} — ${t.name}` })),
          ]}
        />
      </div>
    </Dialog>
  );
}
