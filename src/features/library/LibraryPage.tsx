import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  Copy,
  Download,
  MoreHorizontal,
  Pencil,
  Play,
  Search,
  Trash2,
  Upload,
  MonitorSmartphone,
} from 'lucide-react';
import { Page } from '@/app/Page';
import { db } from '@/db/db';
import {
  Button,
  Card,
  EmptyState,
  IconButton,
  Input,
  Menu,
  Select,
  Skeleton,
  toast,
} from '@/design-system/components';
import { useSettings } from '@/features/settings/settingsStore';
import { formatDate, relativeTime } from '@/lib/time';
import { getTemplate } from '@/templates/templates';
import { SlideFrame } from '@/slides/SlideView';
import {
  deletePresentation,
  duplicatePresentation,
  exportPresentation,
  restorePresentation,
  type LibraryRecord,
} from './presentations';
import { presentationTranslation, slideTranslation } from './translation';
import { matches } from './libraryHelpers';
import { PosterContext, posterInfoFor } from '@/slides/poster/posterInfo';
import styles from './LibraryPage.module.css';
import { ScreenEntries } from './ScreenEntries';
import { paths } from '@/app/paths';

type SortKey = 'date' | 'lastPresented' | 'updated';

const SORTS: { value: SortKey; label: string }[] = [
  { value: 'date', label: 'Sermon date' },
  { value: 'lastPresented', label: 'Last presented' },
  { value: 'updated', label: 'Recently edited' },
];

function sortRecords(list: LibraryRecord[], key: SortKey): LibraryRecord[] {
  const by = (r: LibraryRecord) =>
    key === 'date'
      ? (r.date ?? '')
      : key === 'lastPresented'
        ? (r.lastPresentedAt ?? 0)
        : r.updatedAt;
  return [...list].sort((a, b) => {
    const va = by(a);
    const vb = by(b);
    if (va === vb) return b.updatedAt - a.updatedAt;
    return va < vb ? 1 : -1;
  });
}

export function LibraryPage() {
  const navigate = useNavigate();
  const records = useLiveQuery(() => db.presentations.toArray() as Promise<LibraryRecord[]>, []);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortKey>('date');

  const visible = useMemo(
    () =>
      records
        ? sortRecords(
            records.filter((r) => matches(r, query)),
            sort,
          )
        : undefined,
    [records, query, sort],
  );

  const empty = records && records.length === 0;

  return (
    <Page
      back={paths.profileYou}
      title="Screen"
      description="Put sermon slides and Scripture on a TV or projector."

      actions={
        records &&
        !empty && (
          <div className={styles.toolbar}>
            <Input
              label="Search"
              hideLabel
              placeholder="Search by title or speaker"
              icon={<Search size={16} />}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className={styles.search}
            />
            <Select<SortKey>
              label="Sort"
              hideLabel
              aria-label="Sort by"
              value={sort}
              onChange={setSort}
              options={SORTS}
              className={styles.sort}
            />
            <Button
              variant="primary"
              icon={<Upload size={16} />}
              onClick={() => navigate(paths.screenImport)}
            >
              Import
            </Button>
          </div>
        )
      }
    >
      <p className={styles.phoneNote}>
        <MonitorSmartphone size={18} aria-hidden />
        Screen is made for a laptop connected to a TV or projector. Look around here, then present
        from your laptop.
      </p>
      <ScreenEntries
        count={records?.length ?? 0}
        onPresentation={() =>
          empty
            ? navigate(paths.screenImport)
            : document.getElementById('presentations')?.scrollIntoView({ behavior: 'smooth' })
        }
        onBible={() => navigate(paths.screenBible)}
      />
      {records && !empty && (
        <h2 id="presentations" className={styles.sectionTitle}>
          Presentations <span>{records.length}</span>
        </h2>
      )}
      {empty ? (
        <LibraryEmpty />
      ) : (
        <>
          {!visible ? (
            <div className={styles.grid} aria-busy="true">
              {Array.from({ length: 6 }, (_, i) => (
                <Card key={i} padded={false} className={styles.card}>
                  <Skeleton height="auto" radius="sm" className={styles.thumbSkeleton} />
                  <div className={styles.meta}>
                    <Skeleton width="70%" height={18} />
                    <Skeleton width="45%" height={14} />
                  </div>
                </Card>
              ))}
            </div>
          ) : visible.length === 0 ? (
            <EmptyState compact icon={<Search size={20} />} title="No matches">
              Nothing matches “{query}”. Try a title or speaker name.
            </EmptyState>
          ) : (
            <ul className={styles.grid} aria-label="Presentations">
              {visible.map((r) => (
                <PresentationCard key={r.id} record={r} />
              ))}
            </ul>
          )}
        </>
      )}
    </Page>
  );
}

function PresentationCard({ record }: { record: LibraryRecord }) {
  const navigate = useNavigate();
  const defaultTheme = useSettings((s) => s.defaultTheme);
  const p = record.data;
  const template = getTemplate(p.theme ?? defaultTheme);
  const first = p.slides.find((s) => s.type !== 'countdown') ?? p.slides[0];
  const translation = presentationTranslation(p);

  const onDelete = async () => {
    const removed = await deletePresentation(record.id);
    if (!removed) return;
    toast({
      title: `Deleted “${record.title}”`,
      action: { label: 'Undo', onClick: () => void restorePresentation(removed) },
    });
  };

  const onDuplicate = async () => {
    const copy = await duplicatePresentation(record.id);
    if (copy) toast({ title: `Duplicated as “${copy.title}”`, tone: 'success' });
  };

  const date = formatDate(p.date);

  return (
    <li className={styles.item}>
      <Card padded={false} className={styles.card}>
        <div className={styles.thumb}>
          {first && (
            <PosterContext.Provider
              value={posterInfoFor(p, translation, record.posterAnimated ?? true)}
            >
              <SlideFrame
                slide={first}
                template={template}
                mode="thumbnail"
                translation={slideTranslation(first, translation)}
              />
            </PosterContext.Provider>
          )}
          <button
            type="button"
            className={styles.thumbButton}
            onClick={() => navigate(paths.presentation(record.id))}
          >
            <span className="visually-hidden">Present {record.title}</span>
            <span className={styles.playHint} aria-hidden>
              <Play size={20} />
              Present
            </span>
          </button>
        </div>
        <div className={styles.meta}>
          <div className={styles.titleRow}>
            <h2 className={styles.title} title={record.title}>
              {record.title}
            </h2>
            <Menu
              label={`Actions for ${record.title}`}
              trigger={
                <IconButton
                  label={`Actions for ${record.title}`}
                  icon={<MoreHorizontal size={18} />}
                  size="sm"
                />
              }
              items={[
                {
                  label: 'Present',
                  icon: <Play size={16} />,
                  onSelect: () => navigate(paths.presentation(record.id)),
                },
                {
                  label: 'Edit',
                  icon: <Pencil size={16} />,
                  onSelect: () => navigate(paths.edit(record.id)),
                },
                {
                  label: 'Duplicate',
                  icon: <Copy size={16} />,
                  onSelect: () => void onDuplicate(),
                },
                {
                  label: 'Export JSON',
                  icon: <Download size={16} />,
                  onSelect: () => exportPresentation(record),
                },
                {
                  label: 'Delete',
                  icon: <Trash2 size={16} />,
                  onSelect: () => void onDelete(),
                  separatorBefore: true,
                },
              ]}
            />
          </div>
          <p className={styles.sub}>
            {[record.speaker, date].filter(Boolean).join(' · ') || `${p.slides.length} slides`}
          </p>
          <p className={styles.sub}>
            {record.lastPresentedAt
              ? `Presented ${relativeTime(record.lastPresentedAt)}`
              : 'Not presented yet'}
            {' · '}
            {p.slides.length} slides
          </p>
        </div>
      </Card>
    </li>
  );
}

function LibraryEmpty() {
  const navigate = useNavigate();
  return (
    <section className={styles.empty} aria-labelledby="library-empty-title">
      <div className={styles.emptyArt} aria-hidden>
        <span className={styles.emptyGlow} />
        <EmptyLamp />
      </div>
      <h2 id="library-empty-title" className={styles.emptyTitle}>
        Your library is empty
      </h2>
      <p className={styles.emptyText}>
        Import a presentation file to get started. It’ll be here whenever you’re ready to present.
      </p>
      <Button
        variant="primary"
        icon={<Upload size={16} />}
        onClick={() => navigate(paths.screenImport)}
      >
        Import presentation
      </Button>
      <p className={styles.emptyHint}>Accepts .lampstand.json files</p>
    </section>
  );
}

/** An oil lamp with a living flame, drawn for the empty library. */
function EmptyLamp() {
  return (
    <svg viewBox="0 0 160 160" width="160" height="160" className={styles.lamp}>
      <defs>
        <radialGradient id="lampFlame" cx="50%" cy="70%" r="60%">
          <stop offset="0%" stopColor="#FFF4D6" />
          <stop offset="45%" stopColor="#F2C46B" />
          <stop offset="100%" stopColor="#F2B33D" />
        </radialGradient>
        <linearGradient id="lampBody" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--color-accent)" />
          <stop offset="100%" stopColor="color-mix(in srgb, var(--color-accent) 60%, #000)" />
        </linearGradient>
      </defs>
      <g className={styles.flame}>
        <path
          d="M80 30c10 12 17 22 17 32a17 17 0 0 1-34 0c0-7 3-13 8-18 .6 5.6 3 9 6.6 10.6-1.6-9.6.6-17 2.4-24.6Z"
          fill="url(#lampFlame)"
        />
      </g>
      <path d="M78 79h4v10h-4z" fill="color-mix(in srgb, var(--color-text) 55%, transparent)" />
      <path
        d="M34 98c0-6 6-9 14-9h64c8 0 14 3 14 9 0 14-18 26-46 26S34 112 34 98Z"
        fill="url(#lampBody)"
      />
      <path
        d="M126 96c10-2 16 4 14 10-1.6 5-8 7-14 4"
        fill="none"
        stroke="var(--color-accent)"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <path d="M56 124h48l-6 10H62z" fill="color-mix(in srgb, var(--color-accent) 70%, #000)" />
      <path d="M50 134h60" stroke="var(--color-accent)" strokeWidth="4" strokeLinecap="round" />
      <path
        d="M48 98h64"
        stroke="color-mix(in srgb, #fff 35%, transparent)"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
