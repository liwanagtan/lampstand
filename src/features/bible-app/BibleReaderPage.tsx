import { Bookmark } from 'lucide-react';
import { IconButton, Menu } from '@/design-system/components';
import { formatRef, fromOsis } from '@/features/bible/ref';
import { useSettings } from '@/features/settings/settingsStore';
import { BibleReader } from './BiblePage';
import { markOrder } from './markGroups';
import { useAllMarks } from './marks';
import { useOpenInReader } from './useOpenInReader';

/**
 * Bible: a focused reader. Nothing about the TV here — showing scripture on a screen lives in
 * Screen's Bible console (docs/PRD-ADDENDUM-GROW.md).
 */
export function BibleReaderPage() {
  const features = useSettings((s) => s.features);
  return <BibleReader toolbar={features.marks ? <BookmarksMenu /> : undefined} />;
}

/** Jump back to a bookmarked place. */
function BookmarksMenu() {
  const marks = useAllMarks();
  const open = useOpenInReader();
  const bookmarks = (marks ?? [])
    .filter((m) => m.kind === 'bookmark')
    .flatMap((m) => {
      const r = fromOsis(m.ref);
      return r ? [{ id: m.id, range: r }] : [];
    })
    .sort((a, b) => markOrder(a.range) - markOrder(b.range));
  return (
    <Menu
      label="Bookmarks"
      align="end"
      trigger={<IconButton label="Bookmarks" icon={<Bookmark size={18} />} variant="secondary" />}
      items={
        bookmarks.length
          ? bookmarks.map((b) => ({ label: formatRef(b.range), onSelect: () => open(b.range) }))
          : [
              {
                label: 'No bookmarks yet — select a verse and tap the ribbon',
                onSelect: () => {},
                disabled: true,
              },
            ]
      }
    />
  );
}
