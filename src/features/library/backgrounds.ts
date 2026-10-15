// Bundled background library (PRD §13 milestone 5). Choosing one copies it into the assets
// table, so slides always reference assets the same way.
import { db } from '@/db/db';
import type { AssetRecord } from '@/db/types';

export interface BackgroundEntry {
  id: string;
  description: string;
  file: string;
  thumb: string;
  author: string;
  license: string;
  source: string;
}

const BASE = import.meta.env.BASE_URL ?? '/';
let manifest: Promise<BackgroundEntry[]> | null = null;

export function loadBackgrounds(): Promise<BackgroundEntry[]> {
  manifest ??= fetch(`${BASE}backgrounds/index.json`)
    .then((r) => (r.ok ? (r.json() as Promise<BackgroundEntry[]>) : []))
    .catch(() => {
      manifest = null;
      return [];
    });
  return manifest;
}

export const backgroundUrl = (file: string) => `${BASE}backgrounds/${file}`;
export const bundledAssetId = (id: string) => `bg-${id}`;

/** Stores a bundled background as an asset (once) and returns its asset id. */
export async function addBundledBackground(entry: BackgroundEntry): Promise<string> {
  const id = bundledAssetId(entry.id);
  if (await db.assets.get(id)) return id;
  const res = await fetch(backgroundUrl(entry.file));
  if (!res.ok) throw new Error(`Couldn't load ${entry.description}.`);
  const blob = await res.blob();
  const record: AssetRecord = {
    id,
    blob,
    mime: blob.type || 'image/webp',
    width: 1920,
    height: 1080,
    size: blob.size,
    name: entry.description,
    createdAt: Date.now(),
  };
  await db.assets.put(record);
  return id;
}
