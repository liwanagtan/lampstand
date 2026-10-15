// Media for slide backgrounds (PRD §7.2): images are resized to at most 1920 px wide and
// compressed to WebP; videos are stored as they are.
import { db } from '@/db/db';
import type { AssetRecord } from '@/db/types';

export const MAX_IMAGE_WIDTH = 1920;
export const MAX_VIDEO_BYTES = 400 * 1024 * 1024;

const newId = () => `a-${globalThis.crypto?.randomUUID?.() ?? Date.now().toString(36)}`;

async function toWebp(file: Blob): Promise<{ blob: Blob; width: number; height: number }> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_IMAGE_WIDTH / bitmap.width);
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);
  let blob: Blob | null = null;
  if (typeof OffscreenCanvas !== 'undefined') {
    const canvas = new OffscreenCanvas(width, height);
    canvas.getContext('2d')!.drawImage(bitmap, 0, 0, width, height);
    blob = await canvas.convertToBlob({ type: 'image/webp', quality: 0.82 });
  } else {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    canvas.getContext('2d')!.drawImage(bitmap, 0, 0, width, height);
    blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/webp', 0.82));
  }
  bitmap.close();
  if (!blob) throw new Error("This image couldn't be converted.");
  return { blob, width, height };
}

async function videoSize(blob: Blob): Promise<{ width: number; height: number }> {
  const url = URL.createObjectURL(blob);
  try {
    const v = document.createElement('video');
    v.preload = 'metadata';
    v.src = url;
    await new Promise<void>((res, rej) => {
      v.onloadedmetadata = () => res();
      v.onerror = () => rej(new Error("This video can't be played in Chrome."));
    });
    return { width: v.videoWidth, height: v.videoHeight };
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Stores an image or video from the laptop and returns its asset id. */
export async function storeMediaFile(file: File): Promise<string> {
  const id = newId();
  let record: AssetRecord;
  if (file.type.startsWith('image/')) {
    const { blob, width, height } = await toWebp(file);
    record = {
      id,
      blob,
      mime: 'image/webp',
      width,
      height,
      size: blob.size,
      name: file.name,
      createdAt: Date.now(),
    };
  } else if (file.type.startsWith('video/')) {
    if (file.size > MAX_VIDEO_BYTES) throw new Error('Videos must be under 400 MB.');
    const { width, height } = await videoSize(file);
    record = {
      id,
      blob: file,
      mime: file.type,
      width,
      height,
      size: file.size,
      name: file.name,
      createdAt: Date.now(),
    };
  } else {
    throw new Error('Choose an image or a video file.');
  }
  await db.assets.put(record);
  return id;
}
