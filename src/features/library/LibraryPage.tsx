import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  Copy,
  Download,
  LibraryBig,
  MoreHorizontal,
  Pencil,
  Play,
  Search,
  Trash2,
  Upload,
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
import styles from './LibraryPage.module.css';

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
      title="Library"
      description={
        records && !empty
          ? `${records.length} presentation${records.length === 1 ? '' : 's'}`
          : undefined
      }
      actions={
        !empty && (
          <Button variant="primary" icon={<Upload size={16} />} onClick={() => navigate('/import')}>
            Import
          </Button>
        )
      }
    >
      {empty ? (
        <LibraryEmpty />
      ) : (
        <>
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
          </div>
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
            <SlideFrame
              slide={first}
              template={template}
              mode="thumbnail"
              translation={slideTranslation(first, translation)}
            />
          )}
          <button
            type="button"
            className={styles.thumbButton}
            onClick={() => navigate(`/present/${record.id}`)}
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
                  onSelect: () => navigate(`/present/${record.id}`),
                },
                {
                  label: 'Edit',
                  icon: <Pencil size={16} />,
                  onSelect: () => navigate(`/edit/${record.id}`),
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
    <Card padded={false}>
      <EmptyState
        icon={<LibraryBig size={26} />}
        title="Your library is empty"
        actions={
          <Button variant="primary" icon={<Upload size={16} />} onClick={() => navigate('/import')}>
            Import a presentation
          </Button>
        }
      >
        <ol className={styles.steps}>
          <li>In Claude, use the Lampstand skill and paste your sermon notes.</li>
          <li>Review the outline, then save the result as a .lampstand.json file.</li>
          <li>Import the file here, preview it, and save it to your library.</li>
        </ol>
      </EmptyState>
    </Card>
  );
}
