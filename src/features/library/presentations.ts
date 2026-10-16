// Presentation records in IndexedDB (PRD §5 Stored records, §7.1 Library).
import { db } from '@/db/db';
import type { PresentationRecord } from '@/db/types';
import type { StoredPresentation } from '@/schema/presentation';
import { toExportJson, withIds } from '@/schema/validate';

export type LibraryRecord = PresentationRecord<StoredPresentation>;

const newId = () =>
  globalThis.crypto?.randomUUID?.() ??
  `p-${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;

export async function createPresentation(p: StoredPresentation): Promise<LibraryRecord> {
  const now = Date.now();
  const record: LibraryRecord = {
    id: newId(),
    title: p.title,
    speaker: p.speaker,
    date: p.date,
    data: p,
    createdAt: now,
    updatedAt: now,
  };
  await db.presentations.add(record);
  return record;
}

/** Saves edits; metadata columns mirror the presentation for sorting and search. */
export async function updatePresentation(id: string, p: StoredPresentation): Promise<void> {
  await db.presentations.update(id, {
    data: p,
    title: p.title,
    speaker: p.speaker,
    date: p.date,
    updatedAt: Date.now(),
  });
}

export async function getPresentation(id: string): Promise<LibraryRecord | undefined> {
  return (await db.presentations.get(id)) as LibraryRecord | undefined;
}

export async function duplicatePresentation(id: string): Promise<LibraryRecord | undefined> {
  const r = await getPresentation(id);
  if (!r) return undefined;
  const copy = withIds({
    ...r.data,
    title: copyTitle(r.data.title),
    slides: r.data.slides.map((s) => ({ ...s, id: undefined })),
  });
  return createPresentation(copy);
}

function copyTitle(title: string): string {
  const t = `${title} (copy)`;
  return t.length <= 80 ? t : `${title.slice(0, 73)} (copy)`;
}

export async function deletePresentation(id: string): Promise<LibraryRecord | undefined> {
  const r = await getPresentation(id);
  if (r) await db.presentations.delete(id);
  return r;
}

export async function restorePresentation(r: LibraryRecord): Promise<void> {
  await db.presentations.put(r);
}

export async function markPresented(id: string): Promise<void> {
  await db.presentations.update(id, { lastPresentedAt: Date.now() });
}

export function fileNameFor(title: string): string {
  const slug = title
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return `${slug || 'presentation'}.lampstand.json`;
}

export function downloadText(text: string, fileName: string, type = 'application/json'): void {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function exportPresentation(r: LibraryRecord): void {
  downloadText(toExportJson(r.data), fileNameFor(r.data.title));
}

export async function setPosterAnimated(id: string, posterAnimated: boolean): Promise<void> {
  await db.presentations.update(id, { posterAnimated });
}
