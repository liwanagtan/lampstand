import { useState, type ReactNode } from 'react';
import { BookOpen, Copy, Inbox, MoreHorizontal, Play, Plus, Search, Trash2 } from 'lucide-react';
import { Page } from '@/app/Page';
import {
  Button,
  Card,
  Chip,
  ChipButton,
  Dialog,
  EmptyState,
  IconButton,
  Input,
  Kbd,
  Menu,
  Select,
  Skeleton,
  Tabs,
  Textarea,
  Toggle,
  Tooltip,
  toast,
} from '@/design-system/components';
import type { ColorScheme } from '@/design-system/tokens';
import styles from './ComponentsPage.module.css';

const STATES = [
  { label: 'Default' },
  { label: 'Hover', force: 'hover' },
  { label: 'Pressed', force: 'pressed' },
  { label: 'Focus', force: 'focus' },
  { label: 'Disabled', disabled: true },
  { label: 'Loading', loading: true },
] as const;

function Gallery({ scheme }: { scheme: ColorScheme }) {
  const [text, setText] = useState('For God so loved the world');
  const [body, setBody] = useState(
    'Scripture uncovers the truth about God, the world, and our own hearts — and so',
  );
  const [translation, setTranslation] = useState('KJV');
  const [on, setOn] = useState(true);
  const [open, setOpen] = useState(false);

  return (
    <section data-theme={scheme} className={styles.panel} aria-label={`${scheme} theme`}>
      <h2 className={styles.panelTitle}>{scheme === 'dark' ? 'Dark' : 'Light'}</h2>

      <Block title="Button">
        {(['primary', 'secondary', 'outline', 'ghost'] as const).map((variant) => (
          <div key={variant} className={styles.row}>
            {STATES.map((s) => (
              <Button
                key={s.label}
                variant={variant}
                data-force={'force' in s ? s.force : undefined}
                disabled={'disabled' in s}
                loading={'loading' in s}
                icon={variant === 'primary' ? <Play size={16} /> : undefined}
              >
                {s.label}
              </Button>
            ))}
          </div>
        ))}
        <div className={styles.row}>
          <Button size="sm">Small</Button>
          <Button variant="primary" shortcut="Enter">
            Go live
          </Button>
          <IconButton label="Add" icon={<Plus size={20} />} />
          <IconButton label="Delete" icon={<Trash2 size={20} />} variant="secondary" />
          <IconButton label="Disabled" icon={<Copy size={20} />} disabled />
          <IconButton label="Loading" icon={<Copy size={20} />} loading />
        </div>
      </Block>

      <Block title="Input and Textarea">
        <div className={styles.grid2}>
          <Input
            label="Heading"
            value={text}
            onChange={(e) => setText(e.target.value)}
            limit={30}
          />
          <Input label="Search" placeholder="Search presentations" icon={<Search size={16} />} />
          <Input
            label="With error"
            defaultValue="Jhn 3:16"
            error="'Jhn 3:16' isn't a recognized reference."
          />
          <Input label="Disabled" defaultValue="Read only" disabled />
        </div>
        <Textarea label="Body" value={body} onChange={(e) => setBody(e.target.value)} limit={90} />
      </Block>

      <Block title="Select and Toggle">
        <div className={styles.grid2}>
          <Select
            label="Translation"
            value={translation}
            onChange={setTranslation}
            options={[
              { value: 'KJV', label: 'King James Version' },
              { value: 'WEB', label: 'World English Bible' },
              { value: 'ASV', label: 'American Standard Version' },
            ]}
          />
          <Select
            label="Disabled"
            value="a"
            onChange={() => {}}
            options={[{ value: 'a', label: 'Classic' }]}
            disabled
          />
        </div>
        <Toggle
          checked={on}
          onChange={setOn}
          label="Reduce motion"
          description="Replace movement with short crossfades."
        />
        <Toggle checked={false} onChange={() => {}} label="Disabled toggle" disabled />
      </Block>

      <Block title="Tabs">
        <Tabs
          label="Demo tabs"
          items={[
            {
              value: 'queue',
              label: 'Verse queue',
              badge: 6,
              content: <p className={styles.muted}>Queue content</p>,
            },
            {
              value: 'history',
              label: 'History',
              content: <p className={styles.muted}>History content</p>,
            },
            {
              value: 'notes',
              label: 'Notes',
              content: <p className={styles.muted}>Notes content</p>,
            },
          ]}
        />
      </Block>

      <Block title="Chip and Kbd">
        <div className={styles.row}>
          <Chip>Neutral</Chip>
          <Chip tone="accent" icon={<BookOpen size={14} />}>
            KJV
          </Chip>
          <Chip tone="success">Output connected</Chip>
          <Chip tone="warning">Output disconnected</Chip>
          <ChipButton icon={<BookOpen size={14} />}>WEB</ChipButton>
          <ChipButton disabled>Disabled</ChipButton>
          <Kbd>/</Kbd>
          <Kbd>Esc</Kbd>
          <Kbd>Alt+→</Kbd>
        </div>
      </Block>

      <Block title="Dialog, Menu, Tooltip, Toast">
        <div className={styles.row}>
          <Button onClick={() => setOpen(true)}>Open dialog</Button>
          <Menu
            label="More actions"
            trigger={
              <IconButton
                label="More actions"
                icon={<MoreHorizontal size={20} />}
                variant="secondary"
              />
            }
            items={[
              { label: 'Present', icon: <Play size={16} />, onSelect: () => {} },
              {
                label: 'Duplicate',
                icon: <Copy size={16} />,
                shortcut: 'Ctrl+D',
                onSelect: () => {},
              },
              {
                label: 'Delete',
                icon: <Trash2 size={16} />,
                onSelect: () => {},
                separatorBefore: true,
              },
            ]}
          />
          <Tooltip content="Blank screen" shortcut="B">
            <Button variant="outline">Hover for tooltip</Button>
          </Tooltip>
          <Button onClick={() => toast({ title: 'Switched to WEB', tone: 'success' })}>
            Toast
          </Button>
          <Button
            onClick={() =>
              toast({
                title: 'Presentation deleted',
                action: { label: 'Undo', onClick: () => toast({ title: 'Restored' }) },
              })
            }
          >
            Undo toast
          </Button>
        </div>
        <Dialog
          open={open}
          onOpenChange={setOpen}
          title="Delete presentation?"
          description="You can undo this for 8 seconds."
          footer={
            <>
              <Button variant="ghost" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" onClick={() => setOpen(false)}>
                Delete
              </Button>
            </>
          }
        />
      </Block>

      <Block title="Card, Skeleton, Empty state">
        <div className={styles.grid2}>
          <Card interactive>
            <h3>A Lamp in the Dark</h3>
            <p className={styles.muted}>Pastor Daniel Cruz · 21 slides</p>
          </Card>
          <Card>
            <div className={styles.stack}>
              <Skeleton height={96} radius="md" />
              <Skeleton width="70%" />
              <Skeleton width="40%" height={12} />
            </div>
          </Card>
        </div>
        <Card padded={false}>
          <EmptyState
            compact
            icon={<Inbox size={22} />}
            title="Nothing here yet"
            actions={<Button variant="primary">Import</Button>}
          >
            Create slides with the Claude skill, then import the file.
          </EmptyState>
        </Card>
      </Block>
    </section>
  );
}

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className={styles.block}>
      <h3 className={styles.blockTitle}>{title}</h3>
      <div className={styles.stack}>{children}</div>
    </div>
  );
}

export function ComponentsPage() {
  return (
    <Page title="Components" description="Every primitive and state, in light and dark.">
      <div className={styles.columns}>
        <Gallery scheme="light" />
        <Gallery scheme="dark" />
      </div>
    </Page>
  );
}
